/**
 * Flow Execution Engine
 *
 * Processes automation flow nodes sequentially when a WhatsApp message arrives.
 *
 * Architecture:
 *   - startFlow(contactId, flowId, connectionId, triggerText)
 *       Creates a FlowSession and begins executing from the trigger node.
 *   - resumeFlow(sessionId, inboundText)
 *       Called when a contact replies while a session is in "waiting" state.
 *   - processNode(session, node, inboundText?)
 *       Dispatches to the correct handler for each node type.
 *
 * Node types handled:
 *   trigger, text, audio, image, video, delay, buttons, condition,
 *   ai, pix, webhook, tag, identify, end, connect, wait
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import {
  flowSessions,
  flowExecutionLogs,
  flowNodes,
  flowEdges,
  contacts,
  contactEvents,
  flows,
  whatsappConnections,
  type FlowSession,
  type FlowNode,
} from "../drizzle/schema";
import { sendMessage } from "./whatsapp";
import { invokeLLM } from "./_core/llm";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface EngineResult {
  success: boolean;
  sessionId?: number;
  error?: string;
}

interface NodeConfig {
  message?: string;
  text?: string;
  delaySeconds?: number;
  buttons?: Array<{ id: string; label: string }>;
  variable?: string;
  field?: string; // for identify node: "nome" | "telefone" | "email" | "cpf" | string
  operator?: string; // for condition: "contains" | "equals" | "startsWith" | "hasTag"
  operand?: string;
  trueLabel?: string;
  falseLabel?: string;
  tag?: string;
  action?: string; // "add" | "remove" for tag node
  url?: string;
  method?: string;
  body?: string;
  prompt?: string; // for AI node
  systemPrompt?: string;
  keyword?: string; // for trigger node
  triggerMode?: "keyword" | "any"; // "any" = any message starts the flow
}

// ─────────────────────────────────────────────────────────────────────────────
// Variable interpolation
// ─────────────────────────────────────────────────────────────────────────────

function interpolate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// DB helpers (local to engine)
// ─────────────────────────────────────────────────────────────────────────────

async function getFlowGraph(flowId: number) {
  const db = await getDb();
  if (!db) return null;
  const [nodes, edges] = await Promise.all([
    db.select().from(flowNodes).where(eq(flowNodes.flowId, flowId)),
    db.select().from(flowEdges).where(eq(flowEdges.flowId, flowId)),
  ]);
  return { nodes, edges };
}

async function getNextNode(
  flowId: number,
  currentNodeId: string,
  portLabel?: string
): Promise<FlowNode | null> {
  const db = await getDb();
  if (!db) return null;

  // Find edge from current node (optionally matching a specific port/label)
  const edges = await db
    .select()
    .from(flowEdges)
    .where(and(eq(flowEdges.flowId, flowId), eq(flowEdges.sourceNodeId, currentNodeId)));

  let targetEdge = edges[0];

  // For multi-port nodes (buttons, condition), match by sourcePortId label
  if (portLabel && edges.length > 1) {
    const match = edges.find((e) => (e as any).sourcePortId === portLabel);
    if (match) targetEdge = match;
  }

  if (!targetEdge) return null;

  const nextNodes = await db
    .select()
    .from(flowNodes)
    .where(
      and(
        eq(flowNodes.flowId, flowId),
        eq(flowNodes.nodeId, targetEdge.targetNodeId)
      )
    )
    .limit(1);

  return nextNodes[0] ?? null;
}

async function updateSession(
  sessionId: number,
  patch: Partial<Pick<FlowSession, "currentNodeId" | "variables" | "status">>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(flowSessions).set(patch).where(eq(flowSessions.id, sessionId));
}

async function logExecution(
  sessionId: number,
  nodeId: string,
  nodeType: string,
  input: string,
  output: string,
  status: "ok" | "error" | "waiting"
) {
  const db = await getDb();
  if (!db) return;
  await (db.insert(flowExecutionLogs) as any).values({
    sessionId,
    nodeId,
    nodeType,
    input: input.slice(0, 2000),
    output: output.slice(0, 2000),
    status,
  });
}

async function getContactById(contactId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  return rows[0] ?? null;
}

async function getConnectionById(connectionId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(whatsappConnections)
    .where(eq(whatsappConnections.id, connectionId))
    .limit(1);
  return rows[0] ?? null;
}

async function sendToContact(
  connectionId: number,
  phone: string,
  text: string
): Promise<void> {
  const conn = await getConnectionById(connectionId);
  if (!conn) return;
  await sendMessage(conn.type, conn.config as Record<string, string>, phone, text);
}

// ─────────────────────────────────────────────────────────────────────────────
// Node processors
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the nodeId of the next node to process, or null to stop. */
type ProcessResult =
  | { action: "next"; portLabel?: string }
  | { action: "wait" }
  | { action: "end" }
  | { action: "error"; message: string };

async function processTextNode(
  session: FlowSession,
  node: FlowNode,
  connectionId: number,
  phone: string
): Promise<ProcessResult> {
  const cfg = (node.config ?? {}) as NodeConfig;
  const raw = cfg.message ?? cfg.text ?? node.label ?? "";
  const text = interpolate(raw, session.variables ?? {});
  if (text) {
    await sendToContact(connectionId, phone, text);
  }
  await logExecution(session.id, node.nodeId, node.type, "", text, "ok");
  return { action: "next" };
}

async function processDelayNode(
  session: FlowSession,
  node: FlowNode
): Promise<ProcessResult> {
  const cfg = (node.config ?? {}) as NodeConfig;
  const seconds = Number(cfg.delaySeconds ?? 1);
  await new Promise((r) => setTimeout(r, Math.min(seconds * 1000, 30_000)));
  await logExecution(session.id, node.nodeId, node.type, `${seconds}s`, "waited", "ok");
  return { action: "next" };
}

async function processButtonsNode(
  session: FlowSession,
  node: FlowNode,
  connectionId: number,
  phone: string,
  inboundText?: string
): Promise<ProcessResult> {
  const cfg = (node.config ?? {}) as NodeConfig;

  // If we have an inbound text, it's a reply to the buttons
  if (inboundText !== undefined) {
    const buttons = cfg.buttons ?? [];
    const reply = inboundText.trim().toLowerCase();
    // Match by label or position number
    const matched = buttons.find(
      (b, idx) =>
        b.label.toLowerCase() === reply ||
        String(idx + 1) === reply ||
        b.id === reply
    );
    const portLabel = matched ? matched.id : buttons[0]?.id ?? "1";
    await logExecution(session.id, node.nodeId, node.type, inboundText, portLabel, "ok");
    return { action: "next", portLabel };
  }

  // Send the buttons message and wait for reply
  const question = cfg.message ?? cfg.text ?? "Escolha uma opção:";
  const buttons = cfg.buttons ?? [];
  const optionsList = buttons.map((b, i) => `${i + 1}. ${b.label}`).join("\n");
  const fullText = interpolate(`${question}\n\n${optionsList}`, session.variables ?? {});
  await sendToContact(connectionId, phone, fullText);
  await logExecution(session.id, node.nodeId, node.type, "", fullText, "waiting");
  return { action: "wait" };
}

async function processIdentifyNode(
  session: FlowSession,
  node: FlowNode,
  connectionId: number,
  phone: string,
  inboundText?: string
): Promise<ProcessResult> {
  const cfg = (node.config ?? {}) as NodeConfig;
  const field = cfg.field ?? cfg.variable ?? "resposta";

  // If we have an inbound text, save it as variable
  if (inboundText !== undefined) {
    const newVars = { ...(session.variables ?? {}), [field]: inboundText.trim() };

    // If capturing phone, also update contact record
    const db = await getDb();
    if (db && field === "telefone") {
      await db
        .update(contacts)
        .set({ phone: inboundText.trim() })
        .where(eq(contacts.id, session.contactId));
    }
    if (db && field === "nome") {
      await db
        .update(contacts)
        .set({ name: inboundText.trim() })
        .where(eq(contacts.id, session.contactId));
    }

    await updateSession(session.id, { variables: newVars });
    await logExecution(session.id, node.nodeId, node.type, inboundText, `${field}=${inboundText}`, "ok");
    return { action: "next" };
  }

  // Ask the question
  const question = cfg.message ?? cfg.text ?? `Por favor, informe seu ${field}:`;
  await sendToContact(connectionId, phone, interpolate(question, session.variables ?? {}));
  await logExecution(session.id, node.nodeId, node.type, "", question, "waiting");
  return { action: "wait" };
}

async function processConditionNode(
  session: FlowSession,
  node: FlowNode
): Promise<ProcessResult> {
  const cfg = (node.config ?? {}) as NodeConfig;
  const vars = session.variables ?? {};

  let result = false;
  const operator = cfg.operator ?? "contains";
  const operand = cfg.operand ?? "";

  if (operator === "hasTag") {
    // Check contact tags
    const db = await getDb();
    if (db) {
      const contact = await getContactById(session.contactId);
      const tags: string[] = (contact?.tags as string[]) ?? [];
      result = tags.includes(operand);
    }
  } else {
    const varName = cfg.variable ?? Object.keys(vars)[0] ?? "";
    const value = vars[varName] ?? "";
    switch (operator) {
      case "equals":
        result = value.toLowerCase() === operand.toLowerCase();
        break;
      case "contains":
        result = value.toLowerCase().includes(operand.toLowerCase());
        break;
      case "startsWith":
        result = value.toLowerCase().startsWith(operand.toLowerCase());
        break;
      case "notEmpty":
        result = value.trim().length > 0;
        break;
      default:
        result = false;
    }
  }

  const portLabel = result ? "true" : "false";
  await logExecution(
    session.id,
    node.nodeId,
    node.type,
    JSON.stringify({ operator, operand, vars }),
    portLabel,
    "ok"
  );
  return { action: "next", portLabel };
}

async function processAiNode(
  session: FlowSession,
  node: FlowNode,
  connectionId: number,
  phone: string,
  inboundText?: string
): Promise<ProcessResult> {
  const cfg = (node.config ?? {}) as NodeConfig;
  const systemPrompt = cfg.systemPrompt ?? "Você é um assistente de atendimento ao cliente via WhatsApp. Seja breve e objetivo.";
  const userPrompt = cfg.prompt
    ? interpolate(cfg.prompt, session.variables ?? {})
    : inboundText ?? "Olá";

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    const aiText: string = (response as any)?.choices?.[0]?.message?.content ?? "Desculpe, não consegui processar sua mensagem.";
    await sendToContact(connectionId, phone, aiText);
    await logExecution(session.id, node.nodeId, node.type, userPrompt, aiText, "ok");
  } catch (err: any) {
    await logExecution(session.id, node.nodeId, node.type, userPrompt, err?.message ?? "LLM error", "error");
  }
  return { action: "next" };
}

async function processTagNode(
  session: FlowSession,
  node: FlowNode
): Promise<ProcessResult> {
  const cfg = (node.config ?? {}) as NodeConfig;
  const tag = cfg.tag ?? "";
  const action = cfg.action ?? "add";

  if (tag) {
    const db = await getDb();
    if (db) {
      const contact = await getContactById(session.contactId);
      if (contact) {
        const currentTags: string[] = (contact.tags as string[]) ?? [];
        let newTags: string[];
        if (action === "remove") {
          newTags = currentTags.filter((t) => t !== tag);
        } else {
          newTags = currentTags.includes(tag) ? currentTags : [...currentTags, tag];
        }
        await db
          .update(contacts)
          .set({ tags: newTags })
          .where(eq(contacts.id, session.contactId));
        // Log contact event
        await (db.insert(contactEvents) as any).values({
          contactId: session.contactId,
          userId: session.userId,
          type: "tag",
          title: `Tag ${action === "remove" ? "removida" : "adicionada"}: ${tag}`,
          description: `Via fluxo automático`,
          metadata: { tag, action, flowId: session.flowId },
        });
      }
    }
  }
  await logExecution(session.id, node.nodeId, node.type, tag, action, "ok");
  return { action: "next" };
}

async function processWebhookNode(
  session: FlowSession,
  node: FlowNode
): Promise<ProcessResult> {
  const cfg = (node.config ?? {}) as NodeConfig;
  const url = cfg.url ?? "";
  const method = (cfg.method ?? "POST").toUpperCase();
  const bodyTemplate = cfg.body ?? "{}";
  const body = interpolate(bodyTemplate, session.variables ?? {});

  if (!url) {
    await logExecution(session.id, node.nodeId, node.type, "", "No URL configured", "error");
    return { action: "next" };
  }

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method !== "GET" ? body : undefined,
    });
    const responseText = await res.text();
    await logExecution(session.id, node.nodeId, node.type, body, `${res.status}: ${responseText.slice(0, 500)}`, "ok");
  } catch (err: any) {
    await logExecution(session.id, node.nodeId, node.type, body, err?.message ?? "Fetch error", "error");
  }
  return { action: "next" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Core execution loop
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Execute nodes starting from `startNode` until the flow ends or waits for input.
 */
async function executeFrom(
  session: FlowSession,
  startNode: FlowNode,
  connectionId: number,
  phone: string,
  inboundText?: string,
  maxSteps = 50
): Promise<void> {
  let currentNode: FlowNode | null = startNode;
  let stepInput: string | undefined = inboundText;
  let steps = 0;

  while (currentNode && steps < maxSteps) {
    steps++;
    const nodeType = currentNode.type.toLowerCase();

    // Update session to reflect current node
    await updateSession(session.id, {
      currentNodeId: currentNode.nodeId,
      status: "active",
    });

    // Reload session to get latest variables
    const db = await getDb();
    if (!db) break;
    const sessionRows = await db
      .select()
      .from(flowSessions)
      .where(eq(flowSessions.id, session.id))
      .limit(1);
    if (sessionRows.length === 0) break;
    session = sessionRows[0];

    let result: ProcessResult;

    switch (nodeType) {
      case "trigger":
        // Trigger node just passes through
        result = { action: "next" };
        break;

      case "text":
      case "mensagem":
        result = await processTextNode(session, currentNode, connectionId, phone);
        break;

      case "audio":
      case "image":
      case "video": {
        // For media nodes, send a placeholder text (real media requires file upload)
        const cfg = (currentNode.config ?? {}) as NodeConfig;
        const mediaText = cfg.message ?? cfg.text ?? `[${nodeType.toUpperCase()}]`;
        await sendToContact(connectionId, phone, interpolate(mediaText, session.variables ?? {}));
        await logExecution(session.id, currentNode.nodeId, nodeType, "", mediaText, "ok");
        result = { action: "next" };
        break;
      }

      case "delay":
        result = await processDelayNode(session, currentNode);
        break;

      case "buttons":
      case "opcoes":
        result = await processButtonsNode(session, currentNode, connectionId, phone, stepInput);
        if (result.action === "wait") {
          await updateSession(session.id, {
            currentNodeId: currentNode.nodeId,
            status: "waiting",
          });
          return;
        }
        break;

      case "identify":
      case "identificar":
        result = await processIdentifyNode(session, currentNode, connectionId, phone, stepInput);
        if (result.action === "wait") {
          await updateSession(session.id, {
            currentNodeId: currentNode.nodeId,
            status: "waiting",
          });
          return;
        }
        break;

      case "wait":
      case "aguardar":
        // Generic wait: pause until next message
        await updateSession(session.id, {
          currentNodeId: currentNode.nodeId,
          status: "waiting",
        });
        await logExecution(session.id, currentNode.nodeId, nodeType, "", "waiting for reply", "waiting");
        return;

      case "condition":
      case "condicao":
      case "condição":
        result = await processConditionNode(session, currentNode);
        break;

      case "ai":
      case "ia":
        result = await processAiNode(session, currentNode, connectionId, phone, stepInput);
        break;

      case "tag":
        result = await processTagNode(session, currentNode);
        break;

      case "webhook":
        result = await processWebhookNode(session, currentNode);
        break;

      case "pix": {
        const cfg = (currentNode.config ?? {}) as NodeConfig;
        const pixText = cfg.message ?? cfg.text ?? "Para finalizar, realize o pagamento via PIX.";
        await sendToContact(connectionId, phone, interpolate(pixText, session.variables ?? {}));
        await logExecution(session.id, currentNode.nodeId, nodeType, "", pixText, "ok");
        result = { action: "next" };
        break;
      }

      case "end":
      case "fim":
        await updateSession(session.id, { status: "completed" });
        await logExecution(session.id, currentNode.nodeId, nodeType, "", "flow ended", "ok");
        // Log contact event
        if (db) {
          await (db.insert(contactEvents) as any).values({
            contactId: session.contactId,
            userId: session.userId,
            type: "flow",
            title: "Fluxo concluído",
            description: `Fluxo #${session.flowId} finalizado com sucesso`,
            metadata: { flowId: session.flowId, sessionId: session.id },
          });
        }
        return;

      default:
        // Unknown node type — skip and continue
        await logExecution(session.id, currentNode.nodeId, nodeType, "", `Unknown node type: ${nodeType}`, "error");
        result = { action: "next" };
    }

    if (result.action === "end") {
      await updateSession(session.id, { status: "completed" });
      return;
    }
    if (result.action === "error") {
      await updateSession(session.id, { status: "error" });
      return;
    }

    // After first node, clear the inbound text so subsequent nodes don't reuse it
    stepInput = undefined;

    // Get next node
    const portLabel = result.action === "next" ? result.portLabel : undefined;
    currentNode = await getNextNode(session.flowId, currentNode.nodeId, portLabel);
  }

  // If we ran out of nodes, mark as completed
  await updateSession(session.id, { status: "completed" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Start a new flow session for a contact.
 * Finds the trigger node and begins execution.
 */
export async function startFlow(
  contactId: number,
  flowId: number,
  connectionId: number,
  triggerText: string
): Promise<EngineResult> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database unavailable" };

  // Get contact phone
  const contact = await getContactById(contactId);
  if (!contact) return { success: false, error: "Contact not found" };

  // Get flow
  const flowRows = await db.select().from(flows).where(eq(flows.id, flowId)).limit(1);
  if (!flowRows[0]) return { success: false, error: "Flow not found" };

  // Get flow graph
  const graph = await getFlowGraph(flowId);
  if (!graph) return { success: false, error: "Could not load flow graph" };

  // Find trigger node
  const triggerNode = graph.nodes.find((n) => n.type.toLowerCase() === "trigger");
  if (!triggerNode) return { success: false, error: "No trigger node found in flow" };

  // Create session
  const result = await db.insert(flowSessions).values({
    userId: flowRows[0].userId,
    flowId,
    contactId,
    connectionId,
    currentNodeId: triggerNode.nodeId,
    variables: {},
    status: "active",
  });
  const sessionId = (result as any).insertId as number;

  // Load the created session
  const sessionRows = await db
    .select()
    .from(flowSessions)
    .where(eq(flowSessions.id, sessionId))
    .limit(1);
  if (!sessionRows[0]) return { success: false, error: "Session creation failed" };

  // Log contact event
  await (db.insert(contactEvents) as any).values({
    contactId,
    userId: flowRows[0].userId,
    type: "flow",
    title: `Fluxo iniciado: ${flowRows[0].name}`,
    description: `Acionado pela mensagem: "${triggerText.slice(0, 100)}"`,
    metadata: { flowId, sessionId, trigger: triggerText },
  });

  // Execute from trigger node (skip trigger itself, go to next)
  const firstNode = await getNextNode(flowId, triggerNode.nodeId);
  if (firstNode) {
    await executeFrom(sessionRows[0], firstNode, connectionId, contact.phone, triggerText);
  } else {
    await updateSession(sessionId, { status: "completed" });
  }

  return { success: true, sessionId };
}

/**
 * Resume a waiting flow session when the contact sends a new message.
 */
export async function resumeFlow(
  sessionId: number,
  inboundText: string
): Promise<EngineResult> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database unavailable" };

  const sessionRows = await db
    .select()
    .from(flowSessions)
    .where(eq(flowSessions.id, sessionId))
    .limit(1);

  const session = sessionRows[0];
  if (!session) return { success: false, error: "Session not found" };
  if (session.status !== "waiting") return { success: false, error: "Session not in waiting state" };

  // Get contact phone
  const contact = await getContactById(session.contactId);
  if (!contact) return { success: false, error: "Contact not found" };

  // Get the node we were waiting on
  const graph = await getFlowGraph(session.flowId);
  if (!graph) return { success: false, error: "Could not load flow graph" };

  const waitingNode = graph.nodes.find((n) => n.nodeId === session.currentNodeId);
  if (!waitingNode) return { success: false, error: "Waiting node not found" };

  // Resume execution from the waiting node with the inbound text
  await executeFrom(session, waitingNode, session.connectionId, contact.phone, inboundText);

  return { success: true, sessionId };
}

/**
 * Find an active flow session for a contact.
 */
export async function getActiveSession(contactId: number): Promise<FlowSession | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(flowSessions)
    .where(
      and(
        eq(flowSessions.contactId, contactId),
        eq(flowSessions.status, "waiting")
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Find active flows for a user that match a trigger keyword.
 * Returns the first matching flow.
 */
export async function findMatchingFlow(
  userId: number,
  inboundText: string
): Promise<{ flowId: number; node: FlowNode } | null> {
  const db = await getDb();
  if (!db) return null;

  // Get all active flows for this user
  const activeFlows = await db
    .select()
    .from(flows)
    .where(and(eq(flows.userId, userId), eq(flows.status, "active")));

  for (const flow of activeFlows) {
    // Get trigger node for this flow
    const triggerNodes = await db
      .select()
      .from(flowNodes)
      .where(and(eq(flowNodes.flowId, flow.id)));

    const triggerNode = triggerNodes.find((n) => n.type.toLowerCase() === "trigger");
    if (!triggerNode) continue;

    const cfg = (triggerNode.config ?? {}) as NodeConfig;
    const mode = cfg.triggerMode ?? "keyword";
    const keyword = (cfg.keyword ?? "").toLowerCase().trim();

    if (mode === "any") {
      return { flowId: flow.id, node: triggerNode };
    }

    if (mode === "keyword" && keyword) {
      if (inboundText.toLowerCase().includes(keyword)) {
        return { flowId: flow.id, node: triggerNode };
      }
    }
  }

  return null;
}
