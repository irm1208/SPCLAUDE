import { useState } from "react";

const POOLS = [
  { id:"1", title:"T60 - ZE60-0322 - Uther", compound:"Tirzepatide", manufacturer:"Uther", batch:"ZE60-0322", status:"open", raised:0, goal:480, contributors:0, icon:"🧪" },
  { id:"2", title:"RE40-0228 - Uther", compound:"Retatrutide", manufacturer:"Uther", batch:"RE40-0228", status:"open", raised:40, goal:480, contributors:1, icon:"⚗️" },
  { id:"3", title:"BPC-A220 - SciPep", compound:"BPC-157", manufacturer:"SciPep", batch:"BPC-A220", status:"funded", raised:480, goal:480, contributors:12, icon:"🔬" },
  { id:"4", title:"SEM-0930 - AusLabs", compound:"Semaglutide", manufacturer:"AusLabs", batch:"SEM-0930", status:"at_lab", raised:720, goal:720, contributors:18, icon:"🧫" },
];

const STAGES = ["Collecting","Funded","At Lab","Results"];
const STATUS_IDX: Record<string,number> = { open:0, funded:1, at_lab:2, results:3 };
const STATUS_LABEL: Record<string,string> = { open:"Collecting", funded:"Funded", at_lab:"At Lab", results:"Results" };

const CARD_PALETTES = [
  { bg:"#FDF3E8", iconBg:"#F5E0C3", iconColor:"#C4622D", accent:"#C4622D" },
  { bg:"#FBF0F5", iconBg:"#F2D9E8", iconColor:"#A0456A", accent:"#A0456A" },
  { bg:"#F0F5E8", iconBg:"#D9EBC3", iconColor:"#5A7A2A", accent:"#5A7A2A" },
  { bg:"#E8F2F5", iconBg:"#C3DDE8", iconColor:"#2A6A7A", accent:"#2A6A7A" },
];

export function VibeWarm() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = POOLS.filter(p =>
    (tab === "all" || p.status === tab) &&
    (!q || p.compound.toLowerCase().includes(q.toLowerCase()) || p.manufacturer.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Georgia', Georgia, serif", background:"#FAF5ED", color:"#2D1F0E", fontSize:14 }}>

      {/* Sidebar */}
      <div style={{ width:220, borderRight:"1px solid #E8D9C4", background:"#F5EDE0", flexShrink:0, padding:"20px 0", overflowY:"auto" }}>
        <div style={{ padding:"0 18px 16px", borderBottom:"1px solid #E8D9C4" }}>
          <div style={{ fontFamily:"sans-serif", fontSize:10, letterSpacing:2, color:"#A07850", textTransform:"uppercase", marginBottom:8 }}>Manufacturer</div>
          {["Uther","SciPep","AusLabs"].map((m,i) => (
            <label key={m} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", cursor:"pointer", fontFamily:"sans-serif", fontSize:12, color:"#5A3E28" }}>
              <input type="checkbox" style={{ accentColor:"#C4622D" }} />
              {m}
              <span style={{ marginLeft:"auto", fontSize:11, color:"#A07850" }}>{[2,1,1][i]}</span>
            </label>
          ))}
        </div>
        <div style={{ padding:"14px 18px" }}>
          <div style={{ fontFamily:"sans-serif", fontSize:10, letterSpacing:2, color:"#A07850", textTransform:"uppercase", marginBottom:8 }}>Compound</div>
          {["Tirzepatide","Retatrutide","BPC-157","Semaglutide"].map((c,i) => (
            <label key={c} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", cursor:"pointer", fontFamily:"sans-serif", fontSize:12, color:"#5A3E28" }}>
              <input type="checkbox" style={{ accentColor:"#C4622D" }} />
              {c}
              <span style={{ marginLeft:"auto", fontSize:11, color:"#A07850" }}>1</span>
            </label>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>
        {/* Header */}
        <div style={{ padding:"22px 28px 0" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:6 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:"#EDD9C0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🔬</div>
            <div>
              <h1 style={{ margin:0, fontSize:22, fontWeight:700, letterSpacing:-0.4, fontFamily:"'Georgia',serif" }}>Community Testing Pools</h1>
              <p style={{ margin:"2px 0 0", fontSize:12, color:"#8C6A4A", fontFamily:"sans-serif" }}>Community-funded testing where members pool funds for independent lab results</p>
            </div>
          </div>

          {/* Search */}
          <div style={{ position:"relative", margin:"14px 0 12px" }}>
            <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"#B8977A", fontSize:14 }}>🔍</span>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by compound, vendor, batch…"
              style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px 9px 34px", border:"1.5px solid #E0CAAC", borderRadius:10, background:"#FFF8F0", fontSize:13, color:"#2D1F0E", outline:"none", fontFamily:"sans-serif" }} />
          </div>

          {/* Tabs */}
          <div style={{ display:"flex", gap:6 }}>
            {[["all","All (4)"],["open","Open (2)"],["funded","Funded (1)"],["results","Has Results (0)"]].map(([k,l]) => (
              <button key={k} onClick={()=>setTab(k)}
                style={{ padding:"6px 14px", borderRadius:20, border: tab===k ? "none" : "1.5px solid #E0CAAC", background: tab===k ? "#C4622D" : "transparent", color: tab===k ? "#fff" : "#8C6A4A", fontSize:12, cursor:"pointer", fontFamily:"sans-serif", fontWeight: tab===k ? 600 : 400 }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Cards grid */}
        <div style={{ padding:"16px 28px 28px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
          {filtered.map((pool,i) => {
            const pal = CARD_PALETTES[i % CARD_PALETTES.length];
            const pct = pool.goal > 0 ? Math.min(100,(pool.raised/pool.goal)*100) : 0;
            const curStep = STATUS_IDX[pool.status] ?? 0;

            return (
              <div key={pool.id} style={{ border:"1.5px solid #E0CAAC", borderRadius:14, background:"#FFFBF4", overflow:"hidden", boxShadow:"0 2px 8px rgba(180,130,80,0.08)" }}>
                {/* Icon area */}
                <div style={{ height:120, background:pal.bg, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                  <div style={{ width:72, height:72, borderRadius:20, background:pal.iconBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}>{pool.icon}</div>
                  <span style={{ position:"absolute", top:10, left:12, padding:"3px 10px", borderRadius:20, background:"rgba(255,255,255,0.85)", border:`1px solid ${pal.accent}40`, fontSize:10, fontWeight:700, color:pal.accent, fontFamily:"sans-serif", letterSpacing:0.8, textTransform:"uppercase" }}>
                    {STATUS_LABEL[pool.status]}
                  </span>
                  {pool.contributors > 0 && (
                    <span style={{ position:"absolute", top:10, right:12, fontSize:11, color:"#8C6A4A", fontFamily:"sans-serif" }}>👥 {pool.contributors}</span>
                  )}
                </div>

                {/* Content */}
                <div style={{ padding:"14px 16px 16px" }}>
                  <div style={{ fontWeight:700, fontSize:15, marginBottom:8, fontFamily:"'Georgia',serif", letterSpacing:-0.2 }}>{pool.title}</div>

                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
                    <span style={{ padding:"3px 10px", borderRadius:20, background:"#F5E8D4", border:"1px solid #E0CAAC", fontSize:11, color:"#8C5A2A", fontFamily:"sans-serif" }}>🏭 {pool.manufacturer}</span>
                    <span style={{ padding:"3px 10px", borderRadius:20, background:"#F2F5E8", border:"1px solid #CACED8", fontSize:11, color:"#4A5A2A", fontFamily:"sans-serif" }}># {pool.batch}</span>
                    <span style={{ padding:"3px 10px", borderRadius:20, background:"#F0EDF8", border:"1px solid #D8D0E8", fontSize:11, color:"#5A4A7A", fontFamily:"sans-serif" }}>⬡ {pool.compound}</span>
                  </div>

                  <div style={{ marginBottom:8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontFamily:"sans-serif", fontSize:12, color:"#8C6A4A", marginBottom:5 }}>
                      <span><strong style={{ color:"#2D1F0E" }}>${pool.raised}</strong> raised</span>
                      <span style={{ color:pal.accent, fontWeight:600 }}>{pct.toFixed(1)}% of ${pool.goal}</span>
                    </div>
                    <div style={{ height:5, background:"#EDD9C0", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${pal.accent}CC,${pal.accent})`, borderRadius:3 }} />
                    </div>
                  </div>

                  {/* Stage dots */}
                  <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:14 }}>
                    {STAGES.map((s,si) => (
                      <div key={s} style={{ display:"flex", alignItems:"center", flex:1 }}>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, flex:1 }}>
                          <div style={{ width:10, height:10, borderRadius:"50%", background: si <= curStep ? pal.accent : "#E0CAAC", transition:"background 0.2s" }} />
                          <span style={{ fontSize:9, color: si <= curStep ? pal.accent : "#B8977A", fontFamily:"sans-serif", whiteSpace:"nowrap" }}>{s}</span>
                        </div>
                        {si < STAGES.length-1 && <div style={{ height:1.5, flex:1, background: si < curStep ? pal.accent : "#E0CAAC", marginBottom:12 }} />}
                      </div>
                    ))}
                  </div>

                  <button style={{ width:"100%", padding:"9px 0", borderRadius:10, background:`linear-gradient(135deg,${pal.accent},${pal.accent}CC)`, color:"#fff", border:"none", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"sans-serif", letterSpacing:0.3 }}>
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
