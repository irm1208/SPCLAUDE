# GB Organiser Orders Filter Studio Design

## Purpose

Redesign the filter area on the `/gborganiser-v2` Orders workspace as a polished, collapsible Filter Studio. The design keeps the current order repository, saved views, filters, search, sorting and mutations, while replacing the nested dropdown presentation with a clearer grouped workflow consistent with the approved Peps Anonymous organiser shell.

This specification refines the filter portion of the approved Order Desk. It does not replace the wider Order Desk table-and-inspector direction.

## Approved Direction

The approved direction is **Filter Studio**, selected from three visual concepts.

- The studio loads collapsed by default.
- Expanding it reveals grouped filter controls in one connected surface.
- Filter changes are staged as a draft.
- The order results do not change until the organiser selects **Apply filters**.
- Applying the draft updates the order table, refreshes the applied chips and collapses the studio.
- The collapsed toolbar remains compact and shows how many filters are currently applied.

The design prioritises a calm order table during normal work and a structured, visible filtering experience when refinement is required.

## Goals

- Make the Orders filters look intentional, professional and consistent with the dashboard-aligned organiser.
- Eliminate the current stack of dropdowns inside another dropdown.
- Keep the order table visually dominant while filters are not in use.
- Group related controls so organisers can scan and understand the active criteria quickly.
- Prevent half-finished filter selections from unexpectedly changing the table.
- Preserve the existing filter fields, saved-view compatibility and live repository data.
- Keep the interaction accessible by keyboard and usable on desktop, tablet and mobile.

## Non-goals

- No order repository, schema, API or persistence redesign.
- No replacement of saved views.
- No new filter categories beyond the existing status, country, payment method and date criteria.
- No second independent source of applied filter state.
- No changes to bulk actions, CSV import/export, order editing or other Order Desk mutations.
- No new UI dependency solely for this filter panel.

## Collapsed State

The Filter Studio loads collapsed whenever the Orders workspace is opened. Its collapsed toolbar contains:

1. A full-width order search field for member name, username, order ID or transaction reference.
2. A **Filters** button with a numeric badge when applied criteria exist, such as **Filters 3**.
3. The current sort control.
4. A second compact row of removable applied-filter chips when at least one criterion is active.
5. A textual matching-order count near the chips or table heading.

The collapsed state displays applied values only. Unapplied draft changes must never appear as applied chips or alter the active-filter badge.

Removing an applied chip is an immediate, explicit action and updates the corresponding applied filter. **Clear all** is available when any filters are applied and clears all applied filter criteria while retaining the search query unless the organiser clears search separately.

Search remains an immediate standalone control: typing in search updates the table without waiting for Apply. The draft-and-apply model governs only the criteria inside the Filter Studio.

## Expanded Filter Studio

Selecting **Filters** expands one connected white surface immediately beneath the toolbar. The panel uses shallow Peps borders, restrained shadow and four visually distinct groups:

### Status

- Paid
- Unpaid
- Pending payment confirmation

Status supports multiple selections and uses text labels plus checkboxes. The current `all` representation remains an internal compatibility detail; the UI presents no selection as all statuses.

### Country

Country values come from the current order records. The control supports multiple selections and must remain usable with a longer country list through a contained scroll region or searchable list if necessary.

### Payment method

Payment methods come from the current order records. The control supports multiple selections and uses the same visual pattern as Country.

### Dates and sort

- Order date from
- Order date to
- Payment date from
- Payment date to
- Newest first or oldest first

Date fields retain explicit visible labels and use the browser's existing date-input behaviour. Sort remains visible in the collapsed toolbar, but its current value is mirrored in the expanded studio so the complete filter configuration can be reviewed in one place.

## Draft and Applied State

The existing filter state remains the applied state used by `filteredOrders`, saved views and active chips. Opening the studio creates or synchronises a draft copy of those values.

While the studio is open:

- changes update only the draft values;
- the order table and applied chips remain unchanged;
- the studio calculates a preview result count from the draft;
- the primary action reads **Apply filters · N orders**;
- the Filters badge continues to describe applied filters, not draft filters.

### Apply filters

Selecting **Apply filters · N orders** copies the draft values into the existing applied filter state, updates the table and chips, then collapses the studio.

### Cancel

Selecting **Cancel** discards all draft changes, restores the draft from the applied state and collapses the studio. Pressing Escape while focus is within the expanded studio performs the same cancellation behaviour.

Selecting the expanded Filters button or its collapse control without applying is treated as Cancel. Draft selections are never kept invisibly inside a collapsed panel.

### Reset

Selecting **Reset** clears the draft filter criteria inside the open studio but does not alter the current table until **Apply filters** is selected. Search remains separate and is not cleared by Reset. Reset retains the currently applied sort order because sort is a visible ordering control rather than an active filter category.

Opening the studio again always starts with a fresh draft copied from the current applied state. This prevents stale cancelled choices from returning.

## Saved Views

Saved views continue to store and restore the existing applied filter object. When a saved view is selected:

- its values become the applied state;
- the table, active-filter badge and chips update immediately;
- any open Filter Studio synchronises its draft to the newly applied saved view;
- unsaved draft changes are discarded because selecting a view is an explicit navigation action.

Creating a saved view stores applied criteria only. Unapplied draft changes must not be saved.

## Active Filter Counting

The filter badge counts active filter categories, not individual selected values. For example:

- two selected statuses count as one active category;
- three countries count as one active category;
- a payment method counts as one active category;
- any order-date boundary counts as one active category;
- any payment-date boundary counts as one active category.

Search and sort do not contribute to the Filters badge because they have dedicated visible controls.

Applied chips summarise values rather than creating an unbounded chip row. A single value may display directly, such as **Country: United Kingdom**. Multiple values use a concise summary such as **Country: 3 selected**. Removing a summary chip clears that category.

## Visual System

The Filter Studio follows the approved organiser and Peps Anonymous design system.

### Typography

- Font family: Inter with the approved dashboard fallback stack.
- Panel title: 14–15px, weight 700.
- Group labels: 10.5–11px, weight 700, restrained uppercase tracking.
- Controls and choices: 12–12.5px, weights 500–600.
- Supporting counts and summaries: 10.5–11.5px, weight 500–600.
- No filter body text below 10.5px and no oversized headings.

### Colour

- Canvas: `#F4F6F9`.
- Surfaces: white.
- Primary text: `#0F1F38`.
- Secondary text: `#6B7280`.
- Borders: `#D0DAE4` or the approved shallow border token.
- Selected controls and active chips: Peps blue `#2D6BCC` with a pale blue surface.
- Primary Apply action: Peps navy `#1B3A7A`.
- Reset and Cancel remain neutral secondary actions.
- Status semantics retain accessible green, amber and red text treatments without relying on colour alone.

### Geometry and spacing

- One connected filter surface rather than separate floating cards.
- Approximately 12–14px surface radius.
- Approximately 8–12px internal gaps and 12–16px group padding.
- Controls use approximately 8px radii and at least 38px desktop height.
- Borders provide most separation; shadows remain soft and low-opacity.
- Applied chips use compact pill geometry because they represent removable tokens, not primary actions.

## Responsive Behaviour

### Desktop

- The expanded studio uses a four-group grid when space permits.
- Search, Filters and sort stay on one toolbar row.
- The panel remains within the Order Desk content column and does not overlap the persistent order inspector.

### Tablet

- Filter groups reflow into two columns.
- The toolbar may wrap search above Filters and sort without horizontal page overflow.
- Applying or cancelling still collapses the panel.

### Mobile

- The studio expands as a full-width stacked surface below the toolbar rather than a narrow floating dropdown.
- Filter groups use one column.
- Apply and Cancel remain reachable in a sticky panel footer when the content is taller than the viewport.
- Touch targets are at least 44px even though the desktop presentation remains compact.
- Applied chips wrap within the page and never force horizontal scrolling.

## Accessibility

- The Filters button exposes `aria-expanded` and references the panel with `aria-controls`.
- The numeric badge has an accessible description such as “3 filter categories applied”.
- Filter groups use semantic fieldsets and legends or equivalent labelled group structures.
- Every checkbox, input and select has a persistent visible label.
- Focus moves into the studio when opened only when that does not interrupt pointer use; keyboard users receive a predictable first focus target.
- Escape cancels draft changes and collapses the studio.
- Apply, Reset and Cancel have visible focus styles.
- Selection state is conveyed by checked controls and text, not colour alone.
- Result-count changes in the draft preview use a polite live region without announcing every keystroke excessively.

## Interaction Feedback and Edge Cases

- If the draft matches the applied state, Apply remains available but does not perform unnecessary repository work; its result count remains accurate.
- If no orders match the draft, the action reads **Apply filters · 0 orders** and remains enabled so the organiser can intentionally inspect the empty state.
- Invalid date ranges display an inline message near the date group and disable Apply until corrected.
- Lists with no available country or payment values show a disabled **No values available** row.
- Applied filters survive normal tab navigation through the existing component or saved-view behaviour; this design introduces no new persistence boundary.
- Closing the panel through Cancel or Escape never loses applied criteria.

## Component Boundaries

The implementation should keep `OrdersTab.tsx` as the owner of repository data and applied filter behaviour while extracting focused file-level presentation units where that reduces its current size and complexity.

Suggested responsibilities:

- `OrdersFilterToolbar`: search, Filters badge, sort and applied chips.
- `OrdersFilterStudio`: expanded grouped draft controls and actions.
- Pure helpers for active-category counting, applied-chip summaries, draft comparison and preview filtering.

These units receive values and callbacks; they do not load or persist order data independently.

## Testing Strategy

### Pure behaviour tests

- Count active categories correctly when multiple values exist in one category.
- Derive concise chip summaries.
- Preview draft filters without mutating applied state.
- Reject invalid date ranges.
- Preserve the existing status mapping between UI choices and repository order statuses.

### Component and source contracts

- The studio is collapsed initially.
- The Filters control exposes expanded state and applied count.
- Draft changes do not update the applied filter state before Apply.
- Apply copies the draft, updates results and collapses the studio.
- Cancel and Escape discard the draft.
- Reset clears only draft filter criteria.
- Saved-view selection synchronises applied and draft state.
- Mobile markup retains visible Apply and Cancel controls.

### Regression verification

- Existing search and sort continue to work.
- Existing saved views continue to load and save filters.
- Bulk selection and order mutations remain reachable.
- CSV import/export and order modals remain unaffected.
- The Order Desk introduces no horizontal page overflow at desktop, tablet or mobile widths.
- The focused organiser tests, Orders tests, TypeScript checks, production build and localhost preview are run after implementation.

## Acceptance Criteria

The Filter Studio is complete when:

1. It loads collapsed by default.
2. The collapsed toolbar clearly exposes search, applied-filter count, sort and applied chips.
3. The expanded panel presents Status, Country, Payment, Dates and sort as clear visual groups.
4. Changing a control does not change the table before Apply.
5. Apply updates the existing filter state and collapses the panel.
6. Cancel and Escape discard draft changes.
7. Reset clears the draft without prematurely changing results.
8. Saved views remain compatible and never capture unapplied drafts.
9. Typography, colour, spacing and controls match the compact Peps organiser system.
10. The experience is keyboard-accessible, responsive and free of horizontal page overflow.
11. Existing Orders workflows and repository data remain intact.

## Completion Standard

The redesign is complete when the approved Filter Studio replaces the nested dropdown filter UI, behaves exactly according to the draft-and-apply model, integrates with the production Order Desk and saved views, passes focused verification, and visually matches the selected number 2 mockup within the current Peps Anonymous dashboard shell.
