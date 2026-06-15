import { useState } from "react";

const POOLS = [
  { id:"1", title:"T60 - ZE60-0322 - Uther", compound:"Tirzepatide", manufacturer:"Uther", batch:"ZE60-0322", status:"open", raised:0, goal:480, contributors:0 },
  { id:"2", title:"RE40-0228 - Uther", compound:"Retatrutide", manufacturer:"Uther", batch:"RE40-0228", status:"open", raised:40, goal:480, contributors:1 },
  { id:"3", title:"BPC-A220 - SciPep", compound:"BPC-157", manufacturer:"SciPep", batch:"BPC-A220", status:"funded", raised:480, goal:480, contributors:12 },
  { id:"4", title:"SEM-0930 - AusLabs", compound:"Semaglutide", manufacturer:"AusLabs", batch:"SEM-0930", status:"at_lab", raised:720, goal:720, contributors:18 },
];

const STAGES = ["Collecting","Funded","At Lab","Results"];
const STATUS_IDX: Record<string,number> = { open:0, funded:1, at_lab:2, results:3 };

const STATUS_CFG: Record<string,{label:string;color:string;bg:string;border:string}> = {
  open:    { label:"Collecting", color:"#7C3AED", bg:"#EDE9FE", border:"#C4B5FD" },
  funded:  { label:"Funded",     color:"#059669", bg:"#D1FAE5", border:"#6EE7B7" },
  at_lab:  { label:"At Lab",     color:"#2563EB", bg:"#DBEAFE", border:"#93C5FD" },
  results: { label:"Results",    color:"#D97706", bg:"#FEF3C7", border:"#FCD34D" },
};

const CARD_ACCENTS = ["#7C3AED","#DB2777","#059669","#2563EB"];
const CARD_LIGHTS  = ["#F5F3FF","#FDF2F8","#F0FDF4","#EFF6FF"];
const CARD_ICONS   = ["🧪","⚗️","🔬","🧫"];

export function VibeFresh() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = POOLS.filter(p =>
    (tab === "all" || p.status === tab) &&
    (!q || p.compound.toLowerCase().includes(q.toLowerCase()) || p.manufacturer.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"system-ui,-apple-system,sans-serif", background:"#F8F9FC", color:"#111827", fontSize:14 }}>

      {/* Sidebar */}
      <div style={{ width:220, borderRight:"1.5px solid #E5E7EB", background:"#fff", flexShrink:0, padding:"20px 0", overflowY:"auto" }}>
        <div style={{ padding:"0 16px 14px", borderBottom:"1px solid #F3F4F6" }}>
          <div style={{ fontSize:10, letterSpacing:1.5, color:"#9CA3AF", textTransform:"uppercase", fontWeight:700, marginBottom:8 }}>Manufacturer</div>
          {["Uther","SciPep","AusLabs"].map((m,i) => (
            <label key={m} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", cursor:"pointer", fontSize:13, color:"#374151" }}>
              <input type="checkbox" style={{ accentColor:"#7C3AED", width:14, height:14 }} />
              {m}
              <span style={{ marginLeft:"auto", fontSize:12, color:"#9CA3AF", fontWeight:500 }}>{[2,1,1][i]}</span>
            </label>
          ))}
        </div>
        <div style={{ padding:"14px 16px" }}>
          <div style={{ fontSize:10, letterSpacing:1.5, color:"#9CA3AF", textTransform:"uppercase", fontWeight:700, marginBottom:8 }}>Compound</div>
          {["Tirzepatide","Retatrutide","BPC-157","Semaglutide"].map(c => (
            <label key={c} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", cursor:"pointer", fontSize:13, color:"#374151" }}>
              <input type="checkbox" style={{ accentColor:"#7C3AED", width:14, height:14 }} />
              {c}
              <span style={{ marginLeft:"auto", fontSize:12, color:"#9CA3AF", fontWeight:500 }}>1</span>
            </label>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"24px 28px 0", background:"#fff", borderBottom:"1.5px solid #E5E7EB" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:6 }}>
            <div style={{ width:44, height:44, borderRadius:14, background:"linear-gradient(135deg,#7C3AED,#A855F7)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, boxShadow:"0 4px 12px rgba(124,58,237,0.3)" }}>🔬</div>
            <div>
              <h1 style={{ margin:0, fontSize:22, fontWeight:800, letterSpacing:-0.6 }}>Community Testing Pools</h1>
              <p style={{ margin:"2px 0 0", fontSize:12, color:"#6B7280" }}>Community-funded testing pools · Independent lab results · Openly published</p>
            </div>
          </div>

          <div style={{ position:"relative", margin:"14px 0 12px" }}>
            <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"#9CA3AF", fontSize:14 }}>🔍</span>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by compound, vendor, batch…"
              style={{ width:"100%", boxSizing:"border-box", padding:"10px 14px 10px 36px", border:"1.5px solid #E5E7EB", borderRadius:10, background:"#F9FAFB", fontSize:13, color:"#111827", outline:"none" }} />
          </div>

          <div style={{ display:"flex", gap:4, paddingBottom:16 }}>
            {[["all",`All (${POOLS.length})`],["open","Open (2)"],["funded","Funded"],["results","Has Results (0)"]].map(([k,l]) => (
              <button key={k} onClick={()=>setTab(k)}
                style={{ padding:"6px 16px", borderRadius:8, border:"none", background: tab===k ? "#7C3AED" : "#F3F4F6", color: tab===k ? "#fff" : "#6B7280", fontSize:13, cursor:"pointer", fontWeight: tab===k ? 700 : 500 }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding:"18px 28px 28px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {filtered.map((pool,i) => {
            const pct = pool.goal > 0 ? Math.min(100,(pool.raised/pool.goal)*100) : 0;
            const curStep = STATUS_IDX[pool.status] ?? 0;
            const s = STATUS_CFG[pool.status];
            const accent = CARD_ACCENTS[i % CARD_ACCENTS.length];
            const light  = CARD_LIGHTS[i % CARD_LIGHTS.length];

            return (
              <div key={pool.id} style={{ border:"1.5px solid #E5E7EB", borderRadius:16, background:"#fff", overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", transition:"box-shadow 0.2s" }}>
                {/* Icon area — solid gradient */}
                <div style={{ height:120, background:light, display:"flex", alignItems:"center", justifyContent:"center", position:"relative", borderBottom:"1.5px solid #E5E7EB" }}>
                  <div style={{ width:76, height:76, borderRadius:22, background:`linear-gradient(135deg,${accent}20,${accent}40)`, border:`2px solid ${accent}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:36 }}>
                    {CARD_ICONS[i % CARD_ICONS.length]}
                  </div>
                  <span style={{ position:"absolute", top:10, left:12, padding:"4px 12px", borderRadius:20, background:s.bg, border:`1.5px solid ${s.border}`, fontSize:11, fontWeight:700, color:s.color, letterSpacing:0.3 }}>
                    {s.label}
                  </span>
                  {pool.contributors > 0 && (
                    <span style={{ position:"absolute", top:10, right:12, fontSize:12, color:"#6B7280", display:"flex", alignItems:"center", gap:3 }}>
                      <span>👥</span> <span style={{ fontWeight:600 }}>{pool.contributors}</span>
                    </span>
                  )}
                </div>

                <div style={{ padding:"14px 16px 16px" }}>
                  <div style={{ fontWeight:700, fontSize:15, marginBottom:9, letterSpacing:-0.2 }}>{pool.title}</div>

                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:11 }}>
                    <span style={{ padding:"3px 10px", borderRadius:20, background:"#FFF7ED", border:"1px solid #FDE68A", fontSize:11, fontWeight:600, color:"#92400E" }}>🏭 {pool.manufacturer}</span>
                    <span style={{ padding:"3px 10px", borderRadius:20, background:"#F9FAFB", border:"1px solid #E5E7EB", fontSize:11, color:"#6B7280" }}># {pool.batch}</span>
                    <span style={{ padding:"3px 10px", borderRadius:20, background:light, border:`1px solid ${accent}30`, fontSize:11, fontWeight:600, color:accent }}>⬡ {pool.compound}</span>
                  </div>

                  <div style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:6 }}>
                      <span style={{ color:"#6B7280" }}><strong style={{ color:"#111827", fontWeight:700 }}>${pool.raised}</strong> raised</span>
                      <span style={{ color:accent, fontWeight:700 }}>{pct.toFixed(1)}% of ${pool.goal}</span>
                    </div>
                    <div style={{ height:6, background:"#F3F4F6", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${accent}BB,${accent})`, borderRadius:3 }} />
                    </div>
                  </div>

                  <div style={{ display:"flex", alignItems:"center", marginBottom:14 }}>
                    {STAGES.map((st,si) => (
                      <div key={st} style={{ display:"flex", alignItems:"center", flex:1 }}>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, flex:1 }}>
                          <div style={{ width:10, height:10, borderRadius:"50%", background: si <= curStep ? accent : "#E5E7EB", border: si === curStep ? `2px solid ${accent}` : "none", outline: si === curStep ? `3px solid ${accent}25` : "none" }} />
                          <span style={{ fontSize:9, color: si <= curStep ? accent : "#9CA3AF", fontWeight: si === curStep ? 700 : 400, whiteSpace:"nowrap" }}>{st}</span>
                        </div>
                        {si < STAGES.length-1 && <div style={{ height:2, flex:1, background: si < curStep ? `${accent}60` : "#E5E7EB", marginBottom:13, borderRadius:1 }} />}
                      </div>
                    ))}
                  </div>

                  <button style={{ width:"100%", padding:"10px 0", borderRadius:10, background:`linear-gradient(135deg,${accent},${accent}CC)`, color:"#fff", border:"none", fontSize:14, fontWeight:700, cursor:"pointer", letterSpacing:0.2, boxShadow:`0 4px 14px ${accent}30` }}>
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
