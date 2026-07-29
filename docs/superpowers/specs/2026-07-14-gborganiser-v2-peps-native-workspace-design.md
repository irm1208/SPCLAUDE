# GB Organiser V2 Peps Native Workspace Design

## Purpose

Replace the current screenshot-remapped visual system on `/gborganiser-v2` with the approved **Peps Native Workspace** direction. The redesign must feel like a natural operational extension of the Peps Anonymous website while retaining the complete group-buy workflow, all stored data, and every current interaction.

## Approved Direction

The selected direction is Design 2 from the five-system comparison and the subsequent four-tab validation covering Orders, Dispatch, Vendor COAs, and GB Settings.

The approved system uses:

- a deep Peps navy grouped sidebar;
- a compact white utility top bar;
- a pale blue-grey workspace canvas;
- white cards with restrained blue-grey borders and minimal shadow;
- Peps navy primary actions and brand blue interactive states;
- amber for warnings and Peps highlights;
- semantic green and red for success and error states;
- compact, highly legible tables and workflow panels;
- consistent 14–16px card radii and 8–12px internal spacing;
- the existing Peps Anonymous identity and group-buy terminology.

The original `/gborganiser` and unrelated routes remain unchanged.

## Product Scope

The visual system applies to both modes of V2:

1. The seven-step group-buy setup flow.
2. The live workspace with 18 destinations.

Workspace destinations:

- Overview
- Todo List
- Orders
- Broadcast
- Parcels
- Dispatch
- QR Codes
- Package Forwarders
- International Forwarding
- Shipping Rates
- Profit & Loss
- Vendor COAs
- Lab Testing Pool
- Summary
- Tickets
- GB Settings
- Products
- Rules

## Shared Shell

### Desktop

- Sidebar width: approximately 236px expanded and 76px collapsed.
- Sidebar background: Peps deep navy to navy gradient.
- Sidebar groups remain collapsible and preserve badge counts.
- Active destinations render as a white inset row with navy text and a soft shadow.
- Inactive rows use translucent white icons and accessible white text.
- The top bar is approximately 64px high, white, and separated with a subtle blue-grey border.
- Breadcrumbs identify Peps Anonymous, group buys, the active group buy, and the current screen.
- Search remains available from the top bar and through Command/Ctrl+K.
- Secondary actions use outlined white controls; the primary action uses Peps navy.
- The main canvas uses `#F4F6F9` with compact 18–24px content insets.

### Tablet and Mobile

- The desktop sidebar becomes the existing accessible drawer.
- Primary actions remain visible while secondary actions collapse first.
- Search expands into a full-width row or overlay.
- Tables retain horizontal containment or existing responsive alternatives.
- Board lanes scroll within their own region rather than overflowing the page.
- Touch targets remain at least 40px.

## Visual Tokens

### Brand and Text

- Deep navy: `#1B3164`
- Navy: `#1B3A7A`
- Brand blue: `#2D6BCC`
- Amber: `#E9A020`
- Primary text: `#0F1F38`
- Body text: `#374151`
- Muted text: `#6B7280`
- Subtle labels: `#8A9AAA`

### Surfaces

- Workspace canvas: `#F4F6F9`
- Sidebar: navy gradient
- Cards and forms: `#FFFFFF`
- Secondary surfaces: `#F8FAFC`
- Standard border: `#D0DAE4`
- Soft border: `#DBE3EC`

### States

- Confirmed/success: `#22C55E`
- Warning: `#E9A020`
- Error/danger: `#EF4444`
- Information/processing: `#2D6BCC`

Status is always written in text and never communicated by color alone.

### Typography and Geometry

- Use the existing Inter font asset throughout V2.
- Page titles: 22–28px, 700 weight, tight tracking.
- Card titles: 13–15px, 650–700 weight.
- Body and table text: 11–14px depending on density.
- Metadata and labels: 9–11px with high enough contrast for normal use.
- Cards use 14–16px radii.
- Buttons and inputs use 9–12px radii.
- Shadows are limited to active navigation, primary floating controls, and major elevated surfaces.

## Shared Components

The existing component boundaries remain the implementation foundation:

- `OrganiserShell`: responsive application frame.
- `DashboardSidebar`: grouped workspace destinations or setup steps.
- `OrganiserTopbar`: breadcrumbs, search, share, and actions.
- `WorkspaceScreen`: page-treatment metadata.
- `PageHeader`: title, description, status, and collaborators.
- `MetricCard`: consistent operational metric.
- `ViewSwitcher`: table, board, calendar, and timeline modes.
- Existing feature components continue owning their domain data and interactions.

The redesign must not duplicate feature state inside shared visual components.

## Page Treatments

### Dashboard

- Compact page header and active status.
- White metric cards on the pale workspace canvas.
- Peps-blue charts and navy primary values.
- Operational queue and group health can be represented through existing overview data.
- The order board remains available and adopts the same surface, badge, and spacing system.

### Board

- Todo and order workflow lanes use pale blue-grey lane backgrounds.
- Cards remain white with clear member, product, date, value, and status hierarchy.
- Lane titles use written counts and semantic accents.
- Drag, filter, and view-switch interactions remain unchanged.

### Table

- Orders use a compact white register with a pale header row.
- Search, filters, saved views, bulk selection, expansion, import, export, and edit actions remain available.
- Selected rows use a subtle blue background and a visible checkbox state.
- Payment and fulfilment statuses use text pills with semantic colors.

### Composer

- Broadcast metrics and message history use the same white-card system.
- The composer is visually primary and keeps its existing send behavior.
- Delivery information uses Peps blue; warnings use amber.

### Logistics

- Parcels, Dispatch, QR Codes, forwarders, country legs, and shipping rates share compact operational surfaces.
- Dispatch keeps its Receive, Prepare, and Dispatch rail.
- Completed dispatch stages use green; the active stage uses the Peps blue-to-navy treatment.
- Ready and blocked orders remain distinguishable in text and color.

### Insight

- Profit & Loss, Vendor COAs, Lab Testing Pool, and Summary use consistent metrics, registers, progress bars, and document panels.
- Approved evidence uses green, review queues use amber, and rejected evidence uses red.
- Export and document actions remain visible in the page header or panel header.

### Support

- Tickets use a compact list/detail layout with unread and priority counts.
- Conversation content remains readable and does not inherit table density.

### Configuration

- GB Settings, Products, and Rules use white form surfaces with grouped sections.
- Labels, inputs, help text, toggles, and destructive actions follow shared tokens.
- Existing persistence and validation remain unchanged.

## Setup Flow

- The setup flow uses the same shell and tokens.
- The sidebar displays the seven numbered steps with completed, current, and future states.
- The current step uses a white active row on navy.
- Completed step numbers use semantic green.
- Forms use the approved white panel, blue-grey border, and compact input treatment.
- Save, Preview, Continue, and Launch actions retain their current behavior.
- Review & Launch clearly separates validation warnings from launch readiness.

## Data and Interaction Preservation

- Existing local-storage helpers remain the persistence boundary.
- No database, API, schema, or route changes are required.
- Search, saved views, bulk actions, dialogs, uploads, exports, drag-and-drop, QR reminders, dispatch selection, and status changes remain functional.
- The selected group-buy data remains scoped by group-buy ID.
- No placeholder backend state is introduced for styling.

## Accessibility

- Existing skip link, drawer focus management, Escape handling, and keyboard search remain intact.
- Focus-visible rings use brand blue and remain visible on white, navy, and pale-grey surfaces.
- Text and icons meet usable contrast targets.
- Icon-only controls keep accessible names.
- Status, progress, and validation always include text.
- Reduced-motion preferences disable non-essential transitions.

## Performance

- Use CSS and existing components rather than adding UI or chart dependencies.
- Keep static navigation and theme data outside render paths.
- Do not introduce expensive effects, persistent animations, or large bitmap assets.
- Inactive workspace tabs continue avoiding new work beyond current behavior.

## Verification

### Automated

- Add a focused theme contract test for Peps Native tokens and shell dimensions.
- Run overview, workspace-treatment, and dispatch model tests.
- Run the project typecheck and distinguish pre-existing failures from new regressions.
- Run the production build.

### Visual and Interaction

- Verify Overview, Orders, Dispatch, Vendor COAs, and GB Settings at desktop width.
- Visit every remaining workspace destination for token and overflow regressions.
- Visit all seven setup steps.
- Check sidebar collapse, mobile drawer, search, filters, tables, dialogs, and primary actions.
- Confirm `/gborganiser` remains visually unchanged.

## Acceptance Criteria

- `/gborganiser-v2` visibly matches the approved Peps Native Workspace system.
- All 18 workspace destinations and seven setup steps share the same visual language.
- Existing group-buy data, persistence, and actions continue working.
- Desktop and mobile navigation remain usable and accessible.
- Focused tests and the production build pass, with any unrelated repository failures reported separately.
