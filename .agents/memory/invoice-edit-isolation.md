---
name: Invoice edit isolation
description: Invoice editing must remain separate from fulfilment and payment order data.
---

Saving an edited invoice may update only the invoice document snapshot used for display and PDF generation. It must never replace order line items or change order subtotals, grand totals, shipping, payment amounts, or notes.

**Why:** Invoices are presentation documents. Synchronizing invoice overrides back into the order changes customer purchases and payment state when someone only intended to adjust a PDF.

**How to apply:** Seed the invoice once from the order, then treat it as an independent snapshot. Invoice-save handlers and their UI callbacks must not mutate or locally patch order financial fields.