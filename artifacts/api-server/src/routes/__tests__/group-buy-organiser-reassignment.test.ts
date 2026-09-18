import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const organiserAdminSource = readFileSync(new URL("../organiser-admin.ts", import.meta.url), "utf8");
const adminPageSource = readFileSync(
  new URL("../../../../peps-anonymous/src/pages/Admin.tsx", import.meta.url),
  "utf8",
);

describe("admin group-buy organiser reassignment", () => {
  it("exposes an admin-only ownership mutation for approved organisers and Admin ownership", () => {
    expect(organiserAdminSource).toContain(
      'router.patch("/admin/organiser-group-buys/:id/organiser"',
    );
    expect(organiserAdminSource).toContain('organiserStatus !== "approved"');
    expect(organiserAdminSource).toContain("requestedOrganiserUsername !== null");
    expect(organiserAdminSource).toContain("organiser_ownership_changed");
    expect(organiserAdminSource).toContain("groupBuysTable.organiserId");
  });

  it("keeps admin-owned group buys visible in the organiser admin list", () => {
    const listStart = organiserAdminSource.indexOf(
      'router.get("/admin/organiser-group-buys"',
    );
    const listEnd = organiserAdminSource.indexOf(
      'router.get("/admin/organiser-group-buys/:id"',
      listStart,
    );
    const listRoute = organiserAdminSource.slice(listStart, listEnd);

    expect(listRoute).not.toContain("isNotNull(groupBuysTable.organiserId)");
  });

  it("renders the reassignment control in the admin group-buy view", () => {
    expect(adminPageSource).toContain(
      "/admin/organiser-group-buys/${gbId}/organiser",
    );
    expect(adminPageSource).toContain("organiserUsername: selectedOrganiser");
    expect(adminPageSource).toContain("Admin (unassigned)");
  });
});