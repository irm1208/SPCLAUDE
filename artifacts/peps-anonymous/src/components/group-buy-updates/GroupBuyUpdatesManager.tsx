import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, ImagePlus, Loader2, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import {
  GB_STAGES, GB_STAGE_LABEL, GBU_NOTE_MAX, GBU_POLL_MS, GBU_TITLE_MAX, buildUpdateFormData, deleteUpdate, fetchManagedUpdates,
  formatUpdateDate, gbuKeys, GbUpdatesError, isConflict, saveStage, saveUpdate, sortNewestFirst, validateDraft, validateImage,
  type GbStage, type GbUpdate, type GbUpdatesResponse, type GbUpdatesScope,
} from "@/lib/group-buy-updates";
import { GroupBuyProgressTracker } from "./GroupBuyProgressTracker";

const V = {
  text: "var(--t-text, #0F1F38)", muted: "var(--t-muted, #6B7280)", border: "var(--t-border, #D0DAE4)",
  surface: "var(--t-surface, #FFFFFF)", surface2: "var(--t-surface2, #F1F5F9)",
};
const inputCls = "w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-[#2D6BCC]/40 disabled:opacity-60";
const inputStyle = { background: V.surface2, borderColor: V.border, color: V.text };

/** Authenticated image fetch into a revocable blob URL. Global interceptors add auth headers. */
function useManagedImage(url: string | null, headers?: Record<string, string>) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const hdrKey = JSON.stringify(headers ?? {});
  useEffect(() => {
    setSrc(null); setFailed(false);
    if (!url) return;
    const ctrl = new AbortController();
    let obj: string | null = null;
    fetch(url, { credentials: "include", headers: JSON.parse(hdrKey), signal: ctrl.signal })
      .then(r => { if (!r.ok) throw new Error(); return r.blob(); })
      .then(b => { if (ctrl.signal.aborted) return; obj = URL.createObjectURL(b); setSrc(obj); })
      .catch(() => { if (!ctrl.signal.aborted) setFailed(true); });
    return () => { ctrl.abort(); if (obj) URL.revokeObjectURL(obj); };
  }, [url, hdrKey]);
  return { src, failed };
}

function ManagedImage({ url, alt, headers }: { url: string; alt: string; headers?: Record<string, string> }) {
  const { src, failed } = useManagedImage(url, headers);
  const [full, setFull] = useState(false);
  useEffect(() => {
    if (!full) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setFull(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [full]);
  if (failed) return <p className="text-[11px]" style={{ color: V.muted }}>Image could not be loaded.</p>;
  if (!src) return <div className="h-24 rounded-lg animate-pulse" style={{ background: V.surface2 }} />;
  return (
    <>
      <button type="button" data-testid="button-view-gb-update-image" onClick={() => setFull(true)} className="block w-full rounded-lg overflow-hidden" style={{ background: V.surface2 }}>
        <img src={src} alt={alt} className="w-full max-h-56 object-contain" />
      </button>
      {full && (
        <div role="dialog" aria-label="Full-size image" onClick={() => setFull(false)} className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(10,18,32,0.85)" }}>
          <button type="button" aria-label="Close" data-testid="button-close-gb-update-image" onClick={e => { e.stopPropagation(); setFull(false); }} className="absolute top-4 right-4 text-white"><X className="w-6 h-6" /></button>
          <img src={src} alt={alt} onClick={e => e.stopPropagation()} className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </>
  );
}

/** Serialised mutation runner owned by the manager: one change at a time. */
export type RunMutation = <T>(fn: () => Promise<T>, apply: (old: GbUpdatesResponse, result: T) => GbUpdatesResponse) => Promise<T>;

function StageControl({ data, run, blocked, mutate, onConflict }: {
  data: GbUpdatesResponse; run: RunMutation; blocked: boolean;
  mutate: (stage: GbStage, expected: string | null) => Promise<GbUpdatesResponse>; onConflict: () => void;
}) {
  const [pick, setPick] = useState<GbStage>(data.stage);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ err: boolean; text: string } | null>(null);
  const base = useRef(data.stage);
  useEffect(() => { if (base.current !== data.stage) { base.current = data.stage; setPick(data.stage); } }, [data.stage]);

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const r = await run(() => mutate(pick, data.stageUpdatedAt), (_old, res) => res);
      setMsg({ err: false, text: `Stage set to ${GB_STAGE_LABEL[r.stage]}. A dated status note was published.` });
    } catch (e) {
      if (isConflict(e)) { onConflict(); setMsg({ err: true, text: "Someone else changed the stage. Latest state loaded; review and try again." }); }
      else setMsg({ err: true, text: e instanceof Error ? e.message : "Could not save stage" });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
      <GroupBuyProgressTracker stage={data.stage} stageUpdatedAt={data.stageUpdatedAt} />
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex-1 min-w-[180px]">
          <span className="block text-[11px] font-semibold mb-1" style={{ color: V.muted }}>Group buy status</span>
          <select data-testid="select-gb-stage" value={pick} disabled={saving || blocked} onChange={e => setPick(e.target.value as GbStage)} className={inputCls} style={inputStyle}>
            {GB_STAGES.map((s, i) => <option key={s} value={s}>{i + 1}. {GB_STAGE_LABEL[s]}</option>)}
          </select>
        </label>
        <button type="button" data-testid="button-save-gb-stage" onClick={save} disabled={saving || blocked || pick === data.stage}
          className="h-10 px-4 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-50" style={{ background: "#1B3A7A" }}>
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save status
        </button>
      </div>
      <p className="text-[11px]" style={{ color: V.muted }}>Manual and group-wide. Does not change any payment, order or parcel status.</p>
      {msg && <p role={msg.err ? "alert" : "status"} data-testid="text-gb-stage-msg" className={`text-xs ${msg.err ? "text-red-600" : "text-green-700"}`}>{msg.text}</p>}
    </div>
  );
}

function UpdateEditor({ scope, gbId, initial, headers, run, blocked, onSaved, onCancel }: {
  scope: GbUpdatesScope; gbId: string; initial: GbUpdate | null; headers?: Record<string, string>;
  run: RunMutation; blocked: boolean; onSaved: () => void; onCancel: () => void;
}) {
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
    const u = URL.createObjectURL(file); setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const pickFile = (f: File | undefined) => {
    if (fileInput.current) fileInput.current.value = "";
    if (!f) return;
    const err = validateImage(f);
    if (err) { setError(err); return; }
    setError(null); setFile(f); setRemoveImage(false);
  };
  const save = async () => {
    const err = validateDraft(title, note);
    if (err) { setError(err); return; }
    setSaving(true); setError(null);
    try {
      const fd = buildUpdateFormData({ title, note, published, image: file, removeImage });
      await run(() => saveUpdate(scope, gbId, initial?.id ?? null, fd), upsertInto);
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };
  const hasExisting = !!initial?.imageUrl && !removeImage && !file;

  return (
    <div data-testid="form-gb-update" className="rounded-xl border p-3 space-y-3" style={{ borderColor: V.border }}>
      <div>
        <div className="flex justify-between mb-1">
          <label htmlFor="gbu-title" className="text-[11px] font-semibold" style={{ color: V.muted }}>Title (optional)</label>
          <span className="text-[10px]" style={{ color: title.length > GBU_TITLE_MAX ? "#ef4444" : V.muted }}>{title.length}/{GBU_TITLE_MAX}</span>
        </div>
        <input id="gbu-title" data-testid="input-gb-update-title" value={title} onChange={e => setTitle(e.target.value)} disabled={saving} className={inputCls} style={inputStyle} placeholder="e.g. Vendor confirmed payment" />
      </div>
      <div>
        <div className="flex justify-between mb-1">
          <label htmlFor="gbu-note" className="text-[11px] font-semibold" style={{ color: V.muted }}>Note</label>
          <span className="text-[10px]" style={{ color: note.length > GBU_NOTE_MAX ? "#ef4444" : V.muted }}>{note.length}/{GBU_NOTE_MAX}</span>
        </div>
        <textarea id="gbu-note" data-testid="input-gb-update-note" value={note} onChange={e => setNote(e.target.value)} disabled={saving} rows={4} className={`${inputCls} resize-y`} style={inputStyle} placeholder="Plain text. Line breaks are preserved." />
      </div>
      <div className="space-y-2">
        <input ref={fileInput} data-testid="input-gb-update-image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={e => pickFile(e.target.files?.[0])} />
        {preview && <img src={preview} alt="Selected" className="w-full max-h-56 object-contain rounded-lg" style={{ background: V.surface2 }} />}
        {hasExisting && initial?.imageUrl && <ManagedImage url={initial.imageUrl} alt="Current image" headers={headers} />}
        {removeImage && <p className="text-[11px]" style={{ color: V.muted }}>Current image will be removed on save.</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" data-testid="button-pick-gb-update-image" disabled={saving} onClick={() => fileInput.current?.click()} className="h-8 px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50" style={{ borderColor: V.border, color: V.text }}>
            <ImagePlus className="w-3.5 h-3.5" /> {file || hasExisting ? "Replace image" : "Add image"}
          </button>
          {file && <button type="button" data-testid="button-clear-gb-update-image" disabled={saving} onClick={() => setFile(null)} className="h-8 px-3 rounded-lg text-xs font-semibold" style={{ color: V.muted }}>Clear selection</button>}
          {hasExisting && <button type="button" data-testid="button-remove-gb-update-image" disabled={saving} onClick={() => setRemoveImage(true)} className="h-8 px-3 rounded-lg text-xs font-semibold text-red-600">Remove image</button>}
          {removeImage && <button type="button" data-testid="button-keep-gb-update-image" disabled={saving} onClick={() => setRemoveImage(false)} className="h-8 px-3 rounded-lg text-xs font-semibold" style={{ color: V.muted }}>Keep image</button>}
        </div>
        <p className="text-[10px]" style={{ color: V.muted }}>PNG, JPEG, WebP or GIF, up to 5 MB.</p>
      </div>
      <label className="flex items-center gap-2 text-xs font-semibold" style={{ color: V.text }}>
        <input data-testid="checkbox-gb-update-published" type="checkbox" checked={published} disabled={saving} onChange={e => setPublished(e.target.checked)} />
        Published (visible to members of this group buy)
      </label>
      {error && <p role="alert" data-testid="text-gb-update-error" className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" data-testid="button-save-gb-update" onClick={save} disabled={saving || blocked} className="h-9 px-4 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-60" style={{ background: "#1B3A7A" }}>
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {initial ? "Save changes" : published ? "Publish update" : "Save draft"}
        </button>
        <button type="button" data-testid="button-cancel-gb-update" onClick={onCancel} disabled={saving} className="h-9 px-4 rounded-xl text-sm font-semibold" style={{ color: V.muted }}>Cancel</button>
      </div>
    </div>
  );
}

const upsertInto = (o: GbUpdatesResponse, u: GbUpdate): GbUpdatesResponse =>
  ({ ...o, updates: sortNewestFirst([u, ...o.updates.filter(x => x.id !== u.id)]) });

function ManagerBody({ scope, groupBuyId, headers }: Props) {
  const qc = useQueryClient();
  const key = gbuKeys.manage(scope, groupBuyId);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; msg: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  /** Bumped at mutation start/end; a poll that started under an older generation is discarded. */
  const generation = useRef(0);

  const q = useQuery({
    queryKey: key,
    queryFn: async ({ signal }) => {
      const gen = generation.current;
      const r = await fetchManagedUpdates(scope, groupBuyId, signal);
      if (gen !== generation.current || pendingRef.current) {
        const cur = qc.getQueryData<GbUpdatesResponse>(gbuKeys.manage(scope, groupBuyId));
        if (cur) return cur;
      }
      return r;
    },
    refetchInterval: pending ? false : GBU_POLL_MS,
    refetchOnWindowFocus: !pending,
    retry: 1,
  });

  const run: RunMutation = useCallback(async (fn, apply) => {
    if (pendingRef.current) throw new GbUpdatesError("Another change is still saving. Try again in a moment.", 0);
    const k = gbuKeys.manage(scope, groupBuyId);
    pendingRef.current = true;
    setPending(true);
    generation.current += 1;
    try {
      await qc.cancelQueries({ queryKey: k });
      const result = await fn();
      generation.current += 1;
      qc.setQueryData<GbUpdatesResponse>(k, old => (old ? apply(old, result) : old));
      qc.invalidateQueries({ queryKey: gbuKeys.customerAll });
      qc.invalidateQueries({ queryKey: gbuKeys.progressAll });
      return result;
    } finally {
      generation.current += 1;
      pendingRef.current = false;
      setPending(false);
    }
  }, [qc, scope, groupBuyId]);

  const toggle = async (u: GbUpdate) => {
    setWorking(u.id); setRowError(null);
    try { await run(() => saveUpdate(scope, groupBuyId, u.id, buildUpdateFormData({ title: u.title ?? "", note: u.note, published: !u.published })), upsertInto); }
    catch (e) { setRowError({ id: u.id, msg: e instanceof Error ? e.message : "Update failed" }); }
    finally { setWorking(null); }
  };
  const remove = async (id: string) => {
    setWorking(id); setRowError(null);
    try {
      await run(() => deleteUpdate(scope, groupBuyId, id), o => ({ ...o, updates: o.updates.filter(x => x.id !== id) }));
      setConfirmDelete(null);
      if (editing === id) setEditing(null);
    } catch (e) { setRowError({ id, msg: e instanceof Error ? e.message : "Delete failed" }); }
    finally { setWorking(null); }
  };

  const d = q.data;
  return (
    <div className="space-y-4">
      {q.isLoading && <div className="space-y-2" aria-label="Loading progress">{[0, 1, 2].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: V.surface2 }} />)}</div>}
      {q.isError && (
        <div role="alert" data-testid="text-gb-updates-load-error" className="flex items-center gap-2 text-xs text-red-600">
          <span className="flex-1">Could not load progress: {q.error instanceof Error ? q.error.message : "error"}</span>
          <button type="button" data-testid="button-retry-gb-updates-manage" onClick={() => q.refetch()} className="inline-flex items-center gap-1 font-semibold"><RefreshCw className="w-3 h-3" /> Retry</button>
        </div>
      )}
      {d && (
        <>
          <StageControl data={d} run={run} blocked={pending}
            mutate={(stage, expected) => saveStage(scope, groupBuyId, stage, expected)}
            onConflict={() => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: gbuKeys.progressAll }); }} />
          <div className="border-t pt-3 space-y-2" style={{ borderColor: V.border }}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#8A9AAA" }}>Dated notes</p>
              {editing !== "new" && (
                <button type="button" data-testid="button-new-gb-update" disabled={pending} onClick={() => setEditing("new")} className="h-8 px-3 rounded-lg text-xs font-semibold text-white inline-flex items-center gap-1.5" style={{ background: "#1B3A7A" }}>
                  <Plus className="w-3.5 h-3.5" /> New note
                </button>
              )}
            </div>
            {editing === "new" && <UpdateEditor scope={scope} gbId={groupBuyId} initial={null} headers={headers} run={run} blocked={pending} onSaved={() => setEditing(null)} onCancel={() => setEditing(null)} />}
            {d.updates.length === 0 && editing !== "new" && <p className="text-xs py-3 text-center" style={{ color: V.muted }}>No notes yet. Members only see the stage tracker.</p>}
            {d.updates.map(u => editing === u.id ? (
              <UpdateEditor key={u.id} scope={scope} gbId={groupBuyId} initial={u} headers={headers} run={run} blocked={pending} onSaved={() => setEditing(null)} onCancel={() => setEditing(null)} />
            ) : (
              <div key={u.id} data-testid={`card-manage-gb-update-${u.id}`} className="rounded-xl border p-3 space-y-2" style={{ borderColor: V.border }}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${u.published ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{u.published ? "Published" : "Hidden"}</span>
                      {u.kind === "status" && <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: "rgba(233,160,32,0.15)", color: "#9A6510" }}>Stage{u.stage ? `: ${GB_STAGE_LABEL[u.stage]}` : ""}</span>}
                      {u.title && <span className="text-sm font-semibold break-words" style={{ color: V.text }}>{u.title}</span>}
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: V.muted }}>{formatUpdateDate(u.createdAt)}{u.updatedAt !== u.createdAt ? ` · edited ${formatUpdateDate(u.updatedAt)}` : ""}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" aria-label={u.published ? "Hide" : "Publish"} data-testid={`button-toggle-gb-update-${u.id}`} disabled={pending} onClick={() => toggle(u)} className="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-black/5 disabled:opacity-50">
                      {working === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : u.published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button type="button" aria-label="Edit" data-testid={`button-edit-gb-update-${u.id}`} disabled={pending || editing !== null} onClick={() => setEditing(u.id)} className="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-black/5 disabled:opacity-50"><Pencil className="w-3.5 h-3.5" /></button>
                    <button type="button" aria-label="Delete" data-testid={`button-delete-gb-update-${u.id}`} disabled={pending} onClick={() => setConfirmDelete(u.id)} className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <p className="text-xs whitespace-pre-wrap break-words line-clamp-4" style={{ color: V.text }}>{u.note}</p>
                {u.imageUrl && <ManagedImage url={u.imageUrl} alt={u.title || "Update image"} headers={headers} />}
                {confirmDelete === u.id && (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg p-2 bg-red-50 text-xs">
                    <span className="flex-1 text-red-700">Delete this note permanently?</span>
                    <button type="button" data-testid={`button-confirm-delete-gb-update-${u.id}`} disabled={pending} onClick={() => remove(u.id)} className="h-7 px-3 rounded-lg bg-red-500 text-white font-semibold disabled:opacity-60">Delete</button>
                    <button type="button" data-testid={`button-cancel-delete-gb-update-${u.id}`} onClick={() => setConfirmDelete(null)} className="h-7 px-3 rounded-lg font-semibold text-slate-600">Cancel</button>
                  </div>
                )}
                {rowError?.id === u.id && <p role="alert" className="text-xs text-red-600">{rowError.msg}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface Props { scope: GbUpdatesScope; groupBuyId: string; /** Optional non-persisted auth headers for image fetches. */ headers?: Record<string, string> }

/** "Progress & updates" manager. Keyed by group id so switching groups resets all scoped state. */
export function GroupBuyUpdatesManager(props: Props) {
  return (
    <section data-testid="gb-updates-manager" aria-labelledby={`gbu-h-${props.groupBuyId}`} className="rounded-2xl border p-4 space-y-3" style={{ borderColor: V.border, background: V.surface, color: V.text }}>
      <div>
        <h3 id={`gbu-h-${props.groupBuyId}`} className="text-sm font-bold" style={{ color: V.text }}>Progress & updates</h3>
        <p className="text-[11px] mt-0.5" style={{ color: V.muted }}>Stage and dated notes shown to members of this group buy, newest first. Hidden notes stay private.</p>
      </div>
      <ManagerBody key={`${props.scope}:${props.groupBuyId}`} {...props} />
    </section>
  );
}

export default GroupBuyUpdatesManager;
