import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Plus, Trash2, ChevronDown, Info, Pencil, X } from "lucide-react";
import { STEROID_COMPOUNDS, STEROID_CATEGORIES, PLOT_COLORS } from "@/data/steroidCompounds";
import type { SteroidCompound } from "@/data/steroidCompounds";

// ─── Frequency options ──────────────────────────────────────────────────────

const FREQ_OPTIONS: { label: string; h: number }[] = [
  { label: "3×/day", h: 8   },
  { label: "2×/day", h: 12  },
  { label: "Daily",  h: 24  },
  { label: "EOD",    h: 48  },
  { label: "E3D",    h: 72  },
  { label: "3×/wk", h: 56  },
  { label: "2×/wk", h: 84  },
  { label: "Weekly", h: 168 },
  { label: "2×/mo", h: 336 },
  { label: "3 wks",  h: 504 },
];

const CYCLE_WEEKS = [4, 8, 10, 12, 14, 16, 18, 20];

// ─── PK helpers ─────────────────────────────────────────────────────────────

function computeCurve(
  doseAmount: number,
  halfLifeDays: number,
  freqH: number,
  startWeek: number,
  endWeek: number,
  totalWeeks: number,
  steps: number,
): number[] {
  const λ = Math.LN2 / (halfLifeDays * 24);
  const totalH = totalWeeks * 168;
  const startH = startWeek * 168;
  const endH = Math.min(endWeek * 168, totalH);
  const points = new Float64Array(steps + 1);

  const injections: number[] = [];
  for (let t = startH; t < endH; t += freqH) injections.push(t);
  if (injections.length === 0) return Array.from(points);

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * totalH;
    let c = 0;
    for (const inj of injections) {
      if (t >= inj) c += doseAmount * Math.exp(-λ * (t - inj));
    }
    points[i] = c;
  }
  return Array.from(points);
}

function fmtMg(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}g`;
  if (v >= 100)  return `${Math.round(v)}`;
  if (v >= 10)   return `${v.toFixed(1)}`;
  return `${v.toFixed(2)}`;
}

function niceYTick(max: number): number[] {
  const raw = max / 4;
  const exp = Math.floor(Math.log10(raw));
  const step = Math.ceil(raw / Math.pow(10, exp)) * Math.pow(10, exp);
  return [0, step, step * 2, step * 3, step * 4].filter(v => v <= max * 1.05);
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface PlotEntry {
  id: string;
  name: string;
  dose: number;
  freqH: number;
  startWeek: number;
  endWeek: number;
  color: string;
  halfLifeDays: number;
}

interface FormState {
  name: string;
  dose: string;
  freqH: number;
  startWeek: number;
  endWeek: number;
}

function defaultForm(totalWeeks: number): FormState {
  const p = STEROID_COMPOUNDS[0];
  return {
    name: p.name,
    dose: String(p.defaultDose),
    freqH: p.defaultFreqH,
    startWeek: 0,
    endWeek: Math.min(12, totalWeeks),
  };
}

// ─── SteroidPlotter ─────────────────────────────────────────────────────────

export function SteroidPlotter({ hideHeader = false, username }: { hideHeader?: boolean; username?: string }) {
  const [entries, setEntries]       = useState<PlotEntry[]>([]);
  const [totalWeeks, setTotalWeeks] = useState(16);
  const [showTotal, setShowTotal]   = useState(true);
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState<FormState>(() => defaultForm(16));

  const loadedRef   = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load from server on mount ───────────────────────────────────────────
  useEffect(() => {
    if (!username) { loadedRef.current = true; return; }
    fetch("/api/plotter", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((data: { entries: PlotEntry[]; totalWeeks: number } | null) => {
        if (data && Array.isArray(data.entries)) {
          setEntries(data.entries);
          if (typeof data.totalWeeks === "number" && data.totalWeeks > 0) {
            setTotalWeeks(data.totalWeeks);
          }
        }
      })
      .catch(() => {})
      .finally(() => { loadedRef.current = true; });
  }, [username]);

  // ── Auto-save on change (debounced 1.5 s) ──────────────────────────────
  useEffect(() => {
    if (!loadedRef.current || !username) return;
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      fetch("/api/plotter", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries, totalWeeks }),
      })
        .then(() => {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        })
        .catch(() => setSaveStatus("idle"));
    }, 1500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [entries, totalWeeks, username]); // eslint-disable-line react-hooks/exhaustive-deps

  const containerRef = useRef<HTMLDivElement>(null);
  const [chartW, setChartW] = useState(320);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.floor(e.contentRect.width);
      if (w > 0) setChartW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Curve computation ──────────────────────────────────────────────────

  const STEPS = 400;
  const { curves, totalCurve, maxC, steadyStates } = useMemo(() => {
    if (entries.length === 0) return { curves: [], totalCurve: [], maxC: 0, steadyStates: [] };

    const curves = entries.map(e =>
      computeCurve(e.dose, e.halfLifeDays, e.freqH, e.startWeek, e.endWeek, totalWeeks, STEPS)
    );

    const totalCurve = new Array(STEPS + 1).fill(0);
    for (const c of curves) for (let i = 0; i <= STEPS; i++) totalCurve[i] += c[i];

    const maxC = Math.max(...totalCurve, ...curves.flatMap(c => c), 1e-6);

    const steadyStates = entries.map((e, ei) => {
      const curve = curves[ei];
      const endH = Math.min(e.endWeek * 168, totalWeeks * 168);
      const injections: number[] = [];
      for (let t = e.startWeek * 168; t < endH; t += e.freqH) injections.push(t);

      const peaks: number[] = [];
      for (let k = 1; k < injections.length - 1; k++) {
        const peakT = injections[k] + e.halfLifeDays * 24 * 0.5;
        const idx = Math.round((peakT / (totalWeeks * 168)) * STEPS);
        if (idx >= 0 && idx <= STEPS) peaks.push(curve[idx]);
      }

      let steadyWeek = -1;
      for (let k = 2; k < peaks.length; k++) {
        const prev = peaks[k - 1];
        if (prev > 0 && Math.abs(peaks[k] - prev) / prev < 0.02) {
          steadyWeek = Math.round(injections[k] / 168);
          break;
        }
      }
      return steadyWeek;
    });

    return { curves, totalCurve, maxC, steadyStates };
  }, [entries, totalWeeks]);

  // ── Chart geometry ─────────────────────────────────────────────────────

  const W = chartW;
  const H = Math.min(240, Math.max(160, Math.round(W * 0.48)));
  const PL = 46, PR = 12, PT = 14, PB = 36;
  const cW = W - PL - PR;
  const cH = H - PT - PB;
  const toX = useCallback((w: number) => PL + (w / totalWeeks) * cW, [cW, totalWeeks]);
  const toY = useCallback((v: number) => PT + cH - (v / (maxC || 1)) * cH, [cH, maxC, PT]);

  function makePath(pts: number[]): string {
    return pts
      .map((v, i) => {
        const x = PL + (i / STEPS) * cW;
        const y = toY(v);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  const yTicks  = useMemo(() => niceYTick(maxC), [maxC]);
  const wkLabels = useMemo(() => {
    const step = totalWeeks <= 10 ? 2 : totalWeeks <= 16 ? 4 : 5;
    const labels: number[] = [0];
    for (let w = step; w <= totalWeeks; w += step) labels.push(w);
    return labels;
  }, [totalWeeks]);

  const hoverX    = hoverRatio !== null ? PL + hoverRatio * cW : null;
  const hoverWeek = hoverRatio !== null ? hoverRatio * totalWeeks : null;
  const hoverStep = hoverRatio !== null ? Math.round(hoverRatio * STEPS) : null;
  const hoverVals = hoverStep !== null
    ? entries.map((e, i) => ({ name: e.name, color: e.color, v: curves[i]?.[hoverStep] ?? 0 }))
    : [];
  const hoverTotal = hoverStep !== null && showTotal && entries.length > 1
    ? totalCurve[hoverStep] ?? 0
    : null;

  // ── Form actions ───────────────────────────────────────────────────────

  function openAdd() {
    setEditingId(null);
    setForm(defaultForm(totalWeeks));
    setShowForm(true);
  }

  function openEdit(entry: PlotEntry) {
    setEditingId(entry.id);
    setForm({
      name: entry.name,
      dose: String(entry.dose),
      freqH: entry.freqH,
      startWeek: entry.startWeek,
      endWeek: entry.endWeek,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  function handlePresetSelect(name: string) {
    const p: SteroidCompound | undefined = STEROID_COMPOUNDS.find(s => s.name === name);
    if (!p) { setForm(f => ({ ...f, name })); return; }
    setForm(f => ({ ...f, name: p.name, dose: String(p.defaultDose), freqH: p.defaultFreqH }));
  }

  function handleSubmit() {
    const dose = parseFloat(form.dose);
    if (!form.name || isNaN(dose) || dose <= 0) return;

    const preset = STEROID_COMPOUNDS.find(s => s.name === form.name);
    const halfLifeDays = preset?.halfLifeDays ?? 4.5;

    if (editingId) {
      setEntries(prev => prev.map(e =>
        e.id === editingId
          ? { ...e, name: form.name, dose, freqH: form.freqH, startWeek: form.startWeek, endWeek: Math.min(form.endWeek, totalWeeks), halfLifeDays }
          : e
      ));
    } else {
      const usedColors = entries.map(e => e.color);
      const color = preset?.color ?? PLOT_COLORS.find(c => !usedColors.includes(c)) ?? PLOT_COLORS[entries.length % PLOT_COLORS.length];
      setEntries(prev => [...prev, {
        id: String(Date.now()),
        name: form.name, dose, freqH: form.freqH,
        startWeek: form.startWeek,
        endWeek: Math.min(form.endWeek, totalWeeks),
        color, halfLifeDays,
      }]);
    }
    closeForm();
  }

  function removeEntry(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id));
    if (editingId === id) closeForm();
  }

  const onSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const raw = (e.clientX - r.left) / r.width * W;
    const ratio = Math.max(0, Math.min(1, (raw - PL) / cW));
    setHoverRatio(ratio);
  }, [W, cW]);

  const onSvgTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    const raw = (e.touches[0].clientX - r.left) / r.width * W;
    const ratio = Math.max(0, Math.min(1, (raw - PL) / cW));
    setHoverRatio(ratio);
  }, [W, cW]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className={`space-y-4${hideHeader ? " pt-5" : ""}`}>

      {/* ── Header row ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {!hideHeader && (
          <div>
            <h2 className="text-lg font-bold text-slate-800">Cycle Plotter</h2>
            <p className="text-xs text-slate-400 mt-0.5">Model blood levels across your cycle</p>
          </div>
        )}
        <div className={`flex items-center gap-2${hideHeader ? " ml-auto" : ""}`}>
          {username && saveStatus !== "idle" && (
            <span className="text-[10px] font-semibold text-slate-400">
              {saveStatus === "saving" ? "Saving…" : "Saved"}
            </span>
          )}
          <div className="relative">
            <select
              value={totalWeeks}
              onChange={e => setTotalWeeks(Number(e.target.value))}
              className="h-8 pl-3 pr-7 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 focus:outline-none appearance-none cursor-pointer"
            >
              {CYCLE_WEEKS.map(w => <option key={w} value={w}>{w} weeks</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-bold text-white"
            style={{ background: "var(--t-blue)" }}
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>

      {/* ── Add / Edit compound form ────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3 border border-slate-100">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {editingId ? "Edit Compound" : "Add Compound"}
            </p>
            <button onClick={closeForm} className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 bg-slate-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Compound</label>
            <select
              value={form.name}
              onChange={e => handlePresetSelect(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm bg-slate-50 focus:outline-none focus:border-blue-300"
            >
              {STEROID_CATEGORIES.map(cat => (
                <optgroup key={cat} label={cat}>
                  {STEROID_COMPOUNDS.filter(s => s.category === cat).map(s => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Dose per injection (mg)</label>
            <input
              type="number" inputMode="decimal" min="0" step="any"
              value={form.dose}
              onChange={e => setForm(f => ({ ...f, dose: e.target.value }))}
              className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm font-mono bg-slate-50 focus:outline-none focus:border-blue-300"
              placeholder="e.g. 250"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Frequency</label>
            <div className="flex flex-wrap gap-1">
              {FREQ_OPTIONS.map(f => (
                <button
                  key={f.h}
                  type="button"
                  onClick={() => setForm(fm => ({ ...fm, freqH: f.h }))}
                  className="px-2.5 h-7 rounded-lg text-[11px] font-semibold transition-all"
                  style={form.freqH === f.h
                    ? { background: "var(--t-blue)", color: "white" }
                    : { background: "rgba(0,0,0,0.05)", color: "#64748B" }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Start week</label>
              <input
                type="number" min="0" max={totalWeeks - 1} step="1"
                value={form.startWeek}
                onChange={e => setForm(f => ({ ...f, startWeek: Math.max(0, Math.min(Number(e.target.value), totalWeeks - 1)) }))}
                className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm font-mono bg-slate-50 focus:outline-none focus:border-blue-300"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">End week</label>
              <input
                type="number" min={form.startWeek + 1} max={totalWeeks} step="1"
                value={form.endWeek}
                onChange={e => setForm(f => ({ ...f, endWeek: Math.max(f.startWeek + 1, Math.min(Number(e.target.value), totalWeeks)) }))}
                className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm font-mono bg-slate-50 focus:outline-none focus:border-blue-300"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={closeForm}
              className="flex-1 h-9 rounded-xl text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 h-9 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--t-blue)" }}
            >
              {editingId ? "Save changes" : "Plot it"}
            </button>
          </div>
        </div>
      )}

      {/* ── Compound list ───────────────────────────────────────────────── */}
      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((e, i) => {
            const freq = FREQ_OPTIONS.find(f => f.h === e.freqH)?.label ?? `${e.freqH}h`;
            const ss = steadyStates[i];
            const isBeingEdited = editingId === e.id;
            return (
              <div
                key={e.id}
                className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm"
                style={{ border: isBeingEdited ? `1px solid ${e.color}` : "1px solid rgba(0,0,0,0.06)" }}
              >
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: e.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-800 truncate">{e.name}</span>
                    {ss > 0 && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: `${e.color}15`, color: e.color }}>
                        SS wk {ss}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    <span className="font-semibold text-slate-600">{e.dose}mg</span>
                    {" · "}{freq}
                    {" · "}<span className="font-mono text-[11px]">Wk {e.startWeek}–{e.endWeek}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => isBeingEdited ? closeForm() : openEdit(e)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                    style={isBeingEdited
                      ? { color: e.color, background: `${e.color}15` }
                      : { color: "#94A3B8" }}
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeEntry(e.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Chart ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>

        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Blood Levels</span>
            {entries.length > 1 && (
              <button
                onClick={() => setShowTotal(t => !t)}
                className="flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold transition-all"
                style={showTotal
                  ? { background: "rgba(0,0,0,0.08)", color: "#475569" }
                  : { background: "rgba(0,0,0,0.04)", color: "#94A3B8" }}
              >
                Total
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {entries.map(e => (
              <span key={e.id} className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: e.color }} />
                {e.name.split(" ")[0]}
              </span>
            ))}
            {entries.length > 1 && showTotal && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                <span className="w-4 h-0.5 rounded-full bg-slate-800" />
                Total
              </span>
            )}
          </div>
        </div>

        <div className="px-3 pt-2 pb-3" ref={containerRef}>
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: "var(--t-blue-08)" }}>
                <Info className="w-6 h-6" style={{ color: "var(--t-blue)" }} />
              </div>
              <p className="text-sm font-semibold text-slate-500">Add compounds to plot</p>
              <p className="text-xs text-slate-400 mt-1 max-w-56">Select a compound, set the dose and schedule, and see the blood level curve.</p>
              <button
                onClick={openAdd}
                className="mt-4 flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-bold text-white"
                style={{ background: "var(--t-blue)" }}
              >
                <Plus className="w-3.5 h-3.5" /> Add first compound
              </button>
            </div>
          ) : (
            <>
              <svg
                viewBox={`0 0 ${W} ${H}`}
                width="100%"
                style={{ display: "block", cursor: "crosshair", touchAction: "none", userSelect: "none" }}
                onMouseMove={onSvgMouseMove}
                onMouseLeave={() => setHoverRatio(null)}
                onTouchMove={onSvgTouchMove}
                onTouchEnd={() => setHoverRatio(null)}
              >
                {yTicks.map(v => (
                  <g key={v}>
                    <line
                      x1={PL} y1={toY(v)} x2={PL + cW} y2={toY(v)}
                      stroke={v === 0 ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.05)"}
                      strokeWidth={v === 0 ? 1 : 0.8}
                      strokeDasharray={v === 0 ? undefined : "3,3"}
                    />
                    {v > 0 && (
                      <text x={PL - 3} y={toY(v) + 3.5} textAnchor="end" fontSize="8.5" fill="#94A3B8" fontFamily="system-ui,sans-serif">
                        {fmtMg(v)}
                      </text>
                    )}
                  </g>
                ))}

                <text x={8} y={PT + cH / 2} textAnchor="middle" fontSize="8" fill="#94A3B8"
                  transform={`rotate(-90,8,${PT + cH / 2})`} fontFamily="system-ui,sans-serif">mg</text>

                {wkLabels.map(w => (
                  <g key={w}>
                    {w > 0 && <line x1={toX(w)} y1={PT} x2={toX(w)} y2={PT + cH} stroke="rgba(0,0,0,0.04)" strokeWidth="0.6" />}
                    <text x={toX(w)} y={PT + cH + 14} textAnchor="middle" fontSize="8.5" fill="#94A3B8" fontFamily="system-ui,sans-serif">
                      Wk {w}
                    </text>
                  </g>
                ))}

                {entries.map((e, i) => {
                  const p = makePath(curves[i] ?? []);
                  const fillPath = `${p} L${(PL + cW).toFixed(1)},${(PT + cH).toFixed(1)} L${PL.toFixed(1)},${(PT + cH).toFixed(1)} Z`;
                  return (
                    <g key={e.id}>
                      <path d={fillPath} fill={e.color} fillOpacity="0.08" />
                      <path d={p} fill="none" stroke={e.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                  );
                })}

                {showTotal && entries.length > 1 && (
                  <path d={makePath(totalCurve)} fill="none" stroke="rgba(30,41,59,0.55)"
                    strokeWidth="1.5" strokeDasharray="5,3" strokeLinecap="round" />
                )}

                {entries.map((e, i) => {
                  const ss = steadyStates[i];
                  if (ss <= 0 || ss >= totalWeeks) return null;
                  const x = toX(ss);
                  return (
                    <g key={`ss-${e.id}`}>
                      <line x1={x} y1={PT} x2={x} y2={PT + cH}
                        stroke={e.color} strokeWidth="1" strokeOpacity="0.35" strokeDasharray="3,2" />
                      <text x={x + 2} y={PT + 9} fontSize="7.5" fill={e.color} fillOpacity="0.75" fontFamily="system-ui,sans-serif">SS</text>
                    </g>
                  );
                })}

                {hoverX !== null && hoverWeek !== null && (
                  <g>
                    <line x1={hoverX.toFixed(1)} y1={PT} x2={hoverX.toFixed(1)} y2={PT + cH}
                      stroke="rgba(0,0,0,0.2)" strokeWidth="1" strokeDasharray="3,2" />
                    {entries.map((e, i) => {
                      const v = curves[i]?.[hoverStep!] ?? 0;
                      return <circle key={e.id} cx={hoverX.toFixed(1)} cy={toY(v).toFixed(1)}
                        r="3.5" fill={e.color} stroke="white" strokeWidth="1.5" />;
                    })}
                    {(() => {
                      const tipW = Math.max(92, entries.length * 18 + 50);
                      const tipH = 18 + entries.length * 14 + (hoverTotal !== null ? 14 : 0) + 6;
                      const tipX = hoverX > PL + cW * 0.6 ? hoverX - tipW - 6 : hoverX + 8;
                      const tipY = PT + 4;
                      return (
                        <g>
                          <rect x={tipX} y={tipY} width={tipW} height={tipH} rx="6" fill="rgba(15,23,42,0.88)" />
                          <text x={tipX + 8} y={tipY + 12} fontSize="8.5" fill="#94A3B8" fontFamily="system-ui,sans-serif">
                            Wk {hoverWeek.toFixed(1)}
                          </text>
                          {hoverVals.map((hv, k) => (
                            <text key={k} x={tipX + 8} y={tipY + 24 + k * 14} fontSize="9"
                              fill={hv.color} fontWeight="bold" fontFamily="system-ui,sans-serif">
                              {hv.name.split(" ")[0]}: {fmtMg(hv.v)}mg
                            </text>
                          ))}
                          {hoverTotal !== null && (
                            <text x={tipX + 8} y={tipY + 24 + hoverVals.length * 14} fontSize="9"
                              fill="rgba(255,255,255,0.75)" fontWeight="bold" fontFamily="system-ui,sans-serif">
                              Total: {fmtMg(hoverTotal)}mg
                            </text>
                          )}
                        </g>
                      );
                    })()}
                  </g>
                )}
              </svg>

              <div className="flex flex-wrap items-center gap-3 mt-1 px-1">
                <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Legend:</span>
                {entries.map(e => (
                  <span key={e.id} className="flex items-center gap-1 text-[10px] text-slate-500">
                    <span className="w-6 h-0.5 rounded-full" style={{ background: e.color }} />
                    {e.name}
                  </span>
                ))}
                {showTotal && entries.length > 1 && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-500">
                    <span className="inline-block w-6 h-0.5 bg-slate-500 opacity-55"
                      style={{ backgroundImage: "repeating-linear-gradient(to right,rgba(30,41,59,0.55) 0,rgba(30,41,59,0.55) 5px,transparent 5px,transparent 8px)" }} />
                    Total
                  </span>
                )}
                {entries.some((_, i) => (steadyStates[i] ?? -1) > 0) && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-500">
                    <svg width="12" height="12">
                      <line x1="6" y1="0" x2="6" y2="12" stroke="#94A3B8" strokeWidth="1" strokeDasharray="2,2" />
                    </svg>
                    Steady state (SS)
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <p className="text-[10px] text-slate-400 leading-relaxed px-1">
        <span className="font-bold">Disclaimer:</span> Illustrative pharmacokinetic model based on published half-life data.
        Does not account for individual metabolism, bioavailability, volume of distribution, or clinical dosing. Not medical advice.
        Always consult a qualified healthcare professional.
      </p>
    </div>
  );
}
