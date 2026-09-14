import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const routeSource = fs.readFileSync(path.resolve(here, "../wholesale-shares.ts"), "utf8");
const autoVerifySource = fs.readFileSync(
  path.resolve(here, "../../lib/wholesale-organiser-payment-auto-verify.ts"),
  "utf8",
);
const schemaSource = fs.readFileSync(path.resolve(here, "../../../../../lib/db/src/schema/wholesale_shares.ts"), "utf8");
const adminSource = fs.readFileSync(
  path.resolve(here, "../../../../peps-anonymous/src/pages/Admin.tsx"),
  "utf8",
);
const adminRouteSource = fs.readFileSync(path.resolve(here, "../admin.ts"), "utf8");
const groupBuyAdminRouteSource = fs.readFileSync(path.resolve(here, "../group-buys-admin.ts"), "utf8");
const activeMembershipSource = fs.readFileSync(
  path.resolve(here, "../../lib/shared-order-active-membership.ts"),
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

  it("routes automatic verification through the confirmation service and notifies only confirmed results", () => {
    const checkShare = autoVerifySource.slice(
      autoVerifySource.indexOf("async function checkShare"),
      autoVerifySource.indexOf("// ── Scheduler run"),
    );
    const verificationIndex = checkShare.indexOf("const verification = await verifyTransaction");
    const unverifiedGuardIndex = checkShare.indexOf("if (!verification.verified)");
    const unverifiedReturnIndex = checkShare.indexOf("return;", unverifiedGuardIndex);
    const confirmationIndex = checkShare.indexOf("const confirmation = await confirmWholesaleOrganiserPayment");
    const confirmedBranchIndex = checkShare.indexOf('if (confirmation.kind === "confirmed")');
    const notificationIndex = checkShare.indexOf("notifyUser(", confirmedBranchIndex);
    const optionSelection = checkShare.slice(
      checkShare.indexOf("const opt ="),
      checkShare.indexOf("if (!opt?.walletAddress)"),
    );

    expect(verificationIndex).toBeGreaterThanOrEqual(0);
    expect(unverifiedGuardIndex).toBeGreaterThan(verificationIndex);
    expect(unverifiedReturnIndex).toBeGreaterThan(unverifiedGuardIndex);
    expect(confirmationIndex).toBeGreaterThan(unverifiedReturnIndex);
    expect(confirmedBranchIndex).toBeGreaterThan(confirmationIndex);
    expect(notificationIndex).toBeGreaterThan(confirmedBranchIndex);
    expect(checkShare).toContain('source: "automatic"');
    expect(checkShare).toContain("expectedPaymentIdentity");
    expect(checkShare).toContain("txHash");
    expect(checkShare).toContain("currency");
    expect(checkShare).toContain("network");
    expect(checkShare).toContain("network, 0.01");
    expect(optionSelection).toContain("options.find");
    expect(optionSelection).toContain("network.toLowerCase()");
    expect(optionSelection).not.toContain("options[0]");
    expect(optionSelection).not.toContain('o.currency.toUpperCase() === currency)');
    expect(checkShare).toContain("No exact admin wallet");
    expect(checkShare.slice(confirmationIndex)).not.toContain("else");
    expect(checkShare.slice(confirmationIndex)).not.toContain("Confirmation result for share");
    expect(autoVerifySource).not.toContain(".update(wholesaleSharesTable)");
    expect(autoVerifySource).not.toContain("wholesale_share_organiser_payment_auto_confirmed");
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

  it("submits organiser payment only through a conditional submitted-share update", () => {
    const start = routeSource.indexOf('router.post("/wholesale-shares/:id/organiser-payment"');
    const end = routeSource.indexOf("// Admin confirms the organiser's platform payment.", start);
    const handler = routeSource.slice(start, end);

    expect(handler).toContain("normalizeOrganiserWallets(share.leadCryptoOptions)");
    expect(handler).toContain("An organiser-owned wallet is required for this payment flow.");
    expect(handler).toContain('eq(wholesaleSharesTable.status, "submitted")');
    expect(handler).toContain("db.transaction(async (tx)");
    expect(handler).toContain('eq(wholesaleSharesTable.status, "submitted")');
    expect(handler).toContain('inArray(wholesaleSharesTable.organiserPaymentStatus, ["unpaid", "pending"])');
    expect(handler).toContain(".returning(");
    expect(handler).toContain("The shared order changed before this payment could be submitted.");
    expect(handler).not.toContain(".where(eq(wholesaleSharesTable.id, share.id));");
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
