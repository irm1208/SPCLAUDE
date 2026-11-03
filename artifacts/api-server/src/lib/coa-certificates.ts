import { Client } from "@replit/object-storage";
import { fileTypeFromBuffer } from "file-type";
import { CoaError } from "./coa-rules";

export const COA_PDF_LIMIT = 10 * 1024 * 1024;
export type CoaCertificateStore = Pick<Client, "uploadFromBytes" | "downloadAsBytes" | "delete">;
let client: Client | undefined;
export const coaCertificateStore = () => client ??= new Client();

export async function validateCoaPdf(bytes: Buffer, name: string, mime: string) {
  if (!bytes.length || bytes.length > COA_PDF_LIMIT) throw new CoaError("Choose a non-empty PDF of 10 MB or smaller.");
  if (!/\.pdf$/i.test(name) || mime !== "application/pdf"
    || (await fileTypeFromBuffer(bytes).catch(() => undefined))?.mime !== "application/pdf"
    || !bytes.subarray(-1024).includes(Buffer.from("%%EOF")))
    throw new CoaError("Choose a valid PDF certificate.");
}

export async function removeCoaPdf(key: string, store: CoaCertificateStore) {
  const result = await store.delete(key, { ignoreNotFound: true });
  if (!result.ok) console.error("[COA] Could not remove unused private certificate.");
}
