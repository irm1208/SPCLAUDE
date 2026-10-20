import { expect, it } from "vitest";
import { directShippingMessageSchema } from "./direct-shipping-message";
it("stores custom copy as plain text with whitespace trimmed", () => {
  expect(directShippingMessageSchema.parse("  Delivery from our supplier.\nContact us for a quote.  ")).toBe("Delivery from our supplier.\nContact us for a quote.");
});
it("clears blank copy so existing automatic descriptions remain the default", () => {
  expect(directShippingMessageSchema.parse("   ")).toBe(null);
  expect(directShippingMessageSchema.parse(null)).toBe(null);
});
it.each([123, {}, true, "x".repeat(501)])("rejects invalid or oversized messages", value => {
  expect(directShippingMessageSchema.safeParse(value).success).toBe(false);
});
it("accepts exactly 500 characters", () => {
  expect(directShippingMessageSchema.parse("x".repeat(500))).toHaveLength(500);
});
