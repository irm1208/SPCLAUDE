/** Customer-visible plain text only; blank/null explicitly removes a saved note. */
export function normalizeWholesalePriceNote(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > 1000) {
    throw new Error("Price note must be text of no more than 1,000 characters.");
  }
  return value.trim() || null;
}
