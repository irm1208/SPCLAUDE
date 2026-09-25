export function parseVendorShippingAmount(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number.parseFloat(trimmed);
}