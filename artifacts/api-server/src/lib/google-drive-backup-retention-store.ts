import { ReplitConnectors } from "@replit/connectors-sdk";
import { DRIVE_BACKUP_FOLDER_NAME, type DriveBackupFile } from "./google-drive-backup";
import type { RetentionStore } from "./google-drive-backup-retention";
import { performance } from "node:perf_hooks";

async function drained<T>(work: Promise<T>[]): Promise<T[]> {
  const results = await Promise.allSettled(work);
  return results.map(result => {
    if (result.status === "rejected") throw result.reason;
    return result.value;
  });
}

/** No folder creation or mutations during inventory/dry runs. */
export async function createDriveRetentionStore(
  folderId?: string, captureHour?: Date,
  options: { requestTimeoutMs?: number; deadline?: number; parallelInventory?: boolean } = {},
): Promise<RetentionStore> {
  const client = new ReplitConnectors();
  // Unlike proxy(), createProxyFetch forwards AbortSignal, including to its
  // authentication retry. An expired identity lookup cannot later send a write.
  const proxyFetch = client.createProxyFetch("google-drive");
  const measurements = { requests: 0, requestMs: 0, maxRequestMs: 0 };
  const request = async (path: string, init?: { method: "PATCH" | "DELETE"; headers?: Record<string, string>; body?: string }) => {
    const remaining = (options.deadline ?? Infinity) - Date.now();
    if (remaining <= 0) throw new Error("Drive backup retention budget exhausted");
    const signal = AbortSignal.timeout(Math.max(1, Math.floor(Math.min(options.requestTimeoutMs ?? 30_000, remaining))));
    const started = performance.now();
    let onAbort!: () => void;
    const aborted = new Promise<never>((_, reject) => {
      onAbort = () => reject(new Error("Drive backup retention request timed out"));
      signal.addEventListener("abort", onAbort, { once: true });
    });
    try { return await Promise.race([proxyFetch(path, { ...init, signal }), aborted]); }
    finally {
      signal.removeEventListener("abort", onAbort);
      const elapsed = performance.now() - started;
      measurements.requests++;
      measurements.requestMs += elapsed;
      measurements.maxRequestMs = Math.max(measurements.maxRequestMs, elapsed);
    }
  };
  const check = (response: Response) => {
    if (!response.ok) throw new Error(`Drive backup retention request failed (HTTP ${response.status})`);
  };
  if (!folderId) {
    const params = new URLSearchParams({
      q: `name = '${DRIVE_BACKUP_FOLDER_NAME.replaceAll("'", "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false`,
      fields: "files(id),nextPageToken", pageSize: "100",
    });
    const response = await request(`/drive/v3/files?${params}`); check(response);
    const body = await response.json() as { files?: { id: string }[]; nextPageToken?: string };
    if (body.files?.length !== 1 || body.nextPageToken) throw new Error("Backup folder is missing or ambiguous");
    folderId = body.files[0].id;
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(folderId)) throw new Error("Invalid backup folder");
  const fields = "id,name,size,md5Checksum,mimeType,modifiedTime,parents,trashed,appProperties";
  const get = async (id: string): Promise<DriveBackupFile | null> => {
    const response = await request(`/drive/v3/files/${encodeURIComponent(id)}?fields=${fields}`);
    if (response.status === 404) return null;
    check(response); return await response.json() as DriveBackupFile;
  };
  const folderQuery = `'${folderId}' in parents and trashed = false`;
  const listRange = async (q: string, projection = fields) => {
    const files: (DriveBackupFile & { createdTime?: string })[] = [];
    const seenTokens = new Set<string>();
    let token: string | undefined;
    do {
      const params = new URLSearchParams({
        q,
        fields: `nextPageToken,incompleteSearch,files(${projection})`, pageSize: "1000",
      });
      if (token) params.set("pageToken", token);
      const response = await request(`/drive/v3/files?${params}`); check(response);
      const body = await response.json() as { files?: (DriveBackupFile & { createdTime?: string })[]; nextPageToken?: string; incompleteSearch?: boolean };
      if (!Array.isArray(body.files) || body.incompleteSearch) throw new Error("Incomplete backup inventory");
      files.push(...body.files);
      token = body.nextPageToken;
      if (token && seenTokens.has(token)) throw new Error("Repeated backup inventory page");
      if (token) seenTokens.add(token);
    } while (token);
    return files;
  };
  return {
    folderId,
    metrics: () => ({ ...measurements }),
    get,
    list: async () => {
      const prefix = captureHour
        ? `S&PBACKUP-${captureHour.toISOString().slice(0, 13).replace("T", "_")}-` : undefined;
      if (prefix || !options.parallelInventory) {
        return listRange(`${folderQuery}${prefix ? ` and name contains '${prefix}'` : ""}`);
      }
      // Legacy generations are clustered in time. Equal-duration ranges can put
      // nearly all parts in one worker; manifest-time quartiles balance those
      // generations instead. This small sample chooses boundaries ONLY.
      const samples = await listRange(`${folderQuery} and name contains '.SQL.manifest.json'`, "name,createdTime");
      if (samples.some(file => typeof file.name !== "string")) throw new Error("Incomplete backup inventory creation times");
      const times = samples.filter(file => file.name.endsWith(".SQL.manifest.json"))
        .map(file => Date.parse(file.createdTime ?? "")).sort((a, b) => a - b);
      if (times.some(time => !Number.isFinite(time))) throw new Error("Incomplete backup inventory creation times");
      if (times.length === 0) return listRange(folderQuery);
      const boundaries = [...new Set([1, 2, 3].map(i => new Date(times[Math.floor(times.length * i / 4)]!).toISOString()))];
      // Open-ended first/last ranges include EVERY file, including unexpected
      // names and outlier timestamps. No sampling or reference filtering.
      const ranges = [
        `createdTime < '${boundaries[0]}'`,
        ...boundaries.slice(1).map((upper, i) => `createdTime >= '${boundaries[i]}' and createdTime < '${upper}'`),
        `createdTime >= '${boundaries.at(-1)}'`,
      ];
      return (await drained(ranges.map(range => listRange(`${folderQuery} and ${range}`)))).flat();
    },
    read: async file => {
      if (Number(file.size) > 4 * 1024 * 1024) throw new Error("Backup manifest exceeds safety bound");
      const response = await request(`/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`); check(response);
      if (!response.body) throw new Error("Empty backup manifest response");
      const reader = response.body.getReader();
      const chunks: Buffer[] = []; let length = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.length;
          if (length > 4 * 1024 * 1024) { await reader.cancel(); throw new Error("Backup manifest exceeds safety bound"); }
          chunks.push(Buffer.from(value));
        }
      } finally { reader.releaseLock(); }
      return Buffer.concat(chunks);
    },
    markDeleting: async id => {
      const fresh = await get(id);
      if (!fresh) throw new Error("Backup generation disappeared");
      const response = await request(`/drive/v3/files/${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appProperties: { ...fresh.appProperties, spRetentionDeleting: "1" } }),
      }); check(response);
    },
    remove: async id => {
      const response = await request(`/drive/v3/files/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (response.status !== 404) check(response);
    },
  };
}
