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
import React, { useState } from "react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  section: "shop" | "learn" | "tools";
}

const NAV_ITEMS: NavItem[] = [
  { id: "shop",        label: "Lonely Vial",    icon: Droplets,      section: "shop"  },
  { id: "accessories", label: "Accessories",     icon: Box,           section: "shop"  },
  { id: "lab",         label: "Lab Reports",     icon: ClipboardList, section: "learn" },
  { id: "protocols",   label: "Protocols",       icon: BookMarked,    section: "learn" },
  { id: "medications", label: "Med Protocols",   icon: Pill,          section: "learn" },
  { id: "trtaas",      label: "TRT & AAS",       icon: Syringe,       section: "learn" },
  { id: "safety",      label: "Endotoxin Calc",  icon: ShieldAlert,   section: "tools" },
  { id: "calculator",  label: "Dose Calc",       icon: Hash,          section: "tools" },
];

const SECTION_THEMES = {
  shop:  { accent: "#4F46E5", accentBg: "rgba(79,70,229,0.12)", accentLight: "rgba(79,70,229,0.06)", label: "Shop",  bar: "#4F46E5" },
  learn: { accent: "#059669", accentBg: "rgba(5,150,105,0.12)",  accentLight: "rgba(5,150,105,0.06)",  label: "Learn", bar: "#059669" },
  tools: { accent: "#D97706", accentBg: "rgba(217,119,6,0.12)",  accentLight: "rgba(217,119,6,0.06)",  label: "Tools", bar: "#D97706" },
};

const SECTIONS: { key: NavItem["section"] }[] = [
  { key: "shop" },
  { key: "learn" },
  { key: "tools" },
];

export function BoldAccent() {
  const [dark, setDark] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [activeId, setActiveId] = useState("shop");

  const bg = dark ? "#0C0C0C" : "#F5F5F4";
  const surface = dark ? "#161616" : "#FFFFFF";
  const borderColor = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
  const textPrimary = dark ? "#F5F5F5" : "#111111";
  const textMuted = dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)";
  const textSubtle = dark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)";

  const labelStyle: React.CSSProperties = {
    opacity: expanded ? 1 : 0,
    maxWidth: expanded ? 180 : 0,
    overflow: "hidden",
    whiteSpace: "nowrap",
    transition: "opacity 150ms ease, max-width 200ms ease",
  };

  const activeItem = NAV_ITEMS.find(n => n.id === activeId);
  const activeSection = activeItem?.section ?? "shop";

  return (
    <div className="min-h-screen flex" style={{ background: bg, fontFamily: "'Inter', sans-serif" }}>
      <aside
        className="flex flex-col overflow-hidden"
        style={{
          width: expanded ? 250 : 58,
          background: surface,
          borderRight: `1px solid ${borderColor}`,
          transition: "width 200ms cubic-bezier(0.4, 0, 0.2, 1)",
          minHeight: "100vh",
        }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <div className="px-3 py-4 shrink-0" style={{ borderBottom: `1px solid ${borderColor}` }}>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center shrink-0 select-none"
              style={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                background: "linear-gradient(135deg, #1B3A7A 0%, #2D6BCC 100%)",
                fontFamily: "'DM Serif Display', serif",
                fontSize: "11px",
                fontWeight: 400,
                color: "white",
                letterSpacing: "-0.02em",
                boxShadow: "0 2px 8px rgba(27,58,122,0.3)",
              }}
            >
              S&P
            </div>
            <div style={labelStyle}>
              <p className="text-[13px] font-bold tracking-tight" style={{ color: textPrimary }}>
                Salt & Peps
              </p>
              <p className="text-[10px] font-medium" style={{ color: textSubtle }}>@pepanon</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {SECTIONS.map(({ key }, si) => {
            const theme = SECTION_THEMES[key];
            const items = NAV_ITEMS.filter(n => n.section === key);
            return (
              <div key={key} className={si > 0 ? "mt-1" : ""}>
                <div className="flex items-center gap-2 px-2 py-2">
                  <div
                    className="shrink-0"
                    style={{
                      width: expanded ? "100%" : 28,
                      height: 3,
                      borderRadius: "2px",
                      background: theme.bar,
                      opacity: dark ? 0.5 : 0.7,
                      transition: "width 200ms ease",
                    }}
                  />
                  {expanded && (
                    <span
                      className="text-[10px] font-bold uppercase shrink-0"
                      style={{ color: theme.accent, letterSpacing: "0.1em", opacity: dark ? 0.7 : 1 }}
                    >
                      {theme.label}
                    </span>
                  )}
                </div>
                {items.map(item => {
                  const active = activeId === item.id;
                  const sectionTheme = SECTION_THEMES[item.section];
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveId(item.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] text-left transition-all"
                      style={{
                        borderRadius: "8px",
                        fontWeight: active ? 600 : 500,
                        color: active ? "white" : textMuted,
                        background: active ? sectionTheme.accent : "transparent",
                        boxShadow: active ? `0 2px 8px ${sectionTheme.accentBg}` : "none",
                        marginBottom: "1px",
                      }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"; }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <item.icon
                        className="w-5 h-5 shrink-0"
                        strokeWidth={active ? 2.25 : 1.75}
                        style={{ color: active ? "white" : textSubtle }}
                      />
                      <span style={labelStyle}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="px-2 pb-4 shrink-0">
          <button
            onClick={() => setDark(!dark)}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-left transition-all"
            style={{
              borderRadius: "8px",
              color: textMuted,
              border: `1px solid ${borderColor}`,
              background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
            }}
          >
            {dark
              ? <Sun className="w-5 h-5 shrink-0" strokeWidth={1.75} style={{ color: "#D97706" }} />
              : <Moon className="w-5 h-5 shrink-0" strokeWidth={1.75} style={{ color: textSubtle }} />
            }
            <span style={labelStyle}>{dark ? "Light mode" : "Dark mode"}</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 p-10">
        <p className="text-[11px] font-bold" style={{ color: SECTION_THEMES[activeSection].accent, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Bold Accent
        </p>
        <p className="text-[13px] mt-2" style={{ color: textMuted }}>
          Color-coded sections (Indigo/Emerald/Amber), strong filled active states, gradient brand mark, thick section bars.
        </p>
      </div>
    </div>
  );
}
