---
name: Shared-order supplier choice
description: Organiser-controlled supplier scope and preservation of saved member baskets.
---

The organiser can choose Uther, JBG/YT, or both when creating a shared order and in its open-order rules. Members can only add products from the selected suppliers. Each supplier's shipping remains separate and is shared only by its buyers.

**Why:** the user explicitly requested organiser control over whether a shared order uses Uther, JBG, or both, after confirming mixed-supplier member ordering.

**How to apply:** preserve legacy orders' all-supplier access. Do not silently remove saved products when the organiser changes suppliers: reject exclusions affecting any member's saved items. Serialize supplier changes with item saves and enforce the same restriction in administrative item changes.
