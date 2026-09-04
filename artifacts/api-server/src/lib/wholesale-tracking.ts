const REDIRECTED = /\b(?:redirected|rerouted|re-routed)\b/i;
const SEIZED = /\b(?:seized|seizure|confiscated|confiscation)\b/i;
const RETURN_TO_SENDER = /\b(?:returned|returning)\s+(?:back\s+)?to\s+(?:the\s+)?sender\b/i;

export interface CarrierTrackingEvent {
  date: string;
  description: string;
}

function latestEvents(events: readonly CarrierTrackingEvent[]): CarrierTrackingEvent[] {
  if (events.length === 0) return [];
  const dated = events.map(event => ({ event, timestamp: Date.parse(event.date) }));
  // Events from separate providers are flattened upstream, so their listing
  // order is not a reliable cross-provider chronology. An unknown timestamp
  // makes the current event ambiguous rather than guessing from old text.
  if (dated.some(({ timestamp }) => Number.isNaN(timestamp))) return [];
  const latestTime = Math.max(...dated.map(({ timestamp }) => timestamp));
  return dated.filter(({ timestamp }) => timestamp === latestTime).map(({ event }) => event);
}

function isNegated(description: string, phrase: RegExp): boolean {
  return new RegExp(`\\b(?:not|no longer)\\s+(?:being\\s+)?${phrase.source}`, "i").test(description);
}

function specialStatusForDescription(description: string): string | null {
  if (RETURN_TO_SENDER.test(description) && !isNegated(description, RETURN_TO_SENDER)) return "return_to_sender";
  if (SEIZED.test(description) && !isNegated(description, SEIZED)) return "seized";
  if (REDIRECTED.test(description) && !isNegated(description, REDIRECTED)) return "redirected";
  return null;
}

/**
 * Applies only explicit event wording over the carrier's normalized status.
 * Customs delays are intentionally not elevated beyond Track17's exception.
 */
export function classifyTrackingStatus(track17Status: string, events: readonly CarrierTrackingEvent[]): string {
  // Track17's current terminal status is authoritative even though its event
  // history continues to include earlier redirections or return attempts.
  if (track17Status === "delivered") return track17Status;
  const currentStatuses = latestEvents(events).map(event => specialStatusForDescription(event.description));
  if (currentStatuses.length > 0 && currentStatuses.every(Boolean) &&
    new Set(currentStatuses).size === 1) return currentStatuses[0]!;
  return track17Status;
}

export function hasWholesaleTrackingOptIn(preferences: unknown): boolean {
  return !!(preferences && typeof preferences === "object" &&
    (preferences as Record<string, unknown>).wholesale_tracking === true);
}

export function shouldApplyWholesaleTrackingClassification(orderType: string | null | undefined): boolean {
  return orderType === "wholesale";
}

export function toggleWholesaleTrackingPreference(preferences: Record<string, boolean>): Record<string, boolean> {
  return { ...preferences, wholesale_tracking: !hasWholesaleTrackingOptIn(preferences) };
}

export function isWholesaleTrackingAlertStatus(status: string): boolean {
  return status === "delivered" ||
    status === "redirected" ||
    status === "seized" ||
    status === "return_to_sender";
}