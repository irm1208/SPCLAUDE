import { useState } from "react";
import { Search, RefreshCw, AlertTriangle, TrendingDown, Package, TrendingUp, ChevronUp, ChevronDown, Eye, EyeOff, Settings } from "lucide-react";

type StockLevel = "out" | "low" | "medium" | "high";

interface Product {
  id: string;
  name: string;
  dose: string;
  qiyunleCode: string;
  stock: number;
  lastSync: string;
}

const LEVEL_CONFIG: Record<StockLevel, {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
  rowBg: string;
}> = {
  out:    { label: "Out of Stock", bg: "bg-red-500/10",    text: "text-red-400",    border: "border-red-500/20",    dot: "bg-red-500",    rowBg: "bg-red-500/[0.03]"    },
  low:    { label: "Low Stock",    bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", dot: "bg-orange-400", rowBg: "bg-orange-500/[0.03]" },
  medium: { label: "In Stock",     bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20", dot: "bg-yellow-400", rowBg: ""                      },
  high:   { label: "Well Stocked", bg: "bg-emerald-500/10",text: "text-emerald-400",border: "border-emerald-500/20",dot: "bg-emerald-500",rowBg: ""                      },
};

function getLevel(stock: number): StockLevel {
  if (stock === 0)  return "out";
  if (stock <= 10)  return "low";
  if (stock <= 30)  return "medium";
  return "high";
}

const PRODUCTS: Product[] = [
  { id: "p001", name: "BPC-157",           dose: "10mg", qiyunleCode: "BP10-0428", stock: 0,   lastSync: "2 min ago" },
  { id: "p002", name: "Tirzepatide",        dose: "10mg", qiyunleCode: "ZE10-0429", stock: 8,   lastSync: "2 min ago" },
  { id: "p003", name: "TB-500",             dose: "5mg",  qiyunleCode: "TB05-0428", stock: 24,  lastSync: "2 min ago" },
  { id: "p004", name: "Semaglutide",        dose: "5mg",  qiyunleCode: "SE05-0427", stock: 52,  lastSync: "2 min ago" },
  { id: "p005", name: "Melanotan II",       dose: "10mg", qiyunleCode: "MT210-0429",stock: 3,   lastSync: "2 min ago" },
  { id: "p006", name: "CJC-1295 (no DAC)", dose: "2mg",  qiyunleCode: "CJC02-0428",stock: 41,  lastSync: "2 min ago" },
  { id: "p007", name: "Ipamorelin",         dose: "5mg",  qiyunleCode: "IPA05-0428",stock: 18,  lastSync: "2 min ago" },
  { id: "p008", name: "Melanotan I",        dose: "10mg", qiyunleCode: "MT110-0429",stock: 7,   lastSync: "2 min ago" },
  { id: "p009", name: "GHRP-6",             dose: "5mg",  qiyunleCode: "GH605-0428",stock: 0,   lastSync: "2 min ago" },
  { id: "p010", name: "Hexarelin",          dose: "2mg",  qiyunleCode: "HEX02-0429",stock: 35,  lastSync: "2 min ago" },
  { id: "p011", name: "Retatrutide",        dose: "10mg", qiyunleCode: "RET10-0429",stock: 62,  lastSync: "2 min ago" },
  { id: "p012", name: "AOD-9604",           dose: "5mg",  qiyunleCode: "AOD05-0428",stock: 11,  lastSync: "2 min ago" },
];

const LEVEL_FILTERS: { key: StockLevel | "all"; label: string }[] = [
  { key: "all",    label: "All" },
  { key: "out",    label: "Out of Stock" },
  { key: "low",    label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high",   label: "High" },
];

function LevelBadge({ level }: { level: StockLevel }) {
  const cfg = LEVEL_CONFIG[level];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function StockBar({ stock, level }: { stock: number; level: StockLevel }) {
  const pct = Math.min(100, (stock / 80) * 100);
  const color = level === "out" ? "bg-red-500" : level === "low" ? "bg-orange-400" : level === "medium" ? "bg-yellow-400" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-white/60 text-sm tabular-nums w-8 text-right">{stock}</span>
    </div>
  );
}

const SUMMARY = {
  out:    PRODUCTS.filter(p => getLevel(p.stock) === "out").length,
  low:    PRODUCTS.filter(p => getLevel(p.stock) === "low").length,
  medium: PRODUCTS.filter(p => getLevel(p.stock) === "medium").length,
  high:   PRODUCTS.filter(p => getLevel(p.stock) === "high").length,
};

export function AdminInventory() {
  const [filter, setFilter] = useState<StockLevel | "all">("all");
  const [search, setSearch] = useState("");
  const [modalEnabled, setModalEnabled] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const filtered = PRODUCTS.filter(p => {
    const level = getLevel(p.stock);
    const matchLevel = filter === "all" || level === filter;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                        p.qiyunleCode.toLowerCase().includes(search.toLowerCase());
    return matchLevel && matchSearch;
  });

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2000);
  };

  return (
    <div className="min-h-screen text-white" style={{ background: "#0a0d18", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Inventory</h1>
            <p className="text-white/40 text-sm">Uther Labs · Live stock levels</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Customer modal toggle */}
            <div
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer select-none transition-colors"
              style={{ background: modalEnabled ? "rgba(79,120,216,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${modalEnabled ? "rgba(79,120,216,0.3)" : "rgba(255,255,255,0.08)"}` }}
              onClick={() => setModalEnabled(v => !v)}
            >
              {modalEnabled ? <Eye className="w-3.5 h-3.5 text-indigo-400" /> : <EyeOff className="w-3.5 h-3.5 text-white/30" />}
              <span className={`text-xs font-medium ${modalEnabled ? "text-indigo-300" : "text-white/30"}`}>
                Customer modal {modalEnabled ? "on" : "off"}
              </span>
              <div className={`w-7 h-4 rounded-full relative transition-colors ${modalEnabled ? "bg-indigo-500" : "bg-white/10"}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${modalEnabled ? "left-3.5" : "left-0.5"}`} />
              </div>
            </div>

            {/* Sync button */}
            <button
              onClick={handleSync}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:text-white transition-colors text-sm"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              Sync now
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="px-6 pb-4 grid grid-cols-4 gap-3">
          {(["out", "low", "medium", "high"] as StockLevel[]).map(level => {
            const cfg = LEVEL_CONFIG[level];
            const count = SUMMARY[level];
            return (
              <div
                key={level}
                onClick={() => setFilter(f => f === level ? "all" : level)}
                className={`rounded-xl px-4 py-3 cursor-pointer transition-all border ${filter === level ? `${cfg.bg} ${cfg.border}` : "border-white/[0.06] hover:border-white/10"}`}
                style={{ background: filter === level ? undefined : "rgba(255,255,255,0.02)" }}
              >
                <div className={`text-2xl font-bold tabular-nums ${filter === level ? cfg.text : "text-white"}`}>{count}</div>
                <div className={`text-xs mt-0.5 ${filter === level ? cfg.text : "text-white/40"}`}>{cfg.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters + search */}
      <div className="px-6 py-3 flex items-center justify-between gap-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-1">
          {LEVEL_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as StockLevel | "all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f.key ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="pl-8 pr-3 py-1.5 rounded-lg text-sm text-white placeholder-white/25 outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", width: 200 }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="px-6 pt-3">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <th className="text-left text-xs text-white/30 font-medium pb-2 pr-4">Product</th>
              <th className="text-left text-xs text-white/30 font-medium pb-2 pr-4">Qiyunle Code</th>
              <th className="text-left text-xs text-white/30 font-medium pb-2 pr-4">Stock</th>
              <th className="text-left text-xs text-white/30 font-medium pb-2 pr-4">Level</th>
              <th className="text-left text-xs text-white/30 font-medium pb-2">Last Sync</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const level = getLevel(p.stock);
              const cfg = LEVEL_CONFIG[level];
              return (
                <tr
                  key={p.id}
                  className={`transition-colors group ${cfg.rowBg}`}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                >
                  <td className="py-2.5 pr-4">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-white/90 font-medium">{p.name}</span>
                      <span className="text-white/30 text-xs">{p.dose}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4">
                    <code className="text-white/40 text-xs font-mono">{p.qiyunleCode}</code>
                  </td>
                  <td className="py-2.5 pr-4">
                    <StockBar stock={p.stock} level={level} />
                  </td>
                  <td className="py-2.5 pr-4">
                    <LevelBadge level={level} />
                  </td>
                  <td className="py-2.5">
                    <span className="text-white/25 text-xs">{p.lastSync}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-white/20 text-sm">No products match your filter</div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 mt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="flex items-center justify-between">
          <p className="text-white/20 text-xs">{PRODUCTS.length} products mapped · Syncs every 2 hours</p>
          <div className="flex items-center gap-1.5 text-xs text-white/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Last sync: 2 min ago
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(79,120,216,0.06)", border: "1px solid rgba(79,120,216,0.12)" }}>
          <Settings className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-indigo-300 text-xs font-medium">Customer modal is {modalEnabled ? "enabled" : "disabled"}</p>
            <p className="text-indigo-400/50 text-xs mt-0.5">
              {modalEnabled
                ? "Customers viewing group buys with Uther products will see the stock level popup."
                : "Stock levels are hidden from customers. Toggle on to show them."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
