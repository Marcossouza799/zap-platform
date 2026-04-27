/**
 * Tests for WhatsApp webhook handlers and send helpers.
 * These tests verify the structure and logic without making real HTTP calls.
 */
import { describe, it, expect, vi } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp send helpers (unit tests)
// ─────────────────────────────────────────────────────────────────────────────

describe("WhatsApp send helpers", () => {
  it("sendTextOfficial builds correct fetch payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: "msg_123" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { sendTextOfficial } = await import("./whatsapp");
    const result = await sendTextOfficial(
      { phoneNumberId: "12345", accessToken: "token_abc" },
      "5511999999999",
      "Olá, tudo bem?"
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("msg_123");

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("12345");
    expect(url).toContain("messages");
    const body = JSON.parse(opts.body as string);
    expect(body.type).toBe("text");
    expect(body.to).toBe("5511999999999");
    expect(body.text.body).toBe("Olá, tudo bem?");

    vi.unstubAllGlobals();
  });

  it("sendTextOfficial returns error when API fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: "Invalid token" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { sendTextOfficial } = await import("./whatsapp");
    const result = await sendTextOfficial(
      { phoneNumberId: "12345", accessToken: "bad_token" },
      "5511999999999",
      "Teste"
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();

    vi.unstubAllGlobals();
  });

  it("sendTextUnofficial builds correct Evolution API payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ key: { id: "evo_msg_456" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { sendTextUnofficial } = await import("./whatsapp");
    const result = await sendTextUnofficial(
      { serverUrl: "https://evo.example.com", apiKey: "key_xyz", instanceName: "my-instance" },
      "5511888888888",
      "Mensagem de teste"
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("evo_msg_456");

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("my-instance");
    expect(url).toContain("sendText");
    const body = JSON.parse(opts.body as string);
    expect(body.number).toBe("5511888888888");
    expect(body.text).toBe("Mensagem de teste");

    vi.unstubAllGlobals();
  });

  it("sendMessage dispatches to official when type is 'official'", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: "official_123" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { sendMessage } = await import("./whatsapp");
    const result = await sendMessage(
      "official",
      { phoneNumberId: "99999", accessToken: "tok" },
      "5511777777777",
      "Teste oficial"
    );

    expect(result.success).toBe(true);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("graph.facebook.com");

    vi.unstubAllGlobals();
  });

  it("sendMessage dispatches to unofficial when type is 'unofficial'", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ key: { id: "unoff_789" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { sendMessage } = await import("./whatsapp");
    const result = await sendMessage(
      "unofficial",
      { serverUrl: "https://evo.test", apiKey: "k", instanceName: "inst" },
      "5511666666666",
      "Teste não oficial"
    );

    expect(result.success).toBe(true);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("evo.test");

    vi.unstubAllGlobals();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Webhook handler structure tests
// ─────────────────────────────────────────────────────────────────────────────

describe("registerWebhookRoutes", () => {
  it("exports registerWebhookRoutes function", async () => {
    const { registerWebhookRoutes } = await import("./webhookHandlers");
    expect(typeof registerWebhookRoutes).toBe("function");
  });

  it("registers routes on an express-like app", async () => {
    const { registerWebhookRoutes } = await import("./webhookHandlers");
    const registeredRoutes: Array<{ method: string; path: string }> = [];
    const mockApp = {
      get: (path: string, _handler: unknown) => registeredRoutes.push({ method: "GET", path }),
      post: (path: string, _handler: unknown) => registeredRoutes.push({ method: "POST", path }),
    };

    registerWebhookRoutes(mockApp as any);

    const paths = registeredRoutes.map((r) => r.path);
    expect(paths).toContain("/api/webhook/meta");
    expect(paths).toContain("/api/webhook/evolution/:instanceName");

    const methods = registeredRoutes.map((r) => r.method);
    expect(methods).toContain("GET"); // Meta verification challenge
    expect(methods).toContain("POST"); // Meta inbound + Evolution inbound
  });

  it("Meta GET handler responds to valid verification challenge", async () => {
    const { registerWebhookRoutes } = await import("./webhookHandlers");
    let metaGetHandler: ((req: any, res: any) => void) | null = null;

    const mockApp = {
      get: (path: string, handler: (req: any, res: any) => void) => {
        if (path === "/api/webhook/meta") metaGetHandler = handler;
      },
      post: () => {},
    };

    registerWebhookRoutes(mockApp as any);
    expect(metaGetHandler).not.toBeNull();

    const mockReq = {
      query: {
        "hub.mode": "subscribe",
        "hub.verify_token": "any_token",
        "hub.challenge": "challenge_abc123",
      },
    };
    let sentValue: unknown;
    let sentStatus: number | null = null;
    const mockRes = {
      status: (code: number) => { sentStatus = code; return mockRes; },
      send: (val: unknown) => { sentValue = val; },
      sendStatus: (code: number) => { sentStatus = code; },
    };

    metaGetHandler!(mockReq, mockRes);
    expect(sentStatus).toBe(200);
    expect(sentValue).toBe("challenge_abc123");
  });

  it("Meta GET handler rejects invalid verification (missing token)", async () => {
    const { registerWebhookRoutes } = await import("./webhookHandlers");
    let metaGetHandler: ((req: any, res: any) => void) | null = null;

    const mockApp = {
      get: (path: string, handler: (req: any, res: any) => void) => {
        if (path === "/api/webhook/meta") metaGetHandler = handler;
      },
      post: () => {},
    };

    registerWebhookRoutes(mockApp as any);

    const mockReq = { query: { "hub.mode": "subscribe" } }; // missing token and challenge
    let sentStatus: number | null = null;
    const mockRes = {
      status: (code: number) => { sentStatus = code; return mockRes; },
      send: () => {},
      sendStatus: (code: number) => { sentStatus = code; },
    };

    metaGetHandler!(mockReq, mockRes);
    expect(sentStatus).toBe(403);
  });
});
