type SummaryShare = {
  status: string;
  organiserPaymentStatus: string;
  organiserPaymentReceivedUsd?: string | number | null;
  organiserHasWallet?: boolean;
};
type SummaryOrder = {
  status: string; deletedAt?: unknown; grandTotal: string | number;
  creditsApplied?: string | number | null;
  paymentStatus?: string; paymentTestAmount?: string | number | null;
  amountDue?: string | number | null; balancePaymentStatus?: string | null;
};

/** Admin-only: member order totals and platform receipts are different money flows. */
export function buildAdminSharedOrderSummary(share: SummaryShare, orders: SummaryOrder[]) {
  const recorded = orders.filter(order => !order.deletedAt);
  const active = recorded.filter(order => !["cancelled", "refunded"].includes(order.status.toLowerCase()));
  const shipped = active.filter(order => ["shipped", "delivered"].includes(order.status.toLowerCase())).length;
  const processed = active.filter(order => ["processed", "processing", "shipped", "delivered"].includes(order.status.toLowerCase())).length;
  const cancelled = share.status === "cancelled" || (orders.length > 0 && active.length === 0);
  const directPayments = share.organiserHasWallet === false;
  const fullyPaid = directPayments
    ? active.length > 0 && active.every(order => order.paymentStatus === "confirmed" && (Number(order.amountDue ?? 0) <= 0 || order.balancePaymentStatus === "confirmed"))
    : share.organiserPaymentStatus === "confirmed";
  const orderStatusPills: string[] = [];
  if (cancelled) orderStatusPills.push("Cancelled");
  else {
    if (share.status !== "open" && fullyPaid) orderStatusPills.push("Paid");
    if (active.length > 0 && shipped === active.length) orderStatusPills.push("Shipped");
    else if (shipped > 0) orderStatusPills.push(`Part shipped (${shipped}/${active.length})`);
    else if (active.length > 0 && processed === active.length) orderStatusPills.push("Processed");
    else if (processed > 0) orderStatusPills.push(`Part processed (${processed}/${active.length})`);
  }
  const received = share.organiserPaymentReceivedUsd == null ? NaN : Number(share.organiserPaymentReceivedUsd);
  return {
    orderStatusPills,
    sharedOrderTotal: Number((share.status === "cancelled" ? recorded : active).reduce((sum, order) => sum + Number(order.grandTotal) + Number(order.amountDue ?? 0), 0).toFixed(2)),
    platformPaymentReceived: directPayments
      ? Number(recorded.reduce((sum, order) => sum
        + (order.paymentStatus === "confirmed" ? Math.max(0, Number(order.grandTotal) - Math.max(0, Number(order.creditsApplied ?? 0))) : order.paymentStatus === "test_confirmed" ? Number(order.paymentTestAmount ?? 0) : 0)
        + (order.balancePaymentStatus === "confirmed" ? Number(order.amountDue ?? 0) : 0), 0).toFixed(2))
      : share.organiserPaymentStatus !== "confirmed"
      ? 0
      : Number.isFinite(received) && received >= 0 ? received : null,
  };
}
