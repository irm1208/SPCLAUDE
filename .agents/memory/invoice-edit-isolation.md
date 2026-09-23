---
name: Invoice edit isolation
description: Invoice editing must remain separate from fulfilment and payment order data.
---

Invoice editing and invoice-document PDF generation are Admin-only. Members may generate the normal receipt from authoritative order data, but must not read, write, or render supplied invoice documents. Saving an Admin-edited invoice may update only its document snapshot; it must never replace order line items or change order subtotals, grand totals, shipping, payment amounts, or notes.

**Why:** A member-editable invoice can create an official-looking fake document. The former shared save path also synchronized member-supplied invoice fields into paid orders, replacing products and understating totals.

**How to apply:** Keep all invoice document routes and editor UI out of member surfaces. Seed Admin invoices from the order, then treat them as independent snapshots. Invoice-save handlers and UI callbacks must not mutate or locally patch order financial fields.