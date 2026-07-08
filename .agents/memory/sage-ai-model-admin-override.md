---
name: Sage AI model admin override
description: How the admin-selectable Sage AI model setting and test-chat panel work, and a dev-environment gotcha with the proxy key.
---

The Sage health chatbot's active model is stored in `site_config` under the key `sage_ai_model`, resolved with priority: site_config value → `SAGE_PROXY_MODEL` env var → hardcoded default. `callSageAI` accepts an optional `model` param — passing it explicitly (e.g. from the admin test-chat panel) skips the primary/fallback substitution chain entirely (single attempt with that exact model), so admins see the true behavior of the model they picked rather than a silently-substituted one.

**Why:** production (non-override) calls still need the token-exhaustion fallback chain for reliability, but a test panel that silently falls back would defeat the purpose of testing a specific model.

**How to apply:** any new code path that lets a user/admin pick a model to test must pass it through the `model` override param, never write it to `site_config` as a side effect of testing (only the explicit "Save" action should persist it).

**Dev-environment gotcha:** `SAGE_PROXY_API_KEY` was not set in this workspace's dev secrets as of 2026-07-08 (only `SAGE_PROXY_MODEL` was present) — any live call to `callSageAI` (including the admin test-chat panel) fails fast with `"SAGE_PROXY_API_KEY is not set"` until that secret is added. This is expected/correct fail-fast behavior, not a bug — check secret presence before assuming a Sage-related feature is broken.
