import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, BadgeCheck } from "lucide-react";
import { get, post, fileUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { VendorSummary } from "@/lib/types";
import { Page } from "@/components/Layout";
import { Button, Input, Modal, Field, Textarea, Spinner, Empty, useToast } from "@/components/ui";

export function VendorForm({ onCreated, onClose }: { onCreated: (vendor: VendorSummary) => void; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", website: "", country: "", description: "" });
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { const r = await post("/api/tmd/vendors", form); onCreated(r.vendor); if (r.existing) toast("That vendor already exists; using it.", "info"); onClose(); }
    catch (err: any) { toast(err.message, "danger"); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Vendor name"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required minLength={2} autoFocus /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Website" hint="Optional"><Input placeholder="https://" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></Field>
        <Field label="Country" hint="Optional"><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></Field>
      </div>
      <Field label="Notes" hint="What people should know. Keep it factual."><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
      <div className="flex justify-end gap-2"><Button type="button" tone="ghost" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>Add vendor</Button></div>
    </form>
  );
}

export default function Vendors() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const vendors = useQuery({ queryKey: ["vendors", q], queryFn: () => get<{ vendors: VendorSummary[] }>(`/api/tmd/vendors?q=${encodeURIComponent(q)}`) });
  return (
    <Page title="Vendors" subtitle="Every vendor gets a page: batches, photos, active pools and every public result. Vendors cannot edit or hide results."
      actions={user ? <Button onClick={() => setAdding(true)}><Plus className="size-4" /> Add vendor</Button> : <Link href="/login?next=/vendors"><Button tone="outline">Sign in to add a vendor</Button></Link>}>
      <div className="relative sm:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim" /><Input className="pl-9" placeholder="Search vendors" value={q} onChange={e => setQ(e.target.value)} /></div>
      {vendors.isLoading ? <div className="flex justify-center py-16"><Spinner /></div> : vendors.data?.vendors?.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.data.vendors.map(v => (
            <Link key={v.id} href={`/v/${v.slug}`} className="card flex gap-4 p-4 transition hover:border-line-2">
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-2 text-lg font-bold text-muted">{v.logoKey ? <img src={fileUrl(v.logoKey)} alt="" className="size-full object-cover" /> : v.name[0]}</div>
              <div className="min-w-0 flex-1">
                <h3 className="flex items-center gap-1 truncate font-semibold">{v.name}{v.verified && <BadgeCheck className="size-4 text-brand" />}</h3>
                <p className="truncate text-xs text-muted">{v.country ?? "—"}{v.website ? ` · ${v.website.replace(/^https?:\/\//, "")}` : ""}</p>
                <div className="mono mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted">
                  <span><b className="text-fg">{v.batches}</b> batches</span><span><b className="text-fg">{v.activePools}</b> active</span><span><b className="text-fg">{v.results}</b> results</span>
                  {v.avgPurity != null && <span><b className="text-brand">{v.avgPurity}%</b> avg purity</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : <Empty title="No vendors match">{user ? "Add the vendor you want tested." : "Sign in to add one."}</Empty>}
      <Modal open={adding} onClose={() => setAdding(false)} title="Add a vendor">
        <VendorForm onClose={() => setAdding(false)} onCreated={v => { qc.invalidateQueries({ queryKey: ["vendors"] }); navigate(`/v/${v.slug}`); }} />
      </Modal>
    </Page>
  );
}
