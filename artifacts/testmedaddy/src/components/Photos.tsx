import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import type { Photo } from "@/lib/types";
import { fileUrl, upload } from "@/lib/api";
import { Button, Modal, Select, Input, useToast, cn } from "./ui";

export const PHOTO_KINDS = [{ value: "batch", label: "Batch / box" }, { value: "vial", label: "Vial close-up" }, { value: "packaging", label: "Packaging" }, { value: "custody", label: "Chain of custody" }, { value: "lab", label: "Lab intake" }];

export function PhotoGrid({ photos, onRemove, className }: { photos: Photo[]; onRemove?: (photo: Photo) => void; className?: string }) {
  const [open, setOpen] = useState<Photo | null>(null);
  if (!photos.length) return null;
  return (
    <>
      <div className={cn("grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6", className)}>
        {photos.map(p => (
          <figure key={p.id} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-2">
            <button className="size-full" onClick={() => setOpen(p)}><img src={fileUrl(p.key)} alt={p.caption ?? p.kind} loading="lazy" className="size-full object-cover transition group-hover:scale-105" /></button>
            <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1 pt-4 text-[10px] uppercase tracking-wider text-fg/80">{PHOTO_KINDS.find(k => k.value === p.kind)?.label ?? p.kind}</figcaption>
            {onRemove && <button onClick={() => onRemove(p)} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-fg opacity-0 transition group-hover:opacity-100" aria-label="Remove photo"><X className="size-3.5" /></button>}
          </figure>
        ))}
      </div>
      <Modal open={!!open} onClose={() => setOpen(null)} wide title={open?.caption ?? PHOTO_KINDS.find(k => k.value === open?.kind)?.label}>
        {open && <img src={fileUrl(open.key)} alt={open.caption ?? ""} className="max-h-[75vh] w-full rounded-xl object-contain" />}
      </Modal>
    </>
  );
}

/** Button + hidden input that uploads one image with a kind and caption. */
export function PhotoUploader({ path, fields, onDone, label = "Add photo", kinds = PHOTO_KINDS, compact }: { path: string; fields?: Record<string, string>; onDone: (photo: Photo) => void; label?: string; kinds?: typeof PHOTO_KINDS; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [kind, setKind] = useState(kinds[0].value);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const pick = () => input.current?.click();
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try { const r = await upload(path, file, { ...fields, kind, caption }); onDone(r.photo); setCaption(""); toast("Photo added", "ok"); }
    catch (e: any) { toast(e.message ?? "Upload failed", "danger"); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  };
  return (
    <div className={cn("flex flex-wrap items-end gap-2", compact && "gap-1")}>
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
      {!compact && <Select value={kind} onChange={e => setKind(e.target.value)} className="w-auto">{kinds.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}</Select>}
      {!compact && <Input placeholder="Caption (optional)" value={caption} onChange={e => setCaption(e.target.value)} className="w-auto flex-1 min-w-40" />}
      <Button type="button" tone="subtle" size={compact ? "sm" : "md"} loading={busy} onClick={pick}><Camera className="size-4" /> {label}</Button>
    </div>
  );
}
