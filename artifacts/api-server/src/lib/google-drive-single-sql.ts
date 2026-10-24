import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { open, stat } from "node:fs/promises";
import { request as httpsRequest } from "node:https";
import type { DriveBackupFile } from "./google-drive-backup";

type DirectRequest = (url: string, headers: Record<string, string>, body?: Buffer) => Promise<Response>;
interface UploadDependencies {
  startUpload(size: number): Promise<string>;
  findExisting(): Promise<DriveBackupFile[]>;
  getFile(id: string): Promise<DriveBackupFile>;
  request?: DirectRequest;
  sleep?: (ms: number) => Promise<void>;
  chunkSize?: number;
}

/** Session URLs grant upload access: never include them in errors or follow redirects. */
export function validateGoogleUploadSession(session: string): void {
  let url: URL;
  try { url = new URL(session); } catch { throw new Error("Invalid Google Drive upload destination"); }
  if (url.protocol !== "https:" || url.hostname !== "www.googleapis.com" ||
      (url.port && url.port !== "443") || url.username || url.password || url.hash ||
      url.pathname !== "/upload/drive/v3/files" ||
      url.searchParams.get("uploadType") !== "resumable" || !url.searchParams.get("upload_id")) {
    throw new Error("Invalid Google Drive upload destination");
  }
}

/** Native HTTPS deliberately returns Google's 308 progress response without redirecting. */
export const directGoogleUploadRequest: DirectRequest = async (url, headers, body) => {
  validateGoogleUploadSession(url);
  return new Promise<Response>((resolve, reject) => {
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const fail = () => {
      clearTimeout(deadline);
      reject(new Error("Direct Google Drive upload request failed"));
    };
    const req = httpsRequest(url, { method: "PUT", headers }, res => {
      const chunks: Buffer[] = [];
      let length = 0;
      res.on("data", chunk => {
        length += chunk.length;
        if (length > 1024 * 1024) { req.destroy(); fail(); return; }
        chunks.push(Buffer.from(chunk));
      });
      res.once("error", fail);
      res.once("aborted", fail);
      res.once("end", () => {
        clearTimeout(deadline);
        resolve(new Response(Buffer.concat(chunks).toString("utf8") || null, {
          status: res.statusCode ?? 502,
          headers: typeof res.headers.range === "string" ? { range: res.headers.range } : {},
        }));
      });
    });
    deadline = setTimeout(() => req.destroy(new Error("Upload request timeout")), 180_000);
    req.setTimeout(60_000, () => req.destroy(new Error("Upload request timeout")));
    req.once("error", () => { clearTimeout(deadline); fail(); });
    req.end(body);
  });
};

function verified(file: DriveBackupFile, name: string, size: number, md5: string): boolean {
  return !!file.id && !file.trashed && file.name === name && Number(file.size) === size &&
    file.md5Checksum === md5;
}

export async function uploadSingleSqlBackup(
  filePath: string,
  fileName: string,
  dependencies: UploadDependencies,
): Promise<DriveBackupFile> {
  const before = await stat(filePath);
  if (!before.isFile() || !Number.isSafeInteger(before.size) || before.size <= 0) {
    throw new Error("SQL backup must be a non-empty regular file");
  }
  const size = before.size;
  const md5Hash = createHash("md5");
  for await (const bytes of createReadStream(filePath)) md5Hash.update(bytes);
  const md5 = md5Hash.digest("hex");
  const checkSource = async () => {
    const after = await stat(filePath);
    if (after.size !== size || after.ino !== before.ino || after.dev !== before.dev ||
        after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs) {
      throw new Error("SQL backup changed during upload; retaining local file");
    }
  };
  await checkSource();
  const existing = await dependencies.findExisting();
  if (existing.some(file => !verified(file, fileName, size, md5))) {
    throw new Error("Google Drive SQL backup filename conflict; existing files were not changed");
  }
  if (existing.length) {
    const fresh = await dependencies.getFile(existing[0].id);
    if (!verified(fresh, fileName, size, md5)) throw new Error("Google Drive SQL backup verification failed");
    await checkSource();
    return fresh;
  }

  const session = await dependencies.startUpload(size);
  validateGoogleUploadSession(session);
  const request = dependencies.request ?? directGoogleUploadRequest;
  const sleep = dependencies.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const chunkSize = dependencies.chunkSize ?? 8 * 1024 * 1024;
  if (chunkSize <= 0 || chunkSize % (256 * 1024) !== 0 || chunkSize > 8 * 1024 * 1024) {
    throw new Error("Invalid SQL upload chunk size");
  }
  const handle = await open(filePath, "r");
  let offset = 0;
  let greatestSentEnd = 0;
  let probe = false;
  let failures = 0;
  let uploadedId: string | undefined;
  try {
    while (!uploadedId && failures < 6) {
      const headers: Record<string, string> = { "Content-Type": "application/octet-stream" };
      let body: Buffer | undefined;
      if (probe) {
        headers["Content-Length"] = "0";
        headers["Content-Range"] = `bytes */${size}`;
      } else {
        const end = Math.min(offset + chunkSize, size);
        body = Buffer.allocUnsafe(end - offset);
        let read = 0;
        while (read < body.length) {
          const result = await handle.read(body, read, body.length - read, offset + read);
          if (!result.bytesRead) throw new Error("SQL backup changed during upload");
          read += result.bytesRead;
        }
        greatestSentEnd = Math.max(greatestSentEnd, end);
        headers["Content-Length"] = String(body.length);
        headers["Content-Range"] = `bytes ${offset}-${end - 1}/${size}`;
      }
      let response: Response | undefined;
      try { response = await request(session, headers, body); } catch { /* Probe before resending ambiguous writes. */ }
      if (response?.status === 200 || response?.status === 201) {
        const result = await response.json().catch(() => ({})) as { id?: unknown };
        if (typeof result.id !== "string" || !result.id) throw new Error("Google Drive upload completed without a file ID");
        uploadedId = result.id;
        break;
      }
      if (response?.status === 308) {
        const range = response.headers.get("range");
        const match = range?.match(/^bytes=0-(\d+)$/);
        const committed = match ? Number(match[1]) + 1 : 0;
        if ((range && !match) || !Number.isSafeInteger(committed) ||
            committed < offset || committed > greatestSentEnd) {
          throw new Error("Invalid Google Drive SQL upload progress");
        }
        failures = committed > offset ? 0 : failures + 1;
        offset = committed;
        probe = offset === size;
      } else if (!response || [408, 425, 429, 500, 502, 503, 504].includes(response.status)) {
        failures += 1;
        probe = true;
      } else {
        // Do not copy response bodies, URLs, or provider exceptions into logs.
        throw new Error(`Google Drive SQL upload rejected (HTTP ${response.status}); local file retained`);
      }
      await response?.arrayBuffer().catch(() => undefined);
      if (failures) await sleep(Math.min(1000 * 2 ** (failures - 1), 16_000));
    }
  } finally {
    await handle.close();
  }
  if (!uploadedId) throw new Error("Google Drive SQL upload did not complete after retries");
  const remote = await dependencies.getFile(uploadedId);
  if (!verified(remote, fileName, size, md5)) throw new Error("Google Drive SQL backup verification failed");
  await checkSource();
  return remote;
}
