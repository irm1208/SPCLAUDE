# Admin Manual Crypto Refund Completion

## Goal

Allow an Admin to manually complete a crypto group-buy refund when automatic blockchain verification is unavailable, stuck, or faulty.

## Permissions

- Admin only, enforced by the API.
- Owning organisers keep the normal automatic verification flow and cannot see or call the override.

## Required input

- A valid outgoing refund transaction ID.
- A non-empty bounded reason explaining why verification is being bypassed.

## Safety and lifecycle

- Accept requested, verification-failed, and stuck-verifying refunds.
- Preserve transaction-ID replay protection and uniqueness.
- Lock the same refund, order, group-buy, account, and attempt records used by normal completion.
- Revalidate refund/order/payment terminal state and crypto configuration under lock.
- Supersede any active verification attempt so a delayed verifier cannot undo manual completion.
- Atomically mark the refund completed and the order cancelled/refunded.
- Record the Admin actor, manual-override source, transaction ID, and reason in the audit transition.
- Enqueue the normal completed customer notification with the outgoing TXID.
- Repeating the same completed transaction is idempotent; a different transaction ID is rejected.

## Interface

- Keep `Verify outgoing transfer` as the primary action.
- Admin cards also offer `Mark complete manually`.
- Manual completion requires the outgoing TXID field and reveals a required reason field plus a clear verification-bypass warning.
- Organiser cards never render the manual controls.

## Testing

- Service tests prove no blockchain verifier is called and every completion invariant is retained.
- Route tests prove Admin access, strict request fields, and no organiser endpoint.
- UI tests prove Admin-only controls, required inputs, request payload, and unchanged automatic verification.