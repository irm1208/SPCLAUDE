// REGISTER: QUIET CONFIDENCE
// A thermal-receipt aesthetic — monospace amounts, ruled lines, a "thank you" footer.
// No gradients. No hero. Information presented as artifact, not dashboard.
// Works best for delivered/paid orders where there's nothing urgent to do.
// The card becomes a keepsake rather than a control surface.

export function ReceiptQuiet() {
  return (
    <div style={{ background: "#f5f0e8", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Courier New', Courier, monospace" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Receipt paper */}
        <div style={{
          background: "#fefcf8",
          boxShadow: "0 2px 12px rgba(0,0,0,0.1), 0 20px 40px rgba(0,0,0,0.06)",
          padding: "28px 24px",
          position: "relative",
          borderRadius: "2px 2px 4px 4px",
        }}>
          {/* Torn edge top */}
          <div style={{
            position: "absolute", top: -6, left: 0, right: 0, height: 12,
            background: "repeating-linear-gradient(90deg, #f5f0e8 0px, #f5f0e8 10px, #fefcf8 10px, #fefcf8 20px)",
          }} />

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 20, paddingBottom: 16, borderBottom: "1px dashed #d4c9b0" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff", margin: "0 auto 10px" }}>GB</div>
            <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#78716c" }}>BPC-157 Summer GB</p>
            <p style={{ margin: 0, fontSize: 10, color: "#a8a29e", letterSpacing: "0.05em" }}>Group Buy Order</p>
          </div>

          {/* Order meta */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: "#a8a29e", letterSpacing: "0.05em" }}>ORDER NO.</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#57534e" }}>#2845</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: "#a8a29e", letterSpacing: "0.05em" }}>DATE</span>
            <span style={{ fontSize: 10, color: "#57534e" }}>18 APR 2026</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, paddingBottom: 16, borderBottom: "1px dashed #d4c9b0" }}>
            <span style={{ fontSize: 10, color: "#a8a29e", letterSpacing: "0.05em" }}>DELIVERY</span>
            <span style={{ fontSize: 10, color: "#57534e" }}>ROYAL MAIL</span>
          </div>

          {/* Items */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: "#44403c" }}>BPC-157 5mg <span style={{ color: "#a8a29e" }}>x2</span></span>
              <span style={{ fontSize: 11, color: "#44403c" }}>£10.00</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: "#44403c" }}>Shipping</span>
              <span style={{ fontSize: 11, color: "#44403c" }}>£2.00</span>
            </div>
          </div>

          {/* Total */}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, marginBottom: 16, borderTop: "2px solid #d4c9b0" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#292524", letterSpacing: "0.1em", textTransform: "uppercase" }}>Total</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#292524" }}>£12.00</span>
          </div>

          {/* Status stamp */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <div style={{
              display: "inline-block", padding: "6px 20px", borderRadius: 4,
              border: "2px solid #3b82f6", color: "#3b82f6",
              fontSize: 13, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
              transform: "rotate(-2deg)",
              background: "transparent",
            }}>Submitted</div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: "center", paddingTop: 14, borderTop: "1px dashed #d4c9b0" }}>
            <p style={{ margin: "0 0 4px", fontSize: 10, color: "#a8a29e", letterSpacing: "0.05em" }}>Thank you for your order.</p>
            <p style={{ margin: 0, fontSize: 10, color: "#c8bfb0", letterSpacing: "0.03em" }}>Peps Anonymous · pepsanonymous.com</p>
          </div>

          {/* Torn edge bottom */}
          <div style={{
            position: "absolute", bottom: -6, left: 0, right: 0, height: 12,
            background: "repeating-linear-gradient(90deg, #f5f0e8 0px, #f5f0e8 10px, #fefcf8 10px, #fefcf8 20px)",
          }} />
        </div>
      </div>
    </div>
  );
}
