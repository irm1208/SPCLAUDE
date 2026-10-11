export function OrderFormTotal({
  total, products, delivery, vendorShipping, adminFee, adminFeeLabel,
  tip, testing, shippingPending, formatPrice, hidden,
}: {
  total: number;
  products: number;
  delivery: number;
  vendorShipping: number;
  adminFee: number;
  adminFeeLabel: string | null;
  tip: number;
  testing: number;
  shippingPending: boolean;
  formatPrice: (amount: number) => string;
  hidden: boolean;
}) {
  if (hidden) return null;
  const rows = [
    { label: "Products", amount: products },
    { label: "Delivery", amount: delivery },
    ...(vendorShipping > 0 ? [{ label: "Vendor shipping", amount: vendorShipping }] : []),
    ...(adminFee > 0 ? [{ label: adminFeeLabel || "Admin fee", amount: adminFee }] : []),
    ...(testing > 0 ? [{ label: "Testing contribution", amount: testing }] : []),
    ...(tip > 0 ? [{ label: "Tip", amount: tip }] : []),
  ];
  return (
    <section aria-label="Order total" className="rounded-xl border p-4 space-y-3"
      style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
      <div className="space-y-1.5 text-sm" style={{ color: "var(--t-muted)" }}>
        {rows.map(row => (
          <div key={row.label} className="flex justify-between gap-4">
            <span>{row.label}</span>
            <span className="tabular-nums">{formatPrice(row.amount)}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-4 border-t pt-3"
        style={{ borderColor: "var(--t-border)" }}>
        <h2 className="text-base font-bold" style={{ color: "var(--t-text)" }}>Estimated total</h2>
        <span aria-live="polite" aria-atomic="true" className="text-xl font-bold tabular-nums"
          style={{ color: "var(--t-blue-deep)" }}>{formatPrice(total)}</span>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: "var(--t-muted)" }}>
        {shippingPending && <>Shipping still to be quoted is not included. </>}
        Final shipping is confirmed on Review Order, where you can also apply credits and discounts.
      </p>
    </section>
  );
}
