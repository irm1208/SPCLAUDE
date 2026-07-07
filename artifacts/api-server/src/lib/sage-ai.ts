/**
 * Lightweight shim for an Anthropic-compatible AI proxy.
 * Configured via env vars:
 *   SAGE_PROXY_API_KEY      – API key for the proxy
 *   SAGE_PROXY_BASE_URL     – base URL (default: https://cn.zhihuiai.top)
 *   SAGE_PROXY_MODEL        – primary model name (default: claude-opus-4-7)
 *   SAGE_PROXY_FALLBACK_MODEL – fallback model when primary has no tokens (default: claude-3-5-sonnet-20241022)
 */

const BASE_URL       = (process.env.SAGE_PROXY_BASE_URL ?? "https://cn.zhihuiai.top").replace(/\/$/, "");
const MODEL          = process.env.SAGE_PROXY_MODEL ?? "claude-opus-4-7";
const FALLBACK_MODEL = process.env.SAGE_PROXY_FALLBACK_MODEL ?? "claude-3-5-sonnet-20241022";

export type TextContentPart  = { type: "text"; text: string };
export type ImageContentPart = { type: "image"; source: { type: "base64"; media_type: string; data: string } };
export type ContentPart = TextContentPart | ImageContentPart;

export interface SageMessage {
  role: "user" | "assistant";
  content: string | ContentPart[];
}

export interface SageAIParams {
  system?: string;
  messages: SageMessage[];
  maxTokens?: number;
}

async function callModel(
  model: string,
  apiKey: string,
  system: string | undefined,
  messages: SageMessage[],
  maxTokens: number,
): Promise<string> {
  const body: Record<string, unknown> = { model, max_tokens: maxTokens, messages };
  if (system) body.system = system;

  const res = await fetch(`${BASE_URL}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Sage AI proxy error ${res.status}: ${errText}`);
  }

  const data = await res.json() as { content?: Array<{ type: string; text?: string }> };
  return data.content?.find(c => c.type === "text")?.text ?? "";
}

/** Returns true when the error looks like a "no quota" / "no available token" failure from the proxy. */
function isTokenExhaustedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("没有可用token") ||        // proxy: no available tokens (Chinese)
    msg.includes("no available token") ||
    (msg.includes("proxy error 500") && msg.includes("token"))
  );
}

export async function callSageAI({ system, messages, maxTokens = 8192 }: SageAIParams): Promise<string> {
  const apiKey = process.env.SAGE_PROXY_API_KEY;
  if (!apiKey) throw new Error("SAGE_PROXY_API_KEY is not set");

  try {
    return await callModel(MODEL, apiKey, system, messages, maxTokens);
  } catch (primaryErr) {
    if (isTokenExhaustedError(primaryErr) && MODEL !== FALLBACK_MODEL) {
      console.warn(`[sage-ai] Primary model "${MODEL}" out of tokens — retrying with fallback "${FALLBACK_MODEL}"`);
      return await callModel(FALLBACK_MODEL, apiKey, system, messages, maxTokens);
    }
    throw primaryErr;
  }
}
