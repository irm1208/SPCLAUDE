import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search, RotateCcw, ChevronLeft, ChevronRight, Filter } from "lucide-react";

interface ActivityRow {
  id: string;
  telegramUsername: string;
  eventCategory: string;
  eventType: string;
  entityId: string | null;
  actorUsername: string | null;
  actorType: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface Facets {
  categories: string[];
  eventTypes: string[];
  actorTypes: string[];
}

function apiUrl(p: string) { return `/api${p}`; }

const PAGE_SIZE = 100;

export function AdminAuditLog({ secret }: { secret: string }) {
  const [items, setItems] = useState<ActivityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<Facets>({ categories: [], eventTypes: [], actorTypes: [] });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [eventType, setEventType] = useState("");
  const [actorType, setActorType] = useState("");
  const [username, setUsername] = useState("");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (category) p.set("category", category);
    if (eventType) p.set("eventType", eventType);
    if (actorType) p.set("actorType", actorType);
    if (username.trim()) p.set("username", username.trim());
    if (since) p.set("since", new Date(since).toISOString());
    if (until) p.set("until", new Date(until).toISOString());
    p.set("limit", String(PAGE_SIZE));
    p.set("offset", String(page * PAGE_SIZE));
    return p.toString();
  }, [q, category, eventType, actorType, username, since, until, page]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/admin/audit-feed?${params}`), { headers: { "x-admin-secret": secret } });
      if (res.ok) {
        const d = await res.json();
        setItems(d.items as ActivityRow[]);
        setTotal(d.total as number);
        setFacets(d.facets as Facets);
      }
    } finally { setLoading(false); }
  }, [secret, params]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 0 when filters change
  useEffect(() => { setPage(0); }, [q, category, eventType, actorType, username, since, until]);

  const clearFilters = () => {
    setQ(""); setCategory(""); setEventType(""); setActorType(""); setUsername(""); setSince(""); setUntil("");
  };

  const applyQuickFilter = (cat: string) => {
    setCategory(prev => prev === cat ? "" : cat);
    setEventType(""); setActorType(""); setQ(""); setPage(0);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Audit log</h2>
          <p className="text-xs text-muted-foreground">Searchable activity feed across customers, organisers and admin actions.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={clearFilters} className="h-8 px-3 rounded-lg text-xs font-bold bg-muted text-foreground flex items-center gap-1.5">
            <Filter className="w-3 h-3" />Clear filters
          </button>
          <button onClick={load} disabled={loading} className="h-8 px-3 rounded-lg text-xs font-bold bg-orange-500 text-white disabled:opacity-50 flex items-center gap-1.5">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[
          { label: "All", cat: "" },
          { label: "Payments", cat: "payment" },
          { label: "Orders", cat: "order" },
          { label: "Account", cat: "account" },
          { label: "Group Buy", cat: "group_buy" },
        ].map(({ label, cat }) => (
          <button
            key={cat}
            onClick={() => applyQuickFilter(cat)}
            className={`h-7 px-3 rounded-full text-xs font-semibold border transition-colors ${
              category === cat
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-background text-muted-foreground border-border hover:border-orange-400 hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="relative md:col-span-2 lg:col-span-2">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search username, event type, entity ID…"
            className="w-full h-9 pl-8 pr-3 rounded-lg border border-border bg-background text-xs"
          />
        </div>
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Exact telegram username" className="h-9 px-3 rounded-lg border border-border bg-background text-xs" />
        <select value={category} onChange={e => setCategory(e.target.value)} className="h-9 px-2 rounded-lg border border-border bg-background text-xs">
          <option value="">All categories</option>
          {facets.categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={eventType} onChange={e => setEventType(e.target.value)} className="h-9 px-2 rounded-lg border border-border bg-background text-xs">
          <option value="">All event types</option>
          {facets.eventTypes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={actorType} onChange={e => setActorType(e.target.value)} className="h-9 px-2 rounded-lg border border-border bg-background text-xs">
          <option value="">All actor types</option>
          {facets.actorTypes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="datetime-local" value={since} onChange={e => setSince(e.target.value)} className="h-9 px-2 rounded-lg border border-border bg-background text-xs" placeholder="Since" />
        <input type="datetime-local" value={until} onChange={e => setUntil(e.target.value)} className="h-9 px-2 rounded-lg border border-border bg-background text-xs" placeholder="Until" />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-bold">When</th>
                <th className="px-3 py-2 text-left font-bold">Username</th>
                <th className="px-3 py-2 text-left font-bold">Category</th>
                <th className="px-3 py-2 text-left font-bold">Event</th>
                <th className="px-3 py-2 text-left font-bold">Actor</th>
                <th className="px-3 py-2 text-left font-bold">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.length === 0 && !loading && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No matching log entries.</td></tr>
              )}
              {items.map(row => (
                <Fragment key={row.id}>
                  <tr onClick={() => setExpandedId(id => id === row.id ? null : row.id)} className="cursor-pointer hover:bg-muted/40">
                    <td className="px-3 py-1.5 text-foreground whitespace-nowrap">{new Date(row.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</td>
                    <td className="px-3 py-1.5 font-bold text-foreground">{row.telegramUsername}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{row.eventCategory}</td>
                    <td className="px-3 py-1.5 font-mono text-foreground">{row.eventType}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {row.actorUsername ?? "—"}
                      <span className="text-[9px] uppercase ml-1 px-1 py-0.5 rounded bg-slate-100 text-slate-600">{row.actorType}</span>
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground font-mono">{row.entityId ?? "—"}</td>
                  </tr>
                  {expandedId === row.id && row.metadata && (
                    <tr>
                      <td colSpan={6} className="px-3 py-2 bg-muted/30">
                        <pre className="text-[10px] font-mono whitespace-pre-wrap break-words text-foreground">{JSON.stringify(row.metadata, null, 2)}</pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{total.toLocaleString()} total · page {page + 1} of {totalPages}</span>
        <div className="flex gap-1">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="h-8 px-2 rounded-lg border border-border disabled:opacity-30 flex items-center gap-1">
            <ChevronLeft className="w-3 h-3" />Prev
          </button>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="h-8 px-2 rounded-lg border border-border disabled:opacity-30 flex items-center gap-1">
            Next<ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminAuditLog;
