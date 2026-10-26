import { GroupUpdateError } from "./group-buy-updates-model";

export interface MoqSettings {
  enabled: boolean;
  targetKits: number | null;
  showToMembers: boolean;
  updatedAt: string | null;
  countMode?: string;
  productTargets?: { productId: string; targetKits: number }[];
}
export interface MoqProductCount {
  productId: string; name: string; orderedKits: number; paidKits: number;
}
export const validMoqTarget = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0 &&
  value <= 100_000_000 && Number.isInteger(value * 2);
export const moqKey = (id: string) => `gb_moq:${id}`;
export const defaultMoqSettings = (): MoqSettings => ({
  enabled: false, targetKits: null, showToMembers: false, updatedAt: null,
});

export function parseMoqInput(body: Record<string, unknown>) {
  if (typeof body.enabled !== "boolean" || typeof body.showToMembers !== "boolean") {
    throw new GroupUpdateError("MOQ switches must be true or false.");
  }
  const target = body.targetKits;
  const productTargets: NonNullable<MoqSettings["productTargets"]> = [];
  if (body.productTargets !== undefined) {
    if (!Array.isArray(body.productTargets) || body.productTargets.length > 5000) {
      throw new GroupUpdateError("Invalid per-product MOQ targets.");
    }
    const seen = new Set<string>();
    for (const entry of body.productTargets) {
      if (!entry || typeof entry.productId !== "string" || !entry.productId.trim() ||
        entry.productId.length > 200 || seen.has(entry.productId) || !validMoqTarget(entry.targetKits)) {
        throw new GroupUpdateError("Each product needs one valid MOQ in whole or half kits.");
      }
      seen.add(entry.productId);
      productTargets.push({ productId: entry.productId, targetKits: entry.targetKits });
    }
  }
  if (body.countMode !== undefined && (typeof body.countMode !== "string" || !["active", "paid", "both"].includes(body.countMode))) {
    throw new GroupUpdateError("Choose active orders, paid orders or both.");
  }
  if (!(target === null && (!body.enabled || productTargets.length > 0)) && !validMoqTarget(target)) {
    throw new GroupUpdateError("Enter an MOQ above zero in whole or half kits.");
  }
  if (body.expectedUpdatedAt !== null && (
    typeof body.expectedUpdatedAt !== "string" || !Number.isFinite(Date.parse(body.expectedUpdatedAt))
  )) {
    throw new GroupUpdateError("Refresh the MOQ settings before saving.");
  }
  return {
    enabled: body.enabled, targetKits: target as number | null, showToMembers: body.showToMembers,
    expectedUpdatedAt: body.expectedUpdatedAt as string | null,
    ...(body.countMode !== undefined ? { countMode: body.countMode as string } : {}),
    ...(body.productTargets !== undefined ? { productTargets } : {}),
  };
}

export function readMoqSettings(value: string | null): MoqSettings {
  const record = JSON.parse(value ?? "") as Record<string, unknown>;
  const input = parseMoqInput({ ...record, expectedUpdatedAt: record.updatedAt });
  return {
    enabled: input.enabled, targetKits: input.targetKits,
    showToMembers: input.showToMembers, updatedAt: input.expectedUpdatedAt,
    ...(input.countMode !== undefined ? { countMode: input.countMode } : {}),
    ...(input.productTargets !== undefined ? { productTargets: input.productTargets } : {}),
  };
}

export function moqSnapshot(
  settings: MoqSettings, orderedKits: number, manage: boolean, paidKits = 0,
  productCounts?: MoqProductCount[],
) {
  if (!manage && (!settings.enabled || !settings.showToMembers)) return null;
  if (!Number.isFinite(orderedKits) || orderedKits < 0) throw new Error("Invalid MOQ order count.");
  if (!Number.isFinite(paidKits) || paidKits < 0 || paidKits > orderedKits) throw new Error("Invalid paid MOQ count.");
  const targets = new Map((settings.productTargets ?? []).map(p => [p.productId, p.targetKits]));
  const counts = new Map((productCounts ?? []).map(p => [p.productId, p]));
  const productIds = new Set([...counts.keys(), ...targets.keys()]);
  const products = [...productIds].filter(id => manage || targets.has(id)).map(productId => ({
    productId, name: counts.get(productId)?.name ?? `Unavailable product (${productId})`,
    orderedKits: counts.get(productId)?.orderedKits ?? 0,
    paidKits: counts.get(productId)?.paidKits ?? 0,
    targetKits: targets.get(productId) ?? null,
  }));
  const selected = settings.countMode === "paid" ? paidKits : orderedKits;
  return {
    ...settings, orderedKits, paidKits,
    ...(productCounts !== undefined ? { products } : {}),
    met: settings.enabled && settings.targetKits !== null && selected >= settings.targetKits,
    remainingKits: settings.targetKits === null ? null : Math.max(0, settings.targetKits - selected),
  };
}
