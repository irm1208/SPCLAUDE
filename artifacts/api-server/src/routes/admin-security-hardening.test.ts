import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("admin security hardening wiring", () => {
  it("recognizes session-cookie admin alternatives without a legacy header", () => {
    expect(read("../middleware/require-wholesale.ts")).toContain('req.cookies?.["peps_admin_session"]');
    expect(read("../middleware/require-reshipper.ts")).toContain('req.cookies?.["peps_admin_session"]');
  });

  it("allows the action assertion header through explicit CORS policies", () => {
    expect(read("../app.ts")).toContain('"X-Admin-Action-Assertion"');
    expect(read("./peppys.ts")).toContain("X-Admin-Action-Assertion");
  });

  it("centralizes sensitive mutation audit and avoids duplicate auth-check failure logging", () => {
    const middleware = read("../middleware/require-admin.ts");
    expect(middleware).toContain("admin_sensitive_mutation");
    expect(middleware).toContain('res.once("finish"');
    const admin = read("./admin.ts");
    const authCheck = admin.slice(admin.indexOf('router.get("/admin/auth-check"'), admin.indexOf("// GET /api/admin/search-users"));
    expect(authCheck).not.toContain('"admin_login_failed"');
  });

  it("step-ups admin alternate-route mutations and action-binds reshipper destinations", () => {
    const wholesale = read("../middleware/require-wholesale.ts");
    const reshipperMiddleware = read("../middleware/require-reshipper.ts");
    const reshipperRoutes = read("./reshipper.ts");
    expect(wholesale).toContain("requireAdminStepUp(req, res)");
    expect(wholesale).toContain("attachAdminSensitiveMutationAudit");
    expect(reshipperMiddleware).toContain("requireAdminStepUp(req, res)");
    expect(reshipperMiddleware).toContain("attachAdminSensitiveMutationAudit");
    expect(reshipperRoutes).toContain('"reshipper.payment-destination.update"');
    expect(reshipperRoutes).toContain('"reshipper.assignment-payment-destination.update"');
    expect(reshipperRoutes).toContain("consumeAdminActionAssertion");
  });

  it("computes mutation targets at response completion and supports redacted summaries", () => {
    const middleware = read("../middleware/require-admin.ts");
    const finishBody = middleware.slice(middleware.indexOf('res.once("finish"'), middleware.indexOf("function safeMutationTarget"));
    expect(finishBody).toContain("safeMutationTarget(req)");
    expect(middleware).toContain("setAdminMutationSummary");
    expect(read("./payments.ts")).toContain('"wallet_destination"');
    expect(read("./admin.ts")).toContain('"fs3_cost"');
    expect(read("./group-buys-admin.ts")).toContain('"fs3_submission"');
  });

  it("default-protects and audits arbitrary non-admin mutations but not reads", () => {
    const middleware = read("../middleware/require-admin.ts");
    const helper = middleware.slice(
      middleware.indexOf("export async function requireAdminForRequest"),
      middleware.indexOf("function timingSafeHashEqual"),
    );
    expect(helper).toContain('!["GET", "HEAD", "OPTIONS"].includes(req.method)');
    expect(helper).toContain('attachAdminSensitiveMutationAudit(req, res, "reusable")');
    expect(helper).toContain("requireAdminStepUp(req, res)");
  });

  it("uses one transactional FS3 submit implementation", () => {
    const canonical = read("./group-buys-admin.ts");
    expect(canonical).toContain('router.post("/admin/group-buys/:gbId/fs3-submit"');
    expect(canonical).toContain("db.transaction(async tx =>");
    expect(canonical).toContain("await tx.insert(fs3SubmissionsTable)");
    expect(canonical).not.toContain("non-fatal — don't fail the submit");
    expect(read("./admin.ts")).not.toContain('router.post("/admin/group-buys/:gbId/fs3-submit"');
  });

  it("requires a dedicated TOTP key and atomically verifies login challenges", () => {
    const crypto = read("../lib/admin-2fa.ts");
    const auth = read("./admin-auth.ts");
    expect(crypto).not.toContain('process.env["SESSION_SECRET"]');
    expect(crypto).toContain("ADMIN_TOTP_ENCRYPTION_KEY is required");
    expect(auth).toContain("Admin two-factor authentication is not configured");
    expect(auth).toContain("verified = await db.transaction");
    expect(auth).toContain("isNull(adminPendingChallengesTable.consumedAt)");
    expect(auth).toContain("await tx.insert(adminSessionsTable)");
  });

  it("adds request correlation and a keyed privacy-safe audit fingerprint", () => {
    const middleware = read("../middleware/require-admin.ts");
    expect(middleware).toContain("requestId");
    expect(middleware).toContain("requestFingerprint");
    expect(middleware).toContain('createHmac("sha256"');
  });

  it("aborts the login transaction when pending-challenge CAS loses", () => {
    const auth = read("./admin-auth.ts");
    expect(auth).toContain("throw new PendingChallengeConsumedError()");
    expect(auth).toContain("error instanceof PendingChallengeConsumedError");
  });

  it("does not write raw FS3 notes to audit metadata", () => {
    const source = read("./group-buys-admin.ts");
    const audit = source.slice(source.indexOf('"fs3_batch_submitted"'), source.indexOf("res.json({ ok: true", source.indexOf('"fs3_batch_submitted"')));
    expect(audit).toContain("notesPresent: Boolean(notes)");
    expect(audit).not.toMatch(/[,({]\s*notes\s*[,}]/);
  });
});