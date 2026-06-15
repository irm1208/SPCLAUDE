import {
  Package, Users, Syringe, FlaskConical,
  LayoutDashboard, Heart, MessageCircle, User,
  LogOut, ShoppingBag, ChevronRight, LineChart,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "My Account",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, active: true },
      { label: "Orders", icon: Package },
      { label: "Group Buys", icon: Users },
      { label: "Compounds", icon: Syringe },
    ],
  },
  {
    label: "Health",
    items: [
      { label: "Blood Tests", icon: FlaskConical },
      { label: "Health Intelligence", icon: Heart },
      { label: "Cycle Plotter", icon: LineChart },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Profile", icon: User },
      { label: "Telegram", icon: MessageCircle },
    ],
  },
];

const STATS = [
  { label: "Active Orders", value: 0, color: "#B45309", bg: "#FEF3C7", icon: Package },
  { label: "Group Buys", value: 0, color: "#B45309", bg: "#FEF3C7", icon: Users },
  { label: "Active Protocol", value: 0, color: "#065F46", bg: "#D1FAE5", icon: Syringe },
  { label: "Tests Logged", value: 0, color: "#7C3AED", bg: "#EDE9FE", icon: FlaskConical },
];

const SECTIONS = [
  { label: "My Orders", sub: "No orders yet", icon: Package, color: "#B45309", bg: "#FFFBEB" },
  { label: "Group Buys", sub: "No group buys yet", icon: Users, color: "#B45309", bg: "#FFFBEB" },
  { label: "Compounds & Protocols", sub: "No compounds logged yet", icon: Syringe, color: "#065F46", bg: "#F0FDF4" },
  { label: "Blood Tests", sub: "No tests logged yet", icon: FlaskConical, color: "#7C3AED", bg: "#F5F3FF" },
];

export function WarmWellness() {
  return (
    <div className="flex min-h-screen" style={{ background: "#FDF8F0", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside
        className="w-48 flex-shrink-0 flex flex-col py-6 px-3"
        style={{ background: "#FEF9EF", borderRight: "1px solid #F3E4C8" }}
      >
        <div className="mb-6 px-2">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center mb-2"
            style={{ background: "#FDE68A" }}
          >
            <User className="w-4 h-4" style={{ color: "#92400E" }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: "#78350F" }}>@iam0121</p>
          <p className="text-[11px] mt-0.5" style={{ color: "#B45309" }}>Profile Hub</p>
        </div>

        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="text-[10px] font-semibold px-2 mb-1.5 uppercase tracking-wider" style={{ color: "#D97706" }}>
              {group.label}
            </p>
            {group.items.map(({ label, icon: Icon, active }) => (
              <button
                key={label}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-[12px] text-left mb-0.5 transition-colors"
                style={
                  active
                    ? { background: "#FDE68A", color: "#78350F", fontWeight: 600 }
                    : { color: "#92400E" }
                }
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        ))}

        <div className="mt-auto space-y-0.5">
          <button className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-[12px]" style={{ color: "#92400E" }}>
            <ShoppingBag className="w-3.5 h-3.5" />
            Back to Store
          </button>
          <button className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-[12px]" style={{ color: "#92400E" }}>
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-5">
        {/* Countdown banner */}
        <div
          className="flex items-center justify-between px-4 py-3 rounded-2xl mb-6"
          style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#D97706" }}>
              Group Buy Closes
            </p>
            <p className="text-sm font-bold" style={{ color: "#78350F" }}>28 Oct 2026</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#D97706" }}>
              Remaining
            </p>
            <p className="text-sm font-bold" style={{ color: "#78350F" }}>6 months</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {STATS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-2xl p-4 flex flex-col gap-2"
                style={{ background: "#FFFFFF", border: "1px solid #F3E4C8", boxShadow: "0 2px 8px rgba(180,83,9,0.06)" }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: s.bg }}
                >
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <p className="text-3xl font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[11px] leading-tight" style={{ color: "#92400E" }}>{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Section cards */}
        <div className="space-y-2.5 mb-4">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.label}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-left"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #F3E4C8",
                  boxShadow: "0 1px 4px rgba(180,83,9,0.05)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: s.bg }}
                >
                  <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" style={{ color: s.color }} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold" style={{ color: "#451A03" }}>{s.label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "#92400E" }}>{s.sub}</p>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#D97706" }} />
              </button>
            );
          })}
        </div>

        {/* Profile / Telegram */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "My Profile", sub: "Edit details", icon: User, color: "#78350F", bg: "#FEF3C7" },
            { label: "Telegram", sub: "Notifications", icon: MessageCircle, color: "#B45309", bg: "#FFFBEB" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className="flex flex-col gap-3 p-4 rounded-2xl text-left"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #F3E4C8",
                  boxShadow: "0 1px 4px rgba(180,83,9,0.05)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: item.bg }}
                >
                  <Icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#451A03" }}>{item.label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "#92400E" }}>{item.sub}</p>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
