import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ChevronRight, MessageCircle, Sparkles, Info } from "lucide-react";

const CATEGORIES = [
  { icon: Users, label: "Group Buys", color: "#7C3AED", bg: "#EDE9FE" },
  { icon: FlaskConical, label: "Lonely Vial", color: "#0891B2", bg: "#E0F2FE" },
  { icon: Search, label: "My Order", color: "#D97706", bg: "#FEF3C7" },
  { icon: ShieldCheck, label: "Safety Calc", color: "#059669", bg: "#D1FAE5" },
];

export function ExploreGrid() {
  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#F0FAF7", fontFamily: "Inter, 'Helvetica Neue', sans-serif", display: "flex", flexDirection: "column" }}>

      {/* NAV */}
      <div style={{ background: "transparent", padding: "16px 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#064E3B", letterSpacing: "-0.02em" }}>Explore</div>
        </div>
        <button onClick={() => {}} style={{ background: "#064E3B", color: "white", border: "none", borderRadius: "20px", fontWeight: 600, fontSize: "12px", padding: "7px 14px", cursor: "pointer" }}>Login</button>
      </div>

      {/* Search */}
      <div style={{ padding: "0 20px 20px" }}>
        <div style={{ background: "white", borderRadius: "14px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 2px 8px rgba(6,78,59,0.08)" }}>
          <Search style={{ width: "16px", height: "16px", color: "#9CA3AF" }} />
          <span style={{ fontSize: "14px", color: "#9CA3AF" }}>Search products & orders...</span>
        </div>
      </div>

      <main style={{ flex: 1, padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* 2x2 Category grid */}
        <div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#374151", marginBottom: "12px", padding: "0 4px" }}>What are you here for?</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {CATEGORIES.map(({ icon: Icon, label, color, bg }) => (
              <button key={label} onClick={() => {}} style={{ background: "white", borderRadius: "20px", border: "none", padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon style={{ width: "24px", height: "24px", color }} />
                </div>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#111827", textAlign: "center" }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tips section — like the healthcare app */}
        <div style={{ background: "white", borderRadius: "20px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ padding: "16px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>How it works</div>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#6B7280" }}>3 steps</span>
          </div>

          {[
            { icon: Sparkles, title: "Browse 126+ products", sub: "Select items from the group buy list", color: "#7C3AED" },
            { icon: MessageCircle, title: "Submit via Telegram", sub: "DM @urbanblend789 your order + PIN", color: "#0891B2" },
            { icon: ShieldCheck, title: "Lab verified quality", sub: "All products have independent CoA tests", color: "#059669" },
          ].map(({ icon: Icon, title, sub, color }, i, arr) => (
            <button key={title} onClick={() => {}} style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px 16px", background: "transparent", border: "none", textAlign: "left", cursor: "pointer", borderBottom: i < arr.length - 1 ? "1px solid #F3F4F6" : "none" }}>
              <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                <Icon style={{ width: "15px", height: "15px", color }} />
              </div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>{title}</div>
                <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>{sub}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Lab reports teaser */}
        <button onClick={() => {}} style={{ background: "linear-gradient(135deg, #0F766E, #0D9488)", borderRadius: "20px", border: "none", padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", width: "100%", textAlign: "left" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <TestTube style={{ width: "22px", height: "22px", color: "white" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "white" }}>Lab Reports</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", marginTop: "2px" }}>352+ independent Janoshik CoA tests</div>
          </div>
          <ChevronRight style={{ width: "18px", height: "18px", color: "rgba(255,255,255,0.6)" }} />
        </button>

        <div style={{ textAlign: "center" }}>
          <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", fontWeight: 600, color: "#0F766E", textDecoration: "none" }}>@urbanblend789 · USDT · Ethereum</a>
        </div>
      </main>
    </div>
  );
}
