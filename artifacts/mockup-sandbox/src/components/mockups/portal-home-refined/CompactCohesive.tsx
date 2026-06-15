import './_group.css';
import {
  Package, Users, FlaskConical, ChevronRight,
  User, MessageCircle, Home, LogOut, LayoutDashboard,
  Syringe, Activity, Heart, BarChart2, Clock,
} from 'lucide-react';

const T = {
  bg: '#F4F4F5',
  surface: '#FFFFFF',
  surface2: '#F4F4F5',
  border: '#E4E4E7',
  text: '#1A1D1F',
  muted: '#4B5563',
  subtle: '#71717A',
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

const STATS = [
  { label: 'Active Orders',   value: 0, color: '#94A3B8', bg: 'rgba(45,107,204,0.07)',  Icon: Package },
  { label: 'Group Buys',      value: 0, color: '#94A3B8', bg: 'rgba(45,107,204,0.07)',  Icon: Users },
  { label: 'Active Protocol', value: 0, color: '#94A3B8', bg: 'rgba(22,163,74,0.07)',   Icon: Syringe },
  { label: 'Tests Logged',    value: 0, color: '#94A3B8', bg: 'rgba(124,58,237,0.07)',  Icon: FlaskConical },
];

const NAV_CARDS = [
  { id: 'orders',    title: 'My Orders',              subtitle: 'No orders yet',              Icon: Package,     iconColor: '#2D6BCC', iconBg: 'rgba(45,107,204,0.08)' },
  { id: 'groups',    title: 'Group Buys',             subtitle: 'No group buys yet',          Icon: Users,       iconColor: '#2D6BCC', iconBg: 'rgba(45,107,204,0.08)' },
  { id: 'compounds', title: 'Compounds & Protocols',  subtitle: 'No compounds logged yet',    Icon: Syringe,     iconColor: '#16A34A', iconBg: 'rgba(22,163,74,0.08)' },
  { id: 'blood',     title: 'Blood Tests',            subtitle: 'No tests logged yet',        Icon: FlaskConical,iconColor: '#2D6BCC', iconBg: 'rgba(124,58,237,0.08)' },
  { id: 'profile',   title: 'My Profile',             subtitle: 'Edit details',               Icon: User,        iconColor: '#64748B', iconBg: 'rgba(100,116,139,0.08)' },
  { id: 'telegram',  title: 'Telegram',               subtitle: 'Notifications',              Icon: MessageCircle,iconColor:'#2D6BCC', iconBg: 'rgba(45,107,204,0.08)' },
];

export function CompactCohesive() {
  return (
    <div className="flex min-h-screen" style={{ background: T.bg, fontFamily: 'Inter, sans-serif' }}>

      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col w-56 shrink-0 h-screen sticky top-0 overflow-y-auto"
        style={{ background: T.surface, borderRight: `1px solid ${T.border}` }}
      >
        {/* User area */}
        <div className="px-5 py-[18px]" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(45,107,204,0.1)' }}
            >
              <User className="w-[17px] h-[17px]" style={{ color: '#2D6BCC' }} />
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
                      className="w-full flex items-center gap-2.5 px-3 py-[7px] rounded-xl text-[13px] font-semibold text-left transition-all"
                      style={active
                        ? { background: 'rgba(45,107,204,0.1)', color: '#2D6BCC' }
                        : { color: T.muted }}
                    >
                      <Icon className="w-[15px] h-[15px] shrink-0" />
                      {item.label}
                      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 space-y-0.5" style={{ borderTop: `1px solid ${T.border}` }}>
          <button className="w-full flex items-center gap-2.5 px-3 py-[7px] rounded-xl text-[13px] font-semibold text-left transition-colors"
            style={{ color: T.muted }}>
            <Home className="w-[15px] h-[15px]" /> Back to Store
          </button>
          <button className="w-full flex items-center gap-2.5 px-3 py-[7px] rounded-xl text-[13px] font-semibold text-left transition-colors"
            style={{ color: T.muted }}>
            <LogOut className="w-[15px] h-[15px]" /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0">
        <main className="w-full max-w-3xl mx-auto px-5 py-7 space-y-5">

          {/* Group Buy banner — tighter, more integrated */}
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: T.surface, border: `1px solid ${T.border}` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(45,107,204,0.1)' }}>
                <Clock className="w-[15px] h-[15px]" style={{ color: '#2D6BCC' }} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: T.subtle }}>Group Buy Closes</p>
                <p className="text-sm font-bold" style={{ color: T.text }}>28 Oct 2026</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: T.subtle }}>Remaining</p>
              <p className="text-sm font-bold" style={{ color: '#2D6BCC' }}>6 months</p>
            </div>
          </div>

          {/* Stats row — compact, number-forward */}
          <div className="grid grid-cols-4 gap-3">
            {STATS.map(s => {
              const Icon = s.Icon;
              return (
                <div
                  key={s.label}
                  className="rounded-xl p-3.5"
                  style={{ background: T.surface, border: `1px solid ${T.border}` }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center mb-2.5"
                    style={{ background: s.bg }}
                  >
                    <Icon className="w-[15px] h-[15px]" style={{ color: s.color }} />
                  </div>
                  <p className="text-[26px] font-bold leading-none mb-1.5" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10.5px] leading-tight font-medium" style={{ color: T.subtle }}>{s.label}</p>
                </div>
              );
            })}
          </div>

          {/* Nav cards — unified full-width list including Profile & Telegram */}
          <div className="rounded-xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            {NAV_CARDS.map((card, i) => {
              const Icon = card.Icon;
              return (
                <button
                  key={card.id}
                  className="w-full flex items-center gap-4 px-4 text-left transition-colors hover:bg-slate-50/60"
                  style={{
                    borderTop: i > 0 ? `1px solid ${T.border}` : 'none',
                    paddingTop: '13px',
                    paddingBottom: '13px',
                  }}
                >
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
                  <ChevronRight className="w-4 h-4 shrink-0" style={{ color: '#C4C4C7' }} />
                </button>
              );
            })}
          </div>

        </main>
      </div>
    </div>
  );
}
