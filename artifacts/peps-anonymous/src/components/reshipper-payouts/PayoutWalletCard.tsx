import React, { useEffect, useState } from "react";
import type { PayoutData } from "../../lib/reshipper-payouts";
import { ErrorNote, ghostBtn, inputCls, inputStyle, primaryBtn, primaryStyle, subtle } from "./ui";

export const PAYOUT_NETWORKS = [
  ["ERC-20", "Ethereum (ERC-20)"], ["Arbitrum One", "Arbitrum One"], ["Polygon", "Polygon"],
  ["Solana", "Solana"], ["TRC-20", "Tron (TRC-20)"], ["Bitcoin Mainnet", "Bitcoin"],
  ["Ethereum", "Ethereum (native ETH)"], ["BSC", "BNB Smart Chain (BEP-20)"],
] as const;

export function PayoutWalletCard({ wallet, canEdit, write }: {
  wallet: PayoutData["payoutWallet"]; canEdit: boolean; write: (path: string, body: unknown) => Promise<PayoutData>;
}) {
  const [address, setAddress] = useState(wallet?.address ?? "");
  const [network, setNetwork] = useState(wallet?.network ?? "ERC-20");
  const [editing, setEditing] = useState(!wallet);
  const [busy, setBusy] = useState(false), [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setAddress(wallet?.address ?? ""); setNetwork(wallet?.network ?? "ERC-20"); setCopied(false); }, [wallet?.address, wallet?.network]);
  const save = async () => {
    setBusy(true); setError(null);
    try { await write("/payout-wallet", { address: address.trim(), network }); setEditing(false); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save payout wallet."); }
    finally { setBusy(false); }
  };
  const copy = async () => {
    setError(null);
    try { await navigator.clipboard.writeText(wallet!.address); setCopied(true); }
    catch { setError("Could not copy. Select and copy the address below."); }
  };
  return <section aria-label="Reshipper payout wallet" className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--t-border)" }}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-bold">Reshipper’s payout wallet</h3>
      {wallet && <div className="flex gap-2">
        <button type="button" className={ghostBtn} onClick={copy}>{copied ? "Copied" : "Copy address"}</button>
        {canEdit && !editing && <button type="button" className={ghostBtn} onClick={() => setEditing(true)}>Edit wallet</button>}
      </div>}
    </div>
    {wallet && <div className="text-sm min-w-0"><span style={subtle}>{wallet.network}</span><code className="block break-all select-all mt-1">{wallet.address}</code></div>}
    {canEdit && editing && <>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-3">
        <label className="text-xs" style={subtle}>Payout wallet address
          <input aria-label="Reshipper payout wallet address" className={inputCls} style={inputStyle} value={address}
            onChange={e => setAddress(e.target.value)} maxLength={200} spellCheck={false} disabled={busy} /></label>
        <label className="text-xs" style={subtle}>Network
          <select aria-label="Reshipper payout wallet network" className={inputCls} style={inputStyle} value={network} disabled={busy}
            onChange={e => setNetwork(e.target.value)}>{PAYOUT_NETWORKS.map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
      </div>
      <button type="button" className={primaryBtn} style={primaryStyle} disabled={busy || !address.trim()} onClick={save}>{busy ? "Saving…" : "Save payout wallet"}</button>
      {wallet && <button type="button" className={ghostBtn} disabled={busy} onClick={() => { setAddress(wallet.address); setNetwork(wallet.network); setEditing(false); setError(null); }}>Cancel</button>}
    </>}
    <p className="text-xs" style={subtle}>{canEdit
      ? "Save once for this reshipper across group buys. Check the address and network before sending. Changes apply to future payouts only."
      : wallet ? "Admin uses this wallet for payouts to you. Contact Admin if it needs changing." : "No payout wallet saved yet. Ask Admin to add it."}</p>
    {error && <ErrorNote message={error} />}
  </section>;
}
