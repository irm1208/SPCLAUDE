import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const routeSource = fs.readFileSync(path.resolve(here, "../wholesale-shares.ts"), "utf8");
const schemaSource = fs.readFileSync(path.resolve(here, "../../../../../lib/db/src/schema/wholesale_shares.ts"), "utf8");

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
});