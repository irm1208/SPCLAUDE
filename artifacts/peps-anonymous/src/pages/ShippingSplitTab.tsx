import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, RefreshCw, Truck } from "lucide-react";

type ShippingOrder = {
  id: string;
  code?: string | null;
  telegramUsername: string;
  status: string;
  paymentStatus: string;
  shippingCountry?: string | null;
  grandTotal: number;
  vendorShipping?: number;
  amountDue?: number;
  lineItems?: Array<{ quantity: number }>;
};

function allocate(total: number, equalPct: number, orders: ShippingOrder[]): Record<string, number> {
  if (!orders.length) return {};
  const weightedPct = 100 - equalPct;
  const cents = Math.round(total * 100);
  const totalQty = orders.reduce((sum, order) => sum + (order.lineItems ?? []).reduce((s, item) => s + Number(item.quantity || 0), 0), 0);
  let assigned = 0;
  return Object.fromEntries(orders.map((order, index) => {
    const quantity = (order.lineItems ?? []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const share = (equalPct / 100) / orders.length + (totalQty > 0 ? (weightedPct / 100) * quantity / totalQty : 0);
    const value = index === orders.length - 1 ? cents - assigned : Math.round(cents * share);
    assigned += value;
    return [order.id, value / 100];
  }));
}

export default function ShippingSplitTab({ groupBuy }: { groupBuy: { id: string; name: string; currency?: string | null } }) {
  const [orders, setOrders] = useState<ShippingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [total, setTotal] = useState("");
  const [equalPct, setEqualPct] = useState(80);
  const [status, setStatus] = useState("Submitted");
  const [payment, setPayment] = useState("all");
  const [included, setIncluded] = useState<Record<string, boolean>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/organiser/group-buys/${groupBuy.id}/orders`, { credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load orders");
      setOrders(data);
      setIncluded(Object.fromEntries(data.map((order: ShippingOrder) => [order.id, true])));
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to load orders"); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [groupBuy.id]);

  const filtered = useMemo(() => orders.filter(order =>
    order.status === status &&
    (payment === "all" || (payment === "paid"
      ? ["confirmed", "test_confirmed"].includes(order.paymentStatus)
      : order.paymentStatus === "unpaid"))
  ), [orders, payment, status]);
  const selected = filtered.filter(order => included[order.id] !== false);

  useEffect(() => {
    const automatic = allocate(Number(total) || 0, equalPct, selected);
    setAmounts(Object.fromEntries(Object.entries(automatic).map(([id, amount]) => [id, amount.toFixed(2)])));
  }, [total, equalPct, status, payment, selected.map(order => order.id).join("|")]);

  const assignedTotal = selected.reduce((sum, order) => sum + (Number(amounts[order.id]) || 0), 0);
  const targetTotal = Number(total) || 0;
  const totalsMatch = Math.round(assignedTotal * 100) === Math.round(targetTotal * 100);

  const apply = async () => {
    if (!selected.length || !totalsMatch) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const response = await fetch(`/api/organiser/group-buys/${groupBuy.id}/apply-shipping`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalShipping: targetTotal,
          equalPct,
          weightedPct: 100 - equalPct,
          statusFilter: status,
          paymentStatusFilter: payment,
          assignments: selected.map(order => ({ orderId: order.id, amount: Number(amounts[order.id]) })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to apply shipping");
      setSuccess(data.message);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to apply shipping"); }
    finally { setSaving(false); }
  };

  const inputClass = "h-10 rounded-lg border px-3 text-sm outline-none";
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>Vendor Shipping Split</h2>
        <p className="text-sm" style={{ color: "var(--t-subtle)" }}>Split the supplier shipping bill automatically, then adjust any member manually before applying.</p>
      </div>
      <div className="rounded-xl border p-4 space-y-4" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1"><span className="text-xs font-semibold">Total shipping ({groupBuy.currency ?? "GBP"})</span><input className={`${inputClass} w-full`} type="number" min="0" step="0.01" value={total} onChange={e => setTotal(e.target.value)} /></label>
          <label className="space-y-1"><span className="text-xs font-semibold">Equal portion: {equalPct}%</span><input className="w-full mt-3" type="range" min="0" max="100" value={equalPct} onChange={e => setEqualPct(Number(e.target.value))} /></label>
          <label className="space-y-1"><span className="text-xs font-semibold">Order status</span><select className={`${inputClass} w-full`} value={status} onChange={e => setStatus(e.target.value)}>{["Submitted","Processing","Shipped","Completed"].map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="space-y-1"><span className="text-xs font-semibold">Payment</span><select className={`${inputClass} w-full`} value={payment} onChange={e => setPayment(e.target.value)}><option value="all">All</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option></select></label>
        </div>
        <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ background: "var(--t-surface2)" }}>
          <span>{selected.length} orders selected · {equalPct}% equal / {100 - equalPct}% by quantity</span>
          <span className="font-bold" style={{ color: totalsMatch ? "#16A34A" : "#DC2626" }}>{assignedTotal.toFixed(2)} / {targetTotal.toFixed(2)}</span>
        </div>
      </div>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }}>
        {loading ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div> : filtered.length === 0 ? <p className="p-8 text-center text-sm" style={{ color: "var(--t-subtle)" }}>No orders match these filters.</p> : filtered.map(order => (
          <div key={order.id} className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_120px_140px] gap-3 items-center p-3 border-b last:border-b-0" style={{ borderColor: "var(--t-border)" }}>
            <input type="checkbox" checked={included[order.id] !== false} onChange={e => setIncluded(current => ({ ...current, [order.id]: e.target.checked }))} />
            <div className="min-w-0"><p className="font-semibold text-sm truncate">@{order.telegramUsername}</p><p className="text-xs" style={{ color: "var(--t-subtle)" }}>{order.code} · {order.shippingCountry || "Country not set"} · {order.paymentStatus.replaceAll("_", " ")}</p></div>
            <span className="hidden sm:block text-xs text-right" style={{ color: "var(--t-subtle)" }}>Current {(order.vendorShipping ?? 0).toFixed(2)}</span>
            <label className="flex items-center gap-2"><span className="text-xs">{groupBuy.currency ?? "GBP"}</span><input className={`${inputClass} w-24 text-right`} type="number" min="0" step="0.01" disabled={included[order.id] === false} value={amounts[order.id] ?? "0.00"} onChange={e => setAmounts(current => ({ ...current, [order.id]: e.target.value }))} /></label>
          </div>
        ))}
      </div>
      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
      {success ? <p className="text-sm font-semibold text-green-600 flex items-center gap-1"><Check className="w-4 h-4" />{success}</p> : null}
      <div className="flex gap-2">
        <button type="button" onClick={() => void load()} className="h-10 px-4 rounded-lg border text-sm font-semibold flex items-center gap-2" style={{ borderColor: "var(--t-border)" }}><RefreshCw className="w-4 h-4" />Refresh</button>
        <button type="button" onClick={() => void apply()} disabled={saving || !selected.length || !totalsMatch} className="h-10 px-5 rounded-lg text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50" style={{ background: "var(--t-blue-deep)" }}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}Apply shipping costs</button>
      </div>
    </div>
  );
}