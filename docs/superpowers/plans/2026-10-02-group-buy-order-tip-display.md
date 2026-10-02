# Group-buy organiser order tip display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show each positive tip in the organiser’s existing group-buy order breakdown.

**Architecture:** Keep the existing API and data model unchanged. Render the existing `o.tip` amount as a conditional row immediately before the existing Total row in `GbOrganiser.tsx`, and add a source-contract test following the established page contract-test pattern.

**Tech Stack:** React, TypeScript, Node.js test runner via `tsx`, Vite.

---

### Task 1: Display and verify the per-order tip amount

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/GbOrganiser.tsx`
- Create: `artifacts/peps-anonymous/src/pages/gb-organiser-order-tip.test.ts`

- [ ] **Step 1: Add a failing order-breakdown contract test**

Create `artifacts/peps-anonymous/src/pages/gb-organiser-order-tip.test.ts` with:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./GbOrganiser.tsx", import.meta.url), "utf8");
const breakdownStart = source.indexOf("{/* Items — always visible */}");
const breakdownEnd = source.indexOf("{/* Reshipper */}", breakdownStart);
const breakdown = source.slice(breakdownStart, breakdownEnd);

test("organiser order breakdown renders a positive tip before the unchanged total", () => {
  const tipRow = breakdown.indexOf("{o.tip > 0 && (");
  const totalRow = breakdown.indexOf(">Total</span>");

  assert.ok(tipRow >= 0, "positive tips should have a conditional Tip row");
  assert.ok(totalRow > tipRow, "the Tip row should appear before Total");
  assert.match(breakdown.slice(tipRow, totalRow), /Tip/);
  assert.match(breakdown.slice(tipRow, totalRow), /\{gb\.currency\}\s*\{o\.tip\.toFixed\(2\)\}/);
});

test("organiser order breakdown does not render a row for zero tips", () => {
  assert.match(breakdown, /\{o\.tip > 0 && \(/);
});

test("tip display leaves the order grand total as its existing value", () => {
  assert.match(breakdown, /\{gb\.currency\}\s*\{o\.grandTotal\.toFixed\(2\)\}/);
});
```

- [ ] **Step 2: Run the test and confirm it fails because the Tip row is missing**

Run:

```bash
pnpm --filter @workspace/peps-anonymous exec tsx --test src/pages/gb-organiser-order-tip.test.ts
```

Expected: the first two tests fail because there is no conditional Tip row; the total-contract test passes.

- [ ] **Step 3: Add the conditional Tip row before Total**

In `GbOrganiser.tsx`, immediately after the existing conditional Shipping row and before the Total row, render:

```tsx
{o.tip > 0 && (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 9px 0", marginTop: 2 }}>
    <span style={{ fontSize: 10, color: "var(--t-subtle)" }}>Tip</span>
    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--t-muted)", fontVariantNumeric: "tabular-nums" }}>
      {gb.currency} {o.tip.toFixed(2)}
    </span>
  </div>
)}
```

Do not change `o.grandTotal`, payment calculations, the API response, or other role views.

- [ ] **Step 4: Run the focused test and frontend build**

Run:

```bash
pnpm --filter @workspace/peps-anonymous exec tsx --test src/pages/gb-organiser-order-tip.test.ts
pnpm --filter @workspace/peps-anonymous run build
git diff --check
```

Expected: all three focused tests pass, Vite reports a successful build, and `git diff --check` prints no errors.

- [ ] **Step 5: Verify the order breakdown**

Inspect the rendered organiser order card at desktop and mobile widths when an authenticated organiser preview is available. Confirm a positive tip appears between Shipping and Total, zero tips add no row, the customer username stays in the existing order header, and Total remains unchanged.