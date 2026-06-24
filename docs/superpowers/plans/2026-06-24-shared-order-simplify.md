# Shared Order Page Simplification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganise the shared wholesale order page so it follows the order's stage (Building → Paying → Done), hides controls a person can't use behind one **Manage** entry, collapses detail into tap-to-expand cards, and sums the three money flows into one **"What you owe"** — without changing any data, money math, or endpoints.

**Architecture:** Pure presentation-layer refactor of one 1,830-line page component (`artifacts/peps-anonymous/src/pages/WholesaleShared.tsx`). The page keeps all data fetching (`useWholesaleShare`) and renders **stage views** (`BuildingStage` / `PayingStage` / `DoneStage` / cancelled). Large, cohesive sections move into focused child components under `artifacts/peps-anonymous/src/components/wholesale-shared/`, each owning its own editor state and calling the existing mutation helpers, then `invalidate(id)`. No backend, schema, or API-contract changes.

**Tech Stack:** React 18, TypeScript (strict), Vite, Wouter, TanStack Query, Tailwind v4, lucide-react, framer-motion. Data contract = `WholesaleShareDetail` in `artifacts/peps-anonymous/src/hooks/use-wholesale-shares.ts`.

---

## Spec

Source spec: `docs/superpowers/specs/2026-06-24-shared-order-simplify-design.md`. Read it before starting.

## Verification approach (read first — deviation from the template)

This plan does **not** use unit-test TDD. The work is a behaviour-preserving move of existing JSX plus one new presentational card; there is no new business logic to drive with unit tests, and the project's test story is end-to-end (Playwright via the `testing` skill), not component unit tests. The verification gates are:

1. **TypeScript compiler** — `pnpm typecheck`. Because each extraction defines a typed props interface and moves existing JSX behind it, a correct move compiles and a broken one does not. This is the per-task gate.
2. **Build** — `npm run build` once at the end.
3. **End-to-end / manual walkthrough** — every role × stage (final task).

**Baseline note:** the repo has known *pre-existing* typecheck errors unrelated to this work (in `organiser.ts`, `Review.tsx`, `WholesaleOrder.tsx`, and a `HubBottomNavProps` reference in `CustomerPortal`). Capture a baseline in Task 0 and only treat *new* errors as failures.

## Data contract (already exists — do not change)

From `use-wholesale-shares.ts`. Key shapes the components consume:

- `WholesaleShareDetail`: `status`, `isCreator`, `isMember`, `currentUsername`, `combinedKits`, `combinedSubtotal`, `totalVendorShipping`, `memberCount`, `allPaid`, `estimateCalculable`, `delivery {username,name,phone,email,address,country,canEditAddress}`, `fees` (`WholesaleShareFees`), `onward` (`WholesaleShareOnward`), `members: WholesaleShareMember[]`, timestamps.
- `WholesaleShareMember`: `username`, `isCreator`, `isYou`, `isRecipient`, `items`, `kits`, `subtotal`, `tip`, `shippingShare`, `organiserFee`, `reshipperFee`, `organiserFeePaid`, `reshipperFeePaid`, `onwardAddress`, `onwardQr`, `orderId`, `orderCode`, `orderStatus`, `paymentStatus`, `hasDeliveryAddress`.
- `WholesaleShareFees`: `organiserPaymentInfo`, `organiserFeeTotal`, `active`, `recipientUsername`, `organiserUsername`, `canManage`, `canConfirmOrganiserFees`.
- `WholesaleShareOnward`: `enabled`, `recipientUsername`, `payment {walletAddress,walletCurrency,anonpay,paypal,revolut,notes}`, `chargeTotal`, `charges[]`, `canManage`, `canConfirm`, `canSetDestination`.

Mutation helpers (already exported, reuse as-is): `setWholesaleShareItems`, `setWholesaleShareDelivery`, `setWholesaleShareDeliveryAddress`, `setWholesaleShareSplit`, `setWholesaleShareFees`, `setWholesaleShareOnward`, `setWholesaleShareOnwardDestination`, `confirmWholesaleShareFee`, `lockWholesaleShare`, `cancelWholesaleShare`, `unlockWholesaleShare`, `joinWholesaleShare`; plus `useInvalidateWholesaleShare`, `useWholesaleShareMessages`, `postWholesaleShareMessage`.

**Money rule (must hold):** "What you owe" uses **only** server-resolved numbers (`subtotal`, `tip`, `shippingShare`, `organiserFee`, `reshipperFee`). Never re-derive a fee with different client-side rules. The vendor order is paid through the existing order pay action; the organiser fee and onward fee are peer-to-peer and shown with their existing instructions and paid badges.

## File structure

New folder: `artifacts/peps-anonymous/src/components/wholesale-shared/`

- `ExpandableCard.tsx` — generic collapsible summary card (new).
- `stage.ts` — `shareStage(status)` helper + labels (new).
- `ShareHeader.tsx` — title/code, status line, share buttons, How-it-works (moved).
- `GroupCard.tsx` — collapsible member roster (moved from "Members").
- `MyItemsEditor.tsx` — items/tip editor + localStorage draft (moved from "My items editor").
- `WhatYouOwe.tsx` — combined money card with expandable lines (new + absorbs "Combined summary"/fee displays).
- `ManageSheet.tsx` — organiser controls: split, delivery picker, organiser-fee setup, lock checklist/cancel (moved from "Creator controls" + "Locked cancel").
- `RecipientOnward.tsx` — recipient onward setup + per-participant charges; and the non-recipient member's onward destination form (moved from "Onward shipping" + "Recipient onward-shipping controls").
- `DeliveryAddressForm.tsx` — recipient one-off address form + autocomplete (moved from "Delivery address").
- `DoneSummary.tsx` — submitted-state summary (new, built from existing fields).
- `stages/BuildingStage.tsx`, `stages/PayingStage.tsx`, `stages/DoneStage.tsx` — compose the above per stage (new).

`WholesaleShared.tsx` keeps: routing, `useAccount`, `useWholesaleShare`, the wholesale-only gate, the not-found/join view, the products fetch, and a thin stage switch. `money`, `StatusBadge`, `PayBadge`, `lookupAddresses`, stock helpers move to where they're used (or a shared `shared-helpers.ts`).

---

## Task 0: Baseline

**Files:** none (read-only).

- [ ] **Step 1: Capture the pre-existing typecheck baseline**

Run: `pnpm typecheck 2>&1 | tee /tmp/typecheck-baseline.txt; echo "exit=$?"`
Expected: completes; records the current (pre-existing) errors. Keep this list — only errors NOT in it count as regressions.

- [ ] **Step 2: Confirm the app runs**

Restart only the `Start application` workflow (the `api-server`/`web` workflows are duplicates that fail on port conflict if started alongside it). Confirm `/wholesale/shared/:id` still loads for a known share.

---

## Task 1: Collapsible primitive + stage helper

**Files:**
- Create: `artifacts/peps-anonymous/src/components/wholesale-shared/ExpandableCard.tsx`
- Create: `artifacts/peps-anonymous/src/components/wholesale-shared/stage.ts`

- [ ] **Step 1: Write `stage.ts`**

```ts
import type { WholesaleShareStatus } from "@/hooks/use-wholesale-shares";

export type ShareStage = "building" | "paying" | "done" | "cancelled";

export function shareStage(status: WholesaleShareStatus): ShareStage {
  switch (status) {
    case "open": return "building";
    case "locked": return "paying";
    case "submitted": return "done";
    case "cancelled": return "cancelled";
  }
}

export const STAGE_LABEL: Record<ShareStage, string> = {
  building: "Building",
  paying: "Time to pay",
  done: "Order placed",
  cancelled: "Cancelled",
};
```

- [ ] **Step 2: Write `ExpandableCard.tsx`**

```tsx
import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface ExpandableCardProps {
  title: ReactNode;
  summary?: ReactNode;       // shown on the right of the header row when collapsed
  defaultOpen?: boolean;
  icon?: ReactNode;
  children: ReactNode;       // detail, revealed on expand
}

export function ExpandableCard({ title, summary, defaultOpen = false, icon, children }: ExpandableCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 font-bold text-sm" style={{ color: "var(--t-text)" }}>
          {icon}{title}
        </span>
        <span className="flex items-center gap-2 text-sm" style={{ color: "var(--t-muted)" }}>
          {summary}
          <ChevronDown className="w-4 h-4 transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }} />
        </span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck 2>&1 | grep -v -F -f /tmp/typecheck-baseline.txt | grep -i "wholesale-shared\|error TS" ; echo done`
Expected: no NEW errors referencing the new files.

- [ ] **Step 4: Commit** — `feat(wholesale-shared): add ExpandableCard + stage helper`

---

## Task 2: Extract `ShareHeader`

**Files:**
- Create: `artifacts/peps-anonymous/src/components/wholesale-shared/ShareHeader.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/WholesaleShared.tsx` (header block ~745–845, incl. "How it works" ~781 and status banners ~823)

- [ ] **Step 1: Define props and move the header markup**

Props:
```ts
interface ShareHeaderProps {
  share: WholesaleShareDetail;        // from use-wholesale-shares
  onBack: () => void;
  onCopy: (what: "code" | "link") => void;
  copied: "code" | "link" | null;
}
```
Move the title/code, `StatusBadge`, member/kit count line, share/copy buttons, the collapsible "How it works" (its own `useState` moves into this component), and the status banners (~823–845) into `ShareHeader`. Replace the moved JSX in the page with `<ShareHeader share={share} onBack={...} onCopy={...} copied={copied} />`.

- [ ] **Step 2: Typecheck** — `pnpm typecheck` shows no new errors.
- [ ] **Step 3: Visual check** — header + status banner render identically at `/wholesale/shared/:id`.
- [ ] **Step 4: Commit** — `refactor(wholesale-shared): extract ShareHeader`

---

## Task 3: Extract `GroupCard` (collapsible roster)

**Files:**
- Create: `artifacts/peps-anonymous/src/components/wholesale-shared/GroupCard.tsx`
- Modify: `WholesaleShared.tsx` (Members section ~846–888)

- [ ] **Step 1: Define props and move the roster into an `ExpandableCard`**

```ts
interface GroupCardProps {
  share: WholesaleShareDetail;
  defaultOpen?: boolean;   // open in Building, collapsed in Paying/Done
}
```
Wrap the existing member list in `ExpandableCard` with `title="Group"` and `summary={`${share.memberCount} members · ${share.combinedKits} kits`}`. Keep per-member badges (`PayBadge`, `Crown` for creator, recipient tag) exactly as they are.

- [ ] **Step 2: Typecheck** — no new errors.
- [ ] **Step 3: Visual check** — collapsed by default shows the count; expanding shows the same roster.
- [ ] **Step 4: Commit** — `refactor(wholesale-shared): extract collapsible GroupCard`

---

## Task 4: Extract `MyItemsEditor`

**Files:**
- Create: `artifacts/peps-anonymous/src/components/wholesale-shared/MyItemsEditor.tsx`
- Modify: `WholesaleShared.tsx` (My items editor ~889–979, plus the related state at ~158–164/246–293 and `setQty` ~460, `myKits`/`mySubtotal` ~382–386)

- [ ] **Step 1: Move the editor + its state into the component**

Move into `MyItemsEditor`: `products`/`productSearch` use OR accept `products` as a prop (prefer prop to keep one fetch in the page), `myItems`, `myTip`, `itemsDirty`, the three seeding/draft `useEffect`s (localStorage draft keyed `peps:ws-share-draft:${id}:${user}`), `setQty`, `myKits`, `mySubtotal`, and the save handler that calls `setWholesaleShareItems(id, ...)` then `invalidate(id)`.

Props:
```ts
interface MyItemsEditorProps {
  share: WholesaleShareDetail;
  products: ProductLite[];
  accountUsername: string;     // for the draft key
  canEdit: boolean;            // share.status === "open" && share.isMember
}
```
The page passes `products` (kept in the page's existing fetch) and `accountUsername`.

- [ ] **Step 2: Typecheck** — no new errors (watch that all moved state references resolve).
- [ ] **Step 3: Functional check** — add/remove kits, tip, save; refresh mid-edit and confirm the local draft restores; confirm a saved order clears the draft.
- [ ] **Step 4: Commit** — `refactor(wholesale-shared): extract MyItemsEditor`

---

## Task 5: Build `WhatYouOwe` (combined money card)

**Files:**
- Create: `artifacts/peps-anonymous/src/components/wholesale-shared/WhatYouOwe.tsx`
- Modify: `WholesaleShared.tsx` (replaces the "Combined summary" ~980–1002 and folds in the member-facing organiser-fee ~1006–1043 and onward ~1044–1176 *display* for the current user; the organiser/recipient *management* of those stays in Tasks 6–7)

- [ ] **Step 1: Compute the three lines from server-resolved numbers only**

```tsx
import { ExpandableCard } from "./ExpandableCard";
import type { WholesaleShareDetail, WholesaleShareMember } from "@/hooks/use-wholesale-shares";

const money = (n: number) => `$${n.toFixed(2)}`;

interface WhatYouOweProps {
  share: WholesaleShareDetail;
  me: WholesaleShareMember;         // share.members.find(m => m.isYou)
  onPayOrder: () => void;           // reuse the existing order-pay action/link
}

export function WhatYouOwe({ share, me, onPayOrder }: WhatYouOweProps) {
  const orderDue = me.subtotal + me.tip + (me.shippingShare ?? 0);
  const exempt = me.isRecipient;
  const organiserDue = exempt ? 0 : me.organiserFee;
  const onwardDue = exempt ? 0 : me.reshipperFee;
  const total = orderDue + organiserDue + onwardDue;
  const orderPaid = me.paymentStatus === "confirmed";
  // ...render: a header "What you owe — {money(total)}",
  //   line 1 "Your items + shipping" {money(orderDue)} with PayBadge + Pay now (onPayOrder),
  //   line 2 organiser fee (only if organiserDue > 0) -> expand to share.fees.organiserPaymentInfo, badge me.organiserFeePaid,
  //   line 3 onward shipping (only if onwardDue > 0) -> expand to share.onward.payment methods, badge me.reshipperFeePaid.
}
```

- [ ] **Step 2: Render the lines**

Each fee line uses `ExpandableCard` (or an inline expandable row): collapsed shows label + amount + paid badge; expanded shows the existing payment instructions/methods markup (move the read-only display blocks from ~1006–1176 that the *member* sees). The order line shows the existing `PayBadge` and a **Pay now** button wired to `onPayOrder` (reuse the existing pay action from the member-row quick action ~1613+ / member row ~855+; keep its exact target).

- [ ] **Step 3: Typecheck** — no new errors.
- [ ] **Step 4: Number check** — for a locked share, `total` equals the sum of the three amounts shown by the old layout for the same member (recipient shows fees as 0).
- [ ] **Step 5: Commit** — `feat(wholesale-shared): unified What-you-owe card`

---

## Task 6: Extract `ManageSheet` (organiser controls)

**Files:**
- Create: `artifacts/peps-anonymous/src/components/wholesale-shared/ManageSheet.tsx`
- Modify: `WholesaleShared.tsx` (Creator controls ~1177–1338 and the locked-cancel block ~1572–1607, plus organiser state ~167–176/296–313 and `feeAmounts`/lock helpers)

- [ ] **Step 1: Move organiser controls + their state into the component**

Move: split-mode control, delivery-member picker (`delUser`, seeding ~296–300), organiser-fee editor (`orgPayInfo`, `feeAmounts`, `feesDirty`, seeding ~304–313, the save calling `setWholesaleShareFees`), the organiser-fee paid toggles (`confirmWholesaleShareFee`/`toggleFeePaid`), the lock checklist + `lockWholesaleShare`, and the locked-state `cancelWholesaleShare`. Each handler ends with `invalidate(id)`.

Props:
```ts
interface ManageSheetProps {
  share: WholesaleShareDetail;
  // lock readiness inputs computed in the page (or recompute inside):
  canLock: boolean;
}
```
Render as a collapsible "Manage" panel (reuse `ExpandableCard` titled "Manage order"). The page renders it **only** when `share.isCreator`.

- [ ] **Step 2: Typecheck** — no new errors.
- [ ] **Step 3: Functional check** — as organiser: change split, pick delivery member, set/clear organiser fees, mark a fee paid, lock (when ready), cancel when locked. As a non-organiser: confirm the Manage panel is absent.
- [ ] **Step 4: Commit** — `refactor(wholesale-shared): extract organiser ManageSheet`

---

## Task 7: Extract `RecipientOnward` + member destination

**Files:**
- Create: `artifacts/peps-anonymous/src/components/wholesale-shared/RecipientOnward.tsx`
- Modify: `WholesaleShared.tsx` (Recipient onward controls ~1339–1466, the member onward-destination form within ~1075–1144, plus onward state ~178–194/316–340)

- [ ] **Step 1: Move recipient onward management into the component**

Move the recipient-only config (`onwardEnabled`, `onwardPay`, `onwardCharges`, `onwardDirty`, seeding ~316–331, save via `setWholesaleShareOnward`), the per-participant charge marking (`confirmWholesaleShareFee` onward / `canConfirm`), and the non-recipient member's destination form (`destAddress`, seeding ~334–340, QR upload, save via `setWholesaleShareOnwardDestination`). Split into two exports if cleaner: `RecipientOnwardManage` (recipient) and `MemberOnwardDestination` (non-recipient member).

Props (recipient):
```ts
interface RecipientOnwardManageProps { share: WholesaleShareDetail; }
```
Props (member destination):
```ts
interface MemberOnwardDestinationProps { share: WholesaleShareDetail; }
```
The page renders `RecipientOnwardManage` only when `share.onward.canManage`; `MemberOnwardDestination` only when `share.onward.canSetDestination`.

- [ ] **Step 2: Typecheck** — no new errors.
- [ ] **Step 3: Functional check** — recipient: enable onward, set payout methods + per-participant charges, mark a charge paid. Member: provide a forwarding address + upload a delivery QR. Non-relevant roles: sections absent.
- [ ] **Step 4: Commit** — `refactor(wholesale-shared): extract RecipientOnward`

---

## Task 8: Extract `DeliveryAddressForm`

**Files:**
- Create: `artifacts/peps-anonymous/src/components/wholesale-shared/DeliveryAddressForm.tsx`
- Modify: `WholesaleShared.tsx` (Delivery address ~1467–1571, plus address state ~196–211/342–377 and `lookupAddresses` ~71–96)

- [ ] **Step 1: Move the recipient address form + autocomplete into the component**

Move `addr`, the autocomplete state (`addrQuery`/`addrResults`/timers/`addrReqId`), the seeding effect (~345–371), `lookupAddresses`, and the save via `setWholesaleShareDeliveryAddress` → `invalidate(id)`.

Props:
```ts
interface DeliveryAddressFormProps { share: WholesaleShareDetail; accountFallback: Account | null; }
```
Render only when `share.delivery.canEditAddress`.

- [ ] **Step 2: Typecheck** — no new errors.
- [ ] **Step 3: Functional check** — as recipient: type an address, pick a suggestion, save; confirm it persists.
- [ ] **Step 4: Commit** — `refactor(wholesale-shared): extract DeliveryAddressForm`

---

## Task 9: Compose stage views + role-aware assembly

**Files:**
- Create: `artifacts/peps-anonymous/src/components/wholesale-shared/DoneSummary.tsx`
- Create: `artifacts/peps-anonymous/src/components/wholesale-shared/stages/BuildingStage.tsx`
- Create: `artifacts/peps-anonymous/src/components/wholesale-shared/stages/PayingStage.tsx`
- Create: `artifacts/peps-anonymous/src/components/wholesale-shared/stages/DoneStage.tsx`
- Modify: `WholesaleShared.tsx` (replace the now-emptied inline sections with a stage switch)

- [ ] **Step 1: Build `DoneSummary`** — "Order placed ✓" using `me.orderCode`, what they paid (`WhatYouOwe` totals, read-only), `share.delivery` info, and tracking/QR if present. Chat stays separate.

- [ ] **Step 2: Compose the three stages**

- `BuildingStage`: `ShareHeader` → `MyItemsEditor` (canEdit) → `GroupCard` (defaultOpen) → `{share.isCreator && <ManageSheet />}` → `{share.onward.canManage && <RecipientOnwardManage />}` → chat.
- `PayingStage`: `ShareHeader` → `{me && <WhatYouOwe />}` → `{share.onward.canSetDestination && <MemberOnwardDestination />}` → `{share.delivery.canEditAddress && <DeliveryAddressForm />}` → `GroupCard` (collapsed) → `{share.isCreator && <ManageSheet />}` (cancel + fee toggles) → `{share.onward.canManage && <RecipientOnwardManage />}` → chat.
- `DoneStage`: `ShareHeader` → `DoneSummary` → `GroupCard` (collapsed) → chat.

Each stage receives `share`, `products`, `account`, and the page-level callbacks (`onBack`, `onCopy`, `copied`, `onPayOrder`).

- [ ] **Step 3: Switch the page by stage**

In `WholesaleShared.tsx`, after the loading/not-found/join guards and `if (!share) return null;`, replace the big inline block with:
```tsx
const stage = shareStage(share.status);
// render <PageLayout> wrapper, then:
{stage === "building" && <BuildingStage .../>}
{stage === "paying" && <PayingStage .../>}
{stage === "done" && <DoneStage .../>}
{stage === "cancelled" && <DoneStage .../>}  // cancelled reuses Done layout; ShareHeader shows the cancelled banner; chat read-only
```
Keep the existing `<ShareChat shareId={share.id} readOnly={share.status === "cancelled"} />` inside each stage (or render once below the switch). Ensure the chat is members-only exactly as before.

- [ ] **Step 4: Typecheck** — `pnpm typecheck`; compare to `/tmp/typecheck-baseline.txt`; zero new errors.
- [ ] **Step 5: Commit** — `feat(wholesale-shared): stage-driven, role-aware layout`

---

## Task 10: Build gate

**Files:** none.

- [ ] **Step 1: Build** — `npm run build`; expected: success (frontend + API server).
- [ ] **Step 2: Restart** the `Start application` workflow only; confirm the page loads with no console errors.
- [ ] **Step 3: Commit** if any build-config touch-ups were needed (should be none).

---

## Task 11: End-to-end walkthrough (role × stage)

**Files:** none (use the `testing` skill / manual run).

- [ ] **Step 1: Verify each combination** renders only what it should:

| Stage \ Role | Regular member | Organiser | Recipient |
|---|---|---|---|
| Building (open) | header, My items, Group, chat | + Manage | + onward setup (in Manage/onward) |
| Paying (locked) | header, What you owe, Group, chat | + Manage (fees, cancel) | + onward manage, delivery address |
| Done (submitted) | header, Done summary, Group, chat | same | same |
| Cancelled | cancelled banner, read-only | same | same |

- [ ] **Step 2: Money check** — for a locked share, the `WhatYouOwe` total equals items+tip+shippingShare (+organiser+onward when not recipient), matching pre-redesign amounts.
- [ ] **Step 3: Action check** — add items → lock → pay order → mark organiser fee paid → mark onward charge paid → auto-submit; plus the cancel path. All use the existing endpoints and still work.
- [ ] **Step 4: Confirm hidden = absent** — a regular member sees no organiser/recipient controls anywhere (not merely shrunk).
- [ ] **Step 5: Commit** — `test(wholesale-shared): verified role × stage walkthrough`

---

## Self-review (run after writing — completed)

1. **Spec coverage:** stage-following (Tasks 1,9) ✓; hide-what-you-can't-use via single Manage (Tasks 6,9) ✓; collapsible cards (Tasks 1,3,5) ✓; unified What-you-owe (Task 5) ✓; file split for maintainability (Tasks 2–9) ✓; no data/API/money changes (verification rule + Task 11) ✓.
2. **Placeholder scan:** component bodies that are bulk JSX moves are specified by exact source line ranges + typed props rather than reproduced verbatim — intentional (see "Verification approach"); all *new* logic (stage helper, ExpandableCard, WhatYouOwe computation) is given as complete code.
3. **Type consistency:** all props reference real exported types (`WholesaleShareDetail`, `WholesaleShareMember`, `ProductLite`, `Account`); `me` is `share.members.find(m => m.isYou)`; the page owns the single `products` fetch and passes it down.
4. **Ambiguity:** "Pay now" reuses the existing order pay action (no new route); cancelled stage reuses the Done layout with the cancelled banner + read-only chat — both made explicit.

## Execution handoff

Two options once approved:
1. **Subagent-driven (recommended)** — a fresh subagent per task with review between tasks.
2. **Inline** — execute here with checkpoints.
