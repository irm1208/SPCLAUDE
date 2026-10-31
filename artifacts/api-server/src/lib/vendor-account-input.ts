import { VendorPortalError } from "./vendor-portal-model";
export const validVendorPassword = (value: unknown): value is string => typeof value === "string" && value.length >= 12 && value.length <= 128 && Buffer.byteLength(value, "utf8") <= 72;
export function vendorUsername(value: unknown): string { return typeof value === "string" ? value.trim().toLowerCase() : ""; }
export const validVendorUsername = (value: string) => /^[a-z0-9][a-z0-9_.-]{2,49}$/.test(value);

export function vendorDisplayNameInput(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/.test(value)) throw new VendorPortalError("Display name must be a single line of text.");
  const name = value.trim();
  if (name.length > 100) throw new VendorPortalError("Display name must be 100 characters or fewer.");
  return name || null;
}
