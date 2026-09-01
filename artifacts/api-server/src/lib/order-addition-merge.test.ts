import { describe, expect, it } from "vitest";

type MergeCalculator = (input: {
  parentProductSubtotal: number;
  parentGrandTotal: number;
  parentAmountDue: number;
  parentTip: number;
  parentTestingContribution: number;
  addedProductSubtotal: number;
  addedTotal: number;
  addedAmountDue?: number;
  addedTip: number;
  addedTestingContribution: number;
}) => {
  productSubtotal: number;
  grandTotal: number;
  amountDue: number;
  tip: number;
  testingContribution: number;
};

let calculateAdditionMerge: MergeCalculator | undefined;
try {
  ({ calculateAdditionMerge } = await import("./order-addition-merge"));
} catch {
  // The first red run intentionally happens before the implementation exists.
}

describe("calculateAdditionMerge", () => {
  it("adds new items to the paid parent and charges only the increment", () => {
    expect(calculateAdditionMerge).toBeTypeOf("function");

    expect(calculateAdditionMerge!({
      parentProductSubtotal: 110,
      parentGrandTotal: 110,
      parentAmountDue: 0,
      parentTip: 0,
      parentTestingContribution: 0,
      addedProductSubtotal: 120,
      addedTotal: 120,
      addedTip: 0,
      addedTestingContribution: 0,
    })).toEqual({
      productSubtotal: 230,
      grandTotal: 230,
      amountDue: 120,
      tip: 0,
      testingContribution: 0,
    });
  });

  it("increments an existing balance and rounds monetary values", () => {
    expect(calculateAdditionMerge).toBeTypeOf("function");

    expect(calculateAdditionMerge!({
      parentProductSubtotal: 10.01,
      parentGrandTotal: 13.34,
      parentAmountDue: 3.33,
      parentTip: 1.11,
      parentTestingContribution: 2.22,
      addedProductSubtotal: 4.44,
      addedTotal: 5.56,
      addedTip: 0.56,
      addedTestingContribution: 0.56,
    })).toEqual({
      productSubtotal: 14.45,
      grandTotal: 18.9,
      amountDue: 8.89,
      tip: 1.67,
      testingContribution: 2.78,
    });
  });

  it("adds the gross total while charging only the post-credit balance", () => {
    expect(calculateAdditionMerge).toBeTypeOf("function");

    expect(calculateAdditionMerge!({
      parentProductSubtotal: 110,
      parentGrandTotal: 110,
      parentAmountDue: 0,
      parentTip: 0,
      parentTestingContribution: 0,
      addedProductSubtotal: 120,
      addedTotal: 120,
      addedAmountDue: 70,
      addedTip: 0,
      addedTestingContribution: 0,
    })).toMatchObject({
      grandTotal: 230,
      amountDue: 70,
    });
  });
});