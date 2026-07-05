import React, { useEffect } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard, Syringe, FlaskConical, HeartPulse,
  Scale, LineChart, Users, UsersRound, User, MessageCircle, History,
  Store, TestTube, LogOut, Sun, Moon, Home, Plus,
  ReceiptText, Truck, ShoppingBag, BookMarked, ClipboardList, MessageSquarePlus,
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

const BAR_LEFT: { id: HubSection; label: string; icon: React.ElementType }[] = [
  { id: "home",   label: "Home",   icon: Home },
  { id: "orders", label: "Orders", icon: ReceiptText },
];
const BAR_RIGHT: { id: HubSection; label: string; icon: React.ElementType }[] = [
  { id: "groups",  label: "Group Buys", icon: UsersRound },
  { id: "profile", label: "Profile",    icon: User },
];

interface HubBottomNavProps {
  section: HubSection;
  setSection: (s: HubSection) => void;
  hubMoreOpen: boolean;
  setHubMoreOpen: (open: boolean) => void;
  account?: { organiserStatus?: string | null; reshipperStatus?: string | null; isWholesale?: boolean } | null;
  navOrder?: HubSection[];
  /** Breakpoint at which the bottom bar/menu hide. "md" (default) hides ≥768px; "lg" keeps them visible through tablet and hides ≥1024px. */
  hideAt?: "md" | "lg";
}

type MenuItem = {
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

  const T = palette(dark);
  const activeBg = dark ? "rgba(1,118,211,0.18)" : "rgba(1,118,211,0.10)";

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  useEffect(() => {
    // The popover menu (and its backdrop) is hidden above the `hideAt`
    // breakpoint. Only lock body scroll while the menu is actually shown. On
    // desktop the menu is hidden, so never lock scroll there — and auto-close
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

  // ── Popover menu model (mirrors the desktop sidebar) ──
  const roleItems: MenuItem[] = [
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

  const menuGroups: { label?: string; items: MenuItem[] }[] = [
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

  const renderRow = (item: MenuItem) => {
    const Icon = item.Icon;
    return (
      <button
        key={item.key}
        onClick={item.onClick}
        aria-current={item.active ? "page" : undefined}
        className={item.active
          ? "w-full flex items-center transition-all text-left"
          : "hbn-row w-full flex items-center transition-all text-left"}
        style={{
          gap: 14, padding: "0 14px", height: 46, borderRadius: 14,
          background: item.active ? activeBg : "transparent",
          color: T.text, fontWeight: 600, fontSize: 14.5,
        }}
      >
        <Icon className="w-5 h-5 shrink-0" strokeWidth={2} style={{ color: ACCENT }} />
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  const barItem = (item: { id: HubSection; label: string; icon: React.ElementType }) => {
    const Icon = item.icon;
    const active = section === item.id && !open;
    return (
      <button
        key={item.id}
        onClick={() => navigate(item.id)}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        className="flex-1 h-full flex flex-col items-center justify-center gap-1 transition-all"
        style={{ color: active ? ACCENT : (dark ? "rgba(255,255,255,0.60)" : "#3B3B3B") }}
      >
        <Icon className="w-[21px] h-[21px]" strokeWidth={active ? 2.4 : 2} />
        <span className="leading-none" style={{ fontSize: 10, fontWeight: active ? 700 : 600 }}>
          {item.label}
        </span>
      </button>
    );
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
          background: "rgba(3,45,96,0.35)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 220ms ease",
        }}
        onClick={() => setOpen(false)}
      />

      {/* ── Floating popover menu ── */}
      <div
        className={`fixed z-[60] ${hiddenCls}`}
        style={{
          left: 16, right: 16,
          bottom: "calc(88px + env(safe-area-inset-bottom))",
          maxWidth: 400, margin: "0 auto",
          fontFamily: FONT,
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0) scale(1)" : "translateY(14px) scale(0.97)",
          transformOrigin: "50% 100%",
          pointerEvents: open ? "auto" : "none",
          visibility: open ? "visible" : "hidden",
          transition: "opacity 200ms ease, transform 240ms cubic-bezier(.22,1,.36,1), visibility 0s linear " + (open ? "0s" : "240ms"),
        }}
        aria-hidden={!open}
      >
        <div className="relative">
          <div
            className="flex flex-col overflow-hidden"
            style={{
              background: T.panel,
              border: `1px solid ${T.border}`,
              borderRadius: 24,
              boxShadow: "0 18px 48px rgba(16,17,33,0.28)",
              maxHeight: "min(62vh, 540px)",
            }}
          >
            <nav className="flex-1 overflow-y-auto" style={{ padding: "10px 8px" }}>
              {menuGroups.map((group, gi) => (
                <React.Fragment key={group.label ?? "main"}>
                  {group.label && (
                    <p
                      className="select-none font-bold uppercase"
                      style={{ fontSize: 10.5, letterSpacing: ".05em", color: T.subtle, padding: "12px 14px 4px", marginTop: gi > 0 ? 2 : 0 }}
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
            <div
              className="grid grid-cols-3 gap-1.5 shrink-0"
              style={{ padding: 8, borderTop: `1px solid ${T.border}` }}
            >
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center gap-1.5 transition-all"
                style={{ height: 38, borderRadius: 12, background: T.chip, color: T.muted, fontSize: 12, fontWeight: 600 }}
              >
                {dark ? <Sun className="w-4 h-4" strokeWidth={2} /> : <Moon className="w-4 h-4" strokeWidth={2} />}
                {dark ? "Light" : "Dark"}
              </button>
              <button
                onClick={() => go("/")}
                className="flex items-center justify-center gap-1.5 transition-all"
                style={{ height: 38, borderRadius: 12, background: T.chip, color: T.muted, fontSize: 12, fontWeight: 600 }}
              >
                <Store className="w-4 h-4" strokeWidth={2} />
                Store
              </button>
              <button
                onClick={() => { logout.mutate(); setLocation("/"); setOpen(false); }}
                className="flex items-center justify-center gap-1.5 transition-all"
                style={{
                  height: 38, borderRadius: 12, fontSize: 12, fontWeight: 700,
                  color: dark ? "rgba(255,120,120,0.9)" : "#BA0517",
                  background: dark ? "rgba(220,38,38,0.08)" : "rgba(186,5,23,0.05)",
                }}
              >
                <LogOut className="w-4 h-4" strokeWidth={2} />
                Sign out
              </button>
            </div>
          </div>

          {/* Pointer tail */}
          <div
            className="absolute"
            style={{
              left: "50%", bottom: -7, width: 16, height: 16,
              transform: "translateX(-50%) rotate(45deg)",
              background: T.panel,
              borderRight: `1px solid ${T.border}`,
              borderBottom: `1px solid ${T.border}`,
              borderBottomRightRadius: 4,
            }}
          />
        </div>
      </div>

      {/* ── Floating pill bottom bar (above the backdrop, like the reference FAB) ── */}
      <div
        className={`fixed z-[65] ${hiddenCls}`}
        style={{
          left: 16, right: 16,
          bottom: "calc(6px + env(safe-area-inset-bottom))",
          maxWidth: 420, margin: "0 auto",
          fontFamily: FONT,
        }}
      >
        <div
          className="flex items-center"
          style={{
            height: 64,
            padding: "0 10px",
            background: dark ? "rgba(23,23,28,0.97)" : "rgba(255,255,255,0.97)",
            border: `1px solid ${T.border}`,
            borderRadius: 9999,
            boxShadow: "0 12px 32px rgba(16,17,33,0.18)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {BAR_LEFT.map(barItem)}

          {/* Center menu button */}
          <button
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex items-center justify-center rounded-full shrink-0 transition-all"
            style={{
              width: 52, height: 52,
              margin: "0 6px",
              background: ACCENT,
              color: "#fff",
              boxShadow: "0 8px 20px rgba(1,118,211,0.45)",
            }}
          >
            <Plus
              className="w-6 h-6"
              strokeWidth={2.5}
              style={{ transform: open ? "rotate(45deg)" : "none", transition: "transform 220ms ease" }}
            />
          </button>

          {BAR_RIGHT.map(barItem)}
        </div>
      </div>
    </>
  );
}
