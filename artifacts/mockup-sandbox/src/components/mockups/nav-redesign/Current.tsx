import './_group.css';
import {
  Home,
  Droplets,
  ClipboardList,
  BookMarked,
  ShieldAlert,
  Box,
  Hash,
  Sun,
  Moon,
  Pill,
  Syringe,
} from "lucide-react";
import React, { useState, createContext, useContext } from "react";

const BRAND_NAVY = "#1B3A7A";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  section: "shop" | "learn" | "tools";
}

const NAV_ITEMS: NavItem[] = [
  { id: "shop",        label: "Lonely Vial",    icon: Droplets,      path: "/shop",        section: "shop"  },
  { id: "accessories", label: "Accessories",     icon: Box,           path: "/accessories",  section: "shop"  },
  { id: "lab",         label: "Lab Reports",     icon: ClipboardList, path: "/tests",        section: "learn" },
  { id: "protocols",   label: "Protocols",       icon: BookMarked,    path: "/protocols",    section: "learn" },
  { id: "medications", label: "Med Protocols",   icon: Pill,          path: "/medications",  section: "learn" },
  { id: "trtaas",      label: "TRT & AAS",       icon: Syringe,       path: "/trt-aas",      section: "learn" },
  { id: "safety",      label: "Endotoxin Calc",  icon: ShieldAlert,   path: "/endotoxin",    section: "tools" },
  { id: "calculator",  label: "Dose Calc",       icon: Hash,          path: "/calculator",   section: "tools" },
];

const NAV_SECTIONS: { key: NavItem["section"]; label: string }[] = [
  { key: "shop",  label: "Shop"  },
  { key: "learn", label: "Learn" },
  { key: "tools", label: "Tools" },
];

const SidebarExpandedCtx = createContext(true);

function BrandMark() {
  return (
    <div
      className="flex items-center justify-center shrink-0 select-none"
      style={{
        width: 36,
        height: 36,
        borderRadius: "8px",
        background: BRAND_NAVY,
        fontFamily: "var(--font-display)",
        fontSize: "10.5px",
        fontWeight: 400,
        color: "white",
        letterSpacing: "-0.02em",
      }}
    >
      S&P
    </div>
  );
}

function NavDivider() {
  return <div className="h-px mx-2 my-1.5" style={{ background: "var(--t-border)" }} />;
}

function SidebarNavItem({ item, active, dark, expanded }: { item: NavItem; active: boolean; dark: boolean; expanded: boolean }) {
  const labelStyle: React.CSSProperties = {
    opacity: expanded ? 1 : 0,
    maxWidth: expanded ? 160 : 0,
    overflow: "hidden",
    whiteSpace: "nowrap",
    transition: "opacity 150ms ease, max-width 200ms ease",
  };

  return (
    <button
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all text-left ${active ? "" : dark ? "hover:bg-white/[0.05]" : "hover:bg-black/[0.03]"}`}
      style={
        active
          ? { background: dark ? "rgba(255,255,255,0.08)" : "rgba(45,107,204,0.08)", color: dark ? "white" : BRAND_NAVY, fontWeight: 600 }
          : { color: dark ? "rgba(255,255,255,0.7)" : "var(--t-muted)", fontWeight: 500 }
      }
    >
      <item.icon
        className="w-4 h-4 shrink-0"
        strokeWidth={active ? 2.25 : 1.75}
        style={{ color: active ? BRAND_NAVY : dark ? "rgba(255,255,255,0.75)" : "var(--t-subtle)" }}
      />
      <span className="truncate" style={labelStyle}>
        {item.label}
      </span>
    </button>
  );
}

export function Current() {
  const [dark, setDark] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [activeId, setActiveId] = useState("shop");

  const labelStyle: React.CSSProperties = {
    opacity: expanded ? 1 : 0,
    maxWidth: expanded ? 160 : 0,
    overflow: "hidden",
    whiteSpace: "nowrap",
    transition: "opacity 150ms ease, max-width 200ms ease",
  };

  return (
    <div
      className="min-h-screen flex"
      data-theme={dark ? "dark" : "light"}
      style={{ background: "var(--t-bg)", fontFamily: "var(--font-sans)" }}
    >
      <aside
        className="flex flex-col overflow-hidden"
        style={{
          width: expanded ? 240 : 56,
          background: "var(--t-surface)",
          borderRight: "1px solid var(--t-border)",
          transition: "width 220ms ease",
          minHeight: "100vh",
        }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <div
          className="flex items-center shrink-0"
          style={{ borderBottom: "1px solid var(--t-border)" }}
        >
          <div className="flex items-center gap-3 px-3 py-4 flex-1 min-w-0 text-left">
            <BrandMark />
            <div className="flex-1 min-w-0" style={{ ...labelStyle, maxWidth: expanded ? 200 : 0 }}>
              <p className="text-[13px] font-bold leading-tight truncate" style={{ color: "var(--t-text)" }}>Salt &amp; Peps</p>
              <p className="text-[11px] leading-tight" style={{ color: "var(--t-subtle)" }}>@pepanon</p>
            </div>
          </div>
          {expanded && (
            <button
              className={`w-10 h-10 flex items-center justify-center rounded-lg mr-2 shrink-0 transition-colors ${dark ? "hover:bg-white/[0.05]" : "hover:bg-black/[0.04]"}`}
            >
              <Home className="w-4 h-4" style={{ color: dark ? "rgba(255,255,255,0.75)" : "var(--t-subtle)" }} strokeWidth={1.75} />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2.5">
          {NAV_SECTIONS.map(({ key, label }) => {
            const items = NAV_ITEMS.filter(n => n.section === key);
            if (items.length === 0) return null;
            return (
              <React.Fragment key={key}>
                <NavDivider />
                {expanded && (
                  <p
                    className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-widest select-none"
                    style={{ color: dark ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.32)" }}
                  >
                    {label}
                  </p>
                )}
                {items.map(item => (
                  <div key={item.id} onClick={() => setActiveId(item.id)}>
                    <SidebarNavItem
                      item={item}
                      active={activeId === item.id}
                      dark={dark}
                      expanded={expanded}
                    />
                  </div>
                ))}
              </React.Fragment>
            );
          })}
        </nav>

        <div className="px-2 pb-4 shrink-0 space-y-2">
          <button
            onClick={() => setDark(!dark)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all text-left border`}
            style={{
              color: dark ? "rgba(255,255,255,0.7)" : "var(--t-muted)",
              borderColor: dark ? "rgba(255,255,255,0.12)" : "var(--t-border)",
              background: dark ? "rgba(255,255,255,0.04)" : "var(--t-surface2)",
            }}
          >
            {dark
              ? <Sun className="w-4 h-4 shrink-0" strokeWidth={1.75} style={{ color: "rgba(255,255,255,0.75)" }} />
              : <Moon className="w-4 h-4 shrink-0" strokeWidth={1.75} style={{ color: "var(--t-subtle)" }} />
            }
            <span style={labelStyle}>{dark ? "Light mode" : "Dark mode"}</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 p-8">
        <p className="text-sm" style={{ color: "var(--t-muted)" }}>
          This is the current sidebar navigation. Hover to expand/collapse, click items to see active states, toggle dark mode at the bottom.
        </p>
      </div>
    </div>
  );
}
