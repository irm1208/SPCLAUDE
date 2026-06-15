import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, Bell, ChevronRight, ArrowRight, Package } from "lucide-react";

export function OrderDashboard() {
  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#F2F4F7", fontFamily: "Inter, 'Helvetica Neue', sans-serif", display: "flex", flexDirection: "column" }}>

      {/* NAV */}
      <div style={{ background: "white", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>Welcome back</div>
          <div style={{ fontSize: "17px", fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>Salt &amp; Peps</div>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button onClick={() => {}} style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#F3F4F6", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Bell style={{ width: "16px", height: "16px", color: "#374151" }} />
          </button>
          <button onClick={() => {}} style={{ background: "#111827", color: "white", border: "none", borderRadius: "20px", fontWeight: 600, fontSize: "12px", padding: "7px 14px", cursor: "pointer" }}>Login</button>
        </div>
      </div>

      <main style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* "Balance card" — order summary */}
        <div style={{ background: "linear-gradient(135deg, #111827 0%, #1F2937 100%)", borderRadius: "24px", padding: "24px 20px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "160px", height: "160px", borderRadius: "50%", background: "rgba(163,230,53,0.08)" }} />
          <div style={{ position: "absolute", bottom: "-30px", left: "30px", width: "100px", height: "100px", borderRadius: "50%", background: "rgba(163,230,53,0.05)" }} />
          <div style={{ fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em", marginBottom: "6px" }}>CURRENT ROUND</div>
          <div style={{ fontSize: "38px", fontWeight: 800, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>Group Buy #12</div>
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", marginTop: "6px" }}>126 products available · Closes in 5 days</div>

          <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: "14px", padding: "12px 14px" }}>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)", marginBottom: "4px" }}>Orders placed</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#A3E635", letterSpacing: "-0.02em" }}>847</div>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: "14px", padding: "12px 14px" }}>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)", marginBottom: "4px" }}>Avg order</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#A3E635", letterSpacing: "-0.02em" }}>$210</div>
            </div>
          </div>

          <button onClick={() => {}} style={{ marginTop: "16px", width: "100%", background: "#A3E635", color: "#111827", border: "none", borderRadius: "14px", padding: "14px", fontSize: "14px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <Users style={{ width: "16px", height: "16px" }} /> Group Buy Login
          </button>
        </div>

        {/* Quick actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {[
            { icon: FlaskConical, label: "Lonely Vial", sub: "Single units", color: "#7C3AED", bg: "white" },
            { icon: Search, label: "My Order", sub: "Track & edit", color: "#D97706", bg: "white" },
          ].map(({ icon: Icon, label, sub, color, bg }) => (
            <button key={label} onClick={() => {}} style={{ background: bg, borderRadius: "18px", border: "none", padding: "16px", display: "flex", flexDirection: "column", gap: "8px", cursor: "pointer", textAlign: "left", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon style={{ width: "18px", height: "18px", color }} />
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>{label}</div>
              <div style={{ fontSize: "11px", color: "#6B7280" }}>{sub}</div>
            </button>
          ))}
        </div>

        {/* List — tools */}
        <div style={{ background: "white", borderRadius: "18px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ padding: "14px 16px 4px", fontSize: "13px", fontWeight: 700, color: "#374151" }}>Tools</div>
          {[
            { icon: TestTube, label: "Lab Reports", sub: "352+ CoA tests", color: "#0891B2" },
            { icon: ShieldCheck, label: "Safety Calculator", sub: "Endotoxin & BAC water", color: "#059669" },
          ].map(({ icon: Icon, label, sub, color }, i, arr) => (
            <button key={label} onClick={() => {}} style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "13px 16px", background: "transparent", border: "none", textAlign: "left", cursor: "pointer", borderBottom: i < arr.length - 1 ? "1px solid #F3F4F6" : "none" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon style={{ width: "17px", height: "17px", color }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{label}</div>
                <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "1px" }}>{sub}</div>
              </div>
              <ChevronRight style={{ width: "16px", height: "16px", color: "#D1D5DB" }} />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", paddingBottom: "4px" }}>
          <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", fontWeight: 600, color: "#2AABEE", textDecoration: "none" }}>@urbanblend789 · USDT · Ethereum</a>
        </div>
      </main>
    </div>
  );
}
