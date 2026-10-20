import React, { useState } from "react";
import type { PayoutData, PayoutOrder } from "../../lib/reshipper-payouts";
import { fmt, toDecimal, toMinor } from "./money";
import { ErrorNote, inputCls, inputStyle, primaryBtn, primaryStyle, SectionLabel, subtle } from "./ui";

type ReviewOrder = PayoutOrder & { reviewAdminMinor?: number; reviewPostageMinor?: number };
const capAdmin = (o: ReviewOrder) => o.reviewAdminMinor ?? o.adminFeeMinor;
const capPostage = (o: ReviewOrder) => o.reviewPostageMinor ?? o.postageMinor;
type Row = { collector: "admin" | "reshipper" | ""; admin: string; postage: string };

export function ReviewPanel({ orders, write }: { orders: PayoutOrder[]; write: (s: string, b: unknown) => Promise<PayoutData> }) {
  const pending: ReviewOrder[] = orders.filter(o => o.status === "needs_review" && o.reviewable);
  const reviewed: ReviewOrder[] = orders.filter(o => o.status !== "needs_review" && o.reviewable);
  const [correcting, setCorrecting] = useState(false);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!pending.length && !reviewed.length) return null;
  const shown = correcting ? [...pending, ...reviewed] : pending;
  const row = (o: ReviewOrder): Row => rows[o.orderId] ?? { collector: "", admin: toDecimal(capAdmin(o)), postage: toDecimal(capPostage(o)) };
  const set = (o: ReviewOrder, patch: Partial<Row>) => setRows(r => ({ ...r, [o.orderId]: { ...row(o), ...patch } }));

  const chosen = shown.filter(o => row(o).collector);
  const problems: string[] = [];
  chosen.forEach(o => {
    const r = row(o); const a = toMinor(r.admin); const p = toMinor(r.postage);
    if (a === null || p === null) problems.push(`${o.code}: enter amounts like 10.00`);
    else if (a > capAdmin(o) || p > capPostage(o)) problems.push(`${o.code}: cannot exceed the current fee`);
  });
  const reasonLen = reason.trim().length;
  if (chosen.length && reasonLen < 5) problems.push("Reason must be at least 5 characters");
  if (reasonLen > 2000) problems.push("Reason must be 2000 characters or fewer");

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      await write("/review", { reason: reason.trim(), orders: chosen.map(o => { const r = row(o); return { orderId: o.orderId, collector: r.collector, adminFee: toDecimal(toMinor(r.admin)!), postage: toDecimal(toMinor(r.postage)!) }; }) });
      setRows({}); setReason("");
    } catch (e) { setError(e instanceof Error ? e.message : "Review failed"); }
    finally { setBusy(false); }
  };

  return <section aria-label="Review historical collections" className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "#E9A020", background: "color-mix(in srgb, #E9A020 5%, var(--t-surface))" }}>
    <SectionLabel>Review before payout</SectionLabel>
    <p className="text-xs leading-relaxed" style={{ color: "var(--t-text)" }}>Confirm who held each collection. <strong>Held by Admin</strong> makes it payable to the reshipper. <strong>Paid directly to reshipper</strong> records it as already received, so nothing is owed. Amounts already paid out stay protected until that payout is voided.</p>
    {pending.length === 0 && <p className="text-xs" style={subtle}>No orders need review. Use correction to change a previous review.</p>}
    {reviewed.length > 0 && <button type="button" aria-expanded={correcting} className="text-xs font-semibold underline" style={{ color: "var(--t-blue)" }}
      onClick={() => { if (correcting) setRows(r => { const n = { ...r }; reviewed.forEach(o => delete n[o.orderId]); return n; }); setCorrecting(c => !c); }}>
      {correcting ? "Hide previously reviewed orders" : `Correct a previous review (${reviewed.length})`}</button>}
    <ul className="space-y-2">
      {shown.map(o => { const r = row(o); return <li key={o.orderId} className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }}>
        <div className="flex flex-wrap gap-2 text-sm"><span className="font-mono font-semibold">{o.code}</span><span style={subtle}>{o.member}</span>
          <span className="text-xs" style={subtle}>Max: {fmt(capAdmin(o), o.currency)} fee, {fmt(capPostage(o), o.currency)} postage</span>
          {o.status !== "needs_review" && <span className="text-xs" style={subtle}>Currently: {o.collector === "admin" ? "Held by Admin" : o.collector === "reshipper" ? "Paid directly to reshipper" : "unset"}</span>}</div>
        <fieldset className="flex flex-wrap gap-3 text-xs"><legend className="sr-only">Who held {o.code}</legend>
          {(["admin", "reshipper"] as const).map(c => <label key={c} className="inline-flex items-center gap-1.5 min-h-[32px]">
            <input type="radio" name={`col-${o.orderId}`} checked={r.collector === c} onChange={() => set(o, { collector: c })} />
            {c === "admin" ? "Held by Admin" : "Paid directly to reshipper"}</label>)}
        </fieldset>
        {r.collector && <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
          <label className="text-[11px]" style={subtle}>Admin fee<input className={inputCls} style={inputStyle} inputMode="decimal" aria-label={`Review admin fee for ${o.code}`} value={r.admin} onChange={e => set(o, { admin: e.target.value })} /></label>
          <label className="text-[11px]" style={subtle}>Postage<input className={inputCls} style={inputStyle} inputMode="decimal" aria-label={`Review postage for ${o.code}`} value={r.postage} onChange={e => set(o, { postage: e.target.value })} /></label>
        </div>}
      </li>; })}
    </ul>
    <label className="block text-xs" style={subtle}>Reason (audited)
      <input className={inputCls} style={inputStyle} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Checked bank statement for March" /></label>
    {problems.length > 0 && <ul className="text-xs" style={{ color: "#b91c1c" }}>{problems.map(p => <li key={p}>{p}</li>)}</ul>}
    {error && <ErrorNote message={error} />}
    <button type="button" className={primaryBtn} style={primaryStyle} disabled={busy || !chosen.length || problems.length > 0} onClick={submit}>
      {busy ? "Saving review" : `Confirm ${chosen.length || ""} reviewed ${chosen.length === 1 ? "order" : "orders"}`}</button>
  </section>;
}
