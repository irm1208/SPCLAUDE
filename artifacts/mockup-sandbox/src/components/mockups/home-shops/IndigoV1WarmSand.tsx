import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ChevronRight, ArrowRight } from "lucide-react";
export function IndigoV1WarmSand() {
  return (
    <div style={{ width:"100%", minHeight:"100vh", background:"#F5EDD8", fontFamily:"Inter, sans-serif", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"#3730A3", padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:"16px", fontWeight:800, color:"white", letterSpacing:"-0.02em" }}>Salt &amp; Peps</span>
        <button onClick={() => {}} style={{ background:"#F5EDD8", color:"#3730A3", border:"none", borderRadius:"20px", fontSize:"12px", fontWeight:700, padding:"7px 14px", cursor:"pointer" }}>Login</button>
      </div>
      <div style={{ background:"#3730A3", padding:"24px 20px 40px" }}>
        <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.5)", letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:"10px" }}>Warm Sand · Indigo</div>
        <h1 style={{ fontSize:"36px", fontWeight:800, color:"white", lineHeight:1, letterSpacing:"-0.03em", margin:0 }}>Quality<br />peptides.<br /><span style={{ color:"#FDE68A" }}>Tested.</span></h1>
      </div>
      <div style={{ flex:1, padding:"20px 16px", display:"flex", flexDirection:"column", gap:"10px", marginTop:"-20px" }}>
        <button onClick={() => {}} style={{ background:"white", borderRadius:"20px", border:"none", padding:"20px", display:"flex", alignItems:"center", gap:"14px", cursor:"pointer", width:"100%", textAlign:"left", boxShadow:"0 4px 20px rgba(55,48,163,0.15)" }}>
          <div style={{ width:"48px", height:"48px", borderRadius:"14px", background:"#EDE9FE", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Users style={{ width:"24px", height:"24px", color:"#3730A3" }} /></div>
          <div style={{ flex:1 }}><div style={{ fontSize:"11px", color:"#3730A3", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"3px" }}>Primary</div><div style={{ fontSize:"17px", fontWeight:800, color:"#1E1B4B", letterSpacing:"-0.01em" }}>Group Buy Login</div><div style={{ fontSize:"11px", color:"#9CA3AF", marginTop:"2px" }}>126 products · Round #12</div></div>
          <ArrowRight style={{ width:"18px", height:"18px", color:"#3730A3" }} />
        </button>
        <div style={{ display:"flex", gap:"10px" }}>
          {[{ icon:FlaskConical, label:"Lonely Vial", sub:"Single units", color:"#3730A3", bg:"white" },{ icon:Search, label:"My Order", sub:"Track & pay", color:"#D97706", bg:"#FEF9EC" }].map(({ icon:Icon, label, sub, color, bg }) => (
            <button key={label} onClick={() => {}} style={{ flex:1, background:bg, borderRadius:"16px", border:"none", padding:"16px 12px", cursor:"pointer", textAlign:"left", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}><Icon style={{ width:"20px", height:"20px", color, marginBottom:"8px" }} /><div style={{ fontSize:"13px", fontWeight:700, color:"#1E1B4B" }}>{label}</div><div style={{ fontSize:"10px", color:"#9CA3AF", marginTop:"2px" }}>{sub}</div></button>
          ))}
        </div>
        {[{ icon:TestTube, label:"Lab Reports", sub:"352+ CoA tests", color:"#0891B2" },{ icon:ShieldCheck, label:"Safety Calc", sub:"Endotoxin & BAC", color:"#059669" }].map(({ icon:Icon, label, sub, color }, i, arr) => (
          <button key={label} onClick={() => {}} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"12px 14px", background:"white", borderRadius:"14px", border:"none", cursor:"pointer", width:"100%", textAlign:"left", marginBottom:"0" }}><Icon style={{ width:"16px", height:"16px", color }} /><div style={{ flex:1 }}><div style={{ fontSize:"13px", fontWeight:600, color:"#1E1B4B" }}>{label}</div><div style={{ fontSize:"10px", color:"#9CA3AF", marginTop:"1px" }}>{sub}</div></div><ChevronRight style={{ width:"14px", height:"14px", color:"#D1D5DB" }} /></button>
        ))}
        <div style={{ textAlign:"center" }}><a href="https://t.me/urbanblend789" style={{ fontSize:"11px", color:"#3730A3", textDecoration:"none", fontWeight:600 }}>@urbanblend789 · USDT</a></div>
      </div>
    </div>
  );
}
