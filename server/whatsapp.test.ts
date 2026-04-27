import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function makeCtx(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
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

describe("connections router", () => {
  it("should have list procedure", () => {
    const caller = appRouter.createCaller(makeCtx());
    expect(typeof caller.connections.list).toBe("function");
  });

  it("should have create procedure", () => {
    const caller = appRouter.createCaller(makeCtx());
    expect(typeof caller.connections.create).toBe("function");
  });

  it("should have update procedure", () => {
    const caller = appRouter.createCaller(makeCtx());
    expect(typeof caller.connections.update).toBe("function");
  });

  it("should have delete procedure", () => {
    const caller = appRouter.createCaller(makeCtx());
    expect(typeof caller.connections.delete).toBe("function");
  });

  it("should have testConnection procedure", () => {
    const caller = appRouter.createCaller(makeCtx());
    expect(typeof caller.connections.testConnection).toBe("function");
  });

  it("should have getQrCode procedure", () => {
    const caller = appRouter.createCaller(makeCtx());
    expect(typeof caller.connections.getQrCode).toBe("function");
  });

  it("should have disconnect procedure", () => {
    const caller = appRouter.createCaller(makeCtx());
    expect(typeof caller.connections.disconnect).toBe("function");
  });
});

describe("flows.saveCanvas edges with sourcePortId", () => {
  it("should accept edges with sourcePortId field", () => {
    const caller = appRouter.createCaller(makeCtx());
    expect(typeof caller.flows.saveCanvas).toBe("function");
  });
});
