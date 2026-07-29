# GB Organiser V2 Members CRM Mockup Design

**Date:** 2026-07-18  
**Status:** Approved in design review  
**Target:** Isolated mockup sandbox artifact; production `/gborganiser-v2` remains unchanged

## Summary

Create a high-fidelity, interactive mockup of the GB Organiser V2 Members page using the selected **Member CRM** direction. The mockup retains the existing organiser shell and every current Members capability, but changes the page from a table with a temporary detail drawer into a persistent master-detail workspace.

Five visual directions were compared during brainstorming: Command Ledger, Member CRM, Signal Board, Journey Map, and Quiet Directory. The user selected Member CRM. The implementation phase therefore builds the selected Member CRM direction as the sandbox artifact; the other four directions remain comparison material and are not production scope.

## Goals

- Make member scanning, selection, and follow-up feel like one continuous workflow.
- Keep the selected member's identity, standing, order context, and activity visible on desktop.
- Balance operational clarity, useful member history, and a polished Peps Anonymous presentation.
- Preserve the current metrics, search, filtering, sorting, member selection, order hand-off, and messaging actions.
- Demonstrate responsive behavior and credible interactions without connecting the mockup to production APIs.

## Non-Goals

- Do not modify the production `MembersTab`, organiser shell, routes, API, database, or domain models.
- Do not add member notes, editing, bulk mutations, or new backend behavior.
- Do not rebuild the four unselected visual directions as separate sandbox artifacts.
- Do not replace the GB Organiser V2 navigation, top bar, or active group-buy context.

## Visual Direction

### Existing shell

The mockup uses the established GB Organiser V2 frame:

- Peps Anonymous / GB Organiser brand block.
- Active group-buy card for “Winter Peptide Run 2025.”
- Existing grouped sidebar with Members active.
- Existing breadcrumb, global search trigger, notifications, and organiser profile area.
- Peps Anonymous navy, blue, amber, light-surface, border, and status tokens.

The shell is contextual framing, not part of the redesign.

### Members CRM composition

The content area contains three levels of information:

1. **Summary strip** — total members, total order value, repeat participation, confirmed payments, and represented countries.
2. **Directory pane** — a compact, independently scrollable member list with search, status filter, country filter, sorting, result count, identity, country, order count, spend, and visible attention states.
3. **Member workspace** — a persistent selected-member surface containing identity, standing, total spend, order/product counts, current orders, fulfilment progress, member details, actions, and a chronological activity rail.

The selected member workspace is intentionally persistent on desktop. It replaces the current open-and-close drawer interaction while keeping the same underlying information.

## Functional Requirements

### Shared dataset

The mockup uses one local typed dataset for all visible summary values, directory rows, orders, and activity items. Summary totals must be derived from or consistent with the local records. Representative data includes healthy, pending-payment, overdue, packing, ready, and dispatched states across multiple countries.

### Directory behavior

- Search matches display name, username, and country.
- Status and country controls filter the directory.
- Sorting supports recent activity, name, order count, and total spend.
- Selecting a row visibly updates the member workspace without navigating away.
- The selected row has a clear visual and programmatic selected state.
- Filtering must recover gracefully if the selected member is not in the filtered result set; the detail workspace remains visible until another member is selected.
- A zero-result filter shows an explicit empty state with a clear reset action.

### Member workspace behavior

- Show display name, username, country, member-since context, and standing.
- Show total spend, order count, product count, and open-item count.
- Show current or recent orders with products, value, payment, and fulfilment state.
- Show chronological activity such as order creation, payment confirmation, broadcast delivery, packing, and dispatch.
- “Message member” and “View orders” are the primary actions.
- In the sandbox, actions provide local UI feedback or switch an in-page state; they do not call production endpoints.

### Summary behavior

- Summary values remain visible above the workspace on desktop.
- Summary values are informational and do not introduce a second, conflicting filter system.
- Attention counts include a text explanation and never rely on colour alone.

## Component Boundaries

The sandbox implementation should be divided into focused pieces:

- `MembersCrmMockup` — sandbox artifact entry point and interaction coordinator.
- `MembersCrmShell` — static GB Organiser V2 shell framing for this isolated artifact.
- `MemberCrmSummary` — derived summary strip.
- `MemberCrmDirectory` — search, filters, sorting, empty state, and selectable rows.
- `MemberCrmProfile` — selected-member identity, metrics, current orders, and primary actions.
- `MemberActivityTimeline` — chronological member events.
- A local typed data module for members, orders, activities, filters, and sort keys.
- One scoped stylesheet for Peps tokens, desktop layout, responsive states, focus treatment, and reduced-motion behavior.

The entry point owns selected-member and filter state. Child components receive typed values and callbacks; they do not duplicate filtering or selection logic.

## Data Flow

1. The mockup entry point loads the local member dataset.
2. Summary selectors derive counts and totals from that dataset.
3. Search, status, country, and sort state derive the visible directory list.
4. Row selection stores a member identifier, not a copied member object.
5. The profile and activity components resolve the selected identifier against the shared dataset.
6. Local action state provides mock confirmations for message and order hand-off interactions.

Production implementation, if approved later, can replace the local source with the existing `organiserApi.members(...)`, `useOrders()`, and `mergeMemberDirectory(...)` flow without changing the presentation boundaries.

## Responsive Behavior

### Desktop (1200px and wider)

- The directory and member workspace appear side by side.
- The directory has a stable compact width; the selected-member workspace receives the remaining width.
- The activity rail sits beside the profile content within the member workspace.
- The directory list and detail body may scroll independently beneath their visible headers so selection context and actions stay available.

### Tablet (768px–1199px)

- The directory remains visible beside the profile in a two-column layout.
- The activity rail moves below the profile content before text or controls become cramped.
- Summary metrics wrap without horizontal page overflow.

### Mobile (767px and narrower)

- The directory becomes the primary screen.
- Selecting a member opens a full-screen detail sheet.
- Back returns to the directory with search, filters, and scroll position preserved.
- Controls meet a 44px touch target, filters wrap or open in an accessible sheet, and no table forces viewport overflow.

## Loading, Error, and Empty States

Although the sandbox uses local data, it demonstrates the states required for a later production mapping:

- A structured loading skeleton that preserves the CRM layout.
- An inline error notice with a retry action.
- A no-members state for an empty group buy.
- A no-results state for filters or search, with reset controls.
- A safe missing-selection state that asks the organiser to choose a member.

## Accessibility

- Directory rows are keyboard reachable and expose their selected state.
- Search and filter controls have visible labels or accessible names.
- Focus rings are clearly visible against light and navy surfaces.
- Payment, fulfilment, and attention states include readable text and do not rely on colour alone.
- The mobile detail sheet has an accessible title, description, close control, and focus behavior.
- Motion is subtle and disabled when `prefers-reduced-motion` is enabled.
- Text and status colours meet appropriate contrast against their surfaces.

## Visual Details

- Use the Peps Anonymous palette: navy `#1B3A7A`, brand blue `#2D6BCC`, deep navy `#1B3164`, amber `#E9A020`, light background `#F8FAFC`, and white cards.
- Use Inter to remain consistent with the product brand and organiser workspace.
- Prefer compact, crisp surfaces over decorative gradients; reserve the navy-to-blue gradient for one controlled emphasis at most.
- Use restrained shadows, subtle borders, tabular numbers, and clear alignment to support dense operational data.
- Use motion only for member selection, detail transitions, and lightweight action feedback.

## Verification

The implementation is complete when all of the following pass:

- Focused source/interaction tests cover the five summary measures, directory controls, selectable member rows, profile workspace, activity timeline, empty state, and mobile detail behavior.
- Search, filter, sort, selection, message feedback, and order hand-off interactions work in the browser.
- The mockup sandbox typecheck passes for new code.
- The mockup sandbox production build succeeds and registers the new preview component.
- Desktop, tablet, and mobile visual checks show no clipping or horizontal page overflow.
- Keyboard navigation, visible focus, status text, touch targets, and reduced-motion behavior are verified.
- `git diff` confirms no production GB Organiser V2 file was changed by this mockup implementation.

## Acceptance Criteria

- The preview is reachable through the existing mockup-sandbox preview mechanism.
- It reads immediately as the selected Member CRM concept shown during design review.
- It retains the existing V2 shell and Peps Anonymous brand language.
- It demonstrates all current Members capabilities with realistic local data.
- Desktop uses a persistent master-detail workspace; mobile uses a full-width member detail surface.
- Production `/gborganiser-v2` remains untouched.
