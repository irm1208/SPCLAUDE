import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAccount } from "@/hooks/use-account";
import { FlaskConical, Hash, Loader2, CheckCircle2, Clock, ArrowRight, Info, RotateCcw } from "lucide-react";
import {
  STATE_COPY, canJoin, filterGroups, filterItems, pct, readError, usd,
  type Filters, type SupplierTestingGroup, type SupplierTestingItem, type SupplierTestingResponse,
} from "./supplier-testing-logic";

export const SUPPLIER_TESTING_KEY = ["/api/account/supplier-testing"] as const;

const TONE: Record<string, { c: string; bg: string; b: string }> = {
  blue: { c: "var(--t-blue)", bg: "var(--t-blue-10)", b: "var(--t-blue-25)" },
  amber: { c: "#b45309", bg: "rgba(233,160,32,0.12)", b: "rgba(233,160,32,0.3)" },
  green: { c: "#15803d", bg: "rgba(34,197,94,0.12)", b: "rgba(34,197,94,0.3)" },
  slate: { c: "var(--t-subtle)", bg: "var(--t-surface2)", b: "var(--t-border)" },
};

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  const t = TONE[tone] ?? TONE.slate;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ color: t.c, background: t.bg, border: `1px solid ${t.b}` }}>{children}</span>
  );
}

export function ItemRow({ item, group, onJoin, joining, compact }: {
  item: SupplierTestingItem; group?: SupplierTestingGroup; onJoin: (i: SupplierTestingItem) => void; joining: boolean; compact?: boolean;
}) {
  const s = STATE_COPY[item.state];
  return (
    <li className="rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3"
      style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm" style={{ color: "var(--t-text)" }}>{item.productName}</span>
          <Pill tone={s.tone}>{s.label}</Pill>
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--t-subtle)" }}>
          {item.supplierName}{!compact && <> · Order <span className="font-mono">{item.orderCode}</span></>} · Qty {item.quantity}
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--t-muted)" }}>{s.detail}</p>
        {item.assignmentNote && (
          <p className="text-xs mt-1 italic" style={{ color: "var(--t-subtle)" }}>Staff note: {item.assignmentNote}</p>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {canJoin(item) ? (
          <button type="button" onClick={() => onJoin(item)} disabled={joining}
            aria-label={`Register testing interest for ${item.productName} on order ${item.orderCode}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6BCC]/40"
            style={{ background: "#1B3A7A" }}>
            {joining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
            Register interest
          </button>
        ) : item.state === "assigned" && group ? (
          <Link href={`/pool/${group.slug}`} className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl"
            style={{ color: "var(--t-blue)", background: "var(--t-blue-08)", border: "1px solid var(--t-blue-18)" }}>
            Batch {group.batchNumber} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        ) : item.state === "awaiting_batch" ? (
          <span className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--t-subtle)" }}><Clock className="w-3.5 h-3.5" /> Awaiting batch</span>
        ) : null}
      </div>
    </li>
  );
}

export function GroupCard({ g }: { g: SupplierTestingGroup }) {
  const p = pct(g.raisedUsd, g.targetAmountUsd);
  return (
    <article className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "var(--salt-card-shadow)" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-bold text-sm leading-snug" style={{ color: "var(--t-text)" }}>{g.title}</h4>
          <p className="text-xs mt-0.5" style={{ color: "var(--t-subtle)" }}>{g.supplierName} · {g.productName}</p>
        </div>
        {g.hasResults ? <Pill tone="green"><CheckCircle2 className="w-3 h-3" /> Results</Pill> : <Pill tone="slate">{g.status.replace(/_/g, " ")}</Pill>}
      </div>
      <span className="self-start inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md"
        style={{ background: "var(--t-surface2)", color: "var(--t-subtle)", border: "1px solid var(--t-border)" }}>
        <Hash className="w-3 h-3" />{g.batchNumber}
      </span>
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="font-bold tabular-nums" style={{ color: "var(--t-text)" }}>{usd(g.raisedUsd)} <span className="font-normal" style={{ color: "var(--t-subtle)" }}>raised</span></span>
          <span className="tabular-nums" style={{ color: "var(--t-subtle)" }}>of {usd(g.targetAmountUsd)}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--t-blue-10)" }}
          role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p)} aria-label={`${g.title} funding progress`}>
          <div className="h-full rounded-full" style={{ width: `${p}%`, background: "var(--t-blue)" }} />
        </div>
      </div>
      <div className="rounded-lg p-2.5" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--t-subtle)" }}>Your contributions</p>
        {g.contributions.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--t-muted)" }}>None yet. Contributing is optional and separate from registering interest.</p>
        ) : (
          <ul className="space-y-1">
            {g.contributions.map(c => (
              <li key={c.id} className="flex justify-between text-xs">
                <span className="tabular-nums font-semibold" style={{ color: "var(--t-text)" }}>{usd(c.amountUsd)}</span>
                <span className="capitalize" style={{ color: "var(--t-subtle)" }}>{c.paymentStatus}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Link href={`/pool/${g.slug}`} className="mt-auto inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl"
        style={{ color: "var(--t-blue)", border: "1px solid var(--t-blue-25)" }}>
        {g.hasResults ? "View authorised results" : "Open batch pool"} <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </article>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading supplier testing">
      {[0, 1, 2].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--t-surface2)" }} />)}
    </div>
  );
}

const selCls = "px-3 py-2 rounded-xl text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2D6BCC]/30";
const selStyle = { background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-text)" };

export function SupplierTesting({ orderId, compact }: { orderId?: string; compact?: boolean }) {
  const { account } = useAccount();
  const qc = useQueryClient();
  const [filters, setFilters] = useState<Filters>({ supplierId: "", productId: "", batch: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<SupplierTestingResponse>({
    queryKey: [...SUPPLIER_TESTING_KEY, account?.telegramUsername],
    enabled: !!account?.telegramUsername,
    queryFn: async () => {
      const r = await fetch("/api/account/supplier-testing", { credentials: "include" });
      if (!r.ok) throw new Error(await readError(r, "Could not load supplier testing"));
      return r.json();
    },
  });

  const join = useMutation({
    mutationFn: async (i: SupplierTestingItem) => {
      const r = await fetch("/api/account/supplier-testing/join", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: i.orderId, productId: i.productId }),
      });
      if (!r.ok) throw new Error(await readError(r, "Could not register interest"));
      return i;
    },
    onSuccess: (i) => {
      setMsg({ ok: true, text: `Interest registered for ${i.productName}. No payment was taken.` });
      qc.invalidateQueries({ queryKey: SUPPLIER_TESTING_KEY });
    },
    onError: (e: Error) => setMsg({ ok: false, text: e.message }),
  });

  const items = data?.items ?? [];
  const groups = data?.groups ?? [];
  const groupById = useMemo(() => new Map(groups.map(g => [g.id, g])), [groups]);
  const visibleItems = useMemo(() => filterItems(items, filters, orderId, compact), [items, filters, orderId, compact]);
  const suppliers = useMemo(() => [...new Map([...items, ...groups].map(x => [x.supplierId, x.supplierName])).entries()], [items, groups]);
  const products = useMemo(() => [...new Map([...items, ...groups]
    .filter(x => !filters.supplierId || x.supplierId === filters.supplierId).map(x => [x.productId, x.productName])).entries()], [items, groups, filters.supplierId]);
  const visibleGroups = useMemo(() => {
    if (compact) {
      const ids = new Set(visibleItems.filter(i => i.state === "assigned" && i.groupId).map(i => i.groupId));
      return groups.filter(g => ids.has(g.id));
    }
    return filterGroups(groups, filters);
  }, [compact, groups, filters, visibleItems]);

  const joiningKey = join.isPending && join.variables ? `${join.variables.orderId}:${join.variables.productId}` : null;

  if (isLoading) return <Skeleton />;
  if (isError) return (
    <div role="alert" className="rounded-xl p-4 flex items-center justify-between gap-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)" }}>
      <p className="text-sm" style={{ color: "#b91c1c" }}>Supplier testing could not be loaded.</p>
      <button type="button" onClick={() => refetch()} className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: "#b91c1c", border: "1px solid rgba(239,68,68,0.3)" }}>
        <RotateCcw className="w-3.5 h-3.5" /> Retry
      </button>
    </div>
  );

  if (compact) {
    if (visibleItems.length === 0) return null;
    return (
      <section aria-label="Supplier batch testing" className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Supplier batch testing</p>
        {msg && <p role="status" className="text-xs" style={{ color: msg.ok ? "#15803d" : "#b91c1c" }}>{msg.text}</p>}
        <ul className="space-y-2">
          {visibleItems.map(i => (
            <ItemRow key={`${i.orderId}:${i.productId}`} item={i} compact group={i.groupId ? groupById.get(i.groupId) : undefined}
              onJoin={join.mutate} joining={joiningKey === `${i.orderId}:${i.productId}`} />
          ))}
        </ul>
        {visibleGroups.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {visibleGroups.map(g => (
              <Link key={g.id} href={`/pool/${g.slug}`} className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: "var(--t-blue)" }}>
                {g.title} <ArrowRight className="w-3 h-3" />
              </Link>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section aria-labelledby="st-title" className="space-y-6">
      <header className="rounded-2xl p-5 sm:p-6 text-white" style={{ background: "linear-gradient(135deg, #2D6BCC 0%, #1B3A7A 100%)" }}>
        <div className="flex items-center gap-2.5">
          <FlaskConical className="w-5 h-5 opacity-80" />
          <h2 id="st-title" className="text-xl font-bold">Supplier batch testing</h2>
        </div>
        <p className="text-sm mt-2 max-w-2xl" style={{ color: "rgba(255,255,255,0.8)" }}>
          Test the exact batch you bought, privately, alongside other members who bought from the same supplier.
        </p>
        <ol className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {[
            ["1  Register interest", "Free. Unpaid orders can join too."],
            ["2  Staff confirm batch", "Your interest is linked to the real batch."],
            ["3  Contribute and see results", "Optional, separate, on the batch pool page."],
          ].map(([t, d]) => (
            <li key={t} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)" }}>
              <p className="font-bold" style={{ color: "#E9A020" }}>{t}</p>
              <p className="mt-0.5" style={{ color: "rgba(255,255,255,0.75)" }}>{d}</p>
            </li>
          ))}
        </ol>
      </header>

      <div className="flex flex-col sm:flex-row gap-2" role="group" aria-label="Filters">
        <label className="sr-only" htmlFor="st-sup">Supplier</label>
        <select id="st-sup" className={selCls} style={selStyle} value={filters.supplierId}
          onChange={e => setFilters(f => ({ ...f, supplierId: e.target.value, productId: "" }))}>
          <option value="">All suppliers</option>
          {suppliers.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </select>
        <label className="sr-only" htmlFor="st-prod">Product</label>
        <select id="st-prod" className={selCls} style={selStyle} value={filters.productId}
          onChange={e => setFilters(f => ({ ...f, productId: e.target.value }))}>
          <option value="">All products</option>
          {products.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </select>
        <label className="sr-only" htmlFor="st-batch">Batch number</label>
        <input id="st-batch" className={selCls + " sm:w-44"} style={selStyle} placeholder="Batch number" value={filters.batch}
          onChange={e => setFilters(f => ({ ...f, batch: e.target.value }))} />
      </div>

      {msg && (
        <p role="status" className="text-sm rounded-xl px-3 py-2" style={msg.ok
          ? { color: "#15803d", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }
          : { color: "#b91c1c", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)" }}>{msg.text}</p>
      )}

      <div>
        <h3 className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--t-subtle)" }}>Your order items</h3>
        {visibleItems.length === 0 ? (
          <div className="rounded-xl p-6 text-center" style={{ border: "1px dashed var(--t-border)" }}>
            <FlaskConical className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--t-subtle)", opacity: 0.6 }} />
            <p className="text-sm" style={{ color: "var(--t-muted)" }}>
              {items.length ? "No items match these filters." : "No order items are eligible for supplier testing yet."}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {visibleItems.map(i => (
              <ItemRow key={`${i.orderId}:${i.productId}`} item={i} group={i.groupId ? groupById.get(i.groupId) : undefined}
                onJoin={join.mutate} joining={joiningKey === `${i.orderId}:${i.productId}`} />
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--t-subtle)" }}>Batch groups</h3>
        <p className="flex items-start gap-1.5 text-xs mb-3" style={{ color: "var(--t-muted)" }}>
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          Registering interest never charges you. Contributions are made on each batch pool page and are tracked separately below.
        </p>
        {visibleGroups.length === 0 ? (
          <p className="text-sm rounded-xl p-4" style={{ color: "var(--t-subtle)", border: "1px dashed var(--t-border)" }}>No confirmed batch groups yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{visibleGroups.map(g => <GroupCard key={g.id} g={g} />)}</div>
        )}
      </div>
    </section>
  );
}

export default SupplierTesting;
