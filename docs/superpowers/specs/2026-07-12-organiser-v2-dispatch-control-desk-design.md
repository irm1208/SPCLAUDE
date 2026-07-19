# Organiser v2 Dispatch Simplification

## Purpose

Redesign the `gborganiser-v2` Dispatch tab as a simple, function-first screen that looks and behaves like the existing Orders and Parcels tabs. The organiser selects delivered parcels, immediately sees which orders can be fulfilled from them, then prints slips, sends optional QR reminders, and confirms dispatch.

## Goals

- Make parcel contents the primary information on the screen.
- Recalculate ready orders automatically whenever parcel selection changes.
- Keep the complete dispatch workflow on one continuous page.
- Use only established organiser-v2 visual patterns.
- Show a ready-to-dispatch alert on Overview when fulfilable orders exist.

## Non-goals

- No stage navigation, operational summary strip, bespoke dashboard, or control-desk visual language.
- No API or database changes.
- No parcel creation or tracking changes; parcels remain managed in the Parcels tab.
- No QR requirement before dispatch. Reminders are optional.
- No changes to the original `/gborganiser` or shared `AdminDispatch` UI.

## Dispatch Page

### Header

Use the same header pattern as `OrdersTab`:

- `Dispatch` title.
- One-line description: `Select received parcels and dispatch the orders they can fulfil.`
- A secondary `Dispatch Log` button on the right.

Do not add a large hero, live status, refresh control, stage rail, or statistic cards.

### Delivered parcels

Render a vertical list of white `rounded-xl` parcel cards matching the supplied reference and organiser-v2 card styles.

Each card contains:

- A large checkbox.
- Package name.
- Reshipper username in a purple outlined label.
- `delivered` in a soft-green label.
- Tracking number in monospace text.
- Product chips containing product name and total quantity.
- Partially used products append a muted `(N sent)` value.
- Fully dispatched products use pale-red borders, red strikethrough product text, quantity zero, and the sent count.
- A footer line: `N already dispatched · N remaining`.

Selecting or clearing a parcel updates fulfilment immediately. There is no Calculate button.

### Ready orders

When no parcel is selected, show a compact empty state: `Select delivered parcels to see which orders are ready.`

When parcels are selected, automatically compute fulfilment and render:

- A `Ready to dispatch` heading with the ready-order count.
- White rounded order cards using the same visual vocabulary as the parcel cards.
- Checkbox, order code, member name/username, product quantities, delivery method, country, and QR state.
- Ready orders selected by default; organisers may clear individual orders.
- Selected cards use only the existing pale-green selection background and green border.

Orders missing stock are hidden behind one low-emphasis disclosure: `Waiting for stock (N)`. Expanded rows state the missing product and available quantity. This section must not compete visually with ready orders.

### Actions

Place one normal organiser-v2 action row beneath the ready orders:

- `Print packing slips` — secondary outlined button.
- `Send QR reminders` — amber secondary button, shown only for selected orders requiring QR.
- `Dispatch selected` — green primary button.

The action row is part of normal document flow. It is not sticky or floating.

Dispatch confirmation uses a standard rounded modal. It states the order and parcel counts and explains that parcel stock will be deducted.

### Dispatch Log

`Dispatch Log` is a simple secondary page state reached from the header button. It retains:

- Search and delivery-method filtering.
- Dispatched order rows.
- Dispatch photo filename attachment.
- CSV export.
- Guarded undo dispatch.

Use the same cards, filters, buttons, and spacing as other organiser-v2 tabs. Provide a `Back to Dispatch` button.

## Overview Alert

The Dispatch page reports its computed ready count through workspace-level shared state. When the count is greater than zero, Overview shows one compact green alert card:

- Title: `N orders are ready to dispatch`.
- Supporting text: `Selected delivered parcels can fulfil these orders.`
- Action: `Review dispatch`.

The action switches the workspace to the Dispatch tab. Hide the alert when the count is zero.

For this frontend prototype, store the selected parcel IDs and ready count in `Workspace` so tab changes do not lose them. Do not use generic `localStorage` keys.

## Visual System

Use the same values and patterns already present in organiser-v2:

- Page canvas remains `V2_CANVAS`.
- Cards use white backgrounds, `rounded-xl`, and `V2_CARD_BORDER`.
- Primary actions use `var(--t-blue)`.
- Text uses `var(--t-text)`, `var(--t-muted)`, and `var(--t-subtle)`.
- Inputs and secondary actions use `rounded-lg` and the standard card border.
- Header typography matches Orders and Parcels: `text-lg` or `text-xl`, bold.
- Standard content spacing: `space-y-4 sm:space-y-5`, card padding `p-4 sm:p-5`.

Do not introduce separate typography, paper colors, ruled backgrounds, square controls, oversized headings, decorative gradients, or custom CSS variables.

## Component Architecture

Simplify the existing v2 dispatch folder:

- `DispatchControlDesk.tsx` becomes the single-page composition root and may be renamed internally only if imports remain clear.
- Replace `DispatchHeader`, `DispatchStageRail`, `DispatchSummary`, `ReceiveStage`, `PrepareStage`, and `DispatchStage` usage with two focused components:
  - `DeliveredParcelList.tsx`
  - `ReadyOrderList.tsx`
- Keep `DispatchLog.tsx`, restyled to standard organiser-v2 patterns.
- Keep `model.ts`, `types.ts`, and `sample-data.ts`; update data to reflect the richer package-card reference.
- `DispatchTab.tsx` remains the thin entry point.
- `Workspace.tsx` owns shared parcel selection and ready count, and passes an `onGoto` callback to Overview.

The original `AdminDispatch.tsx` stays unchanged.

## State and Data Flow

1. Workspace initializes dispatch prototype state.
2. Dispatch receives selected parcel IDs and an update callback.
3. Every parcel selection change calls the pure fulfilment calculation immediately.
4. Dispatch reports the resulting ready count to Workspace.
5. Overview reads the ready count and renders or hides its alert.
6. Dispatch confirmation deducts parcel quantities, moves selected orders to the log, clears the completed selection, and reports the new ready count.

## Accessibility and Feedback

- Parcel and order selections expose checkbox semantics and remain keyboard-operable.
- Status is always expressed with text, not color alone.
- Product chips wrap without horizontal page overflow.
- Action buttons have visible disabled and focus states.
- Failed or empty operations preserve parcel and order selections.
- Confirmation and photo-upload dialogs use labels, modal semantics, and keyboard focus styles.

## Verification

- Update pure model tests for automatic fulfilment after parcel selection and correct ready-count reporting.
- Verify parcel selection persists when switching between Overview and Dispatch.
- Verify the Overview alert appears at a nonzero ready count, opens Dispatch, and disappears at zero.
- Run the focused dispatch test command.
- Run the production build with required `PORT` and `BASE_PATH` values.
- Run typecheck and confirm no new errors under organiser-v2 dispatch or workspace files.
- Manually review desktop and mobile widths in `/gborganiser-v2`.
- Confirm `/gborganiser` remains unchanged.
