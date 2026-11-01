import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, ExternalLink, Plus, Globe } from "lucide-react";
import { get, post, upload, fileUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Vendor, Batch, Photo, Pool } from "@/lib/types";
import { date } from "@/lib/format";
import { Button, Tabs, Modal, Field, Input, Textarea, Spinner, Empty, Badge, useToast } from "@/components/ui";
import { PoolCard } from "@/components/PoolCard";
import { PhotoGrid, PhotoUploader } from "@/components/Photos";
import NotFound from "./NotFound";

type VendorResult = { id: string; poolId: string; poolSlug: string; poolTitle: string; publishedAt: string; batchId: string | null; testType: string; lab: string | null; summary: string | null; purityPct: string | null; quantityMg: string | null; endotoxin: string | null; sterility: string | null; heavyMetals: string | null; passed: boolean | null; reportKey: string | null; labVerifyUrl: string | null };
type VendorView = { vendor: Vendor; canEdit: boolean; batches: (Batch & { photos: Photo[] })[]; photos: Photo[]; pools: Pool[]; results: VendorResult[] };

export function BatchForm({ vendorId, onCreated, onClose }: { vendorId: string; onCreated: (batch: Batch) => void; onClose: () => void }) {
  const [form, setForm] = useState({ compound: "", batchNumber: "", mg: "", capColour: "", manufacturedOn: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { const r = await post(`/api/tmd/vendors/${vendorId}/batches`, form); onCreated(r.batch); if (r.existing) toast("That batch is already listed; using it.", "info"); onClose(); }
    catch (err: any) { toast(err.message, "danger"); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Compound"><Input placeholder="BPC-157" value={form.compound} onChange={e => setForm({ ...form, compound: e.target.value })} required autoFocus /></Field>
        <Field label="Batch / lot number"><Input placeholder="As printed on the vial" value={form.batchNumber} onChange={e => setForm({ ...form, batchNumber: e.target.value })} required /></Field>
        <Field label="Size"><Input placeholder="10mg" value={form.mg} onChange={e => setForm({ ...form, mg: e.target.value })} /></Field>
        <Field label="Cap colour"><Input placeholder="Blue" value={form.capColour} onChange={e => setForm({ ...form, capColour: e.target.value })} /></Field>
        <Field label="Manufactured"><Input placeholder="2026-03" value={form.manufacturedOn} onChange={e => setForm({ ...form, manufacturedOn: e.target.value })} /></Field>
      </div>
      <Field label="Notes"><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
      <div className="flex justify-end gap-2"><Button type="button" tone="ghost" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>Add batch</Button></div>
    </form>
  );
}

export function ResultCard({ r, showPool = true }: { r: VendorResult; showPool?: boolean }) {
  return (
    <div className="card-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><p className="font-semibold">{r.testType}</p><p className="text-xs text-muted">{r.lab ?? "Lab not stated"} · {date(r.publishedAt)}</p></div>
        {r.passed != null && <Badge tone={r.passed ? "ok" : "danger"}>{r.passed ? "Pass" : "Fail"}</Badge>}
      </div>
      <dl className="mono mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        {r.purityPct != null && <div><dt className="text-dim">Purity</dt><dd className="text-base font-semibold text-brand">{Number(r.purityPct).toFixed(2)}%</dd></div>}
        {r.quantityMg != null && <div><dt className="text-dim">Quantity</dt><dd className="text-base font-semibold">{Number(r.quantityMg).toFixed(2)} mg</dd></div>}
        {r.endotoxin && <div><dt className="text-dim">Endotoxin</dt><dd>{r.endotoxin}</dd></div>}
        {r.sterility && <div><dt className="text-dim">Sterility</dt><dd>{r.sterility}</dd></div>}
        {r.heavyMetals && <div><dt className="text-dim">Heavy metals</dt><dd>{r.heavyMetals}</dd></div>}
      </dl>
      {r.summary && <p className="mt-3 text-sm text-muted">{r.summary}</p>}
      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        {r.reportKey && <a href={fileUrl(r.reportKey)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand hover:underline">Lab report (PDF) <ExternalLink className="size-3" /></a>}
        {r.labVerifyUrl && <a href={r.labVerifyUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand hover:underline">Verify with the lab <ExternalLink className="size-3" /></a>}
        {showPool && <Link href={`/p/${r.poolSlug}`} className="text-muted hover:text-fg">From pool: {r.poolTitle}</Link>}
      </div>
    </div>
  );
}

export default function VendorPage({ slug }: { slug: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<"pools" | "results" | "batches" | "photos">("pools");
  const [addingBatch, setAddingBatch] = useState(false);
  const view = useQuery({ queryKey: ["vendor", slug], queryFn: () => get<VendorView>(`/api/tmd/vendors/${slug}`), retry: false });
  if (view.isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (view.isError || !view.data) return <NotFound />;
  const { vendor, batches, photos, pools, results, canEdit } = view.data;
  const refresh = () => qc.invalidateQueries({ queryKey: ["vendor", slug] });
  const batchName = (id: string | null) => { const b = batches.find(x => x.id === id); return b ? `${b.compound} · ${b.batchNumber}` : "Unknown batch"; };
  return (
    <div className="fade-in space-y-6">
      <header className="flex flex-wrap items-start gap-4">
        <div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-brand-soft text-2xl font-bold text-brand">{vendor.logoKey ? <img src={fileUrl(vendor.logoKey)} alt="" className="size-full object-cover" /> : vendor.name[0]}</div>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">{vendor.name}{vendor.verified && <BadgeCheck className="size-5 text-brand" />}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted">
            {vendor.country && <span>{vendor.country}</span>}
            {vendor.website && <a href={vendor.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-fg"><Globe className="size-3.5" />{vendor.website.replace(/^https?:\/\//, "")}</a>}
            <span className="mono text-xs">{results.length} public result{results.length === 1 ? "" : "s"} · {batches.length} batch{batches.length === 1 ? "" : "es"}</span>
          </p>
          {vendor.description && <p className="mt-2 max-w-2xl text-sm text-muted">{vendor.description}</p>}
        </div>
        <div className="flex gap-2">
          {user && <Button tone="subtle" onClick={() => setAddingBatch(true)}><Plus className="size-4" /> Add batch</Button>}
          {user && <Link href={`/host/new?vendor=${vendor.id}`}><Button>Host a pool</Button></Link>}
          {canEdit && <label className="cursor-pointer"><input type="file" accept="image/*" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; try { await upload(`/api/tmd/vendors/${vendor.id}/logo`, f); refresh(); } catch (err: any) { toast(err.message, "danger"); } }} /><span className="inline-flex h-10 items-center rounded-xl border border-line-2 px-4 text-sm hover:border-brand">Logo</span></label>}
        </div>
      </header>

      <Tabs value={tab} onChange={setTab} tabs={[{ value: "pools", label: "Pools", count: pools.length }, { value: "results", label: "Results", count: results.length }, { value: "batches", label: "Batches", count: batches.length }, { value: "photos", label: "Photos", count: photos.length }]} />

      {tab === "pools" && (pools.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{pools.map(p => <PoolCard key={p.id} pool={p} />)}</div> : <Empty title="No pools for this vendor yet">{user ? <Link href={`/host/new?vendor=${vendor.id}`} className="text-brand hover:underline">Host the first one.</Link> : "Sign in to host one."}</Empty>)}

      {tab === "results" && (results.length ? (
        <div className="space-y-3">{results.map(r => <div key={r.id}><p className="mb-1 text-xs uppercase tracking-wider text-dim">{batchName(r.batchId)}</p><ResultCard r={r} /></div>)}</div>
      ) : <Empty title="No public results yet">Results appear here when an organiser publishes them publicly.</Empty>)}

      {tab === "batches" && (batches.length ? (
        <div className="space-y-3">
          {batches.map(b => (
            <div key={b.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h3 className="font-semibold">{b.compound} <span className="mono text-sm text-muted">· {b.batchNumber}</span></h3>
                  <p className="text-xs text-muted">{[b.mg, b.capColour && `${b.capColour} cap`, b.manufacturedOn && `made ${b.manufacturedOn}`].filter(Boolean).join(" · ") || "No details yet"}</p>
                  {b.notes && <p className="mt-1 text-sm text-muted">{b.notes}</p>}</div>
                <div className="flex gap-2">
                  {user && <PhotoUploader path={`/api/tmd/batches/${b.id}/photos`} onDone={refresh} compact label="Photo" />}
                  {user && <Link href={`/host/new?vendor=${vendor.id}&batch=${b.id}`}><Button size="sm" tone="outline">Test this batch</Button></Link>}
                </div>
              </div>
              {b.photos.length > 0 && <PhotoGrid photos={b.photos} className="mt-3" />}
              {results.some(r => r.batchId === b.id) && <div className="mt-3 space-y-2">{results.filter(r => r.batchId === b.id).map(r => <ResultCard key={r.id} r={r} />)}</div>}
            </div>
          ))}
        </div>
      ) : <Empty title="No batches listed">{user ? <button className="text-brand hover:underline" onClick={() => setAddingBatch(true)}>Add the first batch.</button> : "Sign in to add one."}</Empty>)}

      {tab === "photos" && (photos.length ? <PhotoGrid photos={photos} /> : <Empty title="No photos yet">Photos are added per batch from the Batches tab.</Empty>)}

      <Modal open={addingBatch} onClose={() => setAddingBatch(false)} title={`Add a batch for ${vendor.name}`}>
        <BatchForm vendorId={vendor.id} onClose={() => setAddingBatch(false)} onCreated={() => { refresh(); setTab("batches"); }} />
      </Modal>
    </div>
  );
}
