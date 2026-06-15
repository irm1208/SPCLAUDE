import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ArrowRight, Play } from "lucide-react";
const PANELS = [{ title:"Group Buy Login", sub:"126 products · Round #12", icon:Users, color1:"#0F2027", color2:"#203A43" },{ title:"Lonely Vial", sub:"Single units · No minimum", icon:FlaskConical, color1:"#1a1a2e", color2:"#16213e" }];
export function CinemaScope() {
  return (
    <div style={{ width:"100%", minHeight:"100vh", background:"#000", fontFamily:"Inter, sans-serif", display:"flex", flexDirection:"column", color:"white" }}>
      <div style={{ padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}><div style={{ width:"4px", height:"24px", background:"white" }} /><span style={{ fontSize:"16px", fontWeight:300, letterSpacing:"0.2em", textTransform:"uppercase" }}>Salt &amp; Peps</span></div>
        <button onClick={() => {}} style={{ background:"white", color:"#000", border:"none", fontSize:"12px", fontWeight:700, padding:"8px 16px", cursor:"pointer", letterSpacing:"0.08em" }}>LOGIN</button>
      </div>
      <div style={{ padding:"8px 20px 20px" }}>
        <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.4)", letterSpacing:"0.3em", textTransform:"uppercase", marginBottom:"10px" }}>Now screening</div>
        {PANELS.map(({ title, sub, icon:Icon, color1, color2 }) => (
          <button key={title} onClick={() => {}} style={{ width:"100%", background:`linear-gradient(135deg,${color1},${color2})`, border:"none", padding:"0", marginBottom:"8px", cursor:"pointer", textAlign:"left", overflow:"hidden", position:"relative", display:"block" }}>
            <div style={{ padding:"20px", aspectRatio:"2.4/1", display:"flex", flexDirection:"column", justifyContent:"space-between", position:"relative" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0, background:"linear-gradient(90deg,rgba(0,0,0,0.6) 0%,transparent 60%)" }} />
              <Icon style={{ width:"20px", height:"20px", color:"rgba(255,255,255,0.5)", position:"relative", zIndex:1 }} />
              <div style={{ position:"relative", zIndex:1 }}>
                <div style={{ fontSize:"20px", fontWeight:700, letterSpacing:"-0.02em" }}>{title}</div>
                <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.55)", marginTop:"3px" }}>{sub}</div>
              </div>
              <div style={{ position:"absolute", right:"16px", top:"50%", transform:"translateY(-50%)", width:"36px", height:"36px", borderRadius:"50%", background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1 }}><Play style={{ width:"14px", height:"14px", color:"white" }} /></div>
            </div>
          </button>
        ))}
      </div>
      <div style={{ padding:"0 20px", display:"flex", flexDirection:"column", gap:"0", flex:1 }}>
        <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.3)", letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:"10px" }}>On demand</div>
        {[{ icon:Search, label:"Manage Order", sub:"Track · Edit · Pay" },{ icon:TestTube, label:"Lab Reports", sub:"352+ independent tests" },{ icon:ShieldCheck, label:"Safety Calculator", sub:"Endotoxin & BAC" }].map(({ icon:Icon, label, sub }, i, arr) => (
          <button key={label} onClick={() => {}} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"12px 0", background:"transparent", border:"none", borderBottom: i < arr.length-1 ? "1px solid rgba(255,255,255,0.06)" : "none", cursor:"pointer", width:"100%", textAlign:"left" }}>
            <Icon style={{ width:"15px", height:"15px", color:"rgba(255,255,255,0.4)", flexShrink:0 }} />
            <div style={{ flex:1 }}><div style={{ fontSize:"13px", fontWeight:500, color:"rgba(255,255,255,0.85)" }}>{label}</div><div style={{ fontSize:"10px", color:"rgba(255,255,255,0.3)", marginTop:"1px" }}>{sub}</div></div>
            <ArrowRight style={{ width:"13px", height:"13px", color:"rgba(255,255,255,0.2)" }} />
          </button>
        ))}
      </div>
      <div style={{ padding:"20px", display:"flex", justifyContent:"space-between", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
        <a href="https://t.me/urbanblend789" style={{ fontSize:"11px", color:"rgba(255,255,255,0.5)", textDecoration:"none" }}>@urbanblend789</a>
        <span style={{ fontSize:"10px", color:"rgba(255,255,255,0.25)", letterSpacing:"0.08em" }}>USDT · ETH</span>
      </div>
    </div>
  );
}
