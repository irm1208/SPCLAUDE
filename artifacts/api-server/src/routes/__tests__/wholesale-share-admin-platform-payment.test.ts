import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const routeSource = fs.readFileSync(path.resolve(here, "../wholesale-shares.ts"), "utf8");
const adminSource = fs.readFileSync(
  path.resolve(here, "../../../../peps-anonymous/src/pages/Admin.tsx"),
  "utf8",
);

describe("admin shared-order platform payment", () => {
  it("keeps the admin action on the organiser platform-payment confirmation flow", () => {
    expect(routeSource).toContain(
      'router.post("/admin/wholesale-shares/:id/confirm-organiser-payment"',
    );
    expect(routeSource).toContain("confirmWholesaleOrganiserPayment");
    expect(routeSource).toContain('organiserPaymentStatus: s.organiserPaymentStatus ?? "unpaid"');
    expect(routeSource).not.toContain(
      'router.post("/admin/wholesale-shares/:id/mark-all-paid"',
    );
  });

  it("keeps the organiser confirmation control on the platform-payment panel", () => {
    expect(adminSource).toContain("/admin/wholesale-shares/${shareId}/confirm-organiser-payment");
    expect(adminSource).toContain("✓ Confirm platform payment");
    expect(adminSource).toContain("Could not confirm organiser payment");
    expect(adminSource).toContain("Organiser payment was confirmed, but refreshing");
    expect(adminSource).not.toContain("mark-all-paid");
    expect(adminSource).not.toContain("Mark all paid");
  });

  it("includes organiser payment details in the admin detail response without exposing them to members", () => {
    const adminDetailRoute = routeSource
      .split('router.get("/admin/wholesale-shares/:id"')[1]
      ?.split('router.post("/admin/wholesale-shares/:id/repair-orphan-orders"')[0];
    expect(adminDetailRoute).toContain('buildShareResponse(share, "", { includeOrganiserPaymentForAdmin: true })');
    expect(routeSource).toContain("!isCreatorViewer && !includeOrganiserPaymentForAdmin");
    expect(routeSource.match(/includeOrganiserPaymentForAdmin: true/g)).toHaveLength(1);
  });
});