import { WholesaleTrackingEvent, WholesaleTrackingOrder, WholesaleTrackingParcel } from "../hooks/use-account";
import { getOrderTrackingStatus, projectTrackingPackages, type TrackingPackageView, type TrackingSource } from "@workspace/shipping/tracking";

type TrackingProjectionSource = Partial<TrackingSource> & {
  trackingPackageViews?: TrackingPackageView[];
  packageTrackingStatus?: string | null;
};

export function getTrackingPackageViews(order: TrackingProjectionSource): TrackingPackageView[] {
  if (Array.isArray(order.trackingPackageViews)) return order.trackingPackageViews;
  return projectTrackingPackages(order as TrackingSource);
}

export function getTrackingOrderStatus(order: Pick<TrackingProjectionSource, "trackingPackageViews" | "packageTrackingStatus"> & Partial<TrackingSource>): string | null {
  if (order.packageTrackingStatus !== undefined) return order.packageTrackingStatus;
  const views = Array.isArray(order.trackingPackageViews) ? order.trackingPackageViews : projectTrackingPackages(order as TrackingSource);
  return getOrderTrackingStatus(views);
}

export function normalizeTrackingParcels(order: Pick<WholesaleTrackingOrder, "trackingNumbers" | "trackingStatus" | "trackingEvents" | "trackingLastChecked" | "trackingParcels">): WholesaleTrackingParcel[] {
  if (order.trackingParcels?.length) return order.trackingParcels;
  return order.trackingNumbers.map((trackingNumber, index) => index === 0
    ? { trackingNumber, status: order.trackingStatus, events: order.trackingEvents ?? [], lastChecked: order.trackingLastChecked }
    : { trackingNumber, status: null, events: [], lastChecked: null });
}

export function formatOrderMoney(value: number, currency?: string | null): string {
  if (!Number.isFinite(value)) return "Unavailable";
  const amount = value;
  const safeCurrency = typeof currency === "string" && /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : "GBP";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: safeCurrency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  }
}

export function resolveOrderCurrency(currency?: string | null, orderType?: string | null): string {
  if (typeof currency === "string" && /^[A-Za-z]{3}$/.test(currency)) return currency.toUpperCase();
  if (orderType === "wholesale" || orderType === "wholesale_shared") return "USD";
  return "GBP";
}

export function trackingHistoryId(orderId: string, trackingNumber: string): string {
  const encode = (value: string) => {
    const bytes = new TextEncoder().encode(value);
    return `${bytes.length}-${Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("")}`;
  };
  return `tracking-history-o${encode(orderId)}-t${encode(trackingNumber)}`;
}

export function getLatestTrackingEvent(events: WholesaleTrackingEvent[] | undefined | null): WholesaleTrackingEvent | undefined {
  if (!events || events.length === 0) return undefined;

  let latestEvent: WholesaleTrackingEvent | undefined = undefined;
  let latestTime = -Infinity;

  for (const event of events) {
    if (!event || !event.date) continue;
    const ms = new Date(event.date).getTime();
    if (!Number.isNaN(ms) && ms > latestTime) {
      latestTime = ms;
      latestEvent = event;
    }
  }

  return latestEvent;
}

export function formatSafeDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatSafeTimeAgo(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;

  const diff = Date.now() - ms;
  if (diff < 0) return null;

  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
