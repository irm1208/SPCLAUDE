import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ArrowRight, MessageCircle, User } from "lucide-react";

export function BentoGrid() {
  return (
    <div className="w-full min-h-screen flex flex-col" style={{ background: "#FAFAFA", fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* NAV */}
      <div style={{ background: "white", borderBottom: "1px solid #E5E7EB", padding: "0 16px", height: "52px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: "15px", color: "#111" }}>Salt &amp; Peps</span>
          <span style={{ fontSize: "10px", color: "#9CA3AF", marginLeft: "8px", fontWeight: 500 }}>Peptide group buys</span>
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <button onClick={() => {}} style={{ background: "#F3F4F6", color: "#374151", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "11px", padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}><User style={{ width: "12px", height: "12px" }} /> Login</button>
          <span style={{ background: "#2563EB", color: "white", borderRadius: "8px", fontWeight: 700, fontSize: "11px", padding: "5px 9px" }}>USD</span>
        </div>
      </div>

      <main style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>

        {/* Row 1: Brand chip */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#111", margin: 0 }}>Good to see you.</h1>
          <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 600, color: "#2AABEE", textDecoration: "none" }}><MessageCircle style={{ width: "13px", height: "13px" }} /> @urbanblend789</a>
        </div>

        {/* Row 2: Big primary tile */}
        <button onClick={() => {}} style={{ background: "linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)", borderRadius: "20px", border: "none", padding: "24px 20px", display: "flex", flexDirection: "column", gap: "12px", width: "100%", cursor: "pointer", textAlign: "left", minHeight: "170px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
          <div style={{ position: "absolute", bottom: "-30px", left: "-15px", width: "100px", height: "100px", borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.15)", borderRadius: "100px", padding: "4px 10px", width: "fit-content" }}>
            <Users style={{ width: "12px", height: "12px", color: "white" }} />
            <span style={{ fontSize: "10px", fontWeight: 700, color: "white", letterSpacing: "0.05em" }}>Group Buys</span>
          </div>
          <div>
            <div style={{ fontSize: "26px", fontWeight: 800, color: "white", lineHeight: 1.1 }}>Place an order</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", marginTop: "6px" }}>126+ peptide products · kit ordering</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "white", fontWeight: 700, fontSize: "13px" }}>Group Buy Login <ArrowRight style={{ width: "16px", height: "16px" }} /></div>
        </button>

        {/* Row 3: Two medium tiles */}
        <div style={{ display: "flex", gap: "10px", minHeight: "150px" }}>
          {/* Lonely Vial */}
          <button onClick={() => {}} style={{ flex: 1, background: "linear-gradient(135deg, #5B21B6 0%, #7C3AED 100%)", borderRadius: "20px", border: "none", padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between", cursor: "pointer", textAlign: "left", position: "relative", overflow: "hidden" }}>
            <div>
              <div style={{ width: "36px", height: "36px", borderRadius: "12px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "10px" }}>
                <FlaskConical style={{ width: "18px", height: "18px", color: "white" }} />
              </div>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "white", lineHeight: 1.2 }}>The Lonely Vial</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.65)", marginTop: "4px" }}>No minimums · USDT</div>
            </div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", gap: "4px" }}>Browse <ArrowRight style={{ width: "12px", height: "12px" }} /></div>
          </button>

          {/* Manage order */}
          <button onClick={() => {}} style={{ flex: 1, background: "white", borderRadius: "20px", border: "1.5px solid #E5E7EB", padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between", cursor: "pointer", textAlign: "left" }}>
            <div>
              <div style={{ width: "36px", height: "36px", borderRadius: "12px", background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "10px" }}>
                <Search style={{ width: "18px", height: "18px", color: "#D97706" }} />
              </div>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", lineHeight: 1.2 }}>Manage Order</div>
              <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "4px" }}>Track · Edit · Pay</div>
            </div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#374151", display: "flex", alignItems: "center", gap: "4px" }}>Open <ArrowRight style={{ width: "12px", height: "12px" }} /></div>
          </button>
        </div>

        {/* Row 4: Two small tool tiles */}
        <div style={{ display: "flex", gap: "10px" }}>
          {[
            { icon: TestTube, label: "Lab Reports", sub: "352+ CoA tests", bg: "#EFF6FF", iconBg: "#DBEAFE", color: "#1D4ED8" },
            { icon: ShieldCheck, label: "Safety Calc", sub: "Endotoxin & BAC", bg: "#F0FDF4", iconBg: "#DCFCE7", color: "#15803D" },
          ].map(({ icon: Icon, label, sub, bg, iconBg, color }) => (
            <button key={label} onClick={() => {}} style={{ flex: 1, background: bg, borderRadius: "18px", border: "none", padding: "14px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", textAlign: "left" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", shrink: 0, flexShrink: 0 }}>
                <Icon style={{ width: "18px", height: "18px", color }} />
              </div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#111" }}>{label}</div>
                <div style={{ fontSize: "10px", color: "#6B7280", marginTop: "2px" }}>{sub}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer note */}
        <div style={{ textAlign: "center", paddingTop: "4px" }}>
          <span style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 500 }}>Pay with USDT · Ethereum · Discreet shipping</span>
        </div>
      </main>
    </div>
  );
}
