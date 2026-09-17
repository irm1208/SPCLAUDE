# Member Invoice Editing

## Goal

Allow an authenticated member to open an order from the member order summary and edit its invoice using the same invoice document, preview, totals, and PDF workflow as the admin editor.

Members may use the full editor, including line items, prices, shipping, totals, status, customer/seller details, and currency, even for paid orders. The server must enforce account ownership and preserve the existing refund mutation guard.

## User flow

1. A member opens `/account/orders/:id`.
2. The order summary shows an **Edit invoice** action.
3. The member opens the shared invoice editor in member mode.
4. The editor loads or seeds the invoice through a member-scoped endpoint.
5. The member edits invoice fields, including GBP/EUR/USD currency selection, and sees the live preview.
6. Save persists the invoice and synchronised order totals, then refreshes the order summary.
7. PDF download uses the member-scoped PDF endpoint.

USDT and USDC group-buy currencies continue to seed invoices as USD. Changing the invoice currency changes the invoice denomination and symbol; it does not perform exchange-rate conversion.

## Architecture

### Shared invoice service

Move invoice loading/seeding and the existing transactional save operation into a shared server service. The service owns:

- Loading an existing invoice or seeding one from the order.
- Mapping group-buy currencies to invoice currencies.
- Calculating invoice totals.
- Replacing order line items.
- Updating order totals, delivery price, vendor shipping, and notes.
- Checking for active refunds before mutation.

Admin and member routes call this service so both paths use identical persistence behavior.

### Member API

Add account-session endpoints:

- `GET /api/account/orders/:id/invoice`
- `PUT /api/account/orders/:id/invoice`
- `GET /api/account/orders/:id/invoice-pdf`

Every endpoint requires the account session and verifies that the requested order belongs to the authenticated member. Admin secret headers are not accepted or required on these routes.

### Shared editor

Extend `InvoiceEditor` with an access configuration rather than duplicating the form. Admin mode retains its current admin-secret behavior. Member mode uses the account endpoints and does not render or require admin credentials. Both modes retain the same currency selector and live preview.

## Error handling

- Non-owned orders return the same not-found response as other account order endpoints to avoid exposing order existence.
- Invalid invoice data returns the existing validation message shape.
- Active refund protection remains a conflict response.
- Loading, save, and PDF failures remain visible inside the editor.
- A successful save resets the form from the server response and refreshes the member order detail.

## Testing

- Unit tests for the shared invoice service and currency behavior.
- Route tests proving member ownership is enforced for GET, PUT, and PDF.
- Regression coverage proving the admin route still uses the shared service.
- Frontend contract coverage for the member order-summary action and member editor endpoints.
- Build the API and frontend and verify the running preview after implementation.