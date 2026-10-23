import { centsToMoneyString, safeMoneyToCents } from "./exact-money";

export interface SupplierCost { id: number; productName: string; unitCost: number | string; }
export interface SupplierDraftRow {
  id: number;
  original: string;
  productName: string;
  quantity: string;
  /** null means use a unique whole-name match; a number is an explicit choice. */
  costId: number | null;
}
export interface PricedSupplierLine {
  draft: SupplierDraftRow;
  cost: SupplierCost | null;
  unitCents: bigint | null;
  lineCents: bigint | null;
  errors: string[];
}
export interface SupplierReview {
  lines: PricedSupplierLine[];
  totalCents: bigint;
  ready: boolean;
  issueCount: number;
}

const SCALE = 1_000_000n;
const MAX_CENTS = BigInt(Number.MAX_SAFE_INTEGER);
const normaliseName = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

export function parseSupplierList(text: string): SupplierDraftRow[] {
  if (text.length > 200_000) throw new Error("List is too long. Paste up to 200,000 characters at a time.");
  const lines = text.split(/\r\n?|\n/).filter(line => line.trim());
  if (lines.length > 1000) throw new Error("Paste up to 1000 product lines at a time.");
  return lines.map((original, id) => {
    let productName = original.trim(), quantity = "";
    if (original.includes("\t")) {
      const columns = original.split("\t");
      productName = columns[0].trim();
      // Preserve unexpected columns as an invalid quantity, never silently omit them.
      quantity = columns.slice(1).join("\t").trim();
    } else {
      const match = original.trim().match(/^(.+?)(?:\s+[xX]\s*|\s*×\s*)(\S+)$/);
      if (match) [, productName, quantity] = match;
    }
    return { id, original, productName: productName.trim(), quantity, costId: null };
  });
}

function quantityScaled(value: string): bigint | null {
  const text = value.trim();
  if (!/^\d{1,7}(?:\.\d{1,6})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const scaled = BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, "0"));
  return scaled > 0n && scaled <= 1_000_000n * SCALE ? scaled : null;
}

export function reviewSupplierList(rows: SupplierDraftRow[], costs: SupplierCost[]): SupplierReview {
  const byName = new Map<string, SupplierCost[]>();
  const byId = new Map<number, SupplierCost>();
  for (const cost of costs) {
    const name = normaliseName(cost.productName);
    byName.set(name, [...(byName.get(name) ?? []), cost]);
    byId.set(cost.id, cost);
  }
  let totalCents = 0n;
  const lines = rows.map(draft => {
    const errors: string[] = [];
    let cost: SupplierCost | null = null;
    if (draft.costId !== null) {
      cost = byId.get(draft.costId) ?? null;
      if (!cost) errors.push("Selected saved product is no longer available. Choose another product.");
    } else {
      const matches = byName.get(normaliseName(draft.productName)) ?? [];
      if (matches.length === 1) cost = matches[0];
      else if (matches.length > 1) errors.push("Multiple saved products match this name. Choose the intended entry.");
      else errors.push("No exact saved product match. Choose a product from My Prices.");
    }
    const quantity = quantityScaled(draft.quantity);
    if (quantity === null) errors.push("Enter a quantity above 0 and at most 1,000,000, with up to 6 decimal places.");
    const unitCents = cost ? safeMoneyToCents(cost.unitCost) : null;
    if (cost && (unitCents === null || !cost.productName.trim() || /[\u0000-\u001f\u007f]/.test(cost.productName))) {
      errors.push("Invalid saved cost or product name. Correct it in My Prices, then refresh saved prices.");
    }
    let lineCents: bigint | null = null;
    if (!errors.length && quantity !== null && unitCents !== null) {
      // Exact decimal multiplication, rounded half-up ONCE per line to USD cents.
      lineCents = (unitCents * quantity + SCALE / 2n) / SCALE;
      if (lineCents > MAX_CENTS || totalCents + lineCents > MAX_CENTS) {
        lineCents = null;
        errors.push("Total is too large. Reduce the quantity or split this list.");
      } else totalCents += lineCents;
    }
    return { draft, cost, unitCents, lineCents, errors };
  });
  const issueCount = lines.filter(line => line.errors.length > 0).length;
  return { lines, totalCents, issueCount, ready: rows.length > 0 && issueCount === 0 };
}

export function supplierListTxt(review: SupplierReview): string {
  if (!review.ready || !review.lines.length || review.lines.some(line => line.errors.length || !line.cost || line.lineCents === null || line.unitCents === null)) {
    throw new Error("Resolve every product, quantity and saved-price issue before exporting.");
  }
  return [
    "SUPPLIER ORDER LIST — USD",
    "Prices: saved FS3 supplier costs",
    "Quantity uses each product's FS3 price unit (usually one kit, not one vial).",
    "Line totals are rounded half-up to the nearest cent.",
    "",
    "Product | Quantity | Unit price | Line total",
    ...review.lines.map(({ draft, cost, unitCents, lineCents }) =>
      `${cost!.productName} | ${Number(draft.quantity.trim())} | USD ${centsToMoneyString(unitCents!)} | USD ${centsToMoneyString(lineCents!)}`),
    "",
    `Grand total: USD ${centsToMoneyString(review.totalCents)}`,
    "",
  ].join("\n");
}
