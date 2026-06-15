import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ArrowRight, ChevronRight } from "lucide-react";
export function DarkLuxury() {
  return (
    <div style={{ width:"100%", minHeight:"100vh", background:"#080808", fontFamily:"'Georgia', serif", display:"flex", flexDirection:"column", color:"white" }}>
      <div style={{ padding:"18px 24px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid rgba(212,175,55,0.15)" }}>
        <span style={{ fontSize:"16px", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" }}>Salt &amp; Peps</span>
        <button onClick={() => {}} style={{ background:"transparent", color:"#D4AF37", border:"1px solid #D4AF37", fontSize:"10px", fontWeight:400, padding:"7px 16px", cursor:"pointer", letterSpacing:"0.2em", textTransform:"uppercase", fontFamily:"Inter, sans-serif" }}>Enter</button>
      </div>
      <div style={{ padding:"40px 24px 36px", borderBottom:"1px solid rgba(212,175,55,0.1)" }}>
        <div style={{ fontSize:"10px", fontWeight:400, color:"#D4AF37", letterSpacing:"0.4em", textTransform:"uppercase", marginBottom:"16px", fontFamily:"Inter, sans-serif" }}>Peptide Research · Grade A</div>
        <h1 style={{ fontSize:"46px", fontWeight:700, color:"white", lineHeight:0.9, letterSpacing:"-0.03em", margin:0 }}>Uncom<br />promising<br /><em style={{ color:"#D4AF37" }}>quality.</em></h1>
      </div>
      <div style={{ padding:"24px" }}>
        <button onClick={() => {}} style={{ width:"100%", background:"#D4AF37", color:"#080808", border:"none", padding:"18px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", marginBottom:"1px" }}>
          <div style={{ textAlign:"left" }}><div style={{ fontSize:"10px", fontFamily:"Inter, sans-serif", fontWeight:600, letterSpacing:"0.2em", textTransform:"uppercase", color:"rgba(8,8,8,0.6)", marginBottom:"4px" }}>Primary</div><div style={{ fontSize:"20px", fontWeight:700, letterSpacing:"-0.01em" }}>Group Buy Login</div></div>
          <ArrowRight style={{ width:"20px", height:"20px" }} />
        </button>
        <div style={{ height:"1px", background:"rgba(212,175,55,0.15)", margin:"20px 0" }} />
        <button onClick={() => {}} style={{ width:"100%", background:"transparent", border:"none", borderBottom:"1px solid rgba(255,255,255,0.06)", padding:"14px 0", display:"flex", alignItems:"center", gap:"12px", cursor:"pointer", textAlign:"left", marginBottom:"8px" }}>
          <FlaskConical style={{ width:"18px", height:"18px", color:"#D4AF37", flexShrink:0 }} />
          <div style={{ flex:1, fontFamily:"Inter, sans-serif" }}><div style={{ fontSize:"14px", fontWeight:600 }}>The Lonely Vial</div><div style={{ fontSize:"11px", color:"rgba(255,255,255,0.35)", marginTop:"1px" }}>Individual units · No minimum · USDT</div></div>
          <ArrowRight style={{ width:"14px", height:"14px", color:"rgba(212,175,55,0.5)" }} />
        </button>
        {[{ icon:Search, label:"Manage Order", sub:"Track · Edit · Pay" },{ icon:TestTube, label:"Lab Reports", sub:"352+ Janoshik CoA" },{ icon:ShieldCheck, label:"Safety Calculator", sub:"Endotoxin & BAC" }].map(({ icon:Icon, label, sub }, i, arr) => (
          <button key={label} onClick={() => {}} style={{ width:"100%", background:"transparent", border:"none", borderBottom: i < arr.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none", padding:"12px 0", display:"flex", alignItems:"center", gap:"10px", cursor:"pointer", textAlign:"left" }}>
            <Icon style={{ width:"14px", height:"14px", color:"rgba(212,175,55,0.6)", flexShrink:0 }} />
            <div style={{ flex:1, fontFamily:"Inter, sans-serif" }}><div style={{ fontSize:"13px", fontWeight:500, color:"rgba(255,255,255,0.8)" }}>{label}</div><div style={{ fontSize:"10px", color:"rgba(255,255,255,0.3)", marginTop:"1px" }}>{sub}</div></div>
          </button>
        ))}
      </div>
      <div style={{ marginTop:"auto", padding:"20px 24px", borderTop:"1px solid rgba(212,175,55,0.1)", display:"flex", justifyContent:"space-between" }}>
        <a href="https://t.me/urbanblend789" style={{ fontFamily:"Inter, sans-serif", fontSize:"11px", color:"#D4AF37", textDecoration:"none" }}>@urbanblend789</a>
        <span style={{ fontFamily:"Inter, sans-serif", fontSize:"10px", color:"rgba(255,255,255,0.25)", letterSpacing:"0.1em" }}>USDT · ETH</span>
      </div>
    </div>
  );
}
