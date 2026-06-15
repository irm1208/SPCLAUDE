import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ArrowRight, MessageCircle, User, ChevronRight } from "lucide-react";

export function AppleMinimal() {
  return (
    <div style={{ width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column", background: "#FFFFFF", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" }}>

      {/* NAV — ultra minimal */}
      <div style={{ padding: "16px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10, borderBottom: "0.5px solid rgba(0,0,0,0.1)" }}>
        <span style={{ fontSize: "17px", fontWeight: 600, color: "#1D1D1F", letterSpacing: "-0.02em" }}>Salt &amp; Peps</span>
        <button onClick={() => {}} style={{ background: "transparent", border: "none", color: "#0071E3", fontSize: "15px", fontWeight: 400, cursor: "pointer", padding: 0 }}>Login</button>
      </div>

      <main style={{ flex: 1, padding: "0 0 32px" }}>

        {/* Large headline */}
        <div style={{ padding: "40px 20px 32px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#0071E3", letterSpacing: "0.02em", marginBottom: "8px" }}>Peptide Group Buys</div>
          <h1 style={{ fontSize: "40px", fontWeight: 700, color: "#1D1D1F", lineHeight: 1.05, letterSpacing: "-0.03em", margin: 0 }}>Quality<br />tested.</h1>
          <p style={{ fontSize: "17px", color: "#6E6E73", marginTop: "12px", lineHeight: 1.5, fontWeight: 400, letterSpacing: "-0.01em" }}>Discreetly shipped. 126+ products, group buy pricing.</p>
        </div>

        {/* PRIMARY — full bleed blue */}
        <div style={{ margin: "0 20px 12px", background: "#0071E3", borderRadius: "18px", padding: "28px 24px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: "0.02em", marginBottom: "6px" }}>New Customer</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "white", letterSpacing: "-0.02em", lineHeight: 1.1 }}>Place an order</div>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.75)", marginTop: "8px", lineHeight: 1.5 }}>Browse and submit for the next group buy.</p>
          <button onClick={() => {}} style={{ marginTop: "20px", background: "white", color: "#0071E3", border: "none", borderRadius: "980px", padding: "12px 24px", fontSize: "15px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", letterSpacing: "-0.01em" }}>
            <Users style={{ width: "16px", height: "16px" }} /> Group Buy Login
          </button>
        </div>

        {/* List — separated items, no card backgrounds */}
        <div style={{ margin: "20px 0 0" }}>
          {[
            { icon: FlaskConical, label: "The Lonely Vial", sub: "Individual vials, no minimums", color: "#5E5CE6" },
            { icon: Search, label: "Manage your order", sub: "Track, edit, pay, upload QR", color: "#FF9500" },
            { icon: TestTube, label: "Lab Reports", sub: "352+ independent CoA tests", color: "#32ADE6" },
            { icon: ShieldCheck, label: "Safety Calculator", sub: "Endotoxin & BAC water safety", color: "#34C759" },
          ].map(({ icon: Icon, label, sub, color }, i, arr) => (
            <button key={label} onClick={() => {}} style={{ width: "100%", display: "flex", alignItems: "center", gap: "14px", padding: "14px 20px", background: "transparent", border: "none", textAlign: "left", cursor: "pointer", borderBottom: i < arr.length - 1 ? "0.5px solid rgba(0,0,0,0.1)" : "none" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon style={{ width: "20px", height: "20px", color }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "16px", fontWeight: 500, color: "#1D1D1F", letterSpacing: "-0.01em" }}>{label}</div>
                <div style={{ fontSize: "13px", color: "#6E6E73", marginTop: "2px" }}>{sub}</div>
              </div>
              <ChevronRight style={{ width: "18px", height: "18px", color: "#C7C7CC", flexShrink: 0 }} />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "24px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "13px", fontWeight: 500, color: "#0071E3", textDecoration: "none" }}><MessageCircle style={{ width: "14px", height: "14px" }} /> @urbanblend789</a>
          <span style={{ fontSize: "12px", color: "#6E6E73" }}>USDT · Ethereum</span>
        </div>
      </main>
    </div>
  );
}
