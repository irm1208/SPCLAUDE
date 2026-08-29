import React, { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, QrCode, Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, RefreshCw, X, Truck, Package, CheckCircle2, RotateCcw, Download, ExternalLink } from "lucide-react";
// @ts-ignore — Vite resolves the bundled PDF.js worker URL at build time.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

interface QrOrder {
  id: string;
  code: string;
  telegramUsername: string;
  deliveryMethod: string;
  hasInpostQr: boolean;
  hasRoyalMailQr: boolean;
  hasQrCodes: boolean;
  qrPosted: boolean;
  status: string;
}

interface LazyQrData {
  inpostQrCode: string | null;
  royalMailQrCode: string | null;
  qrCodes: Record<string, string> | null;
}

interface PageData {
  gbName: string;
  orders: QrOrder[];
}

const NAVY = "#1B3A7A";
const BLUE = "#2D6BCC";

function stripAt(username: string) {
  return username.replace(/^@+/, "");
}

function labelForKey(key: string): string {
  if (key === "inpost") return "InPost";
  if (key === "royal-mail") return "Royal Mail";
  if (key === "custom") return "Delivery QR";
  return key.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function ImageModal({ src, label, username, onClose }: { src: string; label: string; username: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative max-w-md w-full rounded-2xl overflow-hidden bg-white p-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center z-10"
          style={{ background: "rgba(0,0,0,0.08)" }}
        >
          <X className="w-4 h-4" style={{ color: "#64748B" }} />
        </button>
        <p className="text-[11px] font-bold uppercase tracking-wide text-center mb-3" style={{ color: "#94A3B8" }}>
          {label} · @{stripAt(username)}
        </p>
        <img
          src={src}
          alt={`${label} QR for @${stripAt(username)}`}
          className="w-full h-auto rounded-xl object-contain"
          style={{ maxHeight: "70vh" }}
        />
      </div>
    </div>
  );
}

function isPdf(src: string) {
  return /^data:application\/(?:pdf|octet-stream)/i.test(src)
    || /^data:[^,]+;base64,JVBE/i.test(src);
}

function dataUrlToBytes(src: string): Uint8Array {
  const comma = src.indexOf(",");
  if (comma === -1) throw new Error("Invalid PDF data URL");

  const metadata = src.slice(0, comma);
  const payload = src.slice(comma + 1);
  if (!metadata.toLowerCase().includes(";base64")) {
    return new TextEncoder().encode(decodeURIComponent(payload));
  }

  const raw = atob(payload);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function sourceToPdfBytes(src: string): Promise<Uint8Array> {
  if (src.startsWith("data:")) return dataUrlToBytes(src);
  const response = await fetch(src, { credentials: "include" });
  if (!response.ok) throw new Error(`Could not load PDF (${response.status})`);
  return new Uint8Array(await response.arrayBuffer());
}

function dataToPdfBlobUrl(src: string): string {
  if (!src.startsWith("data:")) return src;
  const bytes = dataUrlToBytes(src);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return URL.createObjectURL(new Blob([buffer], { type: "application/pdf" }));
}

function PdfPreview({ src, label, username }: { src: string; label: string; username: string }) {
  const [pdfSrc, setPdfSrc] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [rendering, setRendering] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let blobUrl: string | null = null;
    try {
      blobUrl = dataToPdfBlobUrl(src);
      setPdfSrc(blobUrl);
    } catch {
      setPdfSrc(src);
    }
    return () => {
      if (blobUrl?.startsWith("blob:")) URL.revokeObjectURL(blobUrl);
    };
  }, [src]);

  useEffect(() => {
    setPageNumber(1);
  }, [src]);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: { destroy: () => Promise<void> } | null = null;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;

    async function renderPage() {
      setRendering(true);
      setRenderError(null);
      try {
        const [pdfjsLib, bytes] = await Promise.all([
          import("pdfjs-dist"),
          sourceToPdfBytes(src),
        ]);
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        const task = pdfjsLib.getDocument({ data: bytes });
        loadingTask = task;
        const pdf = await task.promise;
        if (cancelled) return;

        setPageCount(pdf.numPages);
        const safePageNumber = Math.min(pageNumber, pdf.numPages);
        if (safePageNumber !== pageNumber) {
          setPageNumber(safePageNumber);
          return;
        }

        const page = await pdf.getPage(safePageNumber);
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) throw new Error("PDF preview canvas is unavailable");

        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(280, previewRef.current?.clientWidth ?? 640);
        const displayScale = Math.min(availableWidth / baseViewport.width, 1.75);
        const viewport = page.getViewport({ scale: displayScale });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        renderTask = page.render({
          canvas,
          viewport,
          transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
        });
        await renderTask.promise;
      } catch (error) {
        if (!cancelled) {
          console.error("[GbQrCodesPanel] PDF preview failed", error);
          setRenderError("The inline preview could not be rendered. You can still open or save the PDF below.");
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    }

    renderPage();
    return () => {
      cancelled = true;
      renderTask?.cancel();
      void loadingTask?.destroy();
    };
  }, [src, pageNumber]);

  const filename = `${label.toLowerCase().replace(/\s+/g, "-")}-qr-${stripAt(username)}.pdf`;

  return (
    <div className="w-full max-w-2xl space-y-2">
      <div
        ref={previewRef}
        className="relative flex min-h-[220px] w-full items-start justify-center overflow-auto rounded-xl bg-white"
        style={{ maxHeight: "68vh", border: "1px solid rgba(27,58,122,0.15)" }}
      >
        {renderError ? (
          <div className="flex min-h-[220px] max-w-md items-center justify-center p-6 text-center">
            <p className="text-sm" style={{ color: "#64748B" }}>{renderError}</p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            aria-label={`${label} PDF preview for @${stripAt(username)}`}
            className="block max-w-full"
          />
        )}
        {rendering && !renderError && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: NAVY }} />
          </div>
        )}
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPageNumber(page => Math.max(1, page - 1))}
            disabled={pageNumber <= 1 || rendering}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40"
            style={{ color: NAVY, border: "1px solid rgba(27,58,122,0.18)" }}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </button>
          <span className="text-xs font-semibold" style={{ color: "#64748B" }}>
            Page {pageNumber} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPageNumber(page => Math.min(pageCount, page + 1))}
            disabled={pageNumber >= pageCount || rendering}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40"
            style={{ color: NAVY, border: "1px solid rgba(27,58,122,0.18)" }}
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        <a
          href={pdfSrc ?? src}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)` }}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open PDF
        </a>
        <a
          href={pdfSrc ?? src}
          download={filename}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold"
          style={{ background: "rgba(27,58,122,0.08)", border: "1px solid rgba(27,58,122,0.18)", color: NAVY }}
        >
          <Download className="w-3.5 h-3.5" />
          Save PDF
        </a>
      </div>
    </div>
  );
}

function QrImage({ src, label, username }: { src: string; label: string; username: string }) {
  const [showModal, setShowModal] = useState(false);

  if (isPdf(src)) {
    return (
      <div className="flex w-full flex-col items-center gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#94A3B8" }}>{label}</p>
        <PdfPreview src={src} label={label} username={username} />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#94A3B8" }}>{label}</p>
        <img
          src={src}
          alt={`${label} for @${stripAt(username)}`}
          className="w-56 h-56 object-contain rounded-2xl p-2 cursor-zoom-in transition-opacity hover:opacity-80"
          style={{ border: `1px solid rgba(27,58,122,0.15)`, background: "#fff" }}
          onClick={() => setShowModal(true)}
          title="Click to enlarge"
        />
      </div>
      {showModal && <ImageModal src={src} label={label} username={username} onClose={() => setShowModal(false)} />}
    </>
  );
}

function getExtraQrCodes(qrCodes: Record<string, string> | null): [string, string][] {
  if (!qrCodes) return [];
  return Object.entries(qrCodes).filter(([key]) => key !== "inpost" && key !== "royal-mail");
}

function hasAnyQr(order: QrOrder): boolean {
  return order.hasInpostQr || order.hasRoyalMailQr || order.hasQrCodes;
}

function OrderCard({
  order,
  gbId,
  mode,
  fetchOptions,
  onTogglePosted,
}: {
  order: QrOrder;
  gbId: string;
  mode: "organiser" | "admin";
  fetchOptions: RequestInit;
  onTogglePosted: (orderId: string, posted: boolean) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qrData, setQrData] = useState<LazyQrData | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  const hasInpost = order.hasInpostQr;
  const hasRoyalMail = order.hasRoyalMailQr;
  const hasAny = order.hasInpostQr || order.hasRoyalMailQr || order.hasQrCodes;

  async function loadQrData() {
    if (qrData || qrLoading) return;
    setQrLoading(true);
    setQrError(null);
    try {
      const url = mode === "organiser"
        ? `/api/organiser/group-buys/${gbId}/orders/${order.id}/qr-data`
        : `/api/admin/group-buys/${gbId}/orders/${order.id}/qr-data`;
      const res = await fetch(url, fetchOptions);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setQrData(await res.json());
    } catch {
      setQrError("Could not load QR images");
    } finally {
      setQrLoading(false);
    }
  }

  function handleExpand() {
    const next = !open;
    setOpen(next);
    if (next && hasAny) loadQrData();
  }

  async function handleTogglePosted(e: React.MouseEvent) {
    e.stopPropagation();
    setSaving(true);
    try {
      await onTogglePosted(order.id, !order.qrPosted);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: `1px solid ${order.qrPosted ? "rgba(22,163,74,0.2)" : hasAny ? "rgba(27,58,122,0.2)" : "rgba(148,163,184,0.25)"}`,
        background: order.qrPosted ? "rgba(22,163,74,0.03)" : hasAny ? "rgba(27,58,122,0.03)" : "#fafafa",
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
          onClick={handleExpand}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: order.qrPosted ? "rgba(22,163,74,0.1)" : hasAny ? "rgba(27,58,122,0.08)" : "rgba(148,163,184,0.1)" }}
          >
            {order.qrPosted
              ? <CheckCircle2 className="w-4 h-4" style={{ color: "#16A34A" }} />
              : hasAny
                ? <QrCode className="w-4 h-4" style={{ color: NAVY }} />
                : <Package className="w-4 h-4" style={{ color: "#94A3B8" }} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: order.qrPosted ? "#16A34A" : hasAny ? NAVY : "#64748B" }}>
              @{stripAt(order.telegramUsername)}
            </p>
            <p className="text-[11px] truncate" style={{ color: "#94A3B8" }}>
              {order.code} · {order.deliveryMethod || "—"}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {hasInpost && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline" style={{ background: "rgba(27,58,122,0.1)", color: NAVY }}>InPost</span>
          )}
          {hasRoyalMail && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline" style={{ background: "rgba(220,38,38,0.08)", color: "#B91C1C" }}>RM</span>
          )}
          {order.hasQrCodes && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline" style={{ background: "rgba(27,58,122,0.1)", color: NAVY }}>QR</span>
          )}

          {order.qrPosted ? (
            <button
              type="button"
              onClick={handleTogglePosted}
              disabled={saving}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all hover:opacity-80"
              style={{ background: "rgba(27,58,122,0.08)", borderColor: "rgba(27,58,122,0.2)", color: NAVY, minWidth: 68 }}
              title="Mark as not posted"
            >
              {saving ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RotateCcw className="w-2.5 h-2.5" />}
              Posted
            </button>
          ) : hasAny ? (
            <button
              type="button"
              onClick={handleTogglePosted}
              disabled={saving}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-white transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)`, minWidth: 100 }}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Order Posted
            </button>
          ) : null}

          {hasAny && (
            <button
              type="button"
              onClick={handleExpand}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(27,58,122,0.05)" }}
            >
              {open ? <ChevronUp className="w-4 h-4" style={{ color: NAVY }} /> : <ChevronDown className="w-4 h-4" style={{ color: NAVY }} />}
            </button>
          )}
        </div>
      </div>

      {open && hasAny && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: "rgba(27,58,122,0.1)" }}>
          <div className="flex flex-col items-center gap-4 pt-3">
            <p className="text-xs font-semibold" style={{ color: NAVY }}>@{stripAt(order.telegramUsername)} · {order.deliveryMethod}</p>
            {qrLoading && <Loader2 className="w-5 h-5 animate-spin" style={{ color: NAVY }} />}
            {qrError && <p className="text-xs" style={{ color: "#DC2626" }}>{qrError}</p>}
            {qrData && (
              <>
                {hasInpost && qrData.inpostQrCode && (
                  <QrImage src={qrData.inpostQrCode} label="InPost" username={order.telegramUsername} />
                )}
                {hasRoyalMail && qrData.royalMailQrCode && (
                  <QrImage src={qrData.royalMailQrCode} label="Royal Mail" username={order.telegramUsername} />
                )}
                {getExtraQrCodes(qrData.qrCodes).map(([key, src]) => (
                  <QrImage key={key} src={src} label={labelForKey(key)} username={order.telegramUsername} />
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon, label, count, color }: { icon: React.ReactNode; label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="flex items-center gap-1.5 shrink-0" style={{ color }}>
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-widest">{label}</span>
        <span
          className="px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none"
          style={{ background: `${color}18`, color }}
        >
          {count}
        </span>
      </div>
      <div className="flex-1 h-px" style={{ background: `${color}28` }} />
    </div>
  );
}

export interface GbQrCodesPanelProps {
  gbId: string;
  mode: "organiser" | "admin";
  adminSecret?: string;
}

export function GbQrCodesPanel({ gbId, mode, adminSecret }: GbQrCodesPanelProps) {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "not-posted" | "posted" | "waiting">("all");

  const fetchHeaders: Record<string, string> = mode === "admin" && adminSecret
    ? { "x-admin-secret": adminSecret }
    : {};

  const fetchOptions: RequestInit = mode === "organiser"
    ? { credentials: "include" }
    : { headers: fetchHeaders };

  const load = useCallback(async (isRetry = false) => {
    if (!gbId) return;
    setLoading(true);
    setError(null);
    try {
      const url = mode === "organiser"
        ? `/api/organiser/group-buys/${gbId}/all-orders-qr`
        : `/api/admin/group-buys/${gbId}/all-orders-qr`;
      const res = await fetch(url, fetchOptions);
      if (!res.ok) {
        const rawText = await res.text().catch(() => "");
        console.error(`[GbQrCodesPanel] ${url} → ${res.status}`, rawText.slice(0, 500));
        // If we get a bare 500 with no body (server startup window), auto-retry once after 3s
        if (!isRetry && res.status === 500 && !rawText.trim()) {
          setLoading(true);
          setTimeout(() => { load(true); }, 3000);
          return;
        }
        let j: { error?: string } = {};
        try { j = JSON.parse(rawText); } catch { /* not json */ }
        setError(j.error ?? `Server error ${res.status}: ${rawText.slice(0, 200) || "no body"}`);
        return;
      }
      setData(await res.json());
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gbId, mode, adminSecret]);

  useEffect(() => { load(); }, [load]);

  const handleTogglePosted = useCallback(async (orderId: string, posted: boolean) => {
    const url = mode === "organiser"
      ? `/api/organiser/group-buys/${gbId}/orders/${orderId}/qr-posted`
      : `/api/admin/orders/${orderId}/qr-posted`;
    const res = await fetch(url, {
      method: "PATCH",
      ...(mode === "organiser" ? { credentials: "include" } : { headers: fetchHeaders }),
      headers: { "Content-Type": "application/json", ...fetchHeaders },
      body: JSON.stringify({ posted }),
    });
    if (!res.ok) throw new Error("Failed to update");
    setData(prev => {
      if (!prev) return prev;
      return { ...prev, orders: prev.orders.map(o => o.id === orderId ? { ...o, qrPosted: posted } : o) };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gbId, mode, adminSecret]);

  const allOrders = data?.orders ?? [];
  const withQr = allOrders.filter(o => hasAnyQr(o));
  const waitingOrders = allOrders.filter(o => !hasAnyQr(o));
  const notPostedOrders = withQr.filter(o => !o.qrPosted);
  const postedOrders = withQr.filter(o => o.qrPosted);
  const totalCount = allOrders.length;
  const qrCount = withQr.length;

  function matchesSearch(o: QrOrder) {
    return (
      !search ||
      stripAt(o.telegramUsername).toLowerCase().includes(search.toLowerCase()) ||
      o.code.toLowerCase().includes(search.toLowerCase())
    );
  }
  const filteredNotPosted = notPostedOrders.filter(matchesSearch);
  const filteredPosted = postedOrders.filter(matchesSearch);
  const filteredWaiting = waitingOrders.filter(matchesSearch);

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--t-text, #0f172a)" }}>QR Codes</p>
          {data && (
            <p className="text-[11px]" style={{ color: "var(--t-subtle, #94a3b8)" }}>
              {loading ? "Refreshing…" : `${qrCount} of ${totalCount} QR codes uploaded`}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: "rgba(27,58,122,0.07)" }}
          title="Refresh"
        >
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: NAVY }} />
            : <RefreshCw className="w-4 h-4" style={{ color: NAVY }} />}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94A3B8" }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by username or order code…"
          className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm bg-white focus:outline-none focus:ring-2"
          style={{ border: "1px solid rgba(27,58,122,0.15)" } as React.CSSProperties}
        />
        {search && (
          <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4" style={{ color: "#94A3B8" }} />
          </button>
        )}
      </div>

      {/* Filter tabs */}
      {data && (
        <div className="flex gap-1.5 flex-wrap">
          {([
            { key: "all",        label: "All",          count: allOrders.length,       color: NAVY },
            { key: "not-posted", label: "Not Posted",   count: notPostedOrders.length, color: NAVY },
            { key: "posted",     label: "Posted",       count: postedOrders.length,    color: "#16A34A" },
            { key: "waiting",    label: "Waiting",      count: waitingOrders.length,   color: "#D97706" },
          ] as const).map(({ key, label, count, color }) => {
            const active = filter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                style={active
                  ? { background: color, color: "#fff", boxShadow: `0 2px 8px ${color}40` }
                  : { background: "white", color: "#64748B", border: "1px solid rgba(27,58,122,0.12)" }
                }
              >
                {label}
                <span
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none"
                  style={active
                    ? { background: "rgba(255,255,255,0.25)", color: "#fff" }
                    : { background: "rgba(27,58,122,0.08)", color: "#64748B" }
                  }
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl p-4" style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.15)" }}>
          <p className="text-sm font-medium" style={{ color: "#DC2626" }}>{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: NAVY }} />
        </div>
      )}

      {/* Stats bar */}
      {!loading && data && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Total Orders", value: totalCount, color: NAVY },
            { label: "QR Uploaded", value: qrCount, color: "#16A34A" },
            { label: "Posted", value: postedOrders.length, color: "#16A34A" },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center bg-white" style={{ border: "1px solid rgba(27,58,122,0.1)", boxShadow: "0 1px 4px rgba(27,58,122,0.06)" }}>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: "#94A3B8" }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Not Posted section */}
      {!loading && data && (filter === "all" || filter === "not-posted") && (
        <>
          <SectionHeader icon={<Package className="w-3.5 h-3.5" />} label="Not Posted" count={filteredNotPosted.length} color={NAVY} />
          {filteredNotPosted.length === 0 && (
            <p className="text-center text-xs py-2" style={{ color: "#94A3B8" }}>No pending QR codes to post</p>
          )}
          {filteredNotPosted.length > 0 && (
            <div className="space-y-2">
              {filteredNotPosted.map(order => (
                <OrderCard key={order.id} order={order} gbId={gbId} mode={mode} fetchOptions={fetchOptions} onTogglePosted={handleTogglePosted} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Waiting for QR section */}
      {!loading && data && (filter === "all" || filter === "waiting") && (
        <>
          <SectionHeader icon={<Truck className="w-3.5 h-3.5" />} label="Waiting for QR Code" count={filteredWaiting.length} color="#D97706" />
          {filteredWaiting.length === 0 && (
            <p className="text-center text-xs py-2" style={{ color: "#94A3B8" }}>Everyone has uploaded their QR code</p>
          )}
          {filteredWaiting.length > 0 && (
            <div className="space-y-2">
            {filteredWaiting.map(order => (
              <div
                key={order.id}
                className="rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{ border: "1px solid rgba(148,163,184,0.2)", background: "#fafafa" }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(148,163,184,0.1)" }}
                >
                  <Package className="w-4 h-4" style={{ color: "#94A3B8" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: "#64748B" }}>
                    @{stripAt(order.telegramUsername)}
                  </p>
                  <p className="text-[11px] truncate" style={{ color: "#94A3B8" }}>
                    {order.code} · {order.deliveryMethod || "—"} · {order.status}
                  </p>
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: "rgba(245,158,11,0.1)", color: "#D97706" }}
                >
                  No QR
                </span>
              </div>
            ))}
            </div>
          )}
        </>
      )}

      {/* Posted section */}
      {!loading && data && (filter === "all" || filter === "posted") && (
        <>
          <SectionHeader icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Posted" count={filteredPosted.length} color="#16A34A" />
          {filteredPosted.length === 0 && (
            <p className="text-center text-xs py-2" style={{ color: "#94A3B8" }}>No posted orders yet</p>
          )}
          {filteredPosted.length > 0 && (
            <div className="space-y-2 pb-4">
              {filteredPosted.map(order => (
                <OrderCard key={order.id} order={order} gbId={gbId} mode={mode} fetchOptions={fetchOptions} onTogglePosted={handleTogglePosted} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
