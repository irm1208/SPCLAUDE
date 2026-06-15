import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ArrowRight, MessageCircle } from "lucide-react";

export function Brutalist() {
  return (
    <div className="w-full min-h-screen flex flex-col" style={{ background: "#F2F200", fontFamily: "'Arial Black', 'Arial Bold', Gadget, sans-serif" }}>

      {/* NAV */}
      <div style={{ background: "#000", borderBottom: "3px solid #000", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "#F2F200", fontWeight: 900, fontSize: "14px", letterSpacing: "-0.02em", textTransform: "uppercase" }}>SALT &amp; PEPS</span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => {}} style={{ background: "#F2F200", color: "#000", border: "none", fontWeight: 900, fontSize: "11px", padding: "6px 10px", cursor: "pointer", textTransform: "uppercase" }}>LOGIN</button>
          <button onClick={() => {}} style={{ background: "white", color: "#000", border: "none", fontWeight: 900, fontSize: "11px", padding: "6px 10px", cursor: "pointer" }}>USD</button>
        </div>
      </div>

      <main style={{ flex: 1, padding: "20px 16px", display: "flex", flexDirection: "column", gap: "0" }}>

        {/* Headline */}
        <div style={{ borderBottom: "3px solid #000", paddingBottom: "16px", marginBottom: "16px" }}>
          <div style={{ fontSize: "13px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#000", marginBottom: "4px" }}>PEPTIDE GROUP BUYS</div>
          <h1 style={{ fontSize: "48px", fontWeight: 900, lineHeight: "0.9", textTransform: "uppercase", color: "#000", margin: 0 }}>QUALITY<br />TESTED.<br />SHIPPED.</h1>
        </div>

        {/* PRIMARY CTA */}
        <button onClick={() => {}} style={{ background: "#000", color: "#F2F200", border: "3px solid #000", padding: "20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", cursor: "pointer", width: "100%" }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "10px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: "#F2F200", opacity: 0.6, marginBottom: "4px" }}>PRIMARY</div>
            <div style={{ fontSize: "22px", fontWeight: 900, textTransform: "uppercase", lineHeight: 1 }}>GROUP BUY LOGIN</div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#F2F200", opacity: 0.7, marginTop: "4px" }}>126+ PRODUCTS → KIT ORDERS</div>
          </div>
          <ArrowRight style={{ width: "28px", height: "28px", color: "#F2F200" }} />
        </button>

        {/* SECONDARY CTA */}
        <button onClick={() => {}} style={{ background: "white", color: "#000", border: "3px solid #000", padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", cursor: "pointer", width: "100%" }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "10px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.5, marginBottom: "4px" }}>SINGLE VIALS</div>
            <div style={{ fontSize: "20px", fontWeight: 900, textTransform: "uppercase", lineHeight: 1 }}>THE LONELY VIAL</div>
            <div style={{ fontSize: "11px", fontWeight: 700, opacity: 0.6, marginTop: "4px" }}>NO MINIMUMS · PAY USDT</div>
          </div>
          <ArrowRight style={{ width: "24px", height: "24px" }} />
        </button>

        {/* TOOL STRIP */}
        <div style={{ borderTop: "3px solid #000", borderBottom: "3px solid #000", padding: "12px 0", marginBottom: "8px", display: "flex", flexDirection: "column", gap: "0" }}>
          {[
            { label: "MANAGE YOUR ORDER", sub: "TRACK · EDIT · PAY" },
            { label: "LAB REPORTS", sub: "352+ COA TESTS" },
            { label: "SAFETY CALCULATOR", sub: "ENDOTOXIN · BAC" },
          ].map(({ label, sub }, i, arr) => (
            <button key={label} onClick={() => {}} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < arr.length - 1 ? "2px solid #000" : "none", background: "transparent", border: i < arr.length - 1 ? undefined : "none", borderTop: "none", borderLeft: "none", borderRight: "none", cursor: "pointer", width: "100%" }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "13px", fontWeight: 900, textTransform: "uppercase", color: "#000" }}>{label}</div>
                <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#000", opacity: 0.5, marginTop: "2px" }}>{sub}</div>
              </div>
              <ArrowRight style={{ width: "16px", height: "16px", color: "#000" }} />
            </button>
          ))}
        </div>

        {/* FOOTER */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px" }}>
          <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", fontWeight: 900, color: "#000", textDecoration: "none", textTransform: "uppercase" }}>@URBANBLEND789</a>
          <span style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#000", opacity: 0.6 }}>USDT · ETH</span>
        </div>
      </main>
    </div>
  );
}
