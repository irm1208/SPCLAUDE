import React, { useEffect, useRef, useState } from "react";
import type { PayoutData, PayoutOrder } from "../../lib/reshipper-payouts";
import { fmt, toDecimal, toMinor } from "./money";
import type { Draft } from "./PayoutOrdersTable";
import { ErrorNote, ghostBtn, inputCls, inputStyle, primaryBtn, primaryStyle, SectionLabel, subtle } from "./ui";
import { PAYOUT_NETWORKS } from "./PayoutWalletCard";

const METHODS = [["bank_transfer", "Bank transfer"], ["wise", "Wise"], ["paypal", "PayPal"], ["crypto", "Crypto"], ["cash", "Cash"], ["other", "Other"]];
const today = () => new Date().toISOString().slice(0, 10);
const newId = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `op-${Date.now()}-${Math.random().toString(36).slice(2)}`);

export function PayoutForm({ orders, selection, payoutWallet, write, onRecorded }: {
  orders: PayoutOrder[]; selection: Record<string, Draft>; payoutWallet: PayoutData["payoutWallet"];
  write: (s: string, b: unknown) => Promise<PayoutData>; onRecorded: () => void;
}) {
  const [f, setF] = useState({ paidAt: today(), method: "crypto", reference: "", destination: payoutWallet?.address ?? "", network: payoutWallet?.network ?? "ERC-20", note: "" });
  const [confirmed, setConfirmed] = useState(false);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const op = useRef<{ key: string; id: string } | null>(null);
  const upd = (k: keyof typeof f, v: string) => { setF(s => ({ ...s, [k]: v })); setPreview(false); };
  useEffect(() => {
    setF(s => s.method === "crypto" ? { ...s, destination: payoutWallet?.address ?? "", network: payoutWallet?.network ?? "ERC-20" } : s);
    setConfirmed(false); setPreview(false);
  }, [payoutWallet?.address, payoutWallet?.network]);

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
  if (!f.paidAt) problems.push("Enter the date paid");
  if (!f.method) problems.push("Choose a method");
  if (!f.reference.trim()) problems.push(f.method === "crypto" ? "Enter a TXID" : "Enter a reference");
  if (!f.destination.trim()) problems.push(f.method === "cash" ? "Enter a destination, e.g. In person" : "Enter the actual destination paid to");
  if (!confirmed) problems.push("Confirm the destination");

  const record = async () => {
    const payload = { amount: toDecimal(sum), currency, paidAt: f.paidAt, method: f.method, reference: f.reference.trim(), destination: f.destination.trim(), note: f.note.trim(), confirmedDestination: true as const,
      ...(f.method === "crypto" ? { network: f.network } : {}),
      allocations: allocations.map(x => ({ orderId: x.o.orderId, adminFee: toDecimal(x.a), postage: toDecimal(x.p) })) };
    const key = JSON.stringify(payload);
    if (!op.current || op.current.key !== key) op.current = { key, id: newId() };
    setBusy(true); setError(null);
    try {
      await write("", { operationId: op.current.id, ...payload });
      op.current = null;
      setF({ paidAt: today(), method: "crypto", reference: "", destination: payoutWallet?.address ?? "", network: payoutWallet?.network ?? "ERC-20", note: "" }); setConfirmed(false); setPreview(false);
      onRecorded();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not record payout"); }
    finally { setBusy(false); }
  };

  return <section aria-label="Record payout" className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }}>
    <SectionLabel>Record one payment · {rows.length} {rows.length === 1 ? "order" : "orders"}</SectionLabel>
    <p className="text-lg font-bold">{fmt(sum, currency)} <span className="text-xs font-normal" style={subtle}>admin fees + postage selected</span></p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label className="text-xs" style={subtle}>Amount paid · {currency}<input className={inputCls} style={inputStyle} value={toDecimal(sum)} readOnly /></label>
      <label className="text-xs" style={subtle}>Date paid<input type="date" className={inputCls} style={inputStyle} value={f.paidAt} onChange={e => upd("paidAt", e.target.value)} /></label>
      <label className="text-xs" style={subtle}>Method<select className={inputCls} style={inputStyle} value={f.method} onChange={e => {
        const method = e.target.value;
        setF(s => ({ ...s, method, reference: "", destination: method === "crypto" ? payoutWallet?.address ?? "" : "", network: payoutWallet?.network ?? "ERC-20" }));
        setConfirmed(false); setPreview(false);
      }}>
        <option value="">Choose method</option>{METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label className="text-xs min-w-0" style={subtle}>{f.method === "crypto" ? "TXID (transaction hash)" : "Reference"}
        <input className={inputCls} style={inputStyle} value={f.reference} maxLength={300}
          spellCheck={false} autoCapitalize="none"
          placeholder={f.method === "crypto" ? "Paste the payout transaction hash" : "Transfer ID or receipt no."}
          onChange={e => upd("reference", e.target.value)} />
        {f.method === "crypto" && <span className="block mt-1 text-[11px]">Saved with this payout and its orders. Visible to the reshipper; not verified on-chain.</span>}
      </label>
      {f.method === "crypto" && <label className="text-xs" style={subtle}>Payout network<select className={inputCls} style={inputStyle} value={f.network}
        onChange={e => { upd("network", e.target.value); setConfirmed(false); }}>{PAYOUT_NETWORKS.map(([v, name]) => <option key={v} value={v}>{name}</option>)}</select></label>}
      <label className="text-xs sm:col-span-2" style={subtle}>Destination actually paid to<input className={inputCls} style={inputStyle} value={f.destination} placeholder={f.method === "cash" ? "In person" : "Account, address or handle used"} onChange={e => { upd("destination", e.target.value); setConfirmed(false); }} /></label>
      <label className="text-xs sm:col-span-2" style={subtle}>Note (optional)<input className={inputCls} style={inputStyle} value={f.note} onChange={e => upd("note", e.target.value)} /></label>
    </div>
    <p className="text-xs" style={subtle}>Send one transfer outside this website, then paste its TXID. The amount is calculated from the selected orders; adjust their fee/postage amounts for a partial payout. No currency conversion is performed.</p>
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" className="mt-1" checked={confirmed} onChange={e => { setConfirmed(e.target.checked); setPreview(false); }} />
      I confirm this payout was sent to the destination above.</label>
    {problems.length > 0 && <ul aria-label="Payout problems" className="text-xs space-y-0.5" style={{ color: "#b91c1c" }}>{problems.map(p => <li key={p}>{p}</li>)}</ul>}
    {preview && problems.length === 0 && <div aria-label="Payout preview" className="rounded-xl border p-3 text-xs" style={{ borderColor: "var(--t-blue)" }}>
      <p className="font-semibold mb-2">Preview: {fmt(sum, currency)} via {METHODS.find(m => m[0] === f.method)?.[1]}{f.method === "crypto" ? ` · ${f.network}` : ""} to {f.destination.trim()} on {f.paidAt}</p>
      <p className="mb-2 break-all" style={subtle}>{f.method === "crypto" ? "TXID" : "Reference"}: <span className="font-mono">{f.reference.trim()}</span></p>
      <table className="w-full tabular-nums"><thead><tr style={subtle}><th className="text-left font-medium">Order</th><th className="text-right font-medium">Admin fee</th><th className="text-right font-medium">Postage</th></tr></thead>
        <tbody>{allocations.map(x => <tr key={x.o.orderId}><td className="font-mono">{x.o.code}</td><td className="text-right">{toDecimal(x.a)}</td><td className="text-right">{toDecimal(x.p)}</td></tr>)}</tbody></table>
      <p className="mt-2" style={subtle}>This records a payment made outside Peps Anonymous. No money moves.</p>
    </div>}
    {error && <ErrorNote message={error} />}
    <div className="flex flex-wrap gap-2">
      {!preview ? <button type="button" className={primaryBtn} style={primaryStyle} disabled={problems.length > 0} onClick={() => setPreview(true)}>Preview payment</button>
        : <><button type="button" className={primaryBtn} style={primaryStyle} disabled={busy || problems.length > 0} onClick={record}>{busy ? "Recording" : "Record payout"}</button>
          <button type="button" className={ghostBtn} style={{ borderColor: "var(--t-border)", color: "var(--t-subtle)" }} onClick={() => setPreview(false)}>Edit</button></>}
    </div>
  </section>;
}
