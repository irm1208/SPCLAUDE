import { GroupUpdateError } from "./group-buy-updates-model";

export interface MoqSettings {
  enabled: boolean;
  targetKits: number | null;
  showToMembers: boolean;
  updatedAt: string | null;
}
export const moqKey = (id: string) => `gb_moq:${id}`;
export const defaultMoqSettings = (): MoqSettings => ({
  enabled: false, targetKits: null, showToMembers: false, updatedAt: null,
});

export function parseMoqInput(body: Record<string, unknown>) {
  if (typeof body.enabled !== "boolean" || typeof body.showToMembers !== "boolean") {
    throw new GroupUpdateError("MOQ switches must be true or false.");
  }
  const target = body.targetKits;
  if (!(target === null && !body.enabled) && (
    typeof target !== "number" || !Number.isFinite(target) || target <= 0 ||
    target > 100_000_000 || !Number.isInteger(target * 2)
  )) {
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
  };
}

export function readMoqSettings(value: string | null): MoqSettings {
  const record = JSON.parse(value ?? "") as Record<string, unknown>;
  const input = parseMoqInput({ ...record, expectedUpdatedAt: record.updatedAt });
  return {
    enabled: input.enabled, targetKits: input.targetKits,
    showToMembers: input.showToMembers, updatedAt: input.expectedUpdatedAt,
  };
}

export function moqSnapshot(settings: MoqSettings, orderedKits: number, manage: boolean) {
  if (!manage && (!settings.enabled || !settings.showToMembers)) return null;
  if (!Number.isFinite(orderedKits) || orderedKits < 0) throw new Error("Invalid MOQ order count.");
  return {
    ...settings, orderedKits,
    met: settings.enabled && settings.targetKits !== null && orderedKits >= settings.targetKits,
    remainingKits: settings.targetKits === null ? null : Math.max(0, settings.targetKits - orderedKits),
  };
}
