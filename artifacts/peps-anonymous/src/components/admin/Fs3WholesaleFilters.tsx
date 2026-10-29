export function Fs3WholesaleFilters({ payment, status, onChange }: {
  payment: string; status: string; onChange: (payment: string, status: string) => void;
}) {
  const style = "text-sm border border-border rounded-md px-2 py-1 bg-background";
  return <>
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
      Payment
      <select aria-label="Wholesale payment" value={payment} className={style}
        onChange={e => onChange(e.target.value, status)}>
        <option value="">All payments</option>
        <option value="paid">Paid</option>
        <option value="unpaid">Unpaid / awaiting confirmation</option>
      </select>
    </label>
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
      Order status
      <select aria-label="Wholesale order status" value={status} className={style}
        onChange={e => onChange(payment, e.target.value)}>
        <option value="">All statuses</option>
        {["Submitted", "Processing", "Shipped", "Completed"].map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </label>
    <button type="button" className="text-xs rounded-md border border-primary px-2.5 py-1 text-primary font-semibold"
      aria-pressed={payment === "paid" && status === "Submitted"}
      onClick={() => onChange("paid", "Submitted")}>Paid + Submitted</button>
  </>;
}
