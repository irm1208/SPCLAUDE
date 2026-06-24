---
name: Wholesale shared-order guidance overlay must mirror page readiness/money logic
description: Constraints for the presentation-only "next step" banner + setup wizard + group tracker on WholesaleShared.tsx
---

The shared-wholesale-order page has a presentation-only guidance layer
(`components/wholesale-shared/`): `next-step.ts` (`buildGuide(share, me)` brain),
`NextStepBanner.tsx`, `SetupWizard.tsx`, `GroupTracker.tsx`. It derives the member's
next action purely from existing `share`/member data — no backend/data/money/API calls.

**Rule:** every readiness/money check in the guide MUST be computed the same way the
page itself computes it, or the overlay silently drifts from reality.

**Why:** an overlay that uses a looser check than the page produces money-integrity UX
bugs — e.g. telling a member "you're all set" while they still owe an unpaid direct fee,
or "Address set" while the page treats delivery as incomplete. Code review rejects these.

**How to apply:**
- Unpaid peer-to-peer fees (`organiserFee`/`reshipperFee` > 0 && !`*Paid`) are real
  outstanding actions, NOT optional/skippable — they must keep an action surfaced (and
  block any "all set"/"order placed" success state) in BOTH paying and done stages.
- "Address set"/delivery-complete must use the full `deliveryComplete` check
  (username + address + country + name + phone), never just `delivery.address`.
- Member-count gates use `share.members.length`, matching the page's `canLock`, not
  `share.memberCount`.
- Auto-open-once state (the wizard) is per share+role-moment: key the in-memory ref and
  the localStorage seen-flag by `${shareId}:${moment}`, or one share suppresses another.
- Hooks (`guide` useMemo, auto-open useEffect) must stay BEFORE the page's early returns.

**Two different "shown once" scopes — keep them distinct:**
- The SetupWizard auto-open is per share + role-moment (localStorage `peps:ws-wizard-seen:${id}:${moment}`) — it re-guides on each new order.
- The post-save "invite others" popup (`InvitePrompt`, fired from `saveItems` success) is GLOBAL once per browser (localStorage `peps:ws-invite-prompt-seen`, set at show-time). **Why:** the user explicitly didn't want long-time users nagged on every order, so a veteran sees it at most once ever — not once per share. Only fires with items.length>0, status "open", and memberCount<maxMembers (don't prompt to invite when locked/full).
