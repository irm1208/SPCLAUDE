import { Router, type Request, type Response } from "express";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { vendorAccountStore, publicVendorAccount, type VendorAccountStore, type VendorAccount } from "../lib/vendor-account-store";
import { createVendorAuthentication, vendorSameOrigin, vendorCookieOptions, VENDOR_SESSION_COOKIE, vendorTokenHash, vendorCsrfToken } from "../middleware/vendor-auth";

import { validVendorPassword, vendorUsername, validVendorUsername } from "../lib/vendor-account-input";
export function createVendorAuthRouter(store: VendorAccountStore = vendorAccountStore, options: { rateLimit?: boolean } = {}) {
  const router = Router(), auth = createVendorAuthentication(store);
  router.use("/vendor/auth", (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  const wrapped = (handler: (req: Request, res: Response) => Promise<void>) => async (req: Request, res: Response) => {
    try { await handler(req, res); } catch { res.status(503).json({ error: "Vendor sign-in is temporarily unavailable. Please try again." }); }
  };
  const loginLimit = rateLimit({ windowMs: 15 * 60_000, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: "Too many vendor sign-in attempts. Please try again later." } });
  const signupLimit = rateLimit({ windowMs: 60 * 60_000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: "Too many vendor registrations. Please try again later." } });
  if (options.rateLimit !== false) { router.use("/vendor/auth/login", loginLimit); router.use("/vendor/auth/signup", signupLimit); }
  const issue = async (res: Response, account: VendorAccount, remembered = false) => {
    const token = randomBytes(32).toString("hex"), now = new Date();
    const maxAge = (remembered ? 7 : 1) * 24 * 60 * 60_000;
    const created = await store.createSession(account, { username: account.username, tokenHash: vendorTokenHash(token), createdAt: now, expiresAt: new Date(now.getTime() + maxAge) });
    if (!created) { res.status(401).json({ error: "Vendor account changed. Please sign in again." }); return; }
    res.cookie(VENDOR_SESSION_COOKIE, token, { ...vendorCookieOptions(), ...(remembered ? { maxAge } : {}) });
    res.json({ account: publicVendorAccount(account), csrfToken: vendorCsrfToken(token) });
  };
  router.post("/vendor/auth/signup", vendorSameOrigin, wrapped(async (req, res) => {
    const username = vendorUsername(req.body?.username), password = req.body?.password;
    const companyName = typeof req.body?.companyName === "string" ? req.body.companyName.trim() : "";
    const contactName = typeof req.body?.contactName === "string" ? req.body.contactName.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
    if (!validVendorUsername(username) || !validVendorPassword(password) || !companyName || companyName.length > 200 || contactName.length > 200 || email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      res.status(400).json({ error: "Enter a valid username and company, and use a password of at least 12 characters. If your password is very long, shorten it. Email is optional." }); return;
    }
    const now = new Date();
    const account = await store.createAccount({ username, passwordHash: await bcrypt.hash(password, 12), companyName, contactName, email: email || null, vendorId: null, status: "pending", createdBy: null, createdAt: now, updatedAt: now });
    if (!account) { res.status(409).json({ error: "That vendor username is unavailable." }); return; }
    res.status(201); await issue(res, account);
  }));
  router.post("/vendor/auth/login", vendorSameOrigin, wrapped(async (req, res) => {
    const username = vendorUsername(req.body?.username), password = req.body?.password;
    const account = validVendorUsername(username) ? await store.getAccount(username) : null;
    // Unknown users still pay a password-hash cost, reducing username timing disclosure.
    const hash = account?.passwordHash ?? "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6Ttx2R0tWw6G9C9Y0D5DcY5DCY5DC";
    const matches = typeof password === "string" && Buffer.byteLength(password, "utf8") <= 72 && await bcrypt.compare(password, hash);
    if (!matches || !account || account.status === "disabled") { res.status(401).json({ error: "Invalid vendor username or password." }); return; }
    await issue(res, account, req.body?.rememberMe === true);
  }));
  router.get("/vendor/auth/session", auth.identity, (req, res) => { res.set("Cache-Control", "no-store").json({ account: publicVendorAccount(req.vendor!.account), csrfToken: req.vendor!.csrfToken }); });
  router.post("/vendor/auth/logout", auth.identity, wrapped(async (req, res) => {
    await store.deleteSession(req.vendor!.tokenHash); res.clearCookie(VENDOR_SESSION_COOKIE, vendorCookieOptions()); res.json({ ok: true });
  }));
  return router;
}
export default createVendorAuthRouter();
