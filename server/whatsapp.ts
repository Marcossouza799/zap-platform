/**
 * WhatsApp Integration Helpers
 *
 * Supports two provider types:
 *  - "official"   : Meta WhatsApp Cloud API (v20.0)
 *  - "unofficial" : Evolution API (Baileys-based open-source)
 *
 * All functions are best-effort and return structured results so the caller
 * can surface meaningful errors to the UI without crashing.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface OfficialConfig {
  phoneNumberId: string;
  accessToken: string;
  webhookSecret?: string;
  businessAccountId?: string;
}

export interface UnofficialConfig {
  serverUrl: string;   // e.g. https://evo.myserver.com
  apiKey: string;
  instanceName: string;
}

export interface SendTextResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  phone?: string;
  displayName?: string;
  error?: string;
}

export interface QrCodeResult {
  success: boolean;
  qrCode?: string;  // base64 PNG data URI
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Meta Cloud API (Official)
// ─────────────────────────────────────────────────────────────────────────────

const META_API_BASE = "https://graph.facebook.com/v20.0";

/**
 * Send a plain text message via Meta Cloud API.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages/text-messages
 */
export async function sendTextOfficial(
  config: OfficialConfig,
  to: string,
  text: string
): Promise<SendTextResult> {
  try {
    const res = await fetch(
      `${META_API_BASE}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { preview_url: false, body: text },
        }),
      }
    );
    const data = (await res.json()) as any;
    if (!res.ok) {
      return { success: false, error: data?.error?.message ?? `HTTP ${res.status}` };
    }
    return { success: true, messageId: data?.messages?.[0]?.id };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

/**
 * Test the official connection by fetching the phone number profile.
 * Docs: https://developers.facebook.com/docs/whatsapp/business-management-api/phone-numbers
 */
export async function testOfficialConnection(
  config: OfficialConfig
): Promise<ConnectionTestResult> {
  try {
    const res = await fetch(
      `${META_API_BASE}/${config.phoneNumberId}?fields=display_phone_number,verified_name`,
      {
        headers: { Authorization: `Bearer ${config.accessToken}` },
      }
    );
    const data = (await res.json()) as any;
    if (!res.ok) {
      return { success: false, error: data?.error?.message ?? `HTTP ${res.status}` };
    }
    return {
      success: true,
      phone: data?.display_phone_number,
      displayName: data?.verified_name,
    };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

/**
 * Verify a Meta webhook challenge (GET request from Meta).
 */
export function verifyMetaWebhook(
  mode: string,
  token: string,
  challenge: string,
  expectedToken: string
): string | null {
  if (mode === "subscribe" && token === expectedToken) return challenge;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Evolution API (Unofficial / Baileys)
// ─────────────────────────────────────────────────────────────────────────────

function evoHeaders(apiKey: string) {
  return {
    apikey: apiKey,
    "Content-Type": "application/json",
  };
}

/**
 * Create (or re-open) an Evolution API instance.
 * POST /instance/create
 */
export async function createEvolutionInstance(
  config: UnofficialConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${config.serverUrl}/instance/create`, {
      method: "POST",
      headers: evoHeaders(config.apiKey),
      body: JSON.stringify({
        instanceName: config.instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    });
    const data = (await res.json()) as any;
    if (!res.ok) {
      return { success: false, error: data?.message ?? `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

/**
 * Fetch the QR code for an Evolution API instance.
 * GET /instance/connect/{instanceName}
 */
export async function getEvolutionQrCode(
  config: UnofficialConfig
): Promise<QrCodeResult> {
  try {
    const res = await fetch(
      `${config.serverUrl}/instance/connect/${config.instanceName}`,
      { headers: evoHeaders(config.apiKey) }
    );
    const data = (await res.json()) as any;
    if (!res.ok) {
      return { success: false, error: data?.message ?? `HTTP ${res.status}` };
    }
    // Evolution returns { base64: "data:image/png;base64,..." } or { code: "..." }
    const qrCode = data?.base64 ?? data?.qrcode?.base64 ?? null;
    return { success: true, qrCode: qrCode ?? undefined };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

/**
 * Check the connection state of an Evolution API instance.
 * GET /instance/connectionState/{instanceName}
 */
export async function getEvolutionConnectionState(
  config: UnofficialConfig
): Promise<ConnectionTestResult> {
  try {
    const res = await fetch(
      `${config.serverUrl}/instance/connectionState/${config.instanceName}`,
      { headers: evoHeaders(config.apiKey) }
    );
    const data = (await res.json()) as any;
    if (!res.ok) {
      return { success: false, error: data?.message ?? `HTTP ${res.status}` };
    }
    const state: string = data?.instance?.state ?? data?.state ?? "unknown";
    const isConnected = state === "open";
    return {
      success: isConnected,
      phone: data?.instance?.profileName ?? undefined,
      displayName: data?.instance?.profileName ?? undefined,
      error: isConnected ? undefined : `Estado: ${state}`,
    };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

/**
 * Send a text message via Evolution API.
 * POST /message/sendText/{instanceName}
 */
export async function sendTextUnofficial(
  config: UnofficialConfig,
  to: string,
  text: string
): Promise<SendTextResult> {
  try {
    // Normalize phone: remove non-digits, ensure country code
    const phone = to.replace(/\D/g, "");
    const res = await fetch(
      `${config.serverUrl}/message/sendText/${config.instanceName}`,
      {
        method: "POST",
        headers: evoHeaders(config.apiKey),
        body: JSON.stringify({
          number: phone,
          text,
        }),
      }
    );
    const data = (await res.json()) as any;
    if (!res.ok) {
      return { success: false, error: data?.message ?? `HTTP ${res.status}` };
    }
    return { success: true, messageId: data?.key?.id ?? data?.id };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

/**
 * Disconnect / logout an Evolution API instance.
 * DELETE /instance/logout/{instanceName}
 */
export async function disconnectEvolutionInstance(
  config: UnofficialConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(
      `${config.serverUrl}/instance/logout/${config.instanceName}`,
      { method: "DELETE", headers: evoHeaders(config.apiKey) }
    );
    return { success: res.ok };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified dispatcher — send message through any connection type
// ─────────────────────────────────────────────────────────────────────────────

export async function sendMessage(
  type: "official" | "unofficial",
  config: Record<string, string>,
  to: string,
  text: string
): Promise<SendTextResult> {
  if (type === "official") {
    return sendTextOfficial(config as unknown as OfficialConfig, to, text);
  }
  return sendTextUnofficial(config as unknown as UnofficialConfig, to, text);
}
