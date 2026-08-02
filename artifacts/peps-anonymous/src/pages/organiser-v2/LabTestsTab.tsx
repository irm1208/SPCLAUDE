import { useState, useEffect, useRef } from "react";
import { V2_CARD_BORDER } from "./theme";
import { organiserApi } from "./api/organiser-api";
import {
  FlaskConical, Loader2, Trash2, Check, CheckCircle2, X,
  Upload, ExternalLink, Sparkles, ChevronDown, ChevronRight,
  Lightbulb, FileText
} from "lucide-react";

// ─── Workspace: Lab Tests Tab ────────────────────────────────────────────────
// Full port of the v1 organiser lab tests tab: AI bulk import from URLs with a
// review table, single file upload + AI extraction, complete manual form
// (Janoshik ID, mg, test type, category, endotoxin, sterility, heavy metals),
// pending/approved states and delete. Data is persisted via the API.

interface OrgLabTest {
  id: number;
  url: string | null;
  peptideName: string;
  supplier: string | null;
  labName: string | null;
  batchCode: string | null;
  purityPct: string | null;
  testDate: string | null;
  pending: boolean;
  groupBuyId: string | null;
  janoshikId: string | null;
  mgAmount: number | null;
  testType: string | null;
  productCategory: string | null;
  endotoxinEuMg: number | null;
  sterilityPass: boolean | null;
  heavyMetalAs: string | null;
  heavyMetalCd: string | null;
  heavyMetalPb: string | null;
  heavyMetalHg: string | null;
  createdAt: string;
}

// Multi-row review type for the AI bulk import table
type LabReviewRow = {
  fileName: string;
  status: "pending" | "extracting" | "done" | "error";
  error?: string;
  url: string; peptideName: string; labName: string; batchCode: string; purityPct: string;
  testDate: string; janoshikId: string; mgAmount: string; testType: string;
  productCategory: string; endotoxinEuMg: string; sterilityPass: string;
  heavyMetalAs: string; heavyMetalCd: string; heavyMetalPb: string; heavyMetalHg: string;
};

interface LabTestsTabProps {
  selectedGbId?: string;
}

// No sample data — loaded from API

const DEFAULT_FORM = {
  url: "", peptideName: "", labName: "Janoshik", batchCode: "", purityPct: "", testDate: "",
  janoshikId: "", mgAmount: "", testType: "", productCategory: "", endotoxinEuMg: "", sterilityPass: "",
  heavyMetalAs: "", heavyMetalCd: "", heavyMetalPb: "", heavyMetalHg: "",
};

const inputCls = "w-full h-10 px-3 rounded-lg text-[14px] outline-none";
const inputStyle = { border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "#fff" } as const;
const cellInputCls = "h-8 px-2 rounded-md text-[12px] outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--t-subtle)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function janoshikIdFromUrl(url: string): string {
  const m = url.match(/J-?(\d{3,})/i);
  if (m) return `J-${m[1]}`;
  const seg = url.split("/").filter(Boolean).pop() ?? "";
  return seg.length > 2 && seg.length < 20 ? seg : "";
}

export default function LabTestsTab({ selectedGbId }: LabTestsTabProps = {}) {
  const [tests, setTests] = useState<OrgLabTest[]>([]);
  const [mode, setMode] = useState<"none" | "manual" | "bulk">("none");
  const [expandedTest, setExpandedTest] = useState<number | null>(null);
  const [error, setError] = useState("");

  // AI bulk import from URLs
  const [bulkUrls, setBulkUrls] = useState("");
  const [reviewRows, setReviewRows] = useState<LabReviewRow[]>([]);
  const [bulkExtracting, setBulkExtracting] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ imported: number; failed: number } | null>(null);

  // Manual form + single-file AI extraction
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [extractLoading, setExtractLoading] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!selectedGbId) return;
    organiserApi.labTests()
      .then(all => {
        const filtered = all.filter(t => String(t.groupBuyId) === String(selectedGbId));
        setTests(filtered.map(t => ({
          id: typeof t.id === "number" ? t.id : parseInt(String(t.id)),
          url: t.url ?? null,
          peptideName: t.peptideName ?? "",
          supplier: t.supplier ?? null,
          labName: t.labName ?? null,
          batchCode: t.batchCode ?? null,
          purityPct: t.purityPct != null ? String(t.purityPct) : null,
          testDate: t.testDate ?? null,
          pending: t.pending !== false,
          groupBuyId: String(t.groupBuyId ?? selectedGbId),
          janoshikId: t.janoshikId ?? null,
          mgAmount: t.mgAmount ?? null,
          testType: t.testType ?? null,
          productCategory: t.productCategory ?? null,
          endotoxinEuMg: t.endotoxinEuMg ?? null,
          sterilityPass: t.sterilityPass ?? null,
          heavyMetalAs: t.heavyMetalAs ?? null,
          heavyMetalCd: t.heavyMetalCd ?? null,
          heavyMetalPb: t.heavyMetalPb ?? null,
          heavyMetalHg: t.heavyMetalHg ?? null,
          createdAt: t.createdAt ?? new Date().toISOString(),
        })));
      })
      .catch(() => setError("Failed to load lab tests"));
  }, [selectedGbId]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this lab test?")) return;
    try {
      await organiserApi.deleteLabTest(id);
      setTests(prev => prev.filter(t => t.id !== id));
    } catch {
      setError("Failed to delete lab test");
    }
  };

  const resetBulk = () => { setReviewRows([]); setBulkResult(null); setBulkUrls(""); };

  // Real per-URL AI extraction — one URL per line, sequential
  const handleExtractFromLinks = async () => {
    const urls = bulkUrls.split("\n").map(u => u.trim()).filter(u => u.length > 0);
    if (!urls.length) { setError("Paste at least one URL"); return; }
    setError(""); setBulkExtracting(true); setBulkResult(null);
    const startIdx = reviewRows.length;
    const newRows: LabReviewRow[] = urls.map(u => ({
      fileName: u, status: "pending",
      url: u, peptideName: "", labName: "Janoshik", batchCode: "", purityPct: "",
      testDate: "", janoshikId: "", mgAmount: "", testType: "",
      productCategory: "", endotoxinEuMg: "", sterilityPass: "",
      heavyMetalAs: "", heavyMetalCd: "", heavyMetalPb: "", heavyMetalHg: "",
    }));
    setReviewRows(prev => [...prev, ...newRows]);
    setBulkUrls("");

    for (let i = 0; i < urls.length; i++) {
      const rowIdx = startIdx + i;
      setReviewRows(rows => rows.map((r, j) => j === rowIdx ? { ...r, status: "extracting" } : r));
      if (!/^https?:\/\//i.test(urls[i])) {
        setReviewRows(rows => rows.map((r, j) => j === rowIdx ? { ...r, status: "error", error: "Not a valid URL" } : r));
        continue;
      }
      try {
        const extracted = await organiserApi.extractLabTest({ url: urls[i] });
        setReviewRows(rows => rows.map((r, j) => j === rowIdx ? {
          ...r, status: "done",
          peptideName: extracted.peptideName ?? r.peptideName,
          labName: extracted.labName ?? r.labName,
          batchCode: extracted.batchCode ?? r.batchCode,
          purityPct: extracted.purityPct != null ? String(extracted.purityPct) : r.purityPct,
          testDate: extracted.testDate ?? r.testDate,
          janoshikId: extracted.janoshikId ?? janoshikIdFromUrl(urls[i]),
          mgAmount: extracted.mgAmount != null ? String(extracted.mgAmount) : r.mgAmount,
          testType: extracted.testType ?? r.testType,
          productCategory: extracted.productCategory ?? r.productCategory,
          endotoxinEuMg: extracted.endotoxinEuMg != null ? String(extracted.endotoxinEuMg) : r.endotoxinEuMg,
          sterilityPass: extracted.sterilityPass != null ? String(extracted.sterilityPass) : r.sterilityPass,
          heavyMetalAs: extracted.heavyMetalAs ?? r.heavyMetalAs,
          heavyMetalCd: extracted.heavyMetalCd ?? r.heavyMetalCd,
          heavyMetalPb: extracted.heavyMetalPb ?? r.heavyMetalPb,
          heavyMetalHg: extracted.heavyMetalHg ?? r.heavyMetalHg,
        } : r));
      } catch (err: unknown) {
        setReviewRows(rows => rows.map((r, j) => j === rowIdx ? { ...r, status: "error", error: err instanceof Error ? err.message : "Extraction failed" } : r));
      }
    }
    setBulkExtracting(false);
  };

  const updateReviewRow = (i: number, k: keyof LabReviewRow, v: string) => {
    setReviewRows(rows => rows.map((r, j) => j === i ? { ...r, [k]: v } : r));
  };
  const removeReviewRow = (i: number) => setReviewRows(rows => rows.filter((_, j) => j !== i));

  const handleBulkSubmit = async () => {
    const readyRows = reviewRows.filter(r => r.status === "done" && r.peptideName.trim());
    if (!readyRows.length) { setError("No ready rows to submit — add a COA URL and peptide name first"); return; }
    setBulkSubmitting(true); setError(""); setBulkResult(null);
    let imported = 0;
    let failed = 0;
    for (const row of readyRows) {
      try {
        const created = await organiserApi.createLabTest({
          groupBuyId: selectedGbId ?? "",
          url: row.url.trim() || undefined,
          peptideName: row.peptideName.trim(),
          labName: row.labName.trim() || undefined,
          batchCode: row.batchCode.trim() || undefined,
          purityPct: row.purityPct || undefined,
          testDate: row.testDate || undefined,
          janoshikId: row.janoshikId.trim() || undefined,
          mgAmount: row.mgAmount ? parseFloat(row.mgAmount) : undefined,
          testType: row.testType.trim() || undefined,
          productCategory: row.productCategory.trim() || undefined,
          endotoxinEuMg: row.endotoxinEuMg ? parseFloat(row.endotoxinEuMg) : undefined,
          sterilityPass: row.sterilityPass !== "" ? row.sterilityPass === "true" : undefined,
          heavyMetalAs: row.heavyMetalAs.trim() || undefined,
          heavyMetalCd: row.heavyMetalCd.trim() || undefined,
          heavyMetalPb: row.heavyMetalPb.trim() || undefined,
          heavyMetalHg: row.heavyMetalHg.trim() || undefined,
        });
        const mapped: OrgLabTest = {
          id: typeof created.id === "number" ? created.id : parseInt(String(created.id)),
          url: created.url ?? null, peptideName: created.peptideName ?? row.peptideName,
          supplier: null, labName: created.labName ?? null, batchCode: created.batchCode ?? null,
          purityPct: created.purityPct != null ? String(created.purityPct) : null,
          testDate: created.testDate ?? null, pending: true, groupBuyId: String(selectedGbId ?? ""),
          janoshikId: created.janoshikId ?? null, mgAmount: created.mgAmount ?? null,
          testType: created.testType ?? null, productCategory: created.productCategory ?? null,
          endotoxinEuMg: created.endotoxinEuMg ?? null, sterilityPass: created.sterilityPass ?? null,
          heavyMetalAs: created.heavyMetalAs ?? null, heavyMetalCd: created.heavyMetalCd ?? null,
          heavyMetalPb: created.heavyMetalPb ?? null, heavyMetalHg: created.heavyMetalHg ?? null,
          createdAt: created.createdAt ?? new Date().toISOString(),
        };
        setTests(prev => [mapped, ...prev]);
        imported++;
      } catch {
        failed++;
      }
    }
    setBulkResult({ imported, failed });
    setReviewRows([]);
    setBulkSubmitting(false);
  };

  // Single file upload → real AI extraction → pre-fill the manual form
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtractLoading(true); setError(""); setExtracted(false);
    try {
      const reader = new FileReader();
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = ev => {
          const result = ev.target?.result as string;
          // result is data:mime;base64,<data>
          resolve(result.split(",")[1] ?? "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const extracted = await organiserApi.extractLabTest({ fileBase64, mimeType: file.type });
      setForm(f => ({
        ...f,
        peptideName: extracted.peptideName ?? f.peptideName,
        labName: extracted.labName ?? f.labName,
        batchCode: extracted.batchCode ?? f.batchCode,
        purityPct: extracted.purityPct != null ? String(extracted.purityPct) : f.purityPct,
        testDate: extracted.testDate ?? f.testDate,
        janoshikId: extracted.janoshikId ?? f.janoshikId,
        mgAmount: extracted.mgAmount != null ? String(extracted.mgAmount) : f.mgAmount,
        testType: extracted.testType ?? f.testType,
        productCategory: extracted.productCategory ?? f.productCategory,
        endotoxinEuMg: extracted.endotoxinEuMg != null ? String(extracted.endotoxinEuMg) : f.endotoxinEuMg,
        sterilityPass: extracted.sterilityPass != null ? String(extracted.sterilityPass) : f.sterilityPass,
        heavyMetalAs: extracted.heavyMetalAs ?? f.heavyMetalAs,
        heavyMetalCd: extracted.heavyMetalCd ?? f.heavyMetalCd,
        heavyMetalPb: extracted.heavyMetalPb ?? f.heavyMetalPb,
        heavyMetalHg: extracted.heavyMetalHg ?? f.heavyMetalHg,
      }));
      setExtracted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtractLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.peptideName.trim()) { setError("Peptide name is required"); return; }
    setSaving(true); setError("");
    try {
      const created = await organiserApi.createLabTest({
        groupBuyId: selectedGbId ?? "",
        url: form.url.trim() || undefined,
        peptideName: form.peptideName.trim(),
        labName: form.labName.trim() || undefined,
        batchCode: form.batchCode.trim() || undefined,
        purityPct: form.purityPct || undefined,
        testDate: form.testDate || undefined,
        janoshikId: form.janoshikId.trim() || undefined,
        mgAmount: form.mgAmount ? parseFloat(form.mgAmount) : undefined,
        testType: form.testType.trim() || undefined,
        productCategory: form.productCategory.trim() || undefined,
        endotoxinEuMg: form.endotoxinEuMg ? parseFloat(form.endotoxinEuMg) : undefined,
        sterilityPass: form.sterilityPass !== "" ? form.sterilityPass === "true" : undefined,
        heavyMetalAs: form.heavyMetalAs.trim() || undefined,
        heavyMetalCd: form.heavyMetalCd.trim() || undefined,
        heavyMetalPb: form.heavyMetalPb.trim() || undefined,
        heavyMetalHg: form.heavyMetalHg.trim() || undefined,
      });
      const test: OrgLabTest = {
        id: typeof created.id === "number" ? created.id : parseInt(String(created.id)),
        url: created.url ?? null, peptideName: created.peptideName ?? form.peptideName.trim(),
        supplier: null, labName: created.labName ?? null, batchCode: created.batchCode ?? null,
        purityPct: created.purityPct != null ? String(created.purityPct) : null,
        testDate: created.testDate ?? null, pending: true, groupBuyId: String(selectedGbId ?? ""),
        janoshikId: created.janoshikId ?? null, mgAmount: created.mgAmount ?? null,
        testType: created.testType ?? null, productCategory: created.productCategory ?? null,
        endotoxinEuMg: created.endotoxinEuMg ?? null, sterilityPass: created.sterilityPass ?? null,
        heavyMetalAs: created.heavyMetalAs ?? null, heavyMetalCd: created.heavyMetalCd ?? null,
        heavyMetalPb: created.heavyMetalPb ?? null, heavyMetalHg: created.heavyMetalHg ?? null,
        createdAt: created.createdAt ?? new Date().toISOString(),
      };
      setTests(prev => [test, ...prev]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setForm(DEFAULT_FORM);
      setExtracted(false);
      setMode("none");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save lab test");
    } finally {
      setSaving(false);
    }
  };

  if (!selectedGbId) {
    return (
      <div className="rounded-xl p-8 sm:p-12 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <FlaskConical className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
        <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>
          No Group Buy Selected
        </h3>
        <p className="text-[14px]" style={{ color: "var(--t-subtle)" }}>
          Select a group buy to manage lab tests
        </p>
      </div>
    );
  }

  const readyCount = reviewRows.filter(r => r.status === "done" && r.peptideName.trim()).length;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="rounded-xl p-4 sm:p-5 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <h2 className="text-lg sm:text-xl font-bold" style={{ color: "var(--t-text)" }}>Lab Tests</h2>
        <p className="text-[13px] sm:text-[14px] mt-1" style={{ color: "var(--t-subtle)" }}>
          Upload and manage lab test results for your products
        </p>
      </div>

      {/* Explainer */}
      <div className="rounded-xl p-4 sm:p-5 bg-gradient-to-br from-purple-50 to-pink-50" style={{ border: "1px solid #E9D5FF" }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "#A855F7", color: "#fff" }}>
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>How Lab Tests Work</h3>
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
              Upload lab test certificates from Janoshik or other labs. Our AI can extract purity, batch codes, and test dates automatically. Tests are shown to members to prove product quality. New submissions are marked <strong>Pending Review</strong> until approved.
            </p>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
          <p className="text-[13px] font-semibold" style={{ color: "#DC2626" }}>{error}</p>
          <button onClick={() => setError("")} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-100">
            <X className="w-3.5 h-3.5" style={{ color: "#DC2626" }} />
          </button>
        </div>
      )}

      {/* Add Test Buttons */}
      {mode === "none" && (
        <div className="rounded-xl p-4 bg-white space-y-3" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <button
            onClick={() => { setMode("bulk"); resetBulk(); }}
            className="w-full p-4 rounded-lg text-left hover:bg-black/[0.02] transition-colors"
            style={{ border: `1px solid ${V2_CARD_BORDER}` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#EFF6FF" }}>
                <Sparkles className="w-5 h-5" style={{ color: "var(--t-blue)" }} />
              </div>
              <div className="flex-1">
                <h3 className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>AI Bulk Import from URLs</h3>
                <p className="text-[13px] mt-0.5" style={{ color: "var(--t-subtle)" }}>
                  Paste Janoshik URLs, review the extracted data, then submit all at once
                </p>
              </div>
              <ChevronRight className="w-5 h-5 shrink-0" style={{ color: "var(--t-subtle)" }} />
            </div>
          </button>

          <button
            onClick={() => setMode("manual")}
            className="w-full p-4 rounded-lg text-left hover:bg-black/[0.02] transition-colors"
            style={{ border: `1px solid ${V2_CARD_BORDER}` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#F0FDF4" }}>
                <FileText className="w-5 h-5" style={{ color: "#16A34A" }} />
              </div>
              <div className="flex-1">
                <h3 className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Add Manually</h3>
                <p className="text-[13px] mt-0.5" style={{ color: "var(--t-subtle)" }}>
                  Upload a PDF/image for AI extraction or fill in details by hand
                </p>
              </div>
              <ChevronRight className="w-5 h-5 shrink-0" style={{ color: "var(--t-subtle)" }} />
            </div>
          </button>
        </div>
      )}

      {/* AI Bulk Import Mode */}
      {mode === "bulk" && (
        <div className="rounded-xl p-4 bg-white space-y-3" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>AI Bulk Lab Import</h3>
            <button onClick={() => { setMode("none"); resetBulk(); }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5">
              <X className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
            </button>
          </div>

          <div className="p-3 rounded-lg" style={{ background: "#EFF6FF", border: "1px solid #DBEAFE" }}>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
              <strong style={{ color: "var(--t-text)" }}>Paste COA/Janoshik report URLs</strong> — one per line. AI extracts each report's data into a review table. Edit if needed, then confirm to submit all at once.
            </p>
          </div>

          <textarea
            value={bulkUrls}
            onChange={(e) => setBulkUrls(e.target.value)}
            disabled={bulkExtracting}
            placeholder={"https://janoshik.com/results/J-12345\nhttps://janoshik.com/results/J-67890"}
            rows={4}
            className="w-full px-3 py-2 rounded-lg text-[14px] font-mono outline-none resize-none"
            style={{ ...inputStyle, lineHeight: 1.6 }}
          />

          <button
            onClick={handleExtractFromLinks}
            disabled={bulkExtracting || !bulkUrls.trim()}
            className="w-full h-10 rounded-lg text-[14px] font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "var(--t-blue)" }}
          >
            {bulkExtracting ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Extracting…</>
            ) : (
              <><Sparkles className="w-4 h-4" />Extract from Links</>
            )}
          </button>

          {/* Review table */}
          {reviewRows.length > 0 && (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-lg" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
                <table className="w-full text-[12px]" style={{ minWidth: 1050 }}>
                  <thead>
                    <tr style={{ background: "var(--t-surface2)" }}>
                      {["Link", "Status", "Peptide Name", "Lab", "Purity %", "mg", "Batch", "Test Date", "Sterility", "As", "Cd", "Pb", "Hg", "COA URL", ""].map(h => (
                        <th key={h} className="text-left px-2 py-2 font-bold whitespace-nowrap" style={{ color: "var(--t-subtle)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reviewRows.map((row, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${V2_CARD_BORDER}` }}>
                        <td className="px-2 py-1.5 max-w-[100px] truncate" style={{ color: "var(--t-muted)" }} title={row.fileName}>{row.fileName}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          {row.status === "extracting" && <span className="flex items-center gap-1" style={{ color: "var(--t-blue)" }}><Loader2 className="w-3 h-3 animate-spin" />Extracting</span>}
                          {row.status === "pending" && <span style={{ color: "var(--t-subtle)" }}>Pending</span>}
                          {row.status === "done" && <span style={{ color: "#16A34A" }}>✓ Ready</span>}
                          {row.status === "error" && <span style={{ color: "#DC2626" }} title={row.error}>Error</span>}
                        </td>
                        <td className="px-1 py-1.5"><input value={row.peptideName} onChange={e => updateReviewRow(i, "peptideName", e.target.value)} placeholder="BPC-157" className={`${cellInputCls} w-28`} style={inputStyle} /></td>
                        <td className="px-1 py-1.5"><input value={row.labName} onChange={e => updateReviewRow(i, "labName", e.target.value)} placeholder="Lab" className={`${cellInputCls} w-20`} style={inputStyle} /></td>
                        <td className="px-1 py-1.5"><input type="number" value={row.purityPct} onChange={e => updateReviewRow(i, "purityPct", e.target.value)} placeholder="%" className={`${cellInputCls} w-16`} style={inputStyle} /></td>
                        <td className="px-1 py-1.5"><input type="number" value={row.mgAmount} onChange={e => updateReviewRow(i, "mgAmount", e.target.value)} placeholder="mg" className={`${cellInputCls} w-14`} style={inputStyle} /></td>
                        <td className="px-1 py-1.5"><input value={row.batchCode} onChange={e => updateReviewRow(i, "batchCode", e.target.value)} placeholder="Batch" className={`${cellInputCls} w-20`} style={inputStyle} /></td>
                        <td className="px-1 py-1.5"><input type="date" value={row.testDate} onChange={e => updateReviewRow(i, "testDate", e.target.value)} className={`${cellInputCls} w-32`} style={inputStyle} /></td>
                        <td className="px-1 py-1.5">
                          <select value={row.sterilityPass} onChange={e => updateReviewRow(i, "sterilityPass", e.target.value)} className={`${cellInputCls} appearance-none w-20`} style={inputStyle}>
                            <option value="">—</option>
                            <option value="true">Pass</option>
                            <option value="false">Fail</option>
                          </select>
                        </td>
                        <td className="px-1 py-1.5"><input value={row.heavyMetalAs} onChange={e => updateReviewRow(i, "heavyMetalAs", e.target.value)} placeholder="n/d" className={`${cellInputCls} w-16`} style={inputStyle} /></td>
                        <td className="px-1 py-1.5"><input value={row.heavyMetalCd} onChange={e => updateReviewRow(i, "heavyMetalCd", e.target.value)} placeholder="n/d" className={`${cellInputCls} w-16`} style={inputStyle} /></td>
                        <td className="px-1 py-1.5"><input value={row.heavyMetalPb} onChange={e => updateReviewRow(i, "heavyMetalPb", e.target.value)} placeholder="n/d" className={`${cellInputCls} w-16`} style={inputStyle} /></td>
                        <td className="px-1 py-1.5"><input value={row.heavyMetalHg} onChange={e => updateReviewRow(i, "heavyMetalHg", e.target.value)} placeholder="n/d" className={`${cellInputCls} w-16`} style={inputStyle} /></td>
                        <td className="px-1 py-1.5"><input type="url" value={row.url} onChange={e => updateReviewRow(i, "url", e.target.value)} placeholder="https://..." className={`${cellInputCls} w-40`} style={inputStyle} /></td>
                        <td className="px-1 py-1.5">
                          <button onClick={() => removeReviewRow(i)} className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "rgba(220,38,38,0.07)" }}>
                            <X className="w-3 h-3" style={{ color: "#DC2626" }} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {bulkResult && (
                <div className="flex gap-4 text-[13px]">
                  <span style={{ color: "#16A34A" }}><CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />{bulkResult.imported} submitted</span>
                  {bulkResult.failed > 0 && <span style={{ color: "#DC2626" }}><X className="w-3.5 h-3.5 inline mr-1" />{bulkResult.failed} failed</span>}
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setReviewRows([])} className="h-10 px-4 rounded-lg text-[13px] font-bold hover:bg-black/5" style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-muted)" }}>
                  Clear
                </button>
                <button
                  onClick={handleBulkSubmit}
                  disabled={bulkSubmitting || readyCount === 0}
                  className="flex-1 h-10 rounded-lg text-[13px] font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "var(--t-blue)" }}
                >
                  {bulkSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {bulkSubmitting ? "Submitting…" : `Submit ${readyCount} lab test(s)`}
                </button>
              </div>
            </div>
          )}

          {bulkResult && reviewRows.length === 0 && (
            <div className="flex gap-4 text-[13px]">
              <span style={{ color: "#16A34A" }}><CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />{bulkResult.imported} submitted</span>
            </div>
          )}
        </div>
      )}

      {/* Manual Mode */}
      {mode === "manual" && (
        <div className="rounded-xl p-4 bg-white space-y-3" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Submit Lab Test</h3>
            <button onClick={() => { setMode("none"); setExtracted(false); }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5">
              <X className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
            </button>
          </div>

          <div className="p-3 rounded-lg" style={{ background: "#EFF6FF", border: "1px solid #DBEAFE" }}>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
              <strong style={{ color: "var(--t-text)" }}>Upload a file:</strong> Our AI will extract data from PDFs or images and pre-fill the form. Or fill in the fields manually below.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={extractLoading}
            className="w-full h-10 rounded-lg text-[14px] font-semibold flex items-center justify-center gap-2 hover:bg-black/5 disabled:opacity-50"
            style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
          >
            {extractLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Extracting…</>
            ) : (
              <><Upload className="w-4 h-4" />Upload & Extract (PDF or Image)</>
            )}
          </button>

          {extracted && (
            <div className="p-2.5 rounded-lg text-[13px]" style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", color: "#16A34A" }}>
              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />AI extracted data from your file — review and confirm below.
            </div>
          )}

          <form onSubmit={handleManualSave} className="space-y-3">
            <Field label="COA / Report URL">
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://janoshik.com/results/J-12345"
                className={inputCls}
                style={inputStyle}
              />
            </Field>

            <Field label="Peptide / Product Name *">
              <input
                type="text"
                value={form.peptideName}
                onChange={(e) => setForm({ ...form, peptideName: e.target.value })}
                placeholder="e.g. BPC-157 5mg"
                required
                className={inputCls}
                style={inputStyle}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Lab Name">
                <input type="text" value={form.labName} onChange={(e) => setForm({ ...form, labName: e.target.value })} placeholder="Janoshik" className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Janoshik ID">
                <input type="text" value={form.janoshikId} onChange={(e) => setForm({ ...form, janoshikId: e.target.value })} placeholder="J-12345" className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Batch Code">
                <input type="text" value={form.batchCode} onChange={(e) => setForm({ ...form, batchCode: e.target.value })} placeholder="B240301" className={inputCls} style={inputStyle} />
              </Field>
              <Field label="mg Amount">
                <input type="number" value={form.mgAmount} onChange={(e) => setForm({ ...form, mgAmount: e.target.value })} placeholder="e.g. 5" min="0" step="0.01" className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Purity %">
                <input type="number" value={form.purityPct} onChange={(e) => setForm({ ...form, purityPct: e.target.value })} placeholder="98.5" min="0" max="100" step="0.01" className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Test Date">
                <input type="date" value={form.testDate} onChange={(e) => setForm({ ...form, testDate: e.target.value })} className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Test Type">
                <input type="text" value={form.testType} onChange={(e) => setForm({ ...form, testType: e.target.value })} placeholder="HPLC / MS / etc." className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Product Category">
                <input type="text" value={form.productCategory} onChange={(e) => setForm({ ...form, productCategory: e.target.value })} placeholder="peptide / aas" className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Endotoxin (EU/mg)">
                <input type="number" value={form.endotoxinEuMg} onChange={(e) => setForm({ ...form, endotoxinEuMg: e.target.value })} placeholder="0.5" min="0" step="0.01" className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Sterility Pass">
                <select value={form.sterilityPass} onChange={(e) => setForm({ ...form, sterilityPass: e.target.value })} className={`${inputCls} appearance-none`} style={inputStyle}>
                  <option value="">— unknown —</option>
                  <option value="true">Pass</option>
                  <option value="false">Fail</option>
                </select>
              </Field>
              <Field label="Arsenic (As)">
                <input type="text" value={form.heavyMetalAs} onChange={(e) => setForm({ ...form, heavyMetalAs: e.target.value })} placeholder="not detected" className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Cadmium (Cd)">
                <input type="text" value={form.heavyMetalCd} onChange={(e) => setForm({ ...form, heavyMetalCd: e.target.value })} placeholder="not detected" className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Lead (Pb)">
                <input type="text" value={form.heavyMetalPb} onChange={(e) => setForm({ ...form, heavyMetalPb: e.target.value })} placeholder="not detected" className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Mercury (Hg)">
                <input type="text" value={form.heavyMetalHg} onChange={(e) => setForm({ ...form, heavyMetalHg: e.target.value })} placeholder="not detected" className={inputCls} style={inputStyle} />
              </Field>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full h-10 rounded-lg text-[14px] font-bold text-white flex items-center justify-center gap-2"
              style={{ background: saved ? "#16A34A" : "var(--t-blue)" }}
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
              ) : saved ? (
                <><CheckCircle2 className="w-4 h-4" />Saved!</>
              ) : (
                <><Check className="w-4 h-4" />Submit Lab Test</>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Lab Tests List */}
      {tests.length > 0 && (
        <div className="rounded-xl p-4 bg-white space-y-3" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <h3 className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Lab Test Results ({tests.length})</h3>

          {tests.map(test => {
            const isExpanded = expandedTest === test.id;

            return (
              <div key={test.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
                <button
                  onClick={() => setExpandedTest(isExpanded ? null : test.id)}
                  className="w-full px-4 py-3 text-left hover:bg-black/[0.02] transition-colors"
                  style={{ background: "var(--t-surface2)", borderBottom: isExpanded ? `1px solid ${V2_CARD_BORDER}` : "none" }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <FlaskConical className="w-5 h-5 shrink-0" style={{ color: "var(--t-blue)" }} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>{test.peptideName}</h4>
                          {test.purityPct && (
                            <span className="text-[12px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#D1FADF", color: "#12B76A" }}>
                              {test.purityPct}% purity
                            </span>
                          )}
                          {test.pending ? (
                            <span className="text-[12px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(217,119,6,0.1)", color: "#D97706" }}>Pending Review</span>
                          ) : (
                            <span className="text-[12px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(22,163,74,0.1)", color: "#16A34A" }}>Approved</span>
                          )}
                        </div>
                        <p className="text-[12px] mt-0.5" style={{ color: "var(--t-subtle)" }}>
                          {test.labName || "Unknown lab"} • {test.batchCode || "No batch"} • {test.testDate || "No date"}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 shrink-0" style={{ color: "var(--t-blue)" }} />
                    ) : (
                      <ChevronRight className="w-5 h-5 shrink-0" style={{ color: "var(--t-subtle)" }} />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4 space-y-3 bg-white">
                    <div className="grid grid-cols-2 gap-3">
                      {test.supplier && (
                        <div>
                          <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--t-subtle)" }}>Supplier</p>
                          <p className="text-[13px] mt-0.5" style={{ color: "var(--t-text)" }}>{test.supplier}</p>
                        </div>
                      )}
                      {test.janoshikId && (
                        <div>
                          <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--t-subtle)" }}>Janoshik ID</p>
                          <p className="text-[13px] mt-0.5" style={{ color: "var(--t-text)" }}>{test.janoshikId}</p>
                        </div>
                      )}
                      {test.mgAmount != null && (
                        <div>
                          <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--t-subtle)" }}>Amount</p>
                          <p className="text-[13px] mt-0.5" style={{ color: "var(--t-text)" }}>{test.mgAmount} mg</p>
                        </div>
                      )}
                      {test.testType && (
                        <div>
                          <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--t-subtle)" }}>Test Type</p>
                          <p className="text-[13px] mt-0.5" style={{ color: "var(--t-text)" }}>{test.testType}</p>
                        </div>
                      )}
                      {test.productCategory && (
                        <div>
                          <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--t-subtle)" }}>Category</p>
                          <p className="text-[13px] mt-0.5" style={{ color: "var(--t-text)" }}>{test.productCategory}</p>
                        </div>
                      )}
                      {test.endotoxinEuMg != null && (
                        <div>
                          <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--t-subtle)" }}>Endotoxin</p>
                          <p className="text-[13px] mt-0.5" style={{ color: "var(--t-text)" }}>{test.endotoxinEuMg} EU/mg</p>
                        </div>
                      )}
                      {test.sterilityPass != null && (
                        <div>
                          <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--t-subtle)" }}>Sterility</p>
                          <p className="text-[13px] mt-0.5 font-semibold" style={{ color: test.sterilityPass ? "#16A34A" : "#DC2626" }}>
                            {test.sterilityPass ? "Pass" : "Fail"}
                          </p>
                        </div>
                      )}
                      {(test.heavyMetalAs || test.heavyMetalCd || test.heavyMetalPb || test.heavyMetalHg) && (
                        <div className="col-span-2">
                          <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--t-subtle)" }}>Heavy Metals</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {test.heavyMetalAs && <span className="text-[12px] px-2 py-0.5 rounded-full" style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: `1px solid ${V2_CARD_BORDER}` }}>As: {test.heavyMetalAs}</span>}
                            {test.heavyMetalCd && <span className="text-[12px] px-2 py-0.5 rounded-full" style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: `1px solid ${V2_CARD_BORDER}` }}>Cd: {test.heavyMetalCd}</span>}
                            {test.heavyMetalPb && <span className="text-[12px] px-2 py-0.5 rounded-full" style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: `1px solid ${V2_CARD_BORDER}` }}>Pb: {test.heavyMetalPb}</span>}
                            {test.heavyMetalHg && <span className="text-[12px] px-2 py-0.5 rounded-full" style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: `1px solid ${V2_CARD_BORDER}` }}>Hg: {test.heavyMetalHg}</span>}
                          </div>
                        </div>
                      )}
                    </div>

                    {test.url && (
                      <a
                        href={test.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[13px] font-semibold hover:underline"
                        style={{ color: "var(--t-blue)" }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Certificate
                      </a>
                    )}

                    {test.pending && (
                      <button
                        onClick={() => handleDelete(test.id)}
                        className="w-full h-9 rounded-lg text-[13px] font-semibold hover:bg-red-50 flex items-center justify-center gap-1.5"
                        style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "#DC2626" }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Test
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tests.length === 0 && mode === "none" && (
        <div className="rounded-xl p-8 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <FlaskConical className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
          <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>No Lab Tests Yet</h3>
          <p className="text-[14px]" style={{ color: "var(--t-subtle)" }}>
            Add your first lab test to show product quality to members
          </p>
        </div>
      )}
    </div>
  );
}
