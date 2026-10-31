# Addition-order reference rollout

The nullable `orders.addition_display_reference` column and plain named unique
constraint are defined in `src/schema/orders.ts`. Canonical codes and all
financial, fulfilment, supplier and invoice data remain unchanged.

## Managed Replit database

The column and constraint have been applied to the **development** database and
verified against PostgreSQL. Replit Publish compares that development schema
with production and applies the additive schema change before promoting the API.
Republish to make the feature available on the live site.

Before publishing, inspect the schema diff: this feature adds only the nullable
text column and `orders_addition_display_reference_unique` constraint. Existing
rows retain NULL references, which do not conflict with this unique constraint.
Do not delete or overwrite existing order data. Stop if the diff proposes drops,
renames, truncation, or unrelated constraint recreation.

After schema application, verify the column and constraint before using the new
API. If promotion fails, inspect production read-only; do not manually run DDL
against the managed production database.

The API build compiles only. It does not push schema or execute startup DDL.
The old Drizzle migration journal is incomplete and is not the current production
schema authority. Like the existing reshipper-payout rollout, the standalone
`order-addition-references.sql` records the exact additive DDL without adding an
entry to that historical journal or a new production migration runner.

## Non-managed installations

Apply `order-addition-references.sql` through the installation's normal database
migration process **before** starting the new API. It is idempotent and creates
the same named constraint as Drizzle.

The PostgreSQL addition integration suite creates temporary legacy order tables
without the column, runs the SQL twice, verifies nullable uniqueness, performs
ordinary ORM reads and a scoped alias lookup, and creates a separate payable
addition against the upgraded tables. Real order tables remain untouched by that
upgrade test.

## Historical aliases

DDL does not backfill or renumber orders. The application assigns display aliases
on authorised reads or new separate additions. That repair is idempotent,
namespace-locked and bounded to a historical page plus the authorised rows being
returned. Parent labels require matching owner and group. Canonical codes,
payments, addresses, shipping and supplier allocations are never rewritten.
