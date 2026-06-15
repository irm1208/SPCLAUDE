import React, { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard, Package, Syringe, FlaskConical, HeartPulse,
  Scale, LineChart, Users, User, MessageCircle, History,
  Store, TestTube, X, ChevronLeft, LogOut, Sun, Moon,
  ReceiptText, MoreHorizontal, Truck, ShoppingBag, BookMarked, ClipboardList, Pill, MessageSquarePlus,
} from "lucide-react";
import { useThemeStore } from "@/hooks/use-theme";
import { useHubDrawerStore } from "@/hooks/use-hub-drawer";
import { useLogout, useAccount } from "@/hooks/use-account";

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

const DRAWER_GROUPS: { label: string; ids: HubSection[] }[] = [
  { label: "Account",    ids: ["home", "orders"] },
  { label: "Group Buys", ids: ["groups", "gb-testing", "lab-pool"] },
  { label: "Health",     ids: ["health-hub"] },
];

const LAB_TESTS_LINK = { label: "Lab Tests", icon: ClipboardList, section: "lab-tests" };

const PROTOCOL_LINKS: { label: string; icon: React.ElementType; section: string }[] = [
  { label: "Protocols", icon: BookMarked, section: "protocols" },
];

const BOTTOM_NAV_ITEMS: { id: HubSection; label: string; icon: React.ElementType }[] = [
  { id: "home",   label: "Hub",     icon: LayoutDashboard },
  { id: "orders", label: "Orders",  icon: ReceiptText },
  { id: "groups", label: "Groups",  icon: Users },
  { id: "health-hub", label: "Health", icon: HeartPulse },
];

interface HubBottomNavProps {
  section: HubSection;
  setSection: (s: HubSection) => void;
  hubMoreOpen: boolean;
  setHubMoreOpen: (open: boolean) => void;
  account?: { organiserStatus?: string | null; reshipperStatus?: string | null; isWholesale?: boolean } | null;
  navOrder?: HubSection[];
}

const BRAND_NAVY = "var(--t-blue-deep)";

export function HubBottomNav({
  section,
  setSection,
  account,
}: HubBottomNavProps) {
  const [, setLocation] = useLocation();
  const { dark, toggle: toggleTheme } = useThemeStore();
  const { open, setOpen } = useHubDrawerStore();
  const logout = useLogout();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const navigate = (sectionId: HubSection) => {
    setSection(sectionId);
    setOpen(false);
  };

  const activeColor = dark ? "#60a5fa" : BRAND_NAVY;
  const activeBg = dark ? "rgba(255,255,255,0.08)" : "var(--t-blue-08)";

  const isMoreActive = open || !BOTTOM_NAV_ITEMS.some(i => i.id === section);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[55] md:hidden"
        style={{
          background: "rgba(0,0,0,0.45)",
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
        className="fixed top-0 left-0 bottom-0 z-[60] flex flex-col md:hidden"
        style={{
          width: 272,
          background: "var(--t-surface)",
          borderRight: "1px solid var(--t-border)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 240ms cubic-bezier(0.32,0,0.15,1)",
          willChange: "transform",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 shrink-0"
          style={{ height: 56, borderBottom: "1px solid var(--t-border)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center shrink-0 select-none"
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: BRAND_NAVY,
                fontFamily: "var(--font-display)",
                fontSize: "9.5px",
                fontWeight: 400,
                color: "white",
                letterSpacing: "-0.02em",
              }}
            >
              S&amp;P
            </div>
            <div>
              <p className="text-[13px] font-bold leading-tight" style={{ color: "var(--t-text)" }}>Profile Hub</p>
              <p className="text-[10px] leading-tight" style={{ color: "var(--t-subtle)" }}>Salt &amp; Peps</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}
          >
            <X className="w-3.5 h-3.5" style={{ color: "var(--t-muted)" }} />
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {DRAWER_GROUPS.map((group, gi) => {
            const items = group.ids
              .map(id => HUB_SECTION_ALL_META.find(m => m.id === id))
              .filter((m): m is typeof HUB_SECTION_ALL_META[number] => !!m);
            const isAccount = group.label === "Account";
            const hasRoleItems = isAccount && (account?.organiserStatus === "approved" || account?.reshipperStatus === "approved" || account?.isWholesale);
            if (items.length === 0 && !hasRoleItems) return null;
            return (
              <React.Fragment key={group.label}>
                {gi > 0 && <div className="h-px mx-2 my-1.5" style={{ background: "var(--t-border)" }} />}
                <p
                  className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest select-none"
                  style={{ color: dark ? "rgba(255,255,255,0.35)" : "var(--t-subtle)" }}
                >
                  {group.label}
                </p>
                {items.map(item => {
                  const active = section === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all text-left ${active ? "" : dark ? "hover:bg-white/[0.05]" : "hover:bg-black/[0.03]"}`}
                      style={
                        active
                          ? { background: activeBg, color: activeColor, fontWeight: 600 }
                          : { color: dark ? "rgba(255,255,255,0.7)" : "var(--t-muted)", fontWeight: 500 }
                      }
                    >
                      <Icon
                        className="w-4 h-4 shrink-0"
                        strokeWidth={active ? 2.25 : 1.75}
                        style={{ color: active ? activeColor : dark ? "rgba(255,255,255,0.70)" : "var(--t-subtle)" }}
                      />
                      {item.label}
                    </button>
                  );
                })}
                {/* Role-based pages appended to Account group */}
                {isAccount && account?.organiserStatus === "approved" && (
                  <button
                    onClick={() => { setOpen(false); setLocation("/gborganiser"); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all text-left ${dark ? "hover:bg-white/[0.05]" : "hover:bg-black/[0.03]"}`}
                    style={{ color: dark ? "rgba(255,255,255,0.7)" : "var(--t-muted)", fontWeight: 500 }}
                  >
                    <Store className="w-4 h-4 shrink-0" strokeWidth={1.75} style={{ color: dark ? "rgba(255,255,255,0.70)" : "var(--t-subtle)" }} />
                    GB Organiser
                  </button>
                )}
                {isAccount && account?.reshipperStatus === "approved" && (
                  <button
                    onClick={() => { setOpen(false); setLocation("/reshipper"); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all text-left ${dark ? "hover:bg-white/[0.05]" : "hover:bg-black/[0.03]"}`}
                    style={{ color: dark ? "rgba(255,255,255,0.7)" : "var(--t-muted)", fontWeight: 500 }}
                  >
                    <Truck className="w-4 h-4 shrink-0" strokeWidth={1.75} style={{ color: dark ? "rgba(255,255,255,0.70)" : "var(--t-subtle)" }} />
                    Reshipper
                  </button>
                )}
                {isAccount && account?.isWholesale && (
                  <button
                    onClick={() => { setOpen(false); setLocation("/wholesale"); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all text-left ${dark ? "hover:bg-white/[0.05]" : "hover:bg-black/[0.03]"}`}
                    style={{ color: dark ? "rgba(255,255,255,0.7)" : "var(--t-muted)", fontWeight: 500 }}
                  >
                    <ShoppingBag className="w-4 h-4 shrink-0" strokeWidth={1.75} style={{ color: dark ? "rgba(255,255,255,0.70)" : "var(--t-subtle)" }} />
                    Wholesale
                  </button>
                )}
                {/* Community Testing appended to Group Buys section */}
                {group.label === "Group Buys" && (
                  <button
                    onClick={() => { setOpen(false); setLocation("/account?s=community-testing"); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all text-left ${dark ? "hover:bg-white/[0.05]" : "hover:bg-black/[0.03]"}`}
                    style={{ color: dark ? "rgba(255,255,255,0.7)" : "var(--t-muted)", fontWeight: 500 }}
                  >
                    <FlaskConical className="w-4 h-4 shrink-0" strokeWidth={1.75} style={{ color: dark ? "rgba(255,255,255,0.70)" : "var(--t-subtle)" }} />
                    Community Testing
                  </button>
                )}
              </React.Fragment>
            );
          })}

          {/* Protocols section — in-hub links */}
          <div className="h-px mx-2 my-1.5" style={{ background: "var(--t-border)" }} />
          <p
            className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest select-none"
            style={{ color: dark ? "rgba(255,255,255,0.35)" : "var(--t-subtle)" }}
          >
            Protocols
          </p>
          {PROTOCOL_LINKS.map(({ label, icon: Icon, section: sec }) => (
            <button
              key={sec}
              onClick={() => { setOpen(false); setLocation(`/account?s=${sec}`); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all text-left ${dark ? "hover:bg-white/[0.05]" : "hover:bg-black/[0.03]"}`}
              style={{ color: dark ? "rgba(255,255,255,0.7)" : "var(--t-muted)", fontWeight: 500 }}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} style={{ color: dark ? "rgba(255,255,255,0.70)" : "var(--t-subtle)" }} />
              {label}
            </button>
          ))}

          {/* Lab Tests — its own section */}
          <div className="h-px mx-2 my-1.5" style={{ background: "var(--t-border)" }} />
          <p
            className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest select-none"
            style={{ color: dark ? "rgba(255,255,255,0.35)" : "var(--t-subtle)" }}
          >
            Lab Tests
          </p>
          {(() => { const LabIcon = LAB_TESTS_LINK.icon; return (
            <button
              onClick={() => { setOpen(false); setLocation(`/account?s=${LAB_TESTS_LINK.section}`); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all text-left ${dark ? "hover:bg-white/[0.05]" : "hover:bg-black/[0.03]"}`}
              style={{ color: dark ? "rgba(255,255,255,0.7)" : "var(--t-muted)", fontWeight: 500 }}
            >
              <LabIcon className="w-4 h-4 shrink-0" strokeWidth={1.75} style={{ color: dark ? "rgba(255,255,255,0.70)" : "var(--t-subtle)" }} />
              {LAB_TESTS_LINK.label}
            </button>
          ); })()}
          {/* Community */}
          <div className="h-px mx-2 my-1.5" style={{ background: "var(--t-border)" }} />
          <p
            className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest select-none"
            style={{ color: dark ? "rgba(255,255,255,0.35)" : "var(--t-subtle)" }}
          >
            Community
          </p>
          <button
            onClick={() => { setOpen(false); setLocation("/feedback"); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all text-left ${dark ? "hover:bg-white/[0.05]" : "hover:bg-black/[0.03]"}`}
            style={{ color: dark ? "rgba(255,255,255,0.7)" : "var(--t-muted)", fontWeight: 500 }}
          >
            <MessageSquarePlus className="w-4 h-4 shrink-0" strokeWidth={1.75} style={{ color: dark ? "rgba(255,255,255,0.70)" : "var(--t-subtle)" }} />
            Feedback & Requests
          </button>

          {/* Settings — scrolls with the nav */}
          <div className="h-px mx-2 my-1.5" style={{ background: "var(--t-border)" }} />
          <p
            className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest select-none"
            style={{ color: dark ? "rgba(255,255,255,0.35)" : "var(--t-subtle)" }}
          >
            Settings
          </p>
          {([
            { id: "profile" as HubSection,  label: "Profile",  Icon: User          },
            { id: "telegram" as HubSection, label: "Telegram", Icon: MessageCircle },
          ] as { id: HubSection; label: string; Icon: React.ElementType }[]).map(({ id, label, Icon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                onClick={() => navigate(id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all text-left ${active ? "" : dark ? "hover:bg-white/[0.05]" : "hover:bg-black/[0.03]"}`}
                style={
                  active
                    ? { background: dark ? "rgba(255,255,255,0.08)" : "var(--t-blue-08)", color: dark ? "white" : BRAND_NAVY, fontWeight: 600 }
                    : { color: dark ? "rgba(255,255,255,0.7)" : "var(--t-muted)", fontWeight: 500 }
                }
              >
                <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.25 : 1.75} style={{ color: active ? (dark ? "white" : BRAND_NAVY) : dark ? "rgba(255,255,255,0.70)" : "var(--t-subtle)" }} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 pb-4 pt-1 shrink-0 space-y-1.5" style={{ borderTop: "1px solid var(--t-border)" }}>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all text-left border"
            style={{
              color: dark ? "rgba(255,255,255,0.7)" : "var(--t-muted)",
              borderColor: dark ? "rgba(255,255,255,0.12)" : "var(--t-border)",
              background: dark ? "rgba(255,255,255,0.04)" : "var(--t-surface2)",
              marginTop: 8,
            }}
          >
            {dark
              ? <Sun className="w-4 h-4 shrink-0" strokeWidth={1.75} style={{ color: dark ? "rgba(255,255,255,0.75)" : "var(--t-subtle)" }} />
              : <Moon className="w-4 h-4 shrink-0" strokeWidth={1.75} style={{ color: "var(--t-subtle)" }} />
            }
            {dark ? "Light mode" : "Dark mode"}
          </button>

          <button
            onClick={() => { setOpen(false); setLocation("/"); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors text-left"
            style={{ color: "var(--t-muted)" }}
          >
            <ChevronLeft className="w-4 h-4 shrink-0" strokeWidth={2} style={{ color: "var(--t-subtle)" }} />
            Back to Store
          </button>

          <button
            onClick={() => { logout.mutate(); setLocation("/"); setOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all text-left border"
            style={{
              color: dark ? "rgba(255,100,100,0.85)" : "#dc2626",
              borderColor: dark ? "rgba(220,38,38,0.2)" : "rgba(220,38,38,0.18)",
              background: dark ? "rgba(220,38,38,0.07)" : "rgba(220,38,38,0.04)",
            }}
          >
            <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      </div>

      {/* ── Fixed bottom navigation bar ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[50] md:hidden flex items-stretch"
        style={{
          height: 56,
          background: dark ? "rgba(15,20,30,0.97)" : "rgba(255,255,255,0.97)",
          borderTop: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "var(--t-border)"}`,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {BOTTOM_NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = section === item.id && !open;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className="relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-all"
              style={{ color: active ? activeColor : dark ? "rgba(255,255,255,0.45)" : "var(--t-subtle)" }}
            >
              <Icon
                className="w-[18px] h-[18px]"
                strokeWidth={active ? 2.25 : 1.75}
              />
              <span
                className="text-[10px] font-medium leading-none"
                style={{ fontWeight: active ? 700 : 500 }}
              >
                {item.label}
              </span>
              {active && (
                <span
                  className="absolute bottom-0 rounded-t-full"
                  style={{
                    width: 20,
                    height: 2.5,
                    background: activeColor,
                  }}
                />
              )}
            </button>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setOpen(o => !o)}
          className="relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-all"
          style={{ color: isMoreActive ? activeColor : dark ? "rgba(255,255,255,0.45)" : "var(--t-subtle)" }}
        >
          <MoreHorizontal
            className="w-[18px] h-[18px]"
            strokeWidth={isMoreActive ? 2.25 : 1.75}
          />
          <span
            className="text-[10px] font-medium leading-none"
            style={{ fontWeight: isMoreActive ? 700 : 500 }}
          >
            More
          </span>
          {isMoreActive && !open && (
            <span
              className="absolute bottom-0 rounded-t-full"
              style={{
                width: 20,
                height: 2.5,
                background: activeColor,
              }}
            />
          )}
        </button>
      </div>
    </>
  );
}
