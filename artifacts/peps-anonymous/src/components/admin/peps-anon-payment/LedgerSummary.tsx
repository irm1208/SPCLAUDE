import React from "react";
import { cents, money, type Summary } from "./model";
import { card, subtle } from "../../reshipper-payouts/ui";

export function LedgerSummary({ summary, selectedCount, selectedTotal }: { summary: Summary; selectedCount: number; selectedTotal: bigint }) {
  const cells: [string, string, number, string, string][] = [
    ["Outstanding (payable)", summary.owed.amount, summary.owed.count, "var(--t-blue-deep)", "summary-owed"],
    ["Paid (active receipts)", summary.paid.amount, summary.paid.count, "#15803D", "summary-paid"],
    ["On hold / needs review", summary.needsReview.amount, summary.needsReview.count, "#B4770E", "summary-review"],
    ["Not owed", summary.notOwed.amount, summary.notOwed.count, "var(--t-subtle)", "summary-not-owed"],
  ];
  return <div className="space-y-2">
    <dl className="grid grid-cols-2 lg:grid-cols-5 gap-2 rounded-2xl border p-2" style={card} aria-label="Whole vendor ledger totals">
      {cells.map(([label, amount, count, tone, id]) => <div key={id} className="min-w-0 rounded-xl p-3" data-testid={`payment-${id}`}>
        <dt className="text-[11px]" style={subtle}>{label}</dt>
        <dd className="text-lg font-bold tabular-nums break-words" style={{ color: tone }}>{money(cents(amount))}</dd>
        <dd className="text-[11px]" style={subtle}>{count} {count === 1 ? "order" : "orders"} · USD</dd>
      </div>)}
      <div className="min-w-0 rounded-xl p-3 col-span-2 lg:col-span-1" style={{ background: "color-mix(in srgb, var(--t-blue) 9%, var(--t-surface))" }} data-testid="payment-summary-selected">
        <dt className="text-[11px]" style={subtle}>Selected for this receipt</dt>
        <dd className="text-lg font-bold tabular-nums" style={{ color: "var(--t-blue-deep)" }}>{money(selectedTotal)}</dd>
        <dd className="text-[11px]" style={subtle}>{selectedCount} {selectedCount === 1 ? "order" : "orders"} · USD</dd>
      </div>
    </dl>
    {summary.unavailableCount > 0 && <p role="status" className="rounded-xl border-l-4 p-3 text-xs" style={{ borderColor: "#E9A020", background: "color-mix(in srgb, #E9A020 8%, var(--t-surface))" }} data-testid="payment-summary-unavailable">
      {summary.unavailableCount} {summary.unavailableCount === 1 ? "order has" : "orders have"} an unavailable supplier cost. They are excluded from the amounts above and cannot be paid until corrected.
    </p>}
    <p className="text-[11px]" style={subtle}>Totals cover this vendor's whole ledger, not just the page shown. Supplier cost only; stale and on-hold shipments are never counted as owed.</p>
  </div>;
}
