import './_group.css';
import './BoldEnergetic.css';
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
  { code: '6644', dot: '#CCFF00' },
  { code: '9955', dot: '#FF3366' },
];

const SIDEBAR_W = 280;
const RAIL_W = 72;

// ─── Sidebar nav button ─────────────────────────────────────────────────────
function NavButton({ label, Icon, active }: { label: string; Icon: React.ElementType; active?: boolean }) {
  return (
    <button
      className="be-nav-button relative w-full flex items-center rounded-xl text-left font-bold"
      data-active={active}
      style={{
        gap: 12, padding: '0 14px', height: 44,
        color: active ? '#000' : 'var(--be-muted)',
        fontSize: 15,
      }}
    >
      <Icon className="w-5 h-5 shrink-0" strokeWidth={active ? 3 : 2.5} />
      <span className="truncate">{label}</span>
    </button>
  );
}

// ─── Product line (dropdown + qty stepper) ──────────────────────────────────
function ProductLine({ showDivider }: { showDivider: boolean }) {
  return (
    <div className="be-product-row">
      <div className="flex flex-col gap-3">
        {/* Searchable product select trigger */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="w-full text-left focus:outline-none flex items-start be-input"
            style={{
              minHeight: 52,
              paddingLeft: 16, paddingRight: 40, paddingTop: 14, paddingBottom: 14,
              fontSize: 15, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span style={{ flex: 1, wordBreak: 'break-word', lineHeight: '1.4' }}>Select a product…</span>
          </button>
          <ChevronDown
            className="absolute right-4 top-[16px] w-5 h-5 pointer-events-none"
            style={{ color: 'var(--be-primary)' }}
            strokeWidth={3}
          />
        </div>

        {/* Quantity + price row */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center shrink-0">
            <div className="flex items-center h-12 rounded-xl overflow-hidden be-input" style={{ background: '#08080C' }}>
              <button type="button" className="px-4 h-full text-xl font-bold hover:bg-[var(--be-surface)] transition-colors" style={{ color: 'var(--be-primary)' }}>−</button>
              <span className="w-12 text-center text-lg font-black" style={{ color: '#ffffff' }}>1</span>
              <button type="button" className="px-4 h-full text-xl font-bold hover:bg-[var(--be-surface)] transition-colors" style={{ color: 'var(--be-primary)' }}>+</button>
            </div>
            <p className="text-[11px] mt-1.5 font-bold uppercase tracking-widest" style={{ color: 'var(--be-muted)' }}>For half kits add .5</p>
          </div>

          <div className="flex-1 text-right">
            <p className="font-black text-xl font-mono tracking-tight" style={{ color: 'var(--be-primary)' }}>$0.00</p>
          </div>

          <button type="button" className="p-3 rounded-xl be-input hover:bg-[var(--be-surface)] transition-colors" style={{ color: 'var(--be-accent)' }}>
            <Trash2 className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
export function BoldEnergetic() {
  const initial = USERNAME.slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen flex bold-energetic-theme">
      {/* ══ Sidebar (icon rail + labelled panel) ══ */}
      <aside className="hidden lg:flex shrink-0 sticky top-0 h-screen" style={{ width: SIDEBAR_W }}>
        {/* Icon rail */}
        <div
          className="be-rail flex flex-col items-center shrink-0"
          style={{ width: RAIL_W, paddingTop: 20, paddingBottom: 20 }}
        >
          <div
            className="flex items-center justify-center shrink-0"
            style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--be-primary)', color: '#000', fontWeight: 900, fontSize: 16, border: '2px solid #000', boxShadow: '2px 2px 0 0 #000' }}
          >
            S&amp;P
          </div>

          <nav className="flex flex-col items-center gap-3" style={{ marginTop: 32 }}>
            {[LayoutDashboard, ClipboardList].map((Icon, i) => (
              <button
                key={i}
                className="flex items-center justify-center transition-transform hover:scale-110"
                style={{ width: 44, height: 44, borderRadius: 12, color: '#fff' }}
              >
                <Icon className="w-6 h-6" strokeWidth={2.5} />
              </button>
            ))}
          </nav>

          <nav
            className="flex flex-col items-center gap-3"
            style={{ marginTop: 24, paddingTop: 24, borderTop: '2px dashed rgba(0,0,0,0.2)' }}
          >
            {HEALTH_APPS.map((Icon, i) => (
              <button
                key={i}
                className="flex items-center justify-center transition-transform hover:scale-110"
                style={{ width: 44, height: 44, borderRadius: 12, color: 'rgba(255,255,255,0.7)' }}
              >
                <Icon className="w-6 h-6" strokeWidth={2.5} />
              </button>
            ))}
          </nav>

          <div className="flex flex-col items-center gap-3" style={{ marginTop: 'auto', paddingTop: 24, borderTop: '2px dashed rgba(0,0,0,0.2)' }}>
            {[Ticket, Store, PanelLeft].map((Icon, i) => (
              <button
                key={i}
                className="flex items-center justify-center transition-transform hover:scale-110"
                style={{ width: 44, height: 44, borderRadius: 12, color: 'rgba(255,255,255,0.7)' }}
              >
                <Icon className="w-6 h-6" strokeWidth={2.5} />
              </button>
            ))}
          </div>
        </div>

        {/* Labelled panel */}
        <div className="be-sidebar flex flex-col flex-1 min-w-0">
          {/* Brand */}
          <div className="flex items-center px-5" style={{ height: 84 }}>
            <span className="font-black tracking-tight truncate uppercase" style={{ fontSize: 24, color: 'var(--be-text)' }}>Salt &amp; Peps</span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-6">
            {/* Main nav */}
            <nav className="flex flex-col gap-1.5">
              {NAV_ITEMS.map(({ id, label, Icon, active }) => (
                <NavButton key={id} label={label} Icon={Icon} active={active} />
              ))}
            </nav>

            {/* Workspaces */}
            <p className="px-4 mt-8 mb-3 font-black uppercase tracking-widest text-[11px]" style={{ color: 'var(--be-muted)' }}>Workspaces</p>
            <nav className="flex flex-col gap-1.5">
              {WORKSPACE_ITEMS.map(({ id, label, Icon }) => (
                <NavButton key={id} label={label} Icon={Icon} />
              ))}
            </nav>

            {/* More */}
            <p className="px-4 mt-8 mb-3 font-black uppercase tracking-widest text-[11px]" style={{ color: 'var(--be-muted)' }}>More</p>
            <nav className="flex flex-col gap-1.5">
              {MORE_ITEMS.map(({ id, label, Icon }) => (
                <NavButton key={id} label={label} Icon={Icon} />
              ))}
            </nav>

            {/* Orders */}
            <p className="px-4 mt-8 mb-3 font-black uppercase tracking-widest text-[11px]" style={{ color: 'var(--be-muted)' }}>Orders</p>
            <div className="mb-4">
              <p className="px-4 mb-2 font-black uppercase" style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--be-accent)' }}>Group Buys</p>
              <div className="flex flex-col gap-1.5">
                {GB_ORDERS.map(o => (
                  <button
                    key={o.code}
                    className="w-full flex items-center gap-3 rounded-xl px-4 text-left be-input border-transparent hover:border-[var(--be-border)]"
                    style={{ height: 48, background: 'transparent' }}
                  >
                    <span className="flex items-center justify-center shrink-0 rounded-lg" style={{ width: 32, height: 32, background: 'var(--be-surface)', border: '2px solid var(--be-border)', color: 'var(--be-text)' }}>
                      <UsersRound className="w-[16px] h-[16px]" strokeWidth={2.5} />
                    </span>
                    <span className="truncate flex-1 font-bold text-[14px]">{o.code}</span>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-black shadow-[1px_1px_0_0_#000]" style={{ background: o.dot }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom promo card */}
            <button
              className="be-promo-card w-full text-left mt-8 p-5 relative overflow-hidden group"
            >
              <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white opacity-10 blur-2xl group-hover:bg-[var(--be-primary)] transition-colors duration-500" />
              <div className="relative">
                <div className="flex items-center justify-center rounded-xl mb-4" style={{ width: 44, height: 44, background: 'var(--be-primary)', border: '2px solid #000', color: '#000', boxShadow: '2px 2px 0 0 #000' }}>
                  <Send className="w-6 h-6" strokeWidth={2.5} />
                </div>
                <p className="font-black leading-none text-[17px] mb-1.5 text-white">Take Salt &amp; Peps Everywhere</p>
                <p className="text-[13px] font-medium text-white/80 leading-snug">Order updates &amp; alerts on Telegram.</p>
                <span className="inline-flex items-center gap-2 mt-4 rounded-xl font-bold px-4 py-2 bg-white text-black border-2 border-black shadow-[2px_2px_0_0_#000] text-[13px] group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all">
                  Connect Telegram <ChevronRight className="w-4 h-4" strokeWidth={3} />
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
          className="sticky top-0 z-10 flex items-center gap-4 px-4 md:px-8"
          style={{ height: 84, background: 'var(--be-surface)', borderBottom: '2px solid var(--be-border)' }}
        >
          <h1 className="font-black tracking-tight shrink-0 uppercase" style={{ fontSize: 24 }}>Order Form</h1>

          <div className="flex-1 flex justify-center min-w-0 sm:px-4">
            <div className="relative hidden sm:block w-full max-w-[500px]">
              <div className="be-input flex items-center gap-3 w-full px-4" style={{ height: 48 }}>
                <Search className="w-5 h-5 shrink-0" style={{ color: 'var(--be-primary)' }} strokeWidth={2.5} />
                <input
                  readOnly
                  placeholder="Search orders, compounds, group buys, products..."
                  className="flex-1 min-w-0 bg-transparent outline-none font-bold"
                  style={{ fontSize: 14 }}
                />
                <span className="be-chip px-3 py-1 text-[11px] font-bold">⌘ K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Credits */}
            <button className="be-chip flex items-center gap-3 px-2 pr-4 h-12 bg-transparent">
              <span className="flex items-center justify-center rounded-full bg-[var(--be-primary)] text-black w-8 h-8 border border-black shadow-[1px_1px_0_0_#000]">
                <Wallet className="w-4 h-4" strokeWidth={2.5} />
              </span>
              <span className="flex flex-col items-start leading-none">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--be-muted)]">Credits</span>
                <span className="font-black font-mono text-[14px] mt-1">${CREDITS.toFixed(2)}</span>
              </span>
            </button>
            {/* Theme toggle */}
            <button className="hidden md:flex be-chip w-12 h-12 items-center justify-center bg-[var(--be-surface)] hover:bg-[var(--be-border)] transition-colors">
              <Moon className="w-5 h-5" strokeWidth={2.5} />
            </button>
            {/* Notifications */}
            <button className="be-chip relative w-12 h-12 flex items-center justify-center bg-[var(--be-surface)] hover:bg-[var(--be-border)] transition-colors">
              <Bell className="w-5 h-5" strokeWidth={2.5} />
              <span className="absolute top-2 right-2 w-3 h-3 bg-[var(--be-accent)] border-2 border-[var(--be-surface)] rounded-full"></span>
            </button>
            {/* Profile chip */}
            <button className="be-chip flex items-center gap-3 pl-2 pr-3 h-12 bg-[var(--be-surface)] hover:bg-[var(--be-border)] transition-colors">
              <span className="flex items-center justify-center rounded-full text-black bg-[var(--be-primary)] font-black text-lg w-8 h-8 border border-black shadow-[1px_1px_0_0_#000]">{initial}</span>
              <span className="hidden md:flex flex-col items-start leading-tight min-w-0">
                <span className="font-bold text-[13px] truncate max-w-[120px]">{USERNAME}</span>
                <span className="text-[10px] truncate max-w-[120px] text-[var(--be-muted)]">@{USERNAME}</span>
              </span>
              <ChevronDown className="w-4 h-4 shrink-0 hidden md:block text-[var(--be-muted)]" strokeWidth={3} />
            </button>
          </div>
        </header>

        {/* Order form content */}
        <div className="flex-1 flex flex-col relative">
          <main className="flex-1 px-4 py-8 pb-48 lg:pb-32 max-w-3xl mx-auto w-full space-y-6 z-10">

            {/* GB title + progress steps */}
            <div className="space-y-6">
              {/* Reshipper info card */}
              <div className="be-card p-5 flex items-start gap-4" style={{ background: 'var(--be-violet)', borderColor: '#000' }}>
                <Globe className="w-6 h-6 shrink-0 mt-1" style={{ color: 'var(--be-primary)' }} strokeWidth={2.5} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-black uppercase tracking-wide text-[var(--be-primary)] mb-1">
                    Local Reshipper — {RESHIPPER.countryName}
                  </p>
                  <p className="text-[14px] font-bold text-white mb-2">@{RESHIPPER.telegramUsername}</p>
                  <div className="flex flex-wrap gap-2 text-[12px] font-bold font-mono">
                    <span className="bg-black/20 px-2 py-1 rounded-md border border-black/10">Pay to: {RESHIPPER.paymentTarget}</span>
                    <span className="bg-black/20 px-2 py-1 rounded-md border border-black/10">Methods: {RESHIPPER.methods}</span>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center py-4">
                <p className="text-[12px] font-black uppercase tracking-[0.2em] mb-2 text-[var(--be-accent)]">Group Buy</p>
                <h1 className="text-4xl font-black uppercase tracking-tight">{GB_NAME}</h1>
              </div>

              {/* 2-step progress indicator */}
              <div className="flex items-center gap-3">
                {/* Step 1 — active */}
                <div className="be-chip flex items-center gap-3 px-5 py-2.5" style={{ background: 'var(--be-primary)', borderColor: '#000' }}>
                  <span className="w-6 h-6 rounded-full bg-black flex items-center justify-center shrink-0">
                    <span className="text-[12px] font-black text-[var(--be-primary)]">1</span>
                  </span>
                  <span className="text-[14px] font-black text-black uppercase tracking-wide whitespace-nowrap">Choose Products</span>
                </div>
                {/* Arrow */}
                <div className="flex-1 flex items-center h-[2px] bg-[var(--be-border)] relative">
                  <div className="absolute right-0 w-3 h-3 border-t-2 border-r-2 border-[var(--be-border)] transform rotate-45 -translate-y-[5px]"></div>
                </div>
                {/* Step 2 — inactive */}
                <div className="be-chip flex items-center gap-3 px-5 py-2.5" style={{ background: 'var(--be-surface)', borderColor: 'var(--be-border)', boxShadow: 'none' }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--be-border)' }}>
                    <span className="text-[12px] font-black text-[var(--be-muted)]">2</span>
                  </span>
                  <span className="text-[14px] font-bold text-[var(--be-muted)] uppercase tracking-wide whitespace-nowrap">Review Order</span>
                </div>
              </div>
            </div>

            {/* YOUR PRODUCTS panel */}
            <section className="space-y-4">
              <div className="be-card p-6" style={{ background: 'var(--be-bg)' }}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[16px] font-black uppercase tracking-widest text-[var(--be-primary)]">Your Products</h2>
                  <button
                    type="button"
                    className="be-chip flex items-center gap-2 text-[12px] font-bold px-4 py-2 hover:bg-[var(--be-border)] transition-colors"
                  >
                    <BarChart2 className="w-4 h-4 text-[var(--be-accent)]" strokeWidth={2.5} />
                    Stock levels
                  </button>
                </div>

                <div className="space-y-4">
                  {LINE_ITEMS.map((n, i) => (
                    <ProductLine key={n} showDivider={false} />
                  ))}
                </div>

                <button
                  type="button"
                  className="w-full h-14 mt-4 rounded-xl text-[15px] font-bold flex items-center justify-center gap-3 transition-all be-input border-dashed hover:border-solid hover:bg-[var(--be-surface)]"
                  style={{ color: 'var(--be-text)' }}
                >
                  <Plus className="w-5 h-5 text-[var(--be-primary)]" strokeWidth={3} /> Add another product
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* ══ Fixed GRAND TOTAL footer ══ */}
      <div
        className="fixed bottom-0 right-0 z-20 border-t-2 border-[var(--be-border)]"
        style={{ left: SIDEBAR_W, background: 'var(--be-surface)' }}
      >
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1 min-w-0 flex items-center gap-4">
              <div>
                <p className="text-[12px] font-black uppercase tracking-widest text-[var(--be-muted)] mb-1">Grand Total</p>
                <p className="text-[11px] font-bold text-[var(--be-muted)]">incl. Custom</p>
              </div>
              <p className="text-4xl font-black font-mono tracking-tight truncate text-[var(--be-primary)]">$0.00</p>
            </div>
            <button className="be-button-primary h-14 px-10 rounded-xl text-[16px] font-black uppercase tracking-wide flex items-center gap-3 shrink-0">
              Review <ArrowRight className="w-5 h-5" strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
