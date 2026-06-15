import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, X, Loader2,
  CheckCircle, AlertCircle, FlaskConical, Syringe, Pill, Leaf,
  CircleDot, ChevronRight, Calendar, Clock,
} from "lucide-react";
import { DatePickerField } from "@/components/DatePickerField";
import {
  useCompounds, useCreateCompound, useUpdateCompound, useDeleteCompound,
  type CompoundLog, type CreateCompoundPayload,
} from "@/hooks/use-compounds";
import { useAccount } from "@/hooks/use-account";
import { BottomTabs } from "@/components/BottomTabs";

// ─── Preset data ──────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  AAS:        { label: "AAS",        color: "#DC2626", bg: "rgba(220,38,38,0.1)",    Icon: Syringe },
  TRT:        { label: "TRT",        color: "var(--t-blue)", bg: "var(--t-blue-10)",    Icon: CircleDot },
  Peptide:    { label: "Peptide",    color: "#16A34A", bg: "rgba(22,163,74,0.1)",    Icon: FlaskConical },
  Supplement: { label: "Supplement", color: "var(--t-blue)", bg: "var(--t-blue-10)",   Icon: Leaf },
  Other:      { label: "Other",      color: "var(--t-blue)", bg: "rgba(124,58,237,0.1)",  Icon: Pill },
};

const PRESET_COMPOUNDS: Record<string, string[]> = {
  AAS: [
    "Testosterone Enanthate", "Testosterone Cypionate", "Testosterone Propionate",
    "Nandrolone Decanoate (Deca)", "Trenbolone Acetate", "Trenbolone Enanthate",
    "Boldenone Undecylenate (EQ)", "Stanozolol (Winstrol)", "Oxandrolone (Anavar)",
    "Methandrostenolone (Dbol)", "Masteron Propionate", "Masteron Enanthate", "Primobolan",
  ],
  TRT: [
    "Testosterone Enanthate (TRT)", "Testosterone Cypionate (TRT)", "Testosterone Undecanoate",
    "Testosterone Gel", "Gonadorelin", "HCG", "Clomiphene (Clomid)", "Anastrozole",
  ],
  Peptide: [
    "BPC-157", "TB-500", "Ipamorelin", "CJC-1295 no DAC", "CJC-1295 DAC",
    "GHRP-2", "GHRP-6", "Hexarelin", "Tesamorelin", "Epithalon",
    "Selank", "Semax", "PT-141", "Melanotan II", "GHK-Cu",
    "Thymosin Alpha-1", "SS-31", "AOD-9604", "Fragment 176-191",
    "PEG-MGF", "IGF-1 LR3",
  ],
  Supplement: [
    "Vitamin D3", "Vitamin B12", "Zinc", "Magnesium", "Omega-3 (EPA/DHA)",
    "TUDCA", "NAC", "Ashwagandha", "Boron", "Red Yeast Rice", "Iron",
  ],
  Other: [],
};

const FREQUENCIES = ["Daily", "EOD", "E3D", "2x/week", "Weekly", "2x/month", "Monthly", "Other"];
const ROUTES = ["SubQ", "IM", "Oral", "Nasal", "Topical", "Other"];
const UNITS = ["mg", "mcg", "IU", "ml", "units"];
const TYPES = ["AAS", "TRT", "Peptide", "Supplement", "Other"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function daysBetween(from: string, to?: string | null) {
  const a = new Date(from + "T00:00:00");
  const b = to ? new Date(to + "T00:00:00") : new Date();
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

// ─── Type badge ───────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const m = TYPE_META[type] ?? TYPE_META.Other;
  const Icon = m.Icon;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: m.bg, color: m.color }}>
      <Icon className="w-2.5 h-2.5" />{m.label}
    </span>
  );
}

// ─── Compound card ────────────────────────────────────────────────────────────

function CompoundCard({
  compound, onEnd, onDelete, isActive,
}: {
  compound: CompoundLog;
  onEnd?: () => void;
  onDelete: () => void;
  isActive: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const days = daysBetween(compound.startDate, compound.endDate);
  const doseAmt = parseFloat(compound.doseAmount);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: "1px solid var(--t-border)" }}>
      <button className="w-full text-left px-4 py-3 flex items-start gap-3" onClick={() => setExpanded(e => !e)}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: (TYPE_META[compound.compoundType] ?? TYPE_META.Other).bg }}>
          {React.createElement((TYPE_META[compound.compoundType] ?? TYPE_META.Other).Icon, {
            className: "w-4 h-4",
            style: { color: (TYPE_META[compound.compoundType] ?? TYPE_META.Other).color },
          })}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-slate-800 truncate">{compound.compoundName}</p>
            <TypeBadge type={compound.compoundType} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            <span className="font-semibold">{doseAmt % 1 === 0 ? doseAmt : doseAmt.toFixed(3).replace(/\.?0+$/, "")}{compound.doseUnit}</span>
            {" · "}{compound.frequency} · {compound.route}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3 inline" />
            {formatDate(compound.startDate)}
            {compound.endDate ? ` → ${formatDate(compound.endDate)}` : " → ongoing"}
            {" · "}<Clock className="w-3 h-3 inline" />{days}d
          </p>
        </div>
        <div className="shrink-0 pt-0.5">
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-3 pt-1 border-t space-y-2.5" style={{ borderColor: "var(--t-border)" }}>
              {compound.notes && (
                <p className="text-xs text-slate-500 italic">{compound.notes}</p>
              )}
              <div className="flex gap-2">
                {isActive && onEnd && (
                  <button
                    onClick={onEnd}
                    className="flex-1 h-8 rounded-xl text-xs font-semibold transition-colors"
                    style={{ background: "var(--t-blue-08)", color: "var(--t-blue)", border: "1px solid var(--t-blue-20)" }}
                  >
                    End Protocol
                  </button>
                )}
                {confirmDelete ? (
                  <>
                    <button onClick={onDelete}
                      className="flex-1 h-8 rounded-xl text-xs font-bold text-white"
                      style={{ background: "#DC2626" }}>
                      Confirm Delete
                    </button>
                    <button onClick={() => setConfirmDelete(false)}
                      className="h-8 px-3 rounded-xl text-xs font-semibold bg-slate-100 text-slate-500">
                      Cancel
                    </button>
                  </>
                ) : (
                  <button onClick={() => setConfirmDelete(true)}
                    className="h-8 px-3 rounded-xl flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Log Compound Form ────────────────────────────────────────────────────────

function LogCompoundForm({ onClose }: { onClose: () => void }) {
  const today = new Date().toISOString().split("T")[0];
  const [type, setType] = useState<string>("Peptide");
  const [name, setName] = useState("");
  const [customName, setCustomName] = useState("");
  const [doseAmount, setDoseAmount] = useState("");
  const [doseUnit, setDoseUnit] = useState("mcg");
  const [frequency, setFrequency] = useState("Daily");
  const [route, setRoute] = useState("SubQ");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const createMut = useCreateCompound();

  const effectiveName = name === "__custom__" ? customName : name;

  const presets = PRESET_COMPOUNDS[type] ?? [];

  function handleTypeChange(t: string) {
    setType(t);
    setName("");
    setCustomName("");
    if (t === "Peptide") { setDoseUnit("mcg"); setRoute("SubQ"); }
    else if (t === "AAS" || t === "TRT") { setDoseUnit("mg"); setRoute("IM"); }
    else { setDoseUnit("mg"); setRoute("Oral"); }
  }

  async function handleSubmit() {
    setSaveError(null);
    const finalName = effectiveName.trim();
    if (!finalName) { setSaveError("Enter a compound name"); return; }
    const amt = parseFloat(doseAmount);
    if (!doseAmount || isNaN(amt) || amt <= 0) { setSaveError("Enter a valid dose amount"); return; }

    const payload: CreateCompoundPayload = {
      compoundName: finalName,
      compoundType: type,
      doseAmount: amt,
      doseUnit,
      frequency,
      route,
      startDate,
      endDate: endDate || null,
      notes: notes || null,
    };
    try {
      await createMut.mutateAsync(payload);
      onClose();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "var(--t-bg)" }}
    >
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100">
              <X className="w-4 h-4 text-slate-600" />
            </button>
            <h2 className="text-sm font-bold text-slate-800">Log Compound</h2>
          </div>
          <button
            onClick={handleSubmit}
            disabled={createMut.isPending}
            className="h-9 px-4 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50"
            style={{ background: "var(--t-blue)" }}
          >
            {createMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            Save
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-10">
          {/* Type selector */}
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3" style={{ border: "1px solid var(--t-border)" }}>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Type</label>
            <div className="grid grid-cols-5 gap-1.5">
              {TYPES.map(t => {
                const m = TYPE_META[t];
                const Icon = m.Icon;
                return (
                  <button key={t} onClick={() => handleTypeChange(t)}
                    className="flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all"
                    style={type === t
                      ? { background: m.bg, color: m.color, border: `1px solid ${m.color}40` }
                      : { background: "var(--t-surface2)", color: "var(--t-muted)", border: "1px solid var(--t-border)" }}>
                    <Icon className="w-4 h-4" />
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3" style={{ border: "1px solid var(--t-border)" }}>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Compound Name</label>
            {presets.length > 0 && (
              <select
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full h-11 rounded-xl border px-3 text-sm bg-slate-50 focus:outline-none focus:border-blue-200"
                style={{ borderColor: "var(--t-border)" }}
              >
                <option value="">Select from list…</option>
                {presets.map(p => <option key={p} value={p}>{p}</option>)}
                <option value="__custom__">+ Custom name</option>
              </select>
            )}
            {(name === "__custom__" || presets.length === 0) && (
              <input
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="Enter compound name"
                className="w-full h-11 rounded-xl border px-4 text-sm bg-slate-50 focus:outline-none focus:border-blue-200"
                style={{ borderColor: "var(--t-border)" }}
              />
            )}
          </div>

          {/* Dose */}
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3" style={{ border: "1px solid var(--t-border)" }}>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Dose Per Administration</label>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                placeholder="0"
                value={doseAmount}
                onChange={e => setDoseAmount(e.target.value)}
                className="flex-1 h-11 rounded-xl border px-4 text-sm font-mono bg-slate-50 focus:outline-none focus:border-blue-200"
                style={{ borderColor: "var(--t-border)" }}
              />
              <select
                value={doseUnit}
                onChange={e => setDoseUnit(e.target.value)}
                className="w-24 h-11 rounded-xl border px-2 text-sm bg-slate-50 focus:outline-none focus:border-blue-200"
                style={{ borderColor: "var(--t-border)" }}
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Frequency + Route */}
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3" style={{ border: "1px solid var(--t-border)" }}>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Frequency</label>
              <div className="flex flex-wrap gap-1.5">
                {FREQUENCIES.map(f => (
                  <button key={f} onClick={() => setFrequency(f)}
                    className="px-3 h-8 rounded-lg text-xs font-semibold transition-all"
                    style={frequency === f
                      ? { background: "var(--t-blue)", color: "white" }
                      : { background: "var(--t-surface2)", color: "var(--t-muted)" }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Route</label>
              <div className="flex flex-wrap gap-1.5">
                {ROUTES.map(r => (
                  <button key={r} onClick={() => setRoute(r)}
                    className="px-3 h-8 rounded-lg text-xs font-semibold transition-all"
                    style={route === r
                      ? { background: "var(--t-blue)", color: "white" }
                      : { background: "var(--t-surface2)", color: "var(--t-muted)" }}>
                    {r}
                  </button>
                ))}
              </div>
              {route && (
                <p className="text-[11px] mt-1.5 leading-snug" style={{ color: "var(--t-muted)" }}>
                  {route === "SubQ"    && "Inject into subcutaneous fat — abdomen or outer thigh at 45°"}
                  {route === "IM"      && "Inject intramuscularly — glute, quad or delt at 90°"}
                  {route === "Oral"    && "Take by mouth — follow fasting or food instructions for the compound"}
                  {route === "Nasal"   && "1–2 sprays per nostril — tilt head slightly forward, sniff gently"}
                  {route === "Topical" && "Apply to clean, dry skin — rotate application sites"}
                  {route === "Other"   && "Refer to compound-specific protocol for administration"}
                </p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3" style={{ border: "1px solid var(--t-border)" }}>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Start Date</label>
              <div className="w-full h-11 rounded-xl border px-4 flex items-center" style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)" }}>
                <DatePickerField
                  value={startDate}
                  onChange={setStartDate}
                  max={today}
                  placeholder="Pick start date"
                  style={{ width: "100%" }}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                End Date <span className="font-normal text-slate-300">(leave blank if still active)</span>
              </label>
              <div className="w-full h-11 rounded-xl border px-4 flex items-center" style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)" }}>
                <DatePickerField
                  value={endDate}
                  onChange={setEndDate}
                  min={startDate || undefined}
                  placeholder="Pick end date (optional)"
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl p-4 shadow-sm" style={{ border: "1px solid var(--t-border)" }}>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Notes <span className="font-normal text-slate-300">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Week 1–12 of cycle, blast phase, pinning glutes"
              className="w-full rounded-xl border px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-blue-200 resize-none"
              style={{ borderColor: "var(--t-border)" }}
            />
          </div>

          {saveError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(220,38,38,0.07)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.15)" }}>
              <AlertCircle className="w-4 h-4 shrink-0" />{saveError}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Compounds() {
  const [, setLocation] = useLocation();
  const { account, isLoading: authLoading } = useAccount();
  const { data: compounds = [], isLoading } = useCompounds();
  const updateMut = useUpdateCompound();
  const deleteMut = useDeleteCompound();
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!authLoading && !account) setLocation("/login");
  }, [authLoading, account, setLocation]);

  const active = useMemo(() => compounds.filter(c => !c.endDate), [compounds]);
  const history = useMemo(() => compounds.filter(c => !!c.endDate), [compounds]);

  if (authLoading || !account) return null;

  function handleEnd(id: string) {
    const today = new Date().toISOString().split("T")[0];
    updateMut.mutate({ id, endDate: today });
  }

  return (
    <div className="min-h-screen flex flex-col pb-24" style={{ background: "var(--t-bg)" }}>
      {/* Header */}
      <div className="relative overflow-hidden"
           style={{ background: "linear-gradient(135deg, var(--brand-navy) 0%, var(--brand-blue) 100%)" }}>
        <div className="absolute inset-0 opacity-10"
             style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white 0%, transparent 60%)" }} />
        <div className="relative px-5 pt-5 pb-6">
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setLocation("/account")}
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.12)" }}>
              <ArrowLeft className="w-4 h-4" style={{ color: "rgba(255,255,255,0.9)" }} />
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="h-9 px-4 rounded-xl flex items-center gap-1.5 text-sm font-semibold"
              style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.9)" }}
            >
              <Plus className="w-3.5 h-3.5" /> Log
            </button>
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1"
             style={{ color: "rgba(255,255,255,0.6)" }}>COMPOUNDS</p>
          <h1 className="text-2xl font-bold text-white leading-tight">Compounds & Protocols</h1>
        </div>
      </div>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-slate-300" />
          </div>
        ) : compounds.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-4"
              style={{ background: "rgba(22,163,74,0.08)" }}>
              <Syringe className="w-8 h-8 text-green-300" />
            </div>
            <p className="text-sm font-bold text-slate-700 mb-1">No compounds logged</p>
            <p className="text-xs text-slate-400 mb-6 max-w-[240px]">
              Track your peptide protocols, TRT, AAS cycles, and supplements all in one place.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="h-11 px-6 rounded-xl text-sm font-bold text-white flex items-center gap-2"
              style={{ background: "var(--t-blue)" }}
            >
              <Plus className="w-4 h-4" /> Log First Compound
            </button>
          </motion.div>
        ) : (
          <>
            {/* Stats */}
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-3 gap-2.5">
              {[
                { label: "Active", value: active.length, color: "#16A34A" },
                { label: "Past Cycles", value: history.length, color: "var(--t-subtle)" },
                { label: "Total", value: compounds.length, color: "var(--t-text)" },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl p-3 text-center shadow-sm" style={{ border: "1px solid var(--t-border)" }}>
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{s.label}</p>
                </div>
              ))}
            </motion.div>

            {/* Active protocols */}
            {active.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Protocols</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(22,163,74,0.1)", color: "#16A34A" }}>
                    {active.length} running
                  </span>
                </div>
                {active.map((c, i) => (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <CompoundCard
                      compound={c}
                      isActive={true}
                      onEnd={() => handleEnd(c.id)}
                      onDelete={() => deleteMut.mutate(c.id)}
                    />
                  </motion.div>
                ))}
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowHistory(h => !h)}
                  className="w-full flex items-center justify-between px-1"
                >
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Past Cycles ({history.length})</p>
                  {showHistory ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                </button>
                <AnimatePresence initial={false}>
                  {showHistory && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3">
                      {history.map((c, i) => (
                        <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                          <CompoundCard
                            compound={c}
                            isActive={false}
                            onDelete={() => deleteMut.mutate(c.id)}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </main>

      <BottomTabs active="account" />

      <AnimatePresence>
        {showForm && <LogCompoundForm onClose={() => setShowForm(false)} />}
      </AnimatePresence>
    </div>
  );
}
