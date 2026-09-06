import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

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

vi.mock("../middleware/account-auth", async (importOriginal) => ({
  ...await importOriginal<typeof import("../middleware/account-auth")>(),
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

import router from "./index";
import { EmailChallengeResendCooldownError } from "../lib/account-verification";

async function request(path: string, body?: unknown) {
  const app = express();
  app.use(express.json());
  app.use("/api", router);
  const server: Server = await new Promise(resolve => {
    const listening = app.listen(0, () => resolve(listening));
  });
  try {
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/api${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
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
    const result = await request("/account/verification/status");
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      required: true, verified: false, emailMasked: "n**@example.com", availableMethods: ["email", "telegram"],
    });
  });

  it("returns a cooldown response and does not claim email delivery", async () => {
    state.resendError = new EmailChallengeResendCooldownError(60);
    const result = await request("/account/verification/email/resend", {});
    expect(result.status).toBe(429);
    expect(result.body).toMatchObject({ retryAfterSeconds: 60 });
  });

  it("reports resend delivery failure instead of false success", async () => {
    state.sent = false;
    const result = await request("/account/verification/email/resend", {});
    expect(result.status).toBe(503);
    expect(result.body).toEqual({ error: "Verification email cannot be sent" });
  });

  it("returns resend success only when the templated email is sent", async () => {
    const result = await request("/account/verification/email/resend", {});
    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
  });

  it("upgrades only after proof and emits an unrestricted cookie after confirmation", async () => {
    const denied = await request("/account/verification/session/upgrade", {});
    expect(denied.status).toBe(403);
    await request("/account/verification/email/confirm", { code: "123456" });
    expect(state.issued).toEqual([false]);
    state.account.verifiedAt = new Date();
    expect((await request("/account/verification/session/upgrade", {})).status).toBe(200);
    expect(state.issued).toEqual([false, false]);
  });
});