---
name: Mobile chat overlay boundaries
description: Layering and viewport requirements for floating chat above the mobile menu.
---

Floating chat must render outside animated page containers and above the floating navigation, while its composer stays within the visible viewport.

**Why:** An iOS customer screenshot showed the mobile menu covering the shared-order chat composer. A larger local stacking value alone is not sufficient when page animations create a containing block. Safari's on-screen keyboard can also shrink and offset the visual viewport independently of the layout viewport.

**How to apply:** Check overlay layering with the menu present, preserve global theme tokens when portalling, and test viewport resize/scroll as well as ordinary message sending. Keep the composer non-shrinking and allow the messages area to scroll instead. Simulated viewport tests are not a physical iPhone verification.
