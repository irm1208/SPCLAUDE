import { useState } from "react";

// Stage-Morphic: each card's entire layout is determined by its lifecycle stage.
// Collecting = fundraiser urgency. Funded = milestone celebration.
// At Lab = clinical pending. Results = published report.

const POOLS = [
  { id:"1", title:"T60 - ZE60-0322", compound:"Tirzepatide", manufacturer:"Uther", batch:"ZE60-0322", status:"open", raised:0, goal:480, contributors:0 },
  { id:"2", title:"RE40-0228", compound:"Retatrutide", manufacturer:"Uther", batch:"RE40-0228", status:"open", raised:40, goal:480, contributors:1 },
  { id:"3", title:"BPC-A220", compound:"BPC-157", manufacturer:"SciPep", batch:"BPC-A220", status:"funded", raised:480, goal:480, contributors:12 },
  { id:"4", title:"SEM-0930", compound:"Semaglutide", manufacturer:"AusLabs", batch:"SEM-0930", status:"at_lab", raised:720, goal:720, contributors:18 },
];

function CollectingCard({ pool }: { pool: typeof POOLS[0] }) {
  const pct = pool.goal > 0 ? Math.min(100, (pool.raised / pool.goal) * 100) : 0;
  const remaining = pool.goal - pool.raised;
  return (
    <div style={{ border:"2px solid #E5E7EB", borderRadius:16, background:"#fff", overflow:"hidden", display:"flex", flexDirection:"column" }}>
      {/* Urgency banner */}
      <div style={{ background:"linear-gradient(135deg,#7C3AED,#A855F7)", padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:10, letterSpacing:2, color:"#DDD6FE", textTransform:"uppercase", fontWeight:700 }}>Now Collecting</div>
          <div style={{ fontSize:16, fontWeight:800, color:"#fff", marginTop:2 }}>{pool.compound}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:26, fontWeight:900, color:"#fff", lineHeight:1 }}>${remaining}</div>
          <div style={{ fontSize:11, color:"#DDD6FE" }}>still needed</div>
        </div>
      </div>

      <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:14, flex:1 }}>
        {/* Large progress meter */}
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ fontSize:13, color:"#6B7280" }}>Raised <strong style={{ color:"#111827" }}>${pool.raised}</strong></span>
            <span style={{ fontSize:20, fontWeight:800, color:"#7C3AED" }}>{pct.toFixed(0)}%</span>
          </div>
          <div style={{ height:12, background:"#F3F4F6", borderRadius:6, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${Math.max(pct,2)}%`, background:"linear-gradient(90deg,#7C3AED,#A855F7)", borderRadius:6 }} />
          </div>
          <div style={{ fontSize:11, color:"#9CA3AF", marginTop:6 }}>Goal: ${pool.goal} · {pool.manufacturer} · {pool.batch}</div>
        </div>

        {/* Social proof / empty state */}
        <div style={{ padding:"12px 14px", background:"#F9F5FF", borderRadius:10, border:"1px dashed #C4B5FD" }}>
          {pool.contributors === 0 ? (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:22, marginBottom:4 }}>🧪</div>
              <div style={{ fontSize:13, fontWeight:600, color:"#7C3AED" }}>Be the first contributor</div>
              <div style={{ fontSize:11, color:"#9CA3AF", marginTop:2 }}>Help fund this community test</div>
            </div>
          ) : (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ fontSize:22 }}>👥</div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"#7C3AED" }}>{pool.contributors} member{pool.contributors !== 1 ? "s" : ""} in</div>
                <div style={{ fontSize:11, color:"#9CA3AF" }}>Join them and help reach the goal</div>
              </div>
            </div>
          )}
        </div>

        <button style={{ width:"100%", padding:"12px 0", borderRadius:10, background:"linear-gradient(135deg,#7C3AED,#A855F7)", color:"#fff", border:"none", fontSize:14, fontWeight:800, cursor:"pointer", letterSpacing:0.3, boxShadow:"0 4px 14px rgba(124,58,237,0.35)" }}>
          Join This Pool →
        </button>
      </div>
    </div>
  );
}

function FundedCard({ pool }: { pool: typeof POOLS[0] }) {
  return (
    <div style={{ border:"2px solid #A7F3D0", borderRadius:16, background:"#F0FDF4", overflow:"hidden", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"linear-gradient(135deg,#059669,#10B981)", padding:"12px 20px", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ fontSize:28 }}>✅</div>
        <div>
          <div style={{ fontSize:10, letterSpacing:2, color:"#A7F3D0", textTransform:"uppercase", fontWeight:700 }}>Fully Funded</div>
          <div style={{ fontSize:16, fontWeight:800, color:"#fff", marginTop:2 }}>{pool.compound}</div>
        </div>
        <div style={{ marginLeft:"auto", textAlign:"right" }}>
          <div style={{ fontSize:22, fontWeight:900, color:"#fff" }}>${pool.raised}</div>
          <div style={{ fontSize:10, color:"#A7F3D0" }}>100% of ${pool.goal}</div>
        </div>
      </div>

      <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div style={{ padding:"10px 14px", background:"#fff", borderRadius:10, border:"1px solid #D1FAE5" }}>
            <div style={{ fontSize:11, color:"#6B7280", marginBottom:2 }}>Contributors</div>
            <div style={{ fontSize:22, fontWeight:800, color:"#059669" }}>{pool.contributors}</div>
          </div>
          <div style={{ padding:"10px 14px", background:"#fff", borderRadius:10, border:"1px solid #D1FAE5" }}>
            <div style={{ fontSize:11, color:"#6B7280", marginBottom:2 }}>Status</div>
            <div style={{ fontSize:13, fontWeight:700, color:"#059669" }}>Awaiting dispatch</div>
          </div>
        </div>
        <div style={{ fontSize:12, color:"#6B7280" }}>
          <span style={{ color:"#374151", fontWeight:600 }}>{pool.manufacturer}</span> · Batch {pool.batch}
        </div>
        <div style={{ padding:"10px 14px", background:"#ECFDF5", borderRadius:10, border:"1px solid #A7F3D0", fontSize:12, color:"#065F46" }}>
          🎉 This pool is fully funded and will be sent to an independent lab shortly.
        </div>
        <button style={{ width:"100%", padding:"10px 0", borderRadius:10, background:"#fff", color:"#059669", border:"2px solid #059669", fontSize:13, fontWeight:700, cursor:"pointer" }}>
          View Pool Details
        </button>
      </div>
    </div>
  );
}

function AtLabCard({ pool }: { pool: typeof POOLS[0] }) {
  return (
    <div style={{ border:"2px solid #BFDBFE", borderRadius:16, background:"#EFF6FF", overflow:"hidden", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"linear-gradient(135deg,#1D4ED8,#3B82F6)", padding:"12px 20px", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ fontSize:28 }}>🔬</div>
        <div>
          <div style={{ fontSize:10, letterSpacing:2, color:"#BFDBFE", textTransform:"uppercase", fontWeight:700 }}>Analysis Underway</div>
          <div style={{ fontSize:16, fontWeight:800, color:"#fff", marginTop:2 }}>{pool.compound}</div>
        </div>
      </div>

      <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:12 }}>
        {/* Lab status indicator */}
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {[
            { label:"Sample received by lab", done:true },
            { label:"Initial analysis started", done:true },
            { label:"Full panel in progress", done:false },
            { label:"Results published", done:false },
          ].map((step, si) => (
            <div key={si} style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:20, height:20, borderRadius:"50%", background: step.done ? "#2563EB" : "#E5E7EB", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:"#fff", flexShrink:0 }}>
                {step.done ? "✓" : ""}
              </div>
              <span style={{ fontSize:12, color: step.done ? "#1E40AF" : "#9CA3AF", fontWeight: step.done ? 600 : 400 }}>{step.label}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize:12, color:"#6B7280", borderTop:"1px solid #DBEAFE", paddingTop:10 }}>
          <span style={{ color:"#374151", fontWeight:600 }}>{pool.manufacturer}</span> · {pool.batch} · {pool.contributors} contributors
        </div>
        <button style={{ width:"100%", padding:"10px 0", borderRadius:10, background:"#2563EB", color:"#fff", border:"none", fontSize:13, fontWeight:700, cursor:"pointer" }}>
          Monitor Progress
        </button>
      </div>
    </div>
  );
}

export function SurpriseMorphic() {
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
        <div style={{ padding:"14px 16px", borderTop:"1px solid #F3F4F6" }}>
          <div style={{ fontSize:11, color:"#9CA3AF", lineHeight:1.6 }}>
            Cards change shape based on each pool's current stage.
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"22px 28px 16px", background:"#fff", borderBottom:"1.5px solid #E5E7EB" }}>
          <div style={{ display:"flex", alignItems:"center", gap:11, marginBottom:6 }}>
            <div style={{ width:38, height:38, borderRadius:12, background:"linear-gradient(135deg,#7C3AED,#A855F7)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:19, boxShadow:"0 4px 12px rgba(124,58,237,0.3)" }}>🔬</div>
            <div>
              <h1 style={{ margin:0, fontSize:20, fontWeight:800, letterSpacing:-0.5 }}>Community Testing Pools</h1>
              <p style={{ margin:"2px 0 0", fontSize:12, color:"#6B7280" }}>Cards adapt to each pool's stage — collecting, funded, at lab, or results</p>
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
          {filtered.map(pool => {
            if (pool.status === "open")   return <CollectingCard key={pool.id} pool={pool} />;
            if (pool.status === "funded") return <FundedCard key={pool.id} pool={pool} />;
            if (pool.status === "at_lab") return <AtLabCard key={pool.id} pool={pool} />;
            return null;
          })}
        </div>
      </div>
    </div>
  );
}
