export const usd = (value: number | string | null | undefined, digits = 2) => {
  const n = Number(value ?? 0);
  return `$${(Number.isFinite(n) ? n : 0).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
};
export const num = (value: number | string | null | undefined) => { const n = Number(value ?? 0); return Number.isFinite(n) ? n : 0; };
export const date = (value: string | Date | null | undefined) => value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
export const dateTime = (value: string | Date | null | undefined) => value ? new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
export const ago = (value: string | Date | null | undefined) => {
  if (!value) return "";
  const ms = Date.now() - new Date(value).getTime(), m = Math.round(ms / 60_000);
  if (m < 1) return "just now"; if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

export const POOL_STATUS: Record<string, { label: string; tone: "muted" | "brand" | "ok" | "info" | "warn" | "danger" }> = {
  draft: { label: "Draft", tone: "muted" }, open: { label: "Open", tone: "brand" }, funded: { label: "Funded", tone: "ok" }, at_lab: { label: "At the lab", tone: "info" },
  results: { label: "Results in", tone: "ok" }, closed: { label: "Closed", tone: "muted" }, cancelled: { label: "Cancelled", tone: "danger" },
};
export const PAYMENT_STATUS: Record<string, { label: string; tone: "muted" | "brand" | "ok" | "info" | "warn" | "danger" }> = {
  pending: { label: "Not paid yet", tone: "muted" }, submitted: { label: "Awaiting confirmation", tone: "warn" }, verified: { label: "Paid", tone: "ok" }, rejected: { label: "Rejected", tone: "danger" }, refunded: { label: "Refunded", tone: "info" },
};
export const TEST_TYPES = ["Purity (HPLC)", "Quantity (mg per vial)", "Mass spec identity", "Endotoxin (LAL)", "Sterility", "Heavy metals", "Full surface", "Other"];
export const NETWORKS: { value: string; label: string; currencies: string[] }[] = [
  { value: "ethereum", label: "Ethereum (ERC-20)", currencies: ["USDT", "USDC", "ETH"] },
  { value: "arbitrum", label: "Arbitrum", currencies: ["USDT", "USDC"] },
  { value: "polygon", label: "Polygon", currencies: ["USDT", "USDC"] },
  { value: "bsc", label: "BNB Chain (BEP-20)", currencies: ["USDT"] },
  { value: "solana", label: "Solana", currencies: ["USDC", "USDT", "SOL"] },
  { value: "tron", label: "Tron (TRC-20)", currencies: ["USDT"] },
  { value: "bitcoin", label: "Bitcoin", currencies: ["BTC"] },
];
export const STABLECOINS = ["USDT", "USDC"];
export const isStable = (currency: string) => STABLECOINS.includes(currency.toUpperCase());
export const coin = (amount: number | string | null | undefined, currency: string) => { const n = Number(amount ?? 0); return `${isStable(currency) ? n.toFixed(2) : n.toLocaleString("en-US", { maximumFractionDigits: 8 })} ${currency}`; };
export const networkLabel = (value: string) => NETWORKS.find(n => n.value === value)?.label ?? value;
export const shortAddress = (a: string) => a.length > 18 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a;
export const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } };
