import { useState } from "react";

const POOLS = [
  { id:"1", title:"T60 - ZE60-0322 - Uther", compound:"Tirzepatide", manufacturer:"Uther", batch:"ZE60-0322", status:"open", raised:0, goal:480, contributors:0 },
  { id:"2", title:"RE40-0228 - Uther", compound:"Retatrutide", manufacturer:"Uther", batch:"RE40-0228", status:"open", raised:40, goal:480, contributors:1 },
  { id:"3", title:"BPC-A220 - SciPep", compound:"BPC-157", manufacturer:"SciPep", batch:"BPC-A220", status:"funded", raised:480, goal:480, contributors:12 },
  { id:"4", title:"SEM-0930 - AusLabs", compound:"Semaglutide", manufacturer:"AusLabs", batch:"SEM-0930", status:"at_lab", raised:720, goal:720, contributors:18 },
];

const STAGES = ["Collecting","Funded","At Lab","Results"];
const STATUS_IDX: Record<string,number> = { open:0, funded:1, at_lab:2, results:3 };

const STATUS: Record<string,{label:string;color:string;bg:string;border:string}> = {
  open:    { label:"Open — Collecting",  color:"#065F46", bg:"#ECFDF5", border:"#A7F3D0" },
  funded:  { label:"Funded",             color:"#1E40AF", bg:"#EFF6FF", border:"#BFDBFE" },
  at_lab:  { label:"At Laboratory",      color:"#1E3A5F", bg:"#F0F7FF", border:"#BCDCFF" },
  results: { label:"Results Available",  color:"#78350F", bg:"#FFFBEB", border:"#FDE68A" },
};

const ICONS = ["🧪","⚗️","🔬","🧫"];

export function AppVibe3Civic() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = POOLS.filter(p =>
    (tab === "all" || p.status === tab) &&
    (!q || p.compound.toLowerCase().includes(q.toLowerCase()) || p.manufacturer.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"Georgia,'Times New Roman',serif", background:"#FAFAF8", color:"#1C1917", fontSize:14 }}>

      {/* Sidebar */}
      <div style={{ width:210, borderRight:"2px solid #E7E5E4", background:"#F5F5F3", flexShrink:0, padding:"24px 0", overflowY:"auto" }}>
        <div style={{ padding:"0 18px 16px", borderBottom:"1px solid #E7E5E4" }}>
          <div style={{ fontSize:10, letterSpacing:1.5, color:"#78716C", textTransform:"uppercase", fontWeight:700, fontFamily:"system-ui", marginBottom:10 }}>Filter by Manufacturer</div>
          {(["Uther","SciPep","AusLabs"] as const).map((m,i) => (
            <label key={m} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", cursor:"pointer", fontFamily:"system-ui", fontSize:13 }}>
              <input type="checkbox" style={{ width:13, height:13 }} />
              <span style={{ color:"#44403C", flex:1 }}>{m}</span>
              <span style={{ fontSize:12, color:"#A8A29E" }}>{[2,1,1][i]}</span>
            </label>
          ))}
        </div>
        <div style={{ padding:"16px 18px" }}>
          <div style={{ fontSize:10, letterSpacing:1.5, color:"#78716C", textTransform:"uppercase", fontWeight:700, fontFamily:"system-ui", marginBottom:10 }}>Filter by Compound</div>
          {["Tirzepatide","Retatrutide","BPC-157","Semaglutide"].map(c => (
            <label key={c} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", cursor:"pointer", fontFamily:"system-ui", fontSize:13 }}>
              <input type="checkbox" style={{ width:13, height:13 }} />
              <span style={{ color:"#44403C", flex:1 }}>{c}</span>
              <span style={{ fontSize:12, color:"#A8A29E" }}>1</span>
            </label>
          ))}
        </div>

        {/* About section — civic feel */}
        <div style={{ padding:"16px 18px", borderTop:"1px solid #E7E5E4", marginTop:8 }}>
          <div style={{ fontSize:11, color:"#78716C", lineHeight:1.6, fontFamily:"system-ui" }}>
            All results are published publicly. This registry is maintained by community members.
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>

        {/* Header — editorial */}
        <div style={{ padding:"28px 32px 20px", borderBottom:"2px solid #1C1917" }}>
          <div style={{ fontSize:10, letterSpacing:3, color:"#78716C", textTransform:"uppercase", fontFamily:"system-ui", fontWeight:600, marginBottom:8 }}>Public Registry</div>
          <h1 style={{ margin:"0 0 8px", fontSize:26, fontWeight:700, letterSpacing:-0.5, lineHeight:1.1, color:"#1C1917" }}>Community Testing Pools</h1>
          <p style={{ margin:"0 0 20px", fontSize:13, color:"#57534E", fontFamily:"system-ui", lineHeight:1.6, maxWidth:560 }}>
            Community-funded testing pools where members pool funds to send products to independent labs.
            Browse by vendor or compound to find results for specific batches.
          </p>

          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            <div style={{ position:"relative" }}>
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by compound, vendor, batch…"
                style={{ width:300, boxSizing:"border-box", padding:"9px 14px", border:"1.5px solid #1C1917", borderRadius:0, background:"#fff", fontSize:13, color:"#1C1917", outline:"none", fontFamily:"system-ui" }} />
            </div>

            <div style={{ display:"flex", borderLeft:"1px solid #E7E5E4", paddingLeft:12, gap:1 }}>
              {[["all","All Pools (4)"],["open","Open"],["funded","Funded"],["results","Results"]].map(([k,l]) => (
                <button key={k} onClick={()=>setTab(k)}
                  style={{ padding:"8px 14px", border:"none", background: tab===k ? "#1C1917" : "transparent", color: tab===k ? "#FAFAF8" : "#78716C", fontSize:12, cursor:"pointer", fontWeight: tab===k ? 700 : 400, fontFamily:"system-ui" }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pool cards — document-like */}
        <div style={{ padding:"20px 32px 32px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {filtered.map((pool,i) => {
            const pct = pool.goal > 0 ? Math.min(100,(pool.raised/pool.goal)*100) : 0;
            const curStep = STATUS_IDX[pool.status] ?? 0;
            const s = STATUS[pool.status];

            return (
              <div key={pool.id} style={{ background:"#fff", border:"1.5px solid #E7E5E4", borderRadius:0, padding:"20px 22px", display:"flex", flexDirection:"column", gap:14, borderTop:`4px solid #1C1917` }}>

                {/* Status banner */}
                <div style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
                  <span style={{ padding:"3px 10px", border:`1px solid ${s.border}`, background:s.bg, fontSize:11, fontWeight:600, color:s.color, fontFamily:"system-ui", letterSpacing:0.3 }}>
                    {s.label}
                  </span>
                  {pool.contributors > 0 && (
                    <span style={{ fontSize:11, color:"#78716C", fontFamily:"system-ui" }}>{pool.contributors} participant{pool.contributors !== 1 ? "s" : ""}</span>
                  )}
                </div>

                {/* Title row */}
                <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:700, lineHeight:1.25, marginBottom:6, color:"#1C1917" }}>{pool.title}</div>
                    <div style={{ fontSize:12, color:"#78716C", fontFamily:"system-ui" }}>
                      {pool.manufacturer} · {pool.compound} · Batch {pool.batch}
                    </div>
                  </div>
                  <div style={{ width:46, height:46, borderRadius:4, background:"#F5F5F3", border:"1.5px solid #E7E5E4", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0, marginLeft:"auto" }}>
                    {ICONS[i % ICONS.length]}
                  </div>
                </div>

                {/* Funding — ledger style */}
                <div style={{ borderTop:"1px solid #E7E5E4", paddingTop:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontFamily:"system-ui", fontSize:12 }}>
                    <span style={{ color:"#78716C" }}>Amount raised</span>
                    <span style={{ color:"#78716C" }}>Target</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                    <span style={{ fontSize:20, fontWeight:700, color:"#1C1917" }}>${pool.raised.toLocaleString()}</span>
                    <span style={{ fontSize:14, color:"#78716C", fontFamily:"system-ui", alignSelf:"flex-end", marginBottom:2 }}>${pool.goal.toLocaleString()}</span>
                  </div>
                  <div style={{ height:4, background:"#E7E5E4", borderRadius:0 }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:"#1C1917" }} />
                  </div>
                  <div style={{ fontSize:11, color:"#78716C", marginTop:4, fontFamily:"system-ui" }}>{pct.toFixed(1)}% funded</div>
                </div>

                {/* Stage tracker — timeline dots */}
                <div style={{ display:"flex", alignItems:"center", borderTop:"1px solid #E7E5E4", paddingTop:12 }}>
                  {STAGES.map((st,si) => (
                    <div key={st} style={{ display:"flex", alignItems:"center", flex:1 }}>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, flex:1 }}>
                        <div style={{ width:10, height:10, borderRadius:"50%", background: si <= curStep ? "#1C1917" : "#E7E5E4", border: si === curStep ? "3px solid #1C1917" : "2px solid #D6D3D1" }} />
                        <span style={{ fontSize:8, color: si <= curStep ? "#1C1917" : "#A8A29E", fontWeight: si === curStep ? 700 : 400, whiteSpace:"nowrap", fontFamily:"system-ui", textTransform:"uppercase", letterSpacing:0.5 }}>{st}</span>
                      </div>
                      {si < STAGES.length-1 && <div style={{ height:1, flex:1, background: si < curStep ? "#1C1917" : "#E7E5E4", marginBottom:14, opacity:0.4 }} />}
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button style={{ width:"100%", padding:"11px 0", background:"#1C1917", color:"#FAFAF8", border:"none", fontSize:13, fontWeight:600, cursor:"pointer", letterSpacing:0.3, fontFamily:"system-ui" }}>
                  View Pool Record →
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
