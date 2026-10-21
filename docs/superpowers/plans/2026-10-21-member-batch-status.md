# Optional member batch status

Approved design: a per-group-buy, default-off “Show batch status to members” setting. Enabled cards offer “View batches” through their three-dot menu. A read-only table shows references, regions, kit counts, actual statuses and dates, highlighting the member’s own active allocations. Never return supplier tracking numbers, customer lists, addresses, payment details, shipment notes or staff audit data.

Implementation:
- [x] Test persistence, member access/disabled gates, safe projections and actual shipment-derived statuses.
- [x] Store the flag in existing supplier settings JSON, preserving it for older clients. Add it to the shared Admin/organiser batch settings form.
- [x] Add a membership- and visibility-gated member endpoint and bulk-load visibility flags into member group-buy summaries.
- [x] Add a reusable accessible dialog/table and menu action on the dashboard cards; make the secondary Groups page offer the same feature.
- [x] Test settings and member UI, run targeted database/route tests and builds, restart canonical workflow and check preview.

Verification: 21 backend database/route/projection tests, 16 settings interaction tests, and 3 member dialog tests passed. Both builds passed and the canonical application restarted cleanly. The screenshot shows sign-in; protected screens were tested through components, not visually signed in. An outdated settings-test fetch stub was corrected to return the separate fulfilment endpoint's own response shape.
