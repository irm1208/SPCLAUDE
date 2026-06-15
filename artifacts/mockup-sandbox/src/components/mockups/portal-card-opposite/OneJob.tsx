// OPPOSITE 2: RADICAL REDUCTION / ONE JOB
// P4 assumption inverted: all information is always visible — 5 zones, full detail.
// Here: the card has one job and shows almost nothing.
// Status + amount + one CTA. Everything else is collapsed behind "Show details".
// The card is 3× shorter. The philosophy: one decision at a time.
// Reference: Stripe payment confirmation, Monzo transaction card on lock screen.

import { useState } from "react";

export function OneJob() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 560 }}>

        {/* GB breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff" }}>GB</div>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0f172a" }}>BPC-157 Summer GB</p>
            <p style={{ margin: 0, fontSize: 10, color: "#64748b" }}>Active · 4 orders</p>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", overflow: "hidden" }}>

          {/* Hero — same gradient, but now contains EVERYTHING primary */}
          <div style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)", padding: "22px 22px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ margin: "0 0 6px", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>GBP Order</p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px 5px 10px", borderRadius: 30, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}>
                <span style={{ fontSize: 14 }}>⏱</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Submitted</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-1px" }}>£12.00</p>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#fde68a" }}>Pending</span>
            </div>
          </div>

          {/* ONE action — full width, dominant */}
          <div style={{ padding: "14px 16px" }}>
            <button style={{
              width: "100%", fontSize: 13, fontWeight: 800, padding: "12px 0",
              borderRadius: 12, background: "#1e3a8a", color: "#fff",
              border: "none", cursor: "pointer",
            }}>
              Manage order →
            </button>
          </div>

          {/* Collapsed details — the entire meta+items section is hidden by default */}
          <div style={{ borderTop: "1px solid #f1f5f9" }}>
            <button
              onClick={() => setOpen(!open)}
              style={{ width: "100%", padding: "10px 22px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>Show details</span>
              <span style={{ fontSize: 11, color: "#cbd5e1", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
            </button>

            {open && (
              <div style={{ borderTop: "1px solid #f1f5f9" }}>
                {/* Meta — same as P4 */}
                <div style={{ padding: "10px 22px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 16, alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>ORDER</span>
                    <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#475569" }}>#2845</span>
                  </div>
                  <span style={{ color: "#e2e8f0" }}>·</span>
                  <span style={{ fontSize: 11, color: "#64748b" }}>18 Apr 2026</span>
                  <span style={{ color: "#e2e8f0" }}>·</span>
                  <span style={{ fontSize: 11, color: "#64748b" }}>📦 Royal Mail</span>
                </div>

                {/* Items — same as P4 */}
                <div style={{ padding: "12px 22px 14px" }}>
                  <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#94a3b8", margin: "0 0 8px" }}>Items</p>
                  {[{ qty: 2, name: "BPC-157 5mg", price: "£10.00" }, { qty: 1, name: "Shipping", price: "£2.00" }].map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i === 0 ? "1px solid #f8fafc" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", background: "#eff6ff", padding: "1px 7px", borderRadius: 4 }}>{item.qty}×</span>
                        <span style={{ fontSize: 12, color: "#334155" }}>{item.name}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{item.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
