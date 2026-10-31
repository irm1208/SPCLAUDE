import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { requireVendorIdentity, vendorSameOrigin } from "../middleware/vendor-auth";
import { requireAdmin } from "../middleware/require-admin";
import { vendorAccountStore } from "../lib/vendor-account-store";
import { vendorUsername, validVendorUsername } from "../lib/vendor-account-input";
import { issueVendorSession } from "./vendor-auth";
import { VendorPortalError } from "../lib/vendor-portal-model";
import { pushVendorNotification } from "../lib/vendor-notifications";
const securityNote = (req: Request, title: string, priority: "low" | "critical" = "low") => { const vendorId = req.vendor?.vendorId; if (vendorId) pushVendorNotification(db, { vendorId, kind: priority === "critical" ? "security_reset" : "security", title, body: `Account ${req.vendor!.username}. If this was not you, contact Peps Anonymous immediately.`, link: "settings" }).catch(() => null); };
import {
  db, securityConfigured, securityOverview, mfaMethods, beginTotp, confirmTotp, regenerateRecoveryCodes, disableTotp, verifyTotpOrRecovery,
  consumeChallenge, relyingParty, passkeyRegistrationOptions, verifyPasskeyRegistration, passkeyAuthenticationOptions, verifyPasskeyAuthentication,
  renamePasskey, deletePasskey, resetVendorSecurity,
} from "../lib/vendor-security";

/* Vendor two-step verification (authenticator app) and passkeys. */
const router = Router();
type Handler = (req: Request, res: Response) => Promise<void>;
function handled(handler: Handler): Handler {
  return async (req, res) => {
    try { await handler(req, res); } catch (error) {
      if (error instanceof VendorPortalError) { res.status(error.status).json({ error: error.message }); return; }
      console.error("[vendor-security]", error instanceof Error ? error.message : "Request failed");
      res.status(500).json({ error: "Could not complete the request. Please try again." });
    }
  };
}
const noStore = (_req: Request, res: Response, next: () => void) => { res.set("Cache-Control", "no-store"); next(); };
const attemptLimit = rateLimit({ windowMs: 15 * 60_000, max: 30, standardHeaders: true, legacyHeaders: false, message: { error: "Too many attempts. Please try again later." } });
router.use(["/vendor/auth/mfa", "/vendor/auth/passkey", "/vendor/security"], noStore);
if (process.env["NODE_ENV"] !== "test") router.use(["/vendor/auth/mfa", "/vendor/auth/passkey"], attemptLimit);

/** Re-check the password for sensitive changes (disable 2FA, remove passkeys, new recovery codes). */
async function confirmPassword(req: Request) {
  const password = req.body?.password;
  const account = req.vendor!.account;
  if (typeof password !== "string" || Buffer.byteLength(password, "utf8") > 72 || !(await bcrypt.compare(password, account.passwordHash))) {
    throw new VendorPortalError("Enter your current password to confirm this change.", 403);
  }
}

/* ---- Sign-in: second step and passkey sign-in (public) --------------------------- */
router.post("/vendor/auth/mfa/totp", vendorSameOrigin, handled(async (req, res) => {
  const pending = await consumeChallenge(db, req.body?.mfaToken, "login");
  if (!pending?.username) throw new VendorPortalError("Your sign-in expired. Enter your password again.", 401);
  const result = await db.transaction(tx => verifyTotpOrRecovery(tx, pending.username!, req.body?.code));
  if (!result.ok) {
    // Give the vendor another go without re-entering the password: reissue a token for the same login.
    const { createChallenge, LOGIN_CHALLENGE_TTL } = await import("../lib/vendor-security");
    const mfaToken = await createChallenge(db, pending.username, "login", pending.data, LOGIN_CHALLENGE_TTL);
    res.status(401).json({ error: "That code was not accepted. Try the newest code from your app, or a recovery code.", mfaToken }); return;
  }
  const account = await vendorAccountStore.getAccount(pending.username);
  if (!account || account.status === "disabled") throw new VendorPortalError("Invalid vendor username or password.", 401);
  res.set("X-Vendor-Recovery-Remaining", String(result.remaining));
  await issueVendorSession(vendorAccountStore, res, account, pending.data?.remembered === true);
}));
router.post("/vendor/auth/passkey/options", vendorSameOrigin, handled(async (req, res) => {
  const username = vendorUsername(req.body?.username);
  const options = await passkeyAuthenticationOptions(db, relyingParty(req), username && validVendorUsername(username) ? username : null);
  res.json({ options });
}));
router.post("/vendor/auth/passkey/verify", vendorSameOrigin, handled(async (req, res) => {
  const { username } = await db.transaction(tx => verifyPasskeyAuthentication(tx, relyingParty(req), req.body?.credential));
  const account = await vendorAccountStore.getAccount(username);
  if (!account || account.status === "disabled") throw new VendorPortalError("This vendor account is not available.", 401);
  // A passkey completes a pending password login too, or signs in on its own.
  if (typeof req.body?.mfaToken === "string") await consumeChallenge(db, req.body.mfaToken, "login");
  await issueVendorSession(vendorAccountStore, res, account, req.body?.rememberMe === true);
}));

/* ---- Security settings (signed in; pending accounts may prepare too) -------------- */
router.get("/vendor/security", requireVendorIdentity, handled(async (req, res) => {
  res.json(await securityOverview(db, req.vendor!.username));
}));
router.post("/vendor/security/totp/begin", requireVendorIdentity, handled(async (req, res) => {
  if (!securityConfigured()) throw new VendorPortalError("Two-step verification is not available yet. Ask Peps Anonymous to configure it.", 503);
  res.json(await db.transaction(tx => beginTotp(tx, req.vendor!.username)));
}));
router.post("/vendor/security/totp/confirm", requireVendorIdentity, handled(async (req, res) => {
  const recoveryCodes = await db.transaction(tx => confirmTotp(tx, req.vendor!.username, req.body?.code));
  securityNote(req, "Authenticator app turned on");
  res.json({ recoveryCodes, methods: await mfaMethods(db, req.vendor!.username) });
}));
router.post("/vendor/security/totp/recovery-codes", requireVendorIdentity, handled(async (req, res) => {
  await confirmPassword(req);
  res.json({ recoveryCodes: await db.transaction(tx => regenerateRecoveryCodes(tx, req.vendor!.username)) });
}));
router.post("/vendor/security/totp/disable", requireVendorIdentity, handled(async (req, res) => {
  await confirmPassword(req);
  await db.transaction(tx => disableTotp(tx, req.vendor!.username));
  securityNote(req, "Authenticator app turned off");
  res.json({ ok: true, methods: await mfaMethods(db, req.vendor!.username) });
}));
router.post("/vendor/security/passkeys/options", requireVendorIdentity, handled(async (req, res) => {
  const account = req.vendor!.account;
  res.json({ options: await db.transaction(tx => passkeyRegistrationOptions(tx, account.username, account.companyName || account.username, relyingParty(req))) });
}));
router.post("/vendor/security/passkeys/verify", requireVendorIdentity, handled(async (req, res) => {
  const passkey = await db.transaction(tx => verifyPasskeyRegistration(tx, req.vendor!.username, relyingParty(req), req.body?.credential, req.body?.name));
  securityNote(req, `Passkey added: ${passkey.name}`);
  res.status(201).json({ passkey, methods: await mfaMethods(db, req.vendor!.username) });
}));
router.patch("/vendor/security/passkeys/:id", requireVendorIdentity, handled(async (req, res) => {
  res.json({ passkey: await db.transaction(tx => renamePasskey(tx, req.vendor!.username, String(req.params.id), req.body?.name)) });
}));
router.delete("/vendor/security/passkeys/:id", requireVendorIdentity, handled(async (req, res) => {
  await confirmPassword(req);
  await db.transaction(tx => deletePasskey(tx, req.vendor!.username, String(req.params.id)));
  securityNote(req, "Passkey removed");
  res.json({ ok: true, methods: await mfaMethods(db, req.vendor!.username) });
}));

/* ---- Admin: see who has second factors and reset a locked-out vendor ---------------- */
router.get("/admin/vendor-accounts/security", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const accounts = await vendorAccountStore.listAccounts();
  const summary: Record<string, { totp: boolean; passkeys: number }> = {};
  for (const account of accounts) summary[account.username] = await mfaMethods(db, account.username);
  res.json({ security: summary, configured: securityConfigured() });
}));
router.post("/admin/vendor-accounts/:username/security/reset", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const username = vendorUsername(req.params.username);
  const account = await vendorAccountStore.getAccount(username);
  if (!account) throw new VendorPortalError("Vendor account not found.", 404);
  const removedPasskeys = await db.transaction(tx => resetVendorSecurity(tx, username));
  if (account.vendorId) pushVendorNotification(db, { vendorId: account.vendorId, kind: "security_reset", title: `Two-step verification reset for ${username}`, body: "Peps Anonymous removed the authenticator app and passkeys from this account. Set them up again in Settings → Security. If you did not ask for this, contact Peps Anonymous now.", link: "settings" }).catch(() => null);
  res.json({ ok: true, removedPasskeys });
}));

export default router;
