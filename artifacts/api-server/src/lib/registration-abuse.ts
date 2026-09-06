const AUTOMATED_REGISTRATION_NAME =
  /^(?:auditx|audx|audv|audj|auditshop|hermesaudit)[a-z0-9_-]*$/i;

export function isBlockedAutomatedRegistrationName(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return AUTOMATED_REGISTRATION_NAME.test(value.trim().replace(/^@/, ""));
}