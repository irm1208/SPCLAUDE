import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, Heart, MessageCircle, Share2, Bell, Home, Grid } from "lucide-react";
const POSTS = [
  { user:"urbanblend789", handle:"@urbanblend789", time:"2h", text:"Round #12 is LIVE 🧬 126 products available. Group buy closes in 5 days. DM for kit order.", likes:47, comments:12 },
  { user:"Lab Verified", handle:"@janoshik_labs", time:"1d", text:"New CoA results posted for BPC-157 5mg from Round #11. Purity: 99.2% ✅", likes:89, comments:23 },
];
export function SocialFeed() {
  return (
    <div style={{ width:"100%", minHeight:"100vh", background:"#F9FAFB", fontFamily:"Inter, sans-serif", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"white", padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #E5E7EB" }}>
        <span style={{ fontSize:"18px", fontWeight:800, color:"#111827", letterSpacing:"-0.03em" }}>Salt &amp; Peps</span>
        <div style={{ display:"flex", gap:"10px" }}>
          <button onClick={() => {}} style={{ background:"transparent", border:"none", cursor:"pointer" }}><Bell style={{ width:"20px", height:"20px", color:"#374151" }} /></button>
          <button onClick={() => {}} style={{ background:"#2563EB", color:"white", border:"none", borderRadius:"20px", fontSize:"12px", fontWeight:600, padding:"6px 14px", cursor:"pointer" }}>Login</button>
        </div>
      </div>
      <div style={{ padding:"12px 16px", background:"white", borderBottom:"1px solid #F3F4F6" }}>
        <button onClick={() => {}} style={{ width:"100%", background:"linear-gradient(135deg,#2563EB,#3B82F6)", border:"none", borderRadius:"16px", padding:"16px 18px", display:"flex", alignItems:"center", gap:"12px", cursor:"pointer", textAlign:"left" }}>
          <Users style={{ width:"22px", height:"22px", color:"white", flexShrink:0 }} />
          <div><div style={{ fontSize:"16px", fontWeight:700, color:"white" }}>Group Buy Login</div><div style={{ fontSize:"11px", color:"rgba(255,255,255,0.75)", marginTop:"2px" }}>126 products · Round #12 · 5 days left</div></div>
        </button>
      </div>
      <div style={{ display:"flex", gap:"0", padding:"0 16px", background:"white", borderBottom:"1px solid #F3F4F6" }}>
        {["Feed","Lonely Vial","Lab Reports","Tools"].map((t,i) => (<button key={t} onClick={() => {}} style={{ padding:"11px 14px", background:"transparent", border:"none", fontSize:"13px", fontWeight: i===0 ? 700 : 500, color: i===0 ? "#2563EB" : "#9CA3AF", cursor:"pointer", borderBottom: i===0 ? "2px solid #2563EB" : "2px solid transparent" }}>{t}</button>))}
      </div>
      <main style={{ flex:1, padding:"12px 16px", display:"flex", flexDirection:"column", gap:"10px" }}>
        {POSTS.map(({ user, handle, time, text, likes, comments }) => (
          <div key={user+time} style={{ background:"white", borderRadius:"16px", padding:"16px", border:"1px solid #F3F4F6" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"10px" }}>
              <div style={{ width:"36px", height:"36px", borderRadius:"50%", background:"linear-gradient(135deg,#2563EB,#7C3AED)", display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ color:"white", fontSize:"12px", fontWeight:700 }}>{user[0]}</span></div>
              <div><div style={{ fontSize:"13px", fontWeight:700, color:"#111827" }}>{user}</div><div style={{ fontSize:"11px", color:"#9CA3AF" }}>{handle} · {time}</div></div>
            </div>
            <p style={{ fontSize:"13px", color:"#374151", lineHeight:1.55, margin:"0 0 12px" }}>{text}</p>
            <div style={{ display:"flex", gap:"16px" }}>
              {[{ icon:Heart, count:likes, color:"#EF4444" },{ icon:MessageCircle, count:comments, color:"#2563EB" },{ icon:Share2, count:null, color:"#6B7280" }].map(({ icon:Icon, count, color }) => (
                <button key={color} onClick={() => {}} style={{ display:"flex", alignItems:"center", gap:"4px", background:"transparent", border:"none", cursor:"pointer" }}><Icon style={{ width:"14px", height:"14px", color }} />{count && <span style={{ fontSize:"12px", color:"#6B7280" }}>{count}</span>}</button>
              ))}
            </div>
          </div>
        ))}
        <div style={{ display:"flex", gap:"10px" }}>
          {[{ icon:TestTube, label:"Lab Reports", color:"#0891B2", bg:"#EFF6FF" },{ icon:ShieldCheck, label:"Safety Calc", color:"#059669", bg:"#F0FDF4" }].map(({ icon:Icon, label, color, bg }) => (
            <button key={label} onClick={() => {}} style={{ flex:1, background:bg, border:"none", borderRadius:"14px", padding:"12px", display:"flex", alignItems:"center", gap:"8px", cursor:"pointer" }}><Icon style={{ width:"16px", height:"16px", color }} /><span style={{ fontSize:"12px", fontWeight:600, color:"#111827" }}>{label}</span></button>
          ))}
        </div>
      </main>
      <div style={{ background:"white", borderTop:"1px solid #E5E7EB", padding:"10px 0 16px", display:"flex", justifyContent:"space-around" }}>
        {[{ icon:Home, label:"Home" },{ icon:Search, label:"Orders" },{ icon:Grid, label:"Products" },{ icon:FlaskConical, label:"Vials" }].map(({ icon:Icon, label }, i) => (
          <button key={label} onClick={() => {}} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"3px", background:"transparent", border:"none", cursor:"pointer" }}><Icon style={{ width:"20px", height:"20px", color: i===0 ? "#2563EB" : "#9CA3AF" }} /><span style={{ fontSize:"9px", color: i===0 ? "#2563EB" : "#9CA3AF", fontWeight:600 }}>{label}</span></button>
        ))}
      </div>
    </div>
  );
}
