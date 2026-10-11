---
name: Verify the active organiser UI
description: Avoid delivering organiser controls only in a legacy surface.
---

Verify the organiser's actual routed settings screen before declaring a feature available; do not assume a newer dashboard inherits additions to an older editor.

**Why:** Coupon controls were initially added to the legacy editor while the current dashboard had a separate settings implementation, so organisers could not find the promised controls.

**How to apply:** Trace the active organiser route through its navigation to the rendered settings component. Check that the requested control is connected there as well as in any legacy or Admin surface being maintained.
