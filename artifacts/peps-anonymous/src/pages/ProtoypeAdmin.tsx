import { useState, useCallback, useEffect, useRef } from "react";
import {
  LayoutDashboard, ShoppingCart, Users, Package,
  Settings, LogOut, Menu, Bell, Search, HelpCircle,
  TrendingUp, TrendingDown, CreditCard, ShieldCheck,
  BarChart2, MessageSquare, AlertTriangle, RefreshCw,
  ChevronDown, SlidersHorizontal, Store, Percent, Plug, MessageCircle,
  ShoppingBag, Edit3, CheckCircle2, XCircle, Clock, Ticket,
} from "lucide-react";

// ─── Design tokens — Finexy light theme ───────────────────────────────────────
const T = {
  bg:         "#F2F3F5",
  surface:    "#FFFFFF",
  card:       "#FFFFFF",
  shadow:     "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
  border:     "#EAEAEA",
  accent:     "#F04E23",
  accentDim:  "rgba(240,78,35,0.09)",
  text:       "#111827",
  textSub:    "#6B7280",
  muted:      "#9CA3AF",
  danger:     "#EF4444",
  green:      "#22C55E",
  greenDim:   "rgba(34,197,94,0.12)",
  orangeDim:  "rgba(245,158,11,0.12)",
  orange:     "#F59E0B",
};

// ─── Nav structure ────────────────────────────────────────────────────────────
type Tab = { id: string; label: string; icon: React.ElementType; badge?: number; section: string };

const NAV: Tab[] = [
  { id: "dashboard",  label: "Dashboard",    icon: LayoutDashboard, section: "Menu"     },
  { id: "analytics",  label: "Analytics",    icon: BarChart2,  badge: 20, section: "Menu"     },
  { id: "insights",   label: "Insights",     icon: TrendingUp,      section: "Menu"     },
  { id: "updates",    label: "Updates",      icon: Bell,            section: "Menu"     },
  { id: "members",    label: "Customers",    icon: Users,           section: "Menu"     },
  { id: "store",      label: "Store",        icon: Store,      badge: 99, section: "Products" },
  { id: "discounts",  label: "Discounts",    icon: Percent,         section: "Products" },
  { id: "integrations",label:"Integration",  icon: Plug,            section: "Products" },
  { id: "tickets",    label: "Feedback",     icon: MessageCircle,   section: "Products" },
  { id: "settings",   label: "Settings",     icon: Settings,        section: "General"  },
  { id: "helpdesk",   label: "Help Desk",    icon: HelpCircle,      section: "General"  },
];

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_ORDERS = [
  { id: "#878909", date: "2 Dec 2026", customer: "Oliver John Brown", category: "Shoes, Shirt",   status: "Pending",   items: 2, total: "$789.00" },
  { id: "#878908", date: "1 Dec 2026", customer: "Noah James Smith",  category: "Sneakers, T-shirt", status: "Completed", items: 3, total: "$967.00" },
  { id: "#878907", date: "1 Dec 2026", customer: "Emma Wilson",       category: "Peptides",       status: "Processing", items: 1, total: "$312.00" },
  { id: "#878906", date: "30 Nov 2026",customer: "Liam Martinez",     category: "BPC-157, TB-500", status: "Pending",  items: 2, total: "$445.00" },
  { id: "#878905", date: "30 Nov 2026",customer: "Olivia Chen",       category: "Semaglutide",    status: "Completed", items: 1, total: "$220.00" },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Pending:    { bg: T.orangeDim,          color: T.orange  },
  Completed:  { bg: T.greenDim,           color: T.green   },
  Processing: { bg: T.accentDim,          color: T.accent  },
  Cancelled:  { bg: "rgba(239,68,68,0.1)", color: T.danger },
};

// ─── Login screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (s: string) => void }) {
  const [secret, setSecret] = useState("");
  const [error, setError]   = useState("");
  const [busy, setBusy]     = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const res = await fetch("/api/admin/auth-check", {
        headers: { "x-admin-secret": secret }, credentials: "omit",
      });
      if (res.ok) { onLogin(secret); }
      else { setError("Incorrect password."); }
    } catch { setError("Could not reach the server."); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg }}>
      <div className="w-full max-w-sm mx-4">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: T.accent }}>
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold" style={{ color: T.text }}>Prototype Admin</h1>
          <p className="text-sm mt-1" style={{ color: T.textSub }}>Sandbox — does not affect production</p>
        </div>
        <div className="rounded-2xl p-6 space-y-3" style={{ background: T.card, boxShadow: T.shadow }}>
          <form onSubmit={submit} className="space-y-3">
            <input type="password" placeholder="Admin secret" value={secret}
              onChange={e => setSecret(e.target.value)} autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: T.bg, border: `1.5px solid ${error ? T.danger : T.border}`, color: T.text }} />
            {error && <p className="text-xs" style={{ color: T.danger }}>{error}</p>}
            <button type="submit" disabled={busy || !secret}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-40"
              style={{ background: T.accent }}>
              {busy ? "Checking…" : "Enter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ activeTab, setActiveTab, onLogout }: {
  activeTab: string; setActiveTab: (id: string) => void; onLogout: () => void;
}) {
  const sections = [...new Set(NAV.map(t => t.section))];
  return (
    <aside className="flex flex-col h-full shrink-0" style={{ width: 220, background: T.surface, borderRight: `1px solid ${T.border}` }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5" style={{ borderBottom: `1px solid ${T.border}` }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: T.accent }}>
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>
        <span className="text-base font-bold" style={{ color: T.text }}>ProtoAdmin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {sections.map(section => (
          <div key={section}>
            <p className="text-[11px] font-semibold uppercase tracking-widest px-2 mb-2" style={{ color: T.muted }}>
              {section}
            </p>
            <div className="space-y-0.5">
              {NAV.filter(t => t.section === section).map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all text-sm"
                    style={{
                      background: active ? T.accent : "transparent",
                      color: active ? "#ffffff" : T.textSub,
                      fontWeight: active ? 600 : 400,
                    }}>
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 truncate text-[13px]">{tab.label}</span>
                    {tab.badge != null && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                        style={{
                          background: active ? "rgba(255,255,255,0.25)" : T.accentDim,
                          color: active ? "#fff" : T.accent,
                        }}>
                        {tab.badge > 99 ? "99+" : tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Log out */}
      <div className="p-3" style={{ borderTop: `1px solid ${T.border}` }}>
        <button onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ background: "rgba(240,78,35,0.07)", color: T.accent }}>
          <LogOut className="w-4 h-4" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────────
function TopBar({ tabLabel }: { tabLabel: string }) {
  return (
    <header className="flex items-center gap-4 px-6 py-3.5 shrink-0"
      style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
      <div className="flex-1" />

      {/* Search */}
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-full flex-1 max-w-sm"
        style={{ background: T.bg, border: `1px solid ${T.border}` }}>
        <Search className="w-3.5 h-3.5 shrink-0" style={{ color: T.muted }} />
        <input placeholder="Search product" className="bg-transparent text-sm outline-none flex-1 min-w-0"
          style={{ color: T.text }} />
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
          style={{ background: T.border, color: T.muted }}>⌘K</span>
      </div>

      <div className="flex-1 flex justify-end items-center gap-2">
        <button className="p-2 rounded-xl hover:opacity-70 transition-opacity"
          style={{ background: T.bg, color: T.textSub }}>
          <Bell className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-xl hover:opacity-70 transition-opacity"
          style={{ background: T.bg, color: T.textSub }}>
          <HelpCircle className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 pl-2 ml-1 cursor-pointer"
          style={{ borderLeft: `1px solid ${T.border}` }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: T.accent }}>A</div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold leading-none" style={{ color: T.text }}>Admin</p>
            <p className="text-[10px] mt-0.5" style={{ color: T.muted }}>Admin</p>
          </div>
          <ChevronDown className="w-3 h-3" style={{ color: T.muted }} />
        </div>
      </div>
    </header>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, trend, trendPct, sub, icon: Icon }: {
  label: string; value: string; trend: "up" | "down"; trendPct: string;
  sub: string; icon: React.ElementType;
}) {
  const up = trend === "up";
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: T.card, boxShadow: T.shadow }}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium" style={{ color: T.textSub }}>{label}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: T.bg }}>
          <Icon className="w-4 h-4" style={{ color: T.textSub }} />
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-black tracking-tight" style={{ color: T.text }}>{value}</p>
          <span className="flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: up ? T.greenDim : "rgba(239,68,68,0.10)", color: up ? T.green : T.danger }}>
            {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trendPct}
          </span>
        </div>
        <p className="text-xs mt-1.5" style={{ color: T.muted }}>{sub}</p>
      </div>
    </div>
  );
}

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────
function BarChart({ highlighted }: { highlighted?: number }) {
  const bars = [62, 48, 95, 58, 72, 85, 68];
  const days = ["Fri", "Sat", "Sun", "Mon", "Thu", "Wen", "Thus"];
  const max  = Math.max(...bars);
  const hi   = highlighted ?? 2;
  return (
    <div className="flex items-end gap-2 h-32 w-full pt-2">
      {bars.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          {i === hi && (
            <div className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white mb-0.5"
              style={{ background: T.accent, whiteSpace: "nowrap" }}>$22,430</div>
          )}
          <div className="w-full rounded-t-xl transition-all" style={{
            height: `${(v / max) * 100}%`,
            background: i === hi ? T.accent : "rgba(240,78,35,0.18)",
            borderRadius: "10px 10px 4px 4px",
          }} />
          <span className="text-[10px]" style={{ color: T.muted }}>{days[i]}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Profit / Loss stacked chart ──────────────────────────────────────────────
function ProfitLossChart() {
  const data = [
    { profit: 38, loss: 22 }, { profit: 42, loss: 18 }, { profit: 30, loss: 28 },
    { profit: 45, loss: 20 }, { profit: 40, loss: 25 }, { profit: 48, loss: 15 },
    { profit: 35, loss: 30 }, { profit: 50, loss: 18 },
  ];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
  const maxTotal = Math.max(...data.map(d => d.profit + d.loss));
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs font-semibold" style={{ color: T.textSub }}>Profit and Loss</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: T.accent }} />
          <span className="text-[10px]" style={{ color: T.muted }}>Profit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block bg-gray-800" />
          <span className="text-[10px]" style={{ color: T.muted }}>Loss</span>
        </div>
      </div>
      <div className="flex items-end gap-1.5 h-24">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full flex flex-col gap-0.5" style={{ height: `${((d.profit + d.loss) / maxTotal) * 100}%` }}>
              <div className="flex-1 rounded-t-lg" style={{ background: T.accent, borderRadius: "6px 6px 0 0" }} />
              <div className="rounded-b-sm" style={{ height: `${(d.loss / (d.profit + d.loss)) * 50}%`, background: "#1F2937", borderRadius: "0 0 4px 4px" }} />
            </div>
            <span className="text-[9px]" style={{ color: T.muted }}>{months[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type AlertItem  = { id: string; title: string; message: string; priority: string; type?: string; createdAt: string; isRead?: boolean };
type TicketItem = { id: string; subject: string; telegramUsername: string; status: string; category: string; createdAt: string; updatedAt: string };
type FeedItem   = { id: string; stream: "order" | "payment" | "ticket"; priority: string; title: string; sub: string; time: string; ts: number; unread: boolean };

function classifyAlert(a: AlertItem): "order" | "payment" {
  const hay = ((a.type ?? "") + " " + a.title + " " + a.message).toLowerCase();
  if (hay.includes("payment") || hay.includes("paid") || hay.includes("transaction") || hay.includes("invoice")) return "payment";
  return "order";
}

const STREAM_ICON: Record<string, React.ElementType> = { order: ShoppingBag, payment: CreditCard, ticket: Ticket };
const PRIORITY_COL: Record<string, string> = { high: T.danger, medium: T.orange, low: T.muted };

// ─── Live Activity Feed ────────────────────────────────────────────────────────
function LiveActivityFeed({ secret }: { secret: string }) {
  const [alerts,  setAlerts]  = useState<AlertItem[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [lastAt,  setLastAt]  = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "order" | "payment" | "ticket">("all");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    setError(false);
    const h = { "x-admin-secret": secret };
    try {
      const [aRes, tRes] = await Promise.all([
        fetch("/api/admin/alerts?limit=40", { headers: h }),
        fetch("/api/admin/tickets?status=open", { headers: h }),
      ]);
      if (aRes.ok) { const j = await aRes.json(); setAlerts(j.alerts ?? []); }
      if (tRes.ok) { const j = await tRes.json(); setTickets(j.tickets ?? []); }
      setLastAt(new Date());
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [secret]);

  useEffect(() => {
    fetchData();
    timer.current = setInterval(fetchData, 30000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [fetchData]);

  const feed: FeedItem[] = [
    ...alerts.map(a => ({
      id: "a-" + a.id,
      stream: classifyAlert(a),
      priority: a.priority,
      title: a.title,
      sub: a.message,
      time: timeAgo(a.createdAt),
      ts: new Date(a.createdAt).getTime(),
      unread: !a.isRead,
    })),
    ...tickets.map(t => ({
      id: "t-" + t.id,
      stream: "ticket" as const,
      priority: "medium",
      title: t.subject || "Support ticket",
      sub: `@${t.telegramUsername} · ${(t.category ?? "").replace(/_/g, " ")}`,
      time: timeAgo(t.updatedAt ?? t.createdAt),
      ts: new Date(t.updatedAt ?? t.createdAt).getTime(),
      unread: true,
    })),
  ].sort((a, b) => b.ts - a.ts);

  const filtered = activeTab === "all" ? feed : feed.filter(f => f.stream === activeTab);
  const counts = {
    all:     feed.length,
    order:   feed.filter(f => f.stream === "order").length,
    payment: feed.filter(f => f.stream === "payment").length,
    ticket:  feed.filter(f => f.stream === "ticket").length,
  };

  const TABS = [
    { id: "all"     as const, label: "All"      },
    { id: "order"   as const, label: "Orders"   },
    { id: "payment" as const, label: "Payments" },
    { id: "ticket"  as const, label: "Tickets"  },
  ];

  return (
    <div className="rounded-2xl p-5" style={{ background: T.card, boxShadow: T.shadow }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <p className="text-base font-bold" style={{ color: T.text }}>Live Activity</p>
          {feed.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: T.accentDim, color: T.accent }}>{feed.length}</span>
          )}
        </div>
        <button onClick={fetchData}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg hover:opacity-70 transition-opacity"
          style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.textSub }}>
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Tab strip */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: T.bg }}>
        {TABS.map(tab => {
          const n = counts[tab.id];
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: active ? T.card : "transparent", color: active ? T.text : T.muted, boxShadow: active ? T.shadow : "none" }}>
              {tab.label}
              {n > 0 && (
                <span className="text-[9px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center"
                  style={{ background: active ? T.accentDim : "transparent", color: active ? T.accent : T.muted }}>
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2" style={{ color: T.muted }}>
          <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: `${T.accent} transparent transparent transparent` }} />
          <span className="text-xs">Loading…</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <XCircle className="w-7 h-7" style={{ color: T.danger }} />
          <p className="text-sm" style={{ color: T.muted }}>Could not fetch data</p>
          <button onClick={fetchData} className="text-xs underline" style={{ color: T.accent }}>Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <CheckCircle2 className="w-7 h-7" style={{ color: T.green }} />
          <p className="text-sm" style={{ color: T.muted }}>All clear — nothing here</p>
        </div>
      ) : (
        <div>
          {filtered.map((item, i) => {
            const Icon = STREAM_ICON[item.stream] ?? AlertTriangle;
            const col  = PRIORITY_COL[item.priority] ?? T.muted;
            return (
              <div key={item.id} className="flex items-start gap-3 py-3 transition-colors"
                style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : "none" }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: col + "18" }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: col }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate" style={{ color: T.text }}>{item.title}</p>
                    {item.unread && (
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: T.accent }} />
                    )}
                  </div>
                  <p className="text-xs mt-0.5 truncate" style={{ color: T.textSub }}>{item.sub}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs" style={{ color: T.muted }}>{item.time}</span>
                  <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                    style={{ background: col + "18", color: col }}>{item.priority}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lastAt && !loading && (
        <p className="text-[10px] mt-3 text-right" style={{ color: T.muted }}>
          Auto-refreshes every 30s · Last updated {lastAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardTab({ secret }: { secret: string }) {
  return (
    <div className="p-6 space-y-5">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: T.text }}>Sales Overview</h1>
        <button className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium"
          style={{ background: T.card, border: `1px solid ${T.border}`, color: T.textSub, boxShadow: T.shadow }}>
          <span className="text-[13px]">Apr 10, 2026 – May 11, 2026</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Sales"     value="2500"     trend="up"   trendPct="4.9%"  sub="Last month: 2345"   icon={ShoppingCart} />
        <KpiCard label="New Customer"    value="110"      trend="up"   trendPct="7.5%"  sub="Last month: 89"     icon={Users} />
        <KpiCard label="Return Products" value="72"       trend="down" trendPct="6.0%"  sub="Last month: 60"     icon={Package} />
        <KpiCard label="Total Revenue"   value="$8,220"   trend="up"   trendPct="12.4%" sub="Last month: $620.00" icon={CreditCard} />
      </div>

      {/* Charts + Live Activity side-by-side */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Charts column */}
        <div className="xl:col-span-2 space-y-4">
          <div className="rounded-2xl p-5" style={{ background: T.card, boxShadow: T.shadow }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-base font-bold" style={{ color: T.text }}>Revenue analytics</p>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.textSub }}>
                This Week <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            <BarChart />
          </div>

          <div className="rounded-2xl p-5" style={{ background: T.card, boxShadow: T.shadow }}>
            <p className="text-base font-bold" style={{ color: T.text }}>Total Income</p>
            <p className="text-xs mt-0.5 mb-4" style={{ color: T.textSub }}>Profit and loss over time</p>
            <ProfitLossChart />
          </div>
        </div>

        {/* Live notifications column */}
        <div className="xl:col-span-1">
          <LiveActivityFeed secret={secret} />
        </div>
      </div>

      {/* Recent Orders */}
      <div className="rounded-2xl p-5" style={{ background: T.card, boxShadow: T.shadow }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-base font-bold" style={{ color: T.text }}>Recent orders</p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
              style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.muted }}>
              <Search className="w-3 h-3" />
              <span>Search</span>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.textSub }}>
              <SlidersHorizontal className="w-3 h-3" /> Sort by
            </button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              {["Order Id", "Date", "Customer", "Category", "Status", "Items", "Total"].map(h => (
                <th key={h} className="text-left pb-3 pr-4 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: T.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_ORDERS.map(o => {
              const s = STATUS_STYLE[o.status] ?? { bg: T.accentDim, color: T.accent };
              return (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors cursor-pointer"
                  style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td className="py-3.5 pr-4 font-medium" style={{ color: T.text }}>{o.id}</td>
                  <td className="py-3.5 pr-4" style={{ color: T.textSub }}>{o.date}</td>
                  <td className="py-3.5 pr-4 font-medium" style={{ color: T.text }}>{o.customer}</td>
                  <td className="py-3.5 pr-4" style={{ color: T.textSub }}>{o.category}</td>
                  <td className="py-3.5 pr-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ background: s.bg, color: s.color }}>{o.status}</span>
                  </td>
                  <td className="py-3.5 pr-4" style={{ color: T.textSub }}>{o.items} Items</td>
                  <td className="py-3.5 font-semibold" style={{ color: T.text }}>{o.total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Placeholder for unbuilt tabs ─────────────────────────────────────────────
function Placeholder({ tab }: { tab: Tab }) {
  const Icon = tab.icon;
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: T.accentDim }}>
        <Icon className="w-8 h-8" style={{ color: T.accent }} />
      </div>
      <div className="text-center">
        <p className="font-semibold text-lg" style={{ color: T.text }}>{tab.label}</p>
        <p className="text-sm mt-1" style={{ color: T.textSub }}>This section is coming next</p>
      </div>
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────
function AdminShell({ secret, onLogout }: { secret: string; onLogout: () => void }) {
  const [activeId, setActiveId]   = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const tab = NAV.find(t => t.id === activeId) ?? NAV[0];

  function selectTab(id: string) { setActiveId(id); setMobileOpen(false); }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: T.bg }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col h-full">
        <Sidebar activeTab={activeId} setActiveTab={selectTab} onLogout={onLogout} />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative flex flex-col h-full">
            <Sidebar activeTab={activeId} setActiveTab={selectTab} onLogout={onLogout} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile header */}
        <div className="flex items-center gap-3 px-4 py-3 md:hidden"
          style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
          <button onClick={() => setMobileOpen(true)} style={{ color: T.textSub }}>
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold" style={{ color: T.text }}>
            ProtoAdmin <span className="font-normal text-xs" style={{ color: T.muted }}>/ {tab.label}</span>
          </span>
        </div>

        {/* Desktop top bar */}
        <div className="hidden md:block">
          <TopBar tabLabel={tab.label} />
        </div>

        <main className="flex-1 overflow-y-auto">
          {activeId === "dashboard" ? <DashboardTab secret={secret} /> : <Placeholder tab={tab} />}
        </main>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function ProtoypeAdmin() {
  const [secret, setSecret] = useState<string | null>(() =>
    sessionStorage.getItem("proto_admin_secret")
  );
  const handleLogin  = useCallback((s: string) => { sessionStorage.setItem("proto_admin_secret", s); setSecret(s); }, []);
  const handleLogout = useCallback(() => { sessionStorage.removeItem("proto_admin_secret"); setSecret(null); }, []);

  if (!secret) return <LoginScreen onLogin={handleLogin} />;
  return <AdminShell secret={secret} onLogout={handleLogout} />;
}
