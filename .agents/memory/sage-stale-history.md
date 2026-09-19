---
name: Sage stale no-data history
description: Prior assistant turns claiming bloodwork is missing can make Sage ignore real biomarker context on later turns.
---

When a Sage request has loaded biomarkers, remove prior assistant messages that claim the report/results are unavailable and ask the member to upload, attach, or paste them. Keep user turns and ordinary health guidance intact. Reject the same contradiction in a new draft before delivering it.

**Why:** Production conversations showed Sage asking for an upload even though the selected session had linked biomarker rows. One cause was stale assistant history. Another was the tool loop generating a complete grounded answer, then making a second model call with no new user turn and replacing the first answer.

**How to apply:** Sanitize history server-side only when current biomarker data is present, while retaining the latest-session fallback and explicit session handoff. Deliver the completed tool-loop answer directly; never ask the model to regenerate after appending its own final assistant turn. Buffer and validate a draft before emitting it, then retry once if it asks for data already loaded.