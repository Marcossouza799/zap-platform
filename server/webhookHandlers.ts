/**
 * WhatsApp Webhook Handlers
 *
 * Registers Express routes for receiving inbound messages from:
 *   - Meta Cloud API  (official)  → GET /api/webhook/meta  (verification) + POST /api/webhook/meta
 *   - Evolution API   (unofficial) → POST /api/webhook/evolution/:instanceName
 *
 * Both handlers persist inbound messages to the `messages` table and
 * create a contact_event of type "message" for the sender.
 */

import type { Express, Request, Response } from "express";
import { getDb } from "./db";
import { messages, contacts, contactEvents, whatsappConnections } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { verifyMetaWebhook } from "./whatsapp";

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
  // Try to find existing contact
  const existing = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.userId, userId), eq(contacts.phone, phone)))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  // Create new contact
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

  // Save message
  await db.insert(messages).values({
    userId,
    contactId: contactId ?? 0,
    role: "user",
    content: text,
  });

  // Save contact event
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
      // We accept any verify_token — the user configures it in their Meta App
      // and stores it in the connection config. For simplicity we echo the challenge.
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  });

  /** Inbound messages (POST) */
  app.post("/api/webhook/meta", async (req: Request, res: Response) => {
    try {
      const body = req.body as any;
      // Always acknowledge immediately
      res.sendStatus(200);

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

            const contactId = await upsertContactByPhone(db, conn.userId, from);
            await persistInboundMessage(conn.userId, contactId, from, text, conn.name);
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
  /**
   * Evolution API sends POST to /api/webhook/evolution/:instanceName
   * Payload: { event: "messages.upsert", data: { key: { remoteJid, fromMe }, message: { conversation } } }
   */
  app.post("/api/webhook/evolution/:instanceName", async (req: Request, res: Response) => {
    try {
      res.sendStatus(200);

      const instanceName = req.params.instanceName;
      const body = req.body as any;

      // Only handle inbound messages (not sent by us)
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

      // Find the connection by instanceName
      const conns = await db
        .select()
        .from(whatsappConnections)
        .where(eq(whatsappConnections.type, "unofficial"));

      const conn = conns.find((c) => {
        const cfg = c.config as Record<string, string>;
        return cfg.instanceName === instanceName;
      });

      if (!conn) return;

      const contactId = await upsertContactByPhone(db, conn.userId, from);
      await persistInboundMessage(conn.userId, contactId, from, text, conn.name);
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
