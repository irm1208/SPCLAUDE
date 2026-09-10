# Admin Shared-Order Force Lock and Organiser Wallet Editing

## Goal

Give administrators two explicit controls in the backend Shared Orders tab:

1. Force an open shared order to lock using its current member and item state,
   even when members are unconfirmed or have no items.
2. View and edit the organiser crypto wallets that members use to pay the
   organiser.

Normal organiser and member behavior must remain unchanged.

## Force-lock design

### API

Add a dedicated admin-only endpoint:

`POST /api/admin/wholesale-shares/:id/force-lock`

The endpoint uses the existing admin session/CSRF or legacy admin-secret
authentication boundary. It must not be callable through account or organiser
authentication.

The endpoint calls the existing transactional shared-order lock service in an
explicit admin force mode. It must not duplicate order materialisation logic in
the route.

### Force-mode behavior

Force mode bypasses only member-readiness checks:

- Members do not need to have confirmed their drafts.
- Members with no items do not prevent the lock.
- Existing member records remain attached to the shared order.
- Materialised orders and line items follow the existing lock workflow's rules
  for the members currently present.

Force mode retains structural and financial safeguards:

- The share must still be open.
- The selected delivery member and required delivery address must still be
  valid.
- Products, quantities, pricing, shipping calculations, and configured maximum
  caps must still validate.
- Conditional status updates and row locks must prevent concurrent
  lock/cancel/update races.
- Existing payment-started orders must not have their totals reduced or their
  balance-payment state replaced.
- Any failure rolls back the entire lock transaction.

The ordinary organiser lock endpoint continues requiring member confirmation
and the configured minimum items/kits per member.

### Admin interface

For an open order, replace the ambiguous backend `Lock` action with a clearly
privileged `Force lock` action. Before sending the request, show a confirmation
that states:

- unconfirmed members will be included;
- members with empty baskets will not block locking;
- current item, shipping, fee, and payment values will be materialised.

Disable the action while it is running. On success, refresh both the shared-order
list and expanded detail. On failure, show the server error without changing the
displayed state.

### Audit trail

Write a dedicated warning-level audit event containing the share ID, admin
identity supplied by the authenticated admin context, member count, empty-member
count, unconfirmed-member count, total kits, and calculated shipping total.
Do not record wallet addresses or other payment secrets in the audit metadata.

## Organiser wallet editor

### Data and API

The editable value is `leadCryptoOptions`: the organiser-owned crypto payment
destinations members use to pay the organiser. It does not include or modify the
platform/admin wallets used for the organiser's upstream payment.

Expose the current organiser wallet options in the existing admin shared-order
detail response. Add a dedicated admin-only update endpoint:

`PUT /api/admin/wholesale-shares/:id/organiser-wallets`

The request contains the complete desired wallet-option list. Each entry has:

- currency;
- supported network;
- wallet address.

The server applies the same normalization, supported-network validation,
length limits, and empty-list behavior as the organiser-facing wallet workflow.
The route must reuse a shared validator/update service rather than implementing a
second set of rules.

Admins may edit wallets while the share is open or locked. Submitted or
cancelled shares are read-only because members may already have acted on the
recorded destinations.

The update must not change order totals, member fee state, platform payment
routing, or organiser-payment confirmation.

### Admin interface

Add an `Organiser payment wallets` section to each expanded shared-order
settings panel:

- Display every saved wallet's currency, network, and full address to the
  authenticated admin.
- Allow rows to be added and removed.
- Use the existing supported currency/network choices where available.
- Save the entire wallet list through the dedicated admin endpoint.
- Show explicit loading, success, validation-error, and read-only states.
- Refresh the expanded detail after a successful save.

The save confirmation must identify the shared order and warn that members will
use the new destinations for future payments.

### Audit trail

Write an admin wallet-change audit event with the share ID and before/after
wallet descriptors limited to currency and network. Never include full wallet
addresses in logs.

## Error handling and security

- Both new endpoints are registered under the existing `/admin` authorization
  boundary.
- Enabled 2FA mode requires the admin session and admin CSRF header.
- Disabled mode requires the legacy admin secret.
- No account-session or View-As request can invoke either endpoint.
- Return 404 for unknown shares, 409 for incompatible share states or
  concurrency conflicts, and 400 for invalid wallet input or structural lock
  validation.
- The frontend displays the returned message and never treats a failed mutation
  as successful.

## Testing

### Backend

- A normal organiser lock still rejects unconfirmed or empty members.
- The admin force endpoint locks the same open share with unconfirmed and empty
  members.
- Force lock still rejects invalid delivery data, invalid products/caps,
  non-open state, concurrent transitions, and protected payment decreases.
- Account and View-As sessions cannot call either admin endpoint.
- Admin session CSRF and legacy-secret modes both authenticate correctly.
- Wallet reads return organiser wallets but do not conflate them with platform
  wallets.
- Wallet updates validate and normalize entries and reject submitted/cancelled
  shares.
- Wallet updates do not alter totals, fee-paid flags, or platform payment data.
- Audit payloads contain no full wallet addresses.

### Frontend

- The backend Shared Orders tab uses the dedicated force-lock endpoint.
- The warning clearly describes the override.
- Successful mutations refresh list and detail state.
- Wallet rows initialize from the current server response and can be added,
  edited, removed, and saved.
- Error and read-only states render correctly.

## Out of scope

- Changing organiser/member lock behavior.
- Editing platform/admin payment wallets.
- Automatically marking members as confirmed.
- Force-locking submitted, cancelled, or already locked shares.
- Weakening CSRF, payment-integrity, concurrency, delivery, or pricing checks.