import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { accountsTable, db, revokedTokensTable } from "@workspace/db";
import { eq, lt } from "drizzle-orm";
import { isBlockedAutomatedRegistrationName } from "../lib/registration-abuse";
import { writeLog } from "../lib/audit-log";

// ── JWT secret ─────────────────────────────────────────────────────────────────

export function getJwtSecret(): string {
  const secret = process.env["ACCOUNT_JWT_SECRET"];
  if (!secret || secret.length < 32) {
    if (process.env["NODE_ENV"] === "production") {
      throw new Error("ACCOUNT_JWT_SECRET must be set to at least 32 characters in production");
    }
    console.warn("[auth] ACCOUNT_JWT_SECRET is not set or too short — using dev fallback. Set a strong secret in production.");
    return "dev-account-jwt-secret-change-in-prod-at-least-32-chars";
  }
  return secret;
}

export interface AccountJwtPayload {
  telegramUsername: string;
  jti: string;
  /** True only for sessions issued while account verification is outstanding. */
  verificationRequired: boolean;
}

const ACCOUNT_SESSION_IDLE_MS = 24 * 60 * 60 * 1000;
const ACCOUNT_SESSION_IDLE_SECONDS = ACCOUNT_SESSION_IDLE_MS / 1000;

declare global {
  namespace Express {
    interface Request {
      account?: AccountJwtPayload;
    }
  }
}

// ── Token revocation ──────────────────────────────────────────────────────────

export async function revokeToken(jti: string, expiresAt: Date): Promise<void> {
  try {
    await db.insert(revokedTokensTable).values({ jti, expiresAt }).onConflictDoNothing();
  } catch {
    // Non-fatal — log and continue
    console.error("[auth] Failed to revoke token jti:", jti);
  }
}

async function isTokenRevoked(jti: string): Promise<boolean> {
  try {
    const [row] = await db
      .select({ jti: revokedTokensTable.jti })
      .from(revokedTokensTable)
      .where(eq(revokedTokensTable.jti, jti));
    return !!row;
  } catch {
    return false;
  }
}

// Periodically prune expired revocation entries (runs every 6 hours)
let _cleanupScheduled = false;
function scheduleCleanup() {
  if (_cleanupScheduled) return;
  _cleanupScheduled = true;
  setInterval(async () => {
    try {
      await db.delete(revokedTokensTable).where(lt(revokedTokensTable.expiresAt, new Date()));
    } catch { /* non-fatal */ }
  }, 6 * 60 * 60 * 1000);
}
scheduleCleanup();

// ── Middleware ────────────────────────────────────────────────────────────────

export async function requireAccountIdentity(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.account_session as string | undefined;
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  let payload: AccountJwtPayload;
  try {
    payload = jwt.verify(token, getJwtSecret()) as AccountJwtPayload;
  } catch {
    res.status(401).json({ error: "Session expired or invalid — please log in again" });
    return;
  }
  if (
    !payload
    || typeof payload.telegramUsername !== "string"
    || !payload.telegramUsername
    || typeof payload.jti !== "string"
    || !payload.jti
    || (payload.verificationRequired !== undefined && typeof payload.verificationRequired !== "boolean")
  ) {
    res.status(401).json({ error: "Session expired or invalid — please log in again" });
    return;
  }

  const issuedAt = (payload as AccountJwtPayload & { iat?: number }).iat;
  if (typeof issuedAt !== "number" || Date.now() - issuedAt * 1000 >= ACCOUNT_SESSION_IDLE_MS) {
    res.status(401).json({ error: "Session expired or invalid — please log in again" });
    return;
  }

  if (isBlockedAutomatedRegistrationName(payload.telegramUsername)) {
    writeLog("login", "warn", "automated_account_access_blocked",
      "Automated account access blocked",
      { enforcementPoint: "account_session" },
      req.ip,
    ).catch(() => {});
    res.clearCookie("account_session", getAccountCookieOptions());
    res.status(403).json({ error: "Access denied" });
    return;
  }

  // Reject if this specific token has been revoked (e.g. explicit logout)
  if (await isTokenRevoked(payload.jti)) {
    res.status(401).json({ error: "Session has been revoked — please log in again" });
    return;
  }

  // Tokens issued before verification rollout have no claim and remain
  // grandfathered. New issuance must always include this explicit boolean.
  req.account = {
    telegramUsername: payload.telegramUsername,
    jti: payload.jti,
    verificationRequired: payload.verificationRequired === true,
  };
  next();
}

/** Requires a valid identity and an unrestricted (verified/grandfathered) session. */
export async function requireAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAccountIdentity(req, res, () => {
    if (req.account?.verificationRequired) {
      writeLog("login", "warn", "restricted_session_access_denied",
        "Restricted account session attempted protected access",
        { enforcementPoint: "account_session" },
        req.ip,
      ).catch(() => {});
      res.status(403).json({ error: "verification_required" });
      return;
    }
    next();
  });
}

// ── Cookie issuance ───────────────────────────────────────────────────────────

export function getAccountCookieOptions() {
  // REPL_ID is also present in published deployments. Partitioned cookies are
  // required only for the cross-site development preview iframe; applying them
  // to the first-party production domain can prevent a newly opened account tab
  // from sending the session cookie.
  const isReplitPreview =
    process.env["NODE_ENV"] !== "production" &&
    process.env["REPL_ID"] !== undefined;
  return {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production" || isReplitPreview,
    sameSite: isReplitPreview ? "none" as const : "lax" as const,
    ...(isReplitPreview ? { partitioned: true } : {}),
    path: "/",
  };
}

/** Low-level issuer; callers must explicitly declare the session restriction. */
export function issueAccountCookie(
  res: Response,
  telegramUsername: string,
  options: { verificationRequired: boolean },
): void {
  setAccountSessionCookie(res, {
    telegramUsername,
    jti: randomUUID(),
    verificationRequired: options.verificationRequired,
  });
}

/** Refreshes idle expiry while preserving the token ID used for logout revocation. */
export function refreshAccountCookie(res: Response, account: AccountJwtPayload): void {
  setAccountSessionCookie(res, account);
}

function setAccountSessionCookie(res: Response, payload: AccountJwtPayload): void {
  const secret = getJwtSecret();
  const token = jwt.sign(payload, secret, { expiresIn: ACCOUNT_SESSION_IDLE_SECONDS });
  res.cookie("account_session", token, {
    ...getAccountCookieOptions(),
    maxAge: ACCOUNT_SESSION_IDLE_MS,
  });
}

/** Issues a session from current authoritative verification state. */
export async function issueAccountCookieForAccount(res: Response, telegramUsername: string): Promise<boolean> {
  const [account] = await db
    .select({
      telegramUsername: accountsTable.telegramUsername,
      verificationRequiredAt: accountsTable.verificationRequiredAt,
      verifiedAt: accountsTable.verifiedAt,
    })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, telegramUsername))
    .limit(1);
  if (!account) return false;
  issueAccountCookie(res, account.telegramUsername, {
    verificationRequired: account.verificationRequiredAt !== null && account.verifiedAt === null,
  });
  return true;
}

// Export jti extractor so logout can revoke the current token
export function extractJtiFromCookie(req: Request): { jti: string; expiresAt: Date } | null {
  const token = req.cookies?.account_session as string | undefined;
  if (!token) return null;
  try {
    const payload = jwt.decode(token) as { jti?: string; exp?: number } | null;
    if (!payload?.jti || !payload?.exp) return null;
    return { jti: payload.jti, expiresAt: new Date(payload.exp * 1000) };
  } catch {
    return null;
  }
}
