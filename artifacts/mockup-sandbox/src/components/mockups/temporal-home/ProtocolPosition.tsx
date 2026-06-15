// V1 — "WHERE ARE YOU IN YOUR CYCLE?"
// The hero is a visual cycle position indicator. You see week 6/12 of BPC-157 at a glance.
// Below: only items that are time-sensitive this week.

export function ProtocolPosition() {
  const S = {
    bg: "#080e1a",
    surface: "#0f1a2e",
    surface2: "#162035",
    border: "rgba(255,255,255,0.07)",
    text: "#e2e8f0",
    muted: "#94a3b8",
    subtle: "#475569",
    blue: "#3b82f6",
    emerald: "#34d399",
  };

  const compounds = [
    { name: "BPC-157", dose: "250mcg", week: 6, total: 12, color: "#34d399", colorBg: "rgba(52,211,153,0.1)" },
    { name: "TB-500",  dose: "5mg",    week: 3, total: 6,  color: "#818cf8", colorBg: "rgba(129,140,248,0.1)" },
  ];

  const upcoming = [
    { label: "GB deadline",       detail: "BPC-157 Summer GB closes",  when: "2 days",  color: "#f59e0b", urgent: true },
    { label: "Protocol ends",     detail: "TB-500 final dose",          when: "3 weeks", color: "#818cf8", urgent: false },
    { label: "Blood test due",    detail: "Last panel was 9 weeks ago", when: "Overdue", color: "#ef4444", urgent: true },
  ];

  return (
    <div style={{ background: S.bg, minHeight: "100vh", fontFamily: "system-ui,-apple-system,sans-serif", padding: "20px 16px 80px", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: S.subtle }}>Monday, 21 Apr</p>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: S.text, letterSpacing: "-0.5px" }}>
          Week 6 of your <span style={{ color: S.emerald }}>protocol</span>
        </h1>
      </div>

      {/* Active protocols */}
      <p style={{ margin: "0 0 10px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: S.subtle }}>Active Compounds</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {compounds.map(c => {
          const pct = Math.round((c.week / c.total) * 100);
          const weeksLeft = c.total - c.week;
          return (
            <div key={c.name} style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 16, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: S.text }}>{c.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: S.muted }}>{c.dose} · daily</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: c.color, letterSpacing: "-0.5px" }}>W{c.week}</p>
                  <p style={{ margin: 0, fontSize: 10, color: S.subtle }}>of {c.total}</p>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ height: 6, background: S.surface2, borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
                <div style={{ height: "100%", width: `${pct}%`, background: c.color, borderRadius: 3, transition: "width 0.6s ease" }} />
              </div>
              {/* Week pips */}
              <div style={{ display: "flex", gap: 3 }}>
                {Array.from({ length: c.total }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: i < c.week ? c.color : i === c.week ? c.color + "55" : S.surface2,
                    }}
                  />
                ))}
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 10, color: S.muted }}>
                {weeksLeft} week{weeksLeft !== 1 ? "s" : ""} remaining · {pct}% complete
              </p>
            </div>
          );
        })}
      </div>

      {/* Time-sensitive items */}
      <p style={{ margin: "0 0 10px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: S.subtle }}>Needs Attention</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {upcoming.map((u, i) => (
          <div
            key={i}
            style={{
              background: S.surface, border: `1px solid ${u.urgent ? u.color + "40" : S.border}`,
              borderRadius: 12, padding: "11px 14px",
              display: "flex", alignItems: "center", gap: 12,
            }}
          >
            <div style={{ width: 4, alignSelf: "stretch", borderRadius: 2, background: u.color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: S.text }}>{u.detail}</p>
              <p style={{ margin: 0, fontSize: 10, color: S.muted, marginTop: 1 }}>{u.label}</p>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, flexShrink: 0,
              background: `${u.color}18`, color: u.color,
            }}>{u.when}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
