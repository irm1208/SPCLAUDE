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

const SECTIONS: { key: NavItem["section"]; label: string }[] = [
  { key: "shop",  label: "Shop"  },
  { key: "learn", label: "Learn" },
  { key: "tools", label: "Tools" },
];

export function RefinedMinimal() {
  const [dark, setDark] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [activeId, setActiveId] = useState("shop");

  const bg = dark ? "#0F0F0F" : "#FAFAF9";
  const surface = dark ? "#171717" : "#FFFFFF";
  const borderColor = dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)";
  const textPrimary = dark ? "#E5E5E5" : "#1A1A1A";
  const textMuted = dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)";
  const textSubtle = dark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.22)";
  const accentColor = dark ? "#A0A0A0" : "#1A1A1A";
  const hoverBg = dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";

  const labelStyle: React.CSSProperties = {
    opacity: expanded ? 1 : 0,
    maxWidth: expanded ? 180 : 0,
    overflow: "hidden",
    whiteSpace: "nowrap",
    transition: "opacity 200ms ease, max-width 250ms ease",
  };

  return (
    <div className="min-h-screen flex" style={{ background: bg, fontFamily: "'Inter', sans-serif" }}>
      <aside
        className="flex flex-col overflow-hidden"
        style={{
          width: expanded ? 260 : 60,
          background: surface,
          borderRight: `1px solid ${borderColor}`,
          transition: "width 250ms cubic-bezier(0.4, 0, 0.2, 1)",
          minHeight: "100vh",
        }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <div className="px-4 py-5 shrink-0" style={{ borderBottom: `1px solid ${borderColor}` }}>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center shrink-0 select-none"
              style={{
                width: 32,
                height: 32,
                border: `1.5px solid ${dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)"}`,
                borderRadius: "6px",
                fontFamily: "'DM Serif Display', serif",
                fontSize: "11px",
                fontWeight: 400,
                color: textPrimary,
                letterSpacing: "-0.03em",
              }}
            >
              S&P
            </div>
            <div style={labelStyle}>
              <p className="text-[12px] font-medium tracking-tight" style={{ color: textPrimary, letterSpacing: "-0.01em" }}>
                Salt & Peps
              </p>
              <p className="text-[10px]" style={{ color: textSubtle }}>@pepanon</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {SECTIONS.map(({ key, label }, si) => {
            const items = NAV_ITEMS.filter(n => n.section === key);
            return (
              <div key={key} className={si > 0 ? "mt-6" : ""}>
                {expanded && (
                  <p
                    className="px-3 mb-2 text-[9px] font-medium uppercase select-none"
                    style={{ color: textSubtle, letterSpacing: "0.14em" }}
                  >
                    {label}
                  </p>
                )}
                {!expanded && si > 0 && (
                  <div className="h-px mx-2 mb-3" style={{ background: borderColor }} />
                )}
                {items.map(item => {
                  const active = activeId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveId(item.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-[12.5px] text-left transition-all"
                      style={{
                        color: active ? accentColor : textMuted,
                        fontWeight: active ? 500 : 400,
                        borderRadius: "4px",
                        background: active ? (dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)") : "transparent",
                        letterSpacing: "-0.005em",
                      }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = hoverBg; }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <item.icon
                        className="w-[15px] h-[15px] shrink-0"
                        strokeWidth={active ? 1.75 : 1.25}
                        style={{ color: active ? accentColor : textSubtle }}
                      />
                      <span style={labelStyle}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="px-3 pb-5 shrink-0">
          <button
            onClick={() => setDark(!dark)}
            className="w-full flex items-center gap-3 px-3 py-2 text-[12px] text-left transition-all"
            style={{
              color: textMuted,
              fontWeight: 400,
              borderRadius: "4px",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = hoverBg}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
          >
            {dark
              ? <Sun className="w-[15px] h-[15px] shrink-0" strokeWidth={1.25} style={{ color: textSubtle }} />
              : <Moon className="w-[15px] h-[15px] shrink-0" strokeWidth={1.25} style={{ color: textSubtle }} />
            }
            <span style={labelStyle}>{dark ? "Light" : "Dark"}</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 p-10">
        <p className="text-[11px] font-medium" style={{ color: textSubtle, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Refined Minimal
        </p>
        <p className="text-[13px] mt-2" style={{ color: textMuted }}>
          Luxury quiet. Delicate icons, hairline borders, monochromatic palette with minimal accent usage.
        </p>
      </div>
    </div>
  );
}
