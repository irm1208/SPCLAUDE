export interface GroupBuyMoq {
  enabled: boolean;
  targetKits: number | null;
  showToMembers: boolean;
  updatedAt: string | null;
  orderedKits: number;
  met: boolean;
  remainingKits: number | null;
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
    (m.enabled && m.targetKits === null) ||
    (m.remainingKits !== null && (typeof m.remainingKits !== "number" || !Number.isFinite(m.remainingKits) || m.remainingKits < 0)) ||
    (m.updatedAt !== null && (typeof m.updatedAt !== "string" || !Number.isFinite(Date.parse(m.updatedAt))))
  ) throw new Error("Invalid group-buy MOQ response.");
  return {
    enabled: m.enabled, targetKits: m.targetKits, showToMembers: m.showToMembers,
    updatedAt: m.updatedAt, orderedKits: m.orderedKits, met: m.met, remainingKits: m.remainingKits,
  };
}

export const formatMoqKits = (value: number) =>
  value.toLocaleString("en-GB", { maximumFractionDigits: 2 });
