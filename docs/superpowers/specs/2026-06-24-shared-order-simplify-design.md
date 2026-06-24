# Shared Order Page Simplification — Design Spec

**Date:** 2026-06-24
**Status:** Approved direction (pending spec review)
**Surface:** `artifacts/peps-anonymous/src/pages/WholesaleShared.tsx` (route `/wholesale/shared/:id`)

---

## Problem

The shared wholesale order page has grown into the busiest screen in the app
(~1,829 lines in a single component). It feels cluttered for everyone because of
two root causes:

1. **Too many roles share one screen.** Organiser-only controls (split mode,
   delivery-member picker, organiser-fee setup, lock checklist, cancel) and
   recipient-only controls (onward-shipping setup, payout methods, per-participant
   charges, delivery address) render inline alongside what a regular member sees.
   Most people stare at buttons they can't use.

2. **Three money flows are shown at once.** A participant must mentally add three
   separate amounts:
   - **Vendor order** — their items + tip + their split of vendor shipping
     (collected by admin/vendor, auto-verified — the normal order payment).
   - **Organiser fee** — an optional peer-to-peer charge paid directly to the
     organiser (`organiserPaymentInfo`, manually marked paid).
   - **Onward shipping** — an optional peer-to-peer charge paid directly to the
     parcel recipient who forwards each member's items (`reshipperFee` + recipient
     payout methods, manually marked paid).

## Goal

Make the shared order page feel **lighter for everyone, at every stage**, without
changing how any of it actually works.

## Design Direction (approved)

Working name: **"Follows the order, shows only what's yours."**

Four ingredients, chosen by the user:

1. **The page follows the order's stage** (`status`): `open` → Building,
   `locked` → Time to pay, `submitted` → Done (`cancelled` → a clear stopped state).
   Each stage shows only what matters at that point.
2. **Always hide controls a person can't use** (role-aware). Organiser-only and
   recipient-only tools live behind a single **Manage** entry, shown only to that
   person.
3. **Summary cards collapse, tap to expand** for detail (progressive disclosure).
4. **The three money flows are always summed into one "What you owe"** card, with
   each line tappable for its own detail/instructions.

The user explicitly did **not** want a tabs layout.

---

## Stage-by-stage layout

Stage is derived from the existing `wholesale_shares.status` lifecycle
(`open` / `locked` / `submitted` / `cancelled`). No new status values.

### Stage 1 — Building (`status === "open"`)

- **Header:** order name/code, a friendly status line ("Building — N members,
  K kits so far"), invite/share buttons, "How it works" (collapsed by default).
- **Primary focus:** **Your items** editor — add/edit your kits with a live
  "your kits / your subtotal" line. Read/write.
- **Collapsed Group card:** "N members · K kits" → tap to see the roster.
- **Hidden for everyone at this stage:** payment summary, organiser fee tables,
  onward-shipping tables. They don't apply while the order is still being built.
- **Organiser only:** a single **Manage** entry (button/sheet) that opens setup —
  split mode, delivery-member picker, organiser-fee setup, and the lock checklist +
  **Lock order** action. (Today these render inline as "Creator controls".)
- **Recipient only:** onward-shipping enable/setup is reachable under **Manage**
  (recipient-only) when relevant.

### Stage 2 — Time to pay (`status === "locked"`)

- **Primary focus:** one **What you owe** card combining all three flows:
  - Your items … £X (your materialised order total: items + tip + shipping share)
    → **Pay now** uses the existing order payment flow.
  - Organiser fee … £Z (only if `organiserFee > 0`) → expands to
    `organiserPaymentInfo`; marked paid by the organiser.
  - Onward shipping … £W (only if `reshipperFee > 0`) → expands to the recipient's
    payout methods; marked paid by the recipient.
  - **Total … £T** (the sum the person is responsible for).
  - Each line taps to expand its breakdown / payment instructions.
- **Item editor:** read-only (order is locked).
- **Collapsed below:** Group (who's paid) and Chat.
- **Forwarding address:** if onward shipping is on and this member still needs to
  give a forwarding address, show just that one small form — nothing else.
- **Organiser only (Manage):** fee-paid toggles, recipient roster, and cancel
  (for a member who never pays).
- **Recipient only (Manage):** payout methods, per-participant onward charges +
  mark-paid, delivery address.

### Stage 3 — Done (`status === "submitted"`)

- A calm **"Order placed ✓"** summary: what you paid, delivery info, tracking/QR
  if relevant.
- **Chat** stays open.
- Everything else collapses into "view details" cards.

### Cancelled (`status === "cancelled"`)

- A clear stopped/cancelled banner. Chat read-only. Minimal else.

---

## Always-true rules (every stage)

- **You never see a control you can't use.** Organiser-only and recipient-only
  tools are all reached through one **Manage** entry, shown only to that person.
- **One "What you owe."** The vendor order, organiser fee, and onward charge are
  always summed into a single total, with per-line expand for detail.
- **The current recipient is fee-exempt** (effective organiser/onward fee 0), as
  today — their "What you owe" reflects that.

---

## What stays exactly the same (non-goals)

This is a **presentation-layer reorganisation only**. No behavioural changes:

- No changes to the data model (`wholesale_shares`, `wholesale_share_members`,
  `wholesale_share_messages`).
- No changes to API endpoints, money math, payment verification, status-gated
  writes, lock/cancel logic, Telegram notifications, or chat behaviour.
- "What you owe" must display the **same resolved amounts** the backend already
  computes and expects at verify time — it must not recompute or re-derive fees
  with different rules client-side.
- No tabs layout (explicitly rejected).
- Out of scope: the admin-side wholesale grouping/list page, and any new
  responsive behaviour beyond the app's existing mobile-first patterns.

## Maintainability note (in-scope refactor)

Because the single component is ~1,829 lines, the redesign will extract focused,
independently-readable pieces rather than keep everything inline — e.g. a stage
header, one component per stage (Building / Paying / Done), a `WhatYouOwe` card,
a role-gated `Manage` sheet, and a collapsible `Group` card. This improves
maintainability and reliability of edits, and is a natural part of doing the work
well. No unrelated refactoring beyond what this redesign touches.

## Success criteria

- At each stage, a **regular member** sees only: header, their items (Building) or
  what they owe (Paying), the group, and chat — no organiser/recipient controls.
- Organiser and recipient tools are reachable via **one Manage entry**, visible
  only to that person.
- The amounts a person owes appear as **one total** with expandable detail.
- All existing flows still work unchanged: lock, pay, mark-paid (organiser &
  onward), cancel, onward-shipping setup, forwarding address/QR, chat.
- Displayed money totals match the pre-redesign values exactly.
- Each role's view is noticeably shorter at each stage.

## Testing approach

- Walk through every **role × stage** combination: member / organiser / recipient
  across `open` / `locked` / `submitted` / `cancelled`.
- Verify hidden controls are genuinely hidden (not just visually shrunk) and that
  the combined "What you owe" total equals the sum of the three legacy amounts.
- End-to-end check of the critical actions per stage (add items → lock → pay →
  mark fees paid → submitted; plus cancel path).
