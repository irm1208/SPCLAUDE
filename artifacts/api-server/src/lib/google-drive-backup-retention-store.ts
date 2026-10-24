import { ReplitConnectors } from "@replit/connectors-sdk";
import { DRIVE_BACKUP_FOLDER_NAME, type DriveBackupFile } from "./google-drive-backup";
import type { RetentionStore } from "./google-drive-backup-retention";

/** No folder creation or mutations during inventory/dry runs. */
export async function createDriveRetentionStore(folderId?: string, captureHour?: Date): Promise<RetentionStore> {
  const client = new ReplitConnectors();
  const request = (path: string, init?: { method: "PATCH" | "DELETE"; headers?: Record<string, string>; body?: string }) =>
    client.proxy("google-drive", path, init);
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
  return {
    folderId,
    get,
    list: async () => {
      const files: DriveBackupFile[] = [];
      const seenTokens = new Set<string>();
      let token: string | undefined;
      do {
        const prefix = captureHour
          ? `S&PBACKUP-${captureHour.toISOString().slice(0, 13).replace("T", "_")}-` : undefined;
        const params = new URLSearchParams({
          q: `'${folderId}' in parents and trashed = false${prefix ? ` and name contains '${prefix}'` : ""}`,
          fields: `nextPageToken,files(${fields})`, pageSize: "1000",
        });
        if (token) params.set("pageToken", token);
        const response = await request(`/drive/v3/files?${params}`); check(response);
        const body = await response.json() as { files?: DriveBackupFile[]; nextPageToken?: string };
        if (!Array.isArray(body.files)) throw new Error("Incomplete backup inventory");
        files.push(...body.files);
        token = body.nextPageToken;
        if (token && seenTokens.has(token)) throw new Error("Repeated backup inventory page");
        if (token) seenTokens.add(token);
      } while (token);
      return files;
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
