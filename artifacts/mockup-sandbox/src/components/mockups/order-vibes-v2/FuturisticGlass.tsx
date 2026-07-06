import './_group.css';
import './FuturisticGlass.css';
import React from 'react';
import {
  LayoutDashboard, ReceiptText, UsersRound, HeartPulse, ClipboardList,
  Search, Bell, ChevronDown, ChevronRight, Moon, PanelLeft, Send, Ticket,
  Wallet, Store, ArrowRight, Scale, FlaskConical, Droplet, TrendingUp, Activity,
  Truck, ShoppingBag, Users, TestTube, LifeBuoy, Globe, BarChart2, Trash2, Plus,
} from 'lucide-react';

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
  { code: '6644', dot: 'var(--fg-cyan)' },
  { code: '9955', dot: 'var(--fg-violet)' },
];

const SIDEBAR_W = 260;
const RAIL_W = 64;

// ─── Sidebar nav button ─────────────────────────────────────────────────────
function NavButton({ label, Icon, active }: { label: string; Icon: React.ElementType; active?: boolean }) {
  return (
    <button
      className={`relative w-full flex items-center rounded-lg text-left fg-glass-button ${active ? 'active' : ''}`}
      style={{
        gap: 12, padding: '0 12px', height: 40,
        fontWeight: active ? 600 : 400, fontSize: 13.5,
        letterSpacing: '0.02em'
      }}
    >
      {active && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-md bg-[var(--fg-cyan)] shadow-[var(--fg-cyan-glow)]" />}
      <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2 : 1.5} />
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
            className="w-full text-left focus:outline-none flex items-start fg-input rounded-lg"
            style={{
              minHeight: 46,
              paddingLeft: 16, paddingRight: 40, paddingTop: 12, paddingBottom: 12,
              fontSize: 14, cursor: 'pointer',
            }}
          >
            <span style={{ flex: 1, wordBreak: 'break-word', lineHeight: '1.4' }}>Select a product…</span>
          </button>
          <ChevronDown
            className="absolute right-3 top-[13px] w-5 h-5 pointer-events-none"
            style={{ color: 'var(--fg-cyan)' }}
          />
        </div>

        {/* Quantity + price row */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center shrink-0">
            <div className="flex items-center h-10 rounded-lg overflow-hidden fg-input">
              <button type="button" className="px-3.5 h-full text-lg hover:bg-[rgba(0,240,255,0.1)] transition-colors" style={{ color: 'var(--fg-cyan)' }}>−</button>
              <span className="w-12 text-center text-[15px] font-bold" style={{ color: 'var(--fg-text-main)', fontFamily: 'var(--font-fg-mono)' }}>1</span>
              <button type="button" className="px-3.5 h-full text-lg hover:bg-[rgba(0,240,255,0.1)] transition-colors" style={{ color: 'var(--fg-cyan)' }}>+</button>
            </div>
            <p className="text-[10px] mt-1.5 leading-none uppercase tracking-widest" style={{ color: 'var(--fg-text-dim)' }}>For half kits add .5</p>
          </div>

          <div className="flex-1 text-right">
            <p className="font-bold text-lg fg-text-glow" style={{ color: 'var(--fg-cyan)', fontFamily: 'var(--font-fg-mono)' }}>$0.00</p>
          </div>

          <button type="button" className="p-2 rounded-lg fg-glass-button border-transparent" style={{ color: 'var(--fg-text-dim)' }}>
            <Trash2 className="w-[18px] h-[18px]" strokeWidth={1.5} />
          </button>
        </div>
      </div>
      {showDivider && <div className="my-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
export function FuturisticGlass() {
  const initial = USERNAME.slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen flex fg-theme text-[var(--fg-text-main)]" style={{ background: 'var(--fg-bg-grad)', fontFamily: 'var(--font-fg-sans)' }}>
      {/* ══ Sidebar (icon rail + labelled panel) ══ */}
      <aside className="hidden lg:flex shrink-0 sticky top-0 h-screen" style={{ width: SIDEBAR_W }}>
        {/* Icon rail */}
        <div
          className="flex flex-col items-center shrink-0 fg-glass-rail"
          style={{ width: RAIL_W, paddingTop: 18, paddingBottom: 16 }}
        >
          <div
            className="flex items-center justify-center shrink-0"
            style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--fg-cyan-dim)', border: '1px solid var(--fg-cyan)', color: 'var(--fg-cyan)', boxShadow: 'var(--fg-cyan-glow)', fontWeight: 700, fontSize: 13, letterSpacing: '0.05em' }}
          >
            S&amp;P
          </div>

          <nav className="flex flex-col items-center gap-2" style={{ marginTop: 30 }}>
            {[LayoutDashboard, ClipboardList].map((Icon, i) => (
              <button
                key={i}
                className="flex items-center justify-center transition-all hover:text-[var(--fg-cyan)] hover:drop-shadow-[var(--fg-cyan-glow)]"
                style={{ width: 44, height: 44, borderRadius: 8, color: 'var(--fg-text-dim)' }}
              >
                <Icon className="w-[20px] h-[20px]" strokeWidth={1.5} />
              </button>
            ))}
          </nav>

          <nav
            className="flex flex-col items-center gap-2"
            style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            {HEALTH_APPS.map((Icon, i) => (
              <button
                key={i}
                className="flex items-center justify-center transition-all hover:text-[var(--fg-cyan)] hover:drop-shadow-[var(--fg-cyan-glow)]"
                style={{ width: 44, height: 44, borderRadius: 8, color: 'var(--fg-text-dim)' }}
              >
                <Icon className="w-[20px] h-[20px]" strokeWidth={1.5} />
              </button>
            ))}
          </nav>

          <div className="flex flex-col items-center gap-2" style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {[Ticket, Store, PanelLeft].map((Icon, i) => (
              <button
                key={i}
                className="flex items-center justify-center transition-all hover:text-[var(--fg-cyan)] hover:drop-shadow-[var(--fg-cyan-glow)]"
                style={{ width: 44, height: 44, borderRadius: 8, color: 'var(--fg-text-dim)' }}
              >
                <Icon className="w-[20px] h-[20px]" strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </div>

        {/* Labelled panel */}
        <div className="flex flex-col flex-1 min-w-0 fg-glass-sidebar">
          {/* Brand */}
          <div className="flex items-center px-5" style={{ height: 72 }}>
            <span className="font-bold tracking-wider uppercase truncate fg-text-glow" style={{ fontSize: 17, color: 'var(--fg-text-main)' }}>Salt &amp; Peps</span>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-4">
            {/* Main nav */}
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map(({ id, label, Icon, active }) => (
                <NavButton key={id} label={label} Icon={Icon} active={active} />
              ))}
            </nav>

            {/* Workspaces */}
            <p className="px-3 mt-8 mb-2 font-semibold uppercase tracking-widest text-[10px]" style={{ color: 'var(--fg-text-dim)' }}>Workspaces</p>
            <nav className="flex flex-col gap-1">
              {WORKSPACE_ITEMS.map(({ id, label, Icon }) => (
                <NavButton key={id} label={label} Icon={Icon} />
              ))}
            </nav>

            {/* More */}
            <p className="px-3 mt-8 mb-2 font-semibold uppercase tracking-widest text-[10px]" style={{ color: 'var(--fg-text-dim)' }}>More</p>
            <nav className="flex flex-col gap-1">
              {MORE_ITEMS.map(({ id, label, Icon }) => (
                <NavButton key={id} label={label} Icon={Icon} />
              ))}
            </nav>

            {/* Orders */}
            <p className="px-3 mt-8 mb-2 font-semibold uppercase tracking-widest text-[10px]" style={{ color: 'var(--fg-text-dim)' }}>Orders</p>
            <div className="mb-2">
              <p className="px-3 mb-1.5 font-semibold uppercase tracking-widest text-[10px]" style={{ color: 'var(--fg-cyan)' }}>Group Buys</p>
              <div className="flex flex-col gap-1">
                {GB_ORDERS.map(o => (
                  <button
                    key={o.code}
                    className="w-full flex items-center gap-3 rounded-lg px-3 text-left fg-glass-button"
                    style={{ height: 42, color: 'var(--fg-text-muted)' }}
                  >
                    <span className="flex items-center justify-center shrink-0 rounded-md" style={{ width: 26, height: 26, background: 'rgba(0, 240, 255, 0.1)', color: 'var(--fg-cyan)' }}>
                      <UsersRound className="w-[14px] h-[14px]" strokeWidth={1.5} />
                    </span>
                    <span className="truncate flex-1 font-mono text-[13px] tracking-wide">{o.code}</span>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: o.dot, boxShadow: `0 0 6px ${o.dot}` }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom promo card */}
            <button
              className="w-full text-left mt-6 rounded-xl relative overflow-hidden fg-glass-button border"
              style={{ padding: 16 }}
            >
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-[var(--fg-violet)] opacity-20 blur-2xl pointer-events-none" />
              <div className="relative">
                <div className="flex items-center justify-center rounded-lg mb-3" style={{ width: 34, height: 34, background: 'var(--fg-violet-dim)', border: '1px solid var(--fg-violet)', color: 'var(--fg-violet)', boxShadow: 'var(--fg-violet-glow)' }}>
                  <Send className="w-4 h-4" />
                </div>
                <p className="font-semibold tracking-wide text-[13px] text-white">Take Salt &amp; Peps Everywhere</p>
                <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: 'var(--fg-text-muted)' }}>Order updates &amp; alerts on Telegram.</p>
                <span className="inline-flex items-center gap-1.5 mt-4 rounded-md font-semibold text-[10px] uppercase tracking-widest transition-colors" style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.05)', color: 'var(--fg-text-main)', border: '1px solid rgba(255,255,255,0.1)' }}>
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
          className="sticky top-0 z-10 flex items-center gap-4 px-4 md:px-8 fg-glass-sidebar border-r-0 border-b"
          style={{ height: 72 }}
        >
          <h1 className="font-semibold tracking-widest uppercase shrink-0 text-[16px] fg-text-glow">Order Form</h1>

          <div className="flex-1 flex justify-center min-w-0 sm:px-4">
            <div className="relative hidden sm:block w-full max-w-[460px]">
              <div className="fg-input flex items-center gap-2.5 w-full rounded-lg" style={{ height: 40, padding: '0 14px' }}>
                <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--fg-cyan)' }} />
                <input
                  readOnly
                  placeholder="Search orders, compounds, group buys, products..."
                  className="flex-1 min-w-0 bg-transparent outline-none tracking-wide"
                  style={{ fontSize: 13 }}
                />
                <span className="flex items-center gap-1 rounded font-mono shrink-0" style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(255,255,255,0.1)', color: 'var(--fg-text-main)' }}>⌘ K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Credits */}
            <button className="flex items-center gap-2.5 rounded-lg pl-1.5 pr-3 fg-glass-button" style={{ height: 40 }}>
              <span className="flex items-center justify-center rounded-md shrink-0" style={{ width: 28, height: 28, background: 'var(--fg-cyan-dim)', color: 'var(--fg-cyan)', border: '1px solid var(--fg-glass-border)' }}>
                <Wallet className="w-4 h-4" strokeWidth={1.5} />
              </span>
              <span className="flex flex-col items-start leading-none">
                <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--fg-text-dim)' }}>Credits</span>
                <span className="font-mono font-bold text-[13px] mt-1 text-white">${CREDITS.toFixed(2)}</span>
              </span>
            </button>
            {/* Theme toggle */}
            <button className="hidden md:flex items-center justify-center rounded-lg w-10 h-10 fg-glass-button">
              <Moon className="w-[18px] h-[18px]" strokeWidth={1.5} />
            </button>
            {/* Notifications */}
            <button className="relative flex items-center justify-center rounded-lg w-10 h-10 fg-glass-button">
              <Bell className="w-[18px] h-[18px]" strokeWidth={1.5} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: 'var(--fg-violet)', boxShadow: 'var(--fg-violet-glow)' }} />
            </button>
            {/* Profile chip */}
            <button className="flex items-center gap-2.5 rounded-lg pl-1.5 pr-2.5 fg-glass-button" style={{ height: 40 }}>
              <span className="flex items-center justify-center rounded text-[13px] font-bold shrink-0" style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.1)', color: 'var(--fg-text-main)' }}>{initial}</span>
              <span className="hidden md:flex flex-col items-start justify-center leading-none min-w-0">
                <span className="font-medium text-[12px] truncate max-w-[100px] text-white">{USERNAME}</span>
                <span className="text-[10px] truncate max-w-[100px] mt-1" style={{ color: 'var(--fg-text-dim)' }}>@{USERNAME}</span>
              </span>
              <ChevronDown className="w-3.5 h-3.5 shrink-0 hidden md:block" style={{ color: 'var(--fg-text-dim)' }} />
            </button>
          </div>
        </header>

        {/* Order form content */}
        <div className="flex-1 flex flex-col relative z-0">
          <main className="flex-1 px-4 py-8 pb-48 lg:pb-32 max-w-2xl mx-auto w-full space-y-6">

            {/* GB title + progress steps */}
            <div className="space-y-6">
              {/* Reshipper info card */}
              <div className="rounded-xl px-5 py-4 flex items-start gap-4 fg-glass-panel relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[var(--fg-cyan)] shadow-[var(--fg-cyan-glow)]" />
                <Globe className="w-[22px] h-[22px] shrink-0 mt-0.5" style={{ color: 'var(--fg-cyan)' }} strokeWidth={1.5} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold tracking-wide text-white">
                    Local Reshipper — {RESHIPPER.countryName}
                  </p>
                  <p className="text-[12px] font-mono mt-1" style={{ color: 'var(--fg-text-muted)' }}>@{RESHIPPER.telegramUsername}</p>
                  <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--fg-text-dim)' }}>Pay to: <span className="font-mono font-bold text-white ml-1">{RESHIPPER.paymentTarget}</span></p>
                    <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--fg-text-dim)' }}>Methods: <span className="font-mono font-bold text-white ml-1">{RESHIPPER.methods}</span></p>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] mb-2 fg-text-glow" style={{ color: 'var(--fg-cyan)' }}>Group Buy</p>
                <h1 className="text-3xl font-semibold tracking-wide text-white">{GB_NAME}</h1>
              </div>

              {/* 2-step progress indicator */}
              <div className="flex items-center justify-center gap-3">
                {/* Step 1 — active */}
                <div className="flex items-center gap-3 px-4 py-2 rounded-lg" style={{ background: 'var(--fg-cyan-dim)', border: '1px solid var(--fg-cyan)', boxShadow: 'var(--fg-cyan-glow)' }}>
                  <span className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--fg-cyan)' }}>
                    <span className="font-mono text-[11px] font-bold text-black">1</span>
                  </span>
                  <span className="text-[12px] font-bold uppercase tracking-wider text-white whitespace-nowrap">Choose Products</span>
                </div>
                {/* Arrow */}
                <div className="flex items-center w-16 justify-center">
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.2)' }} />
                  <svg className="w-3.5 h-3.5 mx-2 shrink-0" fill="none" viewBox="0 0 12 12" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.2)' }} />
                </div>
                {/* Step 2 — inactive */}
                <div className="flex items-center gap-3 px-4 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <span className="font-mono text-[11px] font-bold text-[var(--fg-text-muted)]">2</span>
                  </span>
                  <span className="text-[12px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--fg-text-muted)' }}>Review Order</span>
                </div>
              </div>
            </div>

            {/* YOUR PRODUCTS panel */}
            <section>
              <div className="rounded-xl p-6 relative fg-glass-panel">
                <div className="flex items-center justify-between mb-5 border-b pb-4" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <p className="text-[12px] font-bold uppercase tracking-[0.2em] fg-text-glow" style={{ color: 'var(--fg-cyan)' }}>Your Products</p>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg fg-glass-button"
                  >
                    <BarChart2 className="w-3.5 h-3.5" strokeWidth={1.5} />
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
                  className="w-full h-12 mt-4 rounded-lg text-[13px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 fg-glass-button"
                  style={{ borderStyle: 'dashed' }}
                >
                  <Plus className="w-4 h-4" strokeWidth={2} /> Add another product
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* ══ Fixed GRAND TOTAL footer ══ */}
      <div
        className="fixed bottom-0 right-0 z-20 fg-glass-sidebar border-t border-l-0"
        style={{ left: SIDEBAR_W, borderTopColor: 'var(--fg-glass-border)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--fg-bg-base)] to-transparent pointer-events-none" />
        <div className="max-w-2xl mx-auto px-4 py-5 relative">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--fg-text-muted)' }}>Grand Total</p>
              <p className="text-3xl font-bold font-mono truncate mt-1 fg-text-glow text-white">$0.00</p>
              <p className="text-[11px] mt-1 font-mono uppercase tracking-widest" style={{ color: 'var(--fg-text-dim)' }}>incl. Custom</p>
            </div>
            <button
              className="h-12 px-8 rounded-lg text-[13px] font-bold flex items-center gap-3 shrink-0 fg-primary-btn"
            >
              Review <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
