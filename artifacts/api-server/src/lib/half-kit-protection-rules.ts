type Role = "member" | "admin" | "organiser";
export type HalfKitLegacyPlan = {
  kind: "order" | "group" | "bulk"; orderId?: string; groupId?: string; role: Role; block: boolean; settings?: boolean; refund?: boolean;
};
const financialFields = [
  "lineItems", "productSubtotal", "grandTotal", "deliveryMethodId", "deliveryPrice", "customShipping",
  "vendorShipping", "tip", "testingContribution", "adminFee", "adminAdjustmentFee", "kitFees",
  "organiserFee", "couponCode", "couponDiscount", "creditsApplied", "groupBuyId", "telegramUsername",
  "shippingCountry", "directShippingRequested", "reshipperUsername", "routingType", "amountDue", "clearBalance",
];
export function halfKitLegacyMutation(method: string, path: string, body: Record<string, unknown> = {}): HalfKitLegacyPlan | null {
  try { path = decodeURIComponent(path); } catch { return null; } // Express rejects malformed encodings.
  const lower = path.toLowerCase();
  if (lower.includes("/half-kit-offers")) return null;
  const role: Role = lower.startsWith("/admin/") ? "admin" : lower.startsWith("/organiser/") ? "organiser" : "member";
  if (role === "admin" && lower.includes("credit") && typeof body.orderId === "string") {
    return { kind: "order", orderId: body.orderId, role, block: true };
  }
  let match = path.match(/^\/orders\/([^/]+)$/i);
  // PUT delegates to a claim-preserving additive edit in the authenticated handler.
  // Keep the mutex: it serializes edits against claims, release and payment checks.
  if (match && ["PUT", "DELETE"].includes(method)) return { kind: "order", orderId: match[1], role, block: false };
  if (method === "POST" && lower === "/orders" && typeof body.additionOfOrderId === "string") {
    return { kind: "order", orderId: body.additionOfOrderId, role, block: false };
  }
  // Hold the same monetary mutex throughout external payment verification, including status GETs.
  match = path.match(/^\/(?:payments|account\/orders)\/([^/]+)/i)
    || path.match(/^\/orders\/([^/]+)\/(?:confirm-fiat|payment-screenshot|pay|submit-test|generate-test|init-anonpay|confirm-anonpay|anonpay-status|lock-usdt-rate)/i);
  if (match) return { kind: "order", orderId: match[1], role: "member", block: false,
    ...(lower.endsWith("/refund") ? { refund: true } : {}) };
  match = path.match(/^\/(admin|organiser)\/(?:group-buys\/([^/]+)\/)?orders\/([^/]+)(?:\/([^/]+))?$/i);
  if (match && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const suffix = match[4]?.toLowerCase();
    match[3] = ["mark-oos", "unmark-oos", "apply-intl-shipping"].includes(match[3].toLowerCase())
      || match[3].toLowerCase().startsWith("bulk-") ? match[3].toLowerCase() : match[3];
    const destructive = ["line-items", "line-items-draft", "convert-to-wholesale", "routing", "route", "country-leg", "reset-test-payment"];
    const bulk = ["mark-oos", "unmark-oos", "bulk-add-product", "bulk-update", "bulk-edit"];
    if (match[3] === "apply-intl-shipping") return { kind: "bulk", groupId: match[2], role, block: false };
    if (bulk.includes(match[3]) || match[3].startsWith("bulk-")) return {
      kind: "bulk", ...(match[2] ? { groupId: match[2] } : {}), role,
      block: bulk.includes(match[3]) || financialFields.some(key => Object.prototype.hasOwnProperty.call(body, key)),
    };
    const financial = financialFields.some(key => Object.prototype.hasOwnProperty.call(body, key))
      || (body.paymentStatus !== undefined && body.paymentStatus !== "confirmed");
    const refund = suffix?.includes("refund") ?? false;
    // The authorised organiser handler preserves active claims for item-only
    // additions. Other monetary fields must still be rejected here.
    if (role === "organiser" && match[2] && !suffix && method === "PATCH"
      && Array.isArray(body.lineItems) && body.lineItems.length > 0
      && !financialFields.some(key => key !== "lineItems" && Object.prototype.hasOwnProperty.call(body, key))) {
      return { kind: "order", orderId: match[3], groupId: match[2], role, block: false };
    }
    if (suffix && !destructive.includes(suffix) && suffix !== "restore" && !refund
      && !/payment|balance|tracking|test/.test(suffix)) return null;
    return { kind: "order", orderId: match[3], ...(match[2] ? { groupId: match[2] } : {}), role,
      block: method !== "DELETE" && (destructive.includes(suffix ?? "") || financial || suffix === "restore"),
      ...(refund ? { refund: true } : {}),
    };
  }
  match = path.match(/^\/(?:admin|organiser)\/group-buys\/([^/]+)(?:\/(.*))?$/i);
  if (match && ["POST", "PUT", "PATCH"].includes(method)) {
    match[2] = match[2]?.toLowerCase();
    if (match[2] === "apply-shipping") return { kind: "group", groupId: match[1], role, block: false };
    if (/apply.*(?:shipping|fee|price)|(?:shipping|fee|price).*apply|routing-undo/.test(match[2] ?? "")) {
      return { kind: "group", groupId: match[1], role, block: true };
    }
    if (!match[2] || match[2] === "settings") return { kind: "group", groupId: match[1], role, block: true, settings: true };
  }
  if (lower === "/admin/apply-shipping" && method === "POST") return { kind: "bulk", role: "admin", block: true };
  return null;
}
