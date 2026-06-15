import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, Heart, ChevronRight, Star } from "lucide-react";
export function EtsyWarm() {
  return (
    <div style={{ width:"100%", minHeight:"100vh", background:"#FDF6EE", fontFamily:"Inter, sans-serif", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"white", padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"2px solid #F4623A" }}>
        <div><span style={{ fontSize:"17px", fontWeight:800, color:"#F4623A", letterSpacing:"-0.02em" }}>salt</span><span style={{ fontSize:"17px", fontWeight:800, color:"#222", letterSpacing:"-0.02em" }}>&peps</span></div>
        <div style={{ display:"flex", gap:"8px" }}><button onClick={() => {}} style={{ background:"transparent", border:"none", cursor:"pointer" }}><Search style={{ width:"18px", height:"18px", color:"#555" }} /></button><button onClick={() => {}} style={{ background:"#F4623A", color:"white", border:"none", borderRadius:"4px", fontSize:"12px", fontWeight:600, padding:"6px 12px", cursor:"pointer" }}>Login</button></div>
      </div>
      <div style={{ padding:"12px 16px", background:"white", borderBottom:"1px solid #F0EAE0", display:"flex", gap:"8px", overflowX:"auto" }}>
        {["Group Buys","Lonely Vial","Lab Reports","Safety","My Order"].map((c,i) => (<button key={c} onClick={() => {}} style={{ background: i===0 ? "#F4623A" : "transparent", color: i===0 ? "white" : "#555", border: i===0 ? "none" : "1px solid #DDD", borderRadius:"20px", fontSize:"11px", fontWeight:500, padding:"6px 12px", cursor:"pointer", flexShrink:0 }}>{c}</button>))}
      </div>
      <main style={{ flex:1, padding:"16px" }}>
        <div style={{ fontSize:"18px", fontWeight:700, color:"#222", marginBottom:"12px" }}>Current group buy 🌿</div>
        <button onClick={() => {}} style={{ width:"100%", background:"white", border:"1px solid #E8DDD0", borderRadius:"12px", padding:"18px 16px", display:"flex", gap:"14px", cursor:"pointer", textAlign:"left", marginBottom:"12px" }}>
          <div style={{ width:"60px", height:"60px", borderRadius:"10px", background:"linear-gradient(135deg,#F4623A,#FF8C42)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Users style={{ width:"28px", height:"28px", color:"white" }} /></div>
          <div style={{ flex:1 }}><div style={{ fontSize:"10px", color:"#F4623A", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"3px" }}>Group Buy #12</div><div style={{ fontSize:"16px", fontWeight:700, color:"#222" }}>Place your order</div><div style={{ fontSize:"11px", color:"#888", marginTop:"3px" }}>126 products · closes in 5 days</div><div style={{ display:"flex", alignItems:"center", gap:"3px", marginTop:"6px" }}>{[1,2,3,4,5].map(i => <Star key={i} style={{ width:"11px", height:"11px", color:"#F4623A", fill:"#F4623A" }} />)}<span style={{ fontSize:"10px", color:"#888", marginLeft:"3px" }}>(847 orders)</span></div></div>
          <Heart style={{ width:"16px", height:"16px", color:"#DDD" }} />
        </button>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"12px" }}>
          {[{ icon:FlaskConical, label:"Lonely Vial", sub:"No minimums", color:"#7C3AED" },{ icon:Search, label:"My Order", sub:"Track & pay", color:"#F4623A" }].map(({ icon:Icon, label, sub, color }) => (
            <button key={label} onClick={() => {}} style={{ background:"white", border:"1px solid #E8DDD0", borderRadius:"12px", padding:"14px 12px", cursor:"pointer", textAlign:"left" }}><Icon style={{ width:"20px", height:"20px", color, marginBottom:"8px" }} /><div style={{ fontSize:"13px", fontWeight:700, color:"#222" }}>{label}</div><div style={{ fontSize:"10px", color:"#999", marginTop:"2px" }}>{sub}</div></button>
          ))}
        </div>
        <div style={{ background:"white", border:"1px solid #E8DDD0", borderRadius:"12px", overflow:"hidden" }}>
          {[{ icon:TestTube, label:"Lab Reports", sub:"352+ CoA", color:"#0891B2" },{ icon:ShieldCheck, label:"Safety Calc", sub:"Endotoxin", color:"#059669" }].map(({ icon:Icon, label, sub, color }, i, arr) => (
            <button key={label} onClick={() => {}} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"12px 14px", background:"transparent", border:"none", borderBottom: i < arr.length-1 ? "1px solid #F0EAE0" : "none", cursor:"pointer", width:"100%", textAlign:"left" }}><Icon style={{ width:"16px", height:"16px", color }} /><div style={{ flex:1 }}><div style={{ fontSize:"13px", fontWeight:600, color:"#222" }}>{label}</div><div style={{ fontSize:"10px", color:"#999" }}>{sub}</div></div><ChevronRight style={{ width:"14px", height:"14px", color:"#CCC" }} /></button>
          ))}
        </div>
        <div style={{ textAlign:"center", marginTop:"14px" }}><a href="https://t.me/urbanblend789" style={{ fontSize:"11px", color:"#F4623A", textDecoration:"none", fontWeight:600 }}>@urbanblend789 · USDT</a></div>
      </main>
    </div>
  );
}
