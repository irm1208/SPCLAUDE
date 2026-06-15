export function HorizontalStrip() {
  const orders = [
    {
      gbName: "BPC-157 Summer GB",
      status: "Submitted",
      statusColor: "#1d4ed8",
      statusBg: "#eff6ff",
      dot: "#1d4ed8",
      amount: 12.00,
      currency: "£",
      code: "2845",
      date: "18 Apr",
      paymentStatus: "Pending",
      paymentOk: false,
      delivery: "RM",
      items: [{ name: "BPC-157 5mg", qty: 2 }],
    },
    {
      gbName: "TB-500 Spring Round",
      status: "Shipped",
      statusColor: "#7c3aed",
      statusBg: "#f5f3ff",
      dot: "#7c3aed",
      amount: 28.50,
      currency: "£",
      code: "2801",
      date: "10 Apr",
      paymentStatus: "Paid",
      paymentOk: true,
      delivery: "DHL",
      items: [{ name: "TB-500 10mg", qty: 1 }],
    },
    {
      gbName: "GHK-Cu Group Buy",
      status: "Delivered",
      statusColor: "#16a34a",
      statusBg: "#f0fdf4",
      dot: "#16a34a",
      amount: 45.00,
      currency: "£",
      code: "2740",
      date: "2 Apr",
      paymentStatus: "Paid",
      paymentOk: true,
      delivery: "RM",
      items: [{ name: "GHK-Cu 50mg", qty: 3 }],
    },
  ];

  return (
    <div style={{ background: "#f1f5f9", minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 660 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff" }}>GB</div>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0f172a" }}>Group Buy Orders</p>
            <p style={{ margin: 0, fontSize: 10, color: "#64748b" }}>Active · 3 orders shown</p>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          {/* Column headers */}
          <div style={{ display: "flex", padding: "8px 16px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
            {["Order", "Status", "Items", "Amount", ""].map((h, i) => (
              <div key={i} style={{ flex: i === 2 ? 2 : i === 4 ? "none" : 1, width: i === 4 ? 90 : undefined, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#94a3b8" }}>{h}</div>
            ))}
          </div>

          {orders.map((o, idx) => (
            <div key={o.code} style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: idx < orders.length - 1 ? "1px solid #f8fafc" : "none", background: idx % 2 === 0 ? "#fff" : "#fafbfc" }}>
              {/* Order */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.gbName}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: "#94a3b8" }}>#{o.code}</span>
                  <span style={{ fontSize: 10, color: "#cbd5e1" }}>·</span>
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>{o.date}</span>
                </div>
              </div>

              {/* Status */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: o.dot, display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: o.statusColor }}>{o.status}</span>
                </div>
                <span style={{ fontSize: 10, color: o.paymentOk ? "#16a34a" : "#b45309", fontWeight: 600 }}>{o.paymentStatus}</span>
              </div>

              {/* Items */}
              <div style={{ flex: 2, display: "flex", flexWrap: "wrap", gap: 4 }}>
                {o.items.map((item, i) => (
                  <span key={i} style={{ fontSize: 10, color: "#475569", background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "2px 8px", borderRadius: 20 }}>
                    <span style={{ fontWeight: 700, color: o.statusColor }}>{item.qty}×</span> {item.name}
                  </span>
                ))}
              </div>

              {/* Amount */}
              <div style={{ flex: 1, textAlign: "right", paddingRight: 12 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>{o.currency}{o.amount.toFixed(2)}</p>
              </div>

              {/* Manage */}
              <div style={{ width: 90 }}>
                <button style={{ fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 8, background: "#1e3a8a", color: "#fff", border: "none", cursor: "pointer" }}>
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
