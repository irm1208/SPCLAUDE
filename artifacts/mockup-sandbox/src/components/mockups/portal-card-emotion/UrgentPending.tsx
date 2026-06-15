// REGISTER: URGENCY
// When payment is pending the card earns the right to demand attention.
// Amber takes over. "ACTION REQUIRED" is not a badge — it's the headline.
// The upload CTA is the dominant element, not an afterthought button.
// Everything else is subordinate to that single ask.

export function UrgentPending() {
  return (
    <div style={{ background: "#fafaf9", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 560 }}>

        {/* GB breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff" }}>GB</div>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0f172a" }}>BPC-157 Summer GB</p>
            <p style={{ margin: 0, fontSize: 10, color: "#94a3b8" }}>Active · 4 orders</p>
          </div>
        </div>

        <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(180,83,9,0.15), 0 1px 6px rgba(0,0,0,0.06)", border: "1.5px solid #fcd34d" }}>

          {/* Urgent header — amber, not blue */}
          <div style={{ background: "linear-gradient(135deg, #92400e 0%, #b45309 100%)", padding: "14px 20px 12px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 20, padding: "3px 10px", marginBottom: 6 }}>
                <span style={{ fontSize: 10 }}>⚠️</span>
                <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#fef3c7" }}>Action required</span>
              </div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#fff" }}>Upload payment proof</p>
              <p style={{ margin: "3px 0 0", fontSize: 11, color: "rgba(255,255,255,0.65)" }}>Order #2845 · 18 Apr 2026</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>£12.00</p>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#fde68a" }}>Pending</span>
            </div>
          </div>

          {/* Primary CTA — the upload zone */}
          <div style={{ background: "#fffbeb", padding: "16px 20px", borderBottom: "1.5px dashed #fcd34d" }}>
            <div style={{
              border: "2px dashed #f59e0b", borderRadius: 12, padding: "18px 16px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer",
              background: "#fff",
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📎</div>
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#92400e" }}>Tap to attach screenshot</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#b45309" }}>Bank transfer, PayPal, or crypto receipt</p>
              </div>
              <button style={{ background: "#b45309", color: "#fff", border: "none", borderRadius: 10, padding: "8px 24px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Upload now
              </button>
            </div>
          </div>

          {/* Items — subordinate, compact */}
          <div style={{ background: "#fff", padding: "12px 20px" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: "#64748b", background: "#f1f5f9", padding: "3px 10px", borderRadius: 20 }}>2× BPC-157 5mg · £10.00</span>
              <span style={{ fontSize: 11, color: "#64748b", background: "#f1f5f9", padding: "3px 10px", borderRadius: 20 }}>Shipping · £2.00</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Royal Mail · GBP Order</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#b45309" }}>Total £12.00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
