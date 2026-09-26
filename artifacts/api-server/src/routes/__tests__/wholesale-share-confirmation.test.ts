import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const routeSource = fs.readFileSync(path.resolve(here, "../wholesale-shares.ts"), "utf8");
const paymentsSource = fs.readFileSync(path.resolve(here, "../payments.ts"), "utf8");
const indexSource = fs.readFileSync(path.resolve(here, "../../index.ts"), "utf8");
const autoVerifySource = fs.readFileSync(
  path.resolve(here, "../../lib/wholesale-organiser-payment-auto-verify.ts"),
  "utf8",
);
const autoPolicySource = fs.readFileSync(
  path.resolve(here, "../../lib/wholesale-organiser-payment-auto-policy.ts"),
  "utf8",
);
const schemaSource = fs.readFileSync(path.resolve(here, "../../../../../lib/db/src/schema/wholesale_shares.ts"), "utf8");
const adminSource = fs.readFileSync(
  path.resolve(here, "../../../../peps-anonymous/src/pages/Admin.tsx"),
  "utf8",
);
const wholesaleSharedSource = fs.readFileSync(
  path.resolve(here, "../../../../peps-anonymous/src/pages/WholesaleShared.tsx"),
  "utf8",
);
const wholesaleHooksSource = fs.readFileSync(
  path.resolve(here, "../../../../peps-anonymous/src/hooks/use-wholesale-shares.ts"),
  "utf8",
);
const adminRouteSource = fs.readFileSync(path.resolve(here, "../admin.ts"), "utf8");
const groupBuyAdminRouteSource = fs.readFileSync(path.resolve(here, "../group-buys-admin.ts"), "utf8");
const activeMembershipSource = fs.readFileSync(
  path.resolve(here, "../../lib/shared-order-active-membership.ts"),
  "utf8",
);
const wholesaleSubmitSource = fs.readFileSync(
  path.resolve(here, "../../lib/wholesale-submit.ts"),
  "utf8",
);

describe("shared wholesale order confirmations", () => {
  it("persists a per-member confirmation timestamp and exposes it to the shared-order UI", () => {
    expect(schemaSource).toContain('confirmedAt: timestamp("confirmed_at"');
    expect(routeSource).toContain("confirmedAt: m.confirmedAt");
  });

  it("lets an open-order member confirm, but clears their confirmation whenever their draft changes", () => {
    expect(routeSource).toContain('router.post("/wholesale-shares/:id/confirm"');
    expect(routeSource).toContain("confirmedAt: new Date()");
    expect(routeSource).toContain("confirmedAt: null");
  });

  it("allows organisers to remove only unconfirmed participants", () => {
    expect(routeSource).toContain("!m.confirmedAt");
    expect(routeSource).toContain("A confirmed member can't be removed");
  });

  it("enforces every member's confirmation inside the lock transaction", () => {
    const lockFunction = routeSource.slice(
      routeSource.indexOf("async function attemptLockShare"),
      routeSource.indexOf('router.post("/wholesale-shares/:id/lock"'),
    );

    expect(lockFunction).toContain("m.confirmedAt == null");
    expect(lockFunction).toContain("Every member must confirm their order before it can be locked.");
  });

  it("clears every confirmation when an organiser reopens a locked shared order", () => {
    const unlockHandler = routeSource.slice(
      routeSource.indexOf('router.post("/wholesale-shares/:id/unlock"'),
      routeSource.indexOf('router.post("/wholesale-shares/:id/cancel"'),
    );

    expect(unlockHandler).toContain(".set({ confirmedAt: null })");
  });

  it("clears only the adjusted member's confirmation when an admin changes open-order items", () => {
    const adjustmentHandler = routeSource.slice(
      routeSource.indexOf('router.put("/admin/wholesale-shares/:id/adjustments"'),
      routeSource.indexOf('router.post("/wholesale-shares/:id/organiser-payment"'),
    );

    expect(adjustmentHandler).toContain(
      'confirmedAt: share.status === "open" && member.id === target.id && Array.isArray(body.items) ? null : member.confirmedAt',
    );
  });

  it("locks the current share and member before removal, and rechecks membership for delivery changes", () => {
    const removalHandler = routeSource.slice(
      routeSource.indexOf('router.post("/wholesale-shares/:id/remove-member"'),
      routeSource.indexOf('router.post("/admin/wholesale-shares/:id/remove-members"'),
    );
    const deliveryHandler = routeSource.slice(
      routeSource.indexOf('router.put("/wholesale-shares/:id/delivery"'),
      routeSource.indexOf('router.put("/wholesale-shares/:id/delivery-address"'),
    );

    expect(removalHandler).toContain("const [lockedShare] = await tx.select()");
    expect(removalHandler).toContain("const [lockedMember] = await tx.select()");
    expect(removalHandler).toContain("lockedShare.deliveryUsername");
    expect(deliveryHandler).toContain("EXISTS (SELECT 1 FROM ${wholesaleShareMembersTable}");
  });

  it("cancels and soft-deletes a linked unpaid order before removing an open-share member", () => {
    const removalHandler = routeSource.slice(
      routeSource.indexOf('router.post("/wholesale-shares/:id/remove-member"'),
      routeSource.indexOf('router.post("/admin/wholesale-shares/:id/remove-members"'),
    );
    const cancelIndex = removalHandler.indexOf("cancelRemovedSharedOrder");
    const deleteMemberIndex = removalHandler.indexOf("tx.delete(wholesaleShareMembersTable)");

    expect(cancelIndex).toBeGreaterThanOrEqual(0);
    expect(deleteMemberIndex).toBeGreaterThan(cancelIndex);
    expect(removalHandler).toContain("lockedMember.orderId");
  });

  it("cancels and soft-deletes a linked unpaid order before an open-share member leaves", () => {
    const leaveHandler = routeSource.slice(
      routeSource.indexOf('router.post("/wholesale-shares/:id/leave"'),
      routeSource.indexOf('router.post("/wholesale-shares/:id/confirm"'),
    );
    const cancelIndex = leaveHandler.indexOf("cancelRemovedSharedOrder");
    const deleteMemberIndex = leaveHandler.indexOf("tx.delete(wholesaleShareMembersTable)");

    expect(leaveHandler).toContain("db.transaction(async (tx)");
    expect(leaveHandler).toContain(".for(\"update\")");
    expect(cancelIndex).toBeGreaterThanOrEqual(0);
    expect(deleteMemberIndex).toBeGreaterThan(cancelIndex);
    expect(leaveHandler).toContain("lockedMember.orderId");
    expect(leaveHandler).toContain("MEMBER_ORDER_PAYMENT_STARTED");
  });

  it("does not leave the organiser removal button spinning forever", () => {
    const removeRequestStart = wholesaleHooksSource.indexOf("export function removeWholesaleShareMember");
    const removeRequest = wholesaleHooksSource.slice(removeRequestStart, removeRequestStart + 500);
    const removeHandler = wholesaleSharedSource.slice(
      wholesaleSharedSource.indexOf("const removeMember = async"),
      wholesaleSharedSource.indexOf("const setFeeAmount", wholesaleSharedSource.indexOf("const removeMember = async")),
    );

    expect(removeRequest).toContain("AbortSignal.timeout(15_000)");
    expect(removeHandler).toContain('error.name === "TimeoutError"');
    expect(removeHandler).toContain("invalidate(id);");
    expect(removeHandler).toContain("setBusy(null);");
  });

  it("filters orphaned shared orders from Admin and every FS3 operational query", () => {
    expect(activeMembershipSource).toContain("IS DISTINCT FROM 'wholesale_shared'");
    expect(adminRouteSource).toContain("activeSharedOrderMembershipWhere");
    expect(adminRouteSource.match(/activeSharedOrderMembershipWhere\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
    const fs3Handlers = groupBuyAdminRouteSource.slice(
      groupBuyAdminRouteSource.indexOf('router.get("/admin/group-buys/:gbId/fs3-batch"'),
      groupBuyAdminRouteSource.indexOf('router.get("/admin/group-buys/:gbId/fs3-submissions"'),
    );
    expect(fs3Handlers.match(/activeSharedOrderMembershipWhere\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("offers an admin repair action for historical orphaned shared orders", () => {
    expect(routeSource).toContain('router.post("/admin/wholesale-shares/:id/repair-orphan-orders"');
    expect(routeSource).toContain("orphanedSharedOrderMembershipWhere");
    const repairHandler = routeSource.slice(
      routeSource.indexOf('router.post("/admin/wholesale-shares/:id/repair-orphan-orders"'),
      routeSource.indexOf('router.put("/admin/wholesale-shares/:id/organiser-wallets"'),
    );
    expect(repairHandler.match(/orphanedSharedOrderMembershipWhere\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(adminSource).toContain(`/admin/wholesale-shares/\${detail.id}/repair-orphan-orders`);
    expect(adminSource).toContain("Repair orphaned orders");
    expect(adminSource).toContain("const repairOrphanOrders = async");
  });

  it("auto-confirms only full organiser payments without member credits", () => {
    const submissionHandler = routeSource.slice(
      routeSource.indexOf('router.post("/wholesale-shares/:id/organiser-payment"'),
      routeSource.indexOf("// Admin confirms the organiser's platform payment."),
    );

    expect(submissionHandler).toContain('organiserPaymentStatus: "pending"');
    expect(submissionHandler).toContain("triggerWholesaleOrganiserPaymentCheck");
    expect(routeSource).toContain("wholesale-organiser-payment-auto-verify");
    expect(indexSource).toContain("startWholesaleOrganiserPaymentAutoVerify");
    expect(indexSource).toContain("wholesale-organiser-payment-auto-verify");
    expect(autoVerifySource).toContain("creditsApplied");
    expect(autoPolicySource).toContain("totalCreditsApplied > 0");
    expect(autoVerifySource).toContain("requires manual admin confirmation");
    expect(autoVerifySource).toContain("verifyTransaction");
    expect(autoVerifySource).toContain('source: "automatic"');
    expect(autoVerifySource).toContain("verifiedAmount: verification.verified ? verification.amountUsdt : null");
    expect(autoVerifySource).toContain("expectedAmountDue: amountDue");
    expect(autoVerifySource).toContain("requireNoCredits: true");
    expect(schemaSource).toContain("wholesale_shares_organiser_payment_identity_uq");
    expect(schemaSource).toContain('organiserPaymentIdentity: text("organiser_payment_identity")');
    expect(submissionHandler).toContain("organiserPaymentIdentity: submittedPaymentIdentity");
    expect(submissionHandler).toContain("payment_transaction_reused");
    expect(wholesaleSharedSource).toContain(
      "Full payments are checked automatically; partial or credit-adjusted payments require administrator confirmation.",
    );
  });

  it("uses the shared confirmation service for admin confirmation and makes repeats idempotent", () => {
    const adminStart = routeSource.indexOf(
      'router.post("/admin/wholesale-shares/:id/confirm-organiser-payment"',
    );
    const adminHandler = routeSource.slice(
      adminStart,
      routeSource.indexOf("// ── Wholesale Share Invite Links", adminStart),
    );
    const normalizedAdminHandler = adminHandler.replace(/\s+/g, " ");
    const shareLoadIndex = normalizedAdminHandler.indexOf("const share = await loadShare(req.params.id)");
    const serviceCallIndex = normalizedAdminHandler.indexOf("const result = await confirmWholesaleOrganiserPayment");
    const rejectionIndex = normalizedAdminHandler.indexOf('if (result.kind === "rejected")');
    const rejectionResponseIndex = normalizedAdminHandler.indexOf(
      'res.status(result.code === "not_found" ? 404 : 409).json({ error: result.message, code: result.code, });',
    );
    const rejectionReturnIndex = normalizedAdminHandler.indexOf("return;", rejectionResponseIndex);
    const alreadyConfirmedIndex = normalizedAdminHandler.indexOf('if (result.kind === "already_confirmed")');
    const alreadyResponseIndex = normalizedAdminHandler.indexOf(
      "res.json({ ok: true, organiserOrderId: result.organiserOrderId, alreadyConfirmed: true, organiserPaymentStatus: result.organiserPaymentStatus, organiserOrderPaymentStatus: result.organiserOrderPaymentStatus, });",
    );
    const alreadyReturnIndex = normalizedAdminHandler.indexOf("return;", alreadyResponseIndex);
    const confirmedResponseIndex = normalizedAdminHandler.indexOf(
      "res.json({ ok: true, organiserOrderId: result.organiserOrderId, alreadyConfirmed: false, organiserPaymentStatus: result.organiserPaymentStatus, organiserOrderPaymentStatus: result.organiserOrderPaymentStatus, });",
    );
    const confirmedBranchIndex = normalizedAdminHandler.indexOf('if (result.kind === "confirmed")');
    const notificationIndex = normalizedAdminHandler.indexOf("notifyUser(", confirmedBranchIndex);

    expect(serviceCallIndex).toBeGreaterThanOrEqual(0);
    expect(adminHandler).toContain('source: "admin"');
    expect(shareLoadIndex).toBeGreaterThanOrEqual(0);
    expect(serviceCallIndex).toBeGreaterThan(shareLoadIndex);
    expect(rejectionIndex).toBeGreaterThan(serviceCallIndex);
    expect(rejectionResponseIndex).toBeGreaterThan(rejectionIndex);
    expect(rejectionReturnIndex).toBeGreaterThan(rejectionResponseIndex);
    expect(alreadyConfirmedIndex).toBeGreaterThan(rejectionResponseIndex);
    expect(alreadyResponseIndex).toBeGreaterThan(alreadyConfirmedIndex);
    expect(alreadyReturnIndex).toBeGreaterThan(alreadyResponseIndex);
    expect(confirmedResponseIndex).toBeGreaterThan(alreadyResponseIndex);
    expect(confirmedBranchIndex).toBeGreaterThan(alreadyReturnIndex);
    expect(notificationIndex).toBeGreaterThan(confirmedBranchIndex);
    expect(normalizedAdminHandler).toMatch(
      /res\.status\(result\.code === "not_found" \? 404 : 409\)\.json\(\{ error: result\.message, code: result\.code, \}\);/,
    );
    expect(normalizedAdminHandler).toMatch(
      /res\.json\(\{ ok: true, organiserOrderId: result\.organiserOrderId, alreadyConfirmed: true, organiserPaymentStatus: result\.organiserPaymentStatus, organiserOrderPaymentStatus: result\.organiserOrderPaymentStatus, \}\);/,
    );
    expect(normalizedAdminHandler).toMatch(
      /res\.json\(\{ ok: true, organiserOrderId: result\.organiserOrderId, alreadyConfirmed: false, organiserPaymentStatus: result\.organiserPaymentStatus, organiserOrderPaymentStatus: result\.organiserOrderPaymentStatus, \}\);/,
    );
    expect(adminHandler).toContain("result.creatorUsername");
    expect(normalizedAdminHandler.slice(rejectionIndex, alreadyConfirmedIndex)).not.toContain("notifyUser(");
    expect(normalizedAdminHandler.slice(alreadyConfirmedIndex, confirmedBranchIndex)).not.toContain("notifyUser(");
    expect(adminHandler).not.toContain(".update(wholesaleSharesTable)");
    expect(adminHandler).not.toContain("wholesale_share_organiser_payment_confirmed");
  });

  it("submits organiser payment for submitted shares and repairs stale locked shares from active members only", () => {
    const start = routeSource.indexOf('router.post("/wholesale-shares/:id/organiser-payment"');
    const end = routeSource.indexOf("// Admin confirms the organiser's platform payment.", start);
    const handler = routeSource.slice(start, end);

    expect(handler).toContain("normalizeOrganiserWallets(share.leadCryptoOptions)");
    expect(handler).toContain("An organiser-owned wallet is required for this payment flow.");
    expect(handler).toContain('["locked", "submitted"].includes(share.status)');
    expect(handler).toContain("db.transaction(async (tx)");
    expect(handler).toContain("wholesaleShareMembersTable.orderId");
    expect(handler).toContain("activeMembers.length");
    expect(handler).toContain('paymentStatus === "confirmed"');
    expect(handler).not.toContain('paymentStatus === "test_confirmed"');
    expect(handler).toContain('status: "submitted"');
    expect(handler).toContain('inArray(wholesaleSharesTable.status, ["locked", "submitted"])');
    expect(handler).toContain('inArray(wholesaleSharesTable.organiserPaymentStatus, ["unpaid", "pending"])');
    expect(handler).toContain(".returning(");
    expect(handler).toContain("The shared order changed before this payment could be submitted.");
    expect(handler).not.toContain(".where(eq(wholesaleSharesTable.id, share.id));");
  });

  it("keeps the organiser's platform payable unknown until vendor shipping is final", () => {
    const start = routeSource.indexOf("const organiserPaymentAmountDue =");
    const end = routeSource.indexOf("const allPaid =", start);
    const calculation = routeSource.slice(start, end);
    expect(calculation).toContain("share.totalVendorShipping");
    expect(calculation).not.toMatch(/\?\?\s*0/);
    expect(wholesaleHooksSource).toContain("amountDue: number | null");
  });

  it("does not record a platform payment when the final payable is missing or zero", () => {
    const start = routeSource.indexOf('router.post("/wholesale-shares/:id/organiser-payment"');
    const end = routeSource.indexOf("// Admin confirms the organiser's platform payment.", start);
    const handler = routeSource.slice(start, end);
    expect(handler).toContain("calculateWholesaleOrganiserAmountDue(");
    expect(handler).toContain("lockedShare.totalVendorShipping");
    expect(handler).toContain("if (amountDue === null || amountDue <= 0) return null;");
    expect(handler.indexOf("amountDue <= 0")).toBeLessThan(handler.indexOf("tx.update(wholesaleSharesTable)"));
  });

  it("requires full member payments even when a share was already submitted", () => {
    const start = routeSource.indexOf('router.post("/wholesale-shares/:id/organiser-payment"');
    const end = routeSource.indexOf("// Admin confirms the organiser's platform payment.", start);
    const handler = routeSource.slice(start, end);
    const paidCheck = handler.indexOf("const allActiveMembersPaid =");
    const paymentUpdate = handler.indexOf("tx.update(wholesaleSharesTable)");
    expect(paidCheck).toBeGreaterThanOrEqual(0);
    expect(paymentUpdate).toBeGreaterThan(paidCheck);
    expect(handler).not.toContain('if (lockedShare.status === "locked")');
    expect(handler).toContain("if (!allActiveMembersPaid) return null;");
    expect(wholesaleSharedSource).not.toContain('member.paymentStatus === "test_confirmed"');
    expect(wholesaleSharedSource).not.toContain('(share.status === "submitted" || otherMembersPaid)');
  });

  it("serializes manual payment reversals with platform submission and never treats test-only payments as full", () => {
    const markStart = routeSource.indexOf('router.post("/wholesale-shares/:id/members/mark-payment"');
    const markEnd = routeSource.indexOf("// ── Admin: grouped view", markStart);
    const markHandler = routeSource.slice(markStart, markEnd);
    expect(markHandler).toContain("const [lockedShare] = await tx");
    expect(markHandler).toContain('if (!paid && (lockedShare.organiserPaymentStatus ?? "unpaid") !== "unpaid")');
    expect(markHandler).toContain('if (creatorUsesPlatformPayment) return "creator_platform_payment" as const;');
    expect(markHandler).not.toContain('o.paymentStatus === "test_confirmed"');

    const submitStart = routeSource.indexOf('router.post("/wholesale-shares/:id/organiser-payment"');
    const submitEnd = routeSource.indexOf("// Admin confirms the organiser's platform payment.", submitStart);
    const submitHandler = routeSource.slice(submitStart, submitEnd);
    const orderRead = submitHandler.slice(
      submitHandler.indexOf("const activeOrders ="),
      submitHandler.indexOf("const activeOrderById ="),
    );
    expect(orderRead).toContain('.for("update")');
  });

  it("does not count test-only payments as paid or let organisers manually pay their own forwarding order", () => {
    const start = wholesaleSharedSource.indexOf("const manuallyPayableMembers =");
    const end = wholesaleSharedSource.indexOf("const onwardModal =", start);
    const roster = wholesaleSharedSource.slice(start, end);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(roster).toContain("const showMemberPaymentRoster =");
    expect(roster).toContain("(!share.organiserPayment || !m.isCreator)");
    expect(roster).toContain('const memberPaymentPaidCount = manuallyPayableMembers.filter(m => m.paymentStatus === "confirmed").length;');
    expect(roster).toContain('const isPaid = m.paymentStatus === "confirmed";');
    expect(roster).toContain("disabled={isBusy || cannotReverse}");
  });

  it("does not let a test-payment request downgrade an already confirmed order", () => {
    const generateStart = paymentsSource.indexOf('router.post("/orders/:id/generate-test"');
    const submitStart = paymentsSource.indexOf('router.post("/orders/:id/submit-test"', generateStart);
    const payStart = paymentsSource.indexOf('router.post("/orders/:id/pay"', submitStart);
    const generateHandler = paymentsSource.slice(generateStart, submitStart);
    const submitHandler = paymentsSource.slice(submitStart, payStart);

    expect(generateHandler).toContain('ne(ordersTable.paymentStatus, "confirmed")');
    expect(generateHandler).toContain("if (!updated)");
    expect(submitHandler).toContain('if (order.paymentStatus === "confirmed")');
    expect(submitHandler).toContain('ne(ordersTable.paymentStatus, "confirmed")');
    expect(submitHandler).toContain("if (!updated)");
  });

  it("withholds platform wallet instructions until a positive payment can be submitted", () => {
    expect(wholesaleSharedSource).toContain("const paymentReady =");
    expect(wholesaleSharedSource).toContain('share.status !== "open"');
    expect(wholesaleSharedSource).toContain("amountDue !== null && amountDue > 0");
    expect(wholesaleSharedSource).toContain('op.status === "unpaid" && paymentReady && opts.length > 0');
    expect(wholesaleSharedSource).toContain("These are Peps Anonymous receiving wallets");
  });

  it("ignores historical orphan orders when auto-submitting a fully paid shared order", () => {
    const siblingQuery = wholesaleSubmitSource.slice(
      wholesaleSubmitSource.indexOf("const siblings ="),
      wholesaleSubmitSource.indexOf("if (siblings.length === 0)"),
    );

    expect(siblingQuery).toContain(".innerJoin(wholesaleShareMembersTable");
    expect(siblingQuery).toContain("wholesaleShareMembersTable.orderId");
    expect(siblingQuery).toContain("wholesaleShareMembersTable.shareId");
  });

  it("refreshes detail and grouped rows after every successful admin confirmation", () => {
    const confirmStart = adminSource.indexOf("const confirmOrgPayment = async (shareId: string) =>");
    const refreshDetailStart = adminSource.indexOf("const refreshDetail = async (shareId: string) =>");
    const confirmHandler = adminSource.slice(confirmStart, refreshDetailStart);

    expect(confirmStart).toBeGreaterThanOrEqual(0);
    expect(refreshDetailStart).toBeGreaterThan(confirmStart);
    expect(confirmHandler).toContain("if (!r.ok)");
    expect(confirmHandler).toContain("mutationConfirmed = true;");
    expect(confirmHandler).toContain("await Promise.all([refreshDetail(shareId), loadRows()]);");
    expect(confirmHandler).not.toContain("const r2 = await fetch");
    expect(confirmHandler).not.toContain("if (d.alreadyConfirmed)");
  });

  it("guards grouped-row commits by request generation, filter context, and mounted ownership", () => {
    const loadRowsStart = adminSource.indexOf("const loadRows = async () =>");
    const effectStart = adminSource.indexOf("useEffect(() => {", loadRowsStart);
    const loadRows = adminSource.slice(loadRowsStart, effectStart);
    const setRowsIndex = loadRows.indexOf("setRows(d.shares ?? []);");
    const commitGuard = loadRows.slice(0, setRowsIndex);

    expect(loadRowsStart).toBeGreaterThanOrEqual(0);
    expect(effectStart).toBeGreaterThan(loadRowsStart);
    expect(loadRows).toContain("const requestGeneration = ++rowsRequestGenerationRef.current;");
    expect(loadRows).toContain("rowsMountedRef.current");
    expect(loadRows).toContain("requestGeneration === rowsRequestGenerationRef.current");
    expect(loadRows).toContain("rowsContextRef.current.secret === requestSecret");
    expect(loadRows).toContain("rowsContextRef.current.statusFilter === requestStatusFilter");
    expect(loadRows).toMatch(
      /if \(\s*rowsMountedRef\.current\s*&&\s*requestGeneration === rowsRequestGenerationRef\.current/,
    );
    expect(commitGuard.lastIndexOf("if (")).toBeGreaterThanOrEqual(0);
    expect(commitGuard).toContain("rowsMountedRef.current");
    expect(commitGuard).toContain("requestGeneration === rowsRequestGenerationRef.current");
    expect(adminSource).toContain("rowsMountedRef.current = true;");
    expect(adminSource).toContain("rowsMountedRef.current = false;");
    expect(adminSource).toContain("rowsRequestGenerationRef.current += 1;");
  });
});
