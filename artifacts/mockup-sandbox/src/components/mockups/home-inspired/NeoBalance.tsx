import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, Bell, ChevronRight, ArrowRight, Eye, EyeOff, Home, Map, RefreshCcw, Settings, User } from "lucide-react";

export function NeoBalance() {
  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#F4F6F9", fontFamily: "Inter, 'Helvetica Neue', sans-serif", display: "flex", flexDirection: "column" }}>

      {/* NAV */}
      <div style={{ background: "white", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 500, color: "#6B7280" }}>Good to go,</div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>Salt &amp; Peps</div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button onClick={() => {}} style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#F3F4F6", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Bell style={{ width: "15px", height: "15px", color: "#374151" }} />
          </button>
          <button onClick={() => {}} style={{ background: "#111827", color: "white", border: "none", borderRadius: "20px", fontWeight: 700, fontSize: "12px", padding: "7px 14px", cursor: "pointer" }}>Login</button>
        </div>
      </div>

      <main style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* "Balance card" — like Neobank, but it's the current round */}
        <div style={{ background: "#111827", borderRadius: "24px", padding: "22px 20px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "-30px", right: "-30px", width: "140px", height: "140px", borderRadius: "50%", background: "rgba(163,230,53,0.07)" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>CURRENT ROUND</div>
            <button onClick={() => {}} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
              <Eye style={{ width: "16px", height: "16px", color: "rgba(255,255,255,0.35)" }} />
            </button>
          </div>

          <div style={{ fontSize: "36px", fontWeight: 800, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>Group Buy #12</div>
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "6px" }}>126 products available · closes March 31</div>

          {/* Green pill CTA — like the Neobank "Add money" */}
          <button onClick={() => {}} style={{ marginTop: "20px", width: "100%", background: "#A3E635", color: "#111827", border: "none", borderRadius: "14px", padding: "14px", fontSize: "14px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <Users style={{ width: "16px", height: "16px" }} /> Group Buy Login
          </button>
        </div>

        {/* "Your cards" — horizontal scroll, here: active kits */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>Quick actions</div>
            <button onClick={() => {}} style={{ fontSize: "12px", color: "#6B7280", background: "transparent", border: "none", cursor: "pointer" }}>See all</button>
          </div>
          <div style={{ display: "flex", gap: "10px", overflowX: "auto" }}>
            {[
              { label: "Lonely Vial", sub: "No minimums", icon: FlaskConical, bg: "#EDE9FE", color: "#7C3AED" },
              { label: "My Order", sub: "Track & pay", icon: Search, bg: "#FEF3C7", color: "#D97706" },
              { label: "Lab Reports", sub: "352+ tests", icon: TestTube, bg: "#DBEAFE", color: "#2563EB" },
            ].map(({ label, sub, icon: Icon, bg, color }) => (
              <button key={label} onClick={() => {}} style={{ background: bg, borderRadius: "20px", border: "none", padding: "16px 14px", cursor: "pointer", flexShrink: 0, width: "130px", textAlign: "left" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "10px" }}>
                  <Icon style={{ width: "18px", height: "18px", color }} />
                </div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>{label}</div>
                <div style={{ fontSize: "10px", color: "#6B7280", marginTop: "2px" }}>{sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* "Transactions" — like transaction list but for tools */}
        <div style={{ background: "white", borderRadius: "20px", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>Tools</div>
            <button onClick={() => {}} style={{ fontSize: "12px", color: "#6B7280", background: "transparent", border: "none", cursor: "pointer" }}>See all</button>
          </div>
          {[
            { icon: ShieldCheck, label: "Safety Calculator", sub: "Endotoxin & BAC water limits", value: "Free", color: "#059669" },
            { icon: TestTube, label: "Lab Reports", sub: "Janoshik CoA test results", value: "352+", color: "#2563EB" },
          ].map(({ icon: Icon, label, sub, value, color }, i, arr) => (
            <button key={label} onClick={() => {}} style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "13px 16px", background: "transparent", border: "none", textAlign: "left", cursor: "pointer", borderBottom: i < arr.length - 1 ? "1px solid #F9FAFB" : "none" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon style={{ width: "18px", height: "18px", color }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>{label}</div>
                <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "1px" }}>{sub}</div>
              </div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#A3E635" }}>{value}</div>
            </button>
          ))}
        </div>

        <div style={{ textAlign: "center" }}>
          <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", fontWeight: 600, color: "#2AABEE", textDecoration: "none" }}>@urbanblend789 · USDT · ETH</a>
        </div>
      </main>

      {/* Bottom tab bar — Neobank style */}
      <div style={{ background: "white", borderTop: "1px solid #F3F4F6", padding: "10px 0 20px", display: "flex", justifyContent: "space-around" }}>
        {[{ icon: Home, label: "Home" }, { icon: Map, label: "Map" }, { icon: RefreshCcw, label: "Transfer" }, { icon: Settings, label: "Settings" }, { icon: User, label: "Profile" }].map(({ icon: Icon, label }, i) => (
          <button key={label} onClick={() => {}} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", background: "transparent", border: "none", cursor: "pointer" }}>
            <Icon style={{ width: "20px", height: "20px", color: i === 0 ? "#A3E635" : "#9CA3AF" }} />
            <span style={{ fontSize: "9px", fontWeight: 600, color: i === 0 ? "#111827" : "#9CA3AF" }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
