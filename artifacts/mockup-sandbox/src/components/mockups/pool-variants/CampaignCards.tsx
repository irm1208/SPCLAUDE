import { useState } from "react";

const POOLS = [
  { id:"1", compound:"Tirzepatide", manufacturer:"Uther", batch:"ZE60-0322", status:"open", raised:0, goal:480, contributors:0, hasResults:false,
    tagline:"GLP-1/GIP dual agonist — independent purity & concentration verification", gradient:"from-violet-500 to-purple-600" },
  { id:"2", compound:"Retatrutide", manufacturer:"Uther", batch:"RE40-0228", status:"open", raised:40, goal:480, contributors:1, hasResults:false,
    tagline:"Triple receptor agonist — community verification for emerging peptide", gradient:"from-pink-500 to-rose-600" },
  { id:"3", compound:"BPC-157", manufacturer:"SciPep", batch:"BPC-A220", status:"funded", raised:480, goal:480, contributors:12, hasResults:false,
    tagline:"Healing peptide — full funding achieved, awaiting lab dispatch", gradient:"from-emerald-500 to-teal-600" },
  { id:"4", compound:"Semaglutide", manufacturer:"AusLabs", batch:"SEM-0930", status:"at_lab", raised:720, goal:720, contributors:18, hasResults:false,
    tagline:"GLP-1 analogue — sample currently at independent testing facility", gradient:"from-blue-500 to-indigo-600" },
];

const STATUS_CFG: Record<string, { label: string; icon: string }> = {
  open:    { label:"Collecting Funds", icon:"🪙" },
  funded:  { label:"Fully Funded",     icon:"✅" },
  at_lab:  { label:"At the Lab",       icon:"🔬" },
  results: { label:"Results Ready",    icon:"📋" },
};

export function CampaignCards() {
  const [filter, setFilter] = useState("all");

  const visible = POOLS.filter(p => filter === "all" || p.status === filter);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans" style={{ background: '#020617' }}>
      {/* Hero header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 px-8 pt-10 pb-8 border-b border-white/10">
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-violet-500/20 border border-violet-500/30 rounded-full px-3 py-1 text-xs text-violet-300 font-medium mb-3">
            <span>🧬</span> Community-Verified Testing
          </div>
          <h1 className="text-3xl font-bold text-white">Community Testing Pools</h1>
          <p className="text-slate-400 mt-1 text-sm max-w-lg">Pool your funding with other members to send peptides to independent labs. Every result is published openly.</p>
          <div className="flex gap-6 mt-4 text-sm">
            <div><span className="text-2xl font-bold text-white">4</span><span className="text-slate-400 ml-1">active pools</span></div>
            <div><span className="text-2xl font-bold text-white">41</span><span className="text-slate-400 ml-1">members contributing</span></div>
          </div>
        </div>
      </div>

      {/* Filter pills */}
      <div className="px-8 py-4 flex gap-2 border-b border-white/10 bg-slate-900/50">
        {["all","open","funded","at_lab","results"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${filter === f ? "bg-violet-600 text-white" : "bg-white/10 text-slate-400 hover:bg-white/20"}`}>
            {f === "all" ? "All Pools" : STATUS_CFG[f]?.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="px-8 py-6 space-y-5">
        {visible.map(pool => {
          const s = STATUS_CFG[pool.status];
          const pct = pool.goal > 0 ? Math.min(100, (pool.raised / pool.goal) * 100) : 0;
          const remaining = pool.goal - pool.raised;

          return (
            <div key={pool.id} className="bg-slate-800/60 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all">
              {/* Colored top band */}
              <div className={`bg-gradient-to-r ${pool.gradient} p-5`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-white/80 text-xs font-mono mb-1">{pool.batch} · {pool.manufacturer}</div>
                    <h2 className="text-xl font-bold text-white">{pool.compound}</h2>
                    <p className="text-white/70 text-sm mt-1">{pool.tagline}</p>
                  </div>
                  <span className="bg-black/30 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1 text-xs font-medium text-white">
                    {s.icon} {s.label}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="px-5 pt-4 pb-5">
                {/* Progress */}
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <span className="text-2xl font-bold text-white">${pool.raised}</span>
                    <span className="text-slate-400 text-sm ml-1">raised of ${pool.goal}</span>
                  </div>
                  <span className="text-xl font-bold text-white">{Math.round(pct)}%</span>
                </div>
                <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden mb-3">
                  <div className={`h-full rounded-full bg-gradient-to-r ${pool.gradient} transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between text-sm text-slate-400 mb-4">
                  <span>{pool.contributors} member{pool.contributors !== 1 ? "s" : ""} contributing</span>
                  {remaining > 0 ? <span className="text-amber-400 font-medium">${remaining} to go</span> : <span className="text-emerald-400 font-medium">Fully funded!</span>}
                </div>

                {/* CTA */}
                <div className="flex gap-3">
                  {pool.status === "open" && (
                    <button className={`flex-1 py-2.5 bg-gradient-to-r ${pool.gradient} text-white font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity`}>
                      Back This Pool →
                    </button>
                  )}
                  <button className={`${pool.status === "open" ? "px-4" : "flex-1"} py-2.5 bg-white/10 border border-white/20 text-white font-medium rounded-xl text-sm hover:bg-white/20 transition-colors`}>
                    {pool.hasResults ? "View Results" : "See Details"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
