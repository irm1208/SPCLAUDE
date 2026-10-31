---
name: Shared-order supplier choice
description: Organiser-controlled supplier scope and preservation of saved member baskets.
---

The organiser can choose Uther, JBG/YT, or both when creating a shared order and in its open-order rules. Members can only add products from the selected suppliers. Each supplier's shipping is calculated separately, but the organiser chooses whether each charge is shared among that supplier's buyers or all members with items. Both suppliers can be shared across everyone, or configured independently. Even and order-size splitting remain available.

**Why:** the user explicitly requested organiser control over whether a shared order uses Uther, JBG, or both, and then requested organiser-selectable shipping-sharing options rather than a fixed buyer-only rule.

**How to apply:** preserve legacy orders' all-supplier access. Do not silently remove saved products when the organiser changes suppliers: reject exclusions affecting any member's saved items. Serialize supplier changes with item saves and enforce the same restriction in administrative item changes.
