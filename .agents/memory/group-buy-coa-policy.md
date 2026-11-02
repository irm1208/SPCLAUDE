---
name: Group-buy COA policy
description: Scope, separate charges, capacity commitments and immutable COA request terms.
---

COA requests apply to all group-buy orders, not wholesale, shared wholesale or Testmedaddy. Admin chooses individual orders or opens requests to group-buy order owners with a shared limit. Members supply Client, Sample, Manufacturer and Batch.

**Why:** The user explicitly chose all group-buy orders and wants Admin to organise submissions and collect a separate COA fee.

**How to apply:** Keep this separate from testing-pool named reports, whose opt-in is not proof that a COA fee has been received. Do not alter product-order payments, shipping, credits, balances or refunds for a COA.

An invitation reserves capacity; submitting its details does not reserve a second place. Submitted payment evidence must survive expiry and cannot silently free a place. A late payment for an already expired place requires Admin review and available capacity before confirmation.

**Why:** Public signup and Admin invitations must not oversubscribe the same limited places or lose a member's payment evidence.

**How to apply:** Serialize capacity-changing operations per group buy. Never release or erase paid/evidence-bearing requests as a cleanup action.

An existing COA request retains its original fee and payment terms when it is withdrawn and later reserved again; changing group settings applies to new requests.

**Why:** Re-reserving must not charge more than the member saw on their existing request. A fee change must not silently rewrite a committed quote.

**How to apply:** Preserve request terms independently of current group configuration. Changing COA payment destinations follows the existing Admin step-up boundary; routine notes and receipt confirmations do not need another security prompt.

A completed COA request does not itself mean a certificate file is available.

**Why:** The user explicitly requires notifications not to imply a certificate exists unless one has actually been attached.

**How to apply:** Keep completion wording separate from download availability, including when adding future certificate uploads or changing notification templates.
