export class CoaError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export type CoaRail = { currency: string; network: string; walletAddress: string };
export type CoaConfig = {
  mode: "disabled" | "selected" | "open"; fee: number; currency: "USD" | "GBP" | "EUR";
  cap: number; rails: CoaRail[]; manualInstructions: string;
};
export const EMPTY_COA_CONFIG: CoaConfig = {
  mode: "disabled", fee: 0, currency: "USD", cap: 1, rails: [], manualInstructions: "",
};
export function coaConfig(input: any): CoaConfig {
  if (!input || !["disabled", "selected", "open"].includes(input.mode)
    || !["USD", "GBP", "EUR"].includes(input.currency)
    || !Number.isInteger(input.cap) || input.cap < 1 || input.cap > 100000
    || typeof input.fee !== "number" || !Number.isFinite(input.fee) || input.fee < 0 || input.fee > 100000
    || Math.abs(input.fee * 100 - Math.round(input.fee * 100)) > 0.00001
    || !Array.isArray(input.rails) || input.rails.length > 20
    || typeof input.manualInstructions !== "string" || input.manualInstructions.length > 3000)
    throw new CoaError("Enter a valid COA mode, fee, currency and place limit.");
  const rails = input.rails.map((r: any) => {
    if (!r || !["USDT", "USDC"].includes(r.currency) || typeof r.network !== "string"
      || typeof r.walletAddress !== "string" || !r.walletAddress.trim())
      throw new CoaError("Select a configured stablecoin payment method.");
    return { currency: r.currency, network: r.network, walletAddress: r.walletAddress.trim() };
  });
  if (input.mode !== "disabled" && input.fee > 0 && !rails.length && !input.manualInstructions.trim())
    throw new CoaError("Configure a COA payment destination or manual payment instructions before opening requests.");
  return { mode: input.mode, fee: input.fee, currency: input.currency, cap: input.cap, rails,
    manualInstructions: input.manualInstructions.trim() };
}
export function coaDetails(input: any) {
  const field = (key: string) => {
    const text = typeof input?.[key] === "string" ? input[key].trim() : "";
    if (!text || text.length > 300) throw new CoaError(`Enter ${key} (up to 300 characters).`);
    return text;
  };
  return { client: field("client"), sample: field("sample"), manufacturer: field("manufacturer"), batch: field("batch") };
}
export function holdsCoaPlace(r: any, now = Date.now()) {
  if (["withdrawn", "expired"].includes(r.status)) return false;
  if (r.txHash || r.reference || r.source === "invited" || ["review", "paid", "processing", "completed"].includes(r.status)) return true;
  return !r.expiresAt || new Date(r.expiresAt).getTime() > now;
}
export function coaCanClaim(mode: string, available: number, hasPlace: boolean) {
  return hasPlace || (mode === "open" && available > 0);
}
export function publicCoaRequest(row: any) {
  if (!row) return null;
  const { internalNotes, createdBy, confirmedBy, confirmationNote, certificate, ...publicRow } = row;
  return { ...publicRow, certificate: certificate && row.status === "completed"
    ? { size: certificate.size, attachedAt: certificate.attachedAt } : null };
}
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^\s*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}
export function coaHash(hash: string) {
  return /^(?:0x)?[a-f0-9]+$/i.test(hash) ? hash.replace(/^0x/i, "").toLowerCase() : hash;
}
