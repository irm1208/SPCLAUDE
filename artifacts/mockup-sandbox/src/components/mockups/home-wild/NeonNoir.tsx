import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ArrowRight, MessageCircle, User } from "lucide-react";

export function NeonNoir() {
  return (
    <div className="w-full min-h-screen flex flex-col" style={{ background: "#06080F", fontFamily: "'Courier New', Courier, monospace" }}>

      {/* NAV */}
      <div style={{ background: "#06080F", borderBottom: "1px solid #00FFFF22", padding: "0 16px", height: "48px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "#00FFFF", fontWeight: 700, fontSize: "13px", letterSpacing: "0.2em", textTransform: "uppercase", textShadow: "0 0 8px #00FFFF88" }}>SALT_PEPS</span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => {}} style={{ background: "transparent", color: "#00FFFF", border: "1px solid #00FFFF44", fontSize: "10px", padding: "5px 10px", cursor: "pointer", letterSpacing: "0.1em", textShadow: "0 0 6px #00FFFF66" }}>LOGIN</button>
          <span style={{ background: "#00FFFF", color: "#06080F", fontSize: "10px", fontWeight: 700, padding: "5px 8px", letterSpacing: "0.05em" }}>USD</span>
        </div>
      </div>

      <main style={{ flex: 1, padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* System header */}
        <div>
          <div style={{ color: "#00FFFF", fontSize: "10px", letterSpacing: "0.25em", textTransform: "uppercase", opacity: 0.6, marginBottom: "6px" }}>{'>'} SYSTEM_ONLINE · v4.1.2</div>
          <h1 style={{ color: "white", fontSize: "32px", fontWeight: 700, lineHeight: 1, margin: 0, letterSpacing: "-0.02em" }}>PEPS<br /><span style={{ color: "#00FFFF", textShadow: "0 0 20px #00FFFF" }}>ANON</span></h1>
          <div style={{ color: "#6B7280", fontSize: "11px", marginTop: "6px", letterSpacing: "0.05em" }}>PEPTIDE_GROUP_BUYS · QUALITY_TESTED</div>
        </div>

        {/* PRIMARY — Group Buy */}
        <button onClick={() => {}} style={{ background: "transparent", border: "1px solid #00FFFF55", padding: "20px", display: "flex", flexDirection: "column", gap: "12px", cursor: "pointer", textAlign: "left", position: "relative", width: "100%", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, transparent, #00FFFF, transparent)" }} />
          <div style={{ color: "#00FFFF", fontSize: "9px", letterSpacing: "0.3em", textTransform: "uppercase", textShadow: "0 0 8px #00FFFF" }}>PRIMARY_ACTION</div>
          <div>
            <div style={{ color: "white", fontSize: "22px", fontWeight: 700, letterSpacing: "-0.01em" }}>GROUP_BUY_LOGIN</div>
            <div style={{ color: "#6B7280", fontSize: "11px", marginTop: "4px", letterSpacing: "0.03em" }}>{'>'} 126 products · kit_orders.exe</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#00FFFF", padding: "10px 16px", width: "fit-content" }}>
            <Users style={{ width: "14px", height: "14px", color: "#06080F" }} />
            <span style={{ color: "#06080F", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em" }}>EXECUTE</span>
            <ArrowRight style={{ width: "14px", height: "14px", color: "#06080F" }} />
          </div>
        </button>

        {/* SECONDARY — Lonely Vial */}
        <button onClick={() => {}} style={{ background: "transparent", border: "1px solid #FF00FF44", padding: "16px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", width: "100%", textAlign: "left" }}>
          <div style={{ position: "relative" }}>
            <div style={{ width: "40px", height: "40px", border: "1px solid #FF00FF66", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FlaskConical style={{ width: "20px", height: "20px", color: "#FF00FF", filter: "drop-shadow(0 0 6px #FF00FF)" }} />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#FF00FF", fontSize: "9px", letterSpacing: "0.3em", textTransform: "uppercase", textShadow: "0 0 6px #FF00FF88" }}>SECONDARY</div>
            <div style={{ color: "white", fontSize: "16px", fontWeight: 700, marginTop: "2px" }}>LONELY_VIAL</div>
            <div style={{ color: "#6B7280", fontSize: "10px" }}>{'>'} single_units · no_min · USDT</div>
          </div>
          <ArrowRight style={{ width: "16px", height: "16px", color: "#FF00FF" }} />
        </button>

        {/* UTILITY list */}
        <div style={{ border: "1px solid #1F2937", padding: "4px 0" }}>
          <div style={{ color: "#374151", fontSize: "9px", letterSpacing: "0.25em", padding: "8px 16px 4px", textTransform: "uppercase" }}>UTILITY_MODULES</div>
          {[
            { icon: Search, color: "#FBBF24", label: "MANAGE_ORDER", sub: "track · edit · pay · qr_upload" },
            { icon: TestTube, color: "#22D3EE", label: "LAB_REPORTS", sub: "janoshik_coa · 352+ tests" },
            { icon: ShieldCheck, color: "#4ADE80", label: "SAFETY_CALC", sub: "endotoxin · bac_water" },
          ].map(({ icon: Icon, color, label, sub }, i, arr) => (
            <button key={label} onClick={() => {}} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px", width: "100%", textAlign: "left", background: "transparent", border: "none", borderBottom: i < arr.length - 1 ? "1px solid #111827" : "none", cursor: "pointer" }}>
              <Icon style={{ width: "14px", height: "14px", color, flexShrink: 0, filter: `drop-shadow(0 0 4px ${color}88)` }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: "white", fontSize: "12px", fontWeight: 600 }}>{label}</div>
                <div style={{ color: "#4B5563", fontSize: "10px", marginTop: "2px" }}>{sub}</div>
              </div>
              <span style={{ color, fontSize: "10px" }}>→</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" style={{ color: "#2AABEE", fontSize: "11px", fontWeight: 600, textDecoration: "none", letterSpacing: "0.05em" }}>@URBANBLEND789</a>
          <span style={{ color: "#1F2937", fontSize: "9px", letterSpacing: "0.1em" }}>USDT_ETHEREUM</span>
        </div>
      </main>
    </div>
  );
}
