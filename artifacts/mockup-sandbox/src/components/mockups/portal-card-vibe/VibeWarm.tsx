// VIBE: BOTANICAL WARMTH
// Same structure as P4 StatusFirst. Aesthetic shifted to high-end apothecary —
// warm parchment, forest green, earth tones. No cold blues.
// Feels like a boutique wellness brand printed on good paper.

export function VibeWarm() {
  const order = {
    gbName: "BPC-157 Summer GB", type: "GBP Order", status: "Submitted",
    amount: 12.00, currency: "£", code: "2845", date: "18 Apr 2026",
    paymentStatus: "Pending", deliveryMethod: "Royal Mail",
    items: [{ name: "BPC-157 5mg", qty: 2, price: 10.00 }, { name: "Shipping", qty: 1, price: 2.00 }],
  };

  return (
    <div style={{ background: "#f5f0e8", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <div style={{ width: "100%", maxWidth: 560 }}>

        {/* GB breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#3d5a3e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#e8f5e9", letterSpacing: "0.05em" }}>GB</div>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#2d3a2e", fontFamily: "system-ui,-apple-system,sans-serif" }}>{order.gbName}</p>
            <p style={{ margin: 0, fontSize: 10, color: "#7a8c7b", fontFamily: "system-ui,-apple-system,sans-serif" }}>Active · 4 orders</p>
          </div>
        </div>

        <div style={{ background: "#fefcf7", borderRadius: 16, border: "1px solid #e0d9cc", boxShadow: "0 2px 12px rgba(61,90,62,0.08)", overflow: "hidden" }}>

          {/* Status hero — forest green */}
          <div style={{ background: "linear-gradient(135deg, #2d4a2f 0%, #3d6b40 100%)", padding: "18px 22px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <p style={{ margin: "0 0 6px", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, color: "rgba(220,237,213,0.65)", fontFamily: "system-ui,-apple-system,sans-serif" }}>{order.type}</p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px 5px 10px", borderRadius: 30, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
                <span style={{ fontSize: 14 }}>⏱</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#dcefd5", letterSpacing: "0.01em", fontFamily: "system-ui,-apple-system,sans-serif" }}>{order.status}</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#f0faea", letterSpacing: "-1px", fontFamily: "system-ui,-apple-system,sans-serif" }}>{order.currency}{order.amount.toFixed(2)}</p>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#f6d997", fontFamily: "system-ui,-apple-system,sans-serif" }}>{order.paymentStatus}</span>
            </div>
          </div>

          {/* Meta row */}
          <div style={{ padding: "10px 22px", borderBottom: "1px solid #ede8de", display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 10, color: "#9eaa9f", fontWeight: 600, fontFamily: "system-ui,-apple-system,sans-serif" }}>ORDER</span>
              <span style={{ fontFamily: "'Courier New',Courier,monospace", fontSize: 11, fontWeight: 700, color: "#5c7060" }}>#{order.code}</span>
            </div>
            <span style={{ color: "#d5cfc2" }}>·</span>
            <span style={{ fontSize: 11, color: "#7a8c7b", fontFamily: "system-ui,-apple-system,sans-serif" }}>{order.date}</span>
            <span style={{ color: "#d5cfc2" }}>·</span>
            <span style={{ fontSize: 11, color: "#7a8c7b", fontFamily: "system-ui,-apple-system,sans-serif" }}>📦 {order.deliveryMethod}</span>
          </div>

          {/* Items */}
          <div style={{ padding: "12px 22px", borderBottom: "1px solid #ede8de" }}>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#9eaa9f", margin: "0 0 8px", fontFamily: "system-ui,-apple-system,sans-serif" }}>Items</p>
            {order.items.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < order.items.length - 1 ? "1px solid #f5f0e8" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#3d5a3e", background: "#e8f0e9", padding: "1px 7px", borderRadius: 4, fontFamily: "system-ui,-apple-system,sans-serif" }}>{item.qty}×</span>
                  <span style={{ fontSize: 12, color: "#4a5c4b", fontFamily: "system-ui,-apple-system,sans-serif" }}>{item.name}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#2d3a2e", fontFamily: "system-ui,-apple-system,sans-serif", fontVariantNumeric: "tabular-nums" }}>{order.currency}{item.price.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Action */}
          <div style={{ padding: "12px 22px", display: "flex", justifyContent: "flex-end" }}>
            <button style={{ fontSize: 12, fontWeight: 700, padding: "9px 22px", borderRadius: 10, background: "#3d5a3e", color: "#f0faea", border: "none", cursor: "pointer", fontFamily: "system-ui,-apple-system,sans-serif" }}>
              Manage →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
