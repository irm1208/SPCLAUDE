import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ChevronRight, ArrowRight, MapPin, Star } from "lucide-react";

export function DarkGourmet() {
  return (
    <div style={{ width: "100%", minHeight: "100vh", fontFamily: "Inter, 'Helvetica Neue', sans-serif", display: "flex", flexDirection: "column", background: "#F8F8F8" }}>

      {/* DARK TOP SECTION */}
      <div style={{ background: "#111111", padding: "16px 20px 28px" }}>

        {/* Nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "2px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#FF6B35" }} />
              <span style={{ fontSize: "10px", fontWeight: 500, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em" }}>PEPTIDE ORDERS</span>
            </div>
            <span style={{ fontSize: "17px", fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>Salt &amp; Peps</span>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button onClick={() => {}} style={{ background: "rgba(255,255,255,0.1)", color: "white", border: "none", borderRadius: "20px", fontWeight: 500, fontSize: "12px", padding: "7px 14px", cursor: "pointer" }}>Login</button>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#FF6B35", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "white", fontSize: "11px", fontWeight: 800 }}>GB</span>
            </div>
          </div>
        </div>

        {/* Featured banner in dark section */}
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "18px", padding: "18px 16px", border: "1px solid rgba(255,255,255,0.08)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "100px", height: "100px", borderRadius: "50%", background: "rgba(255,107,53,0.15)" }} />
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#FF6B35", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "6px" }}>Current Round</div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "white", letterSpacing: "-0.02em", lineHeight: 1.1 }}>Group Buy #12</div>
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "5px" }}>126 products · closes in 5 days</div>
          <button onClick={() => {}} style={{ marginTop: "14px", background: "#FF6B35", color: "white", border: "none", borderRadius: "10px", padding: "10px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            <Users style={{ width: "14px", height: "14px" }} /> Group Buy Login <ArrowRight style={{ width: "14px", height: "14px" }} />
          </button>
        </div>
      </div>

      {/* WHITE CARD SECTION */}
      <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>

        {/* Section tabs */}
        <div style={{ display: "flex", gap: "8px" }}>
          {["Specials", "Single Vials", "Lab Reports", "Tools"].map((tab, i) => (
            <button key={tab} onClick={() => {}} style={{ background: i === 0 ? "#111111" : "white", color: i === 0 ? "white" : "#6B7280", border: i === 0 ? "none" : "1px solid #E5E7EB", borderRadius: "100px", fontSize: "12px", fontWeight: 600, padding: "6px 14px", cursor: "pointer", flexShrink: 0 }}>{tab}</button>
          ))}
        </div>

        {/* 2-col featured image cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {[
            { name: "BPC-157", sub: "5mg · Tissue repair", stars: "4.9", color: "#1E3A5F" },
            { name: "TB-500", sub: "10mg · Recovery", stars: "4.8", color: "#2D1B69" },
          ].map(({ name, sub, stars, color }) => (
            <button key={name} onClick={() => {}} style={{ background: `linear-gradient(150deg, ${color}, #000)`, borderRadius: "16px", border: "none", height: "140px", cursor: "pointer", textAlign: "left", overflow: "hidden", position: "relative", padding: "14px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "auto" }}>
                <Star style={{ width: "10px", height: "10px", color: "#FBBF24", fill: "#FBBF24" }} />
                <span style={{ fontSize: "10px", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{stars}</span>
              </div>
              <div style={{ position: "absolute", bottom: "14px", left: "12px" }}>
                <div style={{ fontSize: "15px", fontWeight: 800, color: "white", letterSpacing: "-0.01em" }}>{name}</div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.55)", marginTop: "2px" }}>{sub}</div>
              </div>
              <div style={{ position: "absolute", bottom: "10px", right: "10px", width: "28px", height: "28px", borderRadius: "50%", background: "#FF6B35", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ArrowRight style={{ width: "12px", height: "12px", color: "white" }} />
              </div>
            </button>
          ))}
        </div>

        {/* Upcoming / list */}
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>Quick access</div>
        <div style={{ background: "white", borderRadius: "16px", overflow: "hidden" }}>
          {[
            { icon: Search, label: "Manage your order", sub: "Track, edit, pay, upload QR", color: "#FF6B35" },
            { icon: TestTube, label: "Lab Reports", sub: "352+ Janoshik CoA tests", color: "#0891B2" },
            { icon: ShieldCheck, label: "Safety Calculator", sub: "Endotoxin & BAC water", color: "#059669" },
          ].map(({ icon: Icon, label, sub, color }, i, arr) => (
            <button key={label} onClick={() => {}} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 14px", background: "transparent", border: "none", textAlign: "left", cursor: "pointer", borderBottom: i < arr.length - 1 ? "1px solid #F5F5F5" : "none", width: "100%" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${color}14`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon style={{ width: "17px", height: "17px", color }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>{label}</div>
                <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "1px" }}>{sub}</div>
              </div>
              <ChevronRight style={{ width: "14px", height: "14px", color: "#D1D5DB" }} />
            </button>
          ))}
        </div>

        <div style={{ textAlign: "center" }}>
          <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", fontWeight: 600, color: "#2AABEE", textDecoration: "none" }}>@urbanblend789 · USDT · ETH</a>
        </div>
      </div>
    </div>
  );
}
