import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ArrowRight } from "lucide-react";
export function LuxeRetail() {
  return (
    <div style={{ width:"100%", minHeight:"100vh", background:"#FAFAF9", fontFamily:"'Helvetica Neue', Helvetica, Inter, sans-serif", display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"16px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div><div style={{ fontSize:"9px", letterSpacing:"0.4em", textTransform:"uppercase", color:"#9CA3AF", marginBottom:"2px" }}>Est. Research Grade</div><span style={{ fontSize:"17px", fontWeight:600, color:"#111", letterSpacing:"-0.01em" }}>SALT &amp; PEPS</span></div>
        <button onClick={() => {}} style={{ background:"transparent", color:"#111", border:"1px solid #111", fontSize:"11px", fontWeight:500, padding:"7px 16px", cursor:"pointer", letterSpacing:"0.1em", textTransform:"uppercase" }}>Login</button>
      </div>
      <div style={{ padding:"20px 24px 28px", background:"#111" }}>
        <div style={{ fontSize:"9px", letterSpacing:"0.4em", textTransform:"uppercase", color:"rgba(255,255,255,0.35)", marginBottom:"14px" }}>SS26 · PEPTIDE COLLECTION</div>
        <h1 style={{ fontSize:"44px", fontWeight:300, color:"white", lineHeight:0.95, letterSpacing:"-0.03em", margin:0 }}>Precision<br /><strong style={{ fontWeight:700 }}>quality.</strong></h1>
        <button onClick={() => {}} style={{ marginTop:"24px", background:"white", color:"#111", border:"none", padding:"14px 24px", fontSize:"12px", fontWeight:600, cursor:"pointer", letterSpacing:"0.12em", textTransform:"uppercase", display:"flex", alignItems:"center", gap:"8px" }}><Users style={{ width:"14px", height:"14px" }} /> GROUP BUY LOGIN <ArrowRight style={{ width:"14px", height:"14px" }} /></button>
      </div>
      <div style={{ flex:1, padding:"24px" }}>
        <div style={{ display:"flex", gap:"2px", marginBottom:"24px" }}>
          <button onClick={() => {}} style={{ flex:1, background:"#111", color:"white", border:"none", padding:"16px", display:"flex", alignItems:"center", gap:"10px", cursor:"pointer", textAlign:"left" }}><FlaskConical style={{ width:"16px", height:"16px", color:"rgba(255,255,255,0.7)" }} /><div><div style={{ fontSize:"13px", fontWeight:600, color:"white" }}>Lonely Vial</div><div style={{ fontSize:"10px", color:"rgba(255,255,255,0.4)", marginTop:"1px" }}>Single · USDT</div></div></button>
          <button onClick={() => {}} style={{ flex:1, background:"#F5F5F5", color:"#111", border:"none", padding:"16px", display:"flex", alignItems:"center", gap:"10px", cursor:"pointer", textAlign:"left" }}><Search style={{ width:"16px", height:"16px", color:"#888" }} /><div><div style={{ fontSize:"13px", fontWeight:600 }}>My Order</div><div style={{ fontSize:"10px", color:"#999", marginTop:"1px" }}>Track · Pay</div></div></button>
        </div>
        <div style={{ height:"1px", background:"#E5E5E5", margin:"0 0 20px" }} />
        {[{ icon:TestTube, label:"Lab Reports", sub:"352+ independent CoA tests" },{ icon:ShieldCheck, label:"Safety Calculator", sub:"Endotoxin & BAC water" }].map(({ icon:Icon, label, sub }, i, arr) => (
          <button key={label} onClick={() => {}} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 0", background:"transparent", border:"none", borderBottom: i < arr.length-1 ? "1px solid #EDEDED" : "none", cursor:"pointer", width:"100%", textAlign:"left" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px" }}><Icon style={{ width:"15px", height:"15px", color:"#9CA3AF" }} /><div><div style={{ fontSize:"13px", fontWeight:500, color:"#111", letterSpacing:"-0.01em" }}>{label}</div><div style={{ fontSize:"10px", color:"#9CA3AF", marginTop:"1px" }}>{sub}</div></div></div>
            <ArrowRight style={{ width:"12px", height:"12px", color:"#CCC" }} />
          </button>
        ))}
        <div style={{ paddingTop:"20px", display:"flex", justifyContent:"space-between", borderTop:"1px solid #EDEDED", marginTop:"8px" }}>
          <a href="https://t.me/urbanblend789" style={{ fontSize:"11px", color:"#2AABEE", textDecoration:"none" }}>@urbanblend789</a>
          <span style={{ fontSize:"10px", color:"#CCC", letterSpacing:"0.08em" }}>USDT · ETH</span>
        </div>
      </div>
    </div>
  );
}
