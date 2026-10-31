import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Link2, Loader2, Lock, RotateCcw, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { assignableGroups, readError } from "./supplier-testing-logic";

const NAVY = "#1B3A7A";
const CARD_BORDER = "rgba(27,58,122,0.12)";
const PRIMARY_TEXT = "#0F1F38";
const MUTED = "#6B7280";
const LABEL = "#8A9AAA";
const inp = "px-2.5 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6BCC]/30";
const inpStyle = { borderColor: CARD_BORDER, background: "#F8FAFC", color: PRIMARY_TEXT };

type AdminGroup = { id: string; poolId: string; slug: string; title: string; supplierId: string; supplierName: string; productId: string; productName: string; batchNumber: string; status: string };
type AdminInterest = { id: string; username: string; orderId: string; orderCode: string; productId: string; productName: string; supplierId: string; supplierName: string; groupId: string | null; assignmentNote: string | null; eligible: boolean };
type AdminData = {
  suppliers: { id: string; name: string }[];
  products: { id: string; name: string; supplierId: string }[];
  pools: { id: string; title: string; status: string; batchNumber: string | null; leaderUsername: string }[];
  groups: AdminGroup[];
  interests: AdminInterest[];
};
const KEY = ["/api/admin/supplier-testing"];

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-[10px] font-bold uppercase tracking-widest" style={{ color: LABEL }}>{label}</label>
      {children}
    </div>
  );
}

function AssignRow({ interest, groups, headers }: { interest: AdminInterest; groups: AdminGroup[]; headers: HeadersInit }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const options = assignableGroups(groups, interest);
  const [groupId, setGroupId] = useState("");
  const [note, setNote] = useState("");
  const assign = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/admin/supplier-testing/interests/${interest.id}/assign`, {
        method: "PUT", credentials: "include",
        headers: { ...(headers as Record<string, string>), "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, note: note.trim() }),
      });
      if (!r.ok) throw new Error(await readError(r, "Assignment failed"));
    },
    onSuccess: () => { toast({ title: "Interest assigned to batch" }); qc.invalidateQueries({ queryKey: KEY }); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });
  const id = `as-${interest.id}`;
  if (options.length === 0) return <p className="text-xs italic" style={{ color: LABEL }}>No batch group for this supplier and product yet. Link one above.</p>;
  return (
    <form className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_auto] gap-2 items-end"
      onSubmit={e => { e.preventDefault(); if (groupId && note.trim()) assign.mutate(); }}>
      <Field label="Batch group" htmlFor={`${id}-g`}>
        <select id={`${id}-g`} className={inp} style={inpStyle} value={groupId} onChange={e => setGroupId(e.target.value)}>
          <option value="">Select batch</option>
          {options.map(g => <option key={g.id} value={g.id}>Batch {g.batchNumber} · {g.title}</option>)}
        </select>
      </Field>
      <Field label="Staff note (required)" htmlFor={`${id}-n`}>
        <input id={`${id}-n`} className={inp} style={inpStyle} value={note} onChange={e => setNote(e.target.value)} placeholder="How was the batch confirmed?" />
      </Field>
      <button type="submit" disabled={!groupId || !note.trim() || assign.isPending}
        className="inline-flex items-center justify-center gap-1.5 font-semibold rounded-lg px-3 py-1.5 text-xs text-white disabled:opacity-50" style={{ background: NAVY }}>
        {assign.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />} Assign
      </button>
    </form>
  );
}

export function AdminSupplierTesting({ headers }: { headers: HeadersInit }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ poolId: "", supplierId: "", productId: "", batchNumber: "" });
  const [view, setView] = useState<"pending" | "assigned">("pending");

  const { data, isLoading, isError, refetch } = useQuery<AdminData>({
    queryKey: KEY,
    queryFn: async () => {
      const r = await fetch("/api/admin/supplier-testing", { credentials: "include", headers });
      if (!r.ok) throw new Error(await readError(r, "Failed to load"));
      return r.json();
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/supplier-testing/groups", {
        method: "POST", credentials: "include",
        headers: { ...(headers as Record<string, string>), "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, batchNumber: form.batchNumber.trim() }),
      });
      if (!r.ok) throw new Error(await readError(r, "Could not link pool"));
    },
    onSuccess: () => {
      toast({ title: "Pool linked to batch", description: "Open it from Testing Pools using its existing edit form." });
      setForm({ poolId: "", supplierId: "", productId: "", batchNumber: "" });
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["/api/admin/testing-pools"] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const linkedPoolIds = useMemo(() => new Set((data?.groups ?? []).map(g => g.poolId)), [data]);
  const draftPools = (data?.pools ?? []).filter(p => p.status === "draft" && p.leaderUsername === "__admin__" && !linkedPoolIds.has(p.id));
  const products = (data?.products ?? []).filter(p => !form.supplierId || p.supplierId === form.supplierId);
  const groupById = useMemo(() => new Map((data?.groups ?? []).map(g => [g.id, g])), [data]);
  const pending = (data?.interests ?? []).filter(i => !i.groupId);
  const assigned = (data?.interests ?? []).filter(i => i.groupId);
  const canCreate = form.poolId && form.supplierId && form.productId && form.batchNumber.trim();

  if (isLoading) return <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "rgba(27,58,122,0.06)" }} />)}</div>;
  if (isError || !data) return (
    <div role="alert" className="bg-white rounded-2xl border p-5 flex items-center justify-between" style={{ borderColor: CARD_BORDER }}>
      <p className="text-sm" style={{ color: "#dc2626" }}>Failed to load supplier testing.</p>
      <button onClick={() => refetch()} className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border" style={{ borderColor: CARD_BORDER, color: MUTED }}><RotateCcw className="w-3 h-3" /> Retry</button>
    </div>
  );

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: CARD_BORDER }} aria-labelledby="ast-link">
        <div className="px-5 py-4 flex items-center gap-2.5" style={{ background: "linear-gradient(135deg, #2D6BCC 0%, #1B3A7A 100%)" }}>
          <Link2 className="w-4 h-4 text-white/80" />
          <h3 id="ast-link" className="font-bold text-white text-sm">Link draft pool to a supplier batch</h3>
        </div>
        <form className="p-5 space-y-3" onSubmit={e => { e.preventDefault(); if (canCreate) create.mutate(); }}>
          <p className="text-xs" style={{ color: MUTED }}>
            Create the pool in Testing Pools first. Once linked, supplier, product and batch cannot change. Then open the pool with its existing edit form to manage funding and results.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Draft testing pool" htmlFor="ast-pool">
              <select id="ast-pool" className={inp} style={inpStyle} value={form.poolId} onChange={e => setForm(f => ({ ...f, poolId: e.target.value }))}>
                <option value="">{draftPools.length ? "Select Admin-owned draft pool" : "Create a draft pool in Admin first"}</option>
                {draftPools.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </Field>
            <Field label="Supplier" htmlFor="ast-sup">
              <select id="ast-sup" className={inp} style={inpStyle} value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value, productId: "" }))}>
                <option value="">Select supplier</option>
                {data.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Product" htmlFor="ast-prod">
              <select id="ast-prod" className={inp} style={inpStyle} value={form.productId} disabled={!form.supplierId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}>
                <option value="">Select product</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Real batch number" htmlFor="ast-batch">
              <input id="ast-batch" className={inp} style={inpStyle} value={form.batchNumber} onChange={e => setForm(f => ({ ...f, batchNumber: e.target.value }))} placeholder="As printed on the vial" />
            </Field>
          </div>
          <button type="submit" disabled={!canCreate || create.isPending}
            className="inline-flex items-center gap-1.5 font-semibold rounded-lg px-3 py-1.5 text-xs text-white disabled:opacity-50" style={{ background: NAVY }}>
            {create.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />} Link pool
          </button>
        </form>
      </section>

      <section className="bg-white rounded-2xl border p-5" style={{ borderColor: CARD_BORDER }} aria-labelledby="ast-groups">
        <h3 id="ast-groups" className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: LABEL }}>Batch groups ({data.groups.length})</h3>
        {data.groups.length === 0 ? <p className="text-xs italic" style={{ color: LABEL }}>No batch groups linked yet.</p> : (
          <ul className="divide-y" style={{ borderColor: CARD_BORDER }}>
            {data.groups.map(g => (
              <li key={g.id} className="py-2 flex flex-wrap items-center gap-2 justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold" style={{ color: PRIMARY_TEXT }}>{g.title}</p>
                  <p className="text-[11px]" style={{ color: MUTED }}>{g.supplierName} · {g.productName} · <span className="font-mono">Batch {g.batchNumber}</span></p>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize" style={{ background: "rgba(148,163,184,0.15)", color: "#64748b" }}>
                  <Lock className="w-2.5 h-2.5" /> {g.status.replace(/_/g, " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-2xl border p-5" style={{ borderColor: CARD_BORDER }} aria-labelledby="ast-int">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h3 id="ast-int" className="flex items-center gap-2 text-sm font-bold" style={{ color: PRIMARY_TEXT }}><FlaskConical className="w-4 h-4" style={{ color: NAVY }} /> Member interest</h3>
          <div className="flex gap-1" role="tablist">
            {(["pending", "assigned"] as const).map(v => (
              <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg capitalize"
                style={view === v ? { background: NAVY, color: "#fff" } : { color: MUTED }}>
                {v === "pending" ? `Awaiting batch (${pending.length})` : `Assigned history (${assigned.length})`}
              </button>
            ))}
          </div>
        </div>
        {(view === "pending" ? pending : assigned).length === 0 ? (
          <p className="text-xs italic text-center py-6" style={{ color: LABEL }}>{view === "pending" ? "No members are waiting for a batch." : "No assignments yet."}</p>
        ) : (
          <ul className="space-y-2">
            {(view === "pending" ? pending : assigned).map(i => {
              const g = i.groupId ? groupById.get(i.groupId) : undefined;
              return (
                <li key={i.id} className="rounded-xl border p-3 space-y-2" style={{ borderColor: CARD_BORDER, background: "#F8FAFC" }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold" style={{ color: PRIMARY_TEXT }}>@{i.username} · {i.productName}</p>
                      <p className="text-[11px] font-mono" style={{ color: MUTED }}>{i.supplierName} · Order {i.orderCode}</p>
                    </div>
                    {!i.eligible && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(233,160,32,0.12)", color: "#b45309" }}>No longer eligible</span>}
                  </div>
                  {i.groupId ? (
                    <div className="text-xs space-y-0.5" style={{ color: MUTED }}>
                      <p className="flex items-center gap-1"><Lock className="w-3 h-3" /> Assigned to {g ? <>Batch <span className="font-mono">{g.batchNumber}</span> · {g.title}</> : "a batch group"}. Reassignment is not allowed.</p>
                      {i.assignmentNote && <p className="italic">Note: {i.assignmentNote}</p>}
                    </div>
                  ) : <AssignRow interest={i} groups={data.groups} headers={headers} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default AdminSupplierTesting;
