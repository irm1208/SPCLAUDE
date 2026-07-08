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

/**
 * Parse Anthropic-format SSE text into a plain text string.
 * Each `data:` line is a JSON object; text arrives in content_block_delta events
 * as `{ delta: { type: "text_delta", text: "..." } }`.
 */
function extractTextFromSse(rawText: string): string | null {
  let combined = "";
  for (const line of rawText.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const jsonStr = trimmed.slice(5).trim();
    if (!jsonStr || jsonStr === "[DONE]") continue;
    try {
      const event = JSON.parse(jsonStr) as Record<string, unknown>;
      const delta = event["delta"] as Record<string, unknown> | undefined;
      if (delta?.["type"] === "text_delta" && typeof delta["text"] === "string") {
        combined += delta["text"] as string;
      }
    } catch { /* skip malformed lines */ }
  }
  return combined || null;
}

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
export type ToolUseContentPart  = { type: "tool_use";  id: string; name: string; input: Record<string, unknown> };
export type ToolResultContentPart = { type: "tool_result"; tool_use_id: string; content: string };
export type ContentPart = TextContentPart | ImageContentPart | ToolUseContentPart | ToolResultContentPart;

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
  /** Whether to give Sage access to DuckDuckGo web search via tool_use. Default true. */
  enableWebSearch?: boolean;
}

// ─── Tool definitions ────────────────────────────────────────────────────────

const WEB_SEARCH_TOOL = {
  name: "web_search",
  description: [
    "Search the internet for current clinical guidelines, medical information, medication safety data, drug interactions,",
    "recent research, or forum discussions about health topics.",
    "Use when: the member requests a search; a compound or medication is new or experimental; current safety or regulatory",
    "information matters; internal knowledge is incomplete or sources conflict; recent research could materially change",
    "the answer; or forum experiences are specifically requested.",
    "Do NOT use for stable, well-established information that is already in your training data.",
    "PRIVACY: Never include personal information (names, addresses, dates of birth, account IDs) in the search query.",
    "Convert the question to an anonymous clinical search.",
  ].join(" "),
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Anonymous clinical search query with no personal or identifying information.",
      },
    },
    required: ["query"],
  },
};

// ─── Web search implementation (DuckDuckGo — no API key required) ────────────

async function performWebSearch(query: string): Promise<string> {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1&kl=uk-en`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: { "User-Agent": "SaltAndPeps-HealthAssistant/1.0 (health research tool)" },
    });

    if (!res.ok) throw new Error(`DDG API ${res.status}`);

    const data = await res.json() as Record<string, unknown>;
    const parts: string[] = [`**Search results for:** "${query}"\n`];

    const abstractText = data.AbstractText as string | undefined;
    const abstractSource = data.AbstractSource as string | undefined;
    const abstractURL = data.AbstractURL as string | undefined;
    const heading = data.Heading as string | undefined;
    const answer = data.Answer as string | undefined;

    if (abstractText) {
      parts.push(`**${heading ?? "Summary"}** (${abstractSource ?? "Wikipedia"}):\n${abstractText}`);
      if (abstractURL) parts.push(`Source: ${abstractURL}`);
    }

    if (answer) {
      parts.push(`**Direct answer:** ${answer}`);
    }

    const relatedTopics = (data.RelatedTopics as Array<Record<string, unknown>> | undefined) ?? [];
    const topics = relatedTopics
      .filter(t => typeof t.Text === "string" && t.Text.length > 20)
      .slice(0, 6);

    if (topics.length > 0) {
      parts.push("**Related information:**");
      for (const t of topics) {
        const text = t.Text as string;
        const firstUrl = t.FirstURL as string | undefined;
        parts.push(`- ${text}${firstUrl ? ` (${firstUrl})` : ""}`);
      }
    }

    if (parts.length === 1) {
      return `No structured results found for "${query}". This may be a highly specialised or emerging topic not yet well-indexed. Use your existing pharmacological and clinical knowledge to answer, clearly labelling the evidence level.`;
    }

    return parts.join("\n\n");
  } catch (err) {
    console.warn("[sage:web_search] error:", String(err));
    return `Search temporarily unavailable. Use your existing clinical knowledge to answer this question, clearly noting the evidence level and any uncertainty.`;
  }
}

// ─── Model call (with optional tools) ────────────────────────────────────────

interface ModelResponse {
  content: ContentPart[];
  stop_reason: string;
}

async function callModelRaw(
  model: string,
  apiKey: string,
  system: string | undefined,
  messages: SageMessage[],
  maxTokens: number,
  tools?: unknown[],
): Promise<ModelResponse> {
  const body: Record<string, unknown> = { model, max_tokens: maxTokens, messages, stream: false };
  if (system) body.system = system;
  if (tools && tools.length > 0) body.tools = tools;

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

  const rawText = await res.text();
  let data: { content?: ContentPart[]; stop_reason?: string };
  try {
    data = JSON.parse(rawText) as { content?: ContentPart[]; stop_reason?: string };
  } catch {
    // Proxy returned SSE stream despite stream:false — parse line-by-line
    const text = extractTextFromSse(rawText);
    if (text) return { content: [{ type: "text", text }], stop_reason: "end_turn" };
    throw new Error(`Sage AI proxy returned non-JSON response: ${rawText.slice(0, 200)}`);
  }
  return {
    content: data.content ?? [],
    stop_reason: data.stop_reason ?? "end_turn",
  };
}

async function callModel(
  model: string,
  apiKey: string,
  baseUrl: string,
  system: string | undefined,
  messages: SageMessage[],
  maxTokens: number,
): Promise<string> {
  const body: Record<string, unknown> = { model, max_tokens: maxTokens, messages, stream: false };
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

  const rawText = await res.text();
  try {
    const data = JSON.parse(rawText) as { content?: Array<{ type: string; text?: string }> };
    return data.content?.find(c => c.type === "text")?.text ?? "";
  } catch {
    // SSE fallback: parse line-by-line
    const text = extractTextFromSse(rawText);
    if (text) return text;
    throw new Error(`Sage AI proxy returned non-JSON response: ${rawText.slice(0, 200)}`);
  }
}

// ─── Tool loop for web-search-capable calls ───────────────────────────────────

async function callModelWithTools(
  model: string,
  apiKey: string,
  system: string | undefined,
  messages: SageMessage[],
  maxTokens: number,
): Promise<string> {
  const mutableMessages: SageMessage[] = [...messages];
  const MAX_TOOL_ITERATIONS = 5;

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await callModelRaw(model, apiKey, system, mutableMessages, maxTokens, [WEB_SEARCH_TOOL]);

    // Find text content
    const textPart = response.content.find(c => c.type === "text") as TextContentPart | undefined;
    // Find tool use
    const toolUsePart = response.content.find(c => c.type === "tool_use") as ToolUseContentPart | undefined;

    if (response.stop_reason === "end_turn" || !toolUsePart) {
      return textPart?.text ?? "";
    }

    if (toolUsePart.name === "web_search") {
      const query = (toolUsePart.input.query as string | undefined) ?? "";
      console.log(`[sage:web_search] query="${query}"`);
      const results = await performWebSearch(query);
      console.log(`[sage:web_search] got ${results.length} chars`);

      // Append assistant turn with the tool_use content
      mutableMessages.push({
        role: "assistant",
        content: response.content,
      });

      // Append tool result as user turn
      mutableMessages.push({
        role: "user",
        content: [{
          type: "tool_result",
          tool_use_id: toolUsePart.id,
          content: results,
        }],
      });
    } else {
      // Unknown tool — return whatever text we have
      return textPart?.text ?? "";
    }
  }

  // Fallback: one final call without tools to get a text response
  return callModel(model, apiKey, BASE_URL, system, mutableMessages, maxTokens);
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
  system, messages, maxTokens = 8192, model, apiKey: apiKeyOverride, baseUrl: baseUrlOverride, enableWebSearch = true,
}: SageAIParams): Promise<string> {
  const apiKey = apiKeyOverride?.trim() || process.env.SAGE_PROXY_API_KEY;
  if (!apiKey) throw new Error("SAGE_PROXY_API_KEY is not set");
  const baseUrl = (baseUrlOverride?.trim() || BASE_URL).replace(/\/$/, "");

  // Explicit override (admin test panel): single attempt, no silent fallback substitution.
  if (model) {
    return await callModel(model, apiKey, baseUrl, system, messages, maxTokens);
  }

  const activeModel = await getActiveSageModel();

  const callFn = enableWebSearch
    ? (m: string, k: string) => callModelWithTools(m, k, system, messages, maxTokens)
    : (m: string, k: string) => callModel(m, k, baseUrl, system, messages, maxTokens);

  try {
    return await callFn(activeModel, apiKey);
  } catch (primaryErr) {
    if (isTokenExhaustedError(primaryErr) && activeModel !== FALLBACK_MODEL) {
      console.warn(`[sage-ai] Primary model "${activeModel}" out of tokens — retrying with fallback "${FALLBACK_MODEL}"`);
      return await callFn(FALLBACK_MODEL, apiKey);
    }
    throw primaryErr;
  }
}
