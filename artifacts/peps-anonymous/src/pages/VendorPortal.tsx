import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, Clock, Home, Loader2, LogOut, Lock, Package, RefreshCw, Truck } from "lucide-react";

export interface VendorOrderItem { productName: string; quantity: number; unitCost: string; lineTotal: string }
export interface VendorOrder {
  id: string; reference: string; status: string; submittedAt: string; stale: boolean;
  items: VendorOrderItem[]; currency: string; productCost: string; shippingCost: string; totalCost: string;
  shipping: { name: string; address: string; country: string; phone: string; email: string };
  trackingNumber: string | null; carrier: string | null;
  images: { id: string; filename: string; url: string; createdAt: string }[];
}
interface VendorMe { vendorId: string; vendorName: string; username: string }

async function errorText(r: Response, fallback: string) {
  const b = await r.json().catch(() => null);
  return (b && typeof b.error === "string" ? b.error : fallback) + ` (${r.status})`;
}

export function money(v: string, currency = "USD") {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
}
function date(v: string) { const d = new Date(v); return isNaN(d.getTime()) ? v : d.toLocaleString(); }

export function StatusPill({ status, stale }: { status: string; stale?: boolean }) {
  if (stale) return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ color: "#B45309", background: "rgba(233,160,32,0.14)" }}>Stale - on hold</span>;
  const s = status.toLowerCase();
  const c = s.includes("ship") || s.includes("track") ? ["#16A34A", "rgba(22,163,74,0.1)"] : s.includes("process") ? ["var(--t-blue)", "var(--t-blue-10)"] : ["#64748B", "rgba(100,116,139,0.12)"];
  return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full capitalize" style={{ color: c[0], background: c[1] }} data-testid="status-order">{status.replace(/_/g, " ")}</span>;
}

export function CostBreakdown({ order }: { order: VendorOrder }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--t-border)" }}>
      <table className="w-full text-sm">
        <thead><tr style={{ background: "var(--t-surface2)", color: "var(--t-subtle)" }} className="text-[10px] uppercase tracking-widest">
          <th className="text-left p-2.5">Product</th><th className="text-right p-2.5">Qty</th><th className="text-right p-2.5 hidden sm:table-cell">Unit cost</th><th className="text-right p-2.5">Line</th></tr></thead>
        <tbody>{order.items.map((it, i) => (
          <tr key={i} style={{ borderTop: "1px solid var(--t-border)", color: "var(--t-text)" }}>
            <td className="p-2.5">{it.productName}</td><td className="p-2.5 text-right tabular-nums">{it.quantity}</td>
            <td className="p-2.5 text-right tabular-nums hidden sm:table-cell">{money(it.unitCost, order.currency)}</td>
            <td className="p-2.5 text-right tabular-nums">{money(it.lineTotal, order.currency)}</td></tr>))}</tbody>
      </table>
      <dl className="text-sm p-3 space-y-1" style={{ borderTop: "1px solid var(--t-border)", background: "var(--t-blue-03)" }}>
        <div className="flex justify-between"><dt style={{ color: "var(--t-muted)" }}>Product cost</dt><dd className="tabular-nums">{money(order.productCost, order.currency)}</dd></div>
        <div className="flex justify-between"><dt style={{ color: "var(--t-muted)" }}>Shipping cost</dt><dd className="tabular-nums">{money(order.shippingCost, order.currency)}</dd></div>
        <div className="flex justify-between font-bold" style={{ color: "var(--t-text)" }}><dt>Total cost</dt><dd className="tabular-nums" data-testid={`text-total-${order.id}`}>{money(order.totalCost, order.currency)}</dd></div>
      </dl>
    </div>
  );
}

export function ShippingBlock({ order }: { order: VendorOrder }) {
  const s = order.shipping;
  return (
    <address className="not-italic text-sm rounded-xl p-3 whitespace-pre-line" style={{ border: "1px solid var(--t-border)", color: "var(--t-text)" }}>
      <strong>{s.name}</strong>{"\n"}{s.address}{"\n"}{s.country}
      <span className="block mt-1 text-xs" style={{ color: "var(--t-muted)" }}>{s.phone}{s.phone && s.email ? " · " : ""}{s.email}</span>
    </address>
  );
}

const card = { background: "var(--t-surface)", border: "1px solid var(--t-border)" };
const btnPrimary = "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90";

export default function VendorPortal() {
  const [me, setMe] = useState<VendorMe | null>(null);
  const [authState, setAuthState] = useState<"loading" | "ok" | "401" | "403" | "error">("loading");
  const [orders, setOrders] = useState<VendorOrder[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");

  useEffect(() => {
    fetch("/api/vendor/me", { credentials: "include" }).then(async r => {
      if (r.status === 401) return setAuthState("401");
      if (r.status === 403) return setAuthState("403");
      if (!r.ok) return setAuthState("error");
      setMe(await r.json()); setAuthState("ok");
    }).catch(() => setAuthState("error"));
  }, []);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/vendor/orders", { credentials: "include" });
      if (!r.ok) throw new Error(await errorText(r, "Could not load orders"));
      const b = await r.json();
      setOrders(Array.isArray(b?.orders) ? b.orders : []); setListError(null);
    } catch (e) { setListError(e instanceof Error ? e.message : "Could not load orders"); }
  }, []);

  useEffect(() => {
    if (authState !== "ok") return;
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [authState, load]);

  const logout = async () => {
    await fetch("/api/account/logout", { method: "POST", credentials: "include" }).catch(() => undefined);
    window.location.assign("/vendor/login");
  };

  const visible = useMemo(() => (orders ?? []).filter(o => filter === "all" || !o.trackingNumber), [orders, filter]);
  const current = orders?.find(o => o.id === selected) ?? null;

  if (authState === "loading") return <Shell><div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "var(--t-surface2)" }} />)}</div></Shell>;
  if (authState !== "ok") {
    const msg = authState === "401" ? ["Sign in required", "Sign in with your vendor account to view assigned shipments."]
      : authState === "403" ? ["Restricted area", "This account does not have vendor portal access. Contact Peps Anonymous if you believe this is wrong."]
      : ["Portal unavailable", "We could not reach the server. Try again shortly."];
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center rounded-3xl p-8" style={card} data-testid={`state-auth-${authState}`}>
          <Lock className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--t-blue)" }} />
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--t-text)" }}>{msg[0]}</h1>
          <p className="text-sm mb-5" style={{ color: "var(--t-muted)" }}>{msg[1]}</p>
          {authState === "401" ? <a href="/vendor/login" className={btnPrimary} style={{ background: "#1B3A7A" }} data-testid="link-login">Sign in</a>
            : authState === "403" ? <a href="/vendor/login" className={btnPrimary} style={{ background: "#1B3A7A" }} data-testid="link-switch-account">Switch account</a>
            : authState === "error" ? <button className={btnPrimary} style={{ background: "#1B3A7A" }} onClick={() => window.location.reload()} data-testid="button-reload">Retry</button>
            : <Link href="/" className={btnPrimary} style={{ background: "#1B3A7A" }} data-testid="link-home">Back to home</Link>}
        </div>
      </Shell>
    );
  }

  return (
    <Shell me={me} onLogout={logout}>
      {current ? <OrderDetail order={current} onBack={() => setSelected(null)} onChanged={load} /> : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Fulfilment queue</p>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: "var(--t-text)" }}>Assigned shipments</h1>
            </div>
            <div className="flex gap-2" role="tablist">
              {(["open", "all"] as const).map(f => (
                <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} data-testid={`button-filter-${f}`}
                  className="px-3 py-2 rounded-xl text-xs font-bold" style={filter === f ? { background: "#1B3A7A", color: "#fff" } : { ...card, color: "var(--t-muted)" }}>
                  {f === "open" ? "Awaiting tracking" : "All"}
                </button>))}
              <button onClick={load} aria-label="Refresh orders" className="p-2 rounded-xl" style={card} data-testid="button-refresh"><RefreshCw className="w-4 h-4" style={{ color: "var(--t-muted)" }} /></button>
            </div>
          </div>
          {listError && <div role="alert" className="mb-4 rounded-xl p-3 text-sm flex gap-2 items-center" style={{ background: "rgba(239,68,68,0.08)", color: "#B91C1C" }} data-testid="text-list-error"><AlertTriangle className="w-4 h-4" />{listError}<button onClick={load} className="ml-auto font-bold underline">Retry</button></div>}
          {orders === null && !listError ? <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "var(--t-surface2)" }} />)}</div>
            : visible.length === 0 ? (
              <div className="text-center py-16 rounded-3xl" style={{ border: "1px dashed var(--t-border)", background: "var(--t-surface)" }} data-testid="state-empty">
                <Package className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--t-blue-40)" }} />
                <p className="font-bold" style={{ color: "var(--t-text)" }}>Nothing waiting on you</p>
                <p className="text-sm mt-1" style={{ color: "var(--t-muted)" }}>New shipments appear here automatically. This list refreshes every 30 seconds.</p>
              </div>
            ) : (
              <ul className="space-y-3">{visible.map(o => (
                <li key={o.id}>
                  <button onClick={() => setSelected(o.id)} className="w-full text-left rounded-2xl p-4 hover:shadow-md transition-shadow" style={{ ...card, opacity: o.stale ? 0.75 : 1 }} data-testid={`card-order-${o.id}`}>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="font-mono text-sm font-bold px-2 py-0.5 rounded-md" style={{ background: "var(--t-bg)", color: "var(--t-text)" }}>{o.reference}</span>
                      <StatusPill status={o.status} stale={o.stale} />
                      <span className="ml-auto font-bold tabular-nums" style={{ color: "var(--t-text)" }}>{money(o.totalCost, o.currency)}</span>
                    </div>
                    <p className="text-xs flex flex-wrap gap-x-3" style={{ color: "var(--t-muted)" }}>
                      <span><Clock className="inline w-3 h-3 mr-1" />{date(o.submittedAt)}</span>
                      <span>{o.items.reduce((a, i) => a + i.quantity, 0)} units · {o.shipping.country}</span>
                      {o.trackingNumber && <span><Truck className="inline w-3 h-3 mr-1" />{o.carrier} {o.trackingNumber}</span>}
                    </p>
                  </button>
                </li>))}</ul>
            )}
        </>
      )}
    </Shell>
  );
}

function Shell({ children, me, onLogout }: { children: React.ReactNode; me?: VendorMe | null; onLogout?: () => void }) {
  return (
    <div className="min-h-[100dvh]" style={{ background: "var(--t-bg)" }}>
      <header style={{ background: "linear-gradient(135deg, #2D6BCC 0%, #1B3A7A 100%)" }} className="text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#E9A020" }}>Peps Anonymous · Vendor</p>
            <p className="font-bold truncate" data-testid="text-vendor-name">{me ? me.vendorName : "Wholesale portal"}</p>
          </div>
          <nav className="ml-auto flex items-center gap-1 text-sm">
            {me && <span className="hidden sm:inline mr-2" style={{ color: "rgba(255,255,255,0.75)" }} data-testid="text-username">{me.username}</span>}
            <Link href="/" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-white/10" data-testid="link-home-header"><Home className="w-4 h-4" /><span className="hidden sm:inline">Home</span></Link>
            {onLogout && <button onClick={onLogout} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-white/10" data-testid="button-logout"><LogOut className="w-4 h-4" /><span className="hidden sm:inline">Log out</span></button>}
          </nav>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6 md:py-10 pb-24">{children}</main>
    </div>
  );
}

function OrderDetail({ order, onBack, onChanged }: { order: VendorOrder; onBack: () => void; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [carrier, setCarrier] = useState(order.carrier ?? "");
  const fileRef = useRef<HTMLInputElement>(null);
  const locked = order.stale;

  const run = async (key: string, fn: () => Promise<Response>, ok: string) => {
    setBusy(key); setMsg(null);
    try {
      const r = await fn();
      if (!r.ok) throw new Error(await errorText(r, "Action failed"));
      setMsg({ ok: true, text: ok }); await onChanged();
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Action failed" }); }
    finally { setBusy(null); }
  };
  const patch = (body: object) => () => fetch(`/api/vendor/orders/${encodeURIComponent(order.id)}`, { method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  const upload = (f: File) => run("image", () => { const fd = new FormData(); fd.append("file", f); return fetch(`/api/vendor/orders/${encodeURIComponent(order.id)}/images`, { method: "POST", credentials: "include", body: fd }); }, "Photo uploaded.").finally(() => { if (fileRef.current) fileRef.current.value = ""; });

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold hover:opacity-70" style={{ color: "var(--t-muted)" }} data-testid="button-back"><ArrowLeft className="w-4 h-4" />All shipments</button>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold font-mono" style={{ color: "var(--t-text)" }} data-testid="text-reference">{order.reference}</h1>
        <StatusPill status={order.status} stale={order.stale} />
        <span className="text-xs" style={{ color: "var(--t-subtle)" }}>Submitted {date(order.submittedAt)}</span>
      </div>
      {locked && <div role="status" className="rounded-xl p-3 text-sm flex gap-2" style={{ background: "rgba(233,160,32,0.12)", color: "#92400E" }} data-testid="text-stale"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />This shipment changed after it was sent to you. Actions are locked until Peps Anonymous resubmits it.</div>}
      {msg && <div role={msg.ok ? "status" : "alert"} className="rounded-xl p-3 text-sm flex gap-2 items-center" style={{ background: msg.ok ? "rgba(22,163,74,0.1)" : "rgba(239,68,68,0.08)", color: msg.ok ? "#15803D" : "#B91C1C" }} data-testid="text-action-result">{msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}{msg.text}</div>}

      <div className="grid md:grid-cols-[1.4fr_1fr] gap-5">
        <section className="space-y-2"><h2 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Cost breakdown</h2><CostBreakdown order={order} /></section>
        <section className="space-y-2"><h2 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Ship to</h2><ShippingBlock order={order} /></section>
      </div>

      <section className="rounded-2xl p-4 space-y-4" style={card}>
        <h2 className="font-bold" style={{ color: "var(--t-text)" }}>Fulfilment</h2>
        <button disabled={locked || !!busy} onClick={() => run("processing", patch({ action: "processing" }), "Marked as processing.")} className={btnPrimary} style={{ background: "#1B3A7A" }} data-testid="button-mark-processing">
          {busy === "processing" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}Mark processing</button>
        <form className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end" onSubmit={e => { e.preventDefault(); if (!tracking.trim()) { setMsg({ ok: false, text: "Enter a tracking number." }); return; } run("tracking", patch({ action: "tracking", trackingNumber: tracking.trim(), carrier: carrier.trim() || undefined }), "Tracking saved."); }}>
          <label className="text-xs font-semibold" style={{ color: "var(--t-muted)" }}>Carrier
            <input value={carrier} onChange={e => setCarrier(e.target.value)} disabled={locked} className="mt-1 w-full rounded-xl px-3 py-2 text-sm" style={{ ...card, color: "var(--t-text)" }} data-testid="input-carrier" /></label>
          <label className="text-xs font-semibold" style={{ color: "var(--t-muted)" }}>Tracking number
            <input value={tracking} onChange={e => setTracking(e.target.value)} disabled={locked} required className="mt-1 w-full rounded-xl px-3 py-2 text-sm font-mono" style={{ ...card, color: "var(--t-text)" }} data-testid="input-tracking" /></label>
          <button type="submit" disabled={locked || !!busy} className={btnPrimary} style={{ background: "#2D6BCC" }} data-testid="button-save-tracking">
            {busy === "tracking" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}Save tracking</button>
        </form>
        <div>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" id={`file-${order.id}`} disabled={locked || !!busy} onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }} data-testid="input-image" />
          <label htmlFor={`file-${order.id}`} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${locked || busy ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`} style={{ border: "1px dashed #D0DAE4", color: "var(--t-muted)" }}>
            {busy === "image" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}Upload packing photo</label>
        </div>
        {order.images.length > 0 && <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">{order.images.map(i => (
          <a key={i.id} href={i.url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden block" style={{ border: "1px solid var(--t-border)" }} data-testid={`img-order-${i.id}`}><img src={i.url} alt={i.filename} className="w-full h-full object-cover" loading="lazy" /></a>))}</div>}
      </section>
    </div>
  );
}
