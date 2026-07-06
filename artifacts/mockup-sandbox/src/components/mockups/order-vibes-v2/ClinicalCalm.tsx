import './_group.css';
import './ClinicalCalm.css';
import React from 'react';
import {
  LayoutDashboard, ReceiptText, UsersRound, HeartPulse, ClipboardList,
  Search, Bell, ChevronDown, ChevronRight, Moon, PanelLeft, Send, Ticket,
  Wallet, Store, ArrowRight, Scale, FlaskConical, Droplet, TrendingUp, Activity,
  Truck, ShoppingBag, Users, TestTube, LifeBuoy, Globe, BarChart2, Trash2, Plus,
} from 'lucide-react';

// ─── Theme constants for Clinical Calm ──
const T = {
  page: '#F9FAFB', panel: '#FFFFFF', panel2: '#F9FAFB',
  border: '#E5E7EB', borderSoft: '#F3F4F6',
  text: '#111827', muted: '#4B5563', subtle: '#9CA3AF',
  track: '#F3F4F6', chip: '#F9FAFB', sidebar: '#FFFFFF',
};
const ACCENT = '#4B637B'; // muted steel blue
const HERO_GRAD = '#F0F4F8'; // pale gray-blue
const RAIL_NAVY = '#FFFFFF'; // clean white rail
const FONT = "'Inter', sans-serif";
const STAR_AMBER = '#D1D5DB'; // monochrome dot
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
      className="relative w-full flex items-center rounded-md transition-all text-left hover:bg-gray-50"
      style={{
        gap: 12, padding: '0 12px', height: 38,
        background: active ? '#F0F4F8' : 'transparent',
        color: active ? ACCENT : T.muted,
        fontWeight: active ? 500 : 400, fontSize: 13.5,
      }}
    >
      <Icon className="w-[16px] h-[16px] shrink-0" strokeWidth={1.5} />
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
            className="w-full text-left focus:outline-none flex items-start hover:bg-gray-50 transition-colors"
            style={{
              minHeight: 44, borderRadius: 6,
              paddingLeft: 14, paddingRight: 40, paddingTop: 12, paddingBottom: 12,
              fontSize: 14, background: T.panel,
              border: `1px solid ${T.border}`,
              color: T.text, cursor: 'pointer',
              fontWeight: 400
            }}
          >
            <span style={{ flex: 1, wordBreak: 'break-word', lineHeight: '1.4' }}>Select a product…</span>
          </button>
          <ChevronDown
            className="absolute right-3 top-3 w-4 h-4 pointer-events-none"
            style={{ color: T.subtle, strokeWidth: 1.5 }}
          />
        </div>

        {/* Quantity + price row */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center shrink-0">
            <div
              className="flex items-center h-10 rounded-md overflow-hidden"
              style={{ background: T.panel, border: `1px solid ${T.border}` }}
            >
              <button type="button" className="px-3 h-full text-lg hover:bg-gray-50 transition-colors" style={{ color: T.muted }}>−</button>
              <span className="w-10 text-center text-sm font-medium" style={{ color: T.text }}>1</span>
              <button type="button" className="px-3 h-full text-lg hover:bg-gray-50 transition-colors" style={{ color: T.muted }}>+</button>
            </div>
            <p className="text-[10px] mt-1.5 leading-none uppercase tracking-wider" style={{ color: T.subtle, fontWeight: 500 }}>For half kits add .5</p>
          </div>

          <div className="flex-1 text-right">
            <p className="font-medium text-[15px]" style={{ color: T.text }}>$0.00</p>
          </div>

          <button type="button" className="p-2 rounded-md hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200" style={{ color: T.muted }}>
            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
      {showDivider && <div className="my-4" style={{ borderTop: `1px solid ${T.borderSoft}` }} />}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
export function ClinicalCalm() {
  const initial = USERNAME.slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen flex clinical-theme" style={{ background: T.page, fontFamily: FONT }}>
      {/* ══ Sidebar (icon rail + labelled panel) ══ */}
      <aside className="hidden lg:flex shrink-0 sticky top-0 h-screen border-r" style={{ width: SIDEBAR_W, borderColor: T.border }}>
        {/* Icon rail */}
        <div
          className="flex flex-col items-center shrink-0 border-r"
          style={{ width: RAIL_W, background: RAIL_NAVY, borderColor: T.border, paddingTop: 18, paddingBottom: 16 }}
        >
          <div
            className="flex items-center justify-center shrink-0"
            style={{ width: 34, height: 34, borderRadius: 6, border: `1px solid ${T.border}`, background: T.panel, color: T.text, fontWeight: 500, fontSize: 11, letterSpacing: '0.04em' }}
          >
            S&amp;P
          </div>

          <nav className="flex flex-col items-center gap-2" style={{ marginTop: 24 }}>
            {[LayoutDashboard, ClipboardList].map((Icon, i) => (
              <button
                key={i}
                className="flex items-center justify-center transition-colors hover:bg-gray-50"
                style={{ width: 36, height: 36, borderRadius: 6, color: T.muted }}
              >
                <Icon className="w-[17px] h-[17px]" strokeWidth={1.5} />
              </button>
            ))}
          </nav>

          <nav
            className="flex flex-col items-center gap-2"
            style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.borderSoft}` }}
          >
            {HEALTH_APPS.map((Icon, i) => (
              <button
                key={i}
                className="flex items-center justify-center transition-colors hover:bg-gray-50"
                style={{ width: 36, height: 36, borderRadius: 6, color: T.muted }}
              >
                <Icon className="w-[17px] h-[17px]" strokeWidth={1.5} />
              </button>
            ))}
          </nav>

          <div className="flex flex-col items-center gap-2" style={{ marginTop: 'auto', paddingTop: 12, borderTop: `1px solid ${T.borderSoft}` }}>
            {[Ticket, Store, PanelLeft].map((Icon, i) => (
              <button
                key={i}
                className="flex items-center justify-center transition-colors hover:bg-gray-50"
                style={{ width: 36, height: 36, borderRadius: 6, color: T.muted }}
              >
                <Icon className="w-[17px] h-[17px]" strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </div>

        {/* Labelled panel */}
        <div className="flex flex-col flex-1 min-w-0" style={{ background: T.sidebar }}>
          {/* Brand */}
          <div className="flex items-center px-4" style={{ height: 72 }}>
            <span className="font-medium tracking-tight truncate" style={{ fontSize: 18, color: T.text, letterSpacing: '-0.01em' }}>Salt &amp; Peps</span>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-4">
            {/* Main nav */}
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map(({ id, label, Icon, active }) => (
                <NavButton key={id} label={label} Icon={Icon} active={active} />
              ))}
            </nav>

            {/* Workspaces */}
            <p className="px-3 mt-8 mb-3 font-semibold uppercase tracking-wider" style={{ fontSize: 10, color: T.subtle }}>Workspaces</p>
            <nav className="flex flex-col gap-1">
              {WORKSPACE_ITEMS.map(({ id, label, Icon }) => (
                <NavButton key={id} label={label} Icon={Icon} />
              ))}
            </nav>

            {/* More */}
            <p className="px-3 mt-8 mb-3 font-semibold uppercase tracking-wider" style={{ fontSize: 10, color: T.subtle }}>More</p>
            <nav className="flex flex-col gap-1">
              {MORE_ITEMS.map(({ id, label, Icon }) => (
                <NavButton key={id} label={label} Icon={Icon} />
              ))}
            </nav>

            {/* Orders */}
            <p className="px-3 mt-8 mb-3 font-semibold uppercase tracking-wider" style={{ fontSize: 10, color: T.subtle }}>Orders</p>
            <div className="mb-2">
              <p className="px-3 mb-2 font-medium" style={{ fontSize: 11, color: T.subtle }}>Group Buys</p>
              <div className="flex flex-col gap-1">
                {GB_ORDERS.map(o => (
                  <button
                    key={o.code}
                    className="w-full flex items-center gap-3 rounded-md px-3 text-left transition-colors hover:bg-gray-50"
                    style={{ height: 38, color: T.text, fontWeight: 400, fontSize: 13.5 }}
                  >
                    <span className="flex items-center justify-center shrink-0 rounded-md border" style={{ width: 24, height: 24, background: T.panel, borderColor: T.border, color: T.muted }}>
                      <UsersRound className="w-3 h-3" strokeWidth={1.5} />
                    </span>
                    <span className="truncate flex-1">{o.code}</span>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: o.dot }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom promo card */}
            <button
              className="w-full text-left mt-8 rounded-lg relative overflow-hidden transition-colors hover:bg-[#E2E8F0]"
              style={{ background: HERO_GRAD, border: `1px solid ${T.border}`, padding: 16, color: T.text }}
            >
              <div className="relative">
                <div className="flex items-center justify-center rounded-md mb-4 border bg-white" style={{ width: 32, height: 32, borderColor: T.border, color: ACCENT }}>
                  <Send className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <p className="font-medium leading-tight" style={{ fontSize: 13, color: T.text }}>Take Salt &amp; Peps Everywhere</p>
                <p style={{ fontSize: 11.5, color: T.muted, marginTop: 6, lineHeight: 1.4 }}>Order updates &amp; alerts on Telegram.</p>
                <span className="inline-flex items-center gap-1.5 mt-4 rounded-md font-medium transition-colors" style={{ fontSize: 11.5, padding: '6px 10px', border: `1px solid ${T.border}`, background: T.panel, color: T.text }}>
                  Connect Telegram <ChevronRight className="w-3 h-3" strokeWidth={1.5} />
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
          className="sticky top-0 z-10 flex items-center gap-3 px-4 md:px-8"
          style={{ height: 72, background: T.panel, borderBottom: `1px solid ${T.border}` }}
        >
          <h1 className="font-medium tracking-tight shrink-0" style={{ fontSize: 18, color: T.text, letterSpacing: '-0.01em' }}>Order Form</h1>

          <div className="flex-1 flex justify-center min-w-0 sm:px-4">
            <div className="relative hidden sm:block w-full max-w-[460px]">
              <div
                className="flex items-center gap-2.5 w-full rounded-md transition-colors focus-within:border-gray-300"
                style={{ height: 38, padding: '0 12px', background: T.page, border: `1px solid ${T.border}` }}
              >
                <Search className="w-4 h-4 shrink-0" style={{ color: T.subtle }} strokeWidth={1.5} />
                <input
                  readOnly
                  placeholder="Search orders, compounds, group buys, products..."
                  className="flex-1 min-w-0 bg-transparent outline-none"
                  style={{ fontSize: 13, color: T.text }}
                />
                <span
                  className="hidden md:flex items-center gap-1 rounded font-medium shrink-0 border"
                  style={{ fontSize: 10, padding: '2px 6px', background: T.panel, borderColor: T.border, color: T.subtle }}
                >⌘ K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Credits */}
            <button
              className="flex items-center gap-2.5 rounded-md pl-1.5 pr-3 transition-colors hover:bg-gray-50 border"
              style={{ height: 38, background: T.panel, borderColor: T.border }}
            >
              <span className="flex items-center justify-center rounded bg-gray-50 shrink-0" style={{ width: 26, height: 26, color: ACCENT }}>
                <Wallet className="w-4 h-4" strokeWidth={1.5} />
              </span>
              <span className="flex flex-col items-start justify-center leading-none">
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: T.subtle }}>Credits</span>
                <span className="font-medium" style={{ fontSize: 12.5, color: T.text, letterSpacing: '-0.01em', marginTop: 3 }}>${CREDITS.toFixed(2)}</span>
              </span>
            </button>
            {/* Theme toggle */}
            <button
              className="hidden md:flex items-center justify-center rounded-md transition-colors hover:bg-gray-50 border"
              style={{ width: 38, height: 38, background: T.panel, borderColor: T.border, color: T.muted }}
            >
              <Moon className="w-[17px] h-[17px]" strokeWidth={1.5} />
            </button>
            {/* Notifications */}
            <button
              className="relative flex items-center justify-center rounded-md transition-colors hover:bg-gray-50 border"
              style={{ width: 38, height: 38, background: T.panel, borderColor: T.border, color: T.muted }}
            >
              <Bell className="w-[17px] h-[17px]" strokeWidth={1.5} />
            </button>
            {/* Profile chip */}
            <button
              className="flex items-center gap-2.5 rounded-md pl-1.5 pr-2.5 border hover:bg-gray-50 transition-colors"
              style={{ height: 38, background: T.panel, borderColor: T.border }}
            >
              <span className="flex items-center justify-center rounded text-white shrink-0" style={{ width: 26, height: 26, background: ACCENT, fontWeight: 500, fontSize: 12 }}>{initial}</span>
              <span className="hidden md:flex flex-col items-start leading-tight min-w-0 justify-center">
                <span className="font-medium truncate" style={{ fontSize: 12, maxWidth: 120, color: T.text }}>{USERNAME}</span>
                <span className="truncate" style={{ fontSize: 10, maxWidth: 120, color: T.subtle }}>@{USERNAME}</span>
              </span>
              <ChevronDown className="w-3.5 h-3.5 shrink-0 hidden md:block" style={{ color: T.subtle }} strokeWidth={1.5} />
            </button>
          </div>
        </header>

        {/* Order form content */}
        <div className="flex-1 flex flex-col">
          <main className="flex-1 px-4 py-8 pb-48 lg:pb-32 max-w-2xl mx-auto w-full space-y-8">

            {/* Reshipper card + GB title + progress steps */}
            <div className="space-y-8">
              {/* Reshipper info card */}
              <div className="rounded-lg p-5 flex items-start gap-4 border" style={{ background: T.panel, borderColor: T.border }}>
                <div className="w-8 h-8 rounded-md bg-gray-50 border flex items-center justify-center shrink-0 mt-0.5" style={{ borderColor: T.borderSoft }}>
                  <Globe className="w-4 h-4" style={{ color: ACCENT }} strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[13px] font-medium" style={{ color: T.text }}>
                    Local Reshipper — {RESHIPPER.countryName}
                  </p>
                  <p className="text-xs" style={{ color: T.muted }}>@{RESHIPPER.telegramUsername}</p>
                  <div className="flex items-center gap-4 pt-2 mt-2 border-t" style={{ borderColor: T.borderSoft }}>
                    <p className="text-[11px]" style={{ color: T.subtle }}><span className="font-medium text-gray-500">Pay to:</span> {RESHIPPER.paymentTarget}</p>
                    <p className="text-[11px]" style={{ color: T.subtle }}><span className="font-medium text-gray-500">Methods:</span> {RESHIPPER.methods}</p>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-2 text-center" style={{ color: T.subtle }}>Group Buy</p>
                <h1 className="text-2xl font-medium text-center tracking-tight" style={{ color: T.text }}>{GB_NAME}</h1>
              </div>

              {/* 2-step progress indicator */}
              <div className="flex items-center justify-center gap-3">
                {/* Step 1 — active */}
                <div className="flex items-center gap-2.5 px-4 py-2 rounded-md border" style={{ background: T.panel, borderColor: ACCENT }}>
                  <span className="w-5 h-5 rounded bg-gray-50 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-medium" style={{ color: ACCENT }}>1</span>
                  </span>
                  <span className="text-[13px] font-medium whitespace-nowrap" style={{ color: ACCENT }}>Choose Products</span>
                </div>
                {/* Arrow */}
                <div className="flex items-center w-12 justify-center">
                  <div className="flex-1 h-px" style={{ background: T.border }} />
                  <svg className="w-3.5 h-3.5 mx-2 shrink-0" fill="none" viewBox="0 0 12 12" style={{ color: T.subtle }}>
                    <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex-1 h-px" style={{ background: T.border }} />
                </div>
                {/* Step 2 — inactive */}
                <div className="flex items-center gap-2.5 px-4 py-2 rounded-md border" style={{ background: T.page, borderColor: T.borderSoft }}>
                  <span className="w-5 h-5 rounded flex items-center justify-center shrink-0 bg-white border" style={{ borderColor: T.borderSoft }}>
                    <span className="text-[10px] font-medium" style={{ color: T.subtle }}>2</span>
                  </span>
                  <span className="text-[13px] font-medium whitespace-nowrap" style={{ color: T.subtle }}>Review Order</span>
                </div>
              </div>
            </div>

            {/* YOUR PRODUCTS panel */}
            <section className="pt-2">
              <div className="rounded-xl p-6 relative overflow-hidden border shadow-sm" style={{ background: T.panel, borderColor: T.border }}>
                <div className="flex items-center justify-between mb-6 pb-4 border-b" style={{ borderColor: T.borderSoft }}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: T.text }}>Your Products</p>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-[11.5px] font-medium px-3 py-1.5 rounded-md transition-colors hover:bg-gray-50 border"
                    style={{ borderColor: T.border, color: T.muted }}
                  >
                    <BarChart2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Stock levels
                  </button>
                </div>

                <div className="space-y-4">
                  {LINE_ITEMS.map((n, i) => (
                    <ProductLine key={n} showDivider={i < LINE_ITEMS.length - 1} />
                  ))}
                </div>

                <button
                  type="button"
                  className="w-full h-11 mt-6 rounded-md text-[13px] font-medium flex items-center justify-center gap-2 transition-all hover:bg-gray-50 border border-dashed"
                  style={{ borderColor: '#D1D5DB', color: T.muted, background: T.page }}
                >
                  <Plus className="w-4 h-4" strokeWidth={1.5} /> Add another product
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* ══ Fixed GRAND TOTAL footer ══ */}
      <div
        className="fixed bottom-0 right-0 z-20 backdrop-blur-xl border-t"
        style={{ left: SIDEBAR_W, background: 'rgba(255,255,255,0.9)', borderColor: T.border }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: T.subtle }}>Grand Total</p>
                <p className="text-[10px]" style={{ color: T.subtle }}>(incl. Custom)</p>
              </div>
              <p className="text-2xl font-medium tracking-tight truncate mt-1" style={{ color: T.text }}>$0.00</p>
            </div>
            <button
              className="h-11 px-8 rounded-md text-[13px] font-medium text-white flex items-center gap-2 shrink-0 transition-opacity hover:opacity-90 active:scale-[0.98]"
              style={{ background: T.text }}
            >
              Review <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
