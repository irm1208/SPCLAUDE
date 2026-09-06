import { Router, type Request, type Response, type NextFunction } from "express";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, adminSecuritySettingsTable, adminUsersTable, adminRecoveryCodesTable, adminSessionsTable, adminPendingChallengesTable, adminStepUpAssertionsTable } from "@workspace/db";
import { base32Encode, decryptTotpSecret, encryptTotpSecret, generateOpaqueToken, generateRecoveryCodes, hashAdminCredential, hashOpaqueToken, hashRecoveryCode, isAdminTotpEncryptionConfigured, verifyAdminCredential, verifyRecoveryCode, verifyTotp } from "../lib/admin-2fa";
import { writeLog } from "../lib/audit-log";

const router = Router();
const SESSION_COOKIE = "peps_admin_session";
const CSRF_COOKIE = "peps_admin_csrf";
const IDLE_MS = 30 * 60_000;
const ABSOLUTE_MS = 8 * 60 * 60_000;
const CHALLENGE_MS = 5 * 60_000;
class PendingChallengeConsumedError extends Error {}
const secureCookie = process.env.NODE_ENV === "production";
const authError = (res: Response) => res.status(401).json({ error: "Unauthorized" });
function securityAudit(req: Request, action: string, admin?: string): void {
  // Never include password, TOTP, recovery code, challenge, assertion, or token.
  writeLog("change", "info", action, `Admin security action: ${action}`, { admin, requestId: (req as Request & { correlationId?: string }).correlationId }, req.ip).catch(() => {});
}
function securityFailure(req: Request, action: string): void {
  writeLog("login", "warn", action, "Admin authentication failed", { requestId: (req as Request & { correlationId?: string }).correlationId }, req.ip).catch(() => {});
}

async function setting() {
  await db.insert(adminSecuritySettingsTable).values({ id: 1, twoFactorEnabled: false }).onConflictDoNothing();
  return (await db.select().from(adminSecuritySettingsTable).where(eq(adminSecuritySettingsTable.id, 1)))[0]!;
}
function safeSecret(provided: unknown): boolean {
  const expected = process.env.ADMIN_SECRET;
  if (!expected || typeof provided !== "string") return false;
  const a = Buffer.from(provided), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
function newSession(userId: string): { token: string; csrfToken: string; values: typeof adminSessionsTable.$inferInsert } {
  const token = generateOpaqueToken(), csrfToken = generateOpaqueToken();
  const now = Date.now();
  return { token, csrfToken, values: {
    id: randomUUID(), adminUserId: userId, tokenHash: hashOpaqueToken(token), csrfTokenHash: hashOpaqueToken(csrfToken),
    idleExpiresAt: new Date(now + IDLE_MS), expiresAt: new Date(now + ABSOLUTE_MS),
  }};
}
function setSessionCookies(res: Response, session: { token: string; csrfToken: string }): void {
  const options = { secure: secureCookie, sameSite: "strict" as const, path: "/api", maxAge: ABSOLUTE_MS };
  res.cookie(SESSION_COOKIE, session.token, { ...options, httpOnly: true });
  // The readable half is not authentication material; it is compared to a
  // server-side hash and lets a refreshed SPA recover CSRF state.
  res.cookie(CSRF_COOKIE, session.csrfToken, { ...options, httpOnly: false });
}
async function issueSession(res: Response, userId: string): Promise<{ csrfToken: string }> {
  const session = newSession(userId);
  await db.insert(adminSessionsTable).values(session.values);
  setSessionCookies(res, session);
  return { csrfToken: session.csrfToken };
}
function otpUri(username: string, secret: Buffer) {
  return `otpauth://totp/${encodeURIComponent(`Peps Admin:${username}`)}?secret=${base32Encode(secret)}&issuer=Peps%20Admin&algorithm=SHA1&digits=6&period=30`;
}
async function consumeTotp(user: typeof adminUsersTable.$inferSelect, code: string): Promise<boolean> {
  if (!user.totpSecretEncrypted) return false;
  let check;
  try { check = verifyTotp(decryptTotpSecret(user.totpSecretEncrypted), code); } catch { return false; }
  if (!check.valid || user.lastTotpStep === check.step) return false;
  const changed = await db.update(adminUsersTable).set({ lastTotpStep: check.step, updatedAt: new Date() })
    .where(and(eq(adminUsersTable.id, user.id), user.lastTotpStep == null ? isNull(adminUsersTable.lastTotpStep) : eq(adminUsersTable.lastTotpStep, user.lastTotpStep)))
    .returning({ id: adminUsersTable.id });
  return changed.length === 1;
}

router.get("/admin/security/status", async (_req, res) => {
  const state = await setting();
  res.json({ twoFactorEnabled: state.twoFactorEnabled });
});

router.post("/admin/security/enable/start", async (req, res) => {
  if (!isAdminTotpEncryptionConfigured()) { res.status(503).json({ error: "Admin two-factor authentication is not configured" }); return; }
  const state = await setting();
  if (state.twoFactorEnabled || !safeSecret(req.body?.adminSecret)) { securityFailure(req, "admin_bootstrap_auth_failed"); authError(res); return; }
  const username = String(req.body?.username ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  if (!/^[a-z0-9_.-]{3,64}$/.test(username) || password.length < 12) { res.status(400).json({ error: "Invalid enrolment" }); return; }
  const secret = Buffer.from(generateOpaqueToken(20), "base64url");
  const id = randomUUID();
  // Node's built-in scrypt provides memory-hard credential storage without a
  // native third-party runtime dependency.
  const passwordHash = await hashAdminCredential(password);
  const encryptedSecret = encryptTotpSecret(secret);
  await db.insert(adminUsersTable).values({ id, username, passwordHash, totpSecretEncrypted: encryptedSecret, totpEnabled: false })
    .onConflictDoUpdate({ target: adminUsersTable.username, set: { passwordHash, totpSecretEncrypted: encryptedSecret, totpEnabled: false, active: true, updatedAt: new Date() } });
  const [user] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.username, username));
  const challenge = generateOpaqueToken();
  await db.insert(adminPendingChallengesTable).values({ id: randomUUID(), adminUserId: user!.id, tokenHash: hashOpaqueToken(challenge), purpose: "enable", expiresAt: new Date(Date.now() + CHALLENGE_MS) });
  res.json({ challenge, otpauthUri: otpUri(username, secret), manualKey: base32Encode(secret) });
});

router.post("/admin/security/enable/confirm", async (req, res) => {
  if (!isAdminTotpEncryptionConfigured()) { res.status(503).json({ error: "Admin two-factor authentication is not configured" }); return; }
  const state = await setting();
  const challenge = String(req.body?.challenge ?? ""), code = String(req.body?.code ?? "");
  if (state.twoFactorEnabled || !challenge || req.body?.confirmActivation !== true) { securityFailure(req, "admin_enable_confirmation_failed"); authError(res); return; }
  const [pending] = await db.select().from(adminPendingChallengesTable).where(and(eq(adminPendingChallengesTable.tokenHash, hashOpaqueToken(challenge)), eq(adminPendingChallengesTable.purpose, "enable"), isNull(adminPendingChallengesTable.consumedAt), gt(adminPendingChallengesTable.expiresAt, new Date())));
  if (!pending) { securityFailure(req, "admin_enable_challenge_failed"); authError(res); return; }
  const [user] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, pending.adminUserId));
  if (!user || !(await consumeTotp(user, code))) { securityFailure(req, "admin_enable_totp_failed"); authError(res); return; }
  const codes = generateRecoveryCodes();
  const session = await db.transaction(async tx => {
    await tx.update(adminPendingChallengesTable).set({ consumedAt: new Date() }).where(eq(adminPendingChallengesTable.id, pending.id));
    await tx.update(adminUsersTable).set({ totpEnabled: true, twoFactorChangedAt: new Date() }).where(eq(adminUsersTable.id, user.id));
    await tx.insert(adminRecoveryCodesTable).values(await Promise.all(codes.map(async code => ({ id: randomUUID(), adminUserId: user.id, codeHash: await hashRecoveryCode(code) }))));
    await tx.update(adminSecuritySettingsTable).set({ twoFactorEnabled: true, updatedAt: new Date() }).where(eq(adminSecuritySettingsTable.id, 1));
    const created = newSession(user.id);
    await tx.insert(adminSessionsTable).values(created.values);
    return created;
  });
  setSessionCookies(res, session);
  securityAudit(req, "admin_2fa_enabled", user.username);
  res.json({ csrfToken: session.csrfToken, recoveryCodes: codes });
});

router.post("/admin/auth/login", async (req, res) => {
  if (!(await setting()).twoFactorEnabled) { authError(res); return; }
  if (!isAdminTotpEncryptionConfigured()) { res.status(503).json({ error: "Admin two-factor authentication is not configured" }); return; }
  const username = String(req.body?.username ?? "").trim().toLowerCase(), password = String(req.body?.password ?? "");
  const [user] = await db.select().from(adminUsersTable).where(and(eq(adminUsersTable.username, username), eq(adminUsersTable.active, true), eq(adminUsersTable.totpEnabled, true)));
  if (!user || !(await verifyAdminCredential(password, user.passwordHash))) { securityFailure(req, "admin_password_auth_failed"); authError(res); return; }
  const token = generateOpaqueToken();
  await db.insert(adminPendingChallengesTable).values({ id: randomUUID(), adminUserId: user.id, tokenHash: hashOpaqueToken(token), purpose: "login", expiresAt: new Date(Date.now() + CHALLENGE_MS) });
  res.json({ challenge: token });
});

router.post("/admin/auth/verify", async (req, res) => {
  if (!(await setting()).twoFactorEnabled) { authError(res); return; }
  if (!isAdminTotpEncryptionConfigured()) { res.status(503).json({ error: "Admin two-factor authentication is not configured" }); return; }
  const challenge = String(req.body?.challenge ?? ""), code = String(req.body?.code ?? ""), recoveryCode = String(req.body?.recoveryCode ?? "").toUpperCase();
  let verified: { created: ReturnType<typeof newSession>; username: string } | null;
  try {
    verified = await db.transaction(async tx => {
    const [pending] = await tx.select().from(adminPendingChallengesTable).where(and(eq(adminPendingChallengesTable.tokenHash, hashOpaqueToken(challenge)), eq(adminPendingChallengesTable.purpose, "login"), isNull(adminPendingChallengesTable.consumedAt), gt(adminPendingChallengesTable.expiresAt, new Date())));
    if (!pending) return null;
    const [user] = await tx.select().from(adminUsersTable).where(eq(adminUsersTable.id, pending.adminUserId));
    if (!user) return null;
    let accepted = false;
    if (user.totpSecretEncrypted) {
      try {
        const check = verifyTotp(decryptTotpSecret(user.totpSecretEncrypted), code);
        if (check.valid && user.lastTotpStep !== check.step) {
          accepted = (await tx.update(adminUsersTable).set({ lastTotpStep: check.step, updatedAt: new Date() })
            .where(and(eq(adminUsersTable.id, user.id), user.lastTotpStep == null ? isNull(adminUsersTable.lastTotpStep) : eq(adminUsersTable.lastTotpStep, user.lastTotpStep))).returning({ id: adminUsersTable.id })).length === 1;
        }
      } catch { accepted = false; }
    }
    if (!accepted && recoveryCode) {
      const codes = await tx.select().from(adminRecoveryCodesTable).where(and(eq(adminRecoveryCodesTable.adminUserId, user.id), isNull(adminRecoveryCodesTable.usedAt)));
      for (const item of codes) {
        if (await verifyRecoveryCode(recoveryCode, item.codeHash)) {
          accepted = (await tx.update(adminRecoveryCodesTable).set({ usedAt: new Date() }).where(and(eq(adminRecoveryCodesTable.id, item.id), isNull(adminRecoveryCodesTable.usedAt))).returning()).length === 1;
          break;
        }
      }
    }
    if (!accepted) return null;
    const consumed = await tx.update(adminPendingChallengesTable).set({ consumedAt: new Date() })
      .where(and(eq(adminPendingChallengesTable.id, pending.id), isNull(adminPendingChallengesTable.consumedAt))).returning({ id: adminPendingChallengesTable.id });
    // Throwing (rather than returning null) is essential: a concurrent winner
    // may have caused this CAS to lose after this transaction consumed a TOTP
    // step or recovery code, and the throw rolls those writes back.
    if (consumed.length !== 1) throw new PendingChallengeConsumedError();
    await tx.update(adminUsersTable).set({ lastLoginAt: new Date() }).where(eq(adminUsersTable.id, user.id));
    const created = newSession(user.id);
    await tx.insert(adminSessionsTable).values(created.values);
    return { created, username: user.username };
    });
  } catch (error) {
    if (error instanceof PendingChallengeConsumedError) {
      securityFailure(req, "admin_second_factor_failed");
      authError(res);
      return;
    }
    throw error;
  }
  if (!verified) { securityFailure(req, recoveryCode ? "admin_recovery_auth_failed" : "admin_totp_auth_failed"); authError(res); return; }
  setSessionCookies(res, verified.created);
  securityAudit(req, recoveryCode ? "admin_login_recovery" : "admin_login", verified.username);
  res.json({ csrfToken: verified.created.csrfToken });
});

router.post("/admin/auth/logout", adminSessionMiddleware, async (req, res) => {
  await db.update(adminSessionsTable).set({ revokedAt: new Date() }).where(eq(adminSessionsTable.id, res.locals.adminSession.id));
  const options = { secure: secureCookie, sameSite: "strict" as const, path: "/api" };
  res.clearCookie(SESSION_COOKIE, { ...options, httpOnly: true }); res.clearCookie(CSRF_COOKIE, { ...options, httpOnly: false }); res.json({ ok: true });
});

router.get("/admin/auth/me", adminSessionMiddleware, (req, res) => res.json({ username: res.locals.adminUsername, csrfToken: req.cookies?.[CSRF_COOKIE] }));

router.post("/admin/auth/step-up", adminSessionMiddleware, async (req, res) => {
  if (!isAdminTotpEncryptionConfigured()) { res.status(503).json({ error: "Admin two-factor authentication is not configured" }); return; }
  const user = res.locals.adminUser as typeof adminUsersTable.$inferSelect;
  if (!await consumeTotp(user, String(req.body?.code ?? ""))) { securityFailure(req, "admin_step_up_failed"); authError(res); return; }
  await db.update(adminSessionsTable).set({ stepUpAt: new Date() }).where(eq(adminSessionsTable.id, res.locals.adminSession.id));
  const action = String(req.body?.action ?? ""), target = String(req.body?.target ?? "");
  const payloadHash = hashOpaqueToken(canonicalAdminActionPayload(req.body?.payload ?? null));
  if (!action || !target) { res.json({ ok: true }); return; }
  const assertion = generateOpaqueToken();
  await db.insert(adminStepUpAssertionsTable).values({ id: randomUUID(), adminSessionId: res.locals.adminSession.id, tokenHash: hashOpaqueToken(assertion), action, target, payloadHash, expiresAt: new Date(Date.now() + 5 * 60_000) });
  securityAudit(req, "admin_step_up", user.username);
  res.json({ ok: true, assertion });
});

router.post("/admin/security/recovery-codes", adminSessionMiddleware, async (req, res) => {
  const user = res.locals.adminUser as typeof adminUsersTable.$inferSelect;
  if (!await consumeAdminActionAssertion(req, res, "admin.security.recovery-codes", user.id, null)) { res.status(403).json({ error: "step_up_required" }); return; }
  const recoveryCodes = generateRecoveryCodes();
  await db.transaction(async tx => {
    await tx.delete(adminRecoveryCodesTable).where(eq(adminRecoveryCodesTable.adminUserId, user.id));
    await tx.insert(adminRecoveryCodesTable).values(await Promise.all(recoveryCodes.map(async code => ({ id: randomUUID(), adminUserId: user.id, codeHash: await hashRecoveryCode(code) }))));
  });
  securityAudit(req, "admin_recovery_codes_regenerated", user.username);
  res.json({ recoveryCodes });
});

router.post("/admin/security/disable", adminSessionMiddleware, async (req, res) => {
  const user = res.locals.adminUser as typeof adminUsersTable.$inferSelect;
  if (!process.env.ADMIN_SECRET || !await consumeAdminActionAssertion(req, res, "admin.security.disable", "admin-security", null)) { res.status(403).json({ error: "step_up_required" }); return; }
  await db.transaction(async tx => { await tx.update(adminSecuritySettingsTable).set({ twoFactorEnabled: false, updatedAt: new Date() }).where(eq(adminSecuritySettingsTable.id, 1)); await tx.update(adminSessionsTable).set({ revokedAt: new Date() }).where(isNull(adminSessionsTable.revokedAt)); await tx.update(adminPendingChallengesTable).set({ consumedAt: new Date() }).where(isNull(adminPendingChallengesTable.consumedAt)); });
  securityAudit(req, "admin_2fa_disabled", user.username);
  const options = { secure: secureCookie, sameSite: "strict" as const, path: "/api" };
  res.clearCookie(SESSION_COOKIE, { ...options, httpOnly: true }); res.clearCookie(CSRF_COOKIE, { ...options, httpOnly: false }); res.json({ ok: true });
});

export async function adminSessionMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!(await setting()).twoFactorEnabled) { authError(res); return; }
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== "string") { authError(res); return; }
  const [session] = await db.select().from(adminSessionsTable).where(and(eq(adminSessionsTable.tokenHash, hashOpaqueToken(token)), isNull(adminSessionsTable.revokedAt), gt(adminSessionsTable.idleExpiresAt, new Date()), gt(adminSessionsTable.expiresAt, new Date())));
  if (!session) { res.status(401).json({ error: "admin_session_expired" }); return; }
  const [user] = await db.select().from(adminUsersTable).where(and(eq(adminUsersTable.id, session.adminUserId), eq(adminUsersTable.active, true)));
  if (!user) { authError(res); return; }
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const csrf = req.get("x-admin-csrf");
    const origin = req.get("origin") ?? req.get("referer");
    const host = req.get("host");
    let sameOrigin = false;
    try { sameOrigin = !!origin && !!host && new URL(origin).host === host; } catch { /* rejected below */ }
    if (!csrf || !sameOrigin || !safeHashEqual(csrf, session.csrfTokenHash)) {
      res.status(403).json({ error: "CSRF validation failed" }); return;
    }
  }
  res.locals.adminAuthorized = true; res.locals.adminUser = user; res.locals.adminSession = session; res.locals.adminUsername = user.username;
  res.locals.adminCsrfToken = req.cookies?.[CSRF_COOKIE];
  // Bound activity writes to at most once per five minutes and never beyond
  // absolute expiry.
  if (Date.now() - new Date(session.lastUsedAt).getTime() > 5 * 60_000) {
    const nextIdle = new Date(Math.min(Date.now() + IDLE_MS, new Date(session.expiresAt).getTime()));
    await db.update(adminSessionsTable).set({ lastUsedAt: new Date(), idleExpiresAt: nextIdle }).where(eq(adminSessionsTable.id, session.id));
  }
  next();
}

function safeHashEqual(value: string, expected: string): boolean {
  const a = Buffer.from(hashOpaqueToken(value)), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function consumeAdminActionAssertion(req: Request, res: Response, action: string, target: string, payload: unknown): Promise<boolean> {
  const token = req.get("x-admin-action-assertion");
  if (!token || !res.locals.adminSession) return false;
  const consumed = await db.update(adminStepUpAssertionsTable).set({ consumedAt: new Date() }).where(and(
    eq(adminStepUpAssertionsTable.tokenHash, hashOpaqueToken(token)),
    eq(adminStepUpAssertionsTable.adminSessionId, res.locals.adminSession.id),
    eq(adminStepUpAssertionsTable.action, action),
    eq(adminStepUpAssertionsTable.target, target),
    eq(adminStepUpAssertionsTable.payloadHash, hashOpaqueToken(canonicalAdminActionPayload(payload))),
    isNull(adminStepUpAssertionsTable.consumedAt),
    gt(adminStepUpAssertionsTable.expiresAt, new Date()),
  )).returning({ id: adminStepUpAssertionsTable.id });
  return consumed.length === 1;
}
export function canonicalAdminActionPayload(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Assertion payload must be JSON");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalAdminActionPayload).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>).sort().map(k => `${JSON.stringify(k)}:${canonicalAdminActionPayload((value as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  throw new Error("Assertion payload must be JSON");
}
export { SESSION_COOKIE, CSRF_COOKIE, setting as getAdminSecuritySetting };
export default router;