# Compact GB Organiser V2 Order Cards

## Goal

Make the GB Organiser V2 order list faster to scan by showing only the member username, total item quantity, order total, and creation date until an order is opened.

## Approved interaction

- Desktop and mobile use the same compact order summary component.
- Each summary shows exactly four data fields: **User name**, **QTY**, **Total**, and **Date**.
- A subtle chevron communicates that the summary opens.
- Clicking the summary opens the existing order quick-view drawer.
- Desktop retains selection checkboxes and bulk actions. Checkbox interaction does not open the drawer.
- The drawer preserves the full order information and actions: reference, member, status, items, payment, delivery, tracking, proof, notes, edit, and selection.

## Responsive layout

- Desktop uses one dense horizontal row per order with aligned columns.
- Mobile uses a compact two-column grid inside each card while retaining the same four fields.
- Touch targets remain at least 44px high and keyboard focus remains visible.

## Data

All values come from the existing live `OrganiserOrder` objects. Quantity is the sum of product quantities. No placeholder order data is introduced.

## Verification

- Contract test confirms both desktop and mobile use the shared compact component.
- Contract test confirms all four summary fields and the quick-view click handler.
- Existing order model tests and production Vite build must pass.