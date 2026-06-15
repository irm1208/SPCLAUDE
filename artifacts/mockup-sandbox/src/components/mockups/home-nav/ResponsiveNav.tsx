import { useState } from "react";
import {
  Home, ShoppingBag, Users, HeartPulse, User,
  Package, Syringe, FlaskConical, Scale, LineChart,
  TestTube, ChevronRight, Bell, TrendingUp, Menu, X,
  MessageCircle, History, Search, Settings, Star,
  LayoutDashboard, LogOut, ChevronDown
} from "lucide-react";

type Section = "home" | "shop" | "orders" | "groups" | "health" | "compounds" | "blood-tests" | "glp1" | "plotter" | "lab-pool" | "profile";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { id: "home" as Section,    label: "Hub",          icon: LayoutDashboard },
    ],
  },
  {
    label: "Shop",
    items: [
      { id: "shop" as Section,    label: "Browse",       icon: ShoppingBag },
      { id: "orders" as Section,  label: "My Orders",    icon: Package },
      { id: "groups" as Section,  label: "Group Buys",   icon: Users },
    ],
  },
  {
    label: "Health",
    items: [
      { id: "health" as Section,      label: "Health Hub",    icon: HeartPulse },
      { id: "blood-tests" as Section, label: "Blood Tests",   icon: FlaskConical },
      { id: "compounds" as Section,   label: "Compounds",     icon: Syringe },
      { id: "glp1" as Section,        label: "GLP-1 Tracker", icon: Scale },
      { id: "plotter" as Section,     label: "Cycle Plotter", icon: LineChart },
    ],
  },
  {
    label: "Community",
    items: [
      { id: "lab-pool" as Section, label: "Lab Pool",  icon: TestTube },
    ],
  },
];

const BOTTOM_TABS: { id: Section; label: string; icon: React.FC<any> }[] = [
  { id: "home",   label: "Home",   icon: LayoutDashboard },
  { id: "shop",   label: "Shop",   icon: ShoppingBag },
  { id: "groups", label: "Groups", icon: Users },
  { id: "health", label: "Health", icon: HeartPulse },
  { id: "profile",label: "Profile",icon: User },
];

const PRODUCTS = [
  { name: "BPC-157 5mg",       price: "£28", badge: "Popular", badgeColor: "#F97316" },
  { name: "TB-500 5mg",        price: "£30", badge: null,       badgeColor: "" },
  { name: "Semaglutide 5mg",   price: "£40", badge: "New",      badgeColor: "#16A34A" },
  { name: "Tirzepatide 10mg",  price: "£60", badge: "Sale",     badgeColor: "#7C3AED" },
  { name: "BPC+TB Combo",      price: "£52", badge: null,       badgeColor: "" },
  { name: "Ipamorelin 2mg",    price: "£22", badge: null,       badgeColor: "" },
];

const ORDERS = [
  { id: "#1094", name: "BPC-157 5mg",      status: "Dispatched", color: "#16A34A", date: "Today"    },
  { id: "#1089", name: "TB-500 5mg",       status: "Processing", color: "#F97316", date: "Yesterday"},
  { id: "#1081", name: "Semaglutide 5mg",  status: "Delivered",  color: "#6B7280", date: "Apr 18"   },
];

const GROUPS = [
  { name: "BPC-157 Group Buy", org: "@ukpeptides",     spots: "12 left", pct: 68 },
  { name: "TB-500 Pool",       org: "@bio_collective", spots: "5 left",  pct: 85 },
  { name: "Sema + Tirz Bundle",org: "@ukpeptides",     spots: "28 left", pct: 22 },
];

const HEALTH_ITEMS = [
  { id: "blood-tests" as Section, label: "Blood Tests",    sub: "2 results",        icon: FlaskConical, color: "#7C3AED" },
  { id: "glp1" as Section,        label: "GLP-1 Tracker",  sub: "Last shot 3d ago", icon: Scale,        color: "#16A34A" },
  { id: "compounds" as Section,   label: "My Compounds",   sub: "3 active",         icon: Syringe,      color: "#F97316" },
  { id: "plotter" as Section,     label: "Cycle Plotter",  sub: "Active protocol",  icon: LineChart,    color: "#3B82F6" },
  { id: "lab-pool" as Section,    label: "Lab Pool",       sub: "Contribute tests", icon: TestTube,     color: "#F59E0B" },
  { id: "health" as Section,      label: "Health Insights",sub: "Trends",           icon: TrendingUp,   color: "#EC4899" },
];

function HubHome({ setSection }: { setSection: (s: Section) => void }) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { v: "12", l: "Orders", Icon: Package, c: "#F97316", id: "orders" as Section },
          { v: "3",  l: "Group Buys", Icon: Users, c: "#3B82F6", id: "groups" as Section },
          { v: "2",  l: "Blood Tests", Icon: FlaskConical, c: "#7C3AED", id: "blood-tests" as Section },
        ].map(s => (
          <button key={s.l} onClick={() => setSection(s.id)}
            className="bg-white rounded-2xl border border-gray-100 p-4 text-center hover:border-gray-200 hover:shadow-sm transition-all group">
            <s.Icon className="w-5 h-5 mx-auto mb-2" style={{ color: s.c }} />
            <p className="text-2xl font-bold text-gray-900">{s.v}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.l}</p>
          </button>
        ))}
      </div>

      {/* Featured */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-5">
        <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-1">Featured Deal</p>
        <h3 className="text-base font-bold text-gray-900">BPC-157 Bundle — Save 15%</h3>
        <p className="text-sm text-gray-500 mb-3">Order 3+ vials this week</p>
        <button onClick={() => setSection("shop")}
          className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors">
          Shop now
        </button>
      </div>

      {/* Recent order */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Recent Order</p>
          <button onClick={() => setSection("orders")} className="text-xs text-orange-500 hover:underline">View all</button>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 hover:border-gray-200 transition-colors">
          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <Package className="w-4.5 h-4.5 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">BPC-157 5mg</p>
            <p className="text-xs text-gray-400">#1094 · Today</p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-600">Dispatched</span>
        </div>
      </div>

      {/* Quick access */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Quick Access</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Browse Shop",  icon: ShoppingBag, color: "#F97316", bg: "#FFF7ED", id: "shop" as Section },
            { label: "Group Buys",   icon: Users,       color: "#3B82F6", bg: "#EFF6FF", id: "groups" as Section },
            { label: "Blood Tests",  icon: FlaskConical,color: "#7C3AED", bg: "#F5F3FF", id: "blood-tests" as Section },
            { label: "GLP-1 Tracker",icon: Scale,       color: "#16A34A", bg: "#F0FDF4", id: "glp1" as Section },
          ].map(q => (
            <button key={q.label} onClick={() => setSection(q.id)}
              className="flex items-center gap-2.5 rounded-xl border border-gray-100 p-3 hover:border-gray-200 hover:shadow-sm transition-all"
              style={{ background: q.bg }}>
              <q.icon className="w-4 h-4 flex-shrink-0" style={{ color: q.color }} />
              <span className="text-xs font-semibold text-gray-700">{q.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShopContent() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {["All", "Peptides", "GLP-1", "TRT", "Group Buys"].map((c, i) => (
          <button key={c} className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${i === 0 ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>{c}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {PRODUCTS.map(p => (
          <div key={p.name} className="bg-white border border-gray-100 rounded-2xl p-4 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer">
            {p.badge && (
              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full mb-2 inline-block" style={{ background: p.badgeColor + "18", color: p.badgeColor }}>{p.badge}</span>
            )}
            <div className="w-full h-16 bg-gray-50 rounded-xl mb-3 flex items-center justify-center">
              <Syringe className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-800 leading-tight">{p.name}</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-base font-bold text-orange-500">{p.price}</p>
              <button className="text-[10px] font-bold bg-orange-50 text-orange-500 hover:bg-orange-500 hover:text-white px-2.5 py-1 rounded-full transition-colors">Add</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrdersContent() {
  return (
    <div className="space-y-3">
      {ORDERS.map(o => (
        <div key={o.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 hover:border-gray-200 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{o.name}</p>
            <p className="text-xs text-gray-400">{o.id} · {o.date}</p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: o.color + "15", color: o.color }}>{o.status}</span>
        </div>
      ))}
    </div>
  );
}

function GroupsContent() {
  return (
    <div className="space-y-3">
      {GROUPS.map(g => (
        <div key={g.name} className="bg-white border border-gray-100 rounded-2xl p-4 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">{g.name}</p>
              <p className="text-xs text-gray-400">{g.org}</p>
            </div>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full flex-shrink-0 ml-2">{g.spots}</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${g.pct}%` }} />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[10px] text-gray-400">{g.pct}% filled</p>
            <button className="text-[10px] font-bold text-blue-600 hover:underline">Join pool</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function HealthContent({ setSection }: { setSection: (s: Section) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {HEALTH_ITEMS.map(h => (
        <button key={h.id} onClick={() => setSection(h.id)}
          className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 text-left hover:border-gray-200 hover:shadow-sm transition-all">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: h.color + "15" }}>
            <h.icon className="w-5 h-5" style={{ color: h.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{h.label}</p>
            <p className="text-xs text-gray-400">{h.sub}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
        </button>
      ))}
    </div>
  );
}

function ProfileContent() {
  return (
    <div className="space-y-4 max-w-md">
      <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
          <User className="w-7 h-7 text-orange-500" />
        </div>
        <div>
          <p className="text-base font-bold text-gray-900">@peptide_pete</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <p className="text-xs text-gray-400">Member since Jan 2025</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[{ v: "12", l: "Orders" }, { v: "3", l: "Group Buys" }, { v: "2", l: "Blood Tests" }].map(s => (
          <div key={s.l} className="bg-white border border-gray-100 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-gray-900">{s.v}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.l}</p>
          </div>
        ))}
      </div>
      {[
        { label: "Account Settings", icon: Settings },
        { label: "Notifications", icon: Bell },
        { label: "My History", icon: History },
        { label: "Sign out", icon: LogOut },
      ].map(item => (
        <button key={item.label} className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-xl text-left hover:border-gray-200 hover:bg-gray-50 transition-colors">
          <item.icon className="w-4 h-4 text-gray-400" />
          <span className="flex-1 text-sm text-gray-700">{item.label}</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>
      ))}
    </div>
  );
}

const SECTION_TITLES: Record<Section, string> = {
  home: "My Hub", shop: "Browse", orders: "My Orders",
  groups: "Group Buys", health: "Health", compounds: "My Compounds",
  "blood-tests": "Blood Tests", glp1: "GLP-1 Tracker", plotter: "Cycle Plotter",
  "lab-pool": "Lab Pool", profile: "Profile",
};

export function ResponsiveNav() {
  const [section, setSection] = useState<Section>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allNavItems = NAV_GROUPS.flatMap(g => g.items);

  const SectionContent = () => {
    switch (section) {
      case "home":        return <HubHome setSection={setSection} />;
      case "shop":        return <ShopContent />;
      case "orders":      return <OrdersContent />;
      case "groups":      return <GroupsContent />;
      case "health":      return <HealthContent setSection={setSection} />;
      case "profile":     return <ProfileContent />;
      default:            return (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <p className="text-sm">{SECTION_TITLES[section]} — coming soon</p>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">

      {/* ── DESKTOP & TABLET: top header ─────────────────────────────── */}
      <header className="hidden sm:flex items-center gap-4 px-6 py-3.5 bg-white border-b border-gray-100 sticky top-0 z-30">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mr-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
            <span className="text-xs font-black text-white">PA</span>
          </div>
          <span className="text-sm font-bold hidden lg:block">Peps Anonymous</span>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-xs">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-400">Search products...</span>
          </div>
        </div>

        <div className="flex-1" />

        {/* Nav pills — tablet: icon only; desktop: icon + label */}
        <nav className="flex items-center gap-1">
          {[
            { id: "home" as Section, label: "Hub", icon: LayoutDashboard },
            { id: "shop" as Section, label: "Shop", icon: ShoppingBag },
            { id: "orders" as Section, label: "Orders", icon: Package },
            { id: "groups" as Section, label: "Groups", icon: Users },
            { id: "health" as Section, label: "Health", icon: HeartPulse },
          ].map(({ id, label, icon: Icon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${active ? "bg-orange-500 text-white" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden lg:block">{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Avatar */}
        <button onClick={() => setSection("profile")} className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 hover:bg-orange-200 transition-colors ml-2">
          <User className="w-4 h-4 text-orange-600" />
        </button>

        <button className="relative w-8 h-8 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors flex-shrink-0">
          <Bell className="w-4 h-4 text-gray-500" />
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-orange-500 rounded-full border-2 border-white" />
        </button>
      </header>

      {/* ── MOBILE: top bar ──────────────────────────────────────────── */}
      <header className="sm:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-6 h-6 rounded-lg bg-orange-500 flex items-center justify-center">
            <span className="text-[10px] font-black text-white">PA</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-400">Search...</span>
          </div>
        </div>
        <button className="relative w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
          <Bell className="w-4 h-4 text-gray-500" />
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-orange-500 rounded-full border-2 border-white" />
        </button>
      </header>

      {/* ── BODY ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Desktop: left sidebar */}
        <aside className="hidden lg:flex w-56 flex-shrink-0 flex-col bg-white border-r border-gray-100 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
          <nav className="flex-1 px-3 py-4 space-y-5">
            {NAV_GROUPS.map(group => (
              <div key={group.label}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2 mb-1">{group.label}</p>
                {group.items.map(({ id, label, icon: Icon }) => {
                  const active = section === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setSection(id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium mb-0.5 transition-colors text-left ${
                        active ? "bg-orange-50 text-orange-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="px-3 pb-4 pt-2 border-t border-gray-100">
            <button onClick={() => setSection("profile")} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-orange-600" />
              </div>
              <span className="text-sm text-gray-700 font-medium">@peptide_pete</span>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-24 sm:pb-8">
          <div className="px-4 sm:px-6 py-5 max-w-3xl mx-auto lg:mx-0 lg:max-w-none">
            <h2 className="text-xl font-bold text-gray-900 mb-5">{SECTION_TITLES[section]}</h2>
            <SectionContent />
          </div>
        </main>
      </div>

      {/* ── MOBILE: bottom tab bar ───────────────────────────────────── */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 flex bg-white border-t border-gray-100"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {BOTTOM_TABS.map(({ id, label, icon: Icon }) => {
          const active = section === id;
          return (
            <button
              key={id}
              onClick={() => setSection(id)}
              className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative transition-colors"
            >
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-orange-500" />
              )}
              <Icon
                className="w-5 h-5 transition-colors"
                strokeWidth={active ? 2.25 : 1.75}
                style={{ color: active ? "#f97316" : "#9ca3af" }}
              />
              <span
                className="text-[10px] font-semibold transition-colors"
                style={{ color: active ? "#f97316" : "#9ca3af" }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
