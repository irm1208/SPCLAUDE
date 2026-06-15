import { X, Package, AlertTriangle, TrendingDown, TrendingUp, ChevronDown } from "lucide-react";

type StockLevel = "out" | "low" | "medium" | "high";

interface Product {
  name: string;
  dose: string;
  stock: number;
  level: StockLevel;
}

const LEVEL_CONFIG: Record<StockLevel, {
  label: string;
  bg: string;
  text: string;
  dot: string;
  bar: string;
  barWidth: string;
}> = {
  out:    { label: "Out of Stock", bg: "bg-red-500/15",    text: "text-red-400",    dot: "bg-red-500",    bar: "bg-red-500",    barWidth: "w-0"    },
  low:    { label: "Low Stock",    bg: "bg-orange-500/15", text: "text-orange-400", dot: "bg-orange-400", bar: "bg-orange-400", barWidth: "w-1/4"  },
  medium: { label: "In Stock",     bg: "bg-yellow-500/15", text: "text-yellow-400", dot: "bg-yellow-400", bar: "bg-yellow-400", barWidth: "w-1/2"  },
  high:   { label: "Well Stocked", bg: "bg-emerald-500/15",text: "text-emerald-400",dot: "bg-emerald-500",bar: "bg-emerald-500",barWidth: "w-full" },
};

const PRODUCTS: Product[] = [
  { name: "BPC-157",        dose: "10mg",  stock: 0,  level: "out"    },
  { name: "Tirzepatide",    dose: "10mg",  stock: 8,  level: "low"    },
  { name: "TB-500",         dose: "5mg",   stock: 24, level: "medium" },
  { name: "Semaglutide",    dose: "5mg",   stock: 52, level: "high"   },
  { name: "Melanotan II",   dose: "10mg",  stock: 3,  level: "low"    },
  { name: "CJC-1295",       dose: "2mg",   stock: 41, level: "high"   },
  { name: "Ipamorelin",     dose: "5mg",   stock: 18, level: "medium" },
];

function LevelIcon({ level }: { level: StockLevel }) {
  if (level === "out")    return <AlertTriangle className="w-3.5 h-3.5" />;
  if (level === "low")    return <TrendingDown className="w-3.5 h-3.5" />;
  if (level === "medium") return <Package className="w-3.5 h-3.5" />;
  return <TrendingUp className="w-3.5 h-3.5" />;
}

function StockBar({ level }: { level: StockLevel }) {
  const cfg = LEVEL_CONFIG[level];
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${cfg.bar} ${cfg.barWidth}`} />
      </div>
    </div>
  );
}

export function StockModal() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "rgba(6, 8, 15, 0.85)", backdropFilter: "blur(8px)" }}>
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "linear-gradient(160deg, #0f1322 0%, #0a0d18 100%)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
              </div>
              <span className="text-xs font-medium text-indigo-400 tracking-wider uppercase">Uther Labs</span>
            </div>
            <h2 className="text-white font-semibold text-lg leading-tight">Inventory Status</h2>
            <p className="text-white/40 text-xs mt-0.5">Stock levels for this group buy</p>
          </div>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="px-6 py-3 flex items-center gap-4 flex-wrap" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.02)" }}>
          {(["out", "low", "medium", "high"] as StockLevel[]).map(level => {
            const cfg = LEVEL_CONFIG[level];
            return (
              <div key={level} className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                <span className={`text-xs ${cfg.text}`}>{cfg.label}</span>
              </div>
            );
          })}
        </div>

        {/* Product list */}
        <div className="divide-y" style={{ divideColor: "rgba(255,255,255,0.04)" }}>
          {PRODUCTS.map((p, i) => {
            const cfg = LEVEL_CONFIG[p.level];
            return (
              <div
                key={i}
                className="px-6 py-3.5 flex items-center gap-4 group hover:bg-white/[0.02] transition-colors"
              >
                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-white/90 text-sm font-medium truncate">{p.name}</span>
                    <span className="text-white/30 text-xs shrink-0">{p.dose}</span>
                  </div>
                  <StockBar level={p.level} />
                </div>

                {/* Badge */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${cfg.bg} ${cfg.text}`}>
                  <LevelIcon level={p.level} />
                  {cfg.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-white/25 text-xs">Updated at last sync · 2 hr refresh</p>
          <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
            View all →
          </button>
        </div>
      </div>
    </div>
  );
}
