import { COUNTRY_CODE_TO_NAME, normalizeToCode } from "./country-utils";
import { SupplierBatchError } from "./supplier-batches-model";

export interface SupplierContact { name: string; address: string; country: string; email: string; phone: string }
export function validateSupplierContact(value: unknown): SupplierContact {
  const v = value as Partial<SupplierContact> | null;
  const result = {} as SupplierContact;
  for (const key of ["name", "address", "country", "email", "phone"] as const) {
    if (typeof v?.[key] !== "string" || !v[key]!.trim() || v[key]!.length > (key === "address" ? 2000 : 200))
      throw new SupplierBatchError(`Supplier delivery ${key} is required (and must be within the length limit).`, 400);
    result[key] = v[key]!.trim();
    if (key !== "address" && /[\r\n]/.test(result[key])) throw new SupplierBatchError(`Invalid supplier delivery ${key}.`, 400);
  }
  result.country = normalizeToCode(result.country);
  if (!COUNTRY_CODE_TO_NAME[result.country]) throw new SupplierBatchError("Choose a valid supplier delivery country.", 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new SupplierBatchError("Enter a valid supplier delivery email.", 400);
  if (!/^[+\d\s().-]{6,40}$/.test(result.phone)) throw new SupplierBatchError("Enter a valid supplier delivery phone number with country code.", 400);
  return result;
}
export interface TxtOrder {
  id: string; code: string; username: string;
  items: { productName: string; quantity: number }[];
}
export interface TxtBlock {
  title: string; recipient: string; contact: SupplierContact; orders: TxtOrder[];
  packagePrices: number[]; packageNote?: string;
}
const line = (s: string) => String(s).replace(/[\r\n\t]/g, " ");
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
/** All blocks validate before returning any file. Never infer supplier cost from retail prices. */
export function supplierTxt(blocks: TxtBlock[], costs: { productName: string; unitCost: number | string }[]): string {
  if (!blocks.length) throw new SupplierBatchError("No orders selected for export.", 400);
  return blocks.map(b => {
    let contact: SupplierContact;
    try { contact = validateSupplierContact(b.contact); }
    catch (e) { throw new SupplierBatchError(`${b.recipient}: ${(e as Error).message}`, 400); }
    const products = new Map<string, { name: string; quantity: number; cents: number }>();
    if (!b.orders.length) throw new SupplierBatchError("No orders in this shipment.", 400);
    for (const o of b.orders) {
      if (!o.items.length) throw new SupplierBatchError(`Order ${o.code} has no active items.`, 400);
      for (const i of o.items) {
        if (!Number.isFinite(i.quantity) || i.quantity <= 0 || !Number.isInteger(i.quantity * 2))
          throw new SupplierBatchError(`Order ${o.code} has an invalid kit quantity.`, 400);
        const key = i.productName.trim().toLowerCase();
        const matches = costs.filter(c => c.productName.trim().toLowerCase() === key);
        const cost = matches.length === 1 ? Number(matches[0].unitCost) : NaN;
        if (!Number.isFinite(cost) || cost < 0)
          throw new SupplierBatchError(`Set an exact supplier cost in Admin → FS3 costs for ${i.productName} before downloading.`, 400);
        const p = products.get(key) ?? { name: i.productName, quantity: 0, cents: 0 };
        p.quantity += i.quantity; p.cents += Math.round(cost * i.quantity * 100); products.set(key, p);
      }
    }
    if (b.packagePrices.some(p => !Number.isFinite(p) || p < 0)) throw new SupplierBatchError("Invalid supplier package price.", 400);
    const entries = [...products.values()], qty = entries.reduce((n, p) => n + p.quantity, 0);
    const total = entries.reduce((n, p) => n + p.cents, 0);
    const packages = b.packagePrices.map(p => Math.round(p * 100));
    const shipping = packages.reduce((a, p) => a + p, 0);
    const same = packages.every(p => p === packages[0]);
    const packageLine = same && packages.length
      ? `${packages.length} x ${money(packages[0])} = ${money(shipping)}`
      : `${packages.map(money).join(" + ") || "$0.00"} = ${money(shipping)}`;
    return [
      line(b.title), `Orders: ${b.orders.map(o => `${line(o.code)} (@${line(o.username)})`).join(", ")}`, "New Order:", "",
      ...entries.map(p => `${line(p.name)} x${p.quantity} = ${money(p.cents)}`), "",
      `Total QTY: ${qty}`, `Total: ${money(total)}`, `Package: ${packageLine}`,
      ...(b.packageNote ? [`Package pricing: ${line(b.packageNote)}`] : []),
      `Grand Total: ${money(total + shipping)}`, "", `Recipient: ${line(b.recipient)}`, "Address:",
      contact.name, contact.address, COUNTRY_CODE_TO_NAME[contact.country],
      `Email: ${contact.email}`, `Phone: ${contact.phone}`,
    ].join("\n");
  }).join("\n\n----------------------------------------\n\n") + "\n";
}
