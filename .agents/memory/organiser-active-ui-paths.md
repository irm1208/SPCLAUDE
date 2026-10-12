---
name: Verify the active organiser UI
description: Avoid delivering organiser controls only in a legacy surface.
---

Verify the organiser's actual routed screen before declaring a feature available. The user uses the original organiser dashboard as well as the newer dashboard; an enhancement in only one does not satisfy general organiser requests.

**Why:** Coupon controls were initially added to one settings implementation but not the other. Later, multiple-order highlighting was added only to the newer dashboard, while the user's screenshot showed the original dashboard and they could not see it.

**How to apply:** Trace navigation to the actual rendered component. Cover both organiser dashboards for general organiser enhancements, along with Admin when requested, rather than telling users to change dashboards to find promised functionality.
