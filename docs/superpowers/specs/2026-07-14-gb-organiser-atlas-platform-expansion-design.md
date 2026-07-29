# GB Organiser V2 Atlas Platform Expansion

## Purpose

Turn GB Organiser V2 into a complete group-buy operations platform while applying the approved Atlas visual direction. The programme adds cross-tab operational intelligence, safe automation, mobile fulfilment, and production hardening without replacing existing group-buy workflows or turning the organiser into a copy of the main dashboard.

This document is the programme-level design. Delivery is divided into four bounded phases. Phase 1 receives the first implementation plan after this specification is approved. Later phases receive their own detailed plans before implementation begins.

## Approved Product Direction

The approved interface is Atlas 2.3:

- one dedicated GB Organiser sidebar;
- dashboard-inspired navigation rhythm, typography, spacing, and active states;
- no main-dashboard icon rail inside the organiser;
- only group-buy destinations in the organiser navigation;
- one explicit “Back to main dashboard” exit;
- Peps Anonymous Inter typography and navy/blue brand palette;
- professional tables, saved views, quick-view drawers, bulk actions, and restrained motion;
- existing group-buy content, data, and behaviour retained.

## Current State

GB Organiser V2 currently provides:

- overview, todo, orders, broadcast, parcels, dispatch, QR codes, package forwarders, international forwarding, shipping rates, profit and loss, vendor COAs, lab testing pool, supplier summary, tickets, GB settings, products, and rules;
- a seven-step setup flow;
- GB-scoped local-storage helpers with legacy fallbacks;
- command search and cross-tab linking;
- navigation badges and a recent-activity summary;
- saved views, bulk order actions, CSV import/export, message templates, dispatch logs, and limited undo behaviour;
- sample data suitable for UI iteration.

The wider application already has database tables and server capabilities for group buys, orders, tickets, audit logs, activity events, payment verification, tracking refresh, schedules, parcels, testing pools, and organiser authorization. V2 does not consistently consume those capabilities because most V2 screens still read and write local storage directly.

## Goals

- Make the organiser surface the next important action across all existing tabs.
- Give organisers one contextual view of a member, order, payment, support, and fulfilment history.
- Allow repetitive work to be automated safely and visibly.
- Support phone-based receiving, packing, and dispatch with offline tolerance.
- Reuse existing server capabilities before adding external services.
- Preserve a complete manual workflow when an integration is unavailable.
- Make every automated or offline mutation auditable and idempotent.
- Apply Atlas consistently across every workspace tab and setup step.
- Preserve `/gborganiser` and unrelated application pages.

## Non-Goals

- Replacing the main Peps Anonymous dashboard navigation.
- Rewriting every backend group-buy route before V2 can improve.
- Requiring a payment, courier, automation, analytics, or error-monitoring provider for core organiser use.
- Exposing arbitrary executable code in automation rules.
- Building route optimization, warehouse inventory accounting, or a general CRM.
- Removing existing manual payment, tracking, message, export, or dispatch controls.
- Migrating all historical application data in one release.

## Delivery Strategy

The programme is delivered in dependency order.

### Phase 1: Atlas Foundation and Operational Intelligence

Phase 1 establishes shared data contracts and delivers immediate daily value:

- Atlas design tokens and shared organiser primitives;
- organiser repository layer with API-first reads and mutation boundaries;
- local-storage compatibility and migration support;
- operation issue detection and an Overview attention centre;
- a Members directory using the approved Atlas navigation;
- member and order quick-view drawers;
- unified activity and audit timeline;
- safe undo for reversible mutations;
- TanStack-powered orders and member-facing tables;
- workflow guards for order and dispatch state transitions;
- Recharts v3 analytics surfaces.

Phase 1 is delivered through three reviewable work packages:

1. **1A — Domain foundation:** repository contracts, compatibility adapter, normalized models, events, and audit writes.
2. **1B — Atlas workspace:** organiser-only navigation, shared visual components, Members directory, tables, and chart migration.
3. **1C — Operational intelligence:** issue detection, Member 360, timeline, undo, and workflow guards.

The Phase 1 implementation plan must preserve these checkpoints so the data migration, full-workspace styling, and intelligence layer are verified independently.

### Phase 2: Automation and Integrations

Phase 2 builds on the event and audit foundation:

- automation templates and visual rule builder;
- event, schedule, and condition triggers;
- typed actions for payment, order, todo, broadcast, ticket, parcel, and dispatch workflows;
- dry-run previews and activation validation;
- idempotent execution with complete run history;
- provider adapters for existing payment verification, tracking refresh, notifications, and future integrations;
- manual review gates for sensitive or destructive actions.

### Phase 3: Mobile Fulfilment

Phase 3 adds a focused mobile operational mode:

- installable PWA shell;
- camera-based QR and barcode scanning;
- receive, verify, pack, and dispatch sessions;
- quantity and product mismatch warnings;
- parcel evidence photos;
- offline work queue backed by IndexedDB;
- idempotent foreground synchronization;
- batch packing slips, labels, and dispatch confirmations.

### Phase 4: Reliability and Product Polish

Phase 4 hardens the full programme:

- consistent loading, empty, error, conflict, and offline states;
- motion, drawer, resize, notification, and accessibility polish;
- error monitoring and privacy-conscious product analytics adapters;
- performance budgets, virtualization, and lazy loading;
- end-to-end regression coverage across desktop and mobile;
- controlled removal of compatibility paths only after migration evidence supports it.

## Programme Architecture

### Organiser Domain Boundary

Feature tabs must stop owning persistence details. They consume a shared domain boundary with small repositories:

- `groupBuyRepository` — active group-buy details, settings, access, rules, and lifecycle;
- `orderRepository` — order records, products, payment state, address, shipping, and bulk updates;
- `memberRepository` — GB membership and cross-entity member summaries;
- `fulfilmentRepository` — parcels, QR codes, dispatch sessions, forwarders, and country legs;
- `qualityRepository` — vendor COAs, test pools, contributions, and results;
- `communicationRepository` — broadcasts, tickets, templates, and delivery history;
- `operationsRepository` — issues, activity, audit events, undo tokens, and automation runs.

Repositories expose typed read models and mutations. Tabs do not call local storage, fetch, or database code directly.

### Persistence Modes

The organiser supports two explicit modes during migration:

1. **API-backed mode** uses authenticated organiser routes and the existing database.
2. **Prototype mode** uses the existing GB-scoped local-storage keys through the same repository contracts.

API-backed mode is preferred when a route exists. Prototype mode is not a silent fallback after a server mutation fails; doing so could produce split-brain data. The fallback is selected at repository construction time from environment and capability checks.

### Compatibility Adapter

Existing keys such as `v2:{gbId}:orders`, todos, tickets, products, settings, and quality records remain readable. A compatibility adapter:

- parses legacy values into current domain contracts;
- supplies stable identifiers when legacy records lack them;
- records a schema version with newly written prototype data;
- never destroys legacy keys automatically;
- reports invalid records without blocking unrelated data;
- allows Phase 1 tests to compare legacy and normalized read models.

### Domain Events

All meaningful mutations emit an `OrganiserEvent` after the authoritative write succeeds.

An event includes:

- stable event ID;
- group-buy ID;
- event type and schema version;
- entity type and entity ID;
- actor type and actor ID;
- timestamp;
- correlation and causation IDs;
- idempotency key when applicable;
- safe summary payload without secrets or full evidence files.

Examples include `order.payment_confirmed`, `parcel.received`, `dispatch.completed`, `coa.review_failed`, `ticket.reply_received`, and `todo.overdue`.

Events feed activity, issue detection, audit presentation, automation evaluation, and notifications. Feature tabs do not call those consumers separately.

### Mutation Flow

The normal flow is:

1. UI submits a typed command.
2. Repository validates authority and workflow state.
3. Authoritative persistence succeeds.
4. Audit record and domain event are written.
5. Read models are invalidated or updated optimistically.
6. Issue and automation consumers process the event idempotently.
7. UI reports success, undo availability, or a specific recoverable error.

## Phase 1 Detailed Design

### Atlas Visual Foundation

The organiser receives scoped tokens instead of additional page-level styling systems.

#### Typography

- Font family: Inter.
- Section labels: 10px, 700, uppercase only where labels benefit from scanning.
- Metadata: 11px, 400–600.
- Body and navigation: 13–14px, 500–600.
- Card titles: 14–16px, 700.
- Page titles: 24–28px, 700.
- Metrics: 28–36px, 700–800.

#### Colour

- Primary heading: `#0F1F38`.
- Body: `#374151`.
- Muted: `#6B7280`.
- Subtle labels: `#8A9AAA`.
- Page: `#F8FAFC`.
- Card: `#FFFFFF`.
- Navy: `#1B3A7A`.
- Brand blue: `#2D6BCC`.
- Deep navy: `#1B3164`.
- Amber: `#E9A020`.
- Success and error use the existing Peps semantic colours.

#### Organiser Navigation

- One 240–260px organiser sidebar on desktop.
- GB Organiser identity at the top and active group buy beneath it.
- Organiser-only grouped destinations.
- Pale blue active row with blue text and a left indicator.
- Collapsed mode retains organiser icons but does not become the main dashboard rail.
- A single separated “Back to main dashboard” action appears at the bottom.
- Mobile uses a focus-managed drawer and the same information hierarchy.

### Shared Atlas Components

Phase 1 establishes reusable components with presentation-only contracts:

- `AtlasPageHeader`;
- `AtlasMetricSurface` with primary, standard, and dark variants;
- `AtlasDataTable`;
- `AtlasSavedViews`;
- `AtlasFilterBar`;
- `AtlasBulkActionBar`;
- `AtlasQuickViewDrawer`;
- `AtlasStatusBadge`;
- `AtlasTimeline`;
- `AtlasIssueCard`;
- `AtlasEmptyState` and `AtlasErrorState`;
- `AtlasSkeleton` variants matching final geometry.

These components accept domain-ready values and emit actions upward. They do not load data.

### Operations Attention Centre

The Overview attention centre replaces isolated alert cards with a normalized issue list.

An `OperationIssue` includes:

- issue ID and group-buy ID;
- type, severity, and status;
- title and concise explanation;
- affected entity references;
- detected and due timestamps;
- available actions;
- assignee when available;
- detection rule version;
- resolution event reference.

Initial issue detectors cover:

- pending payment beyond the configured reminder threshold;
- payment proof awaiting review;
- paid order missing required address or shipping selection;
- received parcel with a quantity discrepancy;
- order blocked by missing or failed quality documentation;
- dispatch-ready order missing a packing slip, QR code, or label;
- forwarding leg overdue or missing evidence;
- ticket awaiting organiser response;
- overdue organiser todo;
- automation or offline synchronization failure.

Detectors are pure functions over normalized snapshots in Phase 1. Persisted issue state records acknowledgement, assignment, snooze, and resolution without duplicating entity truth.

### Members Directory

Phase 1 adds **Members** under the Workspace navigation group, matching the approved Atlas 2.3 sidebar. The directory is a group-buy-specific operational view rather than a general CRM.

It supports:

- member, username, participation, payment, order, country, and fulfilment summaries;
- sorting, filtering, saved views, and export through the shared table;
- attention indicators derived from open operation issues;
- selection for permitted bulk messages or todo creation;
- row activation into Member 360.

The directory derives its rows from group-buy membership and related entities. It does not create a second member record.

### Member 360 Quick View

Clicking a member reference in orders, tickets, testing, or dispatch opens one shared drawer. It shows:

- member identity and membership status;
- order totals and status history;
- payments and unmatched proof warnings;
- shipping address and selected delivery method;
- parcel, dispatch, tracking, and forwarding history;
- open tickets and recent messages;
- testing-pool contributions;
- related todos, issues, notes, and audit events.

The drawer is a read model composed by `memberRepository`. Editing opens the relevant existing workflow instead of embedding every edit form in the drawer.

### Audit Timeline and Undo

Existing server audit tables and activity helpers are reused. Prototype mode stores a capped GB-scoped event list.

Each mutation declares its undo policy:

- **reversible** — a compensating command can safely restore the prior state;
- **review required** — undo opens a confirmation with downstream impact;
- **irreversible** — the UI explains why undo is unavailable.

Undo tokens contain the command type, target, expected current version, expiry, and safe prior values. Undo fails with a conflict message if the entity has changed since the original mutation.

### Professional Tables

Orders, summary, finance, contributions, and other dense datasets use `@tanstack/react-table`. `@tanstack/react-virtual` is enabled when visible row counts justify it.

The shared table supports:

- typed columns;
- sorting and multi-filtering;
- saved views;
- column visibility, order, and optional pinning;
- row selection and bulk actions;
- keyboard navigation;
- stable empty, loading, and error geometry;
- quick-view row activation;
- responsive card fallback where horizontal table use would fail.

Saved views remain GB- and user-scoped. Existing local saved views are normalized through the compatibility adapter.

### Workflow State Machines

`xstate` and `@xstate/react` model workflows that have costly invalid transitions.

The first machines are:

- order payment and fulfilment lifecycle;
- dispatch session lifecycle;
- mobile scan session lifecycle, introduced in Phase 3.

Machines guard transitions and expose available actions. The database remains authoritative. State-machine snapshots are not a second record of truth.

### Analytics

Recharts is upgraded from the inactive v2 branch to v3. Charts use shared wrappers for:

- accessible titles and textual summaries;
- consistent tooltip and axis styling;
- empty-data fallbacks;
- reduced-motion behaviour;
- responsive sizing without layout shifts.

## Phase 2 Detailed Design

### Automation Model

An automation contains:

- ID, group-buy ID, name, description, enabled state, and version;
- one event or schedule trigger;
- zero or more typed conditions;
- an ordered action list;
- execution mode: dry run, approval required, or automatic;
- creator, last editor, and timestamps;
- rate and retry policy;
- provider requirements;
- last validation result.

### Supported Triggers

Initial triggers include:

- order created or updated;
- payment proof submitted or payment confirmed;
- payment overdue relative to a configured duration;
- group buy approaching close date;
- parcel received or discrepancy recorded;
- order becomes dispatch-ready;
- tracking number assigned or carrier status changed;
- COA added, approved, rejected, or missing;
- testing result published;
- ticket received or response overdue;
- fixed date/time or recurring schedule.

### Supported Actions

Initial actions include:

- update an allowed order status;
- create or assign a todo;
- add an internal note or flag;
- send or schedule a template-backed message;
- open or resolve an operation issue;
- request organiser approval;
- add an order to the dispatch queue;
- notify the organiser;
- invoke a configured provider adapter;
- write an export-ready event for downstream systems.

Sensitive actions, including cancellation, refunds, destructive deletion, or broad member messaging, default to approval required.

### Builder and Templates

`@xyflow/react` provides the visual canvas. The primary editing path remains a structured form synchronized with the graph so keyboard and small-screen use do not depend on a canvas.

Templates include:

- payment reminder;
- payment-confirmed acknowledgement;
- close-date reminder;
- parcel received and packing queue creation;
- dispatch notification;
- failed COA product block;
- ticket-response escalation;
- daily organiser digest.

### Execution Safety

- Activation runs schema validation and a sample-event dry run.
- Every run has a unique idempotency key.
- Repeated delivery of the same event cannot repeat an action.
- Retries use bounded exponential backoff.
- Rules have per-GB execution and message-rate limits.
- Automation cannot bypass repository authorization or state-machine guards.
- Every attempted action records success, skip, failure, or approval-required state.
- Disabling an automation prevents new runs but retains history.

### Provider Adapters

Provider contracts isolate payment, tracking, messaging, files, analytics, and monitoring. Existing payment verification, tracking refresh, Telegram, file storage, and scheduler code is wrapped before new providers are considered.

Every adapter exposes capability and health information. When a provider is not configured:

- the feature explains what is unavailable;
- manual actions remain enabled;
- queued work does not retry indefinitely;
- no placeholder success is shown.

## Phase 3 Detailed Design

### Mobile Modes

The mobile fulfilment entry offers four focused modes:

1. **Receive** — scan parcel, record arrival, inspect expected contents, add evidence.
2. **Verify** — scan products or parcel labels and reconcile quantities.
3. **Pack** — select a dispatch-ready order, verify required products, and confirm packaging.
4. **Dispatch** — scan the packed order and label, confirm tracking, and record handoff.

The normal desktop workspace remains available on mobile. Scan mode is an additional task-focused flow.

### Scanning

`@zxing/browser` reads supported QR and barcode formats. Manual code entry is always available.

Scan results are accepted only when:

- the payload format is recognized;
- the group-buy scope matches;
- the referenced entity exists;
- the current workflow allows the requested action;
- a duplicate scan is either harmless or explicitly confirmed.

The scanner pauses after a successful read to avoid repeat submissions and provides sound, haptic, colour, icon, and text feedback where supported.

### Offline Storage

`dexie` stores:

- cached, minimal fulfilment read models;
- scan sessions;
- pending evidence metadata;
- an ordered mutation queue;
- synchronization checkpoints.

Sensitive payment proof and full addresses are not cached unless required for the selected offline task. Cached data has a retention policy and a clear-device-data control.

### Synchronization

Each queued mutation contains a client mutation ID, group-buy ID, entity version, command payload, and local timestamp.

On reconnect:

- commands replay in order through normal repository endpoints;
- idempotency keys prevent duplicates;
- version conflicts pause the affected entity without blocking unrelated work;
- the organiser chooses server state, local intent, or manual review where automatic reconciliation is unsafe;
- evidence uploads resume separately and reference the original command.

### PWA

`vite-plugin-pwa` provides installation, asset caching, update prompts, and a controlled service worker. API responses containing sensitive organiser data are not placed in the general HTTP cache. Offline data is managed explicitly through Dexie.

## Phase 4 Detailed Design

### Interaction Polish

Existing libraries are used before adding alternatives:

- Framer Motion for drawer, bulk-bar, tab, and state-change transitions;
- Sonner for status and undo notifications;
- Vaul for mobile drawers;
- `react-resizable-panels` for Tickets and Dispatch split views;
- cmdk for global search and quick actions;
- dnd-kit for todo and supported workflow boards;
- Radix primitives for accessible menus, dialogs, tabs, and tooltips.

Motion remains restrained, honours reduced-motion settings, and does not animate large tables during routine data refreshes.

### Monitoring and Analytics

`@sentry/react` is introduced behind a monitoring adapter. Product analytics also uses an adapter so the application is not coupled to one vendor.

Rules:

- no wallet addresses, full shipping addresses, payment proof, private ticket content, or evidence photos in monitoring payloads;
- identifiers are minimized or pseudonymized;
- monitoring failure never blocks organiser work;
- analytics can be disabled by environment and policy.

## Library Decisions

### Add

- `@tanstack/react-table` — shared professional data tables.
- `@tanstack/react-virtual` — large row and activity-list virtualization.
- `xstate` and `@xstate/react` — guarded operational workflows.
- `@xyflow/react` — visual automation editing only.
- `@zxing/browser` — camera-based QR and barcode scanning.
- `dexie` — explicit offline operational storage.
- `vite-plugin-pwa` — installable shell and service-worker lifecycle.
- `@sentry/react` — optional error monitoring adapter.

### Upgrade

- Recharts from v2 to v3 after a focused migration check.

### Reuse

- Framer Motion, dnd-kit, cmdk, Sonner, Vaul, Radix, Zustand, `react-resizable-panels`, React QR Code, jsPDF, and existing server scheduling and provider helpers.

### Do Not Add

- MUI, Ant Design, Chakra, Mantine, or another general component system;
- another command-palette, toast, icon, drawer, drag-and-drop, or chart library;
- Trigger.dev or another job platform until the existing scheduler is shown to be insufficient;
- Liveblocks or Yjs until simultaneous real-time editing is a confirmed product requirement.

## Navigation Changes

The approved organiser-only sidebar remains the product boundary.

Phase 1 adds **Members** under Workspace because it is part of the approved Atlas navigation. Member 360 opens from the Members directory and contextually from orders, tickets, testing, and dispatch. The Overview receives the attention centre.

Phase 2 adds **Automations** under the Group Buy or Manage section because rule ownership and run history need a stable destination.

Phase 3 adds **Scan & Pack** under Fulfilment. On supported mobile devices it may also appear as a prominent contextual action.

No phase adds the main dashboard rail inside the organiser.

## Error, Conflict, and Offline States

- Read failures render inside the affected surface with retry and unaffected navigation intact.
- Mutation failures retain form input and selection.
- Authorization failures explain the missing capability without leaking restricted data.
- Provider failures offer the relevant manual action.
- Automation validation identifies the exact node, condition, or missing provider.
- Automation run failures are retryable only when the action is safe and idempotent.
- Offline state is persistent, visible, and never represented only by colour.
- Synchronization conflicts remain visible until resolved.
- Unsupported camera access falls back to manual entry.
- Empty issue, automation, and scan queues explain what will make data appear.

## Security and Privacy

- Every API-backed repository operation validates organiser access to the group buy.
- Cross-GB identifiers are rejected even if the entity exists.
- Automation actions use the permissions of the owning organiser context and cannot escalate privileges.
- Provider credentials remain server-side.
- Scanner payloads are treated as untrusted input.
- Uploaded evidence uses existing file validation and storage boundaries.
- Audit summaries exclude secrets and sensitive evidence content.
- Offline data is minimized, versioned, clearable, and excluded from service-worker response caching.
- Monitoring and analytics use redaction before transport.

## Accessibility

- All organiser navigation, tables, drawers, automation forms, scanner fallbacks, bulk actions, and dialogs are keyboard operable.
- Tables expose semantic headers, selection state, sorting state, and accessible row actions.
- Quick-view drawers manage focus and return it to the invoking element.
- The visual automation graph has an equivalent structured editing path.
- Scanner results use sound or haptics only as optional reinforcement; text and icon feedback remain primary.
- Status and severity are always expressed in text.
- Focus-visible treatment meets contrast requirements.
- Mobile targets remain at least 40px.

## Performance

- Inactive workspace tabs do not initialize scanners, automation canvases, charts, or large datasets.
- Automation and scanner modules are lazy loaded.
- Tables virtualize only when beneficial; small lists remain semantic and simple.
- Issue detection uses normalized snapshots and memoized selectors rather than repeated local-storage reads during render.
- Charts avoid high-frequency animation on routine updates.
- Offline caches store only selected fulfilment data and enforce retention.
- The service worker does not cache authenticated API responses by default.

## Testing Strategy

### Unit Tests

- legacy-data normalization;
- issue detectors;
- member 360 read-model composition;
- order and dispatch state-machine guards;
- automation validation and condition evaluation;
- idempotency-key generation and duplicate suppression;
- offline queue ordering and conflict classification;
- scanner payload parsing.

### Component Tests

- table sorting, filtering, selection, saved views, and keyboard operation;
- attention acknowledgement, snooze, and resolution;
- member quick-view focus behaviour;
- automation structured editor and graph synchronization;
- dry-run and approval states;
- mobile scan feedback and manual fallback;
- offline and synchronization banners.

### API and Database Tests

- organiser and cross-GB authorization;
- authoritative mutation plus audit/event writes;
- automation run idempotency;
- provider failure and retry boundaries;
- offline command replay and version conflicts;
- sensitive-field redaction.

### End-to-End Tests

- resolve an Overview issue through its source workflow;
- open Member 360 from orders and navigate to a ticket;
- activate a template automation and observe one idempotent run;
- complete receive, pack, and dispatch with mocked scan input;
- create actions offline, reconnect, and synchronize;
- verify desktop, mobile, keyboard, reduced-motion, and manual-provider fallbacks.

### Existing Verification

Each phase also runs:

- organiser-focused tests;
- TypeScript checks;
- production build;
- affected API tests;
- desktop and mobile visual inspection across every changed tab.

## Rollout and Migration

Each phase uses independently removable capability flags during development and verification.

1. Introduce repository contracts and compatibility reads without changing visible behaviour.
2. Move one bounded screen at a time to normalized read models.
3. Compare legacy and API-backed outputs in development fixtures.
4. Enable attention and quick views after data contracts are stable.
5. Enable automations in dry-run mode before allowing automatic actions.
6. Enable PWA installation and offline mutation only after online scan flows pass.
7. Retain manual controls throughout rollout.
8. Remove compatibility paths only in a separately approved migration after usage evidence confirms safety.

## Phase Acceptance Criteria

### Phase 1

- Atlas organiser-only navigation and typography are consistent across all V2 tabs.
- Dense tables use the shared table contract where appropriate.
- Overview shows actionable cross-tab issues using existing GB data.
- Members lists the active group-buy membership and opens Member 360 without duplicating member records.
- Member 360 works from at least orders, tickets, and dispatch.
- Every migrated mutation produces an audit entry and event.
- Reversible actions expose conflict-safe undo.
- Existing V2 behaviour and legacy prototype data remain available.

### Phase 2

- Organisers can create, validate, dry run, activate, pause, and inspect automations.
- Templates cover the approved payment, parcel, dispatch, COA, ticket, and digest scenarios.
- Duplicate events cannot duplicate actions.
- Sensitive actions require approval by default.
- Provider outages leave manual workflows usable.

### Phase 3

- Supported phones can scan and complete receive, verify, pack, and dispatch tasks.
- Manual code entry works without camera permission.
- Offline sessions survive refresh and synchronize idempotently.
- Conflicts pause only affected work and provide a resolution path.
- Batch documents use existing group-buy and order data.

### Phase 4

- Loading, empty, error, conflict, and offline states are consistent.
- Monitoring payloads pass privacy tests.
- Performance budgets and accessibility checks pass for changed surfaces.
- Full desktop and mobile end-to-end coverage protects the expanded organiser.

## Programme Completion Criteria

The programme is complete when all four phases meet their acceptance criteria, every required external capability has a functional manual fallback, the original `/gborganiser` remains unchanged, and GB Organiser V2 presents one coherent Atlas experience across setup, daily operations, automation, and mobile fulfilment.
