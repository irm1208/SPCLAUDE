const POOLS = [
  { id:"1", compound:"Tirzepatide", manufacturer:"Uther", batch:"ZE60-0322", status:"open", raised:0, goal:480, contributors:0, hasResults:false },
  { id:"2", compound:"Retatrutide", manufacturer:"Uther", batch:"RE40-0228", status:"open", raised:40, goal:480, contributors:1, hasResults:false },
  { id:"3", compound:"BPC-157", manufacturer:"SciPep", batch:"BPC-A220", status:"funded", raised:480, goal:480, contributors:12, hasResults:false },
  { id:"4", compound:"Semaglutide", manufacturer:"AusLabs", batch:"SEM-0930", status:"at_lab", raised:720, goal:720, contributors:18, hasResults:false },
  { id:"5", compound:"TB-500", manufacturer:"PrimePep", batch:"TB7-1122", status:"results", raised:360, goal:360, contributors:9, hasResults:true },
  { id:"6", compound:"GHK-Cu", manufacturer:"Uther", batch:"GHK-0034", status:"results", raised:240, goal:240, contributors:6, hasResults:true },
];

const STAGES = [
  { key:"open",    label:"Collecting",   icon:"🪙", desc:"Funding in progress",     color:"#8b5cf6", bg:"#f5f3ff", headerBg:"#ede9fe", border:"#c4b5fd" },
  { key:"funded",  label:"Funded",       icon:"✅", desc:"Ready for dispatch",       color:"#059669", bg:"#f0fdf4", headerBg:"#dcfce7", border:"#86efac" },
  { key:"at_lab",  label:"At Lab",       icon:"🔬", desc:"Testing underway",         color:"#2563eb", bg:"#eff6ff", headerBg:"#dbeafe", border:"#93c5fd" },
  { key:"results", label:"Results",      icon:"📋", desc:"Results published",        color:"#b45309", bg:"#fffbeb", headerBg:"#fef3c7", border:"#fcd34d" },
];

export function PipelineBoard() {
  return (
    <div className="min-h-screen bg-gray-100 font-sans flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Community Testing Pools</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track every pool through the testing pipeline — from fundraising to published results</p>
        <div className="flex gap-4 mt-3 text-xs text-gray-400">
          {STAGES.map((stage, i) => (
            <span key={stage.key} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-gray-300">→</span>}
              <span>{stage.icon}</span>
              <span className="font-medium" style={{ color: stage.color }}>{stage.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 flex gap-4 p-5 overflow-x-auto">
        {STAGES.map(stage => {
          const pools = POOLS.filter(p => p.status === stage.key);
          return (
            <div key={stage.key} className="flex-1 min-w-[220px] flex flex-col rounded-xl overflow-hidden border" style={{ borderColor: stage.border }}>
              {/* Column header */}
              <div className="px-4 py-3 flex items-center justify-between" style={{ background: stage.headerBg }}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{stage.icon}</span>
                  <div>
                    <div className="font-bold text-sm" style={{ color: stage.color }}>{stage.label}</div>
                    <div className="text-xs text-gray-400">{stage.desc}</div>
                  </div>
                </div>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: stage.color }}>
                  {pools.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 p-3 space-y-2.5" style={{ background: stage.bg }}>
                {pools.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs">No pools at this stage</div>
                ) : pools.map(pool => {
                  const pct = pool.goal > 0 ? Math.round((pool.raised / pool.goal) * 100) : 0;
                  return (
                    <div key={pool.id} className="bg-white rounded-lg p-3 shadow-sm border border-white hover:shadow-md transition-shadow cursor-pointer">
                      <div className="text-xs text-gray-400 font-mono mb-1">{pool.batch}</div>
                      <div className="font-semibold text-gray-900 text-sm leading-tight">{pool.compound}</div>
                      <div className="text-xs text-gray-500 mb-2">{pool.manufacturer}</div>

                      <div className="h-1 bg-gray-100 rounded-full mb-1.5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: stage.color }} />
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>${pool.raised} / ${pool.goal}</span>
                        <span>{pool.contributors} member{pool.contributors !== 1 ? "s" : ""}</span>
                      </div>

                      <button className="w-full mt-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                        style={{ borderColor: stage.border, color: stage.color, background: stage.headerBg }}>
                        {pool.hasResults ? "View Results" : "Open Pool"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
