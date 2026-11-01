import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Router, RequestHandler, Response } from "express";
import type { Pool, PoolClient } from "pg";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { equalSecret, fail, FEATURES, ownUser, passwordSchema, tokenHash } from "../../lib/testmedaddy-core";
import { transaction } from "./db";

const COOKIE = "tmd_session";
const cookieOptions = { httpOnly: true, secure: true, sameSite: "none" as const, partitioned: true, path: "/" };
const signupSchema = z.object({
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  handle: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/).transform(value => value.toLowerCase()),
  displayName: z.string().trim().min(1).max(60),
  password: passwordSchema,
}).strict();
const loginSchema = z.object({
  email: z.string().trim().min(1).max(254).transform(value => value.toLowerCase()),
  password: z.string().min(1).refine(value => Buffer.byteLength(value) <= 72),
  rememberMe: z.boolean().default(true),
}).strict();

async function newSession(client: PoolClient, userId: string, remember: boolean, previous?: string) {
  const token = randomBytes(32).toString("hex"), csrfToken = randomBytes(24).toString("hex");
  if (previous) await client.query("DELETE FROM tmd_sessions WHERE token_hash=$1", [previous]);
  const duration = (remember ? 30 * 24 : 8) * 3600000;
  await client.query("INSERT INTO tmd_sessions(token_hash,user_id,csrf_token,expires_at) VALUES($1,$2,$3,$4)", [tokenHash(token), userId, csrfToken, new Date(Date.now() + duration)]);
  return { token, csrfToken, duration, remember };
}
function sendSession(res: Response, user: Record<string, any>, session: Awaited<ReturnType<typeof newSession>>) {
  res.cookie(COOKIE, session.token, { ...cookieOptions, ...(session.remember ? { maxAge: session.duration } : {}) });
  res.json({ user: ownUser(user), csrfToken: session.csrfToken, features: FEATURES });
}
export function sessionMiddleware(database: Pool): RequestHandler {
  return async (req, res, next) => {
    try {
      const token = req.cookies?.[COOKIE];
      if (typeof token === "string" && /^[a-f0-9]{64}$/.test(token)) {
        const { rows } = await database.query(
          `SELECT u.*,s.token_hash AS session_hash,s.csrf_token,s.expires_at,s.created_at AS session_created_at
           FROM tmd_sessions s JOIN tmd_users u ON u.id=s.user_id
           WHERE s.token_hash=$1 AND s.expires_at>now()`, [tokenHash(token)],
        );
        res.locals.tmd = rows[0] ?? null;
      }
      next();
    } catch (error) { next(error); }
  };
}
export const requireUser: RequestHandler = (_req, res, next) => {
  if (!res.locals.tmd) { res.status(401).json({ error: "Sign in to Testmedaddy first." }); return; }
  next();
};
export const protectMutations: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) { next(); return; }
  try {
    const origin = req.get("origin");
    if (!origin) fail(403, "A same-origin request is required.");
    let url: URL;
    try { url = new URL(origin); } catch { fail(403, "Origin not allowed."); }
    if (url!.origin !== origin || url!.host.toLowerCase() !== req.headers.host?.toLowerCase()
      || !["https:", "http:"].includes(url!.protocol)
      || (process.env.NODE_ENV === "production" && url!.protocol !== "https:")) fail(403, "Origin not allowed.");
    if (["/auth/signup", "/auth/login"].includes(req.path)) { next(); return; }
    if (!res.locals.tmd) fail(401, "Sign in to Testmedaddy first.");
    if (!equalSecret(req.get("x-tmd-csrf"), res.locals.tmd.csrf_token)) fail(403, "Your session changed. Refresh the page and try again.");
    next();
  } catch (error) { next(error); }
};
export function mountAuth(router: Router, database: Pool) {
  const limiter = rateLimit({ windowMs: 15 * 60000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "Too many sign-in attempts. Try again later." } });
  router.get("/auth/session", (_req, res) => res.json({
    user: res.locals.tmd ? ownUser(res.locals.tmd) : null,
    csrfToken: res.locals.tmd?.csrf_token ?? null, features: FEATURES,
  }));
  router.post("/auth/signup", limiter, async (req, res) => {
    const input = signupSchema.parse(req.body);
    const hash = await bcrypt.hash(input.password, 12);
    const result = await transaction(database, async client => {
      const { rows } = await client.query(
        "INSERT INTO tmd_users(id,email,handle,password_hash,display_name) VALUES($1,$2,$3,$4,$5) RETURNING *",
        [randomUUID(), input.email, input.handle, hash, input.displayName],
      );
      return { user: rows[0], session: await newSession(client, rows[0].id, true, res.locals.tmd?.session_hash) };
    });
    sendSession(res, result.user, result.session);
  });
  router.post("/auth/login", limiter, async (req, res) => {
    const input = loginSchema.parse(req.body);
    const { rows } = await database.query("SELECT * FROM tmd_users WHERE email=$1 OR handle=$1 LIMIT 1", [input.email]);
    const user = rows[0];
    if (!user) { await bcrypt.hash(input.password, 12); fail(401, "Email/handle or password is incorrect."); }
    if (!await bcrypt.compare(input.password, user.password_hash)) fail(401, "Email/handle or password is incorrect.");
    const session = await transaction(database, async client => {
      const current = await client.query("SELECT id FROM tmd_users WHERE id=$1 AND password_hash=$2 FOR UPDATE", [user.id, user.password_hash]);
      if (!current.rows.length) fail(401, "Your password changed. Sign in again.");
      return newSession(client, user.id, input.rememberMe, res.locals.tmd?.session_hash);
    });
    sendSession(res, user, session);
  });
  router.post("/auth/logout", async (_req, res) => {
    await database.query("DELETE FROM tmd_sessions WHERE token_hash=$1", [res.locals.tmd.session_hash]);
    res.clearCookie(COOKIE, cookieOptions);
    res.json({ ok: true });
  });
  router.post("/auth/change-password", async (req, res) => {
    const input = z.object({ currentPassword: z.string().refine(value => Buffer.byteLength(value) <= 72), newPassword: passwordSchema }).strict().parse(req.body);
    const userId = res.locals.tmd.id;
    const result = await transaction(database, async client => {
      const { rows } = await client.query("SELECT * FROM tmd_users WHERE id=$1 FOR UPDATE", [userId]);
      if (!await bcrypt.compare(input.currentPassword, rows[0].password_hash)) fail(400, "Current password is incorrect.");
      await client.query("UPDATE tmd_users SET password_hash=$1 WHERE id=$2", [await bcrypt.hash(input.newPassword, 12), userId]);
      await client.query("DELETE FROM tmd_sessions WHERE user_id=$1", [userId]);
      const remember = new Date(res.locals.tmd.expires_at).getTime() - new Date(res.locals.tmd.session_created_at).getTime() > 24 * 3600000;
      return { user: rows[0], session: await newSession(client, userId, remember) };
    });
    sendSession(res, result.user, result.session);
  });
  router.patch("/me", async (req, res) => {
    const input = z.object({ displayName: z.string().trim().min(1).max(60).optional(), bio: z.string().trim().max(1000).nullable().optional() }).strict().parse(req.body);
    const { rows } = await database.query("UPDATE tmd_users SET display_name=$1,bio=$2 WHERE id=$3 RETURNING *", [
      input.displayName ?? res.locals.tmd.display_name,
      input.bio === undefined ? res.locals.tmd.bio : input.bio, res.locals.tmd.id,
    ]);
    res.json({ user: ownUser(rows[0]) });
  });
}
