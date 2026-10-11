---
name: Group-buy coupon boundaries
description: Preserve scoped coupon ownership, committed discounts, and atomic redemption limits.
---

Group-buy coupons discount the product subtotal at order creation; legacy global coupons retain their existing total-based arithmetic. Usage is counted when an order is submitted, not when its payment is confirmed.

**Why:** Scoped promotions must not waive shipping, tips or fees, and introducing them must not silently change existing global coupons.

**How to apply:** Validate against the actual server-resolved group buy, including inherited group identity for additions. Keep code identity and group scope immutable; codes remain globally unique under the existing constraint.

Fixed coupon amounts and minimum spend are denominated in the group buy's currency, not an independently chosen or default USD currency.

**Why:** The user stated, “The coupon has to be in the currency of the group buy.”

**How to apply:** Inherit the owning group's currency. Keep currency codes explicit in monetary labels, and do not represent unsupported or token currencies using a dollar fallback. Percentage coupons remain percentages of the group buy's product subtotal.

Lock the coupon row and recheck current eligibility and per-customer usage inside the same transaction as order persistence, redemption history, and the usage increment.

**Why:** A validation request is only a quote. Separate reads and later increments let simultaneous submissions exceed limits or consume a coupon on a failed order write.

**How to apply:** Keep normal order creation and addition-to-parent paths transactional. Customer counts normalize leading @ and case; preserve the existing username-change migration of redemption history.

Used scoped coupons may be disabled, but not deleted. Retain their scope even if a group buy is deleted; never convert them to global coupons.

**Why:** Deleting a used coupon cascades away its redemption history, and clearing its group scope would enable it on unrelated orders.

**How to apply:** Scope management queries by both group and coupon ID. Manager changes govern future redemptions; never reprice committed orders from the current coupon configuration.
