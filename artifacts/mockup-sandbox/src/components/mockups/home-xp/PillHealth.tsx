import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ArrowRight, MessageCircle, User, Sparkles } from "lucide-react";

export function PillHealth() {
  return (
    <div style={{ width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column", background: "linear-gradient(180deg, #F0F7FF 0%, #F7F0FF 50%, #FFF0F7 100%)", fontFamily: "Inter, 'Helvetica Neue', sans-serif" }}>

      {/* NAV — pill shaped */}
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #818CF8, #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles style={{ width: "16px", height: "16px", color: "white" }} />
          </div>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#1E1B4B", letterSpacing: "-0.02em" }}>Salt &amp; Peps</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => {}} style={{ background: "white", color: "#6366F1", border: "none", borderRadius: "100px", fontWeight: 600, fontSize: "12px", padding: "7px 16px", cursor: "pointer", boxShadow: "0 2px 8px rgba(99,102,241,0.12)" }}>Login</button>
          <span style={{ background: "#6366F1", color: "white", borderRadius: "100px", fontWeight: 700, fontSize: "12px", padding: "6px 12px" }}>USD</span>
        </div>
      </div>

      <main style={{ flex: 1, padding: "8px 16px 32px", display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* Hero tagline */}
        <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(99,102,241,0.1)", borderRadius: "100px", padding: "5px 14px", marginBottom: "12px" }}>
            <Sparkles style={{ width: "12px", height: "12px", color: "#6366F1" }} />
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#6366F1", letterSpacing: "0.05em" }}>QUALITY TESTED</span>
          </div>
          <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#1E1B4B", letterSpacing: "-0.03em", lineHeight: 1.1, margin: 0 }}>Peptides.<br />Delivered.</h1>
          <p style={{ fontSize: "14px", color: "#6B7280", marginTop: "8px", lineHeight: 1.5 }}>Group buys, single vials, and lab-verified quality.</p>
        </div>

        {/* PRIMARY — Group Buy: large rounded pill card */}
        <button onClick={() => {}} style={{ background: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)", borderRadius: "28px", border: "none", padding: "24px 20px", display: "flex", flexDirection: "column", gap: "14px", cursor: "pointer", textAlign: "left", width: "100%", position: "relative", overflow: "hidden", boxShadow: "0 12px 32px rgba(99,102,241,0.35)" }}>
          <div style={{ position: "absolute", top: "-30px", right: "-30px", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
          <div style={{ position: "absolute", bottom: "-20px", left: "-20px", width: "80px", height: "80px", borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.2)", borderRadius: "100px", padding: "4px 12px", width: "fit-content" }}>
            <Users style={{ width: "11px", height: "11px", color: "white" }} />
            <span style={{ fontSize: "10px", fontWeight: 700, color: "white", letterSpacing: "0.08em" }}>GROUP BUYS</span>
          </div>
          <div>
            <div style={{ fontSize: "26px", fontWeight: 800, color: "white", letterSpacing: "-0.02em", lineHeight: 1.05 }}>Place an order</div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)", marginTop: "6px" }}>Browse 126+ products · group pricing</div>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "white", borderRadius: "100px", padding: "10px 18px", width: "fit-content" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#6366F1" }}>Group Buy Login</span>
            <ArrowRight style={{ width: "14px", height: "14px", color: "#6366F1" }} />
          </div>
        </button>

        {/* Two pill cards side by side */}
        <div style={{ display: "flex", gap: "10px" }}>
          {/* Lonely Vial */}
          <button onClick={() => {}} style={{ flex: 1, background: "white", borderRadius: "22px", border: "none", padding: "18px 16px", display: "flex", flexDirection: "column", gap: "8px", cursor: "pointer", textAlign: "left", boxShadow: "0 4px 16px rgba(167,139,250,0.2)" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #7C3AED, #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FlaskConical style={{ width: "18px", height: "18px", color: "white" }} />
            </div>
            <div>
              <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#A78BFA" }}>Vials</div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#1E1B4B", letterSpacing: "-0.01em" }}>Lonely Vial</div>
              <div style={{ fontSize: "10px", color: "#9CA3AF", marginTop: "2px" }}>No minimums · USDT</div>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#F3F0FF", borderRadius: "100px", padding: "5px 10px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#7C3AED" }}>Browse</span>
              <ArrowRight style={{ width: "10px", height: "10px", color: "#7C3AED" }} />
            </div>
          </button>

          {/* Manage */}
          <button onClick={() => {}} style={{ flex: 1, background: "white", borderRadius: "22px", border: "none", padding: "18px 16px", display: "flex", flexDirection: "column", gap: "8px", cursor: "pointer", textAlign: "left", boxShadow: "0 4px 16px rgba(251,191,36,0.15)" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #F59E0B, #FCD34D)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Search style={{ width: "18px", height: "18px", color: "white" }} />
            </div>
            <div>
              <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#F59E0B" }}>Orders</div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#1E1B4B", letterSpacing: "-0.01em" }}>My Order</div>
              <div style={{ fontSize: "10px", color: "#9CA3AF", marginTop: "2px" }}>Track · Edit · Pay</div>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#FFFBEB", borderRadius: "100px", padding: "5px 10px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#D97706" }}>Open</span>
              <ArrowRight style={{ width: "10px", height: "10px", color: "#D97706" }} />
            </div>
          </button>
        </div>

        {/* Tool pill strip */}
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { icon: TestTube, label: "Lab Reports", color: "#0891B2", bg: "#E0F2FE" },
            { icon: ShieldCheck, label: "Safety Calc", color: "#059669", bg: "#D1FAE5" },
          ].map(({ icon: Icon, label, color, bg }) => (
            <button key={label} onClick={() => {}} style={{ flex: 1, background: "white", border: "none", borderRadius: "16px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon style={{ width: "15px", height: "15px", color }} />
              </div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#1E1B4B" }}>{label}</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "4px" }}>
          <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 600, color: "#2AABEE", textDecoration: "none" }}><MessageCircle style={{ width: "13px", height: "13px" }} /> @urbanblend789</a>
          <span style={{ fontSize: "11px", color: "#9CA3AF" }}>USDT · Ethereum</span>
        </div>
      </main>
    </div>
  );
}
