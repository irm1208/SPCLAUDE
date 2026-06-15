import { useState } from "react";

const POOLS = [
  { id:"1", title:"T60 - ZE60-0322 - Uther", compound:"Tirzepatide", manufacturer:"Uther", batch:"ZE60-0322", status:"open", raised:0, goal:480, contributors:0 },
  { id:"2", title:"RE40-0228 - Uther", compound:"Retatrutide", manufacturer:"Uther", batch:"RE40-0228", status:"open", raised:40, goal:480, contributors:1 },
  { id:"3", title:"BPC-A220 - SciPep", compound:"BPC-157", manufacturer:"SciPep", batch:"BPC-A220", status:"funded", raised:480, goal:480, contributors:12 },
  { id:"4", title:"SEM-0930 - AusLabs", compound:"Semaglutide", manufacturer:"AusLabs", batch:"SEM-0930", status:"at_lab", raised:720, goal:720, contributors:18 },
];

const STAGES = ["Collecting","Funded","At Lab","Results"];
const STATUS_IDX: Record<string,number> = { open:0, funded:1, at_lab:2, results:3 };
const STATUS_CFG: Record<string,{label:string;color:string;bg:string}> = {
  open:    { label:"COLLECTING", color:"#58A6FF", bg:"rgba(88,166,255,0.12)" },
  funded:  { label:"FUNDED",     color:"#3FB950", bg:"rgba(63,185,80,0.12)" },
  at_lab:  { label:"AT LAB",     color:"#A371F7", bg:"rgba(163,113,247,0.12)" },
  results: { label:"RESULTS",    color:"#F0883E", bg:"rgba(240,136,62,0.12)" },
};

const ICON_GLYPHS = ["⬡","◈","◉","◎"];

export function VibeDark() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = POOLS.filter(p =>
    (tab === "all" || p.status === tab) &&
    (!q || p.compound.toLowerCase().includes(q.toLowerCase()) || p.manufacturer.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Inter',system-ui,sans-serif", background:"#0D1117", color:"#E6EDF3", fontSize:14 }}>

      {/* Sidebar */}
      <div style={{ width:220, borderRight:"1px solid #21262D", background:"#161B22", flexShrink:0, padding:"20px 0", overflowY:"auto" }}>
        <div style={{ padding:"0 16px 14px", borderBottom:"1px solid #21262D" }}>
          <div style={{ fontSize:10, letterSpacing:2, color:"#8B949E", textTransform:"uppercase", marginBottom:8 }}>Manufacturer</div>
          {["Uther","SciPep","AusLabs"].map((m,i) => (
            <label key={m} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", cursor:"pointer", fontSize:12, color:"#C9D1D9" }}>
              <input type="checkbox" style={{ accentColor:"#58A6FF" }} />
              {m}
              <span style={{ marginLeft:"auto", fontSize:11, color:"#8B949E" }}>{[2,1,1][i]}</span>
            </label>
          ))}
        </div>
        <div style={{ padding:"14px 16px" }}>
          <div style={{ fontSize:10, letterSpacing:2, color:"#8B949E", textTransform:"uppercase", marginBottom:8 }}>Compound</div>
          {["Tirzepatide","Retatrutide","BPC-157","Semaglutide"].map(c => (
            <label key={c} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", cursor:"pointer", fontSize:12, color:"#C9D1D9" }}>
              <input type="checkbox" style={{ accentColor:"#58A6FF" }} />
              {c}
              <span style={{ marginLeft:"auto", fontSize:11, color:"#8B949E" }}>1</span>
            </label>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"22px 26px 0" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:6 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:"#1C2128", border:"1px solid #30363D", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>⬡</div>
            <div>
              <h1 style={{ margin:0, fontSize:20, fontWeight:700, letterSpacing:-0.4, color:"#F0F6FC" }}>Community Testing Pools</h1>
              <p style={{ margin:"2px 0 0", fontSize:12, color:"#8B949E" }}>Independent lab verification funded by the community. All results published openly.</p>
            </div>
          </div>

          <div style={{ position:"relative", margin:"14px 0 12px" }}>
            <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:"#8B949E", fontSize:13 }}>⌕</span>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search compound, vendor, batch…"
              style={{ width:"100%", boxSizing:"border-box", padding:"8px 12px 8px 32px", border:"1px solid #30363D", borderRadius:8, background:"#161B22", fontSize:13, color:"#E6EDF3", outline:"none" }} />
          </div>

          <div style={{ display:"flex", gap:4 }}>
            {[["all","All (4)"],["open","Open (2)"],["funded","Funded (1)"],["results","Has Results (0)"]].map(([k,l]) => (
              <button key={k} onClick={()=>setTab(k)}
                style={{ padding:"5px 14px", borderRadius:6, border: tab===k ? "1px solid #58A6FF" : "1px solid #30363D", background: tab===k ? "rgba(88,166,255,0.15)" : "transparent", color: tab===k ? "#58A6FF" : "#8B949E", fontSize:12, cursor:"pointer" }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding:"14px 26px 28px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          {filtered.map((pool,i) => {
            const pct = pool.goal > 0 ? Math.min(100,(pool.raised/pool.goal)*100) : 0;
            const curStep = STATUS_IDX[pool.status] ?? 0;
            const s = STATUS_CFG[pool.status];
            const ACCENT_COLORS = ["#58A6FF","#A371F7","#3FB950","#F78166"];
            const accentColor = ACCENT_COLORS[i % ACCENT_COLORS.length];

            return (
              <div key={pool.id} style={{ border:"1px solid #21262D", borderRadius:10, background:"#161B22", overflow:"hidden" }}>
                {/* Icon area */}
                <div style={{ height:110, background:"#1C2128", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", borderBottom:"1px solid #21262D" }}>
                  <div style={{ width:64, height:64, borderRadius:16, background:"#0D1117", border:`1.5px solid ${accentColor}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, color:accentColor }}>
                    {ICON_GLYPHS[i % ICON_GLYPHS.length]}
                  </div>
                  <span style={{ position:"absolute", top:10, left:12, padding:"3px 10px", borderRadius:5, background:s.bg, border:`1px solid ${s.color}40`, fontSize:10, fontWeight:700, color:s.color, letterSpacing:1 }}>
                    {s.label}
                  </span>
                  {pool.contributors > 0 && (
                    <span style={{ position:"absolute", top:10, right:12, fontSize:11, color:"#8B949E" }}>👥 {pool.contributors}</span>
                  )}
                </div>

                <div style={{ padding:"12px 14px 14px" }}>
                  <div style={{ fontWeight:600, fontSize:14, marginBottom:8, color:"#F0F6FC" }}>{pool.title}</div>

                  <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
                    <span style={{ padding:"2px 8px", borderRadius:5, background:"rgba(255,255,255,0.06)", border:"1px solid #30363D", fontSize:11, color:"#8B949E" }}>🏭 {pool.manufacturer}</span>
                    <span style={{ padding:"2px 8px", borderRadius:5, background:"rgba(255,255,255,0.06)", border:"1px solid #30363D", fontSize:11, color:"#8B949E", fontFamily:"monospace" }}># {pool.batch}</span>
                    <span style={{ padding:"2px 8px", borderRadius:5, background:`${accentColor}18`, border:`1px solid ${accentColor}35`, fontSize:11, color:accentColor }}>⬡ {pool.compound}</span>
                  </div>

                  <div style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#8B949E", marginBottom:5 }}>
                      <span><span style={{ color:"#E6EDF3", fontWeight:600 }}>${pool.raised}</span> raised</span>
                      <span style={{ color:accentColor, fontWeight:600 }}>{pct.toFixed(1)}% of ${pool.goal}</span>
                    </div>
                    <div style={{ height:3, background:"#21262D", borderRadius:2, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:accentColor, borderRadius:2, boxShadow:`0 0 6px ${accentColor}80` }} />
                    </div>
                  </div>

                  <div style={{ display:"flex", alignItems:"center", marginBottom:12 }}>
                    {STAGES.map((st,si) => (
                      <div key={st} style={{ display:"flex", alignItems:"center", flex:1 }}>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, flex:1 }}>
                          <div style={{ width:8, height:8, borderRadius:"50%", background: si <= curStep ? accentColor : "#30363D", boxShadow: si === curStep ? `0 0 6px ${accentColor}` : "none" }} />
                          <span style={{ fontSize:9, color: si <= curStep ? accentColor : "#484F58", whiteSpace:"nowrap" }}>{st}</span>
                        </div>
                        {si < STAGES.length-1 && <div style={{ height:1, flex:1, background: si < curStep ? accentColor : "#21262D", marginBottom:12 }} />}
                      </div>
                    ))}
                  </div>

                  <button style={{ width:"100%", padding:"8px 0", borderRadius:7, background:`${accentColor}18`, border:`1px solid ${accentColor}50`, color:accentColor, fontSize:13, fontWeight:600, cursor:"pointer" }}>
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
