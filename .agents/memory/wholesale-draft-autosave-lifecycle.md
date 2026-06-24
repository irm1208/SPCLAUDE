---
name: Wholesale draft autosave lifecycle
description: Rules for the DB-backed wholesale order draft (save/resume/discard) so a cleared or discarded draft can't be resurrected.
---

The wholesale order draft is a single per-account DB draft (PUT `/api/account/wholesale-draft`, body `{draft}` or `{draft:null}`), auto-saved debounced as the form changes, restored on mount, and surfaced via an explicit "Save draft" button + "Resumed your saved draft / Discard" banner.

Any code touching this flow must keep four invariants:

1. **Clear the draft only on real submit success** (Review `onSuccess`), never when entering review — so backing out of review keeps the user's work.
2. **Store `null`, not an empty object, when the form is empty** — otherwise a blank draft gets resurrected (e.g. right after discard) and the "Resumed your saved draft" banner shows for nothing.
3. **Clear the pending debounce timer on unmount and before navigating** (`return () => clearTimeout(...)` in the autosave effect, and `clearTimeout` + a deterministic flush in `handleReview`) — a timer that survives navigation will fire and re-save after submit/discard.
4. **Latest-write-wins on the PUT**: abort the previous in-flight save (`AbortController`) before each new save, so an older autosave PUT can't land after a discard's `PUT{draft:null}` or the submit-time clear.

**Why:** making save/resume explicit meant removing the old clear-on-review call. That alone introduced a race: the debounced timer / in-flight PUT outlived navigation and resurrected the draft after the order was submitted or discarded. Architect review caught it; (3)+(4) are the fix.

**How to apply:** when editing `WholesaleOrder.tsx` draft logic or `Review.tsx` submit-success clearing. `telegramUsername` and the selected shipping region are intentionally NOT in the draft payload — username auto-restores from the account, region auto-selects from the saved `shippingCountry` on mount.
