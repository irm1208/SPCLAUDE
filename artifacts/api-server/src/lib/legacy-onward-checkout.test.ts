import { expect, it, vi } from "vitest";

vi.mock("@workspace/db", async () => ({
  ...await import("../../../../lib/db/src/schema/index"),
  db: {},
}));
const { validateEuDeliveryCheckout } = await import("./gb-onward-delivery");

it.each([undefined, null])("does not require retired matrix selection when checkout sends %s", async method => {
  // No DB methods are available: normal custom-postage checkout must not
  // consult the legacy estimate or demand a second delivery selection.
  await expect(validateEuDeliveryCheckout("gb", { username: "member" }, {
    shippingCountry: "IT", onwardDeliveryMethod: method,
    lineItems: [{ quantity: 1 }],
  })).resolves.toBe(false);
});
