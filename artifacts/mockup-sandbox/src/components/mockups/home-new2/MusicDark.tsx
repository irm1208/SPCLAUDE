import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, Play, SkipForward, ChevronRight, Disc3 } from "lucide-react";
const TRACKS = [
  { name:"BPC-157 5mg", artist:"Tissue Repair · Group Buy", duration:"★ 4.9", color:"#7C3AED" },
  { name:"TB-500 10mg", artist:"Recovery · Group Buy", duration:"★ 4.8", color:"#2563EB" },
  { name:"Semaglutide 5mg", artist:"Weight Mgmt · Single Vial", duration:"★ 4.7", color:"#059669" },
];
export function MusicDark() {
  return (
    <div style={{ width:"100%", minHeight:"100vh", background:"#0D0D0D", fontFamily:"Inter, sans-serif", display:"flex", flexDirection:"column", color:"white" }}>
      <div style={{ padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div><div style={{ fontSize:"10px", color:"rgba(255,255,255,0.4)", letterSpacing:"0.15em", textTransform:"uppercase" }}>PEPTIDE CATALOG</div><span style={{ fontSize:"18px", fontWeight:800, letterSpacing:"-0.02em" }}>Salt &amp; Peps</span></div>
        <button onClick={() => {}} style={{ background:"#1DB954", color:"#000", border:"none", borderRadius:"20px", fontSize:"12px", fontWeight:700, padding:"7px 14px", cursor:"pointer" }}>Login</button>
      </div>
      <div style={{ padding:"16px 20px 24px" }}>
        <div style={{ background:"linear-gradient(135deg,#7C3AED,#2563EB)", borderRadius:"24px", padding:"24px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:"-30px", right:"-30px", width:"130px", height:"130px", borderRadius:"50%", background:"rgba(255,255,255,0.08)" }} />
          <Disc3 style={{ width:"40px", height:"40px", color:"rgba(255,255,255,0.8)", marginBottom:"12px" }} />
          <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.6)", letterSpacing:"0.15em", marginBottom:"4px" }}>NOW PLAYING</div>
          <div style={{ fontSize:"22px", fontWeight:800, letterSpacing:"-0.02em" }}>Group Buy #12</div>
          <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.65)", marginTop:"4px" }}>126 products · Round closes in 5 days</div>
          <button onClick={() => {}} style={{ marginTop:"16px", background:"white", color:"#1A1A1A", border:"none", borderRadius:"100px", padding:"12px 22px", fontSize:"13px", fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:"8px" }}><Users style={{ width:"15px", height:"15px" }} /><Play style={{ width:"13px", height:"13px" }} /> Group Buy Login</button>
        </div>
      </div>
      <div style={{ padding:"0 20px 8px", fontSize:"13px", fontWeight:700, color:"rgba(255,255,255,0.9)" }}>Featured Products</div>
      <div style={{ padding:"0 20px", flex:1 }}>
        {TRACKS.map(({ name, artist, duration, color }, i, arr) => (
          <div key={name} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"11px 0", borderBottom: i < arr.length-1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
            <div style={{ width:"42px", height:"42px", borderRadius:"10px", background:`linear-gradient(135deg,${color},${color}88)`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><FlaskConical style={{ width:"18px", height:"18px", color:"white" }} /></div>
            <div style={{ flex:1 }}><div style={{ fontSize:"13px", fontWeight:600 }}>{name}</div><div style={{ fontSize:"11px", color:"rgba(255,255,255,0.45)", marginTop:"1px" }}>{artist}</div></div>
            <span style={{ fontSize:"11px", color:"#1DB954" }}>{duration}</span>
          </div>
        ))}
      </div>
      <div style={{ padding:"16px 20px", display:"flex", gap:"10px" }}>
        {[{ icon:TestTube, label:"Lab Reports" },{ icon:ShieldCheck, label:"Safety Calc" },{ icon:Search, label:"My Order" }].map(({ icon:Icon, label }) => (
          <button key={label} onClick={() => {}} style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none", borderRadius:"12px", padding:"10px 6px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:"5px" }}><Icon style={{ width:"16px", height:"16px", color:"rgba(255,255,255,0.7)" }} /><span style={{ fontSize:"9px", color:"rgba(255,255,255,0.5)", fontWeight:600 }}>{label}</span></button>
        ))}
      </div>
      <div style={{ padding:"0 20px 20px", textAlign:"center" }}><a href="https://t.me/urbanblend789" style={{ fontSize:"11px", color:"#1DB954", textDecoration:"none", fontWeight:600 }}>@urbanblend789 · USDT</a></div>
    </div>
  );
}
