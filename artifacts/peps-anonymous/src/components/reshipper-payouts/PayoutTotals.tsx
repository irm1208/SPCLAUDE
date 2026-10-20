import React from "react";
import type { PayoutData } from "../../lib/reshipper-payouts";
import { fmt } from "./money";
import { card, subtle } from "./ui";

export function PayoutTotals({ data }: { data: PayoutData }) {
  return <div className="space-y-3">
    {data.totals.length === 0 && <p className="text-sm" style={subtle}>No fees or postage recorded for this group buy yet.</p>}
    {data.totals.map(t => <dl key={t.currency} aria-label={`${t.currency.toUpperCase()} totals`}
      className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-2xl border p-3" style={card}>
      {([["Entitled", t.entitledMinor], ["Paid — recorded by Admin", t.paidMinor], ["Owed", t.owedMinor], ["On hold", t.onHoldMinor]] as const).map(([label, v], i) =>
        <div key={label} className="min-w-0 rounded-xl p-3" style={{ background: i === 2 ? "color-mix(in srgb, var(--t-blue) 9%, var(--t-surface))" : "transparent" }}>
          <dt className="text-[11px]" style={subtle}>{label}</dt>
          <dd className="text-lg font-bold tabular-nums break-words" style={{ color: i === 2 ? "var(--t-blue-deep)" : i === 3 && v > 0 ? "#b7791f" : "var(--t-text)" }}>{fmt(v, t.currency)}</dd>
        </div>)}
    </dl>)}
    {(data.needsReviewCount > 0 || data.totals.some(t => t.onHoldMinor > 0)) &&
      <div role="status" className="rounded-xl border-l-4 p-3 text-xs leading-relaxed" style={{ borderColor: "#E9A020", background: "color-mix(in srgb, #E9A020 8%, var(--t-surface))", color: "var(--t-text)" }}>
        <strong>{data.needsReviewCount} {data.needsReviewCount === 1 ? "order needs" : "orders need"} review.</strong>{" "}
        Older collections do not record who held the money. Amounts on hold stay out of the owed balance until an Admin confirms whether the Admin held them or the member paid the reshipper directly.
      </div>}
    {data.sourceNotice && <p className="text-[11px] leading-relaxed" style={subtle}>{data.sourceNotice}</p>}
    <p className="text-[11px]" style={subtle}>Payouts are records of money an Admin says was sent outside Peps Anonymous. Nothing is transferred or verified on-chain here.</p>
  </div>;
}
