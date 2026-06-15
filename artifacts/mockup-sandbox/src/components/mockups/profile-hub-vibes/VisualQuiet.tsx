import {
  Package, Users, Syringe, FlaskConical,
  LayoutDashboard, Heart, MessageCircle, User,
  LogOut, ShoppingBag, ArrowRight, LineChart,
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

const SECTIONS = [
  { label: "My Orders", sub: "No orders yet", icon: Package },
  { label: "Group Buys", sub: "No group buys yet", icon: Users },
  { label: "Compounds & Protocols", sub: "No compounds logged yet", icon: Syringe },
  { label: "Blood Tests", sub: "No tests logged yet", icon: FlaskConical },
];

export function VisualQuiet() {
  return (
    <div
      className="flex min-h-screen"
      style={{ background: "#FFFFFF", color: "#0F172A", fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* Sidebar */}
      <aside className="w-44 flex-shrink-0 flex flex-col py-7 px-4">
        <div className="mb-7">
          <p className="text-sm font-medium" style={{ color: "#0F172A" }}>@iam0121</p>
          <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>Profile Hub</p>
        </div>

        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#CBD5E1" }}>
              {group.label}
            </p>
            {group.items.map(({ label, icon: Icon, active }) => (
              <button
                key={label}
                className="w-full flex items-center gap-2 py-1.5 text-[12px] text-left"
                style={
                  active
                    ? { color: "#6366F1", fontWeight: 500 }
                    : { color: "#64748B" }
                }
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        ))}

        <div className="mt-auto space-y-0.5">
          <button className="w-full flex items-center gap-2 py-1.5 text-[12px] text-left" style={{ color: "#94A3B8" }}>
            <ShoppingBag className="w-3.5 h-3.5" />
            Back to Store
          </button>
          <button className="w-full flex items-center gap-2 py-1.5 text-[12px] text-left" style={{ color: "#94A3B8" }}>
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Divider */}
      <div className="w-px self-stretch" style={{ background: "#F1F5F9" }} />

      {/* Main */}
      <main className="flex-1 overflow-auto px-6 py-7">
        {/* Countdown */}
        <p className="text-xs mb-7" style={{ color: "#94A3B8" }}>
          Group buy closes{" "}
          <span style={{ color: "#475569" }}>28 Oct 2026</span>
          {" "}· 6 months remaining
        </p>

        {/* Stats — inline, typographic */}
        <div
          className="flex gap-6 mb-8 pb-6"
          style={{ borderBottom: "1px solid #F1F5F9" }}
        >
          {[
            { label: "Active Orders", value: 0 },
            { label: "Group Buys", value: 0 },
            { label: "Active Protocol", value: 0 },
            { label: "Tests Logged", value: 0 },
          ].map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5">
              <span className="text-2xl font-semibold tabular-nums" style={{ color: "#6366F1" }}>
                {s.value}
              </span>
              <span className="text-[10px] leading-tight" style={{ color: "#94A3B8" }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Section list */}
        <div className="space-y-0">
          {SECTIONS.map((s, i) => {
            const Icon = s.icon;
            return (
              <button
                key={s.label}
                className="w-full flex items-center gap-3 py-4 text-left transition-colors hover:bg-slate-50"
                style={{
                  borderBottom: i < SECTIONS.length - 1 ? "1px solid #F1F5F9" : "none",
                }}
              >
                <Icon className="w-4 h-4 shrink-0" style={{ color: "#6366F1" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: "#0F172A" }}>{s.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>{s.sub}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: "#CBD5E1" }} />
              </button>
            );
          })}
        </div>

        {/* Profile / Telegram */}
        <div
          className="flex gap-6 mt-6 pt-6"
          style={{ borderTop: "1px solid #F1F5F9" }}
        >
          {[
            { label: "My Profile", sub: "Edit details", icon: User },
            { label: "Telegram", sub: "Notifications", icon: MessageCircle },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className="flex items-center gap-2.5 text-left"
              >
                <Icon className="w-4 h-4 shrink-0" style={{ color: "#6366F1" }} />
                <div>
                  <p className="text-sm" style={{ color: "#0F172A" }}>{item.label}</p>
                  <p className="text-xs" style={{ color: "#94A3B8" }}>{item.sub}</p>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
