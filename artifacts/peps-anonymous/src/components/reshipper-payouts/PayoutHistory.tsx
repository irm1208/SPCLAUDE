import React, { useState } from "react";
import type { PayoutData, PayoutReceipt } from "../../lib/reshipper-payouts";
import { fmt } from "./money";
import { ErrorNote, inputCls, inputStyle, SectionLabel, subtle } from "./ui";
import { displayTokenUnits, getPayoutAsset } from "@workspace/payout-assets";

function VoidControl({ id, write }: { id: string; write: (s: string, b: unknown) => Promise<PayoutData> }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!open) return <button type="button" className="text-xs font-semibold underline" style={{ color: "#b91c1c" }} onClick={() => setOpen(true)}>Void</button>;
  return <div className="mt-2 space-y-2">
    <label className="block text-xs" style={subtle}>Reason for voiding (audited)
      <input className={inputCls} style={inputStyle} value={reason} onChange={e => setReason(e.target.value)} /></label>
    {error && <ErrorNote message={error} />}
    <div className="flex gap-2">
      <button type="button" disabled={busy || !reason.trim()} className="min-h-[36px] rounded-xl px-3 text-xs font-semibold text-white disabled:opacity-50" style={{ background: "#ef4444" }}
        onClick={async () => { setBusy(true); setError(null); try { await write(`/${encodeURIComponent(id)}/void`, { reason: reason.trim() }); } catch (e) { setError(e instanceof Error ? e.message : "Void failed"); setBusy(false); } }}>
        {busy ? "Voiding" : "Confirm void"}</button>
      <button type="button" className="text-xs underline" onClick={() => setOpen(false)}>Cancel</button>
    </div>
  </div>;
}

export function PayoutHistory({ payouts, canVoid, write }: { payouts: PayoutReceipt[]; canVoid: boolean; write: (s: string, b: unknown) => Promise<PayoutData> }) {
  return <section aria-label="Payout history" className="space-y-2">
    <SectionLabel>Payout history</SectionLabel>
    {payouts.length === 0 && <p className="rounded-xl border border-dashed p-4 text-sm" style={{ borderColor: "var(--t-border)", color: "var(--t-subtle)" }}>No payouts recorded yet.</p>}
    <ul className="space-y-2">
      {payouts.map(p => <li key={p.id} className="rounded-xl border p-3 text-sm" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)", opacity: p.voidedAt ? 0.75 : 1 }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className={`font-bold tabular-nums ${p.voidedAt ? "line-through" : ""}`}>{fmt(p.amountMinor, p.currency)}</span>
          <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: p.voidedAt ? "#b91c1c" : "#16a34a" }}>{p.voidedAt ? "Voided" : p.chainVerified ? "Paid — confirmed on blockchain" : "Paid — recorded by Admin"}</span>
        </div>
        {p.chainVerified && p.token && p.tokenUnits && <p className="text-sm font-semibold mt-1">{displayTokenUnits(p.tokenUnits, getPayoutAsset(p.network ?? "", p.token)?.decimals ?? 6)} {p.token}</p>}
        <p className="text-xs mt-1 break-words" style={subtle}>{p.paidAt.slice(0, 10)} · {p.method}{p.network ? ` · ${p.network}` : ""} · To {p.destination}</p>
        <p className="text-xs mt-1 break-all" style={subtle}>{p.method.trim().toLowerCase() === "crypto" ? "TXID" : "Reference"}: <span className="font-mono select-all">{p.reference}</span></p>
        <p className="text-[11px]" style={subtle}>Recorded by {p.recordedBy} on {p.recordedAt.slice(0, 10)}{p.note ? ` · ${p.note}` : ""}</p>
        {p.voidedAt && <p className="text-xs mt-1" style={{ color: "#b91c1c" }}>Voided {p.voidedAt.slice(0, 10)}: {p.voidReason}</p>}
        <details className="mt-2 text-xs"><summary className="cursor-pointer" style={{ color: "var(--t-blue)" }}>Orders covered by this payment ({p.allocations.length})</summary>
          <ul className="mt-1 space-y-0.5 tabular-nums">{p.allocations.map(a => <li key={a.orderId}><span className="font-mono">{a.code}</span> <span style={subtle}>{a.member}</span> — fee {fmt(a.adminFeeMinor, p.currency)}, postage {fmt(a.postageMinor, p.currency)}</li>)}</ul></details>
        {canVoid && !p.voidedAt && !p.chainVerified && <VoidControl id={p.id} write={write} />}
      </li>)}
    </ul>
  </section>;
}
