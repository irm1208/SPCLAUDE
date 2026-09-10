import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("admin security hardening wiring", () => {
  it("mounts the admin session boundary before routers that expose admin endpoints", () => {
    const routes = read("./index.ts");
    const boundary = routes.indexOf('router.use("/admin", adminAuthorizationMiddleware)');
    expect(boundary).toBeGreaterThan(-1);
    expect(boundary).toBeLessThan(routes.indexOf("router.use(productsRouter)"));
    expect(boundary).toBeLessThan(routes.indexOf("router.use(deliveryMethodsRouter)"));
    expect(boundary).toBeLessThan(routes.indexOf("router.use(configRouter)"));
  });

  it("lets View-As account sessions win over a coexisting admin cookie", () => {
    const wholesale = read("../middleware/require-wholesale.ts");
    expect(wholesale).not.toContain('typeof req.cookies?.["peps_admin_session"] === "string"');
    expect(wholesale).toContain('typeof req.headers["x-admin-csrf"] === "string"');
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

  it("action-binds payment destinations without step-upping every alternate-route mutation", () => {
    const wholesale = read("../middleware/require-wholesale.ts");
    const reshipperMiddleware = read("../middleware/require-reshipper.ts");
    const reshipperRoutes = read("./reshipper.ts");
    expect(wholesale).not.toContain("requireAdminStepUp(req, res)");
    expect(reshipperMiddleware).not.toContain("requireAdminStepUp(req, res)");
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

  it("requires reusable step-up only for payment-routing and wallet configuration", () => {
    const middleware = read("../middleware/require-admin.ts");
    const policy = middleware.slice(middleware.indexOf("function isReusableStepUpRoute"));
    expect(policy).toContain('path === "/payments-config"');
    expect(policy).toContain('path === "/anonpay-config"');
    expect(policy).toContain('path === "/wallet-address"');
    expect(policy).toContain('path === "/wallet-change-code"');
    expect(policy).toContain('path === "/chain-wallets"');
    expect(policy).not.toContain('req.baseUrl.endsWith("/admin")');
    expect(policy).not.toContain("/payment-status");
    expect(policy).not.toContain("/shipping-config");
    expect(policy).not.toContain("/telegram-config");
    const alternateHelper = middleware.slice(
      middleware.indexOf("export async function requireAdminForRequest"),
      middleware.indexOf("function timingSafeHashEqual"),
    );
    expect(alternateHelper).not.toContain("requireAdminStepUp(req, res)");
  });

  it("does not add redundant step-up checks to routine admin operations", () => {
    expect(read("./admin.ts")).not.toContain("requireAdminStepUp(req, res)");
    expect(read("./group-buys-admin.ts")).not.toContain("requireAdminStepUp(req, res)");
    expect(read("./config.ts")).not.toContain("requireAdminStepUp(req, res)");
    const payments = read("./payments.ts");
    const paymentStatus = payments.slice(
      payments.indexOf('router.patch("/admin/orders/:id/payment-status"'),
      payments.indexOf('router.patch("/admin/chain-wallets"'),
    );
    expect(paymentStatus).not.toContain("requireAdminStepUp(req, res)");
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

  it("wires the admin-only shared-order force-lock mode", () => {
    const wholesale = read("./wholesale-shares.ts");
    expect(wholesale).toContain('router.post("/admin/wholesale-shares/:id/force-lock"');
    expect(wholesale).toContain('"admin_force"');
    expect(wholesale).toContain("wholesale_share_admin_force_locked");
    expect(wholesale).toContain('attemptLockShare(share, me, "manual")');
  });

  it("serializes shared-order code allocation inside the materialization transaction", () => {
    const wholesale = read("./wholesale-shares.ts");
    expect(wholesale).toContain("pg_advisory_xact_lock");
    expect(wholesale).toContain("nextOrderCodeBase(tx)");
    expect(wholesale).not.toContain("const codeBase = await nextOrderCodeBase();");
    expect(wholesale.indexOf("pg_advisory_xact_lock")).toBeLessThan(wholesale.indexOf("nextOrderCodeBase(tx)"));
  });
});