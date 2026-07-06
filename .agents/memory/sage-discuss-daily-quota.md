---
name: Sage discuss daily quota
description: How the Sage AI blood-test discuss rate limit works (per-day reset) and its frontend contract.
---

# Sage (blood-test discuss) daily rate limit

Sage is the member-facing AI chat over blood tests/compounds; its endpoint is
`POST /api/blood-tests/discuss` (server calls Gemini). The quota is **per calendar
day, N requests, auto-reset**, default 10.

## Rules
- Counter lives on `accounts`: `discuss_count` + `discuss_count_date` (date). The
  count is "today's usage" only when `discuss_count_date = CURRENT_DATE`; otherwise
  the day has rolled over and it is treated as 0.
- Consumption + limit check must be a **single atomic UPDATE** (`consumeDailyQuota`),
  never read-then-write, or concurrent requests over-issue slots. The UPDATE resets
  the count to 1 on a new day and increments otherwise, gated on
  `date IS DISTINCT FROM CURRENT_DATE OR discuss_count < limit`. No row returned = blocked.
- **Effective limit must be clamped to ≥1** (`getDiscussLimit`). A non-positive
  limit would still leak one request per day because the "new day" branch of the
  WHERE passes before the count check.
- **Gemini-failure rollback must be day-conditional**: decrement only when
  `discuss_count_date = CURRENT_DATE`, or a request failing across the midnight
  boundary decrements a freshly-reset counter and hands out an extra free slot.

## Frontend contract (do not break)
- On quota exhaustion the server MUST return a **non-2xx (429)** body
  `{ error: "limit_reached", response, contextSession: null, used, limit }`.
  `apiFetchDiscuss` (use-blood-tests.ts) throws `Error("limit_reached")` on non-ok +
  `err.error === "limit_reached"`; `SageChat.tsx` matches that message to show the
  daily-limit UI. Returning 200 would silently defeat the limit UI.

**Why:** the limit was historically declared but never enforced (lifetime counter,
"no limit enforced" comment). Loose/lifetime limits are an abuse-integrity risk and
get code-review rejected.
