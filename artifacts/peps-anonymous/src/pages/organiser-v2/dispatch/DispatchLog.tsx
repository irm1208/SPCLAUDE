import { Camera, ChevronDown, Download, FileImage, History, RotateCcw, Search, Upload, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { DispatchRecord } from "./types";

interface DispatchLogProps {
  records: DispatchRecord[];
  onAttachPhotos: (orderId: string, filenames: string[]) => void;
  onUndoDispatch: (orderId: string) => void;
}

export default function DispatchLog({ records, onAttachPhotos, onUndoDispatch }: DispatchLogProps) {
  const [search, setSearch] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadOrderId, setUploadOrderId] = useState(records[0]?.id ?? "");
  const [pendingFiles, setPendingFiles] = useState<string[]>([]);

  const deliveryMethods = [...new Set(records.map(record => record.deliveryMethod))];
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter(record => {
      const matchesFilter = deliveryFilter === "all" || record.deliveryMethod === deliveryFilter;
      const matchesSearch = !query || [record.code, record.memberName, record.telegramUsername, record.shippingCountry].some(value => value.toLowerCase().includes(query));
      return matchesFilter && matchesSearch;
    });
  }, [records, search, deliveryFilter]);

  const exportCsv = () => {
    const rows = [
      ["Order", "Member", "Delivery Method", "Country", "Dispatched At"],
      ...filtered.map(record => [record.code, record.memberName, record.deliveryMethod, record.shippingCountry, record.dispatchedAt]),
    ];
    const csv = rows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "dispatch-log.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const attachFiles = () => {
    if (!uploadOrderId || pendingFiles.length === 0) return;
    onAttachPhotos(uploadOrderId, pendingFiles);
    setPendingFiles([]);
    setUploadOpen(false);
  };

  const undo = (record: DispatchRecord) => {
    if (window.confirm(`Move #${record.code} back to the active dispatch queue and restore its parcel stock?`)) {
      onUndoDispatch(record.id);
    }
  };

  return (
    <section className="min-h-[560px] p-4 sm:p-5">
      <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between" style={{ borderColor: "var(--dispatch-rule)" }}>
        <div>
          <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em]" style={{ color: "var(--dispatch-green)" }}><History className="h-3.5 w-3.5" /> Historical record</p>
          <h3 className="mt-1 text-[20px] font-extrabold tracking-[-0.025em]" style={{ color: "var(--dispatch-ink)" }}>What has left the bench</h3>
          <p className="mt-1 text-[11px]" style={{ color: "var(--dispatch-muted)" }}>{records.length} dispatched orders · proof, exports and recovery</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => setUploadOpen(true)} className="flex min-h-10 items-center justify-center gap-2 border px-4 text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ borderColor: "var(--dispatch-green)", color: "var(--dispatch-green)" }}><Camera className="h-3.5 w-3.5" /> Upload dispatch photos</button>
          <button type="button" onClick={exportCsv} className="flex min-h-10 items-center justify-center gap-2 px-4 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white" style={{ background: "var(--dispatch-ink)" }}><Download className="h-3.5 w-3.5" /> Click & Drop CSV</button>
        </div>
      </div>

      <div className="grid gap-2 border-b py-3 sm:grid-cols-[minmax(220px,1fr)_240px_auto]" style={{ borderColor: "var(--dispatch-rule)" }}>
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: "var(--dispatch-muted)" }} />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search order, member or country" className="h-10 w-full border bg-white/55 pl-9 pr-3 text-[11px] outline-none focus:ring-2 focus:ring-[var(--dispatch-green)]" style={{ borderColor: "var(--dispatch-rule)", color: "var(--dispatch-ink)" }} />
        </label>
        <select value={deliveryFilter} onChange={event => setDeliveryFilter(event.target.value)} className="h-10 border bg-white/55 px-3 text-[11px] font-semibold outline-none focus:ring-2 focus:ring-[var(--dispatch-green)]" style={{ borderColor: "var(--dispatch-rule)", color: "var(--dispatch-ink)" }}>
          <option value="all">All delivery methods</option>
          {deliveryMethods.map(method => <option key={method} value={method}>{method}</option>)}
        </select>
        <span className="flex min-h-10 items-center justify-end font-mono text-[10px] font-bold" style={{ color: "var(--dispatch-muted)" }}>{filtered.length} records</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border" style={{ borderColor: "var(--dispatch-rule)" }}>
        <div className="hidden grid-cols-[130px_minmax(180px,1fr)_minmax(160px,.8fr)_100px_32px] border-b px-3 py-2 text-[8px] font-extrabold uppercase tracking-[0.15em] sm:grid" style={{ borderColor: "var(--dispatch-rule)", color: "var(--dispatch-muted)", background: "rgba(255,255,255,.65)" }}>
          <span>Dispatched</span><span>Order / member</span><span>Delivery</span><span>Evidence</span><span />
        </div>
        {filtered.map(record => {
          const expanded = expandedId === record.id;
          return (
            <div key={record.id} className="border-b bg-white last:border-b-0" style={{ borderColor: "var(--dispatch-rule)" }}>
              <button type="button" onClick={() => setExpandedId(expanded ? null : record.id)} className="grid w-full gap-2 px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--dispatch-green)] sm:grid-cols-[130px_minmax(180px,1fr)_minmax(160px,.8fr)_100px_32px] sm:items-center">
                <span><span className="block font-mono text-[10px] font-bold" style={{ color: "var(--dispatch-ink)" }}>{new Date(record.dispatchedAt).toLocaleDateString([], { day: "2-digit", month: "short" })}</span><span className="block text-[9px]" style={{ color: "var(--dispatch-muted)" }}>{new Date(record.dispatchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></span>
                <span><span className="block font-mono text-[11px] font-extrabold" style={{ color: "var(--dispatch-ink)" }}>#{record.code}</span><span className="block text-[10px] font-semibold" style={{ color: "var(--dispatch-muted)" }}>{record.memberName} · @{record.telegramUsername}</span></span>
                <span><span className="block text-[10px] font-bold" style={{ color: "var(--dispatch-ink)" }}>{record.deliveryMethod}</span><span className="block text-[9px]" style={{ color: "var(--dispatch-muted)" }}>{record.shippingCountry}</span></span>
                <span className="flex items-center gap-1.5 text-[9px] font-bold" style={{ color: record.dispatchPhotos.length ? "var(--dispatch-green)" : "var(--dispatch-muted)" }}><FileImage className="h-3.5 w-3.5" /> {record.dispatchPhotos.length} photo{record.dispatchPhotos.length === 1 ? "" : "s"}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} style={{ color: "var(--dispatch-muted)" }} />
              </button>
              {expanded && (
                <div className="grid gap-4 border-t px-3 py-4 sm:grid-cols-[1fr_auto]" style={{ borderColor: "var(--dispatch-rule)", background: "rgba(30,122,92,.035)" }}>
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--dispatch-muted)" }}>Dispatch evidence</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {record.dispatchPhotos.map(filename => <span key={filename} className="flex items-center gap-1.5 border bg-white/70 px-2 py-1 text-[9px] font-semibold" style={{ borderColor: "var(--dispatch-rule)", color: "var(--dispatch-ink)" }}><FileImage className="h-3 w-3" /> {filename}</span>)}
                      {record.dispatchPhotos.length === 0 && <span className="text-[10px] italic" style={{ color: "var(--dispatch-muted)" }}>No dispatch photos attached.</span>}
                    </div>
                    <p className="mt-3 text-[9px]" style={{ color: "var(--dispatch-muted)" }}>Stock sources: {record.parcelIds.join(", ")}{record.reminderSentAt ? ` · QR reminder sent ${new Date(record.reminderSentAt).toLocaleDateString()}` : ""}</p>
                  </div>
                  <button type="button" onClick={() => undo(record)} className="flex min-h-9 items-center justify-center gap-2 self-end border px-3 text-[9px] font-extrabold uppercase tracking-[0.08em]" style={{ borderColor: "rgba(184,107,23,.4)", color: "var(--dispatch-amber)" }}><RotateCcw className="h-3.5 w-3.5" /> Undo dispatch</button>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="px-4 py-14 text-center text-[11px]" style={{ color: "var(--dispatch-muted)" }}>No dispatch records match this view.</p>}
      </div>

      {uploadOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4" role="presentation" onMouseDown={event => event.target === event.currentTarget && setUploadOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="photo-upload-title" className="w-full max-w-lg overflow-hidden rounded-xl border bg-white shadow-2xl" style={{ borderColor: "var(--dispatch-rule)" }}>
            <div className="flex items-center justify-between border-b p-4" style={{ borderColor: "var(--dispatch-rule)" }}><div><h3 id="photo-upload-title" className="text-[16px] font-extrabold" style={{ color: "var(--dispatch-ink)" }}>Match photos to an order</h3><p className="mt-0.5 text-[10px]" style={{ color: "var(--dispatch-muted)" }}>Attach counter or packing-slip photos as dispatch evidence.</p></div><button type="button" onClick={() => setUploadOpen(false)} aria-label="Close photo uploader"><X className="h-4 w-4" /></button></div>
            <div className="space-y-3 p-4">
              <select value={uploadOrderId} onChange={event => setUploadOrderId(event.target.value)} className="h-10 w-full border bg-white px-3 text-[11px] font-semibold" style={{ borderColor: "var(--dispatch-rule)" }}>
                {records.map(record => <option key={record.id} value={record.id}>#{record.code} · {record.memberName}</option>)}
              </select>
              <label className="flex cursor-pointer flex-col items-center justify-center border border-dashed px-5 py-10 text-center" style={{ borderColor: "#AAB8AF", background: "rgba(255,255,255,.45)" }}>
                <Upload className="h-6 w-6" style={{ color: "var(--dispatch-green)" }} />
                <span className="mt-2 text-[11px] font-extrabold" style={{ color: "var(--dispatch-ink)" }}>Choose dispatch photos</span>
                <span className="mt-1 text-[9px]" style={{ color: "var(--dispatch-muted)" }}>JPEG, PNG or WebP · multiple files supported</span>
                <input type="file" accept="image/*" multiple className="sr-only" onChange={event => setPendingFiles(Array.from(event.target.files ?? []).map(file => file.name))} />
              </label>
              {pendingFiles.length > 0 && <div className="flex flex-wrap gap-1.5">{pendingFiles.map(file => <span key={file} className="border bg-white px-2 py-1 text-[9px]" style={{ borderColor: "var(--dispatch-rule)" }}>{file}</span>)}</div>}
            </div>
            <div className="flex justify-end gap-2 border-t p-4" style={{ borderColor: "var(--dispatch-rule)" }}><button type="button" onClick={() => setUploadOpen(false)} className="min-h-10 border px-4 text-[10px] font-bold" style={{ borderColor: "var(--dispatch-rule)" }}>Cancel</button><button type="button" onClick={attachFiles} disabled={pendingFiles.length === 0} className="min-h-10 px-4 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white disabled:opacity-35" style={{ background: "var(--dispatch-green-deep)" }}>Attach {pendingFiles.length || ""} photo{pendingFiles.length === 1 ? "" : "s"}</button></div>
          </div>
        </div>
      )}
    </section>
  );
}
