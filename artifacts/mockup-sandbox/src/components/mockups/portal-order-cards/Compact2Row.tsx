export function Compact2Row() {
  const orders = [
    {
      gbName: "BPC-157 Summer GB",
      type: "GBP Order",
      status: "Submitted",
      statusColor: "#1d4ed8",
      statusBg: "#eff6ff",
      amount: 12.00,
      currency: "£",
      code: "2845",
      date: "18 Apr 2026",
      paymentStatus: "Pending",
      paymentColor: "#b45309",
      deliveryMethod: "RM",
      items: [
        { name: "BPC-157 5mg", qty: 2 },
        { name: "Shipping", qty: 1 },
      ],
    },
    {
      gbName: "TB-500 Spring Round",
      type: "GBP Order",
      status: "Shipped",
      statusColor: "#7c3aed",
      statusBg: "#f5f3ff",
      amount: 28.50,
      currency: "£",
      code: "2801",
      date: "10 Apr 2026",
      paymentStatus: "Paid",
      paymentColor: "#16a34a",
      deliveryMethod: "DHL",
      items: [
        { name: "TB-500 10mg", qty: 1 },
      ],
    },
  ];

  return (
    <div style={{ background: "#f1f5f9", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 620 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff" }}>GB</div>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0f172a" }}>BPC-157 Summer GB</p>
            <p style={{ margin: 0, fontSize: 10, color: "#64748b" }}>Active · 4 orders</p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {orders.map((o, idx) => (
            <div key={idx} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", padding: "13px 16px" }}>
              {/* Row 1: badge, amount, payment dot */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: o.statusBg, color: o.statusColor, border: `1px solid ${o.statusColor}33` }}>{o.status}</span>
                  <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 600, color: "#94a3b8", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "2px 7px", borderRadius: 6 }}>{o.code}</span>
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>{o.date}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: o.paymentColor }}>{o.paymentStatus}</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px", fontVariantNumeric: "tabular-nums" }}>{o.currency}{o.amount.toFixed(2)}</span>
                </div>
              </div>
              {/* Row 2: items chips + delivery + manage */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {o.items.map((item, i) => (
                  <span key={i} style={{ fontSize: 11, color: "#334155", background: "#f8fafc", border: "1px solid #e9ecef", padding: "3px 9px", borderRadius: 20, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontWeight: 700, color: o.statusColor, fontSize: 10 }}>{item.qty}×</span> {item.name}
                  </span>
                ))}
                <span style={{ fontSize: 10, color: "#94a3b8", background: "#f8fafc", border: "1px solid #e9ecef", padding: "3px 9px", borderRadius: 20 }}>📦 {o.deliveryMethod}</span>
                <button style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, padding: "6px 16px", borderRadius: 8, background: "#1e3a8a", color: "#fff", border: "none", cursor: "pointer", flexShrink: 0 }}>
                  Manage →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
