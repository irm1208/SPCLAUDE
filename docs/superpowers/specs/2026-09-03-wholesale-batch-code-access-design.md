# Wholesale Batch-Code Access Design

## Goal

Show one Qiyunle inventory batch code beside products on the Wholesale Order
catalogue only for accounts with more than five qualifying wholesale orders.
Accounts with five or fewer qualifying orders must receive the normal catalogue
without batch-code data.

The batch identifier is the Qiyunle inventory code, such as `BP10-0429`.

## Eligibility rule

Eligibility is calculated on the server for the authenticated account. A
qualifying order is an order that:

- belongs to the current account, using the same normalized account identity
  used by the account order routes;
- has `orderType` equal to `wholesale` or `wholesale_shared`;
- is not soft-deleted;
- is not cancelled; and
- has a confirmed payment (`confirmed` or `test_confirmed`) or has reached the
  `Completed` order status.

An account is eligible only when its qualifying-order count is greater than
five (`count > 5`). The count is based on order rows, so a materialised member
order from a shared wholesale order counts as that member's wholesale order.

## Recommended architecture

### Backend

Extend `GET /api/wholesale/products` to require an authenticated wholesale
account and enrich its response only when that account passes the threshold.
The existing product catalogue remains the source of product names and
wholesale prices.

When eligible, the server selects one `qiyunle_mappings` row per product and
returns a new optional field:

```json
{
  "id": "product-id",
  "name": "Product name",
  "batchCode": "BP10-0429"
}
```

Only mappings with `batch_stock > 0` are candidates, so the selected code
represents currently positive-stock inventory under the new Qiyunle sync
behavior. The server selects the candidate with the highest stock count. If
multiple candidates have the same highest stock count, it selects the one with
the newest parseable date suffix in the Qiyunle code. A stable code ordering is
the final tie-breaker. Products without a positive-stock mapping omit the
field.

To keep `batch_stock` current while still excluding zero and negative source
rows, each successful full Qiyunle sync must reconcile mapping availability:

1. collect the batch codes present in the complete positive-stock source feed;
2. mark mapped codes absent from that feed as unavailable by setting
   `batch_stock` to `null`; and
3. write the positive stock count for every mapped code present in the feed.

The reconciliation happens only after the full source fetch succeeds, so a
network or authentication failure cannot clear known stock. Zero and negative
source quantities are still not stored or processed as available inventory.

For accounts at or below the threshold, the endpoint must not include
`batchCode` at all, rather than sending the code and relying on the frontend
to hide them. The order count itself is also not required by the catalogue and
will not be exposed unless the UI needs it.

### Frontend

Update the Wholesale Order product type to accept the optional batch code.
When the code is present and non-empty, render a compact `Batch:` row beside
the product information. The existing catalogue, search, quantity controls,
pricing, and checkout behavior remain unchanged for ineligible accounts.

The frontend will not calculate eligibility from its order-history cache. It
will render only the server-authorized field, preventing stale or manipulated
client state from granting access.

## Data flow

1. A successful Qiyunle sync reconciles `batch_stock`, clearing stale mappings
   to `null` and retaining only current positive-stock values.
2. A wholesale account opens the Wholesale Order page.
3. The page requests the existing wholesale catalogue endpoint.
4. The endpoint authenticates the account and computes the qualifying-order
   count.
5. If the count is greater than five, the endpoint selects the highest-stock
   positive Qiyunle batch per product, using the newest date suffix to break
   stock-count ties.
6. The page renders that one code next to each matching product.
7. All other accounts receive the same catalogue fields as before, without
   batch-code data.

No database migration is needed. Existing product, order, and Qiyunle mapping
tables already contain the required data.

## Security and error handling

- Authorization is enforced server-side on every catalogue request.
- The endpoint must never use a client-provided username, order count, or
  eligibility flag.
- If the batch mapping query fails, the catalogue request should fail
  explicitly rather than silently granting access or returning partial
  authorization data.
- Missing positive-stock mappings are a normal empty state and should not
  prevent the catalogue from loading.
- Existing non-wholesale callers of the catalogue endpoint must be checked
  before tightening its authentication requirement; the Wholesale Order page
  already requires a wholesale account.

## Testing plan

1. Add a pure eligibility test covering the boundary:
   - five qualifying orders: not eligible;
   - six qualifying orders: eligible;
   - paid and test-confirmed orders count;
   - completed orders count;
   - unpaid, failed, cancelled, deleted, and non-wholesale orders do not
     count.
2. Add backend response tests proving:
   - eligible accounts receive only one positive-stock Qiyunle code per
     product;
   - ineligible accounts receive no batch-code field;
   - the highest stock count wins;
   - the newest batch-date suffix breaks equal-stock ties;
   - products without positive-stock mappings receive no batch-code field.
3. Add sync reconciliation tests proving:
   - mapped codes absent from a successful positive-stock feed are cleared to
     `null`;
   - current positive batches retain their positive count;
   - a failed source fetch cannot clear mapping stock.
4. Add a frontend rendering test or focused UI assertion proving the batch row
   appears only when the server response contains an authorized batch code.
5. Run the focused tests, compile the API, build the frontend, restart the
   canonical application workflow, and inspect its logs.

## Scope boundaries

This change does not:

- show batch codes on My Orders or order-detail pages;
- expose lab/CoA batch codes;
- add or edit product batch numbers;
- alter historical order counts or inventory mappings;
- store zero or negative Qiyunle stock values;
- delete existing Qiyunle mapping records.
