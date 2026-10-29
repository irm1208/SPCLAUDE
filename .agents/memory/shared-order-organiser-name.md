---
name: Shared-order organiser names
description: Collect real names only in delivery details, not shared-order creation or organiser settings.
---

Require the recipient's full name in Delivery details only. Do not ask for an organiser's real name when starting a shared order or editing its rules.

**Why:** The user changed the earlier organiser-name requirement and explicitly selected “Delivery details only.”

**How to apply:** Shared-order creation uses authenticated account ownership. The selected delivery recipient provides their full name with the shipping address. Do not fabricate a recipient name from a username or claim a name declaration verifies identity.

Keep delivery names private to the authorised shipping viewers rather than broadcasting them to participants.

**Why:** A delivery name should not become a public member display name.

**How to apply:** Preserve participant-facing usernames and apply server-side visibility checks to real names.
