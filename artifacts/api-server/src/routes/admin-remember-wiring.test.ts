import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("admin remembered session wiring", () => {
  it("binds 2FA challenge purpose to remember choice and returns it on restore", () => {
    const auth = read("./admin-auth.ts");
    expect(auth).toContain('purpose: rememberMe ? "login_remember" : "login"');
    expect(auth).toContain("rememberMe: isRememberedAdminSession");
    expect(auth).toContain("/admin/auth/legacy-login");
    expect(auth).toContain("/admin/auth/legacy-me");
    expect(auth).toContain("/admin/auth/legacy-logout");
  });

  it("rate-limits shared-secret legacy session issuance", () => {
    expect(read("./index.ts")).toContain('router.use("/admin/auth/legacy-login", adminTwoFactorLimiter)');
  });

  it("rejects invalid legacy cookies at the authorization boundary and binds tokens to ADMIN_SECRET", () => {
    const boundary = read("../middleware/require-admin.ts");
    expect(boundary).toContain("LEGACY_ADMIN_SESSION_COOKIE");
    expect(boundary).toContain("adminSessionTokenHash(legacyToken, secret)");
    expect(boundary).toContain('res.status(401).json({ error: "admin_session_expired" }); return;');
    expect(boundary).toContain('res.status(403).json({ error: "CSRF validation failed" }); return;');
  });

  it("returns the legacy Admin identity and lets an explicit shared-secret header recover from a stale cookie", () => {
    const auth = read("./admin-auth.ts");
    const boundary = read("../middleware/require-admin.ts");
    expect(auth).toContain("const legacyAdminUsername = () => process.env.ADMIN_USERNAME ?? \"admin\"");
    expect(auth).toContain("res.json({ username: legacyAdminUsername(), csrfToken, rememberMe })");
    expect(auth).toContain('if (!session) { clearLegacyCookies(res); res.status(401).json({ error: "admin_session_expired" }); return; }');
    expect(boundary).toContain('legacyAuth === "authorized" || legacyAuth === "stale"');
  });

  it("supports remembered legacy sessions in out-of-boundary admin and reshipper impersonation checks", () => {
    const boundary = read("../middleware/require-admin.ts");
    const reshipper = read("../middleware/require-reshipper.ts");
    expect(boundary).toContain("authenticateLegacyAdminCookie(req, res)");
    expect(reshipper).toContain("LEGACY_ADMIN_SESSION_COOKIE");
    expect(read("./intl-shipping.ts")).toContain("req.cookies?.[LEGACY_ADMIN_SESSION_COOKIE]");
    expect(read("./group-buys.ts")).toContain("req.cookies?.[LEGACY_ADMIN_SESSION_COOKIE]");
    expect(read("./gb-testing.ts")).toContain("req.cookies?.[LEGACY_ADMIN_SESSION_COOKIE]");
    const legacyAuth = boundary.slice(boundary.indexOf("async function authenticateLegacyAdminCookie"), boundary.indexOf("export function attachAdminSensitiveMutationAudit"));
    expect(legacyAuth.indexOf("if (!legacySession)")).toBeLessThan(legacyAuth.indexOf("isAllowedAdminCsrfOrigin"));
    expect(legacyAuth).toContain('res.status(403).json({ error: "CSRF validation failed" })');
  });

  it("uses one safe preview-aware CSRF origin policy and session cookies for unchecked 2FA logins", () => {
    const auth = read("./admin-auth.ts");
    const boundary = read("../middleware/require-admin.ts");
    expect(auth).toContain("isAllowedAdminCsrfOrigin(origin, req.get(\"host\"))");
    expect(boundary).toContain("isAllowedAdminCsrfOrigin(origin, req.get(\"host\"))");
    expect(auth).not.toContain("new URL(origin).host");
    expect(auth).toContain("...(rememberMe ? { maxAge:");
    expect(auth).toContain("setSessionCookies(res, verified.created, verified.rememberMe)");
    expect(auth).toContain("...cookieSecurity, path: \"/api\"");
  });

  it("issues legacy session lifetime and cookie persistence from either remember choice", () => {
    const auth = read("./admin-auth.ts");
    expect(auth).toContain("typeof req.body?.rememberMe !== \"boolean\"");
    expect(auth).toContain("adminSessionLifetimes(rememberMe)");
    expect(auth).toContain("legacyCookieOptions(rememberMe ? ADMIN_REMEMBERED_MS : undefined)");
    expect(auth).toContain("rememberMe: isRememberedAdminSession(res.locals.adminSession.createdAt, res.locals.adminSession.expiresAt)");
    expect(auth).toContain("adminSessionIdleMs(session.createdAt, session.expiresAt)");
  });
});