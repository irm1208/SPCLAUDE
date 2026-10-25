---
name: Mobile chat overlay boundaries
description: Layering and viewport requirements for floating chat above the mobile menu.
---

Floating chat must render outside animated page containers, temporarily hide the floating navigation while open, and keep its composer within the visible viewport. Restore navigation automatically when the panel disappears, including after route changes.

**Why:** Repeated iOS customer screenshots showed the mobile menu covering the shared-order chat composer. Competing stacking values alone are not a sufficient safeguard; the modal chat should not compete with a visible floating menu. Safari's on-screen keyboard can also shrink and offset the visual viewport independently of the layout viewport.

**How to apply:** Check every floating-menu layer, including its popover and backdrop, and verify automatic restoration after closing chat. Preserve global theme tokens when portalling, and test viewport resize/scroll as well as ordinary message sending. Keep the composer non-shrinking and allow the messages area to scroll instead. Simulated viewport tests are not a physical iPhone verification.
