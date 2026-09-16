# Admin Invoice Editor Design

## Goal

Give authorized store administrators an editable invoice/receipt editor for every order, with server-authoritative totals, a live preview, persistent invoice data, and downloadable A4 PDFs.

## Existing context

The repository is a Vite/React frontend (`artifacts/peps-anonymous`) backed by an Express API (`artifacts/api-server`) and Drizzle/PostgreSQL (`lib/db`). Orders and order line items already exist, and admin routes are protected by the existing admin authorization middleware. The requested Next.js App Router shape is therefore adapted to the current runtime instead of introducing a second frontend framework.

## Architecture

Add a one-to-one `order_invoices` table keyed by `orders.id`. Seller and customer fields are stored as JSON snapshots so invoice history is independent of later account/profile changes. Line items are stored as JSON in the invoice record because invoice rows are an editable document rather than catalog inventory. A read adapter seeds a missing invoice from the current order and line items, making the feature available to all existing orders without a backfill migration.

Expose three admin-only endpoints:

- `GET /api/admin/orders/:id/invoice` loads or lazily creates the invoice.
- `PUT /api/admin/orders/:id/invoice` validates the complete document, recalculates totals from integer cents, updates the invoice and synchronized order totals/line items in one transaction.
- `GET /api/admin/orders/:id/invoice-pdf` renders the persisted invoice as an A4 PDF and returns it as an attachment.

The browser editor is a focused component launched from the existing admin order detail surface. It uses react-hook-form for field state, a compact custom line-item table, and a shared calculation/formatting module. The preview consumes the same normalized invoice shape as the API. The PDF endpoint uses a server-compatible PDF implementation already supported by the repository; its layout mirrors the preview contract.

## Invoice model

Required fields are `invoiceNumber`, `issueDate`, `currency`, `status`, seller snapshot, customer snapshot, line items, notes, terms, shipping cost, subtotal, total tax, and total. Optional `dueDate` and seller logo URL are nullable. Each line item has `id`, description, quantity, unit price, tax rate, and discount. Money is persisted as decimal strings but calculations use integer cents to avoid floating-point drift. Supported currencies are GBP, EUR, and USD, with Intl formatting.

## Permissions and validation

All invoice routes call the existing `requireAdmin` guard. Payloads are bounded (50 line items, 200-character descriptions, 2,000-character notes/terms, non-negative quantities/prices/tax/discounts) and rejected with `400` on invalid data. The server ignores client totals and computes subtotal, tax, shipping, and grand total. Updates are transactional and preserve existing order payment/refund guards.

## UI behavior

The editor opens from an order row/detail action and is responsive: form sections occupy the main column and the A4-like preview occupies a sticky secondary column on wide screens, stacking below on small screens. Save shows a pending state and refreshes the order data. Download requests the persisted invoice PDF and saves `invoice-{invoiceNumber}.pdf`. Empty or missing optional fields are omitted from the preview.

## Testing

Unit tests cover discount/tax/rounding and currency formatting. Route tests cover admin authorization, lazy seeding, validation, server-side recalculation, persistence of line items, and PDF content type/disposition. A component contract test verifies that editing a line item updates preview totals and that add/remove rows are reflected in the form.
