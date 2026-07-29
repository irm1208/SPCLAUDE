# GB Organiser v2 Screenshot-Matched Structural Redesign

## Purpose

Redesign `/gborganiser-v2` to reproduce the supplied task-management dashboard's visual system and page composition across both the first-time setup wizard and the day-to-day workspace. The redesign keeps the existing group-buy data, workflows, persistence, and actions, but may freely restructure every screen to achieve a faithful visual match.

## Approved Direction

The approved direction is a full structural remap, not a surface-only reskin. The screenshot governs:

- application-shell proportions;
- sidebar hierarchy and density;
- utility-header composition;
- typography, weight, and scale;
- colors, borders, radii, and shadows;
- card sizing and spacing;
- page-header hierarchy;
- analytics-band composition;
- board, table, list, and form presentation;
- desktop, tablet, and mobile responsive behavior.

The screenshot's task-report content is not copied. All rendered content and metrics use group-buy concepts and existing organiser-v2 data.

## Goals

- Make the completed UI immediately recognizable as the supplied reference.
- Apply one coherent shell and component language to setup and workspace.
- Preserve all current group-buy capabilities and page destinations.
- Use actual group-buy records to populate metrics, charts, boards, tables, and status counts.
- Keep the original `/gborganiser` and unrelated application pages unchanged.
- Maintain or improve keyboard access, responsive behavior, and interaction feedback.

## Non-goals

- No API, schema, or database redesign.
- No copying the reference product's brand name, task data, or member identities.
- No replacement of group-buy workflows with generic project-management behavior.
- No redesign of `/gborganiser` or shared application primitives outside the v2 scope.
- No invented backend state solely to decorate the dashboard.

## Shared Application Shell

Both modes use one scoped `OrganiserShell` composition.

### Desktop

- Fixed, wide left sidebar matching the reference's proportions.
- White main canvas with a slim bordered utility header.
- Main content uses the reference's generous horizontal inset and controlled vertical density.
- The outer application surface, sidebar boundary, and fixed areas reproduce the screenshot's subtle neutral separation.
- The utility header contains back navigation, breadcrumbs, global search, contextual actions, and one dark primary action.

### Tablet and mobile

- The sidebar becomes an off-canvas drawer opened from the utility header.
- Breadcrumbs collapse before primary actions.
- Search opens as an overlay or expanded row rather than squeezing the toolbar.
- Analytics panels stack without changing information priority.
- Boards remain usable through contained horizontal scrolling; the whole page must not overflow.
- Tables use existing compact or responsive-card fallbacks where available.

## Sidebar

The workspace sidebar uses grouped, tree-like navigation with compact rows, count badges, and active-item treatment derived from the reference.

- Brand block: Peps Organiser identity and active group-buy name.
- Overview: dashboard and todo list.
- Orders: all orders and broadcast.
- Fulfillment: parcels, dispatch, QR codes, package forwarders, country legs, and shipping rates.
- Insights: profit and loss, vendor COAs, lab testing pool, and summary.
- Support: tickets.
- Configuration: GB settings, products, and rules.
- Bottom utilities: Help Center, Settings, and Invite Team.
- Profile block: current organiser identity and workspace context.

The setup sidebar replaces workspace navigation with the seven setup steps: Basics, Products, Shipping, Accepting Payments, Access, Rules & Info, and Review & Launch. Completed, current, and future steps remain distinct in text as well as color.

## Utility Header and Page Header

The utility header is persistent across workspace pages. It contains:

- back action;
- breadcrumb folders for group buys and the active group buy;
- global search with the existing command shortcut;
- page-specific secondary actions;
- one dark, compact primary action.

Each page begins with a content header containing:

- page title;
- concise supporting description;
- optional textual status pill;
- relevant collaborator avatars or ownership context;
- no oversized hero treatment.

Setup uses the same top bar, with Save draft, Preview, and Continue or Launch actions based on the current step.

## Visual System

The v2 theme is rebuilt as scoped design tokens rather than scattered inline approximations.

### Typography

- Use the existing Inter font asset because it closely matches the supplied reference and is already loaded by the application.
- Body text is predominantly 12–14px with clear 400, 500, and 600 weight roles.
- Page titles are compact, approximately 24–28px on desktop.
- Card titles remain approximately 13–15px.
- Large metric values use approximately 26–32px with tight line height.
- Labels, metadata, and counts use approximately 10–12px.

### Palette

- Main canvas and cards: white.
- Sidebar and muted controls: very light warm-neutral gray.
- Primary text: near-black neutral.
- Secondary text: medium neutral gray.
- Borders: pale neutral gray with low contrast.
- Primary actions: near-black.
- Charts and statuses: controlled purple, orange, green, pink, and red accents matching the reference.
- Peps identity remains in names and brand mark, while the screenshot's neutral palette controls the interface.

### Geometry

- Sidebar rows and utility controls use compact 6–9px radii.
- Primary cards use restrained 9–12px radii.
- Borders carry most separation; shadows are soft and low-opacity.
- Cards use dense internal spacing and generous separation between page regions.
- Buttons are compact and avoid pill shapes except statuses and avatar controls.

## Shared Components

The implementation introduces or consolidates the following v2-scoped primitives:

- `OrganiserShell`: desktop and mobile page frame.
- `OrganiserSidebar`: workspace or setup navigation variant.
- `OrganiserTopbar`: breadcrumbs, search, and actions.
- `OrganiserPageHeader`: title, description, status, and collaborators.
- `MetricCard`: one metric with delta or compact sparkline.
- `StatusSummaryCard`: grouped counts with segmented visualization.
- `ChartCard`: titled responsive chart panel.
- `ViewSwitcher`: spreadsheet, board, calendar, and timeline choices where supported.
- `BoardColumn` and `OperationalCard`: consistent workflow lanes and records.
- `DataPanel`: reference-style table or list frame.
- `FormPanel`: reference-style setup and settings frame.
- `StatusBadge`, `AvatarStack`, and compact action controls.

These primitives must have focused contracts and must not own domain data. Feature screens derive their own view models and pass display-ready values.

## Workspace Screen Mapping

### Overview

- Group-buy status summary using order-stage counts.
- Revenue metric.
- Member metric.
- Fulfillment trend chart.
- Lower order-stage board using live order data.
- View controls mirror the reference even when unavailable views are disabled or hidden with clear semantics.

### Orders and Todo

- Summary cards show workload and status distribution.
- Orders support spreadsheet and board views using current records.
- Todo uses board lanes appropriate to current todo statuses.
- Existing filters, selection, detail, and mutation behavior remains available.

### Broadcast

- Delivery and engagement metrics occupy the analytics band.
- Message composer and campaign history form the primary operational area.
- Existing send and history behavior remains unchanged.

### Fulfillment screens

- Parcels, Dispatch, QR Codes, Package Forwarders, Country Legs, and Shipping Rates each receive a status or analytics band derived from their current data.
- Their primary workflows render as reference-style boards, tables, or lists.
- Dispatch retains automatic readiness calculation, order selection, packing-slip actions, QR reminders, confirmation, and log access.

### Insight and support screens

- Profit & Loss uses revenue, cost, and margin cards plus trend visualization above the ledger.
- Vendor COAs and Lab Testing Pool use queue metrics and stage-oriented operational areas.
- Summary uses compact totals above its exportable table.
- Tickets uses unread and queue metrics above its support list or board.

### Configuration screens

- GB Settings, Products, and Rules use the reference's analytics/status band followed by compact structured form or table panels.
- Forms are not converted into fake draggable boards; the full remap concerns hierarchy and composition, while controls stay appropriate to the task.

## Setup Wizard Mapping

The setup wizard uses the same shell and visual tokens.

- Sidebar displays step navigation and completion state.
- Header displays group-buy breadcrumb plus draft and continuation actions.
- Page header explains the current setup step.
- A compact status band summarizes completion, validation, or relevant totals.
- The primary form sits in one or more bordered white `FormPanel` surfaces.
- Navigation actions remain available at the bottom for long forms as well as in the utility header.
- Review & Launch uses summary panels, validation status, and a compact launch confirmation.

## State and Data Flow

- Existing storage helpers and group-buy identifiers remain the persistence boundary.
- The workspace owns active-tab state and global search state.
- The shared shell receives derived navigation badges and page metadata.
- Each screen derives its analytics and board/table view model from the records it already loads.
- Shared visual primitives receive immutable display props and emit actions upward.
- Dispatch state remains stable across tab switches and continues reporting ready-order counts.
- No global mutable state is introduced for purely presentational behavior.

## Interaction Behavior

- Existing command search remains accessible from the top bar and keyboard shortcut.
- Sidebar groups can collapse without hiding the active destination.
- View switching preserves filters and selection where current screen behavior supports it.
- Existing dialogs, dropdowns, drag-and-drop, uploads, exports, and confirmations remain functional.
- Hover, active, selected, disabled, and focus-visible states follow the shared token system.
- Motion is restrained to drawer transitions, dropdowns, modal entry, card hover, and board movement; it must not distract from dense operational content.

## Empty, Loading, and Error States

- Loading uses stable card skeletons matching final geometry.
- Empty states occupy a normal `DataPanel` or board column and state the next action.
- Errors appear inside the affected surface or through the existing toast system.
- Failed mutations preserve user selections and form input.
- Optional charts degrade to textual totals when their data is empty or invalid.
- Missing optional profile imagery falls back to initials without layout shifts.

## Accessibility

- Sidebar, view controls, boards, tables, forms, and dialogs remain keyboard-operable.
- Focus-visible rings meet contrast requirements against white and muted surfaces.
- Status is always stated in text and never conveyed only by color.
- Charts have textual titles, summaries, and accessible labels.
- Icon-only actions receive accessible names and tooltips where ambiguity remains.
- Touch targets remain at least 40px on small screens even when desktop controls are visually compact.
- Mobile drawers and dialogs manage focus and close with Escape.

## Performance

- Keep static navigation and token data outside render paths.
- Avoid adding heavy charting or animation dependencies when existing libraries or CSS are sufficient.
- Memoize only expensive derived datasets, not simple values.
- Reuse shared primitives to limit duplicated JSX and style payload.
- Keep tab modules independently renderable so inactive pages do not perform new work.

## Verification and Acceptance Criteria

### Automated

- Run organiser-v2 focused tests, including dispatch model coverage.
- Run the project typecheck and inspect any existing failures separately from new regressions.
- Run the production build with required environment values.
- Add focused tests for any new pure view-model helpers or shell behavior that can regress.

### Interaction

- Visit every workspace destination and every setup step.
- Verify global search, sidebar navigation, view switching, dialogs, filters, selection, drag-and-drop, exports, and mutations that the redesign touches.
- Verify setup progress and workspace persistence survive navigation.
- Confirm `/gborganiser` is unchanged.

### Visual

- Compare `/gborganiser-v2` against the supplied screenshot at its desktop aspect ratio.
- Verify sidebar width, topbar height, main insets, card proportions, type scale, visual density, and border treatment.
- Review tablet and mobile widths for usable navigation, stacked analytics, contained board overflow, and readable forms.
- Ensure all screens look like one system; no old green-dashboard or oversized rounded-card styles remain in the v2 flow.

## Completion Standard

The redesign is complete when both setup and workspace consistently use the approved full structural remap, existing group-buy workflows still operate, automated verification introduces no new failures, and desktop/mobile visual review confirms a close match to the supplied reference.
