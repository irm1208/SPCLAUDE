import { useState } from "react";
import { Search, FlaskConical, ArrowRight, BookOpen } from "lucide-react";

const PEPTIDES = [
  {
    abbrev: "RETA",
    name: "Retatrutide",
    tagline: "Triple agonist — GIP, GLP-1, glucagon for maximum weight loss",
    category: "GLP-1",
    researchLevel: "Well Researched",
    color: "#8B5CF6",
    startDose: "0.5 mg",
    frequency: "Weekly",
    route: "Subcut.",
    storage: "Refrigerated",
    tags: ["Weight Loss", "Metabolic", "Triple Agonist"],
  },
  {
    abbrev: "SEM",
    name: "Semaglutide",
    tagline: "Leading GLP-1 agonist for sustained weight loss and glycemic control",
    category: "GLP-1",
    researchLevel: "Extensively Studied",
    color: "#10B981",
    startDose: "0.25 mg",
    frequency: "Weekly",
    route: "Subcut.",
    storage: "Refrigerated",
    tags: ["Weight Loss", "Diabetes", "GLP-1"],
  },
  {
    abbrev: "BPC",
    name: "BPC-157",
    tagline: "Body protection compound — accelerates healing and recovery",
    category: "Healing",
    researchLevel: "Well Researched",
    color: "#059669",
    startDose: "250 mcg",
    frequency: "2× Daily",
    route: "Subcut.",
    storage: "Refrigerated",
    tags: ["Healing", "Recovery", "Gut Health"],
  },
  {
    abbrev: "TIRZ",
    name: "Tirzepatide",
    tagline: "Dual GIP/GLP-1 agonist with superior weight-loss outcomes",
    category: "GLP-1",
    researchLevel: "Extensively Studied",
    color: "#6366F1",
    startDose: "2.5 mg",
    frequency: "Weekly",
    route: "Subcut.",
    storage: "Refrigerated",
    tags: ["Weight Loss", "Dual Agonist", "Diabetes"],
  },
  {
    abbrev: "IPA",
    name: "Ipamorelin",
    tagline: "Selective GH secretagogue with minimal side effects",
    category: "GH Peptides",
    researchLevel: "Well Researched",
    color: "#7C3AED",
    startDose: "200 mcg",
    frequency: "Daily",
    route: "Subcut.",
    storage: "Refrigerated",
    tags: ["GH Release", "Recovery", "Sleep"],
  },
  {
    abbrev: "SEMAX",
    name: "Semax",
    tagline: "Nootropic peptide — cognitive enhancement and neuroprotection",
    category: "Cognitive",
    researchLevel: "Limited Research",
    color: "#2563EB",
    startDose: "0.1 mg",
    frequency: "Daily",
    route: "Intranasal",
    storage: "Refrigerated",
    tags: ["Cognitive", "Neuroprotection", "Focus"],
  },
];

const CATEGORIES = ["All", "GLP-1", "Healing", "GH Peptides", "Cognitive", "Other"];

const LEVEL_CFG: Record<string, { color: string; bg: string; dot: string }> = {
  "Extensively Studied": { color: "#34D399", bg: "rgba(52,211,153,0.12)", dot: "#34D399" },
  "Well Researched":     { color: "#60A5FA", bg: "rgba(96,165,250,0.12)", dot: "#60A5FA" },
  "Limited Research":    { color: "#F59E0B", bg: "rgba(245,158,11,0.12)", dot: "#F59E0B" },
  "Early Research":      { color: "#A78BFA", bg: "rgba(167,139,250,0.12)", dot: "#A78BFA" },
};

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg py-2 px-1 text-center flex flex-col gap-0.5"
      style={{ background: "rgba(255,255,255,0.055)" }}
    >
      <span className="text-[9px] font-bold uppercase tracking-wider leading-none" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</span>
      <span className="text-[11px] font-bold text-white leading-tight">{value}</span>
    </div>
  );
}

function PeptideCard({ p }: { p: typeof PEPTIDES[number] }) {
  const level = LEVEL_CFG[p.researchLevel];
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #182534 0%, #1A2B40 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Top accent line */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${p.color} 0%, ${p.color}44 100%)` }} />

      {/* Main card body */}
      <div className="px-4 pt-3.5 pb-3">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          {/* Abbreviation badge */}
          <div
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-[11px] tracking-wider"
            style={{ background: `${p.color}18`, color: p.color, border: `1.5px solid ${p.color}33` }}
          >
            {p.abbrev}
          </div>

          {/* Name + tagline + level badge */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[15px] font-bold text-white leading-tight">{p.name}</span>
              <span
                className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-tight"
                style={{ color: level.color, background: level.bg }}
              >
                {p.researchLevel}
              </span>
            </div>
            <p className="text-[12px] leading-snug" style={{ color: "rgba(255,255,255,0.60)" }}>{p.tagline}</p>
          </div>

          {/* Category pill */}
          <span
            className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
            style={{ background: `${p.color}1A`, color: p.color, border: `1px solid ${p.color}38` }}
          >
            {p.category}
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {p.tags.map(tag => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.50)" }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* 4-stat grid */}
        <div className="grid grid-cols-4 gap-1.5">
          <StatCell label="Start Dose" value={p.startDose} />
          <StatCell label="Frequency" value={p.frequency} />
          <StatCell label="Route" value={p.route} />
          <StatCell label="Storage" value={p.storage} />
        </div>
      </div>

      {/* Footer — clean action row */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
          <BookOpen size={11} />
          Tap for quick info
        </span>
        <button
          className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-opacity"
          style={{
            color: p.color,
            background: `${p.color}12`,
            border: `1px solid ${p.color}28`,
          }}
        >
          Full Profile <ArrowRight size={10} />
        </button>
      </div>
    </div>
  );
}

export function AbbrevCards() {
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

        {/* Hero */}
        <div
          className="rounded-2xl relative overflow-hidden"
          style={{ background: "linear-gradient(175deg, #1B2B3E 0%, #0F1D2F 100%)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(96,165,250,0.12) 0%, transparent 70%)", transform: "translate(20%, -20%)" }}
          />
          <div className="p-5 relative z-10">
            <div className="flex items-center gap-2 mb-1.5">
              <FlaskConical className="w-4 h-4" style={{ color: "#60A5FA" }} />
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#60A5FA" }}>Peptide Reference</span>
            </div>
            <h1
              className="text-xl font-bold mb-1"
              style={{
                background: "linear-gradient(135deg, #FFFFFF 0%, #93C5FD 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Protocols
            </h1>
            <p className="text-[13px] mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>
              Dosing, reconstitution & tips for {PEPTIDES.length} peptides
            </p>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "rgba(255,255,255,0.45)" }} />
              <input
                className="w-full h-10 pl-9 pr-4 rounded-xl text-sm"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)", color: "white", outline: "none" }}
                placeholder="Search peptides…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="shrink-0 px-3 h-7 rounded-full text-[12px] font-semibold transition-all"
              style={
                activeCategory === cat
                  ? { background: "linear-gradient(135deg, #2563EB 0%, #1E3A8A 100%)", color: "white", border: "1px solid transparent" }
                  : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.10)" }
              }
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="space-y-2">
          {filtered.map(p => <PeptideCard key={p.name} p={p} />)}
        </div>

        <p className="text-[11px] text-center pb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
          For educational purposes only. Consult a healthcare professional.
        </p>
      </div>
    </div>
  );
}
