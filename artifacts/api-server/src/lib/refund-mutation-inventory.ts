/**
 * Source inventory for order-owned writes.  This is deliberately explicit:
 * adding a new ordersTable/orderLineItemsTable update or delete requires either
 * adding its classification here and protecting it, or the inventory test
 * fails before review.
 */
export const REFUND_MUTATION_INVENTORY = {
  "src/index.ts": { orders: 4, orderInserts: 0, lineItems: 0, inserts: 0, classification: "guarded", enforcementMode: "locked_assert" },
  "src/lib/gb-legs-sync.ts": { orders: 1, orderInserts: 0, lineItems: 0, inserts: 0, classification: "guarded", enforcementMode: "returning_throw" },
  "src/lib/group-buy-refund.ts": { orders: 2, orderInserts: 0, lineItems: 0, inserts: 0, classification: "processor_exemption", enforcementMode: "processor_exempt" },
  "src/lib/order-payment-auto-verify.ts": { orders: 3, orderInserts: 0, lineItems: 0, inserts: 0, classification: "guarded", enforcementMode: "returning_throw" },
  // PIN replacement is security-only credential neutralisation: it cannot
  // alter financial/fulfilment state and must not be blocked by a refund.
  "src/lib/security-incident-remediation.ts": { orders: 1, orderInserts: 0, lineItems: 0, inserts: 0, classification: "security_only_exempt", enforcementMode: "processor_exempt" },
  "src/lib/tracking-auto-refresh.ts": { orders: 3, orderInserts: 0, lineItems: 0, inserts: 0, classification: "guarded", enforcementMode: "returning_throw" },
  "src/lib/wholesale-organiser-payment-confirmation.ts": { orders: 1, orderInserts: 0, lineItems: 0, inserts: 0, classification: "guarded", enforcementMode: "returning_throw" },
  "src/routes/account.ts": { orders: 24, orderInserts: 0, lineItems: 1, inserts: 0, classification: "guarded", enforcementMode: "locked_assert" },
  "src/routes/admin-dispatch.ts": { orders: 6, orderInserts: 0, lineItems: 0, inserts: 0, classification: "guarded", enforcementMode: "locked_assert" },
  "src/routes/admin.ts": { orders: 29, orderInserts: 3, lineItems: 3, inserts: 5, classification: "guarded", enforcementMode: "locked_assert" },
  "src/routes/gb-country-legs.ts": { orders: 4, orderInserts: 0, lineItems: 0, inserts: 0, classification: "guarded", enforcementMode: "locked_assert" },
  "src/routes/group-buys-admin.ts": { orders: 11, orderInserts: 0, lineItems: 0, inserts: 0, classification: "guarded", enforcementMode: "locked_assert" },
  "src/routes/orders.ts": { orders: 13, orderInserts: 1, lineItems: 2, inserts: 3, classification: "guarded", enforcementMode: "locked_assert" },
  "src/routes/organiser-reshippers.ts": { orders: 2, orderInserts: 0, lineItems: 0, inserts: 0, classification: "guarded", enforcementMode: "locked_assert" },
  "src/routes/organiser.ts": { orders: 13, orderInserts: 2, lineItems: 4, inserts: 4, classification: "guarded", enforcementMode: "locked_assert" },
  "src/routes/payments.ts": { orders: 17, orderInserts: 0, lineItems: 0, inserts: 0, classification: "guarded", enforcementMode: "locked_assert" },
  "src/routes/reshipper-admin.ts": { orders: 4, orderInserts: 0, lineItems: 0, inserts: 0, classification: "guarded", enforcementMode: "locked_assert" },
  "src/routes/reshipper.ts": { orders: 4, orderInserts: 0, lineItems: 0, inserts: 0, classification: "guarded", enforcementMode: "locked_assert" },
  "src/routes/wholesale-shares.ts": { orders: 8, orderInserts: 1, lineItems: 2, inserts: 3, classification: "guarded", enforcementMode: "locked_assert" },
} as const;

/**
 * A source-level manifest is intentionally separate from the aggregate file
 * counts above.  It lets the inventory test reject a newly added mutation
 * which has no RETURNING clause unless the file is explicitly reviewed as a
 * locked/asserting writer.  The shared predicate is the source anchor for
 * every entry; transaction wrappers and assertion helpers are checked by the
 * multi-order inventory below.
 */
export const REFUND_LOCKED_ASSERT_MANIFEST = [
  "src/index.ts",
  "src/lib/security-incident-remediation.ts",
  "src/routes/account.ts",
  "src/routes/admin-dispatch.ts",
  "src/routes/admin.ts",
  "src/routes/gb-country-legs.ts",
  "src/routes/group-buys-admin.ts",
  "src/routes/orders.ts",
  "src/routes/organiser-reshippers.ts",
  "src/routes/organiser.ts",
  "src/routes/payments.ts",
  "src/routes/reshipper-admin.ts",
  "src/routes/reshipper.ts",
  "src/routes/wholesale-shares.ts",
] as const;

/**
 * Multi-order writers receive a stronger classification than ordinary
 * per-order writers: the whole transaction is rejected when any sorted,
 * locked target has an active refund.  Processor-owned completion writes are
 * intentionally absent because they are the refund lifecycle itself.
 */
export const REFUND_MULTI_ORDER_INVENTORY = [
  { source: "src/lib/gb-legs-sync.ts", handler: "background country-leg fanout", mode: "assertNoActiveRefunds before batch" },
  { source: "src/lib/order-payment-auto-verify.ts", handler: "background payment verification batch", mode: "assertNoActiveRefunds before batch" },
  { source: "src/lib/tracking-auto-refresh.ts", handler: "background tracking refresh batch", mode: "assertNoActiveRefunds before batch" },
  { source: "src/routes/account.ts", handler: "account deletion order fanout", mode: "account lock then assertNoActiveRefunds in transaction" },
  { source: "src/routes/gb-country-legs.ts", handler: "assign country legs fanout", mode: "assertNoActiveRefunds in transaction" },
  { source: "src/routes/admin-dispatch.ts", handler: "dispatch confirm/undispatch", mode: "assertNoActiveRefunds before parcel writes" },
  { source: "src/routes/admin-dispatch.ts", handler: "dispatch reattribute/mark/archive", mode: "withRefundMutationGuard" },
  { source: "src/routes/group-buys-admin.ts", handler: "bulk-route", mode: "withRefundMutationGuard" },
  { source: "src/routes/group-buys-admin.ts", handler: "fs3-submit", mode: "assertNoActiveRefunds in transaction" },
  { source: "src/routes/admin.ts", handler: "bulk delete", mode: "withRefundMutationGuard" },
  { source: "src/routes/admin.ts", handler: "bulk routing", mode: "assertNoActiveRefunds in transaction" },
  { source: "src/routes/admin.ts", handler: "bulk add product", mode: "withRefundMutationGuard" },
  { source: "src/routes/admin.ts", handler: "shipping split reconciliation", mode: "withRefundMutationGuard" },
  { source: "src/routes/admin.ts", handler: "bulk out-of-stock reconciliation", mode: "assertNoActiveRefunds in transaction" },
  { source: "src/routes/organiser.ts", handler: "bulk add product", mode: "withRefundMutationGuard" },
  { source: "src/routes/organiser.ts", handler: "apply international shipping", mode: "withRefundMutationGuard" },
  { source: "src/routes/reshipper.ts", handler: "claim-bulk", mode: "withRefundMutationGuard" },
  { source: "src/routes/wholesale-shares.ts", handler: "cancel share members", mode: "assertNoActiveRefunds in transaction" },
] as const;

export const REFUND_RAW_MUTATION_INVENTORY = [
  { source: "src/routes/admin.ts", operation: "UPDATE orders", classification: "identity_rename_guarded" },
  { source: "src/routes/admin.ts", operation: "UPDATE orders", classification: "identity_rename_guarded" },
  { source: "src/routes/gb-testing.ts", operation: "UPDATE orders", classification: "guarded", enforcementMode: "returning_throw" },
] as const;

export const REFUND_ORDER_INSERT_INVENTORY = [
  { source: "src/routes/orders.ts", classification: "new_order_or_guarded_parent" },
  { source: "src/routes/organiser.ts", classification: "existing_order_guarded" },
  { source: "src/routes/admin.ts", classification: "existing_order_guarded" },
  { source: "src/routes/wholesale-shares.ts", classification: "new_order_or_guarded_parent" },
] as const;

export type RefundMutationClassification =
  typeof REFUND_MUTATION_INVENTORY[keyof typeof REFUND_MUTATION_INVENTORY]["classification"];