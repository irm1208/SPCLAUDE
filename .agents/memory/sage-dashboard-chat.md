---
name: Sage dashboard chat
description: How the "Meet Sage" dashboard health-assistant chat is wired, and the invariants of the compounds-only discuss fallback.
---

# Sage dashboard chat

The "Meet Sage" hero on the customer DashboardHome is a real AI chat, but it does
**not** have its own backend. It reuses the existing `POST /api/blood-tests/discuss`
endpoint via the `useBloodTestDiscuss()` hook. `components/SageChat.tsx` is the
themed modal chat; DashboardHome's hero input / send / quick chips open it seeded
with the typed question.

**Why:** the discuss endpoint already carries the real cost + safety machinery —
per-account `discussCount` quota (the only meaningful cost guard, since the shared
Replit egress IP makes per-IP rate limits a near-no-op), rollback of the quota on
Gemini failure, admin audit logging, and an AI-identity guardrail. A parallel
"sage" endpoint would fork the persona/prompt, bypass the quota, and be invisible
to admin conversation auditing.

**How to apply:**
- Frontend chat is stateless — client holds history and sends the last ~8 non-greeting
  turns with each request. No DB schema changes (avoids the drizzle-kit push
  interactive-rename hang). Persistence to `btConversationsTable` exists if continuity
  is ever wanted, but Sage is intentionally ephemeral.
- The discuss no-session branch has a **compounds-only fallback**: if the caller has
  no blood-test session but has active compounds, it still answers using compound
  context. That branch MUST stay parity with the main path — same quota `+1` /
  `GREATEST(-1,0)` rollback, AI-identity guardrail before quota, two `logCustomerActivity`
  calls (user + ai), and identical response shape (`contextSession: null` is legal).
  The shared guardrail regex lives at module scope as `AI_IDENTITY_RE`.
- If the caller has neither bloodwork nor compounds, return a no-quota message that
  does not invite questions it won't answer.
- SageChat's `renderInline` returns plain strings (not `React.Fragment`) for
  non-bold text, or the Replit dev metadata plugin spams "Invalid prop
  data-replit-metadata supplied to React.Fragment" warnings.
