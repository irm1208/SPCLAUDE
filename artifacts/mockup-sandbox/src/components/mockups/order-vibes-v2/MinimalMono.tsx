import './_group.css';
import './MinimalMono.css';
import React from 'react';
import {
  LayoutDashboard, ReceiptText, UsersRound, HeartPulse, ClipboardList,
  Search, Bell, ChevronDown, ChevronRight, Moon, PanelLeft, Send, Ticket,
  Wallet, Store, ArrowRight, Scale, FlaskConical, Droplet, TrendingUp, Activity,
  Truck, ShoppingBag, Users, TestTube, LifeBuoy, Globe, BarChart2, Trash2, Plus,
} from 'lucide-react';

const SIDEBAR_W = 260;
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
  { code: '6644', dot: '#000' },
  { code: '9955', dot: '#000' },
];

// ─── Sidebar nav button ─────────────────────────────────────────────────────
function NavButton({ label, Icon, active }: { label: string; Icon: React.ElementType; active?: boolean }) {
  return (
    <button
      className="relative w-full flex items-center transition-all text-left"
      style={{
        gap: 16, padding: '0 16px', height: 44,
        background: 'transparent',
        color: active ? 'var(--mm-accent)' : 'var(--mm-muted)',
        fontWeight: active ? 500 : 300, fontSize: 13,
        letterSpacing: '0.02em',
      }}
    >
      <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 1.5 : 1} />
      <span className="truncate">{label}</span>
    </button>
  );
}

// ─── Product line (dropdown + qty stepper) ──────────────────────────────────
function ProductLine({ showDivider }: { showDivider: boolean }) {
  return (
    <div>
      <div className="flex flex-col gap-4 overflow-hidden">
        {/* Searchable product select trigger */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="w-full text-left focus:outline-none flex items-start transition-colors hover:bg-[var(--mm-accent-light)]"
            style={{
              minHeight: 52,
              paddingLeft: 16, paddingRight: 40, paddingTop: 16, paddingBottom: 16,
              fontSize: 14, fontWeight: 300, background: 'var(--mm-surface)',
              border: '1px solid var(--mm-border)',
              color: 'var(--mm-text)', cursor: 'pointer',
              borderRadius: 0,
            }}
          >
            <span style={{ flex: 1, wordBreak: 'break-word', lineHeight: '1.4' }}>Select a product…</span>
          </button>
          <ChevronDown
            className="absolute right-4 top-4 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--mm-text)' }}
            strokeWidth={1}
          />
        </div>

        {/* Quantity + price row */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 shrink-0">
            <div
              className="flex items-center h-12"
              style={{ background: 'var(--mm-surface)', border: '1px solid var(--mm-border)' }}
            >
              <button type="button" className="px-4 h-full text-lg transition-colors hover:bg-[var(--mm-accent-light)]" style={{ color: 'var(--mm-text)' }}>−</button>
              <span className="w-10 text-center text-sm font-medium" style={{ color: 'var(--mm-text)' }}>1</span>
              <button type="button" className="px-4 h-full text-lg transition-colors hover:bg-[var(--mm-accent-light)]" style={{ color: 'var(--mm-text)' }}>+</button>
            </div>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--mm-subtle)' }}>For half kits add .5</p>
          </div>

          <div className="flex-1 text-right">
            <p className="font-light text-xl tracking-tight" style={{ color: 'var(--mm-text)' }}>$0.00</p>
          </div>

          <button type="button" className="p-3 transition-colors hover:bg-[var(--mm-accent-light)] border border-transparent hover:border-[var(--mm-border)]" style={{ color: 'var(--mm-text)' }}>
            <Trash2 className="w-4 h-4" strokeWidth={1} />
          </button>
        </div>
      </div>
      {showDivider && <div className="my-6" style={{ borderTop: '1px solid var(--mm-border)' }} />}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
export function MinimalMono() {
  const initial = USERNAME.slice(0, 1).toUpperCase();

  return (
    <div className="minimal-mono-theme min-h-screen flex" style={{ background: 'var(--mm-bg)', fontFamily: 'var(--font-mm)', color: 'var(--mm-text)' }}>
      {/* ══ Sidebar (icon rail + labelled panel) ══ */}
      <aside className="hidden lg:flex shrink-0 sticky top-0 h-screen border-r" style={{ width: SIDEBAR_W, borderColor: 'var(--mm-border)' }}>
        {/* Icon rail */}
        <div
          className="flex flex-col items-center shrink-0 border-r"
          style={{ width: RAIL_W, background: 'var(--mm-surface)', borderColor: 'var(--mm-border)', paddingTop: 24, paddingBottom: 24 }}
        >
          <div
            className="flex items-center justify-center shrink-0"
            style={{ width: 32, height: 32, border: '1px solid var(--mm-text)', background: 'var(--mm-surface)', color: 'var(--mm-text)', fontWeight: 400, fontSize: 10, letterSpacing: '0.05em' }}
          >
            S&amp;P
          </div>

          <nav className="flex flex-col items-center gap-4" style={{ marginTop: 40 }}>
            {[LayoutDashboard, ClipboardList].map((Icon, i) => (
              <button
                key={i}
                className="flex items-center justify-center transition-colors hover:bg-[var(--mm-accent-light)]"
                style={{ width: 40, height: 40, background: 'transparent', color: 'var(--mm-text)' }}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={1} />
              </button>
            ))}
          </nav>

          <nav
            className="flex flex-col items-center gap-4"
            style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--mm-border-soft)' }}
          >
            {HEALTH_APPS.map((Icon, i) => (
              <button
                key={i}
                className="flex items-center justify-center transition-colors hover:bg-[var(--mm-accent-light)]"
                style={{ width: 40, height: 40, color: 'var(--mm-muted)' }}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={1} />
              </button>
            ))}
          </nav>

          <div className="flex flex-col items-center gap-4" style={{ marginTop: 'auto', paddingTop: 24, borderTop: '1px solid var(--mm-border-soft)' }}>
            {[Ticket, Store, PanelLeft].map((Icon, i) => (
              <button
                key={i}
                className="flex items-center justify-center transition-colors hover:bg-[var(--mm-accent-light)]"
                style={{ width: 40, height: 40, color: 'var(--mm-muted)' }}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={1} />
              </button>
            ))}
          </div>
        </div>

        {/* Labelled panel */}
        <div className="flex flex-col flex-1 min-w-0" style={{ background: 'var(--mm-surface)' }}>
          {/* Brand */}
          <div className="flex items-center px-6" style={{ height: 80 }}>
            <span className="font-light tracking-wide uppercase truncate" style={{ fontSize: 13, letterSpacing: '0.15em', color: 'var(--mm-text)' }}>Salt &amp; Peps</span>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-6">
            {/* Main nav */}
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map(({ id, label, Icon, active }) => (
                <NavButton key={id} label={label} Icon={Icon} active={active} />
              ))}
            </nav>

            {/* Workspaces */}
            <p className="px-4 mt-10 mb-4 font-normal uppercase" style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--mm-subtle)' }}>Workspaces</p>
            <nav className="flex flex-col gap-1">
              {WORKSPACE_ITEMS.map(({ id, label, Icon }) => (
                <NavButton key={id} label={label} Icon={Icon} />
              ))}
            </nav>

            {/* More */}
            <p className="px-4 mt-10 mb-4 font-normal uppercase" style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--mm-subtle)' }}>More</p>
            <nav className="flex flex-col gap-1">
              {MORE_ITEMS.map(({ id, label, Icon }) => (
                <NavButton key={id} label={label} Icon={Icon} />
              ))}
            </nav>

            {/* Orders */}
            <p className="px-4 mt-10 mb-4 font-normal uppercase" style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--mm-subtle)' }}>Orders</p>
            <div className="mb-4">
              <p className="px-4 mb-3 font-medium tracking-wide uppercase" style={{ fontSize: 10, color: 'var(--mm-text)' }}>Group Buys</p>
              <div className="flex flex-col gap-1">
                {GB_ORDERS.map(o => (
                  <button
                    key={o.code}
                    className="w-full flex items-center gap-3 px-4 text-left transition-colors hover:bg-[var(--mm-accent-light)]"
                    style={{ height: 44, color: 'var(--mm-text)', fontWeight: 300, fontSize: 13 }}
                  >
                    <span className="flex items-center justify-center shrink-0 border" style={{ width: 28, height: 28, borderColor: 'var(--mm-border)' }}>
                      <UsersRound className="w-[14px] h-[14px]" strokeWidth={1} />
                    </span>
                    <span className="truncate flex-1 tracking-wider">{o.code}</span>
                    <span className="w-1.5 h-1.5 shrink-0" style={{ background: o.dot }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom promo card */}
            <button
              className="w-full text-left mt-10 transition-colors hover:bg-[var(--mm-accent-light)]"
              style={{ background: 'var(--mm-surface)', padding: '24px 20px', borderTop: '1px solid var(--mm-border-soft)' }}
            >
              <div className="relative">
                <div className="flex items-center justify-center border mb-5" style={{ width: 32, height: 32, borderColor: 'var(--mm-border)', color: 'var(--mm-text)' }}>
                  <Send className="w-[14px] h-[14px]" strokeWidth={1} />
                </div>
                <p className="font-light tracking-wide uppercase" style={{ fontSize: 11, color: 'var(--mm-text)', lineHeight: 1.6 }}>Take Salt &amp; Peps Everywhere</p>
                <p className="font-light" style={{ fontSize: 11, color: 'var(--mm-muted)', marginTop: 8, lineHeight: 1.5 }}>Order updates &amp; alerts on Telegram.</p>
                <span className="inline-flex items-center gap-2 mt-6 font-medium uppercase tracking-wide border-b border-transparent transition-colors hover:border-[var(--mm-text)] pb-1" style={{ fontSize: 9, color: 'var(--mm-text)' }}>
                  Connect Telegram <ChevronRight className="w-3 h-3" strokeWidth={1} />
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
          className="sticky top-0 z-10 flex items-center gap-6 px-6 md:px-10"
          style={{ height: 80, background: 'var(--mm-surface)', borderBottom: `1px solid var(--mm-border)` }}
        >
          <h1 className="font-light tracking-widest uppercase shrink-0" style={{ fontSize: 14, color: 'var(--mm-text)' }}>Order Form</h1>

          <div className="flex-1 flex justify-center min-w-0 sm:px-8">
            <div className="relative hidden sm:block w-full max-w-[500px]">
              <div
                className="flex items-center gap-3 w-full transition-colors focus-within:border-[var(--mm-text)]"
                style={{ height: 44, padding: '0 16px', background: 'var(--mm-surface)', border: `1px solid var(--mm-border)` }}
              >
                <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--mm-subtle)' }} strokeWidth={1} />
                <input
                  readOnly
                  placeholder="Search orders, compounds, group buys, products..."
                  className="flex-1 min-w-0 bg-transparent outline-none font-light tracking-wide"
                  style={{ fontSize: 12, color: 'var(--mm-text)' }}
                />
                <span
                  className="hidden md:flex items-center gap-1 font-medium shrink-0 uppercase tracking-widest"
                  style={{ fontSize: 9, color: 'var(--mm-muted)' }}
                >⌘ K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Credits */}
            <button
              className="flex items-center gap-3 pl-2 pr-4 transition-colors hover:bg-[var(--mm-accent-light)] border"
              style={{ height: 44, background: 'var(--mm-surface)', borderColor: 'var(--mm-border)' }}
            >
              <span className="flex items-center justify-center border shrink-0" style={{ width: 28, height: 28, borderColor: 'var(--mm-border)', color: 'var(--mm-text)' }}>
                <Wallet className="w-4 h-4" strokeWidth={1} />
              </span>
              <span className="flex flex-col items-start leading-none justify-center gap-1.5">
                <span style={{ fontSize: 8, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--mm-muted)' }}>Credits</span>
                <span className="font-light tracking-widest" style={{ fontSize: 13, color: 'var(--mm-text)' }}>${CREDITS.toFixed(2)}</span>
              </span>
            </button>
            {/* Theme toggle */}
            <button
              className="hidden md:flex items-center justify-center transition-colors hover:bg-[var(--mm-accent-light)] border"
              style={{ width: 44, height: 44, background: 'var(--mm-surface)', borderColor: 'var(--mm-border)', color: 'var(--mm-text)' }}
            >
              <Moon className="w-4 h-4" strokeWidth={1} />
            </button>
            {/* Notifications */}
            <button
              className="relative flex items-center justify-center transition-colors hover:bg-[var(--mm-accent-light)] border"
              style={{ width: 44, height: 44, background: 'var(--mm-surface)', borderColor: 'var(--mm-border)', color: 'var(--mm-text)' }}
            >
              <Bell className="w-4 h-4" strokeWidth={1} />
            </button>
            {/* Profile chip */}
            <button
              className="flex items-center gap-3 pl-2 pr-3 border hover:bg-[var(--mm-accent-light)] transition-colors"
              style={{ height: 44, background: 'var(--mm-surface)', borderColor: 'var(--mm-border)' }}
            >
              <span className="flex items-center justify-center text-white shrink-0" style={{ width: 28, height: 28, background: 'var(--mm-text)', fontWeight: 300, fontSize: 12 }}>{initial}</span>
              <span className="hidden md:flex flex-col items-start leading-tight min-w-0 gap-1 justify-center">
                <span className="font-normal tracking-wide truncate" style={{ fontSize: 11, maxWidth: 120, color: 'var(--mm-text)' }}>{USERNAME}</span>
                <span className="font-light truncate" style={{ fontSize: 10, maxWidth: 120, color: 'var(--mm-subtle)' }}>@{USERNAME}</span>
              </span>
              <ChevronDown className="w-3.5 h-3.5 shrink-0 hidden md:block ml-1" style={{ color: 'var(--mm-muted)' }} strokeWidth={1} />
            </button>
          </div>
        </header>

        {/* Order form content */}
        <div className="flex-1 flex flex-col">
          <main className="flex-1 px-4 py-12 pb-48 lg:pb-32 max-w-3xl mx-auto w-full space-y-16">

            {/* GB title + progress steps */}
            <div className="space-y-12">
              {/* Reshipper info card */}
              <div className="p-8 flex flex-col md:flex-row items-start md:items-center gap-8 border" style={{ background: 'var(--mm-surface)', borderColor: 'var(--mm-text)' }}>
                <div className="w-10 h-10 border flex items-center justify-center shrink-0" style={{ borderColor: 'var(--mm-text)' }}>
                  <Globe className="w-5 h-5" style={{ color: 'var(--mm-text)' }} strokeWidth={1} />
                </div>
                <div className="min-w-0 flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: 'var(--mm-muted)' }}>Local Reshipper</p>
                    <p className="text-[14px] font-light tracking-wide" style={{ color: 'var(--mm-text)' }}>{RESHIPPER.countryName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: 'var(--mm-muted)' }}>Telegram</p>
                    <p className="text-[14px] font-light tracking-wide" style={{ color: 'var(--mm-text)' }}>@{RESHIPPER.telegramUsername}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: 'var(--mm-muted)' }}>Payment</p>
                    <p className="text-[12px] font-light tracking-wide leading-snug" style={{ color: 'var(--mm-text)' }}>To: {RESHIPPER.paymentTarget}<br/>Via: {RESHIPPER.methods}</p>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center space-y-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.25em]" style={{ color: 'var(--mm-muted)' }}>Group Buy</p>
                <h1 className="text-4xl font-light tracking-widest uppercase" style={{ color: 'var(--mm-text)' }}>{GB_NAME}</h1>
              </div>

              {/* 2-step progress indicator */}
              <div className="flex items-center justify-center gap-6">
                {/* Step 1 — active */}
                <div className="flex items-center gap-3 px-2 py-1 border-b border-[var(--mm-text)]">
                  <span className="text-[10px] font-medium" style={{ color: 'var(--mm-text)' }}>01</span>
                  <span className="text-[12px] font-light uppercase tracking-widest whitespace-nowrap" style={{ color: 'var(--mm-text)' }}>Choose Products</span>
                </div>
                {/* Arrow */}
                <div className="w-16 h-px bg-[var(--mm-border)] relative"></div>
                {/* Step 2 — inactive */}
                <div className="flex items-center gap-3 px-2 py-1 opacity-40">
                  <span className="text-[10px] font-medium" style={{ color: 'var(--mm-text)' }}>02</span>
                  <span className="text-[12px] font-light uppercase tracking-widest whitespace-nowrap" style={{ color: 'var(--mm-text)' }}>Review Order</span>
                </div>
              </div>
            </div>

            {/* YOUR PRODUCTS panel */}
            <section className="pt-4">
              <div className="p-8 md:p-12 relative overflow-hidden border" style={{ background: 'var(--mm-surface)', borderColor: 'var(--mm-border)' }}>
                <div className="flex items-center justify-between mb-10 pb-6 border-b" style={{ borderColor: 'var(--mm-border)' }}>
                  <p className="text-[12px] font-medium uppercase tracking-[0.2em]" style={{ color: 'var(--mm-text)' }}>Your Products</p>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-[11px] font-medium tracking-widest uppercase px-4 py-2 transition-colors hover:bg-[var(--mm-accent-light)] border"
                    style={{ borderColor: 'var(--mm-border)', color: 'var(--mm-text)' }}
                  >
                    <BarChart2 className="w-3.5 h-3.5" strokeWidth={1} />
                    Stock levels
                  </button>
                </div>

                <div className="space-y-6">
                  {LINE_ITEMS.map((n, i) => (
                    <ProductLine key={n} showDivider={i < LINE_ITEMS.length - 1} />
                  ))}
                </div>

                <button
                  type="button"
                  className="w-full h-14 mt-10 text-[12px] font-medium uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:bg-[var(--mm-accent-light)] border"
                  style={{ borderColor: 'var(--mm-border)', color: 'var(--mm-text)', background: 'var(--mm-surface)' }}
                >
                  <Plus className="w-4 h-4" strokeWidth={1} /> Add another product
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* ══ Fixed GRAND TOTAL footer ══ */}
      <div
        className="fixed bottom-0 right-0 z-20"
        style={{ left: SIDEBAR_W, background: 'var(--mm-surface)', borderTop: '1px solid var(--mm-text)' }}
      >
        <div className="max-w-3xl mx-auto px-6 py-6 md:py-8">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1 min-w-0 flex items-end gap-6">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--mm-muted)' }}>Grand Total</p>
                <p className="text-[10px] mt-2 tracking-widest uppercase" style={{ color: 'var(--mm-subtle)' }}>(incl. Custom)</p>
              </div>
              <p className="text-4xl font-light tracking-tight truncate" style={{ color: 'var(--mm-text)' }}>$0.00</p>
            </div>
            <button
              className="h-14 px-10 text-[13px] font-medium uppercase tracking-widest text-white flex items-center gap-4 shrink-0 transition-opacity hover:opacity-80 active:scale-[0.99]"
              style={{ background: 'var(--mm-text)' }}
            >
              Review <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
