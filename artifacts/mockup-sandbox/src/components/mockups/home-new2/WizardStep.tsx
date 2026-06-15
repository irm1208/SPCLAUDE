import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, Check, ChevronRight, ArrowRight } from "lucide-react";
const STEPS = [{ n:1, label:"Browse & select", done:true },{ n:2, label:"Submit your kit", done:false, active:true },{ n:3, label:"Pay with USDT", done:false },{ n:4, label:"Receive &amp; verify", done:false }];
export function WizardStep() {
  return (
    <div style={{ width:"100%", minHeight:"100vh", background:"#FFFFFF", fontFamily:"Inter, sans-serif", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"linear-gradient(135deg,#1E3A8A,#2563EB)", padding:"24px 20px 32px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"20px" }}>
          <span style={{ fontSize:"16px", fontWeight:700, color:"white" }}>Salt &amp; Peps</span>
          <button onClick={() => {}} style={{ background:"rgba(255,255,255,0.2)", color:"white", border:"none", borderRadius:"16px", fontSize:"11px", fontWeight:600, padding:"5px 12px", cursor:"pointer" }}>Login</button>
        </div>
        <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.6)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"6px" }}>How to order</div>
        <div style={{ fontSize:"28px", fontWeight:800, color:"white", letterSpacing:"-0.02em", lineHeight:1.1 }}>4 simple steps</div>
      </div>
      <div style={{ padding:"20px 20px 16px", background:"#F9FAFB", flex:1, display:"flex", flexDirection:"column", gap:"0" }}>
        {STEPS.map(({ n, label, done, active }, i, arr) => (
          <div key={n} style={{ display:"flex", gap:"14px", paddingBottom: i < arr.length-1 ? "0" : "0" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
              <div style={{ width:"36px", height:"36px", borderRadius:"50%", background: done ? "#2563EB" : active ? "white" : "#E5E7EB", border: active ? "2px solid #2563EB" : "none", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {done ? <Check style={{ width:"15px", height:"15px", color:"white" }} /> : <span style={{ fontSize:"13px", fontWeight:700, color: active ? "#2563EB" : "#9CA3AF" }}>{n}</span>}
              </div>
              {i < arr.length-1 && <div style={{ width:"2px", flex:1, background: done ? "#2563EB" : "#E5E7EB", minHeight:"32px", margin:"4px 0" }} />}
            </div>
            <div style={{ paddingBottom:"24px", paddingTop:"6px" }}>
              <div style={{ fontSize:"14px", fontWeight: active ? 700 : 600, color: active ? "#111827" : done ? "#6B7280" : "#9CA3AF" }} dangerouslySetInnerHTML={{ __html: label }} />
              {active && <div style={{ fontSize:"11px", color:"#6B7280", marginTop:"3px" }}>Browse 126+ products on the Group Buy list</div>}
            </div>
          </div>
        ))}
        <button onClick={() => {}} style={{ background:"#2563EB", color:"white", border:"none", borderRadius:"16px", padding:"16px", fontSize:"14px", fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", marginTop:"4px" }}><Users style={{ width:"16px", height:"16px" }} /> Group Buy Login <ArrowRight style={{ width:"16px", height:"16px" }} /></button>
        <div style={{ marginTop:"12px", background:"white", borderRadius:"16px", padding:"14px 16px", border:"1px solid #E5E7EB" }}>
          <div style={{ fontSize:"13px", fontWeight:700, color:"#111827", marginBottom:"10px" }}>Also available</div>
          {[{ icon:FlaskConical, label:"Lonely Vial", sub:"No minimum" },{ icon:Search, label:"Manage Order", sub:"Track & pay" },{ icon:TestTube, label:"Lab Reports", sub:"352+ CoA" },{ icon:ShieldCheck, label:"Safety Calc", sub:"Endotoxin" }].map(({ icon:Icon, label, sub }, i, arr) => (
            <div key={label} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"8px 0", borderBottom: i < arr.length-1 ? "1px solid #F3F4F6" : "none" }}>
              <Icon style={{ width:"14px", height:"14px", color:"#6B7280" }} />
              <div style={{ flex:1 }}><span style={{ fontSize:"13px", fontWeight:600, color:"#374151" }}>{label}</span><span style={{ fontSize:"11px", color:"#9CA3AF", marginLeft:"6px" }}>{sub}</span></div>
              <ChevronRight style={{ width:"13px", height:"13px", color:"#D1D5DB" }} />
            </div>
          ))}
        </div>
        <div style={{ textAlign:"center", marginTop:"12px" }}><a href="https://t.me/urbanblend789" style={{ fontSize:"11px", color:"#2AABEE", textDecoration:"none", fontWeight:600 }}>@urbanblend789 · USDT · ETH</a></div>
      </div>
    </div>
  );
}
