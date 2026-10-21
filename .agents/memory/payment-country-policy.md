---
name: Payment country eligibility
description: Country restrictions govern joining and ordering, not payments for existing orders.
---

Group-buy allowed/excluded country lists must not restrict payment submissions for an existing order. Account country, shipping country, missing profile country and country-code formatting must not prevent payment.

**Why:** The user explicitly requested no allowed-country restriction on payments after a customer had already sent funds. The previous payment gate also compared expanded country names against ISO-code lists, falsely rejecting eligible destinations.

**How to apply:** Keep country eligibility at joining/ordering. Preserve ownership requirements where applicable, payment-enabled switches, explicit country-leg payment pauses, wallet routing, transaction verification and replay protection. Apply the policy consistently to test amounts, crypto, AnonPay, fiat and combined checkout; do not disable security checks or mark a payment confirmed merely to bypass country eligibility.
