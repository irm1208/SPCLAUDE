import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  accounts: new Map<string, Record<string, unknown>>(),
  challenges: [] as Array<Record<string, unknown>>,
}));

vi.mock("@workspace/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/db")>();
  const rowsFor = (table: unknown) => table === actual.accountsTable
    ? [...state.accounts.values()]
    : state.challenges;
  const db = {
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          limit: async (count: number) => rowsFor(table).slice(0, count),
          then: (resolve: (rows: Array<Record<string, unknown>>) => unknown) => resolve(rowsFor(table)),
        }),
      }),
    }),
    insert: (table: unknown) => ({
      values: (value: Record<string, unknown>) => ({
        returning: async () => {
          const challenge = { id: crypto.randomUUID(), createdAt: new Date(), consumedAt: null, ...value };
          state.challenges.push(challenge);
          return [challenge];
        },
      }),
    }),
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: () => ({
          then: (resolve: (rows: Array<Record<string, unknown>>) => unknown) => {
            if (table === actual.accountsTable) {
              const account = [...state.accounts.values()][0];
              if (!account) return resolve([]);
              Object.assign(account, values);
              return resolve([account]);
            }
            const active = state.challenges.find((challenge) => !challenge.consumedAt);
            if (!active) return resolve([]);
            Object.assign(active, values);
            return resolve([active]);
          },
          returning: async () => {
            if (table === actual.accountsTable) {
              const account = [...state.accounts.values()][0];
              if (!account) return [];
              Object.assign(account, values);
              return [account];
            }
            const active = state.challenges.find((challenge) => !challenge.consumedAt);
            if (!active) return [];
            Object.assign(active, values);
            return [active];
          },
        }),
      }),
    }),
  };
  return { ...actual, db };
});

import {
  completeAccountVerification,
  confirmEmailChallenge,
  createEmailChallenge,
  getAccountVerificationState,
  hashEmailCode,
  needsVerification,
  resendAvailableAt,
} from "./account-verification";
import { db } from "@workspace/db";

describe("account verification", () => {
  beforeEach(() => {
    state.accounts.clear();
    state.challenges.length = 0;
  });

  it("does not require verification for grandfathered or verified accounts", () => {
    expect(needsVerification({ verificationRequiredAt: null, verifiedAt: null })).toBe(false);
    expect(needsVerification({ verificationRequiredAt: new Date(), verifiedAt: new Date() })).toBe(false);
  });

  it("requires verification for a new unverified account", () => {
    expect(needsVerification({ verificationRequiredAt: new Date(), verifiedAt: null })).toBe(true);
  });

  it("stores only a hash and expires an email code after fifteen minutes", async () => {
    state.accounts.set("new-user", { telegramUsername: "new-user", email: "new@example.com" });
    const challenge = await createEmailChallenge(db as never, "new-user");

    expect(challenge.code).toMatch(/^\d{6}$/);
    expect(state.challenges[0].codeHash).toBe(hashEmailCode(challenge.code));
    expect(state.challenges[0]).not.toHaveProperty("code");
    expect((state.challenges[0].expiresAt as Date).getTime() - Date.now()).toBeGreaterThan(14 * 60_000);
    expect((state.challenges[0].expiresAt as Date).getTime() - Date.now()).toBeLessThanOrEqual(15 * 60_000);
  });

  it("rejects expired codes, locks after five failed attempts, and consumes a code once", async () => {
    state.accounts.set("new-user", { telegramUsername: "new-user", verificationRequiredAt: new Date(), verifiedAt: null });
    const challenge = await createEmailChallenge(db as never, "new-user");
    state.challenges[0].expiresAt = new Date(Date.now() - 1);
    await expect(confirmEmailChallenge(db as never, "new-user", challenge.code)).resolves.toEqual({ ok: false, reason: "expired" });

    state.challenges[0].expiresAt = new Date(Date.now() + 60_000);
    for (let attempt = 0; attempt < 5; attempt++) {
      await expect(confirmEmailChallenge(db as never, "new-user", "000000")).resolves.toEqual({ ok: false, reason: "invalid" });
    }
    await expect(confirmEmailChallenge(db as never, "new-user", challenge.code)).resolves.toEqual({ ok: false, reason: "attempts_exhausted" });

    state.challenges[0].attemptCount = 0;
    await expect(confirmEmailChallenge(db as never, "new-user", challenge.code)).resolves.toEqual({ ok: true });
    await expect(confirmEmailChallenge(db as never, "new-user", challenge.code)).resolves.toEqual({ ok: false, reason: "consumed" });
  });

  it("enforces resend cooldown and completing by email or Telegram invalidates active challenges", async () => {
    state.accounts.set("new-user", { telegramUsername: "new-user", verificationRequiredAt: new Date(), verifiedAt: null });
    await createEmailChallenge(db as never, "new-user");
    expect(resendAvailableAt(state.challenges[0].lastSentAt as Date).getTime() - (state.challenges[0].lastSentAt as Date).getTime()).toBe(60_000);

    await completeAccountVerification(db as never, "new-user", "telegram");
    expect(state.accounts.get("new-user")).toMatchObject({ verificationMethod: "telegram" });
    expect(state.challenges[0].consumedAt).toBeInstanceOf(Date);

    state.accounts.get("new-user")!.verifiedAt = null;
    await createEmailChallenge(db as never, "new-user");
    const code = (await createEmailChallenge(db as never, "new-user")).code;
    await confirmEmailChallenge(db as never, "new-user", code);
    expect(await getAccountVerificationState("new-user")).toMatchObject({ verified: true, method: "email", emailVerified: true });
  });
});