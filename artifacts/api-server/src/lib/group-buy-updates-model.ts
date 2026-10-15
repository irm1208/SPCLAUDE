import { parseWholesaleUpdateInput } from "./wholesale-updates";

export const GROUP_PROGRESS_STAGES = [
  { id: "open", label: "Open" }, { id: "closed", label: "Closed" },
  { id: "ordered", label: "Ordered from vendor" }, { id: "in_transit", label: "In transit" },
  { id: "with_reshipper", label: "With reshipper" }, { id: "dispatched", label: "Dispatched" },
] as const;
export type GroupProgressStage = typeof GROUP_PROGRESS_STAGES[number]["id"];
export type UpdateActor = { username: string; admin?: boolean; adminGbId?: string };
export type GroupUpdate = {
  id: string; groupBuyId: string; title: string; note: string; published: boolean;
  kind: "note" | "status"; stage?: GroupProgressStage; imageKey: string | null;
  createdAt: string; updatedAt: string;
  telegramAlertQueued?: boolean;
};
export type GroupProgress = { stage: GroupProgressStage; updatedAt: string };
export const progressKey = (id: string) => `gb_progress:${id}`;
export const updatePrefix = (id: string) => `gb_update:${id}:`;
export const canonicalUsername = (name: string) => name.trim().replace(/^@/, "").toLowerCase();
export class GroupUpdateError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export const isGroupProgressStage = (value: unknown): value is GroupProgressStage =>
  GROUP_PROGRESS_STAGES.some(s => s.id === value);

function parseAlertChoice(value: unknown): boolean {
  if (value === undefined || value === false || value === "false") return false;
  if (value === true || value === "true") return true;
  throw new GroupUpdateError("Send Telegram alert must be true or false.");
}

export function defaultGroupProgress(group: { status: string; closeDate: Date | string | null }): GroupProgressStage {
  return group.status === "closed" || group.status === "archived" ||
    (group.closeDate !== null && new Date(group.closeDate).getTime() <= Date.now()) ? "closed" : "open";
}
export function parseProgressInput(body: Record<string, unknown> = {}) {
  if (!isGroupProgressStage(body.stage)) throw new GroupUpdateError("Choose one of the six group-buy progress stages.");
  if (body.expectedUpdatedAt !== null && (typeof body.expectedUpdatedAt !== "string" || !Number.isFinite(Date.parse(body.expectedUpdatedAt)))) {
    throw new GroupUpdateError("Refresh the group-buy progress before saving.");
  }
  return { stage: body.stage, expectedUpdatedAt: body.expectedUpdatedAt as string | null, sendTelegramAlert: parseAlertChoice(body.sendTelegramAlert) };
}
export function parseGroupUpdate(body: Record<string, unknown> = {}) {
  try { return { ...parseWholesaleUpdateInput(body), sendTelegramAlert: parseAlertChoice(body.sendTelegramAlert) }; }
  catch (error) { throw new GroupUpdateError(error instanceof Error ? error.message : "Invalid update."); }
}
export function readProgress(value: string | null): GroupProgress {
  const record = JSON.parse(value ?? "") as GroupProgress;
  if (!isGroupProgressStage(record.stage) || typeof record.updatedAt !== "string" || !Number.isFinite(Date.parse(record.updatedAt))) {
    throw new Error("Stored group-buy progress is invalid.");
  }
  return record;
}
export function readGroupUpdate(value: string | null): GroupUpdate {
  const record = JSON.parse(value ?? "") as GroupUpdate;
  if (typeof record.id !== "string" || typeof record.groupBuyId !== "string" || typeof record.note !== "string" ||
    typeof record.title !== "string" || typeof record.published !== "boolean" ||
    !["note", "status"].includes(record.kind) || typeof record.createdAt !== "string" || typeof record.updatedAt !== "string" ||
    (record.stage !== undefined && !isGroupProgressStage(record.stage)) ||
    (record.imageKey !== null && (typeof record.imageKey !== "string" || !/^group-buy-updates\/[a-f0-9-]+\.webp$/.test(record.imageKey)))) {
    throw new Error("Stored group-buy update is invalid.");
  }
  return record;
}
export function groupUpdateDto(record: GroupUpdate, scope: "member" | "admin" | "organiser") {
  const { imageKey, ...data } = record;
  const base = scope === "member" ? "/api/group-buys" : `/api/${scope}/group-buys`;
  return {
    ...data,
    imageUrl: imageKey ? `${base}/${encodeURIComponent(record.groupBuyId)}/updates/${encodeURIComponent(record.id)}/image?v=${encodeURIComponent(record.updatedAt)}` : null,
  };
}
