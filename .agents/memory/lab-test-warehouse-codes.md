---
name: Lab-test warehouse codes
description: Domain meaning and approved scope of warehouse prefixes in certificate batch codes.
---

Leading US- and UK- identify the warehouse, not a different product. The user’s example US-SS50-0831 is still SS-31 50mg, located in the US warehouse; a UK counterpart also exists.

**Why:** The user explicitly described this meaning and approved saving warehouse separately and showing it in extraction/admin views while preserving product matching.

**How to apply:** Preserve the complete certificate batch code. Remove only recognized warehouse prefixes when resolving the underlying product and dose. Do not infer a warehouse from unknown formats. Existing null records may display a derived warehouse without a broad backfill.
