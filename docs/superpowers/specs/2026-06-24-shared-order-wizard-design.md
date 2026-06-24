# Shared wholesale order — guided multi-step (newcomer onboarding)

**Status:** APPROVED (brainstorming → "Just build it"). Presentation-only.
**Surface:** `artifacts/peps-anonymous/src/pages/WholesaleShared.tsx` + new
components in `src/components/wholesale-shared/`.

## Problem
The shared-order page packs every role's controls onto one screen. First-timers
(organiser, the nominated parcel recipient/reshipper, and ordinary participants)
don't know what to do next or where the group stands.

## Chosen shape — HYBRID, Approach A (smart overlay on existing page)
- Keep the existing stage-driven, role-gated page exactly as-is (all handlers,
  state, server gates untouched). No backend / data / money changes.
- Add three presentation layers on top:

### 1. Next-step banner (always on)
Condensed, role + stage aware. Shows the single most relevant action for *me*
right now, with one primary CTA, plus a "Guide me" button to open the full wizard.
Positive "you're all set / order placed" states when nothing is pending.

### 2. Setup wizard (skippable overlay)
A guided checklist (bottom sheet on mobile / centred modal on desktop) of the
ordered steps for my role at this stage, with done/optional/blocked states and a
CTA per pending step. CTAs either do a trivial inline action (copy invite link),
navigate (pay), or close the wizard and scroll+flash the real control on the page
— so the page stays the single source of truth (no duplicated forms).
Auto-opens once per *role-moment* (organiser-setup / member-setup /
recipient-setup) tracked in localStorage; re-openable anytime via "Guide me".

### 3. Group tracker
The existing Group card body, enriched with per-member status chips (items added /
address set / paid) so everyone can see full group progress.

## The brain — `next-step.ts`
`buildGuide(share, me)` derives, from existing share data only:
- ordered `steps[]` (id, role, title, description, done, optional, blocked, note, cta),
- `currentId` (first not-done, required, surfaced in the banner),
- `allDone`, and `autoOpenMomentId` (building stage: recipient-setup > organiser-setup
  > member-setup).

Step "done"/"blocked" mirror the page's existing derivations
(everyoneHasItems, deliveryComplete, shippingCalculable, canLock, paymentStatus).

## Steps by stage
- **Building:** Add your items (all) · Invite members + Pick recipient + Lock
  (organiser) · Confirm address + optional onward forwarding (recipient).
- **Paying:** Pay your share (all) · settle organiser fee / onward charge (optional, if owed).
- **Done / Cancelled:** status-only, no steps.

## Non-goals
No changes to mutations, totals, fees, locking, submission, or API. Pure UI/UX.
