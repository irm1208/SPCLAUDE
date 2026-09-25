# Admin product bulk deletion

## Goal

Let admins select and delete multiple catalogue products from the backend Products tab, without removing the existing one-product delete action.

## User experience

- Each product row has a selection checkbox.
- “Select visible” selects or clears the products currently shown by the search and vendor filters. There is no separate select-everything action.
- The selection count and a clear-selection action stay visible while products are selected.
- Selection persists when the search or vendor filter changes; the count includes selected products that are currently filtered out.
- The confirmation step lists the exact selected products by name and vendor before deletion.
- The confirm button is disabled while deleting. On success, deleted rows disappear and the selection clears. On failure, the selection stays available and a clear error is shown.
- The existing per-row trash action continues to work unchanged.

## API and data behavior

- Add `DELETE /admin/products` with JSON body `{ "ids": string[] }`; keep `DELETE /admin/products/:id` unchanged.
- Use the existing admin authorization check.
- Reject an empty or malformed ID list with HTTP 400.
- Delete all requested products in one database transaction. If any ID no longer exists when the request is processed, reject the batch with HTTP 409 and make no deletions.
- Return the IDs deleted so the UI can reconcile its list.
- Existing database cascade behavior for product-linked records remains the same as for single-product deletion.

## Error handling

- A confirmation cancellation makes no request.
- An API/network failure leaves the selected products in place and displays an error.
- The transaction prevents partial deletion when a requested product is stale or a database delete fails.

## Verification

- API tests cover admin authorization, invalid/empty input, successful multi-delete, stale IDs causing an all-or-nothing conflict, and existing single-delete behavior.
- Frontend tests cover selecting individual rows, selecting/clearing currently visible rows, retaining selections across filters, clearing the selection, and confirmation contents.
- Run relevant API and web tests, API compile, and web production build.