export function CompactInline() {
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
      { name: "BPC-157 5mg", qty: 2, total: 10.00 },
    ],
    shipping: 3.00,
  };

  return (
    <div style={{ background: "#0b1220", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 620, borderRadius: 14, background: "#131f35", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 20px rgba(0,0,0,0.5)", overflow: "hidden" }}>

        {/* Row 1: Identity + screenshot side by side */}
        <div style={{ display: "flex", alignItems: "stretch", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ flex: 1, padding: "14px 16px" }}>
            {/* Tags row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, background: "#1e2d54", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.09)", padding: "2px 8px", borderRadius: 6 }}>#{order.code}</span>
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }}>{order.status}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#003087", color: "#fff" }}>PayPal</span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: "#64748b", background: "rgba(255,255,255,0.04)", padding: "2px 8px", borderRadius: 10 }}>🇵🇱 {order.shippingCountry}</span>
            </div>
            {/* User + date */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#5B8DEF,#3b5fc0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>i</div>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{order.username}</p>
                <p style={{ margin: 0, fontSize: 9, color: "#475569" }}>{order.date}</p>
              </div>
            </div>
            {/* Amount + reshipper */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ flex: 1, padding: "7px 10px", borderRadius: 8, background: "rgba(91,141,239,0.06)", border: "1px solid rgba(91,141,239,0.15)" }}>
                <p style={{ margin: 0, fontSize: 9, color: "#5B8DEF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Total</p>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#e2e8f0", fontVariantNumeric: "tabular-nums" }}>{order.currency} {order.total.toFixed(2)}</p>
              </div>
              <div style={{ flex: 1, padding: "7px 10px", borderRadius: 8, background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)" }}>
                <p style={{ margin: 0, fontSize: 9, color: "#22c55e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Payment</p>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#4ade80" }}>Paid ✓</p>
              </div>
            </div>
          </div>

          {/* Screenshot column */}
          <div style={{ width: 160, flexShrink: 0, borderLeft: "1px solid rgba(255,255,255,0.07)", background: "#0f1929", padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#5B8DEF" }}>Payment Screenshot</p>
            <div style={{ flex: 1, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(251,191,36,0.25)", background: "linear-gradient(160deg,#1e3a8a 0%,#1e40af 100%)", minHeight: 100, display: "flex", flexDirection: "column", justifyContent: "center", padding: "12px 10px" }}>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", margin: "0 0 4px", fontWeight: 700 }}>PAYPAL</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>$13.00</p>
              <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.1)", margin: "4px 0" }} />
              <p style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", margin: 0, fontFamily: "monospace" }}>fiat:paypal</p>
              <p style={{ fontSize: 9, color: "#4ade80", fontWeight: 700, margin: "4px 0 0" }}>✓ Confirmed</p>
            </div>
            <p style={{ margin: 0, fontSize: 9, fontFamily: "monospace", color: "#475569", wordBreak: "break-all" }}>{order.txId}</p>
          </div>
        </div>

        {/* Row 2: Items always visible */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ margin: "0 0 8px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#5B8DEF" }}>Order Items</p>
          {order.items.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#5B8DEF", background: "rgba(91,141,239,0.15)", borderRadius: 4, padding: "1px 6px" }}>{item.qty}×</span>
                <span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 500 }}>{item.name}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", fontVariantNumeric: "tabular-nums" }}>${item.total.toFixed(2)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px 0" }}>
            <span style={{ fontSize: 10, color: "#475569" }}>+ Shipping</span>
            <span style={{ fontSize: 10, color: "#64748b" }}>${order.shipping.toFixed(2)}</span>
          </div>
        </div>

        {/* Row 3: Actions + reshipper */}
        <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 9, color: "#5B8DEF", fontWeight: 600 }}>↻</span>
            <span style={{ fontSize: 10, color: "#94a3b8" }}>@{order.reshipper}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ fontSize: 10, fontWeight: 600, padding: "5px 12px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "#94a3b8", cursor: "pointer" }}>Edit</button>
            <button style={{ fontSize: 10, fontWeight: 700, padding: "5px 12px", borderRadius: 8, background: "rgba(91,141,239,0.15)", border: "1px solid rgba(91,141,239,0.3)", color: "#5B8DEF", cursor: "pointer" }}>Message</button>
          </div>
        </div>
      </div>
    </div>
  );
}
