import { Router, type Response } from "express";
import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { eq, sql } from "drizzle-orm";
import { db, tmdSessionsTable, tmdUsersTable, type TmdUser } from "@workspace/db";
import { requireTmdUser, tmdSameOrigin, tmdCookieOptions, TMD_SESSION_COOKIE, tmdTokenHash, tmdCsrfToken } from "../middleware/tmd-auth";
import { handled, TmdError, EMAIL_RE, HANDLE_RE, normaliseEmail, normaliseHandle, str, validPassword, privateUser } from "../lib/tmd-model";
import { sendVerificationEmail, sendPasswordResetEmail, consumeEmailToken } from "../lib/tmd-mail";

/**
 * Testmedaddy accounts: email + password, email verification, password reset.
 * Nothing here touches member, admin or vendor sessions of the other products.
 */
const router = Router();
const noStore = (res: Response) => res.set("Cache-Control", "no-store");
const DUMMY_HASH = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6Ttx2R0tWw6G9C9Y0D5DcY5DCY5DC";
const RESERVED_HANDLES = new Set(["admin", "testmedaddy", "support", "api", "root", "system", "me", "login", "signup", "pools", "vendors", "p", "help"]);

export async function issueTmdSession(res: Response, user: TmdUser, remembered = false) {
  const token = randomBytes(32).toString("hex"), now = new Date();
  const maxAge = (remembered ? 30 : 1) * 24 * 60 * 60_000;
  await db.insert(tmdSessionsTable).values({ tokenHash: tmdTokenHash(token), userId: user.id, remembered, createdAt: now, expiresAt: new Date(now.getTime() + maxAge) });
  res.cookie(TMD_SESSION_COOKIE, token, { ...tmdCookieOptions(), ...(remembered ? { maxAge } : {}) });
  noStore(res).json({ user: privateUser(user), csrfToken: tmdCsrfToken(token) });
}

const limits = {
  login: rateLimit({ windowMs: 15 * 60_000, max: 30, standardHeaders: true, legacyHeaders: false, message: { error: "Too many sign-in attempts. Please wait and try again." } }),
  signup: rateLimit({ windowMs: 60 * 60_000, max: 15, standardHeaders: true, legacyHeaders: false, message: { error: "Too many sign-ups from this network. Please try again later." } }),
  reset: rateLimit({ windowMs: 60 * 60_000, max: 15, standardHeaders: true, legacyHeaders: false, message: { error: "Too many requests. Please try again later." } }),
};
router.use("/tmd/auth", (_req, res, next) => { noStore(res); next(); });
if (process.env.NODE_ENV === "production") {
  router.use("/tmd/auth/login", limits.login);
  router.use("/tmd/auth/signup", limits.signup);
  router.use(["/tmd/auth/forgot-password", "/tmd/auth/resend-verification"], limits.reset);
}

router.post("/tmd/auth/signup", tmdSameOrigin, handled(async (req, res) => {
  const email = normaliseEmail(req.body?.email), handle = normaliseHandle(req.body?.handle), password = req.body?.password;
  const displayName = str(req.body?.displayName, 60) || handle;
  if (!EMAIL_RE.test(email)) throw new TmdError("Enter a valid email address.");
  if (!HANDLE_RE.test(handle) || RESERVED_HANDLES.has(handle)) throw new TmdError("Handles are 3–30 characters: letters, numbers, dashes or underscores.");
  if (!validPassword(password)) throw new TmdError("Use a password of at least 10 characters.");
  const now = new Date();
  const user: TmdUser = {
    id: randomUUID(), email, passwordHash: await bcrypt.hash(password, 12), handle, displayName, bio: null, avatarKey: null, role: "member", status: "active",
    emailVerifiedAt: null, telegramChatId: null, telegramUsername: null, notificationPrefs: {}, payoutMethods: {}, createdAt: now, updatedAt: now,
  };
  const [created] = await db.insert(tmdUsersTable).values(user).onConflictDoNothing().returning();
  if (!created) {
    const [clash] = await db.select({ email: tmdUsersTable.email }).from(tmdUsersTable).where(eq(tmdUsersTable.handle, handle));
    throw new TmdError(clash ? "That handle is taken." : "An account with that email already exists. Sign in instead.", 409);
  }
  sendVerificationEmail(created).catch(() => undefined);
  res.status(201);
  await issueTmdSession(res, created);
}));

router.post("/tmd/auth/login", tmdSameOrigin, handled(async (req, res) => {
  const identifier = str(req.body?.email, 254).toLowerCase(), password = req.body?.password;
  const [user] = identifier
    ? await db.select().from(tmdUsersTable).where(identifier.includes("@") ? eq(tmdUsersTable.email, identifier) : eq(tmdUsersTable.handle, identifier.replace(/^@/, "")))
    : [];
  const matches = typeof password === "string" && Buffer.byteLength(password, "utf8") <= 72 && await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!matches || !user || user.status === "disabled") throw new TmdError("Email or password is incorrect.", 401);
  await issueTmdSession(res, user, req.body?.rememberMe === true);
}));

router.get("/tmd/auth/session", requireTmdUser, (req, res) => { noStore(res).json({ user: privateUser(req.tmdUser!), csrfToken: req.tmdSession!.csrfToken }); });

router.post("/tmd/auth/logout", requireTmdUser, handled(async (req, res) => {
  await db.delete(tmdSessionsTable).where(eq(tmdSessionsTable.tokenHash, req.tmdSession!.tokenHash));
  res.clearCookie(TMD_SESSION_COOKIE, tmdCookieOptions());
  res.json({ ok: true });
}));

router.post("/tmd/auth/verify-email", handled(async (req, res) => {
  const user = await consumeEmailToken(str(req.body?.token, 64), "verify");
  if (!user) throw new TmdError("That confirmation link is invalid or has expired. Request a new one from your settings.", 410);
  await db.update(tmdUsersTable).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(tmdUsersTable.id, user.id));
  res.json({ ok: true, email: user.email });
}));

router.post("/tmd/auth/resend-verification", requireTmdUser, handled(async (req, res) => {
  if (req.tmdUser!.emailVerifiedAt) { res.json({ ok: true, alreadyVerified: true }); return; }
  const sent = await sendVerificationEmail(req.tmdUser!);
  if (!sent.ok) throw new TmdError("We could not send the email right now. Please try again shortly.", 503);
  res.json({ ok: true });
}));

router.post("/tmd/auth/forgot-password", tmdSameOrigin, handled(async (req, res) => {
  const email = normaliseEmail(req.body?.email);
  if (EMAIL_RE.test(email)) {
    const [user] = await db.select().from(tmdUsersTable).where(eq(tmdUsersTable.email, email));
    if (user && user.status !== "disabled") sendPasswordResetEmail(user).catch(() => undefined);
  }
  // Always the same answer so the endpoint cannot be used to discover accounts.
  res.json({ ok: true });
}));

router.post("/tmd/auth/reset-password", tmdSameOrigin, handled(async (req, res) => {
  const password = req.body?.password;
  if (!validPassword(password)) throw new TmdError("Use a password of at least 10 characters.");
  const user = await consumeEmailToken(str(req.body?.token, 64), "reset");
  if (!user) throw new TmdError("That reset link is invalid or has expired. Request a new one.", 410);
  await db.transaction(async tx => {
    await tx.update(tmdUsersTable).set({ passwordHash: await bcrypt.hash(password, 12), emailVerifiedAt: user.emailVerifiedAt ?? new Date(), updatedAt: new Date() }).where(eq(tmdUsersTable.id, user.id));
    await tx.delete(tmdSessionsTable).where(eq(tmdSessionsTable.userId, user.id));
  });
  res.json({ ok: true });
}));

router.post("/tmd/auth/change-password", requireTmdUser, handled(async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!validPassword(newPassword)) throw new TmdError("Use a new password of at least 10 characters.");
  if (typeof currentPassword !== "string" || !(await bcrypt.compare(currentPassword, req.tmdUser!.passwordHash))) throw new TmdError("Your current password is incorrect.", 401);
  await db.transaction(async tx => {
    await tx.update(tmdUsersTable).set({ passwordHash: await bcrypt.hash(newPassword, 12), updatedAt: new Date() }).where(eq(tmdUsersTable.id, req.tmdUser!.id));
    await tx.delete(tmdSessionsTable).where(sql`${tmdSessionsTable.userId} = ${req.tmdUser!.id} and ${tmdSessionsTable.tokenHash} <> ${req.tmdSession!.tokenHash}`);
  });
  res.json({ ok: true });
}));

export default router;
