import VendorLanguageSelect from "@/components/VendorLanguageSelect";
import { vendorTranslate as t, translateVendorNode as vt, useVendorLanguage, getVendorLanguage } from "@/lib/vendor-language";
import { vendorPackingSlipHtml } from "@/lib/vendor-packing-slip";
import { CARRIERS_17TRACK } from "@/lib/carriers";
import { clearVendorCsrfToken, vendorFetch } from "@/lib/vendor-auth-client";
import { type CSSProperties, type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { vendorAddressLines } from "@/lib/vendor-address";
import { downloadVendorOrdersCsv } from "@/lib/vendor-orders-csv";
import VendorAccountAuth from "@/components/VendorAccountAuth";
import { useVendorWallets, VendorWalletPanel, VendorPaymentHistory } from "@/components/VendorWallets";
import VendorTrackingImport from "@/components/VendorTrackingImport";
import { ClosedBanner, IssueBadge, OrderIssuePanel, SettingsNavIcon, VendorSettingsView, type VendorIssue, useVendorIssues, useVendorSettings } from "@/components/VendorExtras";
import { VendorMessagesView, type MessageDraft, useVendorThreads } from "@/components/VendorMessages";
import { CriticalBanner, NotificationBell, type NotificationTarget, useVendorNotifications } from "@/components/VendorNotifications";
import { MessageSquare } from "lucide-react";
import { Badge, Banner, Btn, Card, TONES, type Progress, type Tone, cardStyle, field, fieldCls, muted, subtle } from "@/components/vendor-ui";
import {
  ArrowDownRight, ArrowLeft, ArrowUpRight, Camera, Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Clock, Copy,
  Download, Home, ImagePlus, Loader2, LogOut, Menu, Package, PackageCheck, PauseCircle, Pencil, Printer, RefreshCw, Search, Truck, X,
} from "lucide-react";

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

export function money(v: string | number, currency = "USD") {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  try { return new Intl.NumberFormat(getVendorLanguage() === "zh" ? "zh-CN" : "en-US", { style: "currency", currency }).format(n); }
  catch { return `${n.toFixed(2)} ${currency}`; }
}
function date(v: string) { const d = new Date(v); return !v || isNaN(d.getTime()) ? "—" : d.toLocaleString(getVendorLanguage() === "zh" ? "zh-CN" : "en-GB", { timeZone: "Europe/London" }); }
/** Shopify-style relative stamp: "Today at 10:12", "Yesterday at 16:40", "Oct 12 at 09:03". */
function when(v: string) {
  const d = new Date(v);
  if (!v || isNaN(d.getTime())) return "—";
  const now = new Date();
  const dayStart = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((dayStart(now) - dayStart(d)) / 86_400_000);
  const time = d.toLocaleTimeString(getVendorLanguage() === "zh" ? "zh-CN" : "en-GB", { hour: "numeric", minute: "2-digit" });
  if (diffDays === 0) return `Today at ${time}`;
  if (diffDays === 1) return `Yesterday at ${time}`;
  const day = d.toLocaleDateString(getVendorLanguage() === "zh" ? "zh-CN" : "en-GB", { month: "short", day: "numeric", ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}) });
  return getVendorLanguage() === "zh" ? `${day} ${time}` : `${day} at ${time}`;
}
function age(v: string) {
  const t = new Date(v).getTime();
  if (!v || isNaN(t)) return "";
  const h = Math.floor((Date.now() - t) / 3_600_000);
  return h < 1 ? "just now" : h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}
const units = (o: VendorOrder) => o.items.reduce((a, i) => a + i.quantity, 0);
const time = (o: VendorOrder) => new Date(o.submittedAt).getTime() || 0;

type Stage = "new" | "processing" | "shipped" | "hold";
function stage(o: VendorOrder): Stage {
  if (o.stale) return "hold";
  const s = o.status.toLowerCase();
  if (o.trackingNumber || s.includes("ship")) return "shipped";
  return s.includes("process") ? "processing" : "new";
}
const OVERDUE_HOURS = 48;
function overdue(o: VendorOrder) {
  const st = stage(o);
  const t = new Date(o.submittedAt).getTime();
  return (st === "new" || st === "processing") && !isNaN(t) && Date.now() - t > OVERDUE_HOURS * 3_600_000;
}

/* ---------------------------------------------------------------------------
 * Fulfilment stages
 * ------------------------------------------------------------------------- */
const STAGES: { key: Stage; label: string; hint: string; tone: Tone; progress: Progress; icon: typeof Package }[] = [
  { key: "new", label: "Unfulfilled", hint: "Not started", tone: "attention", progress: "incomplete", icon: Package },
  { key: "processing", label: "In progress", hint: "Needs tracking", tone: "info", progress: "partial", icon: PackageCheck },
  { key: "shipped", label: "Fulfilled", hint: "Tracking added", tone: "success", progress: "complete", icon: Truck },
  { key: "hold", label: "On hold", hint: "Changed by Peps", tone: "warning", progress: "incomplete", icon: PauseCircle },
];
const stageMeta = (s: Stage) => STAGES.find(x => x.key === s)!;

/** Fulfilment status badge. `label` defaults to the humanised raw status so admin views keep showing it. */
export function StatusPill({ status, stale, label }: { status: string; stale?: boolean; label?: string }) {
  const st = stage({ status, stale: !!stale, trackingNumber: null } as VendorOrder);
  const m = stageMeta(st);
  return <Badge tone={m.tone} progress={m.progress} testId="status-order">{vt(label ?? (stale ? "On hold" : status.replace(/_/g, " ")))}</Badge>;
}
const StageBadge = ({ order }: { order: VendorOrder }) => <StatusPill status={order.status} stale={order.stale} label={stageMeta(stage(order)).label} />;

const CARRIERS = [...new Set(CARRIERS_17TRACK.filter(c => c.code > 0).map(c => c.label))].sort((a, b) => a.localeCompare(b));

/* Shared blocks also used by the admin preview. */
export function CostBreakdown({ order }: { order: VendorOrder }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--t-border)" }}>
      <table className="w-full text-[13px]">
        <thead><tr style={{ background: "var(--t-surface2)", ...subtle }} className="text-xs">
          <th className="text-left font-medium p-2.5">{t("Product")}</th><th className="text-right font-medium p-2.5">{t("Qty")}</th><th className="text-right font-medium p-2.5 hidden sm:table-cell">{t("Unit cost")}</th><th className="text-right font-medium p-2.5">{t("Line")}</th></tr></thead>
        <tbody>{order.items.map((it, i) => (
          <tr key={i} style={{ borderTop: "1px solid var(--t-border)", color: "var(--t-text)" }}>
            <td className="p-2.5">{it.productName}</td><td className="p-2.5 text-right tabular-nums">{vt(it.quantity)}</td>
            <td className="p-2.5 text-right tabular-nums hidden sm:table-cell">{money(it.unitCost, order.currency)}</td>
            <td className="p-2.5 text-right tabular-nums">{money(it.lineTotal, order.currency)}</td></tr>))}</tbody>
      </table>
      <dl className="text-[13px] p-3 space-y-1" style={{ borderTop: "1px solid var(--t-border)", background: "var(--t-surface2)" }}>
        <div className="flex justify-between"><dt style={muted}>{t("Product cost")}</dt><dd className="tabular-nums">{money(order.productCost, order.currency)}</dd></div>
        <div className="flex justify-between"><dt style={muted}>{t("Shipping cost")}</dt><dd className="tabular-nums">{money(order.shippingCost, order.currency)}</dd></div>
        <div className="flex justify-between font-semibold" style={{ color: "var(--t-text)" }}><dt>{t("Total cost")}</dt><dd className="tabular-nums" data-testid={`text-total-${order.id}`}>{money(order.totalCost, order.currency)}</dd></div>
      </dl>
    </div>
  );
}
export function ShippingBlock({ order }: { order: VendorOrder }) {
  const s = order.shipping;
  return (
    <address className="not-italic text-[13px] rounded-xl p-3 whitespace-pre-line" style={{ border: "1px solid var(--t-border)", color: "var(--t-text)" }}>
      <strong>{s.name}</strong>{vt("\n")}{vendorAddressLines(s.address, s.country).join("\n")}{vt("\n")}{s.country}
      <span className="block mt-1 text-xs" style={muted}>{s.phone}{s.phone && s.email ? " · " : ""}{s.email}</span>
    </address>
  );
}

/* ---------------------------------------------------------------------------
 * Page state
 * ------------------------------------------------------------------------- */
type Tab = Stage | "all";
type View = "home" | "orders" | "settings" | "messages";
type Counts = Record<Tab, number> & { overdue: number };
interface NavProps { view: View; tab: Tab; counts: Counts; onNav: (v: View, tab?: Tab) => void; unreadMessages?: number }

function patchOrder(id: string, body: object) {
  return vendorFetch(`/api/vendor/orders/${encodeURIComponent(id)}`, { method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

export default function VendorPortal() {
  const [language] = useVendorLanguage();
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    return () => { document.documentElement.lang = previous; };
  }, [language]);
  const [me, setMe] = useState<VendorMe | null>(null);
  const [authState, setAuthState] = useState<"loading" | "ok" | "401" | "403" | "error">("loading");
  const [orders, setOrders] = useState<VendorOrder[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<View>("home");
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("new");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"oldest" | "newest" | "value">("oldest");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<{ busy: boolean; msg: { ok: boolean; text: string } | null }>({ busy: false, msg: null });
  const wallets = useVendorWallets(authState === "ok");
  const walletsReady = !!wallets.data?.wallets.length && !wallets.loading && !wallets.error;
  const issues = useVendorIssues(authState === "ok");
  const vendorSettings = useVendorSettings(authState === "ok");
  const threads = useVendorThreads(authState === "ok");
  const notifications = useVendorNotifications(authState === "ok");
  const [messageDraft, setMessageDraft] = useState<MessageDraft | null>(null);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const openTarget = useCallback((target: NotificationTarget) => {
    if (!target) return;
    if (target.kind === "settings") { setSelected(null); setView("settings"); return; }
    if (target.kind === "thread") { setOpenThreadId(target.id); setSelected(null); setView("messages"); return; }
    setView("orders"); setSelected(target.id);
  }, []);
  // Telegram alerts deep-link to /vendor?order=<id> or /vendor?thread=<id>; open them once data has loaded.
  useEffect(() => {
    if (!orders) return;
    const params = new URLSearchParams(window.location.search);
    const wantedOrder = params.get("order"), wantedThread = params.get("thread");
    if (wantedOrder && orders.some(o => o.id === wantedOrder)) setSelected(wantedOrder);
    if (wantedThread) { setOpenThreadId(wantedThread); setView("messages"); setSelected(null); }
    if (wantedOrder || wantedThread) window.history.replaceState({}, "", window.location.pathname);
  }, [orders]);

  const clearVendorSession = useCallback(() => {
    clearVendorCsrfToken(); setOrders(null); setSelected(null); setMe(null);
    setPicked(new Set()); setListError(null); setAuthState("401");
  }, []);

  const checkMe = useCallback(async () => {
    try {
      const r = await fetch("/api/vendor/me", { credentials: "include" });
      if (r.status === 401) return setAuthState("401");
      if (r.status === 403) return setAuthState("403");
      if (!r.ok) return setAuthState("error");
      setMe(await r.json()); setAuthState("ok");
    } catch { setAuthState("error"); }
  }, []);
  useEffect(() => { void checkMe(); }, [checkMe]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await fetch("/api/vendor/orders", { credentials: "include" });
      if (r.status === 401) { clearVendorSession(); return; }
      if (r.status === 403) {
        const body = await r.clone().json().catch(() => null);
        if (body?.error === "vendor_wallet_required") { setOrders(null); setSelected(null); setView("settings"); void wallets.refresh(); return; }
      }
      if (!r.ok) throw new Error(await errorText(r, "Could not load orders"));
      const b = await r.json();
      setOrders(Array.isArray(b?.orders) ? b.orders : []); setListError(null); setLoadedAt(new Date());
    } catch (e) { setListError(e instanceof Error ? e.message : "Could not load orders"); }
    finally { setRefreshing(false); }
  }, [clearVendorSession, wallets.refresh]);

  useEffect(() => {
    if (authState !== "ok" || !walletsReady) return;
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [authState, walletsReady, load]);

  const logout = async () => {
    try {
      const response = await vendorFetch("/api/vendor/auth/logout", { method: "POST" });
      if (response.status === 401) { clearVendorSession(); return; }
      if (!response.ok) throw new Error("Could not sign out. Try again.");
      window.location.assign("/vendor/login");
    } catch { setListError("Could not sign out. Try again."); setView("home"); }
  };

  const counts = useMemo<Counts>(() => {
    const c: Counts = { new: 0, processing: 0, shipped: 0, hold: 0, all: 0, overdue: 0 };
    for (const o of orders ?? []) { c[stage(o)]++; c.all++; if (overdue(o)) c.overdue++; }
    return c;
  }, [orders]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (orders ?? []).filter(o => (tab === "all" || stage(o) === tab) && (!q ||
      [o.reference, o.shipping.name, o.shipping.country, o.trackingNumber ?? "", ...o.items.map(i => i.productName)].some(v => v.toLowerCase().includes(q))));
    return list.sort((a, b) => sort === "value" ? Number(b.totalCost) - Number(a.totalCost) : sort === "newest" ? time(b) - time(a) : time(a) - time(b));
  }, [orders, tab, query, sort]);

  // Home: the oldest orders still waiting on the vendor.
  const attention = useMemo(() => (orders ?? []).filter(o => { const s = stage(o); return s === "new" || s === "processing"; }).sort((a, b) => time(a) - time(b)).slice(0, 6), [orders]);

  // Selection only makes sense for orders that can still be started.
  const pickable = visible.filter(o => stage(o) === "new");
  useEffect(() => { setPicked(p => new Set([...p].filter(id => pickable.some(o => o.id === id)))); }, [orders, tab, query]); // eslint-disable-line react-hooks/exhaustive-deps

  const bulkProcess = async () => {
    setBulk({ busy: true, msg: null });
    let ok = 0; const failed: string[] = [];
    for (const id of picked) {
      const r = await patchOrder(id, { action: "processing" }).catch(() => null);
      if (r?.ok) ok++; else failed.push(orders?.find(o => o.id === id)?.reference ?? id);
    }
    setPicked(new Set());
    setBulk({ busy: false, msg: failed.length ? { ok: false, text: `${ok} marked processing. Could not update ${failed.join(", ")}.` } : { ok: true, text: `${ok} order${ok === 1 ? "" : "s"} marked processing.` } });
    await load();
  };

  const onNav = (v: View, t?: Tab) => { setView(v); if (t) setTab(t); setSelected(null); };
  const onGlobalQuery = (q: string) => { setQuery(q); if (view !== "orders" || selected) { setView("orders"); setTab("all"); setSelected(null); } };
  const nav: NavProps = { view, tab, counts, onNav, unreadMessages: threads.unread };

  const current = orders?.find(o => o.id === selected) ?? null;
  const navList = view === "home" ? attention : visible;
  const index = current ? navList.findIndex(o => o.id === current.id) : -1;

  if (authState === "loading") return <Shell><div className="max-w-[1120px] mx-auto space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: "var(--t-surface2)" }} />)}</div></Shell>;
  // Signed out, unverified, no vendor access yet, or unreachable: the gate explains and offers sign in / apply.
  if (authState !== "ok") return <VendorAccountAuth onAuthenticated={checkMe} />;

  if (!walletsReady && view !== "settings") return (
    <Shell me={me} onLogout={logout} nav={nav}>
      <div className="max-w-[880px] mx-auto space-y-4" data-testid="vendor-wallet-gate">
        <PageHeader title={t("Set up your payment wallet")} subtitle="Save at least one receiving wallet before using the vendor portal." />
        <VendorWalletPanel state={wallets} />
        <Btn onClick={() => onNav("settings")}>{t("Open Settings")}</Btn>
      </div>
    </Shell>
  );

  const refreshBtn = <Btn onClick={load} aria-label={t("Refresh orders")} data-testid="button-refresh" className="!px-2"><RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /></Btn>;
  const updated = loadedAt ? `Updated ${loadedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · refreshes every 30s` : "Loading orders…";

  if (current && walletsReady && view !== "settings") return (
    <Shell me={me} onLogout={logout} nav={nav} query={query} onQuery={onGlobalQuery} bell={<NotificationBell items={notifications.items} unread={notifications.unread} onOpenTarget={openTarget} markRead={notifications.markRead} markAllRead={notifications.markAllRead} />}>
      <OrderDetail key={current.id} order={current} onBack={() => setSelected(null)} onChanged={load}
        prev={index > 0 ? navList[index - 1] : null} next={index >= 0 && index < navList.length - 1 ? navList[index + 1] : null}
        onOpen={id => setSelected(id)} issue={issues.byOrder[current.id]} issueTypes={issues.types} onIssueChanged={issues.refresh}
        defaultCarrier={vendorSettings.data?.defaultCarrier ?? null}
        onMessage={() => { setMessageDraft({ submissionId: current.id, reference: current.reference, subject: `Order #${current.reference}` }); setOpenThreadId(null); setSelected(null); setView("messages"); }} />
    </Shell>
  );

  if (view === "messages") return (
    <Shell me={me} onLogout={logout} nav={nav} query={query} onQuery={onGlobalQuery} bell={<NotificationBell items={notifications.items} unread={notifications.unread} onOpenTarget={openTarget} markRead={notifications.markRead} markAllRead={notifications.markAllRead} />}>
      <VendorMessagesView threads={threads.threads} error={threads.error} refresh={threads.refresh} initialThreadId={openThreadId} draft={messageDraft}
        onDraftConsumed={() => setMessageDraft(null)}
        header={<PageHeader title={t("Messages")} subtitle="Talk to Peps Anonymous about orders, stock and payments. Replies also reach your connected Telegram chat." />} />
    </Shell>
  );

  if (view === "settings") return (
    <Shell me={me} onLogout={logout} nav={nav} query={query} onQuery={onGlobalQuery} bell={<NotificationBell items={notifications.items} unread={notifications.unread} onOpenTarget={openTarget} markRead={notifications.markRead} markAllRead={notifications.markAllRead} />}>
      <VendorSettingsView vendorName={me?.vendorName ?? "your company"} settings={vendorSettings.data} onSave={vendorSettings.save} loadError={vendorSettings.error}
        paymentContent={<div className="space-y-4 mb-6"><VendorWalletPanel state={wallets} /><VendorPaymentHistory /></div>}
        header={<PageHeader title={t("Settings")} subtitle="Payment wallets, history, holiday mode and fulfilment defaults" />} />
    </Shell>
  );

  if (view === "home") return (
    <Shell me={me} onLogout={logout} nav={nav} query={query} onQuery={onGlobalQuery} bell={<NotificationBell items={notifications.items} unread={notifications.unread} onOpenTarget={openTarget} markRead={notifications.markRead} markAllRead={notifications.markAllRead} />}>
      <HomeView me={me} orders={orders} counts={counts} attention={attention} updated={updated} refreshBtn={refreshBtn} listError={listError} onRetry={load}
        onNav={onNav} onOpen={id => setSelected(id)} flagged={issues.openIds}
        banner={<><CriticalBanner items={notifications.items} onOpenTarget={openTarget} markRead={notifications.markRead} /><ClosedBanner settings={vendorSettings.data} onOpenSettings={() => onNav("settings")} /></>} />
    </Shell>
  );

  return (
    <Shell me={me} onLogout={logout} nav={nav} query={query} onQuery={onGlobalQuery} bell={<NotificationBell items={notifications.items} unread={notifications.unread} onOpenTarget={openTarget} markRead={notifications.markRead} markAllRead={notifications.markAllRead} />}>
      <div className="max-w-[1120px] mx-auto">
        <PageHeader title={t("Orders")} subtitle={updated} actions={<>
          <Btn onClick={() => downloadVendorOrdersCsv(picked.size ? visible.filter(order => picked.has(order.id)) : visible)} disabled={!visible.length} data-testid="button-export-csv" title={t("Exports selected orders, or all orders in the current view")}>
            <Download className="w-4 h-4" />{vt(picked.size ? `Export ${picked.size} selected` : "Export")}</Btn>
          {vt(refreshBtn)}
        </>} />

        <VendorTrackingImport orders={orders ?? []} onChanged={load} />

        {counts.overdue > 0 && <div className="mb-4"><Banner tone="critical" testId="text-overdue">{vt(counts.overdue)}  {t("order")}{vt(counts.overdue === 1 ? " has" : "s have")}  {t("been waiting more than")} {vt(OVERDUE_HOURS)}  {t("hours without tracking.")}</Banner></div>}

        <Card flush>
          <div className="flex items-center gap-1 overflow-x-auto px-3 pt-3 pb-2" role="tablist">
            {(["all", ...STAGES.map(s => s.key)] as Tab[]).map(t => {
              const on = tab === t;
              return (
                <button key={t} role="tab" aria-selected={on} onClick={() => setTab(t)} data-testid={`button-filter-${t}`}
                  className="h-8 px-3 rounded-lg text-[13px] whitespace-nowrap flex items-center gap-1.5 hover:bg-[var(--t-surface2)]"
                  style={{ background: on ? "var(--t-surface2)" : undefined, color: on ? "var(--t-text)" : "var(--t-muted)", fontWeight: on ? 600 : 500 }}>
                  {vt(t === "all" ? "All" : stageMeta(t).label)}
                  <span className="tabular-nums text-xs px-1.5 rounded-md" style={{ background: on ? "var(--t-surface)" : "var(--t-surface2)", border: "1px solid var(--t-border)", ...subtle }}>{vt(counts[t])}</span>
                </button>);
            })}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 px-3 pb-3" style={{ borderBottom: "1px solid var(--t-border)" }}>
            <label className="relative flex-1">
              <span className="sr-only">{t("Search orders")}</span>
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2" style={subtle} />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t("Search by reference, recipient, product or tracking")} className={`${fieldCls} pl-8`} style={field} data-testid="input-search" />
            </label>
            <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} aria-label={t("Sort orders")} className={`${fieldCls} sm:w-44`} style={field} data-testid="select-sort">
              <option value="oldest">{t("Oldest first")}</option><option value="newest">{t("Newest first")}</option><option value="value">{t("Highest value")}</option>
            </select>
          </div>

          {picked.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 px-4 py-2 text-[13px]" style={{ background: "var(--t-surface2)", borderBottom: "1px solid var(--t-border)" }} data-testid="bar-bulk">
              <span className="font-semibold" style={{ color: "var(--t-text)" }}>{vt(picked.size)}  {t("selected")}</span>
              <Btn variant="primary" onClick={bulkProcess} disabled={bulk.busy} data-testid="button-bulk-processing">
                {bulk.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}{t("Mark as processing")}</Btn>
              <Btn variant="plain" onClick={() => setPicked(new Set())}>{t("Clear")}</Btn>
            </div>)}
          {bulk.msg && <div className="p-3 pb-0"><Banner tone={bulk.msg.ok ? "success" : "critical"} role={bulk.msg.ok ? "status" : "alert"} onDismiss={() => setBulk(b => ({ ...b, msg: null }))}>{vt(bulk.msg.text)}</Banner></div>}
          {listError && <div className="p-3 pb-0"><Banner tone="critical" role="alert" testId="text-list-error">{vt(listError)} <button onClick={load} className="font-semibold underline ml-1">{t("Retry")}</button></Banner></div>}

          {orders === null && !listError ? <div className="p-3 space-y-2">{[0, 1, 2].map(i => <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: "var(--t-surface2)" }} />)}</div>
            : visible.length === 0 ? (
              <EmptyState icon={Package} title={t(query ? "No orders match your search" : tab === "new" ? "Nothing waiting on you" : "No orders here")}
                body={query ? "Try a different reference, name or product." : "New shipments appear here automatically. This list refreshes every 30 seconds."} />
            ) : (
              <OrdersTable orders={visible} selectable flagged={issues.openIds} pickable={pickable} picked={picked} setPicked={setPicked} onOpen={id => setSelected(id)}
                footer={`Showing ${visible.length} of ${counts.all} order${counts.all === 1 ? "" : "s"}`} />
            )}
        </Card>
      </div>
    </Shell>
  );
}

/* ---------------------------------------------------------------------------
 * Home overview
 * ------------------------------------------------------------------------- */
function HomeView({ me, orders, counts, attention, updated, refreshBtn, listError, onRetry, onNav, onOpen, flagged, banner }: {
  me: VendorMe | null; orders: VendorOrder[] | null; counts: Counts; attention: VendorOrder[]; updated: string; refreshBtn: ReactNode;
  listError: string | null; onRetry: () => void; onNav: (v: View, t?: Tab) => void; onOpen: (id: string) => void; flagged?: Set<string>; banner?: ReactNode;
}) {
  const m = useMemo(() => {
    const now = Date.now(), d7 = 7 * 86_400_000;
    const all = orders ?? [];
    const recent = all.filter(o => now - time(o) <= d7).length;
    const prior = all.filter(o => { const a = now - time(o); return a > d7 && a <= 2 * d7; }).length;
    const open = all.filter(o => { const s = stage(o); return s === "new" || s === "processing"; });
    const cur = open[0]?.currency ?? all[0]?.currency ?? "USD";
    return {
      recent, prior, open: open.length, openUnits: open.reduce((a, o) => a + units(o), 0),
      value: open.reduce((a, o) => a + (Number(o.totalCost) || 0), 0), cur, mixed: open.some(o => o.currency !== cur),
    };
  }, [orders]);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString(getVendorLanguage() === "zh" ? "zh-CN" : "en-GB", { weekday: "long", month: "long", day: "numeric" });
  const delta = m.prior ? Math.round(((m.recent - m.prior) / m.prior) * 100) : null;
  const ready = orders !== null;

  const allTodos: { n: number; text: string; tone: Tone; icon: typeof Package; tab: Tab }[] = [
    { n: counts.overdue, text: `overdue · waiting more than ${OVERDUE_HOURS}h without tracking`, tone: "critical", icon: Clock, tab: "all" },
    { n: counts.new, text: "to start packing", tone: "attention", icon: Package, tab: "new" },
    { n: counts.processing, text: "in progress and waiting for a tracking number", tone: "info", icon: Truck, tab: "processing" },
    { n: counts.hold, text: "on hold · changed by Peps Anonymous after submission", tone: "warning", icon: PauseCircle, tab: "hold" },
  ];
  const todos = allTodos.filter(t => t.n > 0);

  return (
    <div className="max-w-[1120px] mx-auto">
      <PageHeader title={`${t(greet)}${me ? `, ${me.vendorName}` : ""}`} subtitle={`${today} · ${updated}`} actions={refreshBtn} />
      {listError && <div className="mb-4"><Banner tone="critical" role="alert" testId="text-list-error">{vt(listError)} <button onClick={onRetry} className="font-semibold underline ml-1">{t("Retry")}</button></Banner></div>}
      {vt(banner)}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Metric label="Awaiting fulfilment" value={ready ? String(m.open) : "–"} onClick={() => onNav("orders", "all")}
          foot={counts.overdue ? <span style={{ color: TONES.critical.fg }}>{vt(counts.overdue)}  {t("overdue")}</span> : "All within 48h"} />
        <Metric label="Received · last 7 days" value={ready ? String(m.recent) : "–"}
          foot={delta === null ? `${m.prior} the week before` : <span className="inline-flex items-center gap-0.5" style={{ color: delta >= 0 ? "#0C5132" : "#8E1F0B" }}>
            {delta >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}{vt(Math.abs(delta))}{t("% vs prior week")}</span>} />
        <Metric label="Fulfilled" value={ready ? String(counts.shipped) : "–"} foot="Tracking added" onClick={() => onNav("orders", "shipped")} />
        <Metric label="Open order value" value={ready ? (m.mixed ? "Mixed" : money(m.value, m.cur)) : "–"} foot={`${m.openUnits} units to pack`} />
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
        <Card title={t("Needs attention")} actions={<Btn variant="plain" onClick={() => onNav("orders", "all")}>{t("View all orders")}<ChevronRight className="w-4 h-4" /></Btn>} flush>
          {!ready ? <div className="p-3 space-y-2">{[0, 1, 2].map(i => <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: "var(--t-surface2)" }} />)}</div>
            : attention.length === 0 ? <EmptyState icon={CheckCircle2} title={t("You're all caught up")} body="Every assigned shipment has tracking. New orders appear here automatically." testId="state-empty" />
            : <OrdersTable orders={attention} compact flagged={flagged} onOpen={onOpen} footer={attention.length < counts.new + counts.processing ? `Showing the ${attention.length} oldest of ${counts.new + counts.processing} open orders` : undefined} />}
        </Card>

        <Card title={t("Things to do today")}>
          {!ready ? <div className="h-16 rounded-lg animate-pulse" style={{ background: "var(--t-surface2)" }} />
            : todos.length === 0 ? <p className="text-[13px]" style={muted}>{t("Nothing outstanding. Enjoy the quiet.")}</p>
            : <ul className="-mx-2">{todos.map(todo => {
              const Icon = todo.icon;
              return (
                <li key={todo.text}>
                  <button onClick={() => onNav("orders", todo.tab)} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-[var(--t-surface2)]">
                    <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: TONES[todo.tone].bg, color: TONES[todo.tone].fg }}><Icon className="w-4 h-4" /></span>
                    <span className="text-[13px] min-w-0" style={{ color: "var(--t-text)" }}><strong className="tabular-nums">{vt(todo.n)}</strong>  {t("order")}{vt(todo.n === 1 || getVendorLanguage() === "zh" ? "" : "s")} {vt(todo.text)}</span>
                    <ChevronRight className="w-4 h-4 ml-auto shrink-0" style={subtle} />
                  </button>
                </li>);
            })}</ul>}
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, foot, onClick }: { label: string; value: string; foot: ReactNode; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className={`text-left p-4 ${onClick ? "hover:bg-[var(--t-surface2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6BCC]" : ""}`} style={cardStyle}>
      <p className="text-[13px] font-medium" style={muted}>{vt(label)}</p>
      <p className="text-2xl font-semibold tabular-nums mt-1 tracking-tight" style={{ color: "var(--t-text)" }}>{vt(value)}</p>
      <p className="text-xs mt-1 truncate" style={subtle}>{vt(foot)}</p>
    </Tag>
  );
}

function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--t-text)" }}>{vt(title)}</h1>
        {subtitle && <p className="text-xs mt-0.5" style={subtle}>{vt(subtitle)}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{vt(actions)}</div>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, body, testId = "state-empty" }: { icon: typeof Package; title: string; body: string; testId?: string }) {
  return (
    <div className="text-center py-14 px-4" data-testid={testId}>
      <span className="w-12 h-12 rounded-full grid place-items-center mx-auto mb-3" style={{ background: "var(--t-surface2)" }}><Icon className="w-5 h-5" style={muted} /></span>
      <p className="font-semibold text-[13px]" style={{ color: "var(--t-text)" }}>{vt(title)}</p>
      <p className="text-[13px] mt-1 max-w-sm mx-auto" style={muted}>{vt(body)}</p>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Index table
 * ------------------------------------------------------------------------- */
const COLS = "md:grid-cols-[minmax(0,1.1fr)_130px_minmax(0,1.3fr)_64px_100px_128px_120px]";
const COLS_SELECT = "md:grid-cols-[28px_minmax(0,1.1fr)_130px_minmax(0,1.3fr)_64px_100px_128px_120px]";
const HEADERS = ["Order", "Date", "Ship to", "Items", "Total", "Fulfillment", ""];

function OrdersTable({ orders, selectable, compact, flagged, pickable = [], picked, setPicked, onOpen, footer }: {
  orders: VendorOrder[]; selectable?: boolean; compact?: boolean; flagged?: Set<string>; pickable?: VendorOrder[]; picked?: Set<string>;
  setPicked?: (f: (p: Set<string>) => Set<string>) => void; onOpen: (id: string) => void; footer?: string;
}) {
  const cols = selectable ? COLS_SELECT : COLS;
  const allPicked = pickable.length > 0 && pickable.every(o => picked?.has(o.id));
  return (
    <>
      {!compact && <div className={`hidden md:grid ${cols} gap-3 px-4 h-9 items-center text-xs font-medium`} style={{ borderBottom: "1px solid var(--t-border)", ...subtle }}>
        {selectable && <span>{pickable.length > 0 && <input type="checkbox" aria-label={t("Select all unfulfilled orders")} checked={allPicked}
          onChange={e => setPicked?.(() => e.target.checked ? new Set(pickable.map(o => o.id)) : new Set())} className="w-4 h-4 accent-[#1A1A1A]" />}</span>}
        {HEADERS.map((h, i) => <span key={i} className={i === 3 || i === 4 ? "text-right" : ""}>{vt(h)}</span>)}
      </div>}
      <ul>{orders.map(o => compact ? <CompactRow key={o.id} order={o} flagged={flagged?.has(o.id)} onOpen={() => onOpen(o.id)} /> : <OrderRow key={o.id} order={o} cols={cols} selectable={selectable} flagged={flagged?.has(o.id)} picked={!!picked?.has(o.id)}
        onPick={selectable && stage(o) === "new" ? v => setPicked?.(p => { const n = new Set(p); v ? n.add(o.id) : n.delete(o.id); return n; }) : undefined}
        onOpen={() => onOpen(o.id)} />)}</ul>
      {footer && <div className="px-4 py-2.5 text-xs" style={{ borderTop: "1px solid var(--t-border)", ...subtle }}>{vt(footer)}</div>}
    </>
  );
}

const ctaFor = (st: Stage) => st === "new" ? "Start" : st === "processing" ? "Add tracking" : "View";

/** Single-line list row used on Home, where the card is too narrow for the full index table. */
function CompactRow({ order: o, flagged, onOpen }: { order: VendorOrder; flagged?: boolean; onOpen: () => void }) {
  const st = stage(o);
  return (
    <li className="relative flex items-center gap-3 px-4 py-3 hover:bg-[var(--t-surface2)]" style={{ borderBottom: "1px solid var(--t-border)" }}>
      <button onClick={onOpen} className="text-left min-w-0 flex-1 after:absolute after:inset-0 focus-visible:outline-none" data-testid={`card-order-${o.id}`}>
        <span className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>#{o.reference}</span>
          {overdue(o) && <Badge tone="critical">{t("Overdue")}</Badge>}
          {flagged && <Badge tone="critical">{t("Problem")}</Badge>}
        </span>
        <span className="block text-xs mt-0.5 truncate" style={muted}>{vt(when(o.submittedAt))} · {o.shipping.name}, {o.shipping.country} · {vt(units(o))}  {t("item")}{vt(units(o) === 1 || getVendorLanguage() === "zh" ? "" : "s")} · {money(o.totalCost, o.currency)}</span>
      </button>
      <StageBadge order={o} />
      <span className="hidden sm:flex text-xs font-semibold items-center gap-0.5 w-24 justify-end whitespace-nowrap" style={{ color: "var(--t-blue)" }}>{vt(ctaFor(st))}<ChevronRight className="w-3.5 h-3.5" /></span>
    </li>
  );
}

function OrderRow({ order: o, cols, selectable, flagged, picked, onPick, onOpen }: { order: VendorOrder; cols: string; selectable?: boolean; flagged?: boolean; picked: boolean; onPick?: (v: boolean) => void; onOpen: () => void }) {
  const st = stage(o); const late = overdue(o); const cta = ctaFor(st);
  return (
    <li className={`relative grid ${selectable ? "grid-cols-[28px_minmax(0,1fr)]" : "grid-cols-1"} ${cols} gap-x-3 gap-y-1 px-4 py-3 items-center hover:bg-[var(--t-surface2)]`}
      style={{ borderBottom: "1px solid var(--t-border)", background: picked ? "var(--t-blue-06)" : undefined, opacity: o.stale ? 0.85 : 1 }}>
      {selectable && <span className="relative z-10 self-start md:self-center pt-0.5 md:pt-0">{onPick && <input type="checkbox" aria-label={t(`Select ${o.reference}`)} checked={picked} onChange={e => onPick(e.target.checked)} className="w-4 h-4 accent-[#1A1A1A]" />}</span>}
      <button onClick={onOpen} className="text-left min-w-0 after:absolute after:inset-0 focus-visible:outline-none" data-testid={`card-order-${o.id}`}>
        <span className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>#{o.reference}</span>
          {late && <Badge tone="critical">{t("Overdue")}</Badge>}
          {flagged && <Badge tone="critical">{t("Problem")}</Badge>}
          <span className="md:hidden ml-auto"><StageBadge order={o} /></span>
        </span>
        <span className="block text-xs mt-0.5 md:hidden" style={muted}>{vt(when(o.submittedAt))} · {o.shipping.name}, {o.shipping.country} · {vt(units(o))}  {t("items ·")} {money(o.totalCost, o.currency)}</span>
      </button>
      <span className="hidden md:block text-[13px] truncate" style={{ color: "var(--t-text)" }}>{vt(when(o.submittedAt))}<span className="block text-xs" style={subtle}>{vt(age(o.submittedAt))}</span></span>
      <span className="hidden md:block min-w-0 text-[13px] truncate" style={{ color: "var(--t-text)" }}>{o.shipping.name}<span className="block text-xs truncate" style={subtle}>{o.shipping.country}</span></span>
      <span className="hidden md:block text-[13px] text-right tabular-nums" style={{ color: "var(--t-text)" }}>{vt(units(o))}</span>
      <span className="hidden md:block text-[13px] text-right tabular-nums font-medium" style={{ color: "var(--t-text)" }}>{money(o.totalCost, o.currency)}</span>
      <span className="hidden md:block"><StageBadge order={o} /></span>
      <span className="hidden md:flex justify-end items-center gap-2 min-w-0">
        {st === "shipped" && o.trackingNumber ? <span className="text-xs font-mono truncate" style={subtle} title={t(`${o.carrier ?? ""} ${o.trackingNumber}`)}>{o.trackingNumber}</span>
          : <span className="text-xs font-semibold flex items-center gap-0.5" style={{ color: st === "new" || st === "processing" ? "var(--t-blue)" : "var(--t-subtle)" }}>{vt(cta)}<ChevronRight className="w-3.5 h-3.5" /></span>}
      </span>
    </li>
  );
}

/* ---------------------------------------------------------------------------
 * Shell: top bar + sidebar
 * ------------------------------------------------------------------------- */
function Shell({ children, me, onLogout, nav, query, onQuery, bell }: {
  children: ReactNode; me?: VendorMe | null; onLogout?: () => void; nav?: NavProps; query?: string; onQuery?: (q: string) => void; bell?: ReactNode;
}) {
  useVendorLanguage();
  const [menu, setMenu] = useState(false);
  useEffect(() => { setMenu(false); }, [nav?.view, nav?.tab]);
  const initials = me ? me.vendorName.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase() : "";
  const sidebar = nav && <Sidebar nav={nav} onLogout={onLogout} />;
  return (
    <div className="min-h-[100dvh] text-[13px]" style={{ background: "var(--t-bg)", color: "var(--t-text)" }}>
      <header className="sticky top-0 z-40 h-14 flex items-center gap-2 md:gap-3 px-3 md:px-4 text-white print:hidden" style={{ background: "#1A1A1A" }}>
        {nav && <button onClick={() => setMenu(true)} className="md:hidden p-2 -ml-1 rounded-lg hover:bg-white/10" aria-label={t("Open menu")}><Menu className="w-5 h-5" /></button>}
        <div className="flex items-center gap-2 min-w-0 md:min-w-[224px] shrink-0">
          <span className="w-8 h-8 rounded-lg grid place-items-center font-bold text-sm shrink-0" style={{ background: "#E9A020", color: "#1A1A1A" }}>{t("P")}</span>
          <span className="font-semibold whitespace-nowrap hidden sm:block">{t("Peps Anonymous")} <span style={{ color: "rgba(255,255,255,0.55)" }}>{t("· Vendor")}</span></span>
        </div>
        {onQuery && (
          <label className="hidden md:flex flex-1 max-w-[560px] mx-auto relative">
            <span className="sr-only">{t("Search orders")}</span>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.6)" }} />
            <input value={query ?? ""} onChange={e => onQuery(e.target.value)} placeholder={t("Search orders")} aria-label={t("Search orders")}
              className="w-full h-8 rounded-lg pl-9 pr-3 text-[13px] text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/40"
              style={{ background: "#303030", border: "1px solid #4A4A4A" }} />
          </label>)}
        <div className="ml-auto flex items-center gap-2 min-w-0">
          <VendorLanguageSelect dark />
          {bell}
          <div className="flex items-center gap-2 pl-3 pr-1 h-9 rounded-lg min-w-0" style={{ background: "rgba(255,255,255,0.08)" }}>
            {me && <span className="hidden lg:block text-xs truncate" style={{ color: "rgba(255,255,255,0.6)" }} data-testid="text-username">{me.username}</span>}
            <span className="font-semibold truncate max-w-[160px]" data-testid="text-vendor-name">{me ? me.vendorName : t("Wholesale portal")}</span>
            <span className="w-7 h-7 rounded-md grid place-items-center text-xs font-bold shrink-0" style={{ background: "#B5E5B7", color: "#0C5132" }}>{initials || <Truck className="w-3.5 h-3.5" />}</span>
          </div>
        </div>
      </header>

      <div className={nav ? "md:grid md:grid-cols-[240px_minmax(0,1fr)]" : ""}>
        {nav && (
          <aside className="hidden md:block sticky top-14 h-[calc(100dvh-56px)] overflow-y-auto print:hidden"
            style={{ background: "color-mix(in srgb, var(--t-bg) 94%, var(--t-text))", borderRight: "1px solid var(--t-border)" }}>{vt(sidebar)}</aside>)}
        {nav && menu && (
          <div className="fixed inset-0 z-50 md:hidden print:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMenu(false)} />
            <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] shadow-2xl overflow-y-auto flex flex-col" style={{ background: "var(--t-surface)" }}>
              <div className="flex items-center justify-between px-4 h-14" style={{ borderBottom: "1px solid var(--t-border)" }}>
                <span className="font-semibold">{t("Menu")}</span><button onClick={() => setMenu(false)} aria-label={t("Close menu")} className="p-2 -mr-2 rounded-lg hover:bg-[var(--t-surface2)]"><X className="w-5 h-5" /></button>
              </div>
              {vt(sidebar)}
            </div>
          </div>)}
        <main className="min-w-0 px-4 md:px-8 py-5 md:py-7 pb-24">{vt(children)}</main>
      </div>
    </div>
  );
}

function Sidebar({ nav, onLogout }: { nav: NavProps; onLogout?: () => void }) {
  const item = (active: boolean): CSSProperties => active
    ? { background: "var(--t-surface)", color: "var(--t-text)", boxShadow: "0 1px 0 rgba(26,26,26,0.07)", fontWeight: 600 }
    : { color: "var(--t-muted)", fontWeight: 500 };
  const cls = "w-full flex items-center gap-2.5 h-8 px-2 rounded-lg text-[13px] text-left hover:bg-[color-mix(in_srgb,var(--t-text)_6%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6BCC]";
  return (
    <nav className="flex flex-col flex-1 h-full p-3 gap-0.5" aria-label={t("Vendor portal")}>
      <button onClick={() => nav.onNav("home")} className={cls} style={item(nav.view === "home")} aria-current={nav.view === "home" ? "page" : undefined}><Home className="w-4 h-4" />{t("Home")}</button>
      <button onClick={() => nav.onNav("orders", "all")} className={cls} style={item(nav.view === "orders")} aria-current={nav.view === "orders" ? "page" : undefined}>
        <ClipboardList className="w-4 h-4" />{t("Orders")}
        {nav.counts.new > 0 && <span className="ml-auto tabular-nums text-[11px] font-semibold px-1.5 rounded-md" style={{ background: TONES.attention.bg, color: TONES.attention.fg }}>{vt(nav.counts.new)}</span>}
      </button>
      {nav.view === "orders" && (
        <div className="ml-4 pl-2.5 my-0.5 flex flex-col gap-0.5" style={{ borderLeft: "1px solid var(--t-border)" }}>
          {STAGES.map(s => {
            const on = nav.tab === s.key;
            return <button key={s.key} onClick={() => nav.onNav("orders", s.key)} className={`${cls} h-7`} style={item(on)}>
              {vt(s.label)}<span className="ml-auto tabular-nums text-xs" style={subtle}>{vt(nav.counts[s.key])}</span></button>;
          })}
        </div>)}
      <button onClick={() => nav.onNav("messages")} className={cls} style={item(nav.view === "messages")} aria-current={nav.view === "messages" ? "page" : undefined} data-testid="nav-messages">
        <MessageSquare className="w-4 h-4" />{t("Messages")}
        {(nav.unreadMessages ?? 0) > 0 && <span className="ml-auto tabular-nums text-[11px] font-semibold px-1.5 rounded-md" style={{ background: TONES.info.bg, color: TONES.info.fg }} data-testid="badge-unread-messages">{vt(nav.unreadMessages)}</span>}
      </button>
      <button onClick={() => nav.onNav("settings")} className={cls} style={item(nav.view === "settings")} aria-current={nav.view === "settings" ? "page" : undefined} data-testid="nav-settings"><SettingsNavIcon className="w-4 h-4" />{t("Settings")}</button>
      <div className="mt-auto pt-3 flex flex-col gap-0.5" style={{ borderTop: "1px solid var(--t-border)" }}>
        {onLogout && <button onClick={onLogout} className={cls} style={item(false)} data-testid="button-logout"><LogOut className="w-4 h-4" />{t("Log out")}</button>}
      </div>
    </nav>
  );
}

/* ---------------------------------------------------------------------------
 * Packing slip
 * ------------------------------------------------------------------------- */
function printPackingSlip(o: VendorOrder) {
  const w = window.open("", "_blank", "width=440,height=720");
  if (!w) return;
  w.document.write(vendorPackingSlipHtml(o));
  w.document.close(); w.focus(); setTimeout(() => w.print(), 200);
}

/* ---------------------------------------------------------------------------
 * Order detail
 * ------------------------------------------------------------------------- */
export function OrderDetail({ order, onBack, onChanged, prev, next, onOpen, issue, issueTypes, onIssueChanged, defaultCarrier, onMessage }: {
  order: VendorOrder; onBack: () => void; onChanged: () => Promise<void>;
  prev: VendorOrder | null; next: VendorOrder | null; onOpen: (id: string) => void;
  issue?: VendorIssue; issueTypes?: Record<string, string>; onIssueChanged?: () => Promise<void>; defaultCarrier?: string | null; onMessage?: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const knownCarrier = !order.carrier || CARRIERS.includes(order.carrier);
  const [carrierPick, setCarrierPick] = useState(order.carrier ? (knownCarrier ? order.carrier : "other") : (defaultCarrier && CARRIERS.includes(defaultCarrier) ? defaultCarrier : ""));
  const [carrierOther, setCarrierOther] = useState(knownCarrier ? "" : order.carrier ?? "");
  const [editTracking, setEditTracking] = useState(!order.trackingNumber);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const trackingRef = useRef<HTMLInputElement>(null);
  const detectionVersion = useRef(0);
  const lastDetected = useRef("");
  const [detectingCarrier, setDetectingCarrier] = useState(false);
  const [carrierHint, setCarrierHint] = useState("");
  useEffect(() => () => { detectionVersion.current++; }, []);
  const detectCarrier = async () => {
    const number = tracking.trim();
    if (order.stale || number.length < 3 || number === lastDetected.current) return;
    const version = ++detectionVersion.current;
    lastDetected.current = number;
    setDetectingCarrier(true); setCarrierHint("");
    try {
      const response = await vendorFetch(`/api/vendor/orders/${encodeURIComponent(order.id)}/detect-carrier`, {
        method: "POST", credentials: "include", headers: { "content-type": "application/json" },
        body: JSON.stringify({ trackingNumber: number }),
      });
      if (!response.ok) throw new Error("Detection unavailable");
      const result = await response.json();
      if (version !== detectionVersion.current) return;
      const match = CARRIERS_17TRACK.find(c => c.code > 0 && c.code === result.carrierCode);
      if (match) { setCarrierPick(match.label); setCarrierHint(`Detected ${match.label}. You can change this if needed.`); }
      else setCarrierHint("Carrier could not be identified. Please select it manually.");
    } catch {
      if (version === detectionVersion.current) { lastDetected.current = ""; setCarrierHint("Detection unavailable. Please select a carrier manually."); }
    } finally {
      if (version === detectionVersion.current) setDetectingCarrier(false);
    }
  };
  const locked = order.stale;
  const st = stage(order);
  const started = st === "processing" || st === "shipped";
  const shipped = st === "shipped";
  const carrier = carrierPick === "other" ? carrierOther.trim() : carrierPick;
  const meta = stageMeta(st);

  const run = async (key: string, fn: () => Promise<Response>, ok: string) => {
    setBusy(key); setMsg(null);
    try {
      const r = await fn();
      if (!r.ok) throw new Error(await errorText(r, "Action failed"));
      setMsg({ ok: true, text: ok }); await onChanged(); return true;
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Action failed" }); return false; }
    finally { setBusy(null); }
  };

  const saveTracking = async (e: FormEvent) => {
    e.preventDefault();
    if (!carrier) { setMsg({ ok: false, text: "Choose a carrier." }); return; }
    if (!tracking.trim()) { setMsg({ ok: false, text: "Enter a tracking number." }); return; }
    const saved = await run("tracking", () => patchOrder(order.id, { action: "tracking", trackingNumber: tracking.trim(), carrier }),
      order.images.length ? "Tracking saved. The order is now marked fulfilled." : "Tracking saved. Add a packing photo so the customer can see their parcel.");
    if (saved) setEditTracking(false);
  };

  const uploadFiles = async (files: File[]) => {
    const images = files.filter(f => f.type.startsWith("image/"));
    if (!images.length) { setMsg({ ok: false, text: "Choose an image file." }); return; }
    const tooBig = images.filter(f => f.size > 5 * 1024 * 1024).map(f => f.name);
    const queue = images.filter(f => f.size <= 5 * 1024 * 1024);
    setBusy("image"); setMsg(null);
    let ok = 0; let error: string | null = null;
    for (const [i, f] of queue.entries()) {
      setProgress(`Uploading ${i + 1} of ${queue.length}…`);
      try {
        const fd = new FormData(); fd.append("file", f);
        const r = await vendorFetch(`/api/vendor/orders/${encodeURIComponent(order.id)}/images`, { method: "POST", credentials: "include", body: fd });
        if (!r.ok) { error = await errorText(r, "Upload failed"); break; }
        ok++;
      } catch { error = "Upload failed"; break; }
    }
    setProgress(null); setBusy(null);
    if (fileRef.current) fileRef.current.value = "";
    const parts = [ok ? `${ok} photo${ok === 1 ? "" : "s"} uploaded.` : "", tooBig.length ? `Skipped (over 5 MB): ${tooBig.join(", ")}.` : "", error ?? ""].filter(Boolean);
    setMsg({ ok: !error && !tooBig.length, text: parts.join(" ") });
    if (ok) await onChanged();
  };

  const copyAddress = async () => {
    const s = order.shipping;
    try { await navigator.clipboard.writeText([s.name, ...vendorAddressLines(s.address, s.country), s.country, s.phone].filter(Boolean).join("\n")); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { setMsg({ ok: false, text: "Could not copy. Select the address and copy it manually." }); }
  };

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox(i => i === null ? i : (i + 1) % order.images.length);
      if (e.key === "ArrowLeft") setLightbox(i => i === null ? i : (i - 1 + order.images.length) % order.images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, order.images.length]);

  const timeline = useMemo(() => {
    const timed: { at: number; label: string; detail?: string }[] = [
      { at: time(order), label: "Order submitted to you by Peps Anonymous", detail: `${order.items.length} line${order.items.length === 1 ? "" : "s"} · ${units(order)} units` },
      ...order.images.map(img => ({ at: new Date(img.createdAt).getTime() || 0, label: "Packing photo added", detail: img.filename })),
    ].sort((a, b) => a.at - b.at);
    const untimed: { label: string; detail?: string }[] = [];
    if (started) untimed.push({ label: "Marked as processing" });
    if (shipped) untimed.push({ label: "Tracking added · order fulfilled", detail: [order.carrier, order.trackingNumber].filter(Boolean).join(" ") });
    if (locked) untimed.push({ label: "Changed by Peps Anonymous · on hold", detail: "Actions unlock when the order is resubmitted" });
    return [...timed.map(t => ({ ...t, when: when(new Date(t.at).toISOString()) })), ...untimed.map(u => ({ ...u, when: "" }))];
  }, [order, started, shipped, locked]);

  const s = order.shipping;
  const addressLines = vendorAddressLines(s.address, s.country);

  return (
    <div className="max-w-[1120px] mx-auto">
      <div className="flex flex-wrap items-start gap-3 mb-4">
        <Btn onClick={onBack} aria-label={t("Back to orders")} data-testid="button-back" className="!px-2 shrink-0"><ArrowLeft className="w-4 h-4" /></Btn>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--t-text)" }} data-testid="text-reference">#{order.reference}</h1>
            <StageBadge order={order} />
            {overdue(order) && <Badge tone="critical">{t("Overdue")}</Badge>}
            <IssueBadge issue={issue} />
          </div>
          <p className="text-xs mt-0.5" style={subtle} title={t(date(order.submittedAt))}>{t("Submitted")} {vt(when(order.submittedAt))} · {vt(order.items.length)}  {t("line")}{vt(order.items.length === 1 || getVendorLanguage() === "zh" ? "" : "s")} · {vt(units(order))}  {t("units")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {onMessage && <Btn onClick={onMessage} data-testid="button-message-order"><MessageSquare className="w-4 h-4" />{t("Message Peps")}</Btn>}
          <Btn onClick={() => downloadVendorOrdersCsv([order])} data-testid="button-export-order-csv"><Download className="w-4 h-4" />{t("Export")}</Btn>
          <Btn onClick={() => printPackingSlip(order)} data-testid="button-print-slip"><Printer className="w-4 h-4" />{t("Print packing slip")}</Btn>
          <span className="inline-flex rounded-lg overflow-hidden ml-auto sm:ml-0" style={{ border: "1px solid var(--t-border)", boxShadow: "0 1px 0 rgba(26,26,26,0.07)", background: "var(--t-surface)" }}>
            <button disabled={!prev} onClick={() => prev && onOpen(prev.id)} className="h-[30px] px-2 disabled:opacity-40 hover:bg-[var(--t-surface2)]" aria-label={t("Previous order")} data-testid="button-prev-order"><ChevronLeft className="w-4 h-4" /></button>
            <button disabled={!next} onClick={() => next && onOpen(next.id)} className="h-[30px] px-2 disabled:opacity-40 hover:bg-[var(--t-surface2)]" aria-label={t("Next order")} data-testid="button-next-order" style={{ borderLeft: "1px solid var(--t-border)" }}><ChevronRight className="w-4 h-4" /></button>
          </span>
        </div>
      </div>

      <div className="space-y-3 mb-4 empty:hidden">
        {locked && <Banner tone="warning" testId="text-stale">{t("This shipment changed after it was sent to you. Actions are locked until Peps Anonymous resubmits it.")}</Banner>}
        {msg && <Banner tone={msg.ok ? "success" : "critical"} role={msg.ok ? "status" : "alert"} testId="text-action-result" onDismiss={() => setMsg(null)}>{vt(msg.text)}</Banner>}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          <Card flush title={<><Badge tone={meta.tone} progress={meta.progress}>{t(meta.label)} ({units(order)})</Badge></>}
            actions={shipped && order.trackingNumber ? <span className="text-xs font-mono truncate max-w-[180px]" style={subtle}>{order.trackingNumber}</span> : undefined}
            footer={locked ? <span className="text-xs mr-auto" style={muted}>{t("Locked while on hold.")}</span>
              : st === "new" ? <>
                <span className="text-xs mr-auto hidden sm:inline" style={muted}>{t("Let Peps Anonymous and the customer know packing has started.")}</span>
                <Btn variant="primary" disabled={!!busy} onClick={() => run("processing", () => patchOrder(order.id, { action: "processing" }), "Marked as processing.")} data-testid="button-mark-processing">
                  {busy === "processing" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}{t("Mark as processing")}</Btn></>
              : st === "processing" ? <>
                <span className="text-xs mr-auto hidden sm:inline" style={muted}>{t("Being packed. Add a tracking number to mark it fulfilled.")}</span>
                <Btn variant="primary" onClick={() => trackingRef.current?.focus()}><Truck className="w-4 h-4" />{t("Add tracking")}</Btn></>
              : <span className="text-xs mr-auto" style={muted}>{t("Fulfilled")}{order.carrier ? ` via ${order.carrier}` : ""}.</span>}>
            <ul className="px-4 pb-1">
              {order.items.map((it, i) => (
                <li key={i} className="flex items-center gap-3 py-3" style={{ borderTop: i ? "1px solid var(--t-border)" : undefined }}>
                  <span className="w-10 h-10 rounded-lg grid place-items-center shrink-0" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}><Package className="w-4 h-4" style={subtle} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium truncate" style={{ color: "var(--t-text)" }}>{it.productName}</span>
                    <span className="block text-xs tabular-nums" style={subtle}>{money(it.unitCost, order.currency)} × {vt(it.quantity)}</span>
                  </span>
                  <span className="text-[13px] tabular-nums" style={{ color: "var(--t-text)" }}>{money(it.lineTotal, order.currency)}</span>
                </li>))}
            </ul>
          </Card>

          <Card title={t("Shipment")} actions={shipped && !editTracking && !locked ? <Btn variant="plain" onClick={() => setEditTracking(true)} data-testid="button-edit-tracking"><Pencil className="w-3.5 h-3.5" />{t("Edit")}</Btn> : undefined}>
            {shipped && !editTracking ? (
              <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: "var(--t-surface2)" }}>
                <span className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: TONES.success.bg, color: TONES.success.fg }}><Truck className="w-4 h-4" /></span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{order.carrier}</p>
                  <p className="text-[13px] font-mono break-all" style={muted} data-testid="text-tracking">{order.trackingNumber}</p>
                </div>
              </div>
            ) : (
              <form className="grid sm:grid-cols-2 gap-3" onSubmit={saveTracking}>
                <label className="text-xs font-medium" style={muted}>{t("Carrier")}
                  <select value={carrierPick} onChange={e => { detectionVersion.current++; setDetectingCarrier(false); setCarrierHint(""); setCarrierPick(e.target.value); }} disabled={locked} required className={`${fieldCls} mt-1`} style={field} data-testid="select-carrier">
                    <option value="" disabled>{t("Choose carrier")}</option>
                    {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}<option value="other">{t("Other…")}</option>
                  </select></label>
                <label className="text-xs font-medium" style={muted}>{t("Tracking number")}
                  <input ref={trackingRef} value={tracking} onChange={e => { detectionVersion.current++; setDetectingCarrier(false); setCarrierHint(""); lastDetected.current = ""; setTracking(e.target.value); }} onBlur={() => void detectCarrier()} disabled={locked} required autoComplete="off" className={`${fieldCls} mt-1 font-mono`} style={field} data-testid="input-tracking" /></label>
                <div className="sm:col-span-2 text-xs" style={muted} aria-live="polite">
                  {t(detectingCarrier ? "Finding carrier with 17TRACK…" : carrierHint)}
                  <button type="button" disabled={locked || detectingCarrier || tracking.trim().length < 3} className="ml-2 underline" onClick={() => { lastDetected.current = ""; void detectCarrier(); }}>{t("Detect carrier")}</button>
                </div>
                {carrierPick === "other" && <label className="text-xs font-medium sm:col-span-2" style={muted}>{t("Carrier name")}
                  <input value={carrierOther} onChange={e => setCarrierOther(e.target.value)} disabled={locked} required maxLength={120} className={`${fieldCls} mt-1`} style={field} data-testid="input-carrier" /></label>}
                <div className="sm:col-span-2 flex flex-wrap items-center justify-end gap-2">
                  {shipped && <Btn onClick={() => { setEditTracking(false); setTracking(order.trackingNumber ?? ""); }}>{t("Cancel")}</Btn>}
                  <Btn type="submit" variant="primary" disabled={locked || !!busy || detectingCarrier} data-testid="button-save-tracking">
                    {busy === "tracking" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}{t(shipped ? "Update tracking" : "Save tracking and mark fulfilled")}</Btn>
                </div>
              </form>
            )}
          </Card>

          <OrderIssuePanel orderId={order.id} issue={issue} types={issueTypes ?? {}} locked={locked} onChanged={async () => { await onIssueChanged?.(); await onChanged(); }} />

          <Card title={t("Packing photos")} actions={<span className="text-xs tabular-nums" style={subtle}>{vt(order.images.length)} / 30</span>}>
            <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" id={`file-${order.id}`} disabled={locked || !!busy}
              onChange={e => { const f = [...(e.target.files ?? [])]; if (f.length) uploadFiles(f); }} data-testid="input-image" />
            <label htmlFor={`file-${order.id}`}
              onDragOver={e => { if (locked || busy) return; e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); if (!locked && !busy) uploadFiles([...e.dataTransfer.files]); }}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg px-4 py-6 text-center transition-colors ${locked || busy ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              style={{ border: `1.5px dashed ${drag ? "var(--t-blue)" : "var(--t-border)"}`, background: drag ? "var(--t-blue-06)" : "var(--t-surface2)" }} data-testid="dropzone-image">
              {busy === "image" ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--t-text)" }} /> : <ImagePlus className="w-5 h-5" style={{ color: "var(--t-text)" }} />}
              <span className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{progress ? t(progress) : <><span className="hidden sm:inline">{t("Drop photos here or click to upload")}</span><span className="sm:hidden inline-flex items-center gap-1.5"><Camera className="w-4 h-4" />{t("Take or choose photos")}</span></>}</span>
              <span className="text-xs" style={subtle}>{t("Products, sealed parcel and shipping label · JPG or PNG up to 5 MB each")}</span>
            </label>
            {order.images.length > 0 && <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-3">{order.images.map((img, i) => (
              <button key={img.id} onClick={() => setLightbox(i)} className="aspect-square rounded-lg overflow-hidden block hover:opacity-90" style={{ border: "1px solid var(--t-border)" }} data-testid={`img-order-${img.id}`} aria-label={t(`View ${img.filename}`)}>
                <img src={img.url} alt={img.filename} className="w-full h-full object-cover" loading="lazy" /></button>))}</div>}
          </Card>

          <Card title={t("Timeline")}>
            <ol className="relative ml-2">
              {timeline.map((ev, i) => (
                <li key={i} className="relative pl-6 pb-4 last:pb-0">
                  {i < timeline.length - 1 && <span className="absolute left-[5px] top-4 bottom-0 w-px" style={{ background: "var(--t-border)" }} aria-hidden />}
                  <span className="absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full" style={{ background: "var(--t-surface)", border: "2px solid var(--t-subtle)" }} aria-hidden />
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <p className="text-[13px]" style={{ color: "var(--t-text)" }}>{vt(ev.label)}</p>
                    {ev.when && <span className="text-xs ml-auto tabular-nums" style={subtle}>{vt(ev.when)}</span>}
                  </div>
                  {ev.detail && <p className="text-xs mt-0.5 break-all" style={muted}>{vt(ev.detail)}</p>}
                </li>))}
            </ol>
          </Card>

          {shipped && next && <Btn variant="primary" onClick={() => onOpen(next.id)} className="w-full h-10" data-testid="button-next-cta">{t("Next order: #")}{next.reference}<ChevronRight className="w-4 h-4" /></Btn>}
        </div>

        <aside className="space-y-4 min-w-0">
          <Card title={t("Customer")}>
            <p className="text-[13px] font-medium" style={{ color: "var(--t-text)" }}>{s.name}</p>
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--t-border)" }}>
              <h3 className="text-[13px] font-semibold mb-1" style={{ color: "var(--t-text)" }}>{t("Contact information")}</h3>
              <p className="text-[13px] break-all" style={s.email ? { color: "var(--t-blue)" } : subtle}>{s.email || t("No email provided")}</p>
              <p className="text-[13px]" style={s.phone ? muted : subtle}>{s.phone || t("No phone number")}</p>
            </div>
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--t-border)" }}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{t("Shipping address")}</h3>
                <Btn variant="plain" onClick={copyAddress} data-testid="button-copy-address">{copied ? <><Check className="w-3.5 h-3.5" />{t("Copied")}</> : <><Copy className="w-3.5 h-3.5" />{t("Copy")}</>}</Btn>
              </div>
              <address className="not-italic text-[13px] whitespace-pre-line" style={muted}>{[s.name, ...addressLines, s.country].join("\n")}</address>
            </div>
          </Card>

          <Card title={t("Cost summary")}>
            <dl className="text-[13px] space-y-2">
              <div className="flex justify-between gap-3"><dt style={muted}>{t("Subtotal")} <span style={subtle}>· {vt(units(order))}  {t("item")}{vt(units(order) === 1 || getVendorLanguage() === "zh" ? "" : "s")}</span></dt><dd className="tabular-nums" style={{ color: "var(--t-text)" }}>{money(order.productCost, order.currency)}</dd></div>
              <div className="flex justify-between gap-3"><dt style={muted}>{t("Shipping")}</dt><dd className="tabular-nums" style={{ color: "var(--t-text)" }}>{money(order.shippingCost, order.currency)}</dd></div>
              <div className="flex justify-between gap-3 pt-2 font-semibold" style={{ borderTop: "1px solid var(--t-border)", color: "var(--t-text)" }}><dt>{t("Total cost")}</dt><dd className="tabular-nums" data-testid={`text-total-${order.id}`}>{money(order.totalCost, order.currency)}</dd></div>
            </dl>
            <p className="text-xs mt-3" style={subtle}>{t("Wholesale cost payable by Peps Anonymous. Customer pricing is not shown.")}</p>
          </Card>
        </aside>
      </div>

      {lightbox !== null && order.images[lightbox] && (
        <div role="dialog" aria-modal="true" aria-label={t("Photo preview")} className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(5,12,28,0.85)" }} onClick={() => setLightbox(null)}>
          <img src={order.images[lightbox].url} alt={order.images[lightbox].filename} className="max-w-full max-h-[85vh] rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white" aria-label={t("Close")}><X className="w-5 h-5" /></button>
          {order.images.length > 1 && <>
            <button onClick={e => { e.stopPropagation(); setLightbox((lightbox - 1 + order.images.length) % order.images.length); }} className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white" aria-label={t("Previous photo")}><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={e => { e.stopPropagation(); setLightbox((lightbox + 1) % order.images.length); }} className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white" aria-label={t("Next photo")}><ChevronRight className="w-5 h-5" /></button>
          </>}
          <p className="absolute bottom-4 text-xs text-white/70">{vt(lightbox + 1)} / {vt(order.images.length)} · {order.images[lightbox].filename}</p>
        </div>)}
    </div>
  );
}
