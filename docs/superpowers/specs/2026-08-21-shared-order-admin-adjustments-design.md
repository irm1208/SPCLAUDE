# Shared-order admin adjustments

## Goal

Allow an authenticated admin to correct a shared order by changing a member's
items, changing the total vendor-shipping amount, or adding a required
per-member fee with an explanation.

## Safety rules

- Admin controls reuse the existing shared-order admin override and audit path.
- Open shares and locked shares whose materialised member orders are all unpaid
  may be adjusted.
- Any confirmed/test-confirmed/paid-like member order blocks the entire
  adjustment, because changing the shared split would otherwise alter money
  already paid.
- Item, shipping, fee, line-item, and total changes happen in one transaction.
- A positive required fee must include an admin-written explanation.
- The notification is sent after commit and includes the share, amount, message,
  and revised amount due. Notification failures do not roll back a committed
  correction.

## Admin experience

The shared-order detail panel receives an “Adjust items & shipping” area. The
admin chooses a member, edits catalogue quantities, optionally sets a total
vendor-shipping override, and optionally enters an additional required fee and
message. A preview shows all affected member totals. Saving requires a strong
confirmation warning.

## Data flow

The API validates the share/member/product inputs, calculates member subtotals
and shipping allocations with the existing vendor/split rules, and updates
draft member data plus materialised orders and line items atomically. The
additional fee is stored with the member adjustment data so it remains visible
and is included if an open share is later locked. After commit, the existing
Telegram notification/logging path informs each affected member.

## Verification

- API production compilation
- Frontend production build
- Vitest coverage for validation, locked/unpaid gating, total recalculation,
  and notification payload behavior
- `git diff --check`