import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, Home, BarChart2, User, Grid } from "lucide-react";

const TILES = [
  { label: "Group Buy #12", sub: "126 products · 5 days left", color: "#C4B5FD", bg: "#7C3AED", wide: true },
  { label: "Lonely Vial", sub: "Single units", color: "#BAE6FD", bg: "#0891B2", wide: false },
  { label: "My Order", sub: "Track & edit", color: "#FDE68A", bg: "#D97706", wide: false },
];

export function ColorfulPlan() {
  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#F5F0FF", fontFamily: "Inter, 'Helvetica Neue', sans-serif", display: "flex", flexDirection: "column" }}>

      {/* NAV */}
      <div style={{ padding: "16px 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #7C3AED, #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "white", fontWeight: 700, fontSize: "13px" }}>SP</span>
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#1E1B4B", letterSpacing: "-0.02em" }}>Salt &amp; Peps</div>
            <div style={{ fontSize: "11px", color: "#6B7280" }}>Peptide group buys</div>
          </div>
        </div>
        <button onClick={() => {}} style={{ background: "#1E1B4B", color: "white", border: "none", borderRadius: "20px", fontWeight: 600, fontSize: "12px", padding: "7px 14px", cursor: "pointer" }}>Login</button>
      </div>

      <main style={{ flex: 1, padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* Purple featured banner */}
        <div style={{ background: "#7C3AED", borderRadius: "24px", padding: "22px 20px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "-30px", right: "-30px", width: "130px", height: "130px", borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
          <div style={{ position: "absolute", bottom: "-20px", left: "20px", width: "80px", height: "80px", borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
          <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.65)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>🔥 Active Now</div>
          <div style={{ fontSize: "26px", fontWeight: 800, color: "white", letterSpacing: "-0.03em", lineHeight: 1.1 }}>Group Buy #12</div>
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", marginTop: "6px" }}>Browse 126 products · closes in 5 days</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "16px" }}>
            <button onClick={() => {}} style={{ background: "white", color: "#7C3AED", border: "none", borderRadius: "100px", padding: "10px 20px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>Group Buy Login →</button>
          </div>
        </div>

        {/* Colorful tile grid — fitness app style */}
        <div style={{ fontSize: "15px", fontWeight: 700, color: "#1E1B4B", padding: "0 4px" }}>Your options</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "auto auto", gap: "10px" }}>
          {/* Wide top-left tile */}
          <button onClick={() => {}} style={{ gridColumn: "1 / 2", background: "#FDE68A", borderRadius: "20px", border: "none", padding: "16px", cursor: "pointer", textAlign: "left", minHeight: "130px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <FlaskConical style={{ width: "24px", height: "24px", color: "#92400E" }} />
            <div>
              <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#92400E", marginBottom: "3px" }}>Single Units</div>
              <div style={{ fontSize: "17px", fontWeight: 800, color: "#78350F", letterSpacing: "-0.02em", lineHeight: 1.1 }}>Lonely<br />Vial</div>
            </div>
          </button>
          {/* Narrow right tiles */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button onClick={() => {}} style={{ background: "#BFDBFE", borderRadius: "20px", border: "none", padding: "14px", cursor: "pointer", textAlign: "left", flex: 1 }}>
              <Search style={{ width: "20px", height: "20px", color: "#1E40AF", marginBottom: "6px" }} />
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#1E3A8A", letterSpacing: "-0.01em" }}>My Order</div>
              <div style={{ fontSize: "10px", color: "#3B82F6", marginTop: "2px" }}>Track &amp; edit</div>
            </button>
            <button onClick={() => {}} style={{ background: "#A7F3D0", borderRadius: "20px", border: "none", padding: "14px", cursor: "pointer", textAlign: "left", flex: 1 }}>
              <TestTube style={{ width: "20px", height: "20px", color: "#065F46", marginBottom: "6px" }} />
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#064E3B", letterSpacing: "-0.01em" }}>Lab Reports</div>
              <div style={{ fontSize: "10px", color: "#059669", marginTop: "2px" }}>352+ CoA</div>
            </button>
          </div>
        </div>

        {/* Safety tool card */}
        <button onClick={() => {}} style={{ background: "#FDD5D5", borderRadius: "20px", border: "none", padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", width: "100%", textAlign: "left" }}>
          <ShieldCheck style={{ width: "28px", height: "28px", color: "#DC2626", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#7F1D1D" }}>Safety Calculator</div>
            <div style={{ fontSize: "11px", color: "#EF4444", marginTop: "2px" }}>Endotoxin limits &amp; BAC water safety</div>
          </div>
          <div style={{ fontSize: "16px", color: "#DC2626" }}>→</div>
        </button>

        {/* Telegram */}
        <div style={{ textAlign: "center" }}>
          <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", fontWeight: 600, color: "#7C3AED", textDecoration: "none" }}>@urbanblend789 · USDT · ETH</a>
        </div>
      </main>

      {/* Bottom nav */}
      <div style={{ background: "#1E1B4B", borderRadius: "24px 24px 0 0", padding: "12px 24px 20px", display: "flex", justifyContent: "space-around" }}>
        {[{ icon: Home, label: "Home" }, { icon: Grid, label: "Products" }, { icon: BarChart2, label: "Stats" }, { icon: User, label: "Account" }].map(({ icon: Icon, label }, i) => (
          <button key={label} onClick={() => {}} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", background: "transparent", border: "none", cursor: "pointer" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: i === 0 ? "white" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon style={{ width: "20px", height: "20px", color: i === 0 ? "#1E1B4B" : "rgba(255,255,255,0.45)" }} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
