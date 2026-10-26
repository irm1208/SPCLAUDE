export interface GroupBuyMoq {
  enabled: boolean;
  targetKits: number | null;
  showToMembers: boolean;
  updatedAt: string | null;
  orderedKits: number;
  met: boolean;
  remainingKits: number | null;
  countMode?: "active" | "paid" | "both";
  paidKits?: number;
  productTargets?: { productId: string; targetKits: number }[];
  products?: ProductMoq[];
}
export interface ProductMoq {
  productId: string; name: string; targetKits: number | null; orderedKits: number; paidKits: number;
}

export function parseGroupBuyMoq(raw: unknown): GroupBuyMoq | null {
  if (raw == null) return null;
  if (typeof raw !== "object") throw new Error("Invalid group-buy MOQ response.");
  const m = raw as GroupBuyMoq;
  if (
    typeof m.enabled !== "boolean" || typeof m.showToMembers !== "boolean" ||
    typeof m.met !== "boolean" ||
    typeof m.orderedKits !== "number" || !Number.isFinite(m.orderedKits) || m.orderedKits < 0 ||
    (m.targetKits !== null && (typeof m.targetKits !== "number" || !Number.isFinite(m.targetKits) ||
      m.targetKits <= 0 || !Number.isInteger(m.targetKits * 2))) ||
    (m.enabled && m.targetKits === null && !m.products?.some(p => p.targetKits !== null)) ||
    (m.remainingKits !== null && (typeof m.remainingKits !== "number" || !Number.isFinite(m.remainingKits) || m.remainingKits < 0)) ||
    (m.updatedAt !== null && (typeof m.updatedAt !== "string" || !Number.isFinite(Date.parse(m.updatedAt))))
  ) throw new Error("Invalid group-buy MOQ response.");
  if (m.countMode !== undefined && !["active", "paid", "both"].includes(m.countMode)) throw new Error("Invalid MOQ count mode.");
  if (m.paidKits !== undefined && (!Number.isFinite(m.paidKits) || m.paidKits < 0 || m.paidKits > m.orderedKits)) {
    throw new Error("Invalid paid MOQ count.");
  }
  if (m.products !== undefined) {
    if (!Array.isArray(m.products) || m.products.some(p => !p || typeof p.productId !== "string" ||
      typeof p.name !== "string" || !Number.isFinite(p.orderedKits) || p.orderedKits < 0 ||
      !Number.isFinite(p.paidKits) || p.paidKits < 0 || p.paidKits > p.orderedKits ||
      (p.targetKits !== null && (!Number.isFinite(p.targetKits) || p.targetKits <= 0 || !Number.isInteger(p.targetKits * 2))))) {
      throw new Error("Invalid product MOQ response.");
    }
  }
  return {
    enabled: m.enabled, targetKits: m.targetKits, showToMembers: m.showToMembers,
    updatedAt: m.updatedAt, orderedKits: m.orderedKits, met: m.met, remainingKits: m.remainingKits,
    ...(m.countMode !== undefined ? { countMode: m.countMode } : {}),
    ...(m.paidKits !== undefined ? { paidKits: m.paidKits } : {}),
    ...(m.products !== undefined ? { products: m.products } : {}),
    ...(m.productTargets !== undefined ? { productTargets: m.productTargets } : {}),
  };
}

export const formatMoqKits = (value: number) =>
  value.toLocaleString("en-GB", { maximumFractionDigits: 2 });
