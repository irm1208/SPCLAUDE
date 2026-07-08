---
name: Sage AI model admin override
description: How the admin-selectable Sage AI model setting and test-chat panel work, and a dev-environment gotcha with the proxy key.
---

The Sage health chatbot's active model is stored in `site_config` under the key `sage_ai_model`, resolved with priority: site_config value → `SAGE_PROXY_MODEL` env var → hardcoded default. `callSageAI` accepts an optional `model` param — passing it explicitly (e.g. from the admin test-chat panel) skips the primary/fallback substitution chain entirely (single attempt with that exact model), so admins see the true behavior of the model they picked rather than a silently-substituted one.

**Why:** production (non-override) calls still need the token-exhaustion fallback chain for reliability, but a test panel that silently falls back would defeat the purpose of testing a specific model.

**How to apply:** any new code path that lets a user/admin pick a model to test must pass it through the `model` override param, never write it to `site_config` as a side effect of testing (only the explicit "Save" action should persist it).

**Dev-environment gotcha:** `SAGE_PROXY_API_KEY` was not set in this workspace's dev secrets as of 2026-07-08 (only `SAGE_PROXY_MODEL` was present) — any live call to `callSageAI` (including the admin test-chat panel) fails fast with `"SAGE_PROXY_API_KEY is not set"` until that secret is added. This is expected/correct fail-fast behavior, not a bug — check secret presence before assuming a Sage-related feature is broken.

**Personal browser-only credential override (added 2026-07-08):** `callSageAI`/`callModel` also accept optional per-call `apiKey`/`baseUrl` overrides (falling back to `SAGE_PROXY_API_KEY`/`SAGE_PROXY_BASE_URL` env vars). The admin test-chat panel lets an individual admin paste their own Anthropic-compatible `ANTHROPIC_AUTH_TOKEN`/`ANTHROPIC_BASE_URL` into two fields that save to `localStorage` only (keys `sagePlaygroundAuthToken`/`sagePlaygroundBaseUrl`) — never persisted server-side, never shared between admins. These are sent only as part of that admin's own `POST /admin/sage-settings/test` body; the route passes them straight through to `callSageAI` without logging or writing them anywhere. GET `/admin/sage-settings` also returns `serverKeyConfigured: boolean` (`!!process.env.SAGE_PROXY_API_KEY`) so the UI can show a warning banner prompting the admin to use their own browser credentials when the shared server key is missing.

**Why:** the user explicitly confirmed this must stay browser-only/personal — never write these credentials to `site_config`, audit logs, or any DB table, and never expose one admin's token to another.

**How to apply:** any future Sage-related endpoint that calls `callSageAI` on behalf of an interactive admin session should accept the same `authToken`/`baseUrl` passthrough pattern rather than inventing a new storage mechanism.
