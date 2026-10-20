import React, { useRef, useState } from "react";
import type { PayoutData, PayoutOrder } from "../../lib/reshipper-payouts";
import { fmt, toDecimal, toMinor } from "./money";
import type { Draft } from "./PayoutOrdersTable";
import { ErrorNote, ghostBtn, inputCls, inputStyle, primaryBtn, primaryStyle, SectionLabel, subtle } from "./ui";

const METHODS = [["bank_transfer", "Bank transfer"], ["wise", "Wise"], ["paypal", "PayPal"], ["crypto", "Crypto"], ["cash", "Cash"], ["other", "Other"]];
const today = () => new Date().toISOString().slice(0, 10);
const newId = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `op-${Date.now()}-${Math.random().toString(36).slice(2)}`);

export function PayoutForm({ orders, selection, paymentDetails, write, onRecorded }: {
  orders: PayoutOrder[]; selection: Record<string, Draft>; paymentDetails: Record<string, unknown> | null;
  write: (s: string, b: unknown) => Promise<PayoutData>; onRecorded: () => void;
}) {
  const [f, setF] = useState({ amount: "", paidAt: today(), method: "", reference: "", destination: "", note: "" });
  const [confirmed, setConfirmed] = useState(false);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const op = useRef<{ key: string; id: string } | null>(null);
  const upd = (k: keyof typeof f, v: string) => { setF(s => ({ ...s, [k]: v })); setPreview(false); };

  const rows = orders.filter(o => selection[o.orderId]);
  if (!rows.length) return <p className="rounded-xl border border-dashed p-4 text-sm" style={{ borderColor: "var(--t-border)", color: "var(--t-subtle)" }}>Select owed orders above to record a payout. Part payments are fine: lower any component before recording.</p>;
  const currency = rows[0].currency;
  const problems: string[] = [];
  const allocations = rows.map(o => {
    const a = toMinor(selection[o.orderId].admin); const p = toMinor(selection[o.orderId].postage);
    if (a === null || p === null) problems.push(`${o.code}: enter amounts like 10.00`);
    else {
      if (a > o.remainingAdminMinor) problems.push(`${o.code}: admin fee exceeds ${fmt(o.remainingAdminMinor, currency)} outstanding`);
      if (p > o.remainingPostageMinor) problems.push(`${o.code}: postage exceeds ${fmt(o.remainingPostageMinor, currency)} outstanding`);
      if (a + p === 0) problems.push(`${o.code}: allocate something or deselect it`);
    }
    return { o, a: a ?? 0, p: p ?? 0 };
  });
  const sum = allocations.reduce((s, x) => s + x.a + x.p, 0);
  const amount = toMinor(f.amount);
  if (amount === null) problems.push("Enter the payout amount");
  else if (amount !== sum) problems.push(`Payout total must equal allocations (${fmt(sum, currency)})`);
  if (!f.paidAt) problems.push("Enter the date paid");
  if (!f.method) problems.push("Choose a method");
  if (!f.reference.trim()) problems.push("Enter a reference");
  if (!f.destination.trim()) problems.push(f.method === "cash" ? "Enter a destination, e.g. In person" : "Enter the actual destination paid to");
  if (!confirmed) problems.push("Confirm the destination");

  const record = async () => {
    const payload = { amount: toDecimal(sum), currency, paidAt: f.paidAt, method: f.method, reference: f.reference.trim(), destination: f.destination.trim(), note: f.note.trim(), confirmedDestination: true as const,
      allocations: allocations.map(x => ({ orderId: x.o.orderId, adminFee: toDecimal(x.a), postage: toDecimal(x.p) })) };
    const key = JSON.stringify(payload);
    if (!op.current || op.current.key !== key) op.current = { key, id: newId() };
    setBusy(true); setError(null);
    try {
      await write("", { operationId: op.current.id, ...payload });
      op.current = null;
      setF({ amount: "", paidAt: today(), method: "", reference: "", destination: "", note: "" }); setConfirmed(false); setPreview(false);
      onRecorded();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not record payout"); }
    finally { setBusy(false); }
  };

  const details = paymentDetails ? Object.entries(paymentDetails).filter(([, v]) => v !== null && v !== "" && typeof v !== "object") : [];
  return <section aria-label="Record payout" className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }}>
    <SectionLabel>Record payout · {currency.toUpperCase()}</SectionLabel>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label className="text-xs" style={subtle}>Amount paid<input className={inputCls} style={inputStyle} inputMode="decimal" value={f.amount} placeholder={toDecimal(sum)} onChange={e => upd("amount", e.target.value)} /></label>
      <label className="text-xs" style={subtle}>Date paid<input type="date" className={inputCls} style={inputStyle} value={f.paidAt} onChange={e => upd("paidAt", e.target.value)} /></label>
      <label className="text-xs" style={subtle}>Method<select className={inputCls} style={inputStyle} value={f.method} onChange={e => upd("method", e.target.value)}>
        <option value="">Choose method</option>{METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label className="text-xs" style={subtle}>Reference<input className={inputCls} style={inputStyle} value={f.reference} placeholder="Transfer ID or receipt no." onChange={e => upd("reference", e.target.value)} /></label>
      <label className="text-xs sm:col-span-2" style={subtle}>Destination actually paid to<input className={inputCls} style={inputStyle} value={f.destination} placeholder={f.method === "cash" ? "In person" : "Account, address or handle used"} onChange={e => { upd("destination", e.target.value); setConfirmed(false); }} /></label>
      <label className="text-xs sm:col-span-2" style={subtle}>Note (optional)<input className={inputCls} style={inputStyle} value={f.note} onChange={e => upd("note", e.target.value)} /></label>
    </div>
    <div className="rounded-xl p-3 text-xs" style={{ background: "color-mix(in srgb, var(--t-blue) 6%, var(--t-surface))", color: "var(--t-text)" }}>
      <p className="font-semibold">Reshipper payment details on file (reference only)</p>
      {details.length ? <ul className="mt-1">{details.map(([k, v]) => <li key={k}><span style={subtle}>{k}:</span> {String(v)}</li>)}</ul>
        : <p style={subtle}>None on file. Check with the reshipper before sending.</p>}
      <p className="mt-1" style={subtle}>Not copied into the destination. Type exactly where you sent the money.</p>
    </div>
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" className="mt-1" checked={confirmed} onChange={e => { setConfirmed(e.target.checked); setPreview(false); }} />
      I confirm this payout was sent to the destination above.</label>
    {problems.length > 0 && <ul aria-label="Payout problems" className="text-xs space-y-0.5" style={{ color: "#b91c1c" }}>{problems.map(p => <li key={p}>{p}</li>)}</ul>}
    {preview && problems.length === 0 && <div aria-label="Payout preview" className="rounded-xl border p-3 text-xs" style={{ borderColor: "var(--t-blue)" }}>
      <p className="font-semibold mb-2">Preview: {fmt(sum, currency)} via {METHODS.find(m => m[0] === f.method)?.[1]} to {f.destination.trim()} on {f.paidAt}</p>
      <table className="w-full tabular-nums"><thead><tr style={subtle}><th className="text-left font-medium">Order</th><th className="text-right font-medium">Admin fee</th><th className="text-right font-medium">Postage</th></tr></thead>
        <tbody>{allocations.map(x => <tr key={x.o.orderId}><td className="font-mono">{x.o.code}</td><td className="text-right">{toDecimal(x.a)}</td><td className="text-right">{toDecimal(x.p)}</td></tr>)}</tbody></table>
      <p className="mt-2" style={subtle}>This records a payment made outside Peps Anonymous. No money moves.</p>
    </div>}
    {error && <ErrorNote message={error} />}
    <div className="flex flex-wrap gap-2">
      {!preview ? <button type="button" className={primaryBtn} style={primaryStyle} disabled={problems.length > 0} onClick={() => setPreview(true)}>Preview allocations</button>
        : <><button type="button" className={primaryBtn} style={primaryStyle} disabled={busy || problems.length > 0} onClick={record}>{busy ? "Recording" : "Record payout"}</button>
          <button type="button" className={ghostBtn} style={{ borderColor: "var(--t-border)", color: "var(--t-subtle)" }} onClick={() => setPreview(false)}>Edit</button></>}
    </div>
  </section>;
}
