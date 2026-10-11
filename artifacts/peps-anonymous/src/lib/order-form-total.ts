export function calculateOrderFormTotal(input: {
  lineTotals: number[];
  deliveryPrice: number;
  vendorShipping: number;
  tip: number;
  testingContribution: number;
  adminFee: number;
  isTopUp: boolean;
}): number {
  const subtotal = Number(input.lineTotals.reduce((sum, total) => sum + total, 0).toFixed(2));
  const shippingAndFee = input.isTopUp ? 0 : input.deliveryPrice + input.vendorShipping + input.adminFee;
  return Number(Math.max(0, subtotal + shippingAndFee + input.tip + input.testingContribution).toFixed(2));
}
