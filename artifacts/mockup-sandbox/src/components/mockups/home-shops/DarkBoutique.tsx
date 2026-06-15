import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ArrowRight, ChevronRight } from "lucide-react";
export function DarkBoutique() {
  return (
    <div style={{ width:"100%", minHeight:"100vh", background:"#111111", fontFamily:"Inter, sans-serif", display:"flex", flexDirection:"column", color:"white" }}>
      <div style={{ padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:"14px", fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase" }}>Salt &amp; Peps</span>
        <button onClick={() => {}} style={{ background:"white", color:"#111", border:"none", fontSize:"11px", fontWeight:700, padding:"8px 16px", cursor:"pointer", letterSpacing:"0.08em", textTransform:"uppercase" }}>Login</button>
      </div>
      <div style={{ padding:"20px", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.3)", letterSpacing:"0.3em", textTransform:"uppercase", marginBottom:"10px" }}>SS26 Collection</div>
        <h1 style={{ fontSize:"44px", fontWeight:800, lineHeight:0.9, letterSpacing:"-0.04em", margin:0 }}>LAB<br />GRADE<br />PEPTIDES</h1>
        <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.5)", marginTop:"12px", lineHeight:1.5 }}>Independent lab verified. Group buy pricing. Discreet shipping.</p>
      </div>
      <div style={{ padding:"20px", display:"flex", flexDirection:"column", gap:"8px", flex:1 }}>
        <button onClick={() => {}} style={{ background:"white", color:"#111", border:"none", padding:"18px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", width:"100%" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}><Users style={{ width:"18px", height:"18px" }} /><div><div style={{ fontSize:"14px", fontWeight:800, letterSpacing:"-0.01em" }}>Group Buy Login</div><div style={{ fontSize:"10px", color:"#666", marginTop:"1px" }}>126 products · Round #12</div></div></div>
          <ArrowRight style={{ width:"16px", height:"16px" }} />
        </button>
        <button onClick={() => {}} style={{ background:"rgba(255,255,255,0.06)", color:"white", border:"1px solid rgba(255,255,255,0.1)", padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", width:"100%" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}><FlaskConical style={{ width:"16px", height:"16px", color:"rgba(255,255,255,0.7)" }} /><div><div style={{ fontSize:"13px", fontWeight:700 }}>Lonely Vial</div><div style={{ fontSize:"10px", color:"rgba(255,255,255,0.4)", marginTop:"1px" }}>Single units · USDT</div></div></div>
          <ArrowRight style={{ width:"14px", height:"14px", color:"rgba(255,255,255,0.4)" }} />
        </button>
        <div style={{ height:"1px", background:"rgba(255,255,255,0.06)", margin:"4px 0" }} />
        {[{ icon:Search, label:"Manage Order", sub:"Track · Edit · Pay" },{ icon:TestTube, label:"Lab Reports", sub:"352+ Janoshik CoA" },{ icon:ShieldCheck, label:"Safety Calculator", sub:"Endotoxin & BAC" }].map(({ icon:Icon, label, sub }, i, arr) => (
          <button key={label} onClick={() => {}} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"12px 0", background:"transparent", border:"none", borderBottom: i < arr.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none", cursor:"pointer", width:"100%", textAlign:"left" }}>
            <Icon style={{ width:"15px", height:"15px", color:"rgba(255,255,255,0.4)", flexShrink:0 }} />
            <div style={{ flex:1 }}><div style={{ fontSize:"13px", fontWeight:600, color:"rgba(255,255,255,0.85)" }}>{label}</div><div style={{ fontSize:"10px", color:"rgba(255,255,255,0.3)", marginTop:"1px" }}>{sub}</div></div>
            <ChevronRight style={{ width:"13px", height:"13px", color:"rgba(255,255,255,0.15)" }} />
          </button>
        ))}
      </div>
      <div style={{ padding:"16px 20px", display:"flex", justifyContent:"space-between", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
        <a href="https://t.me/urbanblend789" style={{ fontSize:"11px", color:"rgba(255,255,255,0.4)", textDecoration:"none" }}>@urbanblend789</a>
        <span style={{ fontSize:"10px", color:"rgba(255,255,255,0.2)", letterSpacing:"0.08em" }}>USDT · ETH</span>
      </div>
    </div>
  );
}
