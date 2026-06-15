import { useState } from "react";
import {
  ShoppingBag, Package, HeartPulse, User, Menu, X,
  Syringe, FlaskConical, Scale, LineChart, Users,
  MessageCircle, History, TestTube, ChevronRight,
  TrendingUp, Star, Clock, LayoutDashboard
} from "lucide-react";

type Tab = "shop" | "orders" | "health" | "profile";
type More = "groups" | "compounds" | "blood-tests" | "glp1" | "plotter" | "telegram" | "history" | "lab-pool";

const MORE_ITEMS: { id: More; label: string; icon: React.FC<any>; sub: string }[] = [
  { id: "groups",      label: "Group Buys",     icon: Users,         sub: "Join a group purchase" },
  { id: "compounds",   label: "My Compounds",   icon: Syringe,       sub: "Track your stack" },
  { id: "blood-tests", label: "Blood Tests",    icon: FlaskConical,  sub: "Upload & view results" },
  { id: "glp1",        label: "GLP-1 Tracker",  icon: Scale,         sub: "Log injections & weight" },
  { id: "plotter",     label: "Cycle Plotter",  icon: LineChart,     sub: "Visualise your protocol" },
  { id: "lab-pool",    label: "Lab Pool",        icon: TestTube,      sub: "Contribute to testing" },
  { id: "telegram",    label: "Telegram",        icon: MessageCircle, sub: "Community & alerts" },
  { id: "history",     label: "My History",      icon: History,       sub: "Past activity" },
];

const SHOP_ITEMS = [
  { name: "BPC-157 5mg", price: "£28", badge: "Popular", badgeColor: "#F97316" },
  { name: "TB-500 5mg",  price: "£30", badge: "New",     badgeColor: "#16A34A" },
  { name: "Semaglutide 5mg", price: "£40", badge: null,  badgeColor: "" },
  { name: "Tirzepatide 10mg", price: "£60", badge: "Sale", badgeColor: "#7C3AED" },
];

export function ShopLed() {
  const [tab, setTab] = useState<Tab>("shop");
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreActive, setMoreActive] = useState<More | null>(null);

  const TABS = [
    { id: "shop" as Tab,    label: "Shop",    icon: ShoppingBag },
    { id: "orders" as Tab,  label: "Orders",  icon: Package },
    { id: "health" as Tab,  label: "Health",  icon: HeartPulse },
    { id: "profile" as Tab, label: "Profile", icon: User },
  ];

  return (
    <div className="w-[390px] h-[844px] bg-[#0d0d0d] text-white flex flex-col overflow-hidden relative font-sans">
      {/* Status bar */}
      <div className="flex justify-between items-center px-6 pt-3 pb-1 text-xs text-white/50 flex-shrink-0">
        <span>9:41</span>
        <span>●●● ▲</span>
      </div>

      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-xs text-white/40">Peps Anonymous</p>
          <h1 className="text-lg font-bold leading-tight">
            {tab === "shop" && "Browse"}
            {tab === "orders" && "My Orders"}
            {tab === "health" && "Health Hub"}
            {tab === "profile" && "Profile"}
          </h1>
        </div>
        {tab === "shop" && (
          <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-orange-400" />
          </div>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {tab === "shop" && (
          <div className="space-y-3">
            {/* Category pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {["All", "Peptides", "GLP-1", "TRT", "Group Buys"].map((c, i) => (
                <button key={c} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${i === 0 ? "bg-orange-500 text-white" : "bg-white/8 text-white/60"}`}>
                  {c}
                </button>
              ))}
            </div>

            {/* Featured banner */}
            <div className="rounded-2xl bg-gradient-to-r from-orange-500/20 to-orange-600/10 border border-orange-500/25 p-4">
              <p className="text-[10px] text-orange-400 font-semibold uppercase tracking-wider mb-1">Featured</p>
              <p className="text-base font-bold">BPC-157 Bundle</p>
              <p className="text-xs text-white/50 mb-3">Save 15% on 3+ vials</p>
              <button className="bg-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                Shop now
              </button>
            </div>

            {/* Products */}
            <div className="grid grid-cols-2 gap-2">
              {SHOP_ITEMS.map(p => (
                <div key={p.name} className="bg-white/5 border border-white/8 rounded-2xl p-3">
                  {p.badge && (
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full mb-2 inline-block" style={{ background: p.badgeColor + "25", color: p.badgeColor }}>
                      {p.badge}
                    </span>
                  )}
                  <div className="w-full h-14 bg-white/5 rounded-xl mb-2 flex items-center justify-center">
                    <Syringe className="w-6 h-6 text-white/20" />
                  </div>
                  <p className="text-xs font-semibold text-white/80 leading-tight">{p.name}</p>
                  <p className="text-sm font-bold text-orange-400 mt-1">{p.price}</p>
                </div>
              ))}
            </div>

            {/* Group Buys shortcut */}
            <button className="w-full bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3.5 flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-4.5 h-4.5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white/90">Active Group Buys</p>
                <p className="text-xs text-white/40">3 pools open to join</p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30" />
            </button>
          </div>
        )}

        {tab === "orders" && (
          <div className="space-y-3">
            {[
              { id: "#1094", item: "BPC-157 5mg", status: "Dispatched", color: "#16A34A", date: "Today" },
              { id: "#1089", item: "TB-500 5mg", status: "Processing", color: "#F97316", date: "Yesterday" },
              { id: "#1081", item: "Semaglutide 5mg", status: "Delivered", color: "#60A5FA", date: "Apr 18" },
            ].map(o => (
              <div key={o.id} className="bg-white/5 border border-white/8 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center flex-shrink-0">
                  <Package className="w-4.5 h-4.5 text-white/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white/85">{o.item}</p>
                  <p className="text-xs text-white/40">{o.id} · {o.date}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ background: o.color + "20", color: o.color }}>
                  {o.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === "health" && (
          <div className="space-y-3">
            <p className="text-xs text-white/40 font-medium">Quick access</p>
            {[
              { label: "Blood Tests", sub: "2 results logged", icon: FlaskConical, color: "#7C3AED", bg: "rgba(124,58,237,0.12)" },
              { label: "GLP-1 Tracker", sub: "Last shot 3 days ago", icon: Scale, color: "#16A34A", bg: "rgba(22,163,74,0.12)" },
              { label: "Cycle Plotter", sub: "Active protocol", icon: LineChart, color: "#F97316", bg: "rgba(249,115,22,0.12)" },
              { label: "Health Insights", sub: "View trends", icon: TrendingUp, color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
            ].map(h => (
              <button key={h.label} className="w-full bg-white/5 border border-white/8 rounded-2xl p-4 flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: h.bg }}>
                  <h.icon className="w-5 h-5" style={{ color: h.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white/90">{h.label}</p>
                  <p className="text-xs text-white/40">{h.sub}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/25" />
              </button>
            ))}
          </div>
        )}

        {tab === "profile" && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/8 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                <User className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-bold">@peptide_pete</p>
                <p className="text-xs text-white/40">Member since Jan 2025</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[{ v: "12", l: "Orders" }, { v: "3", l: "GB joined" }, { v: "2", l: "Blood tests" }].map(s => (
                <div key={s.l} className="bg-white/5 border border-white/8 rounded-2xl p-3 text-center">
                  <p className="text-xl font-bold">{s.v}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom tab bar */}
      <nav className="flex-shrink-0 border-t border-white/8 bg-black/60 backdrop-blur-xl flex pb-8">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => { setTab(id); setMoreOpen(false); }} className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 relative">
              {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-orange-500" />}
              <Icon className="w-5 h-5" style={{ color: active ? "#fb923c" : "rgba(255,255,255,0.35)", strokeWidth: active ? 2.25 : 1.75 }} />
              <span className="text-[10px] font-semibold" style={{ color: active ? "#fb923c" : "rgba(255,255,255,0.35)" }}>{label}</span>
            </button>
          );
        })}
        <button onClick={() => setMoreOpen(true)} className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 relative">
          {moreActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-orange-500" />}
          <Menu className="w-5 h-5" style={{ color: moreActive ? "#fb923c" : "rgba(255,255,255,0.35)", strokeWidth: 1.75 }} />
          <span className="text-[10px] font-semibold" style={{ color: moreActive ? "#fb923c" : "rgba(255,255,255,0.35)" }}>More</span>
        </button>
      </nav>

      {/* More drawer */}
      {moreOpen && (
        <>
          <div className="absolute inset-0 bg-black/50 z-10" onClick={() => setMoreOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-[#1a1a1a] border-t border-white/10 rounded-t-3xl">
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-white/20" /></div>
            <div className="flex justify-between items-center px-5 py-3 border-b border-white/8">
              <p className="text-sm font-bold">More</p>
              <button onClick={() => setMoreOpen(false)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>
            <div className="px-3 py-2 max-h-96 overflow-y-auto">
              {MORE_ITEMS.map(item => (
                <button key={item.id} onClick={() => { setMoreActive(item.id); setMoreOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 border-b border-white/5 last:border-0">
                  <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4.5 h-4.5 text-white/50" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-white/85">{item.label}</p>
                    <p className="text-[11px] text-white/35">{item.sub}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20" />
                </button>
              ))}
            </div>
            <div className="h-8" />
          </div>
        </>
      )}
    </div>
  );
}
