import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ChevronRight, Sparkles } from "lucide-react";
export function NightBazaar() {
  return (
    <div style={{ width:"100%", minHeight:"100vh", background:"#0C0A1E", fontFamily:"Inter, sans-serif", display:"flex", flexDirection:"column", color:"white" }}>
      <div style={{ padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}><Sparkles style={{ width:"15px", height:"15px", color:"#A78BFA" }} /><span style={{ fontSize:"15px", fontWeight:700, letterSpacing:"-0.01em" }}>Salt &amp; Peps</span></div>
        <button onClick={() => {}} style={{ background:"linear-gradient(135deg,#7C3AED,#A78BFA)", color:"white", border:"none", borderRadius:"20px", fontSize:"12px", fontWeight:600, padding:"7px 14px", cursor:"pointer" }}>Login</button>
      </div>
      <div style={{ padding:"16px 20px 28px" }}>
        <div style={{ fontSize:"10px", color:"#A78BFA", letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:"8px" }}>✦ Night Market ✦</div>
        <h1 style={{ fontSize:"36px", fontWeight:800, letterSpacing:"-0.03em", lineHeight:1, margin:0 }}>Peptide<br /><span style={{ background:"linear-gradient(90deg,#A78BFA,#60A5FA)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>bazaar</span><br />open.</h1>
      </div>
      <div style={{ padding:"0 20px 16px" }}>
        <button onClick={() => {}} style={{ width:"100%", background:"linear-gradient(135deg,#7C3AED,#4F46E5)", border:"none", borderRadius:"20px", padding:"20px", display:"flex", flexDirection:"column", gap:"12px", cursor:"pointer", textAlign:"left" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:"6px", background:"rgba(255,255,255,0.15)", borderRadius:"100px", padding:"4px 10px" }}><Users style={{ width:"11px", height:"11px", color:"white" }} /><span style={{ fontSize:"10px", fontWeight:700, color:"white", letterSpacing:"0.08em" }}>GROUP BUYS</span></div>
          <div style={{ fontSize:"24px", fontWeight:800, color:"white", letterSpacing:"-0.02em", lineHeight:1 }}>Group Buy Login</div>
          <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.65)" }}>126 products · Round #12 · 5 days left</div>
        </button>
      </div>
      <div style={{ padding:"0 20px", display:"flex", gap:"10px", marginBottom:"16px" }}>
        {[{ icon:FlaskConical, label:"Lonely Vial", color:"#60A5FA", bg:"rgba(96,165,250,0.1)" },{ icon:Search, label:"My Order", color:"#FBBF24", bg:"rgba(251,191,36,0.1)" }].map(({ icon:Icon, label, color, bg }) => (
          <button key={label} onClick={() => {}} style={{ flex:1, background:bg, border:`1px solid ${color}33`, borderRadius:"16px", padding:"14px", cursor:"pointer", textAlign:"left" }}><Icon style={{ width:"18px", height:"18px", color, marginBottom:"8px" }} /><div style={{ fontSize:"13px", fontWeight:600, color:"white" }}>{label}</div></button>
        ))}
      </div>
      <div style={{ padding:"0 20px", flex:1 }}>
        {[{ icon:TestTube, label:"Lab Reports", sub:"352+ CoA tests", color:"#34D399" },{ icon:ShieldCheck, label:"Safety Calculator", sub:"Endotoxin & BAC", color:"#A78BFA" }].map(({ icon:Icon, label, sub, color }, i, arr) => (
          <button key={label} onClick={() => {}} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"13px 0", background:"transparent", border:"none", borderBottom: i < arr.length-1 ? "1px solid rgba(255,255,255,0.06)" : "none", cursor:"pointer", width:"100%", textAlign:"left" }}><Icon style={{ width:"15px", height:"15px", color, flexShrink:0 }} /><div style={{ flex:1 }}><div style={{ fontSize:"13px", fontWeight:600, color:"rgba(255,255,255,0.9)" }}>{label}</div><div style={{ fontSize:"10px", color:"rgba(255,255,255,0.4)", marginTop:"1px" }}>{sub}</div></div><ChevronRight style={{ width:"13px", height:"13px", color:"rgba(255,255,255,0.2)" }} /></button>
        ))}
      </div>
      <div style={{ padding:"16px 20px", textAlign:"center" }}><a href="https://t.me/urbanblend789" style={{ fontSize:"11px", color:"#A78BFA", textDecoration:"none", fontWeight:600 }}>@urbanblend789 · USDT · ETH</a></div>
    </div>
  );
}
