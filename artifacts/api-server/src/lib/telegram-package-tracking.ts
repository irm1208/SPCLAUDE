import type { TrackingPackageView } from "@workspace/shipping/tracking";

export type TrackingRole = "international" | "local";

export interface TrackingHistoryReference {
  packageIndex: number;
  role: TrackingRole;
  eventCount: number;
}

export interface TrackingPage {
  text: string;
  page: number;
  pageCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface PackageTrackingPage extends TrackingPage {
  history: TrackingHistoryReference[];
}

export type WholesaleTrackingCallback =
  | { kind: "list"; page: number }
  | { kind: "detail"; orderCode: string; page: number }
  | { kind: "history"; orderCode: string; packageIndex: number; role: TrackingRole; page: number };

const STATUS_LABELS: Record<string, string> = {
  awaiting_local: "Awaiting local courier",
  pending: "Pending",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  attempted: "Delivery attempted",
  delivered: "Delivered",
  exception: "Exception",
  expired: "Expired",
};

export function escapeTelegramHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escaped(value: unknown, maxLength: number): string {
  const text = String(value ?? "");
  return escapeTelegramHtml(text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1))}…` : text);
}

function boundedPage(requested: number, itemCount: number, pageSize: number): { page: number; pageCount: number } {
  const safeSize = Math.max(1, Math.floor(pageSize) || 1);
  const pageCount = Math.max(1, Math.ceil(itemCount / safeSize));
  const page = Math.min(pageCount - 1, Math.max(0, Number.isFinite(requested) ? Math.floor(requested) : 0));
  return { page, pageCount };
}

function statusLabel(status: string | null): string {
  return status ? (STATUS_LABELS[status.toLowerCase()] ?? status) : "Not checked";
}

function dateLabel(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function eventsNewestFirst(events: TrackingPackageView["international"]["events"]): TrackingPackageView["international"]["events"] {
  return events
    .map((event, index) => {
      const timestamp = new Date(event.date).getTime();
      return { event, index, timestamp: Number.isFinite(timestamp) ? timestamp : null };
    })
    .sort((left, right) => {
      if (left.timestamp !== null && right.timestamp !== null) return right.timestamp - left.timestamp || left.index - right.index;
      if (left.timestamp !== null) return -1;
      if (right.timestamp !== null) return 1;
      return left.index - right.index;
    })
    .map(entry => entry.event);
}

function formatLeg(label: string, leg: TrackingPackageView["international"]): string {
  const carrier = leg.carrier ? ` · ${escaped(leg.carrier, 20)}` : "";
  const checked = dateLabel(leg.lastChecked);
  const lines = [
    `<b>${label}</b>${carrier}`,
    `<code>${escaped(leg.trackingNumber, 200)}</code>`,
    `${escaped(statusLabel(leg.status), 30)}${checked ? ` · checked ${escapeTelegramHtml(checked)} UTC` : ""}`,
  ];
  const latest = eventsNewestFirst(leg.events).find(event => dateLabel(event.date) !== null);
  if (latest) {
    const location = latest.location ? ` · ${escaped(latest.location, 15)}` : "";
    lines.push(`<i>Latest:</i> ${escaped(latest.status, 30)}${location}`);
  }
  return lines.join("\n");
}

export function formatTrackingPackagePage(
  orderCode: string,
  views: TrackingPackageView[],
  requestedPage: number,
  pageSize = 2,
): PackageTrackingPage {
  const { page, pageCount } = boundedPage(requestedPage, views.length, pageSize);
  const start = page * Math.max(1, Math.floor(pageSize) || 1);
  const visible = views.slice(start, start + Math.max(1, Math.floor(pageSize) || 1));
  const history: TrackingHistoryReference[] = [];
  const sections = visible.map((pkg, visibleIndex) => {
    const packageIndex = start + visibleIndex;
    if (pkg.international.events.length) history.push({ packageIndex, role: "international", eventCount: pkg.international.events.length });
    if (pkg.local?.events.length) history.push({ packageIndex, role: "local", eventCount: pkg.local.events.length });
    const lines = [
      `📦 <b>Package ${packageIndex + 1}</b> · ${escaped(pkg.courier, 20)}`,
      formatLeg("International", pkg.international),
    ];
    if (pkg.local) lines.push(formatLeg("Local courier", pkg.local));
    else if (pkg.waitingForLocal) lines.push("⏳ <i>Waiting for local courier tracking</i>");
    lines.push(`<b>Package status:</b> ${escaped(statusLabel(pkg.status), 30)}`);
    return lines.join("\n");
  });
  const empty = views.length === 0 ? "\n\n<i>No tracking number has been added yet.</i>" : "";
  return {
    text: `🚚 <b>Order ${escaped(orderCode, 20)}</b>${empty}${sections.length ? `\n\n${sections.join("\n\n")}` : ""}\n\nPage ${page + 1}/${pageCount}`,
    page,
    pageCount,
    hasPrevious: page > 0,
    hasNext: page + 1 < pageCount,
    history,
  };
}

export function formatTrackingHistory(
  orderCode: string,
  pkg: TrackingPackageView,
  packageIndex: number,
  role: TrackingRole,
  requestedPage: number,
  pageSize = 5,
): TrackingPage {
  const leg = role === "local" ? pkg.local : pkg.international;
  const events = leg?.events ?? [];
  const ordered = eventsNewestFirst(events);
  const { page, pageCount } = boundedPage(requestedPage, ordered.length, pageSize);
  const size = Math.max(1, Math.floor(pageSize) || 1);
  const visible = ordered.slice(page * size, page * size + size);
  const lines = visible.map(event => {
    const date = dateLabel(event.date);
    const location = event.location ? ` · ${escaped(event.location, 30)}` : "";
    return `• ${date ? `${escapeTelegramHtml(date)} UTC` : "Date unavailable"}${location}\n  ${escaped(event.status, 80)}`;
  });
  return {
    text: `📋 <b>${escaped(orderCode, 80)} · Package ${packageIndex + 1} · ${role === "local" ? "Local courier" : "International"}</b>\n\n${lines.join("\n\n") || "<i>No previous updates.</i>"}\n\nPage ${page + 1}/${pageCount}`,
    page,
    pageCount,
    hasPrevious: page > 0,
    hasNext: page + 1 < pageCount,
  };
}

export function isDirectWholesaleTrackingOrder(order: {
  orderType: string | null;
  groupBuyId: string | null;
  sharedOrderId: string | null;
  deletedAt: Date | string | null;
}): boolean {
  return order.orderType === "wholesale" &&
    order.groupBuyId === null &&
    order.sharedOrderId === null &&
    order.deletedAt === null;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    return base64UrlEncode(decoded) === value ? decoded : null;
  } catch {
    return null;
  }
}

export function encodeWholesaleTrackingCallback(value: WholesaleTrackingCallback): string {
  let callback: string;
  if (value.kind === "list") callback = `mn:wtl:${Math.max(0, Math.floor(value.page))}`;
  else if (value.kind === "detail") callback = `mn:wtd:${base64UrlEncode(value.orderCode)}:${Math.max(0, Math.floor(value.page))}`;
  else callback = `mn:wth:${base64UrlEncode(value.orderCode)}:${Math.max(0, Math.floor(value.packageIndex))}:${value.role === "local" ? "l" : "i"}:${Math.max(0, Math.floor(value.page))}`;
  if (Buffer.byteLength(callback, "utf8") > 64) throw new Error("Telegram callback_data exceeds 64 bytes");
  return callback;
}

export function decodeWholesaleTrackingCallback(callback: string): WholesaleTrackingCallback | null {
  let match = /^mn:wtl:(\d+)$/.exec(callback);
  if (match) return { kind: "list", page: Number(match[1]) };
  match = /^mn:wtd:([A-Za-z0-9_-]+):(\d+)$/.exec(callback);
  if (match) {
    const orderCode = base64UrlDecode(match[1]);
    return orderCode === null ? null : { kind: "detail", orderCode, page: Number(match[2]) };
  }
  match = /^mn:wth:([A-Za-z0-9_-]+):(\d+):([il]):(\d+)$/.exec(callback);
  if (match) {
    const orderCode = base64UrlDecode(match[1]);
    if (orderCode === null) return null;
    return {
      kind: "history",
      orderCode,
      packageIndex: Number(match[2]),
      role: match[3] === "l" ? "local" : "international",
      page: Number(match[4]),
    };
  }
  return null;
}