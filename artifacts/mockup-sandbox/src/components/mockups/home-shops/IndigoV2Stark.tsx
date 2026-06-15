import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ArrowRight } from "lucide-react";
export function IndigoV2Stark() {
  return (
    <div style={{ width:"100%", minHeight:"100vh", background:"#FFFFFF", fontFamily:"'Helvetica Neue', Arial, sans-serif", display:"flex", flexDirection:"column" }}>
      <div style={{ borderBottom:"3px solid #3730A3", padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:"15px", fontWeight:900, color:"#3730A3", letterSpacing:"-0.01em", textTransform:"uppercase" }}>SALT &amp; PEPS</span>
        <button onClick={() => {}} style={{ background:"#3730A3", color:"white", border:"none", fontSize:"11px", fontWeight:700, padding:"7px 14px", cursor:"pointer", letterSpacing:"0.08em", textTransform:"uppercase" }}>Login</button>
      </div>
      <div style={{ background:"#1E1B4B", padding:"28px 20px 24px" }}>
        <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.3em", textTransform:"uppercase", color:"rgba(255,255,255,0.4)", marginBottom:"10px" }}>STARK MONO · INDIGO</div>
        <h1 style={{ fontSize:"52px", fontWeight:900, color:"white", lineHeight:0.88, textTransform:"uppercase", letterSpacing:"-0.04em", margin:0 }}>LAB<br />GRADE</h1>
        <div style={{ width:"40px", height:"4px", background:"#3730A3", marginTop:"14px" }} />
      </div>
      <div style={{ padding:"20px", flex:1, display:"flex", flexDirection:"column", gap:"8px" }}>
        <button onClick={() => {}} style={{ background:"#3730A3", color:"white", border:"none", padding:"18px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", width:"100%" }}>
          <div><div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.2em", textTransform:"uppercase", color:"rgba(255,255,255,0.5)", marginBottom:"4px" }}>Primary</div><div style={{ fontSize:"18px", fontWeight:900, textTransform:"uppercase", letterSpacing:"-0.01em" }}>Group Buy Login</div></div>
          <ArrowRight style={{ width:"20px", height:"20px" }} />
        </button>
        <div style={{ display:"flex", gap:"8px" }}>
          <button onClick={() => {}} style={{ flex:1, background:"#EDE9FE", border:"none", padding:"16px", cursor:"pointer", textAlign:"left" }}><FlaskConical style={{ width:"18px", height:"18px", color:"#3730A3", marginBottom:"8px" }} /><div style={{ fontSize:"13px", fontWeight:900, color:"#1E1B4B", textTransform:"uppercase", letterSpacing:"-0.01em" }}>LONELY<br />VIAL</div><div style={{ fontSize:"9px", color:"#6B7280", marginTop:"4px", fontFamily:"Inter, sans-serif" }}>SINGLE UNITS</div></button>
          <button onClick={() => {}} style={{ flex:1, background:"#F3F4F6", border:"none", padding:"16px", cursor:"pointer", textAlign:"left" }}><Search style={{ width:"18px", height:"18px", color:"#374151", marginBottom:"8px" }} /><div style={{ fontSize:"13px", fontWeight:900, color:"#111827", textTransform:"uppercase", letterSpacing:"-0.01em" }}>MY<br />ORDER</div><div style={{ fontSize:"9px", color:"#6B7280", marginTop:"4px", fontFamily:"Inter, sans-serif" }}>TRACK & PAY</div></button>
        </div>
        <div style={{ height:"2px", background:"#1E1B4B", margin:"8px 0" }} />
        {[{ icon:TestTube, label:"LAB REPORTS", sub:"352+ independent tests" },{ icon:ShieldCheck, label:"SAFETY CALC", sub:"Endotoxin & BAC" }].map(({ icon:Icon, label, sub }, i, arr) => (
          <button key={label} onClick={() => {}} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", background:"transparent", border:"none", borderBottom: i < arr.length-1 ? "1px solid #E5E7EB" : "none", cursor:"pointer", width:"100%", textAlign:"left" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px" }}><Icon style={{ width:"14px", height:"14px", color:"#3730A3" }} /><div><div style={{ fontSize:"12px", fontWeight:900, color:"#1E1B4B", letterSpacing:"0.02em" }}>{label}</div><div style={{ fontFamily:"Inter, sans-serif", fontSize:"10px", color:"#9CA3AF", marginTop:"1px" }}>{sub}</div></div></div>
            <ArrowRight style={{ width:"12px", height:"12px", color:"#3730A3" }} />
          </button>
        ))}
        <div style={{ textAlign:"center", marginTop:"8px" }}><a href="https://t.me/urbanblend789" style={{ fontFamily:"Inter, sans-serif", fontSize:"11px", color:"#3730A3", textDecoration:"none", fontWeight:600 }}>@urbanblend789 · USDT · ETH</a></div>
      </div>
    </div>
  );
}
