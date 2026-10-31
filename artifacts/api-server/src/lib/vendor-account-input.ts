export const validVendorPassword = (value: unknown): value is string => typeof value === "string" && value.length >= 12 && value.length <= 128 && Buffer.byteLength(value, "utf8") <= 72;
export function vendorUsername(value: unknown): string { return typeof value === "string" ? value.trim().toLowerCase() : ""; }
export const validVendorUsername = (value: string) => /^[a-z0-9][a-z0-9_.-]{2,49}$/.test(value);
