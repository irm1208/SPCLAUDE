export const WHOLESALE_UPDATE_PREFIX = "wholesale_update:";
export type WholesaleUpdate = {
  id: string; title: string; note: string; published: boolean;
  imageKey: string | null; createdAt: string; updatedAt: string;
};

export class WholesaleUpdateValidationError extends Error {}

export function parseWholesaleUpdateInput(body: Record<string, unknown> = {}) {
  if (typeof body.note !== "string" || !body.note.trim() || body.note.length > 5000) {
    throw new WholesaleUpdateValidationError("Enter an update note of 1–5,000 characters.");
  }
  if (body.title !== undefined && (typeof body.title !== "string" || body.title.length > 120)) {
    throw new WholesaleUpdateValidationError("The title must be 120 characters or fewer.");
  }
  const flag = (value: unknown, name: string): boolean => {
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    throw new WholesaleUpdateValidationError(`${name} must be true or false.`);
  };
  return {
    title: typeof body.title === "string" ? body.title.trim() : "",
    note: body.note.trim(),
    published: flag(body.published, "Published"),
    removeImage: body.removeImage === undefined ? false : flag(body.removeImage, "Remove image"),
  };
}

export function wholesaleUpdateDto(record: WholesaleUpdate, admin: boolean) {
  const { imageKey, ...data } = record;
  return {
    ...data,
    imageUrl: imageKey
      ? `${admin ? "/api/admin/wholesale-updates" : "/api/wholesale/updates"}/${encodeURIComponent(record.id)}/image?v=${encodeURIComponent(record.updatedAt)}`
      : null,
  };
}

export function readWholesaleUpdate(value: string | null): WholesaleUpdate {
  const record = JSON.parse(value ?? "") as WholesaleUpdate;
  if (typeof record.id !== "string" || typeof record.note !== "string" || typeof record.title !== "string" ||
    typeof record.published !== "boolean" || typeof record.createdAt !== "string" || typeof record.updatedAt !== "string" ||
    (record.imageKey !== null && (typeof record.imageKey !== "string" || !/^wholesale-updates\/[a-f0-9-]+\.webp$/.test(record.imageKey)))) {
    throw new Error("Stored wholesale update is invalid.");
  }
  return record;
}
