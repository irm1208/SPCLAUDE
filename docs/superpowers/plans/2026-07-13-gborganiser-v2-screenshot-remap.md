# GB Organiser v2 Screenshot Remap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild both `/gborganiser-v2` flows with the approved screenshot-matched shell, dashboard composition, setup navigation, and scoped visual system while preserving all group-buy behavior.

**Architecture:** Introduce v2-scoped design tokens, reusable shell/primitives, and pure overview view-model helpers. `Workspace` and `SetupWizard` each compose the same shell with different navigation data; existing operational tabs remain their own domain owners and render inside a shared reference-style screen adapter. Replace the placeholder `OverviewTabV3` data with group-buy records and a screenshot-matched analytics-plus-board composition.

**Tech Stack:** React 19, TypeScript 5.9, Vite, Tailwind CSS 4, Lucide React, Chart.js, Node test runner.

**Repository safety:** Existing organiser-v2 files are untracked user work. Do not create implementation commits or stage those files; preserve all unrelated dirty changes and use verification checkpoints instead.

---

### Task 1: Add tested overview view-model helpers

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/overview-model.ts`
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/overview-model.test.ts`
- Modify: `artifacts/peps-anonymous/package.json`

- [ ] **Step 1: Write the failing overview snapshot tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { buildOverviewSnapshot, type OverviewOrder } from "./overview-model.ts";

const orders: OverviewOrder[] = [
  { id: "1", status: "pending", total: 65, memberName: "Sarah M.", products: ["Tirzepatide 10mg × 1"] },
  { id: "2", status: "paid", total: 120, memberName: "John D.", products: ["Semaglutide 5mg × 2"] },
  { id: "3", status: "processing", total: 60, memberName: "Anna P.", products: ["BPC-157 5mg × 2"] },
  { id: "4", status: "shipped", total: 135, memberName: "Mike F.", products: ["Semaglutide 5mg × 3"] },
];

test("buildOverviewSnapshot groups orders into the approved board lanes", () => {
  const result = buildOverviewSnapshot(orders, 42, "GBP");
  assert.deepEqual(result.stageCounts, { awaiting: 1, paid: 1, packing: 1, dispatched: 1 });
  assert.equal(result.members, 42);
  assert.equal(result.revenue, 380);
  assert.equal(result.board[0].orders[0].memberName, "Sarah M.");
});

test("buildOverviewSnapshot returns stable zero states", () => {
  const result = buildOverviewSnapshot([], 0, "GBP");
  assert.equal(result.revenue, 0);
  assert.equal(result.board.every(column => column.orders.length === 0), true);
});
```

- [ ] **Step 2: Add the focused test command and verify failure**

```json
"test:overview": "node --experimental-strip-types src/pages/organiser-v2/overview-model.test.ts"
```

Run: `pnpm --filter @workspace/peps-anonymous test:overview`

Expected: FAIL because `overview-model.ts` does not exist.

- [ ] **Step 3: Implement the pure snapshot builder**

```ts
export type OverviewOrderStatus = "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "dispatched";

export interface OverviewOrder {
  id: string;
  status: OverviewOrderStatus;
  total: number;
  memberName: string;
  products: string[];
}

const LANES = [
  { id: "awaiting", label: "Awaiting payment", statuses: new Set(["pending"]) },
  { id: "paid", label: "Paid", statuses: new Set(["paid"]) },
  { id: "packing", label: "Packing", statuses: new Set(["processing"]) },
  { id: "dispatched", label: "Dispatched", statuses: new Set(["shipped", "delivered", "dispatched"]) },
] as const;

export function buildOverviewSnapshot(orders: OverviewOrder[], members: number, currency: string) {
  const board = LANES.map(lane => ({
    id: lane.id,
    label: lane.label,
    orders: orders.filter(order => lane.statuses.has(order.status as never)),
  }));
  return {
    board,
    stageCounts: Object.fromEntries(board.map(column => [column.id, column.orders.length])),
    revenue: orders.reduce((sum, order) => order.status === "cancelled" ? sum : sum + order.total, 0),
    members,
    currency,
  };
}
```

- [ ] **Step 4: Run the focused test**

Run: `pnpm --filter @workspace/peps-anonymous test:overview`

Expected: 2 tests pass.

### Task 2: Replace the v2 theme with reference tokens and scoped CSS

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/theme.ts`
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/organiser-v2.css`
- Modify: `artifacts/peps-anonymous/src/pages/GbOrganiserV2.tsx`

- [ ] **Step 1: Define the reference palette and geometry in `theme.ts`**

```ts
export const V2_CANVAS = "#FFFFFF";
export const V2_SIDEBAR = "#FAF9FB";
export const V2_CARD_BORDER = "#E8E8EB";

export const V2_VARS: CSSProperties = {
  ["--ov2-canvas" as string]: V2_CANVAS,
  ["--ov2-sidebar" as string]: V2_SIDEBAR,
  ["--ov2-card" as string]: "#FFFFFF",
  ["--ov2-border" as string]: V2_CARD_BORDER,
  ["--ov2-text" as string]: "#18181B",
  ["--ov2-muted" as string]: "#6F6F76",
  ["--ov2-subtle" as string]: "#929299",
  ["--ov2-primary" as string]: "#242426",
  ["--ov2-purple" as string]: "#6658CD",
  ["--ov2-orange" as string]: "#ED832C",
  ["--ov2-green" as string]: "#16A36F",
  ["--t-blue" as string]: "#242426",
  ["--t-blue-deep" as string]: "#18181B",
  ["--t-text" as string]: "#18181B",
  ["--t-muted" as string]: "#6F6F76",
  ["--t-subtle" as string]: "#929299",
};
```

- [ ] **Step 2: Add the scoped structural stylesheet**

```css
.organiser-v2 {
  min-height: 100vh;
  color: var(--ov2-text);
  background: var(--ov2-canvas);
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.organiser-v2 *, .organiser-v2 *::before, .organiser-v2 *::after { box-sizing: border-box; }
.organiser-v2 button, .organiser-v2 input, .organiser-v2 select, .organiser-v2 textarea { font: inherit; }
.organiser-v2 :focus-visible { outline: 2px solid var(--ov2-purple); outline-offset: 2px; }
.organiser-v2 .ov2-card { border: 1px solid var(--ov2-border); border-radius: 10px; background: #fff; box-shadow: 0 7px 18px rgba(27,28,38,.035); }
.organiser-v2 .ov2-page { padding: 26px 28px 40px; }
@media (max-width: 767px) { .organiser-v2 .ov2-page { padding: 18px 16px 32px; } }
```

- [ ] **Step 3: Import the stylesheet once in `GbOrganiserV2.tsx`**

```ts
import "./organiser-v2/organiser-v2.css";
```

- [ ] **Step 4: Run typecheck**

Run: `pnpm --filter @workspace/peps-anonymous typecheck`

Expected: no new errors in `theme.ts` or `GbOrganiserV2.tsx`.

### Task 3: Build shared shell and visual primitives

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserShell.tsx`
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserTopbar.tsx`
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserUi.tsx`
- Rewrite: `artifacts/peps-anonymous/src/pages/organiser-v2/DashboardSidebar.tsx`

- [ ] **Step 1: Add focused visual primitives**

```tsx
export function MetricCard({ title, value, delta, tone = "green" }: MetricCardProps) {
  return (
    <section className="ov2-card ov2-metric-card" aria-label={`${title}: ${value}`}>
      <h3>{title}</h3>
      <strong>{value}</strong>
      {delta ? <p data-tone={tone}>{delta}</p> : null}
    </section>
  );
}

export function PageHeader({ title, description, status, children }: PageHeaderProps) {
  return (
    <header className="ov2-page-header">
      <div><div className="ov2-title-line"><h1>{title}</h1>{status}</div><p>{description}</p></div>
      {children ? <div className="ov2-page-header-actions">{children}</div> : null}
    </header>
  );
}
```

- [ ] **Step 2: Build the top bar contract**

```tsx
interface OrganiserTopbarProps {
  groupName: string;
  pageLabel: string;
  onSearch: () => void;
  onMenu: () => void;
  primaryAction?: { label: string; onClick: () => void };
  secondaryActions?: ReactNode;
}
```

Render a 98px desktop bar with back button, two-level breadcrumb, 320px search control, secondary actions, and one dark primary button. At mobile width render menu, truncated breadcrumb, search icon, and primary action.

- [ ] **Step 3: Rebuild `DashboardSidebar` with the reference hierarchy**

Keep the existing `activeTab` and `onTabChange` contract. Add `variant: "workspace" | "setup"`, optional setup steps, `currentStep`, and `onStepChange`. Render brand, grouped tree navigation, count badges, utilities, and profile block. Remove GSAP and the unused favorites block.

- [ ] **Step 4: Compose the shell**

```tsx
export function OrganiserShell({ sidebar, topbar, children }: OrganiserShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="ov2-shell">
      <aside className="ov2-sidebar-desktop">{sidebar}</aside>
      <div className={mobileOpen ? "ov2-drawer is-open" : "ov2-drawer"}>{sidebar}</div>
      <div className="ov2-main">{topbar(() => setMobileOpen(true))}{children}</div>
    </div>
  );
}
```

- [ ] **Step 5: Run typecheck**

Run: `pnpm --filter @workspace/peps-anonymous typecheck`

Expected: shell and primitive files compile without new diagnostics.

### Task 4: Wire the shared shell into workspace routing

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/GbOrganiserV2.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/nav.ts`

- [ ] **Step 1: Add page metadata to `nav.ts`**

```ts
export const WORKSPACE_PAGE_META: Record<WorkspaceTabId, { title: string; description: string; primaryAction?: string }> = {
  overview: { title: "Winter Peptide Run 2025", description: "Monitor orders, payments, fulfillment, and member activity.", primaryAction: "Create order" },
  todos: { title: "Todo list", description: "Track organiser work and operational follow-ups.", primaryAction: "Create task" },
  orders: { title: "Orders", description: "Review payments, products, and fulfillment status.", primaryAction: "Create order" },
  broadcast: { title: "Broadcast", description: "Send group-buy updates and review message delivery.", primaryAction: "New broadcast" },
  parcels: { title: "Parcels", description: "Track inbound supplier parcels and their contents.", primaryAction: "Add parcel" },
  dispatch: { title: "Dispatch", description: "Select received parcels and dispatch fulfillable orders." },
  qrcodes: { title: "QR codes", description: "Manage member shipping labels and QR status." },
  reshippers: { title: "Package forwarders", description: "Manage forwarders and their assigned destinations.", primaryAction: "Add forwarder" },
  legs: { title: "International forwarding", description: "Coordinate country legs and parcel hand-offs.", primaryAction: "Add leg" },
  shipping: { title: "Shipping rates", description: "Configure delivery methods, countries, and prices.", primaryAction: "Add rate" },
  pnl: { title: "Profit & loss", description: "Monitor revenue, costs, and margin." },
  labtests: { title: "Vendor COAs", description: "Store and review vendor certificates." },
  testinggroups: { title: "Lab testing pool", description: "Coordinate samples, contributions, and results." },
  summary: { title: "Summary", description: "Review and export the supplier order rollup." },
  tickets: { title: "Tickets", description: "Resolve member questions and operational issues." },
  settings: { title: "GB settings", description: "Manage the active group buy configuration." },
  products: { title: "Products", description: "Manage the group-buy catalogue and pricing.", primaryAction: "Add product" },
  rules: { title: "Rules", description: "Edit member-facing information and participation rules." },
};
```

- [ ] **Step 2: Replace the nested dashboard layout in `Workspace`**

Render `OrganiserShell`, reference sidebar, and topbar around the active tab. Keep `active`, `searchOpen`, dispatch state, badge calculation, highlight navigation, and every existing tab branch.

- [ ] **Step 3: Remove the old page-level toolbar from `GbOrganiserV2`**

Keep mode state, welcome modal, command palette, and shortcut modal. Render only the selected flow inside the scoped `.organiser-v2` root.

- [ ] **Step 4: Verify navigation manually**

Run the dev server and visit each sidebar item. Expected: active state and breadcrumb change, no tab becomes unreachable, and command search still opens with Cmd/Ctrl+K.

### Task 5: Replace OverviewTabV3 with the approved group-buy dashboard

**Files:**
- Rewrite: `artifacts/peps-anonymous/src/pages/organiser-v2/OverviewTabV3.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx`

- [ ] **Step 1: Load group-buy orders and create the pure snapshot**

```tsx
const storedOrders = loadGb<StoredOrder[]>(selectedGbId ?? undefined, "orders", SAMPLE_OVERVIEW_ORDERS, "orders");
const snapshot = buildOverviewSnapshot(
  storedOrders.map(order => ({
    id: order.id,
    status: order.status,
    total: order.total,
    memberName: order.memberName,
    products: order.products.map(product => `${product.name} × ${product.quantity}`),
  })),
  gb.members,
  gb.currency,
);
```

- [ ] **Step 2: Build the screenshot-matched analytics grid**

Use a two-row CSS grid containing:

- order-status summary card spanning both rows;
- revenue metric card;
- members metric card;
- fulfillment trend chart spanning both rows.

Use the purple and orange stepped-line treatment from the approved preview and textual chart summaries for accessibility.

- [ ] **Step 3: Build the order-stage board**

Render Spreadsheet, Board, Calendar, and Timeline controls; Board is active. Render four lanes from `snapshot.board` with reference-style column headings and operational order cards.

- [ ] **Step 4: Connect dispatch readiness and page navigation**

Accept `dispatchReadyCount` and `onGoto`. Show a compact actionable note in the Packing lane when dispatch orders are ready; clicking it opens Dispatch.

- [ ] **Step 5: Run overview tests and typecheck**

Run:

```bash
pnpm --filter @workspace/peps-anonymous test:overview
pnpm --filter @workspace/peps-anonymous typecheck
```

Expected: overview tests pass and no new Overview diagnostics appear.

### Task 6: Remap the setup wizard into the shared shell

**Files:**
- Rewrite: `artifacts/peps-anonymous/src/pages/organiser-v2/SetupWizard.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/GbOrganiserV2.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/steps/BasicsStep.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/steps/ProductsStep.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/steps/ShippingStep.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/steps/PaymentsStep.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/steps/AccessStep.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/steps/RulesStep.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/steps/ReviewStep.tsx`

- [ ] **Step 1: Make setup a shell-level controlled flow**

Keep `current`, launch modal, and visibility state. Pass setup steps into `DashboardSidebar` and render `OrganiserTopbar` with Save draft, Preview, and Continue/Launch actions.

- [ ] **Step 2: Add the setup status band**

Render three compact reference cards before the form:

- current step and total steps;
- completed section count;
- draft visibility or step-specific total.

- [ ] **Step 3: Restyle form geometry through shared classes**

Use `.ov2-form-panel`, `.ov2-field`, `.ov2-label`, and `.ov2-help` classes. Preserve all existing form controls and step content. Replace green primary actions and pill controls with the near-black reference action system.

- [ ] **Step 4: Preserve launch confirmation semantics**

Keep radio labels, modal heading, Cancel, and Confirm Launch. Add `role="dialog"`, `aria-modal="true"`, labelled heading, Escape close, and initial focus on the close control.

- [ ] **Step 5: Manually traverse all steps**

Expected: sidebar step selection, Back, Continue, Review, and Launch modal all work at desktop and 390px width.

### Task 7: Apply the reference screen adapter to operational tabs

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/WorkspaceScreen.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/organiser-v2.css`

- [ ] **Step 1: Add a consistent operational screen boundary**

```tsx
export function WorkspaceScreen({ pageId, children }: { pageId: WorkspaceTabId; children: ReactNode }) {
  return <section className="ov2-page ov2-workspace-screen" data-page={pageId}>{children}</section>;
}
```

- [ ] **Step 2: Wrap every active tab in `WorkspaceScreen`**

Keep the current tab component branches unchanged inside the wrapper so all domain behavior remains owned by the existing screens.

- [ ] **Step 3: Normalize old v2 surfaces inside the scoped adapter**

```css
.ov2-workspace-screen :where(.rounded-xl) { border-radius: 10px; }
.ov2-workspace-screen :where(.rounded-full):not(.avatar):not([role="switch"]) { border-radius: 8px; }
.ov2-workspace-screen :where(.shadow-lg,.shadow-xl) { box-shadow: 0 10px 28px rgba(27,28,38,.09); }
.ov2-workspace-screen :where(h1,h2) { letter-spacing: -.025em; }
.ov2-workspace-screen :where(input,select,textarea) { border-color: var(--ov2-border); background: #fff; }
```

Add targeted selectors for existing top-level stat grids, cards, tables, filters, modals, and action rows. Do not globally override semantic success, warning, or danger colors.

- [ ] **Step 4: Review every operational screen**

Expected: no page shows the old green page canvas, oversized radius system, or separate dashboard shell. Forms and tables retain appropriate structures within the shared screenshot composition.

### Task 8: Responsive and accessibility hardening

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserShell.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserTopbar.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/DashboardSidebar.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/organiser-v2.css`

- [ ] **Step 1: Add drawer focus and dismissal behavior**

On open, focus the first sidebar navigation item. Close on Escape, overlay click, and navigation. Restore focus to the menu trigger.

- [ ] **Step 2: Add mobile layout rules**

At 1023px hide the fixed sidebar and show the drawer trigger. At 767px condense the topbar, stack analytics, keep 40px touch targets, and contain boards with `overflow-x: auto`.

- [ ] **Step 3: Audit control labelling**

Add `aria-label` to icon-only buttons, `aria-current="page"` to active navigation, `aria-expanded` to collapsible groups, and text summaries to chart figures.

- [ ] **Step 4: Verify keyboard flow**

Expected: Tab order follows sidebar → topbar → page content, Enter/Space activates navigation and views, Escape closes drawer/modals, and focus never disappears behind an overlay.

### Task 9: Full verification and visual comparison

**Files:**
- Modify only files implicated by verification failures.

- [ ] **Step 1: Run focused tests**

```bash
pnpm --filter @workspace/peps-anonymous test:overview
pnpm --filter @workspace/peps-anonymous test:dispatch
```

Expected: all overview and dispatch tests pass.

- [ ] **Step 2: Run typecheck**

Run: `pnpm --filter @workspace/peps-anonymous typecheck`

Expected: no new diagnostics in the organiser-v2 shell, setup, overview, workspace, or theme files. Report unrelated pre-existing diagnostics separately.

- [ ] **Step 3: Run the production build**

Run: `PORT=5173 BASE_PATH=/ pnpm --filter @workspace/peps-anonymous build`

Expected: Vite exits 0 and emits the production bundle.

- [ ] **Step 4: Perform desktop visual review**

At the supplied screenshot ratio, compare:

- sidebar proportion and fixed profile/utilities;
- 98px topbar and breadcrumb/search/action alignment;
- compact 24–28px page heading;
- analytics card sizes and two-row grid;
- pale borders, restrained shadows, and 9–12px radii;
- board column density and metadata hierarchy.

- [ ] **Step 5: Perform tablet and mobile review**

Check 1024px, 768px, and 390px widths. Expected: functional drawer, no page-level horizontal overflow, stacked analytics, contained boards, usable forms, and 40px touch targets.

- [ ] **Step 6: Smoke-test both flows**

Visit every workspace destination and all seven setup steps. Verify command search, filters, selection, modals, dispatch persistence, view controls, and launch flow. Confirm `/gborganiser` remains unchanged.
