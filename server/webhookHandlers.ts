/**
 * WhatsApp Webhook Handlers
 *
 * Registers Express routes for receiving inbound messages from:
 *   - Meta Cloud API  (official)  → GET /api/webhook/meta  (verification) + POST /api/webhook/meta
 *   - Evolution API   (unofficial) → POST /api/webhook/evolution/:instanceName
 *
 * On each inbound message:
 *   1. Persist the message and upsert the contact.
 *   2. Check if the contact has an active (waiting) flow session → resumeFlow().
 *   3. Otherwise, check if any active flow matches the trigger keyword → startFlow().
 */

import type { Express, Request, Response } from "express";
import { getDb } from "./db";
import { messages, contacts, contactEvents, whatsappConnections } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { startFlow, resumeFlow, getActiveSession, findMatchingFlow } from "./flowEngine";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Upsert a contact by phone number and return its id. */
async function upsertContactByPhone(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: number,
  phone: string,
  name?: string
): Promise<number | null> {
  if (!db) return null;
  const existing = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.userId, userId), eq(contacts.phone, phone)))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  const result = await db.insert(contacts).values({
    userId,
    name: name ?? phone,
    phone,
    status: "active",
    tags: [],
  });
  return (result as any).insertId ?? null;
}

/** Persist an inbound message and create a contact_event. */
async function persistInboundMessage(
  userId: number,
  contactId: number | null,
  from: string,
  text: string,
  connectionName: string
) {
  const db = await getDb();
  if (!db) return;

  await db.insert(messages).values({
    userId,
    contactId: contactId ?? 0,
    role: "user",
    content: text,
  });

  if (contactId) {
    await (db.insert(contactEvents) as any).values({
      contactId,
      userId,
      type: "message_in",
      title: "Mensagem recebida via WhatsApp",
      description: text.length > 120 ? text.slice(0, 120) + "…" : text,
      metadata: { source: connectionName, from },
    });
  }
}

/**
 * Core inbound message handler — called by both Meta and Evolution handlers.
 * Runs the flow engine logic after persisting the message.
 */
async function handleInboundMessage(
  userId: number,
  connectionId: number,
  connectionName: string,
  from: string,
  text: string
) {
  const db = await getDb();
  if (!db) return;

  // 1. Upsert contact
  const contactId = await upsertContactByPhone(db, userId, from);

  // 2. Persist message
  await persistInboundMessage(userId, contactId, from, text, connectionName);

  if (!contactId) return;

  // 3. Check for active (waiting) session
  const activeSession = await getActiveSession(contactId);
  if (activeSession) {
    // Resume the waiting flow
    await resumeFlow(activeSession.id, text).catch((err) =>
      console.error("[FlowEngine] resumeFlow error:", err)
    );
    return;
  }

  // 4. Check if any active flow matches the trigger
  const match = await findMatchingFlow(userId, text);
  if (match) {
    await startFlow(contactId, match.flowId, connectionId, text).catch((err) =>
      console.error("[FlowEngine] startFlow error:", err)
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Meta Cloud API Webhook
// ─────────────────────────────────────────────────────────────────────────────

function registerMetaWebhook(app: Express) {
  /** Verification challenge (GET) */
  app.get("/api/webhook/meta", (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"] as string | undefined;
    const challenge = req.query["hub.challenge"] as string | undefined;

    if (mode === "subscribe" && token && challenge) {
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  });

  /** Inbound messages (POST) */
  app.post("/api/webhook/meta", async (req: Request, res: Response) => {
    try {
      const body = req.body as any;
      res.sendStatus(200); // Always acknowledge immediately

      if (body?.object !== "whatsapp_business_account") return;

      const db = await getDb();
      if (!db) return;

      for (const entry of body?.entry ?? []) {
        for (const change of entry?.changes ?? []) {
          const value = change?.value;
          const phoneNumberId: string = value?.metadata?.phone_number_id ?? "";

          // Find which connection this belongs to
          const conns = await db
            .select()
            .from(whatsappConnections)
            .where(eq(whatsappConnections.type, "official"));

          const conn = conns.find((c) => {
            const cfg = c.config as Record<string, string>;
            return cfg.phoneNumberId === phoneNumberId;
          });

          if (!conn) continue;

          for (const msg of value?.messages ?? []) {
            if (msg.type !== "text") continue;
            const from: string = msg.from ?? "";
            const text: string = msg.text?.body ?? "";
            if (!from || !text) continue;

            await handleInboundMessage(conn.userId, conn.id, conn.name, from, text);
          }
        }
      }
    } catch (err) {
      console.error("[Meta Webhook] Error:", err);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Evolution API Webhook
// ─────────────────────────────────────────────────────────────────────────────

function registerEvolutionWebhook(app: Express) {
  app.post("/api/webhook/evolution/:instanceName", async (req: Request, res: Response) => {
    try {
      res.sendStatus(200);

      const instanceName = req.params.instanceName;
      const body = req.body as any;

      if (body?.event !== "messages.upsert") return;
      const msgData = body?.data;
      if (!msgData || msgData?.key?.fromMe) return;

      const from: string = (msgData?.key?.remoteJid ?? "").replace(/@.*/, "");
      const text: string =
        msgData?.message?.conversation ??
        msgData?.message?.extendedTextMessage?.text ??
        "";

      if (!from || !text) return;

      const db = await getDb();
      if (!db) return;

      const conns = await db
        .select()
        .from(whatsappConnections)
        .where(eq(whatsappConnections.type, "unofficial"));

      const conn = conns.find((c) => {
        const cfg = c.config as Record<string, string>;
        return cfg.instanceName === instanceName;
      });

      if (!conn) return;

      await handleInboundMessage(conn.userId, conn.id, conn.name, from, text);
    } catch (err) {
      console.error("[Evolution Webhook] Error:", err);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Register all webhook routes
// ─────────────────────────────────────────────────────────────────────────────

export function registerWebhookRoutes(app: Express) {
  registerMetaWebhook(app);
  registerEvolutionWebhook(app);
}
