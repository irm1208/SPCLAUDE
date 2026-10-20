import { expect, it } from "vitest";
import { reviewShippingRequirements, validateReviewShippingDetails } from "./review-shipping-details";

const eu = {
  groupBuyId: "hgh", deliveryMethodId: "eu-postage-IT-home", directShippingRequested: false,
  additionOfOrderId: null, orderType: null,
  shippingName: "Test Member", shippingAddress: "1 Example Street, Rome", shippingCountry: "Italy",
  shippingPhone: "+39 123456789", shippingEmail: "test@example.com",
};
it("collects EU contact details on review and requires every contact field", () => {
  expect(reviewShippingRequirements(eu)).toEqual({ show: true, requireEuContact: true });
  expect(validateReviewShippingDetails(eu)).toBeNull();
  for (const field of ["shippingName", "shippingAddress", "shippingCountry", "shippingPhone", "shippingEmail"]) {
    expect(validateReviewShippingDetails({ ...eu, [field]: " " })).not.toBeNull();
  }
  expect(validateReviewShippingDetails({ ...eu, shippingPhone: "abc" })).toMatch(/mobile/);
  expect(validateReviewShippingDetails({ ...eu, shippingEmail: "invalid" })).toMatch(/email/);
});
it("validates direct shipping and ordinary orders without imposing EU-only fields", () => {
  for (const draft of [{ ...eu, directShippingRequested: true }, { ...eu, groupBuyId: null }]) {
    expect(reviewShippingRequirements(draft)).toEqual({ show: true, requireEuContact: false });
    expect(validateReviewShippingDetails({ ...draft, shippingPhone: "", shippingEmail: "", shippingCountry: "" })).toBeNull();
    expect(validateReviewShippingDetails({ ...draft, shippingAddress: "" })).toMatch(/address/);
  }
});
it("does not request a new address for top-ups or label-only GB delivery", () => {
  for (const draft of [{ ...eu, additionOfOrderId: "parent" }, { ...eu, deliveryMethodId: "uk-label" }]) {
    expect(reviewShippingRequirements(draft).show).toBe(false);
    expect(validateReviewShippingDetails({ ...draft, shippingName: "", shippingAddress: "" })).toBeNull();
  }
});
