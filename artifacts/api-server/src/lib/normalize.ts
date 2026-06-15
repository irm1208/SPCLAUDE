/**
 * Normalize a Telegram username for storage and comparison.
 * Strips leading @, trims whitespace, and lowercases.
 * All account records are stored with this format — both signup/login
 * and admin-side member management must use this same function so that
 * membership lookups (`accountId = tg`) always match.
 */
export function normalizeTg(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@+/, "");
}
