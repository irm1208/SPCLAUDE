/** Session identity is authoritative; only actual guests may supply an owner. */
export function resolveOrderUsername(accountUsername: string | null | undefined, submittedUsername: unknown): string | null {
  const username = accountUsername ?? submittedUsername;
  if (typeof username !== "string" || !username.trim()) return null;
  const trimmed = username.trim().toLowerCase();
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}
