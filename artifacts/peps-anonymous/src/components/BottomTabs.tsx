import { useLocation } from "wouter";
import { Home, BookMarked, Hash, LayoutDashboard, LineChart } from "lucide-react";
import { T } from "@/lib/theme";

const TABS = [
  { id: "home",       label: "Home",      icon: Home,             path: "/" },
  { id: "protocols",  label: "Protocols", icon: BookMarked,       path: "/protocols" },
  { id: "calculator", label: "Calc",      icon: Hash,             path: "/calculator" },
  { id: "plotter",    label: "Plotter",   icon: LineChart,        path: "/account?s=plotter" },
  { id: "account",    label: "Hub",       icon: LayoutDashboard,  path: "/account" },
];

export function BottomTabs({ active }: { active: "home" | "protocols" | "calculator" | "packages" | "tests" | "endotoxin" | "account" | "plotter" }) {
  const [, setLocation] = useLocation();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex border-t md:hidden"
      style={{
        background: "rgba(255,255,255,0.97)",
        borderColor: T.border,
        backdropFilter: "blur(16px)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {TABS.map(tab => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => setLocation(tab.path)}
            className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors"
          >
            <tab.icon
              className="w-4.5 h-4.5 transition-colors"
              style={{ color: isActive ? T.navActive : T.subtle, width: "1.1rem", height: "1.1rem" }}
              strokeWidth={isActive ? 2.25 : 1.75}
            />
            <span
              className="text-[9px] font-semibold transition-colors"
              style={{ color: isActive ? T.navActive : T.subtle }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
