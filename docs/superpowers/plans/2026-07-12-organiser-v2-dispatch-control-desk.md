# Organiser v2 Dispatch Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the busy Dispatch control desk with one organiser-v2-native page that automatically calculates ready orders from selected delivered parcels and reports the result to Overview.

**Architecture:** Keep the tested dispatch domain model and sample data, but replace the staged UI with `DeliveredParcelList` and `ReadyOrderList`. Hoist the prototype `DeskState` into `Workspace` so parcel selection and ready count survive tab changes; pass the count to `OverviewTab` for its alert. Keep Dispatch Log as the only secondary page state.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Lucide React, Node 24 test runner.

**Repository constraint:** Do not run Git commands. Work only in the current workspace.

---

### Task 1: Make parcel selection calculate fulfilment atomically

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/dispatch/model.test.ts`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/dispatch/model.ts`

- [ ] **Step 1: Add failing automatic-calculation tests**

```ts
import { getReadyCount, selectParcelsAndCompute } from "./model.ts";

test("selecting parcels immediately computes and selects ready orders", () => {
  const next = selectParcelsAndCompute({
    ...baseState,
    parcels: fixtureParcels,
    orders: fixtureOrders,
  }, ["parcel-a"]);

  assert.deepEqual(next.selectedParcelIds, ["parcel-a"]);
  assert.equal(next.fulfilment?.length, 2);
  assert.deepEqual(next.selectedOrderIds, ["order-a"]);
  assert.equal(getReadyCount(next), 1);
});

test("clearing parcels clears fulfilment and ready count", () => {
  const computed = selectParcelsAndCompute({
    ...baseState,
    parcels: fixtureParcels,
    orders: fixtureOrders,
  }, ["parcel-a"]);
  const next = selectParcelsAndCompute(computed, []);

  assert.equal(next.fulfilment, null);
  assert.deepEqual(next.selectedOrderIds, []);
  assert.equal(getReadyCount(next), 0);
});
```

- [ ] **Step 2: Run the tests and confirm they fail for missing exports**

Run: `pnpm --filter @workspace/peps-anonymous test:dispatch`

Expected: FAIL for `selectParcelsAndCompute` and `getReadyCount`.

- [ ] **Step 3: Implement the atomic transition and count helper**

```ts
export function selectParcelsAndCompute(state: DeskState, parcelIds: string[]): DeskState {
  const selected = selectParcels(state, parcelIds);
  return parcelIds.length === 0 ? selected : computeFulfilment(selected);
}

export function getReadyCount(state: DeskState): number {
  return state.fulfilment?.filter(row => row.ready).length ?? 0;
}
```

- [ ] **Step 4: Run the focused suite**

Expected: all 9 dispatch tests pass.

### Task 2: Expand parcel data to match the supplied reference

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/dispatch/sample-data.ts`

- [ ] **Step 1: Replace the three generic parcels with five package records**

Use package labels `Package 4`, `Package 3`, `Package 6`, `Package 5`, and `Package 1`. Every record uses reshipper `urbanblend789`, `delivered` status, a distinct tracking number, and 5–11 product items.

Include all three item states in the actual data:

```ts
{ productId: "ahk-cu-100", name: "AHK-CU 100mg", quantity: 1, dispatchedQuantity: 0 }
{ productId: "retra-30", name: "Retatrutide 30mg", quantity: 6, dispatchedQuantity: 1 }
{ productId: "frag-5", name: "Fragment 176-191 5mg", quantity: 2, dispatchedQuantity: 2 }
```

The remaining products should use the names and quantities visible in the reference: BPC-157, Cagrilintide, GHK-CU, Epitalon, DSIP, Pinealon, Semaglutide, Melanotan II, Mots-C, Tesamorelin, KPV, GLOW, and BAC water.

- [ ] **Step 2: Preserve active order product IDs**

Ensure at least three active orders use product IDs present in the new packages so automatic fulfilment produces a nonzero ready count. Keep one QR uploaded, one QR reminder-needed, and one non-QR ready order.

- [ ] **Step 3: Run the focused tests**

Expected: all tests remain green because model fixtures are isolated from sample data.

### Task 3: Build the reference-style delivered parcel list

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/dispatch/DeliveredParcelList.tsx`

- [ ] **Step 1: Define a controlled selection interface**

```ts
interface DeliveredParcelListProps {
  parcels: DeliveredParcel[];
  selectedParcelIds: string[];
  onSelectionChange: (parcelIds: string[]) => void;
}
```

- [ ] **Step 2: Render organiser-v2 parcel cards**

Each parcel is a `button` with `role="checkbox"`, `aria-checked`, `rounded-xl bg-white p-4 sm:p-5`, and `V2_CARD_BORDER`. The header contains a 22px checkbox, bold package label, purple reshipper badge, green delivered badge, and monospace tracking number.

Product chips use:

```tsx
const remaining = Math.max(0, item.quantity - item.dispatchedQuantity);
const exhausted = remaining === 0;

<span
  className="inline-flex flex-wrap items-baseline gap-1 rounded-lg border px-2.5 py-1 text-[12px] sm:text-[13px]"
  style={{
    borderColor: exhausted ? "#FCA5A5" : "#DCE3EC",
    background: exhausted ? "#FFF7F7" : "#F8FAFC",
    color: exhausted ? "#DC2626" : "#334155",
  }}
>
  <span className={exhausted ? "line-through" : ""}>{item.name} ×{remaining}</span>
  {item.dispatchedQuantity > 0 && (
    <span style={{ color: "#94A3B8" }}>({item.dispatchedQuantity} sent)</span>
  )}
</span>
```

The footer reads `{dispatched} already dispatched · {remaining} remaining`.

- [ ] **Step 3: Verify selection affordance**

Selected cards use `var(--t-blue-05)` and `var(--t-blue)` border; unselected cards remain white. Product chips wrap without horizontal overflow at 390px.

### Task 4: Build the automatic ready-order list and actions

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/dispatch/ReadyOrderList.tsx`

- [ ] **Step 1: Define the component contract**

```ts
interface ReadyOrderListProps {
  state: DeskState;
  remindedOrderIds: string[];
  reminderState: "idle" | "sending" | "sent";
  onSelectedOrderIdsChange: (ids: string[]) => void;
  onSendReminders: () => void;
  onConfirmDispatch: () => void;
}
```

- [ ] **Step 2: Render the selection-dependent empty state**

When `selectedParcelIds.length === 0`, render one standard white card with `Select delivered parcels to see which orders are ready.` Do not show actions.

- [ ] **Step 3: Render ready order cards**

Use `state.fulfilment.filter(row => row.ready)`. Cards show checkbox, order code, member, username, product quantities, delivery method, country, and QR status. Use the same border, padding, checkbox, and selection treatment as parcel cards.

- [ ] **Step 4: Render waiting orders as a disclosure**

Use one low-emphasis button: `Waiting for stock (N)`. Expanded rows show each missing item as `Need N · M available`. Do not render a separate colored dashboard section.

- [ ] **Step 5: Add the normal-flow action row**

Render `Print packing slips`, conditional `Send QR reminders`, and `Dispatch selected` after the order list. Reuse the existing print and confirmation modal behavior, but use `rounded-xl` dialogs, `rounded-lg` buttons, `V2_CARD_BORDER`, and organiser-v2 text sizes. The row is not sticky.

### Task 5: Replace the staged Dispatch page

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/dispatch/DispatchControlDesk.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/DispatchTab.tsx`

- [ ] **Step 1: Convert DispatchControlDesk to controlled state**

```ts
interface DispatchControlDeskProps {
  state: DeskState;
  onStateChange: (state: DeskState) => void;
}
```

Remove all custom CSS variables, `DispatchHeader`, `DispatchStageRail`, `DispatchSummary`, `ReceiveStage`, `PrepareStage`, and `DispatchStage` rendering.

- [ ] **Step 2: Render one organiser-v2-native page**

```tsx
<div className="space-y-4 sm:space-y-5">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>Dispatch</h2>
      <p className="mt-0.5 text-[12px]" style={{ color: "var(--t-subtle)" }}>
        Select received parcels and dispatch the orders they can fulfil.
      </p>
    </div>
    <button className="h-10 rounded-lg border bg-white px-4 text-[12px] font-semibold">Dispatch Log</button>
  </div>
  <DeliveredParcelList
    parcels={state.parcels}
    selectedParcelIds={state.selectedParcelIds}
    onSelectionChange={ids => onStateChange(selectParcelsAndCompute(state, ids))}
  />
  <ReadyOrderList
    state={state}
    remindedOrderIds={Object.keys(reminderSentAtByOrder)}
    reminderState={reminderState}
    onSelectedOrderIdsChange={ids => onStateChange({ ...state, selectedOrderIds: ids })}
    onSendReminders={sendReminders}
    onConfirmDispatch={dispatchBatch}
  />
</div>
```

Parcel selection calls `selectParcelsAndCompute(state, ids)` immediately.

- [ ] **Step 3: Keep Dispatch Log as the only secondary state**

When log view is active, render a simple header with `Back to Dispatch`, then the existing `DispatchLog`. Remove live status, refresh controls, large historical header, and bespoke visual variables.

- [ ] **Step 4: Pass controlled props through DispatchTab**

```ts
interface DispatchTabProps {
  state: DeskState;
  onStateChange: (state: DeskState) => void;
}
```

### Task 6: Hoist Dispatch state and add the Overview alert

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/OverviewTab.tsx`

- [ ] **Step 1: Initialize dispatch state in Workspace**

```ts
const [dispatchState, setDispatchState] = useState(createInitialDeskState);
const readyDispatchCount = getReadyCount(dispatchState);
```

Pass `dispatchState` and `setDispatchState` to `DispatchTab`. Pass `readyDispatchCount` to Overview.

- [ ] **Step 2: Extend Overview props**

```ts
export default function OverviewTab({
  gb,
  onGoto,
  dispatchReadyCount,
}: {
  gb: SampleGB;
  onGoto: (tab: string) => void;
  dispatchReadyCount: number;
})
```

- [ ] **Step 3: Add the compact Overview alert**

When `dispatchReadyCount > 0`, render after the stat cards:

```tsx
<button
  type="button"
  onClick={() => onGoto("dispatch")}
  className="w-full rounded-xl bg-white p-4 text-left sm:p-5"
  style={{ border: "1px solid rgba(30,122,92,.22)" }}
>
  <div className="flex items-center gap-3">
    <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "var(--t-blue-08)", color: "var(--t-blue)" }}>
      <Truck className="h-4 w-4" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[13px] font-bold" style={{ color: "var(--t-text)" }}>
        {dispatchReadyCount} orders are ready to dispatch
      </p>
      <p className="mt-0.5 text-[11px]" style={{ color: "var(--t-subtle)" }}>
        Selected delivered parcels can fulfil these orders.
      </p>
    </div>
    <span className="text-[11px] font-semibold" style={{ color: "var(--t-blue)" }}>Review dispatch →</span>
  </div>
</button>
```

- [ ] **Step 4: Verify state survives tab changes**

Select packages in Dispatch, switch to Overview, confirm the alert count, click the alert, and verify the same packages remain selected.

### Task 7: Remove obsolete staged UI and verify

**Files:**
- Delete through `apply_patch`: `DispatchHeader.tsx`, `DispatchStageRail.tsx`, `DispatchSummary.tsx`, `ReceiveStage.tsx`, `PrepareStage.tsx`, `DispatchStage.tsx`
- Modify only files implicated by verification failures.

- [ ] **Step 1: Remove obsolete component files**

Use `apply_patch` deletion only after `rg` confirms no remaining imports.

- [ ] **Step 2: Run focused tests**

Run: `pnpm --filter @workspace/peps-anonymous test:dispatch`

Expected: 9 tests pass.

- [ ] **Step 3: Run production build**

Run: `PORT=3001 BASE_PATH=/ pnpm --filter @workspace/peps-anonymous build`

Expected: Vite exits 0. Existing bundle-size and tooltip sourcemap warnings may remain.

- [ ] **Step 4: Run typecheck**

Run: `pnpm --filter @workspace/peps-anonymous typecheck`

Expected: existing repository errors may remain; no errors may reference `organiser-v2/dispatch`, `Workspace.tsx`, or `OverviewTab.tsx`.

- [ ] **Step 5: Browser review**

At 1280px and 390px, verify parcel cards match the reference hierarchy, chips wrap, ready orders appear without a Calculate click, the action row is not sticky, the Overview alert navigates correctly, and Dispatch Log returns to the simple page.
