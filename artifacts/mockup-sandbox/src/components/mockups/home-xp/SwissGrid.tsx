import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ArrowRight, MessageCircle, User } from "lucide-react";

export function SwissGrid() {
  return (
    <div style={{ width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column", background: "#FFFFFF", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>

      {/* NAV — Swiss horizontal rule */}
      <div style={{ borderBottom: "3px solid #E30613", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#000", letterSpacing: "-0.03em", textTransform: "uppercase" }}>Salt &amp; Peps</span>
          <div style={{ width: "1px", height: "16px", background: "#000", opacity: 0.2 }} />
          <span style={{ fontSize: "10px", fontWeight: 400, color: "#666", letterSpacing: "0.1em", textTransform: "uppercase" }}>Peptide Buys</span>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button onClick={() => {}} style={{ background: "transparent", border: "1px solid #000", color: "#000", fontWeight: 400, fontSize: "11px", padding: "5px 12px", cursor: "pointer", letterSpacing: "0.05em", textTransform: "uppercase" }}>Login</button>
          <span style={{ background: "#E30613", color: "white", fontWeight: 700, fontSize: "11px", padding: "5px 10px", letterSpacing: "0.05em" }}>USD</span>
        </div>
      </div>

      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>

        {/* HEADLINE BLOCK — full width, black bg */}
        <div style={{ background: "#000", padding: "28px 20px 24px" }}>
          <div style={{ fontSize: "10px", fontWeight: 400, letterSpacing: "0.2em", textTransform: "uppercase", color: "#666", marginBottom: "10px" }}>126+ Products · Group Buy</div>
          <h1 style={{ fontSize: "48px", fontWeight: 700, color: "white", lineHeight: 0.92, letterSpacing: "-0.04em", textTransform: "uppercase", margin: 0 }}>Quality<br />Tested.</h1>
          <div style={{ width: "40px", height: "4px", background: "#E30613", marginTop: "16px" }} />
        </div>

        {/* GRID SECTION */}
        <div style={{ padding: "20px" }}>

          {/* Primary CTA — red background */}
          <button onClick={() => {}} style={{ width: "100%", background: "#E30613", color: "white", border: "none", padding: "20px", display: "flex", alignItems: "flex-start", flexDirection: "column", gap: "10px", cursor: "pointer", textAlign: "left", marginBottom: "2px" }}>
            <div style={{ fontSize: "10px", fontWeight: 400, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>Primary Action</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "white", letterSpacing: "-0.02em", textTransform: "uppercase", lineHeight: 1 }}>Group Buy Login</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)", fontWeight: 300 }}>Browse products and submit your order</div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "13px", color: "white", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <Users style={{ width: "14px", height: "14px" }} /> Enter <ArrowRight style={{ width: "14px", height: "14px" }} />
            </div>
          </button>

          {/* Divider */}
          <div style={{ height: "2px", background: "#000", margin: "16px 0" }} />

          {/* Two column grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px", marginBottom: "16px" }}>
            {/* Lonely Vial */}
            <button onClick={() => {}} style={{ background: "#F5F5F5", border: "none", padding: "16px", cursor: "pointer", textAlign: "left" }}>
              <div style={{ fontSize: "9px", fontWeight: 400, letterSpacing: "0.2em", textTransform: "uppercase", color: "#999", marginBottom: "6px" }}>Single Vials</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#000", textTransform: "uppercase", letterSpacing: "-0.01em", lineHeight: 1.1 }}>Lonely<br />Vial</div>
              <div style={{ fontSize: "10px", color: "#666", marginTop: "6px", fontWeight: 300 }}>No min · USDT</div>
              <div style={{ color: "#E30613", fontSize: "12px", fontWeight: 700, marginTop: "10px", display: "flex", alignItems: "center", gap: "3px", textTransform: "uppercase" }}>Shop <ArrowRight style={{ width: "10px", height: "10px" }} /></div>
            </button>
            {/* Manage order */}
            <button onClick={() => {}} style={{ background: "#F5F5F5", border: "none", padding: "16px", cursor: "pointer", textAlign: "left" }}>
              <div style={{ fontSize: "9px", fontWeight: 400, letterSpacing: "0.2em", textTransform: "uppercase", color: "#999", marginBottom: "6px" }}>Returning</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#000", textTransform: "uppercase", letterSpacing: "-0.01em", lineHeight: 1.1 }}>Manage<br />Order</div>
              <div style={{ fontSize: "10px", color: "#666", marginTop: "6px", fontWeight: 300 }}>Track · Edit · Pay</div>
              <div style={{ color: "#E30613", fontSize: "12px", fontWeight: 700, marginTop: "10px", display: "flex", alignItems: "center", gap: "3px", textTransform: "uppercase" }}>Open <ArrowRight style={{ width: "10px", height: "10px" }} /></div>
            </button>
          </div>

          {/* Thin horizontal rule */}
          <div style={{ height: "1px", background: "#E5E5E5", margin: "0 0 12px" }} />

          {/* Tool list — minimal */}
          {[
            { icon: TestTube, label: "Lab Reports", sub: "352+ independent CoA tests" },
            { icon: ShieldCheck, label: "Safety Calculator", sub: "Endotoxin & BAC water safety" },
          ].map(({ icon: Icon, label, sub }, i, arr) => (
            <button key={label} onClick={() => {}} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", background: "transparent", border: "none", textAlign: "left", cursor: "pointer", borderBottom: i < arr.length - 1 ? "1px solid #E5E5E5" : "none" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#000", textTransform: "uppercase", letterSpacing: "0.02em" }}>{label}</div>
                <div style={{ fontSize: "10px", color: "#999", fontWeight: 300, marginTop: "2px" }}>{sub}</div>
              </div>
              <ArrowRight style={{ width: "14px", height: "14px", color: "#E30613" }} />
            </button>
          ))}

          {/* Footer */}
          <div style={{ borderTop: "2px solid #000", marginTop: "16px", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", fontWeight: 600, color: "#2AABEE", textDecoration: "none", letterSpacing: "0.02em" }}>@urbanblend789</a>
            <span style={{ fontSize: "10px", color: "#999", letterSpacing: "0.05em", textTransform: "uppercase" }}>USDT · ETH</span>
          </div>
        </div>
      </main>
    </div>
  );
}
