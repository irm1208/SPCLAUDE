import React, { useMemo, useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, Plus, ArrowUp, MoreVertical, Star, Heart,
  Package, CheckCircle2, Award, FlaskConical, Clock, SlidersHorizontal,
  Syringe, Store, ArrowRight, QrCode, MapPin, Check, Sparkles, Droplet,
  ClipboardList, HeartPulse, UsersRound, ReceiptText,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { useThemeStore } from "./_theme-context";
import {
  DashboardShell, palette, ACCENT, ACCENT_SOFT, HERO_GRAD, STAR_AMBER, LIVE_RED,
  COMPOUND_COLOR, STATUS_STYLE, daysSince, SecIcon, StatCard,
  type DashOrder, type DashCompound, type DashGroupBuy,
} from "./_DashboardShell";

type PortalNavProps = Record<string, unknown>;

// ─── Stubbed Sage chat (mockup — no chat backend) ───────────────────────────
function SageChat(_props: { open: boolean; onClose: () => void; seed: string; t: unknown; accent: string }) {
  return null;
}

// ─── Props (structural — accepts the real portal objects) ────────────────────

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

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardHome({
  username, credits, orders, activeCompounds, bloodTestCount, glp1Logs, groupBuys,
  onSection, onLogout, navProps, viewerAccess = [], isOrganiser, organiserGb,
}: DashboardHomeProps) {
  const { dark } = useThemeStore();
  const navigate = (_: string) => {};
  const T = palette(dark);
  const [heroQ, setHeroQ] = useState("");
  const [heroFocused, setHeroFocused] = useState(false);
  const [sageOpen, setSageOpen] = useState(false);
  const [sageSeed, setSageSeed] = useState("");
  const askSage = (q: string) => { setSageSeed(q); setSageOpen(true); };
  const carouselRef = useRef<HTMLDivElement>(null);

  // ── Content dropdown menus (filter / card overflow) ──
  const [menu, setMenu] = useState<null | "filter" | "stat" | "today">(null);
  const [orderFilter, setOrderFilter] = useState<string>("all");

  const initial = (username || "U").slice(0, 1).toUpperCase();

  // ── Derived stats ──
  const completedCount = orders.filter(o => o.status === "Completed").length;
  const ongoingCount = orders.filter(o => o.status !== "Completed" && o.status !== "Cancelled").length;
  const completionPct = orders.length ? Math.round((completedCount / orders.length) * 100) : 0;

  const recentOrders = useMemo(() => {
    const sorted = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const filtered = orderFilter === "all" ? sorted : sorted.filter(o => o.status === orderFilter);
    return filtered.slice(0, 5);
  }, [orders, orderFilter]);

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

  const cardStyle: React.CSSProperties = {
    background: T.panel,
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    boxShadow: dark ? "none" : "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  };

  const cardMenu = (id: "stat" | "today", items: { label: string; run: () => void }[]) => (
    <div className="relative">
      <button
        onClick={() => setMenu(m => (m === id ? null : id))}
        className="flex items-center justify-center rounded-lg transition-colors shrink-0"
        style={{ width: 26, height: 26, color: menu === id ? ACCENT : T.subtle }}
        title="More"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {menu === id && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            className="absolute right-0 z-50 mt-2 rounded-lg overflow-hidden py-1.5"
            style={{ top: "100%", width: 190, background: T.panel, border: `1px solid ${T.border}`, boxShadow: "0 12px 32px rgba(16,17,33,.16)" }}
          >
            {items.map(it => (
              <button
                key={it.label}
                onClick={() => { it.run(); setMenu(null); }}
                className="dh-nav w-full flex items-center px-3.5 text-left"
                style={{ height: 38, fontSize: 12.5, color: T.text, fontWeight: 600 }}
              >
                {it.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <DashboardShell
      activeSection="home"
      title="Dashboard"
      username={username}
      credits={credits}
      orders={orders}
      activeCompounds={activeCompounds}
      groupBuys={groupBuys}
      onSection={onSection}
      onLogout={onLogout}
      navProps={navProps}
    >
      {/* Content grid */}
      <div className="px-4 md:px-7 py-6 flex flex-col xl:flex-row gap-5 pb-[calc(96px_+_env(safe-area-inset-bottom))] lg:pb-8">

        {/* LEFT column */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">

          {/* Hero — Meet Sage */}
          <div className="relative overflow-hidden" style={{ borderRadius: 14, background: HERO_GRAD, padding: "24px 28px 22px" }}>
            {/* Atmosphere */}
            <div className="dh-orb dh-float-a" style={{ top: -60, right: -20, width: 230, height: 230, background: "rgba(45,107,204,.55)" }} />
            <div className="dh-orb dh-float-b" style={{ bottom: -80, right: 130, width: 190, height: 190, background: "rgba(1,118,211,.4)" }} />
            <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 0% 0%, rgba(255,255,255,.12), transparent 55%)", pointerEvents: "none" }} />

            <div className="relative" style={{ maxWidth: 640 }}>
              {/* Assistant identity */}
              <div className="dh-rise flex items-center gap-2.5" style={{ animationDelay: "0ms" }}>
                <span className="dh-sage-ring flex items-center justify-center rounded-full shrink-0" style={{ width: 38, height: 38, background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.28)" }}>
                  <Sparkles className="w-[18px] h-[18px]" style={{ color: "#fff" }} />
                </span>
                <div className="flex flex-col leading-none">
                  <span className="font-bold text-white" style={{ fontSize: 13.5 }}>Sage</span>
                  <span className="flex items-center gap-1.5" style={{ fontSize: 11, color: "rgba(255,255,255,.72)", marginTop: 4 }}>
                    <span className="rounded-full" style={{ width: 6, height: 6, background: "#22c55e" }} /> Online
                  </span>
                </div>
              </div>

              <h2 className="dh-rise font-bold text-white" style={{ fontSize: 26, lineHeight: 1.15, letterSpacing: "-0.01em", marginTop: 16, animationDelay: "60ms" }}>
                Meet Sage, your health assistant
              </h2>
              <p className="dh-rise" style={{ color: "rgba(255,255,255,.7)", fontSize: 15, marginTop: 10, lineHeight: 1.5, maxWidth: 440, animationDelay: "120ms" }}>
                Ask anything about your compounds, bloodwork, or protocols.
              </p>

              <div
                className="dh-rise flex items-center gap-2.5 mt-5 rounded-xl"
                style={{
                  background: "rgba(255,255,255,.12)",
                  border: `1px solid ${heroFocused ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.18)"}`,
                  boxShadow: heroFocused ? "0 0 0 3px rgba(255,255,255,.14)" : "none",
                  padding: 8, animationDelay: "180ms",
                  transition: "border-color .15s ease, box-shadow .15s ease",
                }}
              >
                <span className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 40, height: 40, background: "#fff", color: "#1B3A7A" }}>
                  <Plus className="w-5 h-5" />
                </span>
                <input
                  value={heroQ}
                  onChange={e => setHeroQ(e.target.value)}
                  onFocus={() => setHeroFocused(true)}
                  onBlur={() => setHeroFocused(false)}
                  onKeyDown={e => { if (e.key === "Enter" && heroQ.trim()) { askSage(heroQ.trim()); setHeroQ(""); } }}
                  placeholder="Type your question or ask about your bloodwork…"
                  className="flex-1 min-w-0 bg-transparent outline-none"
                  style={{ color: "#fff", fontSize: 13.5 }}
                />
                <button
                  onClick={() => { if (heroQ.trim()) { askSage(heroQ.trim()); setHeroQ(""); } }}
                  disabled={!heroQ.trim()}
                  className="dh-send flex items-center justify-center rounded-lg shrink-0 active:scale-95"
                  style={{ width: 40, height: 40, background: ACCENT, color: "#fff", opacity: heroQ.trim() ? 1 : 0.55, cursor: heroQ.trim() ? "pointer" : "default" }}
                  title="Ask Sage"
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
              </div>

              {/* Quick prompts */}
              <div className="dh-rise flex flex-wrap items-center gap-2 mt-3" style={{ animationDelay: "240ms" }}>
                {([
                  { label: "Analyse my bloodwork", Icon: Droplet, prompt: "Analyse my latest bloodwork and highlight anything I should pay attention to." },
                  { label: "Review a protocol", Icon: ClipboardList, prompt: "Help me review a protocol — what should I keep in mind?" },
                  { label: "My compounds", Icon: FlaskConical, prompt: "Give me an overview of my active compounds and how they work together." },
                ] as { label: string; Icon: React.ElementType; prompt: string }[]).map(chip => (
                  <button
                    key={chip.label}
                    onClick={() => askSage(chip.prompt)}
                    className="dh-chip flex items-center gap-1.5 rounded-full"
                    style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", padding: "9px 14px", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)" }}
                  >
                    <chip.Icon className="w-3.5 h-3.5" /> {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* My Compounds carousel */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <SecIcon Icon={FlaskConical} />
                <span className="font-extrabold" style={{ fontSize: 16, letterSpacing: "-0.01em" }}>My Compounds</span>
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
                <SecIcon Icon={ReceiptText} />
                <span className="font-extrabold" style={{ fontSize: 16, letterSpacing: "-0.01em" }}>Recent Orders</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setMenu(m => (m === "filter" ? null : "filter"))}
                    className="flex items-center gap-1.5 rounded-md font-semibold"
                    style={{
                      fontSize: 12, padding: "7px 14px",
                      background: orderFilter === "all" ? T.panel : ACCENT_SOFT,
                      border: `1px solid ${menu === "filter" || orderFilter !== "all" ? ACCENT : T.border}`,
                      color: orderFilter === "all" ? T.muted : ACCENT,
                    }}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" /> {orderFilter === "all" ? "Filter" : (STATUS_STYLE[orderFilter]?.label ?? orderFilter)}
                  </button>
                  {menu === "filter" && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
                      <div className="absolute right-0 z-50 mt-2 rounded-lg overflow-hidden py-1.5" style={{ top: "100%", width: 184, background: T.panel, border: `1px solid ${T.border}`, boxShadow: "0 12px 32px rgba(16,17,33,.16)" }}>
                        {["all", ...Object.keys(STATUS_STYLE)].map(st => {
                          const isActive = orderFilter === st;
                          return (
                            <button
                              key={st}
                              onClick={() => { setOrderFilter(st); setMenu(null); }}
                              className="dh-nav w-full flex items-center justify-between px-3.5 text-left"
                              style={{ height: 38, fontSize: 12.5, color: isActive ? ACCENT : T.text, fontWeight: isActive ? 700 : 600 }}
                            >
                              {st === "all" ? "All orders" : (STATUS_STYLE[st]?.label ?? st)}
                              {isActive && <Check className="w-4 h-4 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
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
              {cardMenu("stat", [
                { label: "View all orders", run: () => onSection("orders") },
                { label: "View compounds", run: () => onSection("compounds") },
                { label: "View blood tests", run: () => onSection("blood-tests") },
              ])}
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
                <SecIcon Icon={Clock} />
                <span className="font-extrabold" style={{ fontSize: 15, letterSpacing: "-0.01em" }}>Today</span>
              </div>
              {cardMenu("today", [
                { label: "View group buys", run: () => onSection("groups") },
                { label: "Open GLP-1 tracker", run: () => onSection("glp1") },
              ])}
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
                  <SecIcon Icon={Store} />
                  <span className="font-extrabold" style={{ fontSize: 15, letterSpacing: "-0.01em" }}>GB Metrics</span>
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
                <SecIcon Icon={QrCode} />
                <span className="font-extrabold" style={{ fontSize: 15, letterSpacing: "-0.01em" }}>Special Access</span>
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

      <SageChat open={sageOpen} onClose={() => setSageOpen(false)} seed={sageSeed} t={T} accent={ACCENT} />
    </DashboardShell>
  );
}
