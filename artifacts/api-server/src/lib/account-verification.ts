import { createHash, randomInt } from "node:crypto";
import { and, eq, isNull, lt, sql } from "drizzle-orm";
import {
  accountVerificationChallengesTable,
  accountsTable,
  db,
} from "@workspace/db";

const EMAIL_CODE_EXPIRY_MS = 15 * 60_000;
const RESEND_COOLDOWN_MS = 60_000;
const MAX_FAILED_ATTEMPTS = 5;

type ChallengeDb = Pick<typeof db, "select" | "insert" | "update">;
type VerificationDb = ChallengeDb & Pick<typeof db, "transaction">;
type VerificationMethod = "email" | "telegram";

export class EmailChallengeResendCooldownError extends Error {
  readonly code = "email_challenge_resend_cooldown";

  constructor(readonly retryAfterSeconds: number) {
    super("Email verification code resend is cooling down");
    this.name = "EmailChallengeResendCooldownError";
  }
}

export function needsVerification(account: {
  verificationRequiredAt: Date | null;
  verifiedAt: Date | null;
}): boolean {
  return account.verificationRequiredAt !== null && account.verifiedAt === null;
}

export function hashEmailCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function resendAvailableAt(lastSentAt: Date): Date {
  return new Date(lastSentAt.getTime() + RESEND_COOLDOWN_MS);
}

export async function createEmailChallenge(database: VerificationDb, username: string) {
  return database.transaction(async (tx) => {
    await tx
      .select()
      .from(accountsTable)
      .where(eq(accountsTable.telegramUsername, username))
      .for("update");
    return createEmailChallengeInTransaction(tx, username);
  });
}

async function createEmailChallengeInTransaction(database: ChallengeDb, username: string) {
  const now = new Date();
  const challenges = await database
    .select()
    .from(accountVerificationChallengesTable)
    .where(eq(accountVerificationChallengesTable.accountUsername, username));
  const latestChallenge = challenges
    .sort((a, b) => {
      const aTime = a.lastSentAt?.getTime() ?? a.createdAt.getTime();
      const bTime = b.lastSentAt?.getTime() ?? b.createdAt.getTime();
      return bTime - aTime;
    })[0];
  if (latestChallenge) {
    const availableAt = resendAvailableAt(latestChallenge.lastSentAt ?? latestChallenge.createdAt);
    if (availableAt > now) {
      throw new EmailChallengeResendCooldownError(Math.ceil((availableAt.getTime() - now.getTime()) / 1_000));
    }
  }

  const code = String(randomInt(100000, 1_000_000));

  await database
    .update(accountVerificationChallengesTable)
    .set({ consumedAt: now })
    .where(and(
      eq(accountVerificationChallengesTable.accountUsername, username),
      isNull(accountVerificationChallengesTable.consumedAt),
    ));

  const [challenge] = await database
    .insert(accountVerificationChallengesTable)
    .values({
      accountUsername: username,
      codeHash: hashEmailCode(code),
      expiresAt: new Date(now.getTime() + EMAIL_CODE_EXPIRY_MS),
      attemptCount: 0,
      lastSentAt: now,
    })
    .returning();

  return { id: challenge.id, code, expiresAt: challenge.expiresAt, lastSentAt: challenge.lastSentAt };
}

export async function completeAccountVerification(
  database: VerificationDb,
  username: string,
  method: VerificationMethod,
): Promise<boolean> {
  const now = new Date();
  const [account] = await database
    .update(accountsTable)
    .set({
      verifiedAt: now,
      verificationMethod: method,
      ...(method === "email" ? { emailVerifiedAt: now } : {}),
    })
    .where(eq(accountsTable.telegramUsername, username))
    .returning();

  if (!account) return false;

  await database
    .update(accountVerificationChallengesTable)
    .set({ consumedAt: now })
    .where(and(
      eq(accountVerificationChallengesTable.accountUsername, username),
      isNull(accountVerificationChallengesTable.consumedAt),
    ));
  return true;
}

export async function confirmEmailChallenge(database: VerificationDb, username: string, code: string) {
  const challenges = await database
    .select()
    .from(accountVerificationChallengesTable)
    .where(eq(accountVerificationChallengesTable.accountUsername, username));
  const challenge = challenges
    .filter((candidate) => candidate.consumedAt === null)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  if (!challenge) return { ok: false as const, reason: "consumed" as const };
  if (challenge.expiresAt.getTime() <= Date.now()) return { ok: false as const, reason: "expired" as const };
  if (challenge.attemptCount >= MAX_FAILED_ATTEMPTS) return { ok: false as const, reason: "attempts_exhausted" as const };

  if (challenge.codeHash !== hashEmailCode(code.trim())) {
    const [attempt] = await database
      .update(accountVerificationChallengesTable)
      .set({ attemptCount: sql`${accountVerificationChallengesTable.attemptCount} + 1` })
      .where(and(
        eq(accountVerificationChallengesTable.id, challenge.id),
        lt(accountVerificationChallengesTable.attemptCount, MAX_FAILED_ATTEMPTS),
      ))
      .returning();
    if (!attempt) return { ok: false as const, reason: "attempts_exhausted" as const };
    return { ok: false as const, reason: "invalid" as const };
  }

  const now = new Date();
  const [consumed] = await database
    .update(accountVerificationChallengesTable)
    .set({ consumedAt: now })
    .where(and(eq(accountVerificationChallengesTable.id, challenge.id), isNull(accountVerificationChallengesTable.consumedAt)))
    .returning();
  if (!consumed) return { ok: false as const, reason: "consumed" as const };

  await completeAccountVerification(database, username, "email");
  return { ok: true as const };
}

export async function getAccountVerificationState(username: string) {
  const [account] = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, username))
    .limit(1);

  if (!account) return null;
  return {
    required: account.verificationRequiredAt !== null,
    verified: !needsVerification(account),
    method: account.verificationMethod,
    emailVerified: account.emailVerifiedAt !== null,
  };
}