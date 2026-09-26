import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import { Client } from "@replit/object-storage";

export const MAX_TICKET_IMAGE_FILES = 5;
export const MAX_TICKET_IMAGE_BYTES = 20 * 1024 * 1024;

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const ALLOWED_IMAGE_TYPES = new Set(Object.keys(IMAGE_EXTENSIONS));

export type TicketImageCandidate = {
  size: number;
  reportedMimeType: string;
  detectedMimeType: string | null;
};

export type TicketAttachmentViewer =
  | { role: "customer"; username: string }
  | { role: "admin" }
  | { role: "organiser"; username: string };

export type TicketAttachmentAccessTarget = {
  accountUsername: string;
  groupBuyOrganiserUsername: string | null;
};

export type TicketImageUpload = {
  ticketId: string;
  originalName: string;
  reportedMimeType: string;
  buffer: Buffer;
};

export type StoredTicketImage = {
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export class TicketImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TicketImageValidationError";
  }
}

export type TicketObjectStore = Pick<
  Client,
  "uploadFromBytes" | "downloadAsBytes" | "delete"
>;

let appStorageClient: Client | undefined;

function getAppStorageClient(): Client {
  appStorageClient ??= new Client();
  return appStorageClient;
}

function normalizeUsername(username: string): string {
  return username.trim().replace(/^@/, "").toLowerCase();
}

export function validateTicketImageBatch(files: TicketImageCandidate[]): string | null {
  if (files.length > MAX_TICKET_IMAGE_FILES) {
    return `Attach no more than ${MAX_TICKET_IMAGE_FILES} images at a time.`;
  }

  for (const file of files) {
    if (file.size <= 0) return "Empty images cannot be attached.";
    if (file.size > MAX_TICKET_IMAGE_BYTES) {
      return "Each image must be 20 MB or smaller.";
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.reportedMimeType) || !file.detectedMimeType) {
      return "Choose a supported image (JPEG, PNG, WebP, or GIF).";
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.detectedMimeType)) {
      return "Choose a supported image (JPEG, PNG, WebP, or GIF).";
    }
    if (file.reportedMimeType !== file.detectedMimeType) {
      return "The image type does not match its file contents.";
    }
  }

  return null;
}

export function canViewTicketAttachment(
  viewer: TicketAttachmentViewer,
  ticket: TicketAttachmentAccessTarget,
): boolean {
  if (viewer.role === "admin") return true;
  if (viewer.role === "customer") {
    return normalizeUsername(viewer.username) === normalizeUsername(ticket.accountUsername);
  }
  return ticket.groupBuyOrganiserUsername !== null &&
    normalizeUsername(viewer.username) === normalizeUsername(ticket.groupBuyOrganiserUsername);
}

export function sanitizeTicketImageFileName(fileName: string): string {
  const leafName = fileName.split(/[\\/]/).pop() ?? "";
  const safeName = leafName
    .replace(/[\u0000-\u001f\u007f"]/g, "_")
    .trim()
    .slice(0, 180);
  return safeName || "image";
}

export async function storeTicketImage(
  image: TicketImageUpload,
  store: TicketObjectStore = getAppStorageClient(),
): Promise<StoredTicketImage> {
  const detected = await fileTypeFromBuffer(image.buffer);
  const validationError = validateTicketImageBatch([{
    size: image.buffer.byteLength,
    reportedMimeType: image.reportedMimeType,
    detectedMimeType: detected?.mime ?? null,
  }]);
  if (validationError) throw new TicketImageValidationError(validationError);

  const mimeType = detected!.mime;
  const storageKey = `ticket-attachments/${image.ticketId}/${randomUUID()}.${IMAGE_EXTENSIONS[mimeType]}`;
  const uploaded = await store.uploadFromBytes(storageKey, image.buffer, { compress: false });
  if (!uploaded.ok) {
    throw new Error(`Could not store ticket image: ${String(uploaded.error)}`);
  }

  return {
    storageKey,
    fileName: sanitizeTicketImageFileName(image.originalName),
    mimeType,
    sizeBytes: image.buffer.byteLength,
  };
}

export async function downloadTicketImage(
  storageKey: string,
  store: TicketObjectStore = getAppStorageClient(),
): Promise<Buffer> {
  const result = await store.downloadAsBytes(storageKey);
  if (!result.ok) {
    throw new Error(`Could not load ticket image: ${String(result.error)}`);
  }
  return result.value[0];
}

export async function deleteTicketImage(
  storageKey: string,
  store: TicketObjectStore = getAppStorageClient(),
): Promise<void> {
  const result = await store.delete(storageKey, { ignoreNotFound: true });
  if (!result.ok) {
    throw new Error(`Could not delete ticket image: ${String(result.error)}`);
  }
}