import { useState } from "react";

const POOLS = [
  { id:"1", title:"T60 - ZE60-0322 - Uther", compound:"Tirzepatide", manufacturer:"Uther", batch:"ZE60-0322", status:"open", raised:0, goal:480, contributors:0, hasResults:false },
  { id:"2", title:"RE40-0228 - Uther", compound:"Retatrutide", manufacturer:"Uther", batch:"RE40-0228", status:"open", raised:40, goal:480, contributors:1, hasResults:false },
  { id:"3", title:"BPC-157 Batch A - SciPep", compound:"BPC-157", manufacturer:"SciPep", batch:"BPC-A220", status:"funded", raised:480, goal:480, contributors:12, hasResults:false },
  { id:"4", title:"Semaglutide 2mg - AusLabs", compound:"Semaglutide", manufacturer:"AusLabs", batch:"SEM-0930", status:"at_lab", raised:720, goal:720, contributors:18, hasResults:false },
  { id:"5", title:"TB-500 Batch 7 - PrimePep", compound:"TB-500", manufacturer:"PrimePep", batch:"TB7-1122", status:"results", raised:360, goal:360, contributors:9, hasResults:true },
  { id:"6", title:"GHK-Cu Lot 3 - Uther", compound:"GHK-Cu", manufacturer:"Uther", batch:"GHK-0034", status:"results", raised:240, goal:240, contributors:6, hasResults:true },
];

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  open:    { label:"Collecting", color:"#059669", bg:"#d1fae5" },
  funded:  { label:"Funded",     color:"#7c3aed", bg:"#ede9fe" },
  at_lab:  { label:"At Lab",     color:"#2563eb", bg:"#dbeafe" },
  results: { label:"Results",    color:"#b45309", bg:"#fef3c7" },
};

type SortKey = "compound" | "manufacturer" | "raised" | "pct" | "contributors";

export function TableView() {
  const [sort, setSort] = useState<SortKey>("compound");
  const [dir, setDir] = useState<1 | -1>(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const toggle = (k: SortKey) => { if (sort === k) setDir(d => (d === 1 ? -1 : 1)); else { setSort(k); setDir(1); } };

  const filtered = POOLS
    .filter(p => statusFilter === "all" || p.status === statusFilter)
    .filter(p => !search || p.compound.toLowerCase().includes(search.toLowerCase()) || p.manufacturer.toLowerCase().includes(search.toLowerCase()) || p.batch.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let av: string | number = "", bv: string | number = "";
      if (sort === "compound") { av = a.compound; bv = b.compound; }
      if (sort === "manufacturer") { av = a.manufacturer; bv = b.manufacturer; }
      if (sort === "raised") { av = a.raised; bv = b.raised; }
      if (sort === "pct") { av = a.goal ? a.raised / a.goal : 0; bv = b.goal ? b.raised / b.goal : 0; }
      if (sort === "contributors") { av = a.contributors; bv = b.contributors; }
      return typeof av === "string" ? av.localeCompare(bv as string) * dir : (av - (bv as number)) * dir;
    });

  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <th onClick={() => toggle(k)} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-800 whitespace-nowrap">
      <span className="inline-flex items-center gap-1">
        {label}
        <span className="text-gray-300">{sort === k ? (dir === 1 ? "↑" : "↓") : "⇅"}</span>
      </span>
    </th>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Community Testing Pools</h1>
            <p className="text-sm text-gray-500 mt-0.5">Independent lab testing funded by the community</p>
          </div>
          <span className="text-sm text-gray-400">{filtered.length} pool{filtered.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex gap-3 items-center">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search compound, vendor, batch…"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
          <div className="flex gap-1">
            {["all","open","funded","at_lab","results"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {s === "all" ? "All" : STATUS[s]?.label ?? s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="px-6 py-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <Th k="compound" label="Compound" />
                <Th k="manufacturer" label="Vendor" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Batch</th>
                <Th k="raised" label="Raised" />
                <Th k="pct" label="Funded %" />
                <Th k="contributors" label="Members" />
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(pool => {
                const s = STATUS[pool.status];
                const pct = pool.goal > 0 ? Math.round((pool.raised / pool.goal) * 100) : 0;
                return (
                  <tr key={pool.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{pool.compound}</td>
                    <td className="px-4 py-3 text-gray-600">{pool.manufacturer}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{pool.batch}</td>
                    <td className="px-4 py-3">
                      <span className="text-gray-900 font-medium">${pool.raised}</span>
                      <span className="text-gray-400 text-xs"> / ${pool.goal}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? "#7c3aed" : "#8b5cf6" }} />
                        </div>
                        <span className="text-xs text-gray-500">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{pool.contributors}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition-colors">
                        {pool.hasResults ? "View Results" : "View Pool →"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">Click column headers to sort</p>
      </div>
    </div>
  );
}
