import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ChevronRight, Cpu } from "lucide-react";
export function TechStore() {
  return (
    <div style={{ width:"100%", minHeight:"100vh", background:"#F5F5F7", fontFamily:"-apple-system, 'Helvetica Neue', Inter, sans-serif", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"rgba(245,245,247,0.85)", padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", backdropFilter:"blur(12px)", borderBottom:"0.5px solid rgba(0,0,0,0.1)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}><Cpu style={{ width:"16px", height:"16px", color:"#1D1D1F" }} /><span style={{ fontSize:"16px", fontWeight:600, color:"#1D1D1F", letterSpacing:"-0.02em" }}>Salt &amp; Peps</span></div>
        <button onClick={() => {}} style={{ background:"transparent", color:"#0071E3", border:"none", fontSize:"14px", fontWeight:400, cursor:"pointer", padding:0 }}>Login</button>
      </div>
      <main style={{ flex:1, padding:"0 0 32px" }}>
        <div style={{ background:"white", padding:"32px 20px 28px" }}>
          <div style={{ fontSize:"11px", color:"#6E6E73", marginBottom:"8px" }}>Peptide Research Store</div>
          <h1 style={{ fontSize:"36px", fontWeight:700, color:"#1D1D1F", letterSpacing:"-0.03em", lineHeight:1.05, margin:0 }}>Grade A.<br />Lab verified.</h1>
          <p style={{ fontSize:"16px", color:"#6E6E73", marginTop:"10px", lineHeight:1.5, fontWeight:400 }}>126+ products. Group buy pricing.</p>
          <button onClick={() => {}} style={{ marginTop:"20px", background:"#0071E3", color:"white", border:"none", borderRadius:"980px", padding:"13px 28px", fontSize:"15px", fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:"8px" }}><Users style={{ width:"16px", height:"16px" }} /> Group Buy Login</button>
        </div>
        <div style={{ padding:"24px 20px 0" }}>
          {[{ icon:FlaskConical, label:"The Lonely Vial", sub:"Individual vials, no minimums", color:"#5E5CE6" },{ icon:Search, label:"Manage your order", sub:"Track, edit, pay, upload QR", color:"#FF9500" },{ icon:TestTube, label:"Lab Reports", sub:"352+ independent CoA tests", color:"#32ADE6" },{ icon:ShieldCheck, label:"Safety Calculator", sub:"Endotoxin & BAC water safety", color:"#34C759" }].map(({ icon:Icon, label, sub, color }, i, arr) => (
            <button key={label} onClick={() => {}} style={{ width:"100%", display:"flex", alignItems:"center", gap:"14px", padding:"14px 0", background:"transparent", border:"none", textAlign:"left", cursor:"pointer", borderBottom: i < arr.length-1 ? "0.5px solid rgba(0,0,0,0.1)" : "none" }}>
              <div style={{ width:"42px", height:"42px", borderRadius:"10px", background:`${color}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon style={{ width:"20px", height:"20px", color }} /></div>
              <div style={{ flex:1 }}><div style={{ fontSize:"16px", fontWeight:500, color:"#1D1D1F", letterSpacing:"-0.01em" }}>{label}</div><div style={{ fontSize:"13px", color:"#6E6E73", marginTop:"2px" }}>{sub}</div></div>
              <ChevronRight style={{ width:"18px", height:"18px", color:"#C7C7CC" }} />
            </button>
          ))}
        </div>
        <div style={{ padding:"24px 20px 0", textAlign:"center" }}><a href="https://t.me/urbanblend789" style={{ fontSize:"13px", fontWeight:500, color:"#0071E3", textDecoration:"none" }}>@urbanblend789 · USDT · Ethereum</a></div>
      </main>
    </div>
  );
}
