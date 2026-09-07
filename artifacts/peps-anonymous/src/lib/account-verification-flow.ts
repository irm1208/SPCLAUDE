export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

export function resolveTurnstileSiteKey(
  configuredKey: string | undefined,
  isProduction: boolean,
): string {
  const key = configuredKey?.trim();
  if (key) return key;
  return isProduction ? "" : TURNSTILE_TEST_SITE_KEY;
}

export function accountRequiresVerification(
  account: { verificationRequired?: boolean } | null | undefined,
): boolean {
  return account?.verificationRequired === true;
}

export function parseResendRetrySeconds(message: string): number | null {
  const match = message.match(/wait (\d+) seconds/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

export function preferredVerificationMethod(
  availableMethods: readonly string[],
): "telegram" | "email" | null {
  if (availableMethods.includes("telegram")) return "telegram";
  if (availableMethods.includes("email")) return "email";
  return null;
}