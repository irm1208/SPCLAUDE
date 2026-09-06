import { Router } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import { accountVerificationChallengesTable, accountsTable, db } from "@workspace/db";
import { requireAccountIdentity, issueAccountCookie } from "../middleware/account-auth";
import {
  EmailChallengeResendCooldownError,
  confirmEmailChallenge,
  createEmailChallenge,
  needsVerification,
  resendAvailableAt,
} from "../lib/account-verification";
import { sendTemplatedEmail } from "../lib/email";
import { writeLog } from "../lib/audit-log";

const router = Router();

function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [local, domain] = email.split("@");
  if (!local || !domain) return null;
  return `${local.slice(0, 1)}${"*".repeat(Math.max(1, local.length - 1))}@${domain}`;
}

async function getAccount(username: string) {
  const [account] = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, username))
    .limit(1);
  return account;
}

router.get("/account/verification/status", requireAccountIdentity, async (req, res): Promise<void> => {
  const account = await getAccount(req.account!.telegramUsername);
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  const [challenge] = await db
    .select()
    .from(accountVerificationChallengesTable)
    .where(and(
      eq(accountVerificationChallengesTable.accountUsername, account.telegramUsername),
      isNull(accountVerificationChallengesTable.consumedAt),
    ))
    .orderBy(desc(accountVerificationChallengesTable.createdAt))
    .limit(1);
  const resendAt = challenge ? resendAvailableAt(challenge.lastSentAt ?? challenge.createdAt) : null;
  res.json({
    required: account.verificationRequiredAt !== null,
    verified: !needsVerification(account),
    emailMasked: maskEmail(account.email),
    emailVerified: account.emailVerifiedAt !== null,
    telegramLinked: !!account.telegramChatId,
    availableMethods: ["email", "telegram"],
    resendAvailableAt: resendAt?.toISOString() ?? null,
    resendAfterSeconds: resendAt ? Math.max(0, Math.ceil((resendAt.getTime() - Date.now()) / 1_000)) : 0,
  });
});

router.post("/account/verification/email/resend", requireAccountIdentity, async (req, res): Promise<void> => {
  const account = await getAccount(req.account!.telegramUsername);
  if (!account || !needsVerification(account) || !account.email) {
    res.status(400).json({ error: "Verification email cannot be sent" });
    return;
  }
  try {
    const challenge = await createEmailChallenge(db, account.telegramUsername);
    await sendTemplatedEmail("email_verification", account.email, {
      code: challenge.code,
      username: account.telegramUsername.replace(/^@/, ""),
    });
    writeLog("login", "info", "verification_email_sent", "Verification email sent", {
      telegramUsername: account.telegramUsername,
    }, req.ip).catch(() => {});
    res.json({ ok: true, resendAvailableAt: resendAvailableAt(challenge.lastSentAt).toISOString() });
  } catch (error) {
    if (error instanceof EmailChallengeResendCooldownError) {
      writeLog("login", "warn", "verification_email_rate_limited", "Verification email resend rate limited", {
        telegramUsername: account.telegramUsername,
      }, req.ip).catch(() => {});
      res.status(429).json({ error: "Verification email cannot be sent", retryAfterSeconds: error.retryAfterSeconds });
      return;
    }
    res.status(500).json({ error: "Verification email cannot be sent" });
  }
});

router.post("/account/verification/email/confirm", requireAccountIdentity, async (req, res): Promise<void> => {
  const code = typeof req.body?.code === "string" ? req.body.code : "";
  if (!/^\d{6}$/.test(code)) {
    res.status(400).json({ error: "Invalid verification code" });
    return;
  }
  try {
    const result = await confirmEmailChallenge(db, req.account!.telegramUsername, code);
    if (!result.ok) {
      writeLog("login", "warn", "verification_email_invalid", "Invalid email verification attempt", {
        telegramUsername: req.account!.telegramUsername,
        reason: result.reason,
      }, req.ip).catch(() => {});
      res.status(400).json({ error: "Invalid verification code" });
      return;
    }
    issueAccountCookie(res, req.account!.telegramUsername, false);
    writeLog("login", "info", "verification_email_completed", "Email account verification completed", {
      telegramUsername: req.account!.telegramUsername,
    }, req.ip).catch(() => {});
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: "Invalid verification code" });
  }
});

router.post("/account/verification/session/upgrade", requireAccountIdentity, async (req, res): Promise<void> => {
  const account = await getAccount(req.account!.telegramUsername);
  if (!account || needsVerification(account)) {
    res.status(403).json({ error: "verification_required" });
    return;
  }
  issueAccountCookie(res, account.telegramUsername, false);
  res.json({ ok: true });
});

export default router;