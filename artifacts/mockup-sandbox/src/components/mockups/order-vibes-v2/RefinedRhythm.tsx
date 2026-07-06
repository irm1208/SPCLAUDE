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
const SIDEBAR_W = 256;
const RAIL_W = 64;

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
      className="group relative w-full flex items-center rounded-lg transition-all text-left"
      style={{
        gap: 12, padding: '0 12px', height: 40,
        background: active ? 'var(--t-blue-08)' : 'transparent',
        color: active ? ACCENT : T.muted,
        fontWeight: active ? 600 : 500, fontSize: 14,
      }}
    >
      {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-md" style={{ background: ACCENT }} />}
      <Icon className="w-5 h-5 shrink-0 transition-colors group-hover:text-blue-600" strokeWidth={active ? 2.5 : 2} />
      <span className="truncate">{label}</span>
    </button>
  );
}

// ─── Product line (dropdown + qty stepper) ──────────────────────────────────
function ProductLine({ showDivider }: { showDivider: boolean }) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-2">
        {/* Searchable product select trigger */}
        <div className="relative flex-1">
          <button
            type="button"
            className="w-full text-left focus:outline-none flex items-center justify-between hover:bg-white/5 transition-colors"
            style={{
              minHeight: 48, borderRadius: 12,
              padding: '0 16px',
              fontSize: 14, background: '#131F2E',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.9)', cursor: 'pointer',
            }}
          >
            <span className="truncate">Select a product…</span>
            <ChevronDown className="w-4 h-4 shrink-0" style={{ color: '#5B8DEF' }} />
          </button>
        </div>

        {/* Quantity + price row */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex flex-col items-center">
            <div
              className="flex items-center h-12 rounded-xl overflow-hidden hover:border-white/20 transition-colors"
              style={{ background: '#131F2E', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <button type="button" className="px-4 h-full text-lg hover:bg-white/5 transition-colors" style={{ color: 'rgba(255,255,255,0.9)' }}>−</button>
              <span className="w-8 text-center text-sm font-semibold" style={{ color: '#ffffff' }}>1</span>
              <button type="button" className="px-4 h-full text-lg hover:bg-white/5 transition-colors" style={{ color: 'rgba(255,255,255,0.9)' }}>+</button>
            </div>
            <p className="text-[11px] mt-1.5 leading-none" style={{ color: 'rgba(255,255,255,0.5)' }}>For half kits add .5</p>
          </div>

          <div className="w-20 text-right">
            <p className="font-semibold text-base tabular-nums" style={{ color: '#ffffff' }}>$0.00</p>
          </div>

          <button type="button" className="p-2.5 rounded-xl hover:bg-white/10 hover:text-red-400 transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {showDivider && <div className="my-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
export function RefinedRhythm() {
  const initial = USERNAME.slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--t-bg)', fontFamily: FONT }}>
      {/* ══ Sidebar ══ */}
      <aside className="hidden lg:flex shrink-0 sticky top-0 h-screen border-r" style={{ width: SIDEBAR_W, borderColor: T.border, background: T.sidebar }}>
        {/* Icon rail */}
        <div
          className="flex flex-col items-center shrink-0 border-r"
          style={{ width: RAIL_W, background: RAIL_NAVY, borderColor: 'rgba(255,255,255,0.05)', paddingTop: 16, paddingBottom: 16 }}
        >
          <div
            className="flex items-center justify-center shrink-0 shadow-sm"
            style={{ width: 40, height: 40, borderRadius: 10, background: '#0176D3', color: '#fff', fontWeight: 700, fontSize: 13 }}
          >
            S&amp;P
          </div>

          <nav className="flex flex-col items-center gap-2 mt-6">
            {[LayoutDashboard, ClipboardList].map((Icon, i) => (
              <button
                key={i}
                className="flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ width: 40, height: 40, borderRadius: 10, color: 'rgba(255,255,255,0.7)' }}
              >
                <Icon className="w-5 h-5" strokeWidth={2} />
              </button>
            ))}
          </nav>

          <div className="w-6 h-px bg-white/10 my-4" />

          <nav className="flex flex-col items-center gap-2">
            {HEALTH_APPS.map((Icon, i) => (
              <button
                key={i}
                className="flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ width: 40, height: 40, borderRadius: 10, color: 'rgba(255,255,255,0.7)' }}
              >
                <Icon className="w-5 h-5" strokeWidth={2} />
              </button>
            ))}
          </nav>

          <div className="mt-auto flex flex-col items-center gap-2 pt-4 border-t border-white/10 w-full">
            {[Ticket, Store, PanelLeft].map((Icon, i) => (
              <button
                key={i}
                className="flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ width: 40, height: 40, borderRadius: 10, color: 'rgba(255,255,255,0.7)' }}
              >
                <Icon className="w-5 h-5" strokeWidth={2} />
              </button>
            ))}
          </div>
        </div>

        {/* Labelled panel */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center px-5 h-16 border-b" style={{ borderColor: T.border }}>
            <span className="font-bold tracking-tight truncate text-lg" style={{ color: T.text }}>Salt &amp; Peps</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-8">
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map(({ id, label, Icon, active }) => (
                <NavButton key={id} label={label} Icon={Icon} active={active} />
              ))}
            </nav>

            <div>
              <p className="px-3 mb-3 text-xs font-semibold tracking-wide uppercase" style={{ color: T.subtle }}>Workspaces</p>
              <nav className="flex flex-col gap-1">
                {WORKSPACE_ITEMS.map(({ id, label, Icon }) => (
                  <NavButton key={id} label={label} Icon={Icon} />
                ))}
              </nav>
            </div>

            <div>
              <p className="px-3 mb-3 text-xs font-semibold tracking-wide uppercase" style={{ color: T.subtle }}>More</p>
              <nav className="flex flex-col gap-1">
                {MORE_ITEMS.map(({ id, label, Icon }) => (
                  <NavButton key={id} label={label} Icon={Icon} />
                ))}
              </nav>
            </div>

            <div>
              <p className="px-3 mb-3 text-xs font-semibold tracking-wide uppercase" style={{ color: T.subtle }}>Group Buys</p>
              <div className="flex flex-col gap-1">
                {GB_ORDERS.map(o => (
                  <button
                    key={o.code}
                    className="w-full flex items-center gap-3 rounded-lg px-3 hover:bg-gray-50 transition-colors text-left"
                    style={{ height: 40, color: T.text, fontWeight: 500, fontSize: 14 }}
                  >
                    <span className="flex items-center justify-center shrink-0 rounded-md" style={{ width: 24, height: 24, background: 'rgba(124,58,237,0.1)', color: '#7C3AED' }}>
                      <UsersRound className="w-3.5 h-3.5" />
                    </span>
                    <span className="truncate flex-1">{o.code}</span>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: o.dot }} />
                  </button>
                ))}
              </div>
            </div>

            <button
              className="w-full text-left rounded-xl p-4 relative overflow-hidden group shadow-sm"
              style={{ background: HERO_GRAD, color: '#fff' }}
            >
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none transition-transform group-hover:scale-110" />
              <div className="relative">
                <div className="flex items-center justify-center rounded-lg mb-3 shadow-inner" style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}>
                  <Send className="w-4 h-4" />
                </div>
                <p className="font-semibold text-sm leading-snug">Take Salt &amp; Peps Everywhere</p>
                <p className="text-xs text-white/80 mt-1.5 leading-relaxed">Order updates &amp; alerts on Telegram.</p>
                <span className="inline-flex items-center gap-1.5 mt-4 rounded-lg font-semibold text-xs px-3 py-2 bg-white text-blue-900 shadow-sm group-hover:bg-blue-50 transition-colors">
                  Connect Telegram <ChevronRight className="w-3 h-3" />
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
          className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 h-16 border-b bg-white/80 backdrop-blur-md"
          style={{ borderColor: T.border }}
        >
          <div className="flex items-center gap-6 flex-1 min-w-0">
            <h1 className="font-bold tracking-tight text-lg shrink-0" style={{ color: T.text }}>Order Form</h1>

            <div className="hidden sm:flex relative w-full max-w-md">
              <div
                className="flex items-center gap-2.5 w-full rounded-lg h-10 px-3 bg-gray-50 border transition-colors focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
                style={{ borderColor: T.border }}
              >
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  readOnly
                  placeholder="Search orders, compounds, group buys, products..."
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm"
                  style={{ color: T.text }}
                />
                <span className="hidden md:flex items-center gap-1 rounded font-medium text-[10px] px-1.5 py-0.5 bg-gray-200/50 text-gray-500 shrink-0">⌘ K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              className="flex items-center gap-2.5 rounded-lg h-10 px-3 border shadow-sm hover:bg-blue-50/50 transition-colors"
              style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}
            >
              <div className="flex items-center justify-center rounded bg-blue-50 text-blue-600 w-6 h-6 shrink-0">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col items-start leading-none justify-center">
                <span className="text-[9px] font-bold tracking-wider uppercase text-gray-500 mb-0.5">Credits</span>
                <span className="text-sm font-bold tracking-tight" style={{ color: T.text }}>${CREDITS.toFixed(2)}</span>
              </div>
            </button>
            <button
              className="hidden md:flex items-center justify-center rounded-lg h-10 w-10 border hover:bg-gray-50 transition-colors"
              style={{ background: T.panel, borderColor: T.border, color: T.muted }}
            >
              <Moon className="w-4 h-4" />
            </button>
            <button
              className="relative flex items-center justify-center rounded-lg h-10 w-10 border hover:bg-gray-50 transition-colors"
              style={{ background: T.panel, borderColor: T.border, color: T.muted }}
            >
              <Bell className="w-4 h-4" />
            </button>
            <button
              className="flex items-center gap-2.5 rounded-lg h-10 pl-1.5 pr-3 border hover:bg-gray-50 transition-colors"
              style={{ background: T.panel, borderColor: T.border }}
            >
              <div className="flex items-center justify-center rounded-md text-white w-7 h-7 shrink-0 text-xs font-bold shadow-sm" style={{ background: ACCENT }}>{initial}</div>
              <div className="hidden md:flex flex-col items-start leading-none justify-center min-w-0">
                <span className="font-semibold text-sm truncate max-w-[100px]" style={{ color: T.text }}>{USERNAME}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 hidden md:block" />
            </button>
          </div>
        </header>

        {/* Order form content */}
        <div className="flex-1 flex flex-col">
          <main className="flex-1 px-4 py-8 pb-48 lg:pb-32 max-w-2xl mx-auto w-full space-y-8">

            {/* Header Section */}
            <div className="space-y-6">
              {/* Reshipper info card */}
              <div className="rounded-2xl p-4 flex items-start gap-4 shadow-sm" style={{ background: 'var(--t-blue-04)', border: '1px solid var(--t-blue-15)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'var(--t-blue-10)' }}>
                  <Globe className="w-4 h-4" style={{ color: 'var(--t-blue)' }} />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--t-blue-deep)' }}>
                    Local Reshipper — {RESHIPPER.countryName}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--t-subtle)' }}>
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400/50" />@{RESHIPPER.telegramUsername}</span>
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400/50" />Pay: {RESHIPPER.paymentTarget}</span>
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400/50" />{RESHIPPER.methods}</span>
                  </div>
                </div>
              </div>

              {/* Title & Stepper Container */}
              <div className="flex flex-col items-center gap-5">
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] mb-1.5" style={{ color: 'var(--t-blue)' }}>Group Buy</p>
                  <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: T.text }}>{GB_NAME}</h2>
                </div>

                {/* 2-step stepper */}
                <div className="flex items-center w-full max-w-sm mx-auto">
                  {/* Step 1 */}
                  <div className="flex flex-col items-center gap-2 relative z-10">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ring-4 ring-white" style={{ background: 'var(--t-blue-deep)', color: '#fff' }}>1</div>
                    <span className="text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--t-text)' }}>Choose Products</span>
                  </div>
                  {/* Line */}
                  <div className="flex-1 h-0.5 -mt-6 mx-2" style={{ background: 'var(--t-blue-deep)' }} />
                  {/* Step 2 */}
                  <div className="flex flex-col items-center gap-2 relative z-10 opacity-50">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ring-4 ring-white" style={{ background: 'var(--t-border)', color: 'var(--t-subtle)' }}>2</div>
                    <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--t-subtle)' }}>Review Order</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Panel */}
            <section>
              <div className="rounded-3xl p-6 relative overflow-hidden shadow-lg" style={{ background: '#0D1520' }}>
                {/* Panel Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-white/90">Your Products</h3>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/70"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    Stock levels
                  </button>
                </div>

                {/* Products */}
                <div className="space-y-2">
                  {LINE_ITEMS.map((n, i) => (
                    <ProductLine key={n} showDivider={i < LINE_ITEMS.length - 1} />
                  ))}
                </div>

                {/* Add Button */}
                <div className="mt-6 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    className="w-full h-12 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:bg-white/5 border border-dashed border-white/20 text-white/80 hover:text-white"
                  >
                    <Plus className="w-4 h-4" /> Add another product
                  </button>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* ══ Fixed GRAND TOTAL footer ══ */}
      <div
        className="fixed bottom-0 right-0 z-20 bg-white/95 backdrop-blur-xl border-t shadow-[0_-8px_30px_rgba(0,0,0,0.06)]"
        style={{ left: SIDEBAR_W, borderColor: T.border }}
      >
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest mb-1 text-gray-500">Grand Total</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-extrabold tracking-tight tabular-nums" style={{ color: T.text }}>$0.00</p>
                <p className="text-sm font-medium text-gray-500">/ incl. Custom</p>
              </div>
            </div>
            <button
              className="h-12 px-8 rounded-xl text-sm font-bold text-white flex items-center gap-2 shrink-0 hover:bg-blue-800 active:scale-[0.98] transition-all shadow-md shadow-blue-900/20"
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
