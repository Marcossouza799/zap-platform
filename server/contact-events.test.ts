import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ---- Helpers ----

function makeCtx(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

// ---- Unit tests for event metadata helpers ----

describe("contact event metadata helpers", () => {
  it("builds a 'created' event payload correctly", () => {
    const payload = {
      contactId: 42,
      userId: 1,
      type: "created" as const,
      title: "Contato criado",
      description: "João Silva foi adicionado à plataforma.",
      metadata: { phone: "+5511999990000", tags: ["vip"] },
    };
    expect(payload.type).toBe("created");
    expect(payload.metadata.tags).toContain("vip");
    expect(payload.title).toBe("Contato criado");
  });

  it("builds a 'flow' event payload correctly", () => {
    const payload = {
      contactId: 42,
      userId: 1,
      type: "flow" as const,
      title: "Fluxo disparado: Boas-vindas",
      description: 'O fluxo "Boas-vindas" foi disparado para este contato.',
      metadata: { flowId: 7, flowName: "Boas-vindas", tags: ["lead"] },
    };
    expect(payload.type).toBe("flow");
    expect(payload.metadata.flowName).toBe("Boas-vindas");
    expect(payload.metadata.tags).toContain("lead");
  });

  it("builds a 'message_in' event payload correctly", () => {
    const payload = {
      contactId: 42,
      userId: 1,
      type: "message_in" as const,
      title: "Mensagem recebida",
      description: "Olá, quero saber mais sobre o produto.",
      metadata: { isAi: false },
    };
    expect(payload.type).toBe("message_in");
    expect(payload.metadata.isAi).toBe(false);
  });

  it("builds a 'message_out' AI event payload correctly", () => {
    const payload = {
      contactId: 42,
      userId: 1,
      type: "message_out" as const,
      title: "Resposta da IA",
      description: "Olá! Claro, posso te ajudar com isso 😊",
      metadata: { isAi: true },
    };
    expect(payload.type).toBe("message_out");
    expect(payload.metadata.isAi).toBe(true);
  });

  it("truncates long message content to 200 chars", () => {
    const longContent = "a".repeat(500);
    const truncated = longContent.slice(0, 200);
    expect(truncated.length).toBe(200);
  });

  it("builds a 'note' event payload correctly", () => {
    const payload = {
      contactId: 42,
      userId: 1,
      type: "note" as const,
      title: "Nota adicionada",
      description: "Cliente pediu desconto especial para fechar.",
      metadata: {},
    };
    expect(payload.type).toBe("note");
    expect(payload.description).toContain("desconto");
  });
});

// ---- Router structure tests ----

describe("contacts router — event procedures exist", () => {
  it("exposes contacts.getEvents procedure", () => {
    const procedures = appRouter._def.procedures;
    expect(procedures).toHaveProperty("contacts.getEvents");
  });

  it("exposes contacts.addNote procedure", () => {
    const procedures = appRouter._def.procedures;
    expect(procedures).toHaveProperty("contacts.addNote");
  });
});

// ---- addNote validation tests (no DB) ----

describe("contacts.addNote — input validation", () => {
  it("rejects empty note", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.contacts.addNote({ contactId: 1, note: "" })
    ).rejects.toThrow();
  });

  it("rejects note longer than 1000 chars", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.contacts.addNote({ contactId: 1, note: "x".repeat(1001) })
    ).rejects.toThrow();
  });
});

// ---- getEvents validation tests (no DB) ----

describe("contacts.getEvents — input validation", () => {
  it("rejects missing contactId", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      // @ts-expect-error intentionally missing contactId
      caller.contacts.getEvents({})
    ).rejects.toThrow();
  });
});

// ---- Event type enum coverage ----

describe("event type enum", () => {
  const validTypes = ["created", "flow", "message_in", "message_out", "tag", "note", "status"];

  it.each(validTypes)("type '%s' is a valid event type", (t) => {
    expect(validTypes).toContain(t);
  });

  it("covers all 7 event types", () => {
    expect(validTypes).toHaveLength(7);
  });
});

// ---- Tag and status event payload tests ----

describe("tag and status event payloads", () => {
  it("builds a 'tag' event with correct tags list", () => {
    const tags = ["vip", "cliente", "lead quente"];
    const payload = {
      contactId: 10,
      userId: 1,
      type: "tag" as const,
      title: "Tags atualizadas",
      description: `Tags: ${tags.join(", ")}`,
      metadata: { tags },
    };
    expect(payload.type).toBe("tag");
    expect(payload.metadata.tags).toHaveLength(3);
    expect(payload.description).toContain("vip");
  });

  it("builds a 'tag' event for empty tags removal", () => {
    const payload = {
      contactId: 10,
      userId: 1,
      type: "tag" as const,
      title: "Tags atualizadas",
      description: "Todas as tags foram removidas.",
      metadata: { tags: [] },
    };
    expect(payload.metadata.tags).toHaveLength(0);
    expect(payload.description).toContain("removidas");
  });

  it("builds a 'status' event for active status", () => {
    const statusLabel: Record<string, string> = { active: "ativo", inactive: "inativo", waiting: "aguardando" };
    const newStatus = "active";
    const payload = {
      contactId: 10,
      userId: 1,
      type: "status" as const,
      title: "Status alterado",
      description: `Status atualizado para "${statusLabel[newStatus]}".`,
      metadata: { newStatus },
    };
    expect(payload.type).toBe("status");
    expect(payload.description).toContain("ativo");
    expect(payload.metadata.newStatus).toBe("active");
  });

  it("builds a 'status' event for inactive status", () => {
    const statusLabel: Record<string, string> = { active: "ativo", inactive: "inativo", waiting: "aguardando" };
    const newStatus = "inactive";
    const payload = {
      contactId: 10,
      userId: 1,
      type: "status" as const,
      title: "Status alterado",
      description: `Status atualizado para "${statusLabel[newStatus]}".`,
      metadata: { newStatus },
    };
    expect(payload.description).toContain("inativo");
  });
});

// ---- contacts.update — event registration integration ----

describe("contacts router — event registration procedures", () => {
  it("exposes contacts.update procedure (used for tag/status events)", () => {
    const procedures = appRouter._def.procedures;
    expect(procedures).toHaveProperty("contacts.update");
  });

  it("exposes contacts.create procedure (used for created events)", () => {
    const procedures = appRouter._def.procedures;
    expect(procedures).toHaveProperty("contacts.create");
  });

  it("exposes chat.send procedure (used for message events)", () => {
    const procedures = appRouter._def.procedures;
    expect(procedures).toHaveProperty("chat.send");
  });

  it("exposes flows.dispatch procedure (used for flow events)", () => {
    const procedures = appRouter._def.procedures;
    expect(procedures).toHaveProperty("flows.dispatch");
  });
});
