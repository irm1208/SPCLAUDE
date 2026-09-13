---
name: Historical crypto refund visibility
description: Security boundary between showing the refund action and authorizing creation for legacy crypto orders.
---

Confirmed historical crypto orders may show the customer refund action from
server-owned payment status, confirmation time, transaction hash, currency, and
network, even when no payment-audit snapshot exists.

**Why:** Older legitimate crypto payments predate `payment_audit_results`; requiring
an audit row for UI visibility hid refunds from paid customers. Visibility is not
authorization.

**How to apply:** Keep request availability separate from creation eligibility.
The actual refund POST must live-verify the stored transaction and exact amount,
then re-check payment identity and routing under row locks before persisting.