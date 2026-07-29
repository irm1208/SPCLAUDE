# GB Organiser V2 Members CRM Mockup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build one high-fidelity, interactive Member CRM mockup in the existing mockup sandbox, preserving the GB Organiser V2 shell and Members workflow while leaving production code untouched.

**Architecture:** Add one auto-discovered component group under artifacts/mockup-sandbox/src/components/mockups/members-crm. A typed local dataset and pure selectors feed a coordinator that owns filtering, sorting, selected-member state, preview-state state, and local action feedback. Focused child components render the shell, summary strip, directory, member profile, and activity timeline; one scoped stylesheet supplies the Peps visual system, split-pane layout, mobile detail sheet, focus treatment, and reduced-motion behavior.

**Tech Stack:** React 19, TypeScript, Vite, CSS, Lucide React, the existing Radix Sheet primitives, Node’s built-in test runner, and pnpm workspace scripts.

---

## File Structure

- Create artifacts/mockup-sandbox/src/components/mockups/members-crm/data.ts for member, order, activity, status, and filter types plus deterministic local records.
- Create artifacts/mockup-sandbox/src/components/mockups/members-crm/members-crm-model.ts for pure summary, filtering, sorting, selected-member, order, and activity selectors.
- Create artifacts/mockup-sandbox/src/components/mockups/members-crm/MembersCrmShell.tsx for the static GB Organiser V2 sidebar, active group-buy card, top bar, and page frame.
- Create artifacts/mockup-sandbox/src/components/mockups/members-crm/MemberCrmSummary.tsx for the five derived summary surfaces.
- Create artifacts/mockup-sandbox/src/components/mockups/members-crm/MemberCrmDirectory.tsx for search, filters, sortable rows, loading/error/empty states, and row selection.
- Create artifacts/mockup-sandbox/src/components/mockups/members-crm/MemberCrmProfile.tsx for selected-member identity, metrics, current orders, actions, desktop profile surface, and mobile detail sheet.
- Create artifacts/mockup-sandbox/src/components/mockups/members-crm/MemberActivityTimeline.tsx for chronological member events.
- Create artifacts/mockup-sandbox/src/components/mockups/members-crm/MembersCrmMockup.tsx as the auto-discovered default entry point and interaction coordinator.
- Create artifacts/mockup-sandbox/src/components/mockups/members-crm/_group.css for scoped Peps tokens, layout, responsive rules, focus states, and reduced motion.
- Create artifacts/mockup-sandbox/src/components/mockups/members-crm/members-crm.test.ts for pure-selector tests and source-contract tests.

Do not hand-edit artifacts/mockup-sandbox/src/.generated/mockup-components.ts; mockupPreviewPlugin.ts owns that registry and regenerates it during Vite startup/build. Do not modify any file under artifacts/peps-anonymous/src/pages/organiser-v2/ or any production API/database file.

Execute this plan from a clean, dedicated worktree created from the commit containing this plan. The shared workspace already contains unrelated user changes, including a modified generated mockup registry; do not implement this feature in that dirty tree.

## Task 1: Define the failing contract and deterministic local data

**Files**

- Create: artifacts/mockup-sandbox/src/components/mockups/members-crm/members-crm.test.ts
- Create: artifacts/mockup-sandbox/src/components/mockups/members-crm/data.ts
- Create: artifacts/mockup-sandbox/src/components/mockups/members-crm/members-crm-model.ts

- [ ] Step 1: Write the failing source-contract and selector tests

Create a Node test file with these imports, helpers, and assertions. The source tests read sibling files, so they run without a DOM or React renderer.

~~~
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { MEMBERS, ORDERS } from "./data.ts";
import {
  filterMembers,
  getMemberActivity,
  getMemberOrders,
  sortMembers,
  summarizeMembers,
  type DirectoryFilters,
} from "./members-crm-model.ts";

const source = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

const baseFilters = (overrides: Partial<DirectoryFilters> = {}): DirectoryFilters => ({
  query: "",
  country: "all",
  payment: "all",
  fulfilment: "all",
  sortKey: "lastOrderAt",
  direction: "desc",
  ...overrides,
});

test("the local fixture is internally consistent", () => {
  const summary = summarizeMembers(MEMBERS, ORDERS);
  assert.equal(summary.memberCount, MEMBERS.length);
  assert.equal(summary.orderCount, ORDERS.length);
  assert.equal(summary.totalSpent, MEMBERS.reduce((total, member) => total + member.totalSpent, 0));
  assert.ok(MEMBERS.some(member => member.name === "James Reed"));
  assert.ok(MEMBERS.some(member => member.attention));
});

test("directory selectors search, filter, and sort without mutating records", () => {
  const searched = filterMembers(MEMBERS, baseFilters({ query: "reeper90" }));
  assert.deepEqual(searched.map(member => member.username), ["@reeper90"]);
  const pending = filterMembers(MEMBERS, baseFilters({ payment: "pending" }));
  assert.ok(pending.length > 0);
  assert.ok(pending.every(member => member.paymentStatus === "pending"));
  const sorted = sortMembers(MEMBERS.slice(0, 4), "totalSpent", "desc");
  assert.ok(sorted[0].totalSpent >= sorted[1].totalSpent);
  assert.equal(MEMBERS[0].name, "James Reed");
});

test("selected-member selectors resolve orders and activity", () => {
  const member = MEMBERS.find(item => item.name === "James Reed");
  assert.ok(member);
  assert.ok(getMemberOrders(ORDERS, member.id).length >= 1);
  assert.ok(getMemberActivity(member.id).length >= 1);
});

test("the shell and stylesheet preserve the V2 and Peps contracts", () => {
  const shell = source("./MembersCrmShell.tsx");
  const css = source("./_group.css");
  assert.match(shell, /Winter Peptide Run 2025/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /#1B3A7A/i);
  assert.match(css, /#2D6BCC/i);
});

test("the directory exposes labelled search and sortable rows", () => {
  const directory = source("./MemberCrmDirectory.tsx");
  assert.match(directory, /aria-label="Search members"/);
  assert.match(directory, /aria-sort/);
  assert.match(directory, /aria-selected/);
});

test("profile and timeline expose desktop and mobile member context", () => {
  const profile = source("./MemberCrmProfile.tsx");
  const timeline = source("./MemberActivityTimeline.tsx");
  assert.match(profile, /SheetContent/);
  assert.match(profile, /Choose a member/);
  assert.match(timeline, /Activity/);
  assert.match(timeline, /dateTime/);
});

test("the entry point wires the approved CRM boundaries", () => {
  const entry = source("./MembersCrmMockup.tsx");
  for (const name of ["MembersCrmShell", "MemberCrmSummary", "MemberCrmDirectory", "MemberCrmProfile", "MemberActivityTimeline"]) {
    assert.match(entry, new RegExp(name));
  }
});
~~~

- [ ] Step 2: Run the new test before creating implementation files

Run:

~~~
cd artifacts/mockup-sandbox
node --experimental-strip-types --test src/components/mockups/members-crm/members-crm.test.ts
~~~

Expected result: FAIL with ERR_MODULE_NOT_FOUND because data.ts and members-crm-model.ts do not exist yet.

- [ ] Step 3: Add shared types and deterministic fixture

Create data.ts with these domain contracts:

~~~
export type PaymentStatus = "confirmed" | "pending" | "overdue";
export type FulfilmentStatus = "ready" | "packing" | "dispatched" | "on-hold" | "blocked";
export type ActivityTone = "info" | "success" | "warning" | "danger";

export type MemberRecord = {
  id: string;
  name: string;
  username: string;
  initials: string;
  country: string;
  countryCode: string;
  memberSince: string;
  orderCount: number;
  productCount: number;
  totalSpent: number;
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
  lastOrderAt: string | null;
  attention: boolean;
};

export type OrderRecord = {
  id: string;
  memberId: string;
  createdAt: string;
  total: number;
  products: Array<{ name: string; quantity: number }>;
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
};

export type ActivityEvent = {
  id: string;
  memberId: string;
  occurredAt: string;
  title: string;
  detail: string;
  tone: ActivityTone;
};

export const FEATURED_MEMBERS: MemberRecord[] = [
  { id: "james-reed", name: "James Reed", username: "@j4mes_r", initials: "JR", country: "United Kingdom", countryCode: "GB", memberSince: "Jan 2025", orderCount: 5, productCount: 11, totalSpent: 1860, paymentStatus: "confirmed", fulfilmentStatus: "packing", lastOrderAt: "2026-07-12", attention: false },
  { id: "reeper90", name: "Reeper90", username: "@reeper90", initials: "R9", country: "Germany", countryCode: "DE", memberSince: "Mar 2025", orderCount: 4, productCount: 8, totalSpent: 1240, paymentStatus: "pending", fulfilmentStatus: "on-hold", lastOrderAt: "2026-07-11", attention: true },
  { id: "maya-chen", name: "Maya Chen", username: "@mchen", initials: "MC", country: "Netherlands", countryCode: "NL", memberSince: "Jun 2026", orderCount: 3, productCount: 6, totalSpent: 980, paymentStatus: "confirmed", fulfilmentStatus: "ready", lastOrderAt: "2026-07-10", attention: false },
  { id: "noshoes", name: "NoShoesNoService", username: "@noshoes", initials: "NS", country: "France", countryCode: "FR", memberSince: "Feb 2025", orderCount: 2, productCount: 4, totalSpent: 720, paymentStatus: "confirmed", fulfilmentStatus: "dispatched", lastOrderAt: "2026-07-09", attention: false },
  { id: "urban-blend", name: "Urban Blend", username: "@urbanblend", initials: "UB", country: "United States", countryCode: "US", memberSince: "Nov 2024", orderCount: 6, productCount: 14, totalSpent: 2340, paymentStatus: "overdue", fulfilmentStatus: "blocked", lastOrderAt: "2026-07-08", attention: true },
  { id: "lena-k", name: "Lena K.", username: "@lenak", initials: "LK", country: "Ireland", countryCode: "IE", memberSince: "Apr 2026", orderCount: 3, productCount: 7, totalSpent: 1105, paymentStatus: "confirmed", fulfilmentStatus: "packing", lastOrderAt: "2026-07-07", attention: false },
];
~~~

Append 36 deterministic generated records with stable IDs and countries from United Kingdom, Germany, Netherlands, France, Ireland, Spain, United States, and Sweden. Use order counts from 1–4 and statuses from the typed unions. Generate ORDERS from MEMBERS so every order references a real member and each member’s order count matches its generated orders. Add featured products for James Reed and at least one activity event for every member, using a generic “Joined the group buy” event for generated records. Export MEMBERS, ORDERS, and ACTIVITY_EVENTS.

- [ ] Step 4: Implement pure selectors in members-crm-model.ts

Export these exact types and functions:

~~~
export type DirectorySortKey = "name" | "orders" | "totalSpent" | "lastOrderAt";
export type DirectoryFilters = {
  query: string;
  country: string;
  payment: "all" | PaymentStatus;
  fulfilment: "all" | FulfilmentStatus;
  sortKey: DirectorySortKey;
  direction: "asc" | "desc";
};

export type MemberSummary = {
  memberCount: number;
  orderCount: number;
  totalSpent: number;
  attentionCount: number;
  confirmedMemberCount: number;
  countryCount: number;
};

export function summarizeMembers(members: MemberRecord[], orders: OrderRecord[]): MemberSummary;
export function filterMembers(members: MemberRecord[], filters: DirectoryFilters): MemberRecord[];
export function sortMembers(members: MemberRecord[], key: DirectorySortKey, direction: "asc" | "desc"): MemberRecord[];
export function getMemberOrders(orders: OrderRecord[], memberId: string): OrderRecord[];
export function getMemberActivity(memberId: string): ActivityEvent[];
~~~

filterMembers must normalize the query with trim().toLowerCase() and match name, username, or country. sortMembers must return a new array, preserve the input array, put null dates after dated members, and reverse only after comparison. summarizeMembers must derive every value from its arguments; no display total is hard-coded in the selector module.

- [ ] Step 5: Run the focused test and commit the contract/data layer

Run:

~~~
cd artifacts/mockup-sandbox
node --experimental-strip-types --test src/components/mockups/members-crm/members-crm.test.ts
~~~

Expected result: the three data/selector tests pass; the four focused source-contract tests fail because their React/CSS siblings do not exist.

~~~
git add artifacts/mockup-sandbox/src/components/mockups/members-crm/data.ts artifacts/mockup-sandbox/src/components/mockups/members-crm/members-crm-model.ts artifacts/mockup-sandbox/src/components/mockups/members-crm/members-crm.test.ts
git commit -m "test: define members CRM mockup data contract"
~~~

## Task 2: Build the shell and visual foundation

**Files**

- Create: artifacts/mockup-sandbox/src/components/mockups/members-crm/MembersCrmShell.tsx
- Create: artifacts/mockup-sandbox/src/components/mockups/members-crm/_group.css

- [ ] Step 1: Implement MembersCrmShell with stable accessibility hooks

Export MembersCrmShell({ children, notice, onMessage, onCreateOrder, onOpenSearch }) with the props below:

~~~
type Props = {
  children: React.ReactNode;
  notice?: string | null;
  onMessage: () => void;
  onCreateOrder: () => void;
  onOpenSearch: () => void;
};
~~~

Render a root div with class members-crm and data-page="members", an aside labelled GB Organiser navigation, a main labelled by members-crm-title, grouped V2 navigation labels Workspace, Orders, Fulfilment, Insights, and Support, the active group-buy label Winter Peptide Run 2025, and a top-bar search trigger labelled Search this group buy. Use Lucide icons already available in the sandbox and buttons with explicit accessible names. The Members item must have aria-current="page".

- [ ] Step 2: Add scoped Peps tokens and desktop shell CSS

Define members-crm variables for #1B3A7A, #2D6BCC, #1B3164, #0F1F38, #374151, #6B7280, #8A9AAA, #F8FAFC, #D0DAE4, #22C55E, #E9A020, and #EF4444. Build a 232px sidebar plus flexible workspace, a 58px top bar, a page canvas, rounded white cards, restrained borders, tabular numbers, and navy/blue primary actions. Keep the visible data-page="members" root selector scoped so no global organiser styles change.

- [ ] Step 3: Add focus, reduced-motion, and responsive shell rules

Add:

~~~
.members-crm :where(button, input, select):focus-visible {
  outline: 3px solid color-mix(in srgb, var(--members-blue) 45%, white);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .members-crm *,
  .members-crm *::before,
  .members-crm *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
~~~

At 1199px the sidebar collapses to a labelled icon rail; at 767px the shell becomes one column with a mobile menu trigger and the page canvas loses horizontal overflow. Keep all mobile controls at least 44px high.

- [ ] Step 4: Run typecheck and commit the shell

Run pnpm --filter @workspace/mockup-sandbox typecheck. Expected result: the shell/style source-contract test passes and the new shell has no TypeScript errors; directory, profile, timeline, and entry tests remain red.

~~~
git add artifacts/mockup-sandbox/src/components/mockups/members-crm/MembersCrmShell.tsx artifacts/mockup-sandbox/src/components/mockups/members-crm/_group.css
git commit -m "feat: add members CRM shell foundation"
~~~

## Task 3: Implement summary and directory controls

**Files**

- Create: artifacts/mockup-sandbox/src/components/mockups/members-crm/MemberCrmSummary.tsx
- Create: artifacts/mockup-sandbox/src/components/mockups/members-crm/MemberCrmDirectory.tsx
- Modify: artifacts/mockup-sandbox/src/components/mockups/members-crm/_group.css

- [ ] Step 1: Implement MemberCrmSummary

Export MemberCrmSummary({ summary }: { summary: MemberSummary }). Render five labelled metric surfaces: Members, Orders, Collected, Payment confirmed, and Needs attention. Use one formatMoney(value: number): string helper returning a pound-prefixed en-GB locale value and expose readable aria-label text for every metric.

- [ ] Step 2: Implement controlled directory props

Export:

~~~
type MemberCrmDirectoryProps = {
  members: MemberRecord[];
  countries: string[];
  selectedId: string | null;
  filters: DirectoryFilters;
  state: "ready" | "loading" | "error" | "empty";
  errorMessage?: string;
  onFiltersChange: (next: DirectoryFilters) => void;
  onSelect: (memberId: string) => void;
  onRetry: () => void;
  onReset: () => void;
};
~~~

Render an associated label and input aria-label="Search members", country/payment/fulfilment selects, a reset action when filters are non-default, and a semantic table on desktop. Sortable headers use buttons with aria-sort="ascending", "descending", or "none". Each row is keyboard reachable with aria-selected, tabIndex={0}, and an onKeyDown handler for Enter/Space. Include name, username, country, orders, total spent, payment badge, fulfilment badge, and last order.

- [ ] Step 3: Implement all directory states

Render a three-line skeleton list for loading, an inline error panel with errorMessage and Retry for error, a no-members panel for empty, and a no-results panel with Clear filters for a ready list with zero rows. Do not use colour as the sole state indicator; every badge includes text.

- [ ] Step 4: Add directory and responsive CSS

Style the directory as a card with heading/result count, filter toolbar, fixed header, scrollable rows, selected-row background and left accent, status badges, and a max-width 767px list-card treatment that avoids a wide table. Add min-height 44px to mobile filters and row hit areas.

- [ ] Step 5: Run pure tests and typecheck, then commit

Run:

~~~
cd artifacts/mockup-sandbox
node --experimental-strip-types --test src/components/mockups/members-crm/members-crm.test.ts
pnpm --filter @workspace/mockup-sandbox typecheck
~~~

Expected: selector, shell/style, and directory tests pass; profile, timeline, and entry tests remain red.

~~~
git add artifacts/mockup-sandbox/src/components/mockups/members-crm/MemberCrmSummary.tsx artifacts/mockup-sandbox/src/components/mockups/members-crm/MemberCrmDirectory.tsx artifacts/mockup-sandbox/src/components/mockups/members-crm/_group.css
git commit -m "feat: add members CRM summary and directory"
~~~

## Task 4: Implement profile, orders, activity, and mobile detail

**Files**

- Create: artifacts/mockup-sandbox/src/components/mockups/members-crm/MemberActivityTimeline.tsx
- Create: artifacts/mockup-sandbox/src/components/mockups/members-crm/MemberCrmProfile.tsx
- Modify: artifacts/mockup-sandbox/src/components/mockups/members-crm/_group.css

- [ ] Step 1: Implement the activity timeline

Export MemberActivityTimeline({ events }: { events: ActivityEvent[] }). Render a heading containing Activity, a chronological ol, readable timestamps, event titles/details, and tone text. Use time dateTime={event.occurredAt}; keep the decorative timeline line aria-hidden.

- [ ] Step 2: Implement the profile body

Export:

~~~
type MemberCrmProfileProps = {
  member: MemberRecord | null;
  orders: OrderRecord[];
  activities: ActivityEvent[];
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  onMessage: () => void;
  onViewOrders: () => void;
};
~~~

Render a desktop aside with avatar, name, username, country, member-since context, standing badge, Message and overflow controls, total spend, orders, products, open items, current-order cards, member details, and MemberActivityTimeline. Keep the member identity in the heading hierarchy and show a safe Choose a member panel when member is null.

- [ ] Step 3: Add the mobile detail sheet

Use the existing @/components/ui/sheet primitives. Render the profile body inside a Sheet with side="right", className="members-crm-mobile-sheet", SheetTitle from the selected member, and SheetDescription “Orders, payment, fulfilment, and recent activity”. Keep a visible close control and focus return through the Radix primitive.

- [ ] Step 4: Style profile and timeline states

Add desktop profile columns, order cards, activity rail, standing/status badge variants, selected transitions, sheet width, mobile padding, and reduced-motion-safe transitions. The profile must be readable at 1024px without clipping and use a full-screen sheet at 767px and below.

- [ ] Step 5: Run focused tests and typecheck, then commit

Run:

~~~
cd artifacts/mockup-sandbox
node --experimental-strip-types --test src/components/mockups/members-crm/members-crm.test.ts
pnpm --filter @workspace/mockup-sandbox typecheck
~~~

Expected: selector, shell/style, directory, profile, and timeline tests pass; only the entry-point test remains red.

~~~
git add artifacts/mockup-sandbox/src/components/mockups/members-crm/MemberActivityTimeline.tsx artifacts/mockup-sandbox/src/components/mockups/members-crm/MemberCrmProfile.tsx artifacts/mockup-sandbox/src/components/mockups/members-crm/_group.css
git commit -m "feat: add members CRM profile and activity timeline"
~~~

## Task 5: Wire the coordinator and auto-discovered preview

**Files**

- Create: artifacts/mockup-sandbox/src/components/mockups/members-crm/MembersCrmMockup.tsx
- Modify: artifacts/mockup-sandbox/src/components/mockups/members-crm/_group.css
- Modify: artifacts/mockup-sandbox/src/components/mockups/members-crm/members-crm.test.ts

- [ ] Step 1: Add coordinator state

Export the default MembersCrmMockup component. Own these state values:

~~~
const [selectedId, setSelectedId] = useState<string | null>("james-reed");
const [filters, setFilters] = useState<DirectoryFilters>(DEFAULT_FILTERS);
const [mobileOpen, setMobileOpen] = useState(false);
const [previewState, setPreviewState] = useState<"ready" | "loading" | "error" | "empty">("ready");
const [notice, setNotice] = useState<string | null>(null);
~~~

Derive visibleMembers with filterMembers and sortMembers, summary with summarizeMembers, selectedMember by ID, selectedOrders with getMemberOrders, and selectedActivities with getMemberActivity. Use useMemo for derived values and never store a copied member object.

- [ ] Step 2: Wire selection and mobile behavior

On desktop row selection set selectedId. At widths 767px and below, open the mobile sheet after selection; directory filters and scroll state remain in the parent. Closing the sheet keeps selectedId.

- [ ] Step 3: Wire local action feedback

onMessage sets notice to “Message composer opened for [member] (mockup only).”; onViewOrders sets notice to “Opening orders for [member] (mockup only).”; clear the notice after three seconds with cleanup-safe timeout. onRetry returns previewState to ready. A select labelled Preview state makes loading, error, empty, and ready branches directly reviewable without API calls.

- [ ] Step 4: Render the approved composition

Render MembersCrmShell with the Relationship workspace heading, Members title, short description, preview-state select, MemberCrmSummary, MemberCrmDirectory, and MemberCrmProfile. The directory receives previewState and the profile receives selected member/order/activity values. No child reimplements filtering or summary calculations.

- [ ] Step 5: Complete source-contract assertions

Add assertions for data-page="members", default selected ID james-reed, Preview state, Message composer opened, Opening orders, aria-label="Preview state", useMemo, and absence of imports from artifacts/peps-anonymous.

- [ ] Step 6: Run focused test, typecheck, and build

Run:

~~~
cd artifacts/mockup-sandbox
node --experimental-strip-types --test src/components/mockups/members-crm/members-crm.test.ts
MOCKUP_PORT=4179 MOCKUP_BASE_PATH=/ pnpm --filter @workspace/mockup-sandbox build
pnpm --filter @workspace/mockup-sandbox typecheck
~~~

Expected: all focused tests pass; Vite regenerates the registry with members-crm/MembersCrmMockup.tsx; typecheck and build complete without errors. Do not hand-edit the generated registry.

- [ ] Step 7: Commit the coordinator

~~~
git add artifacts/mockup-sandbox/src/components/mockups/members-crm/MembersCrmMockup.tsx artifacts/mockup-sandbox/src/components/mockups/members-crm/members-crm.test.ts artifacts/mockup-sandbox/src/components/mockups/members-crm/_group.css
git commit -m "feat: wire members CRM mockup preview"
~~~

## Task 6: Verify rendered preview, responsive behavior, and scope

**Files**

- Modify only if verification identifies a defect: artifacts/mockup-sandbox/src/components/mockups/members-crm/*

- [ ] Step 1: Confirm auto-discovery

Run:

~~~
rg -n "members-crm/MembersCrmMockup" artifacts/mockup-sandbox/src/.generated/mockup-components.ts
~~~

Expected: exactly one dynamic-import entry exists. If absent, rerun the sandbox build; never edit the generated file manually.

- [ ] Step 2: Start the sandbox and open the direct preview

Run:

~~~
cd artifacts/mockup-sandbox
MOCKUP_PORT=4179 MOCKUP_BASE_PATH=/ pnpm dev --host 0.0.0.0
~~~

Open /preview/members-crm/MembersCrmMockup and verify the default James Reed selection, existing V2 shell, five summary surfaces, directory filters, profile content, and activity timeline.

- [ ] Step 3: Exercise required interactions

Verify that searching reeper90 leaves only Reeper90, payment and fulfilment filters update rows, sortable headers toggle aria-sort, selecting Maya Chen updates profile/orders/activity, Enter and Space activate a focused row, message and View orders show notices, each preview state renders, Retry returns to ready, and mobile selection opens a full-screen detail sheet while preserving directory state.

- [ ] Step 4: Inspect responsive and accessibility behavior

Check 1440px, 1199px, 1024px, 768px, and 375px widths. Confirm no page-level horizontal overflow, a usable icon rail at 1199px, a two-column profile at 1024px, a full-screen sheet at 767px, 44px touch targets, visible focus, readable status text, and reduced-motion behavior.

- [ ] Step 5: Run final verification and production-scope check

~~~
cd artifacts/mockup-sandbox
node --experimental-strip-types --test src/components/mockups/members-crm/members-crm.test.ts
pnpm --filter @workspace/mockup-sandbox typecheck
MOCKUP_PORT=4179 MOCKUP_BASE_PATH=/ pnpm --filter @workspace/mockup-sandbox build
git diff --name-only -- artifacts/peps-anonymous/src/pages/organiser-v2 artifacts/peps-anonymous/src/components/organiser-v2 artifacts/api-server/src
~~~

Expected: focused tests, typecheck, and build pass; the final scope check prints no production organiser or API paths attributable to this work.

- [ ] Step 6: Commit only scoped final polish

~~~
git add artifacts/mockup-sandbox/src/components/mockups/members-crm
git commit -m "test: verify members CRM mockup"
~~~

## Plan Self-Review

- **Spec coverage:** the selected CRM visual structure, shared local data, directory search/filter/sort, persistent profile, activity timeline, desktop/tablet/mobile behavior, loading/error/empty states, local action feedback, accessibility, Peps tokens, sandbox-only scope, source tests, typecheck, build, and route verification map to Tasks 1–6.
- **Placeholder scan:** no unresolved implementation labels or unspecified error-handling steps remain; every task names exact files, interfaces, commands, and expected outcomes.
- **Type consistency:** MemberRecord, OrderRecord, ActivityEvent, DirectoryFilters, MemberSummary, and each component prop are defined once and reused through the coordinator; child components receive IDs/records and callbacks rather than duplicating selector logic.
- **Scope check:** the plan contains one isolated mockup subsystem. The generated registry is plugin-owned, and no production organiser/API/database file is touched.
