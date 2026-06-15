import './_group.css';
import {
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
  subtitle: string;
  icon: React.ElementType;
  section: "shop" | "learn" | "tools";
  num: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "shop",        label: "Lonely Vial",    subtitle: "Single vials, no kits",      icon: Droplets,      section: "shop",  num: "01" },
  { id: "accessories", label: "Accessories",     subtitle: "Supplies & gear",            icon: Box,           section: "shop",  num: "02" },
  { id: "lab",         label: "Lab Reports",     subtitle: "Third-party testing",        icon: ClipboardList, section: "learn", num: "03" },
  { id: "protocols",   label: "Protocols",       subtitle: "Community guides",           icon: BookMarked,    section: "learn", num: "04" },
  { id: "medications", label: "Med Protocols",   subtitle: "Pharmaceutical references",  icon: Pill,          section: "learn", num: "05" },
  { id: "trtaas",      label: "TRT & AAS",       subtitle: "Hormone optimization",       icon: Syringe,       section: "learn", num: "06" },
  { id: "safety",      label: "Endotoxin Calc",  subtitle: "Safety threshold tool",      icon: ShieldAlert,   section: "tools", num: "07" },
  { id: "calculator",  label: "Dose Calc",       subtitle: "Concentration calculator",   icon: Hash,          section: "tools", num: "08" },
];

const SECTIONS: { key: NavItem["section"]; label: string }[] = [
  { key: "shop",  label: "Shop"  },
  { key: "learn", label: "Learn" },
  { key: "tools", label: "Tools" },
];

export function Editorial() {
  const [dark, setDark] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [activeId, setActiveId] = useState("shop");

  const bg = dark ? "#0E0E0E" : "#F8F7F5";
  const surface = dark ? "#151515" : "#FFFFFF";
  const borderColor = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
  const textPrimary = dark ? "#ECECEC" : "#111111";
  const textMuted = dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const textSubtle = dark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.2)";
  const accentBar = dark ? "#A0A0A0" : "#1B3A7A";

  const labelStyle: React.CSSProperties = {
    opacity: expanded ? 1 : 0,
    maxWidth: expanded ? 200 : 0,
    overflow: "hidden",
    whiteSpace: "nowrap",
    transition: "opacity 200ms ease, max-width 250ms ease",
  };

  return (
    <div className="min-h-screen flex" style={{ background: bg, fontFamily: "'Inter', sans-serif" }}>
      <aside
        className="flex flex-col overflow-hidden"
        style={{
          width: expanded ? 270 : 60,
          background: surface,
          borderRight: `1px solid ${borderColor}`,
          transition: "width 250ms cubic-bezier(0.4, 0, 0.2, 1)",
          minHeight: "100vh",
        }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <div className="px-5 py-5 shrink-0" style={{ borderBottom: `1px solid ${borderColor}` }}>
          <div className="flex items-center gap-3">
            <div className="shrink-0 select-none" style={{ width: 32 }}>
              <span
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: expanded ? "18px" : "14px",
                  fontWeight: 400,
                  color: textPrimary,
                  letterSpacing: "-0.04em",
                  transition: "font-size 250ms ease",
                  lineHeight: 1,
                }}
              >
                S&P
              </span>
            </div>
            {expanded && (
              <div style={{ opacity: expanded ? 1 : 0, transition: "opacity 200ms ease" }}>
                <p
                  className="text-[11px] leading-tight"
                  style={{
                    color: textSubtle,
                    fontFamily: "'DM Serif Display', serif",
                    fontStyle: "italic",
                    letterSpacing: "0.02em",
                  }}
                >
                  Salt & Peps
                </p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {SECTIONS.map(({ key, label }, si) => {
            const items = NAV_ITEMS.filter(n => n.section === key);
            return (
              <div key={key} className={si > 0 ? "mt-5" : ""}>
                {expanded ? (
                  <p
                    className="px-3 mb-2"
                    style={{
                      fontFamily: "'DM Serif Display', serif",
                      fontSize: "14px",
                      fontWeight: 400,
                      color: textPrimary,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {label}
                  </p>
                ) : (
                  si > 0 && <div className="h-px mx-2 mb-3" style={{ background: borderColor }} />
                )}
                {items.map(item => {
                  const active = activeId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveId(item.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left transition-all relative"
                      style={{ borderRadius: "4px" }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"; }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      {active && (
                        <div
                          className="absolute left-0 top-1/2 -translate-y-1/2"
                          style={{
                            width: 3,
                            height: 20,
                            borderRadius: "0 2px 2px 0",
                            background: accentBar,
                          }}
                        />
                      )}
                      {expanded ? (
                        <span
                          className="shrink-0 text-[10px] font-mono"
                          style={{
                            color: active ? accentBar : textSubtle,
                            width: 20,
                            fontWeight: 500,
                          }}
                        >
                          {item.num}
                        </span>
                      ) : (
                        <item.icon
                          className="w-4 h-4 shrink-0"
                          strokeWidth={active ? 2 : 1.5}
                          style={{ color: active ? accentBar : textSubtle }}
                        />
                      )}
                      <div style={labelStyle}>
                        <p
                          className="text-[12.5px]"
                          style={{
                            color: active ? textPrimary : textMuted,
                            fontWeight: active ? 600 : 400,
                            letterSpacing: "-0.005em",
                          }}
                        >
                          {item.label}
                        </p>
                        {active && (
                          <p className="text-[10px] mt-0.5" style={{ color: textSubtle }}>
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="px-3 pb-5 shrink-0">
          <div className="h-px mb-3" style={{ background: borderColor }} />
          <button
            onClick={() => setDark(!dark)}
            className="w-full flex items-center gap-3 px-3 py-2 text-[12px] text-left transition-all"
            style={{ color: textMuted, borderRadius: "4px" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
          >
            {dark
              ? <Sun className="w-4 h-4 shrink-0" strokeWidth={1.5} style={{ color: textSubtle }} />
              : <Moon className="w-4 h-4 shrink-0" strokeWidth={1.5} style={{ color: textSubtle }} />
            }
            <span style={labelStyle}>{dark ? "Light" : "Dark"}</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 p-10">
        <p className="text-[11px] font-medium" style={{ color: textSubtle, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Editorial
        </p>
        <p className="text-[13px] mt-2" style={{ color: textMuted }}>
          Magazine table-of-contents. Serif section headers, numbered items with subtitles, vertical accent bar for active state.
        </p>
      </div>
    </div>
  );
}
