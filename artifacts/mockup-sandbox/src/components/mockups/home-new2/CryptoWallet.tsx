import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ChevronRight, TrendingUp, Zap } from "lucide-react";
export function CryptoWallet() {
  return (
    <div style={{ width:"100%", minHeight:"100vh", background:"#0B0E17", fontFamily:"Inter, sans-serif", display:"flex", flexDirection:"column", color:"white" }}>
      <div style={{ padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <div style={{ width:"28px", height:"28px", borderRadius:"8px", background:"linear-gradient(135deg,#F7931A,#FF6B35)", display:"flex", alignItems:"center", justifyContent:"center" }}><Zap style={{ width:"14px", height:"14px", color:"white" }} /></div>
          <span style={{ fontWeight:700, fontSize:"15px" }}>Salt &amp; Peps</span>
        </div>
        <button onClick={() => {}} style={{ background:"rgba(247,147,26,0.15)", color:"#F7931A", border:"1px solid rgba(247,147,26,0.3)", borderRadius:"20px", fontSize:"12px", fontWeight:600, padding:"6px 14px", cursor:"pointer" }}>Connect</button>
      </div>
      <div style={{ padding:"8px 20px 24px" }}>
        <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.4)", letterSpacing:"0.1em", marginBottom:"6px" }}>PORTFOLIO BALANCE</div>
        <div style={{ fontSize:"38px", fontWeight:800, letterSpacing:"-0.03em" }}>$2,847.00</div>
        <div style={{ display:"flex", alignItems:"center", gap:"6px", marginTop:"6px" }}><TrendingUp style={{ width:"13px", height:"13px", color:"#22D3EE" }} /><span style={{ fontSize:"12px", color:"#22D3EE", fontWeight:600 }}>+12.4% this round</span></div>
      </div>
      <div style={{ margin:"0 16px 16px", background:"linear-gradient(135deg,#1E3A5F,#2563EB)", borderRadius:"20px", padding:"20px" }}>
        <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.6)", letterSpacing:"0.15em", marginBottom:"8px" }}>CURRENT ROUND</div>
        <div style={{ fontSize:"22px", fontWeight:800, letterSpacing:"-0.02em" }}>Group Buy #12</div>
        <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.65)", marginTop:"4px" }}>126 products · closes in 5 days</div>
        <button onClick={() => {}} style={{ marginTop:"16px", background:"#F7931A", color:"white", border:"none", borderRadius:"12px", padding:"12px 20px", fontSize:"13px", fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:"8px" }}><Users style={{ width:"15px", height:"15px" }} /> Group Buy Login</button>
      </div>
      <div style={{ padding:"0 16px", display:"flex", gap:"10px", marginBottom:"16px" }}>
        {[{ icon:FlaskConical, label:"Lonely Vial", color:"#A78BFA" },{ icon:Search, label:"My Order", color:"#F7931A" }].map(({ icon:Icon, label, color }) => (
          <button key={label} onClick={() => {}} style={{ flex:1, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"16px", padding:"14px", cursor:"pointer", textAlign:"left" }}>
            <Icon style={{ width:"18px", height:"18px", color, marginBottom:"8px" }} />
            <div style={{ fontSize:"13px", fontWeight:600, color:"white" }}>{label}</div>
          </button>
        ))}
      </div>
      <div style={{ padding:"0 16px", flex:1 }}>
        {[{ icon:TestTube, label:"Lab Reports", sub:"352+ CoA", color:"#22D3EE" },{ icon:ShieldCheck, label:"Safety Calc", sub:"Endotoxin & BAC", color:"#4ADE80" }].map(({ icon:Icon, label, sub, color }, i, arr) => (
          <div key={label} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"13px 0", borderBottom: i < arr.length-1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
            <Icon style={{ width:"16px", height:"16px", color, flexShrink:0 }} />
            <div style={{ flex:1 }}><div style={{ fontSize:"13px", fontWeight:600 }}>{label}</div><div style={{ fontSize:"11px", color:"rgba(255,255,255,0.4)", marginTop:"1px" }}>{sub}</div></div>
            <ChevronRight style={{ width:"14px", height:"14px", color:"rgba(255,255,255,0.2)" }} />
          </div>
        ))}
      </div>
      <div style={{ padding:"16px 20px", textAlign:"center" }}><a href="https://t.me/urbanblend789" style={{ fontSize:"11px", color:"#F7931A", textDecoration:"none", fontWeight:600 }}>@urbanblend789 · Pay USDT</a></div>
    </div>
  );
}
