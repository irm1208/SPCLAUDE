export function Timeline() {
  const order = {
    gbName: "BPC-157 Summer GB",
    type: "GBP Order",
    status: "Submitted",
    currentStep: 0,
    amount: 12.00,
    currency: "£",
    code: "2845",
    date: "18 Apr 2026",
    paymentStatus: "Pending",
    deliveryMethod: "Royal Mail",
    items: [
      { name: "BPC-157 5mg", qty: 2 },
      { name: "Shipping", qty: 1 },
    ],
  };

  const steps = ["Placed", "Processing", "Shipped", "Delivered"];

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 620 }}>
        {/* GB header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff" }}>GB</div>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{order.gbName}</p>
            <p style={{ margin: 0, fontSize: 10, color: "#64748b" }}>Active · 4 orders</p>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          {/* Top: header with amount */}
          <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "2px 8px", borderRadius: 20 }}>{order.type}</span>
                <span style={{ fontSize: 10, fontFamily: "monospace", color: "#94a3b8", fontWeight: 600, background: "#f1f5f9", padding: "2px 7px", borderRadius: 6 }}>#{order.code}</span>
              </div>
              <p style={{ margin: 0, fontSize: 10, color: "#94a3b8" }}>{order.date} · {order.deliveryMethod}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>{order.currency}{order.amount.toFixed(2)}</p>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#b45309" }}>{order.paymentStatus}</span>
            </div>
          </div>

          {/* Progress timeline */}
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              {steps.map((step, i) => {
                const isDone = i < order.currentStep;
                const isCurrent = i === order.currentStep;
                const isLast = i === steps.length - 1;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", flex: isLast ? "none" : 1 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: isDone ? "#1e3a8a" : isCurrent ? "#eff6ff" : "#f8fafc",
                        border: isDone ? "none" : isCurrent ? "2px solid #1d4ed8" : "2px solid #e2e8f0",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 700,
                        color: isDone ? "#fff" : isCurrent ? "#1d4ed8" : "#cbd5e1",
                        flexShrink: 0,
                      }}>
                        {isDone ? "✓" : i + 1}
                      </div>
                      <span style={{ fontSize: 9, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? "#1d4ed8" : isDone ? "#475569" : "#cbd5e1", whiteSpace: "nowrap" }}>{step}</span>
                    </div>
                    {!isLast && (
                      <div style={{ flex: 1, height: 2, background: i < order.currentStep ? "#1e3a8a" : "#e2e8f0", margin: "0 4px", marginBottom: 16 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Items as chips */}
          <div style={{ padding: "12px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginRight: 2 }}>Items</span>
            {order.items.map((item, i) => (
              <span key={i} style={{ fontSize: 11, color: "#334155", background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "3px 10px", borderRadius: 20, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontWeight: 700, color: "#1d4ed8" }}>{item.qty}×</span> {item.name}
              </span>
            ))}
          </div>

          {/* Action */}
          <div style={{ padding: "12px 18px", display: "flex", justifyContent: "flex-end" }}>
            <button style={{ fontSize: 12, fontWeight: 700, padding: "8px 20px", borderRadius: 9, background: "#1e3a8a", color: "#fff", border: "none", cursor: "pointer" }}>
              Manage →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
