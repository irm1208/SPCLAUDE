import { vendorTranslate as vt, useVendorLanguage, getVendorLanguage } from "@/lib/vendor-language";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { vendorFetch } from "@/lib/vendor-auth-client";
import { Badge, Banner, Btn, Card, Field, field, fieldCls, muted } from "./vendor-ui";

export interface VendorWallet { id: string; vendorId: string; currency: string; network: string; address: string; label: string | null }
export interface WalletOption { currency: string; network: string; family: string; decimals: number }
interface WalletData { wallets: VendorWallet[]; options: WalletOption[] }
type WalletDraft = { id?: string; currency: string; network: string; address: string; label?: string | null };
async function readResponse(r: Response): Promise<WalletData> {
  const body = await r.json();
  if (!r.ok) throw new Error(body.message ?? body.error ?? vt("Could not load payment wallets."));
  if (!Array.isArray(body.wallets) || !Array.isArray(body.options)) throw new Error(vt("Could not load payment wallets."));
  return body;
}
export function useVendorWallets(enabled: boolean) {
  const [data, setData] = useState<WalletData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true); setData(null); setError(null);
    try {
      const result = await readResponse(await vendorFetch("/api/vendor/wallets"));
      if (current === generation.current) setData(result);
    } catch (e) { if (current === generation.current) setError(e instanceof Error ? e.message : vt("Could not load payment wallets.")); }
    finally { if (current === generation.current) setLoading(false); }
  }, []);
  useEffect(() => {
    if (enabled) void refresh();
    else { generation.current++; setData(null); setError(null); setLoading(false); }
    return () => { generation.current++; };
  }, [enabled, refresh]);
  const save = async (wallets: WalletDraft[]) => {
    const current = generation.current;
    const result = await readResponse(await vendorFetch("/api/vendor/wallets", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ wallets: wallets.map(({ label, ...wallet }) => ({ ...wallet, ...(label != null ? { label } : {}) })) }) }));
    if (current === generation.current) { setData(result); setError(null); }
  };
  return { data: enabled ? data : null, loading: enabled && loading, error, refresh, save };
}
export type VendorWalletState = ReturnType<typeof useVendorWallets>;
export function VendorWalletPanel({ state }: { state: VendorWalletState }) {
  useVendorLanguage();
  const [drafts, setDrafts] = useState<WalletDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { setDrafts(state.data?.wallets.map(({ id, currency, network, address, label }) => ({ id, currency, network, address, label })) ?? []); }, [state.data]);
  const options = state.data?.options ?? [];
  const update = (index: number, patch: Partial<WalletDraft>) => setDrafts(rows => rows.map((row, i) => i === index ? { ...row, ...patch } : row));
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setMessage(null);
    try { await state.save(drafts); setMessage({ ok: true, text: vt("Payment wallets saved.") }); }
    catch (e) { setMessage({ ok: false, text: e instanceof Error ? e.message : vt("Could not save payment wallets.") }); }
    finally { setBusy(false); }
  };
  return <Card title={vt("Payment wallets")} testId="card-vendor-wallets">
    <p className="text-[13px] mb-3" style={muted}>{vt("Add at least one wallet to use the vendor portal. Choose the exact currency and network for each receiving address. You can save up to 20 wallets.")}</p>
    {state.loading && <p role="status">{vt("Loading payment wallets…")}</p>}
    {state.error && <div className="space-y-2"><Banner tone="critical" role="alert">{vt(state.error)}</Banner><Btn onClick={state.refresh}>{vt("Retry payment wallets")}</Btn></div>}
    {message && <Banner tone={message.ok ? "success" : "critical"} role={message.ok ? "status" : "alert"}>{vt(message.text)}</Banner>}
    {state.data && <form onSubmit={submit} className="space-y-3 mt-3" data-testid="form-vendor-wallets">
      {drafts.map((wallet, index) => <fieldset key={index} disabled={busy} className="rounded-xl p-3 space-y-3" style={{ border: "1px solid var(--t-border)" }}>
        <legend className="text-xs px-1">{vt("Wallet")} {index + 1}</legend>
        <Field label={(getVendorLanguage() === "zh" ? `币种和网络 ${index + 1}` : `Currency and network ${index + 1}`)}><select required className={fieldCls} style={field} value={`${wallet.currency}|${wallet.network}`} onChange={e => { const [currency, network] = e.target.value.split("|"); update(index, { currency, network }); }}>
          {options.map(o => <option key={`${o.currency}|${o.network}`} value={`${o.currency}|${o.network}`}>{o.currency} · {o.network}</option>)}
        </select></Field>
        <Field label={(getVendorLanguage() === "zh" ? `钱包地址 ${index + 1}` : `Wallet address ${index + 1}`)}><input required maxLength={256} autoComplete="off" spellCheck={false} value={wallet.address} onChange={e => update(index, { address: e.target.value })} className={fieldCls} style={field} /></Field>
        <Field label={(getVendorLanguage() === "zh" ? `标签 ${index + 1}（选填）` : `Label ${index + 1} (optional)`)}><input maxLength={80} value={wallet.label ?? ""} onChange={e => update(index, { label: e.target.value })} className={fieldCls} style={field} /></Field>
        <div className="flex gap-2"><Btn disabled={!wallet.address} onClick={async () => { try { await navigator.clipboard.writeText(wallet.address); setMessage({ ok: true, text: vt("Wallet address copied.") }); } catch { setMessage({ ok: false, text: vt("Could not copy. Select and copy the address manually.") }); } }}>{vt("Copy address")}</Btn><Btn disabled={drafts.length <= 1} onClick={() => setDrafts(rows => rows.filter((_, i) => i !== index))}>{vt("Remove wallet")} {index + 1}</Btn></div>
      </fieldset>)}
      <div className="flex flex-wrap gap-2"><Btn disabled={busy || drafts.length >= 20 || !options.length} onClick={() => setDrafts(rows => [...rows, { currency: options[0].currency, network: options[0].network, address: "", label: "" }])}>{vt("Add wallet")}</Btn><Btn variant="primary" type="submit" disabled={busy || !drafts.length}>{busy ? vt("Saving…") : vt("Save payment wallets")}</Btn></div>
    </form>}
  </Card>;
}
interface VendorPayment { id: string; txid: string; currency: string; network: string; cryptoAmount: string; usdAmount: string; walletSnapshot: { address: string; currency: string; network: string }; orders: { submissionId: string; reference: string; amountUsd: string }[]; paidAt: string; recordedAt: string; voidedAt: string | null; voidReason: string | null }
export function VendorPaymentHistory() {
  useVendorLanguage();
  const [payments, setPayments] = useState<VendorPayment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError(null);
    try { const r = await vendorFetch("/api/vendor/payments"); const body = await r.json(); if (!r.ok || !Array.isArray(body.payments)) throw new Error(body.message ?? vt("Could not load payment history.")); setPayments(body.payments); }
    catch (e) { setError(e instanceof Error ? e.message : vt("Could not load payment history.")); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <Card title={vt("Payment history")} testId="card-vendor-payment-history">
    <p className="text-[13px] mb-3" style={muted}>{vt("Receipts recorded by Peps Anonymous administrators. These records do not verify transactions on the blockchain.")}</p>
    {error && <><Banner tone="critical" role="alert">{vt(error)}</Banner><Btn onClick={load}>{vt("Retry payment history")}</Btn></>}
    {!payments && !error && <p role="status">{vt("Loading payment history…")}</p>}
    {payments?.length === 0 && <p className="text-[13px]" style={muted}>{vt("No payments recorded yet.")}</p>}
    {payments?.map(payment => <article key={payment.id} className="py-3 space-y-1 text-[13px] break-words" style={{ borderTop: "1px solid var(--t-border)" }}>
      <div className="flex flex-wrap items-center gap-2"><strong>{payment.cryptoAmount} {payment.currency} · {payment.network}</strong><Badge tone={payment.voidedAt ? "critical" : "success"}>{payment.voidedAt ? vt("Voided") : vt("Recorded")}</Badge></div>
      <p>{vt("USD amount: $")}{payment.usdAmount}</p><p>{vt("Paid:")} {new Date(payment.paidAt).toLocaleString(getVendorLanguage() === "zh" ? "zh-CN" : "en-GB")} {vt("· Recorded:")} {new Date(payment.recordedAt).toLocaleString(getVendorLanguage() === "zh" ? "zh-CN" : "en-GB")}</p>
      <p>{vt("Transaction ID:")} <span className="font-mono">{payment.txid}</span></p><p>{vt("Receiving wallet:")} {payment.walletSnapshot.currency} · {payment.walletSnapshot.network} · <span className="font-mono">{payment.walletSnapshot.address}</span></p>
      <ul>{payment.orders.map(order => <li key={order.submissionId}>{vt("Order #")}{order.reference}: ${order.amountUsd}</li>)}</ul>
      {payment.voidedAt && <p>{vt("Voided:")} {new Date(payment.voidedAt).toLocaleString(getVendorLanguage() === "zh" ? "zh-CN" : "en-GB")}{payment.voidReason ? ` · ${payment.voidReason}` : ""}</p>}
    </article>)}
  </Card>;
}
