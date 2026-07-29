---
name: Order preview modes must not touch the persisted draft
description: Any read-only/preview mode of the order form must be side-effect-free on the zustand-persisted draft store.
---

The order form syncs `?gbId=` into the persisted draft store on mount, and the store resets line items/delivery/orderId whenever the group buy changes.

**Rule:** any preview or read-only mode of the order form (e.g. organiser buyer-preview `/order?gbId=X&preview=1`) must early-return before every draft-store write (`setGroupBuyId`, and be careful with item mutations), or opening a preview silently wipes/contaminates the user's real in-progress order draft.

**Why:** caught in code review of the organiser buyer-preview feature — previewing GB X while a draft existed for another GB destroyed the draft.

**How to apply:** when adding new preview-like flags to OrderForm, audit every `draft.*` setter effect and guard on the flag. Also hide member-only action prompts (country-leg assignment) in preview; server-side membership gates (403) make them dead-end UI.
