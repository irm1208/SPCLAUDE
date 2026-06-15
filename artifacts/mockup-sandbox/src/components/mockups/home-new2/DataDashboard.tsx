import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ChevronRight, BarChart2, TrendingUp, Activity } from "lucide-react";
const BARS = [60,80,45,90,70,55,85,75,65,88];
export function DataDashboard() {
  return (
    <div style={{ width:"100%", minHeight:"100vh", background:"#F8FAFF", fontFamily:"Inter, sans-serif", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"white", padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #E5E7EB" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}><BarChart2 style={{ width:"18px", height:"18px", color:"#2563EB" }} /><span style={{ fontSize:"16px", fontWeight:800, color:"#111827", letterSpacing:"-0.02em" }}>Analytics</span></div>
        <button onClick={() => {}} style={{ background:"#2563EB", color:"white", border:"none", borderRadius:"20px", fontSize:"12px", fontWeight:600, padding:"6px 14px", cursor:"pointer" }}>Login</button>
      </div>
      <main style={{ flex:1, padding:"16px", display:"flex", flexDirection:"column", gap:"12px" }}>
        <div style={{ background:"white", borderRadius:"18px", padding:"18px", border:"1px solid #E5E7EB" }}>
          <div style={{ fontSize:"11px", color:"#9CA3AF", fontWeight:600, letterSpacing:"0.08em", marginBottom:"6px" }}>ROUND #12 OVERVIEW</div>
          <div style={{ display:"flex", gap:"0", marginBottom:"16px" }}>
            {[{ label:"Products", val:"126", color:"#2563EB" },{ label:"Days left", val:"5", color:"#F59E0B" },{ label:"CoA tests", val:"352+", color:"#059669" }].map(({ label, val, color }, i, arr) => (
              <div key={label} style={{ flex:1, borderRight: i < arr.length-1 ? "1px solid #F3F4F6" : "none", paddingRight:"12px", marginRight: i < arr.length-1 ? "12px" : 0 }}>
                <div style={{ fontSize:"22px", fontWeight:800, color, letterSpacing:"-0.03em" }}>{val}</div>
                <div style={{ fontSize:"10px", color:"#9CA3AF", fontWeight:600, marginTop:"2px" }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:"3px", height:"60px" }}>
            {BARS.map((h, i) => <div key={i} style={{ flex:1, background: i===7 ? "#2563EB" : `rgba(37,99,235,${0.15 + (h/100)*0.3})`, borderRadius:"3px", height:`${h}%` }} />)}
          </div>
          <div style={{ fontSize:"10px", color:"#9CA3AF", marginTop:"6px" }}>Order volume · last 10 rounds</div>
        </div>
        <button onClick={() => {}} style={{ background:"linear-gradient(135deg,#1E3A8A,#2563EB)", borderRadius:"18px", border:"none", padding:"20px", display:"flex", alignItems:"center", gap:"14px", cursor:"pointer", width:"100%", textAlign:"left" }}>
          <div style={{ width:"44px", height:"44px", borderRadius:"12px", background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}><Users style={{ width:"22px", height:"22px", color:"white" }} /></div>
          <div style={{ flex:1 }}><div style={{ fontSize:"16px", fontWeight:700, color:"white" }}>Group Buy Login</div><div style={{ fontSize:"12px", color:"rgba(255,255,255,0.65)", marginTop:"2px" }}>126 products · group pricing</div></div>
          <ChevronRight style={{ width:"18px", height:"18px", color:"rgba(255,255,255,0.6)" }} />
        </button>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
          {[{ icon:FlaskConical, label:"Lonely Vial", sub:"Single units", color:"#7C3AED", bg:"#EDE9FE" },{ icon:Search, label:"My Order", sub:"Track & edit", color:"#D97706", bg:"#FEF3C7" }].map(({ icon:Icon, label, sub, color, bg }) => (
            <button key={label} onClick={() => {}} style={{ background:bg, border:"none", borderRadius:"16px", padding:"16px", cursor:"pointer", textAlign:"left" }}><Icon style={{ width:"20px", height:"20px", color, marginBottom:"8px" }} /><div style={{ fontSize:"13px", fontWeight:700, color:"#111827" }}>{label}</div><div style={{ fontSize:"10px", color:"#6B7280", marginTop:"2px" }}>{sub}</div></button>
          ))}
        </div>
        <div style={{ display:"flex", gap:"10px" }}>
          {[{ icon:TestTube, label:"Lab Reports", color:"#0891B2" },{ icon:ShieldCheck, label:"Safety Calc", color:"#059669" }].map(({ icon:Icon, label, color }) => (
            <button key={label} onClick={() => {}} style={{ flex:1, background:"white", border:"1px solid #E5E7EB", borderRadius:"14px", padding:"12px", display:"flex", alignItems:"center", gap:"8px", cursor:"pointer" }}><Icon style={{ width:"16px", height:"16px", color }} /><span style={{ fontSize:"12px", fontWeight:600, color:"#111827" }}>{label}</span></button>
          ))}
        </div>
        <div style={{ textAlign:"center" }}><a href="https://t.me/urbanblend789" style={{ fontSize:"11px", color:"#2563EB", textDecoration:"none", fontWeight:600 }}>@urbanblend789 · USDT · ETH</a></div>
      </main>
    </div>
  );
}
