import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";

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
        targetNodeId: z.string(),
      })),
    })).mutation(async ({ ctx, input }) => {
      const flow = await db.getFlowById(input.flowId, ctx.user.id);
      if (!flow) throw new Error("Flow not found");
      await db.saveFlowNodes(input.flowId, input.nodes.map(n => ({ ...n, flowId: input.flowId, config: (n.config ?? {}) })));
      await db.saveFlowEdges(input.flowId, input.edges.map(e => ({ ...e, flowId: input.flowId })));
      return { success: true };
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
      return db.createContact({ ...input, userId: ctx.user.id, tags: input.tags ?? [] });
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
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.deleteContact(input.id, ctx.user.id);
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
      return db.createMessage({
        userId: ctx.user.id,
        content: input.content,
        role: input.role,
        contactId: input.contactId ?? null,
        isAi: input.isAi ? 1 : 0,
      });
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
});

export type AppRouter = typeof appRouter;
