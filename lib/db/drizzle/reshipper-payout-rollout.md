# Reshipper payout identity rollout

The nullable `accounts.reshipper_payout_identity` column and its named unique
constraint are defined in `src/schema/accounts.ts`. Existing accounts retain
their usernames and all other data; payout identities are allocated lazily.
No financial balances are backfilled or reconciled during schema rollout.

## This Replit installation

Schema ownership belongs to Replit Publish. The column and constraint have
already been applied to the **development** database. Publishing promotes that
applied development schema to production before promoting the new app.

Official platform documentation:
https://docs.replit.com/features/data-and-storage/development-and-production

The API build intentionally compiles only; it must not run `drizzle-kit push`,
`drizzle-kit migrate`, or startup DDL against production. This repository's old
migration journal is not the authoritative current production schema.
The standalone `reshipper-payout-identity.sql` records the exact, additive DDL
for review and non-managed installations; it is not added to the incomplete
historical journal and is not an API-startup migration.

Before publishing, inspect the managed schema diff. For this feature it should
only add the nullable column and its unique constraint. Stop and investigate
any proposed drop, truncate, rename, or unrelated constraint recreation.
After publishing, confirm the column and constraint exist before using payouts.
If publishing fails after schema application, check production read-only before
retrying; do not manually replay production DDL.

## Non-managed installations

Apply `reshipper-payout-identity.sql` through the installation's normal database
migration process **before** starting the new application. It is idempotent,
preserves existing accounts and creates the same named constraint as Drizzle.
The real PostgreSQL integration test runs this SQL twice against a temporary
legacy accounts table and verifies null preservation and uniqueness.
