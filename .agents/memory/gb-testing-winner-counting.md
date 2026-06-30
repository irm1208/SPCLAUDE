---
name: GB testing-pool winner counting
description: How the testing-pool "leading compound" must be tallied to match what members see.
---

The testing-pool winning compound must be counted across EVERY selected compound per
vote, not just each voter's first pick.

Votes store two compound fields: `peptideName` (first/primary pick) and `peptideNames`
(jsonb `string[]`, all picks). When multi-compound voting is enabled (round
`maxCompoundVotes > 1`), a voter contributes one count to each compound in `peptideNames`.

**Why:** the public vote summary already tallies all `peptideNames` (one +1 per compound
per vote), so any admin/notify path that tallies only `peptideName` can name a *different*
winner than the one members see on the public page — a wrong-result bug that surfaces only
once multi-compound ballots exist. This was the blocking finding on the "notify result"
feature.

**How to apply:** the shared `getLeadingVote()` in `gb-testing.ts` is the single source
of truth — it counts `(v.peptideNames?.length ? v.peptideNames : [v.peptideName])` and feeds
the public page, admin thresholds/milestones, the closed-round result card, and the
notify-result Telegram. Keep its counting identical to the public summary loop. Any new
vote-tally path must reuse it (or copy this rule), never fall back to `peptideName`-only.

Related: notify-result is admin-gated, recomputes the winner server-side (never trusts the
client), rejects when `round.status === "active"`, and HTML-escapes dynamic fields because
`notifyUserFull` sends `parse_mode: "HTML"`.
