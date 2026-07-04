import React, { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard, ReceiptText, UsersRound, HeartPulse, ClipboardList,
  Search, Bell, ChevronDown, ChevronRight, ChevronLeft, Plus, ArrowUp,
  MoreVertical, Star, Heart, Package, CheckCircle2, Award, FlaskConical,
  Clock, Sun, Moon, PanelLeft, SlidersHorizontal, Syringe, Send,
  Wallet, QrCode, MapPin, Store, ArrowRight,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { useThemeStore } from "@/hooks/use-theme";
import { HubBottomNav } from "@/components/HubBottomNav";
import type { PortalNavProps } from "@/pages/CustomerPortal";
import { fmtC } from "@/lib/currency";

// ─── Props (structural — accepts the real portal objects) ────────────────────

interface DashOrder {
  id: string; code: string; status: string; grandTotal: number;
  currency?: string | null; createdAt: string; deliveryMethod?: string;
  lineItems: { productName: string; quantity: number }[];
}
interface DashCompound {
  id: string; compoundName: string; compoundType: string;
  doseAmount: string; doseUnit: string; frequency: string;
  route: string; startDate: string; endDate: string | null;
}
interface DashGroupBuy {
  id: string; name: string; status: string; closeDate: string | null;
  organiserId: string | null; productCount: number;
}
interface DashGlp1 { loggedDate: string }

type NavProps = PortalNavProps;

interface DashboardHomeProps {
  username: string;
  credits?: number | null;
  orders: DashOrder[];
  activeCompounds: DashCompound[];
  bloodTestCount: number;
  glp1Logs: DashGlp1[];
  groupBuys: DashGroupBuy[];
  onSection: (s: string) => void;
  onLogout?: () => void;
  navProps?: NavProps;
  viewerAccess?: { id: string; name: string; hasQrAccess?: boolean; hasLegAccess?: boolean }[];
  isOrganiser?: boolean;
  organiserGb?: { active: number; draft: number; total: number } | null;
}

// ─── Palette (exact hex, flips light/dark) ───────────────────────────────────

function palette(dark: boolean) {
  return dark
    ? {
        page: "#0E0E12", panel: "#17171C", panel2: "#1D1D23",
        border: "rgba(255,255,255,0.08)", borderSoft: "rgba(255,255,255,0.05)",
        text: "#F5F5F7", muted: "#A0A0AB", subtle: "#6E6E78",
        track: "rgba(255,255,255,0.09)", chip: "rgba(255,255,255,0.06)",
        sidebar: "#121216",
      }
    : {
        page: "#F3F3F3", panel: "#FFFFFF", panel2: "#FAFAF9",
        border: "#DDDBDA", borderSoft: "#EDEBE9",
        text: "#181818", muted: "#5C5C5C", subtle: "#8C8C8C",
        track: "#ECEBEA", chip: "#F3F3F3",
        sidebar: "#FFFFFF",
      };
}

const ACCENT = "#0176D3";
const ACCENT_SOFT = "rgba(1,118,211,0.10)";
const HERO_GRAD = "linear-gradient(115deg,#032D60 0%,#0B5CAB 55%,#0176D3 100%)";
const STAR_AMBER = "#F5A623";
const LIVE_RED = "#EF4444";

const FONT = "'Inter','Salesforce Sans','Helvetica Neue',Arial,sans-serif";

const COMPOUND_COLOR: Record<string, string> = {
  AAS: "#BA0517", TRT: "#0176D3", Peptide: "#2E844A",
  Supplement: "#0891B2", Other: ACCENT,
};

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string; pct: number }> = {
  Draft:      { label: "Draft",      color: "#64748B", bg: "rgba(100,116,139,0.12)", pct: 5 },
  Submitted:  { label: "Submitted",  color: "#B4770E", bg: "rgba(245,166,35,0.14)",  pct: 25 },
  Processing: { label: "Processing", color: "#B4770E", bg: "rgba(245,166,35,0.14)",  pct: 55 },
  Shipped:    { label: "Shipped",    color: ACCENT,    bg: "rgba(1,118,211,0.12)",   pct: 80 },
  Completed:  { label: "Completed",  color: "#0E9F6E", bg: "rgba(16,185,129,0.14)",  pct: 100 },
  Cancelled:  { label: "Cancelled",  color: "#DC2626", bg: "rgba(220,38,38,0.12)",   pct: 0 },
};

function daysSince(iso: string) {
  const start = new Date((iso.length <= 10 ? iso + "T00:00:00" : iso)).getTime();
  return Math.max(0, Math.round((Date.now() - start) / 86_400_000));
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardHome({
  username, credits, orders, activeCompounds, bloodTestCount, glp1Logs, groupBuys,
  onSection, onLogout, navProps, viewerAccess = [], isOrganiser, organiserGb,
}: DashboardHomeProps) {
  const { dark, toggle: toggleTheme } = useThemeStore();
  const [, navigate] = useLocation();
  const T = palette(dark);
  const [collapsed, setCollapsed] = useState(false);
  const [heroQ, setHeroQ] = useState("");
  const carouselRef = useRef<HTMLDivElement>(null);

  const initial = (username || "U").slice(0, 1).toUpperCase();

  // ── Derived stats ──
  const completedCount = orders.filter(o => o.status === "Completed").length;
  const ongoingCount = orders.filter(o => o.status !== "Completed" && o.status !== "Cancelled").length;
  const completionPct = orders.length ? Math.round((completedCount / orders.length) * 100) : 0;

  const recentOrders = useMemo(
    () => [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [orders],
  );

  const weekBars = useMemo(() => {
    const now = Date.now();
    const buckets = [0, 0, 0, 0];
    orders.forEach(o => {
      const t = new Date(o.createdAt).getTime();
      const w = Math.floor((now - t) / (7 * 86_400_000));
      if (w >= 0 && w <= 3) buckets[3 - w] += 1;
    });
    return buckets.map((v, i) => ({ name: `W${i + 1}`, v, current: i === 3 }));
  }, [orders]);
  const barMax = Math.max(4, ...weekBars.map(b => b.v));

  const activeGbs = groupBuys.filter(g => g.status === "active");
  const glp1Streak = glp1Logs.length;

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening";
  })();

  // ── Sidebar nav model ──
  const navItems = [
    { id: "home",       label: "Dashboard",  Icon: LayoutDashboard, active: true },
    { id: "orders",     label: "Orders",     Icon: ReceiptText,     active: false },
    { id: "groups",     label: "Group Buys", Icon: UsersRound,      active: false },
    { id: "health-hub", label: "Health Hub", Icon: HeartPulse,      active: false },
    { id: "lab-tests",  label: "Lab Tests",  Icon: ClipboardList,   active: false },
  ];

  const RAIL_W = 56;
  const SIDEBAR_W = collapsed ? RAIL_W : 250;

  const cardStyle: React.CSSProperties = {
    background: T.panel,
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    boxShadow: dark ? "none" : "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  };

  const kebab = (
    <button
      className="flex items-center justify-center rounded-lg transition-colors shrink-0"
      style={{ width: 26, height: 26, color: T.subtle }}
      title="More"
    >
      <MoreVertical className="w-4 h-4" />
    </button>
  );

  return (
    <div className="flex w-full min-h-screen" style={{ background: T.page, fontFamily: FONT, color: T.text }}>
      <style>{`
        .dh-nav:hover { background: ${T.chip} !important; }
        .dh-rail:hover { background: rgba(255,255,255,0.10) !important; }
        .dh-scroll::-webkit-scrollbar { height: 0; width: 6px; }
        .dh-scroll::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        .dh-card-hover { transition: transform .18s ease, box-shadow .18s ease; }
        .dh-card-hover:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(16,17,33,.10); }
      `}</style>

      {/* ══ Sidebar (dual-tier: icon rail + labelled panel) ══ */}
      <aside
        className="hidden lg:flex shrink-0 fixed inset-y-0 left-0 z-20"
        style={{ width: SIDEBAR_W, transition: "width .2s ease" }}
      >
        {/* Icon rail */}
        <div
          className="flex flex-col items-center shrink-0"
          style={{ width: RAIL_W, background: "#032D60", paddingTop: 18, paddingBottom: 16 }}
        >
          <div
            className="flex items-center justify-center shrink-0"
            style={{ width: 38, height: 38, borderRadius: 8, background: "#0176D3", color: "#fff", fontWeight: 800, fontSize: 12 }}
          >
            S&amp;P
          </div>

          <nav className="flex flex-col items-center gap-1.5" style={{ marginTop: 22 }}>
            {navItems.map(({ id, label, Icon, active }) => (
              <button
                key={id}
                onClick={() => onSection(id)}
                title={label}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={active ? "flex items-center justify-center transition-all" : "dh-rail flex items-center justify-center transition-all"}
                style={{
                  width: 40, height: 40, borderRadius: 6,
                  background: active ? "rgba(255,255,255,0.16)" : "transparent",
                  color: active ? "#fff" : "rgba(255,255,255,0.62)",
                  boxShadow: "none",
                }}
              >
                <Icon className="w-[19px] h-[19px]" strokeWidth={active ? 2.4 : 2} />
              </button>
            ))}
          </nav>

          <div className="flex flex-col items-center gap-1.5" style={{ marginTop: "auto" }}>
            <button
              onClick={() => navigate("/shop")}
              title="Shop"
              aria-label="Shop"
              className="dh-rail flex items-center justify-center transition-all"
              style={{ width: 40, height: 40, borderRadius: 6, color: "rgba(255,255,255,0.62)" }}
            >
              <Store className="w-[19px] h-[19px]" />
            </button>
            <button
              onClick={toggleTheme}
              title={dark ? "Light mode" : "Dark mode"}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              className="dh-rail flex items-center justify-center transition-all"
              style={{ width: 40, height: 40, borderRadius: 6, color: "rgba(255,255,255,0.62)" }}
            >
              {dark ? <Sun className="w-[19px] h-[19px]" /> : <Moon className="w-[19px] h-[19px]" />}
            </button>
            <button
              onClick={() => setCollapsed(c => !c)}
              title={collapsed ? "Expand" : "Collapse"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              className="dh-rail flex items-center justify-center transition-all"
              style={{ width: 40, height: 40, borderRadius: 6, color: "rgba(255,255,255,0.62)" }}
            >
              <PanelLeft className="w-[19px] h-[19px]" style={{ transform: collapsed ? "rotate(180deg)" : "none" }} />
            </button>
          </div>
        </div>

        {/* Labelled panel */}
        {!collapsed && (
          <div className="flex flex-col flex-1 min-w-0" style={{ background: T.sidebar, borderRight: `1px solid ${T.border}` }}>
            {/* Brand */}
            <div className="flex items-center px-4" style={{ height: 72 }}>
              <span className="font-extrabold tracking-tight truncate" style={{ fontSize: 20 }}>Salt &amp; Peps</span>
            </div>

            <div className="flex-1 overflow-y-auto dh-scroll px-3 pb-4">
              {/* Main nav */}
              <nav className="flex flex-col gap-0.5">
                {navItems.map(({ id, label, Icon, active }) => (
                  <button
                    key={id}
                    onClick={() => onSection(id)}
                    className={active ? "relative w-full flex items-center rounded-md transition-all text-left" : "dh-nav relative w-full flex items-center rounded-md transition-all text-left"}
                    style={{
                      gap: 11, padding: "0 12px", height: 40,
                      background: active ? (dark ? "rgba(1,118,211,0.18)" : "rgba(1,118,211,0.10)") : "transparent",
                      color: active ? ACCENT : T.muted,
                      fontWeight: active ? 700 : 600, fontSize: 13.5,
                    }}
                  >
                    {active && <span className="absolute rounded-full" style={{ left: -12, top: 11, bottom: 11, width: 3.5, background: ACCENT }} />}
                    <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2.4 : 2} />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </nav>

          {/* Compounds (Favorites analog) */}
          {!collapsed && activeCompounds.length > 0 && (
            <>
              <p className="px-3 mt-6 mb-2 font-semibold" style={{ fontSize: 12, letterSpacing: ".01em", color: T.subtle }}>Compounds</p>
              <div className="flex flex-col gap-0.5">
                {activeCompounds.slice(0, 3).map(c => (
                  <button
                    key={c.id}
                    onClick={() => onSection("compounds")}
                    className="dh-nav w-full flex items-center gap-3 rounded-md px-3 text-left"
                    style={{ height: 40, color: T.text, fontWeight: 600, fontSize: 13 }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COMPOUND_COLOR[c.compoundType] ?? ACCENT }} />
                    <span className="truncate">{c.compoundName}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Group Buys (Friends analog) */}
          {!collapsed && groupBuys.length > 0 && (
            <>
              <p className="px-3 mt-6 mb-2 font-semibold" style={{ fontSize: 12, letterSpacing: ".01em", color: T.subtle }}>Group Buys</p>
              <div className="flex flex-col gap-0.5">
                {groupBuys.slice(0, 5).map(g => (
                  <button
                    key={g.id}
                    onClick={() => onSection("groups")}
                    className="dh-nav w-full flex items-center gap-3 rounded-md px-3 text-left"
                    style={{ height: 42, color: T.text, fontWeight: 600, fontSize: 13 }}
                  >
                    <span
                      className="flex items-center justify-center shrink-0 rounded-md text-white"
                      style={{ width: 26, height: 26, fontSize: 11, fontWeight: 700, background: ACCENT }}
                    >
                      {g.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="truncate">{g.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Bottom promo card */}
          {!collapsed && (
            <button
              onClick={() => onSection("telegram")}
              className="dh-card-hover w-full text-left mt-6 rounded-lg relative overflow-hidden"
              style={{ background: T.panel2, border: `1px solid ${T.border}`, padding: 16, color: T.text }}
            >
              <div className="flex items-center justify-center rounded-md mb-3" style={{ width: 34, height: 34, background: ACCENT_SOFT, color: ACCENT }}>
                <Send className="w-4 h-4" />
              </div>
              <p className="font-bold leading-tight" style={{ fontSize: 13.5 }}>Take Salt &amp; Peps Everywhere</p>
              <span className="inline-flex items-center gap-1 mt-3 rounded-md font-semibold text-white" style={{ fontSize: 11, padding: "6px 12px", background: ACCENT }}>
                Connect Telegram <ChevronRight className="w-3 h-3" />
              </span>
            </button>
          )}
            </div>
          </div>
        )}
      </aside>

      {/* ══ Main ══ */}
      <div className="flex-1 min-w-0 flex flex-col" style={{ marginLeft: 0 }}>
        <div style={{ paddingLeft: 0 }} className="lg:pl-0">
          <div className="lg:ml-[var(--dh-ml)]" style={{ ["--dh-ml" as any]: `${SIDEBAR_W}px`, transition: "margin .2s ease" }}>

            {/* Top bar */}
            <header
              className="sticky top-0 z-10 flex items-center gap-3 px-4 md:px-7"
              style={{ height: 72, background: T.panel, borderBottom: `1px solid ${T.border}` }}
            >
              <h1 className="font-extrabold tracking-tight shrink-0" style={{ fontSize: 21 }}>Dashboard</h1>

              <div className="flex-1 flex justify-center min-w-0 px-2">
                <div
                  className="hidden sm:flex items-center gap-2.5 w-full max-w-[460px] rounded-md"
                  style={{ height: 42, padding: "0 14px", background: T.panel, border: `1px solid ${T.border}` }}
                >
                  <Search className="w-4 h-4 shrink-0" style={{ color: T.subtle }} />
                  <input
                    placeholder="Search anything..."
                    className="flex-1 min-w-0 bg-transparent outline-none"
                    style={{ fontSize: 13.5, color: T.text }}
                  />
                  <span
                    className="hidden md:flex items-center gap-1 rounded-md font-semibold shrink-0"
                    style={{ fontSize: 11, padding: "3px 7px", background: T.chip, color: T.subtle }}
                  >⌘ K</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {typeof credits === "number" && (
                  <button
                    onClick={() => onSection("orders")}
                    className="flex items-center gap-2 rounded-md pl-2.5 pr-3.5"
                    style={{ height: 40, background: T.panel, border: `1px solid ${T.border}` }}
                    title="Store credits"
                  >
                    <Wallet className="w-4 h-4 shrink-0" style={{ color: "#2D6BCC" }} />
                    <span className="font-extrabold" style={{ fontSize: 13, color: T.text, letterSpacing: "-0.01em" }}>${credits.toFixed(2)}</span>
                  </button>
                )}
                <button
                  onClick={toggleTheme}
                  className="flex items-center justify-center rounded-md transition-colors"
                  style={{ width: 40, height: 40, background: T.panel, border: `1px solid ${T.border}`, color: T.muted }}
                  title={dark ? "Light mode" : "Dark mode"}
                >
                  {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => onSection("orders")}
                  className="relative flex items-center justify-center rounded-md transition-colors"
                  style={{ width: 40, height: 40, background: T.panel, border: `1px solid ${T.border}`, color: T.muted }}
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute rounded-full" style={{ top: 9, right: 10, width: 7, height: 7, background: LIVE_RED, border: `2px solid ${T.panel}` }} />
                </button>
                <button
                  onClick={() => onSection("profile")}
                  className="flex items-center gap-2 rounded-md pl-1 pr-2"
                  style={{ height: 44, background: T.panel, border: `1px solid ${T.border}` }}
                >
                  <span className="flex items-center justify-center rounded-full text-white shrink-0" style={{ width: 34, height: 34, background: ACCENT, fontWeight: 700, fontSize: 14 }}>{initial}</span>
                  <span className="hidden md:flex flex-col items-start leading-tight min-w-0">
                    <span className="font-bold truncate" style={{ fontSize: 12.5, maxWidth: 120 }}>{username}</span>
                    <span className="truncate" style={{ fontSize: 11, color: T.subtle, maxWidth: 120 }}>@{username}</span>
                  </span>
                  <ChevronDown className="w-4 h-4 shrink-0" style={{ color: T.subtle }} />
                </button>
              </div>
            </header>

            {/* Content grid */}
            <div className="px-4 md:px-7 py-6 flex flex-col xl:flex-row gap-5 pb-24 lg:pb-8">

              {/* LEFT column */}
              <div className="flex-1 min-w-0 flex flex-col gap-5">

                {/* Hero */}
                <div className="relative overflow-hidden" style={{ borderRadius: 8, background: HERO_GRAD, padding: "26px 28px 24px" }}>
                  <div className="relative" style={{ maxWidth: 620 }}>
                    <h2 className="font-bold text-white" style={{ fontSize: 26, lineHeight: 1.15, letterSpacing: "-0.01em" }}>
                      Meet Sage, your health assistant
                    </h2>
                    <p style={{ color: "rgba(255,255,255,.66)", fontSize: 15, marginTop: 14, lineHeight: 1.5, maxWidth: 440 }}>
                      Ask anything about your compounds, bloodwork, or protocols.
                    </p>
                    <div
                      className="flex items-center gap-3 mt-6 rounded-md"
                      style={{ background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.16)", padding: 8 }}
                    >
                      <span className="flex items-center justify-center rounded-md shrink-0" style={{ width: 40, height: 40, background: "#fff", color: "#032D60" }}>
                        <Plus className="w-5 h-5" />
                      </span>
                      <input
                        value={heroQ}
                        onChange={e => setHeroQ(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") onSection("blood-tests"); }}
                        placeholder="Type your question here or ask about your bloodwork..."
                        className="flex-1 min-w-0 bg-transparent outline-none"
                        style={{ color: "#fff", fontSize: 13.5 }}
                      />
                      <button
                        onClick={() => onSection("blood-tests")}
                        className="flex items-center justify-center rounded-md shrink-0 transition-transform active:scale-95"
                        style={{ width: 40, height: 40, background: ACCENT, color: "#fff" }}
                        title="Ask Sage"
                      >
                        <ArrowUp className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* My Compounds carousel */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FlaskConical className="w-[18px] h-[18px]" style={{ color: ACCENT }} />
                      <span className="font-extrabold" style={{ fontSize: 16 }}>My Compounds</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => carouselRef.current?.scrollBy({ left: -320, behavior: "smooth" })}
                        className="flex items-center justify-center rounded-md transition-colors"
                        style={{ width: 34, height: 34, background: T.panel, border: `1px solid ${T.border}`, color: T.muted }}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => carouselRef.current?.scrollBy({ left: 320, behavior: "smooth" })}
                        className="flex items-center justify-center rounded-md transition-colors"
                        style={{ width: 34, height: 34, background: ACCENT, color: "#fff" }}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {activeCompounds.length === 0 ? (
                    <button
                      onClick={() => onSection("compounds")}
                      className="dh-card-hover w-full text-left flex items-center gap-4"
                      style={{ ...cardStyle, padding: 22 }}
                    >
                      <span className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 52, height: 52, background: ACCENT_SOFT, color: ACCENT }}>
                        <Plus className="w-6 h-6" />
                      </span>
                      <div>
                        <p className="font-bold" style={{ fontSize: 15 }}>Track your first compound</p>
                        <p style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>Log doses, cycles and protocols to see progress here.</p>
                      </div>
                    </button>
                  ) : (
                    <div ref={carouselRef} className="dh-scroll flex gap-4 overflow-x-auto pb-1" style={{ scrollSnapType: "x mandatory" }}>
                      {activeCompounds.map(c => {
                        const color = COMPOUND_COLOR[c.compoundType] ?? ACCENT;
                        const days = daysSince(c.startDate);
                        const pct = Math.min(100, Math.round((days / 84) * 100));
                        return (
                          <button
                            key={c.id}
                            onClick={() => onSection("compounds")}
                            className="dh-card-hover text-left shrink-0"
                            style={{ ...cardStyle, width: 300, padding: 0, overflow: "hidden", scrollSnapAlign: "start" }}
                          >
                            <div className="relative" style={{ height: 120, background: `linear-gradient(140deg, ${color}18 0%, ${color}08 55%, ${T.panel} 100%)` }}>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="flex items-center justify-center rounded-lg" style={{ width: 52, height: 52, background: T.panel, color, border: `1px solid ${T.border}` }}>
                                  <Syringe className="w-6 h-6" />
                                </span>
                              </div>
                              <span className="absolute flex items-center justify-center rounded-md" style={{ top: 12, right: 12, width: 30, height: 30, background: T.panel, color, border: `1px solid ${T.border}` }}>
                                <Heart className="w-4 h-4" fill={color} />
                              </span>
                              <span className="absolute rounded font-bold" style={{ top: 12, left: 12, fontSize: 10.5, padding: "3px 9px", background: T.panel, color, border: `1px solid ${T.border}` }}>
                                {c.compoundType}
                              </span>
                            </div>
                            <div style={{ padding: 16 }}>
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-bold truncate" style={{ fontSize: 14.5 }}>{c.compoundName}</p>
                                <span className="flex items-center gap-1 shrink-0" style={{ fontSize: 12.5, fontWeight: 700 }}>
                                  {c.doseAmount}{c.doseUnit} <Star className="w-3.5 h-3.5" style={{ color: STAR_AMBER }} fill={STAR_AMBER} />
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-2.5">
                                <span className="flex items-center justify-center rounded-full text-white shrink-0" style={{ width: 22, height: 22, fontSize: 10, fontWeight: 700, background: color }}>
                                  {c.compoundType.slice(0, 1)}
                                </span>
                                <span style={{ fontSize: 12, color: T.muted }}>{c.frequency}{c.route ? ` · ${c.route}` : ""}</span>
                              </div>
                              <div className="mt-3 rounded-full overflow-hidden" style={{ height: 7, background: T.track }}>
                                <div style={{ width: `${pct}%`, height: "100%", background: ACCENT }} />
                              </div>
                              <div className="flex items-center justify-between mt-2.5" style={{ fontSize: 11.5, color: T.muted }}>
                                <span className="flex items-center gap-1"><FlaskConical className="w-3.5 h-3.5" /> {c.doseAmount}{c.doseUnit}</span>
                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {days}d active</span>
                                <span className="font-bold" style={{ color: T.text }}>{pct}%</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Top Performance (orders table) */}
                <div style={{ ...cardStyle, padding: 22 }}>
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <ReceiptText className="w-[18px] h-[18px]" style={{ color: ACCENT }} />
                      <span className="font-extrabold" style={{ fontSize: 16 }}>Recent Orders</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="flex items-center gap-1.5 rounded-md font-semibold" style={{ fontSize: 12, padding: "7px 14px", background: T.panel, border: `1px solid ${T.border}`, color: T.muted }}>
                        <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
                      </button>
                      <button onClick={() => onSection("orders")} className="flex items-center gap-1 rounded-md font-semibold" style={{ fontSize: 12, padding: "7px 14px", background: T.panel, border: `1px solid ${ACCENT}`, color: ACCENT }}>
                        See all orders
                      </button>
                    </div>
                  </div>

                  {recentOrders.length === 0 ? (
                    <div className="flex flex-col items-center text-center py-8">
                      <span className="flex items-center justify-center rounded-lg mb-3" style={{ width: 48, height: 48, background: T.chip, color: T.subtle }}>
                        <Package className="w-6 h-6" />
                      </span>
                      <p className="font-semibold" style={{ fontSize: 13.5 }}>No orders yet</p>
                      <button onClick={() => navigate("/shop")} className="mt-3 rounded-md font-semibold text-white" style={{ fontSize: 12.5, padding: "8px 18px", background: ACCENT }}>Browse the shop</button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto dh-scroll">
                      <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 560 }}>
                        <thead>
                          <tr style={{ background: T.chip }}>
                            {["Order ID", "Items", "Status", "Method", "Fulfilment"].map((h, i) => (
                              <th key={h} className="text-left font-semibold" style={{
                                fontSize: 11, color: T.muted, padding: "10px 14px",
                                borderTopLeftRadius: i === 0 ? 6 : 0, borderBottomLeftRadius: i === 0 ? 6 : 0,
                                borderTopRightRadius: i === 4 ? 6 : 0, borderBottomRightRadius: i === 4 ? 6 : 0,
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {recentOrders.map(o => {
                            const st = STATUS_STYLE[o.status] ?? { label: o.status, color: T.muted, bg: T.chip, pct: 0 };
                            const first = o.lineItems[0]?.productName ?? "—";
                            const more = o.lineItems.length - 1;
                            return (
                              <tr key={o.id} onClick={() => onSection("orders")} className="cursor-pointer transition-colors hover:bg-[color:var(--dh-row)]" style={{ ["--dh-row" as any]: T.panel2 }}>
                                <td style={{ padding: "13px 14px", borderBottom: `1px solid ${T.borderSoft}` }}>
                                  <span className="font-bold" style={{ fontSize: 12.5, color: ACCENT }}>{o.code}</span>
                                </td>
                                <td style={{ padding: "13px 14px", borderBottom: `1px solid ${T.borderSoft}` }}>
                                  <span className="font-semibold" style={{ fontSize: 12.5 }}>{first}{more > 0 ? ` +${more}` : ""}</span>
                                </td>
                                <td style={{ padding: "13px 14px", borderBottom: `1px solid ${T.borderSoft}` }}>
                                  <span className="rounded font-bold" style={{ fontSize: 10.5, padding: "3px 9px", background: st.bg, color: st.color }}>{st.label}</span>
                                </td>
                                <td style={{ padding: "13px 14px", borderBottom: `1px solid ${T.borderSoft}` }}>
                                  <span className="font-semibold" style={{ fontSize: 12.5, color: T.muted }}>{o.deliveryMethod || "—"}</span>
                                </td>
                                <td style={{ padding: "13px 14px", borderBottom: `1px solid ${T.borderSoft}` }}>
                                  <div className="flex items-center gap-2">
                                    <div className="rounded-full overflow-hidden flex-1" style={{ height: 6, background: T.track, minWidth: 44 }}>
                                      <div style={{ width: `${st.pct}%`, height: "100%", background: ACCENT }} />
                                    </div>
                                    <span className="font-bold tabular-nums" style={{ fontSize: 12 }}>{st.pct}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT column */}
              <div className="w-full xl:w-[340px] shrink-0 flex flex-col gap-5">

                {/* Stat grid 2×2 */}
                <div className="grid grid-cols-2 gap-4">
                  <StatCard T={T} label="Ongoing" value={ongoingCount} Icon={Package} onClick={() => onSection("orders")} />
                  <StatCard T={T} label="Completed" value={completedCount} Icon={CheckCircle2} highlight onClick={() => onSection("orders")} />
                  <StatCard T={T} label="Lab Tests" value={bloodTestCount} Icon={Award} iconColor="#2D6BCC" onClick={() => onSection("blood-tests")} />
                  <StatCard T={T} label="Compounds" value={activeCompounds.length} Icon={FlaskConical} iconColor="#16A34A" onClick={() => onSection("compounds")} />
                </div>

                {/* Statistic */}
                <div style={{ ...cardStyle, padding: 22 }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center rounded-md" style={{ width: 26, height: 26, background: ACCENT_SOFT, color: ACCENT }}>
                        <HeartPulse className="w-4 h-4" />
                      </span>
                      <span className="font-extrabold" style={{ fontSize: 15 }}>Statistic</span>
                    </div>
                    {kebab}
                  </div>

                  {/* Ring */}
                  <div className="flex justify-center my-2">
                    <div className="relative" style={{ width: 132, height: 132 }}>
                      <svg width={132} height={132} className="-rotate-90">
                        <circle cx={66} cy={66} r={60} fill="none" stroke={T.track} strokeWidth={6} />
                        <circle
                          cx={66} cy={66} r={60} fill="none" stroke={ACCENT} strokeWidth={6} strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 60}
                          strokeDashoffset={2 * Math.PI * 60 * (1 - completionPct / 100)}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="flex items-center justify-center rounded-full" style={{ width: 90, height: 90, background: dark ? "rgba(1,118,211,0.22)" : "#E5F1FB", color: ACCENT, fontSize: 34, fontWeight: 800 }}>{initial}</span>
                      </div>
                      <span className="absolute flex items-center justify-center rounded-md text-white font-bold" style={{ top: 4, right: 2, fontSize: 11, padding: "4px 9px", background: ACCENT, boxShadow: "none" }}>{completionPct}%</span>
                    </div>
                  </div>

                  <p className="text-center font-extrabold mt-2" style={{ fontSize: 18 }}>{greeting}, {username}</p>
                  <p className="text-center" style={{ fontSize: 12.5, color: T.muted, marginTop: 6, lineHeight: 1.5 }}>
                    {orders.length > 0
                      ? `You've completed ${completedCount} of ${orders.length} orders. Keep tracking your protocols.`
                      : "You are all set. Start an order or log a compound to see your stats grow."}
                  </p>

                  {/* Weekly bar chart */}
                  <div className="mt-5" style={{ height: 150 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weekBars} margin={{ top: 6, right: 4, left: -22, bottom: 0 }} barCategoryGap="34%">
                        <CartesianGrid vertical={false} stroke={T.borderSoft} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: T.subtle }} />
                        <YAxis domain={[0, barMax]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: T.subtle }} width={30} />
                        <Bar dataKey="v" radius={[2, 2, 0, 0]}>
                          {weekBars.map((b, i) => (
                            <Cell key={i} fill={b.current ? ACCENT : (dark ? "rgba(1,118,211,0.28)" : "#D6E9FA")} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Today */}
                <div style={{ ...cardStyle, padding: 22 }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-[18px] h-[18px]" style={{ color: ACCENT }} />
                      <span className="font-extrabold" style={{ fontSize: 15 }}>Today</span>
                    </div>
                    {kebab}
                  </div>

                  {activeGbs.length === 0 && glp1Streak === 0 ? (
                    <p className="py-4 text-center" style={{ fontSize: 12.5, color: T.muted }}>Nothing scheduled today</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {activeGbs.slice(0, 2).map(g => (
                        <button key={g.id} onClick={() => onSection("groups")} className="dh-nav flex items-center gap-3 rounded-md text-left" style={{ padding: 10 }}>
                          <span className="flex items-center justify-center rounded-md shrink-0" style={{ width: 38, height: 38, background: ACCENT_SOFT, color: ACCENT }}>
                            <UsersRound className="w-4 h-4" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold truncate" style={{ fontSize: 13 }}>{g.name}</p>
                              <span className="rounded font-bold shrink-0" style={{ fontSize: 9, padding: "2px 7px", background: "rgba(239,68,68,.14)", color: LIVE_RED }}>Live</span>
                            </div>
                            <p className="truncate" style={{ fontSize: 11.5, color: T.muted }}>{g.productCount} products{g.closeDate ? ` · closes ${new Date(g.closeDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}` : ""}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 shrink-0" style={{ color: T.subtle }} />
                        </button>
                      ))}
                      {glp1Streak > 0 && (
                        <button onClick={() => onSection("glp1")} className="dh-nav flex items-center gap-3 rounded-md text-left" style={{ padding: 10 }}>
                          <span className="flex items-center justify-center rounded-md shrink-0" style={{ width: 38, height: 38, background: "rgba(8,145,178,.12)", color: "#0891B2" }}>
                            <HeartPulse className="w-4 h-4" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold truncate" style={{ fontSize: 13 }}>GLP-1 Tracker</p>
                            <p className="truncate" style={{ fontSize: 11.5, color: T.muted }}>{glp1Streak} entries logged</p>
                          </div>
                          <ChevronRight className="w-4 h-4 shrink-0" style={{ color: T.subtle }} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {isOrganiser && (
                  <div style={{ ...cardStyle, padding: 22 }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Store className="w-[18px] h-[18px]" style={{ color: ACCENT }} />
                        <span className="font-extrabold" style={{ fontSize: 15 }}>GB Metrics</span>
                      </div>
                      <button onClick={() => navigate("/gborganiser")} className="flex items-center gap-1 font-semibold transition-opacity hover:opacity-60" style={{ fontSize: 11.5, color: ACCENT }}>
                        Organiser <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Active", value: organiserGb?.active ?? 0, color: "#16A34A" },
                        { label: "Draft", value: organiserGb?.draft ?? 0, color: "#F5A623" },
                        { label: "Total", value: organiserGb?.total ?? 0, color: ACCENT },
                      ].map(m => (
                        <div key={m.label} className="rounded-md text-center" style={{ padding: "12px 6px", background: T.panel2, border: `1px solid ${T.border}` }}>
                          <p className="font-extrabold" style={{ fontSize: 20, color: m.color, letterSpacing: "-0.02em" }}>{m.value}</p>
                          <p className="font-semibold uppercase" style={{ fontSize: 9.5, color: T.muted, letterSpacing: "0.04em", marginTop: 2 }}>{m.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {viewerAccess.length > 0 && (
                  <div style={{ ...cardStyle, padding: 22 }}>
                    <div className="flex items-center gap-2 mb-3">
                      <QrCode className="w-[18px] h-[18px]" style={{ color: ACCENT }} />
                      <span className="font-extrabold" style={{ fontSize: 15 }}>Special Access</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {viewerAccess.map(v => (
                        <div key={v.id} className="flex items-center justify-between gap-2 rounded-md" style={{ padding: 10, background: T.panel2, border: `1px solid ${T.border}` }}>
                          <p className="font-semibold truncate" style={{ fontSize: 12.5, color: T.text }}>{v.name}</p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {v.hasQrAccess && (
                              <button onClick={() => navigate(`/qr-viewer/${v.id}`)} className="inline-flex items-center gap-1 rounded-md font-bold transition-opacity hover:opacity-75" style={{ fontSize: 10.5, padding: "4px 9px", background: "rgba(22,163,74,0.10)", color: "#16A34A", border: "1px solid rgba(22,163,74,0.22)" }}>
                                <QrCode className="w-3 h-3" /> QR
                              </button>
                            )}
                            {v.hasLegAccess && (
                              <button onClick={() => navigate(`/leg-view/${v.id}`)} className="inline-flex items-center gap-1 rounded-md font-bold transition-opacity hover:opacity-75" style={{ fontSize: 10.5, padding: "4px 9px", background: "rgba(1,118,211,0.10)", color: ACCENT, border: "1px solid rgba(1,118,211,0.22)" }}>
                                <MapPin className="w-3 h-3" /> Leg
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {onLogout && (
                  <button onClick={onLogout} className="self-start" style={{ fontSize: 11, color: T.subtle }}>Sign out</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {navProps && <HubBottomNav {...(navProps as unknown as React.ComponentProps<typeof HubBottomNav>)} />}
    </div>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({
  T, label, value, Icon, highlight, iconColor, onClick,
}: {
  T: ReturnType<typeof palette>;
  label: string; value: number; Icon: React.ElementType;
  highlight?: boolean; iconColor?: string; onClick?: () => void;
}) {
  const tile = iconColor ?? ACCENT;
  return (
    <button
      onClick={onClick}
      className="dh-card-hover text-left flex flex-col gap-3 relative overflow-hidden"
      style={{
        height: 104, padding: 16, borderRadius: 8,
        background: T.panel,
        border: `1px solid ${T.border}`,
        boxShadow: T.panel === "#FFFFFF" ? "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" : "none",
        color: T.text,
      }}
    >
      {highlight && <span className="absolute left-0 top-0 bottom-0" style={{ width: 3, background: ACCENT }} />}
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center rounded-md shrink-0" style={{ width: 28, height: 28, background: `${tile}1A`, color: tile }}>
          <Icon className="w-[15px] h-[15px]" strokeWidth={2.2} />
        </span>
        <span className="font-semibold" style={{ fontSize: 12, color: T.muted }}>{label}</span>
      </div>
      <span className="font-extrabold" style={{ fontSize: 30, letterSpacing: "-0.02em", lineHeight: 1, color: highlight ? ACCENT : T.text }}>{value}</span>
    </button>
  );
}
