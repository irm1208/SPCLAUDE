import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, Copy, Loader2, RefreshCw, Save, ShieldCheck, Wallet, X, AlertTriangle, Send } from "lucide-react";
import type { Fetcher } from "@/lib/onward-delivery";
import { methodLabel } from "@/lib/onward-delivery";
import {
  FIAT_CURRENCIES, STATUS_COLOR, STATUS_LABEL, fmtCrypto, fmtDate, fmtFiat, newIdempotencyKey, onwardPayApi, parseAmount,
  prefillFromEstimate, validateSettings,
  type Charge, type Envelope, type FiatCurrency, type ReadonlySource, type ReshipperOverview, type ReshipperOrderRow, type WalletSettings,
} from "@/lib/onward-payments";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
const isAbort = (e: unknown) => (e as Error)?.name === "AbortError";
const NAVY = "#1B3A7A";

// ─── Shared bits ────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: Charge["status"] }) {
  const c = STATUS_COLOR[status];
  return (
    <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" data-testid={`status-onward-payment-${status}`}
      style={{ color: c, background: `${c}14`, border: `1px solid ${c}40` }}>{STATUS_LABEL[status]}</span>
  );
}

function CopyRow({ label, value, mono, testId }: { label: string; value: string; mono?: boolean; testId: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1400); } catch { /* clipboard blocked */ }
  };
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-[10px] font-bold uppercase tracking-widest w-16 shrink-0" style={{ color: "var(--t-subtle)" }}>{label}</span>
      <span className={`text-xs min-w-0 flex-1 break-all ${mono ? "font-mono" : "font-semibold"}`} style={{ color: "var(--t-text)" }} data-testid={`text-${testId}`}>{value}</span>
      <button type="button" onClick={() => void copy()} aria-label={`Copy ${label}`} data-testid={`button-copy-${testId}`}
        className="shrink-0 p-1.5 rounded-md" style={{ color: done ? "#16a34a" : "var(--t-blue, #2D6BCC)", background: "var(--t-blue-08, rgba(45,107,204,0.08))" }}>
        {done ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}

function ErrorLine({ text, onRetry, testId = "error-onward-payment" }: { text: string; onRetry?: () => void; testId?: string }) {
  return (
    <div role="alert" className="flex items-start gap-1.5 text-xs rounded-lg px-2.5 py-2" data-testid={testId}
      style={{ color: "#b91c1c", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}>
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" /><span className="flex-1">{text}</span>
      {onRetry && <button type="button" className="font-semibold underline" onClick={onRetry} data-testid={`button-retry-${testId}`}>Retry</button>}
    </div>
  );
}

const inputCls = "w-full rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[#2D6BCC]/30";
const inputStyle = { background: "var(--t-bg, #F8FAFC)", border: "1px solid var(--t-border, #D0DAE4)", color: "var(--t-text)" } as const;

function Btn({ children, onClick, disabled, tone = "primary", testId, type = "button" }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; tone?: "primary" | "ghost" | "danger"; testId: string; type?: "button" | "submit";
}) {
  const style = tone === "primary" ? { background: NAVY, color: "#fff" }
    : tone === "danger" ? { background: "transparent", color: "#dc2626", border: "1px solid rgba(239,68,68,0.35)" }
    : { background: "transparent", color: "var(--t-muted)", border: "1px dashed var(--t-border, #D0DAE4)" };
  return (
    <button type={type} onClick={onClick} disabled={disabled} data-testid={testId} style={style}
      className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl disabled:opacity-50 transition-opacity">{children}</button>
  );
}

/** Payment instructions + figures for one charge. */
function ChargeDetails({ c, showWallet }: { c: Charge; showWallet: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-lg font-bold tabular-nums" style={{ color: "var(--t-text)" }} data-testid={`text-onward-charge-amount-${c.id}`}>{fmtFiat(c.amount, c.currency)}</span>
        <span className="text-[11px]" style={{ color: "var(--t-subtle)" }}>{methodLabel(c.method)} via @{c.reshipperUsername}</span>
      </div>
      {c.note && <p className="text-xs" style={{ color: "var(--t-muted)" }}>{c.note}</p>}
      {showWallet && (
        <div className="rounded-lg p-2.5 space-y-1.5" style={{ background: "var(--t-surface2, #F4F4F5)" }}>
          <CopyRow label="Send" value={`${fmtCrypto(c.cryptoAmount)} ${c.wallet.currency}`} testId={`onward-crypto-${c.id}`} />
          <CopyRow label="Network" value={c.wallet.network} testId={`onward-network-${c.id}`} />
          <CopyRow label="Address" value={c.wallet.walletAddress} mono testId={`onward-address-${c.id}`} />
        </div>
      )}
      {c.txHash && <CopyRow label="TX" value={c.txHash} mono testId={`onward-tx-${c.id}`} />}
      {c.verificationNote && <p className="text-[11px]" style={{ color: c.status === "paid" ? "var(--t-muted)" : "#B4770E" }} data-testid={`text-onward-verification-${c.id}`}>{c.verificationNote}</p>}
      <p className="text-[10px]" style={{ color: "var(--t-subtle)" }}>
        Requested {fmtDate(c.createdAt)}{c.submittedAt ? ` · submitted ${fmtDate(c.submittedAt)}` : ""}{c.confirmedAt ? ` · confirmed ${fmtDate(c.confirmedAt)}` : ""}
        {` · ${c.confirmationMode === "automatic" ? "Automatic blockchain verification" : "Manual confirmation"}`}
      </p>
    </div>
  );
}

function History({ items, currentId }: { items: Charge[]; currentId?: string }) {
  const rest = items.filter(h => h.id !== currentId);
  const [open, setOpen] = useState(false);
  if (!rest.length) return null;
  return (
    <div>
      <button type="button" onClick={() => setOpen(o => !o)} className="text-[11px] inline-flex items-center gap-1" style={{ color: "var(--t-muted)" }} data-testid="button-toggle-onward-history">
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />} Earlier requests ({rest.length})
      </button>
      {open && (
        <ul className="mt-1.5 space-y-1">
          {rest.map(h => (
            <li key={h.id} className="flex items-center gap-2 text-[11px] flex-wrap" data-testid={`row-onward-history-${h.id}`}>
              <StatusPill status={h.status} />
              <span className="tabular-nums font-semibold" style={{ color: "var(--t-text)" }}>{fmtFiat(h.amount, h.currency)}</span>
              <span style={{ color: "var(--t-subtle)" }}>{fmtDate(h.createdAt)}</span>
              {h.verificationNote && <span style={{ color: "#B4770E" }}>{h.verificationNote}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Member card (AccountOrderDetail) ───────────────────────────────────────

export function OnwardPaymentCard({ orderId }: { orderId: string }) {
  return <MemberCardBody key={orderId} orderId={orderId} />;
}
function MemberCardBody({ orderId }: { orderId: string }) {
  const [env, setEnv] = useState<Envelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tx, setTx] = useState("");
  const [busy, setBusy] = useState<"submit" | "verify" | null>(null);
  const [actErr, setActErr] = useState<string | null>(null);
  const ctl = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    ctl.current?.abort();
    const c = new AbortController(); ctl.current = c;
    setLoading(true); setError(null);
    try { const r = await onwardPayApi.member(orderId, c.signal); if (!c.signal.aborted) setEnv(r); }
    catch (e) { if (!isAbort(e) && !c.signal.aborted) setError(errMsg(e)); }
    finally { if (!c.signal.aborted) setLoading(false); }
  }, [orderId]);
  useEffect(() => { void load(); return () => ctl.current?.abort(); }, [load]);

  const req = env?.request ?? null;
  useEffect(() => {
    const focus = () => { if (document.visibilityState === "visible") void load(); };
    window.addEventListener("focus", focus);
    const timer = req?.status === "pending_confirmation" ? window.setInterval(focus, 15_000) : null;
    return () => { window.removeEventListener("focus", focus); if (timer !== null) window.clearInterval(timer); };
  }, [load, req?.status]);
  const run = async (kind: "submit" | "verify") => {
    if (!req) return;
    setBusy(kind); setActErr(null);
    try {
      const r = kind === "submit" ? await onwardPayApi.submit(orderId, req.id, tx.trim()) : await onwardPayApi.verify(orderId, req.id);
      setEnv(r); if (kind === "submit") setTx("");
    } catch (e) { setActErr(errMsg(e)); }
    finally { setBusy(null); }
  };

  if (!loading && !error && (!env || (!env.request && env.history.length === 0))) return null;
  if (loading && !env) return null; // stay invisible until we know a request exists

  return (
    <section className="rounded-xl overflow-hidden" data-testid="card-onward-payment"
      style={{ background: "var(--t-surface, #fff)", border: "1px solid var(--t-border, #E4E4E7)" }}>
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "linear-gradient(135deg, #2D6BCC 0%, #1B3A7A 100%)" }}>
        <Wallet className="w-3.5 h-3.5 text-white" />
        <p className="text-xs font-bold text-white">Onward delivery payment</p>
        <span className="ml-auto text-[10px]" style={{ color: "rgba(255,255,255,0.75)" }}>Separate from your product payment</span>
      </div>
      <div className="px-4 py-3 space-y-3">
        {error && <ErrorLine text={error} onRetry={() => void load()} />}
        {req ? (
          <>
            <div className="flex items-center gap-2"><StatusPill status={req.status} />
              {loading && <Loader2 className="w-3 h-3 animate-spin" style={{ color: "var(--t-subtle)" }} />}</div>
            <ChargeDetails c={req} showWallet={!!env?.canSubmit && (req.status === "unpaid" || req.status === "pending_confirmation")} />
            {!env?.canSubmit && (req.status === "unpaid" || req.status === "pending_confirmation") && (
              <ErrorLine text="The order or reshipper assignment has changed. Do not send another payment; contact your organiser to resolve this request." />
            )}
            {req.status === "unpaid" && env?.canSubmit && (
              <form className="space-y-1.5" onSubmit={e => { e.preventDefault(); if (tx.trim()) void run("submit"); }}>
                <label htmlFor={`tx-${req.id}`} className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Transaction hash (TXID)</label>
                <div className="flex gap-2">
                  <input id={`tx-${req.id}`} value={tx} onChange={e => setTx(e.target.value)} placeholder="Paste the TXID after sending" autoComplete="off" spellCheck={false}
                    className={`${inputCls} font-mono`} style={inputStyle} data-testid="input-onward-txhash" />
                  <Btn type="submit" disabled={!tx.trim() || busy !== null} testId="button-onward-submit-tx">
                    {busy === "submit" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Submit
                  </Btn>
                </div>
                <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>Send exactly the amount above on the stated network, then submit the TXID. No screenshot needed.</p>
              </form>
            )}
            {req.status === "pending_confirmation" && (
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[11px] flex-1" style={{ color: "var(--t-muted)" }}>
                  {req.confirmationMode === "automatic" ? "Checking the blockchain. This retries automatically; you can also check now." : "Waiting for your reshipper to confirm they received it."}
                </p>
                {req.confirmationMode === "automatic" && (
                  <Btn tone="ghost" onClick={() => void run("verify")} disabled={busy !== null} testId="button-onward-verify">
                    {busy === "verify" ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Check now
                  </Btn>
                )}
              </div>
            )}
            {req.status === "paid" && <p className="text-[11px] flex items-center gap-1" style={{ color: "#16a34a" }}><ShieldCheck className="w-3.5 h-3.5" />Onward delivery paid. Thank you.</p>}
          </>
        ) : <p className="text-xs" style={{ color: "var(--t-muted)" }}>No open onward delivery payment.</p>}
        {actErr && <ErrorLine text={actErr} testId="error-onward-action" />}
        <History items={env?.history ?? []} currentId={req?.id} />
      </div>
    </section>
  );
}

// ─── Read-only (organiser / admin / reshipper order views) ──────────────────

export function OnwardPaymentReadonly({ source }: { source: ReadonlySource }) {
  const [env, setEnv] = useState<{ key: string; data: Envelope } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const srcRef = useRef(source); srcRef.current = source;
  const key = `${source.kind}:${source.gbId}:${source.orderId}`;
  const ctl = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    ctl.current?.abort();
    const c = new AbortController(); ctl.current = c;
    setLoading(true); setError(null);
    try { const d = await onwardPayApi.inspect(srcRef.current, c.signal); if (!c.signal.aborted) setEnv({ key, data: d }); }
    catch (e) { if (!isAbort(e) && !c.signal.aborted) setError(errMsg(e)); }
    finally { if (!c.signal.aborted) setLoading(false); }
  }, [key]);
  useEffect(() => { void load(); return () => ctl.current?.abort(); }, [load]);

  const data = env?.key === key ? env.data : null;
  if (loading && !data) return null;
  if (!error && (!data || (!data.request && data.history.length === 0))) return null;
  const r = data?.request ?? data?.history[0] ?? null;
  return (
    <div className="rounded-lg px-3 py-2 text-xs flex items-center gap-2 flex-wrap" data-testid={`status-onward-payment-readonly-${source.orderId}`}
      style={{ border: "1px dashed var(--t-border, #E4E4E7)" }}>
      <Wallet className="w-3 h-3 shrink-0" style={{ color: "var(--t-blue, #2D6BCC)" }} />
      <span className="font-semibold">Onward payment</span>
      {error ? <><span style={{ color: "#ef4444" }}>{error}</span><button type="button" className="underline" onClick={() => void load()} data-testid="button-retry-onward-payment-readonly">Retry</button></>
        : r && (
          <>
            <StatusPill status={r.status} />
            <span className="tabular-nums">{fmtFiat(r.amount, r.currency)} ({fmtCrypto(r.cryptoAmount)} {r.wallet.currency}, {r.wallet.network})</span>
            {r.txHash && <span className="font-mono truncate max-w-[180px]" title={r.txHash} style={{ color: "var(--t-subtle)" }}>TX {r.txHash}</span>}
            {r.verificationNote && <span style={{ color: "#B4770E" }}>{r.verificationNote}</span>}
            <span className="text-muted-foreground">· @{r.reshipperUsername}, {r.confirmationMode}. Not in order total.</span>
          </>
        )}
    </div>
  );
}

// ─── Reshipper manager (Shipping tab) ───────────────────────────────────────

export function OnwardPaymentManager({ gbId, fetcher, walletReadOnly = false }: { gbId: string; fetcher: Fetcher; walletReadOnly?: boolean }) {
  return <ManagerBody key={gbId} gbId={gbId} fetcher={fetcher} walletReadOnly={walletReadOnly} />;
}

function ManagerBody({ gbId, fetcher, walletReadOnly }: { gbId: string; fetcher: Fetcher; walletReadOnly: boolean }) {
  const [data, setData] = useState<ReshipperOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fRef = useRef(fetcher); fRef.current = fetcher;
  const ctl = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    ctl.current?.abort();
    const c = new AbortController(); ctl.current = c;
    setLoading(true); setError(null);
    try { const d = await onwardPayApi.overview(fRef.current, gbId, c.signal); if (!c.signal.aborted) setData(d); }
    catch (e) { if (!isAbort(e) && !c.signal.aborted) setError(errMsg(e)); }
    finally { if (!c.signal.aborted) setLoading(false); }
  }, [gbId]);
  useEffect(() => { void load(); return () => ctl.current?.abort(); }, [load]);

  const patchRow = (orderId: string, env: Envelope) => {
    setData(d => d ? { ...d, orders: d.orders.map(o => o.id === orderId ? { ...o, request: env.request } : o) } : d);
    void load();
  };

  return (
    <section className="rounded-2xl p-4 space-y-4" data-testid="panel-onward-payments" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Onward delivery payments</p>
        <button type="button" onClick={() => void load()} disabled={loading} className="ml-auto text-[11px] inline-flex items-center gap-1 disabled:opacity-50" style={{ color: "var(--t-muted)" }} data-testid="button-reload-onward-payments">
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>
      <p className="text-[11px] -mt-2" style={{ color: "var(--t-subtle)" }}>{walletReadOnly ? "Manage charges on behalf of the selected reshipper, paid to their separate onward wallet." : "Charge members for delivery from you to them, paid in crypto to your onward wallet."} Separate from product payments and never added to order totals.</p>
      {error && <ErrorLine text={error} onRetry={() => void load()} />}
      {loading && !data && <div className="space-y-2">{[0, 1, 2].map(i => <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: "var(--t-surface2)" }} />)}</div>}
      {data && (
        <>
          {walletReadOnly ? (
            <div className="rounded-xl border p-3 text-xs space-y-1" style={{ borderColor: "var(--t-border)", color: "var(--t-muted)" }} data-testid="organiser-onward-wallet">
              <p className="font-semibold">Reshipper’s onward wallet · {data.settings.enabled ? data.settings.confirmationMode : "Not enabled"}</p>
              {data.settings.enabled ? <p className="break-all">{data.settings.walletAddress} · {data.settings.currency} / {data.settings.network}</p>
                : <p>Ask the reshipper to enable their onward wallet in their Shipping tab before issuing requests.</p>}
              <p>Wallet changes stay with the reshipper. Existing requests retain their original wallet and amount.</p>
            </div>
          ) : <WalletSettingsForm gbId={gbId} fetcher={fetcher} saved={data.settings} rails={data.rails}
            onSaved={s => setData(d => d ? { ...d, settings: s } : d)} />}
          <div className="rounded-xl p-3 text-xs space-y-1" style={{ background: "var(--t-blue-08, rgba(45,107,204,0.08))", border: "1px solid var(--t-blue-20, rgba(45,107,204,0.2))", color: "var(--t-text)" }}>
            <p className="font-semibold">Enabling your wallet does not send payment requests.</p>
            <p style={{ color: "var(--t-muted)" }}>
              {data.settings.enabled
                ? "Choose Request payment beside an order below, review the delivery method and final amount, then send the request."
                : "Save and enable your onward wallet, then choose Request payment beside an order below."}
              {" "}The member’s order page will then show the amount, receiving wallet and payment confirmation form.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>EU orders ({data.orders.length})</p>
            {data.orders.length === 0 && <p className="text-xs py-3 text-center rounded-lg" style={{ color: "var(--t-muted)", background: "var(--t-surface2)" }}>No active EU orders assigned to you in this group buy.</p>}
            {data.orders.map(o => <OrderChargeRow key={o.id} gbId={gbId} fetcher={fetcher} row={o} walletReady={data.settings.enabled} onEnvelope={env => patchRow(o.id, env)} />)}
          </div>
        </>
      )}
    </section>
  );
}

function WalletSettingsForm({ gbId, fetcher, saved, rails, onSaved }: {
  gbId: string; fetcher: Fetcher; saved: WalletSettings; rails: ReshipperOverview["rails"]; onSaved: (s: WalletSettings) => void;
}) {
  const [draft, setDraft] = useState<WalletSettings>(saved);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // Only adopt server values when there are no unsaved edits.
  useEffect(() => { if (!dirty) setDraft(saved); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [saved]);

  const set = (p: Partial<WalletSettings>) => { setDraft(d => ({ ...d, ...p })); setDirty(true); setMsg(null); };
  const railKey = `${draft.currency}|${draft.network}`;
  const save = async () => {
    const v = validateSettings(draft);
    if (v) { setMsg({ ok: false, text: v }); return; }
    setSaving(true); setMsg(null);
    try {
      const r = await onwardPayApi.saveSettings(fetcher, gbId, { ...draft, walletAddress: draft.walletAddress.trim() });
      setDirty(false); setDraft(r.settings); onSaved(r.settings);
      setMsg({ ok: true, text: r.settings.enabled
        ? "Wallet saved. Next, choose Request payment beside an order below. Existing requests keep their original wallet."
        : "Wallet saved. Enable Accept payments before issuing new requests. Existing requests keep their original wallet." });
    } catch (e) { setMsg({ ok: false, text: errMsg(e) }); } // draft retained
    finally { setSaving(false); }
  };

  return (
    <fieldset disabled={saving} className="rounded-xl p-3 space-y-2.5 min-w-0" style={{ border: "1px solid var(--t-border)", background: "var(--t-bg, #F8FAFC)" }} data-testid="form-onward-wallet">
      <div className="flex items-center gap-2">
        <Wallet className="w-3.5 h-3.5" style={{ color: "var(--t-blue, #2D6BCC)" }} />
        <span className="text-xs font-bold" style={{ color: "var(--t-text)" }}>Onward wallet</span>
        {dirty && <span className="text-[10px] font-semibold" style={{ color: "#B4770E" }}>Unsaved</span>}
        <label className="ml-auto flex items-center gap-1.5 text-[11px] cursor-pointer" style={{ color: "var(--t-text)" }}>
          <input type="checkbox" checked={draft.enabled} onChange={e => set({ enabled: e.target.checked })} data-testid="toggle-onward-wallet-enabled" /> Accept payments
        </label>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <label className="space-y-1 block">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Token / network</span>
          <select value={railKey} onChange={e => { const [currency, network] = e.target.value.split("|"); set({ currency, network }); }}
            className={inputCls} style={inputStyle} data-testid="select-onward-rail">
            {!rails.some(r => `${r.currency}|${r.network}` === railKey) && <option value={railKey}>{draft.currency ? `${draft.currency} on ${draft.network}` : "Choose"}</option>}
            {rails.map(r => <option key={`${r.currency}|${r.network}`} value={`${r.currency}|${r.network}`}>{r.currency} on {r.network}</option>)}
          </select>
        </label>
        <label className="space-y-1 block">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Confirmation</span>
          <select value={draft.confirmationMode} onChange={e => set({ confirmationMode: e.target.value as WalletSettings["confirmationMode"] })}
            className={inputCls} style={inputStyle} data-testid="select-onward-mode">
            <option value="manual">Manual (I confirm receipt)</option>
            <option value="automatic">Automatic (on-chain check)</option>
          </select>
        </label>
      </div>
      <label className="space-y-1 block">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Wallet address</span>
        <input value={draft.walletAddress} onChange={e => set({ walletAddress: e.target.value })} spellCheck={false} autoComplete="off"
          className={`${inputCls} font-mono`} style={inputStyle} placeholder="Your onward-delivery receiving address" data-testid="input-onward-wallet-address" />
      </label>
      <p className="text-[10px]" style={{ color: "var(--t-subtle)" }}>Used only for onward delivery charges, not product payments. Save wallet changes before issuing requests.</p>
      {(dirty || msg) && (
        <div className="flex items-center gap-2 flex-wrap">
          {msg && <span className="text-[11px] flex-1" role={msg.ok ? "status" : "alert"} style={{ color: msg.ok ? "#16a34a" : "#dc2626" }} data-testid="status-onward-wallet-save">{msg.text}</span>}
          {dirty && <>
            <Btn tone="ghost" onClick={() => { setDraft(saved); setDirty(false); setMsg(null); }} disabled={saving} testId="button-onward-wallet-discard">Discard</Btn>
            <Btn onClick={() => void save()} disabled={saving} testId="button-onward-wallet-save">{saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save wallet</Btn>
          </>}
        </div>
      )}
    </fieldset>
  );
}

function OrderChargeRow({ gbId, fetcher, row, walletReady, onEnvelope }: {
  gbId: string; fetcher: Fetcher; row: ReshipperOrderRow; walletReady: boolean; onEnvelope: (e: Envelope) => void;
}) {
  const [open, setOpen] = useState(false);
  const initialMethod = row.estimate.selectedMethod ?? "home";
  const pre = prefillFromEstimate(row.estimate, initialMethod);
  const [method, setMethod] = useState<"pickup" | "home">(initialMethod);
  const [amount, setAmount] = useState(pre.amount);
  const [currency, setCurrency] = useState<FiatCurrency>(pre.currency ?? "EUR");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const idemKey = useRef(newIdempotencyKey());
  const r = row.request;
  const active = r && r.status !== "cancelled" ? r : null;

  const act = async (name: string, fn: () => Promise<Envelope>) => {
    setBusy(name); setErr(null);
    try { const env = await fn(); onEnvelope(env); return true; }
    catch (e) { setErr(errMsg(e)); return false; }
    finally { setBusy(null); }
  };
  const create = async () => {
    const a = parseAmount(amount);
    if (a === null) { setErr("Enter a positive amount (up to 2 decimals)."); return; }
    const ok = await act("create", () => onwardPayApi.create(fetcher, gbId, row.id, { idempotencyKey: idemKey.current, amount: a, currency, method, ...(note.trim() ? { note: note.trim() } : {}) }));
    if (ok) { idemKey.current = newIdempotencyKey(); setNote(""); }
  };
  const usePrefill = () => { const p = prefillFromEstimate(row.estimate, method); if (p.amount) { setAmount(p.amount); if (p.currency) setCurrency(p.currency); } };
  const prefillAvailable = !!prefillFromEstimate(row.estimate, method).amount;

  return (
    <div className="rounded-xl" style={{ border: "1px solid var(--t-border)" }} data-testid={`row-onward-payment-${row.id}`}>
      <div className="flex items-center gap-2 px-3 py-2 flex-wrap">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls={`onward-payment-details-${row.id}`}
        className="min-h-11 min-w-0 flex-1 flex items-center gap-2 text-left flex-wrap" data-testid={`button-expand-onward-payment-${row.id}`}>
        {open ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
        <span className="text-xs font-bold font-mono" style={{ color: "var(--t-text)" }}>#{row.code}</span>
        <span className="text-xs truncate" style={{ color: "var(--t-muted)" }}>@{row.username}</span>
        <span className="text-[10px]" style={{ color: "var(--t-subtle)" }}>{row.country} · {row.kits} kits</span>
        <span className="ml-auto">{active ? <StatusPill status={active.status} /> : <span className="text-[10px]" style={{ color: "var(--t-subtle)" }}>Not requested</span>}</span>
      </button>
      {!active && row.canRequest && (
        <button type="button" onClick={() => setOpen(true)} disabled={!walletReady || busy !== null}
          aria-expanded={open} aria-controls={`onward-payment-details-${row.id}`}
          title={walletReady ? `Review and request onward delivery payment for order #${row.code}` : "Save and enable your onward wallet first"}
          className="min-h-11 rounded-xl px-3 py-2 text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0 max-w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: "#1B3A7A", color: "#fff" }} data-testid={`button-onward-open-request-${row.id}`}>
          <Send className="w-3 h-3 shrink-0" />Request payment
        </button>
      )}
      </div>
      {open && (
        <div id={`onward-payment-details-${row.id}`} className="border-t px-3 py-3 space-y-3" style={{ borderColor: "var(--t-border)" }}>
          {active ? (
            <>
              <ChargeDetails c={active} showWallet />
              {active.status === "unpaid" && (
                <Btn tone="danger" onClick={() => { if (confirm("Cancel this onward payment request?")) void act("cancel", () => onwardPayApi.action(fetcher, gbId, row.id, active.id, "cancel")); }}
                  disabled={busy !== null} testId={`button-onward-cancel-${row.id}`}>{busy === "cancel" ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />} Cancel request</Btn>
              )}
              {active.status === "pending_confirmation" && (
                <div className="space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    <Btn onClick={() => { if (confirm(`Confirm you received ${fmtCrypto(active.cryptoAmount)} ${active.wallet.currency}?`)) void act("confirm", () => onwardPayApi.action(fetcher, gbId, row.id, active.id, "confirm")); }}
                      disabled={busy !== null} testId={`button-onward-confirm-${row.id}`}>{busy === "confirm" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Mark paid</Btn>
                    <Btn tone="danger" onClick={() => setRejecting(v => !v)} disabled={busy !== null} testId={`button-onward-reject-toggle-${row.id}`}>Reject TX</Btn>
                  </div>
                  {rejecting && (
                    <div className="flex gap-2">
                      <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason shown to the member" className={inputCls} style={inputStyle} data-testid={`input-onward-reject-reason-${row.id}`} />
                      <Btn tone="danger" disabled={!reason.trim() || busy !== null} testId={`button-onward-reject-${row.id}`}
                        onClick={() => void act("reject", () => onwardPayApi.action(fetcher, gbId, row.id, active.id, "reject", { reason: reason.trim() })).then(ok => { if (ok) { setReason(""); setRejecting(false); } })}>
                        {busy === "reject" ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Reject
                      </Btn>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : !row.canRequest ? (
            <p className="text-xs" style={{ color: "var(--t-muted)" }}>{row.requestBlockedReason || "A payment request cannot be created for this order right now."}</p>
          ) : !walletReady ? (
            <p className="text-xs" style={{ color: "#B4770E" }}>Save and enable your onward wallet above before requesting payment.</p>
          ) : (
              <form onSubmit={e => { e.preventDefault(); void create(); }}>
                <fieldset disabled={busy !== null} className="space-y-2 min-w-0">
              <p className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>Review onward delivery charge</p>
              <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>Sending this request adds payment instructions to this member’s order page. Opening this form does not charge them.</p>
              <div className="grid grid-cols-2 gap-2">
                {(["pickup", "home"] as const).map(m => (
                  <button key={m} type="button" onClick={() => setMethod(m)} aria-pressed={method === m} data-testid={`button-onward-charge-method-${m}-${row.id}`}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-left"
                    style={{ border: method === m ? "1.5px solid var(--t-blue, #2D6BCC)" : "1px solid var(--t-border)", background: method === m ? "var(--t-blue-08, rgba(45,107,204,0.08))" : "transparent", color: "var(--t-text)" }}>
                    {methodLabel(m)}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Final amount" aria-label="Final amount"
                  className={`${inputCls} tabular-nums`} style={inputStyle} data-testid={`input-onward-charge-amount-${row.id}`} />
                <select value={currency} onChange={e => setCurrency(e.target.value as FiatCurrency)} aria-label="Currency"
                  className="rounded-lg px-2 text-xs" style={inputStyle} data-testid={`select-onward-charge-currency-${row.id}`}>
                  {FIAT_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {prefillAvailable && <button type="button" onClick={usePrefill} className="text-[11px] underline" style={{ color: "var(--t-blue, #2D6BCC)" }} data-testid={`button-onward-prefill-${row.id}`}>Use estimate for {methodLabel(method).toLowerCase()}</button>}
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note to member (optional)" maxLength={300}
                className={inputCls} style={inputStyle} data-testid={`input-onward-charge-note-${row.id}`} />
              <div className="flex items-center gap-2">
                <p className="text-[10px] flex-1" style={{ color: "var(--t-subtle)" }}>You set the final amount. The member pays the crypto equivalent to your onward wallet.</p>
                <Btn type="submit" disabled={busy !== null || !amount.trim()} testId={`button-onward-charge-create-${row.id}`}>
                  {busy === "create" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Request payment
                </Btn>
              </div>
                </fieldset>
              </form>
          )}
          {err && <ErrorLine text={err} testId={`error-onward-charge-${row.id}`} />}
        </div>
      )}
    </div>
  );
}
