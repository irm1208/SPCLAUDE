import { randomUUID } from "node:crypto";
import { Client } from "@replit/object-storage";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { TmdError } from "./tmd-model";

/**
 * Testmedaddy file storage: images are sniffed, re-encoded to WebP (strips metadata and
 * anything hidden in the original) and stored under an unguessable key; lab reports are
 * stored as the original PDF after a type check. All keys live under `tmd/`.
 */
export type TmdObjectStore = Pick<Client, "uploadFromBytes" | "downloadAsBytes" | "delete">;
let client: Client | undefined;
const getClient = () => client ??= new Client();
let storeOverride: TmdObjectStore | null = null;
/** Tests swap in an in-memory store. */
export function setTmdObjectStore(store: TmdObjectStore | null) { storeOverride = store; }
const store = () => storeOverride ?? getClient();

export const TMD_IMAGE_LIMIT = 8 * 1024 * 1024;
export const TMD_PDF_LIMIT = 15 * 1024 * 1024;
export type TmdImageNamespace = "batch" | "pool" | "vendor" | "avatar" | "screenshot" | "custody";
export const TMD_KEY_RE = /^tmd\/(?:batch|pool|vendor|avatar|screenshot|custody|report)\/[0-9a-f-]{36}\.(?:webp|pdf)$/;

export async function storeTmdImage(buffer: Buffer, namespace: TmdImageNamespace, options: { maxEdge?: number } = {}): Promise<string> {
  if (buffer.byteLength > TMD_IMAGE_LIMIT) throw new TmdError("Images must be 8 MB or smaller.");
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"].includes(detected.mime)) {
    throw new TmdError("Choose a JPEG, PNG, WebP, GIF or HEIC image.");
  }
  let bytes: Buffer;
  try {
    const edge = options.maxEdge ?? 1800;
    bytes = await sharp(buffer, { limitInputPixels: 50_000_000 }).rotate().resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
  } catch { throw new TmdError("That image could not be read. Try a different file."); }
  const key = `tmd/${namespace}/${randomUUID()}.webp`;
  const result = await store().uploadFromBytes(key, bytes, { compress: false });
  if (!result.ok) throw new Error(`Could not store image: ${result.error.message}`);
  return key;
}

export async function storeTmdPdf(buffer: Buffer): Promise<string> {
  if (buffer.byteLength > TMD_PDF_LIMIT) throw new TmdError("Reports must be 15 MB or smaller.");
  const detected = await fileTypeFromBuffer(buffer);
  if (detected?.mime !== "application/pdf") throw new TmdError("Lab reports must be PDF files.");
  const key = `tmd/report/${randomUUID()}.pdf`;
  const result = await store().uploadFromBytes(key, buffer, { compress: false });
  if (!result.ok) throw new Error(`Could not store report: ${result.error.message}`);
  return key;
}

export async function downloadTmdFile(key: string): Promise<{ bytes: Buffer; contentType: string }> {
  if (!TMD_KEY_RE.test(key)) throw new TmdError("File not found.", 404);
  const result = await store().downloadAsBytes(key);
  if (!result.ok) throw new TmdError("File not found.", 404);
  return { bytes: result.value[0], contentType: key.endsWith(".pdf") ? "application/pdf" : "image/webp" };
}

export async function deleteTmdFile(key: string | null | undefined): Promise<void> {
  if (!key || !TMD_KEY_RE.test(key)) return;
  const result = await store().delete(key, { ignoreNotFound: true });
  if (!result.ok) console.error("[tmd-files] delete failed:", result.error.message);
}
