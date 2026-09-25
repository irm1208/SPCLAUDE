import ExcelJS from "exceljs";
import mammoth from "mammoth";

export type GroupBuyImportRow = {
  name: string;
  price: number | null;
  vendor: string;
  category?: string;
  mgSize?: string;
  stock?: number | null;
};

type RawRow = Partial<GroupBuyImportRow> & Record<string, unknown>;
type FileRequest = { fileName: string; mimeType: string; fileBase64: string };
type AiExtract = (input: { mimeType: string; text?: string; fileBase64?: string }) => Promise<unknown>;

const aliases: Record<string, keyof GroupBuyImportRow> = {
  name: "name", product: "name", productname: "name", item: "name", producttitle: "name",
  price: "price", amount: "price", cost: "price", unitprice: "price",
  vendor: "vendor", supplier: "vendor", seller: "vendor",
  category: "category", type: "category",
  size: "mgSize", mg: "mgSize", mgsize: "mgSize", dosage: "mgSize",
  stock: "stock", quantity: "stock", qty: "stock", inventory: "stock",
};

function key(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parsePrice(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const source = String(value ?? "").trim();
  if (!source) return null;
  let text = source.replace(/[£$€¥₹]/g, "").replace(/\s/g, "");
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    const decimal = Math.max(comma, dot);
    const integer = text.slice(0, decimal);
    const fraction = text.slice(decimal + 1);
    const groups = integer.replace(/^[-+]/, "").split(/[,.]/);
    if (groups.length < 2 || groups.slice(1).some(group => group.length !== 3) || !/^\d{1,2}$/.test(fraction)) return null;
    text = integer.replace(/[,.]/g, "") + "." + fraction;
  } else if (comma >= 0 || dot >= 0) {
    const separator = comma >= 0 ? "," : ".";
    const parts = text.split(separator);
    if (parts.length !== 2) return null;
    const [whole, fraction] = parts;
    if (!/^\d+$/.test(whole.replace(/^[-+]/, "")) || !/^\d+$/.test(fraction)) return null;
    if (fraction.length === 3) text = whole + fraction;
    else if (fraction.length === 1 || fraction.length === 2) text = whole + "." + fraction;
    else return null;
  }
  const result = Number(text);
  return Number.isFinite(result) ? result : null;
}

function parseStock(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const result = Number(value);
  return Number.isInteger(result) && result >= 0 ? result : null;
}

export function normalizeGroupBuyImportRows(rows: RawRow[]): GroupBuyImportRow[] {
  return rows.map(row => {
    const normalized: GroupBuyImportRow = {
      name: String(row.name ?? "").trim(),
      price: parsePrice(row.price),
      vendor: String(row.vendor ?? "").trim(),
    };
    if (row.category !== undefined) normalized.category = String(row.category ?? "").trim();
    if (row.mgSize !== undefined) normalized.mgSize = String(row.mgSize ?? "").trim();
    if (row.stock !== undefined) normalized.stock = parseStock(row.stock);
    return normalized;
  }).filter(row => Object.values(row).some(value => value !== "" && value !== null && value !== undefined));
}

function mapValues(values: unknown[], headers?: string[]): RawRow {
  const row: RawRow = {};
  if (headers) {
    let mapped = 0;
    headers.forEach((header, index) => {
      const field = aliases[key(header)];
      if (field) {
        (row as Record<string, unknown>)[field] = values[index];
        mapped++;
      }
    });
    if (mapped > 0) return row;
  } else {
    return mapValues(values);
  }
  (["name", "price", "vendor", "category", "mgSize", "stock"] as const).forEach((field, index) => {
    (row as Record<string, unknown>)[field] = values[index];
  });
  return row;
}

function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).filter(line => line.trim()).slice(0, 5).join("\n");
  return [",", "\t", ";"].sort((a, b) => sample.split(b).length - sample.split(a).length)[0];
}

function parseDelimitedRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
    } else if (char === delimiter && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export function parseGroupBuyDelimitedText(text: string): GroupBuyImportRow[] {
  const rows = parseDelimitedRows(text, detectDelimiter(text)).filter(row => row.some(cell => cell.trim()));
  if (!rows.length) return [];
  return normalizeGroupBuyImportRows(rows.slice(1).map(row => mapValues(row, rows[0])));
}

export async function parseGroupBuyWorkbook(bytes: Buffer | Uint8Array): Promise<GroupBuyImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const values: unknown[][] = [];
  sheet.eachRow(row => values.push((row.values as unknown[]).slice(1)));
  if (!values.length) return [];
  return normalizeGroupBuyImportRows(values.slice(1).map(row => mapValues(row, values[0].map(String))));
}

export async function extractGroupBuyProductsFromFile(
  request: FileRequest,
  aiExtract: AiExtract,
  options: { extractDocxText?: typeof mammoth.extractRawText } = {},
): Promise<GroupBuyImportRow[]> {
  const extension = request.fileName.toLowerCase().split(".").pop();
  const bytes = Buffer.from(request.fileBase64, "base64");
  if (extension === "csv" || extension === "tsv" || request.mimeType === "text/csv" || request.mimeType === "text/tab-separated-values") {
    return parseGroupBuyDelimitedText(bytes.toString("utf8"));
  }
  if (extension === "xlsx" || request.mimeType.includes("spreadsheetml")) return parseGroupBuyWorkbook(bytes);
  if (extension === "xls" || extension === "doc") {
    throw new Error(`Unsupported legacy file format: .${extension}`);
  }
  const extractDocxText = options.extractDocxText ?? mammoth.extractRawText;
  const input = request.mimeType.includes("wordprocessingml")
    ? { mimeType: "text/plain", text: (await extractDocxText({ buffer: bytes })).value }
    : { mimeType: request.mimeType, fileBase64: request.fileBase64 };
  const result = await aiExtract(input);
  const parsed = typeof result === "string" ? JSON.parse(result) : result;
  const rows = Array.isArray(parsed) ? parsed : (parsed as { rows?: unknown[] })?.rows;
  return normalizeGroupBuyImportRows(Array.isArray(rows) ? rows as RawRow[] : []);
}