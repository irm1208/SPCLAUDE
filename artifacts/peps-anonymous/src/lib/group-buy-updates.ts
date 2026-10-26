import { parseGroupBuyMoq, type GroupBuyMoq } from "./group-buy-moq";

export const GB_STAGES = ["open", "closed", "ordered", "in_transit", "with_reshipper", "dispatched"] as const;
export type GbStage = (typeof GB_STAGES)[number];
export const GB_STAGE_LABEL: Record<GbStage, string> = {
  open: "Open", closed: "Closed", ordered: "Ordered from vendor",
  in_transit: "In transit", with_reshipper: "With reshipper", dispatched: "Dispatched",
};
export type GbUpdatesScope = "organiser" | "admin";
export const GBU_TITLE_MAX = 120;
export const GBU_NOTE_MAX = 5000;
export const GBU_IMAGE_MAX = 5 * 1024 * 1024;
export const GBU_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const GBU_POLL_MS = 60_000;

export interface GbUpdate {
  id: string; groupBuyId: string; title: string | null; note: string; published: boolean;
  kind: "note" | "status"; stage?: GbStage; imageUrl: string | null; createdAt: string; updatedAt: string;
  telegramAlertQueued?: boolean;
}
export interface GbUpdatesResponse { groupBuy: { id: string; name: string }; stage: GbStage; stageUpdatedAt: string | null; updates: GbUpdate[]; moq?: GroupBuyMoq | null }
export interface GbProgressEntry { stage: GbStage; stageUpdatedAt: string | null; moq?: GroupBuyMoq | null }

export const isStage = (v: unknown): v is GbStage => typeof v === "string" && (GB_STAGES as readonly string[]).includes(v);
export const stageIndex = (s: GbStage | undefined) => (s ? GB_STAGES.indexOf(s) : -1);

export type StepState = "complete" | "current" | "upcoming";
export function stepStates(stage: GbStage | undefined): StepState[] {
  const i = stageIndex(stage);
  return GB_STAGES.map((_, k) => (i < 0 ? "upcoming" : k < i ? "complete" : k === i ? "current" : "upcoming"));
}

/** Fallback only ever derives Open or Closed; never invents later stages. */
export function fallbackStage(lifecycle: string | null | undefined): GbStage | undefined {
  if (!lifecycle) return undefined;
  return lifecycle === "active" || lifecycle === "open" ? "open" : "closed";
}
export function resolveStage(map: Record<string, GbProgressEntry> | undefined, gbId: string, lifecycle?: string | null): GbStage | undefined {
  const e = map?.[gbId];
  if (e && isStage(e.stage)) return e.stage;
  return fallbackStage(lifecycle);
}

export function parseUpdate(raw: unknown): GbUpdate | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" && typeof r.id !== "number") return null;
  if (typeof r.note !== "string") return null;
  return {
    id: String(r.id), groupBuyId: String(r.groupBuyId ?? ""),
    title: typeof r.title === "string" && r.title.trim() ? r.title : null,
    note: r.note, published: r.published === true,
    telegramAlertQueued: r.telegramAlertQueued === true,
    kind: r.kind === "status" ? "status" : "note",
    stage: isStage(r.stage) ? r.stage : undefined,
    imageUrl: typeof r.imageUrl === "string" && r.imageUrl ? r.imageUrl : null,
    createdAt: String(r.createdAt ?? ""), updatedAt: String(r.updatedAt ?? r.createdAt ?? ""),
  };
}
export const sortNewestFirst = (l: GbUpdate[]) => [...l].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
export const publishedOnly = (l: GbUpdate[]) => l.filter(u => u.published);

/** Strict: any invalid container or malformed update is an explicit error, never an empty fallback. */
export function parseUpdatesResponse(raw: unknown): GbUpdatesResponse {
  if (!raw || typeof raw !== "object") throw new GbUpdatesError("Invalid updates response", 0);
  const r = raw as Record<string, unknown>;
  if (!isStage(r.stage)) throw new GbUpdatesError("Invalid updates response: stage", 0);
  if (!r.groupBuy || typeof r.groupBuy !== "object") throw new GbUpdatesError("Invalid updates response: groupBuy", 0);
  if (!Array.isArray(r.updates)) throw new GbUpdatesError("Invalid updates response: updates", 0);
  if (r.stageUpdatedAt !== null && r.stageUpdatedAt !== undefined && typeof r.stageUpdatedAt !== "string") throw new GbUpdatesError("Invalid updates response: stageUpdatedAt", 0);
  const gb = r.groupBuy as Record<string, unknown>;
  const updates = r.updates.map(u => {
    const p = parseUpdate(u);
    if (!p) throw new GbUpdatesError("Invalid updates response: malformed update", 0);
    return p;
  });
  return {
    groupBuy: { id: String(gb.id ?? ""), name: String(gb.name ?? "") },
    stage: r.stage, stageUpdatedAt: typeof r.stageUpdatedAt === "string" ? r.stageUpdatedAt : null,
    updates: sortNewestFirst(updates),
    ...(r.moq !== undefined ? { moq: parseGroupBuyMoq(r.moq) } : {}),
  };
}
export function parseProgressResponse(raw: unknown): Record<string, GbProgressEntry> {
  const p = raw && typeof raw === "object" ? (raw as { progress?: unknown }).progress : undefined;
  if (!p || typeof p !== "object" || Array.isArray(p)) throw new GbUpdatesError("Invalid progress response", 0);
  const out: Record<string, GbProgressEntry> = {};
  for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
    const e = v as Record<string, unknown> | null;
    if (!e || !isStage(e.stage)) throw new GbUpdatesError(`Invalid progress entry for ${k}`, 0);
    if (e.stageUpdatedAt !== null && e.stageUpdatedAt !== undefined && typeof e.stageUpdatedAt !== "string") throw new GbUpdatesError(`Invalid progress entry for ${k}`, 0);
    out[k] = {
      stage: e.stage, stageUpdatedAt: typeof e.stageUpdatedAt === "string" ? e.stageUpdatedAt : null,
      ...(e.moq !== undefined ? { moq: parseGroupBuyMoq(e.moq) } : {}),
    };
  }
  return out;
}

export function validateDraft(title: string, note: string): string | null {
  if (title.trim().length > GBU_TITLE_MAX) return `Title must be ${GBU_TITLE_MAX} characters or fewer`;
  if (!note.trim()) return "Note is required";
  if (note.length > GBU_NOTE_MAX) return `Note must be ${GBU_NOTE_MAX} characters or fewer`;
  return null;
}
export function validateImage(f: { type: string; size: number }): string | null {
  if (!GBU_IMAGE_TYPES.includes(f.type)) return "Image must be PNG, JPEG, WebP or GIF";
  if (f.size > GBU_IMAGE_MAX) return "Image must be 5 MB or smaller";
  return null;
}
export function buildUpdateFormData(d: { title: string; note: string; published: boolean; image?: Blob | null; removeImage?: boolean; sendTelegramAlert?: boolean }) {
  const fd = new FormData();
  fd.append("title", d.title.trim());
  fd.append("note", d.note);
  fd.append("published", d.published ? "true" : "false");
  fd.append("sendTelegramAlert", d.published && d.sendTelegramAlert === true ? "true" : "false");
  if (d.removeImage && !d.image) fd.append("removeImage", "true");
  if (d.image) fd.append("image", d.image);
  return fd;
}

export class GbUpdatesError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = "GbUpdatesError"; }
}
export const isConflict = (e: unknown) => e instanceof GbUpdatesError && e.status === 409;

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const b = body as { error?: string; message?: string } | null;
    throw new GbUpdatesError(b?.error ?? b?.message ?? `Request failed (${res.status})`, res.status);
  }
  return body as T;
}
const enc = encodeURIComponent;
export const customerUpdatesUrl = (gbId: string) => `/api/group-buys/${enc(gbId)}/updates`;
export const manageBase = (scope: GbUpdatesScope, gbId: string) => `/api/${scope}/group-buys/${enc(gbId)}`;

export const fetchProgress = (signal?: AbortSignal) => req<unknown>("/api/group-buys/progress", { signal }).then(parseProgressResponse);
export async function fetchCustomerUpdates(gbId: string, signal?: AbortSignal) {
  const r = parseUpdatesResponse(await req<unknown>(customerUpdatesUrl(gbId), { signal }));
  return { ...r, updates: publishedOnly(r.updates) };
}
export const fetchManagedUpdates = async (scope: GbUpdatesScope, gbId: string, signal?: AbortSignal) =>
  parseUpdatesResponse(await req<unknown>(`${manageBase(scope, gbId)}/updates`, { signal }));
export async function saveMoqSettings(
  scope: GbUpdatesScope, gbId: string,
  settings: {
    enabled: boolean; targetKits: number | null; showToMembers: boolean;
    countMode?: GroupBuyMoq["countMode"]; productTargets?: { productId: string; targetKits: number }[];
  },
  expectedUpdatedAt: string | null,
) {
  return parseUpdatesResponse(await req<unknown>(`${manageBase(scope, gbId)}/moq`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...settings, expectedUpdatedAt }),
  }));
}
export async function saveStage(scope: GbUpdatesScope, gbId: string, stage: GbStage, expectedUpdatedAt: string | null, sendTelegramAlert = false) {
  const r = parseUpdatesResponse(await req<unknown>(`${manageBase(scope, gbId)}/progress`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage, expectedUpdatedAt, sendTelegramAlert }),
  }));
  return r;
}
/** Multipart: never set Content-Type manually. */
export async function saveUpdate(scope: GbUpdatesScope, gbId: string, updateId: string | null, fd: FormData) {
  const url = `${manageBase(scope, gbId)}/updates${updateId ? `/${enc(updateId)}` : ""}`;
  const j = await req<{ update: unknown }>(url, { method: updateId ? "PUT" : "POST", body: fd });
  const u = parseUpdate(j?.update);
  if (!u) throw new GbUpdatesError("Unexpected response", 500);
  return u;
}
export const deleteUpdate = (scope: GbUpdatesScope, gbId: string, updateId: string) =>
  req<{ ok: true }>(`${manageBase(scope, gbId)}/updates/${enc(updateId)}`, { method: "DELETE" });

export function formatUpdateDate(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export const GBU_ANCHOR = "group-buy-updates";
export const progressLinkHref = (gbId: string) => `/order?gbId=${encodeURIComponent(gbId)}#${GBU_ANCHOR}`;

/** Keys to drop on auth change: only the previous user's, never the current user's. */
export function staleUserKeys(prevUser: string | null, currentUser: string | null) {
  if (prevUser === currentUser) return [];
  return [gbuKeys.progress(prevUser), ["group-buy-updates", "customer", prevUser] as const];
}

/** Stage shown for a card: loading or failed-without-data shows nothing, never an Open fallback. */
export function displayStage(q: { data?: Record<string, GbProgressEntry>; isLoading: boolean; isError: boolean; enabled: boolean }, gbId: string, lifecycle?: string | null): GbStage | undefined {
  if (q.data) return resolveStage(q.data, gbId, lifecycle);
  if (!q.enabled) return fallbackStage(lifecycle);
  return undefined;
}

export const gbuKeys = {
  progress: (user: string | null) => ["group-buy-progress", user] as const,
  progressAll: ["group-buy-progress"] as const,
  customer: (user: string | null, gbId: string) => ["group-buy-updates", "customer", user, gbId] as const,
  customerAll: ["group-buy-updates", "customer"] as const,
  manage: (scope: GbUpdatesScope, gbId: string) => ["group-buy-updates", "manage", scope, gbId] as const,
};
