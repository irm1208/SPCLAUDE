// V2 — "WHAT CHANGED SINCE YOU LAST OPENED THIS?"
// No static counts. Everything is relative to your last visit.
// The home screen is a delta — what is different right now vs. then.

export function DeltaHome() {
  const S = {
    bg: "#080e1a",
    surface: "#0f1a2e",
    surface2: "#162035",
    border: "rgba(255,255,255,0.07)",
    text: "#e2e8f0",
    muted: "#94a3b8",
    subtle: "#475569",
  };

  const deltas = [
    {
      category: "Orders",
      icon: "📦",
      color: "#3b82f6",
      items: [
        { label: "Order #2845 → Processing", sub: "BPC-157 Summer GB", when: "2h ago", type: "status" },
        { label: "Order #2801 → Shipped", sub: "Tracking: GBM0041209UK", when: "Yesterday", type: "status" },
      ],
    },
    {
      category: "Body",
      icon: "⚖️",
      color: "#34d399",
      items: [
        { label: "−0.3 kg from yesterday", sub: "87.2 kg · trend: ↓ 1.4 kg this week", when: "6h ago", type: "weight" },
      ],
    },
    {
      category: "Group Buys",
      icon: "👥",
      color: "#f59e0b",
      items: [
        { label: "New GB announced: HGH Spring", sub: "Opens in 3 days · 12 spots left", when: "4h ago", type: "new" },
        { label: "TB-500 GB closes tomorrow", sub: "You're in · £28.50 due", when: "", type: "deadline" },
      ],
    },
  ];

  return (
    <div style={{ background: S.bg, minHeight: "100vh", fontFamily: "system-ui,-apple-system,sans-serif", padding: "20px 16px 80px", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} />
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#34d399" }}>Last opened 3 days ago</p>
        </div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: S.text, letterSpacing: "-0.5px", lineHeight: 1.1 }}>
          Here's what<br />changed
        </h1>
      </div>

      {/* Delta groups */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {deltas.map(group => (
          <div key={group.category}>
            {/* Group header */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>{group.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: group.color }}>{group.category}</span>
            </div>
            {/* Items */}
            <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, overflow: "hidden" }}>
              {group.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "12px 14px",
                    borderBottom: idx < group.items.length - 1 ? `1px solid ${S.border}` : "none",
                    display: "flex", alignItems: "flex-start", gap: 10,
                  }}
                >
                  <div style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: group.color, flexShrink: 0, marginTop: 3 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: S.text }}>{item.label}</p>
                    <p style={{ margin: 0, fontSize: 11, color: S.muted, marginTop: 2 }}>{item.sub}</p>
                  </div>
                  {item.when && <span style={{ fontSize: 10, color: S.subtle, flexShrink: 0, marginTop: 2 }}>{item.when}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quiet footer: what didn't change */}
      <div
        style={{
          marginTop: 20, borderRadius: 12, padding: "10px 14px",
          background: S.surface2, border: `1px solid ${S.border}`,
          display: "flex", alignItems: "center", gap: 8,
        }}
      >
        <span style={{ fontSize: 14 }}>✓</span>
        <p style={{ margin: 0, fontSize: 11, color: S.subtle }}>3 compounds running as expected · No lab alerts</p>
      </div>
    </div>
  );
}
