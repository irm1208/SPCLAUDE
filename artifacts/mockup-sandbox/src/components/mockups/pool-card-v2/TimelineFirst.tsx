export function TimelineFirst() {
  const stages = [
    { key: "open", label: "Collecting", done: true, active: true },
    { key: "funded", label: "Funded", done: false, active: false },
    { key: "at_lab", label: "At Lab", done: false, active: false },
    { key: "results", label: "Results", done: false, active: false },
  ];
  const pct = 8.3;
  const accent = "#2D6BCC";
  const navy = "#1B3A7A";

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "#F0EBE3", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ width: 400, background: "#fff", borderRadius: 16, boxShadow: "0 2px 20px rgba(27,58,122,0.10)", overflow: "hidden", border: "1px solid #E2D9CE" }}>

        {/* Stage pipeline — the hero */}
        <div style={{ background: "#1B3A7A", padding: "20px 24px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.55)", textTransform: "uppercase" }}>Progress</span>
            <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.65)" }}>8.3% of $480</span>
          </div>

          {/* Track */}
          <div style={{ position: "relative", paddingBottom: 28 }}>
            <div style={{ height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 4, marginBottom: 0 }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "#60A5FA", borderRadius: 4, transition: "width 0.6s" }} />
            </div>
            {/* Stage dots */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: -2 }}>
              {stages.map((s) => (
                <div key={s.key} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: "50%",
                    background: s.done ? "#60A5FA" : "rgba(255,255,255,0.25)",
                    border: s.active ? "2px solid #93C5FD" : "2px solid transparent",
                    boxShadow: s.active ? "0 0 0 3px rgba(96,165,250,0.3)" : "none",
                    marginTop: -4
                  }} />
                  <span style={{ fontSize: 9, fontWeight: s.active ? 700 : 500, color: s.active ? "#93C5FD" : "rgba(255,255,255,0.45)", marginTop: 6, letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px 24px" }}>
          {/* Status + count row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#22c55e", background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.22)", borderRadius: 99, padding: "2px 10px" }}>Collecting</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/></svg>
              1 contributor
            </span>
          </div>

          {/* Title */}
          <h3 style={{ fontSize: 20, fontWeight: 800, color: "#1B3A7A", letterSpacing: "-0.02em", marginBottom: 4, lineHeight: 1.2 }}>RE40-0228 – Uther</h3>
          <p style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>Retatrutide · 40 mg</p>

          {/* Chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
            {["# RE40-0228", "💊 Retatrutide", "40 mg"].map(c => (
              <span key={c} style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "#F1F5F9", color: "#475569", border: "1px solid #E2E8F0" }}>{c}</span>
            ))}
          </div>

          {/* Funding row */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#1B3A7A" }}>$40 <span style={{ fontSize: 13, fontWeight: 400, color: "#94a3b8" }}>raised</span></span>
            <span style={{ fontSize: 12, color: "#64748B" }}>goal: <strong style={{ color: "#1B3A7A" }}>$480</strong></span>
          </div>

          {/* CTA */}
          <button style={{ width: "100%", padding: "12px 0", background: navy, color: "#fff", fontWeight: 700, fontSize: 14, borderRadius: 10, border: "none", cursor: "pointer", letterSpacing: "0.01em", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            View Pool
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
