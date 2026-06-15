import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, Bell, ChevronRight, Check, Plus } from "lucide-react";

export function SupplementScore() {
  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#1A1A1F", fontFamily: "Inter, 'Helvetica Neue', sans-serif", display: "flex", flexDirection: "column" }}>

      {/* NAV */}
      <div style={{ padding: "16px 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button onClick={() => {}} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "10px", padding: "8px 14px", fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>← Back</button>
        </div>
        <span style={{ fontSize: "15px", fontWeight: 700, color: "white" }}>Salt &amp; Peps</span>
        <button onClick={() => {}} style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Bell style={{ width: "16px", height: "16px", color: "rgba(255,255,255,0.7)" }} />
        </button>
      </div>

      <main style={{ flex: 1, padding: "8px 20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Score circle */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0 8px" }}>
          <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "conic-gradient(#FBBF24 0% 72%, rgba(255,255,255,0.08) 72% 100%)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", marginBottom: "12px" }}>
            <div style={{ width: "62px", height: "62px", borderRadius: "50%", background: "#1A1A1F", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users style={{ width: "26px", height: "26px", color: "#FBBF24" }} />
            </div>
          </div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "white", letterSpacing: "-0.02em" }}>Group Buy Score</div>
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", marginTop: "4px" }}>Round #12 · 5 days left</div>
        </div>

        {/* Yellow CTA — like the "Set notification" button */}
        <button onClick={() => {}} style={{ background: "#FBBF24", borderRadius: "16px", border: "none", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", width: "100%" }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#111827" }}>Place your order now</div>
            <div style={{ fontSize: "11px", color: "#78350F", marginTop: "2px" }}>Browse 126+ products and submit</div>
          </div>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users style={{ width: "17px", height: "17px", color: "#111827" }} />
          </div>
        </button>

        {/* Product list — supplement style rows */}
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>🧬 Available</div>
          {[
            { name: "BPC-157", sub: "5mg · Tissue repair · before meals", checked: true },
            { name: "TB-500", sub: "10mg · Recovery · after workout", checked: false, warn: true },
            { name: "Semaglutide", sub: "5mg · Weight management", checked: false },
          ].map(({ name, sub, checked, warn }) => (
            <div key={name} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "14px", padding: "14px 16px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FlaskConical style={{ width: "17px", height: "17px", color: "#FBBF24" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "white" }}>{name}</div>
                <div style={{ fontSize: "11px", color: warn ? "#F87171" : "rgba(255,255,255,0.45)", marginTop: "2px" }}>{sub}</div>
              </div>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: checked ? "none" : "2px solid rgba(255,255,255,0.2)", background: checked ? "#FBBF24" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {checked && <Check style={{ width: "13px", height: "13px", color: "#111827" }} />}
              </div>
            </div>
          ))}
        </div>

        {/* Tool rows */}
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>🔬 Tools</div>
          {[
            { icon: Search, label: "Manage Order", sub: "Track, edit, pay" },
            { icon: TestTube, label: "Lab Reports", sub: "352+ CoA tests" },
            { icon: ShieldCheck, label: "Safety Calc", sub: "Endotoxin & BAC" },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "12px", padding: "12px 14px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "10px" }}>
              <Icon style={{ width: "15px", height: "15px", color: "rgba(255,255,255,0.5)", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{label}</div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginTop: "1px" }}>{sub}</div>
              </div>
              <ChevronRight style={{ width: "14px", height: "14px", color: "rgba(255,255,255,0.25)" }} />
            </div>
          ))}
        </div>

        {/* Bottom CTA row */}
        <button onClick={() => {}} style={{ background: "#FBBF24", borderRadius: "16px", border: "none", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer", width: "100%" }}>
          <Plus style={{ width: "16px", height: "16px", color: "#111827" }} />
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>Lonely Vial — Single Units</span>
        </button>

        <div style={{ textAlign: "center" }}>
          <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", fontWeight: 600, color: "#FBBF24", textDecoration: "none" }}>@urbanblend789</a>
        </div>
      </main>
    </div>
  );
}
