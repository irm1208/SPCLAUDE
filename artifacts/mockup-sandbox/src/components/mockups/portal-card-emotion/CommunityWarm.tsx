// REGISTER: COMMUNITY WARMTH
// Treats the order as a social artifact — you ordered alongside real people.
// Shows who's in the batch, the organiser by name, conversational copy.
// The card feels like a message from a friend, not an enterprise system.
// For a community-run group buy, this is arguably the most honest register.

export function CommunityWarm() {
  const members = ["A","B","C","D","E","F","G","H"];
  const colors = ["#3b82f6","#10b981","#8b5cf6","#f59e0b","#ef4444","#06b6d4","#ec4899","#84cc16"];

  return (
    <div style={{ background: "#f0f4ff", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 560 }}>

        {/* Organiser message header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", flexShrink: 0 }}>🧪</div>
          <div style={{ background: "#fff", borderRadius: "4px 16px 16px 16px", padding: "10px 14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", flex: 1 }}>
            <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, color: "#1e3a8a" }}>@pepsorg · BPC-157 Summer GB</p>
            <p style={{ margin: 0, fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
              Hey! Your order is in — waiting on payment proof and then we're off. 🚀 31 people in this batch so far!
            </p>
          </div>
        </div>

        {/* Card */}
        <div style={{ background: "#fff", borderRadius: 18, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: "1px solid #e0e7ff", overflow: "hidden" }}>

          {/* Batch social proof */}
          <div style={{ padding: "12px 18px 10px", background: "#eff6ff", borderBottom: "1px solid #e0e7ff", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex" }}>
              {members.map((m, i) => (
                <div key={i} style={{ width: 22, height: 22, borderRadius: "50%", background: colors[i], border: "2px solid #eff6ff", marginLeft: i > 0 ? -7 : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, color: "#fff" }}>{m}</div>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 11, color: "#3b82f6", fontWeight: 600 }}>
              You + 30 others in this batch
            </p>
            <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: "#16a34a", background: "#f0fdf4", padding: "2px 8px", borderRadius: 20, border: "1px solid #bbf7d0" }}>Min reached ✓</span>
          </div>

          {/* Order identity */}
          <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px 5px 10px", borderRadius: 24, background: "#f0f4ff", border: "1px solid #c7d7f4", marginBottom: 8 }}>
                  <span style={{ fontSize: 13 }}>⏱</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#1e3a8a" }}>Submitted</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, color: "#94a3b8", background: "#f8fafc", padding: "2px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontFamily: "monospace", fontWeight: 700 }}>#2845</span>
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>18 Apr 2026</span>
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>📦 Royal Mail</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.5px" }}>£12.00</p>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#b45309" }}>Awaiting payment</span>
              </div>
            </div>
          </div>

          {/* Items */}
          <div style={{ padding: "10px 18px 12px", borderBottom: "1px solid #f1f5f9" }}>
            <p style={{ margin: "0 0 8px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8" }}>Your items</p>
            {[{ qty: 2, name: "BPC-157 5mg", price: "£10.00" }, { qty: 1, name: "Shipping", price: "£2.00" }].map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i === 0 ? "1px solid #f8fafc" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", background: "#eff6ff", padding: "1px 6px", borderRadius: 4 }}>{item.qty}×</span>
                  <span style={{ fontSize: 12, color: "#334155" }}>{item.name}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{item.price}</span>
              </div>
            ))}
          </div>

          {/* Friendly CTA */}
          <div style={{ padding: "12px 18px", background: "#fefce8", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <p style={{ margin: 0, fontSize: 11, color: "#713f12", lineHeight: 1.4 }}>
              📸 Send your payment proof to get confirmed faster
            </p>
            <button style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, padding: "8px 16px", borderRadius: 10, background: "#1e3a8a", color: "#fff", border: "none", cursor: "pointer" }}>
              Manage →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
