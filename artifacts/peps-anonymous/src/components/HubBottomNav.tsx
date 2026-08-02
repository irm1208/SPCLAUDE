import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard, Syringe, FlaskConical, HeartPulse,
  Scale, LineChart, Users, UsersRound, User, MessageCircle, History,
  Store, TestTube, LogOut, Sun, Moon, Home,
  ReceiptText, Truck, ShoppingBag, BookMarked, ClipboardList, MessageSquarePlus,
  GraduationCap, Calculator as CalcIcon, Sparkles, ChevronDown,
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
  const navRef = useRef<HTMLElement>(null);
  const [canScrollMore, setCanScrollMore] = useState(false);

  const checkScroll = () => {
    const el = navRef.current;
    if (!el) return;
    setCanScrollMore(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) return;
    checkScroll();
    const el = navRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, [open]);

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
        { key: "sage",         label: "Sage AI",      Icon: Sparkles,      onClick: () => go("/sage") },
        { key: "protocols",    label: "Protocols",    Icon: BookMarked,    onClick: () => go("/protocols") },
        { key: "learn",        label: "Learning Hub", Icon: GraduationCap, onClick: () => go("/learn") },
        { key: "calculator",   label: "Calculator",   Icon: CalcIcon,      onClick: () => go("/calculator") },
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
        <Icon className="w-[19px] h-[19px]" strokeWidth={active ? 2.4 : 2} />
        <span className="leading-none" style={{ fontSize: 9.5, fontWeight: active ? 700 : 600 }}>
          {item.label}
        </span>
      </button>
    );
  };

  return (
    <>
      <style>{`
        .hbn-row:hover { background: ${T.chip} !important; }
        @keyframes hbn-pulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.55; transform: scale(0.92); }
        }
        @keyframes hbn-ring {
          0%   { transform: translate(-50%,-50%) scale(0.85); opacity: 0.7; }
          100% { transform: translate(-50%,-50%) scale(1.55); opacity: 0; }
        }
        @keyframes hbn-bounce {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(3px); }
        }
        .hbn-label-pulse { animation: hbn-pulse 2s ease-in-out infinite; }
        .hbn-ring        { animation: hbn-ring 1.8s ease-out infinite; }
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
          bottom: "calc(78px + env(safe-area-inset-bottom))",
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
            <div className="relative flex-1 min-h-0 flex flex-col">
              <nav ref={navRef} className="flex-1 overflow-y-auto" style={{ padding: "10px 8px" }}>
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
              {/* Scroll-more indicator */}
              <div
                className="pointer-events-none absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end"
                style={{
                  height: 56,
                  background: `linear-gradient(to bottom, transparent, ${T.panel})`,
                  opacity: canScrollMore ? 1 : 0,
                  transition: "opacity 200ms ease",
                }}
              >
                <div
                  className="flex items-center gap-1 mb-1.5"
                  style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
                    color: ACCENT, textTransform: "uppercase",
                  }}
                >
                  <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.5} style={{ animation: "hbn-bounce 1.2s ease-in-out infinite" }} />
                  scroll for more
                </div>
              </div>
            </div>

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
            height: 56,
            padding: "0 8px",
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
          <div className="relative flex flex-col items-center shrink-0" style={{ margin: "0 6px" }}>
            {/* "Menu" label above */}
            {!open && (
              <span
                className="hbn-label-pulse absolute select-none pointer-events-none"
                style={{
                  top: -18, left: "50%", transform: "translateX(-50%)",
                  fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#fff",
                  background: ACCENT,
                  borderRadius: 99,
                  padding: "2px 6px",
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 8px rgba(1,118,211,0.5)",
                }}
              >
                Menu
              </span>
            )}
            {!open && (
              <span
                className="hbn-ring absolute pointer-events-none"
                style={{
                  top: "50%", left: "50%",
                  width: 50, height: 50,
                  borderRadius: "50%",
                  border: `2px solid ${ACCENT}`,
                }}
              />
            )}
            <button
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              className="flex flex-col items-center justify-center rounded-full transition-all"
              style={{
                width: 50, height: 50,
                background: "#1B3164",
                color: "#fff",
                boxShadow: "0 8px 20px rgba(1,118,211,0.45)",
                gap: 2,
              }}
            >
              <span
                className="select-none leading-none flex items-baseline"
                style={{
                  transform: open ? "scale(0.85)" : "scale(1)",
                  transition: "transform 220ms ease",
                  fontSize: 17, fontWeight: 800, letterSpacing: "-0.5px", color: "#fff",
                }}
              >
                S<span style={{ fontSize: 12, fontWeight: 400, color: "#8BB8FF", margin: "0 0.5px" }}>&amp;</span>P
              </span>
              {!open && (
                <span
                  className="select-none leading-none"
                  style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.07em", opacity: 0.9 }}
                >
                  TAP ME
                </span>
              )}
            </button>
          </div>

          {BAR_RIGHT.map(barItem)}
        </div>
      </div>
    </>
  );
}
