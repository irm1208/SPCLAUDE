import { describe, expect, it, vi } from "vitest";
vi.mock("../routes/config", () => ({ getVendors: async () => [{ id: "vendor-a", name: "JBG/YT" }] }));
import { vendorDisplayNameInput } from "./vendor-account-input";
import { vendorAccess } from "./vendor-portal-service";
import { publicVendorAccount } from "./vendor-account-store";
function database(displayName: string | null) {
  const query: any = { from: () => query, where: async () => [{ username: "supplier", vendorId: "vendor-a", status: "active", displayName }] };
  return { select: () => query };
}
describe("account-specific vendor display names", () => {
  it("validates optional names and trims whitespace", () => {
    expect(vendorDisplayNameInput("  Northstar Labs  ")).toBe("Northstar Labs");
    expect(vendorDisplayNameInput("")).toBeNull();
    expect(vendorDisplayNameInput(null)).toBeNull();
    for (const bad of [123, "a".repeat(101), "Bad\nName"]) expect(() => vendorDisplayNameInput(bad)).toThrow(/display name/i);
  });
  it("uses the account name while retaining vendor assignment and username", async () => {
    expect(await vendorAccess(database("Northstar Labs"), "supplier")).toEqual({ vendorId: "vendor-a", vendorName: "Northstar Labs", username: "supplier" });
  });
  it("falls back to the linked vendor name for an empty override", async () => {
    expect((await vendorAccess(database(null), "supplier")).vendorName).toBe("JBG/YT");
  });
  it("includes the saved override in the public admin account response", () => {
    expect(publicVendorAccount({ username: "supplier", displayName: "Northstar Labs", passwordHash: "secret" } as any).displayName).toBe("Northstar Labs");
  });
});
