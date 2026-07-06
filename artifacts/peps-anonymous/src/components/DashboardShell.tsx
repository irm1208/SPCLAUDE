import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard, ReceiptText, UsersRound, HeartPulse, ClipboardList,
  Search, Bell, ChevronDown, ChevronRight, Clock, Sun, Moon, PanelLeft, Send, Ticket,
  Wallet, Store, ArrowRight, User, LogOut, X, Award, FlaskConical,
  Droplet, Scale, TrendingUp, Activity, Truck, ShoppingBag, Users, TestTube, LifeBuoy,
} from "lucide-react";
import { useGetProducts, useListLabTests } from "@workspace/api-client-react";
import { useAccount, useAccountNotifications } from "@/hooks/use-account";
import { useThemeStore } from "@/hooks/use-theme";
import { HubBottomNav } from "@/components/HubBottomNav";
import type { PortalNavProps } from "@/pages/CustomerPortal";

// ─── Shared data shapes (accept the real portal objects) ─────────────────────

export interface DashOrder {
  id: string; code: string; status: string; grandTotal: number;
  currency?: string | null; createdAt: string; deliveryMethod?: string;
  orderType?: string | null; groupBuyId?: string | null;
  lineItems: { productName: string; quantity: number }[];
}
export interface DashCompound {
  id: string; compoundName: string; compoundType: string;
  doseAmount: string; doseUnit: string; frequency: string;
  route: string; startDate: string; endDate: string | null;
}
export interface DashGroupBuy {
  id: string; name: string; status: string; closeDate: string | null;
  organiserId: string | null; productCount: number;
}

type NavProps = PortalNavProps;

// ─── Palette (exact hex, flips light/dark) ───────────────────────────────────

import { palette, ACCENT, ACCENT_SOFT, HERO_GRAD, FONT } from "./dashboard-theme";
export { palette, ACCENT, ACCENT_SOFT, HERO_GRAD, FONT };
export const STAR_AMBER = "#F5A623";
export const LIVE_RED = "#EF4444";
export const SEARCH_GROUPS = ["Orders", "Compounds", "Group Buys", "Shop", "Lab Tests"] as const;

export const AVATAR_GRADIENTS: [string, string][] = [
  ["#2D6BCC", "#1B3A7A"], ["#2E844A", "#166534"], ["#0891B2", "#0E7490"],
  ["#E9A020", "#B4770E"], ["#7C3AED", "#5B21B6"], ["#DB2777", "#9D174D"],
];
export function seedIndex(s: string, mod: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % mod;
}
export function SecIcon({ Icon }: { Icon: React.ElementType }) {
  return (
    <span className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 28, height: 28, background: ACCENT_SOFT, color: ACCENT }}>
      <Icon className="w-[16px] h-[16px]" />
    </span>
  );
}

export const COMPOUND_COLOR: Record<string, string> = {
  AAS: "#BA0517", TRT: "#0176D3", Peptide: "#2E844A",
  Supplement: "#0891B2", Other: ACCENT,
};

export const STATUS_STYLE: Record<string, { label: string; color: string; bg: string; pct: number }> = {
  Draft:      { label: "Draft",      color: "#64748B", bg: "rgba(100,116,139,0.12)", pct: 5 },
  Submitted:  { label: "Submitted",  color: "#B4770E", bg: "rgba(245,166,35,0.14)",  pct: 25 },
  Processing: { label: "Processing", color: "#B4770E", bg: "rgba(245,166,35,0.14)",  pct: 55 },
  Shipped:    { label: "Shipped",    color: ACCENT,    bg: "rgba(1,118,211,0.12)",   pct: 80 },
  Completed:  { label: "Completed",  color: "#0E9F6E", bg: "rgba(16,185,129,0.14)",  pct: 100 },
  Cancelled:  { label: "Cancelled",  color: "#DC2626", bg: "rgba(220,38,38,0.12)",   pct: 0 },
};

// Health Hub apps — mirrors the tiles on the Health Hub page (CustomerPortal "health-hub").
export const HEALTH_APPS: { id: string; label: string; Icon: React.ElementType; color: string; bg: string }[] = [
  { id: "glp1",               label: "GLP-1 Tracker",              Icon: Scale,       color: "#0891B2", bg: "rgba(8,145,178,0.12)"  },
  { id: "compounds",          label: "Compounds & Protocols",      Icon: FlaskConical, color: "#16A34A", bg: "rgba(22,163,74,0.12)"  },
  { id: "blood-tests",        label: "Blood Tests",                Icon: Droplet,      color: "#7C3AED", bg: "rgba(124,58,237,0.12)" },
  { id: "health",             label: "Health Insights",            Icon: HeartPulse,   color: "#DC2626", bg: "rgba(220,38,38,0.12)"  },
  { id: "plotter",            label: "Cycle Plotter",              Icon: TrendingUp,   color: ACCENT,    bg: ACCENT_SOFT             },
  { id: "fh-risk",            label: "Inherited Cholesterol Risk", Icon: HeartPulse,   color: "#DC2626", bg: "rgba(220,38,38,0.12)"  },
  { id: "insulin-resistance", label: "Insulin Resistance Score",   Icon: Activity,     color: "#0891B2", bg: "rgba(8,145,178,0.12)"  },
];

export function daysSince(iso: string) {
  const start = new Date((iso.length <= 10 ? iso + "T00:00:00" : iso)).getTime();
  return Math.max(0, Math.round((Date.now() - start) / 86_400_000));
}

export const CUR_SYM: Record<string, string> = { USD: "$", GBP: "£", EUR: "€", "$": "$", "£": "£", "€": "€" };
export function fmtMoney(n: number, cur?: string | null) {
  const sym = (cur && CUR_SYM[cur]) || "$";
  return `${sym}${(n ?? 0).toFixed(2)}`;
}

// ─── Shell props ─────────────────────────────────────────────────────────────

interface DashboardShellProps {
  activeSection: string;
  title: string;
  username: string;
  credits?: number | null;
  orders: DashOrder[];
  activeCompounds: DashCompound[];
  groupBuys: DashGroupBuy[];
  onSection: (s: string) => void;
  onLogout?: () => void;
  navProps?: NavProps;
  hideHubNav?: boolean;
  children: React.ReactNode;
}

/** Compact relative timestamp for the notifications dropdown. */
function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ─── Shell ───────────────────────────────────────────────────────────────────

export function DashboardShell({
  activeSection, title, username, credits, orders, activeCompounds, groupBuys,
  onSection, onLogout, navProps, hideHubNav, children,
}: DashboardShellProps) {
  const { dark, toggle: toggleTheme } = useThemeStore();
  const [, navigate] = useLocation();
  const T = palette(dark);
  const [collapsed, setCollapsed] = useState(false);

  // ── Global search + profile menu ──
  const [searchQ, setSearchQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [dq, setDq] = useState("");
  const [menu, setMenu] = useState<null | "profile" | "notifs">(null);

  // ── Notifications (bell) ──
  const { data: notifs } = useAccountNotifications();
  const [notifSeenAt, setNotifSeenAt] = useState<number>(() => {
    try { return Number(localStorage.getItem("sp_notif_seen") ?? 0) || 0; } catch { return 0; }
  });
  // Cutoff captured when the dropdown opens, so rows stay highlighted while it's open.
  const notifCutoffRef = useRef(notifSeenAt);
  const hasUnseenNotifs = (notifs ?? []).some(n => new Date(n.sentAt).getTime() > notifSeenAt);
  const toggleNotifs = () => {
    setSearchOpen(false);
    setMenu(m => {
      if (m === "notifs") return null;
      notifCutoffRef.current = notifSeenAt;
      const now = Date.now();
      setNotifSeenAt(now);
      try { localStorage.setItem("sp_notif_seen", String(now)); } catch { /* ignore */ }
      return "notifs";
    });
  };
  // Open a notification action link: in-app links navigate within the SPA, external open a new tab.
  const openNotifLink = (href: string) => {
    try {
      const u = new URL(href, window.location.origin);
      if (u.host === window.location.host) {
        setMenu(null);
        navigate(u.pathname + u.search + u.hash);
        return;
      }
    } catch { /* fall through to new tab */ }
    window.open(href, "_blank", "noopener,noreferrer");
  };
  // Rail quick-view flyout: which section is peeking, and the y-offset to anchor it.
  const [quickView, setQuickView] = useState<{ id: string; top: number } | null>(null);
  // Rail hover tooltip: page name shown beside the blue icon rail.
  const [railTip, setRailTip] = useState<{ label: string; top: number } | null>(null);
  const railTipProps = (label: string) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      setRailTip({ label, top: r.top + r.height / 2 });
    },
    onMouseLeave: () => setRailTip(null),
    onMouseDown: () => setRailTip(null),
  });
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce the search query so we don't hit the APIs on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDq(searchQ.trim()), 160);
    return () => clearTimeout(t);
  }, [searchQ]);

  // ⌘K / Ctrl+K focuses the global search; Esc closes any open dropdown.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === "Escape") { setMenu(null); setQuickView(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const initial = (username || "U").slice(0, 1).toUpperCase();

  // ── Live global search (local data + product & lab-test APIs) ──
  const searching = dq.length > 0;
  const { data: products = [], isFetching: productsFetching } =
    useGetProducts({ query: { enabled: searching } });
  const { data: labTests = [], isFetching: labTestsFetching } =
    useListLabTests({ q: dq }, { query: { enabled: dq.length > 1 } });

  // Lab tests for the rail quick-view flyout — fetched only while that flyout is open.
  const { data: qvLabTests = [], isFetching: qvLabFetching } =
    useListLabTests(undefined, { query: { enabled: quickView?.id === "lab-tests" } });

  type SearchHit = {
    key: string; group: (typeof SEARCH_GROUPS)[number]; label: string; sub?: string;
    Icon: React.ElementType; color: string; onSelect: () => void;
  };

  const searchHits = useMemo<SearchHit[]>(() => {
    if (!searching) return [];
    const q = dq.toLowerCase();
    const hits: SearchHit[] = [];

    orders
      .filter(o =>
        o.code.toLowerCase().includes(q) ||
        o.status.toLowerCase().includes(q) ||
        o.lineItems.some(li => li.productName.toLowerCase().includes(q)))
      .slice(0, 4)
      .forEach(o => hits.push({
        key: `o-${o.id}`, group: "Orders", label: o.code,
        sub: `${o.lineItems[0]?.productName ?? "Order"}${o.lineItems.length > 1 ? ` +${o.lineItems.length - 1}` : ""} · ${o.status}`,
        Icon: ReceiptText, color: ACCENT, onSelect: () => onSection("orders"),
      }));

    activeCompounds
      .filter(c =>
        c.compoundName.toLowerCase().includes(q) ||
        c.compoundType.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach(c => hits.push({
        key: `c-${c.id}`, group: "Compounds", label: c.compoundName,
        sub: `${c.compoundType} · ${c.doseAmount}${c.doseUnit}`,
        Icon: FlaskConical, color: COMPOUND_COLOR[c.compoundType] ?? ACCENT,
        onSelect: () => onSection("compounds"),
      }));

    groupBuys
      .filter(g => g.name.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach(g => hits.push({
        key: `g-${g.id}`, group: "Group Buys", label: g.name,
        sub: `${g.productCount} product${g.productCount === 1 ? "" : "s"} · ${g.status}`,
        Icon: UsersRound, color: ACCENT, onSelect: () => onSection("groups"),
      }));

    products
      .filter(p => p.name.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach(p => hits.push({
        key: `p-${p.id}`, group: "Shop", label: p.name,
        sub: `$${Number(p.price).toFixed(2)}`,
        Icon: Store, color: "#2E844A", onSelect: () => navigate("/shop"),
      }));

    labTests
      .slice(0, 5)
      .forEach(t => hits.push({
        key: `l-${t.id}`, group: "Lab Tests", label: t.peptideName,
        sub: `${t.supplier}${t.batchCode ? ` · ${t.batchCode}` : ""}`,
        Icon: Award, color: "#2D6BCC", onSelect: () => onSection("lab-tests"),
      }));

    return hits;
  }, [searching, dq, orders, activeCompounds, groupBuys, products, labTests, navigate, onSection]);

  const searchLoading = searching && (productsFetching || labTestsFetching);

  // ── Sidebar nav model ──
  const navItems = [
    { id: "home",       label: "Dashboard",  Icon: LayoutDashboard, active: activeSection === "home" },
    { id: "orders",     label: "Orders",     Icon: ReceiptText,     active: activeSection === "orders" },
    { id: "groups",     label: "Group Buys", Icon: UsersRound,      active: activeSection === "groups" },
    { id: "health-hub", label: "Health Hub", Icon: HeartPulse,      active: activeSection === "health-hub" },
    { id: "lab-tests",  label: "Lab Tests",  Icon: ClipboardList,   active: activeSection === "lab-tests" },
  ];

  // ── Role-gated workspaces + extra sections (mirrors the mobile "More" menu) ──
  const { account } = useAccount();
  type SideLink = { id: string; label: string; Icon: React.ElementType; active?: boolean; go: () => void };
  const workspaceItems: SideLink[] = [
    ...(account?.organiserStatus === "approved"
      ? [{ id: "gborganiser", label: "GB Organiser", Icon: Store, active: activeSection === "gborganiser", go: () => navigate("/gborganiser") }]
      : []),
    ...(account?.reshipperStatus === "approved"
      ? [{ id: "reshipper", label: "Reshipper", Icon: Truck, active: activeSection === "reshipper", go: () => navigate("/reshipper") }]
      : []),
    ...(account?.isWholesale
      ? [
          { id: "wholesale", label: "Wholesale", Icon: ShoppingBag, active: activeSection === "wholesale", go: () => navigate("/wholesale") },
          { id: "shared-orders", label: "Shared Orders", Icon: Users, active: activeSection === "shared-orders", go: () => navigate("/wholesale/shared") },
        ]
      : []),
  ];
  const moreItems: SideLink[] = [
    { id: "lab-pool", label: "Pool Leaders", Icon: TestTube, active: activeSection === "lab-pool", go: () => onSection("lab-pool") },
    { id: "support",  label: "Tickets",      Icon: LifeBuoy, active: activeSection === "support",  go: () => onSection("support") },
  ];

  // ── Sidebar orders, segmented by GB / Wholesale / Shared Orders ──
  const sideOrderGroups = useMemo(() => {
    const sorted = [...orders].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    const isShared = (o: DashOrder) => o.orderType === "wholesale_shared";
    const isWholesale = (o: DashOrder) => o.orderType === "wholesale";
    const groups = [
      { id: "gb",        label: "Group Buys",    Icon: UsersRound,  color: "#7C3AED", bg: "rgba(124,58,237,0.12)", items: sorted.filter(o => o.groupBuyId && !isWholesale(o) && !isShared(o)) },
      { id: "wholesale", label: "Wholesale",     Icon: ShoppingBag, color: "#2E844A", bg: "rgba(46,132,74,0.12)",  items: sorted.filter(isWholesale) },
      { id: "shared",    label: "Shared Orders", Icon: Users,       color: "#0891B2", bg: "rgba(8,145,178,0.12)",  items: sorted.filter(isShared) },
    ];
    return groups.map(g => ({ ...g, items: g.items.slice(0, 3) })).filter(g => g.items.length > 0);
  }, [orders]);

  const RAIL_W = 56;
  const SIDEBAR_W = collapsed ? RAIL_W : 250;

  // ── Rail quick-view flyout ──
  const QV_TITLE: Record<string, string> = {
    orders: "Recent Orders", groups: "Group Buys",
    "health-hub": "Health Hub", "lab-tests": "Lab Tests",
  };
  const qvRow = "dh-nav w-full flex items-center gap-2.5 rounded-lg text-left transition-colors";

  const qvEmpty = (Icon: React.ElementType, text: string) => (
    <div className="flex flex-col items-center justify-center text-center" style={{ padding: "28px 16px", color: T.subtle }}>
      <Icon className="w-6 h-6" style={{ marginBottom: 8, opacity: 0.55 }} />
      <span style={{ fontSize: 12.5 }}>{text}</span>
    </div>
  );

  const openQuickView = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (id === "home") { onSection("home"); setQuickView(null); return; }
    setMenu(null);
    setSearchOpen(false);
    const rect = e.currentTarget.getBoundingClientRect();
    const top = Math.max(12, Math.min(rect.top - 4, window.innerHeight - 300));
    setQuickView(qv => (qv?.id === id ? null : { id, top }));
  };

  const quickBody = (id: string): React.ReactNode => {
    if (id === "orders") {
      const items = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
      if (!items.length) return qvEmpty(ReceiptText, "No orders yet");
      return items.map(o => {
        const st = STATUS_STYLE[o.status] ?? STATUS_STYLE.Submitted;
        return (
          <button key={o.id} onClick={() => { onSection("orders"); setQuickView(null); }} className={qvRow} style={{ padding: "8px 10px", color: T.text }}>
            <span className="flex items-center justify-center shrink-0 rounded-lg" style={{ width: 32, height: 32, background: T.chip, color: ACCENT }}>
              <ReceiptText className="w-4 h-4" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold" style={{ fontSize: 13 }}>{o.code}</span>
                <span className="shrink-0 font-bold" style={{ fontSize: 12.5 }}>{fmtMoney(o.grandTotal, o.currency)}</span>
              </span>
              <span className="flex items-center justify-between gap-2" style={{ marginTop: 2 }}>
                <span className="truncate" style={{ fontSize: 11.5, color: T.subtle }}>
                  {o.lineItems[0]?.productName ?? "Order"}{o.lineItems.length > 1 ? ` +${o.lineItems.length - 1}` : ""}
                </span>
                <span className="shrink-0 rounded-full font-semibold" style={{ fontSize: 10, padding: "1px 7px", color: st.color, background: st.bg }}>{st.label}</span>
              </span>
            </span>
          </button>
        );
      });
    }
    if (id === "groups") {
      const items = groupBuys.slice(0, 6);
      if (!items.length) return qvEmpty(UsersRound, "No group buys yet");
      return items.map(g => {
        const [gc1, gc2] = AVATAR_GRADIENTS[seedIndex(g.name, AVATAR_GRADIENTS.length)];
        return (
          <button key={g.id} onClick={() => { onSection("groups"); setQuickView(null); }} className={qvRow} style={{ padding: "8px 10px", color: T.text }}>
            <span className="flex items-center justify-center shrink-0 rounded-xl text-white" style={{ width: 32, height: 32, fontSize: 12.5, fontWeight: 800, background: `linear-gradient(135deg, ${gc1}, ${gc2})` }}>
              {g.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block truncate font-semibold" style={{ fontSize: 13 }}>{g.name}</span>
              <span className="block truncate" style={{ fontSize: 11.5, color: T.subtle, marginTop: 2 }}>
                {g.productCount} product{g.productCount === 1 ? "" : "s"} · {g.status}
              </span>
            </span>
          </button>
        );
      });
    }
    if (id === "health-hub") {
      return HEALTH_APPS.map(({ id: aid, label, Icon, color, bg }) => (
        <button key={aid} onClick={() => { onSection(aid); setQuickView(null); }} className={qvRow} style={{ padding: "8px 10px", color: T.text }}>
          <span className="flex items-center justify-center shrink-0 rounded-lg" style={{ width: 32, height: 32, background: bg, color }}>
            <Icon className="w-4 h-4" />
          </span>
          <span className="flex-1 min-w-0 truncate font-semibold" style={{ fontSize: 13 }}>{label}</span>
        </button>
      ));
    }
    if (id === "lab-tests") {
      if (qvLabFetching && !qvLabTests.length) return qvEmpty(Clock, "Loading reports…");
      const items = qvLabTests.slice(0, 6);
      if (!items.length) return qvEmpty(Award, "No lab tests yet");
      return items.map(t => (
        <button key={t.id} onClick={() => { onSection("lab-tests"); setQuickView(null); }} className={qvRow} style={{ padding: "8px 10px", color: T.text }}>
          <span className="flex items-center justify-center shrink-0 rounded-lg" style={{ width: 32, height: 32, background: "rgba(45,107,204,.12)", color: "#2D6BCC" }}><Award className="w-4 h-4" /></span>
          <span className="flex-1 min-w-0">
            <span className="block truncate font-semibold" style={{ fontSize: 13 }}>{t.peptideName}</span>
            <span className="block truncate" style={{ fontSize: 11.5, color: T.subtle, marginTop: 2 }}>{t.supplier}{t.batchCode ? ` · ${t.batchCode}` : ""}</span>
          </span>
        </button>
      ));
    }
    return null;
  };

  return (
    <div className="flex w-full min-h-screen lg:h-screen lg:overflow-hidden" style={{ background: T.page, fontFamily: FONT, color: T.text }}>
      <style>{`
        .dh-nav:hover { background: ${T.chip} !important; }
        .dh-rail:hover { background: rgba(255,255,255,0.10) !important; }
        .dh-scroll::-webkit-scrollbar { height: 0; width: 6px; }
        .dh-scroll::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        .dh-card-hover { transition: transform .18s ease, box-shadow .18s ease; }
        .dh-card-hover:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(16,17,33,.10); }
        .dh-rise { opacity: 0; transform: translateY(10px); animation: dhRise .5s cubic-bezier(.22,1,.36,1) forwards; }
        @keyframes dhRise { to { opacity: 1; transform: translateY(0); } }
        .dh-orb { position: absolute; border-radius: 9999px; filter: blur(44px); pointer-events: none; opacity: .8; }
        .dh-float-a { animation: dhFloatA 9s ease-in-out infinite; }
        .dh-float-b { animation: dhFloatB 11s ease-in-out infinite; }
        @keyframes dhFloatA { 0%,100% { transform: translate(0,0); } 50% { transform: translate(20px,-16px); } }
        @keyframes dhFloatB { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-18px,14px); } }
        .dh-sage-ring { animation: dhGlow 2.8s ease-in-out infinite; }
        @keyframes dhGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,.35); } 50% { box-shadow: 0 0 0 7px rgba(255,255,255,0); } }
        .dh-chip { transition: background .15s ease, border-color .15s ease, transform .15s ease; }
        .dh-chip:hover { background: rgba(255,255,255,.2) !important; border-color: rgba(255,255,255,.45) !important; transform: translateY(-1px); }
        .dh-send { transition: transform .15s ease, box-shadow .15s ease, opacity .15s ease; }
        .dh-send:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(1,118,211,.5); }
        @media (prefers-reduced-motion: reduce) {
          .dh-rise, .dh-float-a, .dh-float-b, .dh-sage-ring { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
        @media (min-width: 1024px) and (max-height: 960px) {
          .dh-side-promo { display: none; }
        }
        @media (min-width: 1024px) and (max-height: 560px) {
          .dh-side-compounds { display: none; }
        }
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
            {navItems.filter(({ id }) => id === "home" || id === "lab-tests").map(({ id, label, Icon, active }) => {
              const on = active || quickView?.id === id;
              return (
              <button
                key={id}
                onClick={(e) => openQuickView(id, e)}
                {...railTipProps(label)}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                aria-expanded={quickView?.id === id}
                className={on ? "flex items-center justify-center transition-all" : "dh-rail flex items-center justify-center transition-all"}
                style={{
                  width: 40, height: 40, borderRadius: 6,
                  background: on ? "rgba(255,255,255,0.16)" : "transparent",
                  color: on ? "#fff" : "rgba(255,255,255,0.62)",
                  boxShadow: "none",
                }}
              >
                <Icon className="w-[19px] h-[19px]" strokeWidth={on ? 2.4 : 2} />
              </button>
              );
            })}
          </nav>

          {/* Health Hub apps */}
          <nav
            className="flex flex-col items-center gap-1.5"
            style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.14)" }}
          >
            {HEALTH_APPS.map(({ id, label, Icon }) => {
              const on = activeSection === id;
              return (
              <button
                key={id}
                onClick={() => { setQuickView(null); onSection(id); }}
                {...railTipProps(label)}
                aria-label={label}
                aria-current={on ? "page" : undefined}
                className={on ? "flex items-center justify-center transition-all" : "dh-rail flex items-center justify-center transition-all"}
                style={{
                  width: 40, height: 40, borderRadius: 6,
                  background: on ? "rgba(255,255,255,0.16)" : "transparent",
                  color: on ? "#fff" : "rgba(255,255,255,0.62)",
                }}
              >
                <Icon className="w-[19px] h-[19px]" strokeWidth={on ? 2.4 : 2} />
              </button>
              );
            })}
          </nav>

          <div className="flex flex-col items-center gap-1.5" style={{ marginTop: "auto", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.14)" }}>
            <button
              onClick={() => { setQuickView(null); onSection("support"); }}
              {...railTipProps("Tickets")}
              aria-label="Tickets"
              className="dh-rail flex items-center justify-center transition-all"
              style={{ width: 40, height: 40, borderRadius: 6, color: "rgba(255,255,255,0.62)" }}
            >
              <Ticket className="w-[19px] h-[19px]" />
            </button>
            <button
              onClick={() => navigate("/shop")}
              {...railTipProps("Shop")}
              aria-label="Shop"
              className="dh-rail flex items-center justify-center transition-all"
              style={{ width: 40, height: 40, borderRadius: 6, color: "rgba(255,255,255,0.62)" }}
            >
              <Store className="w-[19px] h-[19px]" />
            </button>
            <button
              onClick={() => setCollapsed(c => !c)}
              {...railTipProps(collapsed ? "Expand" : "Collapse")}
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

              {/* Workspaces (role-gated) */}
              {workspaceItems.length > 0 && (
                <>
                  <p className="px-3 mt-6 mb-2 font-semibold" style={{ fontSize: 12, letterSpacing: ".01em", color: T.subtle }}>Workspaces</p>
                  <nav className="flex flex-col gap-0.5">
                    {workspaceItems.map(({ id, label, Icon, active, go }) => (
                      <button
                        key={id}
                        onClick={go}
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
                </>
              )}

              {/* More */}
              <p className="px-3 mt-6 mb-2 font-semibold" style={{ fontSize: 12, letterSpacing: ".01em", color: T.subtle }}>More</p>
              <nav className="flex flex-col gap-0.5">
                {moreItems.map(({ id, label, Icon, active, go }) => (
                  <button
                    key={id}
                    onClick={go}
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
            <div className="dh-side-compounds">
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
            </div>
          )}

          {/* Orders, segmented by GB / Wholesale / Shared Orders */}
          {!collapsed && sideOrderGroups.length > 0 && (
            <div className="dh-side-orders">
              <p className="px-3 mt-6 mb-2 font-semibold" style={{ fontSize: 12, letterSpacing: ".01em", color: T.subtle }}>Orders</p>
              {sideOrderGroups.map(g => (
                <div key={g.id} className="mb-2">
                  <p className="px-3 mb-1 font-bold uppercase" style={{ fontSize: 10, letterSpacing: ".07em", color: T.subtle, opacity: 0.8 }}>{g.label}</p>
                  <div className="flex flex-col gap-0.5">
                    {g.items.map(o => {
                      const st = STATUS_STYLE[o.status];
                      return (
                        <button
                          key={o.id}
                          onClick={() => navigate(`/account/orders/${o.id}`)}
                          className="dh-nav w-full flex items-center gap-3 rounded-md px-3 text-left"
                          style={{ height: 40, color: T.text, fontWeight: 600, fontSize: 13 }}
                        >
                          <span className="flex items-center justify-center shrink-0 rounded-lg" style={{ width: 28, height: 28, background: g.bg, color: g.color }}>
                            <g.Icon className="w-[15px] h-[15px]" />
                          </span>
                          <span className="truncate flex-1">{o.code}</span>
                          {st && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: st.color }} title={st.label} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom promo card */}
          {!collapsed && (
            <button
              onClick={() => onSection("telegram")}
              className="dh-card-hover dh-side-promo w-full text-left mt-6 rounded-xl relative overflow-hidden"
              style={{ background: HERO_GRAD, padding: 16, color: "#fff" }}
            >
              <div className="absolute" style={{ top: -28, right: -22, width: 108, height: 108, borderRadius: 9999, background: "rgba(255,255,255,.14)", filter: "blur(26px)", pointerEvents: "none" }} />
              <div className="relative">
                <div className="flex items-center justify-center rounded-lg mb-3" style={{ width: 36, height: 36, background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.28)", color: "#fff" }}>
                  <Send className="w-[18px] h-[18px]" />
                </div>
                <p className="font-bold leading-tight" style={{ fontSize: 14 }}>Take Salt &amp; Peps Everywhere</p>
                <p style={{ fontSize: 11.5, color: "rgba(255,255,255,.72)", marginTop: 4, lineHeight: 1.4 }}>Order updates &amp; alerts on Telegram.</p>
                <span className="inline-flex items-center gap-1.5 mt-3 rounded-lg font-bold" style={{ fontSize: 11.5, padding: "8px 12px", background: "#fff", color: "#1B3A7A" }}>
                  Connect Telegram <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          )}
            </div>
          </div>
        )}
      </aside>

      {/* ══ Rail hover tooltip (desktop) ══ */}
      {railTip && !quickView && (
        <div
          className="hidden lg:block fixed z-50 pointer-events-none whitespace-nowrap"
          style={{
            left: RAIL_W + 10, top: railTip.top, transform: "translateY(-50%)",
            background: "#032D60", color: "#fff", fontSize: 12, fontWeight: 600,
            padding: "5px 10px", borderRadius: 6,
            boxShadow: "0 6px 18px rgba(3,45,96,.35)",
          }}
        >
          {railTip.label}
        </div>
      )}

      {/* ══ Rail quick-view flyout (desktop) ══ */}
      {quickView && (
        <div className="hidden lg:block">
          <div className="fixed inset-y-0 right-0 z-30" style={{ left: SIDEBAR_W }} onClick={() => setQuickView(null)} />
          <div
            className="fixed z-40 dh-rise flex flex-col"
            style={{
              left: SIDEBAR_W + 10, top: quickView.top, width: 320,
              maxHeight: `min(520px, calc(100vh - ${quickView.top}px - 12px))`,
              background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12,
              boxShadow: "0 18px 48px rgba(16,17,33,.24)", overflow: "hidden",
            }}
          >
            <div className="flex items-center justify-between shrink-0" style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}>
              <span className="font-bold" style={{ fontSize: 13.5, color: T.text }}>{QV_TITLE[quickView.id]}</span>
              <button onClick={() => setQuickView(null)} className="flex items-center justify-center rounded-md" style={{ width: 26, height: 26, color: T.subtle }} aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto dh-scroll" style={{ padding: 6 }}>
              {quickBody(quickView.id)}
            </div>
            <button
              onClick={() => { onSection(quickView.id); setQuickView(null); }}
              className="dh-nav shrink-0 flex items-center justify-center gap-1.5 font-semibold"
              style={{ padding: "11px 14px", borderTop: `1px solid ${T.border}`, color: ACCENT, fontSize: 12.5 }}
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ══ Main ══ */}
      <div className="flex-1 min-w-0 lg:h-screen lg:overflow-y-auto lg:overflow-x-hidden dh-scroll" style={{ marginLeft: 0 }}>
        <div style={{ paddingLeft: 0 }} className="lg:pl-0">
          <div className="lg:ml-[var(--dh-ml)]" style={{ ["--dh-ml" as any]: `${SIDEBAR_W}px`, transition: "margin .2s ease" }}>

            {/* Top bar */}
            <header
              className="sticky top-0 z-10 flex items-center gap-3 px-3 md:px-7"
              style={{ height: 72, background: T.panel, borderBottom: `1px solid ${T.border}` }}
            >
              <h1 className="font-extrabold tracking-tight shrink-0" style={{ fontSize: 21 }}>{title}</h1>

              <div className="flex-1 flex justify-center min-w-0 sm:px-2">
                <div className="relative hidden sm:block w-full max-w-[460px]">
                  <div
                    className="flex items-center gap-2.5 w-full rounded-md"
                    style={{
                      height: 42, padding: "0 14px", background: T.panel,
                      border: `1px solid ${searchOpen ? ACCENT : T.border}`,
                      boxShadow: searchOpen ? `0 0 0 3px ${ACCENT_SOFT}` : "none",
                      transition: "border-color .15s ease, box-shadow .15s ease",
                    }}
                  >
                    <Search className="w-4 h-4 shrink-0" style={{ color: T.subtle }} />
                    <input
                      ref={searchInputRef}
                      value={searchQ}
                      onChange={e => { setSearchQ(e.target.value); setSearchOpen(true); }}
                      onFocus={() => { setSearchOpen(true); setMenu(null); }}
                      onKeyDown={e => {
                        if (e.key === "Escape") { setSearchOpen(false); searchInputRef.current?.blur(); }
                        if (e.key === "Enter" && searchHits[0]) { searchHits[0].onSelect(); setSearchOpen(false); setSearchQ(""); }
                      }}
                      placeholder="Search orders, compounds, group buys, products..."
                      className="flex-1 min-w-0 bg-transparent outline-none"
                      style={{ fontSize: 13.5, color: T.text }}
                    />
                    {searchQ ? (
                      <button
                        onClick={() => { setSearchQ(""); searchInputRef.current?.focus(); }}
                        className="flex items-center justify-center rounded shrink-0"
                        style={{ width: 20, height: 20, color: T.subtle }}
                        title="Clear"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span
                        className="hidden md:flex items-center gap-1 rounded-md font-semibold shrink-0"
                        style={{ fontSize: 11, padding: "3px 7px", background: T.chip, color: T.subtle }}
                      >⌘ K</span>
                    )}
                  </div>

                  {searchOpen && searchQ.length > 0 && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setSearchOpen(false)} />
                      <div
                        className="absolute left-0 right-0 z-50 mt-2 rounded-lg dh-scroll"
                        style={{ top: "100%", background: T.panel, border: `1px solid ${T.border}`, boxShadow: "0 12px 32px rgba(16,17,33,.16)", maxHeight: 440, overflowY: "auto" }}
                      >
                        {searchLoading && searchHits.length === 0 && (
                          <div className="px-4 py-5 text-center" style={{ fontSize: 12.5, color: T.muted }}>Searching…</div>
                        )}
                        {!searchLoading && searchHits.length === 0 && (
                          <div className="px-4 py-6 text-center">
                            <p className="font-semibold" style={{ fontSize: 13 }}>No matches for “{searchQ}”</p>
                            <p style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>Try an order code, compound, or product name.</p>
                          </div>
                        )}
                        {SEARCH_GROUPS.map(group => {
                          const groupHits = searchHits.filter(h => h.group === group);
                          if (groupHits.length === 0) return null;
                          return (
                            <div key={group}>
                              <p className="px-4 pt-3 pb-1.5 font-semibold uppercase" style={{ fontSize: 10.5, letterSpacing: ".04em", color: T.subtle }}>{group}</p>
                              {groupHits.map(h => (
                                <button
                                  key={h.key}
                                  onMouseDown={e => e.preventDefault()}
                                  onClick={() => { h.onSelect(); setSearchOpen(false); setSearchQ(""); }}
                                  className="dh-nav w-full flex items-center gap-3 px-4 text-left"
                                  style={{ height: 48 }}
                                >
                                  <span className="flex items-center justify-center rounded-md shrink-0" style={{ width: 30, height: 30, background: `${h.color}1A`, color: h.color }}>
                                    <h.Icon className="w-4 h-4" />
                                  </span>
                                  <span className="flex-1 min-w-0">
                                    <span className="block font-semibold truncate" style={{ fontSize: 13, color: T.text }}>{h.label}</span>
                                    {h.sub && <span className="block truncate" style={{ fontSize: 11.5, color: T.muted }}>{h.sub}</span>}
                                  </span>
                                  <ChevronRight className="w-4 h-4 shrink-0" style={{ color: T.subtle }} />
                                </button>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {typeof credits === "number" && (
                  <button
                    onClick={() => onSection("orders")}
                    className="flex items-center gap-2 rounded-lg pl-2 pr-3 transition-colors"
                    style={{ height: 40, background: dark ? "rgba(45,107,204,.14)" : "rgba(45,107,204,.08)", border: `1px solid ${dark ? "rgba(45,107,204,.3)" : "rgba(45,107,204,.18)"}` }}
                    title="Store credits"
                  >
                    <span className="flex items-center justify-center rounded-md shrink-0" style={{ width: 26, height: 26, background: "#fff", color: "#2D6BCC", border: "1px solid rgba(45,107,204,.18)" }}>
                      <Wallet className="w-[15px] h-[15px]" />
                    </span>
                    <span className="flex flex-col items-start leading-none">
                      <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#2D6BCC" }}>Credits</span>
                      <span className="font-extrabold" style={{ fontSize: 13, color: T.text, letterSpacing: "-0.01em", marginTop: 2 }}>${credits.toFixed(2)}</span>
                    </span>
                  </button>
                )}
                <button
                  onClick={toggleTheme}
                  className="hidden md:flex items-center justify-center rounded-md transition-colors"
                  style={{ width: 40, height: 40, background: T.panel, border: `1px solid ${T.border}`, color: T.muted }}
                  title={dark ? "Light mode" : "Dark mode"}
                >
                  {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <div className="relative">
                  <button
                    onClick={toggleNotifs}
                    className="relative flex items-center justify-center rounded-md transition-colors"
                    style={{ width: 40, height: 40, background: T.panel, border: `1px solid ${menu === "notifs" ? ACCENT : T.border}`, color: T.muted }}
                    title="Notifications"
                    aria-label="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {hasUnseenNotifs && (
                      <span className="absolute rounded-full" style={{ top: 9, right: 10, width: 7, height: 7, background: LIVE_RED, border: `2px solid ${T.panel}` }} />
                    )}
                  </button>
                  {menu === "notifs" && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
                      <div className="absolute right-0 z-50 mt-2 rounded-lg overflow-hidden" style={{ top: "100%", width: 340, maxWidth: "calc(100vw - 24px)", background: T.panel, border: `1px solid ${T.border}`, boxShadow: "0 12px 32px rgba(16,17,33,.16)" }}>
                        <div className="px-3.5 py-3" style={{ borderBottom: `1px solid ${T.borderSoft}` }}>
                          <p className="font-bold" style={{ fontSize: 13 }}>Notifications</p>
                        </div>
                        <div style={{ maxHeight: 380, overflowY: "auto" }}>
                          {(notifs ?? []).length === 0 ? (
                            <div className="flex flex-col items-center gap-1.5 px-4 py-8 text-center">
                              <Bell className="w-5 h-5" style={{ color: T.subtle }} />
                              <p style={{ fontSize: 12.5, color: T.muted, fontWeight: 600 }}>No notifications yet</p>
                              <p style={{ fontSize: 11.5, color: T.subtle }}>Order updates and support replies will show up here.</p>
                            </div>
                          ) : (notifs ?? []).map(n => {
                            const lines = n.text.split("\n").map(l => l.trim()).filter(Boolean);
                            const nTitle = lines[0] ?? "Notification";
                            const nBody = lines.slice(1).join("\n");
                            const unread = new Date(n.sentAt).getTime() > notifCutoffRef.current;
                            return (
                              <div key={n.id} className="px-3.5 py-2.5 flex gap-2.5" style={{ borderBottom: `1px solid ${T.borderSoft}`, background: unread ? (dark ? "rgba(45,107,204,.12)" : "rgba(45,107,204,.05)") : "transparent" }}>
                                <span className="rounded-full shrink-0" style={{ width: 7, height: 7, marginTop: 5, background: unread ? LIVE_RED : "transparent" }} />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate" style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>{nTitle}</p>
                                  {nBody && (
                                    <p style={{ fontSize: 11.5, lineHeight: 1.45, color: T.muted, whiteSpace: "pre-line", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", marginTop: 1 }}>{nBody}</p>
                                  )}
                                  {(n.links?.length ?? 0) > 0 && (
                                    <div className="flex flex-wrap gap-1.5" style={{ marginTop: 5 }}>
                                      {n.links.map(l => (
                                        <button
                                          key={l.href}
                                          onClick={() => openNotifLink(l.href)}
                                          className="dh-nav inline-flex items-center gap-1 rounded-md"
                                          style={{ padding: "3px 8px", fontSize: 11, fontWeight: 700, color: ACCENT, background: dark ? "rgba(45,107,204,.16)" : "rgba(45,107,204,.08)", border: `1px solid ${dark ? "rgba(45,107,204,.35)" : "rgba(45,107,204,.22)"}` }}
                                        >
                                          {l.label}
                                          <ArrowRight className="w-3 h-3" />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  <p style={{ fontSize: 10.5, color: T.subtle, marginTop: 3 }}>{timeAgo(n.sentAt)}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => { setMenu(null); onSection("orders"); }}
                          className="dh-nav w-full flex items-center justify-center gap-2"
                          style={{ height: 40, fontSize: 12.5, fontWeight: 700, color: ACCENT, borderTop: `1px solid ${T.borderSoft}` }}
                        >
                          View my orders <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <div className="relative">
                  <button
                    onClick={() => { setSearchOpen(false); setMenu(m => (m === "profile" ? null : "profile")); }}
                    className="flex items-center gap-2 rounded-md pl-1 pr-2"
                    style={{ height: 44, background: T.panel, border: `1px solid ${menu === "profile" ? ACCENT : T.border}` }}
                  >
                    <span className="flex items-center justify-center rounded-full text-white shrink-0" style={{ width: 34, height: 34, background: ACCENT, fontWeight: 700, fontSize: 14 }}>{initial}</span>
                    <span className="hidden md:flex flex-col items-start leading-tight min-w-0">
                      <span className="font-bold truncate" style={{ fontSize: 12.5, maxWidth: 120 }}>{username}</span>
                      <span className="truncate" style={{ fontSize: 11, color: T.subtle, maxWidth: 120 }}>@{username}</span>
                    </span>
                    <ChevronDown className="w-4 h-4 shrink-0 transition-transform hidden md:block" style={{ color: T.subtle, transform: menu === "profile" ? "rotate(180deg)" : "none" }} />
                  </button>
                  {menu === "profile" && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
                      <div className="absolute right-0 z-50 mt-2 rounded-lg overflow-hidden" style={{ top: "100%", width: 220, background: T.panel, border: `1px solid ${T.border}`, boxShadow: "0 12px 32px rgba(16,17,33,.16)" }}>
                        <div className="px-3.5 py-3" style={{ borderBottom: `1px solid ${T.borderSoft}` }}>
                          <p className="font-bold truncate" style={{ fontSize: 13 }}>{username}</p>
                          <p className="truncate" style={{ fontSize: 11.5, color: T.subtle }}>@{username}</p>
                        </div>
                        <div className="py-1.5">
                          {([
                            { label: "View profile", Icon: User, run: () => onSection("profile"), keepOpen: false },
                            { label: "My orders", Icon: ReceiptText, run: () => onSection("orders"), keepOpen: false },
                            { label: "Group buys", Icon: UsersRound, run: () => onSection("groups"), keepOpen: false },
                            { label: "Lab tests", Icon: ClipboardList, run: () => onSection("lab-tests"), keepOpen: false },
                            { label: dark ? "Light mode" : "Dark mode", Icon: dark ? Sun : Moon, run: toggleTheme, keepOpen: true },
                          ] as { label: string; Icon: React.ElementType; run: () => void; keepOpen: boolean }[]).map(item => (
                            <button
                              key={item.label}
                              onClick={() => { item.run(); if (!item.keepOpen) setMenu(null); }}
                              className="dh-nav w-full flex items-center gap-3 px-3.5 text-left"
                              style={{ height: 40, fontSize: 13, color: T.text, fontWeight: 600 }}
                            >
                              <item.Icon className="w-4 h-4 shrink-0" style={{ color: T.muted }} />
                              {item.label}
                            </button>
                          ))}
                        </div>
                        {onLogout && (
                          <div className="py-1.5" style={{ borderTop: `1px solid ${T.borderSoft}` }}>
                            <button
                              onClick={() => { setMenu(null); onLogout(); }}
                              className="dh-nav w-full flex items-center gap-3 px-3.5 text-left"
                              style={{ height: 40, fontSize: 13, color: "#DC2626", fontWeight: 600 }}
                            >
                              <LogOut className="w-4 h-4 shrink-0" />
                              Sign out
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </header>

            {children}

          </div>
        </div>
      </div>

      {navProps && !hideHubNav && <HubBottomNav {...(navProps as unknown as React.ComponentProps<typeof HubBottomNav>)} hideAt="lg" />}
    </div>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────

export function StatCard({
  T, label, value, Icon, highlight, iconColor, onClick,
}: {
  T: ReturnType<typeof palette>;
  label: string; value: number | string; Icon: React.ElementType;
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
