export interface TrackingImportRow { id: string; reference: string; carrier: string; trackingNumber: string }
interface ImportOrder { id: string; reference: string; stale: boolean; status: string; carrier: string | null; trackingNumber: string | null }
export interface TrackingImportPreview { updates: TrackingImportRow[]; errors: string[]; skipped: number }

/** CSV records, including Excel BOM, escaped quotes, and embedded address/product newlines. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false, closed = false;
  const finishField = () => { row.push(field); field = ""; closed = false; };
  const finishRow = () => {
    finishField();
    if (row.some(value => value.trim())) rows.push(row);
    row = [];
    if (rows.length > 5001) throw new Error("CSV has too many rows. Use at most 5,000 orders per file.");
  };
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { quoted = false; closed = true; }
      } else field += c;
    } else if (c === ",") finishField();
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; finishRow(); }
    else if (closed) { if (!/[ \t]/.test(c)) throw new Error("Invalid CSV: unexpected text after a closing quote."); }
    else if (c === '"') { if (field) throw new Error("Invalid CSV: unexpected quote."); quoted = true; }
    else field += c;
  }
  if (quoted) throw new Error("Invalid CSV: an opening quote is missing its closing quote.");
  if (field || row.length || closed) finishRow();
  return rows;
}

export function previewVendorTrackingImport(text: string, orders: readonly ImportOrder[]): TrackingImportPreview {
  const result: TrackingImportPreview = { updates: [], errors: [], skipped: 0 };
  try {
    if (text.length > 5 * 1024 * 1024) throw new Error("CSV must be 5 MB or smaller.");
    const [header, ...rows] = parseCsv(text);
    if (!header) throw new Error("CSV is empty.");
    const headers = header.map(value => value.trim().toLowerCase());
    if (new Set(headers.filter(Boolean)).size !== headers.filter(Boolean).length) throw new Error("CSV has duplicate column headers.");
    const required = ["Order reference", "Carrier", "Tracking number"];
    const missing = required.filter(value => !headers.includes(value.toLowerCase()));
    if (missing.length) throw new Error(`Missing CSV columns: ${missing.join(", ")}. Use the exported orders file.`);
    const index = required.map(value => headers.indexOf(value.toLowerCase()));
    const seen = new Set<string>();
    for (const [offset, row] of rows.entries()) {
      const label = `Row ${offset + 2}`;
      if (row.length > header.length) { result.errors.push(`${label}: too many columns.`); continue; }
      const [reference, carrier, trackingNumber] = index.map(i => (row[i] ?? "").trim());
      if (!trackingNumber) { result.skipped++; continue; }
      if (!reference) { result.errors.push(`${label}: order reference is required.`); continue; }
      if (seen.has(reference)) { result.errors.push(`${label}: duplicate order reference ${reference}.`); continue; }
      seen.add(reference);
      const matches = orders.filter(order => order.reference === reference);
      if (matches.length !== 1) { result.errors.push(`${label}: order ${reference} ${matches.length ? "is ambiguous" : "was not found in your vendor orders"}.`); continue; }
      const order = matches[0];
      if (["Shipped", "Completed"].includes(order.status) && order.carrier === carrier && order.trackingNumber === trackingNumber) { result.skipped++; continue; }
      if (order.stale || order.status === "Completed") { result.errors.push(`${label}: order ${reference} is on hold or completed. Ask Admin to review it.`); continue; }
      if (!carrier || carrier.length > 120) { result.errors.push(`${label}: enter a carrier for order ${reference}.`); continue; }
      if (!/^[a-zA-Z0-9][a-zA-Z0-9 ._/-]{2,199}$/.test(trackingNumber)) { result.errors.push(`${label}: enter a valid tracking number for order ${reference}.`); continue; }
      result.updates.push({ id: order.id, reference, carrier, trackingNumber });
    }
    if (result.updates.length > 500) result.errors.push("Import at most 500 tracking updates at a time.");
  } catch (error) { result.errors.push(error instanceof Error ? error.message : "Could not read CSV."); }
  if (result.errors.length) result.updates = [];
  return result;
}

export async function applyVendorTrackingImport(rows: readonly TrackingImportRow[], save: (row: TrackingImportRow) => Promise<void>) {
  let saved = 0;
  const failed: (TrackingImportRow & { error: string })[] = [];
  for (const row of rows) {
    try { await save(row); saved++; }
    catch (error) { failed.push({ ...row, error: error instanceof Error ? error.message : "Update failed" }); }
  }
  return { saved, failed };
}
