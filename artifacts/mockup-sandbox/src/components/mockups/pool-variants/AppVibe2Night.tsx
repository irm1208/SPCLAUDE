import { useState } from "react";

const POOLS = [
  { id:"1", title:"T60 - ZE60-0322 - Uther", compound:"Tirzepatide", manufacturer:"Uther", batch:"ZE60-0322", status:"open", raised:0, goal:480, contributors:0 },
  { id:"2", title:"RE40-0228 - Uther", compound:"Retatrutide", manufacturer:"Uther", batch:"RE40-0228", status:"open", raised:40, goal:480, contributors:1 },
  { id:"3", title:"BPC-A220 - SciPep", compound:"BPC-157", manufacturer:"SciPep", batch:"BPC-A220", status:"funded", raised:480, goal:480, contributors:12 },
  { id:"4", title:"SEM-0930 - AusLabs", compound:"Semaglutide", manufacturer:"AusLabs", batch:"SEM-0930", status:"at_lab", raised:720, goal:720, contributors:18 },
];

const STAGES = ["Collecting","Funded","At Lab","Results"];
const STATUS_IDX: Record<string,number> = { open:0, funded:1, at_lab:2, results:3 };

const STATUS: Record<string,{label:string;glow:string;color:string;bg:string}> = {
  open:    { label:"COLLECTING", glow:"#22D3EE", color:"#22D3EE", bg:"rgba(34,211,238,0.08)" },
  funded:  { label:"FUNDED",     glow:"#34D399", color:"#34D399", bg:"rgba(52,211,153,0.08)" },
  at_lab:  { label:"AT LAB",     glow:"#A78BFA", color:"#A78BFA", bg:"rgba(167,139,250,0.08)" },
  results: { label:"RESULTS",    glow:"#FCD34D", color:"#FCD34D", bg:"rgba(252,211,77,0.08)" },
};

const CARD_GLOWS = ["#22D3EE","#34D399","#A78BFA","#FCD34D"];
const CARD_ICONS = ["🧪","⚗️","🔬","🧫"];

export function AppVibe2Night() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = POOLS.filter(p =>
    (tab === "all" || p.status === tab) &&
    (!q || p.compound.toLowerCase().includes(q.toLowerCase()) || p.manufacturer.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"system-ui,-apple-system,sans-serif", background:"#0C0F1A", color:"#E2E8F0", fontSize:13 }}>

      {/* Sidebar */}
      <div style={{ width:200, borderRight:"1px solid #1E293B", background:"#0F1420", flexShrink:0, padding:"20px 0", overflowY:"auto" }}>
        <div style={{ padding:"0 16px 12px", borderBottom:"1px solid #1E293B" }}>
          <div style={{ fontSize:9, letterSpacing:2, color:"#475569", textTransform:"uppercase", fontWeight:700, marginBottom:10 }}>Manufacturer</div>
          {(["Uther","SciPep","AusLabs"] as const).map((m,i) => (
            <label key={m} style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0", cursor:"pointer" }}>
              <input type="checkbox" style={{ accentColor:"#22D3EE", width:12, height:12 }} />
              <span style={{ fontSize:12, color:"#94A3B8" }}>{m}</span>
              <span style={{ marginLeft:"auto", fontSize:11, color:"#475569" }}>{[2,1,1][i]}</span>
            </label>
          ))}
        </div>
        <div style={{ padding:"12px 16px" }}>
          <div style={{ fontSize:9, letterSpacing:2, color:"#475569", textTransform:"uppercase", fontWeight:700, marginBottom:10 }}>Compound</div>
          {["Tirzepatide","Retatrutide","BPC-157","Semaglutide"].map(c => (
            <label key={c} style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0", cursor:"pointer" }}>
              <input type="checkbox" style={{ accentColor:"#22D3EE", width:12, height:12 }} />
              <span style={{ fontSize:12, color:"#94A3B8" }}>{c}</span>
              <span style={{ marginLeft:"auto", fontSize:11, color:"#475569" }}>1</span>
            </label>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div style={{ padding:"24px 28px 16px", borderBottom:"1px solid #1E293B" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:"rgba(34,211,238,0.12)", border:"1px solid rgba(34,211,238,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>🔬</div>
            <h1 style={{ margin:0, fontSize:19, fontWeight:800, letterSpacing:-0.5, color:"#F1F5F9" }}>Community Testing Pools</h1>
          </div>
          <p style={{ margin:"0 0 18px 44px", fontSize:12, color:"#475569", lineHeight:1.5 }}>
            Community-funded · Independent lab results · Openly published
          </p>

          <div style={{ position:"relative", marginBottom:12 }}>
            <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#475569", fontSize:13 }}>🔍</span>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search compound, vendor, batch…"
              style={{ width:"100%", maxWidth:380, boxSizing:"border-box", padding:"8px 12px 8px 30px", border:"1px solid #1E293B", borderRadius:8, background:"#111827", fontSize:12, color:"#E2E8F0", outline:"none" }} />
          </div>

          <div style={{ display:"flex", gap:2 }}>
            {[["all","All (4)"],["open","Open (2)"],["funded","Funded"],["results","Results"]].map(([k,l]) => (
              <button key={k} onClick={()=>setTab(k)}
                style={{ padding:"5px 14px", borderRadius:6, border: tab===k ? "1px solid #22D3EE" : "1px solid #1E293B", background: tab===k ? "rgba(34,211,238,0.1)" : "transparent", color: tab===k ? "#22D3EE" : "#64748B", fontSize:12, cursor:"pointer", fontWeight: tab===k ? 700 : 400, boxShadow: tab===k ? "0 0 12px rgba(34,211,238,0.15)" : "none" }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div style={{ padding:"20px 28px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          {filtered.map((pool,i) => {
            const pct = pool.goal > 0 ? Math.min(100,(pool.raised/pool.goal)*100) : 0;
            const curStep = STATUS_IDX[pool.status] ?? 0;
            const s = STATUS[pool.status];
            const glow = CARD_GLOWS[i % CARD_GLOWS.length];

            return (
              <div key={pool.id} style={{
                background:"#111827",
                border:`1px solid ${glow}22`,
                borderRadius:16,
                padding:"18px 20px",
                display:"flex",
                flexDirection:"column",
                gap:12,
                boxShadow:`0 0 0 0 transparent, inset 0 1px 0 rgba(255,255,255,0.04)`,
                position:"relative",
                overflow:"hidden",
              }}>
                {/* Subtle glow corner */}
                <div style={{ position:"absolute", top:-40, right:-40, width:100, height:100, borderRadius:"50%", background:`${glow}12`, filter:"blur(20px)", pointerEvents:"none" }} />

                {/* Top: status + icon */}
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, background:s.bg, border:`1px solid ${s.glow}30`, marginBottom:8 }}>
                      <div style={{ width:5, height:5, borderRadius:"50%", background:s.color, boxShadow:`0 0 6px ${s.glow}` }} />
                      <span style={{ fontSize:10, fontWeight:700, color:s.color, letterSpacing:1.5 }}>{s.label}</span>
                    </div>
                    <div style={{ fontSize:14, fontWeight:700, color:"#F1F5F9", lineHeight:1.3, paddingRight:8 }}>{pool.title}</div>
                  </div>
                  <div style={{ width:52, height:52, borderRadius:12, background:`${glow}12`, border:`1px solid ${glow}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
                    {CARD_ICONS[i % CARD_ICONS.length]}
                  </div>
                </div>

                {/* Chips */}
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  <span style={{ padding:"2px 8px", borderRadius:4, background:"rgba(255,255,255,0.04)", border:"1px solid #1E293B", fontSize:11, color:"#94A3B8" }}>{pool.manufacturer}</span>
                  <span style={{ padding:"2px 8px", borderRadius:4, background:"rgba(255,255,255,0.04)", border:"1px solid #1E293B", fontSize:11, color:"#64748B", fontFamily:"monospace" }}>#{pool.batch}</span>
                  <span style={{ padding:"2px 8px", borderRadius:4, background:`${glow}12`, border:`1px solid ${glow}30`, fontSize:11, color:glow }}>{pool.compound}</span>
                </div>

                {/* Funding */}
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}>
                    <span style={{ color:"#64748B" }}>Raised: <strong style={{ color:"#E2E8F0" }}>${pool.raised}</strong></span>
                    <span style={{ color:glow, fontWeight:700 }}>{pct.toFixed(1)}% / ${pool.goal}</span>
                  </div>
                  <div style={{ height:4, background:"#1E293B", borderRadius:2, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${glow}88,${glow})`, borderRadius:2, boxShadow:`0 0 8px ${glow}60` }} />
                  </div>
                </div>

                {/* Stage tracker */}
                <div style={{ display:"flex", alignItems:"center" }}>
                  {STAGES.map((st,si) => (
                    <div key={st} style={{ display:"flex", alignItems:"center", flex:1 }}>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, flex:1 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background: si <= curStep ? glow : "#1E293B", border: si === curStep ? `2px solid ${glow}` : "none", boxShadow: si === curStep ? `0 0 8px ${glow}` : "none" }} />
                        <span style={{ fontSize:8, color: si <= curStep ? glow : "#334155", fontWeight: si === curStep ? 700 : 400, whiteSpace:"nowrap", letterSpacing:0.3 }}>{st}</span>
                      </div>
                      {si < STAGES.length-1 && <div style={{ height:1, flex:1, background: si < curStep ? `${glow}50` : "#1E293B", marginBottom:11 }} />}
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  {pool.contributors > 0
                    ? <span style={{ fontSize:11, color:"#64748B" }}>{pool.contributors} member{pool.contributors !== 1 ? "s" : ""}</span>
                    : <span style={{ fontSize:11, color:"#334155" }}>Be first to join</span>
                  }
                  <button style={{ padding:"7px 16px", borderRadius:8, background:`linear-gradient(135deg,${glow}30,${glow}20)`, color:glow, border:`1px solid ${glow}40`, fontSize:12, fontWeight:700, cursor:"pointer", boxShadow:`0 0 12px ${glow}20` }}>
                    View Pool →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
