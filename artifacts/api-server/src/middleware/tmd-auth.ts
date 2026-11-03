import type { Request, Response, NextFunction } from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db, tmdSessionsTable, tmdUsersTable, type TmdUser } from "@workspace/db";

/**
 * Testmedaddy sessions: opaque random token in an httpOnly cookie scoped to /api/tmd,
 * only its SHA-256 hash stored. CSRF token is derived from the session token and sent
 * back in `x-tmd-csrf` on every mutation. Same model as the vendor portal, separate
 * cookie, separate tables, no shared identity.
 */
export const TMD_SESSION_COOKIE = "tmd_session";
export const tmdTokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export const tmdCsrfToken = (token: string) => tmdTokenHash(`tmd-csrf:${token}`);

export function tmdCookieOptions() {
  const preview = process.env.NODE_ENV !== "production" && !!process.env.REPL_ID;
  return { httpOnly: true, secure: process.env.NODE_ENV === "production" || preview, sameSite: preview ? "none" as const : "lax" as const, ...(preview ? { partitioned: true } : {}), path: "/api/tmd" };
}

export function tmdSameOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = req.get("origin");
  try {
    if (req.get("sec-fetch-site") === "cross-site" || !origin || new URL(origin).host !== req.get("host")?.toLowerCase()) {
      res.status(403).json({ error: "Cross-site requests are not permitted." }); return;
    }
  } catch { res.status(403).json({ error: "Cross-site requests are not permitted." }); return; }
  next();
}

declare global { namespace Express { interface Request { tmdUser?: TmdUser; tmdSession?: { tokenHash: string; csrfToken: string } } } }

export interface TmdSessionLookup { (tokenHash: string, now: Date): Promise<TmdUser | null> }
export const lookupTmdSession: TmdSessionLookup = async (tokenHash, now) => {
  const [row] = await db.select({ user: tmdUsersTable }).from(tmdSessionsTable)
    .innerJoin(tmdUsersTable, eq(tmdUsersTable.id, tmdSessionsTable.userId))
    .where(and(eq(tmdSessionsTable.tokenHash, tokenHash), gt(tmdSessionsTable.expiresAt, now)));
  return row?.user ?? null;
};

export function createTmdAuthentication(lookup: TmdSessionLookup = lookupTmdSession) {
  async function resolve(req: Request): Promise<"none" | "invalid" | "ok" | "error"> {
    const token = req.cookies?.[TMD_SESSION_COOKIE];
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return "none";
    try {
      const tokenHash = tmdTokenHash(token);
      const user = await lookup(tokenHash, new Date());
      if (!user || user.status === "disabled") return "invalid";
      req.tmdUser = user;
      req.tmdSession = { tokenHash, csrfToken: tmdCsrfToken(token) };
      return "ok";
    } catch { return "error"; }
  }
  function csrfOk(req: Request, res: Response): boolean {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;
    let allowed = false;
    tmdSameOrigin(req, res, () => { allowed = true; });
    if (!allowed) return false;
    const csrf = req.get("x-tmd-csrf");
    if (typeof csrf !== "string" || !/^[a-f0-9]{64}$/.test(csrf) || !timingSafeEqual(Buffer.from(csrf), Buffer.from(req.tmdSession!.csrfToken))) {
      res.status(403).json({ error: "Session check failed. Refresh the page and try again." }); return false;
    }
    return true;
  }
  /** 401 unless a valid session is present. */
  const required = async (req: Request, res: Response, next: NextFunction) => {
    const state = await resolve(req);
    if (state === "error") { res.status(503).json({ error: "Unable to verify your session. Please try again." }); return; }
    if (state !== "ok") { res.status(401).json({ error: "Please sign in." }); return; }
    if (!csrfOk(req, res)) return;
    next();
  };
  /** Attaches the user when a valid session exists, otherwise continues anonymously. Mutations still need CSRF when signed in. */
  const optional = async (req: Request, res: Response, next: NextFunction) => {
    const state = await resolve(req);
    if (state === "ok" && !csrfOk(req, res)) return;
    next();
  };
  const admin = async (req: Request, res: Response, next: NextFunction) => required(req, res, () => {
    if (req.tmdUser?.role !== "admin") { res.status(403).json({ error: "Admin access required." }); return; }
    next();
  });
  return { required, optional, admin };
}

const authentication = createTmdAuthentication();
export const requireTmdUser = authentication.required;
export const optionalTmdUser = authentication.optional;
export const requireTmdAdmin = authentication.admin;
