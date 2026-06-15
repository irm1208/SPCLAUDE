export function StatusBar() {
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
      { name: "Shipping", qty: 1, price: 2.00 },
    ],
  };

  const statusColor = "#1d4ed8";
  const statusBg = "#eff6ff";

  return (
    <div style={{ background: "#f1f5f9", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 620 }}>
        {/* GB header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff", flexShrink: 0 }}>GB</div>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{order.gbName}</p>
            <p style={{ margin: 0, fontSize: 10, color: "#64748b" }}>Active · 4 orders</p>
          </div>
        </div>

        {/* Card */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", overflow: "hidden", display: "flex" }}>
          {/* Left status bar */}
          <div style={{ width: 5, background: statusColor, flexShrink: 0 }} />

          {/* Content */}
          <div style={{ flex: 1, padding: "16px 18px" }}>
            {/* Row 1: type badge + amount */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: statusBg, color: statusColor, border: `1px solid #bfdbfe` }}>{order.type}</span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: statusBg, color: statusColor }}>⏱ {order.status}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>{order.currency}{order.amount.toFixed(2)}</p>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#b45309" }}>{order.paymentStatus}</span>
              </div>
            </div>

            {/* Row 2: code + date + delivery */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "2px 8px", borderRadius: 6, color: "#475569" }}>{order.code}</span>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>·</span>
              <span style={{ fontSize: 11, color: "#64748b" }}>{order.date}</span>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>·</span>
              <span style={{ fontSize: 11, color: "#64748b" }}>{order.deliveryMethod}</span>
            </div>

            {/* Items — always visible */}
            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12, marginBottom: 14 }}>
              {order.items.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: i < order.items.length - 1 ? "1px solid #f8fafc" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 20, height: 20, borderRadius: 5, background: "#eff6ff", color: "#1d4ed8", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{item.qty}</span>
                    <span style={{ fontSize: 12, color: "#334155" }}>{item.name}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>{order.currency}{item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Action */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button style={{ fontSize: 12, fontWeight: 700, padding: "8px 20px", borderRadius: 9, background: "#1e3a8a", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                Manage <span>→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
