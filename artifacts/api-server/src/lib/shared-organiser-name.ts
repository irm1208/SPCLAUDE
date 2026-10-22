export const ORGANISER_FULL_NAME_ERROR = "Enter your real first and last name, not your username.";

/** Validates a self-declared full name; this is not identity verification. */
export function parseOrganiserFullName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 3 || name.length > 100 || !/^[\p{L}\p{M} .’'-]+$/u.test(name)) return null;
  const parts = name.split(" ");
  if (parts.length < 2 || parts.some(part => !/\p{L}/u.test(part))) return null;
  return name;
}
