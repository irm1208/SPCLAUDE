import { WholesaleTrackingEvent } from "../hooks/use-account";

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
