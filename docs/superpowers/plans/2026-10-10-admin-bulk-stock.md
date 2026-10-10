# Admin bulk stock controls

Approved scope: use the existing product selection to increase, decrease, or set stock.

- Add an admin-protected, transaction-backed stock endpoint. Validate selected IDs and whole quantities, lock products in ID order, reject stale selections and overflow, and update the batch atomically.
- Increase/decrease applies only to tracked stock; explicitly report skipped untracked products. Setting stock starts tracking. Decreases stop at zero.
- Add a small stock dialog beside the existing selection controls. Show the operation, exact selection, quantity, and per-product preview before confirmation. Keep errors visible and prevent double submissions.
- Patch the displayed stock from the server response and refresh product query caches.
- Verify endpoint validation, permissions, rollback, and operation arithmetic; test the dialog and existing selection controls; build both services and check the running preview.
