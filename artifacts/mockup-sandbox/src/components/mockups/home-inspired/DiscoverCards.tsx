import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, SlidersHorizontal, Star, ChevronRight, MessageCircle, ArrowRight } from "lucide-react";

const CARD_PRODUCTS = [
  { name: "BPC-157", type: "Peptide · Healing", badge: "★ 4.9", color1: "#0F4C75", color2: "#1B6CA8", label: "Group Buy" },
  { name: "TB-500", type: "Peptide · Recovery", badge: "★ 4.8", color1: "#2D3561", color2: "#1A237E", label: "Popular" },
];

export function DiscoverCards() {
  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#FFFFFF", fontFamily: "Inter, 'Helvetica Neue', sans-serif", display: "flex", flexDirection: "column" }}>

      {/* NAV */}
      <div style={{ padding: "16px 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#111827", letterSpacing: "-0.03em" }}>Salt &amp; Peps 🧬</div>
          <div style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>Explore peptide group buys</div>
        </div>
        <button onClick={() => {}} style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#111827", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <span style={{ color: "white", fontSize: "11px", fontWeight: 700 }}>GB</span>
        </button>
      </div>

      {/* Search bar */}
      <div style={{ padding: "0 20px 12px" }}>
        <div style={{ background: "#F3F4F6", borderRadius: "14px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
          <Search style={{ width: "16px", height: "16px", color: "#9CA3AF" }} />
          <span style={{ fontSize: "14px", color: "#9CA3AF" }}>Search products...</span>
          <div style={{ marginLeft: "auto", width: "28px", height: "28px", background: "#111827", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SlidersHorizontal style={{ width: "13px", height: "13px", color: "white" }} />
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ padding: "0 20px 16px", display: "flex", gap: "8px" }}>
        {["Group Buy", "Lonely Vial", "In stock", "Lab tested"].map((chip, i) => (
          <button key={chip} onClick={() => {}} style={{ background: i === 0 ? "#111827" : "#F3F4F6", color: i === 0 ? "white" : "#374151", border: "none", borderRadius: "100px", fontSize: "12px", fontWeight: 600, padding: "6px 14px", cursor: "pointer", flexShrink: 0 }}>{chip}</button>
        ))}
      </div>

      <main style={{ flex: 1, padding: "0 20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Section label */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#111827" }}>Current group buy</div>
          <button onClick={() => {}} style={{ fontSize: "13px", fontWeight: 600, color: "#6B7280", background: "transparent", border: "none", cursor: "pointer" }}>View all</button>
        </div>

        {/* Large photo-style cards */}
        {CARD_PRODUCTS.map(({ name, type, badge, color1, color2, label }) => (
          <button key={name} onClick={() => {}} style={{ background: `linear-gradient(135deg, ${color1}, ${color2})`, borderRadius: "24px", border: "none", padding: "0", width: "100%", cursor: "pointer", textAlign: "left", overflow: "hidden", position: "relative", height: "160px" }}>
            <div style={{ position: "absolute", top: "-30px", right: "-30px", width: "130px", height: "130px", borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
            <div style={{ position: "absolute", inset: 0, padding: "20px" }}>
              <div style={{ display: "inline-block", background: "rgba(255,255,255,0.2)", borderRadius: "8px", padding: "3px 10px", fontSize: "10px", fontWeight: 700, color: "white", marginBottom: "10px" }}>{label}</div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "white", letterSpacing: "-0.02em" }}>{name}</div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", marginTop: "4px" }}>{type}</div>
              <div style={{ position: "absolute", bottom: "16px", right: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{badge}</span>
                <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ArrowRight style={{ width: "14px", height: "14px", color: "white" }} />
                </div>
              </div>
            </div>
          </button>
        ))}

        {/* Lone vial list */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#111827" }}>Lonely Vial</div>
          <button onClick={() => {}} style={{ fontSize: "13px", fontWeight: 600, color: "#6B7280", background: "transparent", border: "none", cursor: "pointer" }}>Browse</button>
        </div>
        {[{ label: "BPC-157 5mg", sub: "In stock · Lab verified", badge: "Popular" }, { label: "Sema 5mg", sub: "Group pricing · USDT", badge: "-15%" }].map(({ label, sub, badge }) => (
          <button key={label} onClick={() => {}} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", background: "#F9FAFB", borderRadius: "16px", border: "none", textAlign: "left", cursor: "pointer", width: "100%" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#E5E7EB", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{label}</div>
              <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "2px" }}>{sub}</div>
            </div>
            <span style={{ background: badge.startsWith("-") ? "#FEF3C7" : "#D1FAE5", color: badge.startsWith("-") ? "#92400E" : "#065F46", fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px" }}>{badge}</span>
          </button>
        ))}
      </main>

      {/* Bottom nav */}
      <div style={{ background: "#111827", padding: "12px 0 16px", display: "flex", justifyContent: "space-around", borderTop: "1px solid #1F2937" }}>
        {[{ icon: Users, label: "Buy" }, { icon: FlaskConical, label: "Vials" }, { icon: Search, label: "Orders" }, { icon: TestTube, label: "Lab" }].map(({ icon: Icon, label }, i) => (
          <button key={label} onClick={() => {}} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", background: "transparent", border: "none", cursor: "pointer" }}>
            <Icon style={{ width: "20px", height: "20px", color: i === 0 ? "#A3E635" : "rgba(255,255,255,0.4)" }} />
            <span style={{ fontSize: "9px", fontWeight: 600, color: i === 0 ? "#A3E635" : "rgba(255,255,255,0.4)" }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
