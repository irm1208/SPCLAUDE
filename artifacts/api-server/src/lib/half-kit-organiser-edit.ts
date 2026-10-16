import { HalfKitError } from "./half-kit-rules";

/** Adapt the organiser's sparse ID-based form to the additive order contract. */
export function organiserHalfKitEditInput(order: any, lines: any[], body: any) {
  const allowed = new Set(["lineItems", "adminNotes", "status", "paymentStatus",
    "trackingNumber", "trackingNumbers", "paymentTxHash", "paymentTxHashes"]);
  if (Object.keys(body).some(key => !allowed.has(key))) {
    throw new HalfKitError("Unsupported combined edit. Change products and other order fields separately.");
  }
  for (const key of ["status", "paymentStatus"] as const) {
    if (body[key] !== undefined && body[key] !== order[key]) {
      throw new HalfKitError("Save payment and status changes separately before adding products.");
    }
  }
  for (const [plural, singular] of [["trackingNumbers", "trackingNumber"], ["paymentTxHashes", "paymentTxHash"]]) {
    const before = order[plural]?.length ? order[plural] : order[singular] ? [order[singular]] : [];
    const after = body[plural] !== undefined ? body[plural] : body[singular] !== undefined
      ? body[singular] ? [body[singular]] : [] : before;
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      throw new HalfKitError("Save tracking and payment details separately before adding products.");
    }
  }
  if (!Array.isArray(body.lineItems) || !body.lineItems.length) {
    throw new HalfKitError("No product quantities supplied.", 400);
  }
  const seen = new Set<string>();
  const additions: { productId: string; quantity: unknown }[] = [];
  for (const item of body.lineItems) {
    if (item.id) {
      const line = lines.find(line => line.id === item.id);
      if (!line || seen.has(item.id) || (item.productId && item.productId !== line.productId)) {
        throw new HalfKitError("Invalid or duplicate order line.", 400);
      }
      seen.add(item.id);
    } else if (item.productId) additions.push({ productId: item.productId, quantity: item.quantity });
    else throw new HalfKitError("Invalid order line.", 400);
  }
  return {
    deliveryMethodId: order.deliveryMethodId, tip: order.tip,
    testingContribution: order.testingContribution, directShippingRequested: order.directShippingRequested,
    notes: order.notes,
    lineItems: [
      ...lines.map(line => {
        const change = body.lineItems.find((item: any) => item.id === line.id);
        return { productId: line.productId, quantity: change ? change.quantity : line.quantity };
      }),
      ...additions,
    ],
  };
}
