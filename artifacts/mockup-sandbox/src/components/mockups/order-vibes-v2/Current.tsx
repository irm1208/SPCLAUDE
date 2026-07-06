import './_group.css';
import React from 'react';
import {
  LayoutDashboard, ReceiptText, UsersRound, HeartPulse, ClipboardList,
  Search, Bell, ChevronDown, ChevronRight, Moon, PanelLeft, Send, Ticket,
  Wallet, Store, ArrowRight, Scale, FlaskConical, Droplet, TrendingUp, Activity,
  Truck, ShoppingBag, Users, TestTube, LifeBuoy, Globe, BarChart2, Trash2, Plus,
} from 'lucide-react';

// ─── Theme constants (inlined from the app's dashboard-theme.ts, light palette) ──
const T = {
  page: '#F3F3F3', panel: '#FFFFFF', panel2: '#FAFAF9',
  border: '#DDDBDA', borderSoft: '#EDEBE9',
  text: '#181818', muted: '#5C5C5C', subtle: '#8C8C8C',
  track: '#ECEBEA', chip: '#F3F3F3', sidebar: '#FFFFFF',
};
const ACCENT = '#0176D3';
const HERO_GRAD = 'linear-gradient(120deg,#1B3164 0%,#1B3A7A 45%,#2D6BCC 100%)';
const RAIL_NAVY = '#032D60';
const FONT = "'Inter','Salesforce Sans','Helvetica Neue',Arial,sans-serif";
const STAR_AMBER = '#F5A623';
const SIDEBAR_W = 250;
const RAIL_W = 56;

// ─── Mock data ──────────────────────────────────────────────────────────────
const USERNAME = 'urbanblend789';
const CREDITS = 0;
const GB_NAME = 'S&P GB';
const RESHIPPER = {
  countryName: 'United Kingdom',
  telegramUsername: 'ajer6130',
  paymentTarget: 'admin',
  methods: 'USDT / USDC, AnonPay',
};
const LINE_ITEMS = [1, 2, 3, 4, 5];

const NAV_ITEMS = [
  { id: 'home', label: 'Dashboard', Icon: LayoutDashboard, active: false },
  { id: 'orders', label: 'Orders', Icon: ReceiptText, active: true },
  { id: 'groups', label: 'Group Buys', Icon: UsersRound, active: false },
  { id: 'health-hub', label: 'Health Hub', Icon: HeartPulse, active: false },
  { id: 'lab-tests', label: 'Lab Tests', Icon: ClipboardList, active: false },
];
const WORKSPACE_ITEMS = [
  { id: 'reshipper', label: 'Reshipper', Icon: Truck },
  { id: 'wholesale', label: 'Wholesale', Icon: ShoppingBag },
  { id: 'shared-orders', label: 'Shared Orders', Icon: Users },
];
const MORE_ITEMS = [
  { id: 'lab-pool', label: 'Pool Leaders', Icon: TestTube },
  { id: 'support', label: 'Tickets', Icon: LifeBuoy },
];
const HEALTH_APPS = [Scale, FlaskConical, Droplet, HeartPulse, TrendingUp, Activity];
const GB_ORDERS = [
  { code: '6644', dot: STAR_AMBER },
  { code: '9955', dot: STAR_AMBER },
];

// ─── Sidebar nav button ─────────────────────────────────────────────────────
function NavButton({ label, Icon, active }: { label: string; Icon: React.ElementType; active?: boolean }) {
  return (
    <button
      className="relative w-full flex items-center rounded-md transition-all text-left"
      style={{
        gap: 11, padding: '0 12px', height: 40,
        background: active ? 'rgba(1,118,211,0.10)' : 'transparent',
        color: active ? ACCENT : T.muted,
        fontWeight: active ? 700 : 600, fontSize: 13.5,
      }}
    >
      {active && <span className="absolute rounded-full" style={{ left: -12, top: 11, bottom: 11, width: 3.5, background: ACCENT }} />}
      <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2.4 : 2} />
      <span className="truncate">{label}</span>
    </button>
  );
}

// ─── Product line (dropdown + qty stepper) ──────────────────────────────────
function ProductLine({ showDivider }: { showDivider: boolean }) {
  return (
    <div>
      <div className="flex flex-col gap-3 overflow-hidden">
        {/* Searchable product select trigger */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="w-full text-left focus:outline-none flex items-start"
            style={{
              minHeight: 48, borderRadius: 12,
              paddingLeft: 16, paddingRight: 40, paddingTop: 13, paddingBottom: 13,
              fontSize: 14, background: '#162231',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.75)', cursor: 'pointer',
            }}
          >
            <span style={{ flex: 1, wordBreak: 'break-word', lineHeight: '1.4' }}>Select a product…</span>
          </button>
          <ChevronDown
            className="absolute right-3 top-3.5 w-5 h-5 pointer-events-none"
            style={{ color: '#5B8DEF' }}
          />
        </div>

        {/* Quantity + price row */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center shrink-0">
            <div
              className="flex items-center h-11 rounded-xl overflow-hidden"
              style={{ background: '#162231', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <button type="button" className="px-3.5 h-full text-lg" style={{ color: 'rgba(255,255,255,0.85)' }}>−</button>
              <span className="w-10 text-center text-sm font-bold" style={{ color: '#ffffff' }}>1</span>
              <button type="button" className="px-3.5 h-full text-lg" style={{ color: 'rgba(255,255,255,0.85)' }}>+</button>
            </div>
            <p className="text-xs mt-1 leading-none" style={{ color: 'rgba(255,255,255,0.75)' }}>For half kits add .5</p>
          </div>

          <div className="flex-1 text-right">
            <p className="font-bold text-base" style={{ color: '#ffffff' }}>$0.00</p>
          </div>

          <button type="button" className="p-2 rounded-lg" style={{ color: 'rgba(255,255,255,0.75)' }}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {showDivider && <div className="my-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
export function Current() {
  const initial = USERNAME.slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--t-bg)', fontFamily: FONT }}>
      {/* ══ Sidebar (icon rail + labelled panel) ══ */}
      <aside className="hidden lg:flex shrink-0 sticky top-0 h-screen" style={{ width: SIDEBAR_W }}>
        {/* Icon rail */}
        <div
          className="flex flex-col items-center shrink-0"
          style={{ width: RAIL_W, background: RAIL_NAVY, paddingTop: 18, paddingBottom: 16 }}
        >
          <div
            className="flex items-center justify-center shrink-0"
            style={{ width: 38, height: 38, borderRadius: 8, background: '#0176D3', color: '#fff', fontWeight: 800, fontSize: 12 }}
          >
            S&amp;P
          </div>

          <nav className="flex flex-col items-center gap-1.5" style={{ marginTop: 22 }}>
            {[LayoutDashboard, ClipboardList].map((Icon, i) => (
              <button
                key={i}
                className="flex items-center justify-center transition-all"
                style={{ width: 40, height: 40, borderRadius: 6, background: 'transparent', color: 'rgba(255,255,255,0.62)' }}
              >
                <Icon className="w-[19px] h-[19px]" strokeWidth={2} />
              </button>
            ))}
          </nav>

          <nav
            className="flex flex-col items-center gap-1.5"
            style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.14)' }}
          >
            {HEALTH_APPS.map((Icon, i) => (
              <button
                key={i}
                className="flex items-center justify-center transition-all"
                style={{ width: 40, height: 40, borderRadius: 6, color: 'rgba(255,255,255,0.62)' }}
              >
                <Icon className="w-[19px] h-[19px]" strokeWidth={2} />
              </button>
            ))}
          </nav>

          <div className="flex flex-col items-center gap-1.5" style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.14)' }}>
            {[Ticket, Store, PanelLeft].map((Icon, i) => (
              <button
                key={i}
                className="flex items-center justify-center transition-all"
                style={{ width: 40, height: 40, borderRadius: 6, color: 'rgba(255,255,255,0.62)' }}
              >
                <Icon className="w-[19px] h-[19px]" />
              </button>
            ))}
          </div>
        </div>

        {/* Labelled panel */}
        <div className="flex flex-col flex-1 min-w-0" style={{ background: T.sidebar, borderRight: `1px solid ${T.border}` }}>
          {/* Brand */}
          <div className="flex items-center px-4" style={{ height: 72 }}>
            <span className="font-extrabold tracking-tight truncate" style={{ fontSize: 20, color: T.text }}>Salt &amp; Peps</span>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-4">
            {/* Main nav */}
            <nav className="flex flex-col gap-0.5">
              {NAV_ITEMS.map(({ id, label, Icon, active }) => (
                <NavButton key={id} label={label} Icon={Icon} active={active} />
              ))}
            </nav>

            {/* Workspaces */}
            <p className="px-3 mt-6 mb-2 font-semibold" style={{ fontSize: 12, letterSpacing: '.01em', color: T.subtle }}>Workspaces</p>
            <nav className="flex flex-col gap-0.5">
              {WORKSPACE_ITEMS.map(({ id, label, Icon }) => (
                <NavButton key={id} label={label} Icon={Icon} />
              ))}
            </nav>

            {/* More */}
            <p className="px-3 mt-6 mb-2 font-semibold" style={{ fontSize: 12, letterSpacing: '.01em', color: T.subtle }}>More</p>
            <nav className="flex flex-col gap-0.5">
              {MORE_ITEMS.map(({ id, label, Icon }) => (
                <NavButton key={id} label={label} Icon={Icon} />
              ))}
            </nav>

            {/* Orders */}
            <p className="px-3 mt-6 mb-2 font-semibold" style={{ fontSize: 12, letterSpacing: '.01em', color: T.subtle }}>Orders</p>
            <div className="mb-2">
              <p className="px-3 mb-1 font-bold uppercase" style={{ fontSize: 10, letterSpacing: '.07em', color: T.subtle, opacity: 0.8 }}>Group Buys</p>
              <div className="flex flex-col gap-0.5">
                {GB_ORDERS.map(o => (
                  <button
                    key={o.code}
                    className="w-full flex items-center gap-3 rounded-md px-3 text-left"
                    style={{ height: 40, color: T.text, fontWeight: 600, fontSize: 13 }}
                  >
                    <span className="flex items-center justify-center shrink-0 rounded-lg" style={{ width: 28, height: 28, background: 'rgba(124,58,237,0.12)', color: '#7C3AED' }}>
                      <UsersRound className="w-[15px] h-[15px]" />
                    </span>
                    <span className="truncate flex-1">{o.code}</span>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: o.dot }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom promo card */}
            <button
              className="w-full text-left mt-6 rounded-xl relative overflow-hidden"
              style={{ background: HERO_GRAD, padding: 16, color: '#fff' }}
            >
              <div className="absolute" style={{ top: -28, right: -22, width: 108, height: 108, borderRadius: 9999, background: 'rgba(255,255,255,.14)', filter: 'blur(26px)', pointerEvents: 'none' }} />
              <div className="relative">
                <div className="flex items-center justify-center rounded-lg mb-3" style={{ width: 36, height: 36, background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.28)', color: '#fff' }}>
                  <Send className="w-[18px] h-[18px]" />
                </div>
                <p className="font-bold leading-tight" style={{ fontSize: 14 }}>Take Salt &amp; Peps Everywhere</p>
                <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,.72)', marginTop: 4, lineHeight: 1.4 }}>Order updates &amp; alerts on Telegram.</p>
                <span className="inline-flex items-center gap-1.5 mt-3 rounded-lg font-bold" style={{ fontSize: 11.5, padding: '8px 12px', background: '#fff', color: '#1B3A7A' }}>
                  Connect Telegram <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          </div>
        </div>
      </aside>

      {/* ══ Main column ══ */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header
          className="sticky top-0 z-10 flex items-center gap-3 px-3 md:px-7"
          style={{ height: 72, background: T.panel, borderBottom: `1px solid ${T.border}` }}
        >
          <h1 className="font-extrabold tracking-tight shrink-0" style={{ fontSize: 21, color: T.text }}>Order Form</h1>

          <div className="flex-1 flex justify-center min-w-0 sm:px-2">
            <div className="relative hidden sm:block w-full max-w-[460px]">
              <div
                className="flex items-center gap-2.5 w-full rounded-md"
                style={{ height: 42, padding: '0 14px', background: T.panel, border: `1px solid ${T.border}` }}
              >
                <Search className="w-4 h-4 shrink-0" style={{ color: T.subtle }} />
                <input
                  readOnly
                  placeholder="Search orders, compounds, group buys, products..."
                  className="flex-1 min-w-0 bg-transparent outline-none"
                  style={{ fontSize: 13.5, color: T.text }}
                />
                <span
                  className="hidden md:flex items-center gap-1 rounded-md font-semibold shrink-0"
                  style={{ fontSize: 11, padding: '3px 7px', background: T.chip, color: T.subtle }}
                >⌘ K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Credits */}
            <button
              className="flex items-center gap-2 rounded-lg pl-2 pr-3 transition-colors"
              style={{ height: 40, background: 'rgba(45,107,204,.08)', border: '1px solid rgba(45,107,204,.18)' }}
            >
              <span className="flex items-center justify-center rounded-md shrink-0" style={{ width: 26, height: 26, background: '#fff', color: '#2D6BCC', border: '1px solid rgba(45,107,204,.18)' }}>
                <Wallet className="w-[15px] h-[15px]" />
              </span>
              <span className="flex flex-col items-start leading-none">
                <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#2D6BCC' }}>Credits</span>
                <span className="font-extrabold" style={{ fontSize: 13, color: T.text, letterSpacing: '-0.01em', marginTop: 2 }}>${CREDITS.toFixed(2)}</span>
              </span>
            </button>
            {/* Theme toggle */}
            <button
              className="hidden md:flex items-center justify-center rounded-md transition-colors"
              style={{ width: 40, height: 40, background: T.panel, border: `1px solid ${T.border}`, color: T.muted }}
            >
              <Moon className="w-4 h-4" />
            </button>
            {/* Notifications */}
            <button
              className="relative flex items-center justify-center rounded-md transition-colors"
              style={{ width: 40, height: 40, background: T.panel, border: `1px solid ${T.border}`, color: T.muted }}
            >
              <Bell className="w-4 h-4" />
            </button>
            {/* Profile chip */}
            <button
              className="flex items-center gap-2 rounded-md pl-1 pr-2"
              style={{ height: 44, background: T.panel, border: `1px solid ${T.border}` }}
            >
              <span className="flex items-center justify-center rounded-full text-white shrink-0" style={{ width: 34, height: 34, background: ACCENT, fontWeight: 700, fontSize: 14 }}>{initial}</span>
              <span className="hidden md:flex flex-col items-start leading-tight min-w-0">
                <span className="font-bold truncate" style={{ fontSize: 12.5, maxWidth: 120, color: T.text }}>{USERNAME}</span>
                <span className="truncate" style={{ fontSize: 11, color: T.subtle, maxWidth: 120 }}>@{USERNAME}</span>
              </span>
              <ChevronDown className="w-4 h-4 shrink-0 hidden md:block" style={{ color: T.subtle }} />
            </button>
          </div>
        </header>

        {/* Order form content */}
        <div className="flex-1 flex flex-col" style={{ background: 'var(--t-bg)', fontFamily: "'Inter', sans-serif" }}>
          <main className="flex-1 px-4 py-5 pb-48 lg:pb-32 max-w-2xl mx-auto w-full space-y-4">

            {/* GB title + progress steps */}
            <div className="space-y-3 pt-1">
              {/* Reshipper info card */}
              <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: 'var(--t-blue-12)', border: '1.5px solid var(--t-blue-30)' }}>
                <Globe className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--t-blue)' }} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold" style={{ color: 'var(--t-blue)' }}>
                    Local Reshipper — {RESHIPPER.countryName}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--t-text)' }}>@{RESHIPPER.telegramUsername}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--t-subtle)' }}>Pay to: {RESHIPPER.paymentTarget}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--t-subtle)' }}>Methods: {RESHIPPER.methods}</p>
                </div>
              </div>

              {/* Title */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 text-center" style={{ color: 'var(--t-blue-deep)' }}>Group Buy</p>
                <h1 className="text-xl font-bold text-center" style={{ color: 'var(--t-text)' }}>{GB_NAME}</h1>
              </div>

              {/* 2-step progress indicator */}
              <div className="flex items-center gap-2">
                {/* Step 1 — active */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'var(--t-blue-deep)' }}>
                  <span className="w-4 h-4 rounded-full bg-white flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold" style={{ color: 'var(--t-blue-deep)' }}>1</span>
                  </span>
                  <span className="text-xs font-semibold text-white whitespace-nowrap">Choose Products</span>
                </div>
                {/* Arrow */}
                <div className="flex-1 flex items-center">
                  <div className="flex-1 h-px" style={{ background: 'rgba(27,58,122,0.2)' }} />
                  <svg className="w-3 h-3 mx-1 shrink-0" fill="none" viewBox="0 0 12 12" style={{ color: 'rgba(27,58,122,0.35)' }}>
                    <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                {/* Step 2 — inactive */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(27,58,122,0.08)', border: '1px solid rgba(27,58,122,0.2)' }}>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(27,58,122,0.18)' }}>
                    <span className="text-[9px] font-bold" style={{ color: 'var(--t-blue-deep)' }}>2</span>
                  </span>
                  <span className="text-xs font-semibold whitespace-nowrap" style={{ color: 'rgba(27,58,122,0.6)' }}>Review Order</span>
                </div>
              </div>
            </div>

            {/* YOUR PRODUCTS panel */}
            <section className="space-y-3">
              <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: '#1C2B3D' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#E9A020' }}>Your Products</p>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}
                  >
                    <BarChart2 className="w-3 h-3" />
                    Stock levels
                  </button>
                </div>

                <div className="space-y-3">
                  {LINE_ITEMS.map((n, i) => (
                    <ProductLine key={n} showDivider={i < LINE_ITEMS.length - 1} />
                  ))}
                </div>

                <button
                  type="button"
                  className="w-full h-10 mt-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
                  style={{ border: '1px dashed rgba(255,255,255,0.35)', color: 'rgba(255,255,255,0.75)', background: 'transparent' }}
                >
                  <Plus className="w-3 h-3" /> Add another product
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* ══ Fixed GRAND TOTAL footer ══ */}
      <div
        className="fixed bottom-0 right-0 z-20 backdrop-blur-xl border-t shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        style={{ left: SIDEBAR_W, background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}
      >
        <div className="max-w-2xl mx-auto px-4 pt-3" style={{ paddingBottom: '1rem' }}>
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--t-subtle)' }}>Grand Total</p>
              <p className="text-xl font-bold truncate" style={{ color: 'var(--t-text)' }}>$0.00</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--t-subtle)' }}>incl. Custom</p>
            </div>
            <button
              className="h-12 px-7 rounded-xl text-sm font-bold text-white flex items-center gap-2 shrink-0 hover:brightness-110 active:scale-[0.98] transition-all"
              style={{ background: 'var(--t-blue-deep)' }}
            >
              Review <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
