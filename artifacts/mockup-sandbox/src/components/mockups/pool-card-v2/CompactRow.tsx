export function CompactRow() {
  const pools = [
    { title: "RE40-0228 – Uther", compound: "Retatrutide", batch: "RE40-0228", mg: "40 mg", status: "Collecting", statusColor: "#22c55e", statusBg: "rgba(34,197,94,0.10)", statusBorder: "rgba(34,197,94,0.22)", raised: 40, goal: 480, contributors: 1, pct: 8.3, accent: "#2D6BCC" },
    { title: "T60 – ZE60-0322 – Uther", compound: "Tirzepatide", batch: "ZE60-0322", mg: null, status: "Collecting", statusColor: "#22c55e", statusBg: "rgba(34,197,94,0.10)", statusBorder: "rgba(34,197,94,0.22)", raised: 0, goal: 480, contributors: 0, pct: 0, accent: "#6D28D9" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "#F0EBE3", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ width: 520 }}>
        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1B3A7A", letterSpacing: "-0.02em" }}>Community Testing Pools</h2>
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>2 active pools · Filter by compound or vendor</p>
        </div>

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pools.map((p) => (
            <div key={p.batch} style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2D9CE", boxShadow: "0 1px 8px rgba(27,58,122,0.06)", overflow: "hidden", cursor: "pointer" }}>
              {/* Top accent line */}
              <div style={{ height: 3, background: p.accent, opacity: 0.7 }} />

              <div style={{ padding: "14px 18px" }}>
                {/* Row 1: title + status + badge */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1B3A7A", letterSpacing: "-0.01em", margin: 0 }}>{p.title}</h3>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: p.statusColor, background: p.statusBg, border: `1px solid ${p.statusBorder}`, borderRadius: 99, padding: "1px 7px" }}>{p.status}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>#{p.batch}</span>
                      <span style={{ fontSize: 10, color: "#64748B", fontWeight: 600 }}>· {p.compound}</span>
                      {p.mg && <span style={{ fontSize: 10, color: "#64748B" }}>· {p.mg}</span>}
                    </div>
                  </div>

                  {/* Right: raised + arrow */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#1B3A7A" }}>${p.raised}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>of ${p.goal}</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 4, background: "#F1F5F9", borderRadius: 4, marginBottom: 8 }}>
                  <div style={{ height: "100%", width: `${Math.max(p.pct, p.raised > 0 ? 2 : 0)}%`, background: p.accent, borderRadius: 4 }} />
                </div>

                {/* Row 2: contributors + pct + CTA */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
                    {p.contributors} contributor{p.contributors !== 1 ? "s" : ""}
                  </span>
                  <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, color: p.accent }}>{p.pct.toFixed(1)}%</span>
                  <div style={{ flex: 1 }} />
                  <button style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: "#1B3A7A", borderRadius: 8, border: "none", padding: "6px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                    View Pool
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stage legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14, justifyContent: "center" }}>
          {["Collecting", "Funded", "At Lab", "Results"].map((s, i) => (
            <span key={s} style={{ fontSize: 10, color: i === 0 ? "#1B3A7A" : "#94a3b8", fontWeight: i === 0 ? 700 : 400, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: i === 0 ? "#2D6BCC" : "#CBD5E1", display: "inline-block" }} />
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
