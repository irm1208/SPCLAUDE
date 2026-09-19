---
name: Sage stale no-data history
description: Prior assistant turns claiming bloodwork is missing can make Sage ignore real biomarker context on later turns.
---

When a Sage request has loaded biomarkers, remove prior assistant messages that claim the report/results are unavailable and ask the member to upload, attach, or paste them. Keep user turns and ordinary health guidance intact.

**Why:** A production conversation showed Sage repeatedly asking for an upload even though the selected session had linked biomarker rows; the stale assistant reply was being sent back in history and reinforced the wrong state.

**How to apply:** Sanitize history server-side only when current biomarker data is present, while retaining the latest-session fallback and explicit session handoff.