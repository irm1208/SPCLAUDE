# Wholesale Batch-Code Access Design

## Goal

Show Qiyunle inventory batch codes beside products on the Wholesale Order
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

When eligible, the server joins or separately aggregates
`qiyunle_mappings` by `product_id` and returns a new optional field:

```json
{
  "id": "product-id",
  "name": "Product name",
  "batchCodes": ["BP10-0429"]
}
```

Only mappings with `batch_stock > 0` are returned, so codes represent
currently positive-stock inventory under the new Qiyunle sync behavior.
Codes are deduplicated and returned in a stable order. Products without a
positive-stock mapping receive an empty array (or omit the field consistently;
the implementation will choose one response convention and use it everywhere).

For accounts at or below the threshold, the endpoint must not include
`batchCodes` at all, rather than sending the codes and relying on the frontend
to hide them. The order count itself is also not required by the catalogue and
will not be exposed unless the UI needs it.

### Frontend

Update the Wholesale Order product type to accept the optional batch-code list.
When the list is present and non-empty, render a compact `Batch:` row beside
the product information. The existing catalogue, search, quantity controls,
pricing, and checkout behavior remain unchanged for ineligible accounts.

The frontend will not calculate eligibility from its order-history cache. It
will render only the server-authorized field, preventing stale or manipulated
client state from granting access.

## Data flow

1. A wholesale account opens the Wholesale Order page.
2. The page requests the existing wholesale catalogue endpoint.
3. The endpoint authenticates the account and computes the qualifying-order
   count.
4. If the count is greater than five, the endpoint adds current positive-stock
   Qiyunle codes grouped by product.
5. The page renders those codes next to matching products.
6. All other accounts receive the same catalogue fields as before, without
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
   - eligible accounts receive only positive-stock Qiyunle codes;
   - ineligible accounts receive no batch-code field;
   - codes are grouped by product and deduplicated.
3. Add a frontend rendering test or focused UI assertion proving the batch row
   appears only when the server response contains a non-empty authorized list.
4. Run the focused tests, compile the API, build the frontend, restart the
   canonical application workflow, and inspect its logs.

## Scope boundaries

This change does not:

- show batch codes on My Orders or order-detail pages;
- expose lab/CoA batch codes;
- add or edit product batch numbers;
- alter historical order counts or inventory mappings;
- change the Qiyunle sync or remove existing database records.