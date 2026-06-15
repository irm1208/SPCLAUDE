import './_group.css';
import {
  Package, Users, FlaskConical, ChevronRight,
  User, MessageCircle, Home, LogOut, LayoutDashboard,
  Syringe, Activity, BarChart2, Clock, ArrowRight,
  ShoppingBag,
} from 'lucide-react';

const T = {
  bg: '#F0F0F2',
  surface: '#FFFFFF',
  surface2: '#F4F4F5',
  border: '#E4E4E7',
  text: '#1A1D1F',
  muted: '#4B5563',
  subtle: '#8B92A0',
};

const NAV_GROUPS = [
  {
    label: 'My Account',
    items: [
      { id: 'home',      label: 'Dashboard',   Icon: LayoutDashboard, active: true },
      { id: 'orders',    label: 'Orders',       Icon: Package },
      { id: 'groups',    label: 'Group Buys',   Icon: Users },
      { id: 'compounds', label: 'Compounds',    Icon: Syringe },
    ],
  },
  {
    label: 'Health',
    items: [
      { id: 'blood',     label: 'Blood Tests',         Icon: FlaskConical },
      { id: 'intel',     label: 'Health Intelligence', Icon: Activity },
      { id: 'plotter',   label: 'Cycle Plotter',       Icon: BarChart2 },
    ],
  },
  {
    label: 'Settings',
    items: [
      { id: 'profile',   label: 'Profile',    Icon: User },
      { id: 'telegram',  label: 'Telegram',   Icon: MessageCircle },
    ],
  },
];

type Stat = {
  label: string;
  value: number;
  color: string;
  bg: string;
  pill: string;
  pillText: string;
  Icon: React.ElementType;
};

const STATS: Stat[] = [
  {
    label: 'Active Orders',
    value: 0,
    color: '#2D6BCC',
    bg: 'rgba(45,107,204,0.07)',
    pill: 'rgba(45,107,204,0.1)',
    pillText: '#2D6BCC',
    Icon: Package,
  },
  {
    label: 'Group Buys',
    value: 0,
    color: '#2D6BCC',
    bg: 'rgba(45,107,204,0.07)',
    pill: 'rgba(45,107,204,0.1)',
    pillText: '#2D6BCC',
    Icon: Users,
  },
  {
    label: 'Active Protocol',
    value: 0,
    color: '#16A34A',
    bg: 'rgba(22,163,74,0.07)',
    pill: 'rgba(22,163,74,0.1)',
    pillText: '#16A34A',
    Icon: Syringe,
  },
  {
    label: 'Tests Logged',
    value: 0,
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.07)',
    pill: 'rgba(124,58,237,0.1)',
    pillText: '#7C3AED',
    Icon: FlaskConical,
  },
];

const ACTIVITY_CARDS = [
  {
    id: 'orders',
    title: 'My Orders',
    subtitle: 'No orders yet',
    callout: null,
    Icon: Package,
    iconColor: '#2D6BCC',
    iconBg: 'rgba(45,107,204,0.08)',
    accentLine: '#2D6BCC',
    cta: 'View orders',
  },
  {
    id: 'groups',
    title: 'Group Buys',
    subtitle: 'No group buys yet',
    callout: null,
    Icon: Users,
    iconColor: '#2D6BCC',
    iconBg: 'rgba(45,107,204,0.08)',
    accentLine: '#2D6BCC',
    cta: 'View group buys',
  },
  {
    id: 'compounds',
    title: 'Compounds & Protocols',
    subtitle: 'No compounds logged yet',
    callout: null,
    Icon: Syringe,
    iconColor: '#16A34A',
    iconBg: 'rgba(22,163,74,0.08)',
    accentLine: '#16A34A',
    cta: 'Log compound',
  },
  {
    id: 'blood',
    title: 'Blood Tests',
    subtitle: 'No tests logged yet',
    callout: null,
    Icon: FlaskConical,
    iconColor: '#7C3AED',
    iconBg: 'rgba(124,58,237,0.08)',
    accentLine: '#7C3AED',
    cta: 'Log test',
  },
];

const SETTINGS_CARDS = [
  { id: 'profile',  label: 'My Profile',  sub: 'Edit details',    Icon: User,          color: '#64748B', bg: 'rgba(100,116,139,0.08)' },
  { id: 'telegram', label: 'Telegram',    sub: 'Notifications',   Icon: MessageCircle, color: '#2D6BCC', bg: 'rgba(45,107,204,0.08)'  },
];

export function RicherAtAGlance() {
  return (
    <div className="flex min-h-screen" style={{ background: T.bg, fontFamily: 'Inter, sans-serif' }}>

      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col w-56 shrink-0 h-screen sticky top-0 overflow-y-auto"
        style={{ background: T.surface, borderRight: `1px solid ${T.border}` }}
      >
        {/* User area with subtle gradient accent */}
        <div
          className="px-5 py-5"
          style={{ borderBottom: `1px solid ${T.border}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(45,107,204,0.15), rgba(45,107,204,0.08))' }}
            >
              <User className="w-4 h-4" style={{ color: '#2D6BCC' }} />
            </div>
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold truncate" style={{ color: T.text }}>@iam0121</p>
              <p className="text-[11px] mt-0.5" style={{ color: T.subtle }}>Profile Hub</p>
            </div>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[10px] font-bold uppercase tracking-widest px-2 mb-1.5" style={{ color: T.subtle }}>
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const Icon = item.Icon;
                  const active = item.active;
                  return (
                    <button
                      key={item.id}
                      className="w-full flex items-center gap-2.5 px-3 py-[7px] rounded-xl text-[13px] font-semibold text-left"
                      style={active
                        ? { background: 'rgba(45,107,204,0.1)', color: '#2D6BCC' }
                        : { color: T.muted }}
                    >
                      <Icon className="w-[15px] h-[15px] shrink-0" />
                      {item.label}
                      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: '#2D6BCC' }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 space-y-0.5" style={{ borderTop: `1px solid ${T.border}` }}>
          <button className="w-full flex items-center gap-2.5 px-3 py-[7px] rounded-xl text-[13px] font-semibold text-left"
            style={{ color: T.muted }}>
            <Home className="w-[15px] h-[15px]" /> Back to Store
          </button>
          <button className="w-full flex items-center gap-2.5 px-3 py-[7px] rounded-xl text-[13px] font-semibold text-left"
            style={{ color: T.muted }}>
            <LogOut className="w-[15px] h-[15px]" /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0">
        <main className="w-full max-w-3xl mx-auto px-5 py-7 space-y-6">

          {/* Group Buy banner — prominent priority card */}
          <div
            className="rounded-xl px-5 py-4 flex items-center justify-between"
            style={{
              background: 'linear-gradient(135deg, rgba(27,58,122,0.04) 0%, rgba(45,107,204,0.06) 100%)',
              border: `1px solid rgba(45,107,204,0.18)`,
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(45,107,204,0.12)' }}
              >
                <ShoppingBag className="w-5 h-5" style={{ color: '#2D6BCC' }} />
              </div>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-wide mb-0.5" style={{ color: '#2D6BCC' }}>
                  Group Buy Closes
                </p>
                <p className="text-[15px] font-bold" style={{ color: T.text }}>28 Oct 2026</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: T.subtle }}>Remaining</p>
              <p className="text-[15px] font-bold" style={{ color: '#2D6BCC' }}>6 months</p>
            </div>
          </div>

          {/* Stats — colored card tints, larger numbers */}
          <div className="grid grid-cols-4 gap-3">
            {STATS.map(s => {
              const Icon = s.Icon;
              const empty = s.value === 0;
              return (
                <div
                  key={s.label}
                  className="rounded-xl p-4"
                  style={{
                    background: empty ? T.surface : s.bg,
                    border: `1px solid ${empty ? T.border : 'transparent'}`,
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: empty ? T.surface2 : 'rgba(255,255,255,0.6)' }}
                  >
                    <Icon className="w-[15px] h-[15px]" style={{ color: empty ? '#C4C4C7' : s.color }} />
                  </div>
                  <p className="text-[28px] font-bold leading-none mb-1.5" style={{ color: empty ? '#C4C4C7' : s.color }}>
                    {s.value}
                  </p>
                  <p className="text-[10.5px] font-medium leading-tight" style={{ color: empty ? T.subtle : s.pillText }}>
                    {s.label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Activity section */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3 px-0.5" style={{ color: T.subtle }}>
              Activity
            </p>
            <div className="space-y-2">
              {ACTIVITY_CARDS.map(card => {
                const Icon = card.Icon;
                return (
                  <button
                    key={card.id}
                    className="w-full rounded-xl overflow-hidden text-left transition-all hover:shadow-sm"
                    style={{ background: T.surface, border: `1px solid ${T.border}` }}
                  >
                    <div className="flex items-center gap-4 px-4 py-[13px]">
                      {/* Left accent bar */}
                      <div
                        className="absolute left-0 w-0.5 h-8 rounded-full"
                        style={{ background: card.accentLine }}
                      />
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: card.iconBg }}
                      >
                        <Icon className="w-[18px] h-[18px]" style={{ color: card.iconColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-bold" style={{ color: T.text }}>{card.title}</p>
                        <p className="text-[12px] mt-0.5" style={{ color: T.subtle }}>{card.subtitle}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: card.iconBg, color: card.iconColor }}
                        >
                          {card.cta}
                        </span>
                        <ChevronRight className="w-[15px] h-[15px]" style={{ color: '#C4C4C7' }} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Settings shortcuts — 2-column, richer */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3 px-0.5" style={{ color: T.subtle }}>
              Settings
            </p>
            <div className="grid grid-cols-2 gap-3">
              {SETTINGS_CARDS.map(item => {
                const Icon = item.Icon;
                return (
                  <button
                    key={item.id}
                    className="rounded-xl px-4 py-4 text-left flex items-center gap-3 transition-all hover:shadow-sm"
                    style={{ background: T.surface, border: `1px solid ${T.border}` }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: item.bg }}
                    >
                      <Icon className="w-[18px] h-[18px]" style={{ color: item.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold truncate" style={{ color: T.text }}>{item.label}</p>
                      <p className="text-[11.5px] mt-0.5" style={{ color: T.subtle }}>{item.sub}</p>
                    </div>
                    <ArrowRight className="w-[13px] h-[13px] shrink-0" style={{ color: '#D4D4D8' }} />
                  </button>
                );
              })}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
