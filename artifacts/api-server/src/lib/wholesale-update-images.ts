import { randomUUID } from "node:crypto";
import { Client } from "@replit/object-storage";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { WholesaleUpdateValidationError } from "./wholesale-updates";

export type UpdateImageStore = Pick<Client, "uploadFromBytes" | "downloadAsBytes" | "delete">;
let client: Client | undefined;
const getClient = () => client ??= new Client();
export const WHOLESALE_IMAGE_LIMIT = 5 * 1024 * 1024;

export async function storeWholesaleUpdateImage(buffer: Buffer, store: UpdateImageStore = getClient()): Promise<string> {
  return storePageUpdateImage(buffer, "wholesale-updates", store);
}

export async function storePageUpdateImage(
  buffer: Buffer,
  namespace: "wholesale-updates" | "group-buy-updates" | "vendor-dispatch",
  store: UpdateImageStore = getClient(),
): Promise<string> {
  if (buffer.byteLength > WHOLESALE_IMAGE_LIMIT) throw new WholesaleUpdateValidationError("Images must be 5 MB or smaller.");
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(detected.mime)) {
    throw new WholesaleUpdateValidationError("Choose a valid JPEG, PNG, WebP or GIF image.");
  }
  let bytes: Buffer;
  try {
    bytes = await sharp(buffer, { limitInputPixels: 40_000_000 })
      .rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 }).toBuffer();
  } catch {
    throw new WholesaleUpdateValidationError("The image could not be read. Choose a different image.");
  }
  const key = `${namespace}/${randomUUID()}.webp`;
  const result = await store.uploadFromBytes(key, bytes, { compress: false });
  if (!result.ok) throw new Error(`Could not store update image: ${result.error.message}`);
  return key;
}

export async function downloadWholesaleUpdateImage(key: string, store: UpdateImageStore = getClient()): Promise<Buffer> {
  const result = await store.downloadAsBytes(key);
  if (!result.ok) throw new Error(`Could not load update image: ${result.error.message}`);
  return result.value[0];
}

export async function deleteWholesaleUpdateImage(key: string, store: UpdateImageStore = getClient()): Promise<void> {
  const result = await store.delete(key, { ignoreNotFound: true });
  if (!result.ok) throw new Error(`Could not remove update image: ${result.error.message}`);
}
