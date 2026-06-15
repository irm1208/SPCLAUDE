export function StatusFirst() {
  const order = {
    gbName: "BPC-157 Summer GB",
    type: "GBP Order",
    status: "Submitted",
    amount: 12.00,
    currency: "£",
    code: "2845",
    date: "18 Apr 2026",
    paymentStatus: "Pending",
    deliveryMethod: "Royal Mail",
    items: [
      { name: "BPC-157 5mg", qty: 2, price: 10.00 },
      { name: "Shipping",    qty: 1, price:  2.00 },
    ],
  };

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff" }}>GB</div>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{order.gbName}</p>
            <p style={{ margin: 0, fontSize: 10, color: "#64748b" }}>Active · 4 orders</p>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          {/* Status hero banner */}
          <div style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)", padding: "18px 22px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <p style={{ margin: "0 0 6px", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>{order.type}</p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px 5px 10px", borderRadius: 30, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}>
                <span style={{ fontSize: 14 }}>⏱</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "-0.2px" }}>{order.status}</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-1px" }}>{order.currency}{order.amount.toFixed(2)}</p>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#fde68a" }}>{order.paymentStatus}</span>
            </div>
          </div>

          {/* Meta row */}
          <div style={{ padding: "10px 22px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>ORDER</span>
              <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#475569" }}>#{order.code}</span>
            </div>
            <span style={{ color: "#e2e8f0" }}>·</span>
            <span style={{ fontSize: 11, color: "#64748b" }}>{order.date}</span>
            <span style={{ color: "#e2e8f0" }}>·</span>
            <span style={{ fontSize: 11, color: "#64748b" }}>📦 {order.deliveryMethod}</span>
          </div>

          {/* Items */}
          <div style={{ padding: "12px 22px", borderBottom: "1px solid #f1f5f9" }}>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#94a3b8", margin: "0 0 8px" }}>Items</p>
            {order.items.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < order.items.length - 1 ? "1px solid #f8fafc" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", background: "#eff6ff", padding: "1px 7px", borderRadius: 4 }}>{item.qty}×</span>
                  <span style={{ fontSize: 12, color: "#334155" }}>{item.name}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>{order.currency}{item.price.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Action */}
          <div style={{ padding: "12px 22px", display: "flex", justifyContent: "flex-end" }}>
            <button style={{ fontSize: 12, fontWeight: 700, padding: "9px 22px", borderRadius: 10, background: "#1e3a8a", color: "#fff", border: "none", cursor: "pointer" }}>
              Manage →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
