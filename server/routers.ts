import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { parseImportFile, applyMapping } from "./importParser";
import {
  testOfficialConnection,
  createEvolutionInstance,
  getEvolutionQrCode,
  getEvolutionConnectionState,
  disconnectEvolutionInstance,
} from "./whatsapp";
import { startFlow } from "./flowEngine";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ---- Dashboard ----
  dashboard: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      return db.getDashboardStats(ctx.user.id);
    }),
  }),

  // ---- Flows ----
  flows: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getFlows(ctx.user.id);
    }),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      const flow = await db.getFlowById(input.id, ctx.user.id);
      if (!flow) return null;
      const nodes = await db.getFlowNodes(flow.id);
      const edges = await db.getFlowEdges(flow.id);
      return { ...flow, nodes, edges };
    }),
    create: protectedProcedure.input(z.object({ name: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      return db.createFlow({ userId: ctx.user.id, name: input.name, status: "draft" });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      status: z.enum(["active", "paused", "draft"]).optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateFlow(id, ctx.user.id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.deleteFlow(input.id, ctx.user.id);
      return { success: true };
    }),
    duplicate: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const flow = await db.getFlowById(input.id, ctx.user.id);
      if (!flow) throw new Error("Flow not found");
      const nodes = await db.getFlowNodes(flow.id);
      const edges = await db.getFlowEdges(flow.id);
      const newFlow = await db.createFlow({ userId: ctx.user.id, name: `${flow.name} (cópia)`, status: "draft" });
      if (nodes.length > 0) {
        await db.saveFlowNodes(newFlow.id, nodes.map(n => ({ ...n, id: undefined, flowId: newFlow.id } as any)));
      }
      if (edges.length > 0) {
        await db.saveFlowEdges(newFlow.id, edges.map(e => ({ ...e, id: undefined, flowId: newFlow.id } as any)));
      }
      return newFlow;
    }),
    saveCanvas: protectedProcedure.input(z.object({
      flowId: z.number(),
      nodes: z.array(z.object({
        nodeId: z.string(),
        type: z.string(),
        label: z.string(),
        subtitle: z.string().optional(),
        x: z.number(),
        y: z.number(),
        bgColor: z.string().optional(),
        textColor: z.string().optional(),
        config: z.record(z.string(), z.unknown()).optional(),
      })),
      edges: z.array(z.object({
        edgeId: z.string(),
        sourceNodeId: z.string(),
        sourcePortId: z.string().optional(),
        targetNodeId: z.string(),
      })),
    })).mutation(async ({ ctx, input }) => {
      const flow = await db.getFlowById(input.flowId, ctx.user.id);
      if (!flow) throw new Error("Flow not found");
      await db.saveFlowNodes(input.flowId, input.nodes.map(n => ({ ...n, flowId: input.flowId, config: (n.config ?? {}) })));
      await db.saveFlowEdges(input.flowId, input.edges.map(e => ({ ...e, sourcePortId: e.sourcePortId ?? 'out', flowId: input.flowId })));
      return { success: true };
    }),

    // --- Segmentation: list all unique tags from user contacts ---
    getContactTags: protectedProcedure.query(async ({ ctx }) => {
      return db.getContactTags(ctx.user.id);
    }),

    // --- Segmentation: preview contacts matching selected tags ---
    previewSegment: protectedProcedure
      .input(z.object({ tags: z.array(z.string()) }))
      .mutation(async ({ ctx, input }) => {
        const matched = await db.getContactsByTags(ctx.user.id, input.tags);
        return {
          total: matched.length,
          preview: matched.slice(0, 8).map(c => ({ id: c.id, name: c.name, phone: c.phone, tags: c.tags })),
        };
      }),

    // --- Segmentation: confirm and record a dispatch ---
    dispatch: protectedProcedure
      .input(z.object({
        flowId: z.number(),
        tags: z.array(z.string()),
      }))
      .mutation(async ({ ctx, input }) => {
        const flow = await db.getFlowById(input.flowId, ctx.user.id);
        if (!flow) throw new Error("Fluxo não encontrado");
        const matched = await db.getContactsByTags(ctx.user.id, input.tags);
        await db.createDispatch({
          userId: ctx.user.id,
          flowId: flow.id,
          flowName: flow.name,
          tags: input.tags,
          totalContacts: matched.length,
          status: "done",
        });
        // Mark matched contacts as running this flow and register timeline event
        for (const c of matched) {
          await db.updateContact(c.id, ctx.user.id, { currentFlow: flow.name });
          await db.createContactEvent({
            contactId: c.id,
            userId: ctx.user.id,
            type: "flow",
            title: `Fluxo disparado: ${flow.name}`,
            description: `O fluxo "${flow.name}" foi disparado para este contato.`,
            metadata: {
              flowId: flow.id,
              flowName: flow.name,
              tags: input.tags,
            },
          }).catch(() => {});
        }
        return { dispatched: matched.length, flowName: flow.name };
      }),

    // --- Segmentation: history of dispatches for a flow ---
    getDispatches: protectedProcedure
      .input(z.object({ flowId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getFlowDispatches(input.flowId, ctx.user.id);
      }),

    // --- Segmentation: all dispatches for the user (dashboard) ---
    getAllDispatches: protectedProcedure.query(async ({ ctx }) => {
      return db.getAllDispatches(ctx.user.id);
    }),
  }),

  // ---- Contacts ----
  contacts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getContacts(ctx.user.id);
    }),
    create: protectedProcedure.input(z.object({
      name: z.string().min(1),
      phone: z.string().min(1),
      tags: z.array(z.string()).optional(),
      status: z.enum(["active", "inactive", "waiting"]).optional(),
      currentFlow: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const contact = await db.createContact({ ...input, userId: ctx.user.id, tags: input.tags ?? [] });
      // Register 'created' event in timeline
      if (contact?.id) {
        await db.createContactEvent({
          contactId: contact.id,
          userId: ctx.user.id,
          type: "created",
          title: "Contato criado",
          description: `${input.name} foi adicionado à plataforma.`,
          metadata: { phone: input.phone, tags: input.tags ?? [] },
        }).catch(() => {});
      }
      return contact;
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      phone: z.string().optional(),
      tags: z.array(z.string()).optional(),
      status: z.enum(["active", "inactive", "waiting"]).optional(),
      currentFlow: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateContact(id, ctx.user.id, data);
      // Register tag event if tags were updated
      if (input.tags !== undefined) {
        await db.createContactEvent({
          contactId: id,
          userId: ctx.user.id,
          type: "tag",
          title: "Tags atualizadas",
          description: input.tags.length > 0 ? `Tags: ${input.tags.join(", ")}` : "Todas as tags foram removidas.",
          metadata: { tags: input.tags },
        }).catch(() => {});
      }
      // Register status event if status was updated
      if (input.status !== undefined) {
        const statusLabel: Record<string, string> = { active: "ativo", inactive: "inativo", waiting: "aguardando" };
        await db.createContactEvent({
          contactId: id,
          userId: ctx.user.id,
          type: "status",
          title: "Status alterado",
          description: `Status atualizado para "${statusLabel[input.status] ?? input.status}".`,
          metadata: { newStatus: input.status },
        }).catch(() => {});
      }
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.deleteContact(input.id, ctx.user.id);
      return { success: true };
    }),

    // --- Import: step 1 — parse file and return columns + preview rows ---
    importPreview: protectedProcedure.input(z.object({
      fileBase64: z.string(),
      mimeType: z.string(),
    })).mutation(async ({ input }) => {
      const result = parseImportFile(input.fileBase64, input.mimeType);
      return {
        columns: result.columns,
        previewRows: result.rows.slice(0, 5),
        totalRows: result.totalRows,
        errors: result.errors,
        // all rows needed for confirm step (capped at 5000)
        allRows: result.rows.slice(0, 5000),
      };
    }),

    // --- Import: step 2 — apply mapping and bulk-insert contacts ---
    importConfirm: protectedProcedure.input(z.object({
      rows: z.array(z.record(z.string(), z.string())),
      mapping: z.object({
        nome: z.string(),
        telefone: z.string(),
        tags: z.string().optional().default(""),
        email: z.string().optional().default(""),
      }),
    })).mutation(async ({ ctx, input }) => {
      const mapped = applyMapping(input.rows, {
        nome: input.mapping.nome,
        telefone: input.mapping.telefone,
        tags: input.mapping.tags ?? "",
        email: input.mapping.email ?? "",
      });
      const result = await db.bulkCreateContacts(ctx.user.id, mapped);
      return result;
    }),

    // --- Contact Events: list timeline ---
    getEvents: protectedProcedure
      .input(z.object({ contactId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getContactEvents(input.contactId, ctx.user.id);
      }),

    // --- Contact Events: add manual note ---
    addNote: protectedProcedure
      .input(z.object({
        contactId: z.number(),
        note: z.string().min(1).max(1000),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createContactEvent({
          contactId: input.contactId,
          userId: ctx.user.id,
          type: "note",
          title: "Nota adicionada",
          description: input.note,
          metadata: {},
        });
        return { success: true };
      }),
  }),

  // ---- Messages / Chat ----
  chat: router({
    list: protectedProcedure.input(z.object({ contactId: z.number().optional() }).optional()).query(async ({ ctx, input }) => {
      return db.getMessages(ctx.user.id, input?.contactId);
    }),
    send: protectedProcedure.input(z.object({
      content: z.string().min(1),
      role: z.enum(["user", "assistant"]),
      contactId: z.number().optional(),
      isAi: z.boolean().optional(),
    })).mutation(async ({ ctx, input }) => {
      const msg = await db.createMessage({
        userId: ctx.user.id,
        content: input.content,
        role: input.role,
        contactId: input.contactId ?? null,
        isAi: input.isAi ? 1 : 0,
      });
      // Register message event in contact timeline (if linked to a contact)
      if (input.contactId) {
        const eventType = input.role === "user" ? "message_in" : "message_out";
        const eventTitle = input.role === "user" ? "Mensagem recebida" : (input.isAi ? "Resposta da IA" : "Mensagem enviada");
        await db.createContactEvent({
          contactId: input.contactId,
          userId: ctx.user.id,
          type: eventType,
          title: eventTitle,
          description: input.content.slice(0, 200),
          metadata: { isAi: !!input.isAi },
        }).catch(() => {});
      }
      return msg;
    }),
    aiReply: protectedProcedure.input(z.object({
      messages: z.array(z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      })),
      systemPrompt: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const systemMsg = input.systemPrompt || "Você é um assistente de vendas no WhatsApp. Responda de forma CURTA e conversacional, como numa troca real de WhatsApp (2-3 frases no máximo). Use emojis com moderação. Seja amigável e conduza naturalmente para o fechamento. Nunca revele que é IA a menos que perguntado diretamente.";
      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemMsg },
          ...input.messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        ],
      });
      const reply = result.choices?.[0]?.message?.content;
      const text = typeof reply === "string" ? reply : Array.isArray(reply) ? reply.map((p: any) => p.text || "").join("") : "";
      return { reply: text };
    }),
    clear: protectedProcedure.mutation(async ({ ctx }) => {
      await db.clearMessages(ctx.user.id);
      return { success: true };
    }),
  }),

  // ---- Kanban ----
  kanban: router({
    getBoard: protectedProcedure.query(async ({ ctx }) => {
      const columns = await db.initDefaultKanbanColumns(ctx.user.id);
      const cards = await db.getKanbanCards(ctx.user.id);
      return { columns, cards };
    }),
    createCard: protectedProcedure.input(z.object({
      columnId: z.number(),
      name: z.string().min(1),
      phone: z.string().optional(),
      tags: z.array(z.string()).optional(),
      value: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      return db.createKanbanCard({
        userId: ctx.user.id,
        columnId: input.columnId,
        name: input.name,
        phone: input.phone ?? "",
        tags: input.tags ?? [],
        value: input.value ?? "",
        position: 0,
      });
    }),
    updateCard: protectedProcedure.input(z.object({
      id: z.number(),
      columnId: z.number().optional(),
      name: z.string().optional(),
      phone: z.string().optional(),
      tags: z.array(z.string()).optional(),
      value: z.string().optional(),
      position: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateKanbanCard(id, ctx.user.id, data);
      return { success: true };
    }),
    deleteCard: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.deleteKanbanCard(input.id, ctx.user.id);
      return { success: true };
    }),
  }),

  // ---- WhatsApp Connections ----
  connections: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getWhatsappConnections(ctx.user.id);
    }),

    create: protectedProcedure.input(z.object({
      name: z.string().min(1).max(100),
      type: z.enum(["official", "unofficial"]),
      config: z.record(z.string(), z.string()),
    })).mutation(async ({ ctx, input }) => {
      return db.createWhatsappConnection({
        userId: ctx.user.id,
        name: input.name,
        type: input.type,
        config: input.config,
        status: "disconnected",
        qrCode: "",
        phone: "",
      });
    }),

    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().min(1).max(100).optional(),
      config: z.record(z.string(), z.string()).optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateWhatsappConnection(id, ctx.user.id, data);
      return { success: true };
    }),

    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.deleteWhatsappConnection(input.id, ctx.user.id);
      return { success: true };
    }),

    // Test official connection (Meta Cloud API)
    testOfficial: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const conn = await db.getWhatsappConnectionById(input.id, ctx.user.id);
      if (!conn || conn.type !== "official") throw new Error("Conexão não encontrada ou tipo inválido");
      const cfg = conn.config as Record<string, string>;
      const result = await testOfficialConnection({
        phoneNumberId: cfg.phoneNumberId ?? "",
        accessToken: cfg.accessToken ?? "",
      });
      if (result.success) {
        await db.updateWhatsappConnection(input.id, ctx.user.id, {
          status: "connected",
          phone: result.phone ?? "",
        });
      } else {
        await db.updateWhatsappConnection(input.id, ctx.user.id, { status: "error" });
      }
      return result;
    }),

    // Connect unofficial (Evolution API) — creates instance and returns QR code
    connectUnofficial: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const conn = await db.getWhatsappConnectionById(input.id, ctx.user.id);
      if (!conn || conn.type !== "unofficial") throw new Error("Conexão não encontrada ou tipo inválido");
      const cfg = conn.config as Record<string, string>;
      const evoCfg = { serverUrl: cfg.serverUrl ?? "", apiKey: cfg.apiKey ?? "", instanceName: cfg.instanceName ?? "" };
      // Create instance (idempotent)
      await createEvolutionInstance(evoCfg);
      // Fetch QR code
      const qrResult = await getEvolutionQrCode(evoCfg);
      if (qrResult.success && qrResult.qrCode) {
        await db.updateWhatsappConnection(input.id, ctx.user.id, {
          status: "connecting",
          qrCode: qrResult.qrCode,
        });
        return { success: true, qrCode: qrResult.qrCode };
      }
      await db.updateWhatsappConnection(input.id, ctx.user.id, { status: "error" });
      return { success: false, error: qrResult.error ?? "Falha ao gerar QR code" };
    }),

    // Poll connection state for unofficial (after QR scan)
    pollState: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const conn = await db.getWhatsappConnectionById(input.id, ctx.user.id);
      if (!conn || conn.type !== "unofficial") throw new Error("Conexão não encontrada");
      const cfg = conn.config as Record<string, string>;
      const evoCfg = { serverUrl: cfg.serverUrl ?? "", apiKey: cfg.apiKey ?? "", instanceName: cfg.instanceName ?? "" };
      const state = await getEvolutionConnectionState(evoCfg);
      if (state.success) {
        await db.updateWhatsappConnection(input.id, ctx.user.id, {
          status: "connected",
          phone: state.phone ?? "",
          qrCode: "",
        });
      }
      return state;
    }),

    // Disconnect unofficial instance
    disconnect: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const conn = await db.getWhatsappConnectionById(input.id, ctx.user.id);
      if (!conn) throw new Error("Conexão não encontrada");
      if (conn.type === "unofficial") {
        const cfg = conn.config as Record<string, string>;
        await disconnectEvolutionInstance({ serverUrl: cfg.serverUrl ?? "", apiKey: cfg.apiKey ?? "", instanceName: cfg.instanceName ?? "" });
      }
      await db.updateWhatsappConnection(input.id, ctx.user.id, { status: "disconnected", qrCode: "" });
      return { success: true };
    }),
    // Get webhook info for setup (public URL and verification token)
    getWebhookInfo: protectedProcedure.query(async () => {
      const { ENV } = await import("./_core/env");
      return {
        success: true,
        webhookUrl: `${ENV.publicUrl}/api/webhook/meta`,
        verificationToken: ENV.webhookToken,
        platforms: {
          meta: {
            webhookUrl: `${ENV.publicUrl}/api/webhook/meta`,
            verificationToken: ENV.webhookToken,
            description: "Meta Cloud API webhook URL",
          },
          evolution: {
            baseUrl: `${ENV.publicUrl}/api/webhook/evolution`,
            description: "Evolution API webhook base URL (append /:instanceName)",
          },
        },
      };
    }),
  }),
  // ─── Flow Sessions (monitoring) ───────────────────────────────────────────
  sessions: router({
    // List all sessions for the current user (optionally filtered by flowId)
    list: protectedProcedure
      .input(z.object({ flowId: z.number().optional(), limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return db.listFlowSessions(ctx.user.id, input.flowId, input.limit ?? 50);
      }),
    // Get execution logs for a specific session
    logs: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getSessionLogs(input.sessionId, ctx.user.id);
      }),
    // Manually start a flow for a contact (for testing)
    start: protectedProcedure
      .input(z.object({ contactId: z.number(), flowId: z.number(), connectionId: z.number() }))
      .mutation(async ({ input }) => {
        return startFlow(input.contactId, input.flowId, input.connectionId, "manual_trigger");
      }),
    // Get stats: active, waiting, completed, error counts
    stats: protectedProcedure.query(async ({ ctx }) => {
      return db.getSessionStats(ctx.user.id);
    }),
  }),
});
export type AppRouter = typeof appRouter;
