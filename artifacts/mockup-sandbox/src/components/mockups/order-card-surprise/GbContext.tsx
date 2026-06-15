// V3 — YOUR ORDER IN CONTEXT OF THE GROUP BUY
// Instead of showing the order in isolation, it surfaces the GB it belongs to.
// How many others are in the batch, how close to minimum, estimated dispatch.
// Makes you feel part of something collective rather than just a transaction.

const S = {
  bg: "#0a1120", surface: "#0f1a2e", surface2: "#162035",
  border: "rgba(255,255,255,0.07)", text: "#e2e8f0",
  muted: "#94a3b8", subtle: "#475569",
};

const gbStats = { total: 31, target: 25, you: 2, currency: "£" };
const pct = Math.min(100, Math.round((gbStats.total / gbStats.target) * 100));

export function GbContext() {
  return (
    <div style={{ background: S.bg, minHeight: "100vh", padding: "20px 16px 40px", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 18, overflow: "hidden" }}>

        {/* GB banner — the collective */}
        <div style={{ padding: "14px 16px 12px", background: "linear-gradient(135deg, #0f172a 0%, #1e1040 100%)", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👥</div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#fff" }}>BPC-157 Summer GB</p>
              <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.45)" }}>31 members · closes 28 Apr</p>
            </div>
          </div>

          {/* Fill bar */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>Group progress</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa" }}>{gbStats.total}/{gbStats.target} minimum</span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #7c3aed, #a78bfa)", borderRadius: 3 }} />
            </div>
          </div>

          {/* Member dots */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ display: "flex" }}>
              {Array.from({ length: Math.min(8, gbStats.total) }).map((_, i) => (
                <div key={i} style={{ width: 20, height: 20, borderRadius: "50%", background: `hsl(${220 + i * 25},60%,55%)`, border: "2px solid #0f172a", marginLeft: i > 0 ? -6 : 0, fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginLeft: 4 }}>+{gbStats.total - 8} more</span>
            <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: "#34d399", background: "rgba(52,211,153,0.12)", padding: "2px 8px", borderRadius: 20 }}>✓ Min reached</span>
          </div>
        </div>

        {/* Your order */}
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: S.text }}>Your order</p>
              <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: S.muted, background: S.surface2, padding: "1px 7px", borderRadius: 6, border: `1px solid ${S.border}` }}>#2845</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: S.text }}>£12.00</p>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#34d399" }}>Paid ✓</span>
            </div>
          </div>

          {/* Status pill */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 10, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <span style={{ fontSize: 12 }}>⚙️</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#60a5fa" }}>Processing</span>
            <span style={{ fontSize: 10, color: S.subtle }}>· Est. dispatch 24 Apr</span>
          </div>
        </div>

        {/* Your items */}
        <div style={{ padding: "10px 16px 14px" }}>
          <p style={{ margin: "0 0 8px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#34d399" }}>Your items</p>
          {[{ qty: 2, name: "BPC-157 5mg", total: "£10.00" }, { qty: 1, name: "Shipping", total: "£2.00" }].map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i === 0 ? `1px solid ${S.border}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#34d399", background: "rgba(52,211,153,0.12)", padding: "1px 6px", borderRadius: 4 }}>{item.qty}×</span>
                <span style={{ fontSize: 12, color: S.muted }}>{item.name}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: S.text }}>{item.total}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: `1px solid ${S.border}` }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: S.text }}>Total</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#34d399" }}>£12.00</span>
          </div>
        </div>
      </div>
    </div>
  );
}
