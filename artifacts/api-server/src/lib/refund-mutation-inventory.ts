/**
 * Source inventory for order-owned writes.  This is deliberately explicit:
 * adding a new ordersTable/orderLineItemsTable update or delete requires either
 * adding its classification here and protecting it, or the inventory test
 * fails before review.
 */
export const REFUND_MUTATION_INVENTORY = {
  "src/index.ts": { orders: 1, orderInserts: 0, lineItems: 0, inserts: 0, classification: "guarded" },
  "src/lib/gb-legs-sync.ts": { orders: 1, orderInserts: 0, lineItems: 0, inserts: 0, classification: "guarded" },
  "src/lib/group-buy-refund.ts": { orders: 2, orderInserts: 0, lineItems: 0, inserts: 0, classification: "processor_exemption" },
  "src/lib/order-payment-auto-verify.ts": { orders: 3, orderInserts: 0, lineItems: 0, inserts: 0, classification: "guarded" },
  "src/lib/security-incident-remediation.ts": { orders: 1, orderInserts: 0, lineItems: 0, inserts: 0, classification: "guarded" },
  "src/lib/tracking-auto-refresh.ts": { orders: 3, orderInserts: 0, lineItems: 0, inserts: 0, classification: "guarded" },
  "src/lib/wholesale-organiser-payment-confirmation.ts": { orders: 1, orderInserts: 0, lineItems: 0, inserts: 0, classification: "guarded" },
  "src/routes/account.ts": { orders: 22, orderInserts: 0, lineItems: 1, inserts: 0, classification: "guarded" },
  "src/routes/admin-dispatch.ts": { orders: 6, orderInserts: 0, lineItems: 0, inserts: 0, classification: "guarded" },
  "src/routes/admin.ts": { orders: 28, orderInserts: 3, lineItems: 3, inserts: 5, classification: "guarded" },
  "src/routes/gb-country-legs.ts": { orders: 4, orderInserts: 0, lineItems: 0, inserts: 0, classification: "guarded" },
  "src/routes/group-buys-admin.ts": { orders: 11, orderInserts: 0, lineItems: 0, inserts: 0, classification: "guarded" },
  "src/routes/orders.ts": { orders: 13, orderInserts: 1, lineItems: 2, inserts: 3, classification: "guarded" },
  "src/routes/organiser-reshippers.ts": { orders: 2, orderInserts: 0, lineItems: 0, inserts: 0, classification: "guarded" },
  "src/routes/organiser.ts": { orders: 13, orderInserts: 2, lineItems: 4, inserts: 4, classification: "guarded" },
  "src/routes/payments.ts": { orders: 17, orderInserts: 0, lineItems: 0, inserts: 0, classification: "guarded" },
  "src/routes/reshipper-admin.ts": { orders: 4, orderInserts: 0, lineItems: 0, inserts: 0, classification: "guarded" },
  "src/routes/reshipper.ts": { orders: 4, orderInserts: 0, lineItems: 0, inserts: 0, classification: "guarded" },
  "src/routes/wholesale-shares.ts": { orders: 8, orderInserts: 1, lineItems: 2, inserts: 3, classification: "guarded" },
} as const;

export type RefundMutationClassification =
  typeof REFUND_MUTATION_INVENTORY[keyof typeof REFUND_MUTATION_INVENTORY]["classification"];