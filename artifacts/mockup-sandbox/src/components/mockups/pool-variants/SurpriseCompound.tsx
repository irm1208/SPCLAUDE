import { useState } from "react";

// Compound-First: the chemical compound name is the H1 of every card.
// Currently: title (batch ref) is the headline, compound is a small tag pill.
// Here: compound IS the identity. Batch and manufacturer are footnotes.
// The browsing experience is organized around WHAT you're studying, not admin identifiers.

const POOLS = [
  { id:"1", title:"T60 - ZE60-0322", compound:"Tirzepatide", manufacturer:"Uther", batch:"ZE60-0322", status:"open", raised:0, goal:480, contributors:0, class:"GLP-1 / GIP Agonist" },
  { id:"2", title:"RE40-0228", compound:"Retatrutide", manufacturer:"Uther", batch:"RE40-0228", status:"open", raised:40, goal:480, contributors:1, class:"GLP-1 / GIP / Glucagon" },
  { id:"3", title:"BPC-A220", compound:"BPC-157", manufacturer:"SciPep", batch:"BPC-A220", status:"funded", raised:480, goal:480, contributors:12, class:"Regenerative Peptide" },
  { id:"4", title:"SEM-0930", compound:"Semaglutide", manufacturer:"AusLabs", batch:"SEM-0930", status:"at_lab", raised:720, goal:720, contributors:18, class:"GLP-1 Agonist" },
];

const STATUS: Record<string,{label:string;dot:string;color:string;bg:string;border:string}> = {
  open:    { label:"Collecting", dot:"#7C3AED", color:"#5B21B6", bg:"#EDE9FE", border:"#C4B5FD" },
  funded:  { label:"Funded",     dot:"#059669", color:"#065F46", bg:"#D1FAE5", border:"#6EE7B7" },
  at_lab:  { label:"At Lab",     dot:"#2563EB", color:"#1E40AF", bg:"#DBEAFE", border:"#93C5FD" },
  results: { label:"Results",    dot:"#D97706", color:"#92400E", bg:"#FEF3C7", border:"#FCD34D" },
};

const COMPOUND_COLORS: Record<string, { accent:string; bg:string; border:string; icon:string }> = {
  "Tirzepatide":  { accent:"#7C3AED", bg:"#F5F3FF", border:"#DDD6FE", icon:"🟣" },
  "Retatrutide":  { accent:"#DB2777", bg:"#FDF2F8", border:"#FBCFE8", icon:"🩷" },
  "BPC-157":      { accent:"#059669", bg:"#F0FDF4", border:"#BBF7D0", icon:"🟢" },
  "Semaglutide":  { accent:"#2563EB", bg:"#EFF6FF", border:"#BFDBFE", icon:"🔵" },
};

function CompoundBadge({ compound }: { compound: string }) {
  const c = COMPOUND_COLORS[compound] ?? { accent:"#6B7280", bg:"#F9FAFB", border:"#E5E7EB", icon:"⚪" };
  return (
    <div style={{
      display:"inline-flex", alignItems:"center", gap:8,
      padding:"6px 14px 6px 10px",
      borderRadius:999,
      background:c.bg,
      border:`2px solid ${c.border}`,
    }}>
      <span style={{ fontSize:14 }}>{c.icon}</span>
      <span style={{ fontSize:16, fontWeight:900, color:c.accent, letterSpacing:-0.3 }}>{compound}</span>
    </div>
  );
}

export function SurpriseCompound() {
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
        {/* Compound filter — with compound color swatches */}
        <div style={{ padding:"14px 16px" }}>
          <div style={{ fontSize:10, letterSpacing:1.5, color:"#9CA3AF", textTransform:"uppercase", fontWeight:700, marginBottom:10 }}>Compound</div>
          {(["Tirzepatide","Retatrutide","BPC-157","Semaglutide"] as const).map(c => {
            const col = COMPOUND_COLORS[c] ?? { accent:"#6B7280", bg:"#F9FAFB", border:"#E5E7EB", icon:"⚪" };
            return (
              <label key={c} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", cursor:"pointer" }}>
                <div style={{ width:12, height:12, borderRadius:"50%", background:col.accent, flexShrink:0 }} />
                <span style={{ fontSize:12, color:"#374151", flex:1 }}>{c}</span>
                <span style={{ fontSize:11, color:"#9CA3AF" }}>1</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"22px 28px 16px", background:"#fff", borderBottom:"1.5px solid #E5E7EB" }}>
          <div style={{ display:"flex", alignItems:"center", gap:11, marginBottom:6 }}>
            <div style={{ width:38, height:38, borderRadius:12, background:"linear-gradient(135deg,#7C3AED,#A855F7)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:19, boxShadow:"0 4px 12px rgba(124,58,237,0.3)" }}>🔬</div>
            <div>
              <h1 style={{ margin:0, fontSize:20, fontWeight:800, letterSpacing:-0.5 }}>Community Testing Pools</h1>
              <p style={{ margin:"2px 0 0", fontSize:12, color:"#6B7280" }}>Browse by compound — the chemistry comes first</p>
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
          {filtered.map((pool) => {
            const pct = pool.goal > 0 ? Math.min(100,(pool.raised/pool.goal)*100) : 0;
            const s = STATUS[pool.status];
            const col = COMPOUND_COLORS[pool.compound] ?? { accent:"#6B7280", bg:"#F9FAFB", border:"#E5E7EB", icon:"⚪" };

            return (
              <div key={pool.id} style={{
                border:`2px solid ${col.border}`,
                borderRadius:18,
                background:col.bg,
                overflow:"hidden",
                display:"flex",
                flexDirection:"column",
                boxShadow:`0 2px 12px ${col.accent}10`,
              }}>

                {/* Compound hero — the headline */}
                <div style={{ padding:"18px 20px 14px", borderBottom:`1.5px solid ${col.border}` }}>
                  <CompoundBadge compound={pool.compound} />
                  <div style={{ fontSize:11, color:col.accent, fontWeight:600, marginTop:8, letterSpacing:0.2 }}>
                    {pool.class}
                  </div>
                </div>

                <div style={{ padding:"14px 20px 18px", background:"#fff", flex:1, display:"flex", flexDirection:"column", gap:12 }}>

                  {/* Status + contributor */}
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <div style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, background:s.bg, border:`1.5px solid ${s.border}` }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", background:s.dot }} />
                      <span style={{ fontSize:12, fontWeight:700, color:s.color }}>{s.label}</span>
                    </div>
                    {pool.contributors > 0 && (
                      <span style={{ fontSize:12, color:"#6B7280" }}>{pool.contributors} contributor{pool.contributors !== 1 ? "s" : ""}</span>
                    )}
                  </div>

                  {/* Batch ref + manufacturer — secondary */}
                  <div>
                    <div style={{ fontSize:12, color:"#6B7280" }}>
                      <span style={{ fontWeight:600, color:"#374151" }}>{pool.manufacturer}</span>
                      <span style={{ color:"#D1D5DB", margin:"0 6px" }}>·</span>
                      <span style={{ fontFamily:"monospace", fontSize:11, color:"#9CA3AF" }}>{pool.batch}</span>
                    </div>
                  </div>

                  {/* Funding — still present but not leading */}
                  <div>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}>
                      <span style={{ color:"#6B7280" }}><strong style={{ color:"#111827" }}>${pool.raised}</strong> raised</span>
                      <span style={{ color:col.accent, fontWeight:700 }}>{pct.toFixed(1)}% of ${pool.goal}</span>
                    </div>
                    <div style={{ height:6, background:"#F3F4F6", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${col.accent}AA,${col.accent})`, borderRadius:3 }} />
                    </div>
                  </div>

                  <button style={{ width:"100%", padding:"10px 0", borderRadius:10, background:`linear-gradient(135deg,${col.accent},${col.accent}CC)`, color:"#fff", border:"none", fontSize:13, fontWeight:700, cursor:"pointer", letterSpacing:0.2, boxShadow:`0 4px 14px ${col.accent}30` }}>
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
