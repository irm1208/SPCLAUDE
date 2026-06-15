import { useState } from "react";

// Funding Thermometer: the funding progress is the HERO visual of each card.
// Not a 6px bar buried at the bottom — a bold vertical fill or arc that dominates.
// Every other detail is secondary to: how funded is this?

const POOLS = [
  { id:"1", title:"T60 - ZE60-0322", compound:"Tirzepatide", manufacturer:"Uther", batch:"ZE60-0322", status:"open", raised:0, goal:480, contributors:0 },
  { id:"2", title:"RE40-0228", compound:"Retatrutide", manufacturer:"Uther", batch:"RE40-0228", status:"open", raised:40, goal:480, contributors:1 },
  { id:"3", title:"BPC-A220", compound:"BPC-157", manufacturer:"SciPep", batch:"BPC-A220", status:"funded", raised:480, goal:480, contributors:12 },
  { id:"4", title:"SEM-0930", compound:"Semaglutide", manufacturer:"AusLabs", batch:"SEM-0930", status:"at_lab", raised:720, goal:720, contributors:18 },
];

const CARD_ACCENTS = ["#7C3AED","#DB2777","#059669","#2563EB"];
const CARD_LIGHTS  = ["#F5F3FF","#FDF2F8","#F0FDF4","#EFF6FF"];
const CARD_ICONS   = ["🧪","⚗️","🔬","🧫"];

const STATUS: Record<string,{label:string;color:string}> = {
  open:    { label:"Collecting", color:"#7C3AED" },
  funded:  { label:"Funded",     color:"#059669" },
  at_lab:  { label:"At Lab",     color:"#2563EB" },
  results: { label:"Results",    color:"#D97706" },
};

function Thermometer({ pct, accent, light }: { pct: number; accent: string; light: string }) {
  const bulbH = 44;
  const tubeH = 90;
  const fillH = (pct / 100) * tubeH;

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:0, userSelect:"none" }}>
      {/* Percentage label */}
      <div style={{ fontSize:28, fontWeight:900, color:accent, lineHeight:1, marginBottom:6 }}>
        {pct.toFixed(0)}<span style={{ fontSize:16, fontWeight:700 }}>%</span>
      </div>
      {/* Tube */}
      <div style={{ width:22, height:tubeH, borderRadius:11, background:light, border:`2px solid ${accent}30`, overflow:"hidden", display:"flex", flexDirection:"column", justifyContent:"flex-end", position:"relative" }}>
        <div style={{ width:"100%", height:`${fillH}px`, background:`linear-gradient(180deg,${accent}BB,${accent})`, borderRadius:8, transition:"height 0.4s ease" }} />
      </div>
      {/* Bulb */}
      <div style={{ width:28, height:28, borderRadius:"50%", background:pct > 0 ? accent : light, border:`2px solid ${accent}40`, marginTop:-4, boxShadow: pct > 0 ? `0 0 10px ${accent}50` : "none" }} />
    </div>
  );
}

export function SurpriseThermometer() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = POOLS.filter(p =>
    (tab === "all" || p.status === tab) &&
    (!q || p.compound.toLowerCase().includes(q.toLowerCase()) || p.manufacturer.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"system-ui,-apple-system,sans-serif", background:"#F8F9FC", fontSize:14 }}>

      {/* Sidebar */}
      <div style={{ width:210, borderRight:"1.5px solid #E5E7EB", background:"#fff", flexShrink:0, padding:"20px 0", overflowY:"auto" }}>
        <div style={{ padding:"0 16px 14px", borderBottom:"1px solid #F3F4F6" }}>
          <div style={{ fontSize:10, letterSpacing:1.5, color:"#9CA3AF", textTransform:"uppercase", fontWeight:700, marginBottom:8 }}>Manufacturer</div>
          {(["Uther","SciPep","AusLabs"] as const).map((m,i) => (
            <label key={m} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", cursor:"pointer", fontSize:13, color:"#374151" }}>
              <input type="checkbox" style={{ accentColor:"#7C3AED", width:13, height:13 }} />
              {m}
              <span style={{ marginLeft:"auto", fontSize:11, color:"#9CA3AF" }}>{[2,1,1][i]}</span>
            </label>
          ))}
        </div>
        <div style={{ padding:"14px 16px" }}>
          <div style={{ fontSize:10, letterSpacing:1.5, color:"#9CA3AF", textTransform:"uppercase", fontWeight:700, marginBottom:8 }}>Compound</div>
          {["Tirzepatide","Retatrutide","BPC-157","Semaglutide"].map(c => (
            <label key={c} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", cursor:"pointer", fontSize:13, color:"#374151" }}>
              <input type="checkbox" style={{ accentColor:"#7C3AED", width:13, height:13 }} />
              {c}
              <span style={{ marginLeft:"auto", fontSize:11, color:"#9CA3AF" }}>1</span>
            </label>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"22px 28px 16px", background:"#fff", borderBottom:"1.5px solid #E5E7EB" }}>
          <div style={{ display:"flex", alignItems:"center", gap:11, marginBottom:6 }}>
            <div style={{ width:38, height:38, borderRadius:12, background:"linear-gradient(135deg,#7C3AED,#A855F7)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:19, boxShadow:"0 4px 12px rgba(124,58,237,0.3)" }}>🔬</div>
            <div>
              <h1 style={{ margin:0, fontSize:20, fontWeight:800, letterSpacing:-0.5 }}>Community Testing Pools</h1>
              <p style={{ margin:"2px 0 0", fontSize:12, color:"#6B7280" }}>Funding progress is the headline — everything else follows</p>
            </div>
          </div>
          <div style={{ display:"flex", gap:3, marginTop:14 }}>
            {[["all","All (4)"],["open","Collecting (2)"],["funded","Funded"],["at_lab","At Lab"]].map(([k,l]) => (
              <button key={k} onClick={()=>setTab(k)}
                style={{ padding:"5px 14px", borderRadius:8, border:"none", background: tab===k ? "#7C3AED" : "#F3F4F6", color: tab===k ? "#fff" : "#6B7280", fontSize:12, cursor:"pointer", fontWeight: tab===k ? 700 : 500 }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding:"18px 28px 28px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {filtered.map((pool,i) => {
            const pct = pool.goal > 0 ? Math.min(100,(pool.raised/pool.goal)*100) : 0;
            const s = STATUS[pool.status];
            const accent = CARD_ACCENTS[i % CARD_ACCENTS.length];
            const light  = CARD_LIGHTS[i % CARD_LIGHTS.length];

            return (
              <div key={pool.id} style={{ border:"1.5px solid #E5E7EB", borderRadius:16, background:"#fff", overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>

                {/* Card body: thermometer on left, details on right */}
                <div style={{ display:"flex", gap:0 }}>

                  {/* Thermometer column */}
                  <div style={{ width:90, background:light, borderRight:`1.5px solid ${accent}20`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"20px 0", gap:8, flexShrink:0 }}>
                    <Thermometer pct={pct} accent={accent} light="#fff" />
                    <div style={{ fontSize:11, color:accent, fontWeight:700, textAlign:"center", paddingBottom:4 }}>
                      ${pool.raised}<br/>
                      <span style={{ fontWeight:400, color:"#9CA3AF" }}>of ${pool.goal}</span>
                    </div>
                  </div>

                  {/* Details column */}
                  <div style={{ flex:1, padding:"16px 18px", display:"flex", flexDirection:"column", gap:10 }}>

                    {/* Status + icon */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <span style={{ fontSize:11, fontWeight:700, color:s.color, letterSpacing:0.3 }}>{s.label.toUpperCase()}</span>
                      <span style={{ fontSize:22 }}>{CARD_ICONS[i % CARD_ICONS.length]}</span>
                    </div>

                    {/* Title */}
                    <div style={{ fontWeight:700, fontSize:14, color:"#111827", lineHeight:1.3 }}>{pool.title}</div>

                    {/* Compound — prominent */}
                    <div style={{ fontSize:16, fontWeight:800, color:accent }}>{pool.compound}</div>

                    {/* Meta */}
                    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                      <div style={{ fontSize:11, color:"#6B7280" }}>
                        <span style={{ fontWeight:600, color:"#374151" }}>{pool.manufacturer}</span> · {pool.batch}
                      </div>
                      {pool.contributors > 0
                        ? <div style={{ fontSize:11, color:"#6B7280" }}>{pool.contributors} contributor{pool.contributors !== 1 ? "s" : ""}</div>
                        : <div style={{ fontSize:11, color:"#9CA3AF" }}>No contributors yet</div>
                      }
                    </div>

                    <button style={{ marginTop:"auto", width:"100%", padding:"9px 0", borderRadius:10, background:`linear-gradient(135deg,${accent},${accent}CC)`, color:"#fff", border:"none", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:`0 3px 10px ${accent}30` }}>
                      View Pool →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
