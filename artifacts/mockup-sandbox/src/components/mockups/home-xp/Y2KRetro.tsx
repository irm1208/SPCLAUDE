import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ArrowRight, MessageCircle, User, Star, Zap } from "lucide-react";

export function Y2KRetro() {
  return (
    <div style={{ width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column", background: "linear-gradient(135deg, #FF006E 0%, #FB5607 20%, #FFBE0B 40%, #3A86FF 65%, #8338EC 100%)", fontFamily: "'Arial Black', Impact, 'Arial Bold', sans-serif" }}>

      {/* NAV */}
      <div style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "2px solid rgba(255,255,255,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Zap style={{ width: "16px", height: "16px", color: "#FFBE0B" }} />
          <span style={{ color: "white", fontWeight: 900, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.05em", textShadow: "2px 2px 0 #FF006E" }}>SALT &amp; PEPS</span>
          <Star style={{ width: "10px", height: "10px", color: "#FFBE0B", fill: "#FFBE0B" }} />
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={() => {}} style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "2px solid white", fontWeight: 900, fontSize: "10px", padding: "4px 10px", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}>LOGIN</button>
          <span style={{ background: "#FFBE0B", color: "#000", fontWeight: 900, fontSize: "10px", padding: "4px 8px", textTransform: "uppercase" }}>USD</span>
        </div>
      </div>

      <main style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>

        {/* Header — outlined text */}
        <div style={{ padding: "8px 0" }}>
          <div style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", color: "white", letterSpacing: "0.3em", textShadow: "1px 1px 0 rgba(0,0,0,0.5)", marginBottom: "4px" }}>⚡ PEPTIDE GROUP BUYS ⚡</div>
          <h1 style={{ fontSize: "44px", fontWeight: 900, color: "transparent", WebkitTextStroke: "3px white", textShadow: "4px 4px 0 rgba(0,0,0,0.3)", lineHeight: 0.9, textTransform: "uppercase", margin: 0 }}>SALT<br />&amp; PEPS</h1>
          <div style={{ fontSize: "11px", fontWeight: 900, color: "#FFBE0B", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "8px", textShadow: "1px 1px 0 rgba(0,0,0,0.5)" }}>★ QUALITY TESTED · SHIPPED ★</div>
        </div>

        {/* PRIMARY — Group Buy: checker pattern bg */}
        <button onClick={() => {}} style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "3px solid #FFBE0B", padding: "18px 16px", display: "flex", flexDirection: "column", gap: "10px", cursor: "pointer", textAlign: "left", width: "100%", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "-15px", right: "-15px", width: "80px", height: "80px", borderRadius: "50%", background: "radial-gradient(circle, #FFBE0B44, transparent)" }} />
          <div style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.3em", color: "#FFBE0B" }}>★ PRIMARY ACTION ★</div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "white", textTransform: "uppercase", lineHeight: 0.95, textShadow: "2px 2px 0 #FFBE0B" }}>GROUP<br />BUY<br />LOGIN</div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", fontFamily: "Arial, sans-serif", fontWeight: 600 }}>126+ products · kit ordering · discreet</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#FFBE0B", padding: "10px 14px", width: "fit-content", marginTop: "4px" }}>
            <Users style={{ width: "14px", height: "14px", color: "#000" }} />
            <span style={{ color: "#000", fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" }}>ENTER NOW</span>
          </div>
        </button>

        {/* Two secondary cards side by side */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => {}} style={{ flex: 1, background: "rgba(131,56,236,0.6)", backdropFilter: "blur(8px)", border: "2px solid #8338EC", padding: "14px 12px", cursor: "pointer", textAlign: "left" }}>
            <FlaskConical style={{ width: "20px", height: "20px", color: "#FFBE0B", marginBottom: "8px" }} />
            <div style={{ fontSize: "13px", fontWeight: 900, color: "white", textTransform: "uppercase", lineHeight: 1.1 }}>LONELY<br />VIAL</div>
            <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.65)", fontFamily: "Arial", marginTop: "4px" }}>SINGLE UNITS · USDT</div>
            <div style={{ marginTop: "8px", fontSize: "10px", fontWeight: 900, color: "#FFBE0B" }}>SHOP →</div>
          </button>
          <button onClick={() => {}} style={{ flex: 1, background: "rgba(255,0,110,0.4)", backdropFilter: "blur(8px)", border: "2px solid #FF006E", padding: "14px 12px", cursor: "pointer", textAlign: "left" }}>
            <Search style={{ width: "20px", height: "20px", color: "#FFBE0B", marginBottom: "8px" }} />
            <div style={{ fontSize: "13px", fontWeight: 900, color: "white", textTransform: "uppercase", lineHeight: 1.1 }}>MY<br />ORDER</div>
            <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.65)", fontFamily: "Arial", marginTop: "4px" }}>TRACK · EDIT · PAY</div>
            <div style={{ marginTop: "8px", fontSize: "10px", fontWeight: 900, color: "#FFBE0B" }}>OPEN →</div>
          </button>
        </div>

        {/* Tool pills */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { icon: TestTube, label: "LAB REPORTS", color: "#3A86FF" },
            { icon: ShieldCheck, label: "SAFETY CALC", color: "#06D6A0" },
          ].map(({ icon: Icon, label, color }) => (
            <button key={label} onClick={() => {}} style={{ background: "rgba(0,0,0,0.35)", border: `2px solid ${color}`, padding: "8px 12px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <Icon style={{ width: "13px", height: "13px", color }} />
              <span style={{ fontSize: "10px", fontWeight: 900, color: "white", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", fontWeight: 900, color: "#FFBE0B", textDecoration: "none", textShadow: "1px 1px 0 rgba(0,0,0,0.5)" }}>@URBANBLEND789</a>
          <span style={{ fontSize: "9px", fontWeight: 900, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.1em" }}>USDT · ETH</span>
        </div>
      </main>
    </div>
  );
}
