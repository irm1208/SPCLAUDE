import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ArrowRight, MessageCircle, User, Zap } from "lucide-react";

export function SportsBold() {
  return (
    <div className="w-full min-h-screen flex flex-col" style={{ background: "#F8FAFF", fontFamily: "'Arial Black', 'Arial Bold', Impact, sans-serif" }}>

      {/* NAV */}
      <div style={{ background: "white", borderBottom: "1px solid #E5E7EB", padding: "0 16px", height: "52px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "28px", height: "28px", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap style={{ width: "16px", height: "16px", color: "white" }} />
          </div>
          <span style={{ fontWeight: 900, fontSize: "14px", color: "#0F172A", letterSpacing: "-0.03em", textTransform: "uppercase" }}>SALT &amp; PEPS</span>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={() => {}} style={{ background: "#F1F5F9", color: "#374151", border: "none", borderRadius: "8px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: "11px", padding: "6px 10px", cursor: "pointer" }}>Login</button>
          <span style={{ background: "#1E40AF", color: "white", borderRadius: "8px", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: "11px", padding: "5px 9px" }}>USD</span>
        </div>
      </div>

      {/* STATS STRIP */}
      <div style={{ background: "#0F172A", padding: "10px 16px", display: "flex", gap: "0", justifyContent: "space-around" }}>
        {[["126+", "PRODUCTS"], ["352+", "COA TESTS"], ["100%", "VERIFIED"]].map(([num, label]) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "18px", fontWeight: 900, color: "#3B82F6", lineHeight: 1, letterSpacing: "-0.02em" }}>{num}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "8px", fontWeight: 700, color: "#64748B", letterSpacing: "0.12em", marginTop: "2px" }}>{label}</div>
          </div>
        ))}
      </div>

      <main style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>

        {/* PRIMARY — Group Buy: diagonal accent */}
        <button onClick={() => {}} style={{ background: "linear-gradient(135deg, #1E3A8A 0%, #2563EB 60%, #3B82F6 100%)", borderRadius: "16px", border: "none", padding: "0", display: "block", cursor: "pointer", width: "100%", textAlign: "left", overflow: "hidden", position: "relative", minHeight: "185px" }}>
          {/* Diagonal accent shape */}
          <div style={{ position: "absolute", top: 0, right: 0, width: "60%", height: "100%", background: "rgba(255,255,255,0.07)", clipPath: "polygon(30% 0, 100% 0, 100% 100%, 0% 100%)" }} />
          <div style={{ padding: "20px", position: "relative", zIndex: 1 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.65)", marginBottom: "8px" }}>🔥 GROUP BUYS — PRIMARY</div>
            <div style={{ fontSize: "30px", fontWeight: 900, color: "white", lineHeight: 1, letterSpacing: "-0.03em", textTransform: "uppercase" }}>PLACE<br />AN ORDER</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.65)", marginTop: "8px" }}>Browse 126+ products · group pricing</div>
            <button onClick={(e) => { e.stopPropagation(); }} style={{ marginTop: "14px", background: "white", color: "#1E3A8A", border: "none", borderRadius: "10px", padding: "10px 18px", fontWeight: 900, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", letterSpacing: "-0.01em" }}>
              <Users style={{ width: "15px", height: "15px" }} /> GROUP BUY LOGIN <ArrowRight style={{ width: "15px", height: "15px" }} />
            </button>
          </div>
        </button>

        {/* SECONDARY — Lonely Vial + Manage side by side */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => {}} style={{ flex: 3, background: "linear-gradient(135deg, #4C1D95, #6D28D9)", borderRadius: "14px", border: "none", padding: "16px", cursor: "pointer", textAlign: "left", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, right: 0, width: "60%", height: "100%", background: "rgba(255,255,255,0.05)", clipPath: "polygon(40% 0, 100% 0, 100% 100%, 10% 100%)" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <FlaskConical style={{ width: "22px", height: "22px", color: "#C4B5FD", marginBottom: "8px" }} />
              <div style={{ fontSize: "16px", fontWeight: 900, color: "white", textTransform: "uppercase", letterSpacing: "-0.02em" }}>LONELY<br />VIAL</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>No min · USDT</div>
              <div style={{ fontFamily: "Inter, sans-serif", marginTop: "10px", background: "rgba(255,255,255,0.15)", padding: "6px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, color: "white", display: "inline-block" }}>SHOP →</div>
            </div>
          </button>
          <button onClick={() => {}} style={{ flex: 2, background: "white", borderRadius: "14px", border: "1.5px solid #E2E8F0", padding: "16px", cursor: "pointer", textAlign: "left" }}>
            <Search style={{ width: "20px", height: "20px", color: "#F59E0B", marginBottom: "8px" }} />
            <div style={{ fontSize: "14px", fontWeight: 900, color: "#0F172A", textTransform: "uppercase", letterSpacing: "-0.02em" }}>MY<br />ORDER</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#64748B", marginTop: "4px" }}>Track &amp; edit</div>
            <ArrowRight style={{ width: "14px", height: "14px", color: "#94A3B8", marginTop: "10px" }} />
          </button>
        </div>

        {/* TOOL STRIP — horizontal scroll chips */}
        <div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.2em", color: "#64748B", textTransform: "uppercase", marginBottom: "8px" }}>TOOLS &amp; LAB</div>
          <div style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
            {[
              { icon: TestTube, label: "Lab Reports", color: "#0EA5E9", bg: "#EFF6FF" },
              { icon: ShieldCheck, label: "Safety Calc", color: "#10B981", bg: "#F0FDF4" },
            ].map(({ icon: Icon, label, color, bg }) => (
              <button key={label} onClick={() => {}} style={{ background: bg, border: "none", borderRadius: "12px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", flexShrink: 0 }}>
                <Icon style={{ width: "16px", height: "16px", color }} />
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 700, color: "#0F172A", whiteSpace: "nowrap" }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
          <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "5px", fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#2AABEE", textDecoration: "none" }}><MessageCircle style={{ width: "13px", height: "13px" }} /> @urbanblend789</a>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#94A3B8" }}>Pay with USDT · Ethereum</span>
        </div>
      </main>
    </div>
  );
}
