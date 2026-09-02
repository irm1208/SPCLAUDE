export function getWholesaleAccessOutstandingAmount(input: {
  amountUsd: number;
  paymentTestAmount: number | null;
  testPaymentTxHash: string | null;
}): number {
  const testPaid = input.testPaymentTxHash ? (input.paymentTestAmount ?? 0) : 0;
  return Math.max(0, Math.round((input.amountUsd - testPaid) * 100) / 100);
}