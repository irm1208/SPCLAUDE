import { randomUUID } from "crypto";
import { createReadStream, createWriteStream, openAsBlob } from "fs";
import { rename, stat, unlink } from "fs/promises";
import { basename, dirname, join } from "path";
import { tmpdir } from "os";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { createGzip } from "zlib";
import { ReplitConnectors } from "@replit/connectors-sdk";

export const DRIVE_BACKUP_FOLDER_NAME = "Salt & Peps Database Backups";
export const DRIVE_BACKUP_FILE_PREFIX = "S&PBACKUP-";
export const DRIVE_BACKUP_FILE_SUFFIX = ".sql.gz.enc";
export const DRIVE_BACKUP_MIME_TYPE = "application/octet-stream";
const PLAIN_SQL_MIME_TYPE = "application/sql";

const DRIVE_CONNECTOR = "google-drive";
const DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const MAX_UPLOAD_ATTEMPTS = 6;

export interface DriveBackupFile {
  id: string;
  name: string;
  size?: string;
  mimeType?: string;
  modifiedTime?: string;
  parents?: string[];
  trashed?: boolean;
}

export function buildDriveBackupFileName(date: Date = new Date()): string {
  const timestamp = date
    .toISOString()
    .replace("T", "_")
    .replace(/:/g, "-")
    .split(".")[0];
  return `${DRIVE_BACKUP_FILE_PREFIX}${timestamp}${DRIVE_BACKUP_FILE_SUFFIX}`;
}

export function buildPlainDriveBackupFileName(date: Date = new Date()): string {
  const timestamp = date
    .toISOString()
    .replace("T", "_")
    .replace(/:/g, "-")
    .split(".")[0];
  return `${DRIVE_BACKUP_FILE_PREFIX}${timestamp}.SQL`;
}

export function isSupportedBackupName(fileName: string): boolean {
  const timestamp = "\\d{4}-\\d{2}-\\d{2}_\\d{2}-\\d{2}-\\d{2}";
  return new RegExp(
    `^${DRIVE_BACKUP_FILE_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${timestamp}(?:\\.sql\\.gz\\.enc|\\.SQL)$`,
  ).test(fileName);
}

export function selectNewestBackup(files: DriveBackupFile[]): DriveBackupFile | null {
  return (
    [...files]
      .filter((file) => !file.trashed && isSupportedBackupName(file.name))
      .sort((a, b) => {
        const bTime = Date.parse(b.modifiedTime ?? "") || 0;
        const aTime = Date.parse(a.modifiedTime ?? "") || 0;
        return bTime - aTime;
      })[0] ?? null
  );
}

export function findMatchingDriveBackup(
  files: DriveBackupFile[],
  fileName: string,
  sizeBytes: number,
): DriveBackupFile | null {
  return (
    files.find(
      (file) => file.name === fileName && Number(file.size) === sizeBytes,
    ) ?? null
  );
}

export function discoverLegacyBackupFiles(paths: string[]): string[] {
  return paths.filter((filePath) => filePath.toLowerCase().endsWith(".sql"));
}

export function buildDriveTransportHeaders(encryptedSize: number): Record<string, string> {
  return {
    "Content-Type": DRIVE_BACKUP_MIME_TYPE,
    "Content-Length": String(encryptedSize),
  };
}

export function buildPlainDriveTransportHeaders(
  originalSize: number,
  transportSize: number,
): Record<string, string> {
  return {
    "Content-Type": PLAIN_SQL_MIME_TYPE,
    "Content-Encoding": "gzip",
    "Content-Length": String(transportSize),
    "Content-Range": `bytes 0-${originalSize - 1}/${originalSize}`,
  };
}

function buildDriveResumableChunkHeaders(
  encryptedSize: number,
  offset: number,
): Record<string, string> {
  return {
    ...buildDriveTransportHeaders(encryptedSize - offset),
    "Content-Range": `bytes ${offset}-${encryptedSize - 1}/${encryptedSize}`,
  };
}

function committedDriveUploadBytes(response: Response, totalSize: number): number {
  const range = response.headers.get("range");
  const match = range?.match(/^bytes=(\d+)-(\d+)$/);
  if (!match) return 0;
  const end = Number(match[2]);
  return Number.isSafeInteger(end) && end >= 0 && end < totalSize ? end + 1 : 0;
}

export function isRetryableDriveUploadStatus(status: number): boolean {
  return [403, 408, 425, 429, 500, 502, 503, 504].includes(status);
}

function isRetryableDriveUploadException(error: unknown): boolean {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return isRetryableDriveUploadStatus(error.status);
  }
  return true;
}

export type MigrationAction = "upload" | "already_migrated" | "conflict";

export function migrationAction(
  localSize: number,
  remoteFiles: DriveBackupFile[],
): MigrationAction {
  if (remoteFiles.some((file) => Number(file.size) === localSize)) {
    return "already_migrated";
  }
  return remoteFiles.length > 0 ? "conflict" : "upload";
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function driveFilesPath(params: URLSearchParams): string {
  return `/drive/v3/files?${params.toString()}`;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function createPlainSqlTransportFile(filePath: string): Promise<{
  filePath: string;
  size: number;
}> {
  const transportPath = join(
    tmpdir(),
    `drive-backup-${process.pid}-${randomUUID()}.transport.gz`,
  );
  try {
    await pipeline(
      createReadStream(filePath),
      createGzip(),
      createWriteStream(transportPath, { flags: "wx", mode: 0o600 }),
    );
    const transportStats = await stat(transportPath);
    return { filePath: transportPath, size: transportStats.size };
  } catch (error) {
    await unlink(transportPath).catch(() => undefined);
    throw error;
  }
}

async function responseError(response: Response, action: string): Promise<never> {
  const body = await response.text().catch(() => "");
  throw new Error(
    `${action} failed (${response.status} ${response.statusText})${
      body ? `: ${body.slice(0, 500)}` : ""
    }`,
  );
}

class GoogleDriveBackupStorage {
  private readonly connectors = new ReplitConnectors();
  private folderId: string | null = null;

  async getFolderId(): Promise<string> {
    if (this.folderId) return this.folderId;

    const query = [
      `name = '${escapeDriveQueryValue(DRIVE_BACKUP_FOLDER_NAME)}'`,
      `mimeType = '${DRIVE_FOLDER_MIME_TYPE}'`,
      "'root' in parents",
      "trashed = false",
    ].join(" and ");
    const params = new URLSearchParams({
      q: query,
      fields: "files(id,name,mimeType,parents,modifiedTime)",
      pageSize: "10",
      orderBy: "modifiedTime desc",
    });
    const existingResponse = await this.connectors.proxy(
      DRIVE_CONNECTOR,
      driveFilesPath(params),
    );
    if (!existingResponse.ok) {
      return responseError(existingResponse, "Finding the Google Drive backup folder");
    }
    const existing = (await existingResponse.json()) as {
      files?: Array<{ id?: string }>;
    };
    const existingId = existing.files?.find((file) => file.id)?.id;
    if (existingId) {
      this.folderId = existingId;
      return existingId;
    }

    const createResponse = await this.connectors.proxy(
      DRIVE_CONNECTOR,
      "/drive/v3/files",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: DRIVE_BACKUP_FOLDER_NAME,
          mimeType: DRIVE_FOLDER_MIME_TYPE,
          parents: ["root"],
        }),
      },
    );
    if (!createResponse.ok) {
      return responseError(createResponse, "Creating the Google Drive backup folder");
    }
    const created = (await createResponse.json()) as { id?: string };
    if (!created.id) {
      throw new Error("Google Drive created the backup folder without returning an ID");
    }
    this.folderId = created.id;
    return created.id;
  }

  async findFilesByName(fileName: string): Promise<DriveBackupFile[]> {
    const folderId = await this.getFolderId();
    const params = new URLSearchParams({
      q: [
        `'${escapeDriveQueryValue(folderId)}' in parents`,
        `name = '${escapeDriveQueryValue(fileName)}'`,
        "trashed = false",
      ].join(" and "),
      fields: "files(id,name,size,mimeType,modifiedTime,parents,trashed)",
      pageSize: "100",
    });
    const response = await this.connectors.proxy(DRIVE_CONNECTOR, driveFilesPath(params));
    if (!response.ok) return responseError(response, `Finding Drive files named ${fileName}`);
    const body = (await response.json()) as { files?: DriveBackupFile[] };
    return body.files ?? [];
  }

  async listBackups(): Promise<DriveBackupFile[]> {
    const folderId = await this.getFolderId();
    const files: DriveBackupFile[] = [];
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({
        q: [`'${escapeDriveQueryValue(folderId)}' in parents`, "trashed = false"].join(" and "),
        fields: "nextPageToken,files(id,name,size,mimeType,modifiedTime,parents,trashed)",
        pageSize: "100",
        orderBy: "modifiedTime desc",
      });
      if (pageToken) params.set("pageToken", pageToken);
      const response = await this.connectors.proxy(DRIVE_CONNECTOR, driveFilesPath(params));
      if (!response.ok) return responseError(response, "Listing Google Drive backups");
      const body = (await response.json()) as {
        files?: DriveBackupFile[];
        nextPageToken?: string;
      };
      files.push(...(body.files ?? []));
      pageToken = body.nextPageToken;
    } while (pageToken);
    return files;
  }

  async getFile(fileId: string): Promise<DriveBackupFile> {
    const params = new URLSearchParams({
      fields: "id,name,size,mimeType,modifiedTime,parents,trashed",
    });
    const response = await this.connectors.proxy(
      DRIVE_CONNECTOR,
      `/drive/v3/files/${encodeURIComponent(fileId)}?${params.toString()}`,
    );
    if (!response.ok) return responseError(response, `Verifying Google Drive file ${fileId}`);
    return (await response.json()) as DriveBackupFile;
  }

  private async uploadPlainSql(filePath: string, fileName: string): Promise<DriveBackupFile> {
    const folderId = await this.getFolderId();
    const fileStats = await stat(filePath);
    const transport = await createPlainSqlTransportFile(filePath);
    try {
      const transportBlob = await openAsBlob(transport.filePath, { type: PLAIN_SQL_MIME_TYPE });
      let uploadResponse: Response | null = null;
      for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt += 1) {
        const initResponse = await this.connectors.proxy(
          DRIVE_CONNECTOR,
          "/upload/drive/v3/files?uploadType=resumable",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json; charset=UTF-8",
              "X-Upload-Content-Type": PLAIN_SQL_MIME_TYPE,
              "X-Upload-Content-Length": String(fileStats.size),
            },
            body: JSON.stringify({
              name: fileName,
              mimeType: PLAIN_SQL_MIME_TYPE,
              parents: [folderId],
            }),
          },
        );
        if (!initResponse.ok) {
          return responseError(initResponse, "Starting the Google Drive backup upload");
        }
        const location = initResponse.headers.get("location");
        if (!location) {
          throw new Error("Google Drive did not return a resumable upload location");
        }
        const locationUrl = new URL(location);
        const uploadPath = `${locationUrl.pathname}${locationUrl.search}`;

        try {
          uploadResponse = await this.connectors.proxy(DRIVE_CONNECTOR, uploadPath, {
            method: "PUT",
            headers: buildPlainDriveTransportHeaders(fileStats.size, transport.size),
            body: transportBlob,
          });
        } catch (error) {
          if (!isRetryableDriveUploadException(error)) {
            throw new Error("Google Drive backup upload failed");
          }
          uploadResponse = null;
        }
        if (uploadResponse?.ok && (uploadResponse.status === 200 || uploadResponse.status === 201)) {
          break;
        }
        if (uploadResponse && !isRetryableDriveUploadStatus(uploadResponse.status)) {
          return responseError(uploadResponse, "Uploading the Google Drive backup");
        }
        await uploadResponse?.arrayBuffer().catch(() => new ArrayBuffer(0));

        let statusResponse: Response | null = null;
        try {
          statusResponse = await this.connectors.proxy(DRIVE_CONNECTOR, uploadPath, {
            method: "PUT",
            headers: {
              "Content-Length": "0",
              "Content-Range": `bytes */${fileStats.size}`,
            },
          });
        } catch {
          statusResponse = null;
        }
        if (statusResponse?.ok && (statusResponse.status === 200 || statusResponse.status === 201)) {
          uploadResponse = statusResponse;
          break;
        }
        if (
          statusResponse &&
          statusResponse.status !== 308 &&
          !isRetryableDriveUploadStatus(statusResponse.status)
        ) {
          return responseError(statusResponse, "Recovering the Google Drive backup upload");
        }
        await statusResponse?.arrayBuffer().catch(() => new ArrayBuffer(0));
        if (attempt === MAX_UPLOAD_ATTEMPTS) {
          throw new Error("Google Drive backup upload did not complete after retries");
        }
        const delayMs = Math.min(1_000 * 2 ** (attempt - 1), 16_000);
        console.warn(
          `[db-backup] Plain SQL upload was not confirmed; starting a new session in ${delayMs} ms (${attempt}/${MAX_UPLOAD_ATTEMPTS})`,
        );
        await sleep(delayMs);
      }
      if (!uploadResponse) {
        throw new Error("Google Drive upload did not produce a response");
      }
      if (!uploadResponse.ok || (uploadResponse.status !== 200 && uploadResponse.status !== 201)) {
        return responseError(uploadResponse, "Uploading the Google Drive backup");
      }
      const uploaded = (await uploadResponse.json().catch(() => ({}))) as { id?: string };
      if (!uploaded.id) {
        throw new Error("Google Drive completed the upload without returning a file ID");
      }
      const verified = await this.getFile(uploaded.id);
      if (Number(verified.size) !== fileStats.size || verified.name !== fileName) {
        throw new Error(
          `Google Drive verification failed for ${fileName}: expected ${fileStats.size} bytes, got ${verified.size ?? "unknown"}`,
        );
      }
      return verified;
    } finally {
      await unlink(transport.filePath).catch(() => undefined);
    }
  }

  async upload(filePath: string, fileName: string): Promise<DriveBackupFile> {
    if (fileName.endsWith(".SQL")) {
      return this.uploadPlainSql(filePath, fileName);
    }
    const folderId = await this.getFolderId();
    const fileStats = await stat(filePath);
    const initResponse = await this.connectors.proxy(
      DRIVE_CONNECTOR,
      "/upload/drive/v3/files?uploadType=resumable",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": DRIVE_BACKUP_MIME_TYPE,
          "X-Upload-Content-Length": String(fileStats.size),
        },
        body: JSON.stringify({
          name: fileName,
          mimeType: DRIVE_BACKUP_MIME_TYPE,
          parents: [folderId],
        }),
      },
    );
    if (!initResponse.ok) {
      return responseError(initResponse, "Starting the Google Drive backup upload");
    }
    const location = initResponse.headers.get("location");
    if (!location) {
      throw new Error("Google Drive did not return a resumable upload location");
    }

    const locationUrl = new URL(location);
    const uploadPath = `${locationUrl.pathname}${locationUrl.search}`;
    const encryptedBlob = await openAsBlob(filePath, { type: DRIVE_BACKUP_MIME_TYPE });
    let uploadResponse: Response | null = null;
    let nextOffset = 0;
    let needsStatusRecovery = false;
    for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt += 1) {
      if (needsStatusRecovery) {
        let statusResponse: Response;
        try {
          statusResponse = await this.connectors.proxy(DRIVE_CONNECTOR, uploadPath, {
            method: "PUT",
            headers: {
              "Content-Length": "0",
              "Content-Range": `bytes */${fileStats.size}`,
            },
          });
        } catch (error) {
          if (!isRetryableDriveUploadException(error)) {
            throw new Error("Google Drive backup upload status check failed");
          }
          const delayMs = Math.min(1_000 * 2 ** (attempt - 1), 16_000);
          console.warn(
            `[db-backup] Drive upload status check failed; retrying in ${delayMs} ms (${attempt}/${MAX_UPLOAD_ATTEMPTS})`,
          );
          await sleep(delayMs);
          continue;
        }
        if (statusResponse.status === 200 || statusResponse.status === 201) {
          uploadResponse = statusResponse;
          break;
        }
        if (statusResponse.status === 308) {
          nextOffset = committedDriveUploadBytes(statusResponse, fileStats.size);
          needsStatusRecovery = false;
        } else {
          if (!isRetryableDriveUploadStatus(statusResponse.status)) {
            return responseError(statusResponse, "Recovering the Google Drive backup upload");
          }
          await statusResponse.arrayBuffer().catch(() => new ArrayBuffer(0));
          const delayMs = Math.min(1_000 * 2 ** (attempt - 1), 16_000);
          console.warn(
            `[db-backup] Drive upload status returned ${statusResponse.status}; retrying in ${delayMs} ms (${attempt}/${MAX_UPLOAD_ATTEMPTS})`,
          );
          await sleep(delayMs);
          continue;
        }
      }
      try {
        uploadResponse = await this.connectors.proxy(DRIVE_CONNECTOR, uploadPath, {
          method: "PUT",
          headers: buildDriveResumableChunkHeaders(fileStats.size, nextOffset),
          body: encryptedBlob.slice(nextOffset),
        });
      } catch (error) {
        if (!isRetryableDriveUploadException(error)) {
          throw new Error("Google Drive backup upload failed");
        }
        const delayMs = Math.min(1_000 * 2 ** (attempt - 1), 16_000);
        console.warn(
          `[db-backup] Drive upload request failed; retrying in ${delayMs} ms (${attempt}/${MAX_UPLOAD_ATTEMPTS})`,
        );
        needsStatusRecovery = true;
        await sleep(delayMs);
        continue;
      }
      if (!isRetryableDriveUploadStatus(uploadResponse.status) || attempt === MAX_UPLOAD_ATTEMPTS) {
        break;
      }
      await uploadResponse.arrayBuffer().catch(() => new ArrayBuffer(0));
      const delayMs = Math.min(1_000 * 2 ** (attempt - 1), 16_000);
      console.warn(
        `[db-backup] Drive upload returned ${uploadResponse.status}; retrying in ${delayMs} ms (${attempt}/${MAX_UPLOAD_ATTEMPTS})`,
      );
      needsStatusRecovery = true;
      await sleep(delayMs);
    }
    if (!uploadResponse) {
      throw new Error("Google Drive upload did not produce a response");
    }
    if (!uploadResponse.ok || (uploadResponse.status !== 200 && uploadResponse.status !== 201)) {
      return responseError(uploadResponse, "Uploading the Google Drive backup");
    }
    const uploaded = (await uploadResponse.json().catch(() => ({}))) as { id?: string };
    if (!uploaded.id) {
      throw new Error("Google Drive completed the upload without returning a file ID");
    }
    const verified = await this.getFile(uploaded.id);
    if (Number(verified.size) !== fileStats.size || verified.name !== fileName) {
      throw new Error(
        `Google Drive verification failed for ${fileName}: expected ${fileStats.size} bytes, got ${verified.size ?? "unknown"}`,
      );
    }
    return verified;
  }

  async download(fileId: string, destinationPath: string): Promise<void> {
    const response = await this.connectors.proxy(
      DRIVE_CONNECTOR,
      `/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    );
    if (!response.ok) return responseError(response, `Downloading Google Drive file ${fileId}`);
    if (!response.body) throw new Error(`Google Drive download ${fileId} returned no response body`);

    const temporaryPath = join(
      dirname(destinationPath),
      `.${basename(destinationPath)}.${process.pid}.${randomUUID()}.partial`,
    );
    try {
      await pipeline(
        Readable.fromWeb(response.body as import("stream/web").ReadableStream),
        createWriteStream(temporaryPath, { flags: "wx", mode: 0o600 }),
      );
      await rename(temporaryPath, destinationPath);
    } catch (error) {
      await unlink(temporaryPath).catch(() => undefined);
      throw error;
    }
  }
}

const storage = new GoogleDriveBackupStorage();

export async function getGoogleDriveBackupFolderId(): Promise<string> {
  return storage.getFolderId();
}

export async function findGoogleDriveBackupsByName(
  fileName: string,
): Promise<DriveBackupFile[]> {
  return storage.findFilesByName(fileName);
}

export async function listGoogleDriveBackups(): Promise<DriveBackupFile[]> {
  return storage.listBackups();
}

export async function downloadGoogleDriveBackup(
  fileId: string,
  destinationPath: string,
): Promise<void> {
  return storage.download(fileId, destinationPath);
}

export async function uploadBackupToGoogleDrive(
  filePath: string,
  fileName: string,
): Promise<DriveBackupFile> {
  return storage.upload(filePath, fileName);
}