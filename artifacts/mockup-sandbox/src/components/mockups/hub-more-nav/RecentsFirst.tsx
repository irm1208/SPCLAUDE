const S = {
  surface: "#111827",
  surface2: "#1e2d45",
  border: "rgba(255,255,255,0.07)",
  text: "#e2e8f0",
  muted: "#94a3b8",
  subtle: "#475569",
  blue: "#3b82f6",
};

const recents = [
  { id: "compounds", label: "Compounds",      icon: "💉", color: "#10b981", colorBg: "rgba(16,185,129,0.1)", desc: "3 active compounds", last: "2h ago" },
  { id: "glp1",      label: "GLP-1 Tracker",  icon: "⚖️", color: "#0891b2", colorBg: "rgba(8,145,178,0.1)",  desc: "87.2 kg last entry",  last: "Yesterday" },
];

const allItems = [
  { id: "health",      label: "Health Insights", icon: "❤️" },
  { id: "plotter",     label: "Cycle Plotter",   icon: "📈" },
  { id: "profile",     label: "Profile",         icon: "👤" },
  { id: "telegram",    label: "Telegram",        icon: "✈️" },
  { id: "gborganiser", label: "GB Organiser",    icon: "🏪" },
];

export function RecentsFirst() {
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

        {/* Quick Access — large tiles for recently used */}
        <div style={{ padding: "0 14px 14px" }}>
          <p style={{ margin: "0 0 8px 2px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: S.subtle }}>Quick Access</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {recents.map(r => (
              <button
                key={r.id}
                style={{
                  padding: "13px 14px", borderRadius: 14, background: S.surface2,
                  border: `1px solid ${r.color}33`, cursor: "pointer", textAlign: "left",
                  display: "flex", flexDirection: "column", gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: r.colorBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                    {r.icon}
                  </div>
                  <span style={{ fontSize: 9, color: S.subtle, fontWeight: 500 }}>{r.last}</span>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: S.text }}>{r.label}</p>
                  <p style={{ margin: 0, fontSize: 10, color: S.subtle, marginTop: 1 }}>{r.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Divider with label */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 18px 10px" }}>
          <div style={{ flex: 1, height: 1, background: S.border }} />
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: S.subtle }}>All Sections</span>
          <div style={{ flex: 1, height: 1, background: S.border }} />
        </div>

        {/* Full list — compact */}
        <div style={{ padding: "0 8px" }}>
          {allItems.map((item, idx) => (
            <button
              key={item.id}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "9px 10px", borderRadius: 10, background: "transparent",
                border: "none", cursor: "pointer",
                borderBottom: idx < allItems.length - 1 ? `1px solid ${S.border}` : "none",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0, width: 24, textAlign: "center" }}>{item.icon}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: S.text }}>{item.label}</span>
              <span style={{ fontSize: 13, color: S.subtle }}>›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
