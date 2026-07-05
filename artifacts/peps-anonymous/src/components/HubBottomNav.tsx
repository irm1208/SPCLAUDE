import React, { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard, Syringe, FlaskConical, HeartPulse,
  Scale, LineChart, Users, UsersRound, User, MessageCircle, History,
  Store, TestTube, X, LogOut, Sun, Moon,
  ReceiptText, MoreHorizontal, Truck, ShoppingBag, BookMarked, ClipboardList, MessageSquarePlus,
} from "lucide-react";
import { useThemeStore } from "@/hooks/use-theme";
import { useHubDrawerStore } from "@/hooks/use-hub-drawer";
import { useLogout } from "@/hooks/use-account";
import { palette, ACCENT, FONT } from "@/components/dashboard-theme";

export type HubSection = "home" | "orders" | "groups" | "compounds" | "blood-tests" | "health" | "glp1" | "plotter" | "profile" | "telegram" | "history" | "health-hub" | "lab-pool" | "gb-testing";

export const HUB_SECTION_ALL_META: { id: HubSection; label: string; icon: React.ElementType }[] = [
  { id: "home",        label: "Hub",             icon: LayoutDashboard },
  { id: "orders",      label: "Orders",          icon: ReceiptText },
  { id: "groups",      label: "Group Buys",      icon: Users },
  { id: "compounds",   label: "Compounds",       icon: Syringe },
  { id: "blood-tests", label: "Blood Tests",     icon: FlaskConical },
  { id: "health",      label: "Health Insights", icon: HeartPulse },
  { id: "glp1",        label: "GLP-1 Tracker",  icon: Scale },
  { id: "plotter",     label: "Cycle Plotter",  icon: LineChart },
  { id: "profile",     label: "Profile",         icon: User },
  { id: "telegram",    label: "Telegram",        icon: MessageCircle },
  { id: "history",     label: "My History",      icon: History },
  { id: "lab-pool",    label: "Testing Pools",   icon: TestTube },
  { id: "gb-testing",  label: "GB Testing",      icon: FlaskConical },
  { id: "health-hub",  label: "Health Hub",      icon: HeartPulse },
];

const BOTTOM_NAV_ITEMS: { id: HubSection; label: string; icon: React.ElementType }[] = [
  { id: "home",       label: "Home",   icon: LayoutDashboard },
  { id: "orders",     label: "Orders", icon: ReceiptText },
  { id: "groups",     label: "Groups", icon: UsersRound },
  { id: "health-hub", label: "Health", icon: HeartPulse },
];

interface HubBottomNavProps {
  section: HubSection;
  setSection: (s: HubSection) => void;
  hubMoreOpen: boolean;
  setHubMoreOpen: (open: boolean) => void;
  account?: { organiserStatus?: string | null; reshipperStatus?: string | null; isWholesale?: boolean } | null;
  navOrder?: HubSection[];
  /** Breakpoint at which the bottom bar/drawer hide. "md" (default) hides ≥768px; "lg" keeps them visible through tablet and hides ≥1024px. */
  hideAt?: "md" | "lg";
}

type DrawerItem = {
  key: string;
  label: string;
  Icon: React.ElementType;
  active?: boolean;
  onClick: () => void;
};

export function HubBottomNav({
  section,
  setSection,
  account,
  hideAt = "md",
}: HubBottomNavProps) {
  const hiddenCls = hideAt === "lg" ? "lg:hidden" : "md:hidden";
  const hideMinWidth = hideAt === "lg" ? 1024 : 768;
  const [, setLocation] = useLocation();
  const { dark, toggle: toggleTheme } = useThemeStore();
  const { open, setOpen } = useHubDrawerStore();
  const logout = useLogout();
  const drawerRef = useRef<HTMLDivElement>(null);

  const T = palette(dark);
  const activeBg = dark ? "rgba(1,118,211,0.18)" : "rgba(1,118,211,0.10)";

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  useEffect(() => {
    // The drawer (and its backdrop/close button) is hidden above the `hideAt`
    // breakpoint. Only lock body scroll while the drawer is actually shown. On
    // desktop the drawer is hidden, so never lock scroll there — and auto-close
    // any stale open state so a leftover `open` can't strand desktop users on a
    // page that can no longer scroll or reveal a close control.
    const mq = window.matchMedia(`(min-width: ${hideMinWidth}px)`);
    const apply = () => {
      if (mq.matches) {
        document.body.style.overflow = "";
        if (open) setOpen(false);
      } else {
        document.body.style.overflow = open ? "hidden" : "";
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.body.style.overflow = "";
    };
  }, [open, setOpen, hideMinWidth]);

  const navigate = (sectionId: HubSection) => {
    setSection(sectionId);
    setOpen(false);
  };

  const go = (path: string) => {
    setOpen(false);
    setLocation(path);
  };

  const isMoreActive = open || !BOTTOM_NAV_ITEMS.some(i => i.id === section);

  // ── Drawer nav model (mirrors the desktop sidebar) ──
  const roleItems: DrawerItem[] = [
    ...(account?.organiserStatus === "approved"
      ? [{ key: "organiser", label: "GB Organiser", Icon: Store, onClick: () => go("/gborganiser") }]
      : []),
    ...(account?.reshipperStatus === "approved"
      ? [{ key: "reshipper", label: "Reshipper", Icon: Truck, onClick: () => go("/reshipper") }]
      : []),
    ...(account?.isWholesale
      ? [
          { key: "wholesale", label: "Wholesale", Icon: ShoppingBag, onClick: () => go("/wholesale") },
          { key: "shared-order", label: "Shared Order", Icon: Users, onClick: () => go("/wholesale/shared") },
        ]
      : []),
  ];

  const drawerGroups: { label?: string; items: DrawerItem[] }[] = [
    {
      items: [
        { key: "home",       label: "Dashboard",  Icon: LayoutDashboard, active: section === "home",       onClick: () => navigate("home") },
        { key: "orders",     label: "Orders",     Icon: ReceiptText,     active: section === "orders",     onClick: () => navigate("orders") },
        { key: "groups",     label: "Group Buys", Icon: UsersRound,      active: section === "groups",     onClick: () => navigate("groups") },
        { key: "health-hub", label: "Health Hub", Icon: HeartPulse,      active: section === "health-hub", onClick: () => navigate("health-hub") },
        { key: "lab-tests",  label: "Lab Tests",  Icon: ClipboardList,   onClick: () => go("/account?s=lab-tests") },
      ],
    },
    {
      label: "Testing",
      items: [
        { key: "gb-testing", label: "GB Testing",        Icon: FlaskConical, active: section === "gb-testing", onClick: () => navigate("gb-testing") },
        { key: "lab-pool",   label: "Testing Pools",     Icon: TestTube,     active: section === "lab-pool",   onClick: () => navigate("lab-pool") },
        { key: "community-testing", label: "Community Testing", Icon: FlaskConical, onClick: () => go(account ? "/account?s=community-testing" : "/community-testing") },
      ],
    },
    ...(roleItems.length ? [{ label: "Workspaces", items: roleItems }] : []),
    {
      label: "Research",
      items: [
        { key: "protocols", label: "Protocols", Icon: BookMarked, onClick: () => go("/account?s=protocols") },
      ],
    },
    {
      label: "Community",
      items: [
        { key: "feedback", label: "Feedback & Requests", Icon: MessageSquarePlus, onClick: () => go("/feedback") },
      ],
    },
    {
      label: "Settings",
      items: [
        { key: "profile",  label: "Profile",  Icon: User,          active: section === "profile",  onClick: () => navigate("profile") },
        { key: "telegram", label: "Telegram", Icon: MessageCircle, active: section === "telegram", onClick: () => navigate("telegram") },
      ],
    },
  ];

  const renderRow = (item: DrawerItem) => {
    const Icon = item.Icon;
    return (
      <button
        key={item.key}
        onClick={item.onClick}
        aria-current={item.active ? "page" : undefined}
        className={item.active
          ? "relative w-full flex items-center rounded-md transition-all text-left"
          : "hbn-row relative w-full flex items-center rounded-md transition-all text-left"}
        style={{
          gap: 11, padding: "0 12px", height: 40,
          background: item.active ? activeBg : "transparent",
          color: item.active ? ACCENT : T.muted,
          fontWeight: item.active ? 700 : 600, fontSize: 13.5,
        }}
      >
        {item.active && <span className="absolute rounded-full" style={{ left: -12, top: 11, bottom: 11, width: 3.5, background: ACCENT }} />}
        <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={item.active ? 2.4 : 2} />
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  const chipBtn: React.CSSProperties = {
    height: 38, borderRadius: 6, border: `1px solid ${T.border}`,
    background: T.chip, color: T.muted, fontSize: 12.5, fontWeight: 600,
  };

  return (
    <>
      <style>{`
        .hbn-row:hover { background: ${T.chip} !important; }
      `}</style>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[55] ${hiddenCls}`}
        style={{
          background: "rgba(3,45,96,0.45)",
          backdropFilter: "blur(2px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 220ms ease",
        }}
        onClick={() => setOpen(false)}
      />

      {/* Slide-out drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 left-0 bottom-0 z-[60] flex flex-col ${hiddenCls}`}
        style={{
          width: 280,
          background: T.sidebar,
          borderRight: `1px solid ${T.border}`,
          fontFamily: FONT,
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 240ms cubic-bezier(0.32,0,0.15,1)",
          willChange: "transform",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {/* Brand header */}
        <div
          className="flex items-center justify-between px-4 shrink-0"
          style={{ height: 64, borderBottom: `1px solid ${T.border}` }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="flex items-center justify-center shrink-0 select-none"
              style={{ width: 34, height: 34, borderRadius: 8, background: ACCENT, color: "#fff", fontWeight: 800, fontSize: 11 }}
            >
              S&amp;P
            </div>
            <span className="font-extrabold tracking-tight truncate" style={{ fontSize: 17, color: T.text }}>Salt &amp; Peps</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="hbn-row flex items-center justify-center rounded-md shrink-0"
            style={{ width: 30, height: 30, color: T.subtle }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto">
          {drawerGroups.map((group, gi) => (
            <React.Fragment key={group.label ?? "main"}>
              {group.label && (
                <p
                  className="px-3 font-semibold select-none"
                  style={{ fontSize: 12, letterSpacing: ".01em", color: T.subtle, marginTop: gi > 0 ? 20 : 0, marginBottom: 6 }}
                >
                  {group.label}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {group.items.map(renderRow)}
              </div>
            </React.Fragment>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 pt-3 shrink-0" style={{ borderTop: `1px solid ${T.border}` }}>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center gap-2 transition-all"
              style={chipBtn}
            >
              {dark ? <Sun className="w-4 h-4" strokeWidth={2} /> : <Moon className="w-4 h-4" strokeWidth={2} />}
              {dark ? "Light mode" : "Dark mode"}
            </button>
            <button
              onClick={() => go("/")}
              className="flex items-center justify-center gap-2 transition-all"
              style={chipBtn}
            >
              <Store className="w-4 h-4" strokeWidth={2} />
              Store
            </button>
          </div>
          <button
            onClick={() => { logout.mutate(); setLocation("/"); setOpen(false); }}
            className="w-full flex items-center justify-center gap-2 mt-2 transition-all"
            style={{
              height: 38, borderRadius: 6, fontSize: 12.5, fontWeight: 700,
              color: dark ? "rgba(255,120,120,0.9)" : "#BA0517",
              border: `1px solid ${dark ? "rgba(220,38,38,0.25)" : "rgba(186,5,23,0.20)"}`,
              background: dark ? "rgba(220,38,38,0.08)" : "rgba(186,5,23,0.04)",
            }}
          >
            <LogOut className="w-4 h-4" strokeWidth={2} />
            Sign out
          </button>
        </div>
      </div>

      {/* ── Fixed bottom navigation bar ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[50] ${hiddenCls} flex items-stretch`}
        style={{
          height: 58,
          background: dark ? "rgba(18,18,22,0.97)" : "rgba(255,255,255,0.97)",
          borderTop: `1px solid ${T.border}`,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          paddingBottom: "env(safe-area-inset-bottom)",
          fontFamily: FONT,
        }}
      >
        {BOTTOM_NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = section === item.id && !open;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              aria-current={active ? "page" : undefined}
              className="relative flex-1 flex flex-col items-center justify-center gap-1 transition-all"
              style={{ color: active ? ACCENT : T.subtle }}
            >
              {active && (
                <span
                  className="absolute top-0 rounded-b-full"
                  style={{ width: 26, height: 3, background: ACCENT }}
                />
              )}
              <Icon className="w-[19px] h-[19px]" strokeWidth={active ? 2.4 : 2} />
              <span className="leading-none" style={{ fontSize: 10, fontWeight: active ? 700 : 600 }}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label="More navigation options"
          className="relative flex-1 flex flex-col items-center justify-center gap-1 transition-all"
          style={{ color: isMoreActive ? ACCENT : T.subtle }}
        >
          {isMoreActive && !open && (
            <span
              className="absolute top-0 rounded-b-full"
              style={{ width: 26, height: 3, background: ACCENT }}
            />
          )}
          <MoreHorizontal className="w-[19px] h-[19px]" strokeWidth={isMoreActive ? 2.4 : 2} />
          <span className="leading-none" style={{ fontSize: 10, fontWeight: isMoreActive ? 700 : 600 }}>
            More
          </span>
        </button>
      </div>
    </>
  );
}
