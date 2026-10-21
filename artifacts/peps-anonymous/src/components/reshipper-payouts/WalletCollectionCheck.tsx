import React, { useState } from "react";
import type { CollectionWallet, PayoutData } from "../../lib/reshipper-payouts";
import { ErrorNote, inputCls, inputStyle, primaryBtn, primaryStyle, subtle } from "./ui";

const networks = ["ERC-20", "Arbitrum One", "Polygon", "Solana", "TRC-20", "Bitcoin Mainnet", "Ethereum", "BSC"];
export function WalletCollectionCheck({ data, write }: { data: PayoutData; write: (s: string, b: unknown) => Promise<PayoutData> }) {
  const [form, setForm] = useState({ collector: "admin", network: "ERC-20", address: "", from: "", until: "" });
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const wallets = data.collectionWallets ?? [];
  const pending = data.orders.filter(o => o.status === "needs_review" && o.reviewable && !o.reviewedAt && !checked.has(o.orderId));
  const update = (key: keyof typeof form, value: string) => { setForm(f => ({ ...f, [key]: value })); setConfirmed(false); };
  async function save() {
    setBusy(true); setError(null);
    try {
      await write("/wallets", { collector: form.collector, network: form.network, address: form.address.trim(),
        effectiveFrom: new Date(`${form.from}T00:00:00Z`).toISOString(),
        effectiveUntil: form.until ? new Date(`${form.until}T00:00:00Z`).toISOString() : null, confirmed });
      setForm(f => ({ ...f, address: "", from: "", until: "" })); setConfirmed(false); setChecked(new Set());
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save wallet ownership."); }
    finally { setBusy(false); }
  }
  async function remove(wallet: CollectionWallet) {
    if (!window.confirm("Remove this ownership declaration? Automatic reviews using it will return to Needs review. Recorded payouts will not be undone.")) return;
    setBusy(true); setError(null);
    try { await write("/wallets/remove", { ...wallet, confirmed: true }); setChecked(new Set()); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not remove wallet ownership."); }
    finally { setBusy(false); }
  }
  async function check() {
    const ids = pending.slice(0, 20).map(o => o.orderId);
    setBusy(true); setError(null);
    try {
      const result = await write("/check-wallets", { orderIds: ids });
      setChecked(previous => new Set([...previous, ...(result.walletCheckResults ?? []).map(r => r.orderId)]));
    } catch (e) { setError(e instanceof Error ? e.message : "Wallet check failed. Refresh to see any completed reviews before retrying."); }
    finally { setBusy(false); }
  }
  return <section aria-label="Automatic collection checks" className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--t-border)" }}>
    <h3 className="text-sm font-semibold">Check who received the payments</h3>
    <p className="text-xs" style={subtle}>Set up wallet ownership once for this group buy and reshipper. We check the actual blockchain payment against the wallet and dates you confirm—not today’s payment settings.</p>
    <details open={!wallets.length}>
      <summary className="text-xs font-semibold cursor-pointer">Payment wallets ({wallets.length})</summary>
      <ul className="mt-3 space-y-2 text-xs">{wallets.map((wallet, i) => <li key={i} className="rounded-lg border p-2 space-y-1" style={{ borderColor: "var(--t-border)" }}>
        <p className="font-semibold">{wallet.collector === "admin" ? "Admin" : "Reshipper"} · {wallet.network}</p>
        <code className="block break-all select-text">{wallet.address}</code>
        <p style={subtle}>From {wallet.effectiveFrom.slice(0, 10)}{wallet.effectiveUntil ? ` until ${wallet.effectiveUntil.slice(0, 10)} (exclusive)` : " onwards"}</p>
        <button type="button" disabled={busy} className="underline" onClick={() => remove(wallet)}>Remove ownership declaration</button>
      </li>)}</ul>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="text-xs">Wallet owner<select className={inputCls} style={inputStyle} value={form.collector} onChange={e => update("collector", e.target.value)}>
          <option value="admin">Admin</option><option value="reshipper">This reshipper</option>
        </select></label>
        <label className="text-xs">Network<select className={inputCls} style={inputStyle} value={form.network} onChange={e => update("network", e.target.value)}>{networks.map(n => <option key={n}>{n}</option>)}</select></label>
        <label className="text-xs sm:col-span-2">Wallet address<input className={inputCls} style={inputStyle} value={form.address} onChange={e => update("address", e.target.value)} autoCapitalize="none" spellCheck={false} /></label>
        <label className="text-xs">Owned from (UTC)<input type="date" className={inputCls} style={inputStyle} value={form.from} onChange={e => update("from", e.target.value)} /></label>
        <label className="text-xs">Owned until (optional, UTC)<input type="date" className={inputCls} style={inputStyle} value={form.until} onChange={e => update("until", e.target.value)} /></label>
      </div>
      <label className="my-3 flex items-start gap-2 text-xs"><input type="checkbox" aria-label="Confirm wallet ownership" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
        I confirm this wallet belonged to the selected owner during these dates. This declaration is audited.</label>
      <button type="button" className={primaryBtn} style={primaryStyle} disabled={busy || !confirmed || !form.address.trim() || !form.from} onClick={save}>Save wallet ownership</button>
    </details>
    <p className="text-xs" style={subtle}>Admin wallet matches become Owed. Reshipper wallet matches become Not owed. Split payments, fiat, missing records and uncertain matches stay in Needs review. Existing reviews and payouts are never overwritten.</p>
    <button type="button" className={primaryBtn} style={primaryStyle} disabled={busy || !wallets.length || !pending.length} onClick={check}>
      {busy ? "Checking / saving…" : `Check payment wallets${pending.length ? ` (${Math.min(pending.length, 20)} orders)` : ""}`}
    </button>
    <p className="text-xs" style={subtle}>Checks up to 20 orders at a time. No money is sent and customer payments are unchanged.</p>
    {!!checked.size && <button type="button" disabled={busy} className="ml-2 text-xs underline" onClick={() => setChecked(new Set())}>Retry unmatched orders</button>}
    {!!data.walletCheckResults?.length && <ul aria-label="Wallet check results" className="space-y-2 text-xs">
      {data.walletCheckResults.map(result => <li key={result.orderId}><strong>{result.code} · {result.collector === "admin" ? "Held by Admin" : result.collector === "reshipper" ? "Already received by reshipper" : "Needs review"}</strong>
        <p style={subtle}>{result.reason}</p>{result.address && <code className="block break-all">{result.address}</code>}</li>)}
    </ul>}
    {error && <ErrorNote message={error} />}
  </section>;
}
