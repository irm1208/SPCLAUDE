export function ReceiptDoc() {
  const order = {
    code: "7495",
    status: "Submitted",
    paymentMethod: "PayPal",
    username: "@iam121",
    date: "16 Apr 2026 · 10:18",
    total: 13.00,
    currency: "USD",
    isPaid: true,
    shippingCountry: "PL",
    txId: "fiat:paypal",
    items: [
      { name: "BPC-157 5mg", qty: 2, unitPrice: 5.00, total: 10.00 },
    ],
    shipping: 3.00,
  };

  return (
    <div style={{ background: "#080f1e", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 640, borderRadius: 16, overflow: "hidden", background: "#10192e", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>

        {/* Screenshot banner — full width, prominent */}
        <div style={{ position: "relative", background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #1e40af 100%)", padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.5)", margin: 0, fontWeight: 700 }}>PayPal Receipt</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: "6px 0 0", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px" }}>USD 13.00</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: "4px 0 0" }}>16 Apr 2026 at 10:18</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: 20, background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.4)", fontSize: 11, fontWeight: 700, color: "#4ade80" }}>CONFIRMED</span>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", margin: "8px 0 0", fontFamily: "monospace" }}>REF: fiat:paypal</p>
            </div>
          </div>
          {/* Decorative row lines */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "repeating-linear-gradient(90deg,rgba(255,255,255,0.15) 0,rgba(255,255,255,0.15) 12px,transparent 12px,transparent 20px)" }} />
        </div>

        {/* Order info row */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          {[
            { label: "Order", value: `#${order.code}` },
            { label: "Customer", value: order.username },
            { label: "Country", value: `🇵🇱 ${order.shippingCountry}` },
            { label: "Status", value: order.status },
          ].map((cell, i) => (
            <div key={i} style={{ flex: 1, padding: "12px 16px", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
              <p style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 3px", fontWeight: 700 }}>{cell.label}</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#cbd5e1", margin: 0, fontFamily: i === 0 ? "monospace" : undefined }}>{cell.value}</p>
            </div>
          ))}
        </div>

        {/* Items table */}
        <div style={{ padding: "16px 20px" }}>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#5B8DEF", margin: "0 0 10px" }}>Line Items</p>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Product", "Qty", "Unit", "Total"].map(h => (
                  <th key={h} style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "#475569", textAlign: h === "Product" ? "left" : "right", padding: "0 0 8px", letterSpacing: "0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 500, padding: "9px 0" }}>{item.name}</td>
                  <td style={{ fontSize: 12, color: "#94a3b8", textAlign: "right", padding: "9px 0", fontVariantNumeric: "tabular-nums" }}>{item.qty}</td>
                  <td style={{ fontSize: 12, color: "#94a3b8", textAlign: "right", padding: "9px 0", fontVariantNumeric: "tabular-nums" }}>${item.unitPrice.toFixed(2)}</td>
                  <td style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600, textAlign: "right", padding: "9px 0", fontVariantNumeric: "tabular-nums" }}>${item.total.toFixed(2)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <td colSpan={3} style={{ fontSize: 10, color: "#64748b", padding: "7px 0" }}>Shipping</td>
                <td style={{ fontSize: 10, color: "#94a3b8", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>${order.shipping.toFixed(2)}</td>
              </tr>
              <tr style={{ borderTop: "2px solid rgba(91,141,239,0.25)" }}>
                <td colSpan={3} style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", padding: "10px 0 0" }}>Total</td>
                <td style={{ fontSize: 15, fontWeight: 800, color: "#5B8DEF", textAlign: "right", padding: "10px 0 0", fontVariantNumeric: "tabular-nums" }}>${order.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 20px 14px", display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button style={{ fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", cursor: "pointer" }}>Edit Order</button>
          <button style={{ fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 8, background: "rgba(91,141,239,0.15)", border: "1px solid rgba(91,141,239,0.3)", color: "#5B8DEF", cursor: "pointer" }}>Message</button>
        </div>
      </div>
    </div>
  );
}
