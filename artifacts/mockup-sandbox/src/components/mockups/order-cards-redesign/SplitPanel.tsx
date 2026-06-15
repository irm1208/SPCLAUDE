export function SplitPanel() {
  const order = {
    code: "7495",
    status: "Submitted",
    paymentMethod: "PayPal",
    username: "@iam121",
    date: "16 Apr 2026 · 10:18",
    total: 13.00,
    currency: "USD",
    isPaid: true,
    trackingNumber: null,
    adminNotes: null,
    reshipper: "reshipper_eu",
    shippingCountry: "PL",
    txId: "fiat:paypal",
    items: [
      { name: "BPC-157 5mg", qty: 2, price: 5.00 },
    ],
  };

  const paymentColor = "#003087";

  return (
    <div style={{ background: "#0d1628", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 680, borderRadius: 16, overflow: "hidden", background: "#141f38", border: "1px solid rgba(91,141,239,0.15)", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}>
        {/* Header strip */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0f1a30" }}>
          <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, background: "#1e2d54", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)", padding: "2px 8px", borderRadius: 6 }}>#{order.code}</span>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "rgba(255,255,255,0.07)", color: "#94a3b8" }}>{order.status}</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: paymentColor, color: "#fff" }}>{order.paymentMethod}</span>
          <span style={{ fontSize: 10, fontFamily: "monospace", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.txId}</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", fontVariantNumeric: "tabular-nums" }}>{order.currency} {order.total.toFixed(2)}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: order.isPaid ? "#22c55e" : "#94a3b8" }}>{order.isPaid ? "Paid" : "Unpaid"}</span>
          </div>
        </div>

        {/* Body: two columns */}
        <div style={{ display: "flex" }}>
          {/* Left: Screenshot */}
          <div style={{ width: 200, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#5B8DEF", marginBottom: 6 }}>Payment Proof</p>
            <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(251,191,36,0.3)", background: "#1a2544" }}>
              <div style={{ background: "linear-gradient(135deg,#1e3a8a 0%,#1e40af 100%)", padding: "10px 12px" }}>
                <p style={{ fontSize: 8, color: "rgba(255,255,255,0.6)", margin: 0, fontWeight: 600 }}>PAYPAL RECEIPT</p>
                <p style={{ fontSize: 11, color: "#fff", margin: "4px 0 0", fontWeight: 700 }}>USD 13.00</p>
              </div>
              <div style={{ padding: "8px 12px 10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 9, color: "#64748b" }}>To</span>
                  <span style={{ fontSize: 9, color: "#94a3b8", fontFamily: "monospace" }}>peps@anon…</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 9, color: "#64748b" }}>Ref</span>
                  <span style={{ fontSize: 9, color: "#94a3b8", fontFamily: "monospace" }}>fiat:paypal</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 9, color: "#64748b" }}>Status</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#22c55e" }}>Confirmed</span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 4 }}>
              <p style={{ fontSize: 9, color: "#64748b", margin: "0 0 2px" }}>Transaction ID</p>
              <p style={{ fontSize: 10, fontFamily: "monospace", color: "#94a3b8", wordBreak: "break-all" }}>fiat:paypal</p>
            </div>
          </div>

          {/* Right: Order details */}
          <div style={{ flex: 1, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{order.username}</span>
              <span style={{ fontSize: 10, color: "#475569" }}>·</span>
              <span style={{ fontSize: 10, color: "#64748b" }}>{order.date}</span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: "#94a3b8", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)" }}>🇵🇱 {order.shippingCountry}</span>
            </div>

            <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#5B8DEF", marginBottom: 8 }}>Items</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {order.items.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#5B8DEF", background: "rgba(91,141,239,0.12)", borderRadius: 4, padding: "1px 6px" }}>{item.qty}×</span>
                    <span style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 500 }}>{item.name}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0", fontVariantNumeric: "tabular-nums" }}>${item.price.toFixed(2)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px 0", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 4 }}>
                <span style={{ fontSize: 10, color: "#64748b" }}>Shipping</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>$3.00</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 10px 0" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0" }}>Total</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#5B8DEF" }}>$13.00</span>
              </div>
            </div>

            <div style={{ marginTop: 12, padding: "8px 10px", borderRadius: 8, background: "rgba(91,141,239,0.07)", border: "1px solid rgba(91,141,239,0.15)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 9, color: "#5B8DEF", fontWeight: 600 }}>↻ Reshipper</span>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>@{order.reshipper}</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding: "8px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={{ fontSize: 10, fontWeight: 600, padding: "5px 12px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", cursor: "pointer" }}>Edit</button>
          <button style={{ fontSize: 10, fontWeight: 700, padding: "5px 12px", borderRadius: 8, background: "rgba(91,141,239,0.2)", border: "1px solid rgba(91,141,239,0.35)", color: "#5B8DEF", cursor: "pointer" }}>Message Customer</button>
        </div>
      </div>
    </div>
  );
}
