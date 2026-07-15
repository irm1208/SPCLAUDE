/**
 * Lightweight shim for an Anthropic-compatible AI proxy.
 * Configured via env vars:
 *   SAGE_PROXY_API_KEY      – API key for the proxy
 *   SAGE_PROXY_BASE_URL     – base URL (default: https://cn.zhihuiai.top)
 *   SAGE_PROXY_MODEL        – primary model name (default: claude-opus-4-7), overridable at runtime
 *                             via the `sage_ai_model` site_config key (set from the Admin panel)
 *   SAGE_PROXY_FALLBACK_MODEL – fallback model when primary has no tokens (default: claude-sonnet-4-5-20250929)
 *
 * `callSageAI` also accepts a per-call `apiKey`/`baseUrl` override (used by the admin test-chat
 * panel to let an individual admin test with their own personal Anthropic credentials, stored only
 * in their browser). These overrides are never persisted server-side.
 */

import { db } from "@workspace/db";
import { siteConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { searchWebForSage, searchPubMed, fetchUrlContent } from "./web-search";

export const SAGE_MODEL_CONFIG_KEY = "sage_ai_model";

const BASE_URL       = (process.env.SAGE_PROXY_BASE_URL ?? "https://cn.zhihuiai.top").replace(/\/$/, "");
const DEFAULT_MODEL  = process.env.SAGE_PROXY_MODEL ?? "claude-opus-4-7";
const FALLBACK_MODEL = process.env.SAGE_PROXY_FALLBACK_MODEL ?? "claude-sonnet-4-5-20250929";

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
export type DocumentContentPart = { type: "document"; source: { type: "base64"; media_type: string; data: string } };
export type ToolUseContentPart  = { type: "tool_use";  id: string; name: string; input: Record<string, unknown> };
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
  /** Explicit model override (e.g. from the admin test panel). Skips the fallback chain. */
  model?: string;
  /** Explicit API key override (e.g. an admin's personal browser-stored credential for testing). Never persisted. */
  apiKey?: string;
  /** Explicit base URL override, paired with `apiKey`. Never persisted. */
  baseUrl?: string;
  /** Whether to give Sage access to web search via tool_use. Default true. */
  enableWebSearch?: boolean;
  /** Optional sampling temperature (0-1). Omitted = provider default. Use a low value for deterministic extraction tasks. */
  temperature?: number;
  /** When true, adds response_format: { type: "json_object" } to the request body. Required for GPT models to reliably return JSON. */
  jsonMode?: boolean;
}

// ─── Tool definitions ────────────────────────────────────────────────────────

const WEB_SEARCH_TOOL = {
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
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Clinical/research search query. Be specific — include compound names, biomarker names, conditions, and relevant context terms.",
      },
    },
    required: ["query"],
  },
};

const FETCH_URL_TOOL = {
  name: "fetch_url",
  description: [
    "Fetch and read the full content of a specific URL — a study abstract, forum thread,",
    "clinical guideline, product page, or any relevant health resource.",
    "Use after web_search to get full details from a specific source you found.",
    "Only fetch HTTPS URLs from reputable sources (PubMed, medical journals, established forums).",
  ].join(" "),
  input_schema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "Full HTTPS URL to fetch.",
      },
    },
    required: ["url"],
  },
};

const SAGE_TOOLS = [WEB_SEARCH_TOOL, FETCH_URL_TOOL];

// ─── Search executor (Gemini grounded + PubMed + URL fetch) ──────────────────

/**
 * Executes a web search on behalf of Sage. Uses Gemini's grounded Google search
 * for live web results, PubMed for clinical studies, and optionally fetches full
 * content from top result URLs.
 */
async function executeSearchForSage(query: string): Promise<string> {
  const trimmed = query.trim();
  if (!trimmed) return `No query provided.`;

  const [geminiResult, pubmedResult] = await Promise.all([
    searchWebForSage(trimmed).catch(() => null),
    searchPubMed(trimmed).catch(() => null),
  ]);

  const parts: string[] = [`## Search results for: "${trimmed}"\n`];

  if (geminiResult?.digest) {
    parts.push(`### Live Web Results\n${geminiResult.digest}`);
    if (geminiResult.sources.length > 0) {
      const sourceList = geminiResult.sources.slice(0, 5)
        .map(s => `- ${s.title}: ${s.url}`)
        .join("\n");
      parts.push(`**Sources:**\n${sourceList}`);
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

  if (parts.length === 1) {
    return `No results found for "${trimmed}". Answer from clinical knowledge, clearly noting evidence level.`;
  }

  const combined = parts.join("\n\n");
  return combined.length > 14_000 ? combined.slice(0, 14_000) + "\n\n[Results truncated]" : combined;
}

/** Fetch URL content for a tool_result. */
async function executeFetchUrl(url: string): Promise<string> {
  if (!url.startsWith("https://")) return "Only HTTPS URLs are supported.";
  const content = await fetchUrlContent(url).catch(() => null);
  return content ?? "Could not retrieve content from this URL (may be blocked or unavailable).";
}

// ─── Raw model call (non-streaming, with or without tools) ───────────────────

interface ModelResponse {
  content: ContentPart[];
  stop_reason: string;
}

async function callModelRaw(
  model: string,
  apiKey: string,
  baseUrl: string,
  system: string | undefined,
  messages: SageMessage[],
  maxTokens: number,
  tools?: unknown[],
  temperature?: number,
  jsonMode?: boolean,
): Promise<ModelResponse> {
  const body: Record<string, unknown> = { model, max_tokens: maxTokens, messages, stream: false };
  if (system) body.system = system;
  if (tools && tools.length > 0) body.tools = tools;
  if (temperature != null) body.temperature = temperature;
  if (jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
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
  temperature?: number,
  jsonMode?: boolean,
): Promise<string> {
  const body: Record<string, unknown> = { model, max_tokens: maxTokens, messages, stream: false };
  if (system) body.system = system;
  if (temperature != null) body.temperature = temperature;
  if (jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
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
    const text = extractTextFromSse(rawText);
    if (text) return text;
    throw new Error(`Sage AI proxy returned non-JSON response: ${rawText.slice(0, 200)}`);
  }
}

// ─── Streaming (plain, no tools) ─────────────────────────────────────────────

async function streamResponse(
  model: string,
  apiKey: string,
  baseUrl: string,
  system: string | undefined,
  messages: SageMessage[],
  maxTokens: number,
  temperature: number | undefined,
  onToken: (text: string) => void,
): Promise<string> {
  const body: Record<string, unknown> = { model, max_tokens: maxTokens, messages, stream: true };
  if (system) body.system = system;
  if (temperature != null) body.temperature = temperature;

  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Sage AI proxy error ${res.status}: ${errText}`);
  }

  if (!res.body) throw new Error("no_stream_body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let combined = "";
  let buffer = "";

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
        try { event = JSON.parse(jsonStr) as Record<string, unknown>; }
        catch { continue; }
        const delta = event["delta"] as Record<string, unknown> | undefined;
        if (delta?.["type"] === "text_delta" && typeof delta["text"] === "string") {
          const text = delta["text"] as string;
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
  const mutableMessages: SageMessage[] = [...messages];
  const MAX_TOOL_ITERS = 4;

  for (let i = 0; i < MAX_TOOL_ITERS; i++) {
    const response = await callModelRaw(model, apiKey, baseUrl, system, mutableMessages, maxTokens, SAGE_TOOLS, temperature);

    const textPart  = response.content.find(c => c.type === "text")  as TextContentPart    | undefined;
    const toolUsePart = response.content.find(c => c.type === "tool_use") as ToolUseContentPart | undefined;

    if (response.stop_reason === "end_turn" || !toolUsePart) {
      return { finalText: textPart?.text ?? "", augmentedMessages: mutableMessages };
    }

    let toolResult: string;
    if (toolUsePart.name === "web_search") {
      const query = String(toolUsePart.input.query ?? "").trim();
      console.log(`[sage:web_search] "${query}"`);
      onStatus?.(`Searching: "${query}"`);
      toolResult = await executeSearchForSage(query);
      console.log(`[sage:web_search] got ${toolResult.length} chars`);
    } else if (toolUsePart.name === "fetch_url") {
      const url = String(toolUsePart.input.url ?? "").trim();
      console.log(`[sage:fetch_url] ${url}`);
      onStatus?.(`Reading source...`);
      toolResult = await executeFetchUrl(url);
    } else {
      toolResult = `Unknown tool: ${toolUsePart.name}`;
    }

    mutableMessages.push({ role: "assistant", content: response.content });
    mutableMessages.push({
      role: "user",
      content: [{ type: "tool_result", tool_use_id: toolUsePart.id, content: toolResult }],
    });
  }

  // Loop exhausted — do one final non-streaming call without tools for a text response
  const fallbackText = await callModel(model, apiKey, baseUrl, system, mutableMessages, maxTokens, temperature);
  return { finalText: fallbackText, augmentedMessages: mutableMessages };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns true when the error looks like a "no quota" / "no available token" failure from the proxy. */
function isTokenExhaustedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("没有可用token") ||
    msg.includes("no available token") ||
    (msg.includes("proxy error 500") && msg.includes("token"))
  );
}

/**
 * Streaming + tools hybrid for the discuss endpoint.
 *
 * Flow:
 *  1. Tool loop (non-streaming): Sage decides what to search, searches run, results fed back.
 *  2. Final response: streamed token-by-token so the user sees text appear progressively.
 *
 * `onStatus` fires during tool execution (e.g. "Searching: BPC-157 gut healing") so the
 * client can show a live search status in the spinner.
 *
 * Falls back to plain streaming if the proxy doesn't support tools.
 */
export async function callSageAIStreamWithTools({
  system, messages, maxTokens = 1200, model, apiKey: apiKeyOverride,
  baseUrl: baseUrlOverride, temperature, onToken, onStatus,
}: SageAIParams & { onToken: (text: string) => void; onStatus?: (msg: string) => void }): Promise<string> {
  const apiKey = (apiKeyOverride?.trim() || process.env.SAGE_PROXY_API_KEY);
  if (!apiKey) throw new Error("SAGE_PROXY_API_KEY is not set");
  const baseUrl = (baseUrlOverride?.trim() || BASE_URL).replace(/\/$/, "");
  const activeModel = model ?? await getActiveSageModel();

  const tryWithTools = async (mdl: string): Promise<string> => {
    let augmentedMessages: SageMessage[];
    try {
      const result = await runToolLoop(mdl, apiKey, baseUrl, system, messages, maxTokens, temperature, onStatus);
      augmentedMessages = result.augmentedMessages;

      // Stream the final response using the tool-augmented conversation history
      const streamed = await streamResponse(mdl, apiKey, baseUrl, system, augmentedMessages, maxTokens, temperature, onToken);
      // If streamed returned empty, fall back to the non-streamed text we already have
      if (!streamed && result.finalText) {
        onToken(result.finalText);
        return result.finalText;
      }
      return streamed;
    } catch (toolErr) {
      const msg = toolErr instanceof Error ? toolErr.message : String(toolErr);
      // Proxy doesn't support tools → fall back to plain streaming
      if (msg.includes("no_stream_body") || msg.includes("400") || msg.includes("tool")) {
        console.warn("[sage-ai] Tool loop failed, falling back to plain stream:", msg);
        return streamResponse(mdl, apiKey, baseUrl, system, messages, maxTokens, temperature, onToken);
      }
      throw toolErr;
    }
  };

  try {
    return await tryWithTools(activeModel);
  } catch (primaryErr) {
    if (isTokenExhaustedError(primaryErr) && activeModel !== FALLBACK_MODEL) {
      console.warn(`[sage-ai] Primary model "${activeModel}" out of tokens — retrying with fallback "${FALLBACK_MODEL}"`);
      return await tryWithTools(FALLBACK_MODEL);
    }
    throw primaryErr;
  }
}

/**
 * Legacy streaming (no tools). Still used by non-discuss endpoints.
 * Falls back to non-streaming callModel if the proxy returns a plain JSON body.
 */
export async function callSageAIStream({
  system, messages, maxTokens = 1200, model, apiKey: apiKeyOverride, baseUrl: baseUrlOverride, temperature, onToken,
}: SageAIParams & { onToken: (text: string) => void }): Promise<string> {
  const apiKey = apiKeyOverride?.trim() || process.env.SAGE_PROXY_API_KEY;
  if (!apiKey) throw new Error("SAGE_PROXY_API_KEY is not set");
  const baseUrl = (baseUrlOverride?.trim() || BASE_URL).replace(/\/$/, "");
  const activeModel = model ?? await getActiveSageModel();

  const tryStream = async (mdl: string): Promise<string> => {
    try {
      const result = await streamResponse(mdl, apiKey, baseUrl, system, messages, maxTokens, temperature, onToken);
      if (result) return result;
      return callModel(mdl, apiKey, baseUrl, system, messages, maxTokens, temperature);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === "no_stream_body") {
        return callModel(mdl, apiKey, baseUrl, system, messages, maxTokens, temperature);
      }
      throw err;
    }
  };

  try {
    return await tryStream(activeModel);
  } catch (primaryErr) {
    if (isTokenExhaustedError(primaryErr) && activeModel !== FALLBACK_MODEL) {
      console.warn(`[sage-ai] Primary model "${activeModel}" out of tokens — retrying stream with fallback "${FALLBACK_MODEL}"`);
      return await tryStream(FALLBACK_MODEL);
    }
    throw primaryErr;
  }
}

export async function callSageAI({
  system, messages, maxTokens = 8192, model, apiKey: apiKeyOverride, baseUrl: baseUrlOverride, enableWebSearch = true, temperature, jsonMode,
}: SageAIParams): Promise<string> {
  const apiKey = apiKeyOverride?.trim() || process.env.SAGE_PROXY_API_KEY;
  if (!apiKey) throw new Error("SAGE_PROXY_API_KEY is not set");
  const baseUrl = (baseUrlOverride?.trim() || BASE_URL).replace(/\/$/, "");

  if (model) {
    return await callModel(model, apiKey, baseUrl, system, messages, maxTokens, temperature, jsonMode);
  }

  const activeModel = await getActiveSageModel();

  const callFn = enableWebSearch
    ? async (m: string, k: string) => {
        const { finalText, augmentedMessages } = await runToolLoop(m, k, baseUrl, system, messages, maxTokens, temperature);
        if (finalText) return finalText;
        return callModel(m, k, baseUrl, system, augmentedMessages, maxTokens, temperature, jsonMode);
      }
    : (m: string, k: string) => callModel(m, k, baseUrl, system, messages, maxTokens, temperature, jsonMode);

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
