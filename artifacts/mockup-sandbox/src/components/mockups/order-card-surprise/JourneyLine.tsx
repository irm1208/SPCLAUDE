// V2 — THE ORDER AS A JOURNEY, NOT A STATUS
// A vertical timeline shows every step of the order's life,
// with timestamps on completed steps and a pulsing dot on the current one.
// The card is a shipment tracker, not a data record.

const S = {
  bg: "#0a1120", surface: "#0f1a2e", surface2: "#162035",
  border: "rgba(255,255,255,0.07)", text: "#e2e8f0",
  muted: "#94a3b8", subtle: "#475569",
};

const steps = [
  { label: "Order placed",          sub: "18 Apr · 10:42",  done: true,  current: false },
  { label: "Payment proof uploaded", sub: "18 Apr · 11:15",  done: true,  current: false },
  { label: "Payment confirmed",      sub: "18 Apr · 14:30",  done: true,  current: false },
  { label: "Preparing package",      sub: "In progress",     done: false, current: true  },
  { label: "Dispatched",             sub: "Est. 24 Apr",     done: false, current: false },
  { label: "Delivered",              sub: "",                done: false, current: false },
];

export function JourneyLine() {
  return (
    <div style={{ background: S.bg, minHeight: "100vh", padding: "20px 16px 40px", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 18, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "14px 18px 12px", background: "linear-gradient(135deg, #0f172a 0%, #1a2642 100%)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>BPC-157 Summer GB</p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>£12.00</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.08)", padding: "2px 8px", borderRadius: 6 }}>#2845</span>
            <p style={{ margin: "4px 0 0", fontSize: 11, fontWeight: 700, color: "#34d399" }}>Paid ✓</p>
          </div>
        </div>

        {/* Timeline */}
        <div style={{ padding: "16px 18px" }}>
          <p style={{ margin: "0 0 14px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: S.subtle }}>Order Journey</p>
          <div style={{ position: "relative", paddingLeft: 28 }}>
            {/* Vertical line */}
            <div style={{ position: "absolute", left: 8, top: 10, bottom: 10, width: 2, background: S.surface2, borderRadius: 1 }} />
            {/* Completed fill */}
            <div style={{ position: "absolute", left: 8, top: 10, width: 2, height: `${(3 / 5) * 100}%`, background: "#34d399", borderRadius: 1 }} />

            {steps.map((step, i) => (
              <div key={i} style={{ position: "relative", marginBottom: i < steps.length - 1 ? 16 : 0, display: "flex", alignItems: "flex-start", gap: 10 }}>
                {/* Dot */}
                <div style={{
                  position: "absolute", left: -24, top: 1,
                  width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                  background: step.done ? "#34d399" : step.current ? "#0f1a2e" : S.surface2,
                  border: `2px solid ${step.done ? "#34d399" : step.current ? "#34d399" : S.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 8, color: "#fff",
                  boxShadow: step.current ? "0 0 0 4px rgba(52,211,153,0.15)" : "none",
                }}>
                  {step.done ? "✓" : ""}
                </div>
                {/* Text */}
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: step.current ? 800 : step.done ? 600 : 500, color: step.done || step.current ? S.text : S.subtle }}>
                    {step.label}
                    {step.current && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: "#34d399", background: "rgba(52,211,153,0.12)", padding: "1px 6px", borderRadius: 10 }}>NOW</span>}
                  </p>
                  {step.sub && <p style={{ margin: "1px 0 0", fontSize: 10, color: step.done ? S.muted : step.current ? "#34d399" : S.subtle }}>{step.sub}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Compact items footer */}
        <div style={{ padding: "10px 18px 14px", borderTop: `1px solid ${S.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: S.subtle }}>Items</span>
            <span style={{ fontSize: 11, color: S.muted, background: S.surface2, padding: "2px 8px", borderRadius: 20 }}>2× BPC-157 5mg</span>
            <span style={{ fontSize: 11, color: S.muted, background: S.surface2, padding: "2px 8px", borderRadius: 20 }}>Shipping</span>
          </div>
        </div>
      </div>
    </div>
  );
}
