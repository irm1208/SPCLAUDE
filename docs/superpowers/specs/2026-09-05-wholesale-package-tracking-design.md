# Wholesale Package Tracking and Order Items Design

## Goal

Make the Logistics Control Room accurately represent every package in a direct wholesale order and let customers inspect the order's items without leaving the tracking page.

## User Experience

Each order card keeps its order number and package tracking links. Beneath them, every tracking number has its own package row showing its latest status, location, and update time.

Each package row includes a **Previous updates** control. Expanding it reveals older tracking events for that package, newest first. The newest event remains visible when the history is collapsed.

Selecting **Order Details** opens a modal rather than navigating away. The modal loads the authenticated customer's existing order-detail response on demand and displays only the ordered products, quantities, unit prices, and line totals. It includes loading, retryable error, empty, close-button, backdrop-click, and Escape-key behavior.

## Architecture

### Per-package tracking

Add a nullable `tracking_details` JSONB column to direct wholesale orders. It is keyed by normalized tracking number. Each value stores the number, status, optional status code and carrier, event history, and last-checked timestamp.

The tracking refresh worker processes every canonical tracking number independently. A failed lookup preserves that package's previous value instead of deleting valid history. It writes the new per-number map and continues writing the existing order-level tracking fields for compatibility.

The customer tracking endpoint returns a `trackingParcels` array derived from the canonical number list and per-number map. Existing singular fields remain in the response. If an order has not yet received per-package data, the first canonical tracking number receives the existing legacy status/history as a temporary fallback; other numbers show an awaiting-update state rather than duplicating misleading history.

### Order-items modal

The frontend adds an enabled-on-demand account order-detail query using `GET /api/account/orders/:id`. That route already enforces account ownership and returns `lineItems`, so no new order-detail endpoint is required.

The tracking page owns the selected order ID and modal state. Closing the modal clears the selection. The modal never exposes unrelated fields from the full response.

## Compatibility and Migration

- Add the new column as nullable; do not reconstruct historical per-package events.
- Existing records are populated lazily by the tracking refresh worker.
- Continue reading and writing the legacy order-level fields.
- Existing clients remain functional because no current response fields are removed.

## Error Handling

- A failed package lookup keeps the previous per-package data.
- A package without data shows **Awaiting carrier updates**.
- A failed modal request shows an inline retry action.
- Unauthorized order-detail requests remain rejected by the existing account middleware and ownership predicate.

## Verification

- Route tests cover multi-number response mapping and legacy fallback.
- Tracking-worker tests cover independent package results and preservation after one lookup fails.
- Model tests cover event ordering and legacy parcel fallback.
- Page contract tests cover the modal trigger and expandable package histories.
- Frontend typecheck, focused backend/frontend tests, workflow logs, API checks, and a rendered screenshot verify the integrated result.