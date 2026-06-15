import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { revokedTokensTable } from "@workspace/db";
import { eq, lt } from "drizzle-orm";

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
}

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

export async function requireAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
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

  // Reject if this specific token has been revoked (e.g. explicit logout)
  if (payload.jti && await isTokenRevoked(payload.jti)) {
    res.status(401).json({ error: "Session has been revoked — please log in again" });
    return;
  }

  req.account = { telegramUsername: payload.telegramUsername, jti: payload.jti };
  next();
}

// ── Cookie issuance ───────────────────────────────────────────────────────────

const SESSION_DAYS = 7; // Reduced from 30d to 7d

export function issueAccountCookie(res: Response, telegramUsername: string): void {
  const secret = getJwtSecret();
  const jti = randomUUID();
  const expiresInSecs = SESSION_DAYS * 24 * 60 * 60;
  const token = jwt.sign({ telegramUsername, jti }, secret, { expiresIn: expiresInSecs });
  res.cookie("account_session", token, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: expiresInSecs * 1000,
    path: "/",
  });
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
