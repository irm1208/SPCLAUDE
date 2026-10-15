import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, ImagePlus, Loader2, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import {
  buildUpdateFormData, formatUpdateDate, parseUpdatesResponse, readError, sortNewestFirst, validateDraft, validateImage,
  WU_NOTE_MAX, WU_POLL_MS, WU_TITLE_MAX, type WholesaleUpdate,
} from "@/lib/wholesale-updates";

const BASE = "/api/admin/wholesale-updates";

/** Fetches an admin-protected image with headers into a revocable blob URL. */
function useAdminImage(url: string | null, secret: string, version: string) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setSrc(null);
    setFailed(false);
    if (!url) return;
    const ctrl = new AbortController();
    let objectUrl: string | null = null;
    fetch(url, { headers: { "x-admin-secret": secret }, credentials: "include", signal: ctrl.signal })
      .then(r => { if (!r.ok) throw new Error(); return r.blob(); })
      .then(b => {
        if (ctrl.signal.aborted) return;
        objectUrl = URL.createObjectURL(b);
        setSrc(objectUrl);
      })
      .catch(() => { if (!ctrl.signal.aborted) setFailed(true); });
    return () => { ctrl.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url, secret, version]);
  return { src, failed };
}

function AdminImage({ url, secret, version, alt }: { url: string; secret: string; version: string; alt: string }) {
  const { src, failed } = useAdminImage(url, secret, version);
  const [full, setFull] = useState(false);
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFull(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);
  if (failed) return <p className="text-[11px]" style={{ color: "var(--adm-muted)" }}>Image could not be loaded.</p>;
  if (!src) return <div className="h-24 rounded-lg animate-pulse" style={{ background: "var(--adm-surface2)" }} />;
  return (
    <>
      <button type="button" data-testid="button-view-update-image" onClick={() => setFull(true)} className="block w-full rounded-lg overflow-hidden" style={{ background: "var(--adm-surface2)" }}>
        <img src={src} alt={alt} className="w-full max-h-56 object-contain" />
      </button>
      {full && (
        <div role="dialog" aria-label="Full-size image" onClick={() => setFull(false)} className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(10,18,32,0.85)" }}>
          <button type="button" data-testid="button-close-update-image" aria-label="Close" onClick={e => { e.stopPropagation(); setFull(false); }} className="absolute top-4 right-4 text-white"><X className="w-6 h-6" /></button>
          <img src={src} alt={alt} onClick={e => e.stopPropagation()} className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </>
  );
}

interface EditorProps {
  secret: string;
  initial: WholesaleUpdate | null;
  onSaved: (u: WholesaleUpdate) => void;
  onCancel: () => void;
  onMutationStart?: () => void;
  onMutationEnd?: () => void;
}

function UpdateEditor({ secret, initial, onSaved, onCancel, onMutationStart, onMutationEnd }: EditorProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [published, setPublished] = useState(initial?.published ?? false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const pick = (f: File | undefined) => {
    if (fileInput.current) fileInput.current.value = "";
    if (!f) return;
    const err = validateImage(f);
    if (err) { setError(err); return; }
    setError(null);
    setFile(f);
    setRemoveImage(false);
  };

  const save = async () => {
    const err = validateDraft(title, note);
    if (err) { setError(err); return; }
    setSaving(true); setError(null);
    onMutationStart?.();
    try {
      const r = await fetch(initial ? `${BASE}/${initial.id}` : BASE, {
        method: initial ? "PUT" : "POST",
        headers: { "x-admin-secret": secret },
        credentials: "include",
        body: buildUpdateFormData({ title, note, published, image: file, removeImage }),
      });
      if (!r.ok) throw new Error(await readError(r));
      const j = await r.json();
      const [u] = parseUpdatesResponse({ updates: [j.update] });
      if (!u) throw new Error("Unexpected response");
      onSaved(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      onMutationEnd?.();
      setSaving(false);
    }
  };

  const hasExisting = !!initial?.imageUrl && !removeImage && !file;
  const input = "w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-1 focus:ring-orange-400 disabled:opacity-60";
  const inputStyle = { background: "var(--adm-surface2)", borderColor: "var(--adm-border)", color: "var(--adm-text)" };

  return (
    <div data-testid="form-wholesale-update" className="rounded-xl border p-3 space-y-3" style={{ borderColor: "var(--adm-border)" }}>
      <div>
        <div className="flex justify-between mb-1.5">
          <label className="text-[11px] font-semibold" style={{ color: "var(--adm-muted)" }}>Title (optional)</label>
          <span className="text-[10px]" style={{ color: title.length > WU_TITLE_MAX ? "#ef4444" : "var(--adm-faint)" }}>{title.length}/{WU_TITLE_MAX}</span>
        </div>
        <input data-testid="input-update-title" value={title} onChange={e => setTitle(e.target.value)} disabled={saving} maxLength={WU_TITLE_MAX + 20} className={input} style={inputStyle} placeholder="e.g. Price change on BPC-157 10mg" />
      </div>
      <div>
        <div className="flex justify-between mb-1.5">
          <label className="text-[11px] font-semibold" style={{ color: "var(--adm-muted)" }}>Note</label>
          <span className="text-[10px]" style={{ color: note.length > WU_NOTE_MAX ? "#ef4444" : "var(--adm-faint)" }}>{note.length}/{WU_NOTE_MAX}</span>
        </div>
        <textarea data-testid="input-update-note" value={note} onChange={e => setNote(e.target.value)} disabled={saving} rows={4} className={`${input} resize-y`} style={inputStyle} placeholder="Plain text. Line breaks are preserved." />
      </div>
      <div className="space-y-2">
        <input ref={fileInput} data-testid="input-update-image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={e => pick(e.target.files?.[0])} />
        {preview && <img src={preview} alt="Selected" className="w-full max-h-56 object-contain rounded-lg" style={{ background: "var(--adm-surface2)" }} />}
        {hasExisting && initial?.imageUrl && <AdminImage url={initial.imageUrl} secret={secret} version={initial.updatedAt} alt="Current image" />}
        {removeImage && <p className="text-[11px]" style={{ color: "var(--adm-muted)" }}>Current image will be removed on save.</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" data-testid="button-pick-update-image" disabled={saving} onClick={() => fileInput.current?.click()} className="h-8 px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50" style={{ borderColor: "var(--adm-border)", color: "var(--adm-text)" }}>
            <ImagePlus className="w-3.5 h-3.5" /> {file || hasExisting ? "Replace image" : "Add image"}
          </button>
          {file && <button type="button" data-testid="button-clear-update-image" disabled={saving} onClick={() => setFile(null)} className="h-8 px-3 rounded-lg text-xs font-semibold disabled:opacity-50" style={{ color: "var(--adm-muted)" }}>Clear selection</button>}
          {hasExisting && <button type="button" data-testid="button-remove-update-image" disabled={saving} onClick={() => setRemoveImage(true)} className="h-8 px-3 rounded-lg text-xs font-semibold text-red-600 disabled:opacity-50">Remove image</button>}
          {removeImage && <button type="button" data-testid="button-undo-remove-image" disabled={saving} onClick={() => setRemoveImage(false)} className="h-8 px-3 rounded-lg text-xs font-semibold disabled:opacity-50" style={{ color: "var(--adm-muted)" }}>Keep image</button>}
        </div>
        <p className="text-[10px]" style={{ color: "var(--adm-faint)" }}>PNG, JPEG, WebP or GIF, up to 5 MB.</p>
      </div>
      <label className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--adm-text)" }}>
        <input data-testid="checkbox-update-published" type="checkbox" checked={published} disabled={saving} onChange={e => setPublished(e.target.checked)} />
        Published (visible to wholesale members)
      </label>
      {error && <p role="alert" data-testid="text-update-error" className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" data-testid="button-save-update" onClick={save} disabled={saving} className="h-9 px-4 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-60" style={{ background: "#1B3A7A" }}>
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {initial ? "Save changes" : "Create update"}
        </button>
        <button type="button" data-testid="button-cancel-update" onClick={onCancel} disabled={saving} className="h-9 px-4 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ color: "var(--adm-muted)" }}>Cancel</button>
      </div>
    </div>
  );
}

export function AdminWholesaleUpdates({ secret }: { secret: string }) {
  const [updates, setUpdates] = useState<WholesaleUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; msg: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);
  const pendingMutations = useRef(0);
  const generation = useRef(0);

  const load = useCallback(async () => {
    if (pendingMutations.current > 0) return;
    ctrlRef.current?.abort();
    const gen = generation.current;
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    try {
      const r = await fetch(BASE, { headers: { "x-admin-secret": secret }, credentials: "include", signal: ctrl.signal });
      if (!r.ok) throw new Error(await readError(r));
      const list = parseUpdatesResponse(await r.json());
      if (ctrl.signal.aborted || gen !== generation.current || pendingMutations.current > 0) return;
      setUpdates(sortNewestFirst(list));
      setLoadError(null);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setLoadError(e instanceof Error ? e.message : "Could not load updates");
    } finally {
      if (ctrlRef.current === ctrl) setLoading(false);
    }
  }, [secret]);

  // Polling only replaces the list; editor drafts live in UpdateEditor state and are never reset by it.
  useEffect(() => {
    setLoading(true);
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const t = window.setInterval(load, WU_POLL_MS);
    return () => { window.removeEventListener("focus", onFocus); window.clearInterval(t); ctrlRef.current?.abort(); };
  }, [load]);

  /** Invalidate any in-flight list request so a stale poll cannot overwrite a mutation result. */
  const beginMutation = () => { pendingMutations.current += 1; generation.current += 1; ctrlRef.current?.abort(); };
  const endMutation = () => { pendingMutations.current = Math.max(0, pendingMutations.current - 1); generation.current += 1; ctrlRef.current?.abort(); };

  const upsert = (u: WholesaleUpdate) => {
    generation.current += 1;
    ctrlRef.current?.abort();
    setUpdates(prev => sortNewestFirst([u, ...prev.filter(x => x.id !== u.id)]));
    setEditing(null);
  };

  const togglePublished = async (u: WholesaleUpdate) => {
    setWorking(u.id); setRowError(null);
    beginMutation();
    try {
      const r = await fetch(`${BASE}/${u.id}`, {
        method: "PUT", headers: { "x-admin-secret": secret }, credentials: "include",
        body: buildUpdateFormData({ title: u.title ?? "", note: u.note, published: !u.published }),
      });
      if (!r.ok) throw new Error(await readError(r));
      const [next] = parseUpdatesResponse({ updates: [(await r.json()).update] });
      if (next) setUpdates(prev => sortNewestFirst(prev.map(x => x.id === next.id ? next : x)));
    } catch (e) {
      setRowError({ id: u.id, msg: e instanceof Error ? e.message : "Update failed" });
    } finally { endMutation(); setWorking(null); }
  };

  const remove = async (id: string) => {
    setWorking(id); setRowError(null);
    beginMutation();
    try {
      const r = await fetch(`${BASE}/${id}`, { method: "DELETE", headers: { "x-admin-secret": secret }, credentials: "include" });
      if (!r.ok) throw new Error(await readError(r));
      setUpdates(prev => prev.filter(x => x.id !== id));
      setConfirmDelete(null);
      if (editing === id) setEditing(null);
    } catch (e) {
      setRowError({ id, msg: e instanceof Error ? e.message : "Delete failed" });
    } finally { endMutation(); setWorking(null); }
  };

  return (
    <div data-testid="admin-wholesale-updates" className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3" style={{ color: "var(--adm-text)" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">Wholesale updates</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Price and change notes shown newest first on the order page. Customers keep their in-progress order.</p>
        </div>
        {editing !== "new" && (
          <button data-testid="button-new-update" onClick={() => setEditing("new")} className="shrink-0 h-8 px-3 rounded-lg text-xs font-semibold text-white inline-flex items-center gap-1.5" style={{ background: "#1B3A7A" }}>
            <Plus className="w-3.5 h-3.5" /> New update
          </button>
        )}
      </div>

      {editing === "new" && <UpdateEditor secret={secret} initial={null} onSaved={upsert} onCancel={() => setEditing(null)} onMutationStart={beginMutation} onMutationEnd={endMutation} />}

      {loading && updates.length === 0 && <div className="space-y-2">{[0, 1].map(i => <div key={i} className="h-16 rounded-xl animate-pulse bg-slate-100" />)}</div>}

      {loadError && (
        <div role="alert" data-testid="text-updates-load-error" className="flex items-center gap-2 text-xs text-red-600">
          <span className="flex-1">Could not load updates: {loadError}</span>
          <button data-testid="button-retry-updates" onClick={load} className="inline-flex items-center gap-1 font-semibold"><RefreshCw className="w-3 h-3" /> Retry</button>
        </div>
      )}

      {!loading && !loadError && updates.length === 0 && editing !== "new" && (
        <p className="text-xs text-muted-foreground py-3 text-center">No updates yet. Nothing is shown to customers.</p>
      )}

      <div className="space-y-2">
        {updates.map(u => editing === u.id ? (
          <UpdateEditor key={u.id} secret={secret} initial={u} onSaved={upsert} onCancel={() => setEditing(null)} onMutationStart={beginMutation} onMutationEnd={endMutation} />
        ) : (
          <div key={u.id} data-testid={`card-admin-update-${u.id}`} className="rounded-xl border border-slate-200 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${u.published ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{u.published ? "Published" : "Hidden"}</span>
                  {u.title && <span className="text-sm font-semibold text-slate-800 break-words">{u.title}</span>}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{formatUpdateDate(u.createdAt)}{u.updatedAt !== u.createdAt ? ` · edited ${formatUpdateDate(u.updatedAt)}` : ""}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button data-testid={`button-toggle-update-${u.id}`} title={u.published ? "Hide" : "Publish"} disabled={working === u.id} onClick={() => togglePublished(u)} className="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-slate-100 disabled:opacity-50">
                  {working === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : u.published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button data-testid={`button-edit-update-${u.id}`} title="Edit" disabled={working === u.id || editing !== null} onClick={() => setEditing(u.id)} className="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-slate-100 disabled:opacity-50"><Pencil className="w-3.5 h-3.5" /></button>
                <button data-testid={`button-delete-update-${u.id}`} title="Delete" disabled={working === u.id} onClick={() => setConfirmDelete(u.id)} className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <p className="text-xs whitespace-pre-wrap break-words text-slate-700 line-clamp-4">{u.note}</p>
            {u.imageUrl && <AdminImage url={u.imageUrl} secret={secret} version={u.updatedAt} alt={u.title || "Update image"} />}
            {confirmDelete === u.id && (
              <div data-testid={`confirm-delete-update-${u.id}`} className="flex flex-wrap items-center gap-2 rounded-lg p-2 bg-red-50 text-xs">
                <span className="flex-1 text-red-700">Delete this update permanently?</span>
                <button data-testid={`button-confirm-delete-${u.id}`} disabled={working === u.id} onClick={() => remove(u.id)} className="h-7 px-3 rounded-lg bg-red-500 text-white font-semibold disabled:opacity-60">Delete</button>
                <button data-testid={`button-cancel-delete-${u.id}`} disabled={working === u.id} onClick={() => setConfirmDelete(null)} className="h-7 px-3 rounded-lg font-semibold text-slate-600">Cancel</button>
              </div>
            )}
            {rowError?.id === u.id && <p role="alert" className="text-xs text-red-600">{rowError.msg}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminWholesaleUpdates;
