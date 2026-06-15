// V3 — "WHAT DO YOU DO TODAY?"
// The home screen is a personal health agenda for today only.
// It derives actions from your data: compound schedule → next injection,
// GLP-1 log → did you log today, GB status → payment due.
// Navigation is gone from the hero — the hero IS the agenda.

export function TodayAgenda() {
  const S = {
    bg: "#080e1a",
    surface: "#0f1a2e",
    surface2: "#162035",
    border: "rgba(255,255,255,0.07)",
    text: "#e2e8f0",
    muted: "#94a3b8",
    subtle: "#475569",
  };

  const today = [
    {
      id: "injection",
      done: true,
      priority: "normal",
      color: "#34d399",
      icon: "💉",
      title: "BPC-157 injection",
      detail: "250mcg · dose 42/84",
      action: "Mark done",
    },
    {
      id: "weight",
      done: false,
      priority: "normal",
      color: "#0891b2",
      icon: "⚖️",
      title: "Log today's weight",
      detail: "Last: 87.2 kg yesterday",
      action: "Log now",
    },
    {
      id: "payment",
      done: false,
      priority: "high",
      color: "#f59e0b",
      icon: "💳",
      title: "Upload payment proof",
      detail: "Order #2845 · £12.00 pending",
      action: "Upload",
    },
    {
      id: "gbdeadline",
      done: false,
      priority: "high",
      color: "#ef4444",
      icon: "⏰",
      title: "TB-500 GB closes today",
      detail: "8 spots left · £28.50",
      action: "View GB",
    },
  ];

  const done = today.filter(t => t.done).length;
  const pct = Math.round((done / today.length) * 100);

  return (
    <div style={{ background: S.bg, minHeight: "100vh", fontFamily: "system-ui,-apple-system,sans-serif", padding: "20px 16px 80px", overflowY: "auto" }}>
      {/* Date + progress header */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: S.subtle }}>Today · Mon 21 Apr</p>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: S.text, letterSpacing: "-0.5px" }}>
            {done}/{today.length} done
          </h1>
          <span style={{ fontSize: 13, fontWeight: 700, color: pct === 100 ? "#34d399" : S.muted, marginBottom: 2 }}>{pct}%</span>
        </div>
        {/* Day progress bar */}
        <div style={{ height: 4, background: S.surface2, borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "#34d399", borderRadius: 2, transition: "width 0.5s ease" }} />
        </div>
      </div>

      {/* Agenda items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Urgent first */}
        {[...today].sort((a, b) => (a.priority === "high" ? -1 : 1) - (b.priority === "high" ? -1 : 1) || (a.done ? 1 : -1)).map((item) => (
          <div
            key={item.id}
            style={{
              background: item.done ? S.surface2 : S.surface,
              border: `1px solid ${item.done ? S.border : item.priority === "high" ? item.color + "44" : S.border}`,
              borderRadius: 14, padding: "12px 14px",
              display: "flex", alignItems: "center", gap: 12,
              opacity: item.done ? 0.55 : 1,
            }}
          >
            {/* Checkbox / done */}
            <div
              style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                background: item.done ? "#34d399" : "transparent",
                border: `2px solid ${item.done ? "#34d399" : item.priority === "high" ? item.color : S.subtle}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, color: "#fff",
              }}
            >{item.done ? "✓" : ""}</div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: S.text, textDecoration: item.done ? "line-through" : "none" }}>{item.title}</p>
              <p style={{ margin: 0, fontSize: 11, color: S.muted, marginTop: 1 }}>{item.detail}</p>
            </div>

            {/* Action button */}
            {!item.done && (
              <button
                style={{
                  flexShrink: 0, fontSize: 11, fontWeight: 700,
                  padding: "5px 12px", borderRadius: 8,
                  background: item.priority === "high" ? item.color : S.surface2,
                  color: item.priority === "high" ? "#fff" : S.muted,
                  border: `1px solid ${item.priority === "high" ? "transparent" : S.border}`,
                  cursor: "pointer",
                }}
              >{item.action}</button>
            )}
          </div>
        ))}
      </div>

      {/* Tomorrow preview */}
      <div style={{ marginTop: 20 }}>
        <p style={{ margin: "0 0 8px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: S.subtle }}>Tomorrow</p>
        <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14 }}>💉</span>
          <span style={{ fontSize: 12, color: S.muted }}>TB-500 injection · 5mg · dose 22/42</span>
        </div>
      </div>
    </div>
  );
}
