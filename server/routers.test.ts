import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: any[] } {
  const clearedCookies: any[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-1",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });
});

describe("auth.me", () => {
  it("returns user when authenticated", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.openId).toBe("test-user-1");
    expect(result?.name).toBe("Test User");
  });

  it("returns null when not authenticated", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("router structure", () => {
  it("has all required routers defined", () => {
    // Verify router structure by checking procedure keys exist
    const routerKeys = Object.keys(appRouter._def.procedures);
    expect(routerKeys).toContain("auth.me");
    expect(routerKeys).toContain("auth.logout");
    expect(routerKeys).toContain("dashboard.stats");
    expect(routerKeys).toContain("flows.list");
    expect(routerKeys).toContain("flows.create");
    expect(routerKeys).toContain("flows.update");
    expect(routerKeys).toContain("flows.delete");
    expect(routerKeys).toContain("flows.duplicate");
    expect(routerKeys).toContain("flows.saveCanvas");
    expect(routerKeys).toContain("contacts.list");
    expect(routerKeys).toContain("contacts.create");
    expect(routerKeys).toContain("contacts.update");
    expect(routerKeys).toContain("contacts.delete");
    expect(routerKeys).toContain("chat.list");
    expect(routerKeys).toContain("chat.send");
    expect(routerKeys).toContain("chat.aiReply");
    expect(routerKeys).toContain("chat.clear");
    expect(routerKeys).toContain("kanban.getBoard");
    expect(routerKeys).toContain("kanban.createCard");
    expect(routerKeys).toContain("kanban.updateCard");
    expect(routerKeys).toContain("kanban.deleteCard");
  });
});
