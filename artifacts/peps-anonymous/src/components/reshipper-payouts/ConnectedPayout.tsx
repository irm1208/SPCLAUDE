import React, { useEffect, useRef, useState } from "react";
import { displayTokenUnits, getPayoutAsset } from "@workspace/payout-assets";
import type { ChainPayment, PayoutData, PayoutOrder } from "../../lib/reshipper-payouts";
import { approvePayoutTransfer, approvePayoutCancellation, connectPayoutWallet, type ConnectedPayoutWallet } from "../../lib/payout-wallet-provider";
import type { Draft } from "./PayoutOrdersTable";
import { fmt, toMinor } from "./money";
import { ErrorNote, ghostBtn, inputCls, inputStyle, primaryBtn, primaryStyle, subtle } from "./ui";

type Write = (path: string, body: unknown) => Promise<PayoutData>;
export function ConnectedPayout({ data, orders, selection, write, isAdmin }: {
  data: PayoutData; orders: PayoutOrder[]; selection: Record<string, Draft>; write: Write; isAdmin: boolean;
}) {
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const connection = useRef<ConnectedPayoutWallet | null>(null), operation = useRef<{ key: string; id: string } | null>(null);
  const pending = (data.chainPayments ?? []).filter(p => ["prepared", "signing", "broadcast", "failed"].includes(p.state));
  const asset = data.payoutWallet?.currency ? getPayoutAsset(data.payoutWallet.network, data.payoutWallet.currency) : null;
  const rows = orders.filter(o => selection[o.orderId]);
  const prepare = async () => {
    if (!asset) return; setBusy(true); setError(null);
    try {
      const allocations = rows.map(o => ({ orderId: o.orderId, adminFee: selection[o.orderId].admin, postage: selection[o.orderId].postage }));
      if (allocations.some(a => toMinor(a.adminFee) === null || toMinor(a.postage) === null)) throw new Error("Enter valid fee and postage amounts before preparing payment.");
      const wallet = await connectPayoutWallet(asset); connection.current = wallet;
      const payload = { currency: rows[0].currency, sender: wallet.address, allocations };
      const key = JSON.stringify(payload);
      if (operation.current?.key !== key) operation.current = { key, id: crypto.randomUUID() };
      await write("/chain/prepare", { ...payload, operationId: operation.current!.id });
      operation.current = null;
    } catch (e) { setError(e instanceof Error ? e.message : "Could not prepare payment."); }
    finally { setBusy(false); }
  };
  const checking = useRef(false), writeRef = useRef(write); writeRef.current = write;
  const ids = pending.filter(p => p.state === "broadcast").map(p => p.id).join(",");
  useEffect(() => {
    if (!isAdmin || !ids) return;
    const timer = setInterval(async () => {
      if (checking.current) return; checking.current = true;
      try { for (const id of ids.split(",").slice(0, 3)) await writeRef.current(`/chain/${id}/check`, {}); }
      catch { /* Keep the pending payment visible; the background checker also retries. */ }
      finally { checking.current = false; }
    }, 15_000);
    return () => clearInterval(timer);
  }, [ids, isAdmin]);
  return <div className="space-y-3">
    {isAdmin && <section aria-label="Pay with connected wallet" className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--t-border)" }}>
      <h3 className="text-sm font-bold">Pay selected orders with your wallet</h3>
      <p className="text-xs" style={subtle}>One transfer for the selected admin fees and postage. Review the exact amount and recipient, then approve in your wallet. Orders are marked paid only after blockchain confirmation. Network fees are extra.</p>
      {!asset ? <p className="text-sm" style={subtle}>The reshipper needs to save a supported USDT/USDC token with their payout wallet above before connected payments are available.</p>
        : <><p className="text-sm font-semibold">{asset.currency} · {asset.network}</p>
          <button type="button" className={primaryBtn} style={primaryStyle} disabled={busy || !rows.length} onClick={prepare}>
            {busy ? "Connecting / preparing…" : "Connect wallet & preview payment"}</button>
          {!rows.length && <p className="text-xs" style={subtle}>Select payable orders above first.</p>}</>}
      {error && <ErrorNote message={error} />}
    </section>}
    {pending.map(p => <PendingPayment key={p.id} payment={p} isAdmin={isAdmin} write={write} connection={connection} />)}
  </div>;
}
function PendingPayment({ payment: p, isAdmin, write, connection }: {
  payment: ChainPayment; isAdmin: boolean; write: Write; connection: React.MutableRefObject<ConnectedPayoutWallet | null>;
}) {
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [checked, setChecked] = useState(false);
  const [txid, setTxid] = useState(() => {
    try { return localStorage.getItem(`reshipper_payout_tx:${p.id}`) ?? ""; } catch { return ""; }
  });
  const asset = getPayoutAsset(p.network, p.token);
  const perform = async (action: () => Promise<unknown>) => {
    setBusy(true); setError(null);
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : "Payment action failed. Check the existing transfer before retrying."); }
    finally { setBusy(false); }
  };
  const approve = async (cancel = false) => {
    if (!asset) return;
    let wallet = connection.current;
    if (!wallet || wallet.family !== asset.family || (asset.family === "evm" ? wallet.address.toLowerCase() !== p.sender?.toLowerCase() : wallet.address !== p.sender)) {
      wallet = await connectPayoutWallet(asset); connection.current = wallet;
    }
    const updated = cancel ? null : await write(`/chain/${p.id}/approve`, {});
    const current = cancel ? p : updated?.chainPayments?.find(c => c.id === p.id);
    if (!current) throw new Error("Payment preview could not be loaded. Refresh before proceeding.");
    const result = await (cancel ? approvePayoutCancellation(current, wallet) : approvePayoutTransfer(current, wallet));
    if (result.txid) setTxid(result.txid);
    await write(`/chain/${p.id}/submit`, result);
  };
  const pending = p.state !== "failed";
  return <section aria-label={`Blockchain payment ${p.id}`} className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--t-border)" }}>
    <div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold text-sm">{p.state === "failed" ? "Payment failed — not paid" : p.state === "broadcast" ? "Payment pending confirmation" : "Review wallet payment"}</h3>
      <span className="text-xs font-semibold">{fmt(p.amountMinor, p.currency)} · {p.allocations.length} orders</span></div>
    <p className="font-bold">{asset ? displayTokenUnits(p.tokenUnits, asset.decimals) : p.tokenUnits} {p.token} · {p.network}</p>
    <p className="text-xs break-all" style={subtle}>To: <code className="select-all">{p.destination}</code></p>
    {p.rate !== 1 && <p className="text-xs" style={subtle}>Locked conversion: 1 {p.currency} = {p.rate} USD. Stablecoins are valued at 1 USD per token.</p>}
    <details className="text-xs"><summary className="cursor-pointer">Orders covered ({p.allocations.length})</summary>
      <ul className="mt-2 space-y-1">{p.allocations.map(a => <li key={a.orderId}>{a.code} · {a.member} — fee {fmt(a.adminFeeMinor, p.currency)}, postage {fmt(a.postageMinor, p.currency)}</li>)}</ul></details>
    {p.txid && <p className="text-xs break-all" style={subtle}>TXID: <code className="select-all">{p.txid}</code></p>}
    {p.error && <p className="text-xs" role="status" style={subtle}>{p.error}</p>}
    {pending && <p className="text-xs" style={subtle}>These orders are reserved for this payment. Do not send another transfer. Pending payments are saved and checked automatically.</p>}
    {isAdmin && pending && <div className="space-y-3">
      {["prepared", "signing"].includes(p.state) && <>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} />
          I have checked the token, network, amount and recipient address.</label>
        <div className="flex flex-wrap gap-2"><button type="button" className={primaryBtn} style={primaryStyle} disabled={busy || !checked} onClick={() => perform(approve)}>
          {busy ? "Waiting for wallet / checking…" : p.state === "signing" ? "Resume original wallet payment" : "Approve payment in wallet"}</button>
          {(p.state === "prepared" || asset?.family !== "evm") && <button type="button" className={ghostBtn} disabled={busy} onClick={() => perform(() => write(`/chain/${p.id}/cancel`, {}))}>Cancel unsent payment</button>}</div>
      </>}
      {["signing", "broadcast"].includes(p.state) && asset?.family === "evm" && <div className="space-y-2">
        <p className="text-xs" style={subtle}>If your wallet already sent or sped up this transfer, recover its TXID from wallet activity. Resuming uses the same nonce, not a new payment. To abandon a rejected or stuck approval safely, an on-chain cancellation uses that same nonce and costs a network fee.</p>
        <label className="block text-xs">Recover payout TXID<input aria-label="Recover payout TXID" className={inputCls} style={inputStyle} value={txid} onChange={e => setTxid(e.target.value)} spellCheck={false} /></label>
        <button type="button" className={ghostBtn} disabled={busy || !/^0x[0-9a-f]{64}$/i.test(txid)} onClick={() => perform(() => write(`/chain/${p.id}/submit`, { txid }))}>Recover & check transfer</button>
        <button type="button" className={ghostBtn} disabled={busy} onClick={() => perform(() => approve(true))}>Cancel on-chain · network fee applies</button>
      </div>}
      {p.state === "broadcast" && <button type="button" className={ghostBtn} disabled={busy} onClick={() => perform(() => write(`/chain/${p.id}/check`, {}))}>{busy ? "Checking…" : "Check confirmation"}</button>}
    </div>}
    {error && <ErrorNote message={error} />}
  </section>;
}
