import './_group.css';
import './WarmApothecary.css';
import React from 'react';
import {
  LayoutDashboard, ReceiptText, UsersRound, HeartPulse, ClipboardList,
  Search, Bell, ChevronDown, ChevronRight, Moon, PanelLeft, Send, Ticket,
  Wallet, Store, ArrowRight, Scale, FlaskConical, Droplet, TrendingUp, Activity,
  Truck, ShoppingBag, Users, TestTube, LifeBuoy, Globe, BarChart2, Trash2, Plus,
} from 'lucide-react';

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
  { code: '6644', dot: 'var(--wa-accent)' },
  { code: '9955', dot: 'var(--wa-accent)' },
];

// ─── Sidebar nav button ─────────────────────────────────────────────────────
function NavButton({ label, Icon, active }: { label: string; Icon: React.ElementType; active?: boolean }) {
  return (
    <button
      className="relative w-full flex items-center rounded-xl transition-all text-left"
      style={{
        gap: 11, padding: '0 12px', height: 40,
        background: active ? 'var(--wa-accent-light)' : 'transparent',
        color: active ? 'var(--wa-accent)' : 'var(--wa-muted)',
        fontWeight: active ? 600 : 500, fontSize: 13.5,
      }}
    >
      {active && <span className="absolute rounded-full" style={{ left: 0, top: 8, bottom: 8, width: 3, background: 'var(--wa-accent)' }} />}
      <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.8} />
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
            className="w-full text-left focus:outline-none flex items-start transition-colors hover:brightness-110"
            style={{
              minHeight: 48, borderRadius: 12,
              paddingLeft: 16, paddingRight: 40, paddingTop: 13, paddingBottom: 13,
              fontSize: 14, background: 'var(--wa-ink-surface)',
              border: '1px solid var(--wa-ink-border)',
              color: 'var(--wa-ink-text)', cursor: 'pointer',
            }}
          >
            <span style={{ flex: 1, wordBreak: 'break-word', lineHeight: '1.4' }}>Select a product…</span>
          </button>
          <ChevronDown
            className="absolute right-3 top-3.5 w-5 h-5 pointer-events-none"
            style={{ color: 'var(--wa-accent)' }}
          />
        </div>

        {/* Quantity + price row */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center shrink-0">
            <div
              className="flex items-center h-11 rounded-xl overflow-hidden"
              style={{ background: 'var(--wa-ink-surface)', border: '1px solid var(--wa-ink-border)' }}
            >
              <button type="button" className="px-3.5 h-full text-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors" style={{ color: 'var(--wa-ink-muted)' }}>−</button>
              <span className="w-10 text-center text-sm font-semibold" style={{ color: 'var(--wa-ink-text)' }}>1</span>
              <button type="button" className="px-3.5 h-full text-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors" style={{ color: 'var(--wa-ink-muted)' }}>+</button>
            </div>
            <p className="text-xs mt-1.5 leading-none" style={{ color: 'var(--wa-ink-muted)' }}>For half kits add .5</p>
          </div>

          <div className="flex-1 text-right">
            <p className="font-semibold text-base" style={{ color: 'var(--wa-ink-text)' }}>$0.00</p>
          </div>

          <button type="button" className="p-2 rounded-lg transition-colors hover:bg-[rgba(255,255,255,0.05)]" style={{ color: 'var(--wa-ink-muted)' }}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {showDivider && <div className="my-3.5" style={{ borderTop: '1px solid var(--wa-ink-border)' }} />}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
export function WarmApothecary() {
  const initial = USERNAME.slice(0, 1).toUpperCase();

  return (
    <div className="warm-apothecary min-h-screen flex" style={{ background: 'var(--wa-bg)', fontFamily: 'var(--font-wa-sans)', color: 'var(--wa-text)' }}>
      {/* ══ Sidebar (icon rail + labelled panel) ══ */}
      <aside className="hidden lg:flex shrink-0 sticky top-0 h-screen" style={{ width: SIDEBAR_W }}>
        {/* Icon rail */}
        <div
          className="flex flex-col items-center shrink-0"
          style={{ width: RAIL_W, background: 'var(--wa-ink)', paddingTop: 18, paddingBottom: 16, borderRight: '1px solid var(--wa-ink-border)' }}
        >
          <div
            className="flex items-center justify-center shrink-0"
            style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--wa-accent)', color: '#fff', fontFamily: 'var(--font-wa-serif)', fontStyle: 'italic', fontWeight: 500, fontSize: 14 }}
          >
            S&amp;P
          </div>

          <nav className="flex flex-col items-center gap-1.5" style={{ marginTop: 22 }}>
            {[LayoutDashboard, ClipboardList].map((Icon, i) => (
              <button
                key={i}
                className="flex items-center justify-center transition-colors hover:bg-[rgba(255,255,255,0.05)]"
                style={{ width: 40, height: 40, borderRadius: 8, background: 'transparent', color: 'var(--wa-ink-muted)' }}
              >
                <Icon className="w-[19px] h-[19px]" strokeWidth={1.8} />
              </button>
            ))}
          </nav>

          <nav
            className="flex flex-col items-center gap-1.5"
            style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--wa-ink-border)' }}
          >
            {HEALTH_APPS.map((Icon, i) => (
              <button
                key={i}
                className="flex items-center justify-center transition-colors hover:bg-[rgba(255,255,255,0.05)]"
                style={{ width: 40, height: 40, borderRadius: 8, color: 'var(--wa-ink-muted)' }}
              >
                <Icon className="w-[19px] h-[19px]" strokeWidth={1.8} />
              </button>
            ))}
          </nav>

          <div className="flex flex-col items-center gap-1.5" style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--wa-ink-border)' }}>
            {[Ticket, Store, PanelLeft].map((Icon, i) => (
              <button
                key={i}
                className="flex items-center justify-center transition-colors hover:bg-[rgba(255,255,255,0.05)]"
                style={{ width: 40, height: 40, borderRadius: 8, color: 'var(--wa-ink-muted)' }}
              >
                <Icon className="w-[19px] h-[19px]" strokeWidth={1.8} />
              </button>
            ))}
          </div>
        </div>

        {/* Labelled panel */}
        <div className="flex flex-col flex-1 min-w-0" style={{ background: 'var(--wa-surface)', borderRight: `1px solid var(--wa-border)` }}>
          {/* Brand */}
          <div className="flex items-center px-4" style={{ height: 72 }}>
            <span className="tracking-tight truncate" style={{ fontSize: 22, fontFamily: 'var(--font-wa-serif)', fontWeight: 500, color: 'var(--wa-text)' }}>Salt &amp; Peps</span>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-4">
            {/* Main nav */}
            <nav className="flex flex-col gap-0.5">
              {NAV_ITEMS.map(({ id, label, Icon, active }) => (
                <NavButton key={id} label={label} Icon={Icon} active={active} />
              ))}
            </nav>

            {/* Workspaces */}
            <p className="px-3 mt-6 mb-2 font-medium uppercase tracking-wider" style={{ fontSize: 10, color: 'var(--wa-subtle)' }}>Workspaces</p>
            <nav className="flex flex-col gap-0.5">
              {WORKSPACE_ITEMS.map(({ id, label, Icon }) => (
                <NavButton key={id} label={label} Icon={Icon} />
              ))}
            </nav>

            {/* More */}
            <p className="px-3 mt-6 mb-2 font-medium uppercase tracking-wider" style={{ fontSize: 10, color: 'var(--wa-subtle)' }}>More</p>
            <nav className="flex flex-col gap-0.5">
              {MORE_ITEMS.map(({ id, label, Icon }) => (
                <NavButton key={id} label={label} Icon={Icon} />
              ))}
            </nav>

            {/* Orders */}
            <p className="px-3 mt-6 mb-2 font-medium uppercase tracking-wider" style={{ fontSize: 10, color: 'var(--wa-subtle)' }}>Orders</p>
            <div className="mb-2">
              <p className="px-3 mb-1 font-semibold uppercase tracking-widest" style={{ fontSize: 10, color: 'var(--wa-muted)' }}>Group Buys</p>
              <div className="flex flex-col gap-0.5">
                {GB_ORDERS.map(o => (
                  <button
                    key={o.code}
                    className="w-full flex items-center gap-3 rounded-xl px-3 text-left hover:bg-[var(--wa-surface-alt)] transition-colors"
                    style={{ height: 40, color: 'var(--wa-text)', fontWeight: 500, fontSize: 13 }}
                  >
                    <span className="flex items-center justify-center shrink-0 rounded-lg" style={{ width: 28, height: 28, background: 'var(--wa-accent-light)', color: 'var(--wa-accent)' }}>
                      <UsersRound className="w-[15px] h-[15px]" strokeWidth={1.8} />
                    </span>
                    <span className="truncate flex-1">{o.code}</span>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: o.dot }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom promo card */}
            <button
              className="w-full text-left mt-6 rounded-2xl relative overflow-hidden transition-transform hover:scale-[0.98]"
              style={{ background: 'var(--wa-ink-surface)', padding: 18, color: 'var(--wa-ink-text)', border: '1px solid var(--wa-ink-border)' }}
            >
              <div className="relative">
                <div className="flex items-center justify-center rounded-xl mb-3" style={{ width: 36, height: 36, background: 'var(--wa-ink)', border: '1px solid var(--wa-ink-border)', color: 'var(--wa-accent)' }}>
                  <Send className="w-[18px] h-[18px]" strokeWidth={1.8} />
                </div>
                <p className="font-semibold leading-tight" style={{ fontSize: 14, fontFamily: 'var(--font-wa-serif)' }}>Take Salt &amp; Peps Everywhere</p>
                <p style={{ fontSize: 12, color: 'var(--wa-ink-muted)', marginTop: 6, lineHeight: 1.4 }}>Order updates &amp; alerts on Telegram.</p>
                <span className="inline-flex items-center gap-1.5 mt-4 rounded-xl font-medium" style={{ fontSize: 12, padding: '8px 14px', background: 'var(--wa-surface)', color: 'var(--wa-text)' }}>
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
          style={{ height: 72, background: 'var(--wa-surface)', borderBottom: `1px solid var(--wa-border)` }}
        >
          <h1 className="tracking-tight shrink-0" style={{ fontSize: 24, fontFamily: 'var(--font-wa-serif)', fontWeight: 500, color: 'var(--wa-text)' }}>Order Form</h1>

          <div className="flex-1 flex justify-center min-w-0 sm:px-2">
            <div className="relative hidden sm:block w-full max-w-[460px]">
              <div
                className="flex items-center gap-2.5 w-full rounded-xl transition-colors focus-within:border-[var(--wa-subtle)]"
                style={{ height: 42, padding: '0 14px', background: 'var(--wa-surface-alt)', border: `1px solid transparent` }}
              >
                <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--wa-subtle)' }} />
                <input
                  readOnly
                  placeholder="Search orders, compounds, group buys, products..."
                  className="flex-1 min-w-0 bg-transparent outline-none"
                  style={{ fontSize: 13.5, color: 'var(--wa-text)' }}
                />
                <span
                  className="hidden md:flex items-center gap-1 rounded-md font-medium shrink-0"
                  style={{ fontSize: 11, padding: '3px 7px', background: 'var(--wa-border-soft)', color: 'var(--wa-muted)' }}
                >⌘ K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Credits */}
            <button
              className="flex items-center gap-2.5 rounded-xl pl-2 pr-3.5 transition-colors hover:bg-[var(--wa-surface-alt)]"
              style={{ height: 40, border: '1px solid var(--wa-border)' }}
            >
              <span className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 26, height: 26, background: 'var(--wa-accent-light)', color: 'var(--wa-accent)' }}>
                <Wallet className="w-[14px] h-[14px]" strokeWidth={2} />
              </span>
              <span className="flex flex-col items-start leading-none">
                <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--wa-muted)' }}>Credits</span>
                <span className="font-semibold" style={{ fontSize: 13, color: 'var(--wa-text)', letterSpacing: '-0.01em', marginTop: 2 }}>${CREDITS.toFixed(2)}</span>
              </span>
            </button>
            {/* Theme toggle */}
            <button
              className="hidden md:flex items-center justify-center rounded-xl transition-colors hover:bg-[var(--wa-surface-alt)]"
              style={{ width: 40, height: 40, background: 'var(--wa-surface)', border: `1px solid var(--wa-border)`, color: 'var(--wa-muted)' }}
            >
              <Moon className="w-[18px] h-[18px]" strokeWidth={1.8} />
            </button>
            {/* Notifications */}
            <button
              className="relative flex items-center justify-center rounded-xl transition-colors hover:bg-[var(--wa-surface-alt)]"
              style={{ width: 40, height: 40, background: 'var(--wa-surface)', border: `1px solid var(--wa-border)`, color: 'var(--wa-muted)' }}
            >
              <Bell className="w-[18px] h-[18px]" strokeWidth={1.8} />
            </button>
            {/* Profile chip */}
            <button
              className="flex items-center gap-2.5 rounded-xl pl-1 pr-2 hover:bg-[var(--wa-surface-alt)] transition-colors"
              style={{ height: 44, background: 'var(--wa-surface)', border: `1px solid transparent` }}
            >
              <span className="flex items-center justify-center rounded-full text-white shrink-0" style={{ width: 34, height: 34, background: 'var(--wa-accent)', fontWeight: 500, fontSize: 14, fontFamily: 'var(--font-wa-serif)' }}>{initial}</span>
              <span className="hidden md:flex flex-col items-start leading-tight min-w-0">
                <span className="font-medium truncate" style={{ fontSize: 13, maxWidth: 120, color: 'var(--wa-text)' }}>{USERNAME}</span>
                <span className="truncate" style={{ fontSize: 11.5, color: 'var(--wa-subtle)', maxWidth: 120 }}>@{USERNAME}</span>
              </span>
              <ChevronDown className="w-4 h-4 shrink-0 hidden md:block" style={{ color: 'var(--wa-subtle)' }} />
            </button>
          </div>
        </header>

        {/* Order form content */}
        <div className="flex-1 flex flex-col">
          <main className="flex-1 px-4 py-8 pb-48 lg:pb-32 max-w-2xl mx-auto w-full space-y-6">

            {/* GB title + progress steps */}
            <div className="space-y-6">
              {/* Reshipper info card */}
              <div className="rounded-2xl px-5 py-4 flex items-start gap-4" style={{ background: 'var(--wa-surface)', border: '1px solid var(--wa-border)', boxShadow: 'var(--wa-shadow-sm)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'var(--wa-accent-light)', color: 'var(--wa-accent)' }}>
                  <Globe className="w-[18px] h-[18px]" strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium" style={{ color: 'var(--wa-text)' }}>
                    Local Reshipper — {RESHIPPER.countryName}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--wa-muted)' }}>@{RESHIPPER.telegramUsername}</p>
                  <div className="flex gap-4 mt-2 pt-2" style={{ borderTop: '1px solid var(--wa-border-soft)' }}>
                    <p className="text-[11px]" style={{ color: 'var(--wa-subtle)' }}>Pay to: <span className="font-medium text-[var(--wa-muted)]">{RESHIPPER.paymentTarget}</span></p>
                    <p className="text-[11px]" style={{ color: 'var(--wa-subtle)' }}>Methods: <span className="font-medium text-[var(--wa-muted)]">{RESHIPPER.methods}</span></p>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-1.5 text-center" style={{ color: 'var(--wa-accent)' }}>Group Buy</p>
                <h1 className="text-3xl text-center" style={{ fontFamily: 'var(--font-wa-serif)', color: 'var(--wa-text)' }}>{GB_NAME}</h1>
              </div>

              {/* 2-step progress indicator */}
              <div className="flex items-center gap-3 max-w-sm mx-auto">
                {/* Step 1 — active */}
                <div className="flex items-center gap-2.5 px-4 py-2 rounded-full shadow-sm" style={{ background: 'var(--wa-ink)' }}>
                  <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold" style={{ color: 'var(--wa-ink)' }}>1</span>
                  </span>
                  <span className="text-[13px] font-medium text-white whitespace-nowrap">Choose Products</span>
                </div>
                {/* Arrow */}
                <div className="flex-1 flex items-center">
                  <div className="flex-1 h-px" style={{ background: 'var(--wa-border)' }} />
                  <svg className="w-3.5 h-3.5 mx-1.5 shrink-0" fill="none" viewBox="0 0 12 12" style={{ color: 'var(--wa-subtle)' }}>
                    <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                {/* Step 2 — inactive */}
                <div className="flex items-center gap-2.5 px-4 py-2 rounded-full" style={{ background: 'transparent', border: '1px solid var(--wa-border)' }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--wa-surface)', border: '1px solid var(--wa-border)' }}>
                    <span className="text-[10px] font-semibold" style={{ color: 'var(--wa-subtle)' }}>2</span>
                  </span>
                  <span className="text-[13px] font-medium whitespace-nowrap" style={{ color: 'var(--wa-muted)' }}>Review Order</span>
                </div>
              </div>
            </div>

            {/* YOUR PRODUCTS panel */}
            <section className="pt-2">
              <div className="rounded-3xl p-6 md:p-7 relative overflow-hidden shadow-md" style={{ background: 'var(--wa-ink)' }}>
                <div className="flex items-center justify-between mb-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--wa-accent)' }}>Your Products</p>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-xl transition-colors hover:bg-[var(--wa-ink-surface)]"
                    style={{ border: '1px solid var(--wa-ink-border)', color: 'var(--wa-ink-text)' }}
                  >
                    <BarChart2 className="w-[14px] h-[14px]" strokeWidth={1.8} />
                    Stock levels
                  </button>
                </div>

                <div className="space-y-0">
                  {LINE_ITEMS.map((n, i) => (
                    <ProductLine key={n} showDivider={i < LINE_ITEMS.length - 1} />
                  ))}
                </div>

                <button
                  type="button"
                  className="w-full h-12 mt-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all hover:bg-[var(--wa-ink-surface)]"
                  style={{ border: '1px dashed var(--wa-ink-border)', color: 'var(--wa-ink-text)', background: 'transparent' }}
                >
                  <Plus className="w-[18px] h-[18px]" strokeWidth={1.8} /> Add another product
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* ══ Fixed GRAND TOTAL footer ══ */}
      <div
        className="fixed bottom-0 right-0 z-20 shadow-[0_-8px_32px_rgba(45,39,33,0.06)]"
        style={{ left: SIDEBAR_W, background: 'var(--wa-surface)', borderTop: '1px solid var(--wa-border)' }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4 md:py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--wa-muted)' }}>Grand Total</p>
              <p className="text-2xl mt-0.5 truncate" style={{ color: 'var(--wa-text)', fontFamily: 'var(--font-wa-serif)' }}>$0.00</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--wa-subtle)' }}>incl. Custom</p>
            </div>
            <button
              className="h-[52px] px-8 rounded-xl text-[15px] font-medium text-white flex items-center gap-2.5 shrink-0 hover:bg-[var(--wa-accent-hover)] active:scale-[0.98] transition-all shadow-sm"
              style={{ background: 'var(--wa-accent)' }}
            >
              Review <ArrowRight className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
