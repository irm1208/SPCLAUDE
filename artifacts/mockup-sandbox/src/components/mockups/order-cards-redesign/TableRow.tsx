export function TableRow() {
  const orders = [
    {
      code: "7495", status: "Submitted", paymentMethod: "PayPal", username: "@iam121",
      date: "16 Apr", total: 13.00, currency: "USD", isPaid: true,
      shippingCountry: "🇵🇱", reshipper: "reshipper_eu", txId: "fiat:paypal",
      items: [{ name: "BPC-157 5mg", qty: 2, total: 10.00 }],
      shipping: 3.00, hasScreenshot: true,
    },
    {
      code: "7480", status: "Shipped", paymentMethod: "Revolut", username: "@peptideking",
      date: "15 Apr", total: 28.50, currency: "USD", isPaid: true,
      shippingCountry: "🇩🇪", reshipper: "reshipper_eu", txId: "rev:TXN0029",
      items: [{ name: "TB-500 10mg", qty: 1, total: 22.00 }, { name: "Shipping EU", qty: 1, total: 6.50 }],
      shipping: 6.50, hasScreenshot: true,
    },
    {
      code: "7468", status: "Processing", paymentMethod: "Crypto", username: "@anon9981",
      date: "14 Apr", total: 45.00, currency: "USD", isPaid: false,
      shippingCountry: "🇫🇷", reshipper: null, txId: null,
      items: [{ name: "GHK-Cu 50mg", qty: 3, total: 45.00 }],
      shipping: 0, hasScreenshot: false,
    },
  ];

  const pmColor = (m: string) => m === "Revolut" ? "#0666EB" : m === "PayPal" ? "#003087" : m === "Crypto" ? "#F97316" : "#64748B";
  const statusColor = (s: string) => s === "Shipped" ? "#22c55e" : s === "Processing" ? "#f59e0b" : "#94a3b8";

  return (
    <div style={{ background: "#0a1120", minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 680 }}>
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>Orders</p>
          <span style={{ fontSize: 10, color: "#64748b", background: "rgba(255,255,255,0.05)", padding: "2px 10px", borderRadius: 10 }}>3 shown</span>
        </div>

        <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 90px 70px 80px 44px", gap: 0, background: "#0f1929", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {["Order", "Customer & Items", "Method", "Country", "Total", ""].map((h, i) => (
              <div key={i} style={{ padding: "0 12px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#475569" }}>{h}</div>
            ))}
          </div>

          {orders.map((order, idx) => (
            <div key={order.code} style={{ borderBottom: idx < orders.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              {/* Main row */}
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 90px 70px 80px 44px", alignItems: "center", background: idx % 2 === 0 ? "#111b30" : "#0f1929", padding: "10px 0", transition: "background 0.15s" }}>
                {/* Order code */}
                <div style={{ padding: "0 12px" }}>
                  <p style={{ margin: 0, fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: "#94a3b8" }}>#{order.code}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 8, color: "#475569" }}>{order.date}</p>
                </div>

                {/* Customer + items inline */}
                <div style={{ padding: "0 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg,#5B8DEF,#3b5fc0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                      {order.username[1].toUpperCase()}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0" }}>{order.username}</span>
                    <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 10, fontWeight: 600, color: statusColor(order.status), background: `${statusColor(order.status)}1a`, border: `1px solid ${statusColor(order.status)}33` }}>{order.status}</span>
                    {order.hasScreenshot && (
                      <span style={{ fontSize: 8, padding: "1px 6px", borderRadius: 6, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24" }}>📷</span>
                    )}
                  </div>
                  {/* Items always visible */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {order.items.map((item, i) => (
                      <span key={i} style={{ fontSize: 10, color: "#cbd5e1", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", padding: "2px 8px", borderRadius: 6 }}>
                        <span style={{ color: "#5B8DEF", fontWeight: 700 }}>{item.qty}×</span> {item.name}
                        <span style={{ color: "#475569", marginLeft: 6 }}>${item.total.toFixed(2)}</span>
                      </span>
                    ))}
                    {order.shipping > 0 && (
                      <span style={{ fontSize: 10, color: "#475569", padding: "2px 8px" }}>+ship ${order.shipping.toFixed(2)}</span>
                    )}
                  </div>
                  {/* Screenshot expanded inline */}
                  {order.hasScreenshot && (
                    <div style={{ marginTop: 7, padding: "8px 10px", borderRadius: 8, background: "rgba(30,58,138,0.25)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 4, background: "linear-gradient(135deg,#1e3a8a,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0 }}>💳</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 9, color: "rgba(255,255,255,0.5)" }}>Payment screenshot on file · {order.paymentMethod}</p>
                        {order.txId && <p style={{ margin: "2px 0 0", fontSize: 9, fontFamily: "monospace", color: "#64748b" }}>{order.txId}</p>}
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#4ade80" }}>✓ Paid</span>
                    </div>
                  )}
                </div>

                {/* Payment method */}
                <div style={{ padding: "0 12px" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: pmColor(order.paymentMethod), color: "#fff" }}>{order.paymentMethod}</span>
                </div>

                {/* Country */}
                <div style={{ padding: "0 12px" }}>
                  <p style={{ margin: 0, fontSize: 14 }}>{order.shippingCountry}</p>
                </div>

                {/* Total */}
                <div style={{ padding: "0 12px" }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: order.isPaid ? "#e2e8f0" : "#f87171", fontVariantNumeric: "tabular-nums" }}>${order.total.toFixed(2)}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 8, color: order.isPaid ? "#22c55e" : "#64748b" }}>{order.isPaid ? "Paid" : "Unpaid"}</p>
                </div>

                {/* Actions */}
                <div style={{ padding: "0 10px", display: "flex", gap: 4 }}>
                  <button style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>✏</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
