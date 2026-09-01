export interface AdditionMergeInput {
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
}

export interface AdditionMergeResult {
  productSubtotal: number;
  grandTotal: number;
  amountDue: number;
  tip: number;
  testingContribution: number;
}

function money(value: number): number {
  return Number(value.toFixed(2));
}

export function calculateAdditionMerge(input: AdditionMergeInput): AdditionMergeResult {
  return {
    productSubtotal: money(input.parentProductSubtotal + input.addedProductSubtotal),
    grandTotal: money(input.parentGrandTotal + input.addedTotal),
    amountDue: money(input.parentAmountDue + (input.addedAmountDue ?? input.addedTotal)),
    tip: money(input.parentTip + input.addedTip),
    testingContribution: money(
      input.parentTestingContribution + input.addedTestingContribution,
    ),
  };
}