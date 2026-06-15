import React, { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Clock, ChevronDown } from "lucide-react";
import { type CreateGlp1Payload } from "@/hooks/use-glp1";
import { DatePickerField } from "@/components/DatePickerField";

const GLP1_COMPOUNDS = [
  "Semaglutide", "Retatrutide", "Tirzepatide", "Liraglutide",
  "Dulaglutide", "Exenatide", "Albiglutide", "Oral Semaglutide",
  "CagriSema", "Survodutide", "Mazdutide", "Other",
];

const INJECTION_SITES = [
  { id: "abdomen-left",  label: "Abdomen – Left"   },
  { id: "abdomen-right", label: "Abdomen – Right"  },
  { id: "thigh-left",   label: "Thigh – Left"     },
  { id: "thigh-right",  label: "Thigh – Right"    },
  { id: "arm-left",     label: "Upper Arm – Left"  },
  { id: "arm-right",    label: "Upper Arm – Right" },
];

const TEAL       = "var(--t-blue)";
const PAGE_BG    = "#F2F2F7";
const CARD_BG    = "#FFFFFF";
const DIVIDER    = "#F2F2F7";
const BORDER_CLR = "#E5E5EA";
const LABEL_CLR  = "#8E8E93";
const TEXT_CLR   = "#1C1C1E";

const ST_TO_KG = 6.35029;

function wToKg(val: string, unit: "kg" | "st" | "lbs"): number | null {
  const n = parseFloat(val);
  if (isNaN(n) || n <= 0) return null;
  if (unit === "lbs") return Math.round(n / 2.20462 * 1000) / 1000;
  if (unit === "st")  return Math.round(n * ST_TO_KG * 1000) / 1000;
  return n;
}

interface Props {
  weightUnit: "kg" | "st" | "lbs";
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: CreateGlp1Payload) => Promise<void>;
}

export function Glp1ShotForm({ weightUnit, isSaving, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    loggedDate:    new Date().toISOString().split("T")[0],
    shotTime:      new Date().toTimeString().slice(0, 5),
    compoundName:  "Semaglutide",
    doseMg:        "",
    weight:        "",
    notes:         "",
    injectionSite: "",
  });
  const [painLevel, setPainLevel] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit() {
    setErr(null);
    if (!form.loggedDate || !form.compoundName || !form.doseMg) {
      setErr("Date, compound, and dose are required");
      return;
    }
    const doseMg = parseFloat(form.doseMg);
    if (isNaN(doseMg) || doseMg <= 0) {
      setErr("Enter a valid dose in mg");
      return;
    }
    if (!form.weight) {
      setErr("Weight is required to track your progress");
      return;
    }
    const wKg = wToKg(form.weight, weightUnit);
    if (wKg == null) {
      setErr("Enter a valid weight");
      return;
    }
    const timePrefix = form.shotTime ? `Shot at ${form.shotTime}` : null;
    const notesVal = [timePrefix, form.notes || null].filter(Boolean).join(" · ") || null;
    try {
      await onSave({
        loggedDate:    form.loggedDate,
        compoundName:  form.compoundName,
        doseMg,
        weightKg:      wKg,
        weightUnit,
        notes:         notesVal,
        injectionSite: form.injectionSite || null,
        sideEffects:   null,
        calories:      null,
        proteinG:      null,
        waterMl:       null,
      });
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to save entry");
    }
  }

  return (
    <motion.div
      key="add-shot-overlay"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: PAGE_BG }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ background: CARD_BG, borderBottom: `1px solid ${BORDER_CLR}` }}>
        <button
          onClick={onClose}
          className="text-sm font-medium w-16"
          style={{ color: TEAL }}>
          Cancel
        </button>
        <p className="text-base font-semibold" style={{ color: TEXT_CLR }}>Add Shot</p>
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="text-sm font-semibold w-16 text-right"
          style={{ color: TEAL, opacity: isSaving ? 0.5 : 1 }}>
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-10">
        {err && (
          <div className="mx-4 mt-3 flex items-center gap-2 p-3 rounded-xl text-xs font-medium"
            style={{ background: "rgba(220,38,38,0.08)", color: "#DC2626" }}>
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {err}
          </div>
        )}

        {/* TIME TAKEN */}
        <p className="mx-4 mt-5 mb-2 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: LABEL_CLR }}>Time Taken</p>
        <div className="mx-4 rounded-2xl overflow-hidden"
          style={{ background: CARD_BG, border: `1px solid ${BORDER_CLR}` }}>
          <div className="px-4 py-3.5" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
            <p className="text-[10px] font-medium mb-2" style={{ color: LABEL_CLR }}>Date</p>
            <DatePickerField
              value={form.loggedDate}
              onChange={val => setForm(f => ({ ...f, loggedDate: val }))}
              placeholder="Select shot date"
            />
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Clock className="w-4 h-4 shrink-0" style={{ color: TEAL }} />
            <div className="flex-1">
              <p className="text-[10px] font-medium mb-0.5" style={{ color: LABEL_CLR }}>Time</p>
              <input
                type="time"
                value={form.shotTime}
                onChange={e => setForm(f => ({ ...f, shotTime: e.target.value }))}
                className="w-full text-sm font-medium bg-transparent outline-none"
                style={{ color: TEXT_CLR }}
              />
            </div>
          </div>
        </div>

        {/* DETAILS */}
        <p className="mx-4 mt-5 mb-2 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: LABEL_CLR }}>Details</p>
        <div className="mx-4 rounded-2xl overflow-hidden"
          style={{ background: CARD_BG, border: `1px solid ${BORDER_CLR}` }}>

          {/* Medication Name */}
          <div className="flex items-center gap-3 px-4 py-3.5"
            style={{ borderBottom: `1px solid ${DIVIDER}` }}>
            <div className="flex-1">
              <p className="text-[10px] font-medium mb-0.5" style={{ color: LABEL_CLR }}>Medication Name</p>
              <select
                value={form.compoundName}
                onChange={e => setForm(f => ({ ...f, compoundName: e.target.value }))}
                className="w-full text-sm font-medium bg-transparent outline-none appearance-none"
                style={{ color: TEXT_CLR }}>
                {GLP1_COMPOUNDS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <ChevronDown className="w-4 h-4 shrink-0" style={{ color: LABEL_CLR }} />
          </div>

          {/* Dosage Strength */}
          <div className="flex items-center gap-3 px-4 py-3.5"
            style={{ borderBottom: `1px solid ${DIVIDER}` }}>
            <div className="flex-1">
              <p className="text-[10px] font-medium mb-1" style={{ color: LABEL_CLR }}>Dosage Strength</p>
              <div className="flex items-center gap-2">
                <input
                  type="text" inputMode="decimal" pattern="[0-9.]*"
                  value={form.doseMg}
                  onChange={e => setForm(f => ({ ...f, doseMg: e.target.value }))}
                  placeholder="e.g. 2.5"
                  className="flex-1 text-sm font-medium bg-transparent outline-none"
                  style={{ color: TEXT_CLR }}
                />
                <span className="text-xs font-semibold shrink-0" style={{ color: LABEL_CLR }}>mg</span>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 shrink-0" style={{ color: LABEL_CLR }} />
          </div>

          {/* Injection Site */}
          <div className="flex items-center gap-3 px-4 py-3.5"
            style={{ borderBottom: `1px solid ${DIVIDER}` }}>
            <div className="flex-1">
              <p className="text-[10px] font-medium mb-0.5" style={{ color: LABEL_CLR }}>Injection Site</p>
              <select
                value={form.injectionSite}
                onChange={e => setForm(f => ({ ...f, injectionSite: e.target.value }))}
                className="w-full text-sm font-medium bg-transparent outline-none appearance-none"
                style={{ color: form.injectionSite ? TEXT_CLR : LABEL_CLR }}>
                <option value="">Select site</option>
                {INJECTION_SITES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <ChevronDown className="w-4 h-4 shrink-0" style={{ color: LABEL_CLR }} />
          </div>

          {/* Pain Level */}
          <div className="px-4 py-3.5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-medium" style={{ color: LABEL_CLR }}>Pain Level</p>
              <span className="text-xs font-bold" style={{ color: TEXT_CLR }}>{painLevel}</span>
            </div>
            <input
              type="range" min="0" max="10" step="1"
              value={painLevel}
              onChange={e => setPainLevel(Number(e.target.value))}
              className="w-full h-1.5 rounded-full outline-none"
              style={{ accentColor: TEAL }}
            />
            <div className="flex justify-between mt-1">
              <span className="text-[9px]" style={{ color: LABEL_CLR }}>None</span>
              <span className="text-[9px]" style={{ color: LABEL_CLR }}>Severe</span>
            </div>
          </div>
        </div>

        {/* WEIGHT */}
        <p className="mx-4 mt-5 mb-2 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: LABEL_CLR }}>Weight</p>
        <div className="mx-4 rounded-2xl overflow-hidden"
          style={{ background: CARD_BG, border: `1px solid ${BORDER_CLR}` }}>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex-1">
              <p className="text-[10px] font-medium mb-0.5" style={{ color: LABEL_CLR }}>Weight ({weightUnit})</p>
              <input
                type="text" inputMode="decimal" pattern="[0-9.]*"
                value={form.weight}
                onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                placeholder={`Enter weight in ${weightUnit}`}
                className="w-full text-sm font-medium bg-transparent outline-none"
                style={{ color: TEXT_CLR }}
              />
            </div>
          </div>
        </div>

        {/* SHOT NOTES */}
        <p className="mx-4 mt-5 mb-2 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: LABEL_CLR }}>Shot Notes</p>
        <div className="mx-4 rounded-2xl overflow-hidden"
          style={{ background: CARD_BG, border: `1px solid ${BORDER_CLR}`, borderLeft: `3px solid ${TEAL}` }}>
          <textarea
            rows={4}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="How did you feel? Any side effects?"
            className="w-full px-4 py-3.5 text-sm bg-transparent outline-none resize-none"
            style={{ color: TEXT_CLR }}
          />
        </div>
      </div>
    </motion.div>
  );
}
