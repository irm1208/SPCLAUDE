import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TestTube, Search, Plus, Pencil, Trash2, X, CheckCircle2, XCircle,
  Loader2, ExternalLink, Save, RefreshCw, Clock, ThumbsUp, ShieldCheck,
  Star, Building2, Tag, Sparkles, Zap, StopCircle, AlertCircle,
  Upload, ChevronDown, ChevronUp, Link2, Download, GitCompare, Eye, FileText,
} from "lucide-react";
import { Button, Input, Label, Card } from "@/components/ui";
import { getCanonicalGroup } from "@/lib/peptide-groups";
import { UTHER_BATCH_CODES } from "@/lib/uther-batch-codes";


function isHGH(name: string): boolean {
  const group = getCanonicalGroup(name);
  return group?.canonical === "HGH";
}

function purityColorClass(pct: number, peptideName: string): string {
  if (isHGH(peptideName)) return pct >= 96 ? "text-green-600" : "text-red-600";
  return pct >= 98 ? "text-green-600" : pct >= 95 ? "text-blue-600" : "text-red-600";
}

const LAB_NAMES = ["Janoshik", "Uzorak", "Peptidetest", "Testides", "Chromate", "Analiza Bialek"];
const TEST_TYPE_LABELS: Record<string, string> = {
  mass_purity: "Mass & Purity",
  mass: "Mass",
  endotoxin: "Endotoxin",
  sterility: "Sterility",
  heavy_metals: "Heavy Metals",
  lcms: "LCMS",
};
const CATEGORY_LABELS: Record<string, string> = {
  peptide: "Peptide",
  pill: "Pill",
  aas: "AAS",
  other: "Other",
};

interface LabTest {
  id: number;
  janoshikId: string | null;
  url: string;
  peptideName: string;
  nominalDose: string | null;
  mgAmount: number | null;
  massUnit: string | null;
  supplier: string;
  batchCode: string | null;
  labName: string;
  testType: string | null;
  productCategory: string | null;
  purityPct: number | null;
  endotoxinEuMg: number | null;
  sterilityPass: boolean | null;
  testDate: string | null;
  notes: string | null;
  isThirdPartyTest: boolean;
  pending: boolean;
  submittedBy: string | null;
  createdAt: string;
  heavyMetalAs: string | null;
  heavyMetalCd: string | null;
  heavyMetalPb: string | null;
  heavyMetalHg: string | null;
  aiExtracted: boolean;
  aiExtractedAt: string | null;
  blendComponents: string | null;
}


function blendJsonToText(json: string | null | undefined): string {
  if (!json) return "";
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return "";
    return arr.map((c: { name: string; mg: number; unit?: string; purityPct?: number }) => {
      let line = `${c.name}: ${c.mg}${c.unit ? " " + c.unit : ""}`;
      if (c.purityPct != null) line += `, ${c.purityPct}%`;
      return line;
    }).join("\n");
  } catch { return ""; }
}

function blendTextToJson(text: string): string | null {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const arr = lines.map(line => {
    // Format: "Name: mg" OR "Name: mg, purity%"
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) return null;
    const name = line.slice(0, colonIdx).trim();
    const rest = line.slice(colonIdx + 1).trim();
    // Split on comma to get optional purity
    const parts = rest.split(",").map(p => p.trim());
    const mg = parseFloat(parts[0]);
    if (!name || !isFinite(mg)) return null;
    const entry: { name: string; mg: number; purityPct?: number } = { name, mg };
    if (parts[1]) {
      const pct = parseFloat(parts[1].replace("%", ""));
      if (isFinite(pct)) entry.purityPct = pct;
    }
    return entry;
  }).filter(Boolean);
  return arr.length > 0 ? JSON.stringify(arr) : null;
}

interface BatchJob {
  status: "idle" | "running" | "done" | "error";
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  startedAt: number | null;
  finishedAt: number | null;
  errors: Array<{ id: number; url: string; reason: string }>;
  currentId: number | null;
}

interface BulkImportJob {
  status: "idle" | "running" | "done" | "error";
  total: number;
  processed: number;
  imported: number;
  skipped: number;
  failed: number;
  startedAt: number | null;
  finishedAt: number | null;
  errors: Array<{ url: string; reason: string }>;
  results: Array<{ url: string; id: number; peptideName: string; purityPct: number | null }>;
}

function apiUrl(path: string) { return `/api${path}`; }

// ── Edit / Add modal ──────────────────────────────────────────────────────────
function EditModal({ test, secret, onClose, onSaved }: {
  test: LabTest | null;
  secret: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = test === null;
  const [form, setForm] = useState({
    url: test?.url ?? "",
    peptideName: test?.peptideName ?? "",
    nominalDose: test?.nominalDose ?? "",
    mgAmount: test?.mgAmount?.toString() ?? "",
    massUnit: test?.massUnit ?? "mg",
    supplier: test?.supplier ?? "Uther",
    labName: test?.labName ?? "Janoshik",
    testType: test?.testType ?? "",
    productCategory: test?.productCategory ?? "",
    batchCode: test?.batchCode ?? "",
    purityPct: test?.purityPct?.toString() ?? "",
    endotoxinEuMg: test?.endotoxinEuMg?.toString() ?? "",
    sterilityPass: test?.sterilityPass === null ? "" : test?.sterilityPass ? "true" : "false",
    testDate: test?.testDate ?? "",
    notes: test?.notes ?? "",
    heavyMetalAs: test?.heavyMetalAs ?? "",
    heavyMetalCd: test?.heavyMetalCd ?? "",
    heavyMetalPb: test?.heavyMetalPb ?? "",
    heavyMetalHg: test?.heavyMetalHg ?? "",
    blendComponentsText: blendJsonToText(test?.blendComponents),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pdfMode, setPdfMode] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [batchPrefixes, setBatchPrefixes] = useState<{ prefix: string; compoundName: string; nominalDose: string }[]>([]);
  useEffect(() => {
    fetch(apiUrl("/admin/batch-code-prefixes"), { headers: { "x-admin-secret": secret } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setBatchPrefixes(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [secret]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleExtract = async () => {
    if (!form.url.trim()) { setError("Enter a URL first"); return; }
    setExtracting(true); setError(""); setExtractResult(null);
    try {
      const res = await fetch(apiUrl("/admin/lab-tests/extract-preview"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ url: form.url.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setExtractResult({ ok: false, msg: d.error ?? "Extraction failed" }); return; }
      const ex = d.extracted;
      // Derive blendComponentsText from extracted blend_components
      let extractedBlendText = "";
      if (Array.isArray(ex.blendComponents) && ex.blendComponents.length > 0) {
        extractedBlendText = ex.blendComponents
          .map((c: { name: string; mg: number; unit?: string; purityPct?: number }) => {
            let line = `${c.name}: ${c.mg}`;
            if (c.purityPct != null) line += `, ${c.purityPct}%`;
            return line;
          })
          .join("\n");
      }
      const newBatchCode = ex.batchCode?.trim() || "";
      setForm(f => {
        return {
          ...f,
          peptideName: ex.compoundName?.trim() || f.peptideName,
          purityPct: ex.purityPct != null ? String(ex.purityPct) : f.purityPct,
          mgAmount: ex.mgAmount != null ? String(ex.mgAmount) : f.mgAmount,
          endotoxinEuMg: ex.endotoxinEuMg != null ? String(ex.endotoxinEuMg) : f.endotoxinEuMg,
          sterilityPass: ex.sterilityPass != null ? String(ex.sterilityPass) : f.sterilityPass,
          testDate: ex.testDate?.trim() || f.testDate,
          batchCode: newBatchCode || f.batchCode,
          testType: ex.testType || f.testType,
          productCategory: ex.productCategory || f.productCategory,
          heavyMetalAs: ex.heavyMetalAs?.trim() || f.heavyMetalAs,
          heavyMetalCd: ex.heavyMetalCd?.trim() || f.heavyMetalCd,
          heavyMetalPb: ex.heavyMetalPb?.trim() || f.heavyMetalPb,
          heavyMetalHg: ex.heavyMetalHg?.trim() || f.heavyMetalHg,
          blendComponentsText: extractedBlendText || f.blendComponentsText,
        };
      });
      setExtractResult({ ok: true, msg: `Extracted with ${ex.confidence} confidence — review and save` });
    } catch { setExtractResult({ ok: false, msg: "Network error" }); }
    finally { setExtracting(false); }
  };

  const handleExtractPdf = async () => {
    if (!pdfFile) { setError("Select a PDF first"); return; }
    setExtracting(true); setError(""); setExtractResult(null);
    try {
      const fd = new FormData();
      fd.append("file", pdfFile);
      const res = await fetch(apiUrl("/admin/lab-tests/extract-pdf"), {
        method: "POST",
        headers: { "x-admin-secret": secret },
        body: fd,
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setExtractResult({ ok: false, msg: d.error ?? "Extraction failed" }); return; }
      const ex = d.extracted;
      let extractedBlendText = "";
      if (Array.isArray(ex.blendComponents) && ex.blendComponents.length > 0) {
        extractedBlendText = ex.blendComponents
          .map((c: { name: string; mg: number; unit?: string; purityPct?: number }) => {
            let line = `${c.name}: ${c.mg}`;
            if (c.purityPct != null) line += `, ${c.purityPct}%`;
            return line;
          })
          .join("\n");
      }
      setForm(f => ({
        ...f,
        peptideName: ex.compoundName?.trim() || f.peptideName,
        purityPct: ex.purityPct != null ? String(ex.purityPct) : f.purityPct,
        mgAmount: ex.mgAmount != null ? String(ex.mgAmount) : f.mgAmount,
        endotoxinEuMg: ex.endotoxinEuMg != null ? String(ex.endotoxinEuMg) : f.endotoxinEuMg,
        sterilityPass: ex.sterilityPass != null ? String(ex.sterilityPass) : f.sterilityPass,
        testDate: ex.testDate?.trim() || f.testDate,
        batchCode: ex.batchCode?.trim() || f.batchCode,
        testType: ex.testType || f.testType,
        productCategory: ex.productCategory || f.productCategory,
        heavyMetalAs: ex.heavyMetalAs?.trim() || f.heavyMetalAs,
        heavyMetalCd: ex.heavyMetalCd?.trim() || f.heavyMetalCd,
        heavyMetalPb: ex.heavyMetalPb?.trim() || f.heavyMetalPb,
        heavyMetalHg: ex.heavyMetalHg?.trim() || f.heavyMetalHg,
        blendComponentsText: extractedBlendText || f.blendComponentsText,
      }));
      setExtractResult({ ok: true, msg: `Extracted with ${ex.confidence} confidence — review and save` });
    } catch { setExtractResult({ ok: false, msg: "Network error" }); }
    finally { setExtracting(false); }
  };

  const handleSave = async () => {
    if (!pdfMode && !form.url.trim() && isNew) { setError("URL is required"); return; }
    if (pdfMode && isNew && !pdfFile) { setError("Please select a PDF file"); return; }
    if (!form.peptideName.trim()) { setError("Peptide name is required"); return; }
    setSaving(true); setError("");
    const blendJson = blendTextToJson(form.blendComponentsText);
    const body: Record<string, unknown> = {
      peptideName: form.peptideName.trim(),
      nominalDose: form.nominalDose.trim() || null,
      supplier: form.supplier.trim() || "Uther",
      labName: form.labName.trim() || "Janoshik",
      testType: form.testType || null,
      productCategory: form.productCategory || null,
      mgAmount: form.mgAmount ? parseFloat(form.mgAmount) : null,
      massUnit: form.massUnit || "mg",
      batchCode: form.batchCode.trim() || null,
      purityPct: form.purityPct ? parseFloat(form.purityPct) : null,
      endotoxinEuMg: form.endotoxinEuMg ? parseFloat(form.endotoxinEuMg) : null,
      sterilityPass: form.sterilityPass === "true" ? true : form.sterilityPass === "false" ? false : null,
      testDate: form.testDate.trim() || null,
      notes: form.notes.trim() || null,
      heavyMetalAs: form.heavyMetalAs.trim() || null,
      heavyMetalCd: form.heavyMetalCd.trim() || null,
      heavyMetalPb: form.heavyMetalPb.trim() || null,
      heavyMetalHg: form.heavyMetalHg.trim() || null,
      blendComponents: blendJson ? JSON.parse(blendJson) : null,
    };
    try {
      let res: Response;
      if (isNew && pdfMode) {
        const fd = new FormData();
        fd.append("file", pdfFile!);
        Object.entries(body).forEach(([k, v]) => {
          if (v != null) fd.append(k, typeof v === "object" ? JSON.stringify(v) : String(v));
        });
        res = await fetch(apiUrl("/admin/lab-tests/with-pdf"), {
          method: "POST",
          headers: { "x-admin-secret": secret },
          body: fd,
        });
      } else {
        if (isNew) body.url = form.url.trim();
        res = await fetch(
          isNew ? apiUrl("/admin/lab-tests") : apiUrl(`/admin/lab-tests/${test!.id}`),
          { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json", "x-admin-secret": secret }, body: JSON.stringify(body) }
        );
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Save failed");
        return;
      }
      onSaved();
      onClose();
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  };

  const fieldClass = "bg-slate-800 border-slate-600 text-white placeholder-slate-500 text-sm";
  const selectStyle = { background: "#27272A", borderColor: "rgba(255,255,255,0.15)", color: "white" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg rounded-xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ background: "#27272A", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h3 className="text-white font-bold">{isNew ? "Add Lab Test" : "Edit Lab Test"}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          {isNew && (
            <div className="flex flex-col gap-2">
              {/* Mode toggle */}
              <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
                <button
                  type="button"
                  onClick={() => { setPdfMode(false); setExtractResult(null); setPdfFile(null); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-all ${!pdfMode ? "text-white bg-indigo-600" : "text-white/50 hover:text-white/80"}`}
                >
                  <Link2 className="w-3 h-3" /> URL
                </button>
                <button
                  type="button"
                  onClick={() => { setPdfMode(true); setExtractResult(null); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-all ${pdfMode ? "text-white bg-indigo-600" : "text-white/50 hover:text-white/80"}`}
                >
                  <Upload className="w-3 h-3" /> Upload PDF
                </button>
              </div>

              {pdfMode ? (
                <div className="flex flex-col gap-2">
                  <label className="block cursor-pointer">
                    <div className={`border-2 border-dashed rounded-xl px-4 py-5 text-center transition-all ${
                      pdfFile ? "border-emerald-500/50 bg-emerald-900/10" : "border-white/10 hover:border-indigo-500/50 hover:bg-indigo-900/10"
                    }`}>
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={e => { const f = e.target.files?.[0]; if (f) { setPdfFile(f); setExtractResult(null); } }}
                      />
                      {pdfFile ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <FileText className="w-5 h-5 text-emerald-400" />
                          <p className="text-emerald-300 text-sm font-medium truncate max-w-full">{pdfFile.name}</p>
                          <p className="text-white/40 text-xs">{(pdfFile.size / 1024).toFixed(0)} KB — click to change</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5">
                          <Upload className="w-5 h-5 text-white/30" />
                          <p className="text-white/50 text-sm">Click to select PDF or image</p>
                          <p className="text-white/30 text-xs">PDF, JPEG, PNG, WebP — max 20 MB</p>
                        </div>
                      )}
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={handleExtractPdf}
                    disabled={extracting || !pdfFile}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-40 transition-all"
                    style={{ background: extracting ? "#6D28D9" : "linear-gradient(135deg,#7C3AED,#4F46E5)" }}
                  >
                    {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {extracting ? "Extracting…" : "Extract with AI"}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <Label className="text-white/70 text-xs">Report URL *</Label>
                  <div className="flex gap-2">
                    <Input value={form.url} onChange={set("url")} placeholder="https://janoshik.com/tests/..." className={fieldClass + " flex-1"} />
                    <button
                      type="button"
                      onClick={handleExtract}
                      disabled={extracting || !form.url.trim()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white whitespace-nowrap disabled:opacity-40 transition-all"
                      style={{ background: extracting ? "#6D28D9" : "linear-gradient(135deg,#7C3AED,#4F46E5)" }}
                    >
                      {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {extracting ? "Reading…" : "Extract with AI"}
                    </button>
                  </div>
                </div>
              )}

              {extractResult && (
                <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${extractResult.ok ? "bg-emerald-900/40 border border-emerald-700/40 text-emerald-300" : "bg-red-900/40 border border-red-700/40 text-red-300"}`}>
                  {extractResult.ok ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                  {extractResult.msg}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-white/70 text-xs mb-1.5">Compound Name *</Label>
              <Input value={form.peptideName} onChange={set("peptideName")} placeholder="e.g. BPC-157" className={fieldClass} />
            </div>
            <div className="col-span-2">
              <Label className="text-white/70 text-xs mb-1.5">Nominal Dose</Label>
              <Input value={form.nominalDose} onChange={set("nominalDose")} placeholder="e.g. 10mg" className={fieldClass} />
            </div>
            <div>
              <Label className="text-white/70 text-xs mb-1.5">Vendor / Supplier</Label>
              <Input value={form.supplier} onChange={set("supplier")} placeholder="Uther" className={fieldClass} />
            </div>
            <div>
              <Label className="text-white/70 text-xs mb-1.5">Lab</Label>
              <select value={form.labName} onChange={set("labName")}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={selectStyle}>
                {LAB_NAMES.map(l => <option key={l} value={l}>{l}</option>)}
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <Label className="text-white/70 text-xs mb-1.5">Test Type</Label>
              <select value={form.testType} onChange={set("testType")}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={selectStyle}>
                <option value="">Unknown / Mixed</option>
                {Object.entries(TEST_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-white/70 text-xs mb-1.5">Category</Label>
              <select value={form.productCategory} onChange={set("productCategory")}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={selectStyle}>
                <option value="">Unknown</option>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-white/70 text-xs mb-1.5">Batch Code</Label>
              <Input
                value={form.batchCode}
                onChange={e => {
                  const val = e.target.value;
                  const rawPrefix = val.split("-")[0].toUpperCase();
                  const match = batchPrefixes.find(p => p.prefix.toUpperCase() === rawPrefix);
                  setForm(f => ({
                    ...f,
                    batchCode: val,
                    peptideName: match ? match.compoundName : f.peptideName,
                    nominalDose: match ? (match.nominalDose || f.nominalDose) : f.nominalDose,
                  }));
                }}
                placeholder="ZE10-0318"
                className={fieldClass}
              />
              {form.supplier.toLowerCase() === "uther" && form.batchCode.trim() && (() => {
                const canonical = UTHER_BATCH_CODES[form.batchCode.trim().toUpperCase()];
                return canonical ? (
                  <p className="text-[10px] text-amber-400 mt-1">
                    Uther code → <span className="font-bold">{canonical}</span> (name will be auto-set on save)
                  </p>
                ) : null;
              })()}
            </div>
          </div>

          <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--t-blue-08)", border: "1px solid var(--t-blue-15)" }}>
            <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">CoA Values (from report image)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/70 text-xs mb-1.5">Purity %</Label>
                <Input value={form.purityPct} onChange={set("purityPct")} placeholder="99.2" type="number" step="0.1" className={fieldClass} />
              </div>
              <div>
                <Label className="text-white/70 text-xs mb-1.5">Endotoxin (EU/Vial)</Label>
                <Input value={form.endotoxinEuMg} onChange={set("endotoxinEuMg")} placeholder="0.3" type="number" step="0.01" className={fieldClass} />
              </div>
            </div>
            <div>
              <Label className="text-white/70 text-xs mb-1.5">Mass</Label>
              <div className="flex gap-1.5">
                <Input value={form.mgAmount} onChange={set("mgAmount")} placeholder="10" type="number" className={fieldClass + " flex-1"} />
                <select value={form.massUnit} onChange={set("massUnit")}
                  className="px-2 py-2 rounded-lg border text-sm outline-none" style={selectStyle}>
                  <option value="mg">mg</option>
                  <option value="IU">IU</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/70 text-xs mb-1.5">Sterility</Label>
                <select value={form.sterilityPass} onChange={set("sterilityPass")}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={selectStyle}>
                  <option value="">— not tested —</option>
                  <option value="true">Pass ✓</option>
                  <option value="false">Fail ✗</option>
                </select>
              </div>
              <div>
                <Label className="text-white/70 text-xs mb-1.5">Test Date</Label>
                <Input value={form.testDate} onChange={set("testDate")} placeholder="Jan 2025" className={fieldClass} />
              </div>
            </div>
            {form.testType === "heavy_metals" && (
              <>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mt-1">Heavy Metals (As / Cd / Pb / Hg)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-white/70 text-xs mb-1.5">As (Arsenic)</Label>
                    <Input value={form.heavyMetalAs} onChange={set("heavyMetalAs")} placeholder="not detected" className={fieldClass} />
                  </div>
                  <div>
                    <Label className="text-white/70 text-xs mb-1.5">Cd (Cadmium)</Label>
                    <Input value={form.heavyMetalCd} onChange={set("heavyMetalCd")} placeholder="not detected" className={fieldClass} />
                  </div>
                  <div>
                    <Label className="text-white/70 text-xs mb-1.5">Pb (Lead)</Label>
                    <Input value={form.heavyMetalPb} onChange={set("heavyMetalPb")} placeholder="not detected" className={fieldClass} />
                  </div>
                  <div>
                    <Label className="text-white/70 text-xs mb-1.5">Hg (Mercury)</Label>
                    <Input value={form.heavyMetalHg} onChange={set("heavyMetalHg")} placeholder="not detected" className={fieldClass} />
                  </div>
                </div>
              </>
            )}
          </div>

          <div>
            <Label className="text-white/70 text-xs mb-1.5">Notes</Label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional internal notes…"
              rows={2}
              className={`w-full px-3 py-2 rounded-lg border resize-none text-sm outline-none ${fieldClass}`}
              style={{ background: "#18181B", borderColor: "rgba(255,255,255,0.1)" }}
            />
          </div>

          <div>
            <Label className="text-white/70 text-xs mb-1.5">Blend Components (for multi-compound reports)</Label>
            <textarea
              value={form.blendComponentsText}
              onChange={e => setForm(f => ({ ...f, blendComponentsText: e.target.value }))}
              placeholder={"One component per line:\nName: mg\n  or with purity:\nGHK-CU: 60.25, 99.1%\nBPC-157: 11.22, 98.5%\nTB-500: 11.40, 97.8%"}
              rows={4}
              className={`w-full px-3 py-2 rounded-lg border resize-none text-sm font-mono outline-none ${fieldClass}`}
              style={{ background: "#18181B", borderColor: "rgba(255,255,255,0.1)" }}
            />
            <p className="text-[10px] text-white/30 mt-1">Format: Name: mg[, purity%] — one per line. AI extracts per-component mass & purity from blend CoAs.</p>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 border-slate-600 text-white/60" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button className="flex-1 flex items-center gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isNew ? "Add Test" : "Save"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Pending submission card ───────────────────────────────────────────────────
function ApproveModal({ test, secret, onClose, onApproved }: {
  test: LabTest; secret: string; onClose: () => void; onApproved: () => void;
}) {
  const [form, setForm] = useState({
    peptideName: test.peptideName ?? "",
    purityPct: test.purityPct?.toString() ?? "",
    endotoxinEuMg: test.endotoxinEuMg?.toString() ?? "",
    sterilityPass: test.sterilityPass === null ? "" : test.sterilityPass ? "true" : "false",
    testDate: test.testDate ?? "",
    notes: test.notes ?? "",
    heavyMetalAs: test.heavyMetalAs ?? "",
    heavyMetalCd: test.heavyMetalCd ?? "",
    heavyMetalPb: test.heavyMetalPb ?? "",
    heavyMetalHg: test.heavyMetalHg ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
  const isHeavyMetals = test.testType === "heavy_metals";

  const handleApprove = async () => {
    setSaving(true); setError("");
    try {
      const body: Record<string, unknown> = {
        peptideName: form.peptideName.trim(),
        testDate: form.testDate.trim() || null,
        notes: form.notes.trim() || null,
        purityPct: form.purityPct ? parseFloat(form.purityPct) : null,
        endotoxinEuMg: form.endotoxinEuMg ? parseFloat(form.endotoxinEuMg) : null,
        sterilityPass: form.sterilityPass === "true" ? true : form.sterilityPass === "false" ? false : null,
        heavyMetalAs: form.heavyMetalAs.trim() || null,
        heavyMetalCd: form.heavyMetalCd.trim() || null,
        heavyMetalPb: form.heavyMetalPb.trim() || null,
        heavyMetalHg: form.heavyMetalHg.trim() || null,
      };
      const res = await fetch(apiUrl(`/admin/lab-tests/${test.id}/approve`), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      onApproved();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const fieldClass = "h-8 text-xs rounded-lg px-2.5";
  const labelClass = "text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Approve Submission</h3>
            <p className="text-xs text-slate-400">{test.peptideName} · {test.labName}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100">
            <X className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
        <div className="px-4 py-3 space-y-3 overflow-y-auto max-h-[60vh]">
          <div>
            <p className={labelClass}>Peptide Name</p>
            <Input value={form.peptideName} onChange={set("peptideName")} className={fieldClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className={labelClass}>Purity %</p>
              <Input value={form.purityPct} onChange={set("purityPct")} placeholder="—" className={fieldClass} type="number" step="0.1" />
            </div>
            <div>
              <p className={labelClass}>EU/Vial</p>
              <Input value={form.endotoxinEuMg} onChange={set("endotoxinEuMg")} placeholder="—" className={fieldClass} type="number" step="0.01" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className={labelClass}>Sterility</p>
              <select value={form.sterilityPass} onChange={set("sterilityPass")} className={`${fieldClass} w-full border border-input bg-white`}>
                <option value="">—</option>
                <option value="true">Pass</option>
                <option value="false">Fail</option>
              </select>
            </div>
            <div>
              <p className={labelClass}>Test Date</p>
              <Input value={form.testDate} onChange={set("testDate")} placeholder="DD/MM/YYYY" className={fieldClass} />
            </div>
          </div>
          {isHeavyMetals && (
            <div>
              <p className={labelClass}>Heavy Metals</p>
              <div className="grid grid-cols-2 gap-2">
                {[["As", "heavyMetalAs"], ["Cd", "heavyMetalCd"], ["Pb", "heavyMetalPb"], ["Hg", "heavyMetalHg"]].map(([label, key]) => (
                  <div key={key}>
                    <p className="text-[9px] font-bold text-slate-400 mb-0.5">{label}</p>
                    <Input value={(form as Record<string, string>)[key]} onChange={set(key)} placeholder="not detected" className={fieldClass} />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className={labelClass}>Notes</p>
            <Input value={form.notes} onChange={set("notes")} placeholder="—" className={fieldClass} />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-500 bg-slate-100">Cancel</button>
          <button
            onClick={handleApprove} disabled={saving}
            className="flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5"
            style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />}
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}

function PendingCard({ test, secret, onAction }: { test: LabTest; secret: string; onAction: () => void }) {
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const handleReject = async () => {
    if (!confirm("Reject and permanently delete this submission?")) return;
    setRejecting(true);
    await fetch(apiUrl(`/admin/lab-tests/${test.id}/reject`), {
      method: "DELETE",
      headers: { "x-admin-secret": secret },
    });
    setRejecting(false);
    onAction();
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--t-blue-05)", border: "1px solid var(--t-blue-20)" }}>
      <div className="px-4 py-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-800 text-sm">{test.peptideName}</span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{test.supplier}</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">{test.labName}</span>
              {test.testType && (
                <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-semibold">
                  {TEST_TYPE_LABELS[test.testType] ?? test.testType}
                </span>
              )}
              {test.isThirdPartyTest && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <Star className="w-3 h-3" /> 3rd Party
                </span>
              )}
              {test.mgAmount && <span className="text-xs text-slate-500">{test.mgAmount}{test.massUnit ?? "mg"}</span>}
              {test.batchCode && <span className="text-xs text-slate-400 font-mono">{test.batchCode}</span>}
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {test.purityPct != null && <span className="text-xs font-bold text-green-700">Purity {test.purityPct}%</span>}
              {test.endotoxinEuMg != null && <span className="text-xs font-bold text-blue-600">{test.endotoxinEuMg} EU/Vial</span>}
              {test.sterilityPass === true && <span className="text-xs font-bold text-green-700 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Sterile</span>}
              {test.sterilityPass === false && <span className="text-xs font-bold text-red-600 flex items-center gap-0.5"><XCircle className="w-3 h-3" /> Sterility Fail</span>}
              {test.testDate && <span className="text-xs text-slate-400">{test.testDate}</span>}
            </div>
            {test.submittedBy && (
              <p className="text-xs text-slate-500 mt-1">Submitted by: <span className="font-semibold">{test.submittedBy}</span></p>
            )}
            {test.notes && <p className="text-xs text-slate-500 mt-0.5 italic">"{test.notes}"</p>}
            {test.url && (
              <a href={test.url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-600 underline flex items-center gap-0.5 mt-1">
                <ExternalLink className="w-3 h-3" /> View Report
              </a>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setShowApproveModal(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            Approve & Review
          </button>
          <button
            onClick={handleReject}
            disabled={rejecting}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
          >
            {rejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Reject
          </button>
        </div>
      </div>
      {showApproveModal && (
        <ApproveModal
          test={test}
          secret={secret}
          onClose={() => setShowApproveModal(false)}
          onApproved={() => { setShowApproveModal(false); onAction(); }}
        />
      )}
    </div>
  );
}

// ── Bulk Import Panel ─────────────────────────────────────────────────────────
function BulkImportPanel({ secret, onImported }: { secret: string; onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [urlText, setUrlText] = useState("");
  const [labName, setLabName] = useState("Janoshik");
  const [supplier, setSupplier] = useState("Uther");
  const [isThirdParty, setIsThirdParty] = useState(false);
  const [job, setJob] = useState<BulkImportJob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startError, setStartError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  useEffect(() => () => stopPolling(), []);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/admin/lab-tests/bulk-import-status"), { headers: { "x-admin-secret": secret } });
      const data: BulkImportJob = await res.json();
      setJob(data);
      if (data.status !== "running") {
        stopPolling();
        if (data.status === "done" && data.imported > 0) onImported();
      }
    } catch {}
  }, [secret, onImported]);

  const handleStart = async () => {
    const urls = urlText.split("\n").map(s => s.trim()).filter(Boolean);
    if (urls.length === 0) return;
    setSubmitting(true);
    setStartError("");
    try {
      const res = await fetch(apiUrl("/admin/lab-tests/bulk-import"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ urls, isThirdParty, labName, supplier }),
      });
      const data = await res.json();
      if (!res.ok) { setStartError(data.error ?? "Failed to start bulk import"); return; }
      setJob(data.job);
      stopPolling();
      pollRef.current = setInterval(pollStatus, 2000);
    } catch (e: any) { setStartError("Could not reach the server — please try again."); }
    finally { setSubmitting(false); }
  };

  const handleStop = async () => {
    await fetch(apiUrl("/admin/lab-tests/bulk-import-stop"), { method: "POST", headers: { "x-admin-secret": secret } });
    stopPolling();
    await pollStatus();
  };

  const isRunning = job?.status === "running";
  const isDone = job?.status === "done";
  const urlCount = urlText.split("\n").filter(s => s.trim()).length;
  const selectStyle = { background: "#1a1a2e", borderColor: "rgba(255,255,255,0.15)", color: "white" };

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(34,197,94,0.25)" }}>
      {/* Header / toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
        style={{ background: "linear-gradient(135deg, #052e16, #14532d)" }}
      >
        <Upload className="w-4 h-4 text-green-400 shrink-0" />
        <span className="text-sm font-bold text-white flex-1">Bulk URL Import</span>
        <span className="text-xs text-green-400/70 mr-2">Janoshik · Uzorak · Peptidetest · Testides · Chromate · Analiza Bialek</span>
        {open ? <ChevronUp className="w-4 h-4 text-green-400/60" /> : <ChevronDown className="w-4 h-4 text-green-400/60" />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
            style={{ background: "#0a1a0f" }}
          >
            <div className="p-4 flex flex-col gap-3">
              <p className="text-xs text-green-300/70">
                Paste one report URL per line. Gemini extracts CoA data and each URL is saved as an approved record (duplicates skipped).
              </p>

              {/* URL textarea */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-green-400/60 mb-1 block flex items-center gap-1">
                  <Link2 className="w-3 h-3" /> Report URLs ({urlCount})
                </label>
                <textarea
                  value={urlText}
                  onChange={e => setUrlText(e.target.value)}
                  disabled={isRunning}
                  placeholder={"https://janoshik.com/tests/...\nhttps://uzorak.com/report/...\nhttps://peptidetest.com/..."}
                  rows={5}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none font-mono"
                  style={{ background: "#0d2818", border: "1px solid rgba(34,197,94,0.2)", color: "#86efac", caretColor: "#4ade80" }}
                />
              </div>

              {/* Lab + supplier + 3rd party row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-green-400/60 mb-1 block">Lab</label>
                  <select value={labName} onChange={e => setLabName(e.target.value)} disabled={isRunning}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={selectStyle}>
                    {LAB_NAMES.map(l => <option key={l} value={l}>{l}</option>)}
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-green-400/60 mb-1 block">Supplier</label>
                  <input
                    value={supplier}
                    onChange={e => setSupplier(e.target.value)}
                    disabled={isRunning}
                    placeholder="Uther"
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ ...selectStyle, color: "white" }}
                  />
                </div>
              </div>

              {/* 3rd party toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
                <div
                  onClick={() => !isRunning && setIsThirdParty(v => !v)}
                  className={`w-9 h-5 rounded-full transition-colors relative ${isThirdParty ? "bg-amber-500" : "bg-white/10"}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isThirdParty ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
                <span className="text-xs text-green-300/70">Mark as 3rd-party test</span>
                {isThirdParty && <Star className="w-3 h-3 text-amber-400" />}
              </label>

              {/* Error message */}
              {startError && (
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-300" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                  {startError}
                  <button onClick={() => setStartError("")} className="ml-auto text-red-400/60 hover:text-red-300">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleStart}
                  disabled={isRunning || submitting || urlCount === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  style={{ background: "linear-gradient(135deg, #16a34a, #15803d)" }}
                >
                  {submitting || isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {isRunning ? "Importing…" : `Extract & Import ${urlCount > 0 ? `(${urlCount})` : ""}`}
                </button>
                {isRunning && (
                  <button
                    onClick={handleStop}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-red-400 hover:text-red-200 transition-colors"
                    style={{ border: "1px solid rgba(239,68,68,0.3)" }}
                  >
                    <StopCircle className="w-3.5 h-3.5" /> Stop
                  </button>
                )}
              </div>

              {/* Progress / results */}
              {job && job.status !== "idle" && (
                <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(34,197,94,0.15)" }}>
                  {isRunning && (
                    <div className="h-1.5 rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: job.total > 0 ? `${Math.round((job.processed / job.total) * 100)}%` : "0%", background: "linear-gradient(90deg, #16a34a, #4ade80)" }}
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-green-400/70">{job.processed}/{job.total} processed</span>
                    <div className="flex gap-3">
                      {job.imported > 0 && <span className="text-green-400 font-bold">{job.imported} imported</span>}
                      {job.skipped > 0 && <span className="text-slate-400">{job.skipped} skipped</span>}
                      {job.failed > 0 && <span className="text-red-400">{job.failed} failed</span>}
                    </div>
                  </div>
                  {isDone && job.imported > 0 && (
                    <div className="space-y-0.5 max-h-28 overflow-y-auto mt-0.5">
                      {job.results.slice(0, 10).map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                          <span className="text-green-300 font-semibold truncate">{r.peptideName}</span>
                          {r.purityPct != null && <span className="text-green-400/60 shrink-0">{r.purityPct}%</span>}
                          <span className="text-green-400/30 font-mono truncate">{r.url.replace(/https?:\/\//, "")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {(job.errors ?? []).length > 0 && (
                    <details className="mt-0.5">
                      <summary className="text-[10px] text-red-400 cursor-pointer">{job.errors.length} error(s)</summary>
                      <div className="mt-1 space-y-0.5">
                        {job.errors.slice(0, 8).map((e, i) => (
                          <p key={i} className="text-[10px] text-red-300 font-mono truncate">{e.url}: {e.reason}</p>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Batch Extraction Status Banner ────────────────────────────────────────────
function BatchStatusBanner({ job, secret, onDone }: { job: BatchJob; secret: string; onDone: () => void }) {
  const pct = job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0;
  const isRunning = job.status === "running";

  const handleStop = async () => {
    await fetch(apiUrl("/admin/lab-tests/extract-stop"), {
      method: "POST",
      headers: { "x-admin-secret": secret },
    });
    onDone();
  };

  return (
    <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)", border: "1px solid #4338ca" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Sparkles className="w-4 h-4 text-violet-300 animate-pulse" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          )}
          <span className="text-sm font-bold text-white">
            {isRunning ? "AI Extracting CoA Data…" : job.status === "error" ? "Extraction Error" : "Extraction Complete"}
          </span>
        </div>
        {isRunning && (
          <button onClick={handleStop} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-red-300 hover:text-red-100 hover:bg-red-900/30 transition-colors">
            <StopCircle className="w-3.5 h-3.5" /> Stop
          </button>
        )}
      </div>
      <div className="h-1.5 rounded-full bg-white/10 mb-2">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #7c3aed, #a78bfa)" }} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-violet-300">{job.processed}/{job.total} processed</span>
        <div className="flex gap-3">
          <span className="text-green-400">{job.succeeded} extracted</span>
          {job.skipped > 0 && <span className="text-slate-400">{job.skipped} skipped</span>}
          {job.failed > 0 && <span className="text-red-400">{job.failed} failed</span>}
        </div>
      </div>
      {(job.errors ?? []).length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-red-400 cursor-pointer">Show {(job.errors ?? []).length} error(s)</summary>
          <div className="mt-1 max-h-20 overflow-y-auto space-y-0.5">
            {(job.errors ?? []).slice(0, 10).map((e, i) => (
              <p key={i} className="text-[10px] text-red-300 font-mono">#{e.id}: {e.reason}</p>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ── Lab Session Compare Panel ──────────────────────────────────────────────────
// Backend compares the two most recent sessions for a given member username
interface SessionComparison {
  biomarkerName: string; biomarkerCategory: string; unit: string;
  current: number; previous: number | null; delta: number | null;
  refRangeLow: number | null; refRangeHigh: number | null; outOfRange: boolean;
}
interface SessionCompareResponse {
  sessions: { id: string; testDate: string; label?: string }[];
  comparison: SessionComparison[] | null;
  message?: string;
}

function LabSessionComparePanel({ secret }: { secret: string }) {
  const [username, setUsername] = useState("");
  const [result, setResult] = useState<SessionCompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const compare = async () => {
    const u = username.trim().replace(/^@/, "");
    if (!u) return;
    setLoading(true); setErr(""); setResult(null);
    const res = await fetch(apiUrl(`/admin/lab-sessions/compare/${encodeURIComponent(u)}`), { headers: { "x-admin-secret": secret } });
    const data = await res.json();
    if (res.ok) setResult(data);
    else setErr(data.error || "Failed to load comparison");
    setLoading(false);
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <GitCompare className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-bold text-blue-800">Lab Session Comparison</span>
        <span className="text-xs text-blue-600 font-normal">Compares a member's two most recent blood test sessions</span>
      </div>
      <div className="flex gap-2">
        <input
          value={username} onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === "Enter" && compare()}
          placeholder="@username or username"
          className="flex-1 h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button onClick={compare} disabled={loading || !username.trim()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 shrink-0">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitCompare className="w-3.5 h-3.5" />}
          Compare
        </button>
      </div>
      {err && <p className="text-xs text-red-500">{err}</p>}
      {result?.message && <p className="text-xs text-slate-500 italic">{result.message}</p>}
      {result?.sessions && result.sessions.length >= 2 && (
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="px-2 py-0.5 rounded-full bg-white border border-blue-200 font-medium">Previous: {fmtDate(result.sessions[1].testDate)}</span>
          <span className="text-slate-400">→</span>
          <span className="px-2 py-0.5 rounded-full bg-blue-100 border border-blue-300 font-semibold text-blue-700">Latest: {fmtDate(result.sessions[0].testDate)}</span>
        </div>
      )}
      {result?.comparison && result.comparison.length === 0 && (
        <p className="text-xs text-slate-500 italic">No overlapping biomarkers found between the two sessions.</p>
      )}
      {result?.comparison && result.comparison.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-blue-200 bg-white">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Marker</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-500">Category</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Previous</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Latest</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Change</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Ref Range</th>
              </tr>
            </thead>
            <tbody>
              {result.comparison.map((row, i) => (
                <tr key={i} className={`border-b border-slate-50 hover:bg-slate-50/50 ${row.outOfRange ? "bg-red-50/40" : ""}`}>
                  <td className="px-3 py-2 font-semibold text-slate-700">
                    {row.outOfRange && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 mb-0.5" />}
                    {row.biomarkerName}
                  </td>
                  <td className="px-3 py-2 text-slate-400">{row.biomarkerCategory || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-mono text-slate-500">
                    {row.previous != null ? `${row.previous} ${row.unit}` : "—"}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums font-mono font-semibold ${row.outOfRange ? "text-red-600" : "text-green-700"}`}>
                    {row.current} {row.unit}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums font-bold ${row.delta == null ? "text-slate-400" : row.delta > 0 ? "text-blue-600" : row.delta < 0 ? "text-amber-600" : "text-slate-500"}`}>
                    {row.delta == null ? "—" : `${row.delta > 0 ? "+" : ""}${row.delta}`}
                  </td>
                  <td className="px-3 py-2 text-slate-400">
                    {row.refRangeLow != null && row.refRangeHigh != null ? `${row.refRangeLow}–${row.refRangeHigh}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Mass Apply Batch Code Panel ───────────────────────────────────────────────
function MassApplyBatchCodePanel({ tests, secret, onDone }: { tests: LabTest[]; secret: string; onDone: () => void }) {
  const [batchCode, setBatchCode] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterCompound, setFilterCompound] = useState("");
  const [noBatchOnly, setNoBatchOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const suppliers = [...new Set(tests.map(t => t.supplier).filter(Boolean))].sort();
  const compounds = [...new Set(tests.map(t => t.peptideName).filter(Boolean))].sort();

  const filtered = tests.filter(t => {
    if (filterSupplier && t.supplier !== filterSupplier) return false;
    if (filterCompound && t.peptideName !== filterCompound) return false;
    if (noBatchOnly && t.batchCode) return false;
    return true;
  });

  const allSelected = filtered.length > 0 && filtered.every(t => selectedIds.has(t.id));

  const toggleAll = () => {
    if (allSelected) setSelectedIds(prev => { const next = new Set(prev); filtered.forEach(t => next.delete(t.id)); return next; });
    else setSelectedIds(prev => { const next = new Set(prev); filtered.forEach(t => next.add(t.id)); return next; });
  };

  const toggle = (id: number) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleApply = async () => {
    if (!batchCode.trim() || selectedIds.size === 0) return;
    if (!confirm(`Set batch code "${batchCode.trim()}" on ${selectedIds.size} test(s)?`)) return;
    setApplying(true); setResult(null);
    try {
      const res = await fetch(apiUrl("/admin/lab-tests/bulk-batch-code"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ batchCode: batchCode.trim(), testIds: [...selectedIds] }),
      });
      const d = await res.json();
      if (res.ok) {
        setResult({ ok: true, msg: `Updated ${d.updated} test(s)` });
        setSelectedIds(new Set());
        onDone();
      } else {
        setResult({ ok: false, msg: d.error ?? "Failed" });
      }
    } catch { setResult({ ok: false, msg: "Network error" }); }
    finally { setApplying(false); }
  };

  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}>
      <div className="flex items-center gap-2">
        <Tag className="w-4 h-4 text-slate-500" />
        <span className="text-sm font-bold text-slate-700">Mass Apply Batch Code</span>
        <span className="text-xs text-slate-400 ml-1">— stamp a batch code on multiple tests at once</span>
      </div>

      {/* Batch code input */}
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={batchCode}
          onChange={e => setBatchCode(e.target.value)}
          placeholder="e.g. ZE10-0324"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none font-mono"
        />
        <button
          onClick={handleApply}
          disabled={applying || !batchCode.trim() || selectedIds.size === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50 transition-all"
          style={{ background: selectedIds.size > 0 ? "#1B3A7A" : "#94A3B8" }}
        >
          {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Apply to {selectedIds.size > 0 ? `${selectedIds.size} test${selectedIds.size !== 1 ? "s" : ""}` : "selected"}
        </button>
      </div>

      {result && (
        <p className={`text-xs font-semibold ${result.ok ? "text-green-600" : "text-red-600"}`}>{result.msg}</p>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={filterSupplier}
          onChange={e => { setFilterSupplier(e.target.value); setSelectedIds(new Set()); }}
          className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-600 outline-none"
        >
          <option value="">All Vendors</option>
          {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterCompound}
          onChange={e => { setFilterCompound(e.target.value); setSelectedIds(new Set()); }}
          className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-600 outline-none"
        >
          <option value="">All Compounds</option>
          {compounds.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-600 cursor-pointer select-none">
          <input type="checkbox" checked={noBatchOnly} onChange={e => { setNoBatchOnly(e.target.checked); setSelectedIds(new Set()); }} className="accent-blue-600" />
          No batch code only
        </label>
      </div>

      {/* Test list */}
      <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No tests match the current filter</p>
        ) : (
          <>
            {/* Select all row */}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 sticky top-0">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-blue-600 w-3.5 h-3.5" />
              <span className="text-xs font-bold text-slate-600">Select all ({filtered.length})</span>
            </div>
            {filtered.map(t => (
              <label key={t.id} className="flex items-center gap-2.5 px-3 py-2 bg-white hover:bg-blue-50/40 cursor-pointer">
                <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggle(t.id)} className="accent-blue-600 w-3.5 h-3.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-slate-700 truncate block">{t.peptideName}</span>
                  <span className="text-[10px] text-slate-400">{t.supplier}{t.batchCode ? ` · ${t.batchCode}` : " · no batch"}</span>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">{t.testDate ?? ""}</span>
              </label>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ── Batch Code Prefix Table ───────────────────────────────────────────────────
interface BatchCodePrefix {
  id: number;
  prefix: string;
  compoundName: string;
  nominalDose: string;
}

function BatchPrefixesPanel({ secret }: { secret: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<BatchCodePrefix[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ prefix: "", compoundName: "", nominalDose: "" });
  const [addForm, setAddForm] = useState({ prefix: "", compoundName: "", nominalDose: "" });
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch(apiUrl("/admin/batch-code-prefixes"), { headers: { "x-admin-secret": secret } })
      .then(r => r.json())
      .then(d => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [secret]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const handleApplyToTests = async () => {
    if (!confirm("Update ALL existing lab tests with compound name & dose from their batch code prefix? This cannot be undone.")) return;
    setApplying(true); setApplyResult(null);
    try {
      const res = await fetch(apiUrl("/admin/batch-code-prefixes/apply-to-tests"), { method: "POST", headers: { "x-admin-secret": secret } });
      const d = await res.json();
      setApplyResult(`Updated ${d.updated} lab test${d.updated === 1 ? "" : "s"}.`);
    } catch { setApplyResult("Apply failed — try again."); } finally { setApplying(false); }
  };

  const handleSeed = async () => {
    if (!confirm("Seed all default batch code prefixes? Existing ones will be skipped.")) return;
    setSeeding(true);
    try {
      const res = await fetch(apiUrl("/admin/batch-code-prefixes/seed"), { method: "POST", headers: { "x-admin-secret": secret } });
      const d = await res.json();
      alert(`Seeded ${d.seeded} new prefixes (${d.total} total in defaults).`);
      load();
    } catch { alert("Seed failed"); } finally { setSeeding(false); }
  };

  const handleAdd = async () => {
    if (!addForm.prefix.trim() || !addForm.compoundName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(apiUrl("/admin/batch-code-prefixes"), {
        method: "POST", headers: { "x-admin-secret": secret, "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) { const d = await res.json(); alert(d.error ?? "Failed"); return; }
      setAddForm({ prefix: "", compoundName: "", nominalDose: "" });
      setAdding(false);
      load();
    } catch { alert("Add failed"); } finally { setSaving(false); }
  };

  const handleEdit = async () => {
    if (editingId === null || !editForm.prefix.trim() || !editForm.compoundName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(apiUrl(`/admin/batch-code-prefixes/${editingId}`), {
        method: "PUT", headers: { "x-admin-secret": secret, "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) { const d = await res.json(); alert(d.error ?? "Failed"); return; }
      setEditingId(null);
      load();
    } catch { alert("Save failed"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this prefix?")) return;
    setDeleting(id);
    try {
      await fetch(apiUrl(`/admin/batch-code-prefixes/${id}`), { method: "DELETE", headers: { "x-admin-secret": secret } });
      load();
    } catch { alert("Delete failed"); } finally { setDeleting(null); }
  };

  const visible = rows.filter(r =>
    !search.trim() ||
    r.prefix.toLowerCase().includes(search.toLowerCase()) ||
    r.compoundName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mt-8 border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-100 transition-colors"
      >
        <Tag className="w-4 h-4 text-slate-500 shrink-0" />
        <span className="font-semibold text-sm text-slate-700">Batch Code Prefix Table</span>
        {open && <span className="text-xs text-slate-400">({rows.length} entries)</span>}
        <span className="ml-auto text-slate-400">{open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
      </button>

      {open && (
        <>
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[160px]">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search prefix or name…"
            className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <button
          onClick={() => { setAdding(v => !v); setEditingId(null); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
        <button
          onClick={handleApplyToTests}
          disabled={applying}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {applying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
          Apply to Tests
        </button>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {seeding ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Seed Defaults
        </button>
      </div>
      {applyResult && (
        <div className="px-4 py-2 text-xs bg-emerald-50 border-b border-emerald-200 text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />{applyResult}
          <button onClick={() => setApplyResult(null)} className="ml-auto text-emerald-500 hover:text-emerald-700"><X className="w-3 h-3" /></button>
        </div>
      )}

      {adding && (
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-3 flex items-center gap-2 flex-wrap">
          <input
            value={addForm.prefix}
            onChange={e => setAddForm(f => ({ ...f, prefix: e.target.value }))}
            placeholder="Prefix (e.g. OZ5)"
            className="px-2 py-1 text-xs border border-slate-300 rounded-md w-28 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <input
            value={addForm.compoundName}
            onChange={e => setAddForm(f => ({ ...f, compoundName: e.target.value }))}
            placeholder="Compound name"
            className="px-2 py-1 text-xs border border-slate-300 rounded-md w-44 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <input
            value={addForm.nominalDose}
            onChange={e => setAddForm(f => ({ ...f, nominalDose: e.target.value }))}
            placeholder="Dose (e.g. 5mg)"
            className="px-2 py-1 text-xs border border-slate-300 rounded-md w-24 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button
            onClick={handleAdd}
            disabled={saving || !addForm.prefix.trim() || !addForm.compoundName.trim()}
            className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
          </button>
          <button onClick={() => setAdding(false)} className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700">Cancel</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2 text-slate-500 font-medium w-24">Prefix</th>
                <th className="text-left px-4 py-2 text-slate-500 font-medium">Compound Name</th>
                <th className="text-left px-4 py-2 text-slate-500 font-medium w-24">Dose</th>
                <th className="px-4 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map(row => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  {editingId === row.id ? (
                    <>
                      <td className="px-4 py-1.5">
                        <input value={editForm.prefix} onChange={e => setEditForm(f => ({ ...f, prefix: e.target.value }))}
                          className="px-2 py-0.5 border border-slate-300 rounded text-xs w-full focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </td>
                      <td className="px-4 py-1.5">
                        <input value={editForm.compoundName} onChange={e => setEditForm(f => ({ ...f, compoundName: e.target.value }))}
                          className="px-2 py-0.5 border border-slate-300 rounded text-xs w-full focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </td>
                      <td className="px-4 py-1.5">
                        <input value={editForm.nominalDose} onChange={e => setEditForm(f => ({ ...f, nominalDose: e.target.value }))}
                          className="px-2 py-0.5 border border-slate-300 rounded text-xs w-full focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </td>
                      <td className="px-4 py-1.5 flex items-center gap-1">
                        <button onClick={handleEdit} disabled={saving} className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs disabled:opacity-50 hover:bg-blue-700">
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        </button>
                        <button onClick={() => setEditingId(null)} className="px-2 py-0.5 border border-slate-200 rounded text-xs text-slate-500 hover:bg-slate-100">
                          <X className="w-3 h-3" />
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2 font-mono font-semibold text-blue-700">{row.prefix}</td>
                      <td className="px-4 py-2 text-slate-700">{row.compoundName}</td>
                      <td className="px-4 py-2 text-slate-500">{row.nominalDose}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => { setEditingId(row.id); setEditForm({ prefix: row.prefix, compoundName: row.compoundName, nominalDose: row.nominalDose }); setAdding(false); }}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                          ><Pencil className="w-3 h-3" /></button>
                          <button
                            onClick={() => handleDelete(row.id)}
                            disabled={deleting === row.id}
                            className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 disabled:opacity-50"
                          >{deleting === row.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No prefixes found. Use "Seed Defaults" to populate.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
        </>
      )}
    </div>
  );
}

// ── Main admin tab ────────────────────────────────────────────────────────────
export function LabTestsTab({ secret }: { secret: string }) {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [pending, setPending] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<LabTest | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [filterHasValues, setFilterHasValues] = useState(false);
  const [filterFailed, setFilterFailed] = useState(false);
  const [filterHasNominal, setFilterHasNominal] = useState(false);
  const [filterTestType, setFilterTestType] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterLab, setFilterLab] = useState("");
  const [extractingId, setExtractingId] = useState<number | null>(null);
  const [extractResult, setExtractResult] = useState<{ id: number; ok: boolean; msg: string } | null>(null);
  const [batchJob, setBatchJob] = useState<BatchJob | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [exporting, setExporting] = useState<"lab" | "blood" | null>(null);
  const [previewStates, setPreviewStates] = useState<Record<number, "loading" | "image" | "pdf" | "iframe" | "link" | "error">>({});
  const [showMassApplyPanel, setShowMassApplyPanel] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);
  const [uploadingCertId, setUploadingCertId] = useState<number | null>(null);
  const certUploadRef = useRef<HTMLInputElement>(null);
  const certUploadTargetId = useRef<number | null>(null);

  const loadPending = useCallback(() => {
    fetch(apiUrl("/admin/lab-tests/pending"), { headers: { "x-admin-secret": secret } })
      .then(r => r.json())
      .then(d => setPending(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [secret]);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "500" });
    if (search.trim()) params.set("q", search.trim());
    fetch(apiUrl(`/lab-tests?${params}`))
      .then(r => r.json())
      .then(d => setTests(Array.isArray(d) ? d : []))
      .catch(() => setTests([]))
      .finally(() => setLoading(false));
  }, [search]);

  const pollBatchStatus = useCallback(() => {
    fetch(apiUrl("/admin/lab-tests/extract-status"), { headers: { "x-admin-secret": secret } })
      .then(r => r.json())
      .then((job: BatchJob) => {
        setBatchJob(job);
        if (job.status !== "running") {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          if (job.status === "done") load();
        }
      })
      .catch(() => {});
  }, [secret, load]);

  useEffect(() => {
    load();
    loadPending();
    pollBatchStatus();
  }, [load, loadPending, pollBatchStatus]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this test record?")) return;
    setDeleting(id);
    await fetch(apiUrl(`/admin/lab-tests/${id}`), { method: "DELETE", headers: { "x-admin-secret": secret } });
    setDeleting(null);
    load();
  };

  const handleExtractSingle = async (id: number) => {
    setExtractingId(id);
    setExtractResult(null);
    try {
      const res = await fetch(apiUrl(`/admin/lab-tests/${id}/extract`), {
        method: "POST",
        headers: { "x-admin-secret": secret },
      });
      const data = await res.json();
      if (res.ok) {
        setExtractResult({ id, ok: true, msg: `Extracted: purity ${data.extracted?.purityPct ?? "—"}%, confidence ${data.extracted?.confidence}` });
        load();
      } else {
        setExtractResult({ id, ok: false, msg: data.error ?? "Failed" });
      }
    } catch {
      setExtractResult({ id, ok: false, msg: "Network error" });
    } finally {
      setExtractingId(null);
    }
  };

  const handleStartBatch = async (mode: "new" | "all" | "missing") => {
    try {
      const res = await fetch(apiUrl("/admin/lab-tests/extract-all"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (res.ok) {
        setBatchJob(data.job);
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(pollBatchStatus, 2000);
      } else {
        alert(data.error ?? "Failed to start batch extraction");
      }
    } catch {
      alert("Network error");
    }
  };

  const isFailed = (t: LabTest) => {
    const purityThreshold = isHGH(t.peptideName) ? 96 : 95;
    return (
      (t.purityPct != null && t.purityPct < purityThreshold) ||
      t.sterilityPass === false ||
      (t.endotoxinEuMg != null && t.endotoxinEuMg > 5)
    );
  };

  const handleCertUploadClick = (id: number) => {
    certUploadTargetId.current = id;
    certUploadRef.current?.click();
  };

  const handleCertFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const id = certUploadTargetId.current;
    if (!file || !id) return;
    e.target.value = "";
    setUploadingCertId(id);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(apiUrl(`/admin/lab-tests/${id}/upload-cert`), {
        method: "POST",
        headers: { "x-admin-secret": secret },
        body: form,
      });
      if (res.ok) {
        // Refresh preview for this test — now it has a stored blob
        setPreviewStates(p => ({ ...p, [id]: "loading" }));
        const pRes = await fetch(apiUrl(`/lab-tests/${id}/preview`));
        if (pRes.ok) {
          const data = await pRes.json();
          const type: "image" | "pdf" | "iframe" | "link" | "error" =
            data.type === "image" ? "image" :
            data.type === "pdf" ? "pdf" :
            data.type === "iframe" ? "iframe" :
            "link";
          setPreviewStates(p => ({ ...p, [id]: type }));
        }
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Upload failed");
        setPreviewStates(p => { const n = { ...p }; delete n[id]; return n; });
      }
    } catch {
      alert("Network error uploading certificate");
      setPreviewStates(p => { const n = { ...p }; delete n[id]; return n; });
    } finally {
      setUploadingCertId(null);
    }
  };

  const handleBackfillCerts = async () => {
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const res = await fetch(apiUrl("/admin/lab-tests/backfill-certs"), {
        method: "POST",
        headers: { "x-admin-secret": secret },
      });
      const data = await res.json();
      if (res.ok) {
        setBackfillResult(data.message ?? `Backfilling ${data.total} certificates in background`);
      } else {
        setBackfillResult(data.error ?? "Failed to start backfill");
      }
    } catch {
      setBackfillResult("Network error");
    } finally {
      setBackfilling(false);
    }
  };

  const handleExportCsv = async (type: "lab" | "blood") => {
    setExporting(type);
    const endpoint = type === "lab" ? "/admin/lab-tests/export-csv" : "/admin/blood-test-values/export-csv";
    const res = await fetch(apiUrl(endpoint), { headers: { "x-admin-secret": secret } });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = type === "lab" ? "lab-tests.csv" : "blood-test-values.csv";
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }
    setExporting(null);
  };

  const handleTogglePreview = async (id: number) => {
    if (previewStates[id]) {
      setPreviewStates(p => { const n = { ...p }; delete n[id]; return n; });
      return;
    }
    setPreviewStates(p => ({ ...p, [id]: "loading" }));
    try {
      const res = await fetch(apiUrl(`/lab-tests/${id}/preview`));
      if (!res.ok) { setPreviewStates(p => ({ ...p, [id]: "error" })); return; }
      const data = await res.json();
      const type: "image" | "pdf" | "iframe" | "link" | "error" =
        data.type === "image" ? "image" :
        data.type === "pdf" ? "pdf" :
        data.type === "iframe" ? "iframe" :
        "link";
      setPreviewStates(p => ({ ...p, [id]: type }));
    } catch {
      setPreviewStates(p => ({ ...p, [id]: "error" }));
    }
  };

  const hasCoaValues = (t: LabTest) =>
    t.purityPct != null ||
    t.endotoxinEuMg != null ||
    t.sterilityPass != null ||
    t.testType === "lcms" ||
    t.heavyMetalAs != null ||
    t.heavyMetalCd != null ||
    t.heavyMetalPb != null ||
    t.heavyMetalHg != null;

  let visible = filterHasValues ? tests.filter(hasCoaValues) : tests;
  if (filterFailed) visible = visible.filter(isFailed);
  if (filterHasNominal) visible = visible.filter(t => t.nominalDose != null && t.nominalDose.trim() !== "");
  if (filterTestType) visible = visible.filter(t => t.testType === filterTestType);
  if (filterSupplier) visible = visible.filter(t => t.supplier === filterSupplier);
  if (filterSource !== "") visible = visible.filter(t =>
    filterSource === "3rd" ? t.isThirdPartyTest : !t.isThirdPartyTest
  );
  if (filterLab) visible = visible.filter(t => t.labName === filterLab);

  const failedCount = tests.filter(isFailed).length;

  const aiExtractedCount = tests.filter(t => t.aiExtracted).length;
  const noCoaCount = tests.filter(t => !hasCoaValues(t)).length;
  const batchRunning = batchJob?.status === "running";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-800">Lab Tests</h2>
          <p className="text-xs text-slate-500">
            {tests.length} approved · {pending.length} pending review · {aiExtractedCount} AI extracted
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button onClick={() => { load(); loadPending(); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleExportCsv("lab")}
            disabled={exporting === "lab"}
            title="Export Lab Tests CSV"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            {exporting === "lab" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            Lab CSV
          </button>
          <button
            onClick={() => handleExportCsv("blood")}
            disabled={exporting === "blood"}
            title="Export Blood Test Values CSV"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            {exporting === "blood" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            Blood CSV
          </button>
          <button
            onClick={() => setShowCompare(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${showCompare ? "bg-blue-50 text-blue-600 border-blue-200" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
          >
            <GitCompare className="w-3 h-3" />
            Compare Sessions
          </button>
          <button
            onClick={() => setShowMassApplyPanel(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${showMassApplyPanel ? "bg-indigo-700 text-white border-indigo-500" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
          >
            <Tag className="w-3 h-3" />
            Apply Batch Code
          </button>
          <button
            onClick={() => setEditTarget(null)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white"
            style={{ background: "var(--t-blue)" }}
          >
            <Plus className="w-3.5 h-3.5" /> Add Test
          </button>
        </div>

        {/* Hidden file input shared by all cert upload buttons */}
        <input
          ref={certUploadRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={handleCertFileChange}
        />
      </div>

      {/* Lab Session Compare Panel */}
      {showCompare && <LabSessionComparePanel secret={secret} />}

      {/* AI Batch Extraction Panel */}
      <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, #0f0c29, #302b63)", border: "1px solid rgba(139,92,246,0.3)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-bold text-white">AI CoA Extraction</span>
          {aiExtractedCount > 0 && (
            <span className="ml-auto text-xs font-bold text-violet-300 bg-violet-900/40 px-2 py-0.5 rounded-full">
              {aiExtractedCount}/{tests.length} done
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Gemini Vision reads lab report images and PDFs from all supported labs (Janoshik, Uzorak, Peptidetest, Testides, Chromate, Analiza Bialek) and auto-fills purity, endotoxin, sterility, batch code, and heavy metals.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleStartBatch("new")}
            disabled={batchRunning}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
          >
            {batchRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Extract New ({tests.filter(t => !t.aiExtracted).length})
          </button>
          <button
            onClick={() => handleStartBatch("missing")}
            disabled={batchRunning}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-amber-300 disabled:opacity-50 disabled:cursor-not-allowed hover:text-white transition-colors"
            style={{ border: "1px solid rgba(251,191,36,0.4)" }}
            title="Re-run AI on records where no CoA values were extracted"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Missing ({noCoaCount})
          </button>
          <button
            onClick={() => handleStartBatch("all")}
            disabled={batchRunning}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-violet-300 disabled:opacity-50 disabled:cursor-not-allowed hover:text-white transition-colors"
            style={{ border: "1px solid rgba(139,92,246,0.4)" }}
          >
            Re-run All
          </button>
        </div>
      </div>

      {/* Bulk Import Panel */}
      <BulkImportPanel secret={secret} onImported={load} />

      {/* Certificate Backfill */}
      <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ border: "1px solid rgba(14,165,233,0.25)", background: "rgba(14,165,233,0.05)" }}>
        <Download className="w-4 h-4 text-sky-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-sky-300">Store Certificates Locally</p>
          <p className="text-xs text-slate-400">Fetch & store certificate images/PDFs for all tests that don't have one saved yet. Uzorak tests with a snapshot or PDF will be stored automatically. Runs in the background.</p>
          {backfillResult && <p className="text-xs mt-1 text-sky-400">{backfillResult}</p>}
        </div>
        <button
          onClick={handleBackfillCerts}
          disabled={backfilling}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          style={{ background: "linear-gradient(135deg, #0369a1, #0284c7)" }}
        >
          {backfilling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          {backfilling ? "Starting…" : "Run Backfill"}
        </button>
      </div>

      {/* Batch Code Prefix Table */}
      <BatchPrefixesPanel secret={secret} />

      {/* Mass Apply Batch Code */}
      {showMassApplyPanel && (
        <MassApplyBatchCodePanel
          tests={tests}
          secret={secret}
          onDone={() => { load(); setShowMassApplyPanel(false); }}
        />
      )}

      {/* Batch status */}
      {batchJob && batchJob.status !== "idle" && (
        <BatchStatusBanner
          job={batchJob}
          secret={secret}
          onDone={() => { pollBatchStatus(); load(); }}
        />
      )}

      {/* Search + filter row */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 relative min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search compound name or batch…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm outline-none text-slate-800 placeholder-slate-400"
              style={{ borderColor: "#E2E8F0" }}
            />
          </div>
          <button
            onClick={() => setFilterHasValues(v => !v)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${filterHasValues ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}
          >
            Has CoA Values
          </button>
          <button
            onClick={() => setFilterHasNominal(v => !v)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${filterHasNominal ? "bg-violet-50 text-violet-600 border-violet-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}
          >
            With Nominal Value
          </button>
          <button
            onClick={() => setFilterFailed(v => !v)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${filterFailed ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}
          >
            <AlertCircle className="w-3 h-3" />
            Failed {failedCount > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filterFailed ? "bg-red-100 text-red-600" : "bg-slate-200 text-slate-600"}`}>{failedCount}</span>}
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={filterTestType}
            onChange={e => setFilterTestType(e.target.value)}
            className={`px-3 py-2 rounded-lg border text-xs font-semibold outline-none transition-all ${filterTestType ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}
          >
            <option value="">All Test Types</option>
            {[...new Set(tests.map(t => t.testType).filter(Boolean))].sort().map(tt => (
              <option key={tt!} value={tt!}>{TEST_TYPE_LABELS[tt!] ?? tt}</option>
            ))}
          </select>
          <select
            value={filterSupplier}
            onChange={e => setFilterSupplier(e.target.value)}
            className={`px-3 py-2 rounded-lg border text-xs font-semibold outline-none transition-all ${filterSupplier ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}
          >
            <option value="">All Vendors</option>
            {[...new Set(tests.map(t => t.supplier).filter(Boolean))].sort().map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
            className={`px-3 py-2 rounded-lg border text-xs font-semibold outline-none transition-all ${filterSource ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}
          >
            <option value="">All Sources</option>
            <option value="vendor">Vendor</option>
            <option value="3rd">3rd Party</option>
          </select>
          <select
            value={filterLab}
            onChange={e => setFilterLab(e.target.value)}
            className={`px-3 py-2 rounded-lg border text-xs font-semibold outline-none transition-all ${filterLab ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}
          >
            <option value="">All Labs</option>
            {[...new Set(tests.map(t => t.labName).filter(Boolean))].sort().map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          {(filterTestType || filterSupplier || filterSource || filterLab) && (
            <button
              onClick={() => { setFilterTestType(""); setFilterSupplier(""); setFilterSource(""); setFilterLab(""); }}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Pending submissions */}
      {pending.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--t-blue-20)" }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ background: "var(--t-blue-07)" }}>
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-bold text-blue-700">Pending Community Submissions</span>
            <span className="ml-auto text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{pending.length}</span>
          </div>
          <div className="flex flex-col gap-2 p-3" style={{ background: "var(--t-blue-03)" }}>
            {pending.map(t => (
              <PendingCard key={t.id} test={t} secret={secret} onAction={() => { load(); loadPending(); }} />
            ))}
          </div>
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: "Total Tests", value: tests.length, color: "text-slate-800" },
          { label: "With Purity", value: tests.filter(t => t.purityPct != null).length, color: "text-slate-800" },
          { label: "With Endotoxin", value: tests.filter(t => t.endotoxinEuMg != null).length, color: "text-slate-800" },
          { label: "AI Extracted", value: aiExtractedCount, color: "text-slate-800" },
          { label: "Failed", value: failedCount, color: failedCount > 0 ? "text-red-600" : "text-slate-800" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: s.label === "Failed" && failedCount > 0 ? "#FEF2F2" : "#F0F4F8", border: s.label === "Failed" && failedCount > 0 ? "1px solid #FECACA" : "1px solid transparent" }}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Single extraction result toast */}
      <AnimatePresence>
        {extractResult && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-semibold ${extractResult.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}
          >
            {extractResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {extractResult.msg}
            <button onClick={() => setExtractResult(null)} className="ml-auto text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tests list */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map(t => (
            <div key={t.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 text-sm">{t.peptideName}</span>
                    {t.mgAmount && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold">{t.mgAmount}mg</span>}
                    <span className="text-xs text-slate-400">{t.supplier}</span>
                    <span className="text-xs text-slate-400 font-semibold">{t.labName}</span>
                    {t.testType && (
                      <span className="text-xs bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded font-semibold">
                        {TEST_TYPE_LABELS[t.testType] ?? t.testType}
                      </span>
                    )}
                    {t.isThirdPartyTest ? (
                      <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                        <Star className="w-2.5 h-2.5" /> 3rd Party Test
                      </span>
                    ) : (
                      <span className="text-xs bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                        Vendor Test
                      </span>
                    )}
                    {t.aiExtracted && (
                      <span className="text-xs bg-violet-50 text-violet-500 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> AI
                      </span>
                    )}
                    {t.batchCode && <span className="text-xs text-slate-400 font-mono">{t.batchCode}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {t.purityPct != null && (
                      <span className={`text-xs font-bold flex items-center gap-0.5 ${purityColorClass(t.purityPct, t.peptideName)}`}>
                        Purity {t.purityPct}%
                        {t.aiExtracted && <Sparkles className="w-2.5 h-2.5 text-violet-400" />}
                      </span>
                    )}
                    {t.mgAmount != null && (
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-0.5">
                        {t.mgAmount} {t.massUnit ?? "mg"}
                        {t.aiExtracted && <Sparkles className="w-2.5 h-2.5 text-violet-400" />}
                      </span>
                    )}
                    {t.endotoxinEuMg != null && (
                      <span className={`text-xs font-bold flex items-center gap-0.5 ${t.endotoxinEuMg <= 1 ? "text-green-600" : t.endotoxinEuMg <= 5 ? "text-blue-600" : "text-red-600"}`}>
                        {t.endotoxinEuMg} EU/Vial
                        {t.aiExtracted && <Sparkles className="w-2.5 h-2.5 text-violet-400" />}
                      </span>
                    )}
                    {t.sterilityPass === true && (
                      <span className="text-xs font-bold text-green-600 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Sterile
                        {t.aiExtracted && <Sparkles className="w-2.5 h-2.5 text-violet-400" />}
                      </span>
                    )}
                    {t.sterilityPass === false && (
                      <span className="text-xs font-bold text-red-600 flex items-center gap-0.5">
                        <XCircle className="w-3 h-3" /> Sterility Failed
                        {t.aiExtracted && <Sparkles className="w-2.5 h-2.5 text-violet-400" />}
                      </span>
                    )}
                    {t.purityPct == null && t.mgAmount == null && t.endotoxinEuMg == null && t.sterilityPass == null && (
                      <span className="text-xs text-slate-400 italic">No CoA values</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleExtractSingle(t.id)}
                    disabled={extractingId === t.id || batchRunning}
                    title="Extract CoA data with AI"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50 disabled:opacity-40 transition-colors"
                  >
                    {extractingId === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleTogglePreview(t.id)}
                    title="Preview report"
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${previewStates[t.id] ? "text-indigo-600 bg-indigo-50" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"}`}
                  >
                    {previewStates[t.id] === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleCertUploadClick(t.id)}
                    disabled={uploadingCertId === t.id}
                    title="Upload certificate (JPG / PNG / PDF)"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-sky-600 hover:bg-sky-50 disabled:opacity-40 transition-colors"
                  >
                    {uploadingCertId === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  </button>
                  <a href={t.url} target="_blank" rel="noopener noreferrer"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => setEditTarget(t)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={deleting === t.id}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    {deleting === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              {/* Inline report preview */}
              <AnimatePresence>
                {previewStates[t.id] && previewStates[t.id] !== "loading" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                    style={{ borderTop: "1px solid #F1F5F9" }}
                  >
                    <div className="p-3 flex flex-col items-center gap-2" style={{ background: "#F8FAFC" }}>
                      {previewStates[t.id] === "image" && (
                        <img
                          src={apiUrl(`/lab-tests/${t.id}/proxy`)}
                          alt={`${t.peptideName} lab report`}
                          className="max-h-80 max-w-full rounded-lg shadow-sm object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                            setPreviewStates(p => ({ ...p, [t.id]: "error" }));
                          }}
                        />
                      )}
                      {previewStates[t.id] === "pdf" && (
                        <iframe
                          src={apiUrl(`/lab-tests/${t.id}/proxy`)}
                          title={`${t.peptideName} lab report`}
                          className="w-full rounded-lg shadow-sm"
                          style={{ height: "420px", border: "none" }}
                        />
                      )}
                      {(previewStates[t.id] === "iframe" || previewStates[t.id] === "link") && (() => {
                        const purityColor = t.purityPct != null ? (t.purityPct >= 99 ? "#059669" : "#DC2626") : null;
                        const purityBg   = t.purityPct != null ? (t.purityPct >= 99 ? "rgba(5,150,105,0.10)" : "rgba(220,38,38,0.10)") : null;
                        const purityBorder = t.purityPct != null ? (t.purityPct >= 99 ? "rgba(5,150,105,0.28)" : "rgba(220,38,38,0.28)") : null;
                        const purityLabel  = t.purityPct != null ? (t.purityPct >= 99 ? "Good" : "Low") : null;
                        return (
                          <div className="w-full flex flex-col gap-2 py-1">
                            {/* Metrics row */}
                            <div className="grid grid-cols-2 gap-2">
                              {t.purityPct != null && (
                                <div className="rounded-xl p-2.5 flex flex-col gap-0.5" style={{ background: purityBg!, border: `1px solid ${purityBorder}` }}>
                                  <span className="text-[9px] font-black tracking-wider uppercase" style={{ color: purityColor! }}>Purity</span>
                                  <span className="text-lg font-black leading-none" style={{ color: purityColor! }}>{Number(t.purityPct).toFixed(2)}%</span>
                                  <span className="text-[10px] font-semibold" style={{ color: purityColor! }}>{purityLabel}</span>
                                </div>
                              )}
                              {t.mgAmount != null && (
                                <div className="rounded-xl p-2.5 flex flex-col gap-0.5" style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(96,165,250,0.22)" }}>
                                  <span className="text-[9px] font-black tracking-wider uppercase" style={{ color: "rgba(96,165,250,0.9)" }}>Actual Mass</span>
                                  <span className="text-lg font-black leading-none" style={{ color: "#1e3a5f" }}>{t.mgAmount}</span>
                                  <span className="text-[10px] font-semibold text-slate-400">{t.massUnit ?? "mg"}</span>
                                </div>
                              )}
                            </div>
                            {/* Endotoxin + sterility */}
                            {(t.endotoxinEuMg != null || t.sterilityPass != null) && (
                              <div className="rounded-xl border divide-y overflow-hidden" style={{ borderColor: "#E2E8F0" }}>
                                {t.endotoxinEuMg != null && (
                                  <div className="flex items-center justify-between px-3 py-1.5 bg-white text-xs">
                                    <span className="text-slate-500">Endotoxin</span>
                                    <span className="font-bold" style={{ color: t.endotoxinEuMg <= 1 ? "#059669" : t.endotoxinEuMg <= 5 ? "#2563EB" : "#DC2626" }}>
                                      {t.endotoxinEuMg} EU/mg
                                    </span>
                                  </div>
                                )}
                                {t.sterilityPass != null && (
                                  <div className="flex items-center justify-between px-3 py-1.5 bg-white text-xs">
                                    <span className="text-slate-500">Sterility</span>
                                    {t.sterilityPass
                                      ? <span className="font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Pass</span>
                                      : <span className="font-bold text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3" />Fail</span>
                                    }
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Link to original */}
                            <a
                              href={t.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl text-xs font-semibold border transition-colors"
                              style={{ color: "#2563EB", borderColor: "rgba(96,165,250,0.35)", background: "rgba(59,130,246,0.07)" }}
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> View on {t.labName}
                            </a>
                          </div>
                        );
                      })()}
                      {previewStates[t.id] === "error" && (
                        <div className="flex flex-col items-center gap-2 py-4 text-center">
                          <AlertCircle className="w-7 h-7 text-slate-300" />
                          <p className="text-xs text-slate-400">Preview unavailable for this report.</p>
                          <a href={t.url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-500 underline flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" /> Open original
                          </a>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          {visible.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">No tests found</div>
          )}
        </div>
      )}

      {/* Edit / Add modal */}
      <AnimatePresence>
        {editTarget !== undefined && (
          <EditModal
            test={editTarget}
            secret={secret}
            onClose={() => setEditTarget(undefined)}
            onSaved={load}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
