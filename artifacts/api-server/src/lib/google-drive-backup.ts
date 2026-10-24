import { createHash, randomUUID } from "crypto";
import { createReadStream, createWriteStream, openAsBlob } from "fs";
import { chmod, mkdtemp, readFile, rename, rm, stat, unlink, writeFile } from "fs/promises";
import { basename, dirname, join } from "path";
import { tmpdir } from "os";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";
import { createGunzip, createGzip } from "zlib";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { uploadSingleSqlBackup } from "./google-drive-single-sql";
import { hasVerifiedBackupReceipt, verificationProperties } from "./google-drive-backup-policy";
import {
  buildSqlBackupManifestName,
  buildSqlBackupManifestSegmentName,
  buildSqlBackupPartName,
  parseSqlBackupManifestSegment,
  parseSqlBackupRootManifest,
  SQL_BACKUP_MANIFEST_SEGMENT_PARTS,
  SQL_BACKUP_PART_MAX_TRANSPORT_SIZE,
  SQL_BACKUP_PART_SIZE,
  type SqlBackupManifestPart,
  type SqlBackupManifestSegmentReference,
} from "./google-drive-backup-manifest";

export const DRIVE_BACKUP_FOLDER_NAME = "Salt & Peps Database Backups";
export const DRIVE_BACKUP_FILE_PREFIX = "S&PBACKUP-";
export const DRIVE_BACKUP_FILE_SUFFIX = ".sql.gz.enc";
export const DRIVE_BACKUP_MIME_TYPE = "application/octet-stream";
const PLAIN_SQL_MIME_TYPE = "application/octet-stream";

const DRIVE_CONNECTOR = "google-drive";
const DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const MAX_UPLOAD_ATTEMPTS = 6;
const PLAIN_SQL_UPLOAD_CHUNK_SIZE = 4 * 1024 * 1024;
const PLAIN_SQL_MAX_TRANSPORT_SIZE = 2 * 1024 * 1024;
const PLAIN_SQL_CHUNK_SIZE_STEP = 256 * 1024;
const PLAIN_SQL_MIN_CHUNK_SIZE = 256 * 1024;

function shrinkPlainSqlChunkSize(currentSize: number): number {
  return Math.max(PLAIN_SQL_MIN_CHUNK_SIZE, Math.floor((currentSize / 2) / PLAIN_SQL_CHUNK_SIZE_STEP) * PLAIN_SQL_CHUNK_SIZE_STEP);
}

export interface DriveBackupFile {
  id: string;
  name: string;
  size?: string;
  mimeType?: string;
  modifiedTime?: string;
  parents?: string[];
  trashed?: boolean;
  appProperties?: Record<string, string>;
  /** Google Drive API returns md5Checksum as 32 lowercase hexadecimal characters. */
  md5Checksum?: string;
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
    `^${DRIVE_BACKUP_FILE_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${timestamp}(?:\\.sql\\.gz\\.enc|\\.SQL(?:\\.manifest\\.json)?)$`,
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

/** Headers for a complete compressed part object (never a partial content range). */
export function buildPlainDriveTransportHeaders(
  _originalSize: number,
  transportSize: number,
): Record<string, string> {
  return {
    "Content-Type": DRIVE_BACKUP_MIME_TYPE,
    "Content-Length": String(transportSize),
  };
}

function buildPlainDriveResumableChunkHeaders(
  totalSize: number,
  start: number,
  endExclusive: number,
  transportSize: number,
): Record<string, string> {
  return {
    "Content-Type": PLAIN_SQL_MIME_TYPE,
    "Content-Length": String(transportSize),
    "Content-Range": `bytes ${start}-${endExclusive - 1}/${totalSize}`,
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

async function createPlainSqlChunkTransportFile(
  filePath: string,
  start: number,
  endExclusive: number,
): Promise<{ filePath: string; size: number }> {
  const transportPath = join(
    tmpdir(),
    `drive-backup-${process.pid}-${randomUUID()}.transport.gz`,
  );
  try {
    await pipeline(
      createReadStream(filePath, { start, end: endExclusive - 1 }),
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

async function createSqlPartTransportFile(
  sourcePath: string,
  transportPath: string,
  start: number,
  endExclusive: number,
  totalSqlHash: ReturnType<typeof createHash>,
): Promise<{ sqlSize: number; sqlSha256: string; compressedSize: number; compressedMd5: string }> {
  const sqlHash = createHash("sha256");
  await pipeline(
    createReadStream(sourcePath, { start, end: endExclusive - 1 }),
    new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        sqlHash.update(chunk);
        totalSqlHash.update(chunk);
        callback(null, chunk);
      },
    }),
    createGzip(),
    createWriteStream(transportPath, { flags: "wx", mode: 0o600 }),
  );
  const compressedHash = createHash("md5");
  await pipeline(
    createReadStream(transportPath),
    new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        compressedHash.update(chunk);
        callback(null, chunk);
      },
    }),
    new Transform({ transform(_chunk, _encoding, callback) { callback(); } }),
  );
  const compressedSize = (await stat(transportPath)).size;
  return {
    sqlSize: endExclusive - start,
    sqlSha256: sqlHash.digest("hex"),
    compressedSize,
    compressedMd5: compressedHash.digest("hex"),
  };
}

async function hashFile(path: string, algorithm: "sha256" | "md5"): Promise<string> {
  const hash = createHash(algorithm);
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

async function privateTemporaryDirectory(parentPath: string, prefix: string): Promise<string> {
  const directory = await mkdtemp(join(parentPath, prefix));
  await chmod(directory, 0o700);
  return directory;
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
    const files: DriveBackupFile[] = [];
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({
        q: [
          `'${escapeDriveQueryValue(folderId)}' in parents`,
          `name = '${escapeDriveQueryValue(fileName)}'`,
          "trashed = false",
        ].join(" and "),
        fields: "nextPageToken,files(id,name,size,md5Checksum,mimeType,modifiedTime,parents,trashed,appProperties)",
        pageSize: "100",
      });
      if (pageToken) params.set("pageToken", pageToken);
      const response = await this.connectors.proxy(DRIVE_CONNECTOR, driveFilesPath(params));
      if (!response.ok) return responseError(response, `Finding Drive files named ${fileName}`);
      const body = (await response.json()) as { files?: DriveBackupFile[]; nextPageToken?: string };
      files.push(...(body.files ?? []));
      pageToken = body.nextPageToken;
    } while (pageToken);
    return files;
  }

  async listBackups(): Promise<DriveBackupFile[]> {
    const folderId = await this.getFolderId();
    const files: DriveBackupFile[] = [];
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({
        q: [`'${escapeDriveQueryValue(folderId)}' in parents`, "trashed = false"].join(" and "),
        fields: "nextPageToken,files(id,name,size,md5Checksum,mimeType,modifiedTime,parents,trashed,appProperties)",
        pageSize: "1000",
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
      fields: "id,name,size,md5Checksum,mimeType,modifiedTime,parents,trashed,appProperties",
    });
    const response = await this.connectors.proxy(
      DRIVE_CONNECTOR,
      `/drive/v3/files/${encodeURIComponent(fileId)}?${params.toString()}`,
    );
    if (!response.ok) return responseError(response, `Verifying Google Drive file ${fileId}`);
    return (await response.json()) as DriveBackupFile;
  }

  private async uploadCompleteObject(
    filePath: string,
    fileName: string,
    expectedSize: number,
    expectedMd5: string,
  ): Promise<DriveBackupFile> {
    const findCommittedObject = async (): Promise<DriveBackupFile | null> => {
      const matches = await this.findFilesByName(fileName);
      if (!matches.length) return null;
      if (matches.length !== 1 ||
          Number(matches[0]?.size) !== expectedSize ||
          matches[0]?.md5Checksum !== expectedMd5) {
        throw new Error(`Google Drive file name conflict: ${fileName}`);
      }
      return matches[0]!;
    };

    for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt += 1) {
      const committed = await findCommittedObject();
      if (committed) return committed;
      let uploadResponse: Response | undefined;
      try {
        const folderId = await this.getFolderId();
        const initResponse = await this.connectors.proxy(
          DRIVE_CONNECTOR,
          "/upload/drive/v3/files?uploadType=resumable",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json; charset=UTF-8",
              "X-Upload-Content-Type": DRIVE_BACKUP_MIME_TYPE,
              "X-Upload-Content-Length": String(expectedSize),
            },
            body: JSON.stringify({
              name: fileName,
              mimeType: DRIVE_BACKUP_MIME_TYPE,
              parents: [folderId],
            }),
          },
        );
        if (!initResponse.ok) {
          if (!isRetryableDriveUploadStatus(initResponse.status)) {
            return responseError(initResponse, `Starting Google Drive upload for ${fileName}`);
          }
          await initResponse.arrayBuffer().catch(() => new ArrayBuffer(0));
        } else {
          const location = initResponse.headers.get("location");
          if (!location) throw new Error("Google Drive did not return a resumable upload location");
          const uploadUrl = new URL(location);
          const blob = await openAsBlob(filePath, { type: DRIVE_BACKUP_MIME_TYPE });
          uploadResponse = await this.connectors.proxy(
            DRIVE_CONNECTOR,
            `${uploadUrl.pathname}${uploadUrl.search}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": DRIVE_BACKUP_MIME_TYPE,
                "Content-Length": String(expectedSize),
                "Content-Range": `bytes 0-${expectedSize - 1}/${expectedSize}`,
              },
              body: blob,
            },
          );
          if (uploadResponse.status === 200 || uploadResponse.status === 201) {
            const uploaded = (await uploadResponse.json().catch(() => ({}))) as { id?: string };
            if (!uploaded.id) throw new Error("Google Drive completed the upload without returning a file ID");
            const verified = await this.getFile(uploaded.id);
            if (verified.name !== fileName ||
                Number(verified.size) !== expectedSize ||
                verified.md5Checksum !== expectedMd5) {
              throw new Error(`Google Drive verification failed for ${fileName}`);
            }
            return verified;
          }
          // A 308 can indicate a committed prefix. This connector's gateway rejects
          // every suffix-range continuation, so never resume this session.
          if (uploadResponse.status !== 308 && !isRetryableDriveUploadStatus(uploadResponse.status)) {
            return responseError(uploadResponse, `Uploading complete Google Drive object ${fileName}`);
          }
          await uploadResponse.arrayBuffer().catch(() => new ArrayBuffer(0));
        }
      } catch (error) {
        if (!isRetryableDriveUploadException(error)) throw error;
      }

      const completedAfterLostResponse = await findCommittedObject();
      if (completedAfterLostResponse) return completedAfterLostResponse;
      if (attempt === MAX_UPLOAD_ATTEMPTS) break;
      await sleep(Math.min(1_000 * 2 ** (attempt - 1), 16_000));
    }
    throw new Error(`Google Drive complete-object upload did not finish after retries: ${fileName}`);
  }

  async uploadSqlManifest(filePath: string, sqlFileName: string): Promise<DriveBackupFile> {
    const sourceStats = await stat(filePath);
    const originalSha256 = await hashFile(filePath, "sha256");
    const segmentedSqlHash = createHash("sha256");
    const temporaryDirectory = await privateTemporaryDirectory(tmpdir(), "sp-sql-backup-parts-");
    let currentParts: SqlBackupManifestPart[] = [];
    let nextSegmentIndex = 1;
    let nextPartIndex = 1;
    const segmentReferences: SqlBackupManifestSegmentReference[] = [];
    const uploadSegment = async (): Promise<void> => {
      if (currentParts.length === 0) return;
      const segmentName = buildSqlBackupManifestSegmentName(sqlFileName, nextSegmentIndex);
      const segmentPath = join(temporaryDirectory, `segment-${String(nextSegmentIndex).padStart(6, "0")}.json`);
      const segment = {
        version: 1,
        format: "salt-peps-sql-manifest-segment",
        sqlFileName,
        index: nextSegmentIndex,
        parts: currentParts,
      };
      await writeFile(segmentPath, JSON.stringify(segment), { flag: "wx", mode: 0o600 });
      const segmentSize = (await stat(segmentPath)).size;
      const segmentSha256 = await hashFile(segmentPath, "sha256");
      if (segmentSize > 1024 * 1024) {
        throw new Error(`SQL backup manifest segment exceeds size limit: ${segmentName}`);
      }
      const existing = await this.findFilesByName(segmentName);
      let remote: DriveBackupFile;
      if (existing.length) {
        if (existing.length !== 1 ||
            Number(existing[0]?.size) !== segmentSize ||
            existing[0]?.md5Checksum !== await hashFile(segmentPath, "md5")) {
          throw new Error(`Google Drive SQL backup manifest segment conflict: ${segmentName}`);
        }
        remote = existing[0]!;
      } else {
        remote = await this.uploadCompleteObject(
          segmentPath,
          segmentName,
          segmentSize,
          await hashFile(segmentPath, "md5"),
        );
      }
      segmentReferences.push({
        index: nextSegmentIndex,
        name: segmentName,
        fileId: remote.id,
        size: segmentSize,
        sha256: segmentSha256,
        firstPartIndex: nextPartIndex - currentParts.length,
        partCount: currentParts.length,
      });
      nextSegmentIndex += 1;
      currentParts = [];
      await unlink(segmentPath);
    };
    try {
      for (let start = 0, index = 1; start < sourceStats.size; start += SQL_BACKUP_PART_SIZE, index += 1) {
        const endExclusive = Math.min(start + SQL_BACKUP_PART_SIZE, sourceStats.size);
        const partName = buildSqlBackupPartName(sqlFileName, index);
        const transportPath = join(temporaryDirectory, `part-${String(index).padStart(6, "0")}.gz`);
        const metadata = await createSqlPartTransportFile(
          filePath,
          transportPath,
          start,
          endExclusive,
          segmentedSqlHash,
        );
        if (metadata.compressedSize > SQL_BACKUP_PART_MAX_TRANSPORT_SIZE) {
          throw new Error(`Compressed SQL backup part exceeds transport limit: ${partName}`);
        }
        const matches = await this.findFilesByName(partName);
        let remotePart: DriveBackupFile;
        if (matches.length) {
          if (matches.length !== 1 ||
              Number(matches[0]?.size) !== metadata.compressedSize ||
              matches[0]?.md5Checksum !== metadata.compressedMd5) {
            throw new Error(`Google Drive SQL backup part name conflict: ${partName}`);
          }
          remotePart = matches[0]!;
        } else {
          remotePart = await this.uploadCompleteObject(
            transportPath,
            partName,
            metadata.compressedSize,
            metadata.compressedMd5,
          );
        }
        if (Number(remotePart.size) !== metadata.compressedSize ||
            remotePart.md5Checksum !== metadata.compressedMd5) {
          throw new Error(`Google Drive SQL backup part verification failed: ${partName}`);
        }
        currentParts.push({
          index,
          name: partName,
          fileId: remotePart.id,
          sqlSize: metadata.sqlSize,
          sqlSha256: metadata.sqlSha256,
          compressedSize: metadata.compressedSize,
          compressedMd5: metadata.compressedMd5,
        });
        nextPartIndex += 1;
        await unlink(transportPath);
        if (currentParts.length === SQL_BACKUP_MANIFEST_SEGMENT_PARTS) await uploadSegment();
      }

      await uploadSegment();
      if (segmentedSqlHash.digest("hex") !== originalSha256 ||
          (await stat(filePath)).size !== sourceStats.size) {
        throw new Error("Local SQL backup changed during Google Drive upload; retaining the source");
      }
      const manifest = {
        version: 2,
        format: "salt-peps-sql-parts",
        sqlFileName,
        originalSize: sourceStats.size,
        originalSha256,
        segments: segmentReferences,
      };
      const manifestPath = join(temporaryDirectory, "manifest.json");
      await writeFile(manifestPath, JSON.stringify(manifest), { flag: "wx", mode: 0o600 });
      const manifestName = buildSqlBackupManifestName(sqlFileName);
      const manifestStats = await stat(manifestPath);
      const manifestMd5 = await hashFile(manifestPath, "md5");
      if (manifestStats.size > 1024 * 1024) {
        throw new Error("SQL backup root manifest exceeds size limit");
      }
      const existingManifest = await this.findFilesByName(manifestName);
      if (existingManifest.length) {
        if (existingManifest.length !== 1 ||
            Number(existingManifest[0]?.size) !== manifestStats.size ||
            existingManifest[0]?.md5Checksum !== manifestMd5) {
          throw new Error(`Google Drive SQL backup manifest name conflict: ${manifestName}`);
        }
        return existingManifest[0]!;
      }
      const uploadedManifest = await this.uploadCompleteObject(
        manifestPath,
        manifestName,
        manifestStats.size,
        manifestMd5,
      );
      if (Number(uploadedManifest.size) !== manifestStats.size ||
          uploadedManifest.md5Checksum !== manifestMd5) {
        throw new Error(`Google Drive SQL backup manifest verification failed: ${manifestName}`);
      }
      return uploadedManifest;
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }

  private async uploadPlainSql(filePath: string, fileName: string): Promise<DriveBackupFile> {
    throw new Error("Legacy partial-range SQL uploads are disabled; use the manifest upload path");
    const folderId = await this.getFolderId();
    const fileStats = await stat(filePath);
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
    let nextOffset = 0;
    let uploadResponse: Response | null = null;
    let completed = false;
    let attemptsAtOffset = 0;
    let maxDecodedChunkSize = Math.min(PLAIN_SQL_UPLOAD_CHUNK_SIZE, fileStats.size);

    while (!completed) {
      let statusResponse: Response | null = null;
      if (nextOffset >= fileStats.size) {
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
        if (statusResponse?.status === 200 || statusResponse?.status === 201) {
          uploadResponse = statusResponse;
          completed = true;
          continue;
        }
        if (statusResponse && statusResponse.status !== 308 &&
          !isRetryableDriveUploadStatus(statusResponse.status)) {
          return responseError(statusResponse, "Recovering the Google Drive backup upload");
        }
        await statusResponse?.arrayBuffer().catch(() => new ArrayBuffer(0));
        attemptsAtOffset += 1;
      } else {
        let chunkEnd: number;
        let transport: { filePath: string; size: number };
        while (true) {
          chunkEnd = Math.min(nextOffset + maxDecodedChunkSize, fileStats.size);
          transport = await createPlainSqlChunkTransportFile(filePath, nextOffset, chunkEnd);
          if (transport.size <= PLAIN_SQL_MAX_TRANSPORT_SIZE) break;
          await unlink(transport.filePath).catch(() => undefined);
          if (chunkEnd - nextOffset <= PLAIN_SQL_MIN_CHUNK_SIZE) {
            throw new Error(
              `Compressed SQL chunk exceeds the ${PLAIN_SQL_MAX_TRANSPORT_SIZE}-byte upload limit at the minimum decoded chunk size`,
            );
          }
          maxDecodedChunkSize = shrinkPlainSqlChunkSize(maxDecodedChunkSize);
        }
        try {
          const transportBlob = await openAsBlob(transport.filePath, { type: PLAIN_SQL_MIME_TYPE });
          try {
            uploadResponse = await this.connectors.proxy(DRIVE_CONNECTOR, uploadPath, {
              method: "PUT",
              headers: buildPlainDriveResumableChunkHeaders(
                fileStats.size,
                nextOffset,
                chunkEnd,
                transport.size,
              ),
              body: transportBlob,
            });
          } catch (error) {
            if (!isRetryableDriveUploadException(error)) {
              throw new Error("Google Drive backup upload failed");
            }
            uploadResponse = null;
          }
        } finally {
          await unlink(transport.filePath).catch(() => undefined);
        }

        if (uploadResponse?.status === 200 || uploadResponse?.status === 201) {
          completed = true;
          continue;
        }
        if (uploadResponse?.status === 413) {
          await uploadResponse.arrayBuffer().catch(() => new ArrayBuffer(0));
          let statusResponse: Response;
          try {
            statusResponse = await this.connectors.proxy(DRIVE_CONNECTOR, uploadPath, {
              method: "PUT",
              headers: {
                "Content-Length": "0",
                "Content-Range": `bytes */${fileStats.size}`,
              },
            });
          } catch {
            throw new Error(
              "Could not confirm Google Drive upload progress after HTTP 413; retaining the SQL backup",
            );
          }
          if (statusResponse.status === 200 || statusResponse.status === 201) {
            uploadResponse = statusResponse;
            completed = true;
            continue;
          }
          if (statusResponse.status !== 308) {
            return responseError(statusResponse, "Recovering after a rejected Google Drive upload chunk");
          }
          const committed = committedDriveUploadBytes(statusResponse, fileStats.size);
          if (committed > nextOffset) {
            nextOffset = committed;
            attemptsAtOffset = 0;
            if (maxDecodedChunkSize > PLAIN_SQL_MIN_CHUNK_SIZE) {
              maxDecodedChunkSize = shrinkPlainSqlChunkSize(maxDecodedChunkSize);
            }
            continue;
          }
          if (Math.min(maxDecodedChunkSize, fileStats.size - nextOffset) <= PLAIN_SQL_MIN_CHUNK_SIZE) {
            throw new Error(
              "Google Drive rejected the minimum 256 KiB plain SQL upload chunk; retaining the SQL backup",
            );
          }
          maxDecodedChunkSize = shrinkPlainSqlChunkSize(maxDecodedChunkSize);
          attemptsAtOffset = 0;
          continue;
        }
        if (uploadResponse?.status === 308) {
          const committed = committedDriveUploadBytes(uploadResponse, fileStats.size);
          if (committed > nextOffset) {
            nextOffset = committed;
            attemptsAtOffset = 0;
            continue;
          }
          await uploadResponse.arrayBuffer().catch(() => new ArrayBuffer(0));
          attemptsAtOffset += 1;
        } else {
          if (uploadResponse && !isRetryableDriveUploadStatus(uploadResponse.status)) {
            return responseError(uploadResponse, "Uploading the Google Drive backup");
          }
          await uploadResponse?.arrayBuffer().catch(() => new ArrayBuffer(0));
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
          if (statusResponse?.status === 200 || statusResponse?.status === 201) {
            uploadResponse = statusResponse;
            completed = true;
            continue;
          }
          if (statusResponse?.status === 308) {
            const committed = committedDriveUploadBytes(statusResponse, fileStats.size);
            if (committed > nextOffset) {
              nextOffset = committed;
              attemptsAtOffset = 0;
              continue;
            }
          } else if (statusResponse && !isRetryableDriveUploadStatus(statusResponse.status)) {
            return responseError(statusResponse, "Recovering the Google Drive backup upload");
          }
          await statusResponse?.arrayBuffer().catch(() => new ArrayBuffer(0));
          attemptsAtOffset += 1;
        }
      }
      if (attemptsAtOffset >= MAX_UPLOAD_ATTEMPTS) {
        throw new Error("Google Drive backup upload did not complete after retries");
      }
      const delayMs = Math.min(1_000 * 2 ** (attemptsAtOffset - 1), 16_000);
      console.warn(
        `[db-backup] Plain SQL upload was not confirmed; retrying in ${delayMs} ms (${attemptsAtOffset}/${MAX_UPLOAD_ATTEMPTS})`,
      );
      await sleep(delayMs);
    }
    if (!uploadResponse) {
      throw new Error("Google Drive upload did not produce a response");
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

  async upload(filePath: string, fileName: string): Promise<DriveBackupFile> {
    if (fileName.toLowerCase().endsWith(".sql")) {
      return uploadSingleSqlBackup(filePath, fileName, {
        findExisting: () => this.findFilesByName(fileName),
        getFile: id => this.getFile(id),
        startUpload: async size => {
          const folderId = await this.getFolderId();
          let response: Response;
          try {
            response = await this.connectors.proxy(DRIVE_CONNECTOR,
              "/upload/drive/v3/files?uploadType=resumable&fields=id", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Upload-Content-Type": PLAIN_SQL_MIME_TYPE,
                  "X-Upload-Content-Length": String(size),
                },
                body: JSON.stringify({ name: fileName, mimeType: PLAIN_SQL_MIME_TYPE, parents: [folderId] }),
              });
          } catch {
            throw new Error("Starting single-file Google Drive backup upload failed");
          }
          if (!response.ok) throw new Error(`Starting single-file Google Drive backup upload failed (HTTP ${response.status})`);
          const session = response.headers.get("location");
          if (!session) throw new Error("Google Drive did not return an upload session");
          return session;
        },
      });
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

  async downloadSqlManifest(manifestFile: DriveBackupFile, destinationPath: string): Promise<void> {
    const workDirectory = await privateTemporaryDirectory(dirname(destinationPath), ".sql-restore-");
    const manifestPath = join(workDirectory, "manifest.json");
    const assembledPath = join(workDirectory, "reconstructed.SQL");
    try {
      await this.download(manifestFile.id, manifestPath);
      const manifestBytes = await readFile(manifestPath);
      if ((manifestFile.size !== undefined && Number(manifestFile.size) !== manifestBytes.length) ||
          (manifestFile.md5Checksum !== undefined &&
            await hashFile(manifestPath, "md5") !== manifestFile.md5Checksum)) {
        throw new Error("SQL backup manifest metadata checksum mismatch");
      }
      const manifest = parseSqlBackupRootManifest(
        JSON.parse(manifestBytes.toString("utf8")) as unknown,
      );
      if (manifestFile.name !== buildSqlBackupManifestName(manifest.sqlFileName)) {
        throw new Error("SQL backup manifest filename does not match its declared SQL filename");
      }

      if (manifestBytes.length > 1024 * 1024) throw new Error("SQL backup root manifest exceeds size limit");
      const totalHash = createHash("sha256");
      let totalSize = 0;
      let globalPartIndex = 0;
      if (manifest.originalSize === 0) {
        await writeFile(assembledPath, Buffer.alloc(0), { flag: "wx", mode: 0o600 });
      }
      for (const reference of manifest.segments) {
        const segmentRemote = await this.getFile(reference.fileId);
        if (segmentRemote.name !== reference.name ||
            Number(segmentRemote.size) !== reference.size) {
          throw new Error(`SQL backup manifest segment metadata mismatch: ${reference.name}`);
        }
        const segmentPath = join(workDirectory, `segment-${String(reference.index).padStart(6, "0")}.json`);
        await this.download(reference.fileId, segmentPath);
        if ((await stat(segmentPath)).size !== reference.size ||
            await hashFile(segmentPath, "sha256") !== reference.sha256 ||
            (segmentRemote.md5Checksum &&
              await hashFile(segmentPath, "md5") !== segmentRemote.md5Checksum)) {
          throw new Error(`SQL backup manifest segment checksum mismatch: ${reference.name}`);
        }
        const segment = parseSqlBackupManifestSegment(
          JSON.parse((await readFile(segmentPath)).toString("utf8")) as unknown,
          manifest.sqlFileName,
          reference.index,
        );
        if (segment.parts.length !== reference.partCount ||
            segment.parts[0]?.index !== reference.firstPartIndex) {
          throw new Error(`SQL backup manifest segment reference mismatch: ${reference.name}`);
        }
        for (const part of segment.parts) {
          globalPartIndex += 1;
          const expectedPartSize = Math.min(
            SQL_BACKUP_PART_SIZE,
            manifest.originalSize - totalSize,
          );
          if (part.index !== globalPartIndex || part.sqlSize !== expectedPartSize) {
            throw new Error(`SQL backup manifest part size mismatch: ${part.name}`);
          }
          const remotePart = await this.getFile(part.fileId);
          if (remotePart.name !== part.name ||
              Number(remotePart.size) !== part.compressedSize ||
              remotePart.md5Checksum !== part.compressedMd5) {
            throw new Error(`SQL backup part metadata mismatch: ${part.name}`);
          }
          const compressedPath = join(workDirectory, `part-${String(part.index).padStart(6, "0")}.gz`);
          await this.download(part.fileId, compressedPath);
          if ((await stat(compressedPath)).size !== part.compressedSize ||
              await hashFile(compressedPath, "md5") !== part.compressedMd5) {
            throw new Error(`SQL backup part checksum mismatch: ${part.name}`);
          }
          const partHash = createHash("sha256");
          let partSize = 0;
          await pipeline(
            createReadStream(compressedPath),
            createGunzip(),
            new Transform({
              transform(chunk: Buffer, _encoding, callback) {
                partHash.update(chunk);
                totalHash.update(chunk);
                partSize += chunk.length;
                totalSize += chunk.length;
                callback(null, chunk);
              },
            }),
            createWriteStream(assembledPath, {
              flags: globalPartIndex === 1 ? "wx" : "a",
              mode: 0o600,
            }),
          );
          if (partSize !== part.sqlSize || partHash.digest("hex") !== part.sqlSha256) {
            throw new Error(`SQL backup decoded part checksum mismatch: ${part.name}`);
          }
          await unlink(compressedPath);
        }
        await unlink(segmentPath);
      }
      if (totalSize !== manifest.originalSize ||
          globalPartIndex !== Math.ceil(manifest.originalSize / SQL_BACKUP_PART_SIZE) ||
          totalHash.digest("hex") !== manifest.originalSha256) {
        throw new Error("Reconstructed SQL backup checksum mismatch");
      }
      await rename(assembledPath, destinationPath);
    } finally {
      await rm(workDirectory, { recursive: true, force: true });
    }
  }
}

const storage = new GoogleDriveBackupStorage();

/** Retained for compatibility and validation of older multipart backup tooling. */
export async function uploadLegacyGoogleDriveBackup(filePath: string, fileName: string): Promise<DriveBackupFile> {
  return fileName.toLowerCase().endsWith(".sql")
    ? storage.uploadSqlManifest(filePath, fileName)
    : storage.upload(filePath, fileName);
}

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

export async function downloadGoogleDriveSqlBackup(
  manifestFile: DriveBackupFile,
  destinationPath: string,
): Promise<void> {
  if (/\.sql$/i.test(manifestFile.name)) {
    const stage = join(dirname(destinationPath), `.${basename(destinationPath)}.${randomUUID()}.verified`);
    try {
      await storage.download(manifestFile.id, stage);
      const downloadedSize = (await stat(stage)).size;
      if (!manifestFile.md5Checksum || Number(manifestFile.size) !== downloadedSize ||
          await hashFile(stage, "md5") !== manifestFile.md5Checksum) {
        throw new Error("Google Drive SQL backup download verification failed");
      }
      await rename(stage, destinationPath);
    } finally {
      await unlink(stage).catch(() => undefined);
    }
    return;
  }
  if (!manifestFile.name.endsWith(".SQL.manifest.json")) {
    throw new Error("The selected Drive file is not a supported SQL backup");
  }
  return storage.downloadSqlManifest(manifestFile, destinationPath);
}

export async function getGoogleDriveBackupFile(fileId: string): Promise<DriveBackupFile> {
  return storage.getFile(fileId);
}

export async function uploadBackupToGoogleDrive(
  filePath: string,
  fileName: string,
): Promise<DriveBackupFile> {
  const verified = await storage.upload(filePath, fileName);
  if (!fileName.endsWith(".SQL")) return verified;
  // Persist only after transport has verified local bytes against Drive's full size/MD5.
  const response = await new ReplitConnectors().proxy(
    DRIVE_CONNECTOR, `/drive/v3/files/${encodeURIComponent(verified.id)}`,
    { method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appProperties: verificationProperties(verified) }) },
  );
  if (!response.ok) throw new Error(`Recording SQL backup verification failed (HTTP ${response.status})`);
  const fresh = await storage.getFile(verified.id);
  if (fresh.name !== verified.name || fresh.size !== verified.size ||
      fresh.md5Checksum !== verified.md5Checksum || !hasVerifiedBackupReceipt(fresh)) {
    throw new Error("SQL backup verification receipt mismatch");
  }
  return fresh;
}