import { describe, expect, it } from "vitest";
import { parsePoolInput, poolCosts, publicUser, checkPassword } from "./testmedaddy-core";

const input = {
  title: "Batch testing", visibility: "public", splitMode: "even", minMembers: 3,
  items: [{ testType: "Purity", priceUsd: 100.01, quantity: 2 }],
  shippingUsd: 10, organiserTipUsd: 0,
};
describe("Testmedaddy core contracts", () => {
  it("calculates estimates in cents, without claiming payments", () => {
    const costs = poolCosts(parsePoolInput(input));
    expect(costs).toEqual({ tests: 200.02, shipping: 10, tip: 0, subtotal: 210.02, feePct: 0, fee: 0, target: 210.02, share: 70.01 });
  });
  it("rejects negative, fractional-quantity and hidden payment fields", () => {
    expect(() => parsePoolInput({ ...input, shippingUsd: -1 })).toThrow();
    expect(() => parsePoolInput({ ...input, items: [{ testType: "Purity", priceUsd: 10, quantity: 1.5 }] })).toThrow();
    expect(() => parsePoolInput({ ...input, status: "funded" })).toThrow();
    expect(() => parsePoolInput({ ...input, paymentMethods: { crypto: [] } })).toThrow();
  });
  it("requires real fixed shares and coherent membership limits", () => {
    expect(() => parsePoolInput({ ...input, splitMode: "fixed" })).toThrow();
    expect(() => parsePoolInput({ ...input, maxMembers: 2 })).toThrow();
    expect(poolCosts(parsePoolInput({ ...input, splitMode: "fixed", fixedShareUsd: 15 })).share).toBe(15);
  });
  it("rejects excessive amounts, non-HTTPS links and unsupported batch identifiers", () => {
    expect(() => parsePoolInput({ ...input, items: [{ testType: "Purity", priceUsd: 1000000, quantity: 1000 }] })).toThrow();
    expect(() => parsePoolInput({ ...input, items: [{ testType: "Purity", priceUsd: 1, quantity: 1, labOrderUrl: "javascript:alert(1)" }] })).toThrow();
    expect(() => parsePoolInput({ ...input, items: [{ testType: "Purity", priceUsd: 1, quantity: 1, batchId: "other-site-batch" }] })).toThrow();
  });
  it("never serializes account emails, password hashes or session secrets in public identities", () => {
    const user = publicUser({ id: "test", handle: "tester", display_name: "Tester", bio: null, created_at: new Date(0), email: "private@example.invalid", password_hash: "secret" });
    expect(Object.keys(user).sort()).toEqual(["avatarKey", "bio", "createdAt", "displayName", "handle", "id"].sort());
    expect(JSON.stringify(user)).not.toContain("secret");
  });
  it("does not accept passwords bcrypt would silently truncate", () => {
    expect(() => checkPassword("short")).toThrow();
    expect(() => checkPassword("a".repeat(73))).toThrow();
    expect(() => checkPassword("🧪".repeat(20))).toThrow();
    expect(checkPassword("a sufficiently long password")).toBe("a sufficiently long password");
  });
});
