import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ChevronRight, ArrowRight } from "lucide-react";
export function LuxuryPharma() {
  return (
    <div style={{ width:"100%", minHeight:"100vh", background:"#FAFAF8", fontFamily:"'Georgia', serif", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"#1A1A1A", padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div><div style={{ fontSize:"10px", fontWeight:400, color:"rgba(255,255,255,0.4)", letterSpacing:"0.3em", textTransform:"uppercase", marginBottom:"2px" }}>Est. Research Grade</div><span style={{ fontWeight:700, fontSize:"16px", color:"white", letterSpacing:"-0.01em" }}>Salt &amp; Peps</span></div>
        <button onClick={() => {}} style={{ background:"transparent", color:"#C9A84C", border:"1px solid #C9A84C", fontSize:"11px", fontWeight:400, padding:"6px 14px", cursor:"pointer", letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:"Inter, sans-serif" }}>Login</button>
      </div>
      <div style={{ background:"#1A1A1A", padding:"32px 20px 40px" }}>
        <div style={{ fontSize:"10px", fontWeight:400, color:"#C9A84C", letterSpacing:"0.3em", textTransform:"uppercase", marginBottom:"10px", fontFamily:"Inter, sans-serif" }}>Peptide Research Community</div>
        <h1 style={{ fontSize:"42px", fontWeight:700, color:"white", lineHeight:1, letterSpacing:"-0.03em", margin:0 }}>Precision.<br /><span style={{ color:"#C9A84C" }}>Purity.</span></h1>
        <p style={{ fontFamily:"Inter, sans-serif", fontSize:"13px", color:"rgba(255,255,255,0.5)", marginTop:"12px", lineHeight:1.6 }}>Independent lab verified peptides, group buy pricing.</p>
        <button onClick={() => {}} style={{ marginTop:"20px", background:"#C9A84C", color:"#1A1A1A", border:"none", padding:"14px 24px", fontSize:"13px", fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:"8px", fontFamily:"Inter, sans-serif", letterSpacing:"0.05em", textTransform:"uppercase" }}><Users style={{ width:"14px", height:"14px" }} /> Group Buy Login <ArrowRight style={{ width:"14px", height:"14px" }} /></button>
      </div>
      <div style={{ flex:1, padding:"20px 16px", display:"flex", flexDirection:"column", gap:"10px" }}>
        <button onClick={() => {}} style={{ background:"white", border:"1px solid #E5E5E5", padding:"18px 16px", display:"flex", alignItems:"center", gap:"14px", cursor:"pointer", width:"100%", textAlign:"left" }}>
          <FlaskConical style={{ width:"20px", height:"20px", color:"#C9A84C", flexShrink:0 }} />
          <div style={{ flex:1 }}><div style={{ fontSize:"15px", fontWeight:700, color:"#1A1A1A", letterSpacing:"-0.01em" }}>The Lonely Vial</div><div style={{ fontFamily:"Inter, sans-serif", fontSize:"11px", color:"#9CA3AF", marginTop:"2px" }}>Individual vials · No minimum · USDT</div></div>
          <ChevronRight style={{ width:"16px", height:"16px", color:"#C9A84C" }} />
        </button>
        {[{ icon:Search, label:"Manage Order", sub:"Track · Edit · Pay", color:"#C9A84C" },{ icon:TestTube, label:"Lab Reports", sub:"352+ Janoshik CoA tests", color:"#0891B2" },{ icon:ShieldCheck, label:"Safety Calculator", sub:"Endotoxin & BAC water", color:"#059669" }].map(({ icon:Icon, label, sub, color }, i, arr) => (
          <button key={label} onClick={() => {}} style={{ background:"transparent", border:"none", borderBottom: i < arr.length-1 ? "1px solid #F0EDE8" : "none", padding:"13px 0", display:"flex", alignItems:"center", gap:"12px", cursor:"pointer", width:"100%", textAlign:"left" }}>
            <Icon style={{ width:"16px", height:"16px", color, flexShrink:0 }} />
            <div style={{ flex:1 }}><div style={{ fontSize:"14px", fontWeight:600, color:"#1A1A1A", fontFamily:"Inter, sans-serif" }}>{label}</div><div style={{ fontSize:"11px", color:"#9CA3AF", fontFamily:"Inter, sans-serif", marginTop:"1px" }}>{sub}</div></div>
            <ArrowRight style={{ width:"12px", height:"12px", color:"#C9A84C" }} />
          </button>
        ))}
        <div style={{ paddingTop:"12px", textAlign:"center", borderTop:"1px solid #E5E5E5" }}><a href="https://t.me/urbanblend789" style={{ fontFamily:"Inter, sans-serif", fontSize:"11px", color:"#C9A84C", textDecoration:"none" }}>@urbanblend789 · USDT · Ethereum</a></div>
      </div>
    </div>
  );
}
