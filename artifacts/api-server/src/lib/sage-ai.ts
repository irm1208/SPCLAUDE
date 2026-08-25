/**
 * Lightweight shim calling an OpenAI-compatible AI proxy.
 * Configured via env vars:
 *   SAGE_PROXY_API_KEY          – API key for the primary proxy
 *   SAGE_PROXY_BASE_URL         – primary base URL (default: https://api.nuoda.vip)
 *   SAGE_PROXY_FALLBACK_API_KEY – API key for the fallback proxy
 *   SAGE_PROXY_FALLBACK_BASE_URL– fallback base URL (default: https://cn.zhihuiai.top)
 *   SAGE_PROXY_MODEL            – primary model (default: claude-opus-4-7)
 *   SAGE_PROXY_FALLBACK_MODEL   – fallback model when primary has no tokens
 *
 * `callSageAI` also accepts per-call `apiKey`/`baseUrl` overrides (admin test-chat panel).
 */

import { db } from "@workspace/db";
import { siteConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { searchWebForSage, searchPubMed, fetchUrlContent } from "./web-search";

export const SAGE_MODEL_CONFIG_KEY = "sage_ai_model";

const BASE_URL             = (process.env.SAGE_PROXY_BASE_URL ?? "https://api.nuoda.vip").replace(/\/$/, "");
const FALLBACK_BASE_URL    = (process.env.SAGE_PROXY_FALLBACK_BASE_URL ?? "https://cn.zhihuiai.top").replace(/\/$/, "");
const FALLBACK_API_KEY_ENV = "SAGE_PROXY_FALLBACK_API_KEY";
const DEFAULT_MODEL        = process.env.SAGE_PROXY_MODEL ?? "claude-opus-4-7";
const FALLBACK_MODEL       = process.env.SAGE_PROXY_FALLBACK_MODEL ?? "claude-sonnet-4-5-20250929";

// ─── Public types (kept identical for callers) ────────────────────────────────

export type TextContentPart     = { type: "text"; text: string };
export type ImageContentPart    = { type: "image"; source: { type: "base64"; media_type: string; data: string } };
export type DocumentContentPart = { type: "document"; source: { type: "base64"; media_type: string; data: string } };
export type ToolUseContentPart  = { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };
export type ToolResultContentPart = { type: "tool_result"; tool_use_id: string; content: string };
export type ContentPart = TextContentPart | ImageContentPart | DocumentContentPart | ToolUseContentPart | ToolResultContentPart;

export interface SageMessage {
  role: "user" | "assistant";
  content: string | ContentPart[];
}

export interface SageAIParams {
  system?: string;
  messages: SageMessage[];
  maxTokens?: number;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  enableWebSearch?: boolean;
  temperature?: number;
  jsonMode?: boolean;
}

// ─── Internal OpenAI-format message types ────────────────────────────────────

interface OaiToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

type OaiMessage =
  | { role: "system";    content: string }
  | { role: "user";      content: string }
  | { role: "assistant"; content: string | null; tool_calls?: OaiToolCall[] }
  | { role: "tool";      tool_call_id: string; content: string };

/** Convert a SageMessage (which may have Anthropic content parts) to an OpenAI message. */
function toOaiMsg(m: SageMessage): OaiMessage {
  if (typeof m.content === "string") return { role: m.role, content: m.content };
  // Collapse content parts — extract text, ignore tool_use/tool_result (those are internal)
  const text = (m.content as ContentPart[])
    .filter((p): p is TextContentPart => p.type === "text")
    .map(p => p.text)
    .join("\n");
  return { role: m.role, content: text };
}

/** Prepend system message and convert caller messages to OpenAI format. */
function buildOaiMessages(system: string | undefined, messages: SageMessage[]): OaiMessage[] {
  const result: OaiMessage[] = [];
  if (system?.trim()) result.push({ role: "system", content: system.trim() });
  result.push(...messages.map(toOaiMsg));
  return result;
}

// ─── Tool definitions (OpenAI function-calling format) ────────────────────────

const WEB_SEARCH_TOOL_OAI = {
  type: "function",
  function: {
    name: "web_search",
    description: [
      "Search the internet AND PubMed for current clinical evidence, medical information, drug interactions,",
      "recent research, forum discussions, and health topics.",
      "Use when: the user asks about a compound, medication, biomarker, or health topic that would benefit from",
      "current evidence; when community consensus or recent studies are relevant; when you need more than your",
      "training data to give a well-sourced answer. Run 1–3 targeted searches per response for complex topics.",
      "PRIVACY: Never include personal names, account IDs, or identifying information in queries.",
      "Convert to anonymous clinical queries.",
    ].join(" "),
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Clinical/research search query. Be specific — include compound names, biomarker names, conditions, and relevant context terms.",
        },
      },
      required: ["query"],
    },
  },
};

const FETCH_URL_TOOL_OAI = {
  type: "function",
  function: {
    name: "fetch_url",
    description: [
      "Fetch and read the full content of a specific URL — a study abstract, forum thread,",
      "clinical guideline, product page, or any relevant health resource.",
      "Use after web_search to get full details from a specific source you found.",
      "Only fetch HTTPS URLs from reputable sources (PubMed, medical journals, established forums).",
    ].join(" "),
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Full HTTPS URL to fetch." },
      },
      required: ["url"],
    },
  },
};

const SAGE_TOOLS_OAI = [WEB_SEARCH_TOOL_OAI, FETCH_URL_TOOL_OAI];

// ─── Utility ──────────────────────────────────────────────────────────────────

/** Returns the currently configured model — admin-set value from site_config, else env, else default. */
export async function getActiveSageModel(): Promise<string> {
  try {
    const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, SAGE_MODEL_CONFIG_KEY));
    if (row?.value?.trim()) return row.value.trim();
  } catch { /* fall through */ }
  return DEFAULT_MODEL;
}

export function getSageFallbackModel(): string { return FALLBACK_MODEL; }

/** Returns true for errors worth retrying against a different base URL. */
function isEndpointRetriable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message;
  if (/proxy error (5\d\d)/.test(msg)) return true;
  if (/proxy error 401/.test(msg) && /invalid token|invalid api key|unauthorized|authentication/i.test(msg)) return true;
  if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED") || msg.includes("ECONNRESET") || msg.includes("ETIMEDOUT")) return true;
  return false;
}

async function withUrlFallback<T>(
  primaryUrl: string,
  primaryKey: string,
  fallbackUrl: string | null,
  fallbackKey: string,
  fn: (url: string, key: string) => Promise<T>,
): Promise<T> {
  try {
    return await fn(primaryUrl, primaryKey);
  } catch (err) {
    if (fallbackUrl && isEndpointRetriable(err)) {
      console.warn(`[sage-ai] ${primaryUrl} unreachable (${err instanceof Error ? err.message.slice(0, 120) : err}), retrying with fallback ${fallbackUrl}`);
      return fn(fallbackUrl, fallbackKey);
    }
    throw err;
  }
}

function isTokenExhaustedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("没有可用token") ||
    msg.includes("no available token") ||
    (msg.includes("proxy error 500") && msg.includes("token"))
  );
}

function isModelPermissionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("proxy error 403") || msg.includes("无权访问");
}

// ─── OpenAI HTTP helpers ──────────────────────────────────────────────────────

function oaiHeaders(apiKey: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "authorization": `Bearer ${apiKey}`,
  };
}

interface OaiResponse {
  text: string;
  toolCalls: OaiToolCall[];
  finishReason: string;
}

/** Non-streaming call to /v1/chat/completions. Returns text + any tool calls. */
async function callOai(
  model: string,
  apiKey: string,
  baseUrl: string,
  oaiMessages: OaiMessage[],
  maxTokens: number,
  tools?: unknown[],
  temperature?: number,
  jsonMode?: boolean,
): Promise<OaiResponse> {
  const body: Record<string, unknown> = {
    model,
    max_completion_tokens: maxTokens,
    messages: oaiMessages,
    stream: false,
  };
  if (tools && tools.length > 0) body.tools = tools;
  if (temperature != null) body.temperature = temperature;
  if (jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: oaiHeaders(apiKey),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Sage AI proxy error ${res.status}: ${errText}`);
  }

  const rawText = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    // Some proxies return SSE even without stream:true — fall back to SSE parse
    const text = extractOaiSseText(rawText);
    if (text) return { text, toolCalls: [], finishReason: "stop" };
    throw new Error(`Sage AI proxy returned non-JSON response: ${rawText.slice(0, 200)}`);
  }

  const choices = data["choices"] as Array<Record<string, unknown>> | undefined;
  const choice  = choices?.[0];
  const message = choice?.["message"] as Record<string, unknown> | undefined;
  const text    = (typeof message?.["content"] === "string" ? message["content"] : "") as string;
  const toolCalls = (message?.["tool_calls"] as OaiToolCall[] | undefined) ?? [];
  const finishReason = String(choice?.["finish_reason"] ?? "stop");

  return { text, toolCalls, finishReason };
}

/** Parse OpenAI SSE stream into a plain text string (for proxies that return SSE without being asked). */
function extractOaiSseText(rawText: string): string | null {
  let combined = "";
  for (const line of rawText.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const jsonStr = trimmed.slice(5).trim();
    if (!jsonStr || jsonStr === "[DONE]") continue;
    try {
      const event = JSON.parse(jsonStr) as Record<string, unknown>;
      const choices = event["choices"] as Array<Record<string, unknown>> | undefined;
      const delta = choices?.[0]?.["delta"] as Record<string, unknown> | undefined;
      if (typeof delta?.["content"] === "string") combined += delta["content"] as string;
    } catch { /* skip */ }
  }
  return combined || null;
}

// ─── Search executors ─────────────────────────────────────────────────────────

async function executeSearchForSage(query: string): Promise<string> {
  const trimmed = query.trim();
  if (!trimmed) return "No query provided.";

  const [geminiResult, pubmedResult] = await Promise.all([
    searchWebForSage(trimmed).catch(() => null),
    searchPubMed(trimmed).catch(() => null),
  ]);

  const parts: string[] = [`## Search results for: "${trimmed}"\n`];

  if (geminiResult?.digest) {
    parts.push(`### Live Web Results\n${geminiResult.digest}`);
    if (geminiResult.sources.length > 0) {
      parts.push(`**Sources:**\n${geminiResult.sources.slice(0, 5).map(s => `- ${s.title}: ${s.url}`).join("\n")}`);
    }
    const fetchedContents = await Promise.all(
      geminiResult.sources.slice(0, 2).map(async s => {
        const content = await fetchUrlContent(s.url).catch(() => null);
        return content ? `#### ${s.title} (${s.url})\n${content}` : null;
      })
    );
    fetchedContents.filter(Boolean).forEach(c => parts.push(c!));
  }

  if (pubmedResult && pubmedResult.studies.length > 0) {
    parts.push(`### PubMed Clinical Studies (${pubmedResult.studies.length} found)`);
    pubmedResult.studies.forEach((s, i) => {
      parts.push(`**[${i + 1}] ${s.title}**\nPMID URL: ${s.url}\n${s.abstract}`);
    });
  }

  if (parts.length === 1) return `No results found for "${trimmed}". Answer from clinical knowledge, clearly noting evidence level.`;
  const combined = parts.join("\n\n");
  return combined.length > 14_000 ? combined.slice(0, 14_000) + "\n\n[Results truncated]" : combined;
}

async function executeFetchUrl(url: string): Promise<string> {
  if (!url.startsWith("https://")) return "Only HTTPS URLs are supported.";
  const content = await fetchUrlContent(url).catch(() => null);
  return content ?? "Could not retrieve content from this URL (may be blocked or unavailable).";
}

// ─── Streaming ────────────────────────────────────────────────────────────────

async function streamOai(
  model: string,
  apiKey: string,
  baseUrl: string,
  oaiMessages: OaiMessage[],
  maxTokens: number,
  temperature: number | undefined,
  onToken: (text: string) => void,
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    max_completion_tokens: maxTokens,
    messages: oaiMessages,
    stream: true,
  };
  if (temperature != null) body.temperature = temperature;

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: oaiHeaders(apiKey),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Sage AI proxy error ${res.status}: ${errText}`);
  }
  if (!res.body) throw new Error("no_stream_body");

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let combined = "";
  let buffer   = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const jsonStr = trimmed.slice(5).trim();
        if (!jsonStr || jsonStr === "[DONE]") continue;
        let event: Record<string, unknown>;
        try { event = JSON.parse(jsonStr) as Record<string, unknown>; } catch { continue; }
        const choices = event["choices"] as Array<Record<string, unknown>> | undefined;
        const delta   = choices?.[0]?.["delta"] as Record<string, unknown> | undefined;
        if (typeof delta?.["content"] === "string") {
          const text = delta["content"] as string;
          combined += text;
          onToken(text);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return combined;
}

// ─── Tool loop ────────────────────────────────────────────────────────────────

async function runToolLoop(
  model: string,
  apiKey: string,
  baseUrl: string,
  system: string | undefined,
  messages: SageMessage[],
  maxTokens: number,
  temperature: number | undefined,
  onStatus?: (msg: string) => void,
): Promise<{ finalText: string; augmentedMessages: SageMessage[] }> {
  const oaiMessages: OaiMessage[] = buildOaiMessages(system, messages);
  const MAX_TOOL_ITERS = 4;

  for (let i = 0; i < MAX_TOOL_ITERS; i++) {
    const response = await callOai(model, apiKey, baseUrl, oaiMessages, maxTokens, SAGE_TOOLS_OAI, temperature);

    if (response.finishReason === "stop" || response.toolCalls.length === 0) {
      // Done — return the text and pass augmented messages back to caller so they
      // can be streamed in a follow-up call. We encode as SageMessages so the
      // caller can re-use the existing SageMessage type.
      const augmented: SageMessage[] = messages.slice();
      if (response.text) augmented.push({ role: "assistant", content: response.text });
      return { finalText: response.text, augmentedMessages: augmented };
    }

    // Append assistant turn with tool_calls
    oaiMessages.push({ role: "assistant", content: response.text || null, tool_calls: response.toolCalls });

    // Execute each tool call and append tool result messages
    for (const tc of response.toolCalls) {
      let toolResult: string;
      const args = (() => {
        try { return JSON.parse(tc.function.arguments) as Record<string, unknown>; }
        catch { return {} as Record<string, unknown>; }
      })();

      if (tc.function.name === "web_search") {
        const query = String(args["query"] ?? "").trim();
        console.log(`[sage:web_search] "${query}"`);
        onStatus?.(`Searching: "${query}"`);
        toolResult = await executeSearchForSage(query);
        console.log(`[sage:web_search] got ${toolResult.length} chars`);
      } else if (tc.function.name === "fetch_url") {
        const url = String(args["url"] ?? "").trim();
        console.log(`[sage:fetch_url] ${url}`);
        onStatus?.("Reading source...");
        toolResult = await executeFetchUrl(url);
      } else {
        toolResult = `Unknown tool: ${tc.function.name}`;
      }

      oaiMessages.push({ role: "tool", tool_call_id: tc.id, content: toolResult });
    }
  }

  // Loop exhausted — do a plain non-streaming call for the final answer
  const fallback = await callOai(model, apiKey, baseUrl, oaiMessages, maxTokens, undefined, temperature);
  const augmented: SageMessage[] = messages.slice();
  if (fallback.text) augmented.push({ role: "assistant", content: fallback.text });
  return { finalText: fallback.text, augmentedMessages: augmented };
}

// ─── Simple non-streaming call ────────────────────────────────────────────────

async function callModel(
  model: string,
  apiKey: string,
  baseUrl: string,
  system: string | undefined,
  messages: SageMessage[],
  maxTokens: number,
  temperature?: number,
  jsonMode?: boolean,
): Promise<string> {
  const oaiMessages = buildOaiMessages(system, messages);
  const result = await callOai(model, apiKey, baseUrl, oaiMessages, maxTokens, undefined, temperature, jsonMode);
  return result.text;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Streaming + tools hybrid for the discuss endpoint.
 * 1. Tool loop (non-streaming): Sage searches, results fed back.
 * 2. Final response: streamed token-by-token.
 */
export async function callSageAIStreamWithTools({
  system, messages, maxTokens = 1200, model, apiKey: apiKeyOverride,
  baseUrl: baseUrlOverride, temperature, onToken, onStatus,
}: SageAIParams & { onToken: (text: string) => void; onStatus?: (msg: string) => void }): Promise<string> {
  const apiKey     = apiKeyOverride?.trim() || process.env.SAGE_PROXY_API_KEY;
  if (!apiKey) throw new Error("SAGE_PROXY_API_KEY is not set");
  const baseUrl    = (baseUrlOverride?.trim() || BASE_URL).replace(/\/$/, "");
  const fallbackUrl = baseUrlOverride?.trim() ? null : FALLBACK_BASE_URL;
  const fallbackKey = process.env[FALLBACK_API_KEY_ENV] || apiKey;
  const activeModel = model ?? await getActiveSageModel();

  const runWith = async (url: string, key: string): Promise<string> => {
    const tryWithTools = async (mdl: string): Promise<string> => {
      try {
        const result = await runToolLoop(mdl, key, url, system, messages, maxTokens, temperature, onStatus);
        // Stream the final answer
        const oaiMsgs = buildOaiMessages(system, result.augmentedMessages);
        const streamed = await streamOai(mdl, key, url, oaiMsgs, maxTokens, temperature, onToken);
        if (!streamed && result.finalText) { onToken(result.finalText); return result.finalText; }
        return streamed;
      } catch (toolErr) {
        const msg = toolErr instanceof Error ? toolErr.message : String(toolErr);
        if (msg.includes("no_stream_body") || msg.includes("400") || msg.includes("tool")) {
          console.warn("[sage-ai] Tool loop failed, falling back to plain stream:", msg);
          return streamOai(mdl, key, url, buildOaiMessages(system, messages), maxTokens, temperature, onToken);
        }
        throw toolErr;
      }
    };

    try {
      return await tryWithTools(activeModel);
    } catch (primaryErr) {
      if ((isTokenExhaustedError(primaryErr) || isModelPermissionError(primaryErr)) && activeModel !== FALLBACK_MODEL) {
        console.warn(`[sage-ai] Primary model "${activeModel}" unavailable — retrying with fallback "${FALLBACK_MODEL}"`);
        return tryWithTools(FALLBACK_MODEL);
      }
      throw primaryErr;
    }
  };

  return withUrlFallback(baseUrl, apiKey, fallbackUrl, fallbackKey, runWith);
}

/**
 * Legacy streaming (no tools). Used by non-discuss streaming endpoints.
 * Falls back to non-streaming if the proxy returns a plain JSON body.
 */
export async function callSageAIStream({
  system, messages, maxTokens = 1200, model, apiKey: apiKeyOverride,
  baseUrl: baseUrlOverride, temperature, onToken,
}: SageAIParams & { onToken: (text: string) => void }): Promise<string> {
  const apiKey      = apiKeyOverride?.trim() || process.env.SAGE_PROXY_API_KEY;
  if (!apiKey) throw new Error("SAGE_PROXY_API_KEY is not set");
  const baseUrl     = (baseUrlOverride?.trim() || BASE_URL).replace(/\/$/, "");
  const fallbackUrl = baseUrlOverride?.trim() ? null : FALLBACK_BASE_URL;
  const fallbackKey = process.env[FALLBACK_API_KEY_ENV] || apiKey;
  const activeModel = model ?? await getActiveSageModel();

  const runWith = async (url: string, key: string): Promise<string> => {
    const oaiMsgs = buildOaiMessages(system, messages);
    const tryStream = async (mdl: string): Promise<string> => {
      try {
        const result = await streamOai(mdl, key, url, oaiMsgs, maxTokens, temperature, onToken);
        if (result) return result;
        return callModel(mdl, key, url, system, messages, maxTokens, temperature);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === "no_stream_body") return callModel(mdl, key, url, system, messages, maxTokens, temperature);
        throw err;
      }
    };

    try {
      return await tryStream(activeModel);
    } catch (primaryErr) {
      if ((isTokenExhaustedError(primaryErr) || isModelPermissionError(primaryErr)) && activeModel !== FALLBACK_MODEL) {
        console.warn(`[sage-ai] Primary model "${activeModel}" unavailable — retrying stream with fallback "${FALLBACK_MODEL}"`);
        return tryStream(FALLBACK_MODEL);
      }
      throw primaryErr;
    }
  };

  return withUrlFallback(baseUrl, apiKey, fallbackUrl, fallbackKey, runWith);
}

export async function callSageAI({
  system, messages, maxTokens = 8192, model, apiKey: apiKeyOverride,
  baseUrl: baseUrlOverride, enableWebSearch = true, temperature, jsonMode,
}: SageAIParams): Promise<string> {
  const apiKey      = apiKeyOverride?.trim() || process.env.SAGE_PROXY_API_KEY;
  if (!apiKey) throw new Error("SAGE_PROXY_API_KEY is not set");
  const baseUrl     = (baseUrlOverride?.trim() || BASE_URL).replace(/\/$/, "");
  const fallbackUrl = baseUrlOverride?.trim() ? null : FALLBACK_BASE_URL;
  const fallbackKey = process.env[FALLBACK_API_KEY_ENV] || apiKey;

  const runWith = async (url: string, key: string): Promise<string> => {
    if (model) {
      return callModel(model, key, url, system, messages, maxTokens, temperature, jsonMode);
    }

    const activeModel = await getActiveSageModel();

    const callFn = enableWebSearch
      ? async (m: string) => {
          const { finalText, augmentedMessages } = await runToolLoop(m, key, url, system, messages, maxTokens, temperature);
          if (finalText) return finalText;
          return callModel(m, key, url, system, augmentedMessages, maxTokens, temperature, jsonMode);
        }
      : (m: string) => callModel(m, key, url, system, messages, maxTokens, temperature, jsonMode);

    try {
      return await callFn(activeModel);
    } catch (primaryErr) {
      if ((isTokenExhaustedError(primaryErr) || isModelPermissionError(primaryErr)) && activeModel !== FALLBACK_MODEL) {
        console.warn(`[sage-ai] Primary model "${activeModel}" unavailable — retrying with fallback "${FALLBACK_MODEL}"`);
        return callFn(FALLBACK_MODEL);
      }
      throw primaryErr;
    }
  };

  return withUrlFallback(baseUrl, apiKey, fallbackUrl, fallbackKey, runWith);
}
