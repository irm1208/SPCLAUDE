import { expect, it } from "vitest";
import { resolvePostageReshipper, assertDirectShippingEligible, validatePostageRouting } from "./group-buy-delivery-routing";

const assignments = [
  { reshipperUsername: "fazi28", country: "AT", countries: ["AT", "IT", "DE"], enabled: true },
  { reshipperUsername: "uk", country: "UK", countries: null, enabled: true },
];
it("matches all assigned countries and country aliases, not just the first country", () => {
  expect(resolvePostageReshipper(undefined, "Germany", assignments)).toBe("fazi28");
  expect(resolvePostageReshipper(undefined, "IT", assignments)).toBe("fazi28");
  expect(resolvePostageReshipper(undefined, "GB", assignments)).toBe("uk");
  expect(resolvePostageReshipper(undefined, "US", assignments)).toBeNull();
});
it("honours explicit postage routing and rejects stale or out-of-country recipients", () => {
  expect(resolvePostageReshipper("fazi28", "Italy", assignments)).toBe("fazi28");
  expect(() => resolvePostageReshipper("uk", "Italy", assignments)).toThrow(/reshipper/i);
  expect(() => resolvePostageReshipper("fazi28", "IT", assignments.map(a => ({ ...a, enabled: false })))).toThrow(/reshipper/i);
  expect(validatePostageRouting([{ country: "DE", reshipperUsername: "fazi28" }], assignments)).toBeNull();
  expect(validatePostageRouting([{ country: "DE", reshipperUsername: "uk" }], assignments)).toMatch(/reshipper/i);
});
it("does not guess among multiple reshippers or count duplicate assignments twice", () => {
  expect(resolvePostageReshipper(undefined, "IT", [...assignments, assignments[0]])).toBe("fazi28");
  expect(resolvePostageReshipper(undefined, "IT", [...assignments, { ...assignments[0], reshipperUsername: "another" }])).toBeNull();
});
it("enforces the configured direct-shipping threshold on the server, including half kits", () => {
  const group = { directShippingEnabled: true, directShippingMinKits: "30" };
  expect(() => assertDirectShippingEligible(group, [{ quantity: 29.5 }])).toThrow(/30 kits/);
  expect(() => assertDirectShippingEligible(group, [{ quantity: 29.5 }, { quantity: 0.5 }])).not.toThrow();
  expect(() => assertDirectShippingEligible(group, [{ quantity: 31 }])).not.toThrow();
  expect(() => assertDirectShippingEligible({ ...group, directShippingEnabled: false }, [{ quantity: 100 }])).toThrow(/enabled/);
  expect(() => assertDirectShippingEligible(group, [{ quantity: -1 }, { quantity: 100 }])).toThrow();
  expect(() => assertDirectShippingEligible({ ...group, directShippingMinKits: "40" }, [{ quantity: 30 }])).toThrow(/40 kits/);
});
