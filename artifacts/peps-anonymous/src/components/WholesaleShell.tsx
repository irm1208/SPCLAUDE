import { useLocation } from "wouter";
import { ArrowLeft, LayoutDashboard, Moon, Package, ShoppingCart, Sun, Users } from "lucide-react";
import { palette, ACCENT, FONT } from "@/components/dashboard-theme";
import { useThemeStore } from "@/hooks/use-theme";
import { useAccount } from "@/hooks/use-account";

type WholesaleSection = "order" | "shared";

const NAV_ITEMS: { id: WholesaleSection; label: string; path: string; icon: typeof ShoppingCart }[] = [
  { id: "order",  label: "Wholesale Order", path: "/wholesale",        icon: ShoppingCart },
  { id: "shared", label: "Shared Orders",   path: "/wholesale/shared", icon: Users },
];

export function WholesaleShell({ active, title, children }: {
  active: WholesaleSection;
  title: string;
  children: React.ReactNode;
}) {
  const [, setLocation] = useLocation();
  const { account } = useAccount();
  const { dark, toggle: toggleTheme } = useThemeStore();
  const P = palette(dark);

  return (
    <div className="flex overflow-hidden" style={{ height: "100dvh", background: P.page, fontFamily: FONT, color: P.text }}>

      {/* ══ Desktop sidebar ══ */}
      <aside className="hidden lg:flex flex-col shrink-0" style={{ width: 252, background: P.sidebar, borderRight: `1px solid ${P.border}` }}>
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 shrink-0" style={{ height: 72 }}>
          <span className="flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: 8, background: ACCENT, color: "#fff" }}>
            <Package className="w-[19px] h-[19px]" strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <p className="font-extrabold tracking-tight leading-tight truncate" style={{ fontSize: 16 }}>Wholesale Hub</p>
            <p className="truncate" style={{ fontSize: 11.5, color: P.subtle }}>@{account?.telegramUsername}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <p className="px-3 mb-2 font-semibold" style={{ fontSize: 12, letterSpacing: ".01em", color: P.subtle }}>Workspace</p>
          <nav className="flex flex-col gap-0.5">
            {NAV_ITEMS.map(t => {
              const Icon = t.icon;
              const isActive = active === t.id;
              return (
                <button key={t.id} onClick={() => setLocation(t.path)}
                  className="relative w-full flex items-center rounded-md transition-all text-left"
                  style={{
                    gap: 11, padding: "0 12px", height: 40,
                    background: isActive ? (dark ? "rgba(1,118,211,0.18)" : "rgba(1,118,211,0.10)") : "transparent",
                    color: isActive ? ACCENT : P.muted, fontWeight: isActive ? 700 : 600, fontSize: 13.5,
                  }}>
                  {isActive && <span className="absolute rounded-full" style={{ left: -12, top: 11, bottom: 11, width: 3.5, background: ACCENT }} />}
                  <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={isActive ? 2.4 : 2} />
                  <span className="flex-1 truncate">{t.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar footer */}
        <div className="px-3 py-3 shrink-0 flex flex-col gap-0.5" style={{ borderTop: `1px solid ${P.border}` }}>
          <button onClick={() => setLocation("/account")}
            className="w-full flex items-center rounded-md transition-all text-left"
            style={{ gap: 11, padding: "0 12px", height: 38, color: P.muted, fontWeight: 600, fontSize: 13 }}>
            <LayoutDashboard className="w-[17px] h-[17px] shrink-0" />
            <span className="truncate">Back to Dashboard</span>
          </button>
        </div>
      </aside>

      {/* ══ Main column ══ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Topbar ── */}
        <header className="flex items-center gap-2.5 px-4 md:px-7 shrink-0" style={{ height: 60, background: P.panel, borderBottom: `1px solid ${P.border}` }}>
          <button onClick={() => setLocation("/account")} aria-label="Back to dashboard"
            className="lg:hidden flex items-center justify-center rounded-lg shrink-0"
            style={{ width: 34, height: 34, background: P.chip, border: `1px solid ${P.border}`, color: P.muted }}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-bold uppercase" style={{ fontSize: 10, letterSpacing: ".08em", color: ACCENT }}>Wholesale</p>
            <p className="font-extrabold tracking-tight truncate leading-tight" style={{ fontSize: 16 }}>{title}</p>
          </div>
          <button onClick={toggleTheme} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="flex items-center justify-center rounded-lg shrink-0"
            style={{ width: 34, height: 34, background: P.chip, border: `1px solid ${P.border}`, color: P.muted }}>
            {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </header>

        {/* ── Mobile tab bar ── */}
        <div className="lg:hidden flex gap-1.5 px-4 py-2 overflow-x-auto shrink-0" style={{ background: P.panel, borderBottom: `1px solid ${P.border}` }}>
          {NAV_ITEMS.map(t => {
            const Icon = t.icon;
            const isActive = active === t.id;
            return (
              <button key={t.id} onClick={() => setLocation(t.path)}
                className="flex items-center gap-1.5 px-3 h-8 rounded-full text-[11px] font-bold whitespace-nowrap transition-all shrink-0"
                style={isActive
                  ? { background: ACCENT, color: "#fff" }
                  : { background: P.chip, color: P.muted, border: `1px solid ${P.border}` }}>
                <Icon className="w-3 h-3" />{t.label}
              </button>
            );
          })}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
