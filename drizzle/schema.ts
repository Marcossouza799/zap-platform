import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Flows
export const flows = mysqlTable("flows", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["active", "paused", "draft"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Flow = typeof flows.$inferSelect;
export type InsertFlow = typeof flows.$inferInsert;

// Flow Nodes
export const flowNodes = mysqlTable("flow_nodes", {
  id: int("id").autoincrement().primaryKey(),
  flowId: int("flowId").notNull(),
  nodeId: varchar("nodeId", { length: 64 }).notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  subtitle: varchar("subtitle", { length: 255 }).default(""),
  x: int("x").notNull().default(0),
  y: int("y").notNull().default(0),
  bgColor: varchar("bgColor", { length: 32 }).default("#091c34"),
  textColor: varchar("textColor", { length: 32 }).default("#378add"),
  config: json("config").$type<Record<string, unknown>>().default({}),
});

export type FlowNode = typeof flowNodes.$inferSelect;
export type InsertFlowNode = typeof flowNodes.$inferInsert;

// Flow Edges
export const flowEdges = mysqlTable("flow_edges", {
  id: int("id").autoincrement().primaryKey(),
  flowId: int("flowId").notNull(),
  edgeId: varchar("edgeId", { length: 64 }).notNull(),
  sourceNodeId: varchar("sourceNodeId", { length: 64 }).notNull(),
  targetNodeId: varchar("targetNodeId", { length: 64 }).notNull(),
});

export type FlowEdge = typeof flowEdges.$inferSelect;
export type InsertFlowEdge = typeof flowEdges.$inferInsert;

// Contacts
export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  tags: json("tags").$type<string[]>().default([]),
  status: mysqlEnum("status", ["active", "inactive", "waiting"]).default("active").notNull(),
  currentFlow: varchar("currentFlow", { length: 255 }).default(""),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

// Conversations / Messages
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  contactId: int("contactId"),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  isAi: int("isAi").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// Kanban Columns
export const kanbanColumns = mysqlTable("kanban_columns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  color: varchar("color", { length: 32 }).default("#378add"),
  position: int("position").notNull().default(0),
});

export type KanbanColumn = typeof kanbanColumns.$inferSelect;
export type InsertKanbanColumn = typeof kanbanColumns.$inferInsert;

// Kanban Cards
export const kanbanCards = mysqlTable("kanban_cards", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  columnId: int("columnId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }).default(""),
  tags: json("tags").$type<string[]>().default([]),
  value: varchar("value", { length: 64 }).default(""),
  position: int("position").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type KanbanCard = typeof kanbanCards.$inferSelect;
export type InsertKanbanCard = typeof kanbanCards.$inferInsert;

// Flow Dispatches — records each time a flow is triggered against a segment
export const flowDispatches = mysqlTable("flow_dispatches", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  flowId: int("flowId").notNull(),
  flowName: varchar("flowName", { length: 255 }).notNull(),
  /** JSON array of tag strings used as filter; empty array = all contacts */
  tags: json("tags").$type<string[]>().default([]),
  totalContacts: int("totalContacts").notNull().default(0),
  status: mysqlEnum("status", ["pending", "running", "done", "failed"]).default("done").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FlowDispatch = typeof flowDispatches.$inferSelect;
export type InsertFlowDispatch = typeof flowDispatches.$inferInsert;
