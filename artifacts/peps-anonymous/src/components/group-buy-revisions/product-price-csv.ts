export type PriceProduct = { id: string; name: string; mgSize?: string | null; price: string | number };
export type PriceImportRow = { productId: string; name: string; strength: string; currentPrice: string; newPrice: string };

export function validProposedPrice(value: string): boolean {
  return /^\d+(?:\.\d{1,2})?$/.test(value.trim()) && Number(value) <= 1_000_000;
}
const normal = (value: string) => value.trim().toLowerCase();
const strength = (value: string) => normal(value).replace(/\s/g, "");
const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
const safeText = (value: string) => /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
export function productPriceTemplate(products: PriceProduct[]): string {
  return ["Product ID,Product name,Strength,Current price,New price",
    ...products.map(p => [p.id, safeText(p.name), safeText(p.mgSize ?? ""), Number(p.price).toFixed(2), ""].map(cell).join(","))].join("\r\n");
}

/** Small strict CSV/TSV reader: escaped quotes and embedded newlines are preserved. */
function records(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, "");
  const delimiter = source.split(/\r?\n/, 1)[0].includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [], value = "", quoted = false, closed = false;
  const field = () => { row.push(value.trim()); value = ""; closed = false; };
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') { value += '"'; i++; }
      else if (ch === '"') { quoted = false; closed = true; }
      else value += ch;
    } else if (ch === delimiter) field();
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && source[i + 1] === "\n") i++;
      field(); rows.push(row); row = [];
    } else if (ch === '"' && !value.trim() && !closed) { quoted = true; value = ""; }
    else if (ch === '"' || (closed && ch.trim())) throw new Error("Invalid CSV quote placement.");
    else if (!closed) value += ch;
  }
  if (quoted) throw new Error("Unclosed CSV quote.");
  if (value || row.length || closed) { field(); rows.push(row); }
  return rows;
}

export function parseProductPriceCsv(text: string, products: PriceProduct[]): { rows: PriceImportRow[]; errors: string[] } {
  const rows: PriceImportRow[] = [], errors: string[] = [];
  if (text.length > 2_000_000) return { rows, errors: ["CSV must be smaller than 2 MB."] };
  let data: string[][];
  try { data = records(text); } catch (e) { return { rows, errors: [(e as Error).message] }; }
  if (data.length > 10_001) return { rows, errors: ["CSV must contain at most 10,000 product rows."] };
  const headers = (data[0] ?? []).map(h => normal(h).replace(/[_\s-]+/g, ""));
  if (new Set(headers).size !== headers.length) return { rows, errors: ["CSV contains duplicate column headers."] };
  const idCol = headers.indexOf("productid"), nameCol = headers.indexOf("productname"), sizeCol = headers.indexOf("strength");
  const priceCol = headers.indexOf("newprice");
  if (priceCol < 0 || (idCol < 0 && nameCol < 0))
    return { rows, errors: ["Include New price and either Product ID or Product name columns. Download the template for the correct headers."] };
  const seen = new Set<string>();
  data.slice(1).forEach((record, index) => {
    if (record.every(v => !v)) return;
    const error = (message: string) => errors.push(`Row ${index + 2}: ${message}`);
    if (record.length !== headers.length) { error("column count does not match the headers."); return; }
    const id = record[idCol] ?? "", name = record[nameCol] ?? "", size = record[sizeCol] ?? "";
    const matches = id ? products.filter(p => p.id === id) : name ? products.filter(p =>
      normal(p.name) === normal(name) && (!size || strength(p.mgSize ?? "") === strength(size))) : [];
    if (!matches.length) { error("not an organiser-uploaded product in this group buy. Check the product ID or exact name and strength."); return; }
    if (matches.length !== 1) { error("ambiguous product name. Use the product ID or exact strength."); return; }
    const product = matches[0];
    if (seen.has(product.id)) { error("duplicate product. Include each product only once."); return; }
    seen.add(product.id);
    const price = record[priceCol];
    if (!price) return; // Blank template cells intentionally mean no change.
    if (!validProposedPrice(price)) { error("New price must be 0–1,000,000 with at most two decimals; no currency symbols or thousands separators."); return; }
    rows.push({ productId: product.id, name: product.name, strength: product.mgSize ?? "",
      currentPrice: Number(product.price).toFixed(2), newPrice: price });
  });
  return { rows, errors };
}
