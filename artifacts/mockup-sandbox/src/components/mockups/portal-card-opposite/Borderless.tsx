// OPPOSITE 1: ANTI-CARD / BORDERLESS
// P4 assumption inverted: the card is a contained rectangle with border + shadow.
// Here: no card at all. Information floats directly on the background.
// The amount is the dominant element — typographically massive, full bleed.
// The status is a floating tag. Items are an inline footnote.
// The action anchors the bottom as a pinned full-width bar.
// Reference: Apple Pay, Google Pay — presence without a box.

export function Borderless() {
  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", fontFamily: "system-ui,-apple-system,sans-serif", display: "flex", flexDirection: "column" }}>

      {/* Floating GB label */}
      <div style={{ padding: "28px 28px 0", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff" }}>GB</div>
        <div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0f172a" }}>BPC-157 Summer GB</p>
          <p style={{ margin: 0, fontSize: 10, color: "#64748b" }}>Active · 4 orders</p>
        </div>
      </div>

      {/* Full-bleed amount — the hero IS the number */}
      <div style={{ padding: "32px 28px 4px" }}>
        <p style={{ margin: "0 0 6px", fontSize: 11, color: "#94a3b8", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>GBP Order</p>
        <p style={{ margin: 0, fontSize: 72, fontWeight: 900, color: "#0f172a", letterSpacing: "-4px", lineHeight: 1 }}>£12.00</p>
      </div>

      {/* Floating status tag — not a banner, just a tag */}
      <div style={{ padding: "10px 28px 0" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#f59e0b" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>Submitted</span>
          <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 4 }}>· Pending</span>
        </div>
      </div>

      {/* Inline meta — no labels, no boxes */}
      <div style={{ padding: "16px 28px 0", display: "flex", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>#2845</span>
        <span style={{ fontSize: 11, color: "#cbd5e1" }}>·</span>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>18 Apr 2026</span>
        <span style={{ fontSize: 11, color: "#cbd5e1" }}>·</span>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>Royal Mail</span>
      </div>

      {/* Items — inline, not a section */}
      <div style={{ padding: "20px 28px 0" }}>
        <p style={{ margin: "0 0 6px", fontSize: 10, color: "#cbd5e1", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Items</p>
        <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "#475569" }}>2× BPC-157 5mg</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>£10.00</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "#475569" }}>Shipping</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>£2.00</span>
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Pinned full-width action — not a small button */}
      <div style={{ padding: "0 0 32px" }}>
        <div style={{ margin: "0 28px", height: "1px", background: "#e2e8f0", marginBottom: 20 }} />
        <div style={{ padding: "0 28px" }}>
          <button style={{
            width: "100%", fontSize: 14, fontWeight: 800, padding: "14px 0",
            borderRadius: 14, background: "#1e3a8a", color: "#fff",
            border: "none", cursor: "pointer", letterSpacing: "0.01em",
          }}>
            Manage order →
          </button>
        </div>
      </div>
    </div>
  );
}
