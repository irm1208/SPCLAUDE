import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ArrowRight, MessageCircle, User } from "lucide-react";

export function WarmEditorial() {
  return (
    <div className="w-full min-h-screen flex flex-col" style={{ background: "#FBF7F0", fontFamily: "Georgia, 'Times New Roman', serif" }}>

      {/* NAV */}
      <div style={{ background: "#FBF7F0", borderBottom: "1px solid #E8DDD0", padding: "0 20px", height: "52px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
          <span style={{ fontWeight: 700, fontSize: "16px", color: "#1C1007", letterSpacing: "-0.02em" }}>Salt &amp; Peps</span>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#9C8575", letterSpacing: "0.15em", textTransform: "uppercase" }}>Est. Group Buys</span>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button onClick={() => {}} style={{ background: "transparent", color: "#5C4A3A", border: "1px solid #C9B8A8", borderRadius: "6px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: "11px", padding: "6px 12px", cursor: "pointer" }}>Login</button>
          <span style={{ background: "#1C1007", color: "#FBF7F0", fontFamily: "Inter, sans-serif", borderRadius: "6px", fontWeight: 700, fontSize: "11px", padding: "5px 10px" }}>USD</span>
        </div>
      </div>

      <main style={{ flex: 1, padding: "24px 20px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Editorial headline */}
        <div style={{ borderBottom: "2px solid #1C1007", paddingBottom: "16px" }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#9C8575", marginBottom: "8px" }}>Peptide Research Community</div>
          <h1 style={{ fontSize: "38px", fontWeight: 700, color: "#1C1007", lineHeight: 1.05, margin: 0, letterSpacing: "-0.02em" }}>Quality<br />tested,<br /><em style={{ color: "#B45309" }}>discreetly</em><br />shipped.</h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#7C6655", marginTop: "12px", lineHeight: 1.6 }}>Peptide group buys with independent lab verification. 126+ products, group buy pricing.</p>
        </div>

        {/* PRIMARY — Group Buy */}
        <button onClick={() => {}} style={{ background: "#1C1007", color: "#FBF7F0", border: "none", padding: "24px 20px", display: "flex", flexDirection: "column", gap: "16px", cursor: "pointer", textAlign: "left", width: "100%" }}>
          <div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#9C8575", marginBottom: "6px" }}>New Customer</div>
            <div style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>Place an order</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "rgba(251,247,240,0.6)", marginTop: "6px" }}>Browse products and submit your group buy order</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, color: "#F59E0B" }}>
            <Users style={{ width: "15px", height: "15px" }} /> Group Buy Login <ArrowRight style={{ width: "15px", height: "15px" }} />
          </div>
        </button>

        {/* SECONDARY — Lonely Vial */}
        <button onClick={() => {}} style={{ border: "1.5px solid #C9B8A8", padding: "18px 20px", display: "flex", alignItems: "center", gap: "16px", background: "transparent", cursor: "pointer", width: "100%", textAlign: "left" }}>
          <div style={{ width: "48px", height: "48px", border: "1.5px solid #C9B8A8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FlaskConical style={{ width: "22px", height: "22px", color: "#7C3AED" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#9C8575", marginBottom: "3px" }}>Single Vials</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#1C1007", letterSpacing: "-0.01em" }}>The Lonely Vial</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#7C6655", marginTop: "2px" }}>Individual vials, no minimums. Pay with USDT.</div>
          </div>
          <ArrowRight style={{ width: "16px", height: "16px", color: "#9C8575" }} />
        </button>

        {/* TERTIARY — row list */}
        <div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#9C8575", marginBottom: "10px", borderBottom: "1px solid #E8DDD0", paddingBottom: "6px" }}>Tools &amp; Resources</div>
          {[
            { icon: Search, label: "Manage your order", sub: "Track, edit, pay, upload QR code" },
            { icon: TestTube, label: "Lab Reports", sub: "352+ independent Janoshik CoA tests" },
            { icon: ShieldCheck, label: "Safety Calculator", sub: "Endotoxin &amp; BAC water safety" },
          ].map(({ icon: Icon, label, sub }, i, arr) => (
            <button key={label} onClick={() => {}} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 0", width: "100%", textAlign: "left", background: "transparent", border: "none", borderBottom: i < arr.length - 1 ? "1px solid #E8DDD0" : "none", cursor: "pointer" }}>
              <Icon style={{ width: "15px", height: "15px", color: "#9C8575", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#1C1007" }}>{label}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#9C8575", marginTop: "1px" }} dangerouslySetInnerHTML={{ __html: sub }} />
              </div>
              <ArrowRight style={{ width: "14px", height: "14px", color: "#C9B8A8" }} />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #E8DDD0", paddingTop: "12px" }}>
          <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "5px", fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#2AABEE", textDecoration: "none" }}><MessageCircle style={{ width: "13px", height: "13px" }} /> @urbanblend789</a>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#9C8575" }}>Pay with USDT · Ethereum</span>
        </div>
      </main>
    </div>
  );
}
