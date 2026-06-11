---
name: Gemini local module (not workspace alias)
description: @google/genai workspace alias doesn't work — use local TS module at lib/google-genai.ts calling the native Gemini generateContent API.
---

# Gemini Integration: Local Module Pattern

**Rule:** Do NOT use `@google/genai` package import. Use the local module at `artifacts/api-server/src/lib/google-genai.ts`.

**Why (alias broken):** The pnpm workspace alias for `@google/genai` (pointing to `lib/google-genai-shim`) does not work. The real npm `@google/genai` v1.48.0 package is hardlinked in the pnpm store and esbuild bundles that real package instead of the shim. Re-running pnpm install doesn't fix it.

**How to apply:** All AI calls must import from the local module:
- From `src/routes/*.ts`: `import { GoogleGenAI } from "../lib/google-genai";`
- From `src/lib/*.ts`: `import { GoogleGenAI } from "./google-genai";`

## Correct API Endpoint

Replit's Gemini proxy (`AI_INTEGRATIONS_GEMINI_BASE_URL`) supports the **native Gemini REST API**, NOT OpenAI-compatible `/chat/completions`.

- **Correct endpoint:** `POST {baseUrl}/models/{model}:generateContent`
  - The base URL already includes the version path — do NOT append `/v1beta/` manually
  - The calling code uses `httpOptions: { apiVersion: "", baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL }` — `apiVersion: ""` means no version prefix; the shim bakes it into baseUrl in the constructor
- **Wrong:** `POST {baseUrl}/chat/completions` → `INVALID_ENDPOINT` 400
- **Wrong:** `POST {baseUrl}/v1beta/models/{model}:generateContent` → `INVALID_ENDPOINT` 400

The response format is native Gemini:
```json
{ "candidates": [{ "content": { "parts": [{ "text": "..." }] } }] }
```

## thinkingConfig is critical

`gemini-2.5-flash` has **thinking enabled by default**. Always forward `thinkingConfig` from the config into `generationConfig` in the request body. Without it:
- Lab extract calls time out (>60s instead of ~5s)
- The 1024 maxOutputTokens limit causes failures

The shim includes `thinkingConfig` in `generationConfig`. Do not remove it.

## Instantiation pattern (all callers use this)

```typescript
const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",   // empty = no version prefix added
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});
```

## Supported models (via Replit AI Integrations)

- `gemini-2.5-flash` — general purpose (preferred)
- `gemini-2.5-pro` — complex tasks
- `gemini-3-flash-preview`, `gemini-3.1-pro-preview` — newer options

## After changes

Run `pnpm --filter @workspace/api-server run build:compile` and redeploy.
Verify with: `grep -o "v1beta/models\|chat/completions" dist/index.cjs | sort | uniq -c`
Should show zero matches.
