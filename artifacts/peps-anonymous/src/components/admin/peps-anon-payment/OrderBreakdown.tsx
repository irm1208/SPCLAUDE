import React from "react";
import { moneyOf, fmtDate, type LineItem, type SourceOrder } from "./model";
import { subtle } from "../../reshipper-payouts/ui";

export type BreakdownSource = {
  sourceType?: "order" | "shared";
  sourceId?: string;
  submittedAt?: string | null;
  sourceOrders?: SourceOrder[];
  items?: LineItem[];
  productCost?: string | null;
  shippingCost?: string | null;
  totalCost?: string | number | null;
};

export function SourceRefs({ orders, shared }: { orders?: SourceOrder[]; shared: boolean }) {
  if (!orders?.length) return <p className="text-xs" style={subtle}>Original order references not provided.</p>;
  return <div className="space-y-1">
    <p className="text-[10px] font-bold uppercase tracking-widest" style={subtle}>
      {shared ? `Constituent orders (${orders.length}) · references only, not separate charges` : "Original order"}
    </p>
    <ul className="flex flex-wrap gap-1.5">
      {orders.map((s) => <li key={s.id} className="rounded-lg border px-2 py-1 text-xs" style={{ borderColor: "var(--t-border)" }}>
        <span className="font-mono font-semibold">{s.code ?? "Code not recorded"}</span>
        {s.username && <span className="ml-1.5" style={subtle}>{s.username}</span>}
      </li>)}
    </ul>
  </div>;
}

export function OrderBreakdown({ src, testId }: { src: BreakdownSource; testId?: string }) {
  const items = src.items ?? [];
  return <div className="space-y-3 text-xs" data-testid={testId}>
    <div className="flex flex-wrap gap-x-4 gap-y-1" style={subtle}>
      <span>Source: <strong style={{ color: "var(--t-text)" }}>{src.sourceType === "shared" ? "Shared order" : src.sourceType === "order" ? "Single order" : "Not recorded"}</strong></span>
      {src.sourceId && <span>Source ID: <span className="font-mono">{src.sourceId}</span></span>}
      <span>Submitted: {fmtDate(src.submittedAt, true)}</span>
    </div>
    <SourceRefs orders={src.sourceOrders} shared={src.sourceType === "shared"} />
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--t-border)" }}>
      <table className="w-full min-w-[420px] text-left tabular-nums">
        <thead style={{ background: "var(--t-bg)", color: "var(--t-subtle)" }}><tr>
          <th className="p-2">Product</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Supplier unit cost</th><th className="p-2 text-right">Line total</th>
        </tr></thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={4} className="p-2" style={subtle}>Line items unavailable for this submission.</td></tr>}
          {items.map((it, i) => <tr key={i} className="border-t" style={{ borderColor: "var(--t-border)" }}>
            <td className="p-2">{it.productName}</td><td className="p-2 text-right">{it.quantity ?? "Unavailable"}</td>
            <td className="p-2 text-right">{moneyOf(it.unitCost)}</td><td className="p-2 text-right font-semibold">{moneyOf(it.lineTotal)}</td>
          </tr>)}
        </tbody>
        <tfoot className="border-t" style={{ borderColor: "var(--t-border)" }}>
          <tr><td colSpan={3} className="p-2 text-right" style={subtle}>Product subtotal</td><td className="p-2 text-right">{moneyOf(src.productCost)}</td></tr>
          <tr><td colSpan={3} className="p-2 text-right" style={subtle}>Supplier shipping</td><td className="p-2 text-right">{moneyOf(src.shippingCost)}</td></tr>
          <tr><td colSpan={3} className="p-2 text-right font-bold">Supplier cost total (USD)</td><td className="p-2 text-right font-bold" style={{ color: "var(--t-blue-deep)" }}>{moneyOf(src.totalCost)}</td></tr>
        </tfoot>
      </table>
    </div>
    <p className="text-[11px]" style={subtle}>Submitted supplier-cost snapshot. Customer prices and margins are not shown.</p>
  </div>;
}
