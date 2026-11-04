# Batch packing slips

Approved scope: add a supplier-batch filter to Admin group-buy Packing slips.
Reuse current address data and the existing A4/4×6 print dialog. Use only the
selected batch snapshot's allocated items and quantities, including split orders.
Keep country, reshipper and dispatch-status filters; no reshipper is required.
Exclude released batches. Include the batch reference on printed slips.
Printing must not change allocations, dispatch status, payments or notifications.

Implementation:
1. Add regression coverage for batch selection, split quantities and filter reset.
2. Load existing authenticated supplier-batch data alongside paginated orders.
3. Project batch allocations onto current orders for selection and printing.
4. Verify tests, production build and the available unauthenticated app screen.
