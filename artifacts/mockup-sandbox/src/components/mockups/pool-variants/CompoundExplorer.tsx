import { useState } from "react";

const POOLS = [
  { id:"1", compound:"Tirzepatide", manufacturer:"Uther", batch:"ZE60-0322", status:"open", raised:0, goal:480, contributors:0, hasResults:false },
  { id:"2", compound:"Retatrutide", manufacturer:"Uther", batch:"RE40-0228", status:"open", raised:40, goal:480, contributors:1, hasResults:false },
  { id:"3", compound:"BPC-157", manufacturer:"SciPep", batch:"BPC-A220", status:"funded", raised:480, goal:480, contributors:12, hasResults:false },
  { id:"4", compound:"BPC-157", manufacturer:"PrimePep", batch:"BPC-B110", status:"results", raised:360, goal:360, contributors:9, hasResults:true },
  { id:"5", compound:"Semaglutide", manufacturer:"AusLabs", batch:"SEM-0930", status:"at_lab", raised:720, goal:720, contributors:18, hasResults:false },
  { id:"6", compound:"TB-500", manufacturer:"PrimePep", batch:"TB7-1122", status:"results", raised:360, goal:360, contributors:9, hasResults:true },
  { id:"7", compound:"GHK-Cu", manufacturer:"Uther", batch:"GHK-0034", status:"results", raised:240, goal:240, contributors:6, hasResults:true },
];

const COMPOUND_INFO: Record<string, { class: string; about: string; icon: string }> = {
  "Tirzepatide":  { class:"GLP-1/GIP Dual Agonist", about:"Dual receptor agonist used in metabolic research", icon:"💉" },
  "Retatrutide":  { class:"GLP-1/GIP/Glucagon Triple Agonist", about:"Triple receptor agonist, emerging compound", icon:"🧬" },
  "BPC-157":      { class:"Pentadecapeptide", about:"Synthetic peptide, tissue repair & healing research", icon:"🩹" },
  "Semaglutide":  { class:"GLP-1 Receptor Agonist", about:"Long-acting GLP-1 analogue, metabolic research", icon:"⚗️" },
  "TB-500":       { class:"Thymosin Beta-4 Fragment", about:"Actin-sequestering peptide, regenerative research", icon:"🔬" },
  "GHK-Cu":       { class:"Copper Peptide", about:"Naturally occurring peptide, skin & wound research", icon:"🧪" },
};

const STATUS_COLOR: Record<string, { color: string; label: string }> = {
  open:    { color:"#8b5cf6", label:"Collecting" },
  funded:  { color:"#059669", label:"Funded" },
  at_lab:  { color:"#2563eb", label:"At Lab" },
  results: { color:"#b45309", label:"Results" },
};

const COMPOUND_COLORS = ["#8b5cf6","#ec4899","#059669","#2563eb","#f59e0b","#6366f1"];

export function CompoundExplorer() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["Tirzepatide","Retatrutide"]));
  const [search, setSearch] = useState("");

  const toggle = (c: string) => setExpanded(prev => { const s = new Set(prev); s.has(c) ? s.delete(c) : s.add(c); return s; });

  const compounds = Array.from(new Set(POOLS.map(p => p.compound)));
  const filtered = compounds.filter(c => !search || c.toLowerCase().includes(search.toLowerCase()) || POOLS.some(p => p.compound === c && p.manufacturer.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Community Testing Pools</h1>
        <p className="text-sm text-gray-500 mt-0.5">Browse by compound — find and compare all tested batches for any peptide</p>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by compound or vendor…"
          className="mt-3 border border-gray-200 rounded-lg px-3 py-2 text-sm w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>

      {/* Compound sections */}
      <div className="px-6 py-5 space-y-4">
        {filtered.map((compound, ci) => {
          const pools = POOLS.filter(p => p.compound === compound);
          const info = COMPOUND_INFO[compound] ?? { class: "Peptide", about: "", icon: "🧪" };
          const totalRaised = pools.reduce((s, p) => s + p.raised, 0);
          const totalGoal = pools.reduce((s, p) => s + p.goal, 0);
          const totalContributors = pools.reduce((s, p) => s + p.contributors, 0);
          const hasResults = pools.some(p => p.hasResults);
          const accentColor = COMPOUND_COLORS[ci % COMPOUND_COLORS.length];
          const isOpen = expanded.has(compound);

          return (
            <div key={compound} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Compound header — clickable */}
              <button onClick={() => toggle(compound)} className="w-full text-left">
                <div className="px-5 py-4 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 border-2"
                    style={{ background: `${accentColor}15`, borderColor: `${accentColor}40` }}>
                    {info.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold text-gray-900 text-base">{compound}</h2>
                      {hasResults && <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">Has Results</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{info.class}</div>
                  </div>
                  <div className="flex items-center gap-6 flex-shrink-0 text-right">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{pools.length} pool{pools.length !== 1 ? "s" : ""}</div>
                      <div className="text-xs text-gray-400">{totalContributors} members</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">${totalRaised}</div>
                      <div className="text-xs text-gray-400">of ${totalGoal}</div>
                    </div>
                    <span className="text-gray-400 text-lg">{isOpen ? "▾" : "▸"}</span>
                  </div>
                </div>
              </button>

              {/* Expanded: pool list */}
              {isOpen && (
                <div className="border-t border-gray-100 px-5 pb-4 pt-3 space-y-2">
                  <p className="text-xs text-gray-400 mb-3">{info.about}</p>
                  {pools.map(pool => {
                    const s = STATUS_COLOR[pool.status];
                    const pct = pool.goal > 0 ? Math.round((pool.raised / pool.goal) * 100) : 0;
                    return (
                      <div key={pool.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-100 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-gray-500">{pool.batch}</span>
                            <span className="text-xs font-medium" style={{ color: s.color }}>· {s.label}</span>
                          </div>
                          <div className="text-xs text-gray-500">{pool.manufacturer} · {pool.contributors} member{pool.contributors !== 1 ? "s" : ""}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-semibold text-gray-800">${pool.raised} <span className="text-xs text-gray-400 font-normal">/ ${pool.goal}</span></div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: accentColor }} />
                            </div>
                            <span className="text-xs text-gray-400">{pct}%</span>
                          </div>
                        </div>
                        <button className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                          style={{ borderColor: `${accentColor}50`, color: accentColor, background: `${accentColor}10` }}>
                          {pool.hasResults ? "Results →" : "View →"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
