import { describe, expect, it } from "vitest";
import { calculateWholesaleOrganiserAmountDue } from "./wholesale-organiser-payment-amount";

describe("calculateWholesaleOrganiserAmountDue", () => {
  it("deducts member-applied credits from the shared order payable amount", () => {
    expect(calculateWholesaleOrganiserAmountDue(
      [
        { items: [{ quantity: 2, unitPrice: "50.00" }], creditsApplied: "25.00" },
      ],
      "5.00",
    )).toBe(80);
  });

  it("does not allow credits to make the payable amount negative", () => {
    expect(calculateWholesaleOrganiserAmountDue(
      [
        { items: [{ quantity: 1, unitPrice: "10.00" }], creditsApplied: "25.00" },
      ],
      "5.00",
    )).toBe(0);
  });

  it("does not treat unknown vendor shipping as free shipping", () => {
    expect(calculateWholesaleOrganiserAmountDue(
      [{ items: [{ quantity: 1, unitPrice: "995.00" }], creditsApplied: 0 }],
      null,
    )).toBeNull();
  });
});