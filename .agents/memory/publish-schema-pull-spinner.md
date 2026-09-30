---
name: Publish schema-pull spinner
description: How to interpret failed publish logs that end in database schema-pull progress without an error.
---

A failed publish whose available logs end in repeated “Pulling schema from database…” frames is inconclusive. Successful publishes also print those frames. The build-history log window may be dominated by progress frames and omit the actual reason for failure. Check the build phase and surrounding successful attempts, run the read-only schema diff, and validate the configured production compile locally before changing app code or production data. If those checks pass and no error is reported, a user-initiated publish retry is safer than speculative migration edits.

**Why:** A failed attempt had no error beyond schema-pull progress, while the same progress appeared in successful builds. The later read-only diff was retrievable and reported no structural data loss, and the production compile succeeded locally. Neither observation established that application code or production rows caused the failed attempt.

**How to apply:** Use deployment build history rather than treating the spinner as a root cause. Do not manually add/drop production constraints to “fix” a spinner-only failure; investigate a new attempt if the retry reports a concrete error.