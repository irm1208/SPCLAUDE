import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ArrowRight, MessageCircle, User, ChevronRight } from "lucide-react";

const BG = "#E0E5EC";
const raised = "8px 8px 16px #B8BEC7, -8px -8px 16px #FFFFFF";
const pressed = "inset 4px 4px 8px #B8BEC7, inset -4px -4px 8px #FFFFFF";
const raisedSm = "4px 4px 8px #B8BEC7, -4px -4px 8px #FFFFFF";

export function Neumorphic() {
  return (
    <div style={{ width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column", background: BG, fontFamily: "Inter, 'Helvetica Neue', Arial, sans-serif" }}>

      {/* NAV */}
      <div style={{ background: BG, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#4A5568", letterSpacing: "-0.02em" }}>Salt &amp; Peps</span>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => {}} style={{ background: BG, color: "#4A5568", border: "none", borderRadius: "10px", fontWeight: 600, fontSize: "12px", padding: "8px 14px", cursor: "pointer", boxShadow: raisedSm }}>Login</button>
          <span style={{ background: BG, color: "#2563EB", borderRadius: "10px", fontWeight: 700, fontSize: "12px", padding: "8px 12px", boxShadow: raisedSm }}>USD</span>
        </div>
      </div>

      <main style={{ flex: 1, padding: "8px 20px 32px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Brand */}
        <div style={{ paddingTop: "8px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#2D3748", letterSpacing: "-0.03em", margin: 0, lineHeight: 1.1 }}>Peptide Group Buys</h1>
          <p style={{ fontSize: "13px", color: "#718096", marginTop: "6px", lineHeight: 1.5 }}>Quality tested, discreetly shipped.</p>
        </div>

        {/* PRIMARY — Group Buy: deep neumorphic card */}
        <div style={{ borderRadius: "24px", background: BG, boxShadow: raised, padding: "24px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: BG, boxShadow: pressed, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users style={{ width: "22px", height: "22px", color: "#2563EB" }} />
            </div>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#A0AEC0", marginBottom: "2px" }}>Group Buys · Primary</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#2D3748", letterSpacing: "-0.02em" }}>Place an order</div>
            </div>
          </div>
          <p style={{ fontSize: "13px", color: "#718096", marginBottom: "16px", lineHeight: 1.5 }}>Browse 126+ products and submit for the next group buy.</p>
          <button onClick={() => {}} style={{ width: "100%", background: BG, color: "#2563EB", border: "none", borderRadius: "14px", padding: "14px", fontSize: "14px", fontWeight: 700, cursor: "pointer", boxShadow: pressed, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <Users style={{ width: "16px", height: "16px" }} /> Group Buy Login <ArrowRight style={{ width: "16px", height: "16px" }} />
          </button>
        </div>

        {/* SECONDARY — Lonely Vial: smaller raised card */}
        <div style={{ borderRadius: "20px", background: BG, boxShadow: raised, padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: BG, boxShadow: pressed, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FlaskConical style={{ width: "20px", height: "20px", color: "#7C3AED" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#A0AEC0" }}>Single Vials</div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#2D3748", letterSpacing: "-0.01em" }}>The Lonely Vial</div>
            <div style={{ fontSize: "12px", color: "#718096", marginTop: "2px" }}>No minimums · USDT</div>
          </div>
          <button onClick={() => {}} style={{ background: BG, border: "none", borderRadius: "10px", padding: "10px 14px", fontSize: "12px", fontWeight: 700, color: "#7C3AED", cursor: "pointer", boxShadow: raisedSm }}>Shop →</button>
        </div>

        {/* UTILITY — bare divider list */}
        <div style={{ borderRadius: "20px", background: BG, boxShadow: raised, overflow: "hidden" }}>
          {[
            { icon: Search, label: "Manage your order", sub: "Track, edit, pay, upload QR", color: "#D97706" },
            { icon: TestTube, label: "Lab Reports", sub: "352+ CoA tests", color: "#0891B2" },
            { icon: ShieldCheck, label: "Safety Calculator", sub: "Endotoxin & BAC", color: "#059669" },
          ].map(({ icon: Icon, label, sub, color }, i, arr) => (
            <button key={label} onClick={() => {}} style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "14px 20px", background: "transparent", border: "none", textAlign: "left", cursor: "pointer", borderBottom: i < arr.length - 1 ? `1px solid rgba(255,255,255,0.6)` : "none" }}>
              <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: BG, boxShadow: raisedSm, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon style={{ width: "15px", height: "15px", color }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#2D3748" }}>{label}</div>
                <div style={{ fontSize: "11px", color: "#A0AEC0", marginTop: "1px" }}>{sub}</div>
              </div>
              <ChevronRight style={{ width: "16px", height: "16px", color: "#CBD5E0" }} />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 600, color: "#2AABEE", textDecoration: "none" }}><MessageCircle style={{ width: "13px", height: "13px" }} /> @urbanblend789</a>
          <span style={{ fontSize: "11px", color: "#A0AEC0" }}>USDT · Ethereum</span>
        </div>
      </main>
    </div>
  );
}
