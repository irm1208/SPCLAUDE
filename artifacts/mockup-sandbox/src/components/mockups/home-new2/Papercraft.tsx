import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ArrowRight, ChevronRight } from "lucide-react";
export function Papercraft() {
  return (
    <div style={{ width:"100%", minHeight:"100vh", background:"#F5F0E8", fontFamily:"'Georgia', 'Times New Roman', serif", display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"2px solid #2C2416" }}>
        <span style={{ fontSize:"17px", fontWeight:700, color:"#2C2416", letterSpacing:"-0.01em" }}>Salt &amp; Peps</span>
        <button onClick={() => {}} style={{ background:"#2C2416", color:"#F5F0E8", border:"none", fontFamily:"Inter, sans-serif", fontSize:"11px", fontWeight:600, padding:"7px 14px", cursor:"pointer", letterSpacing:"0.05em" }}>Login</button>
      </div>
      <div style={{ padding:"28px 20px 24px", borderBottom:"1px solid rgba(44,36,22,0.15)" }}>
        <div style={{ fontFamily:"Inter, sans-serif", fontSize:"10px", fontWeight:600, letterSpacing:"0.2em", textTransform:"uppercase", color:"rgba(44,36,22,0.5)", marginBottom:"10px" }}>Hand-curated · Lab verified</div>
        <h1 style={{ fontSize:"40px", fontWeight:700, color:"#2C2416", lineHeight:1, letterSpacing:"-0.02em", margin:0 }}>Peptide<br />quality<br /><em style={{ color:"#8B6914" }}>crafted.</em></h1>
        <p style={{ fontFamily:"Inter, sans-serif", fontSize:"13px", color:"rgba(44,36,22,0.6)", marginTop:"12px", lineHeight:1.65 }}>Group buys with independent lab verification. 126+ products.</p>
        <button onClick={() => {}} style={{ marginTop:"20px", background:"#2C2416", color:"#F5F0E8", border:"none", padding:"14px 22px", fontFamily:"Inter, sans-serif", fontSize:"13px", fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:"8px" }}><Users style={{ width:"15px", height:"15px" }} /> Group Buy Login <ArrowRight style={{ width:"15px", height:"15px" }} /></button>
      </div>
      <div style={{ flex:1, padding:"20px", display:"flex", flexDirection:"column", gap:"0" }}>
        <button onClick={() => {}} style={{ border:"2px solid #2C2416", background:"transparent", padding:"16px", display:"flex", alignItems:"center", gap:"14px", cursor:"pointer", textAlign:"left", width:"100%", marginBottom:"10px" }}>
          <FlaskConical style={{ width:"20px", height:"20px", color:"#8B6914", flexShrink:0 }} />
          <div style={{ flex:1 }}><div style={{ fontSize:"16px", fontWeight:700, color:"#2C2416" }}>The Lonely Vial</div><div style={{ fontFamily:"Inter, sans-serif", fontSize:"11px", color:"rgba(44,36,22,0.55)", marginTop:"2px" }}>Individual · No minimum · USDT</div></div>
          <ChevronRight style={{ width:"16px", height:"16px", color:"#8B6914" }} />
        </button>
        {[{ icon:Search, label:"Manage Order", sub:"Track · Edit · Pay" },{ icon:TestTube, label:"Lab Reports", sub:"352+ Janoshik CoA tests" },{ icon:ShieldCheck, label:"Safety Calculator", sub:"Endotoxin & BAC" }].map(({ icon:Icon, label, sub }, i, arr) => (
          <button key={label} onClick={() => {}} style={{ background:"transparent", border:"none", borderBottom:"1px solid rgba(44,36,22,0.12)", padding:"13px 0", display:"flex", alignItems:"center", gap:"12px", cursor:"pointer", width:"100%", textAlign:"left" }}>
            <Icon style={{ width:"15px", height:"15px", color:"rgba(44,36,22,0.5)", flexShrink:0 }} />
            <div style={{ flex:1 }}><div style={{ fontSize:"14px", fontWeight:600, color:"#2C2416", fontFamily:"Inter, sans-serif" }}>{label}</div><div style={{ fontSize:"11px", color:"rgba(44,36,22,0.45)", fontFamily:"Inter, sans-serif", marginTop:"1px" }}>{sub}</div></div>
          </button>
        ))}
        <div style={{ paddingTop:"16px", textAlign:"center" }}><a href="https://t.me/urbanblend789" style={{ fontFamily:"Inter, sans-serif", fontSize:"11px", color:"#8B6914", textDecoration:"none" }}>@urbanblend789 · USDT · ETH</a></div>
      </div>
    </div>
  );
}
