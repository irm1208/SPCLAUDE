# Group-buy organiser reassignment

## Goal

Allow an authenticated admin to assign any group buy to an approved organiser, including transferring a group buy from one organiser to another. This is intended to support group buys created by Admin as well as later ownership transfers.

## Design

- Add an admin-only `PATCH /api/admin/organiser-group-buys/:id/organiser` endpoint.
- Accept `{ organiserUsername: string | null }`; `null` returns the group buy to Admin ownership.
- Normalize the submitted username by trimming an optional `@`, then resolve the account case-insensitively.
- Reject missing accounts and accounts whose `organiserStatus` is not `approved`.
- Update only `group_buys.organiser_id`; orders, members, products, payment settings, and other group-buy settings remain unchanged.
- Write an organiser audit event containing the old and new organiser values and the group-buy identity.
- Return the updated group-buy id, name, and organiser.
- Include admin-owned group buys in the admin organiser group-buy list so they can be assigned from the same screen; existing organiser-specific actions continue to reject unowned group buys.

## Admin UI

- In the approved-organiser group-buy list, add an `Assign organiser`/`Change organiser` control.
- Load approved organiser accounts already available to the admin organiser page.
- Include an `Admin (unassigned)` option so ownership can be cleared.
- Show save/loading/error states and update the local group-buy row from the response.

## Error handling and safety

- The endpoint requires the existing admin authentication mechanism.
- A missing group buy returns 404.
- Invalid or unapproved organiser usernames return 400.
- The operation is a single database update followed by the existing audit-log write; no related business records are mutated.

## Tests

- Route-level source/behavior coverage verifies approved-organiser validation, null assignment, and preservation of unrelated settings.
- Frontend source coverage verifies the reassignment endpoint and selector are present.