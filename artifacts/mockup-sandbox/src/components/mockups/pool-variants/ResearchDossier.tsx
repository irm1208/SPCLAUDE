import { useState } from "react";

const POOLS = [
  {
    id:"1",
    compound:"Tirzepatide",
    iupac:"(2S)-2-[[(2S)-2-[[(2S)-2-[[(2S)-2-amino-3-(4-hydroxyphenyl)propanoyl]amino]-4-methylsulfanylbutanoyl]amino]-3-phenylpropanoyl]amino]…",
    compoundClass:"GLP-1/GIP Dual Agonist Peptide",
    mechanism:"Activates GLP-1R and GIPR receptors simultaneously, modulating insulin secretion and appetite signalling",
    researchUse:"Metabolic dysfunction research; GLP-1/GIP pathway studies",
    manufacturer:"Uther", batch:"ZE60-0322", status:"open",
    raised:0, goal:480, contributors:0, hasResults:false,
    methodology:[
      { test:"RP-HPLC Purity Analysis", purpose:"Quantify main peptide peak, detect impurities and degradation products", duration:"2–3 days", status:"pending" },
      { test:"LC-MS/MS Identity Confirmation", purpose:"Verify molecular weight matches theoretical (4813.5 Da) to ±0.5 Da", duration:"1–2 days", status:"pending" },
      { test:"Peptide Content (UV-Vis)", purpose:"Confirm mg/vial vs. labelled value within ±10%", duration:"1 day", status:"pending" },
      { test:"Physical Inspection", purpose:"Appearance, reconstitution behaviour, colour and clarity", duration:"Same day", status:"pending" },
    ],
    expectedTimeline:"6–8 weeks from funding",
    lab:"Independent analytical chemistry facility (disclosed on dispatch)",
  },
  {
    id:"2",
    compound:"Retatrutide",
    iupac:"Triple agonist synthetic peptide; CAS 2381090-08-8",
    compoundClass:"GLP-1/GIP/Glucagon Triple Receptor Agonist",
    mechanism:"Simultaneous activation of three incretin/metabolic receptors; broader metabolic modulation than dual agonists",
    researchUse:"Obesity and metabolic syndrome research; novel receptor pathway investigation",
    manufacturer:"Uther", batch:"RE40-0228", status:"open",
    raised:40, goal:480, contributors:1, hasResults:false,
    methodology:[
      { test:"RP-HPLC Purity Analysis", purpose:"Quantify purity, identify related impurities", duration:"2–3 days", status:"pending" },
      { test:"LC-MS/MS Identity Confirmation", purpose:"Verify MW = 4723.4 Da ±0.5 Da", duration:"1–2 days", status:"pending" },
      { test:"Peptide Content (UV-Vis)", purpose:"Confirm labelled dose", duration:"1 day", status:"pending" },
    ],
    expectedTimeline:"6–8 weeks from funding",
    lab:"Independent analytical chemistry facility",
  },
  {
    id:"3",
    compound:"TB-500 (Thymosin β4 Fragment)",
    iupac:"Ac-LKKTETQ — 43-amino acid synthetic peptide",
    compoundClass:"Actin-Sequestering Pentadecapeptide",
    mechanism:"Sequesters G-actin monomers; involved in cell migration, angiogenesis and wound-healing signalling",
    researchUse:"Tissue repair and regeneration research; cellular motility studies",
    manufacturer:"PrimePep", batch:"TB7-1122", status:"results",
    raised:360, goal:360, contributors:9, hasResults:true,
    methodology:[
      { test:"RP-HPLC Purity Analysis", purpose:"Quantify main peptide peak", duration:"2–3 days", status:"complete", result:"99.1% — PASS" },
      { test:"LC-MS/MS Identity Confirmation", purpose:"Verify MW = 4963.5 Da", duration:"1–2 days", status:"complete", result:"4963.4 Da — PASS" },
      { test:"Peptide Content (UV-Vis)", purpose:"Confirm mg/vial vs. labelled", duration:"1 day", status:"complete", result:"4.87mg/vial (label: 5.0mg) — PASS" },
      { test:"Physical Inspection", purpose:"Appearance and reconstitution", duration:"Same day", status:"complete", result:"White lyophilised powder — PASS" },
    ],
    expectedTimeline:"Completed",
    lab:"ALS Global, Sheffield, UK",
  },
];

const step = (status:string) => ({ open:0, funded:1, sent_to_lab:2, results:3 }[status] ?? 0);

export function ResearchDossier() {
  const [open, setOpen] = useState<Set<string>>(new Set(["1","3"]));
  const tog = (id:string) => setOpen(p => { const s=new Set(p); s.has(id)?s.delete(id):s.add(id); return s; });

  return (
    <div className="min-h-screen" style={{ background:"#faf8f2", fontFamily:"'Georgia', serif", color:"#1a1a1a" }}>
      {/* Masthead */}
      <div style={{ background:"#1a1a1a", color:"#f5f2e8", padding:"16px 28px", display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
        <div>
          <div style={{ fontFamily:"monospace", fontSize:9, letterSpacing:3, color:"#888", marginBottom:4 }}>PEPS ANONYMOUS · COMMUNITY VERIFICATION PROGRAMME</div>
          <h1 style={{ margin:0, fontSize:20, fontWeight:700, fontFamily:"'Georgia',serif", letterSpacing:-0.3 }}>Active Testing Dossiers</h1>
        </div>
        <div style={{ fontFamily:"monospace", fontSize:10, color:"#666", textAlign:"right" }}>
          Vol. 2026·04<br/>Public Edition
        </div>
      </div>

      <div style={{ padding:"20px 28px", display:"flex", flexDirection:"column", gap:20 }}>
        {POOLS.map(pool => {
          const isOpen = open.has(pool.id);
          const pct = pool.goal > 0 ? Math.round((pool.raised/pool.goal)*100) : 0;
          const curStep = step(pool.status);

          return (
            <div key={pool.id} style={{ border:"1px solid #d4ceb8", background:"#fff", borderRadius:2, overflow:"hidden" }}>
              {/* Dossier header */}
              <button onClick={() => tog(pool.id)} style={{ width:"100%", border:"none", cursor:"pointer", padding:0, textAlign:"left", background:"none" }}>
                <div style={{ padding:"14px 20px", background: pool.hasResults ? "#f5faf5" : "#fff", borderBottom:"1px solid #e8e2cc", display:"flex", gap:20, alignItems:"flex-start" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:"monospace", fontSize:9, color:"#999", letterSpacing:2, marginBottom:4 }}>
                      {pool.hasResults ? "DOSSIER CLOSED · RESULTS PUBLISHED" : `DOSSIER OPEN · ${pct}% FUNDED`}
                    </div>
                    <h2 style={{ margin:0, fontSize:18, fontWeight:700, fontFamily:"'Georgia',serif", letterSpacing:-0.3 }}>{pool.compound}</h2>
                    <div style={{ fontSize:11, color:"#888", marginTop:3, fontFamily:"sans-serif" }}>{pool.compoundClass} · {pool.batch} · {pool.manufacturer}</div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontFamily:"monospace", fontSize:12, fontWeight:700 }}>${pool.raised} / ${pool.goal}</div>
                    <div style={{ fontFamily:"monospace", fontSize:10, color:"#888" }}>{pool.contributors} contributor{pool.contributors!==1?"s":""}</div>
                  </div>
                  <span style={{ fontFamily:"monospace", fontSize:14, color:"#aaa" }}>{isOpen?"▾":"▸"}</span>
                </div>
              </button>

              {isOpen && (
                <div style={{ padding:"16px 20px 20px" }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:18 }}>
                    {/* Compound fact box */}
                    <div style={{ border:"1px solid #e0dac8", padding:"12px 14px", background:"#faf8f0" }}>
                      <div style={{ fontFamily:"monospace", fontSize:9, letterSpacing:2, color:"#999", marginBottom:8 }}>COMPOUND PROFILE</div>
                      <div style={{ fontSize:11, lineHeight:1.7, fontFamily:"sans-serif" }}>
                        <div><span style={{ color:"#888" }}>Class: </span>{pool.compoundClass}</div>
                        <div style={{ marginTop:4 }}><span style={{ color:"#888" }}>Mechanism: </span>{pool.mechanism}</div>
                        <div style={{ marginTop:4 }}><span style={{ color:"#888" }}>Research use: </span>{pool.researchUse}</div>
                      </div>
                    </div>

                    {/* Pool status box */}
                    <div style={{ border:"1px solid #e0dac8", padding:"12px 14px", background:"#faf8f0" }}>
                      <div style={{ fontFamily:"monospace", fontSize:9, letterSpacing:2, color:"#999", marginBottom:8 }}>POOL STATUS</div>
                      <div style={{ fontFamily:"sans-serif", fontSize:11, lineHeight:1.7 }}>
                        <div><span style={{ color:"#888" }}>Funding: </span>${pool.raised} of ${pool.goal} ({pct}%)</div>
                        <div><span style={{ color:"#888" }}>Timeline: </span>{pool.expectedTimeline}</div>
                        <div><span style={{ color:"#888" }}>Lab: </span>{pool.lab}</div>
                        <div style={{ marginTop:8 }}>
                          <div style={{ height:2, background:"#e8e2cc" }}>
                            <div style={{ height:"100%", width:`${pct}%`, background:"#1a1a1a" }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Test methodology */}
                  <div style={{ fontFamily:"monospace", fontSize:9, letterSpacing:2, color:"#999", marginBottom:8 }}>TEST METHODOLOGY</div>
                  <div style={{ border:"1px solid #e0dac8", overflow:"hidden" }}>
                    {pool.methodology.map((m, i) => (
                      <div key={i} style={{ borderBottom: i < pool.methodology.length-1 ? "1px solid #eee8d8" : "none", padding:"10px 14px", display:"flex", gap:14, alignItems:"flex-start", fontFamily:"sans-serif" }}>
                        <div style={{ flexShrink:0, marginTop:2 }}>
                          {m.status === "complete"
                            ? <span style={{ fontFamily:"monospace", fontSize:11, color:"#2a7a2a" }}>✓</span>
                            : <span style={{ fontFamily:"monospace", fontSize:11, color:"#ccc" }}>○</span>
                          }
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, fontSize:12, marginBottom:2 }}>{m.test}</div>
                          <div style={{ fontSize:11, color:"#666", lineHeight:1.5 }}>{m.purpose}</div>
                          {m.status === "complete" && "result" in m && (
                            <div style={{ marginTop:4, fontFamily:"monospace", fontSize:11, color:"#2a7a2a", background:"#f0f8f0", border:"1px solid #c0dcc0", padding:"3px 8px", display:"inline-block" }}>
                              {m.result}
                            </div>
                          )}
                        </div>
                        <div style={{ flexShrink:0, fontFamily:"monospace", fontSize:10, color:"#aaa", whiteSpace:"nowrap" }}>{m.duration}</div>
                      </div>
                    ))}
                  </div>

                  {/* Footer CTA */}
                  <div style={{ marginTop:14, display:"flex", gap:10, alignItems:"center" }}>
                    {!pool.hasResults && (
                      <button style={{ fontFamily:"sans-serif", fontSize:12, padding:"8px 18px", background:"#1a1a1a", color:"#fff", border:"none", cursor:"pointer", borderRadius:2 }}>
                        Contribute to this pool
                      </button>
                    )}
                    {pool.hasResults && (
                      <button style={{ fontFamily:"sans-serif", fontSize:12, padding:"8px 18px", background:"#2a7a2a", color:"#fff", border:"none", cursor:"pointer", borderRadius:2 }}>
                        Download Certificate of Analysis
                      </button>
                    )}
                    <a href="#" style={{ fontSize:12, color:"#666", fontFamily:"sans-serif" }}>Share this dossier →</a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
