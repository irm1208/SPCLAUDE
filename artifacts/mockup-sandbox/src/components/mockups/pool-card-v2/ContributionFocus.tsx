function DonutArc({ pct, size = 120, stroke = 10, color = "#2D6BCC" }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (pct / 100) * circ;
  const cx = size / 2;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.8s ease" }} />
    </svg>
  );
}

export function ContributionFocus() {
  const pct = 8.3;
  const raised = 40;
  const goal = 480;
  const contributors = 1;
  const navy = "#1B3A7A";
  const accent = "#2D6BCC";

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "#F0EBE3", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ width: 380, background: "#fff", borderRadius: 20, boxShadow: "0 2px 24px rgba(27,58,122,0.12)", border: "1px solid #E2D9CE", overflow: "hidden" }}>

        {/* Top bar */}
        <div style={{ padding: "18px 22px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#22c55e", background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.22)", borderRadius: 99, padding: "2px 10px" }}>Collecting</span>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Uther</span>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: navy, letterSpacing: "-0.02em", marginTop: 6, lineHeight: 1.2 }}>Retatrutide</h3>
            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>RE40-0228 · 40 mg</p>
          </div>
        </div>

        {/* Donut + center text */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 0 8px" }}>
          <div style={{ position: "relative", width: 140, height: 140 }}>
            <DonutArc pct={pct} size={140} stroke={14} color={accent} />
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 26, fontWeight: 900, color: navy, lineHeight: 1 }}>{pct.toFixed(0)}%</span>
              <span style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>funded</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 32, marginTop: 16 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: navy }}>${raised}</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>raised</div>
            </div>
            <div style={{ width: 1, background: "#F1F5F9", alignSelf: "stretch" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: navy }}>${goal}</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>goal</div>
            </div>
            <div style={{ width: 1, background: "#F1F5F9", alignSelf: "stretch" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: navy }}>{contributors}</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>backer{contributors !== 1 ? "s" : ""}</div>
            </div>
          </div>
        </div>

        {/* Stage rail */}
        <div style={{ padding: "12px 24px", borderTop: "1px solid #F1F5F9" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {["Collecting", "Funded", "At Lab", "Results"].map((s, i, arr) => (
              <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: i === 0 ? "flex-start" : i === arr.length - 1 ? "flex-end" : "center" }}>
                <div style={{ width: "100%", display: "flex", alignItems: "center" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: i === 0 ? accent : "#E2E8F0", flexShrink: 0, border: i === 0 ? `2px solid ${accent}` : "2px solid #E2E8F0", boxShadow: i === 0 ? `0 0 0 3px rgba(45,107,204,0.18)` : "none" }} />
                  {i < arr.length - 1 && <div style={{ flex: 1, height: 2, background: "#F1F5F9" }} />}
                </div>
                <span style={{ fontSize: 9, fontWeight: i === 0 ? 700 : 400, color: i === 0 ? accent : "#94a3b8", marginTop: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: "0 20px 20px" }}>
          <button style={{ width: "100%", padding: "14px 0", background: navy, color: "#fff", fontWeight: 800, fontSize: 15, borderRadius: 12, border: "none", cursor: "pointer", letterSpacing: "0.01em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            Join This Pool
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
          <p style={{ textAlign: "center", fontSize: 10, color: "#94a3b8", marginTop: 8 }}>$440 still needed · Be one of the first to contribute</p>
        </div>
      </div>
    </div>
  );
}
