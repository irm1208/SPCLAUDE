import {
  Package, Users, Syringe, FlaskConical,
  LayoutDashboard, Settings, Heart, MessageCircle, User,
  LogOut, ShoppingBag, ChevronRight, LineChart,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "MY ACCOUNT",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, active: true },
      { label: "Orders", icon: Package },
      { label: "Group Buys", icon: Users },
      { label: "Compounds", icon: Syringe },
    ],
  },
  {
    label: "HEALTH",
    items: [
      { label: "Blood Tests", icon: FlaskConical },
      { label: "Health Intelligence", icon: Heart },
      { label: "Cycle Plotter", icon: LineChart },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { label: "Profile", icon: User },
      { label: "Telegram", icon: MessageCircle },
    ],
  },
];

const STATS = [
  { label: "ACTIVE ORDERS", value: 0, color: "#60A5FA" },
  { label: "GROUP BUYS", value: 0, color: "#60A5FA" },
  { label: "ACTIVE PROTOCOL", value: 0, color: "#34D399" },
  { label: "TESTS LOGGED", value: 0, color: "#A78BFA" },
];

const SECTIONS = [
  { label: "My Orders", sub: "No orders yet", icon: Package, accent: "#60A5FA" },
  { label: "Group Buys", sub: "No group buys yet", icon: Users, accent: "#60A5FA" },
  { label: "Compounds & Protocols", sub: "No compounds logged yet", icon: Syringe, accent: "#34D399" },
  { label: "Blood Tests", sub: "No tests logged yet", icon: FlaskConical, accent: "#A78BFA" },
];

export function ClinicalPrecision() {
  return (
    <div
      className="flex min-h-screen font-mono"
      style={{ background: "#080F1E", color: "#E2E8F0", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
    >
      {/* Sidebar */}
      <aside
        className="w-48 flex-shrink-0 flex flex-col py-6 px-3"
        style={{ background: "#0D1729", borderRight: "1px solid #1E2D4A" }}
      >
        <div className="mb-6 px-2">
          <p className="text-[10px] tracking-widest" style={{ color: "#4B6FA8" }}>PATIENT</p>
          <p className="text-sm font-bold mt-0.5" style={{ color: "#E2E8F0" }}>@iam0121</p>
          <p className="text-[10px] mt-0.5" style={{ color: "#4B6FA8" }}>Profile Hub</p>
        </div>

        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="text-[9px] tracking-widest px-2 mb-2" style={{ color: "#2D4A70" }}>
              {group.label}
            </p>
            {group.items.map(({ label, icon: Icon, active }) => (
              <button
                key={label}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-[11px] text-left mb-0.5 transition-colors"
                style={
                  active
                    ? { background: "rgba(96,165,250,0.12)", color: "#60A5FA", borderLeft: "2px solid #60A5FA" }
                    : { color: "#4B6FA8" }
                }
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        ))}

        <div className="mt-auto space-y-1">
          <button className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px]" style={{ color: "#4B6FA8" }}>
            <ShoppingBag className="w-3.5 h-3.5" />
            Back to Store
          </button>
          <button className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px]" style={{ color: "#4B6FA8" }}>
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-5">
        {/* Countdown banner */}
        <div
          className="flex items-center justify-between px-4 py-2.5 rounded mb-6 text-[11px] tracking-wide"
          style={{ background: "#0D1729", border: "1px solid #1E2D4A" }}
        >
          <span style={{ color: "#4B6FA8" }}>
            ◎ GROUP BUY CLOSES &nbsp;
            <span style={{ color: "#E2E8F0", fontWeight: 700 }}>28 Oct 2026</span>
          </span>
          <span
            className="px-2 py-0.5 rounded text-[10px] font-bold"
            style={{ background: "rgba(96,165,250,0.12)", color: "#60A5FA", border: "1px solid #1E2D4A" }}
          >
            REMAINING: 6 months
          </span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded p-4"
              style={{ background: "#0D1729", border: "1px solid #1E2D4A", borderTop: `2px solid ${s.color}` }}
            >
              <p
                className="text-4xl font-black tabular-nums leading-none"
                style={{ color: s.color }}
              >
                {s.value}
              </p>
              <p className="text-[9px] tracking-widest mt-2" style={{ color: "#2D4A70" }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Section cards */}
        <div className="space-y-2 mb-4">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.label}
                className="w-full flex items-center gap-3 px-4 py-3 rounded text-left transition-colors"
                style={{
                  background: "#0D1729",
                  border: "1px solid #1E2D4A",
                }}
              >
                <Icon className="w-4 h-4 shrink-0" style={{ color: s.accent }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold" style={{ color: "#CBD5E1" }}>{s.label}</p>
                  <p className="text-[10px] mt-0.5 tabular-nums" style={{ color: "#2D4A70" }}>{s.sub}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "#2D4A70" }} />
              </button>
            );
          })}
        </div>

        {/* Profile / Telegram row */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "My Profile", sub: "Edit details", icon: User, accent: "#94A3B8" },
            { label: "Telegram", sub: "Notifications", icon: MessageCircle, accent: "#60A5FA" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className="flex flex-col gap-3 p-4 rounded text-left"
                style={{ background: "#0D1729", border: "1px solid #1E2D4A" }}
              >
                <Icon className="w-4 h-4" style={{ color: item.accent }} />
                <div>
                  <p className="text-[12px] font-bold" style={{ color: "#CBD5E1" }}>{item.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#2D4A70" }}>{item.sub}</p>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
