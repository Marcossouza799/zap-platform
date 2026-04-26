import { eq, desc, asc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  flows, InsertFlow,
  flowNodes, InsertFlowNode,
  flowEdges, InsertFlowEdge,
  contacts, InsertContact,
  messages, InsertMessage,
  kanbanColumns, InsertKanbanColumn,
  kanbanCards, InsertKanbanCard,
  flowDispatches, InsertFlowDispatch,
  contactEvents, InsertContactEvent,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ---- Users ----
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ---- Flows ----
export async function getFlows(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(flows).where(eq(flows.userId, userId)).orderBy(desc(flows.updatedAt));
}

export async function getFlowById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(flows).where(and(eq(flows.id, id), eq(flows.userId, userId))).limit(1);
  return result[0];
}

export async function createFlow(data: InsertFlow) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(flows).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateFlow(id: number, userId: number, data: Partial<InsertFlow>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(flows).set(data).where(and(eq(flows.id, id), eq(flows.userId, userId)));
}

export async function deleteFlow(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(flowNodes).where(eq(flowNodes.flowId, id));
  await db.delete(flowEdges).where(eq(flowEdges.flowId, id));
  await db.delete(flows).where(and(eq(flows.id, id), eq(flows.userId, userId)));
}

// ---- Flow Nodes ----
export async function getFlowNodes(flowId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(flowNodes).where(eq(flowNodes.flowId, flowId));
}

export async function saveFlowNodes(flowId: number, nodes: InsertFlowNode[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(flowNodes).where(eq(flowNodes.flowId, flowId));
  if (nodes.length > 0) {
    await db.insert(flowNodes).values(nodes);
  }
}

// ---- Flow Edges ----
export async function getFlowEdges(flowId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(flowEdges).where(eq(flowEdges.flowId, flowId));
}

export async function saveFlowEdges(flowId: number, edges: InsertFlowEdge[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(flowEdges).where(eq(flowEdges.flowId, flowId));
  if (edges.length > 0) {
    await db.insert(flowEdges).values(edges);
  }
}

// ---- Contacts ----
export async function getContacts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contacts).where(eq(contacts.userId, userId)).orderBy(desc(contacts.updatedAt));
}

export async function createContact(data: InsertContact) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(contacts).values(data);
  return { id: result[0].insertId };
}

export async function updateContact(id: number, userId: number, data: Partial<InsertContact>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(contacts).set(data).where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
}

export async function deleteContact(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
}

/**
 * Bulk-insert contacts, skipping duplicates by phone number.
 * Returns { inserted, skipped } counts.
 */
export async function bulkCreateContacts(
  userId: number,
  rows: Array<{ name: string; phone: string; tags: string[]; email?: string }>
): Promise<{ inserted: number; skipped: number }> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // Fetch existing phones for this user to detect duplicates
  const existing = await db
    .select({ phone: contacts.phone })
    .from(contacts)
    .where(eq(contacts.userId, userId));
  const existingPhones = new Set(existing.map((r) => r.phone.trim()));

  const toInsert = rows.filter(
    (r) => r.phone && !existingPhones.has(r.phone.trim())
  );
  const skipped = rows.length - toInsert.length;

  if (toInsert.length === 0) {
    return { inserted: 0, skipped };
  }

  // Insert in batches of 100 to avoid query size limits
  const BATCH = 100;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH).map((r) => ({
      userId,
      name: r.name || r.phone,
      phone: r.phone,
      tags: r.tags,
      status: "active" as const,
      currentFlow: "",
    }));
    await db.insert(contacts).values(batch);
  }

  return { inserted: toInsert.length, skipped };
}

// ---- Messages ----
export async function getMessages(userId: number, contactId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(messages.userId, userId)];
  if (contactId) conditions.push(eq(messages.contactId, contactId));
  return db.select().from(messages).where(and(...conditions)).orderBy(asc(messages.createdAt));
}

export async function createMessage(data: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(messages).values(data);
  return { id: result[0].insertId };
}

export async function clearMessages(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(messages).where(eq(messages.userId, userId));
}

// ---- Kanban ----
export async function initDefaultKanbanColumns(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const existing = await db.select().from(kanbanColumns).where(eq(kanbanColumns.userId, userId));
  if (existing.length > 0) return existing;

  const defaults: InsertKanbanColumn[] = [
    { userId, title: "Novo Lead", color: "#378add", position: 0 },
    { userId, title: "Qualificado", color: "#25d366", position: 1 },
    { userId, title: "Proposta", color: "#ef9f27", position: 2 },
    { userId, title: "Fechado", color: "#a855f7", position: 3 },
    { userId, title: "Perdido", color: "#ef4444", position: 4 },
  ];
  await db.insert(kanbanColumns).values(defaults);
  return db.select().from(kanbanColumns).where(eq(kanbanColumns.userId, userId));
}

export async function getKanbanCards(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(kanbanCards).where(eq(kanbanCards.userId, userId)).orderBy(asc(kanbanCards.position));
}

export async function createKanbanCard(data: InsertKanbanCard) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(kanbanCards).values(data);
  return { id: result[0].insertId };
}

export async function updateKanbanCard(id: number, userId: number, data: Partial<InsertKanbanCard>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(kanbanCards).set(data).where(and(eq(kanbanCards.id, id), eq(kanbanCards.userId, userId)));
}

export async function deleteKanbanCard(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(kanbanCards).where(and(eq(kanbanCards.id, id), eq(kanbanCards.userId, userId)));
}

// ---- Flow Dispatches ----

/**
 * Returns all unique tags used across a user's contacts.
 */
export async function getContactTags(userId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ tags: contacts.tags }).from(contacts).where(eq(contacts.userId, userId));
  const tagSet = new Set<string>();
  for (const row of rows) {
    const tags = Array.isArray(row.tags) ? row.tags : [];
    for (const t of tags) if (t) tagSet.add(t.toLowerCase().trim());
  }
  return Array.from(tagSet).sort();
}

/**
 * Returns contacts for a user, optionally filtered by tags (OR logic).
 * Empty tags array = all contacts.
 */
export async function getContactsByTags(
  userId: number,
  tags: string[]
): Promise<Array<{ id: number; name: string; phone: string; tags: string[] }>> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ id: contacts.id, name: contacts.name, phone: contacts.phone, tags: contacts.tags })
    .from(contacts)
    .where(eq(contacts.userId, userId));

  if (tags.length === 0) return rows.map(r => ({ ...r, tags: Array.isArray(r.tags) ? r.tags : [] }));

  const lowerTags = tags.map(t => t.toLowerCase().trim());
  return rows
    .filter(r => {
      const contactTags = (Array.isArray(r.tags) ? r.tags : []).map((t: string) => t.toLowerCase().trim());
      return lowerTags.some(tag => contactTags.includes(tag));
    })
    .map(r => ({ ...r, tags: Array.isArray(r.tags) ? r.tags : [] }));
}

/**
 * Records a dispatch event and returns the inserted id.
 */
export async function createDispatch(data: InsertFlowDispatch): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(flowDispatches).values(data);
  return { id: result[0].insertId };
}

/**
 * Returns dispatch history for a specific flow, newest first.
 */
export async function getFlowDispatches(flowId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(flowDispatches)
    .where(and(eq(flowDispatches.flowId, flowId), eq(flowDispatches.userId, userId)))
    .orderBy(desc(flowDispatches.createdAt))
    .limit(20);
}

/**
 * Returns all dispatches for a user, newest first (for the overview list).
 */
export async function getAllDispatches(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(flowDispatches)
    .where(eq(flowDispatches.userId, userId))
    .orderBy(desc(flowDispatches.createdAt))
    .limit(50);
}

// ---- Contact Events ----

/**
 * Insert a new event into the contact timeline.
 */
export async function createContactEvent(data: InsertContactEvent): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(contactEvents).values({
    ...data,
    description: data.description ?? null,
    metadata: data.metadata ?? {},
  });
}

/**
 * Returns all events for a contact, newest first.
 */
export async function getContactEvents(contactId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(contactEvents)
    .where(and(eq(contactEvents.contactId, contactId), eq(contactEvents.userId, userId)))
    .orderBy(desc(contactEvents.createdAt))
    .limit(100);
}

// ---- Dashboard Stats ----
export async function getDashboardStats(userId: number) {
  const db = await getDb();
  if (!db) return { totalContacts: 0, totalMessages: 0, activeFlows: 0, activeConversations: 0, conversionRate: 0 };
  const [contactCount] = await db.select({ count: sql<number>`count(*)` }).from(contacts).where(eq(contacts.userId, userId));
  const [messageCount] = await db.select({ count: sql<number>`count(*)` }).from(messages).where(eq(messages.userId, userId));
  const [flowCount] = await db.select({ count: sql<number>`count(*)` }).from(flows).where(and(eq(flows.userId, userId), eq(flows.status, "active")));
  const [activeCount] = await db.select({ count: sql<number>`count(*)` }).from(contacts).where(and(eq(contacts.userId, userId), eq(contacts.status, "active")));
  const total = contactCount?.count ?? 0;
  const active = activeCount?.count ?? 0;
  const conversionRate = total > 0 ? Math.round((active / total) * 100) : 0;
  return {
    totalContacts: total,
    totalMessages: messageCount?.count ?? 0,
    activeFlows: flowCount?.count ?? 0,
    activeConversations: active,
    conversionRate,
  };
}
