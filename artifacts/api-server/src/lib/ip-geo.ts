import { db } from "@workspace/db";
import { geoIpCacheTable } from "@workspace/db/schema";
import { inArray, lt } from "drizzle-orm";

export type Geo = {
  country: string | null;
  city: string | null;
  region: string | null;
  isp: string | null;
  org: string | null;
  lat: number | null;
  lon: number | null;
  isProxy: boolean | null;
  isHosting: boolean | null;
};

type CacheEntry = { geo: Geo; expiresAt: number };

const memCache = new Map<string, CacheEntry>();
const EMPTY: Geo = { country: null, city: null, region: null, isp: null, org: null, lat: null, lon: null, isProxy: null, isHosting: null };

const TTL_SUCCESS_MS = 7 * 24 * 60 * 60 * 1000;
const TTL_FAILURE_MS = 10 * 60 * 1000;
const TTL_PRIVATE_MS = 30 * 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 3000;

export function normIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const trimmed = ip.trim();
  if (!trimmed || trimmed === "unknown") return null;
  if (/^::ffff:/i.test(trimmed)) return trimmed.slice(7);
  return trimmed;
}

function isPrivate(ip: string): boolean {
  if (ip === "::1" || ip === "0.0.0.0") return true;
  if (ip.startsWith("127.")) return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  if (/^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./.test(ip)) return true;
  if (/^f[cd][0-9a-f]{2}:/i.test(ip)) return true;
  if (/^fe80:/i.test(ip)) return true;
  return false;
}

function readMem(ip: string): Geo | null {
  const hit = memCache.get(ip);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) { memCache.delete(ip); return null; }
  return hit.geo;
}

function writeMem(ip: string, geo: Geo, ttlMs: number) {
  memCache.set(ip, { geo, expiresAt: Date.now() + ttlMs });
}

async function loadFromDb(ips: string[]): Promise<void> {
  if (ips.length === 0) return;
  try {
    const rows = await db
      .select()
      .from(geoIpCacheTable)
      .where(inArray(geoIpCacheTable.ip, ips));
    const now = Date.now();
    for (const row of rows) {
      const expiresAt = row.expiresAt.getTime();
      if (expiresAt <= now) continue;
      memCache.set(row.ip, {
        geo: {
          country: row.country ?? null,
          city: row.city ?? null,
          region: row.region ?? null,
          isp: row.isp ?? null,
          org: row.org ?? null,
          lat: row.lat ?? null,
          lon: row.lon ?? null,
          isProxy: row.isProxy ?? null,
          isHosting: row.isHosting ?? null,
        },
        expiresAt,
      });
    }
  } catch {
    // DB unavailable — continue with empty cache
  }
}

async function writeToDb(ip: string, geo: Geo, ttlMs: number): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlMs);
    await db
      .insert(geoIpCacheTable)
      .values({ ip, country: geo.country, city: geo.city, region: geo.region, isp: geo.isp, org: geo.org, lat: geo.lat ?? undefined, lon: geo.lon ?? undefined, isProxy: geo.isProxy ?? undefined, isHosting: geo.isHosting ?? undefined, expiresAt })
      .onConflictDoUpdate({
        target: geoIpCacheTable.ip,
        set: { country: geo.country, city: geo.city, region: geo.region, isp: geo.isp, org: geo.org, lat: geo.lat ?? undefined, lon: geo.lon ?? undefined, isProxy: geo.isProxy ?? undefined, isHosting: geo.isHosting ?? undefined, expiresAt },
      });
  } catch {
    // Fire-and-forget — don't block the response
  }
}

async function fetchOne(ip: string): Promise<Geo> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    // ip-api.com free tier — HTTP only, 45 req/min, no key needed
    const fields = "status,country,regionName,city,lat,lon,isp,org,proxy,hosting,query";
    const r = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${fields}`, {
      signal: ctrl.signal,
    });
    if (!r.ok) return EMPTY;
    const data = (await r.json()) as {
      status?: string;
      country?: string;
      regionName?: string;
      city?: string;
      lat?: number;
      lon?: number;
      isp?: string;
      org?: string;
      proxy?: boolean;
      hosting?: boolean;
    };
    if (!data || data.status !== "success") return EMPTY;
    return {
      country: data.country || null,
      city: data.city || null,
      region: data.regionName || null,
      isp: data.isp || null,
      org: data.org || null,
      lat: data.lat ?? null,
      lon: data.lon ?? null,
      isProxy: data.proxy ?? null,
      isHosting: data.hosting ?? null,
    };
  } catch {
    return EMPTY;
  } finally {
    clearTimeout(timer);
  }
}

export async function enrichIps(rawIps: (string | null | undefined)[]): Promise<Map<string, Geo>> {
  const unique = new Set<string>();
  for (const raw of rawIps) {
    const ip = normIp(raw);
    if (ip) unique.add(ip);
  }

  const out = new Map<string, Geo>();
  const needDbCheck: string[] = [];

  // Pass 1: serve from memory cache
  for (const ip of unique) {
    const cached = readMem(ip);
    if (cached) { out.set(ip, cached); continue; }
    if (isPrivate(ip)) {
      writeMem(ip, EMPTY, TTL_PRIVATE_MS);
      out.set(ip, EMPTY);
      continue;
    }
    needDbCheck.push(ip);
  }

  // Pass 2: load missing IPs from DB into memory cache
  await loadFromDb(needDbCheck);

  const toFetch: string[] = [];
  for (const ip of needDbCheck) {
    const cached = readMem(ip);
    if (cached) { out.set(ip, cached); continue; }
    toFetch.push(ip);
  }

  // Pass 3: fetch from external API for any remaining misses
  await Promise.all(
    toFetch.map(async ip => {
      const geo = await fetchOne(ip);
      const hasData = !!(geo.country || geo.city);
      const ttl = hasData ? TTL_SUCCESS_MS : TTL_FAILURE_MS;
      writeMem(ip, geo, ttl);
      out.set(ip, geo);
      // Persist asynchronously — don't block the response
      writeToDb(ip, geo, ttl).catch(() => {});
    }),
  );

  return out;
}

/**
 * Same as enrichIps but skips the external API call.
 * Returns cached geo data (memory + DB) only. IPs not yet cached return EMPTY.
 * Use this in request-critical paths so the response is never delayed by
 * outbound HTTP to ip-api.com.
 */
export async function enrichIpsFromCache(rawIps: (string | null | undefined)[]): Promise<Map<string, Geo>> {
  const unique = new Set<string>();
  for (const raw of rawIps) {
    const ip = normIp(raw);
    if (ip) unique.add(ip);
  }

  const out = new Map<string, Geo>();
  const needDbCheck: string[] = [];

  for (const ip of unique) {
    const cached = readMem(ip);
    if (cached) { out.set(ip, cached); continue; }
    if (isPrivate(ip)) {
      writeMem(ip, EMPTY, TTL_PRIVATE_MS);
      out.set(ip, EMPTY);
      continue;
    }
    needDbCheck.push(ip);
  }

  await loadFromDb(needDbCheck);

  for (const ip of needDbCheck) {
    const cached = readMem(ip);
    out.set(ip, cached ?? EMPTY);
  }

  return out;
}

export async function enrichLogsWithGeo<T extends { ip: string | null }>(
  logs: T[],
): Promise<(T & { country: string | null; city: string | null })[]> {
  const map = await enrichIps(logs.map(l => l.ip));
  return logs.map(l => {
    const key = normIp(l.ip);
    const geo = key ? map.get(key) ?? EMPTY : EMPTY;
    return { ...l, country: geo.country, city: geo.city };
  });
}

// Periodically clean up expired rows from the DB (run once at startup)
export async function pruneExpiredGeoCache(): Promise<void> {
  try {
    await db.delete(geoIpCacheTable).where(lt(geoIpCacheTable.expiresAt, new Date()));
  } catch {
    // Non-critical
  }
}
