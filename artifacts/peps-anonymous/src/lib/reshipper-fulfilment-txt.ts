import { filterAssignedFulfilmentOrders } from "./reshipper-fulfilment";

export interface ReshipperTotalOrder {
  reshipperUsername?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
  grandTotal: number | string;
  lineItems: { productName: string; quantity: number | string; isOos?: boolean }[];
}

/** One aggregate shipment order. Never serialize member identities or addresses. */
export function buildReshipperFulfilmentTxt(orders: ReshipperTotalOrder[], username: string, currency: string): string {
  const assigned = filterAssignedFulfilmentOrders(orders, username);
  if (!assigned.length) throw new Error("No active orders are assigned to this reshipper.");
  const products = new Map<string, { name: string; quantity: number }>();
  let cents = 0, kits = 0;
  for (const order of assigned) {
    if (order.grandTotal == null || String(order.grandTotal).trim() === "" || !Number.isFinite(Number(order.grandTotal)))
      throw new Error("An assigned order has an invalid total. Refresh the orders before downloading.");
    cents += Math.round(Number(order.grandTotal) * 100);
    for (const item of order.lineItems) {
      if (item.isOos) continue;
      const name = item.productName.trim().replace(/[\r\n\t]/g, " ");
      const qty = Number(item.quantity);
      if (!name || !Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty * 2))
        throw new Error("An assigned product has an invalid name or kit quantity. Correct it before downloading.");
      const key = name.toLowerCase();
      const product = products.get(key) ?? { name, quantity: 0 };
      product.quantity += qty; kits += qty; products.set(key, product);
    }
  }
  const code = currency.trim().toUpperCase();
  const symbol = ["USD", "USDT", "USDC"].includes(code) ? "$" : code === "GBP" ? "£" : code === "EUR" ? "€" : "";
  const amount = (cents / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const handle = username.trim().replace(/^@/, "").trim().replace(/[\r\n\t]/g, " ");
  const sorted = [...products.values()].sort((a, b) => a.name.localeCompare(b.name));
  const unmatched = sorted.filter(product => !Number.isInteger(product.quantity));
  return [
    `@${handle}`, "",
    "FULL KITS ONLY — supplier orders must contain whole kits.",
    "Quantities below are exact member totals; nothing has been rounded or added.",
    "",
    ...sorted.map(p => `${p.name} × ${p.quantity}`),
    "", `Total: ${symbol}${amount} ${code}`, `Number of kits: ${kits}`, "",
    ...(unmatched.length ? [
      "REVIEW REQUIRED — unmatched half-kits. Resolve before placing the supplier order:",
      ...unmatched.map(p => `${p.name}: ${p.quantity} kits — unmatched half-kit`),
      "Customer quantities and charges have not been changed.", "",
    ] : ["All product totals are whole kits; no unmatched halves.", ""]),
  ].join("\n");
}
