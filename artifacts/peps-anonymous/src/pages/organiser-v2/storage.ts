// ─── GB-scoped localStorage helpers ──────────────────────────────────────────
// All v2 workspace data is keyed per group buy so switching GBs doesn't bleed
// state between them. Legacy (un-namespaced) keys are read as a fallback so
// existing prototype data survives the migration. Swap the internals for real
// API calls later without touching the tabs.

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface StorageEnvelope<T> {
  schemaVersion: number;
  data: T;
}

export function gbKey(gbId: string | undefined, key: string): string {
  return gbId ? `v2:${gbId}:${key}` : `v2:${key}`;
}

function isEnvelope<T>(value: unknown): value is StorageEnvelope<T> {
  return typeof value === "object" && value !== null &&
    typeof (value as { schemaVersion?: unknown }).schemaVersion === "number" &&
    "data" in value;
}

export function readGb<T>(
  storage: StorageLike,
  gbId: string | undefined,
  key: string,
  fallback: T,
  legacyKey?: string,
): T {
  const raw = storage.getItem(gbKey(gbId, key)) ?? (legacyKey ? storage.getItem(legacyKey) : null);
  if (raw == null) return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isEnvelope<T>(parsed) ? parsed.data : parsed as T;
  } catch {
    return fallback;
  }
}

export function writeGb<T>(
  storage: StorageLike,
  gbId: string | undefined,
  key: string,
  value: T,
  schemaVersion?: number,
): void {
  const stored = schemaVersion == null ? value : { schemaVersion, data: value };
  storage.setItem(gbKey(gbId, key), JSON.stringify(stored));
}

/** Read a JSON value scoped to a GB, falling back to the legacy global key. */
export function loadGb<T>(gbId: string | undefined, key: string, fallback: T, legacyKey?: string): T {
  return readGb(window.localStorage, gbId, key, fallback, legacyKey);
}

/** Write a JSON value scoped to a GB. */
export function saveGb<T>(gbId: string | undefined, key: string, value: T): void {
  writeGb(window.localStorage, gbId, key, value);
}
