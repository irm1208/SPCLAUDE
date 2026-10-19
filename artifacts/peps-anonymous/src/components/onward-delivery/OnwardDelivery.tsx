import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, RefreshCw, Save, Truck, AlertTriangle, MapPin, Home, Check, Info } from "lucide-react";
import {
  ONWARD_CAPTION, ONWARD_CURRENCIES, RATE_FIELDS, defaultFetcher, filledRateCount, formatOnwardAmount, formatPriceInput,
  methodLabel, normaliseMatrix, onwardApi, parsePriceInput, selectionIsStale, statusMessage,
  type Fetcher, type ManagerScope, type OnwardConfig, type OnwardCurrency, type OnwardEstimate, type OnwardMatrix,
  type OnwardMethod, type RateField,
} from "@/lib/onward-delivery";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
const FIELD_LABEL: Record<RateField, string> = { pickupSmall: "Pickup ≤5", pickupLarge: "Pickup >5–25", homeSmall: "Home ≤5", homeLarge: "Home >5–25" };

// ─── Manager: compact collapsible matrix editor ─────────────────────────────

type MatrixPanelProps = {
  scope: ManagerScope; gbId: string; headers?: Record<string, string>; fetcher?: Fetcher;
};
export function OnwardDeliveryMatrixPanel(props: MatrixPanelProps) {
  return <MatrixPanelBody key={`${props.scope}:${props.gbId}`} {...props} />;
}
function MatrixPanelBody({ scope, gbId, headers, fetcher = defaultFetcher }: MatrixPanelProps) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<OnwardConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headersRef = useRef(headers);
  headersRef.current = headers;

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setConfig(await onwardApi.getConfig(fetcher, scope, gbId, { headers: headersRef.current })); }
    catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); }
  }, [fetcher, scope, gbId]);

  useEffect(() => { if (open && !config && !loading && !error) void load(); }, [open, config, loading, error, load]);

  const configured = config?.reshippers.filter(r => r.matrix?.enabled).length ?? 0;

  return (
    <div className="rounded-xl border border-border bg-background" data-testid="panel-onward-matrix">
      <button type="button" onClick={() => setOpen(o => !o)} data-testid="button-toggle-onward-matrix"
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left">
        {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
        <Truck className="w-3.5 h-3.5" style={{ color: "#2D6BCC" }} />
        <span className="text-xs font-bold">EU onward delivery estimates</span>
        {config && <span className="text-[10px] text-muted-foreground">{configured}/{config.reshippers.length} reshippers enabled</span>}
        <span className="ml-auto text-[10px] text-muted-foreground hidden sm:inline">Reshipper to member, paid when requested</span>
      </button>
      {open && (
        <div className="border-t border-border px-3 py-3 space-y-2.5">
          <p className="text-[11px] text-muted-foreground">{ONWARD_CAPTION} Half kits count as 0.5. Bands: up to 5 kits, then over 5 through 25; above 25 requires a quote. Blank cells mean unavailable.</p>
          {loading && <div className="space-y-1.5">{[0, 1].map(i => <div key={i} className="h-9 rounded-lg bg-muted animate-pulse" />)}</div>}
          {error && (
            <div className="flex items-center justify-between gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <span>{error}</span>
              <button type="button" onClick={() => void load()} className="font-semibold underline" data-testid="button-retry-onward-matrix">Retry</button>
            </div>
          )}
          {config && !loading && config.reshippers.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">Assign a reshipper first, then set their onward rates here.</p>
          )}
          {config && !loading && config.reshippers.map(r => (
            <ReshipperMatrixRow key={r.username} scope={scope} gbId={gbId} fetcher={fetcher} headers={headersRef.current}
              config={config} username={r.username} saved={r.matrix}
              onSaved={m => setConfig(c => c ? { ...c, reshippers: c.reshippers.map(x => x.username === r.username ? { ...x, matrix: m } : x) } : c)} />
          ))}
          {config && !loading && (
            <button type="button" onClick={() => void load()} className="text-[11px] text-muted-foreground inline-flex items-center gap-1 hover:text-foreground" data-testid="button-reload-onward-matrix">
              <RefreshCw className="w-3 h-3" /> Reload from server
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ReshipperMatrixRow({ scope, gbId, fetcher, headers, config, username, saved, onSaved }: {
  scope: ManagerScope; gbId: string; fetcher: Fetcher; headers?: Record<string, string>; config: OnwardConfig;
  username: string; saved: OnwardMatrix | null; onSaved: (m: OnwardMatrix) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<OnwardMatrix>(() => normaliseMatrix(saved, config.countries));
  const [text, setText] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const reset = (m: OnwardMatrix | null) => {
    setDraft(normaliseMatrix(m, config.countries)); setText({}); setDirty(false);
  };
  useEffect(() => { if (!dirty) reset(saved); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [saved]);

  const key = (c: string, f: RateField) => `${c}:${f}`;
  const invalid = Object.entries(text).filter(([, v]) => parsePriceInput(v) === undefined).map(([k]) => k);

  const setCell = (country: string, f: RateField, raw: string) => {
    setText(t => ({ ...t, [key(country, f)]: raw }));
    const v = parsePriceInput(raw);
    if (v !== undefined) setDraft(d => ({ ...d, rates: d.rates.map(r => r.country === country ? { ...r, [f]: v } : r) }));
    setDirty(true); setMsg(null);
  };

  const applyTemplate = () => {
    if (dirty || filledRateCount(draft) > 0) {
      if (!confirm(`Replace @${username}'s rates with the template (${config.template.currency})? Unsaved edits are lost.`)) return;
    }
    setDraft(normaliseMatrix({ ...config.template, enabled: draft.enabled }, config.countries));
    setText({}); setDirty(true); setMsg(null);
  };

  const save = async () => {
    if (invalid.length) { setMsg({ kind: "err", text: "Fix invalid prices (numbers only, up to 2 decimals)." }); return; }
    setSaving(true); setMsg(null);
    try {
      const res = await onwardApi.saveMatrix(fetcher, scope, gbId, username, draft, { headers });
      onSaved(res.matrix); reset(res.matrix);
      setMsg({ kind: "ok", text: "Saved" });
    } catch (e) { setMsg({ kind: "err", text: errMsg(e) }); }
    finally { setSaving(false); }
  };

  const filled = filledRateCount(draft);
  const name = (code: string) => config.countries.find(c => c.code === code)?.name ?? code;

  return (
    <div className="rounded-lg border border-border" data-testid={`row-onward-reshipper-${username}`}>
      <div className="flex items-center gap-2 px-2.5 py-2 flex-wrap">
        <button type="button" onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 min-w-0" data-testid={`button-expand-onward-${username}`}>
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          <span className="text-xs font-semibold truncate">@{username}</span>
        </button>
        <span className="text-[10px] text-muted-foreground">{filled}/{config.countries.length} countries priced</span>
        {dirty && <span className="text-[10px] font-semibold" style={{ color: "#B4770E" }}>Unsaved</span>}
        <label className="ml-auto flex items-center gap-1.5 text-[11px] cursor-pointer">
          <input type="checkbox" checked={draft.enabled} data-testid={`toggle-onward-enabled-${username}`}
            onChange={e => { setDraft(d => ({ ...d, enabled: e.target.checked })); setDirty(true); setMsg(null); }} />
          Show to members
        </label>
      </div>
      {open && (
        <div className="border-t border-border px-2.5 py-2.5 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <select value={draft.currency} data-testid={`select-onward-currency-${username}`}
              onChange={e => { setDraft(d => ({ ...d, currency: e.target.value as OnwardCurrency })); setDirty(true); }}
              className="rounded-md border border-input bg-background px-2 py-1 text-xs">
              {(config.currencies.length ? config.currencies : ONWARD_CURRENCIES).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button type="button" onClick={applyTemplate} data-testid={`button-onward-template-${username}`}
              className="text-[11px] px-2 py-1 rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground">
              Fill from template ({config.template.currency})
            </button>
            {dirty && (
              <button type="button" onClick={() => reset(saved)} className="text-[11px] text-muted-foreground hover:text-foreground" data-testid={`button-onward-discard-${username}`}>Discard</button>
            )}
          </div>
          <div className="overflow-auto max-h-[340px] rounded-md border border-border">
            <table className="w-full text-[11px] border-collapse">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="text-left font-semibold px-2 py-1.5">Country</th>
                  {RATE_FIELDS.map(f => <th key={f} className="text-right font-semibold px-1.5 py-1.5 whitespace-nowrap">{FIELD_LABEL[f]}</th>)}
                </tr>
              </thead>
              <tbody>
                {draft.rates.map(r => (
                  <tr key={r.country} className="border-t border-border">
                    <td className="px-2 py-0.5 whitespace-nowrap"><span className="font-mono font-bold mr-1.5">{r.country}</span><span className="text-muted-foreground">{name(r.country)}</span></td>
                    {RATE_FIELDS.map(f => {
                      const k = key(r.country, f);
                      const bad = invalid.includes(k);
                      return (
                        <td key={f} className="px-1 py-0.5">
                          <input inputMode="decimal" aria-label={`${r.country} ${FIELD_LABEL[f]}`} data-testid={`input-onward-${username}-${r.country}-${f}`}
                            value={text[k] ?? formatPriceInput(r[f])} placeholder="-"
                            onChange={e => setCell(r.country, f, e.target.value)}
                            className="w-full min-w-[56px] text-right rounded border bg-background px-1.5 py-0.5 tabular-nums"
                            style={{ borderColor: bad ? "#ef4444" : "hsl(var(--input))" }} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {(dirty || msg) && (
        <div className="flex items-center gap-2 px-2.5 py-2 border-t border-border">
          {msg && <span className="text-[11px]" style={{ color: msg.kind === "ok" ? "#16a34a" : "#ef4444" }} data-testid={`status-onward-save-${username}`}>{msg.text}</span>}
          {dirty && (
            <button type="button" onClick={() => void save()} disabled={saving} data-testid={`button-onward-save-${username}`}
              className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-60"
              style={{ background: "#1B3A7A" }}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save rates
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Shared estimate presentation ───────────────────────────────────────────

function Frame({ children, testId }: { children: React.ReactNode; testId: string }) {
  return (
    <section className="onward-estimate-card" data-testid={testId} aria-label="Potential onwards delivery charge">
      <header className="onward-estimate-header">
        <span className="onward-estimate-icon"><Truck className="h-4 w-4" aria-hidden="true" /></span>
        <h3>Potential onwards delivery charge</h3>
        <span className="onward-estimate-optional">Optional</span>
      </header>
      <div className="onward-estimate-content">{children}</div>
      <footer className="onward-estimate-footer">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="onward-estimate-payment-note">Estimate only. Paid separately to your reshipper; pay when requested</p>
          <p>Reshipper to you, not vendor shipping. Not included in your order total.</p>
        </div>
      </footer>
    </section>
  );
}

function Notice({ text, warn }: { text: string; warn?: boolean }) {
  return (
    <p className="text-xs flex items-start gap-1.5" data-testid="status-onward" style={{ color: warn ? "#B4770E" : "var(--t-muted)" }}>
      {warn && <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />}{text}
    </p>
  );
}

function OptionButtons({ estimate, value, onSelect, disabled }: {
  estimate: OnwardEstimate; value: OnwardMethod | null; onSelect?: (m: OnwardMethod | null) => void; disabled?: boolean;
}) {
  return (
    <div className="onward-estimate-options" role="group" aria-label="Onward delivery preference">
      {estimate.options.map(o => {
        const on = value === o.method;
        const Icon = o.method === "pickup" ? MapPin : Home;
        return (
          <button key={o.method} type="button" disabled={disabled || !onSelect} data-testid={`button-onward-${o.method}`}
            onClick={() => onSelect?.(on ? null : o.method)} aria-pressed={on}
            className="onward-estimate-option">
            <span className="onward-estimate-option-heading">
              <span className="onward-estimate-method"><Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{methodLabel(o.method)}</span>
              <span className="onward-estimate-check" aria-hidden="true">{on && <Check className="h-3 w-3" />}</span>
            </span>
            <span className="onward-estimate-amount"><span className="onward-estimate-approx">~</span>{formatOnwardAmount(o.amount, estimate.currency)}</span>
          </button>
        );
      })}
    </div>
  );
}

function EstimateBody({ estimate, value, onSelect, disabled }: {
  estimate: OnwardEstimate; value: OnwardMethod | null; onSelect?: (m: OnwardMethod | null) => void; disabled?: boolean;
}) {
  const stale = selectionIsStale(estimate, value);
  const msg = statusMessage(estimate);
  return (
    <>
      {estimate.status === "available" && estimate.options.length > 0 && (
        <>
          <OptionButtons estimate={estimate} value={stale ? null : value} onSelect={onSelect} disabled={disabled} />
          <div className="onward-estimate-context">
            <span>{estimate.kits} kit{estimate.kits === 1 ? "" : "s"}{estimate.country ? ` · ${countryName(estimate.country)}` : ""}</span>
            {estimate.reshipperUsername && <span className="onward-estimate-reshipper">via @{estimate.reshipperUsername}</span>}
          </div>
          {onSelect && !value && <p className="onward-estimate-hint">Choose a preference above. Tap again to clear.</p>}
        </>
      )}
      {msg && <Notice text={msg} warn={estimate.status === "quote_required" || estimate.status === "unavailable"} />}
      {stale && value && (
        <Notice warn text={`Your saved choice (${methodLabel(value)}) is no longer offered at a current rate.${onSelect ? " Please choose again." : ""}`} />
      )}
    </>
  );
}

function countryName(code: string) {
  try { return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code; }
  catch { return code; }
}

const Skeleton = () => <div className="grid grid-cols-2 gap-2">{[0, 1].map(i => <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: "var(--t-surface2, #F4F4F5)" }} />)}</div>;
function ErrorRow({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs" style={{ color: "#ef4444" }}>
      <span>{error}</span>
      <button type="button" onClick={onRetry} className="font-semibold underline" data-testid="button-retry-onward">Retry</button>
    </div>
  );
}

// ─── Member: draft picker (OrderForm + Review) ──────────────────────────────

/** Refetch when the tab regains focus (rates may have changed). */
function useFocusRefetch(cb: () => void) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    const on = () => { if (document.visibilityState === "visible") ref.current(); };
    window.addEventListener("focus", on);
    return () => window.removeEventListener("focus", on);
  }, []);
}

export function OnwardDeliveryPicker({ gbId, country, kits, reshipperCode, directShippingRequested, orderId, value, onChange, readOnly }: {
  gbId: string; country: string | null; kits: number; reshipperCode?: string | null; directShippingRequested?: boolean;
  orderId?: string | null; value: OnwardMethod | null; onChange: (m: OnwardMethod | null) => void; readOnly?: boolean;
}) {
  const [estimate, setEstimate] = useState<OnwardEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const reqId = useRef(0);
  const identity = `${gbId}|${orderId ?? ""}`;
  const identityRef = useRef(identity);

  // A different group buy / order must never show the previous order's estimate.
  if (identityRef.current !== identity) { identityRef.current = identity; if (estimate) setEstimate(null); }

  useEffect(() => {
    const id = ++reqId.current;
    if (!(kits > 0) || directShippingRequested) { setEstimate(null); setError(null); setLoading(false); return; }
    setLoading(true); setError(null);
    const t = setTimeout(() => {
      onwardApi.estimate(defaultFetcher, gbId, {
        country: country ?? "", kits,
        ...(reshipperCode ? { reshipperCode } : {}),
        ...(orderId ? { orderId } : {}),
      })
        .then(e => { if (id === reqId.current) setEstimate(e); })
        .catch(e => { if (id === reqId.current) setError(errMsg(e)); })
        .finally(() => { if (id === reqId.current) setLoading(false); });
    }, 350);
    return () => { clearTimeout(t); };
  }, [gbId, country, kits, reshipperCode, directShippingRequested, orderId, nonce]);

  useFocusRefetch(() => setNonce(n => n + 1));

  const noPricedOption = !!estimate && estimate.options.length === 0
    && (estimate.status === "unavailable" || estimate.status === "available");
  useEffect(() => {
    if (noPricedOption && value && !readOnly) onChange(null);
  }, [noPricedOption, value, readOnly, onChange]);

  if (directShippingRequested) return null;
  // No applicable country/quantity rate means there is nothing to show or select.
  if (noPricedOption) return null;
  if (!(kits > 0)) return null;
  return (
    <Frame testId="card-onward-picker">
      {loading && !estimate ? <Skeleton /> : error ? <ErrorRow error={error} onRetry={() => setNonce(n => n + 1)} /> : estimate && (
        <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={loading}>
          <EstimateBody estimate={estimate} value={value} onSelect={readOnly ? undefined : onChange} disabled={loading} />
        </div>
      )}
    </Frame>
  );
}

// ─── Member: saved order (AccountOrderDetail) ───────────────────────────────

export function OnwardDeliveryOrderCard({ orderId, editable }: { orderId: string; editable: boolean }) {
  const [state, setState] = useState<{ orderId: string; estimate: OnwardEstimate } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const reqId = useRef(0);
  const currentOrder = useRef(orderId);
  currentOrder.current = orderId;
  // Never display an estimate fetched for a different order.
  const estimate = state && state.orderId === orderId ? state.estimate : null;

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true); setError(null); setSaveError(null);
    try {
      const e = await onwardApi.getOrder(defaultFetcher, orderId);
      if (id === reqId.current) setState({ orderId, estimate: e });
    } catch (e) { if (id === reqId.current) setError(errMsg(e)); }
    finally { if (id === reqId.current) setLoading(false); }
  }, [orderId]);
  useEffect(() => { void load(); }, [load]);
  useFocusRefetch(() => { if (!saving) void load(); });

  const select = async (m: OnwardMethod | null) => {
    const forOrder = orderId;
    const id = ++reqId.current;
    setSaving(true); setSaveError(null);
    try {
      const e = await onwardApi.setOrder(defaultFetcher, forOrder, m);
      if (id === reqId.current && currentOrder.current === forOrder) setState({ orderId: forOrder, estimate: e });
    } catch (e) { if (currentOrder.current === forOrder) setSaveError(errMsg(e)); }
    finally { setSaving(false); }
  };

  const busy = loading || saving;
  if (!busy && (estimate?.status === "not_applicable" || (estimate?.status === "unavailable" && estimate.configured === false && !estimate.selectedMethod))) return null;
  return (
    <Frame testId="card-onward-order">
      {!estimate && loading ? <Skeleton /> : error ? <ErrorRow error={error} onRetry={() => void load()} /> : estimate && (
        <div className={busy ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={busy}>
          <EstimateBody estimate={estimate} value={estimate.selectedMethod} onSelect={editable ? m => void select(m) : undefined} disabled={busy} />
          {!estimate.selectedMethod && estimate.options.length > 0 && <Notice text={editable ? "No preference saved." : "No preference was saved."} />}
          {saving && <p className="text-[11px] flex items-center gap-1" style={{ color: "var(--t-subtle)" }}><Loader2 className="w-3 h-3 animate-spin" />Saving</p>}
          {saveError && <ErrorRow error={saveError} onRetry={() => void load()} />}
          {!editable && <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>Locked: this order can no longer be changed.</p>}
        </div>
      )}
    </Frame>
  );
}

// ─── Read-only for organiser / admin / reshipper expanded orders ────────────

export function OnwardDeliveryReadonly({ source }: {
  source: { kind: "manager"; scope: ManagerScope; gbId: string; orderId: string; headers?: Record<string, string> }
        | { kind: "reshipper"; gbId: string; orderId: string; fetcher?: Fetcher };
}) {
  const [estimate, setEstimate] = useState<OnwardEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const srcRef = useRef(source);
  srcRef.current = source;
  const id = `${source.gbId}:${source.orderId}`;

  const reqId = useRef(0);
  const load = useCallback(async () => {
    const s = srcRef.current;
    const rid = ++reqId.current;
    setLoading(true); setError(null); setEstimate(null);
    try {
      const e = s.kind === "manager"
        ? await onwardApi.getManagerOrder(defaultFetcher, s.scope, s.gbId, s.orderId, { headers: s.headers })
        : await onwardApi.getReshipperOrder(s.fetcher ?? defaultFetcher, s.gbId, s.orderId);
      if (rid === reqId.current) setEstimate(e);
    } catch (e) { if (rid === reqId.current) setError(errMsg(e)); }
    finally { if (rid === reqId.current) setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  if (!loading && !error && (estimate?.status === "not_applicable" || (estimate?.status === "unavailable" && !estimate.selectedMethod))) return null;
  const chosen = estimate?.selectedMethod ?? null;
  const opt = estimate?.options.find(o => o.method === chosen);
  return (
    <div className="rounded-lg px-3 py-2 text-xs flex items-center gap-2 flex-wrap" data-testid={`status-onward-readonly-${source.orderId}`}
      style={{ border: "1px dashed var(--t-border, #E4E4E7)" }}>
      <Truck className="w-3 h-3 shrink-0" style={{ color: "var(--t-blue, #2D6BCC)" }} />
      <span className="font-semibold">Onward estimate</span>
      {loading ? <span className="h-3 w-24 rounded animate-pulse" style={{ background: "var(--t-surface2, #F4F4F5)" }} />
        : error ? <><span style={{ color: "#ef4444" }}>{error}</span><button type="button" className="underline" onClick={() => void load()}>Retry</button></>
        : estimate && (
          <>
            {chosen ? (
              opt ? <span>{methodLabel(chosen)} ~{formatOnwardAmount(opt.amount, estimate.currency)}</span>
                  : <span style={{ color: "#B4770E" }}>{methodLabel(chosen)} chosen, no current rate</span>
            ) : <span className="text-muted-foreground">No preference</span>}
            {estimate.status !== "available" && <span className="text-muted-foreground">· {statusMessage(estimate)}</span>}
            <span className="text-muted-foreground">· {estimate.kits} kits{estimate.country ? `, ${estimate.country}` : ""}. Paid to reshipper, not in total.</span>
          </>
        )}
    </div>
  );
}
