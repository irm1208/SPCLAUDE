const POOLS = [
  {
    id:"1", compound:"Tirzepatide", class:"GLP-1/GIP Dual Agonist", cas:"2023788-19-2",
    manufacturer:"Uther", batch:"ZE60-0322", status:"open",
    raised:0, goal:480, contributors:0,
    tests:[
      { method:"RP-HPLC", analyte:"Purity", unit:"%", spec:"≥ 98.0", result:null },
      { method:"LC-MS/MS", analyte:"Molecular Weight", unit:"Da", spec:"4813.5 ± 0.5", result:null },
      { method:"UV-Vis", analyte:"Peptide Content", unit:"mg/vial", spec:"Labelled ± 10%", result:null },
      { method:"Visual", analyte:"Appearance", unit:"—", spec:"White lyophilised powder", result:null },
      { method:"pH", analyte:"Reconstituted pH", unit:"pH", spec:"5.0–7.5", result:null },
    ]
  },
  {
    id:"2", compound:"Retatrutide", class:"GLP-1/GIP/Glucagon Triple Agonist", cas:"2381090-08-8",
    manufacturer:"Uther", batch:"RE40-0228", status:"open",
    raised:40, goal:480, contributors:1,
    tests:[
      { method:"RP-HPLC", analyte:"Purity", unit:"%", spec:"≥ 98.0", result:null },
      { method:"LC-MS/MS", analyte:"Molecular Weight", unit:"Da", spec:"4723.4 ± 0.5", result:null },
      { method:"UV-Vis", analyte:"Peptide Content", unit:"mg/vial", spec:"Labelled ± 10%", result:null },
      { method:"Visual", analyte:"Appearance", unit:"—", spec:"White lyophilised powder", result:null },
    ]
  },
  {
    id:"3", compound:"TB-500", class:"Thymosin Beta-4 Fragment", cas:"77591-33-4",
    manufacturer:"PrimePep", batch:"TB7-1122", status:"results",
    raised:360, goal:360, contributors:9,
    tests:[
      { method:"RP-HPLC", analyte:"Purity", unit:"%", spec:"≥ 98.0", result:"99.1" },
      { method:"LC-MS/MS", analyte:"Molecular Weight", unit:"Da", spec:"4963.5 ± 0.5", result:"4963.4" },
      { method:"UV-Vis", analyte:"Peptide Content", unit:"mg/vial", spec:"5.0 ± 0.5", result:"4.87" },
      { method:"Visual", analyte:"Appearance", unit:"—", spec:"White lyophilised powder", result:"PASS" },
    ]
  },
];

const STATUS_STEPS = [
  { key:"open",              label:"Collecting" },
  { key:"funded",            label:"Funded" },
  { key:"sent_to_lab",       label:"At Lab" },
  { key:"results_received",  label:"Results" },
];

export function LabReportView() {
  const pct = (pool: typeof POOLS[0]) => pool.goal > 0 ? Math.min(100, (pool.raised / pool.goal) * 100) : 0;
  const stepIdx = (status: string) => {
    const map: Record<string, number> = { open:0, funded:1, sent_to_lab:2, results:3 };
    return map[status] ?? 0;
  };

  return (
    <div className="min-h-screen font-sans" style={{ background:"#f7f7f5", color:"#111" }}>
      {/* Header */}
      <div style={{ borderBottom:"1px solid #e0e0dc", background:"#fff", padding:"18px 28px" }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:12, marginBottom:2 }}>
          <span style={{ fontFamily:"monospace", fontSize:10, letterSpacing:2, color:"#888", textTransform:"uppercase" }}>Community Lab Testing Registry</span>
        </div>
        <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:-0.3, margin:0 }}>Active Testing Pools</h1>
        <p style={{ fontSize:12, color:"#666", margin:"4px 0 0" }}>Independent analytical chemistry results, community-funded and publicly disclosed.</p>
      </div>

      <div style={{ padding:"20px 28px", display:"flex", flexDirection:"column", gap:20 }}>
        {POOLS.map(pool => {
          const curStep = stepIdx(pool.status);
          const p = pct(pool);
          const hasResults = pool.status === "results";

          return (
            <div key={pool.id} style={{ background:"#fff", border:"1px solid #e0e0dc", borderRadius:4, overflow:"hidden" }}>
              {/* Pool header */}
              <div style={{ padding:"14px 18px", borderBottom:"1px solid #eee", display:"flex", gap:24, alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"monospace", fontSize:10, color:"#999", letterSpacing:1, marginBottom:3 }}>
                    {pool.batch} · {pool.manufacturer}
                  </div>
                  <div style={{ fontSize:18, fontWeight:700, letterSpacing:-0.3 }}>{pool.compound}</div>
                  <div style={{ fontSize:11, color:"#666", marginTop:2 }}>{pool.class} · CAS {pool.cas}</div>
                </div>
                {/* Stage tracker */}
                <div style={{ display:"flex", alignItems:"center", gap:0, paddingTop:4 }}>
                  {STATUS_STEPS.map((step, i) => {
                    const done = i <= curStep;
                    const active = i === curStep;
                    return (
                      <div key={step.key} style={{ display:"flex", alignItems:"center" }}>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                          <div style={{
                            width:22, height:22, borderRadius:"50%",
                            background: active ? "#111" : done ? "#555" : "#e0e0dc",
                            border:`2px solid ${done ? "#555" : "#e0e0dc"}`,
                            display:"flex", alignItems:"center", justifyContent:"center"
                          }}>
                            {done && !active && <span style={{ color:"#fff", fontSize:9 }}>✓</span>}
                            {active && <span style={{ width:8, height:8, borderRadius:"50%", background:"#fff", display:"block" }} />}
                          </div>
                          <span style={{ fontSize:9, color: done ? "#333" : "#aaa", fontFamily:"monospace", whiteSpace:"nowrap" }}>{step.label}</span>
                        </div>
                        {i < STATUS_STEPS.length - 1 && (
                          <div style={{ width:28, height:1, background: i < curStep ? "#555" : "#e0e0dc", marginBottom:14 }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Funding row */}
              <div style={{ padding:"10px 18px", borderBottom:"1px solid #eee", background:"#fafafa", display:"flex", gap:24, alignItems:"center" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <span style={{ fontFamily:"monospace", fontSize:11, color:"#555" }}>${pool.raised} raised of ${pool.goal} target</span>
                    <span style={{ fontFamily:"monospace", fontSize:11, color:"#333", fontWeight:600 }}>{Math.round(p)}%</span>
                  </div>
                  <div style={{ height:3, background:"#e8e8e4", borderRadius:2, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${p}%`, background:"#333", borderRadius:2, transition:"width 0.3s" }} />
                  </div>
                </div>
                <span style={{ fontFamily:"monospace", fontSize:11, color:"#888", whiteSpace:"nowrap" }}>{pool.contributors} contributor{pool.contributors !== 1 ? "s" : ""}</span>
                {!hasResults && (
                  <button style={{ padding:"5px 14px", background:"#111", color:"#fff", border:"none", borderRadius:3, fontSize:11, fontFamily:"monospace", cursor:"pointer", letterSpacing:0.5 }}>
                    Join Pool
                  </button>
                )}
              </div>

              {/* Analytical results table */}
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead>
                  <tr style={{ background:"#f3f3f0" }}>
                    <th style={{ padding:"7px 18px", textAlign:"left", fontFamily:"monospace", fontSize:10, color:"#888", letterSpacing:1, fontWeight:600, borderBottom:"1px solid #e8e8e4" }}>METHOD</th>
                    <th style={{ padding:"7px 12px", textAlign:"left", fontFamily:"monospace", fontSize:10, color:"#888", letterSpacing:1, fontWeight:600, borderBottom:"1px solid #e8e8e4" }}>ANALYTE</th>
                    <th style={{ padding:"7px 12px", textAlign:"left", fontFamily:"monospace", fontSize:10, color:"#888", letterSpacing:1, fontWeight:600, borderBottom:"1px solid #e8e8e4" }}>SPECIFICATION</th>
                    <th style={{ padding:"7px 18px", textAlign:"right", fontFamily:"monospace", fontSize:10, color:"#888", letterSpacing:1, fontWeight:600, borderBottom:"1px solid #e8e8e4" }}>RESULT</th>
                  </tr>
                </thead>
                <tbody>
                  {pool.tests.map((t, i) => (
                    <tr key={i} style={{ borderBottom:"1px solid #f0f0ec" }}>
                      <td style={{ padding:"8px 18px", fontFamily:"monospace", fontSize:11, color:"#666" }}>{t.method}</td>
                      <td style={{ padding:"8px 12px", fontWeight:500, fontSize:11 }}>{t.analyte}</td>
                      <td style={{ padding:"8px 12px", fontFamily:"monospace", fontSize:11, color:"#555" }}>{t.spec}</td>
                      <td style={{ padding:"8px 18px", textAlign:"right", fontFamily:"monospace", fontSize:12, fontWeight:600 }}>
                        {t.result
                          ? <span style={{ color: "#1a6e1a" }}>{t.result}</span>
                          : <span style={{ color:"#ccc", letterSpacing:2 }}>— — —</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {hasResults && (
                <div style={{ padding:"10px 18px", background:"#f0f7f0", borderTop:"1px solid #c8e0c8", display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontFamily:"monospace", fontSize:10, color:"#1a6e1a", letterSpacing:1 }}>✓ RESULTS VERIFIED · Published {new Date().toLocaleDateString("en-GB")}</span>
                  <a href="#" style={{ marginLeft:"auto", fontFamily:"monospace", fontSize:11, color:"#1a6e1a", textDecoration:"underline" }}>Download COA →</a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
