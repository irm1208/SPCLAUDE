import React from "react";
import { Wallet, Truck } from "lucide-react";
import { reshipperCollections, type ReshipperCollectionOrder } from "../lib/reshipper-collections";

export function ReshipperCollectionsCard({ orders, reshipperUsername, currency = "USD" }: {
  orders: ReshipperCollectionOrder[]; reshipperUsername: string; currency?: string;
}) {
  let totals: ReturnType<typeof reshipperCollections>;
  try { totals = reshipperCollections(orders, reshipperUsername, currency); }
  catch (error) {
    return <section role="alert" className="rounded-2xl border p-4" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text)" }}>
      <h2 className="text-sm font-bold">Totals unavailable</h2>
      <p className="mt-1 text-xs">{error instanceof Error ? error.message : "Refresh to load collection totals."}</p>
    </section>;
  }
  const money = (value: number, code = currency) => `${code.toUpperCase()} ${new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 100)}`;
  return <section aria-label="Admin fees and member postage collected" className="rounded-2xl border p-4 sm:p-5"
    style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
      <h2 className="flex items-center gap-2 text-sm font-bold" style={{ color: "var(--t-text)" }}>
        <Wallet className="w-4 h-4" style={{ color: "var(--t-blue)" }} /> Fees &amp; postage collected
      </h2>
      <span className="text-xs" style={{ color: "var(--t-subtle)" }}>{totals.paidOrderCount} fully paid {totals.paidOrderCount === 1 ? "order" : "orders"}</span>
    </div>
    <dl className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3">
      <div className="min-w-0 rounded-xl p-3 sm:p-4" style={{ background: "color-mix(in srgb, var(--t-blue) 7%, var(--t-surface))" }}>
        <dt className="text-xs mb-2" style={{ color: "var(--t-subtle)" }}>Admin fees collected</dt>
        <dd className="text-xl sm:text-2xl font-bold tabular-nums break-words" style={{ color: "var(--t-blue-deep)" }}>{money(totals.adminFeesCents)}</dd>
      </div>
      <div className="min-w-0 rounded-xl p-3 sm:p-4" style={{ background: "color-mix(in srgb, var(--t-blue) 7%, var(--t-surface))" }}>
        <dt className="text-xs mb-2 flex items-center gap-1.5" style={{ color: "var(--t-subtle)" }}><Truck className="w-3.5 h-3.5 shrink-0" />Member postage collected</dt>
        <dd className="text-xl sm:text-2xl font-bold tabular-nums break-words" style={{ color: "var(--t-blue-deep)" }}>
          {money(totals.postageCents)}
          {totals.otherPostage.map(total => <span key={total.currency} className="block text-base mt-1">{money(total.cents, total.currency)}</span>)}
        </dd>
      </div>
    </dl>
    <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "var(--t-subtle)" }}>
      This group buy, orders assigned to you only. Order fees/postage count once fully paid, with no balance due; confirmed separate onward payments are also included. Vendor shipping excluded. These are paid charges, not a live wallet balance.
    </p>
  </section>;
}
