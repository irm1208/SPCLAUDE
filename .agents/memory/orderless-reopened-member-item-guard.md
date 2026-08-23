---
name: Orderless reopened-member item guard
description: Safe payment protection when reopened shared-order members have no materialised order.
---

In a reopened shared order, a member can have no order ID yet. The item-save write must branch to a constant SQL `TRUE` gate for that case; only a real order ID may be used in the unpaid-payment `EXISTS` check.

**Why:** PostgreSQL cannot infer the type of a parameter used only in `$n IS NULL`, turning a valid item edit for a new/orderless member into a 500 error.

**How to apply:** Keep payment-start protection for members with materialised orders, but do not express “no order” through a nullable SQL parameter. Use a typed column comparison or a constant guard instead.