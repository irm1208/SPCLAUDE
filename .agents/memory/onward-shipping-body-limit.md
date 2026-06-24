---
name: Onward shipping & base64 body-limit gotcha
description: Wholesale onward-shipping flow design + the express.json 64kb global cap that silently blocks image-upload routes.
---

# Onward shipping (wholesale shared orders)

The legacy "reshipper fee" was folded into a peer-to-peer "onward shipping" flow on the wholesale shared order page. Durable rules:

- **Money isolation is mandatory.** Onward charge lives only in the per-member `reshipperFee` column and is paid DIRECTLY to the recipient (deliveryUsername). It must NEVER enter `grandTotal`/breakdown/admin/vendor accounting. Lock/materialization total stays `subtotal + shippingShare + tip` only.
- **Recipient is exempt** from the onward charge; their effective `reshipperFee` is forced to 0.
- **Effective fee is gated on `onwardShippingEnabled`** in buildShareResponse — when the toggle is off, members see fee 0 even if a stored value exists.
- **Currency authority is server-side**: only USDT/USDC accepted on the ERC-20 wallet; validate wallet+currency consistency; changing a member's charge resets `reshipperFeePaid`.
- **Data exposure**: `onwardAddress`/`onwardQr` are visible only to the member themselves or the recipient.
- **QR stored UNCOMPRESSED** (must stay scannable), size-limited via ONWARD_QR_MAX_CHARS (~1.5M chars). Recipient marks paid manually — no auto-verify.

## Body-limit gotcha (recurring)

**Any route that accepts a base64 image/data-URL payload MUST be added to a high-limit `express.json` group in `artifacts/api-server/src/app.ts`.**

**Why:** the global parser is `express.json({ limit: "64kb" })` registered LAST. It silently rejects larger bodies (e.g. an uploaded QR data URL) with a 413 before route logic ever runs, so the feature looks implemented but is unusable. typecheck/build won't catch it.

**How to apply:** list the full mounted path (router mounts at `/api`, so `/api/wholesale-shares/:id/onward-destination`) in the appropriate-size group (15mb covers ~1.5MB QR). Text-only sibling routes (e.g. `/onward` payment methods) stay under the 64kb cap fine.
