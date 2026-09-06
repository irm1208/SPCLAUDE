import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  account: null as any,
  challenge: null as any,
  sent: true,
  confirmation: { ok: true } as any,
  resendError: null as Error | null,
  issued: [] as boolean[],
}));

vi.mock("@workspace/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/db")>();
  const db = {
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          limit: async () => table === actual.accountsTable ? [state.account] : [state.challenge],
          orderBy: () => ({ limit: async () => [state.challenge] }),
        }),
      }),
    }),
  };
  return { ...actual, db };
});

vi.mock("../middleware/account-auth", () => ({
  requireAccountIdentity: (req: any, _res: any, next: any) => { req.account = { telegramUsername: "new-user", verificationRequired: true }; next(); },
  issueAccountCookie: (_res: unknown, _username: string, options: { verificationRequired: boolean }) => state.issued.push(options.verificationRequired),
}));
vi.mock("../lib/account-verification", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/account-verification")>();
  return {
    ...actual,
    createEmailChallenge: async () => {
      if (state.resendError) throw state.resendError;
      return { code: "123456", lastSentAt: new Date() };
    },
    confirmEmailChallenge: async () => state.confirmation,
  };
});
vi.mock("../lib/email", () => ({ sendTemplatedEmail: async () => ({ ok: state.sent }) }));
vi.mock("../lib/audit-log", () => ({ writeLog: async () => undefined }));

import router from "./account-verification";
import { EmailChallengeResendCooldownError } from "../lib/account-verification";

function response() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), cookie: vi.fn().mockReturnThis() };
}

async function request(path: string, body?: unknown) {
  const layer = (router as any).stack.find((item: any) => item.route?.path === path);
  const req: any = { body, ip: "127.0.0.1" };
  const res = response();
  await layer.route.stack[0].handle(req, res, () => {});
  await layer.route.stack[1].handle(req, res);
  return { req, res };
}

describe("account verification routes", () => {
  beforeEach(() => {
    state.account = {
      telegramUsername: "new-user", email: "new@example.com", verificationRequiredAt: new Date(),
      verifiedAt: null, emailVerifiedAt: null, telegramChatId: null,
    };
    state.challenge = { createdAt: new Date(), lastSentAt: new Date(), consumedAt: null };
    state.sent = true; state.confirmation = { ok: true }; state.resendError = null; state.issued.length = 0;
  });

  it("provides a masked status to a restricted identity session", async () => {
    const { req, res } = await request("/account/verification/status");
    expect(req.account.verificationRequired).toBe(true);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      required: true, verified: false, emailMasked: "n**@example.com", availableMethods: ["email", "telegram"],
    }));
  });

  it("returns a cooldown response and does not claim email delivery", async () => {
    state.resendError = new EmailChallengeResendCooldownError(60);
    const { res } = await request("/account/verification/email/resend");
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ retryAfterSeconds: 60 }));
  });

  it("upgrades only after proof and emits an unrestricted cookie after confirmation", async () => {
    const denied = await request("/account/verification/session/upgrade");
    expect(denied.res.status).toHaveBeenCalledWith(403);
    await request("/account/verification/email/confirm", { code: "123456" });
    expect(state.issued).toEqual([false]);
    state.account.verifiedAt = new Date();
    await request("/account/verification/session/upgrade");
    expect(state.issued).toEqual([false, false]);
  });
});