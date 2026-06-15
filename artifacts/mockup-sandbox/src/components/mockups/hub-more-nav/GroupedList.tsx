const S = {
  bg: "#0a1120",
  surface: "#111827",
  surface2: "#1e2d45",
  surface3: "#162035",
  border: "rgba(255,255,255,0.07)",
  text: "#e2e8f0",
  muted: "#94a3b8",
  subtle: "#475569",
  blue: "#3b82f6",
};

const groups = [
  {
    label: "Health & Tracking",
    color: "#10b981",
    items: [
      { id: "compounds", label: "Compounds",      icon: "💉", badge: "3 active" },
      { id: "health",    label: "Health Insights", icon: "❤️", badge: null },
      { id: "glp1",      label: "GLP-1 Tracker",  icon: "⚖️", badge: "12 entries" },
      { id: "plotter",   label: "Cycle Plotter",  icon: "📈", badge: null },
    ],
  },
  {
    label: "Community",
    color: "#8b5cf6",
    items: [
      { id: "telegram",   label: "Telegram",       icon: "✈️", badge: "Linked" },
      { id: "gborganiser",label: "GB Organiser",   icon: "🏪", badge: null },
    ],
  },
  {
    label: "Account",
    color: "#f59e0b",
    items: [
      { id: "profile", label: "Profile", icon: "👤", badge: null },
    ],
  },
];

export function GroupedList() {
  return (
    <div style={{ background: "rgba(0,0,0,0.5)", minHeight: "100vh", display: "flex", alignItems: "flex-end", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ width: "100%", borderRadius: "24px 24px 0 0", background: S.surface, border: `1px solid ${S.border}`, borderBottom: "none", paddingBottom: 20 }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 2 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: S.border }} />
        </div>

        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 18px 12px" }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: S.text }}>Profile Hub</p>
          <button style={{ width: 28, height: 28, borderRadius: "50%", background: S.surface2, border: `1px solid ${S.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: S.muted, cursor: "pointer" }}>✕</button>
        </div>

        {/* Groups */}
        <div style={{ padding: "0 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {groups.map(group => (
            <div key={group.label}>
              {/* Group header */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, padding: "0 4px" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: group.color, flexShrink: 0 }} />
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: S.subtle }}>{group.label}</span>
              </div>
              {/* Items card */}
              <div style={{ background: S.surface2, borderRadius: 14, border: `1px solid ${S.border}`, overflow: "hidden" }}>
                {group.items.map((item, idx) => (
                  <button
                    key={item.id}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 11,
                      padding: "11px 14px", background: "transparent", border: "none", cursor: "pointer",
                      borderBottom: idx < group.items.length - 1 ? `1px solid ${S.border}` : "none",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: S.text }}>{item.label}</span>
                    {item.badge && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: group.color, background: `${group.color}18`, padding: "2px 7px", borderRadius: 20 }}>{item.badge}</span>
                    )}
                    <span style={{ fontSize: 13, color: S.subtle }}>›</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
