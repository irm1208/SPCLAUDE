import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ChevronRight, Package, Truck, CheckCircle, Clock, ArrowRight } from "lucide-react";

export function TrackingStatus() {
  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#F8F9FA", fontFamily: "Inter, 'Helvetica Neue', sans-serif", display: "flex", flexDirection: "column" }}>

      {/* DARK TOP — order number area */}
      <div style={{ background: "#111827", padding: "18px 20px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <button onClick={() => {}} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.6)", fontSize: "12px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>← Back</button>
          <span style={{ fontSize: "15px", fontWeight: 700, color: "white" }}>Salt &amp; Peps</span>
          <button onClick={() => {}} style={{ background: "#F59E0B", color: "#111827", border: "none", borderRadius: "16px", fontWeight: 700, fontSize: "11px", padding: "6px 12px", cursor: "pointer" }}>Login</button>
        </div>

        {/* Order ID */}
        <div style={{ fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.4)", marginBottom: "4px", letterSpacing: "0.08em" }}>Current group buy</div>
        <div style={{ fontSize: "26px", fontWeight: 800, color: "white", letterSpacing: "-0.03em" }}>Round #12 🧬</div>
        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>126 products · closes March 31</div>

        {/* Status pills */}
        <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
          {[
            { icon: CheckCircle, label: "Verified", color: "#4ADE80" },
            { icon: Clock, label: "5 days left", color: "#FBBF24" },
            { icon: Truck, label: "Ships in ~14d", color: "#60A5FA" },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "5px", background: "rgba(255,255,255,0.08)", borderRadius: "100px", padding: "5px 10px" }}>
              <Icon style={{ width: "11px", height: "11px", color }} />
              <span style={{ fontSize: "10px", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FLOATING WHITE CARD */}
      <div style={{ margin: "0 16px", marginTop: "-18px", background: "white", borderRadius: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", padding: "20px", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "14px" }}>How to order</div>
        {[
          { icon: Users, step: "1", label: "Group Buy Login", sub: "Browse 126+ products" },
          { icon: Package, step: "2", label: "Submit your kit", sub: "Add items + 4-digit PIN" },
          { icon: CheckCircle, step: "3", label: "Pay & confirm", sub: "USDT or Ethereum" },
        ].map(({ icon: Icon, step, label, sub }, i, arr) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "12px", paddingBottom: i < arr.length - 1 ? "12px" : "0", borderBottom: i < arr.length - 1 ? "1px solid #F3F4F6" : "none", marginBottom: i < arr.length - 1 ? "12px" : "0" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: "13px", fontWeight: 800, color: "#F59E0B" }}>{step}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>{label}</div>
              <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "1px" }}>{sub}</div>
            </div>
          </div>
        ))}

        <button onClick={() => {}} style={{ marginTop: "16px", width: "100%", background: "#F59E0B", color: "#111827", border: "none", borderRadius: "14px", padding: "14px", fontSize: "14px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <Users style={{ width: "16px", height: "16px" }} /> Group Buy Login <ArrowRight style={{ width: "16px", height: "16px" }} />
        </button>
      </div>

      {/* TOOL LIST BELOW */}
      <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>

        <button onClick={() => {}} style={{ background: "white", borderRadius: "16px", border: "none", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", width: "100%", textAlign: "left" }}>
          <FlaskConical style={{ width: "20px", height: "20px", color: "#7C3AED", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>Lonely Vial</div>
            <div style={{ fontSize: "11px", color: "#6B7280" }}>Single units, no minimums</div>
          </div>
          <ChevronRight style={{ width: "16px", height: "16px", color: "#D1D5DB" }} />
        </button>

        <div style={{ display: "flex", gap: "10px" }}>
          {[
            { icon: TestTube, label: "Lab Reports", color: "#0891B2", bg: "#EFF6FF" },
            { icon: ShieldCheck, label: "Safety Calc", color: "#059669", bg: "#F0FDF4" },
          ].map(({ icon: Icon, label, color, bg }) => (
            <button key={label} onClick={() => {}} style={{ flex: 1, background: bg, borderRadius: "14px", border: "none", padding: "14px", display: "flex", flexDirection: "column", gap: "6px", cursor: "pointer", textAlign: "left" }}>
              <Icon style={{ width: "18px", height: "18px", color }} />
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#111827" }}>{label}</div>
            </button>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "4px" }}>
          <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", fontWeight: 600, color: "#2AABEE", textDecoration: "none" }}>@urbanblend789 · USDT · ETH</a>
        </div>
      </div>
    </div>
  );
}
