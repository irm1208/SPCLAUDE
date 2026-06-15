import { useState } from "react";
import { Search, FlaskConical, ArrowRight, ChevronRight } from "lucide-react";

const PEPTIDES = [
  {
    abbrev: "RETA",
    name: "Retatrutide",
    tagline: "Triple agonist for maximum weight loss",
    category: "GLP-1",
    researchLevel: "Well Researched",
    color: "#8B5CF6",
    startDose: "0.5 mg",
    frequency: "Weekly",
    route: "Subcut.",
    storage: "Refrigerated",
    tags: ["Weight Loss", "Triple Agonist"],
  },
  {
    abbrev: "SEM",
    name: "Semaglutide",
    tagline: "Leading GLP-1 for sustained weight loss",
    category: "GLP-1",
    researchLevel: "Extensively Studied",
    color: "#10B981",
    startDose: "0.25 mg",
    frequency: "Weekly",
    route: "Subcut.",
    storage: "Refrigerated",
    tags: ["Weight Loss", "Diabetes"],
  },
  {
    abbrev: "BPC",
    name: "BPC-157",
    tagline: "Body protection compound — healing & recovery",
    category: "Healing",
    researchLevel: "Well Researched",
    color: "#059669",
    startDose: "250 mcg",
    frequency: "2× Daily",
    route: "Subcut.",
    storage: "Refrigerated",
    tags: ["Healing", "Gut Health"],
  },
  {
    abbrev: "TIRZ",
    name: "Tirzepatide",
    tagline: "Dual GIP/GLP-1 agonist — superior outcomes",
    category: "GLP-1",
    researchLevel: "Extensively Studied",
    color: "#6366F1",
    startDose: "2.5 mg",
    frequency: "Weekly",
    route: "Subcut.",
    storage: "Refrigerated",
    tags: ["Weight Loss", "Dual Agonist"],
  },
  {
    abbrev: "IPA",
    name: "Ipamorelin",
    tagline: "Selective GH secretagogue, minimal side effects",
    category: "GH Peptides",
    researchLevel: "Well Researched",
    color: "#7C3AED",
    startDose: "200 mcg",
    frequency: "Daily",
    route: "Subcut.",
    storage: "Refrigerated",
    tags: ["GH Release", "Sleep"],
  },
  {
    abbrev: "SEMAX",
    name: "Semax",
    tagline: "Nootropic — cognitive enhancement & neuroprotection",
    category: "Cognitive",
    researchLevel: "Limited Research",
    color: "#2563EB",
    startDose: "0.1 mg",
    frequency: "Daily",
    route: "Intranasal",
    storage: "Refrigerated",
    tags: ["Cognitive", "Focus"],
  },
  {
    abbrev: "TB4",
    name: "TB-500",
    tagline: "Thymosin Beta-4 — tissue repair and flexibility",
    category: "Healing",
    researchLevel: "Well Researched",
    color: "#0891B2",
    startDose: "2 mg",
    frequency: "2× Weekly",
    route: "Subcut.",
    storage: "Refrigerated",
    tags: ["Recovery", "Inflammation"],
  },
  {
    abbrev: "CJC",
    name: "CJC-1295",
    tagline: "GHRH analogue for sustained GH elevation",
    category: "GH Peptides",
    researchLevel: "Well Researched",
    color: "#9333EA",
    startDose: "1 mg",
    frequency: "Weekly",
    route: "Subcut.",
    storage: "Refrigerated",
    tags: ["GH Release", "Anti-Aging"],
  },
];

const CATEGORIES = ["All", "GLP-1", "Healing", "GH Peptides", "Cognitive", "Other"];

const LEVEL_CFG: Record<string, { color: string; label: string }> = {
  "Extensively Studied": { color: "#34D399", label: "Ext. Studied" },
  "Well Researched":     { color: "#60A5FA", label: "Well Research." },
  "Limited Research":    { color: "#F59E0B", label: "Limited Res." },
  "Early Research":      { color: "#A78BFA", label: "Early Res." },
};

function PeptideRow({ p, isLast }: { p: typeof PEPTIDES[number]; isLast: boolean }) {
  const level = LEVEL_CFG[p.researchLevel];

  return (
    <button
      className="w-full text-left flex items-stretch transition-all active:opacity-80"
      style={{
        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)",
        paddingTop: "14px",
        paddingBottom: "14px",
      }}
    >
      {/* Left accent bar + abbrev circle */}
      <div className="flex items-center gap-3 pl-4 pr-2 shrink-0">
        {/* Thin colored left bar */}
        <div className="w-0.5 self-stretch rounded-full" style={{ background: p.color, minHeight: "44px" }} />
        {/* Abbrev badge */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black tracking-wider shrink-0"
          style={{ background: `${p.color}18`, color: p.color, border: `1.5px solid ${p.color}30` }}
        >
          {p.abbrev}
        </div>
      </div>

      {/* Middle: name, tagline, tags */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[14px] font-bold text-white leading-tight">{p.name}</span>
          {/* Research level dot + label */}
          <span className="flex items-center gap-1 text-[9px] font-semibold leading-tight" style={{ color: level.color }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: level.color }} />
            {level.label}
          </span>
        </div>
        <p className="text-[11px] leading-snug mb-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>{p.tagline}</p>
        {/* Tags inline */}
        <div className="flex flex-wrap gap-1">
          {p.tags.map(tag => (
            <span
              key={tag}
              className="text-[9px] px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Right: 2 key stats + arrow */}
      <div className="flex items-center gap-3 pr-4 shrink-0">
        {/* Key stats */}
        <div className="text-right space-y-1">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider leading-none" style={{ color: "rgba(255,255,255,0.38)" }}>Dose</p>
            <p className="text-[12px] font-bold text-white leading-tight">{p.startDose}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider leading-none" style={{ color: "rgba(255,255,255,0.38)" }}>Freq</p>
            <p className="text-[11px] font-semibold leading-tight" style={{ color: "rgba(255,255,255,0.75)" }}>{p.frequency}</p>
          </div>
        </div>
        {/* Chevron */}
        <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} />
      </div>
    </button>
  );
}

export function RowCatalog() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = PEPTIDES.filter(p => {
    const matchCat = activeCategory === "All" || p.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#080E1C" }}>
      <div className="flex-1 px-4 py-5 max-w-2xl mx-auto w-full space-y-3">

        {/* Compact header strip */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(175deg, #1B2B3E 0%, #0F1D2F 100%)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="px-5 pt-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4" style={{ color: "#60A5FA" }} />
                <div>
                  <h1 className="text-[17px] font-bold text-white leading-tight">Peptide Protocols</h1>
                  <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>{PEPTIDES.length} protocols</p>
                </div>
              </div>
              {/* Quick-stat chips */}
              <div className="flex gap-1.5">
                {["GLP-1", "Healing", "GH"].map(c => (
                  <span key={c} className="text-[9px] font-bold px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.55)" }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "rgba(255,255,255,0.40)" }} />
              <input
                className="w-full h-9 pl-9 pr-4 rounded-xl text-[13px]"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.09)", color: "white", outline: "none" }}
                placeholder="Search peptides…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Category filter inside card, visually unified */}
          <div
            className="flex gap-1.5 overflow-x-auto px-5 pb-4"
            style={{ scrollbarWidth: "none" }}
          >
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="shrink-0 px-2.5 h-6 rounded-full text-[11px] font-semibold transition-all"
                style={
                  activeCategory === cat
                    ? { background: "linear-gradient(135deg, #2563EB 0%, #1E3A8A 100%)", color: "white", border: "1px solid transparent" }
                    : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.08)" }
                }
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.40)" }}>
            {filtered.length} {filtered.length === 1 ? "result" : "results"}
          </p>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.30)" }}>
            Tap row to view · Full profile ↗
          </p>
        </div>

        {/* Row list */}
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <FlaskConical className="w-8 h-8 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.18)" }} />
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>No protocols found</p>
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "linear-gradient(160deg, #182534 0%, #1A2B40 100%)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {/* Table header */}
            <div
              className="flex items-center px-4 py-2"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.15)" }}
            >
              <div className="flex items-center gap-2 pl-6">
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>Peptide</span>
              </div>
              <div className="flex-1" />
              <span className="text-[9px] font-bold uppercase tracking-widest pr-7" style={{ color: "rgba(255,255,255,0.35)" }}>Dose · Freq</span>
            </div>

            {filtered.map((p, i) => (
              <PeptideRow key={p.name} p={p} isLast={i === filtered.length - 1} />
            ))}

            {/* Full Profile link row */}
            <div
              className="flex items-center justify-center gap-2 py-3 text-[11px] font-semibold"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: "#60A5FA" }}
            >
              <ArrowRight size={12} />
              Open any row for full protocol details
            </div>
          </div>
        )}

        <p className="text-[11px] text-center pb-2" style={{ color: "rgba(255,255,255,0.30)" }}>
          For educational purposes only. Consult a healthcare professional.
        </p>
      </div>
    </div>
  );
}
