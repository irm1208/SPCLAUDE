export function ScreenshotFirst() {
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
    reshipper: "reshipper_eu",
    txId: "fiat:paypal",
    items: [
      { name: "BPC-157 5mg", qty: 2, unitPrice: 5.00, total: 10.00 },
    ],
    shipping: 3.00,
  };

  return (
    <div style={{ background: "#080e1c", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 560, borderRadius: 18, background: "#111827", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 12px 40px rgba(0,0,0,0.6)", overflow: "hidden" }}>

        {/* Screenshot — dominant, fills width */}
        <div style={{ position: "relative", background: "linear-gradient(160deg, #0f2460 0%, #1a3a8f 40%, #0f4c8a 100%)", padding: "22px 24px 18px" }}>
          {/* Amber highlight strip */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,rgba(251,191,36,0.6),rgba(251,191,36,0))" }} />

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <p style={{ margin: 0, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.45)", fontWeight: 700 }}>Payment Proof · PayPal</p>
              <p style={{ margin: "6px 0 0", fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: "-1px", fontVariantNumeric: "tabular-nums" }}>$13.00</p>
            </div>
            <span style={{ padding: "5px 14px", borderRadius: 30, background: "rgba(34,197,94,0.18)", border: "1px solid rgba(34,197,94,0.45)", fontSize: 10, fontWeight: 800, color: "#4ade80", letterSpacing: "0.04em" }}>PAID</span>
          </div>

          {/* Receipt body */}
          <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: "10px 14px", backdropFilter: "blur(4px)" }}>
            {[
              { label: "Date", value: "16 Apr 2026, 10:18" },
              { label: "Reference", value: "fiat:paypal" },
              { label: "Customer", value: "@iam121" },
              { label: "Status", value: "Confirmed ✓", highlight: true },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{row.label}</span>
                <span style={{ fontSize: 10, fontWeight: row.highlight ? 700 : 500, color: row.highlight ? "#4ade80" : "rgba(255,255,255,0.75)", fontFamily: row.label === "Reference" ? "monospace" : undefined }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order meta */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          {[
            { label: "Order", value: `#${order.code}` },
            { label: "Status", value: order.status },
            { label: "Country", value: `🇵🇱 PL` },
            { label: "Reshipper", value: `@${order.reshipper.split("_")[0]}` },
          ].map((cell, i) => (
            <div key={i} style={{ flex: 1, padding: "10px 14px", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>{cell.label}</p>
              <p style={{ margin: "3px 0 0", fontSize: 11, fontWeight: 600, color: "#cbd5e1", fontFamily: i === 0 ? "monospace" : undefined }}>{cell.value}</p>
            </div>
          ))}
        </div>

        {/* Items — always shown */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <p style={{ margin: "0 0 10px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#5B8DEF" }}>Items Ordered</p>
          {order.items.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: "rgba(91,141,239,0.06)", border: "1px solid rgba(91,141,239,0.14)", marginBottom: 4 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(91,141,239,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#5B8DEF", flexShrink: 0 }}>{item.qty}</div>
              <span style={{ flex: 1, fontSize: 12, color: "#e2e8f0", fontWeight: 500 }}>{item.name}</span>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#e2e8f0", fontVariantNumeric: "tabular-nums" }}>${item.total.toFixed(2)}</p>
                <p style={{ margin: 0, fontSize: 9, color: "#475569" }}>${item.unitPrice.toFixed(2)} each</p>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px 0" }}>
            <span style={{ fontSize: 10, color: "#475569" }}>Shipping</span>
            <span style={{ fontSize: 10, color: "#64748b" }}>${order.shipping.toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 12px 0", borderTop: "1px solid rgba(91,141,239,0.15)", marginTop: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>Total</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#5B8DEF", fontVariantNumeric: "tabular-nums" }}>${order.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: "10px 20px", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={{ fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", cursor: "pointer" }}>Edit</button>
          <button style={{ fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 8, background: "rgba(91,141,239,0.15)", border: "1px solid rgba(91,141,239,0.3)", color: "#5B8DEF", cursor: "pointer" }}>Message Customer</button>
        </div>
      </div>
    </div>
  );
}
