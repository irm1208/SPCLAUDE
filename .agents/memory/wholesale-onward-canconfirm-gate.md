---
name: Wholesale onward roster visibility gate
description: Onward recipient roster/Manage UI must AND share.onward.canConfirm with share.onward.enabled, because the backend sets canConfirm independent of enabled.
---

Any UI that surfaces the onward-charge roster (the recipient's "mark each member's
onward charge paid" list) on the shared wholesale order page must gate on
`share.onward.enabled && share.onward.canConfirm`, NOT on `canConfirm` alone.

**Why:** The backend sets `onward.canConfirm = isRecipientViewer && status !== "cancelled"`,
which is true regardless of whether onward forwarding is actually turned on. The legacy
render nested the roster inside an outer `{share.onward.enabled && ( ... )}` wrapper, so
`enabled` was the real gate. Gating new code on `canConfirm` alone widens access: a plain
delivery recipient sees a "Manage order" card and onward roster (and can toggle stale
onward charges) even when forwarding is disabled. Caught in code review during the
shared-order simplification refactor.

**How to apply:** When deriving show-flags for onward controls, the roster/confirm flag
must include `enabled`. The config flag is different — recipient onward *configuration*
correctly uses `share.onward.canManage` (lets an open-share recipient enable/configure
forwarding), so don't add `enabled` to that one. Only the confirm/roster path needs it.
