import { useState } from "react";

const POOLS = [
  { id:"1", title:"T60 - ZE60-0322 - Uther", compound:"Tirzepatide", manufacturer:"Uther", batch:"ZE60-0322", status:"open", raised:0, goal:480, contributors:0 },
  { id:"2", title:"RE40-0228 - Uther", compound:"Retatrutide", manufacturer:"Uther", batch:"RE40-0228", status:"open", raised:40, goal:480, contributors:1 },
  { id:"3", title:"BPC-A220 - SciPep", compound:"BPC-157", manufacturer:"SciPep", batch:"BPC-A220", status:"funded", raised:480, goal:480, contributors:12 },
  { id:"4", title:"SEM-0930 - AusLabs", compound:"Semaglutide", manufacturer:"AusLabs", batch:"SEM-0930", status:"at_lab", raised:720, goal:720, contributors:18 },
];

const STATUS: Record<string,{label:string;color:string}> = {
  open:    { label:"COLLECTING", color:"#0D9488" },
  funded:  { label:"FUNDED",     color:"#2563EB" },
  at_lab:  { label:"AT LAB",     color:"#7C3AED" },
  results: { label:"RESULTS",    color:"#059669" },
};

const STAGES = ["Collecting","Funded","At Lab","Results"];
const STATUS_IDX: Record<string,number> = { open:0, funded:1, at_lab:2, results:3 };

const MONO = "#0D9488";

export function AppVibe1Mono() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = POOLS.filter(p =>
    (tab === "all" || p.status === tab) &&
    (!q || p.compound.toLowerCase().includes(q.toLowerCase()) || p.manufacturer.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'SF Mono',ui-monospace,monospace", background:"#F7F8F9", color:"#111827", fontSize:13 }}>

      {/* Sidebar — minimal, monochrome */}
      <div style={{ width:200, borderRight:"1px solid #DDE1E7", background:"#fff", flexShrink:0, padding:"20px 0" }}>
        <div style={{ padding:"0 16px 12px", borderBottom:"1px solid #DDE1E7" }}>
          <div style={{ fontSize:9, letterSpacing:2, color:"#9CA3AF", textTransform:"uppercase", fontWeight:700, marginBottom:10 }}>Manufacturer</div>
          {(["Uther","SciPep","AusLabs"] as const).map((m,i) => (
            <label key={m} style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0", cursor:"pointer" }}>
              <div style={{ width:12, height:12, border:"1.5px solid #D1D5DB", borderRadius:2, flexShrink:0 }} />
              <span style={{ fontSize:12, color:"#374151" }}>{m}</span>
              <span style={{ marginLeft:"auto", fontSize:11, color:"#9CA3AF" }}>{[2,1,1][i]}</span>
            </label>
          ))}
        </div>
        <div style={{ padding:"12px 16px" }}>
          <div style={{ fontSize:9, letterSpacing:2, color:"#9CA3AF", textTransform:"uppercase", fontWeight:700, marginBottom:10 }}>Compound</div>
          {["Tirzepatide","Retatrutide","BPC-157","Semaglutide"].map(c => (
            <label key={c} style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0", cursor:"pointer" }}>
              <div style={{ width:12, height:12, border:"1.5px solid #D1D5DB", borderRadius:2, flexShrink:0 }} />
              <span style={{ fontSize:12, color:"#374151" }}>{c}</span>
              <span style={{ marginLeft:"auto", fontSize:11, color:"#9CA3AF" }}>1</span>
            </label>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div style={{ padding:"24px 28px 16px", background:"#fff", borderBottom:"1px solid #DDE1E7" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:MONO, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🧪</div>
            <h1 style={{ margin:0, fontSize:18, fontWeight:700, letterSpacing:-0.3, fontFamily:"system-ui", color:"#111827" }}>Community Testing Pools</h1>
          </div>
          <p style={{ margin:"0 0 16px 42px", fontSize:12, color:"#6B7280", fontFamily:"system-ui", lineHeight:1.5 }}>
            Community-funded · Independent lab results · Openly published
          </p>

          <div style={{ position:"relative", marginBottom:12 }}>
            <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#9CA3AF", fontSize:12 }}>⌕</span>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search compound, vendor, batch…"
              style={{ width:"100%", maxWidth:360, boxSizing:"border-box", padding:"8px 12px 8px 28px", border:"1px solid #DDE1E7", borderRadius:6, background:"#F9FAFB", fontSize:12, color:"#111827", outline:"none", fontFamily:"system-ui" }} />
          </div>

          <div style={{ display:"flex", gap:2 }}>
            {[["all","All (4)"],["open","Open (2)"],["funded","Funded"],["results","Results"]].map(([k,l]) => (
              <button key={k} onClick={()=>setTab(k)}
                style={{ padding:"5px 14px", borderRadius:4, border: tab===k ? `1.5px solid ${MONO}` : "1.5px solid #DDE1E7", background: tab===k ? `${MONO}12` : "transparent", color: tab===k ? MONO : "#6B7280", fontSize:12, cursor:"pointer", fontWeight: tab===k ? 700 : 400, fontFamily:"system-ui" }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Cards — 2 column grid, minimal */}
        <div style={{ padding:"20px 28px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {filtered.map((pool,i) => {
            const pct = pool.goal > 0 ? Math.min(100,(pool.raised/pool.goal)*100) : 0;
            const curStep = STATUS_IDX[pool.status] ?? 0;
            const s = STATUS[pool.status];

            return (
              <div key={pool.id} style={{ background:"#fff", border:"1px solid #DDE1E7", borderRadius:12, padding:"18px 20px", display:"flex", flexDirection:"column", gap:12 }}>

                {/* Top: status tag + icon */}
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontSize:10, letterSpacing:1.5, fontWeight:700, color:s.color, marginBottom:6 }}>{s.label}</div>
                    <div style={{ fontSize:15, fontWeight:700, color:"#111827", fontFamily:"system-ui", lineHeight:1.3 }}>{pool.title}</div>
                  </div>
                  <div style={{ width:52, height:52, borderRadius:10, background:`${MONO}10`, border:`1px solid ${MONO}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0, marginLeft:12 }}>
                    {["🧪","⚗️","🔬","🧫"][i % 4]}
                  </div>
                </div>

                {/* Meta chips — spare, mono */}
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  <span style={{ padding:"2px 8px", borderRadius:4, background:"#F3F4F6", border:"1px solid #E5E7EB", fontSize:11, color:"#374151" }}>{pool.manufacturer}</span>
                  <span style={{ padding:"2px 8px", borderRadius:4, background:"#F3F4F6", border:"1px solid #E5E7EB", fontSize:11, color:"#6B7280", fontFamily:"monospace" }}>#{pool.batch}</span>
                  <span style={{ padding:"2px 8px", borderRadius:4, background:`${MONO}10`, border:`1px solid ${MONO}25`, fontSize:11, color:MONO }}>{pool.compound}</span>
                </div>

                {/* Funding */}
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6, fontFamily:"system-ui" }}>
                    <span style={{ color:"#6B7280" }}>Raised: <strong style={{ color:"#111827" }}>${pool.raised}</strong></span>
                    <span style={{ color:MONO, fontWeight:600 }}>{pct.toFixed(1)}% / ${pool.goal}</span>
                  </div>
                  <div style={{ height:3, background:"#F3F4F6", borderRadius:2, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:MONO, borderRadius:2 }} />
                  </div>
                </div>

                {/* Stage tracker */}
                <div style={{ display:"flex", alignItems:"center" }}>
                  {STAGES.map((st,si) => (
                    <div key={st} style={{ display:"flex", alignItems:"center", flex:1 }}>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, flex:1 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background: si <= curStep ? MONO : "#DDE1E7", border: si === curStep ? `2px solid ${MONO}` : "none" }} />
                        <span style={{ fontSize:8, color: si <= curStep ? MONO : "#9CA3AF", fontWeight: si === curStep ? 700 : 400, whiteSpace:"nowrap", letterSpacing:0.5 }}>{st.toUpperCase()}</span>
                      </div>
                      {si < STAGES.length-1 && <div style={{ height:1, flex:1, background: si < curStep ? MONO : "#DDE1E7", marginBottom:11 }} />}
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  {pool.contributors > 0
                    ? <span style={{ fontSize:11, color:"#6B7280" }}>{pool.contributors} contributor{pool.contributors !== 1 ? "s" : ""}</span>
                    : <span style={{ fontSize:11, color:"#9CA3AF" }}>No contributors yet</span>
                  }
                  <button style={{ padding:"7px 16px", borderRadius:6, background:MONO, color:"#fff", border:"none", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"system-ui" }}>
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
