export type AdminCsrfEnvironment = Record<string, string | undefined>;

/** Compare against Host, with one narrow HTTPS Replit preview exception. */
export function isAllowedAdminCsrfOrigin(
  originHeader: string | undefined,
  requestHost: string | undefined,
  env: AdminCsrfEnvironment = process.env,
): boolean {
  if (!originHeader || !requestHost) return false;
  let origin: URL;
  try { origin = new URL(originHeader); } catch { return false; }
  if (origin.host === requestHost.toLowerCase()) return true;
  return env.NODE_ENV !== "production"
    && origin.protocol === "https:"
    && !!env.REPLIT_DEV_DOMAIN
    && origin.host === env.REPLIT_DEV_DOMAIN;
}

/** Matches the account cookie strategy for Replit's cross-site preview iframe. */
export function adminCookieSecurityOptions(env: AdminCsrfEnvironment = process.env) {
  const isReplitPreview = env.NODE_ENV !== "production" && env.REPL_ID !== undefined;
  return {
    secure: env.NODE_ENV === "production" || isReplitPreview,
    sameSite: isReplitPreview ? "none" as const : "strict" as const,
    ...(isReplitPreview ? { partitioned: true } : {}),
  };
}