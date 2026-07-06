import './_group.css';
import './RefinedClarity.css';
import React from 'react';
import {
  LayoutDashboard, ReceiptText, UsersRound, HeartPulse, ClipboardList,
  Search, Bell, ChevronDown, ChevronRight, Moon, PanelLeft, Send, Ticket,
  Wallet, Store, ArrowRight, Scale, FlaskConical, Droplet, TrendingUp, Activity,
  Truck, ShoppingBag, Users, TestTube, LifeBuoy, Globe, BarChart2, Trash2, Plus,
} from 'lucide-react';

// ─── Theme constants (inlined from the app's dashboard-theme.ts, light palette) ──
const T = {
  page: '#F4F4F5', panel: '#FFFFFF', panel2: '#FAFAF9',
  border: '#E4E4E7', borderSoft: '#F4F4F5',
  text: '#18181B', muted: '#71717A', subtle: '#52525B',
  track: '#ECEBEA', chip: '#F4F4F5', sidebar: '#FFFFFF',
};
const ACCENT = '#0176D3';
const HERO_GRAD = 'linear-gradient(135deg,#1B3164 0%,#1B3A7A 45%,#2D6BCC 100%)';
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
      className={`relative w-full flex items-center rounded-lg transition-all text-left nav-btn-hover ${active ? 'sidebar-active-item' : ''}`}
      style={{
        gap: 12, padding: '0 12px', height: 40,
        color: active ? ACCENT : T.subtle,
        fontWeight: active ? 600 : 500, fontSize: 13.5,
      }}
    >
      <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2.5 : 2} style={{ color: active ? ACCENT : T.muted }} />
      <span className="truncate">{label}</span>
    </button>
  );
}

// ─── Product line (dropdown + qty stepper) ──────────────────────────────────
function ProductLine({ showDivider }: { showDivider: boolean }) {
  return (
    <div className="group">
      <div className="flex flex-col gap-2 overflow-hidden transition-all duration-200">
        {/* Searchable product select trigger */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="w-full text-left focus:outline-none flex items-center transition-all duration-200"
            style={{
              minHeight: 48, borderRadius: 10,
              paddingLeft: 16, paddingRight: 40, paddingTop: 12, paddingBottom: 12,
              fontSize: 14, background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.9)', cursor: 'pointer',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
          >
            <span style={{ flex: 1, wordBreak: 'break-word', lineHeight: '1.4' }}>Select a product…</span>
          </button>
          <ChevronDown
            className="absolute right-4 top-[14px] w-5 h-5 pointer-events-none transition-colors"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          />
        </div>

        {/* Quantity + price row */}
        <div className="flex items-center gap-4 mt-1 pl-2">
          <div className="flex flex-col items-start shrink-0">
            <div
              className="flex items-center h-10 rounded-lg overflow-hidden"
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <button type="button" className="qty-btn px-3 h-full text-lg" style={{ color: 'rgba(255,255,255,0.85)' }}>−</button>
              <span className="w-10 text-center text-sm font-semibold" style={{ color: '#ffffff' }}>1</span>
              <button type="button" className="qty-btn px-3 h-full text-lg" style={{ color: 'rgba(255,255,255,0.85)' }}>+</button>
            </div>
            <p className="text-[10px] mt-1.5 leading-none opacity-60 font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>For half kits add .5</p>
          </div>

          <div className="flex-1 flex justify-end items-center pr-2">
            <p className="font-semibold text-[15px] tracking-tight" style={{ color: 'rgba(255,255,255,0.95)' }}>$0.00</p>
          </div>

          <button type="button" className="p-2 rounded-md opacity-40 hover:opacity-100 hover:bg-white/10 transition-all text-red-300 hover:text-red-400">
            <Trash2 className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
      {showDivider && <div className="my-4 mx-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
export function RefinedClarity() {
  const initial = USERNAME.slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen flex refined-clarity" style={{ background: T.page, fontFamily: FONT }}>
      {/* ══ Sidebar (icon rail + labelled panel) ══ */}
      <aside className="hidden lg:flex shrink-0 sticky top-0 h-screen z-30" style={{ width: SIDEBAR_W, boxShadow: '1px 0 10px rgba(0,0,0,0.03)' }}>
        {/* Icon rail */}
        <div
          className="flex flex-col items-center shrink-0 shadow-lg z-10"
          style={{ width: RAIL_W, background: RAIL_NAVY, paddingTop: 18, paddingBottom: 16 }}
        >
          <div
            className="flex items-center justify-center shrink-0"
            style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(180deg, #0176D3 0%, #0162B1 100%)', color: '#fff', fontWeight: 800, fontSize: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
          >
            S&amp;P
          </div>

          <nav className="flex flex-col items-center gap-1.5" style={{ marginTop: 22 }}>
            {[LayoutDashboard, ClipboardList].map((Icon, i) => (
              <button
                key={i}
                className="flex items-center justify-center transition-all hover:bg-white/10"
                style={{ width: 40, height: 40, borderRadius: 8, background: 'transparent', color: 'rgba(255,255,255,0.7)' }}
              >
                <Icon className="w-[19px] h-[19px]" strokeWidth={2} />
              </button>
            ))}
          </nav>

          <nav
            className="flex flex-col items-center gap-1.5"
            style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)' }}
          >
            {HEALTH_APPS.map((Icon, i) => (
              <button
                key={i}
                className="flex items-center justify-center transition-all hover:bg-white/10"
                style={{ width: 40, height: 40, borderRadius: 8, color: 'rgba(255,255,255,0.7)' }}
              >
                <Icon className="w-[19px] h-[19px]" strokeWidth={2} />
              </button>
            ))}
          </nav>

          <div className="flex flex-col items-center gap-1.5" style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {[Ticket, Store, PanelLeft].map((Icon, i) => (
              <button
                key={i}
                className="flex items-center justify-center transition-all hover:bg-white/10"
                style={{ width: 40, height: 40, borderRadius: 8, color: 'rgba(255,255,255,0.7)' }}
              >
                <Icon className="w-[19px] h-[19px]" />
              </button>
            ))}
          </div>
        </div>

        {/* Labelled panel */}
        <div className="flex flex-col flex-1 min-w-0 bg-white" style={{ borderRight: `1px solid ${T.borderSoft}` }}>
          {/* Brand */}
          <div className="flex items-center px-5" style={{ height: 72 }}>
            <span className="font-extrabold tracking-tight truncate" style={{ fontSize: 20, color: T.text }}>Salt &amp; Peps</span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-6">
            {/* Main nav */}
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map(({ id, label, Icon, active }) => (
                <NavButton key={id} label={label} Icon={Icon} active={active} />
              ))}
            </nav>

            {/* Workspaces */}
            <p className="px-3 mt-8 mb-2.5 font-bold uppercase tracking-wider" style={{ fontSize: 10, color: T.muted }}>Workspaces</p>
            <nav className="flex flex-col gap-1">
              {WORKSPACE_ITEMS.map(({ id, label, Icon }) => (
                <NavButton key={id} label={label} Icon={Icon} />
              ))}
            </nav>

            {/* More */}
            <p className="px-3 mt-8 mb-2.5 font-bold uppercase tracking-wider" style={{ fontSize: 10, color: T.muted }}>More</p>
            <nav className="flex flex-col gap-1">
              {MORE_ITEMS.map(({ id, label, Icon }) => (
                <NavButton key={id} label={label} Icon={Icon} />
              ))}
            </nav>

            {/* Orders */}
            <p className="px-3 mt-8 mb-2.5 font-bold uppercase tracking-wider" style={{ fontSize: 10, color: T.muted }}>Orders</p>
            <div className="mb-4">
              <p className="px-3 mb-1.5 font-semibold text-[11px]" style={{ color: T.subtle }}>Group Buys</p>
              <div className="flex flex-col gap-1">
                {GB_ORDERS.map(o => (
                  <button
                    key={o.code}
                    className="w-full flex items-center gap-3 rounded-lg px-3 transition-colors hover:bg-gray-50"
                    style={{ height: 40, color: T.text, fontWeight: 600, fontSize: 13 }}
                  >
                    <span className="flex items-center justify-center shrink-0 rounded-md" style={{ width: 26, height: 26, background: 'rgba(124,58,237,0.1)', color: '#7C3AED' }}>
                      <UsersRound className="w-3.5 h-3.5" />
                    </span>
                    <span className="truncate flex-1 text-left">{o.code}</span>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: o.dot, boxShadow: `0 0 4px ${o.dot}` }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom promo card */}
            <button
              className="w-full text-left mt-6 rounded-xl relative overflow-hidden transition-transform hover:-translate-y-0.5 active:translate-y-0"
              style={{ background: HERO_GRAD, padding: 20, color: '#fff', boxShadow: '0 10px 20px -5px rgba(27, 58, 122, 0.3)' }}
            >
              <div className="absolute" style={{ top: -30, right: -20, width: 120, height: 120, borderRadius: 9999, background: 'rgba(255,255,255,.15)', filter: 'blur(24px)', pointerEvents: 'none' }} />
              <div className="relative">
                <div className="flex items-center justify-center rounded-lg mb-4" style={{ width: 38, height: 38, background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                  <Send className="w-[18px] h-[18px] ml-[-2px]" />
                </div>
                <p className="font-bold leading-tight tracking-tight" style={{ fontSize: 15 }}>Take Salt &amp; Peps Everywhere</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.8)', marginTop: 6, lineHeight: 1.4, fontWeight: 500 }}>Order updates &amp; alerts on Telegram.</p>
                <div className="flex items-center gap-1.5 mt-4 rounded-md font-bold transition-colors hover:bg-gray-50" style={{ fontSize: 12, padding: '8px 12px', background: '#fff', color: '#1B3A7A', width: 'fit-content' }}>
                  Connect Telegram <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </button>
          </div>
        </div>
      </aside>

      {/* ══ Main column ══ */}
      <div className="flex-1 min-w-0 flex flex-col relative">
        {/* Top bar */}
        <header
          className="sticky top-0 z-20 flex items-center gap-4 px-4 md:px-8 bg-white/80 backdrop-blur-md"
          style={{ height: 72, borderBottom: `1px solid ${T.borderSoft}` }}
        >
          <h1 className="font-extrabold tracking-tight shrink-0" style={{ fontSize: 21, color: T.text }}>Order Form</h1>

          <div className="flex-1 flex justify-center min-w-0 sm:px-4">
            <div className="relative hidden sm:block w-full max-w-[500px]">
              <div
                className="flex items-center gap-3 w-full rounded-lg transition-all focus-within:ring-2 focus-within:ring-blue-500/20"
                style={{ height: 44, padding: '0 16px', background: T.page, border: `1px solid ${T.border}` }}
              >
                <Search className="w-4 h-4 shrink-0" style={{ color: T.subtle }} />
                <input
                  readOnly
                  placeholder="Search orders, compounds, group buys, products..."
                  className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-zinc-400"
                  style={{ fontSize: 14, color: T.text, fontWeight: 500 }}
                />
                <span
                  className="hidden md:flex items-center gap-1 rounded bg-white font-semibold shrink-0"
                  style={{ fontSize: 11, padding: '4px 8px', color: T.subtle, border: '1px solid #E4E4E7', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
                >⌘ K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Credits */}
            <button
              className="flex items-center gap-2.5 rounded-lg pl-2 pr-3.5 transition-all hover:bg-blue-50/80"
              style={{ height: 42, background: 'rgba(45,107,204,.06)', border: '1px solid rgba(45,107,204,.15)' }}
            >
              <span className="flex items-center justify-center rounded-md shrink-0 shadow-sm" style={{ width: 28, height: 28, background: '#fff', color: '#2D6BCC', border: '1px solid rgba(45,107,204,.2)' }}>
                <Wallet className="w-4 h-4" />
              </span>
              <span className="flex flex-col items-start leading-none justify-center">
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#2D6BCC' }}>Credits</span>
                <span className="font-extrabold" style={{ fontSize: 14, color: T.text, letterSpacing: '-0.01em', marginTop: 2 }}>${CREDITS.toFixed(2)}</span>
              </span>
            </button>
            {/* Theme toggle */}
            <button
              className="hidden md:flex items-center justify-center rounded-lg transition-all hover:bg-gray-100"
              style={{ width: 42, height: 42, background: T.panel, border: `1px solid ${T.border}`, color: T.subtle, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
            >
              <Moon className="w-4 h-4" />
            </button>
            {/* Notifications */}
            <button
              className="relative flex items-center justify-center rounded-lg transition-all hover:bg-gray-100"
              style={{ width: 42, height: 42, background: T.panel, border: `1px solid ${T.border}`, color: T.subtle, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2.5 right-3 w-2 h-2 rounded-full bg-red-500 border border-white" />
            </button>
            {/* Profile chip */}
            <button
              className="flex items-center gap-2.5 rounded-lg pl-1.5 pr-2.5 transition-all hover:bg-gray-50"
              style={{ height: 46, background: T.panel, border: `1px solid ${T.border}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
            >
              <span className="flex items-center justify-center rounded-md text-white shrink-0 shadow-sm" style={{ width: 34, height: 34, background: 'linear-gradient(180deg, #0176D3 0%, #0162B1 100%)', fontWeight: 700, fontSize: 14 }}>{initial}</span>
              <span className="hidden md:flex flex-col items-start justify-center min-w-0">
                <span className="font-bold truncate leading-tight" style={{ fontSize: 13, maxWidth: 120, color: T.text }}>{USERNAME}</span>
                <span className="truncate font-medium leading-tight mt-0.5" style={{ fontSize: 11, color: T.subtle, maxWidth: 120 }}>@{USERNAME}</span>
              </span>
              <ChevronDown className="w-4 h-4 shrink-0 hidden md:block ml-0.5" style={{ color: T.subtle }} />
            </button>
          </div>
        </header>

        {/* Order form content */}
        <div className="flex-1 flex flex-col relative z-0">
          <main className="flex-1 px-4 py-8 pb-48 lg:pb-32 max-w-2xl mx-auto w-full space-y-8">

            {/* GB title + progress steps + Reshipper */}
            <div className="space-y-6">
              
              {/* Reshipper info card - Elevated */}
              <div className="rounded-2xl p-4 flex items-start gap-4 bg-white card-elevated">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(45,107,204,0.1)' }}>
                  <Globe className="w-5 h-5" style={{ color: 'var(--t-blue)' }} />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="text-sm font-bold tracking-tight" style={{ color: 'var(--t-text)' }}>
                      Local Reshipper — {RESHIPPER.countryName}
                    </p>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700">Active</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-2">
                    <div className="flex items-center gap-2 text-[13px]">
                      <span className="font-semibold text-gray-500 w-16">Contact</span>
                      <span className="font-medium text-gray-900">@{RESHIPPER.telegramUsername}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px]">
                      <span className="font-semibold text-gray-500 w-16">Pay To</span>
                      <span className="font-medium text-gray-900">{RESHIPPER.paymentTarget}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px] sm:col-span-2">
                      <span className="font-semibold text-gray-500 w-16">Methods</span>
                      <span className="font-medium text-gray-900">{RESHIPPER.methods}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Title & Stepper Container */}
              <div className="flex flex-col items-center space-y-6 pt-4 pb-2">
                <div className="text-center space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--t-blue-deep)' }}>Group Buy</p>
                  <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--t-text)' }}>{GB_NAME}</h1>
                </div>

                {/* 2-step progress indicator */}
                <div className="flex items-center w-full max-w-sm mx-auto px-4">
                  {/* Step 1 — active */}
                  <div className="flex items-center gap-2.5 px-4 py-2 rounded-full shadow-sm" style={{ background: 'var(--t-blue-deep)', border: '1px solid var(--t-blue-deep)' }}>
                    <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-[10px] font-bold" style={{ color: 'var(--t-blue-deep)' }}>1</span>
                    </span>
                    <span className="text-[13px] font-bold text-white whitespace-nowrap tracking-wide">Choose Products</span>
                  </div>
                  {/* Arrow */}
                  <div className="flex-1 flex items-center px-2">
                    <div className="flex-1 h-[2px] rounded-full" style={{ background: 'rgba(27,58,122,0.15)' }} />
                    <ChevronRight className="w-4 h-4 shrink-0 -ml-1" style={{ color: 'rgba(27,58,122,0.3)' }} />
                  </div>
                  {/* Step 2 — inactive */}
                  <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white" style={{ border: '1px solid rgba(27,58,122,0.15)' }}>
                    <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(27,58,122,0.08)' }}>
                      <span className="text-[10px] font-bold" style={{ color: 'var(--t-blue-deep)', opacity: 0.7 }}>2</span>
                    </span>
                    <span className="text-[13px] font-semibold whitespace-nowrap" style={{ color: 'rgba(27,58,122,0.5)' }}>Review Order</span>
                  </div>
                </div>
              </div>
            </div>

            {/* YOUR PRODUCTS panel - Elevated */}
            <section className="relative z-10">
              <div className="rounded-3xl p-6 relative overflow-hidden product-panel-elevated" style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)' }}>
                {/* Subtle gradient glow in background */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none mix-blend-screen" />
                
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                      <ShoppingBag className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className="text-sm font-bold uppercase tracking-widest text-blue-100">Your Products</p>
                  </div>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:bg-white/10 border border-white/10"
                    style={{ color: 'rgba(255,255,255,0.7)' }}
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    Stock levels
                  </button>
                </div>

                <div className="space-y-2 relative z-10">
                  {LINE_ITEMS.map((n, i) => (
                    <ProductLine key={n} showDivider={i < LINE_ITEMS.length - 1} />
                  ))}
                </div>

                <button
                  type="button"
                  className="w-full h-12 mt-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:bg-white/5 border border-dashed border-white/30 hover:border-white/50 relative z-10"
                  style={{ color: 'rgba(255,255,255,0.9)' }}
                >
                  <Plus className="w-4 h-4" /> Add another product
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* ══ Fixed GRAND TOTAL footer ══ */}
      <div
        className="fixed bottom-0 right-0 z-40 bg-white/90 backdrop-blur-xl"
        style={{ left: SIDEBAR_W, borderTop: '1px solid rgba(0,0,0,0.06)', boxShadow: 'var(--shadow-sticky)' }}
      >
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: T.subtle }}>Grand Total</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: T.text }}>$0.00</p>
                <p className="text-[13px] font-medium" style={{ color: T.subtle }}>/ incl. Custom</p>
              </div>
            </div>
            <button
              className="cta-btn h-14 px-10 rounded-xl text-[15px] font-bold text-white flex items-center justify-center gap-2.5 shrink-0 w-full sm:w-auto"
              style={{ background: 'var(--t-blue-deep)' }}
            >
              Review <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
