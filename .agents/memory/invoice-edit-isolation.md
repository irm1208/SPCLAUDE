---
name: Invoice edit isolation
description: Invoice editing must remain separate from fulfilment and payment order data.
---

Paid members may edit an independent invoice document and download its custom PDF. Saving a member- or Admin-edited invoice may update only the invoice snapshot; it must never replace order line items or change order subtotals, grand totals, shipping, payment amounts, notes, fulfilment, or any other platform data.

**Why:** Custom invoice editing is intentionally a document-only feature. The former shared save path incorrectly synchronized invoice fields into paid orders, replacing products and understating totals; customized invoices themselves remain valid and must be preserved during order repair.

**How to apply:** Authenticate member invoice routes against ownership of a paid order, seed the invoice once from that order, then treat it as an independent snapshot. Invoice saves, PDF generation, order repairs, and UI callbacks must not mutate, delete, or locally patch the other data surface.