import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync(new URL("../wholesale-shares.ts", import.meta.url), "utf8");
const schema = readFileSync(new URL("../../../../../lib/db/src/schema/wholesale_shares.ts", import.meta.url), "utf8");
const startup = readFileSync(new URL("../../index.ts", import.meta.url), "utf8");
const page = readFileSync(new URL("../../../../peps-anonymous/src/pages/WholesaleShareEntry.tsx", import.meta.url), "utf8");

describe("shared-order personal visibility", () => {
  it("persists visibility on the member row and only allows that member to change it", () => {
    expect(schema).toContain('hiddenAt: timestamp("hidden_at"');
    expect(startup).toContain("ALTER TABLE wholesale_share_members ADD COLUMN IF NOT EXISTS hidden_at timestamptz");
    expect(route).toContain('router.patch("/wholesale-shares/:id/visibility", requireWholesale');
    expect(route).toMatch(/loadMember\(String\(req\.params\.id\), me\)/);
    expect(route).toMatch(/typeof hidden !== "boolean"/);
    expect(route).toMatch(/hiddenAt: hidden \? new Date\(\) : null/);
    expect(route).toContain("hidden: hiddenShareIds.has(s.id)");
  });

  it("allows a member to hide and restore a share without changing its status", () => {
    expect(page).toContain("Hidden shared orders");
    expect(page).toContain("Restore");
    expect(page).toContain("Hide");
    expect(page).toMatch(/s\.status !== "cancelled" && !s\.hidden/);
  });
});