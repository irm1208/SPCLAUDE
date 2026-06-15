import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ChevronRight, ArrowRight } from "lucide-react";
export function IndigoV3Mist() {
  return (
    <div style={{ width:"100%", minHeight:"100vh", background:"linear-gradient(180deg,#EEF2FF 0%,#F5F7FF 50%,#FFFFFF 100%)", fontFamily:"Inter, sans-serif", display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div><div style={{ fontSize:"10px", color:"#818CF8", fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"2px" }}>Soft Mist · Indigo</div><span style={{ fontSize:"17px", fontWeight:700, color:"#312E81", letterSpacing:"-0.02em" }}>Salt &amp; Peps</span></div>
        <button onClick={() => {}} style={{ background:"#4F46E5", color:"white", border:"none", borderRadius:"24px", fontSize:"12px", fontWeight:600, padding:"7px 16px", cursor:"pointer" }}>Login</button>
      </div>
      <div style={{ padding:"16px 20px 28px" }}>
        <div style={{ fontSize:"34px", fontWeight:800, color:"#312E81", letterSpacing:"-0.03em", lineHeight:1.05 }}>Peptide group<br />buys, <em style={{ color:"#818CF8", fontWeight:700, fontStyle:"normal" }}>verified.</em></div>
        <p style={{ fontSize:"13px", color:"#6B7280", marginTop:"10px", lineHeight:1.6 }}>126+ products with independent lab CoA tests. Group buy pricing.</p>
        <button onClick={() => {}} style={{ marginTop:"16px", background:"#4F46E5", color:"white", border:"none", borderRadius:"14px", padding:"14px 20px", fontSize:"13px", fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:"8px" }}><Users style={{ width:"15px", height:"15px" }} /> Group Buy Login <ArrowRight style={{ width:"15px", height:"15px" }} /></button>
      </div>
      <div style={{ flex:1, padding:"0 16px 24px", display:"flex", flexDirection:"column", gap:"10px" }}>
        <div style={{ display:"flex", gap:"10px" }}>
          {[{ icon:FlaskConical, label:"Lonely Vial", sub:"No minimum", color:"#4F46E5", bg:"white" },{ icon:Search, label:"My Order", sub:"Track & edit", color:"#D97706", bg:"white" }].map(({ icon:Icon, label, sub, color, bg }) => (
            <button key={label} onClick={() => {}} style={{ flex:1, background:bg, border:"1px solid #E0E7FF", borderRadius:"18px", padding:"16px 14px", cursor:"pointer", textAlign:"left" }}><Icon style={{ width:"20px", height:"20px", color, marginBottom:"10px" }} /><div style={{ fontSize:"14px", fontWeight:700, color:"#312E81" }}>{label}</div><div style={{ fontSize:"11px", color:"#9CA3AF", marginTop:"2px" }}>{sub}</div></button>
          ))}
        </div>
        <div style={{ background:"white", borderRadius:"18px", border:"1px solid #E0E7FF", overflow:"hidden" }}>
          {[{ icon:TestTube, label:"Lab Reports", sub:"352+ Janoshik CoA tests", color:"#0891B2" },{ icon:ShieldCheck, label:"Safety Calculator", sub:"Endotoxin & BAC water", color:"#059669" }].map(({ icon:Icon, label, sub, color }, i, arr) => (
            <button key={label} onClick={() => {}} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"14px 16px", background:"transparent", border:"none", borderBottom: i < arr.length-1 ? "1px solid #EEF2FF" : "none", cursor:"pointer", width:"100%", textAlign:"left" }}><div style={{ width:"36px", height:"36px", borderRadius:"10px", background:`${color}12`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon style={{ width:"16px", height:"16px", color }} /></div><div style={{ flex:1 }}><div style={{ fontSize:"13px", fontWeight:600, color:"#312E81" }}>{label}</div><div style={{ fontSize:"11px", color:"#9CA3AF", marginTop:"1px" }}>{sub}</div></div><ChevronRight style={{ width:"14px", height:"14px", color:"#C7D2FE" }} /></button>
          ))}
        </div>
        <div style={{ textAlign:"center" }}><a href="https://t.me/urbanblend789" style={{ fontSize:"11px", color:"#4F46E5", textDecoration:"none", fontWeight:600 }}>@urbanblend789 · USDT · ETH</a></div>
      </div>
    </div>
  );
}
