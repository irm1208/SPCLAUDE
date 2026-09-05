/** Physical package identity is durable; carrier histories are replaceable caches. */
export interface TrackingPackage {
  id: string;
  courier: string;
  internationalTrackingNumber: string;
  localTrackingNumber: string | null;
}

export interface TrackingEvent { date: string; status: string; location: string }
export interface TrackingLeg {
  trackingNumber: string;
  carrier?: string;
  status: string | null;
  statusCode?: string;
  events: TrackingEvent[];
  lastChecked: string | null;
}
export interface TrackingPackageView {
  id: string;
  courier: string;
  international: TrackingLeg;
  local: TrackingLeg | null;
  status: string | null;
  waitingForLocal: boolean;
}
export interface TrackingSource {
  trackingPackages?: unknown;
  trackingNumber?: string | null;
  trackingNumbers?: unknown;
  trackingDetails?: unknown;
  trackingStatus?: string | null;
  trackingEvents?: TrackingEvent[] | null;
  trackingLastChecked?: string | Date | null;
}

const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const ATTENTION = new Set(["exception", "undeliverable", "expired", "attempted", "redirected", "seized", "return_to_sender"]);
export const MAX_TRACKING_NUMBERS = 20;

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function normalizeCourier(value: string): string {
  const trimmed = value.trim();
  return /^(?:bmurfs|bmurfs\s+express|190843)$/i.test(trimmed) ? "bmurfs" : trimmed;
}

/** Strict write validation. Never silently truncate, infer roles, or drop a local leg. */
export function normalizeTrackingPackages(value: unknown): TrackingPackage[] {
  if (!Array.isArray(value)) throw new Error("trackingPackages must be an array");
  if (value.length > MAX_TRACKING_NUMBERS) throw new Error("Too many tracking packages");
  const ids = new Set<string>();
  const numbers = new Set<string>();
  const number = (raw: unknown, required: boolean): string | null => {
    if (!required && (raw == null || raw === "")) return null;
    if (typeof raw !== "string" || !raw.trim() || raw.trim().length > 200 || /[\s<>]/.test(raw.trim()) || RESERVED_KEYS.has(raw.trim())) {
      throw new Error("Each package requires a valid international tracking number; local tracking must be a valid number or empty");
    }
    const clean = raw.trim();
    const key = clean.toUpperCase();
    if (numbers.has(key)) throw new Error("Duplicate tracking number: each number can belong to only one package");
    numbers.add(key);
    return clean;
  };
  const packages = value.map(raw => {
    if (!record(raw)) throw new Error("Invalid tracking package");
    if (typeof raw.id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(raw.id) || RESERVED_KEYS.has(raw.id) || ids.has(raw.id)) {
      throw new Error("Invalid or duplicate package identity");
    }
    ids.add(raw.id);
    if (typeof raw.courier !== "string" || !raw.courier.trim() || raw.courier.length > 80) throw new Error("Choose a courier for each package");
    const courier = normalizeCourier(raw.courier);
    const internationalTrackingNumber = number(raw.internationalTrackingNumber, true)!;
    const localTrackingNumber = number(raw.localTrackingNumber, false);
    if (localTrackingNumber && courier !== "bmurfs") throw new Error("Local courier tracking is supported only for BMURFS");
    return { id: raw.id, courier, internationalTrackingNumber, localTrackingNumber };
  });
  if (numbers.size > MAX_TRACKING_NUMBERS) throw new Error(`At most ${MAX_TRACKING_NUMBERS} tracking numbers are supported`);
  return packages;
}

export function flattenTrackingPackages(packages: TrackingPackage[]): string[] {
  return packages.flatMap(p => p.localTrackingNumber ? [p.internationalTrackingNumber, p.localTrackingNumber] : [p.internationalTrackingNumber]);
}

export function canonicalTrackingNumbers(source: TrackingSource): string[] {
  const values = Array.isArray(source.trackingNumbers) && source.trackingNumbers.length
    ? source.trackingNumbers : source.trackingNumber ? [source.trackingNumber] : [];
  return [...new Set(values.filter((v): v is string => typeof v === "string")
    .map(v => v.trim()).filter(v => v && !RESERVED_KEYS.has(v)))];
}

/** Read legacy data conservatively: malformed/stale pairing never hides a number. */
export function getTrackingPackages(source: TrackingSource): TrackingPackage[] {
  let stored: TrackingPackage[] = [];
  try { if (source.trackingPackages != null) stored = normalizeTrackingPackages(source.trackingPackages); } catch { /* legacy rows remain visible */ }
  let numbers = canonicalTrackingNumbers(source);
  if (source.trackingNumbers === undefined && source.trackingNumber === undefined) numbers = flattenTrackingPackages(stored);
  const available = new Set(numbers);
  const valid = stored.filter(p => available.has(p.internationalTrackingNumber) && (!p.localTrackingNumber || available.has(p.localTrackingNumber)));
  const byNumber = new Map<string, TrackingPackage>();
  for (const p of valid) for (const n of flattenTrackingPackages([p])) byNumber.set(n, p);
  const emitted = new Set<string>();
  const usedIds = new Set(valid.map(p => p.id));
  const result: TrackingPackage[] = [];
  numbers.forEach((number, index) => {
    const p = byNumber.get(number);
    if (p) {
      if (!emitted.has(p.id)) { emitted.add(p.id); result.push(p); }
    } else {
      let id = `legacy-${index}`;
      while (usedIds.has(id)) id = `_${id}`;
      usedIds.add(id);
      result.push({ id, courier: "other", internationalTrackingNumber: number, localTrackingNumber: null });
    }
  });
  return result;
}

function timestamp(value: unknown): string | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  return typeof value === "string" ? value : null;
}
function events(value: unknown): TrackingEvent[] {
  return Array.isArray(value) ? value.filter((e): e is TrackingEvent => record(e) &&
    typeof e.date === "string" && typeof e.status === "string" && typeof e.location === "string") : [];
}

export function projectTrackingPackages(source: TrackingSource): TrackingPackageView[] {
  const primary = canonicalTrackingNumbers(source)[0];
  const cache = record(source.trackingDetails) ? source.trackingDetails : {};
  const leg = (number: string): TrackingLeg => {
    const raw = Object.hasOwn(cache, number) ? cache[number] : undefined;
    if (record(raw) && raw.trackingNumber === number && (raw.status === null || typeof raw.status === "string") &&
        Array.isArray(raw.events) && (raw.lastChecked === null || typeof raw.lastChecked === "string")) {
      return {
        trackingNumber: number, status: raw.status,
        ...(typeof raw.carrier === "string" ? { carrier: raw.carrier } : {}),
        ...(typeof raw.statusCode === "string" ? { statusCode: raw.statusCode } : {}),
        events: events(raw.events), lastChecked: timestamp(raw.lastChecked),
      };
    }
    return { trackingNumber: number, status: number === primary ? source.trackingStatus ?? null : null,
      events: number === primary ? events(source.trackingEvents) : [],
      lastChecked: number === primary ? timestamp(source.trackingLastChecked) : null };
  };
  return getTrackingPackages(source).map(pkg => {
    const international = leg(pkg.internationalTrackingNumber);
    const local = pkg.localTrackingNumber ? leg(pkg.localTrackingNumber) : null;
    let status = international.status;
    if (pkg.courier === "bmurfs") {
      // Local progress is authoritative after handover, even if the international cache lags.
      if (local?.status && local.status !== "pending") status = local.status;
      else if (international.status === "delivered") status = local?.status ?? "awaiting_local";
    }
    return { id: pkg.id, courier: pkg.courier, international, local, status,
      waitingForLocal: pkg.courier === "bmurfs" && !pkg.localTrackingNumber };
  });
}

export function getOrderTrackingStatus(packages: TrackingPackageView[]): string | null {
  if (!packages.length || packages.every(p => !p.status)) return null;
  if (packages.every(p => p.status === "delivered")) return "delivered";
  const issue = packages.find(p => p.status && ATTENTION.has(p.status));
  if (issue) return issue.status;
  const active = packages.filter(p => p.status !== "delivered");
  if (active.every(p => p.status === "out_for_delivery")) return "out_for_delivery";
  if (active.some(p => p.status === "in_transit")) return "in_transit";
  if (active.some(p => p.status === "awaiting_local")) return "awaiting_local";
  return active.find(p => p.status)?.status ?? "pending";
}

/** Identifier addition/removal, not regrouping or presentation ordering. */
export function trackingNumbersChanged(before: string[], after: string[]): boolean {
  const oldSet = new Set(before);
  const nextSet = new Set(after);
  return oldSet.size !== nextSet.size || [...oldSet].some(n => !nextSet.has(n));
}

export function trackingCarrierCode(pkg: TrackingPackage, role: "international" | "local"): number | undefined {
  return pkg.courier === "bmurfs" && role === "international" ? 190843 : undefined;
}

/** Includes raw metadata: even malformed/changed pairing invalidates in-flight work. */
export function trackingSnapshot(source: TrackingSource): string {
  return JSON.stringify({ numbers: canonicalTrackingNumbers(source), packages: source.trackingPackages ?? null });
}