import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, SlidersHorizontal, Star, ChevronRight } from "lucide-react";
const ITEMS = [
  { name:"BPC-157 5mg", price:"Group Buy", tag:"★ 4.9", color:"#2563EB" },
  { name:"TB-500 10mg", price:"Group Buy", tag:"Hot", color:"#7C3AED" },
  { name:"Semaglutide 5mg", price:"Lonely Vial", tag:"★ 4.7", color:"#059669" },
  { name:"GHK-Cu 50mg", price:"Lonely Vial", tag:"-20%", color:"#D97706" },
];
export function Marketplace() {
  return (
    <div style={{ width:"100%", minHeight:"100vh", background:"#FFFFFF", fontFamily:"Inter, sans-serif", display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"14px 20px", background:"white", borderBottom:"1px solid #F3F4F6", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:"18px", fontWeight:800, color:"#111827", letterSpacing:"-0.02em" }}>Shop</span>
        <button onClick={() => {}} style={{ background:"#111827", color:"white", border:"none", borderRadius:"20px", fontSize:"12px", fontWeight:600, padding:"6px 14px", cursor:"pointer" }}>Login</button>
      </div>
      <div style={{ padding:"12px 20px", background:"white", borderBottom:"1px solid #F3F4F6" }}>
        <div style={{ background:"#F3F4F6", borderRadius:"12px", padding:"10px 14px", display:"flex", gap:"10px", alignItems:"center", marginBottom:"10px" }}><Search style={{ width:"16px", height:"16px", color:"#9CA3AF" }} /><span style={{ fontSize:"13px", color:"#9CA3AF" }}>Search peptides...</span><SlidersHorizontal style={{ width:"15px", height:"15px", color:"#6B7280", marginLeft:"auto" }} /></div>
        <div style={{ display:"flex", gap:"8px" }}>{["All","Group Buy","Lonely Vial","Lab Tested"].map((f,i) => (<button key={f} onClick={() => {}} style={{ background: i===0 ? "#111827" : "#F3F4F6", color: i===0 ? "white" : "#374151", border:"none", borderRadius:"100px", fontSize:"11px", fontWeight:600, padding:"6px 12px", cursor:"pointer", flexShrink:0 }}>{f}</button>))}</div>
      </div>
      <div style={{ flex:1, padding:"14px 20px", display:"flex", flexDirection:"column", gap:"16px" }}>
        <button onClick={() => {}} style={{ background:"linear-gradient(135deg,#111827,#1F2937)", borderRadius:"18px", border:"none", padding:"18px", display:"flex", alignItems:"center", gap:"14px", cursor:"pointer", width:"100%", textAlign:"left" }}>
          <div style={{ width:"44px", height:"44px", borderRadius:"12px", background:"rgba(255,255,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Users style={{ width:"22px", height:"22px", color:"white" }} /></div>
          <div><div style={{ fontSize:"16px", fontWeight:700, color:"white" }}>Group Buy Login</div><div style={{ fontSize:"12px", color:"rgba(255,255,255,0.55)", marginTop:"2px" }}>126 products · Round #12</div></div>
        </button>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
          {ITEMS.map(({ name, price, tag, color }) => (
            <button key={name} onClick={() => {}} style={{ background:"#FAFAFA", border:"1px solid #F0F0F0", borderRadius:"16px", padding:"14px 12px", cursor:"pointer", textAlign:"left" }}>
              <div style={{ width:"36px", height:"36px", borderRadius:"10px", background:`${color}15`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"8px" }}><FlaskConical style={{ width:"17px", height:"17px", color }} /></div>
              <div style={{ fontSize:"13px", fontWeight:700, color:"#111827", lineHeight:1.2 }}>{name}</div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"6px" }}>
                <span style={{ fontSize:"10px", color:"#6B7280" }}>{price}</span>
                <span style={{ fontSize:"10px", fontWeight:700, background: tag.startsWith("★") ? "#DBEAFE" : tag.startsWith("-") ? "#FEF3C7" : "#FEE2E2", color: tag.startsWith("★") ? "#1E40AF" : tag.startsWith("-") ? "#92400E" : "#DC2626", padding:"2px 7px", borderRadius:"6px" }}>{tag}</span>
              </div>
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:"10px" }}>
          {[{ icon:TestTube, label:"Lab Reports", color:"#0891B2", bg:"#EFF6FF" },{ icon:ShieldCheck, label:"Safety Calc", color:"#059669", bg:"#F0FDF4" }].map(({ icon:Icon, label, color, bg }) => (
            <button key={label} onClick={() => {}} style={{ flex:1, background:bg, border:"none", borderRadius:"14px", padding:"12px", display:"flex", alignItems:"center", gap:"8px", cursor:"pointer" }}><Icon style={{ width:"16px", height:"16px", color }} /><span style={{ fontSize:"12px", fontWeight:600, color:"#111827" }}>{label}</span></button>
          ))}
        </div>
        <div style={{ textAlign:"center" }}><a href="https://t.me/urbanblend789" style={{ fontSize:"11px", color:"#2AABEE", textDecoration:"none", fontWeight:600 }}>@urbanblend789 · USDT · ETH</a></div>
      </div>
    </div>
  );
}
