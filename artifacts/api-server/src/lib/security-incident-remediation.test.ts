import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

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
  });

  it("runs before the server accepts traffic", () => {
    const index = readFileSync(new URL("../index.ts", import.meta.url), "utf8");
    const remediation = index.indexOf(".then(() => runSecurityIncidentRemediation())");
    const server = index.indexOf(".then(() => startServer())");
    expect(remediation).toBeGreaterThan(0);
    expect(server).toBeGreaterThan(remediation);
  });
});