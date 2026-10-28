# Multi-vendor wholesale schema rollout

The migration is `0021_multi_vendor_wholesale.sql`; its entry is recorded in
`meta/_journal.json`. All six new columns are nullable and have no defaults.
The migration deliberately performs no backfill, data updates, table recreation,
constraint replacement, or historical order repricing.

## Replit

Keep schema ownership with Drizzle and Replit Publish. The development database
must contain these applied columns before publishing:

| Table | Column | Type |
| --- | --- | --- |
| products | wholesale_vendor_id | text |
| products | wholesale_cost | numeric(10,2) |
| orders | wholesale_vendor_id | text |
| order_line_items | vendor_id | text |
| wholesale_shares | vendor_shipping_breakdown | jsonb |
| wholesale_share_members | vendor_shipping_shares | jsonb |

These fields are defined in `lib/db/src/schema/`. Publishing promotes the applied
development schema. Inspect the proposed database changes in Publish; they should
be additive for these fields. Verify in a deployment preview before directing
customers to the update.

Do not add SQL to `start.sh`, the API bootstrap, or the build script. Do not run
older SQL files or recreate foreign keys to address unrelated schema drift.

Official reference:
https://docs.replit.com/features/data-and-storage/development-and-production

## Installations without managed schema promotion

Apply only `0021_multi_vendor_wholesale.sql` against the intended database
**before** starting the updated API. Use the installation's normal database
administration tooling and credentials; this repository does not run the SQL
automatically or select a production connection.

For example, with an explicitly chosen connection in `DATABASE_URL`:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction \
  -f lib/db/drizzle/0021_multi_vendor_wholesale.sql
```

This example is a manual rollout command, not a publish/build/startup hook.
`ADD COLUMN IF NOT EXISTS` makes rerunning this additive migration safe.

## Verification

`vendor-portal.integration.test.ts` applies the file twice inside an isolated,
rolled-back PostgreSQL schema representing an older installation. It checks
the six columns, nullable types and unchanged legacy rows. The remaining tests
exercise shared-order locking, independent vendor shipping, supplier submission,
cost-only exports and private member shipment responses on the migrated schema.

Rollback application code if needed; leave these nullable columns in place.
Do not drop columns containing new vendor snapshots as an automatic rollback.
