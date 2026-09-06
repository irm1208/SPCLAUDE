import {
  accountsTable,
  adminPendingChallengesTable,
  adminRecoveryCodesTable,
  adminSessionsTable,
  adminStepUpAssertionsTable,
  auditLogsTable,
  db,
  ordersTable,
} from "@workspace/db";
import { eq, isNull, sql } from "drizzle-orm";

const INCIDENT_FLAG = "SECURITY_INCIDENT_2026_09_06_REMEDIATE";
const INCIDENT_MARKER = "security_incident_2026_09_06_remediated";

export async function runSecurityIncidentRemediation(): Promise<void> {
  if (process.env[INCIDENT_FLAG] !== "true") return;

  await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${INCIDENT_MARKER}))`);

    const [alreadyApplied] = await tx
      .select({ id: auditLogsTable.id })
      .from(auditLogsTable)
      .where(eq(auditLogsTable.action, INCIDENT_MARKER))
      .limit(1);
    if (alreadyApplied) return;

    const now = new Date();
    const [compromisedOrder] = await tx
      .select({ pin: ordersTable.pin })
      .from(ordersTable)
      .where(eq(ordersTable.code, "8921"))
      .limit(1);

    await tx
      .update(accountsTable)
      .set({
        accountStatus: "banned",
        organiserStatus: "rejected",
        organiserRole: null,
        organiserApprovedAt: null,
        reshipperStatus: "rejected",
        reshipperApprovedAt: null,
        poolLeaderStatus: "rejected",
        poolLeaderApprovedAt: null,
        isWholesale: false,
      })
      .where(sql`lower(trim(leading '@' from ${accountsTable.telegramUsername})) ~ '^(aud|hermesaudit)'`);

    await tx.update(adminSessionsTable).set({ revokedAt: now }).where(isNull(adminSessionsTable.revokedAt));
    await tx.update(adminPendingChallengesTable).set({ consumedAt: now }).where(isNull(adminPendingChallengesTable.consumedAt));
    await tx.update(adminStepUpAssertionsTable).set({ consumedAt: now }).where(isNull(adminStepUpAssertionsTable.consumedAt));
    await tx.update(adminRecoveryCodesTable).set({ usedAt: now }).where(isNull(adminRecoveryCodesTable.usedAt));

    if (compromisedOrder?.pin) {
      await tx
        .update(ordersTable)
        .set({ pin: sql`md5(${ordersTable.id} || gen_random_uuid()::text)` })
        .where(eq(ordersTable.pin, compromisedOrder.pin));
    }

    await tx.insert(auditLogsTable).values({
      type: "security",
      level: "warn",
      action: INCIDENT_MARKER,
      message: "Applied emergency account, session, recovery-code, and legacy order credential remediation",
      metadata: {
        automatedAccountPattern: "aud|hermesaudit",
        adminSessionsRevoked: true,
        recoveryCodesInvalidated: true,
        compromisedOrderCredentialsInvalidated: Boolean(compromisedOrder?.pin),
      },
    });
  });

  console.warn("[security-incident] Emergency remediation applied");
}