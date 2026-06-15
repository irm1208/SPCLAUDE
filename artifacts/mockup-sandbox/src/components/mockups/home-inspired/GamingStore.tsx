import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, Home, ShoppingCart, Star, Settings, ChevronRight, ArrowRight } from "lucide-react";

const FEATURED = [
  { name: "BPC-157", sub: "Tissue repair · 5mg", stars: "4.9", badge: "HOT", color1: "#1E3A5F", color2: "#2E5F8A" },
  { name: "TB-500", sub: "Recovery · 10mg", stars: "4.8", badge: "NEW", color1: "#1A0F2E", color2: "#3D1F6B" },
];

const LIST_ITEMS = [
  { name: "Semaglutide 5mg", stars: "4.7", badge: "Popular" },
  { name: "Sermorelin 2mg", stars: "4.6", badge: "Popular" },
  { name: "GHK-Cu 50mg", stars: "4.5", badge: "-20%" },
];

export function GamingStore() {
  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#FFFFFF", fontFamily: "Inter, 'Helvetica Neue', sans-serif", display: "flex", flexDirection: "column" }}>

      {/* NAV */}
      <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>Shop</div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={() => {}} style={{ background: "transparent", border: "none", cursor: "pointer" }}><Search style={{ width: "20px", height: "20px", color: "#374151" }} /></button>
          <button onClick={() => {}} style={{ background: "#EF4444", color: "white", border: "none", borderRadius: "20px", fontWeight: 700, fontSize: "12px", padding: "6px 14px", cursor: "pointer" }}>Login</button>
        </div>
      </div>

      {/* Tabs — like LoL Tienda */}
      <div style={{ padding: "0 20px", borderBottom: "1px solid #F3F4F6", display: "flex", gap: "0" }}>
        {["Group Buy", "Lonely Vial", "Lab", "Tools"].map((tab, i) => (
          <button key={tab} onClick={() => {}} style={{ padding: "12px 16px", background: "transparent", border: "none", fontSize: "13px", fontWeight: i === 0 ? 700 : 500, color: i === 0 ? "#EF4444" : "#9CA3AF", cursor: "pointer", borderBottom: i === 0 ? "2px solid #EF4444" : "2px solid transparent", marginBottom: "-1px", letterSpacing: i === 0 ? "-0.01em" : 0 }}>{tab}</button>
        ))}
      </div>

      <main style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto" }}>

        {/* Featured — 2 col image cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {FEATURED.map(({ name, sub, stars, badge, color1, color2 }) => (
            <button key={name} onClick={() => {}} style={{ borderRadius: "18px", border: "none", padding: "0", cursor: "pointer", textAlign: "left", overflow: "hidden", height: "170px", position: "relative", background: `linear-gradient(160deg, ${color1}, ${color2})` }}>
              <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "100px", height: "100px", borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
              <div style={{ position: "absolute", inset: 0, padding: "14px 12px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ display: "inline-block", background: badge === "HOT" ? "#EF4444" : "#8B5CF6", borderRadius: "6px", padding: "2px 8px", fontSize: "9px", fontWeight: 800, color: "white", letterSpacing: "0.05em" }}>{badge}</div>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "white", letterSpacing: "-0.02em", lineHeight: 1.1 }}>{name}</div>
                  <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.65)", marginTop: "3px" }}>{sub}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "6px" }}>
                    <Star style={{ width: "10px", height: "10px", color: "#FBBF24", fill: "#FBBF24" }} />
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{stars}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* List section */}
        <div style={{ fontSize: "15px", fontWeight: 700, color: "#111827" }}>Best sellers</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0", background: "#FAFAFA", borderRadius: "16px", overflow: "hidden" }}>
          {LIST_ITEMS.map(({ name, stars, badge }, i, arr) => (
            <button key={name} onClick={() => {}} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 14px", background: "transparent", border: "none", textAlign: "left", cursor: "pointer", borderBottom: i < arr.length - 1 ? "1px solid #F0F0F0" : "none", width: "100%" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "#E5E7EB", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>{name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                  <Star style={{ width: "10px", height: "10px", color: "#FBBF24", fill: "#FBBF24" }} />
                  <span style={{ fontSize: "11px", color: "#6B7280" }}>{stars}</span>
                </div>
              </div>
              <span style={{ background: badge === "Popular" ? "#FEE2E2" : "#FEF3C7", color: badge === "Popular" ? "#DC2626" : "#92400E", fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px" }}>{badge}</span>
            </button>
          ))}
        </div>
      </main>

      {/* Bottom tab bar */}
      <div style={{ borderTop: "1px solid #F3F4F6", padding: "10px 0 16px", display: "flex", justifyContent: "space-around" }}>
        {[{ icon: Home, label: "Home" }, { icon: ShoppingCart, label: "Orders" }, { icon: TestTube, label: "Lab" }, { icon: Settings, label: "Tools" }].map(({ icon: Icon, label }, i) => (
          <button key={label} onClick={() => {}} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", background: "transparent", border: "none", cursor: "pointer" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: i === 0 ? "#EF4444" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon style={{ width: "18px", height: "18px", color: i === 0 ? "white" : "#9CA3AF" }} />
            </div>
            <span style={{ fontSize: "9px", fontWeight: 600, color: i === 0 ? "#EF4444" : "#9CA3AF" }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
