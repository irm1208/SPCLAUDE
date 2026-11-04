import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LabelCropPreview } from "./LabelCropPreview";
import { inspectRoyalMailPdf, type InspectedPage } from "@/lib/royal-mail-pdf-preview";
import { checkCancelled, composeLabelPdf, labelFilename, MAX_LABELS, MAX_TOTAL_BYTES, royalMailUploads, sourcePdfBytes, type Crop } from "@/lib/royal-mail-labels";

type Order = { id: string; code: string; telegramUsername: string };
type Region = InspectedPage & { id: string; excluded: boolean };
type PreparedFile = { id: string; title: string; bytes?: Uint8Array; regions: Region[]; error?: string; excluded: boolean };
class StopLoading extends Error {}

export function RoyalMailLabelsExport({ orders, gbId, gbName, batchName, scopeDescription, mode, adminSecret, onClose }: {
  orders: Order[]; gbId: string; gbName: string; batchName: string; scopeDescription: string;
  mode: "admin" | "organiser"; adminSecret?: string; onClose: () => void;
}) {
  const [files, setFiles] = useState<PreparedFile[]>([]);
  const [phase, setPhase] = useState<"loading" | "review" | "exporting" | "failed">("loading");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const urls = useRef(new Set<string>());
  const sequence = useRef(0);

  useEffect(() => {
    const current = new AbortController();
    controller.current = current;
    const signal = current.signal;
    setFiles([]); setPhase("loading"); setError(""); setNotice(""); setPreview(null);
    async function prepare() {
      const prepared: PreparedFile[] = [];
      let totalBytes = 0, regionCount = 0;
      // One request/PDF at a time bounds memory and avoids flooding protected endpoints.
      const sorted = [...orders].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }) || a.id.localeCompare(b.id));
      for (let index = 0; index < sorted.length; index++) {
        checkCancelled(signal);
        const order = sorted[index], title = `#${order.code || order.id} · @${order.telegramUsername.replace(/^@/, "")}`;
        setProgress(`Reading order ${index + 1} of ${sorted.length}`);
        let sources: string[];
        try {
          const response = await fetch(`/api/${mode}/group-buys/${gbId}/orders/${order.id}/qr-data`, {
            ...(mode === "admin" ? { headers: { "x-admin-secret": adminSecret ?? "" }, credentials: "omit" as const } : { credentials: "include" as const }),
            signal,
          });
          checkCancelled(signal);
          if ([401, 403, 429].includes(response.status)) throw new StopLoading(`Loading stopped (${response.status}). Check your access or try again later; no partial download has been created.`);
          if (!response.ok) throw new Error(`Could not load this order's PDF (${response.status}).`);
          sources = royalMailUploads(await response.json());
          if (!sources.length) throw new Error("No Royal Mail PDF is currently available for this order.");
        } catch (err) {
          checkCancelled(signal);
          if (err instanceof StopLoading || err instanceof TypeError) throw err;
          prepared.push({ id: order.id, title, regions: [], error: err instanceof Error ? err.message : "Could not load upload", excluded: false });
          setFiles([...prepared]); continue;
        }
        const seen: Uint8Array[] = [];
        for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
          checkCancelled(signal);
          const id = `${order.id}:${sourceIndex}`;
          try {
            const bytes = await sourcePdfBytes(sources[sourceIndex], signal);
            if (seen.some(previous => previous.length === bytes.length && previous.every((value, i) => value === bytes[i]))) continue;
            seen.push(bytes);
            if (totalBytes + bytes.length > MAX_TOTAL_BYTES) throw new Error("Combined source PDFs exceed 100 MB. Use a smaller batch or narrower filters.");
            const pages = await inspectRoyalMailPdf(bytes, signal);
            if (regionCount + pages.length > MAX_LABELS) throw new Error(`More than ${MAX_LABELS} pages. Use narrower filters.`);
            totalBytes += bytes.length; regionCount += pages.length;
            prepared.push({ id, title: `${title} · file ${sourceIndex + 1}`, bytes,
              regions: pages.map(page => ({ ...page, id: `${id}:page-${page.pageIndex}`, excluded: false })), excluded: false });
          } catch (err) {
            checkCancelled(signal);
            prepared.push({ id, title: `${title} · file ${sourceIndex + 1}`, regions: [],
              error: err instanceof Error ? err.message : "Could not inspect PDF. Open the original upload.", excluded: false });
          }
          checkCancelled(signal);
          setFiles([...prepared]);
        }
      }
      checkCancelled(signal);
      setPhase("review"); setProgress("");
    }
    prepare().catch(err => {
      if (!signal.aborted) { setError(err instanceof Error ? err.message : "Could not load labels. Try again."); setPhase("failed"); }
    });
    const ownedUrls = urls.current;
    return () => {
      current.abort();
      for (const url of ownedUrls) URL.revokeObjectURL(url);
      ownedUrls.clear();
    };
    // The parent freezes the order set for this scope and unmounts on filter/auth changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  const included = files.filter(file => !file.excluded && !file.error).flatMap(file => file.regions.filter(region => !region.excluded));
  const unresolved = files.filter(file => !file.excluded && !!file.error).length + included.filter(region => !region.confirmed).length;
  const exclusions = files.reduce((sum, file) => sum + (file.excluded ? Math.max(1, file.regions.length) : file.regions.filter(region => region.excluded).length), 0);
  const canDownload = phase === "review" && !unresolved && included.length > 0 && included.length <= MAX_LABELS;
  const editable = phase === "review";
  function close() { controller.current?.abort(); onClose(); }
  function changeRegion(fileId: string, regionId: string, update: Partial<Region>) {
    setNotice("");
    setFiles(previous => previous.map(file => file.id !== fileId ? file : { ...file, regions: file.regions.map(region => region.id !== regionId ? region : { ...region, ...update }) }));
  }
  function changeCrop(fileId: string, regionId: string, crop: Crop) {
    changeRegion(fileId, regionId, { crop, confirmed: false, reason: "Crop changed; confirm before downloading." });
  }
  function original(file: PreparedFile) {
    if (!file.bytes) return;
    const buffer = new ArrayBuffer(file.bytes.byteLength); new Uint8Array(buffer).set(file.bytes);
    const url = URL.createObjectURL(new Blob([buffer], { type: "application/pdf" }));
    urls.current.add(url);
    window.open(url, "_blank", "noopener,noreferrer");
  }
  async function download() {
    if (!canDownload || !controller.current) return;
    const signal = controller.current.signal;
    setError(""); setNotice(""); setPhase("exporting"); setPreview(null);
    try {
      const bytes = await composeLabelPdf(files.filter(file => !file.excluded && !file.error && file.bytes).map(file => ({
        id: file.title, bytes: file.bytes!, labels: file.regions.filter(region => !region.excluded),
      })), signal, count => { if (!signal.aborted) setProgress(`Formatting label ${count} of ${included.length}`); });
      checkCancelled(signal);
      const buffer = new ArrayBuffer(bytes.byteLength); new Uint8Array(buffer).set(bytes);
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/pdf" }));
      urls.current.add(url);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = labelFilename(gbName, batchName);
      document.body.append(anchor); anchor.click(); anchor.remove();
      // Browsers need a short interval to consume the Blob URL.
      setTimeout(() => { URL.revokeObjectURL(url); urls.current.delete(url); }, 1000);
      setNotice(`Downloaded ${included.length} labels in one PDF. Print at actual size / 100% on 4×6-inch paper. Orders have not been marked posted.`);
    } catch (err) {
      if (!signal.aborted) setError(`${err instanceof Error ? err.message : "Could not generate PDF"}. No download was created. Review or explicitly exclude the affected file, then retry.`);
    } finally { if (!signal.aborted) { setPhase("review"); setProgress(""); } }
  }
  return <Dialog open onOpenChange={open => { if (!open) close(); }}>
    <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Royal Mail 4×6 labels</DialogTitle>
        <DialogDescription>{scopeDescription} · {orders.length} orders with Royal Mail uploads. Only PDF labels will be included. Originals are unchanged.</DialogDescription>
      </DialogHeader>
      <p className="text-sm">One label per 4×6-inch page. Review uncertain crops and exclude any instructions or unwanted pages. For several labels on one page, use “Add another label region”.</p>
      <p className="rounded-lg bg-muted p-3 text-sm" aria-live="polite">
        {included.length} labels included · {exclusions} exclusions · {unresolved} need attention
      </p>
      {(phase === "loading" || phase === "exporting") && <p role="status" className="text-sm font-medium">{progress || "Preparing labels…"} You can cancel at any time.</p>}
      {error && <p role="alert" className="break-words text-sm text-red-600">{error}</p>}
      {notice && <p role="status" className="text-sm text-green-700">{notice}</p>}
      {phase === "failed" && <button type="button" className="rounded-lg border p-2 text-sm" onClick={() => setRevision(value => value + 1)}>Retry loading labels</button>}
      <div className="space-y-3">
        {files.map(file => <section key={file.id} className={`space-y-2 rounded-xl border border-border p-3 ${file.excluded ? "bg-muted/50" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="break-words text-sm font-semibold">{file.title}</h3>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={file.excluded} disabled={!editable}
              onChange={event => { setNotice(""); setFiles(previous => previous.map(item => item.id === file.id ? { ...item, excluded: event.target.checked } : item)); }} />Exclude this file</label>
          </div>
          {file.error && <p className="text-sm text-red-600">{file.error} Close this dialog to open/save the original upload, or explicitly exclude this file.</p>}
          {file.bytes && <button type="button" className="text-xs underline" onClick={() => original(file)}>Open original PDF</button>}
          {!file.excluded && file.regions.map(region => <div key={region.id} className="space-y-2 border-t border-border pt-2">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-medium">Page {region.pageIndex + 1}</span>
              <span>{region.excluded ? "Excluded" : region.confirmed ? "Ready" : "Needs crop review"}</span>
              <label className="flex items-center gap-2"><input type="checkbox" checked={region.excluded} disabled={!editable}
                onChange={event => changeRegion(file.id, region.id, { excluded: event.target.checked })} />Exclude this region</label>
            </div>
            {!region.excluded && <>
              <p className="text-xs text-muted-foreground">{region.reason}</p>
              <div className="flex flex-wrap gap-3 text-xs">
                <button type="button" disabled={!editable} className="font-semibold underline" onClick={() => setPreview(preview === region.id ? null : region.id)}>{preview === region.id ? "Hide preview" : "Preview / adjust crop"}</button>
                <button type="button" disabled={!editable || files.reduce((sum, item) => sum + item.regions.length, 0) >= MAX_LABELS} className="underline" onClick={() => {
                  const clone = { ...region, id: `${file.id}:extra-${++sequence.current}`, confirmed: false, excluded: false, reason: "Select and confirm another label on this source page." };
                  setFiles(previous => previous.map(item => item.id === file.id ? { ...item, regions: [...item.regions, clone] } : item));
                  setPreview(clone.id);
                }}>Add another label region</button>
              </div>
              {preview === region.id && file.bytes && editable && <LabelCropPreview bytes={file.bytes} pageIndex={region.pageIndex} crop={region.crop}
                onChange={crop => changeCrop(file.id, region.id, crop)}
                onConfirm={() => { changeRegion(file.id, region.id, { confirmed: true, reason: "Crop reviewed and confirmed." }); setPreview(null); }} />}
            </>}
          </div>)}
        </section>)}
      </div>
      {phase === "review" && !included.length && <p className="text-sm text-muted-foreground">No PDF labels are selected. Review the exclusions or use the original downloads.</p>}
      <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-border bg-background py-3">
        <button type="button" className="rounded-lg border border-input px-4 py-2 text-sm" onClick={close}>{phase === "loading" || phase === "exporting" ? "Cancel export" : "Close"}</button>
        <button type="button" disabled={!canDownload} onClick={download} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          Download combined 4×6 PDF ({included.length})
        </button>
      </div>
      <p className="text-xs text-muted-foreground">Print at actual size / 100%, not “fit to A4”. Downloads never mark orders posted. Up to 500 labels, 20 MB per file and 100 MB of source PDFs per export.</p>
    </DialogContent>
  </Dialog>;
}
