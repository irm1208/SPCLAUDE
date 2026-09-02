import { open, stat } from "fs/promises";
import { ReplitConnectors } from "@replit/connectors-sdk";

export const DRIVE_BACKUP_FOLDER_NAME = "Salt & Peps Database Backups";
export const DRIVE_BACKUP_FILE_PREFIX = "salt-and-peps-db-";
export const DRIVE_BACKUP_KEEP_COUNT = 14;

const DRIVE_CONNECTOR = "google-drive";
const DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const DRIVE_BACKUP_MIME_TYPE = "application/gzip";
const UPLOAD_CHUNK_SIZE = 8 * 1024 * 1024;

export interface DriveBackupFile {
  id: string;
  name: string;
  modifiedTime?: string;
}

export function buildDriveBackupFileName(date: Date = new Date()): string {
  const timestamp = date
    .toISOString()
    .replace("T", "_")
    .replace(/:/g, "-")
    .split(".")[0];
  return `${DRIVE_BACKUP_FILE_PREFIX}${timestamp}.sql.gz`;
}

export function selectDriveBackupIdsToTrash(
  files: DriveBackupFile[],
  keepCount: number = DRIVE_BACKUP_KEEP_COUNT,
): string[] {
  return files
    .filter(
      (file) =>
        file.name.startsWith(DRIVE_BACKUP_FILE_PREFIX) &&
        file.name.endsWith(".sql.gz"),
    )
    .sort((a, b) => {
      const aTime = a.modifiedTime ? Date.parse(a.modifiedTime) : 0;
      const bTime = b.modifiedTime ? Date.parse(b.modifiedTime) : 0;
      return bTime - aTime;
    })
    .slice(Math.max(keepCount, 0))
    .map((file) => file.id);
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function driveFilesPath(params: URLSearchParams): string {
  return `/drive/v3/files?${params.toString()}`;
}

async function responseError(response: Response, action: string): Promise<never> {
  const body = await response.text().catch(() => "");
  throw new Error(
    `${action} failed (${response.status} ${response.statusText})${body ? `: ${body.slice(0, 500)}` : ""}`,
  );
}

class GoogleDriveBackupStorage {
  private readonly connectors = new ReplitConnectors();
  private folderId: string | null = null;

  private async getFolderId(): Promise<string> {
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

  async upload(filePath: string, fileName: string): Promise<string> {
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
    const file = await open(filePath, "r");
    try {
      let offset = 0;
      while (offset < fileStats.size) {
        const length = Math.min(UPLOAD_CHUNK_SIZE, fileStats.size - offset);
        const chunk = Buffer.allocUnsafe(length);
        const readResult = await file.read(chunk, 0, length, offset);
        if (readResult.bytesRead !== length) {
          throw new Error(
            `Google Drive backup read ended early at ${offset + readResult.bytesRead} of ${fileStats.size} bytes`,
          );
        }

        const chunkResponse = await this.connectors.proxy(DRIVE_CONNECTOR, uploadPath, {
          method: "PUT",
          headers: {
            "Content-Type": DRIVE_BACKUP_MIME_TYPE,
            "Content-Length": String(length),
            "Content-Range": `bytes ${offset}-${offset + length - 1}/${fileStats.size}`,
          },
          body: chunk,
        });
        if (chunkResponse.status === 308) {
          offset += length;
          continue;
        }
        if (!chunkResponse.ok || (chunkResponse.status !== 200 && chunkResponse.status !== 201)) {
          return responseError(chunkResponse, "Uploading the Google Drive backup chunk");
        }
        const uploaded = (await chunkResponse.json().catch(() => ({}))) as { id?: string };
        if (!uploaded.id) {
          throw new Error("Google Drive completed the upload without returning a file ID");
        }
        return uploaded.id;
      }
    } finally {
      await file.close();
    }

    throw new Error("Google Drive upload ended without a completion response");
  }

  async prune(): Promise<void> {
    const folderId = await this.getFolderId();
    const params = new URLSearchParams({
      q: `'${escapeDriveQueryValue(folderId)}' in parents and trashed = false`,
      fields: "files(id,name,mimeType,modifiedTime)",
      pageSize: "1000",
      orderBy: "modifiedTime desc",
    });
    const response = await this.connectors.proxy(DRIVE_CONNECTOR, driveFilesPath(params));
    if (!response.ok) return responseError(response, "Listing Google Drive backups");
    const body = (await response.json()) as { files?: DriveBackupFile[] };
    for (const id of selectDriveBackupIdsToTrash(body.files ?? [])) {
      const trashResponse = await this.connectors.proxy(
        DRIVE_CONNECTOR,
        `/drive/v3/files/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trashed: true }),
        },
      );
      if (!trashResponse.ok) {
        return responseError(trashResponse, `Trashing old Google Drive backup ${id}`);
      }
    }
  }
}

const storage = new GoogleDriveBackupStorage();

export async function uploadBackupToGoogleDrive(
  filePath: string,
  fileName: string,
): Promise<string> {
  const fileId = await storage.upload(filePath, fileName);
  await storage.prune();
  return fileId;
}