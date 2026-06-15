import { useState } from "react";

const S = {
  surface: "#111827",
  surface2: "#1e2d45",
  border: "rgba(255,255,255,0.07)",
  text: "#e2e8f0",
  muted: "#94a3b8",
  subtle: "#475569",
};

const sections = [
  { id: "compounds", label: "Compounds",      icon: "💉", color: "#10b981", bg: "rgba(16,185,129,0.1)",  stat: "3", statLabel: "active",     desc: "Track everything you're running" },
  { id: "health",    label: "Health Insights", icon: "❤️", color: "#ef4444", bg: "rgba(239,68,68,0.1)",   stat: "6", statLabel: "biomarkers", desc: "Latest blood work analysis" },
  { id: "glp1",      label: "GLP-1 Tracker",  icon: "⚖️", color: "#0891b2", bg: "rgba(8,145,178,0.1)",   stat: "12", statLabel: "entries",   desc: "Weight & dosing history" },
  { id: "plotter",   label: "Cycle Plotter",  icon: "📈", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)",  stat: "—",  statLabel: "last plan",  desc: "Visualise compound timing" },
  { id: "profile",   label: "Profile",        icon: "👤", color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  stat: "✓",  statLabel: "complete",   desc: "Edit your details & address" },
  { id: "telegram",  label: "Telegram",       icon: "✈️", color: "#6366f1", bg: "rgba(99,102,241,0.1)",  stat: "On", statLabel: "alerts",     desc: "Linked @handle, notifications on" },
  { id: "organiser", label: "GB Organiser",   icon: "🏪", color: "#f97316", bg: "rgba(249,115,22,0.1)",  stat: "2",  statLabel: "active GBs", desc: "Manage your group buys" },
];

export function CardSwitcher() {
  const [active, setActive] = useState(0);
  const current = sections[active];

  return (
    <div style={{ background: "rgba(0,0,0,0.5)", minHeight: "100vh", display: "flex", alignItems: "flex-end", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ width: "100%", borderRadius: "24px 24px 0 0", background: S.surface, border: `1px solid ${S.border}`, borderBottom: "none", paddingBottom: 20 }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 2 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: S.border }} />
        </div>

        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 18px 14px" }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: S.text }}>Profile Hub</p>
          <button style={{ width: 28, height: 28, borderRadius: "50%", background: S.surface2, border: `1px solid ${S.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: S.muted, cursor: "pointer" }}>✕</button>
        </div>

        {/* Horizontal scrollable tab strip */}
        <div style={{ overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
          <div style={{ display: "flex", gap: 8, padding: "0 14px 0" }}>
            {sections.map((s, idx) => {
              const isActive = idx === active;
              return (
                <button
                  key={s.id}
                  onClick={() => setActive(idx)}
                  style={{
                    flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    padding: "8px 14px 10px", borderRadius: 14,
                    background: isActive ? s.bg : S.surface2,
                    border: `1px solid ${isActive ? s.color + "55" : S.border}`,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: 20 }}>{s.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? s.color : S.muted, whiteSpace: "nowrap" }}>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active card — big preview */}
        <div style={{ padding: "12px 14px 0" }}>
          <div
            style={{
              borderRadius: 18, padding: "18px 20px",
              background: current.bg,
              border: `1px solid ${current.color}44`,
              display: "flex", flexDirection: "column", gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 28 }}>{current.icon}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: S.text, letterSpacing: "-0.3px" }}>{current.label}</p>
                    <p style={{ margin: 0, fontSize: 12, color: S.muted }}>{current.desc}</p>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: current.color, letterSpacing: "-1px" }}>{current.stat}</p>
                <p style={{ margin: 0, fontSize: 10, color: S.muted }}>{current.statLabel}</p>
              </div>
            </div>
            <button
              style={{
                width: "100%", height: 42, borderRadius: 12,
                background: current.color, color: "#fff",
                border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              Open {current.label} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
