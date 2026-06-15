// VIBE: EDITORIAL MONOCHROME
// Same structure. No colour — black, white, and one shade of grey.
// Hero is flat black, not a gradient. Status is inset text, not a pill.
// Heavy editorial typography: tight tracking, contrasting weights.
// Feels like a high-end print invoice or a Brutalist design zine.

export function VibeMono() {
  const order = {
    gbName: "BPC-157 Summer GB", type: "GBP Order", status: "Submitted",
    amount: 12.00, currency: "£", code: "2845", date: "18 Apr 2026",
    paymentStatus: "Pending", deliveryMethod: "Royal Mail",
    items: [{ name: "BPC-157 5mg", qty: 2, price: 10.00 }, { name: "Shipping", qty: 1, price: 2.00 }],
  };

  return (
    <div style={{ background: "#f2f2f0", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 560 }}>

        {/* GB breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff", letterSpacing: "0.05em" }}>GB</div>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.1px" }}>{order.gbName}</p>
            <p style={{ margin: 0, fontSize: 10, color: "#888", letterSpacing: "0.02em" }}>Active · 4 orders</p>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 4, border: "1.5px solid #0a0a0a", boxShadow: "4px 4px 0 #0a0a0a", overflow: "hidden" }}>

          {/* Status hero — flat black */}
          <div style={{ background: "#0a0a0a", padding: "18px 22px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <p style={{ margin: "0 0 10px", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 700, color: "#555" }}>{order.type}</p>
              {/* No pill — status is just heavy text */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.4px", textTransform: "uppercase" }}>{order.status}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#555", letterSpacing: "0.15em", textTransform: "uppercase", borderBottom: "1px solid #444", paddingBottom: 1 }}>—</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 30, fontWeight: 900, color: "#fff", letterSpacing: "-2px", lineHeight: 1 }}>{order.currency}{order.amount.toFixed(2)}</p>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#666", letterSpacing: "0.15em", textTransform: "uppercase" }}>{order.paymentStatus}</span>
            </div>
          </div>

          {/* Meta row */}
          <div style={{ padding: "10px 22px", borderBottom: "1px solid #e8e8e8", display: "flex", gap: 16, alignItems: "center", background: "#fafafa" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 9, color: "#aaa", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Order</span>
              <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#0a0a0a" }}>#{order.code}</span>
            </div>
            <span style={{ color: "#ddd" }}>·</span>
            <span style={{ fontSize: 11, color: "#555" }}>{order.date}</span>
            <span style={{ color: "#ddd" }}>·</span>
            <span style={{ fontSize: 11, color: "#555" }}>📦 {order.deliveryMethod}</span>
          </div>

          {/* Items */}
          <div style={{ padding: "12px 22px", borderBottom: "1.5px solid #0a0a0a" }}>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: "#aaa", margin: "0 0 8px" }}>Items</p>
            {order.items.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < order.items.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: "#0a0a0a", background: "#f0f0f0", padding: "1px 7px", borderRadius: 2, fontFamily: "monospace" }}>{item.qty}×</span>
                  <span style={{ fontSize: 12, color: "#333", fontWeight: 500 }}>{item.name}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0a0a0a", fontFamily: "monospace", letterSpacing: "-0.3px" }}>{order.currency}{item.price.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Action */}
          <div style={{ padding: "12px 22px", display: "flex", justifyContent: "flex-end", background: "#fff" }}>
            <button style={{ fontSize: 11, fontWeight: 900, padding: "9px 22px", borderRadius: 3, background: "#0a0a0a", color: "#fff", border: "none", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Manage →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
