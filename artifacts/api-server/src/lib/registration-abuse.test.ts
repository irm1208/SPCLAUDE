import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isBlockedAutomatedRegistrationName } from "./registration-abuse";

describe("automated registration name blocking", () => {
  it.each([
    "auditx55d544",
    "@audx55d544",
    "audv001122",
    "audjabcdef",
    "auditshop123",
    "audanything",
    "audrey",
    "audiofan",
    "hermesaudit987",
  ])("blocks the automated AUD family %s", (username) => {
    expect(isBlockedAutomatedRegistrationName(username)).toBe(true);
  });

  it.each([
    "shopper123",
    "hermesfan",
    "legitimate_user",
  ])("does not block an ordinary username %s", (username) => {
    expect(isBlockedAutomatedRegistrationName(username)).toBe(false);
  });

  it("guards wholesale invite registration and Reshipper applications", () => {
    const wholesaleSource = readFileSync(new URL("../routes/wholesale-shares.ts", import.meta.url), "utf8");
    const reshipperSource = readFileSync(new URL("../routes/reshipper.ts", import.meta.url), "utf8");
    expect(wholesaleSource).toMatch(/wholesale-invite\/:code\/register[\s\S]*isBlockedAutomatedRegistrationName\(tg\)/);
    expect(reshipperSource).toMatch(/reshipper\/apply[\s\S]*isBlockedAutomatedRegistrationName\(username\)/);
  });

  it("rate-limits every public account-creation route", () => {
    const routesSource = readFileSync(new URL("../routes/index.ts", import.meta.url), "utf8");
    expect(routesSource).toContain('router.post("/wholesale-invite/:code/register", signupLimiter)');
  });

  it("requires Turnstile before public registration writes or password hashing", () => {
    const accountSource = readFileSync(new URL("../routes/account.ts", import.meta.url), "utf8");
    const sellerSource = readFileSync(new URL("../routes/vial-shop.ts", import.meta.url), "utf8");
    const wholesaleSource = readFileSync(new URL("../routes/wholesale-shares.ts", import.meta.url), "utf8");
    for (const source of [accountSource, sellerSource, wholesaleSource]) {
      expect(source).toMatch(/verifyTurnstile\(\{ token: turnstileToken, remoteIp: req\.ip \}\)/);
      expect(source).toMatch(/captcha_verification_failed/);
    }
    expect(accountSource).toMatch(/verifyTurnstile[\s\S]*bcrypt\.hash/);
    expect(sellerSource).toMatch(/verifyTurnstile[\s\S]*hashPassword/);
    expect(wholesaleSource).toMatch(/verifyTurnstile[\s\S]*bcrypt\.hash/);
  });

  it("restricts newly created public accounts and sends an email challenge", () => {
    const accountSource = readFileSync(new URL("../routes/account.ts", import.meta.url), "utf8");
    const wholesaleSource = readFileSync(new URL("../routes/wholesale-shares.ts", import.meta.url), "utf8");
    for (const source of [accountSource, wholesaleSource]) {
      expect(source).toMatch(/verificationRequiredAt:\s*new Date\(\)/);
      expect(source).toMatch(/createEmailChallengeInTransaction\(tx,\s*tg\)/);
      expect(source).toMatch(/sendTemplatedEmail\("email_verification"/);
      expect(source).toMatch(/verificationRequired:\s*true/);
    }
  });

  it("completes verification after either Telegram link flow binds identity", () => {
    const telegramSource = readFileSync(new URL("../routes/telegram.ts", import.meta.url), "utf8");
    expect(telegramSource).toMatch(/\/link command[\s\S]*completeAccountVerificationInTransaction\(tx, lockedAccount\.telegramUsername, "telegram", lockedAccount\)/);
    expect(telegramSource).toMatch(/Deep-link auto-linking[\s\S]*completeAccountVerificationInTransaction\(tx, lockedAccount\.telegramUsername, "telegram", lockedAccount\)/);
    expect(telegramSource).toMatch(/telegram\/widget-auth[\s\S]*completeAccountVerificationInTransaction\(tx, lockedAccount\.telegramUsername, "telegram", lockedAccount\)/);
  });

  it("blocks existing matching identities at the shared session gate and before login", () => {
    const authSource = readFileSync(new URL("../middleware/account-auth.ts", import.meta.url), "utf8");
    const accountSource = readFileSync(new URL("../routes/account.ts", import.meta.url), "utf8");
    expect(authSource).toMatch(/requireAccount[\s\S]*isBlockedAutomatedRegistrationName\(payload\.telegramUsername\)/);
    expect(accountSource).toMatch(/account\/login[\s\S]*isBlockedAutomatedRegistrationName\(tg\)[\s\S]*issueAccountCookie/);
    expect(accountSource).toMatch(/account\/order-login[\s\S]*isBlockedAutomatedRegistrationName\(tg\)[\s\S]*issueAccountCookie/);
  });
});