/**
 * Lightweight shim for an Anthropic-compatible AI proxy.
 * Configured via env vars:
 *   SAGE_PROXY_API_KEY      – API key for the proxy
 *   SAGE_PROXY_BASE_URL     – base URL (default: https://cn.zhihuiai.top)
 *   SAGE_PROXY_MODEL        – primary model name (default: claude-opus-4-7), overridable at runtime
 *                             via the `sage_ai_model` site_config key (set from the Admin panel)
 *   SAGE_PROXY_FALLBACK_MODEL – fallback model when primary has no tokens (default: claude-3-5-sonnet-20241022)
 *
 * `callSageAI` also accepts a per-call `apiKey`/`baseUrl` override (used by the admin test-chat
 * panel to let an individual admin test with their own personal Anthropic credentials, stored only
 * in their browser). These overrides are never persisted server-side.
 */

import { db } from "@workspace/db";
import { siteConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const SAGE_MODEL_CONFIG_KEY = "sage_ai_model";

const BASE_URL       = (process.env.SAGE_PROXY_BASE_URL ?? "https://cn.zhihuiai.top").replace(/\/$/, "");
const DEFAULT_MODEL  = process.env.SAGE_PROXY_MODEL ?? "claude-opus-4-7";
const FALLBACK_MODEL = process.env.SAGE_PROXY_FALLBACK_MODEL ?? "claude-3-5-sonnet-20241022";

/** Returns the currently configured model — admin-set value from site_config, else env, else default. */
export async function getActiveSageModel(): Promise<string> {
  try {
    const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, SAGE_MODEL_CONFIG_KEY));
    if (row?.value?.trim()) return row.value.trim();
  } catch {
    // fall through to default below
  }
  return DEFAULT_MODEL;
}

export function getSageFallbackModel(): string {
  return FALLBACK_MODEL;
}

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
  /** Explicit model override (e.g. from the admin test panel). Skips the fallback chain. */
  model?: string;
  /** Explicit API key override (e.g. an admin's personal browser-stored credential for testing). Never persisted. */
  apiKey?: string;
  /** Explicit base URL override, paired with `apiKey`. Never persisted. */
  baseUrl?: string;
}

async function callModel(
  model: string,
  apiKey: string,
  baseUrl: string,
  system: string | undefined,
  messages: SageMessage[],
  maxTokens: number,
): Promise<string> {
  const body: Record<string, unknown> = { model, max_tokens: maxTokens, messages };
  if (system) body.system = system;

  const res = await fetch(`${baseUrl}/v1/messages`, {
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

export async function callSageAI({
  system, messages, maxTokens = 8192, model, apiKey: apiKeyOverride, baseUrl: baseUrlOverride,
}: SageAIParams): Promise<string> {
  const apiKey = apiKeyOverride?.trim() || process.env.SAGE_PROXY_API_KEY;
  if (!apiKey) throw new Error("SAGE_PROXY_API_KEY is not set");
  const baseUrl = (baseUrlOverride?.trim() || BASE_URL).replace(/\/$/, "");

  // Explicit override (admin test panel): single attempt, no silent fallback substitution.
  if (model) {
    return await callModel(model, apiKey, baseUrl, system, messages, maxTokens);
  }

  const activeModel = await getActiveSageModel();

  try {
    return await callModel(activeModel, apiKey, baseUrl, system, messages, maxTokens);
  } catch (primaryErr) {
    if (isTokenExhaustedError(primaryErr) && activeModel !== FALLBACK_MODEL) {
      console.warn(`[sage-ai] Primary model "${activeModel}" out of tokens — retrying with fallback "${FALLBACK_MODEL}"`);
      return await callModel(FALLBACK_MODEL, apiKey, baseUrl, system, messages, maxTokens);
    }
    throw primaryErr;
  }
}
