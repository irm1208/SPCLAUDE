export type OrderReferenceData = {
  code?: string | null;
  displayReference?: string | null;
  isAddition?: boolean;
  additionParent?: { id: string; reference: string } | null;
};

/** A display alias never replaces code/id in requests, payments, exports or documents. */
export function orderReference(order: OrderReferenceData): string {
  if (order.displayReference) return order.displayReference;
  return /^ADD-/i.test(order.code ?? "") ? "Addition" : order.code || "Order";
}
