const AUTOMATED_REGISTRATION_NAME =
  /^(?:aud|hermesaudit)[a-z0-9_-]*$/i;

export function isBlockedAutomatedRegistrationName(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const username = value.trim().replace(/^@/, "").toLowerCase();
  // Explicitly approved member; all account/role checks still apply.
  if (username === "audacityblack") return false;
  return AUTOMATED_REGISTRATION_NAME.test(username);
}