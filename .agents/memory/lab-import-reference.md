---
name: Lab import and report reference
description: Links to provider limitations, extraction rules, parser pitfalls and storage lessons.
---

## Provider and extraction lessons
- [Stored certificate preference](lab-test-extract-blob-preference.md) — prefer stored certificates to blocked external sources on re-extraction.
- [Uzorak import](uzorak-import.md) — redirecting verify URLs need the provider's RPC.
- [Janoshik browser import](janoshik-cloudflare-import.md) — Cloudflare prevents ordinary server downloads.
- [Provider preview embeddability](lab-test-preview-embeddability.md) — providers differ in embedding restrictions.
- [Visual extraction format](sage-visual-extraction-format.md) — image inputs, PDF rasterization and response wrappers.
- [Missing extraction fields](lab-test-field-multilayer-drop.md) — inspect prompt, mapping, payload and persistence independently.

## Storage and bloodwork
- [Certificate compression](lab-cert-compression.md) — preserve extraction quality while compressing stored certificates.
- [Blob-free lab lists](lab-tests-list-no-blob.md) — avoid large binary columns in recurring list responses.
- [Bloodwork parser ordering](blood-test-parser-ordering.md) — overlapping abbreviations require deliberate precedence.
- [US unit normalization](blood-test-us-units.md) — bloodwork unit-conversion rules.

**Why:** Provider restrictions and historical parsing/storage failures are easy to repeat when changing imports or previews.

**How to apply:** Open the relevant linked lesson before modifying the matching provider, parser or storage flow.
