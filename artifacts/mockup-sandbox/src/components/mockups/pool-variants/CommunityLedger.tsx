import { useState } from "react";

const LEDGER_ENTRIES = [
  { member:"#7K91", amount:40, ts:"2d ago", pool:"RE40-0228" },
  { member:"#A3F2", amount:20, ts:"5d ago", pool:"RE40-0228" },
  { member:"#M8X4", amount:80, ts:"6d ago", pool:"RE40-0228" },
];

const POOLS = [
  {
    id:"1", compound:"Tirzepatide", batch:"ZE60-0322", manufacturer:"Uther",
    status:"open", raised:0, goal:480, contributors:0,
    entries: [] as typeof LEDGER_ENTRIES,
    costPerMember: (n: number) => n > 0 ? (480 / n).toFixed(2) : "—",
  },
  {
    id:"2", compound:"Retatrutide", batch:"RE40-0228", manufacturer:"Uther",
    status:"open", raised:40, goal:480, contributors:1,
    entries: LEDGER_ENTRIES.slice(0,1),
    costPerMember: (n: number) => n > 0 ? (480 / n).toFixed(2) : "—",
  },
  {
    id:"3", compound:"TB-500", batch:"TB7-1122", manufacturer:"PrimePep",
    status:"results", raised:360, goal:360, contributors:9,
    entries:[
      { member:"#P2K1", amount:40, ts:"3mo ago", pool:"TB7-1122" },
      { member:"#F9Q3", amount:40, ts:"3mo ago", pool:"TB7-1122" },
      { member:"#N6W7", amount:40, ts:"3mo ago", pool:"TB7-1122" },
      { member:"#R1J5", amount:40, ts:"3mo ago", pool:"TB7-1122" },
      { member:"#H4D8", amount:40, ts:"3mo ago", pool:"TB7-1122" },
      { member:"#L0M2", amount:40, ts:"3mo ago", pool:"TB7-1122" },
      { member:"#S3B9", amount:40, ts:"3mo ago", pool:"TB7-1122" },
      { member:"#X5T6", amount:40, ts:"3mo ago", pool:"TB7-1122" },
      { member:"#K7V0", amount:40, ts:"3mo ago", pool:"TB7-1122" },
    ],
    costPerMember: (n: number) => (360 / 9).toFixed(2),
  },
];

const STATUS: Record<string, { label:string; dot:string }> = {
  open:    { label:"Collecting", dot:"#f59e0b" },
  funded:  { label:"Funded",     dot:"#8b5cf6" },
  results: { label:"Results",    dot:"#10b981" },
};

export function CommunityLedger() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["2","3"]));
  const toggle = (id:string) => setExpanded(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <div className="min-h-screen font-sans" style={{ background:"#fffef7", color:"#111" }}>
      {/* Header */}
      <div style={{ borderBottom:"2px solid #111", padding:"18px 24px", background:"#fff" }}>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between" }}>
          <div>
            <h1 style={{ margin:0, fontSize:18, fontWeight:800, letterSpacing:-0.5 }}>Community Testing · Public Ledger</h1>
            <p style={{ margin:"3px 0 0", fontSize:11, color:"#666" }}>All contributions are recorded transparently. Members are shown by anonymous ID only.</p>
          </div>
          <span style={{ fontFamily:"monospace", fontSize:10, color:"#aaa", letterSpacing:1 }}>LAST UPDATED: {new Date().toLocaleDateString("en-GB").replace(/\//g,".")}</span>
        </div>
      </div>

      <div style={{ padding:"16px 24px", display:"flex", flexDirection:"column", gap:16 }}>
        {POOLS.map(pool => {
          const isOpen = expanded.has(pool.id);
          const pct = pool.goal > 0 ? Math.round((pool.raised / pool.goal)*100) : 0;
          const remaining = pool.goal - pool.raised;
          const s = STATUS[pool.status] ?? STATUS["open"];
          const targetPerMember = pool.contributors > 0 ? (pool.goal / pool.contributors).toFixed(2) : null;
          const splitIf48 = (pool.goal / 48).toFixed(2);

          return (
            <div key={pool.id} style={{ border:"1.5px solid #111", background:"#fff", overflow:"hidden" }}>
              {/* Pool header row — clickable */}
              <button onClick={() => toggle(pool.id)} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", padding:0, textAlign:"left" }}>
                <div style={{ padding:"12px 16px", borderBottom:"1px solid #e8e8e0", display:"flex", alignItems:"center", gap:16 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:s.dot, flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14 }}>{pool.compound}</div>
                    <div style={{ fontFamily:"monospace", fontSize:10, color:"#888", marginTop:1 }}>{pool.batch} · {pool.manufacturer}</div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontFamily:"monospace", fontSize:13, fontWeight:700 }}>${pool.raised} <span style={{ fontSize:10, fontWeight:400, color:"#888" }}>/ ${pool.goal}</span></div>
                    <div style={{ fontFamily:"monospace", fontSize:10, color:"#888" }}>{pool.contributors} contributor{pool.contributors!==1?"s":""} · {pct}%</div>
                  </div>
                  <span style={{ fontFamily:"monospace", fontSize:14, color:"#999", flexShrink:0 }}>{isOpen?"▾":"▸"}</span>
                </div>
              </button>

              {/* Funding bar */}
              <div style={{ height:3, background:"#f0f0e8" }}>
                <div style={{ height:"100%", width:`${pct}%`, background:"#111", transition:"width 0.3s" }} />
              </div>

              {isOpen && (
                <div style={{ padding:"14px 16px" }}>
                  {/* Cost analysis */}
                  <div style={{ background:"#f9f8f0", border:"1px solid #e8e6d8", padding:"10px 14px", marginBottom:14, fontSize:11, display:"flex", gap:24, flexWrap:"wrap" }}>
                    {remaining > 0 ? (
                      <>
                        <div><span style={{ fontFamily:"monospace", color:"#888" }}>Remaining: </span><strong style={{ fontFamily:"monospace" }}>${remaining}</strong></div>
                        <div><span style={{ fontFamily:"monospace", color:"#888" }}>If 12 join: </span><strong style={{ fontFamily:"monospace" }}>${(remaining/12).toFixed(2)} /person</strong></div>
                        <div><span style={{ fontFamily:"monospace", color:"#888" }}>If 48 join: </span><strong style={{ fontFamily:"monospace" }}>${(pool.goal/48).toFixed(2)} /person</strong></div>
                      </>
                    ) : (
                      <div style={{ color:"#1a6e1a" }}><span style={{ fontFamily:"monospace" }}>✓ Fully funded · Avg ${targetPerMember} / contributor</span></div>
                    )}
                    {pool.status === "open" && (
                      <div style={{ marginLeft:"auto" }}>
                        <button style={{ fontFamily:"monospace", fontSize:11, padding:"4px 12px", background:"#111", color:"#fff", border:"none", cursor:"pointer" }}>
                          + Contribute
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Ledger table */}
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                    <thead>
                      <tr style={{ borderBottom:"1px solid #e0e0d8" }}>
                        <th style={{ padding:"5px 0", textAlign:"left", fontFamily:"monospace", fontSize:10, color:"#888", letterSpacing:1, fontWeight:600 }}>MEMBER</th>
                        <th style={{ padding:"5px 0", textAlign:"right", fontFamily:"monospace", fontSize:10, color:"#888", letterSpacing:1, fontWeight:600 }}>AMOUNT</th>
                        <th style={{ padding:"5px 0", textAlign:"right", fontFamily:"monospace", fontSize:10, color:"#888", letterSpacing:1, fontWeight:600 }}>TIMESTAMP</th>
                        <th style={{ padding:"5px 0", textAlign:"right", fontFamily:"monospace", fontSize:10, color:"#888", letterSpacing:1, fontWeight:600 }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pool.entries.length === 0 ? (
                        <tr><td colSpan={4} style={{ padding:"16px 0", fontFamily:"monospace", fontSize:11, color:"#ccc", textAlign:"center" }}>No contributions yet — be the first</td></tr>
                      ) : pool.entries.map((e,i) => (
                        <tr key={i} style={{ borderBottom:"1px solid #f0f0e8" }}>
                          <td style={{ padding:"7px 0", fontFamily:"monospace", fontSize:12, fontWeight:600 }}>{e.member}</td>
                          <td style={{ padding:"7px 0", textAlign:"right", fontFamily:"monospace", fontSize:12 }}>${e.amount}</td>
                          <td style={{ padding:"7px 0", textAlign:"right", fontFamily:"monospace", fontSize:11, color:"#888" }}>{e.ts}</td>
                          <td style={{ padding:"7px 0", textAlign:"right" }}>
                            <span style={{ fontFamily:"monospace", fontSize:10, color:"#1a6e1a" }}>✓ confirmed</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {pool.entries.length > 0 && (
                      <tfoot>
                        <tr style={{ borderTop:"1.5px solid #111" }}>
                          <td style={{ padding:"7px 0", fontFamily:"monospace", fontSize:11, fontWeight:700 }}>TOTAL</td>
                          <td style={{ padding:"7px 0", textAlign:"right", fontFamily:"monospace", fontSize:12, fontWeight:700 }}>${pool.raised}</td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    )}
                  </table>

                  {pool.status === "results" && (
                    <div style={{ marginTop:12, padding:"8px 12px", background:"#f0f7f0", border:"1px solid #b8ddb8", fontFamily:"monospace", fontSize:10, color:"#1a6e1a", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span>✓ TESTING COMPLETE · Results published and verified</span>
                      <a href="#" style={{ color:"#1a6e1a", textDecoration:"underline" }}>View COA →</a>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
