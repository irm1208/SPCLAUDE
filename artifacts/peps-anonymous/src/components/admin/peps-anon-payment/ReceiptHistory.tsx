import React, { useState } from "react";
import { fmtDate, moneyOf, paginate, type Receipt } from "./model";
import { OrderBreakdown } from "./OrderBreakdown";
import { Pager } from "./LedgerOrders";
import { SectionLabel, subtle } from "../../reshipper-payouts/ui";

export function ReceiptHistory({ payments, locked, onVoid }: { payments: Receipt[]; locked: boolean; onVoid: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const view = paginate(payments, page);
  return <section aria-label="Payment history" className="space-y-2">
    <SectionLabel>Receipt history ({payments.length})</SectionLabel>
    {payments.length === 0 && <p className="rounded-xl border border-dashed p-4 text-sm" style={{ borderColor: "var(--t-border)", color: "var(--t-subtle)" }}>No payment records for this vendor yet.</p>}
    <ul className="space-y-2">
      {view.rows.map((p) => {
        const isOpen = open.has(p.id);
        return <li key={p.id} className="rounded-xl border p-3 text-sm" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)", opacity: p.voidedAt ? 0.8 : 1 }} data-testid={`payment-receipt-${p.id}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className={`font-bold tabular-nums ${p.voidedAt ? "line-through" : ""}`}>{p.cryptoAmount} {p.currency} · {moneyOf(p.usdAmount)} USD allocated</span>
            <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: p.voidedAt ? "#b91c1c" : "#15803D" }}>{p.voidedAt ? "Voided · allocations released" : "Recorded by Admin · external transfer, not blockchain verified"}</span>
          </div>
          <p className="text-xs mt-1" style={subtle}>To {p.walletSnapshot.label ? `${p.walletSnapshot.label} · ` : ""}{p.walletSnapshot.currency} / {p.walletSnapshot.network} (destination at time of recording)</p>
          <code className="block text-xs break-all select-all">{p.walletSnapshot.address}</code>
          <p className="text-xs mt-1 break-all" style={subtle}>TXID: <span className="font-mono select-all">{p.txid}</span></p>
          <p className="text-[11px]" style={subtle}>Paid {fmtDate(p.paidAt, true)} · Recorded {fmtDate(p.recordedAt, true)} by {p.recordedBy}{p.note ? ` · ${p.note}` : ""}</p>
          {p.voidedAt && <p className="text-xs mt-1" style={{ color: "#b91c1c" }}>Voided {fmtDate(p.voidedAt, true)}: {p.voidReason}</p>}
          <button type="button" className="mt-2 text-xs underline" style={{ color: "var(--t-blue)" }} aria-expanded={isOpen}
            onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })} data-testid={`payment-receipt-expand-${p.id}`}>
            {isOpen ? "Hide" : "Show"} orders covered by this payment ({p.orders.length})
          </button>
          {isOpen && <ul className="mt-2 space-y-2">
            {p.orders.map((o) => <li key={o.submissionId} className="rounded-lg border p-2" style={{ borderColor: "var(--t-border)" }}>
              <p className="flex justify-between gap-2 text-xs"><span className="font-mono font-semibold break-all">{o.reference}</span><span className="tabular-nums font-semibold">{moneyOf(o.amountUsd)} allocated</span></p>
              {o.detail
                ? <div className="mt-2"><OrderBreakdown src={o.detail} /></div>
                : <p className="mt-1 text-[11px]" style={{ color: "#B4770E" }}>Breakdown not recorded for this receipt. Only the allocated amount was saved at the time; current order data is not used to reconstruct it.</p>}
            </li>)}
          </ul>}
          {!p.voidedAt && <div className="mt-2"><button type="button" disabled={locked} className="text-xs font-semibold underline disabled:opacity-40" style={{ color: "#b91c1c" }} onClick={() => onVoid(p.id)}>Void record</button></div>}
        </li>;
      })}
    </ul>
    <Pager page={view.page} pages={view.pages} onPage={setPage} prefix="payment-history" />
  </section>;
}
