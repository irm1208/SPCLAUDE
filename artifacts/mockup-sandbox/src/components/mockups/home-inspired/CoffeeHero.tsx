import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ChevronRight, ArrowRight, MessageCircle, MapPin } from "lucide-react";

export function CoffeeHero() {
  return (
    <div style={{ width: "100%", minHeight: "100vh", fontFamily: "Inter, 'Helvetica Neue', sans-serif", display: "flex", flexDirection: "column", background: "#FAF7F4" }}>

      {/* FULL-BLEED DARK HERO TOP */}
      <div style={{ background: "linear-gradient(180deg, #1A0F0A 0%, #2D1810 60%, #3D2415 100%)", padding: "20px 20px 40px", position: "relative", overflow: "hidden" }}>
        {/* Abstract circle accents */}
        <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "220px", height: "220px", borderRadius: "50%", background: "radial-gradient(circle, rgba(180,83,9,0.4) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "0", left: "-30px", width: "160px", height: "160px", borderRadius: "50%", background: "radial-gradient(circle, rgba(217,119,6,0.15) 0%, transparent 70%)" }} />

        {/* Nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", position: "relative", zIndex: 1 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
              <MapPin style={{ width: "11px", height: "11px", color: "#F59E0B" }} />
              <span style={{ fontSize: "10px", fontWeight: 500, color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em" }}>PEPTIDE COMMUNITY</span>
            </div>
            <span style={{ fontSize: "18px", fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>Salt &amp; Peps</span>
          </div>
          <button onClick={() => {}} style={{ background: "#F59E0B", color: "#1A0F0A", border: "none", borderRadius: "20px", fontWeight: 700, fontSize: "12px", padding: "8px 16px", cursor: "pointer" }}>Login</button>
        </div>

        {/* Hero text */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: "34px", fontWeight: 800, color: "white", lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "10px" }}>Quality<br />tested.<br /><span style={{ color: "#F59E0B" }}>Discreetly</span><br />shipped.</div>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: "20px" }}>Peptide group buys with independent lab verification.</p>
          <button onClick={() => {}} style={{ background: "#F59E0B", color: "#1A0F0A", border: "none", borderRadius: "14px", padding: "14px 24px", fontSize: "14px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
            <Users style={{ width: "16px", height: "16px" }} /> Group Buy Login <ArrowRight style={{ width: "16px", height: "16px" }} />
          </button>
        </div>
      </div>

      {/* WHITE BOTTOM — cards */}
      <div style={{ flex: 1, padding: "20px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>

        {/* Category chips */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "2px" }}>
          {["Group Buys", "Single Vials", "Lab Reports", "Safety"].map((label, i) => (
            <button key={label} onClick={() => {}} style={{ background: i === 0 ? "#1A0F0A" : "#F3EDE8", color: i === 0 ? "white" : "#78350F", border: "none", borderRadius: "100px", fontSize: "12px", fontWeight: 600, padding: "7px 14px", cursor: "pointer", flexShrink: 0 }}>{label}</button>
          ))}
        </div>

        {/* Lonely vial card */}
        <button onClick={() => {}} style={{ background: "#1A0F0A", borderRadius: "18px", border: "none", padding: "18px 16px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", textAlign: "left" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FlaskConical style={{ width: "24px", height: "24px", color: "#F59E0B" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#78350F", background: "#FEF3C7", borderRadius: "4px", padding: "2px 6px", display: "inline-block", marginBottom: "5px" }}>Single Vials</div>
            <div style={{ fontSize: "17px", fontWeight: 700, color: "white", letterSpacing: "-0.01em" }}>The Lonely Vial</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>Individual units · No minimum · USDT</div>
          </div>
          <ChevronRight style={{ width: "18px", height: "18px", color: "rgba(255,255,255,0.3)" }} />
        </button>

        {/* Tool row */}
        <div style={{ background: "white", borderRadius: "18px", overflow: "hidden" }}>
          {[
            { icon: Search, label: "Manage Order", sub: "Track · Edit · Pay", color: "#D97706" },
            { icon: TestTube, label: "Lab Reports", sub: "352+ CoA tests", color: "#0891B2" },
            { icon: ShieldCheck, label: "Safety Calc", sub: "Endotoxin & BAC", color: "#059669" },
          ].map(({ icon: Icon, label, sub, color }, i, arr) => (
            <button key={label} onClick={() => {}} style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "13px 16px", background: "transparent", border: "none", textAlign: "left", cursor: "pointer", borderBottom: i < arr.length - 1 ? "1px solid #F5F3F0" : "none" }}>
              <Icon style={{ width: "16px", height: "16px", color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#1C1410" }}>{label}</div>
                <div style={{ fontSize: "11px", color: "#9CA3AF" }}>{sub}</div>
              </div>
              <ChevronRight style={{ width: "14px", height: "14px", color: "#D1D5DB" }} />
            </button>
          ))}
        </div>

        <div style={{ textAlign: "center" }}>
          <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", fontWeight: 600, color: "#2AABEE", textDecoration: "none" }}>@urbanblend789</a>
        </div>
      </div>
    </div>
  );
}
