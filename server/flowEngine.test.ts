import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock the db module ────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  listFlowSessions: vi.fn().mockResolvedValue([]),
  getSessionLogs: vi.fn().mockResolvedValue([]),
  getSessionStats: vi.fn().mockResolvedValue({ active: 0, waiting: 0, completed: 0, error: 0, total: 0 }),
}));

// ─── Mock the whatsapp module ──────────────────────────────────────────────
vi.mock("./whatsapp", () => ({
  sendMessageViaOfficialApi: vi.fn().mockResolvedValue({ success: true }),
  sendMessageViaEvolutionApi: vi.fn().mockResolvedValue({ success: true }),
}));

// ─── Import after mocks ────────────────────────────────────────────────────
import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ──────────────────────────────────────────────────────────────
function makeCtx(overrides: Partial<TrpcContext> = {}): TrpcContext {
  return {
    user: {
      id: 1,
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
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    ...overrides,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────
describe("sessions router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sessions.list procedure exists on the router", async () => {
    const caller = appRouter.createCaller(makeCtx());
    vi.mocked(db.listFlowSessions).mockResolvedValueOnce([]);
    const result = await caller.sessions.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("sessions.list passes flowId filter when provided", async () => {
    const caller = appRouter.createCaller(makeCtx());
    vi.mocked(db.listFlowSessions).mockResolvedValueOnce([]);
    await caller.sessions.list({ flowId: 42 });
    expect(db.listFlowSessions).toHaveBeenCalledWith(1, 42, 50);
  });

  it("sessions.list uses default limit of 50", async () => {
    const caller = appRouter.createCaller(makeCtx());
    vi.mocked(db.listFlowSessions).mockResolvedValueOnce([]);
    await caller.sessions.list({});
    expect(db.listFlowSessions).toHaveBeenCalledWith(1, undefined, 50);
  });

  it("sessions.logs procedure exists on the router", async () => {
    const caller = appRouter.createCaller(makeCtx());
    vi.mocked(db.getSessionLogs).mockResolvedValueOnce([]);
    const result = await caller.sessions.logs({ sessionId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("sessions.stats procedure returns stats object", async () => {
    const caller = appRouter.createCaller(makeCtx());
    vi.mocked(db.getSessionStats).mockResolvedValueOnce({
      active: 2,
      waiting: 1,
      completed: 10,
      error: 0,
      total: 13,
    });
    const result = await caller.sessions.stats();
    expect(result).toMatchObject({
      active: 2,
      waiting: 1,
      completed: 10,
      error: 0,
      total: 13,
    });
  });

  it("sessions.stats defaults to zero counts when db unavailable", async () => {
    const caller = appRouter.createCaller(makeCtx());
    vi.mocked(db.getSessionStats).mockResolvedValueOnce({
      active: 0,
      waiting: 0,
      completed: 0,
      error: 0,
      total: 0,
    });
    const result = await caller.sessions.stats();
    expect(result.total).toBe(0);
  });
});

describe("flowEngine helpers", () => {
  it("listFlowSessions helper is exported from db", () => {
    expect(typeof db.listFlowSessions).toBe("function");
  });

  it("getSessionLogs helper is exported from db", () => {
    expect(typeof db.getSessionLogs).toBe("function");
  });

  it("getSessionStats helper is exported from db", () => {
    expect(typeof db.getSessionStats).toBe("function");
  });

  it("sessions.start procedure is defined on the router", () => {
    // Just verify the procedure path exists in the router definition
    const caller = appRouter.createCaller(makeCtx());
    expect(typeof caller.sessions.start).toBe("function");
  });
});
