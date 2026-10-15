export interface WholesaleUpdate {
  id: string;
  title: string | null;
  note: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  imageUrl: string | null;
}

export const WU_TITLE_MAX = 120;
export const WU_NOTE_MAX = 5000;
export const WU_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const WU_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export const WU_POLL_MS = 60_000;

export function sortNewestFirst(list: WholesaleUpdate[]): WholesaleUpdate[] {
  return [...list].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
}

export function publishedOnly(list: WholesaleUpdate[]): WholesaleUpdate[] {
  return sortNewestFirst(list.filter(u => u.published));
}

export function parseUpdatesResponse(body: unknown): WholesaleUpdate[] {
  const raw = (body as { updates?: unknown })?.updates;
  if (!Array.isArray(raw)) throw new Error("Unexpected response");
  return raw.filter((u): u is WholesaleUpdate => !!u && typeof (u as WholesaleUpdate).id !== "undefined" && typeof (u as WholesaleUpdate).note === "string")
    .map(u => ({ ...u, id: String(u.id), title: u.title || null, imageUrl: u.imageUrl || null }));
}

export function validateDraft(title: string, note: string): string | null {
  if (title.trim().length > WU_TITLE_MAX) return `Title must be ${WU_TITLE_MAX} characters or fewer.`;
  if (!note.trim()) return "Note is required.";
  if (note.length > WU_NOTE_MAX) return `Note must be ${WU_NOTE_MAX} characters or fewer.`;
  return null;
}

export function validateImage(file: { type: string; size: number }): string | null {
  if (!(WU_IMAGE_TYPES as readonly string[]).includes(file.type)) return "Image must be PNG, JPEG, WebP, or GIF.";
  if (file.size > WU_IMAGE_MAX_BYTES) return "Image must be 5 MB or smaller.";
  return null;
}

export interface DraftPayload {
  title: string;
  note: string;
  published: boolean;
  image?: File | null;
  removeImage?: boolean;
}

export function buildUpdateFormData(p: DraftPayload): FormData {
  const fd = new FormData();
  fd.append("title", p.title.trim());
  fd.append("note", p.note);
  fd.append("published", p.published ? "true" : "false");
  if (p.image) fd.append("image", p.image);
  else if (p.removeImage) fd.append("removeImage", "true");
  return fd;
}

export async function readError(r: Response): Promise<string> {
  try {
    const j = await r.json();
    if (j && typeof j.error === "string") return j.error;
    if (j && typeof j.message === "string") return j.message;
  } catch { /* ignore */ }
  return `Request failed (${r.status})`;
}

export function formatUpdateDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
