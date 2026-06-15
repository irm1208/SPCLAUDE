import {
  ChevronLeft,
  LogOut,
  ShoppingCart,
  LayoutGrid,
  FileText,
  Users,
  Store,
  FlaskConical,
  User,
  MessageCircle,
  Moon,
} from "lucide-react";
import type { ReactNode } from "react";

// Shared chrome for the three Profile Hub layout variants.
// Holds the outer sidebar, header, and page background fixed so
// that visual comparison between A/B/C only reflects differences
// in the main content organization.
export function Shell({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen flex"
      style={{
        background: "#F3F4F6",
        fontFamily: "'Inter', system-ui, sans-serif",
        color: "#0F172A",
      }}
    >
      {/* Left sidebar */}
      <aside
        className="flex flex-col items-center py-4"
        style={{
          width: 60,
          background: "#FFFFFF",
          borderRight: "1px solid #E5E7EB",
        }}
      >
        <div
          className="w-9 h-9 rounded-md flex items-center justify-center text-white text-[12px] font-bold tracking-tight"
          style={{ background: "#15366B" }}
        >
          S&amp;P
        </div>
        <nav className="mt-8 flex flex-col gap-2 text-slate-400">
          <NavIcon active>
            <LayoutGrid className="w-4 h-4" />
          </NavIcon>
          <NavIcon>
            <FileText className="w-4 h-4" />
          </NavIcon>
          <NavIcon>
            <Users className="w-4 h-4" />
          </NavIcon>
          <NavIcon>
            <Store className="w-4 h-4" />
          </NavIcon>
          <NavIcon>
            <FlaskConical className="w-4 h-4" />
          </NavIcon>
          <NavIcon>
            <User className="w-4 h-4" />
          </NavIcon>
          <NavIcon>
            <MessageCircle className="w-4 h-4" />
          </NavIcon>
        </nav>
        <div className="mt-auto flex flex-col gap-2 text-slate-400">
          <NavIcon>
            <Moon className="w-4 h-4" />
          </NavIcon>
          <NavIcon>
            <ChevronLeft className="w-4 h-4" />
          </NavIcon>
          <NavIcon danger>
            <LogOut className="w-4 h-4" />
          </NavIcon>
        </div>
      </aside>

      {/* Main column */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3">
          <button
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E5E7EB",
            }}
          >
            <ChevronLeft className="w-4 h-4 text-slate-700" />
          </button>
          <div className="flex items-center gap-2">
            <button
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "#FFFFFF", border: "1px solid #E5E7EB" }}
            >
              <ShoppingCart className="w-4 h-4 text-slate-700" />
            </button>
            <div
              className="flex items-center gap-2 px-3 h-9 rounded-xl text-white text-[12px] font-semibold"
              style={{ background: "#15366B" }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px]"
                style={{ background: "#7AA2D8", color: "#15366B" }}
              >
                👤
              </div>
              @iam0121
            </div>
            <button
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "#FFFFFF",
                border: "1px solid #FECACA",
                color: "#DC2626",
              }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hero welcome */}
        <header className="px-6 pt-3 pb-5">
          <div className="text-[10px] tracking-[0.25em] uppercase font-semibold text-slate-400">
            Profile Hub
          </div>
          <h1
            className="mt-1 tracking-[-0.015em] leading-[1.05]"
            style={{
              fontFamily: "'Newsreader', Georgia, serif",
              fontSize: 34,
              fontWeight: 500,
            }}
          >
            Welcome back,{" "}
            <span
              style={{
                color: "#2E5BFF",
                fontStyle: "italic",
                fontWeight: 600,
              }}
            >
              @iam0121
            </span>
          </h1>
        </header>

        {children}
      </main>
    </div>
  );
}

function NavIcon({
  children,
  active,
  danger,
}: {
  children: ReactNode;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center"
      style={{
        background: active
          ? "#EEF2FF"
          : danger
          ? "#FEF2F2"
          : "transparent",
        color: active ? "#2E5BFF" : danger ? "#DC2626" : undefined,
      }}
    >
      {children}
    </div>
  );
}
