import React, { useState, useEffect, useContext, useRef, createContext } from "react";
import { SidebarExpandedCtx } from "@/hooks/use-sidebar-expanded";
import { useLocation, useSearch } from "wouter";
import {
  Home,
  Droplets,
  ClipboardList,
  BookMarked,
  ShieldAlert,
  Hash,
  User,
  ReceiptText,
  Menu,
  X,
  MessageCircle,
  ArrowRight,
  Sun,
  Moon,
  LogIn,
  UsersRound,
  FlaskConical,
  Droplet,
  HeartPulse,
  TrendingUp,
  ChevronLeft,
  ShoppingCart,
  Store,
  GraduationCap,
  LogOut,
  LayoutDashboard,
  Truck,
  Package,
  Search,
  Plus,
  ChevronRight,
  ChevronDown,
  LifeBuoy,
  MessageSquarePlus,
  Sparkles,
} from "lucide-react";
import { useThemeStore } from "@/hooks/use-theme";
import { palette, ACCENT, ACCENT_SOFT, FONT } from "@/components/dashboard-theme";
import { useAccount, useLogout, useHasTestingContribution, useTestingGbPools, getAccountHandle } from "@/hooks/use-account";
import { useVialCart } from "@/hooks/use-vial-cart";
import { CartDrawer } from "@/components/CartDrawer";
import { usePageTitle } from "@/hooks/use-page-title";
import { useHubDrawerStore } from "@/hooks/use-hub-drawer";
import { SaltPepsMark } from "@/components/SaltPepsMark";

interface NavItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  path: string;
  altPaths?: string[];
  section: "shop" | "health" | "research" | "tools";
}

const NAV_ITEMS: NavItem[] = [
  { id: "shop",          label: "Lonely Vial",         shortLabel: "Vials",     icon: Droplets,      path: "/shop",           altPaths: ["/shop/checkout"], section: "shop"     },
  { id: "protocols",     label: "Protocols",          shortLabel: "Protocols",  icon: BookMarked,    path: "/protocols",     altPaths: ["/medications", "/medications/", "/trt-aas"], section: "research" },
  { id: "learn",         label: "Learning Hub",       shortLabel: "Learn",      icon: GraduationCap, path: "/learn",          altPaths: ["/learn/"],         section: "research" },
  { id: "lab",           label: "Lab Tests",          shortLabel: "Lab",        icon: ClipboardList, path: "/tests",                                        section: "research" },
  { id: "sage",            label: "Sage AI",            shortLabel: "Sage",       icon: Sparkles,          path: "/sage",        section: "research" },
  { id: "calculator",      label: "Calculator",         shortLabel: "Calc",       icon: Hash,             path: "/calculator",  section: "tools"    },
  { id: "feedback",        label: "Feedback",           shortLabel: "Feedback",   icon: MessageSquarePlus, path: "/feedback",   section: "tools"    },
];

const NAV_SECTIONS: { key: NavItem["section"]; label: string }[] = [
  { key: "shop",     label: "Shop"     },
  { key: "research", label: "Research" },
  { key: "tools",    label: "Tools"    },
];

const MOBILE_TABS = [
  { id: "home",      label: "Home",     icon: Home,          path: "/" },
  { id: "shop",      label: "Vials",    icon: Droplets,      path: "/shop" },
  { id: "lab",       label: "Lab",      icon: ClipboardList, path: "/tests" },
  { id: "protocols", label: "Protocols", icon: BookMarked,    path: "/protocols" },
  { id: "more",      label: "More",     icon: Menu,          path: null as string | null },
];

function itemIsActive(item: NavItem, location: string): boolean {
  if (location === item.path) return true;
  if (item.altPaths?.some(p => location.startsWith(p))) return true;
  return false;
}

const BRAND_NAVY = ACCENT;
const BRAND_BG = ACCENT_SOFT;

const MORE_ITEM_COLORS: Record<string, { bg: string; color: string }> = {
  medications:  { bg: "rgba(168,85,247,0.15)",  color: "#c084fc" },
  trtaas:       { bg: "rgba(52,211,153,0.15)",  color: "#34d399" },
  learn:        { bg: "rgba(59,130,246,0.15)",  color: "#60a5fa" },
  safety:          { bg: "rgba(251,191,36,0.15)",  color: "#fbbf24" },
  calculator:      { bg: "rgba(20,184,166,0.15)",  color: "#2dd4bf" },
  reconstitution:  { bg: "rgba(33,150,243,0.15)",  color: "#60a5fa" },
  feedback:        { bg: "rgba(99,102,241,0.15)",  color: "#818cf8" },
};

const PublicNavCtx = createContext<Set<string> | null>(null);

function SidebarNavItem({ item, location }: { item: NavItem; location: string }) {
  const [, setLocation] = useLocation();
  const expanded = useContext(SidebarExpandedCtx);
  const active = itemIsActive(item, location);
  const NAV = useNav();

  return (
    <button
      onClick={() => setLocation(item.path)}
      title={!expanded ? item.label : undefined}
      className={`nav-row ${active ? "is-active" : ""} relative w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] transition-all text-left`}
      style={
        active
          ? { background: NAV.activeBg, color: NAV.activeText, fontWeight: 600, border: `1px solid ${NAV.activeBorder}`, boxShadow: NAV.activeShadow }
          : { color: NAV.itemText, fontWeight: 500, background: "transparent", border: "1px solid transparent" }
      }
    >
      {active && <span className="absolute rounded-full" style={{ left: -12, top: 6, bottom: 6, width: 3.5, background: ACCENT }} />}
      <item.icon
        className="w-4 h-4 shrink-0"
        strokeWidth={active ? 2 : 1.75}
        style={{ color: active ? NAV.activeText : NAV.itemIcon }}
      />
      <span
        className="truncate"
        style={{
          opacity: expanded ? 1 : 0,
          maxWidth: expanded ? 160 : 0,
          overflow: "hidden",
          whiteSpace: "nowrap",
          transition: "opacity 150ms ease, max-width 200ms ease",
        }}
      >
        {item.label}
      </span>
    </button>
  );
}

function NavDivider() {
  const NAV = useNav();
  return <div className="h-px mx-3 my-3" style={{ background: NAV.divider }} />;
}

function SectionHeader({ label, expanded }: { label: string; expanded: boolean; showActions?: boolean }) {
  const NAV = useNav();
  if (!expanded) return null;
  return (
    <div className="px-3 pt-2 pb-1 select-none">
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.08em]"
        style={{ color: NAV.sectionLabel }}
      >
        {label}
      </p>
    </div>
  );
}

type PortalGroupKey = "overview" | "roles" | "health" | "research" | "support";

const PORTAL_NAV_GROUPS: {
  key: PortalGroupKey;
  groupLabel: string;
  items: { section: string; label: string; Icon: React.ElementType; requiresTestingContribution?: boolean; requiresWholesale?: boolean; requiresGbPools?: boolean; externalPath?: string }[];
}[] = [
  {
    key: "overview",
    groupLabel: "Overview",
    items: [
      { section: "home",       label: "Hub",        Icon: LayoutDashboard },
      { section: "orders",     label: "Orders",     Icon: ReceiptText },
      { section: "groups",     label: "Group Buys", Icon: UsersRound },
      { section: "gb-testing", label: "GB Testing", Icon: FlaskConical },
    ],
  },
  {
    key: "roles",
    groupLabel: "Roles",
    items: [
      { section: "gborganiser", label: "GB Organiser",  Icon: Store },
      { section: "reshipper",   label: "Reshipper",     Icon: Truck },
      { section: "lab-pool",    label: "Apply as Pool Leader", Icon: FlaskConical },
      { section: "wholesale",        label: "Wholesale",    Icon: Package,    requiresWholesale: true },
      { section: "wholesale-shared", label: "Shared Order", Icon: UsersRound, requiresWholesale: true },
    ],
  },
  {
    key: "health",
    groupLabel: "Health",
    items: [
      { section: "health-hub",        label: "Health",            Icon: HeartPulse },
      { section: "community-testing", label: "Community Testing", Icon: UsersRound },
    ],
  },
  {
    key: "research",
    groupLabel: "Research",
    items: [
      { section: "protocols",   label: "Protocols",  Icon: BookMarked },
      { section: "lab-tests",   label: "Lab Tests",  Icon: ClipboardList },
    ],
  },
  {
    key: "support",
    groupLabel: "Support",
    items: [
      { section: "support",  label: "Tickets",  Icon: LifeBuoy          },
      { section: "feedback", label: "Feedback", Icon: MessageSquarePlus, externalPath: "/feedback" },
    ],
  },
];

const PORTAL_SETTINGS_ITEMS: { section: string; label: string; Icon: React.ElementType }[] = [
  { section: "profile",  label: "Profile",  Icon: User          },
  { section: "telegram", label: "Telegram", Icon: MessageCircle },
];

function BrandMark({ size = "md" }: { size?: "sm" | "md" }) {
  const dim = size === "sm" ? 28 : 36;
  return (
    <div
      className="flex items-center justify-center shrink-0 select-none"
      style={{
        width: dim,
        height: dim,
        borderRadius: "8px",
        background: BRAND_NAVY,
      }}
    >
      <SaltPepsMark
        size={size === "sm" ? 23 : 30}
        variant="reverse"
        detail={size === "sm" ? "small" : "full"}
      />
    </div>
  );
}

// Theme-aware nav palette matching the dashboard theme (DashboardShell).
// Derived from palette(dark) so the chrome flips with the global theme store.
function useNav() {
  const { dark } = useThemeStore();
  const P = palette(dark);
  return {
    bg:           P.sidebar,
    divider:      P.border,
    sectionLabel: P.subtle,
    itemText:     P.muted,
    itemIcon:     P.muted,
    itemHover:    P.chip,
    activeBg:     dark ? "rgba(1,118,211,0.18)" : "rgba(1,118,211,0.10)",
    activeText:   ACCENT,
    activeBorder: "transparent",
    activeShadow: "none",
    pillBg:       P.panel2,
    badge:        "#EF4444",
    white70:      P.muted,
    text:         P.text,
    panel:        P.panel,
    panel2:       P.panel2,
    chip:         P.chip,
    subtle:       P.subtle,
    muted:        P.muted,
  };
}

function Sidebar({ location, expanded, onExpand, onCollapse }: {
  location: string;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}) {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { dark, toggle: toggleTheme } = useThemeStore();
  const NAV = useNav();
  const { isLoggedIn, account } = useAccount();
  const logout = useLogout();
  const hasTestingContribution = useHasTestingContribution(isLoggedIn);
  const { data: _gbPools = [] } = useTestingGbPools(isLoggedIn);
  const hasGbPools = _gbPools.length > 0;
  const enabledNavIds = useContext(PublicNavCtx);
  const sidebarUsername = account?.telegramUsername ? getAccountHandle(account) : null;
  const isGbWorkflow = location === "/order" || location === "/review";
  // Lab testing pool detail (/pool/:slug) shows the Profile Hub nav on desktop too —
  // but NOT the guest contribution sub-route (/pool/:slug/contribution/:participantId).
  const isLabPool = location.startsWith("/pool/") && !location.includes("/contribution/");
  // Public testing-pool listing pages (/testing-pools, /community-testing) show the
  // Profile Hub nav on desktop too, matching the pool detail pages.
  const isCommunityPools = location === "/testing-pools" || location === "/community-testing";
  // GB testing pool detail (/testing/:gbId and /testing/:gbId/results) shows the
  // Profile Hub (account profile) nav on desktop too, matching the account portal.
  const isGbTesting = location.startsWith("/testing/");
  const isPortal = location.startsWith("/account") || location.startsWith("/gborganiser") || location.startsWith("/reshipper") || location.startsWith("/success") || location.startsWith("/wholesale") || isGbWorkflow || isLabPool || isGbTesting || isCommunityPools;
  const activeSection = isPortal
    ? (isGbTesting ? "gb-testing" : (isLabPool || isCommunityPools) ? "community-testing" : isGbWorkflow ? "groups" : location.startsWith("/gborganiser") ? "gborganiser" : location.startsWith("/reshipper") ? "reshipper" : location.startsWith("/wholesale") ? "wholesale" : (new URLSearchParams(search).get("s") ?? "home"))
    : null;

  const navScrollRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = navScrollRef.current;
    if (!el) return;
    const KEY = "sp.sidebarNavScroll";
    const saved = parseInt(sessionStorage.getItem(KEY) ?? "0", 10);
    if (saved > 0) el.scrollTop = saved;
    const onScroll = () => sessionStorage.setItem(KEY, String(el.scrollTop));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const labelStyle: React.CSSProperties = {
    opacity: expanded ? 1 : 0,
    maxWidth: expanded ? 160 : 0,
    overflow: "hidden",
    whiteSpace: "nowrap",
    transition: "opacity 150ms ease, max-width 200ms ease",
  };

  return (
    <aside
      className="hidden md:flex fixed inset-y-0 left-0 flex-col z-30 overflow-hidden nav-dark"
      style={{
        width: expanded ? 264 : 64,
        background: NAV.bg,
        borderRight: `1px solid ${NAV.divider}`,
        transition: "width 220ms ease",
        color: NAV.itemText,
        fontFamily: FONT,
      }}
      onMouseEnter={onExpand}
      onMouseLeave={onCollapse}
    >
      <style>{`
        .nav-dark .nav-row:not(.is-active):hover { background: ${NAV.itemHover} !important; }
        .nav-dark ::-webkit-scrollbar { width: 6px; }
        .nav-dark ::-webkit-scrollbar-thumb { background: ${NAV.divider}; border-radius: 3px; }
      `}</style>

      {/* ── Brand header ── */}
      <div className="flex items-center shrink-0 px-3 pt-3 pb-2 gap-3">
        <button
          onClick={() => setLocation(isLoggedIn ? "/account" : "/")}
          className="flex items-center gap-3 flex-1 min-w-0 text-left rounded-lg transition-colors"
          title={!expanded ? "Salt & Peps" : undefined}
        >
          <BrandMark />
          <div className="flex-1 min-w-0" style={{ ...labelStyle, maxWidth: expanded ? 200 : 0 }}>
            <p className="text-[15px] font-bold leading-tight truncate" style={{ color: NAV.text }}>
              Salt &amp; Peps
            </p>
          </div>
        </button>
      </div>

      <nav ref={navScrollRef} className="flex-1 overflow-y-auto px-3 pt-0 pb-3">
        {isPortal ? (
          <>
            {(() => { let renderedGroups = 0; return PORTAL_NAV_GROUPS.map(({ key: groupKey, groupLabel, items }) => {
              const visibleItems = items.filter(({ section, requiresTestingContribution, requiresWholesale, requiresGbPools }) => {
                if (section === "gborganiser") return account?.organiserStatus === "approved";
                if (section === "reshipper")   return account?.reshipperStatus === "approved";
                if (requiresWholesale)         return account?.isWholesale === true;
                if (requiresTestingContribution) return hasTestingContribution;
                if (requiresGbPools)           return hasGbPools;
                return true;
              });
              if (visibleItems.length === 0) return null;
              const isFirst = renderedGroups === 0;
              renderedGroups++;
              return (
                <React.Fragment key={groupKey}>
                  {!isFirst && <NavDivider />}
                  <SectionHeader label={groupLabel} expanded={expanded} />
                  {visibleItems.map(({ section, label, Icon, externalPath }) => {
                  const isOrganiserLink = section === "gborganiser";
                  const isReshipperLink = section === "reshipper";
                  const isWholesaleLink = section === "wholesale";
                  const isWholesaleSharedLink = section === "wholesale-shared";
                  const navTarget = externalPath ?? (isOrganiserLink ? "/gborganiser" : isReshipperLink ? "/reshipper" : isWholesaleSharedLink ? "/wholesale/shared" : isWholesaleLink ? "/wholesale" : (section === "community-testing" && !isLoggedIn) ? "/community-testing" : `/account?s=${section}`);
                  const active = externalPath ? location === externalPath : isOrganiserLink ? location === "/gborganiser" : isReshipperLink ? location.startsWith("/reshipper") : isWholesaleSharedLink ? location.startsWith("/wholesale/shared") : isWholesaleLink ? (location.startsWith("/wholesale") && !location.startsWith("/wholesale/shared")) : activeSection === section;
                  return (
                    <button
                      key={section}
                      title={!expanded ? label : undefined}
                      onClick={() => setLocation(navTarget)}
                      className={`nav-row ${active ? "is-active" : ""} relative w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] transition-all text-left`}
                      style={
                        active
                          ? { background: NAV.activeBg, color: NAV.activeText, fontWeight: 600, border: `1px solid ${NAV.activeBorder}`, boxShadow: NAV.activeShadow }
                          : { color: NAV.itemText, fontWeight: 500, background: "transparent", border: "1px solid transparent" }
                      }
                    >
                      {active && <span className="absolute rounded-full" style={{ left: -12, top: 6, bottom: 6, width: 3.5, background: ACCENT }} />}
                      <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2 : 1.75} style={{ color: active ? NAV.activeText : NAV.itemIcon }} />
                      <span className="text-[13px] font-medium" style={labelStyle}>{label}</span>
                    </button>
                  );
                  })}
                </React.Fragment>
              );
            }); })()}
            {/* Settings — scrolls with the rest of the portal nav */}
            <NavDivider />
            <SectionHeader label="Settings" expanded={expanded} showActions={false} />
            {PORTAL_SETTINGS_ITEMS.map(({ section, label, Icon }) => {
              const active = activeSection === section;
              return (
                <button
                  key={section}
                  title={!expanded ? label : undefined}
                  onClick={() => setLocation(`/account?s=${section}`)}
                  className={`nav-row ${active ? "is-active" : ""} relative w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] transition-all text-left`}
                  style={
                    active
                      ? { background: NAV.activeBg, color: NAV.activeText, fontWeight: 600, border: `1px solid ${NAV.activeBorder}`, boxShadow: NAV.activeShadow }
                      : { color: NAV.itemText, fontWeight: 500, background: "transparent", border: "1px solid transparent" }
                  }
                >
                  {active && <span className="absolute rounded-full" style={{ left: -12, top: 6, bottom: 6, width: 3.5, background: ACCENT }} />}
                  <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2 : 1.75} style={{ color: active ? NAV.activeText : NAV.itemIcon }} />
                  <span style={labelStyle}>{label}</span>
                </button>
              );
            })}
          </>
        ) : (
          <>
            {NAV_SECTIONS.map(({ key, label }) => {
              const items = NAV_ITEMS.filter(n => n.section === key && (enabledNavIds === null || enabledNavIds.has(n.id)));
              if (items.length === 0) return null;
              return (
                <React.Fragment key={key}>
                  {key !== "shop" && <NavDivider />}
                  <SectionHeader label={label} expanded={expanded} />
                  {key === "shop" && (
                    <button
                      onClick={() => setLocation(isLoggedIn ? "/account?s=groups" : "/login")}
                      className="nav-row is-active w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] transition-all text-left mb-0.5"
                      style={{
                        background: ACCENT,
                        color: "white",
                        fontWeight: 600,
                        boxShadow: "0 4px 14px rgba(1,118,211,0.25)",
                      }}
                      title={!expanded ? "Group Buy" : undefined}
                    >
                      <UsersRound className="w-4 h-4 shrink-0" style={{ color: "white" }} strokeWidth={2} />
                      <span style={labelStyle}>Group Buy</span>
                    </button>
                  )}
                  {items.map(item => (
                    <SidebarNavItem key={item.id} item={item} location={location} />
                  ))}
                </React.Fragment>
              );
            })}
          </>
        )}
      </nav>

      {/* ── Bottom controls + profile pill ── */}
      <div className="shrink-0 px-2 pb-3 pt-2" style={{ borderTop: `1px solid ${NAV.divider}` }}>
        {isPortal && (
          <button
            onClick={() => setLocation(isGbTesting ? "/account?s=gb-testing" : isGbWorkflow ? "/account?s=groups" : (location.startsWith("/gborganiser") || location.startsWith("/reshipper") || location.startsWith("/wholesale")) ? "/account" : "/")}
            title={!expanded ? (isGbTesting ? "Back to GB Testing" : isGbWorkflow ? "Back to Group Buys" : (location.startsWith("/gborganiser") || location.startsWith("/reshipper") || location.startsWith("/wholesale")) ? "Back to Hub" : "Back to Store") : undefined}
            className="nav-row w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] font-medium text-left mb-1"
            style={{ color: NAV.itemText, background: "transparent" }}
          >
            <ChevronLeft className="w-4 h-4 shrink-0" strokeWidth={2} style={{ color: NAV.itemIcon }} />
            <span style={labelStyle}>{isGbTesting ? "Back to GB Testing" : isGbWorkflow ? "Back to Group Buys" : (location.startsWith("/gborganiser") || location.startsWith("/reshipper") || location.startsWith("/wholesale")) ? "Back to Hub" : "Back to Store"}</span>
          </button>
        )}

        {/* User profile pill — light pill w/ avatar, name, segmented sun/moon toggle */}
        {isLoggedIn ? (
          <div
            className="flex items-center gap-2 mt-1 rounded-xl"
            style={{
              background: NAV.pillBg,
              padding: expanded ? "8px" : "6px",
              border: `1px solid ${NAV.divider}`,
            }}
          >
            <button
              onClick={() => setLocation("/account?s=profile")}
              className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
              title={!expanded ? (sidebarUsername ?? "Profile") : undefined}
            >
              <div
                className="flex items-center justify-center shrink-0 select-none"
                style={{
                  width: 32, height: 32, borderRadius: "9999px",
                  background: ACCENT,
                  color: "white", fontSize: 13, fontWeight: 700,
                }}
              >
                {(sidebarUsername ?? "U").slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0" style={{ ...labelStyle, maxWidth: expanded ? 120 : 0 }}>
                <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: NAV.text }}>
                  {sidebarUsername ?? "Account"}
                </p>
                <p className="text-[11px] leading-tight truncate" style={{ color: NAV.sectionLabel }}>
                  @{sidebarUsername ?? "user"}
                </p>
              </div>
            </button>
            {expanded && (
              <div className="flex items-center shrink-0" style={{ gap: 2 }}>
                <button
                  onClick={() => { if (dark) toggleTheme(); }}
                  title="Light mode"
                  className="flex items-center justify-center transition-all"
                  style={{
                    width: 26, height: 26, borderRadius: "9999px",
                    background: !dark ? "#F2F3F5" : "transparent",
                    color: !dark ? "#0F1729" : NAV.itemIcon,
                  }}
                >
                  <Sun className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
                <button
                  onClick={() => { if (!dark) toggleTheme(); }}
                  title="Dark mode"
                  className="flex items-center justify-center transition-all"
                  style={{
                    width: 26, height: 26, borderRadius: "9999px",
                    background: dark ? "#F2F3F5" : "transparent",
                    color: dark ? "#0F1729" : NAV.itemIcon,
                  }}
                >
                  <Moon className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
                <button
                  onClick={() => { logout.mutate(); setLocation("/"); }}
                  title="Sign out"
                  className="flex items-center justify-center transition-all ml-0.5 rounded-md hover:bg-black/[0.04]"
                  style={{ width: 26, height: 26, color: NAV.itemIcon }}
                >
                  <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            className="flex items-center gap-2 mt-1 rounded-xl"
            style={{
              background: NAV.pillBg,
              padding: expanded ? "8px" : "6px",
              border: `1px solid ${NAV.divider}`,
            }}
          >
            <button
              onClick={() => setLocation("/login")}
              className="flex items-center gap-2.5 flex-1 min-w-0 text-left px-1"
              title={!expanded ? "Sign in" : undefined}
            >
              <LogIn className="w-4 h-4 shrink-0" strokeWidth={2} style={{ color: NAV.itemIcon }} />
              <span style={{ ...labelStyle, color: NAV.text }} className="text-[13px] font-semibold">Sign in</span>
            </button>
            {expanded && (
              <div className="flex items-center shrink-0" style={{ gap: 2 }}>
                <button
                  onClick={() => { if (dark) toggleTheme(); }}
                  title="Light mode"
                  className="flex items-center justify-center transition-all"
                  style={{
                    width: 26, height: 26, borderRadius: "9999px",
                    background: !dark ? "#F2F3F5" : "transparent",
                    color: !dark ? "#0F1729" : NAV.itemIcon,
                  }}
                >
                  <Sun className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
                <button
                  onClick={() => { if (!dark) toggleTheme(); }}
                  title="Dark mode"
                  className="flex items-center justify-center transition-all"
                  style={{
                    width: 26, height: 26, borderRadius: "9999px",
                    background: dark ? "#F2F3F5" : "transparent",
                    color: dark ? "#0F1729" : NAV.itemIcon,
                  }}
                >
                  <Moon className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function DesktopHeader() {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const NAV = useNav();
  const { isLoggedIn, account } = useAccount();
  const logout = useLogout();
  const cartCount = useVialCart(s => s.itemCount());
  const headerUsername = account?.telegramUsername ? getAccountHandle(account) : null;
  const pageTitle = usePageTitle(s => s.title);

  const isOrderPage = location === "/order";
  const isReviewPage = location === "/review";
  const isGbWorkflow = isOrderPage || isReviewPage;
  const gbId = isOrderPage ? new URLSearchParams(search).get("gbId") : null;
  const canGoBack = location !== "/" && window.history.length > 1;

  return (
    <header
      className="hidden md:flex items-center gap-4 px-6 shrink-0 sticky top-0 z-20"
      style={{
        height: "60px",
        background: NAV.panel,
        borderBottom: `1px solid ${NAV.divider}`,
        fontFamily: FONT,
      }}
    >
      {canGoBack && (
        <button
          onClick={() => window.history.back()}
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
          style={{ background: ACCENT_SOFT, border: "1px solid rgba(1,118,211,0.25)" }}
          title="Go back"
        >
          <ChevronLeft className="w-4 h-4" style={{ color: ACCENT }} strokeWidth={2.25} />
        </button>
      )}

      {location === "/shop" && (
        <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none">
          <h1 className="text-[15px] font-bold tracking-tight leading-tight" style={{ color: NAV.text }}>The Lonely Vial</h1>
          <p className="text-[10px] font-medium" style={{ color: ACCENT }}>Single vials · No kits</p>
        </div>
      )}
      {isGbWorkflow && (
        <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none">
          <h1 className="text-[15px] font-bold tracking-tight leading-tight" style={{ color: NAV.text }}>
            {isReviewPage ? "Review Order" : (pageTitle ?? (gbId ? "Group Buy Order" : "New Order"))}
          </h1>
        </div>
      )}

      {location === "/shop" && (
        <button
          onClick={() => setLocation("/seller")}
          className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all shrink-0"
          style={{ background: ACCENT_SOFT, color: ACCENT, borderColor: "rgba(1,118,211,0.25)" }}
        >
          <Store className="w-3.5 h-3.5" /> Sell with us
        </button>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setLocation("/feedback")}
          className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all"
          style={{ background: NAV.chip, borderColor: NAV.divider }}
          title="Feedback"
        >
          <MessageSquarePlus className="w-4 h-4" style={{ color: NAV.muted }} />
        </button>
        <button
          onClick={() => useVialCart.getState().setCartOpen(true)}
          className="relative w-9 h-9 rounded-xl flex items-center justify-center border transition-all"
          style={{ background: NAV.chip, borderColor: NAV.divider }}
          title="Cart"
        >
          <ShoppingCart className="w-4 h-4" style={{ color: NAV.muted }} />
          {cartCount > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
              style={{ background: ACCENT }}
            >
              {cartCount}
            </span>
          )}
        </button>

        {isLoggedIn ? (
          <>
            <button
              onClick={() => setLocation("/account")}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all"
              style={{ background: BRAND_NAVY, color: "white", borderColor: BRAND_NAVY }}
            >
              <User className="w-3.5 h-3.5" />
              {headerUsername ? `@${headerUsername}` : "My Account"}
            </button>
            <button
              onClick={() => { logout.mutate(); setLocation("/"); }}
              title="Sign out"
              className="w-8 h-8 flex items-center justify-center rounded-lg border transition-all"
              style={{
                background: "rgba(220,38,38,0.05)",
                borderColor: "rgba(220,38,38,0.2)",
                color: "#dc2626",
              }}
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </>
        ) : (
          <button
            onClick={() => setLocation("/login")}
            className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all"
            style={{ background: BRAND_NAVY, color: "white", borderColor: BRAND_NAVY }}
          >
            <LogIn className="w-3.5 h-3.5" />
            Login / Sign Up
          </button>
        )}

      </div>
    </header>
  );
}

function MobileHeader() {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const { dark, toggle: toggleTheme } = useThemeStore();
  const NAV = useNav();
  const { isLoggedIn } = useAccount();
  const pageTitle = usePageTitle(s => s.title);
  const openHubDrawer = useHubDrawerStore(s => s.setOpen);

  const isOrderPage = location === "/order";
  const isReviewPage = location === "/review";
  const isGbWorkflow = isOrderPage || isReviewPage;
  const isHubPage = location.startsWith("/account") || location.startsWith("/gborganiser") || location.startsWith("/reshipper") || location.startsWith("/wholesale");
  const gbId = isOrderPage ? new URLSearchParams(search).get("gbId") : null;
  const orderTitle = isReviewPage ? "Review Order" : (pageTitle ?? (gbId ? "Group Buy Order" : "New Order"));
  const canGoBack = location !== "/" && window.history.length > 1;

  return (
    <header
      className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4"
      style={{
        height: "52px",
        background: NAV.panel,
        borderBottom: `1px solid ${NAV.divider}`,
        backdropFilter: "blur(12px)",
        fontFamily: FONT,
      }}
    >
      <div className="flex items-center gap-2">
        {isGbWorkflow ? (
          <span className="text-[14px] font-bold" style={{ color: NAV.text }}>{orderTitle}</span>
        ) : (
          <button onClick={() => setLocation("/")} className="flex items-center gap-2">
            <BrandMark size="sm" />
            <span className="text-[13px] font-bold" style={{ color: NAV.text }}>Salt &amp; Peps</span>
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setLocation("/feedback")}
          className="w-8 h-8 rounded-lg flex items-center justify-center border"
          style={{ background: NAV.chip, borderColor: NAV.divider }}
          title="Feedback"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" style={{ color: NAV.muted }} />
        </button>
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg flex items-center justify-center border"
          style={{ background: NAV.chip, borderColor: NAV.divider }}
        >
          {dark
            ? <Sun className="w-3.5 h-3.5" style={{ color: NAV.muted }} />
            : <Moon className="w-3.5 h-3.5" style={{ color: NAV.muted }} />
          }
        </button>
        <button
          onClick={() => setLocation(isLoggedIn ? "/account" : "/login")}
          className="w-8 h-8 rounded-lg flex items-center justify-center border"
          style={{
            background: isLoggedIn ? NAV.chip : BRAND_NAVY,
            borderColor: isLoggedIn ? NAV.divider : BRAND_NAVY,
          }}
          title={isLoggedIn ? "My Account" : "Login"}
        >
          {isLoggedIn
            ? <User className="w-3.5 h-3.5" style={{ color: NAV.muted }} />
            : <LogIn className="w-3.5 h-3.5" style={{ color: "white" }} />
          }
        </button>
      </div>
    </header>
  );
}

function MobileBottomTabs({ location, onMore }: { location: string; onMore: () => void }) {
  const [, setLocation] = useLocation();
  const NAV = useNav();
  const enabledNavIds = useContext(PublicNavCtx);
  const visibleTabs = MOBILE_TABS.filter(tab =>
    tab.id === "home" || tab.id === "more" || enabledNavIds === null || enabledNavIds.has(tab.id)
  );

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex"
      style={{
        background: NAV.panel,
        borderTop: `1px solid ${NAV.divider}`,
        backdropFilter: "blur(16px)",
        paddingBottom: "env(safe-area-inset-bottom)",
        fontFamily: FONT,
      }}
    >
      {visibleTabs.map(tab => {
        let active = false;
        if (tab.id === "home")           active = location === "/";
        else if (tab.id === "shop")      active = location.startsWith("/shop");
        else if (tab.id === "lab")       active = location === "/tests";
        else if (tab.id === "protocols") active = location === "/protocols";

        return (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === "more") onMore();
              else if (tab.path) setLocation(tab.path);
            }}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors relative"
          >
            {active && (
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                style={{ background: BRAND_NAVY }}
              />
            )}
            <tab.icon
              className="w-5 h-5 transition-colors"
              strokeWidth={active ? 2.25 : 1.75}
              style={{ color: active ? BRAND_NAVY : NAV.subtle }}
            />
            <span className="text-[10px] font-semibold" style={{ color: active ? BRAND_NAVY : NAV.subtle }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function MobileMoreDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [, setLocation] = useLocation();
  const { dark } = useThemeStore();
  const NAV = useNav();
  const enabledNavIds = useContext(PublicNavCtx);
  const { isLoggedIn, account } = useAccount();

  if (!open) return null;

  const navigate = (path: string) => { setLocation(path); onClose(); };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm md:hidden"
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-[55] rounded-t-3xl flex flex-col md:hidden"
        style={{
          background: NAV.panel,
          border: `1px solid ${NAV.divider}`,
          paddingBottom: "env(safe-area-inset-bottom)",
          maxHeight: "80dvh",
          fontFamily: FONT,
        }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: NAV.divider }} />
        </div>
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: `1px solid ${NAV.divider}` }}
        >
          <p className="text-sm font-bold" style={{ color: NAV.text }}>More</p>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: NAV.chip }}
          >
            <X className="w-4 h-4" style={{ color: NAV.muted }} />
          </button>
        </div>
        <div className="overflow-y-auto">
          <div className="px-4 py-3">
            {/* Group Buy CTA — mirrors desktop sidebar */}
            <button
              onClick={() => navigate(isLoggedIn ? "/account?s=groups" : "/login")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left mb-4"
              style={{
                background: ACCENT,
                color: "white",
                fontWeight: 600,
                boxShadow: "0 4px 14px rgba(1,118,211,0.25)",
              }}
            >
              <UsersRound className="w-4 h-4 shrink-0" style={{ color: "white" }} strokeWidth={2} />
              <span className="text-sm">Group Buy</span>
            </button>

            {NAV_SECTIONS.map((sec, secIdx) => {
              const items = NAV_ITEMS.filter(n => n.section === sec.key && (enabledNavIds === null || enabledNavIds.has(n.id)));
              if (items.length === 0) return null;
              return (
                <div key={sec.key} className="mb-4">
                  {secIdx > 0 && (
                    <div className="h-px mb-4" style={{ background: NAV.divider }} />
                  )}
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: NAV.subtle }}>
                    {sec.label}
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {items.map(item => {
                      const accent = MORE_ITEM_COLORS[item.id] ?? { bg: BRAND_BG, color: BRAND_NAVY };
                      return (
                        <button
                          key={item.id}
                          onClick={() => navigate(item.path)}
                          className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left border"
                          style={{ background: NAV.panel2, borderColor: NAV.divider }}
                        >
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: accent.bg }}
                          >
                            <item.icon className="w-4 h-4" style={{ color: accent.color }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold leading-tight truncate" style={{ color: NAV.text }}>{item.label}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {isLoggedIn && account?.isWholesale && (
            <div className="px-4 pb-1">
              <div className="h-px mb-3" style={{ background: NAV.divider }} />
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: NAV.subtle }}>
                Wholesale
              </p>
              <button
                onClick={() => navigate("/wholesale")}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left border"
                style={{ background: NAV.panel2, borderColor: NAV.divider }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(16,185,129,0.15)" }}>
                  <Package className="w-4 h-4" style={{ color: "#10b981" }} />
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight" style={{ color: NAV.text }}>Wholesale Order</p>
                  <p className="text-[10px] leading-tight" style={{ color: NAV.muted }}>Bulk ordering</p>
                </div>
              </button>
            </div>
          )}
          <div className="px-4 pb-3">
            <button
              onClick={() => navigate(isLoggedIn ? "/account" : "/login")}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border transition-all"
              style={dark
                ? { background: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.90)" }
                : { background: BRAND_BG, borderColor: "rgba(1,118,211,0.25)", color: BRAND_NAVY }
              }
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 text-left">
                {isLoggedIn && account?.telegramUsername
                  ? `@${getAccountHandle(account)}`
                  : "Login / My Account"}
              </span>
              <ArrowRight className="w-3 h-3 shrink-0 opacity-50" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

interface PageLayoutProps { children: React.ReactNode; bare?: boolean; title?: string; }

export function PageLayout({ children, bare }: PageLayoutProps) {
  if (bare) return <>{children}</>;

  const [location] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [enabledNavIds, setEnabledNavIds] = useState<Set<string> | null>(null);

  // Lab testing pool page (/pool/:slug) uses the Profile Hub bottom nav — but NOT
  // the guest contribution sub-route (/pool/:slug/contribution/:participantId).
  const isLabPool = location.startsWith("/pool/") && !location.includes("/contribution/");
  // Public testing-pool listing pages also use the Profile Hub bottom nav.
  const isCommunityPools = location === "/testing-pools" || location === "/community-testing";

  // On 16:9+ screens the sidebar stays permanently open; otherwise hover-to-expand.
  // Persist the expanded state across route changes (PageLayout remounts on navigation).
  const isWide = typeof window !== "undefined" && window.innerWidth / window.innerHeight >= 16 / 9;
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (isWide) return true;
    return window.localStorage.getItem("sp_sidebar_expanded") === "1";
  });
  useEffect(() => {
    if (typeof window !== "undefined" && !isWide) {
      window.localStorage.setItem("sp_sidebar_expanded", sidebarExpanded ? "1" : "0");
    }
  }, [sidebarExpanded, isWide]);

  useEffect(() => {
    fetch("/api/public-nav-items", { credentials: "omit" })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.items)) {
          const enabled = data.items.filter((i: { id: string; enabled: boolean }) => i.enabled).map((i: { id: string }) => i.id);
          setEnabledNavIds(new Set(enabled));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <PublicNavCtx.Provider value={enabledNavIds}>
    <SidebarExpandedCtx.Provider value={sidebarExpanded}>
    <div className="flex overflow-hidden" style={{ background: "var(--t-bg)", height: "100dvh" }}>
      <Sidebar
        location={location}
        expanded={sidebarExpanded}
        onExpand={() => { if (!isWide) setSidebarExpanded(true); }}
        onCollapse={() => { if (!isWide) setSidebarExpanded(false); }}
      />

      <div
        className="hidden md:block shrink-0"
        style={{ width: sidebarExpanded ? 264 : 64, transition: "width 220ms ease" }}
      />

      <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
        <MobileHeader />
        <DesktopHeader />
        <main
          className={`flex-1 flex flex-col min-h-0 overflow-y-auto ${location.startsWith("/gborganiser") ? "pb-0" : (location.startsWith("/testing/") || isLabPool || isCommunityPools) ? "pb-[calc(56px_+_env(safe-area-inset-bottom))] md:pb-0" : "pb-24 md:pb-0"}`}
          style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          {children}
        </main>
        {location !== "/order" && location !== "/review" && !location.startsWith("/account") && !location.startsWith("/gborganiser") && !location.startsWith("/reshipper") && !location.startsWith("/wholesale") && !location.startsWith("/testing/") && !isLabPool && !isCommunityPools && (
          <MobileBottomTabs location={location} onMore={() => setMoreOpen(true)} />
        )}
      </div>

      <MobileMoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />
      <CartDrawer />
    </div>
    </SidebarExpandedCtx.Provider>
    </PublicNavCtx.Provider>
  );
}
