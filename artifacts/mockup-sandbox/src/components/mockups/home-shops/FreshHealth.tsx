import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ChevronRight, Leaf } from "lucide-react";
export function FreshHealth() {
  return (
    <div style={{ width:"100%", minHeight:"100vh", background:"#F0FBF4", fontFamily:"Inter, sans-serif", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"#16A34A", padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}><Leaf style={{ width:"18px", height:"18px", color:"white" }} /><span style={{ fontSize:"16px", fontWeight:800, color:"white", letterSpacing:"-0.01em" }}>Salt &amp; Peps</span></div>
        <button onClick={() => {}} style={{ background:"white", color:"#16A34A", border:"none", borderRadius:"20px", fontSize:"12px", fontWeight:700, padding:"7px 14px", cursor:"pointer" }}>Login</button>
      </div>
      <div style={{ background:"white", padding:"20px", borderBottom:"1px solid #DCFCE7" }}>
        <div style={{ fontSize:"10px", fontWeight:700, color:"#16A34A", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:"6px" }}>Lab Verified · Group Buys</div>
        <h1 style={{ fontSize:"28px", fontWeight:800, color:"#14532D", letterSpacing:"-0.02em", lineHeight:1.1, margin:"0 0 10px" }}>Peptides.<br />Pure &amp; tested.</h1>
        <button onClick={() => {}} style={{ background:"#16A34A", color:"white", border:"none", borderRadius:"12px", padding:"14px 20px", fontSize:"13px", fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:"8px", width:"100%" }}><Users style={{ width:"15px", height:"15px" }} /> Group Buy Login →</button>
      </div>
      <main style={{ flex:1, padding:"16px", display:"flex", flexDirection:"column", gap:"10px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
          {[{ icon:FlaskConical, label:"Lonely Vial", sub:"No minimums", color:"#16A34A", bg:"#DCFCE7" },{ icon:Search, label:"My Order", sub:"Track & pay", color:"#D97706", bg:"#FEF3C7" }].map(({ icon:Icon, label, sub, color, bg }) => (
            <button key={label} onClick={() => {}} style={{ background:bg, border:"none", borderRadius:"14px", padding:"16px 12px", cursor:"pointer", textAlign:"left" }}><Icon style={{ width:"20px", height:"20px", color, marginBottom:"8px" }} /><div style={{ fontSize:"13px", fontWeight:700, color:"#14532D" }}>{label}</div><div style={{ fontSize:"10px", color:"#6B7280", marginTop:"2px" }}>{sub}</div></button>
          ))}
        </div>
        <div style={{ background:"white", borderRadius:"16px", border:"1px solid #D1FAE5", overflow:"hidden" }}>
          <div style={{ padding:"12px 16px 6px", fontSize:"12px", fontWeight:700, color:"#14532D" }}>Tools &amp; Resources</div>
          {[{ icon:TestTube, label:"Lab Reports", sub:"352+ CoA tests", color:"#0891B2" },{ icon:ShieldCheck, label:"Safety Calculator", sub:"Endotoxin & BAC", color:"#16A34A" }].map(({ icon:Icon, label, sub, color }, i, arr) => (
            <button key={label} onClick={() => {}} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"12px 16px", background:"transparent", border:"none", borderBottom: i < arr.length-1 ? "1px solid #F0FBF4" : "none", cursor:"pointer", width:"100%", textAlign:"left" }}><Icon style={{ width:"16px", height:"16px", color, flexShrink:0 }} /><div style={{ flex:1 }}><div style={{ fontSize:"13px", fontWeight:600, color:"#14532D" }}>{label}</div><div style={{ fontSize:"10px", color:"#6B7280", marginTop:"1px" }}>{sub}</div></div><ChevronRight style={{ width:"14px", height:"14px", color:"#D1FAE5" }} /></button>
          ))}
        </div>
        <div style={{ background:"#16A34A", borderRadius:"14px", padding:"14px 16px", display:"flex", alignItems:"center", gap:"10px" }}>
          <div><div style={{ fontSize:"13px", fontWeight:700, color:"white" }}>126+ verified products</div><div style={{ fontSize:"11px", color:"rgba(255,255,255,0.75)", marginTop:"2px" }}>USDT · Ethereum · Discreet shipping</div></div>
        </div>
        <div style={{ textAlign:"center" }}><a href="https://t.me/urbanblend789" style={{ fontSize:"11px", color:"#16A34A", textDecoration:"none", fontWeight:600 }}>@urbanblend789</a></div>
      </main>
    </div>
  );
}
