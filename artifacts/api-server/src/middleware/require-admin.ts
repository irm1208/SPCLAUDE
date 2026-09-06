import { timingSafeEqual, createHash, createHmac } from "crypto";
import type { Request, Response } from "express";
import { db } from "@workspace/db";
import { auditLogsTable, adminSecuritySettingsTable, adminSessionsTable, adminUsersTable } from "@workspace/db";
import { and, gte, eq, sql, gt, isNull } from "drizzle-orm";

// ── In-memory fast path + DB-backed persistence ────────────────────────────────
// In-memory map is fast for the common case.
// Each failure is persisted to the audit log so that across server restarts,
// accumulated failures are not lost (attackers can't just wait for a restart).

interface AttemptRecord {
  count: number;
  blockedUntil: number;
}

const attempts = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 30;
const BLOCK_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_IDLE_MS = 30 * 60 * 1000;
const SESSION_ACTIVITY_WRITE_MS = 5 * 60 * 1000;

function getIp(req: Request): string {
  return (req.ip ?? req.socket?.remoteAddress ?? "unknown") as string;
}

function logFailureToDB(ip: string): void {
  db.insert(auditLogsTable).values({
    type: "login",
    level: "warn",
    action: "admin_auth_fail",
    message: `Failed admin auth attempt from ${ip}`,
    metadata: { ip },
    ip,
  }).catch(() => {});
}

// Check DB for accumulated failures — used to restore state after a restart.
// Fire-and-forget: called in the background, updates in-memory state for next request.
function syncBlockFromDB(ip: string, current: AttemptRecord): void {
  const windowStart = new Date(Date.now() - BLOCK_MS);
  db.select({ count: sql<number>`count(*)::int` })
    .from(auditLogsTable)
    .where(and(
      eq(auditLogsTable.action, "admin_auth_fail"),
      eq(auditLogsTable.ip, ip),
      gte(auditLogsTable.createdAt, windowStart),
    ))
    .then(([row]) => {
      const total = row?.count ?? 0;
      if (total >= MAX_ATTEMPTS && current.blockedUntil <= Date.now()) {
        current.blockedUntil = Date.now() + BLOCK_MS;
        current.count = total;
        attempts.set(ip, current);
      }
    })
    .catch(() => {});
}

export function requireAdmin(req: Request, res: Response): boolean {
  // All /admin requests first pass through adminAuthorizationMiddleware.  A
  // session is never treated as a fallback while the server setting is off.
  if (res.locals["adminAuthorized"]) return true;
  if (res.locals["adminModeEnabled"]) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  const secret = process.env["ADMIN_SECRET"];
  if (!secret) {
    res.status(503).json({ error: "Admin not configured" });
    return false;
  }

  const ip = getIp(req);
  const now = Date.now();

  const rec = attempts.get(ip);
  if (rec && rec.blockedUntil > now) {
    const wait = Math.ceil((rec.blockedUntil - now) / 1000);
    res.status(429).json({ error: `Too many failed attempts. Try again in ${wait}s.` });
    return false;
  }

  const provided = req.headers["x-admin-secret"];
  if (!provided || typeof provided !== "string") {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }

  let authed = false;
  try {
    const bufA = Buffer.from(provided, "utf8");
    const bufB = Buffer.from(secret, "utf8");
    if (bufA.length === bufB.length) {
      authed = timingSafeEqual(bufA, bufB);
    } else {
      timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    }
  } catch {
    authed = false;
  }

  if (!authed) {
    const current = attempts.get(ip) ?? { count: 0, blockedUntil: 0 };
    current.count += 1;

    // Persist failure to DB for restart-resistant brute-force protection
    logFailureToDB(ip);

    // If in-memory count is still low, do an async DB sync to catch post-restart accumulated failures
    if (current.count < MAX_ATTEMPTS) {
      syncBlockFromDB(ip, current);
    }

    if (current.count >= MAX_ATTEMPTS) {
      current.blockedUntil = now + BLOCK_MS;
    }
    attempts.set(ip, current);
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }

  attempts.delete(ip);

  // Stamp the acting admin identity onto request locals for downstream use (e.g. audit logs).
  // Uses ADMIN_USERNAME env var if set; falls back to "admin" for single-secret setups.
  res.locals["adminUsername"] = process.env["ADMIN_USERNAME"] ?? "admin";

  return true;
}

/**
 * The single authorization boundary for ordinary admin routes.  In enabled
 * mode it categorically ignores x-admin-secret; in disabled mode existing
 * handlers retain their timing-safe shared-secret check.
 */
export async function adminAuthorizationMiddleware(req: Request, res: Response, next: () => void): Promise<void> {
  const [settings] = await db.select().from(adminSecuritySettingsTable).where(eq(adminSecuritySettingsTable.id, 1));
  const enabled = settings?.twoFactorEnabled === true;
  res.locals["adminModeEnabled"] = enabled;
  if (!enabled) { next(); return; }

  const token = req.cookies?.["peps_admin_session"];
  if (typeof token !== "string") { res.status(401).json({ error: "Unauthorized" }); return; }
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [session] = await db.select().from(adminSessionsTable).where(and(
    eq(adminSessionsTable.tokenHash, tokenHash),
    isNull(adminSessionsTable.revokedAt),
    gt(adminSessionsTable.idleExpiresAt, new Date()),
    gt(adminSessionsTable.expiresAt, new Date()),
  ));
  if (!session) { res.status(401).json({ error: "admin_session_expired" }); return; }
  const [user] = await db.select().from(adminUsersTable).where(and(eq(adminUsersTable.id, session.adminUserId), eq(adminUsersTable.active, true)));
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.get("origin") ?? req.get("referer");
    const host = req.get("host");
    const csrf = req.get("x-admin-csrf");
    let sameOrigin = false;
    try { sameOrigin = !!origin && !!host && new URL(origin).host === host; } catch { /* rejected below */ }
    if (!sameOrigin || typeof csrf !== "string" || !timingSafeHashEqual(csrf, session.csrfTokenHash)) {
      res.status(403).json({ error: "CSRF validation failed" }); return;
    }
  }
  res.locals["adminAuthorized"] = true;
  res.locals["adminUser"] = user;
  res.locals["adminSession"] = session;
  res.locals["adminUsername"] = user.username;
  if (Date.now() - new Date(session.lastUsedAt).getTime() >= SESSION_ACTIVITY_WRITE_MS) {
    const now = new Date();
    await db.update(adminSessionsTable).set({
      lastUsedAt: now,
      idleExpiresAt: new Date(Math.min(now.getTime() + SESSION_IDLE_MS, new Date(session.expiresAt).getTime())),
    }).where(eq(adminSessionsTable.id, session.id));
  }
  const protectedMutation = isReusableStepUpRoute(req);
  if (protectedMutation) attachAdminSensitiveMutationAudit(req, res, isSingleUseMutationPath(req.path) ? "single_use" : "reusable");
  if (protectedMutation && !hasRecentStepUp(session.stepUpAt)) {
    res.status(403).json({ error: "step_up_required" }); return;
  }
  next();
}

export function attachAdminSensitiveMutationAudit(req: Request, res: Response, stepUpMode: "reusable" | "single_use"): void {
  if (res.locals["adminSensitiveAuditAttached"]) return;
  res.locals["adminSensitiveAuditAttached"] = true;
  const user = res.locals["adminUser"] as { id: string; username: string } | undefined;
  const session = res.locals["adminSession"] as { stepUpAt?: Date | null } | undefined;
  res.once("finish", () => {
    const requestId = (req as Request & { correlationId?: string }).correlationId ?? null;
    const fingerprintKey = process.env["SESSION_SECRET"] ?? process.env["ADMIN_SECRET"] ?? "peps-unconfigured-audit-key";
    const requestFingerprint = createHmac("sha256", fingerprintKey).update(getIp(req)).digest("hex");
    db.insert(auditLogsTable).values({
      type: "change",
      level: res.statusCode < 400 ? "info" : "warn",
      action: "admin_sensitive_mutation",
      message: `Admin sensitive mutation ${res.statusCode < 400 ? "completed" : "rejected"}`,
      metadata: {
        adminId: user?.id ?? null,
        adminUsername: user?.username ?? null,
        method: req.method,
        path: req.route?.path ?? req.path,
        target: safeMutationTarget(req),
        authMode: res.locals["adminModeEnabled"] ? "admin_2fa_session" : "admin_secret",
        stepUpMode,
        stepUpTime: session?.stepUpAt?.toISOString() ?? null,
        requestId,
        requestFingerprint,
        summary: res.locals["adminMutationSummary"] ?? null,
        status: res.statusCode,
        result: res.statusCode < 400 ? "success" : "rejected",
      },
      ip: getIp(req),
    }).catch(() => {});
  });
}

export function setAdminMutationSummary(res: Response, category: string, changedFields: string[], status?: string): void {
  res.locals["adminMutationSummary"] = {
    category,
    changedFields: [...new Set(changedFields)].filter(field => /^[a-zA-Z][a-zA-Z0-9_.-]{0,63}$/.test(field)),
    status: status && /^[a-zA-Z0-9_-]{1,32}$/.test(status) ? status : undefined,
  };
}

function safeMutationTarget(req: Request): string | null {
  for (const key of ["id", "gbId", "orderId", "productId", "legId"]) {
    const value = req.params?.[key];
    if (typeof value === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(value)) return `${key}:${value}`;
  }
  return null;
}

function isSingleUseMutationPath(path: string): boolean {
  return ["/wallet-address", "/chain-wallets", "/wallet-change-code", "/security/disable", "/security/recovery-codes"].includes(path);
}

/** Use on routes outside the `/admin` mount which offer an admin alternative. */
export async function requireAdminForRequest(req: Request, res: Response): Promise<boolean> {
  const [settings] = await db.select().from(adminSecuritySettingsTable).where(eq(adminSecuritySettingsTable.id, 1));
  res.locals["adminModeEnabled"] = settings?.twoFactorEnabled === true;
  if (!res.locals["adminModeEnabled"]) return requireAdmin(req, res);
  let passed = false;
  await adminAuthorizationMiddleware(req, res, () => { passed = true; });
  return passed;
}

function timingSafeHashEqual(value: string, expectedHash: string): boolean {
  const actualHash = createHash("sha256").update(value).digest("hex");
  const a = Buffer.from(actualHash), b = Buffer.from(expectedHash);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Returns the authenticated admin username stamped by requireAdmin. */
export function getAdminUsername(res: Response): string {
  return (res.locals?.["adminUsername"] as string | undefined) ?? "admin";
}

/** Enforces the reusable ten-minute, session-bound TOTP assertion. */
export function requireAdminStepUp(_req: Request, res: Response): boolean {
  if (!res.locals["adminModeEnabled"]) return true;
  const stepUpAt = res.locals["adminSession"]?.stepUpAt as Date | null | undefined;
  if (!hasRecentStepUp(stepUpAt)) {
    res.status(403).json({ error: "step_up_required" });
    return false;
  }
  return true;
}

function hasRecentStepUp(stepUpAt: Date | null | undefined): boolean {
  return !!stepUpAt && Date.now() - new Date(stepUpAt).getTime() <= 10 * 60_000;
}

// Paths are evaluated after the /admin mount. Extra TOTP is intentionally
// limited to security and money-destination configuration; the authenticated
// admin session is sufficient for routine operational mutations.
function isReusableStepUpRoute(req: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return false;
  const path = req.path;
  return path === "/payments-config" ||
    path === "/anonpay-config" ||
    path === "/wallet-address" ||
    path === "/wallet-change-code" ||
    path === "/chain-wallets";
}
