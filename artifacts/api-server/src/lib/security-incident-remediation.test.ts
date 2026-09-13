import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { accountsTable, ordersTable } from "@workspace/db";
import { runSecurityIncidentRemediation } from "./security-incident-remediation";

describe("September 2026 security incident remediation", () => {
  it("is idempotent and covers every approved emergency data action", () => {
    const remediation = readFileSync(new URL("./security-incident-remediation.ts", import.meta.url), "utf8");
    expect(remediation).toContain("SECURITY_INCIDENT_2026_09_06_REMEDIATE");
    expect(remediation).toContain("security_incident_2026_09_06_remediated");
    expect(remediation).toContain("pg_advisory_xact_lock");
    expect(remediation).toContain("accountStatus: \"banned\"");
    expect(remediation).toContain("adminSessionsTable");
    expect(remediation).toContain("adminPendingChallengesTable");
    expect(remediation).toContain("adminStepUpAssertionsTable");
    expect(remediation).toContain("adminRecoveryCodesTable");
    expect(remediation).toContain('eq(ordersTable.code, "8921")');
    expect(remediation).toContain("md5(");
    expect(remediation).toContain("Security-only credential neutralisation");
    expect(remediation).not.toContain("refundMutableOrderWhere");
  });

  it("runs before the server accepts traffic", () => {
    const index = readFileSync(new URL("../index.ts", import.meta.url), "utf8");
    const remediation = index.indexOf(".then(() => runSecurityIncidentRemediation())");
    const readiness = index.indexOf("markApplicationReady()");
    expect(remediation).toBeGreaterThan(0);
    expect(readiness).toBeGreaterThan(remediation);
  });

  it("keeps containment atomic when the compromised order has an active refund", async () => {
    const updates: Array<{ table: unknown; values: Record<string, unknown> }> = [];
    let selectCall = 0;
    const tx = {
      execute: vi.fn(async () => ({ rows: [] })),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => selectCall++ === 0 ? [] : [{ pin: "1234" }]),
          })),
        })),
      })),
      update: vi.fn((table: unknown) => ({
        set: vi.fn((values: Record<string, unknown>) => ({
          where: vi.fn(async () => {
            updates.push({ table, values });
            return { rowCount: 1 };
          }),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(async () => ({ rowCount: 1 })),
      })),
    };
    const database = {
      transaction: vi.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const previousFlag = process.env["SECURITY_INCIDENT_2026_09_06_REMEDIATE"];
    process.env["SECURITY_INCIDENT_2026_09_06_REMEDIATE"] = "true";
    try {
      await runSecurityIncidentRemediation(database as never);
    } finally {
      if (previousFlag === undefined) delete process.env["SECURITY_INCIDENT_2026_09_06_REMEDIATE"];
      else process.env["SECURITY_INCIDENT_2026_09_06_REMEDIATE"] = previousFlag;
    }

    expect(database.transaction).toHaveBeenCalledOnce();
    expect(updates.some(update => update.table === accountsTable && update.values.accountStatus === "banned")).toBe(true);
    const pinUpdate = updates.find(update => update.table === ordersTable);
    expect(pinUpdate?.values).toEqual(expect.objectContaining({ pin: expect.anything() }));
    expect(Object.keys(pinUpdate?.values ?? {})).toEqual(["pin"]);
  });
});
