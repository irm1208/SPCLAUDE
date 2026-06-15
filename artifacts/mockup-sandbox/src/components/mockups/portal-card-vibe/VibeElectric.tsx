// VIBE: ELECTRIC FINTECH
// Same structure. Deep violet hero replaces navy. Neon lime qty badges.
// Amount typography is dramatically oversized. Background has a faint violet wash.
// Feels like a premium crypto or neobank app — sharp, confident, kinetic.

export function VibeElectric() {
  const order = {
    gbName: "BPC-157 Summer GB", type: "GBP Order", status: "Submitted",
    amount: 12.00, currency: "£", code: "2845", date: "18 Apr 2026",
    paymentStatus: "Pending", deliveryMethod: "Royal Mail",
    items: [{ name: "BPC-157 5mg", qty: 2, price: 10.00 }, { name: "Shipping", qty: 1, price: 2.00 }],
  };

  return (
    <div style={{ background: "#f3f0ff", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 560 }}>

        {/* GB breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #6d28d9, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff", letterSpacing: "0.05em" }}>GB</div>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#1e1040" }}>{order.gbName}</p>
            <p style={{ margin: 0, fontSize: 10, color: "#7c6f9e" }}>Active · 4 orders</p>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #ddd6fe", boxShadow: "0 4px 24px rgba(109,40,217,0.12), 0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>

          {/* Status hero — deep violet */}
          <div style={{ background: "linear-gradient(135deg, #3b0764 0%, #6d28d9 60%, #7c3aed 100%)", padding: "18px 22px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <p style={{ margin: "0 0 6px", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, color: "rgba(196,181,253,0.65)" }}>{order.type}</p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px 5px 10px", borderRadius: 30, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(196,181,253,0.35)" }}>
                <span style={{ fontSize: 14 }}>⏱</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#ede9fe", letterSpacing: "-0.2px" }}>{order.status}</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 30, fontWeight: 900, color: "#fff", letterSpacing: "-2px", lineHeight: 1.1 }}>{order.currency}{order.amount.toFixed(2)}</p>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#a3e635" }}>{order.paymentStatus}</span>
            </div>
          </div>

          {/* Meta row */}
          <div style={{ padding: "10px 22px", borderBottom: "1px solid #f3f0ff", display: "flex", gap: 16, alignItems: "center", background: "#faf8ff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 10, color: "#a78bfa", fontWeight: 600 }}>ORDER</span>
              <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#4c1d95" }}>#{order.code}</span>
            </div>
            <span style={{ color: "#ddd6fe" }}>·</span>
            <span style={{ fontSize: 11, color: "#7c6f9e" }}>{order.date}</span>
            <span style={{ color: "#ddd6fe" }}>·</span>
            <span style={{ fontSize: 11, color: "#7c6f9e" }}>📦 {order.deliveryMethod}</span>
          </div>

          {/* Items */}
          <div style={{ padding: "12px 22px", borderBottom: "1px solid #f3f0ff" }}>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#a78bfa", margin: "0 0 8px" }}>Items</p>
            {order.items.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < order.items.length - 1 ? "1px solid #faf8ff" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#3d1a78", background: "#a3e63522", padding: "1px 7px", borderRadius: 4, border: "1px solid #a3e63555" }}>{item.qty}×</span>
                  <span style={{ fontSize: 12, color: "#2e1065" }}>{item.name}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#1e1040", fontVariantNumeric: "tabular-nums" }}>{order.currency}{item.price.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Action */}
          <div style={{ padding: "12px 22px", display: "flex", justifyContent: "flex-end" }}>
            <button style={{ fontSize: 12, fontWeight: 800, padding: "9px 28px", borderRadius: 12, background: "linear-gradient(135deg, #6d28d9, #7c3aed)", color: "#fff", border: "none", cursor: "pointer", letterSpacing: "0.01em", boxShadow: "0 2px 12px rgba(109,40,217,0.35)" }}>
              Manage →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
