import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Plus, Users, Copy, Pencil, Check, X } from "lucide-react";
import { get, patch, post, poolAccess, setCsrfToken } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Member, Pool, PoolView } from "@/lib/types";
import { usd, date } from "@/lib/format";
import { Alert, Badge, Button, Card, Empty, Field, Input, Select, Tabs, Textarea, useToast } from "@/components/ui";
import { Page } from "@/components/Layout";
import { PoolCard } from "@/components/PoolCard";

type PoolResponse = { pools: Pool[] };
type MineResponse = { pools: Pool[] };
type Contribution = { member: Member; pool: Pool };
type ContributionsResponse = { contributions: Contribution[] };
const CORE_NOTICE = "Core release: joining registers interest only. No money is taken. All prices shown are estimates; payments, uploads and results are not available.";
const apiPath = (path: string) => `/api/tmd${path}`;
const poolQuery = (id: string) => ["pool-view", id];

function Notice({ children = CORE_NOTICE }: { children?: React.ReactNode }) {
  return <Alert tone="info">{children}</Alert>;
}

function LoadState({ error, retry }: { error: unknown; retry: () => void }) {
  if (error) return <Card className="space-y-3"><p className="font-semibold">We could not load this right now.</p><p className="text-sm text-muted">{error instanceof Error ? error.message : "Please try again."}</p><Button tone="outline" onClick={retry}>Try again</Button></Card>;
  return <div className="space-y-4" aria-label="Loading"><div className="h-28 animate-pulse rounded-2xl bg-surface-2" /><div className="h-40 animate-pulse rounded-2xl bg-surface-2" /></div>;
}

export function Landing() {
  const { user } = useAuth();
  const pools = useQuery({ queryKey: ["pools", "landing"], queryFn: () => get<PoolResponse>(apiPath("/pools?status=open")), refetchOnMount: "always" });
  return <div className="fade-in space-y-12">
    <section className="lab-hero overflow-hidden rounded-[2rem] bg-[#1c2524] text-[#f8f7f0]">
      <div className="grid gap-10 p-8 sm:p-12 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        <div className="space-y-6">
          <p className="text-[11px] font-medium uppercase tracking-[.18em] text-[#b7cdc2]">Independent batch testing groups</p>
          <h1 className="max-w-xl text-4xl font-medium leading-[1.06] tracking-[-.04em] sm:text-6xl">Test the batch,<br />not the label.</h1>
          <p className="max-w-lg text-[15px] leading-relaxed text-[#d0d7d3]">Bring a community together to plan independent lab testing. Host a pool, share the details, and register interest without collecting payments.</p>
          <div className="flex flex-wrap gap-3"><Link href={user ? "/host/new" : "/signup"}><Button className="bg-[#ebeadc] text-[#1c2524] hover:bg-white">{user ? "Host a pool" : "Create an account"} <ArrowRight className="size-4" /></Button></Link><Link href="/explore"><Button tone="outline" className="border-white/25 bg-transparent text-white hover:border-white hover:text-white">Browse pools</Button></Link></div>
        </div>
        <div className="card-2 grid grid-cols-2 gap-px overflow-hidden bg-white/10 text-[#f8f7f0]">
          {[["01", "Describe the batch"], ["02", "Choose tests"], ["03", "Set an estimate"], ["04", "Invite members"]].map(([n, text]) => <div className="bg-[#29342e] p-5 sm:p-7" key={n}><span className="mono text-xs text-[#a9c5b4]">{n}</span><p className="mt-5 text-sm font-medium">{text}</p></div>)}
        </div>
      </div>
    </section>
    <Notice />
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Open to join</p><h2 className="display mt-1 text-3xl">Pools in progress</h2></div><Link href="/explore" className="text-sm font-medium text-brand">Browse all pools</Link></div>
      {pools.isPending ? <LoadState error={null} retry={() => pools.refetch()} /> : pools.error ? <LoadState error={pools.error} retry={() => pools.refetch()} /> : pools.data?.pools.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{pools.data.pools.slice(0, 6).map(pool => <PoolCard key={pool.id} pool={pool} />)}</div> : <Empty title="No open pools yet">When a host opens a pool, it will appear here.</Empty>}
    </section>
    <section className="card-2 grid gap-4 p-7 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="eyebrow">Core release</p><h2 className="mt-1 text-xl font-semibold">Interest registration, not checkout.</h2><p className="mt-2 max-w-2xl text-sm text-muted">Pool shares are planning estimates only. Members do not pay through Testmedaddy and organisers do not receive funds here.</p></div><Link href="/how-it-works"><Button tone="outline">How it works</Button></Link></section>
  </div>;
}

export function HowItWorks() {
  return <Page title="How it works" subtitle="A simple place to coordinate interest in independent batch testing.">
    <Notice />
    <ol className="grid gap-4 md:grid-cols-2">
      {[["01", "Set up the pool", "Describe a peptide batch, choose the tests and record an estimated lab cost."], ["02", "Choose visibility", "Public pools appear in browse. Unlisted pools are shared by link. Invite-only pools require an access code."], ["03", "Register interest", "Members join with an account. Joining records interest only; no payment is made or requested."], ["04", "Coordinate next steps", "The pool page shows members and estimates. Payments, proof uploads, lab results and publishing are outside this core release."]].map(([n, title, body]) => <Card key={n}><span className="mono text-brand">{n}</span><h2 className="mt-3 text-xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-relaxed text-muted">{body}</p></Card>)}
    </ol>
  </Page>;
}

export function Unavailable() {
  return <Page title="Not in the core release" subtitle="This part of Testmedaddy is not available yet.">
    <Card className="max-w-2xl space-y-4"><Notice /><p className="text-sm text-muted">Payments, password recovery, vendor pages, proof uploads, result publishing, discussions, notifications and Telegram features are not implemented in this release.</p><div className="flex flex-wrap gap-2"><Link href="/explore"><Button>Browse pools</Button></Link><Link href="/"><Button tone="outline">Return home</Button></Link></div></Card>
  </Page>;
}

export function Explore() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("open");
  const key = ["pools", "explore", query, status];
  const pools = useQuery({ queryKey: key, queryFn: () => get<PoolResponse>(apiPath(`/pools?q=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}`)), refetchOnMount: "always" });
  return <Page title="Browse pools" subtitle="Public pools available to join. Unlisted pools are shared by link; invite-only pools need an access code.">
    <Notice />
    <div className="flex flex-col gap-3 sm:flex-row"><Input aria-label="Search pools" placeholder="Search pools, labs or tests" value={query} onChange={e => setQuery(e.target.value)} /><Select aria-label="Pool status" value={status} onChange={e => setStatus(e.target.value)}><option value="open">Open</option><option value="closed">Closed</option><option value="">All public pools</option></Select></div>
    {pools.isPending ? <LoadState error={null} retry={() => pools.refetch()} /> : pools.error ? <LoadState error={pools.error} retry={() => pools.refetch()} /> : pools.data?.pools.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{pools.data.pools.map(pool => <PoolCard key={pool.id} pool={pool} />)}</div> : <Empty title="Nothing matches those filters">Try a different search, or check back later.</Empty>}
  </Page>;
}

function PoolMetrics({ view }: { view: PoolView }) {
  const { pool } = view;
  return <div className="grid gap-3 sm:grid-cols-3">
    <Card className="p-4"><p className="text-xs text-muted">Estimated share</p><p className="mono mt-1 text-xl font-semibold">{usd(pool.shareUsd)}</p></Card>
    <Card className="p-4"><p className="text-xs text-muted">Registered interest</p><p className="mt-1 text-xl font-semibold">{pool.totals.memberCount}{pool.maxMembers ? ` / ${pool.maxMembers}` : ""}</p></Card>
    <Card className="p-4"><p className="text-xs text-muted">Minimum group</p><p className="mt-1 text-xl font-semibold">{pool.minMembers} members</p></Card>
  </div>;
}

export function PoolDetail({ slug, manageId }: { slug?: string; manageId?: string }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const client = useQueryClient();
  const [code, setCode] = useState(poolAccess.code(slug ?? ""));
  const [showCode, setShowCode] = useState(false);
  const id = manageId ?? slug ?? "";
  const key = [...poolQuery(id), user?.id ?? "guest"];
  const view = useQuery({ queryKey: key, queryFn: () => get<PoolView>(apiPath(manageId ? `/pools/manage/${manageId}` : `/pools/${slug}`), manageId ? undefined : { headers: poolAccess.params(slug ?? "").headers }), refetchOnMount: "always", refetchInterval: 15000, retry: false });
  const refresh = () => client.invalidateQueries({ queryKey: key });
  const join = useMutation({
    mutationFn: () => post<Member>(apiPath(`/pools/${slug}/join`), {}, { headers: code ? { "x-tmd-access-code": code } : {} }),
    onSuccess: () => { refresh(); client.invalidateQueries({ queryKey: ["me"] }); client.invalidateQueries({ queryKey: ["mine"] }); client.invalidateQueries({ queryKey: ["contributions"] }); },
  });
  const leave = useMutation({
    mutationFn: (memberId: string) => post<{ ok: boolean }>(apiPath(`/members/${memberId}/leave`), {}),
    onSuccess: () => { refresh(); client.invalidateQueries({ queryKey: ["me"] }); client.invalidateQueries({ queryKey: ["mine"] }); client.invalidateQueries({ queryKey: ["contributions"] }); },
  });
  const statusChange = useMutation({
    mutationFn: (status: string) => post<PoolView>(apiPath(`/pools/${view.data?.pool.id}/status`), { status }),
    onSuccess: data => { client.setQueryData(key, data); client.invalidateQueries({ queryKey: ["mine"] }); },
  });
  const copyUrl = async () => {
    const base = import.meta.env.BASE_URL || "/";
    const path = `${base.replace(/\/?$/, "/")}p/${view.data!.pool.slug}`;
    try { await navigator.clipboard.writeText(`${window.location.origin}${path}`); setShowCode(true); }
    catch { window.prompt("Copy this pool link:", `${window.location.origin}${path}`); }
  };
  if (view.isPending) return <LoadState error={null} retry={() => view.refetch()} />;
  if (view.error || !view.data) return <Page title="Pool unavailable"><Card className="space-y-3"><p className="text-sm text-muted">{view.error instanceof Error ? view.error.message : "This pool could not be found."}</p>{(view.error as any)?.status === 401 && !manageId && <form onSubmit={e => { e.preventDefault(); poolAccess.setCode(slug ?? "", code); refresh(); }} className="flex gap-2"><Input placeholder="Invite access code" value={code ?? ""} onChange={e => setCode(e.target.value)} /><Button type="submit">Unlock</Button></form>}<Link href="/explore" className="text-sm text-brand">Back to pools</Link></Card></Page>;
  const { pool, members, viewer } = view.data;
  const myMember = viewer.membership;
  const statusActions: Record<string, string[]> = { draft: ["open", "cancelled"], open: ["closed", "cancelled"], closed: ["open", "cancelled"], cancelled: [] };
  return <Page title={pool.title} subtitle={pool.description ?? "A community testing pool."} actions={<>
    {viewer.isOrganiser && pool.status !== "cancelled" && <Link href={`/host/${pool.id}/edit`}><Button tone="outline"><Pencil className="size-4" /> Edit</Button></Link>}
    {pool.status !== "draft" && <Button tone="outline" onClick={copyUrl}><Copy className="size-4" /> {showCode ? "Link copied" : "Copy link"}</Button>}
  </>}>
    <Notice />
    <div className="flex flex-wrap items-center gap-2"><Badge tone={pool.status === "open" ? "brand" : "muted"}>{pool.status}</Badge><Badge tone="muted">{pool.visibility === "invite" ? "Invite only" : pool.visibility}</Badge>{pool.deadlineAt && <span className="text-sm text-muted">Deadline {date(pool.deadlineAt)}</span>}</div>
    <PoolMetrics view={view.data} />
    <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
      <Card className="space-y-4">
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Testing plan</h2><span className="text-sm text-muted">{pool.labName || "Lab not specified"}</span></div>
        <div className="divide-y divide-line">{pool.items.map(item => <div key={item.id} className="flex flex-wrap justify-between gap-2 py-3"><div><p className="font-medium">{item.testType}</p><p className="text-xs text-muted">{item.lab || pool.labName || "Lab to be confirmed"} · quantity {item.quantity}</p></div><span className="mono text-sm">{usd(Number(item.priceUsd) * item.quantity)}</span></div>)}</div>
        <div className="flex justify-between border-t border-line pt-3 text-sm"><span>Estimated total including shipping and organiser tip</span><strong className="mono">{usd(pool.breakdown?.target ?? pool.progress.target)}</strong></div>
        <p className="text-xs text-muted">Planning estimate only. No money is collected, transferred or held.</p>
      </Card>
      <Card className="space-y-4">
        <div><p className="eyebrow">Organiser</p><p className="mt-1 font-semibold">{pool.organiser.displayName}</p><p className="text-sm text-muted">@{pool.organiser.handle}</p></div>
        <div className="border-t border-line pt-4"><h2 className="font-semibold">Members ({members.length})</h2>{members.length ? <ul className="mt-3 space-y-2">{members.map(m => <li key={m.id} className="flex items-center justify-between text-sm"><span>{m.displayName}</span>{m.id === myMember?.id && <Badge tone="ok">Joined</Badge>}</li>)}</ul> : <p className="mt-2 text-sm text-muted">No one has registered interest yet.</p>}</div>
      </Card>
    </div>
    {!viewer.isOrganiser && <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{myMember ? "Your interest is registered" : "Join this pool"}</p><p className="text-sm text-muted">{myMember ? "You can leave at any time. Joining does not reserve a paid place." : "Joining registers interest only. No payment is taken."}</p></div>{myMember ? <Button tone="outline" loading={leave.isPending} onClick={() => leave.mutate(myMember.id)}>Leave pool</Button> : user ? <Button disabled={pool.status !== "open" || (pool.maxMembers != null && members.length >= pool.maxMembers)} loading={join.isPending} onClick={() => join.mutate()}><Users className="size-4" /> Register interest</Button> : <Link href={`/login?next=${encodeURIComponent(`/p/${slug}`)}`}><Button>Sign in to join</Button></Link>}</Card>}
    {viewer.isOrganiser && <Card className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Pool management</h2><p className="text-sm text-muted">Publishing opens this pool to members. Closing prevents new joins.</p></div><div className="flex flex-wrap gap-2">{(statusActions[pool.status] ?? []).map(s => <Button key={s} tone={s === "cancelled" ? "danger" : "outline"} loading={statusChange.isPending} onClick={() => { if (s === "cancelled" && !window.confirm("Cancel this pool? This cannot be undone.")) return; statusChange.mutate(s); }}>{s === "open" ? "Publish / reopen" : s === "closed" ? "Close pool" : "Cancel pool"}</Button>)}</div></div>
      {!manageId ? <Link href={`/host/${pool.id}`} className="text-sm font-medium text-brand">Manage pool</Link> : pool.status !== "draft" && <Link href={`/p/${pool.slug}`} className="text-sm font-medium text-brand">View member page</Link>}
      {statusChange.error && <p className="text-sm text-danger">{(statusChange.error as Error).message}</p>}
    </Card>}
    {(join.error || leave.error) && <Alert tone="danger">{((join.error || leave.error) as Error).message}</Alert>}
  </Page>;
}

type ItemDraft = { testType: string; lab: string; priceUsd: string; quantity: string; labOrderUrl: string };
type Draft = {
  title: string; description: string; labName: string; visibility: "public" | "unlisted" | "invite"; accessCode: string; splitMode: "even" | "fixed"; fixedShareUsd: string;
  shippingUsd: string; organiserTipUsd: string; minMembers: string; maxMembers: string; deadlineAt: string; items: ItemDraft[];
};
const blankDraft = (): Draft => ({ title: "", description: "", labName: "", visibility: "public", accessCode: "", splitMode: "even", fixedShareUsd: "", shippingUsd: "0", organiserTipUsd: "0", minMembers: "1", maxMembers: "", deadlineAt: "", items: [{ testType: "", lab: "", priceUsd: "", quantity: "1", labOrderUrl: "" }] });
function draftFrom(view: PoolView): Draft {
  const p = view.pool;
  return { title: p.title, description: p.description ?? "", labName: p.labName ?? "", visibility: p.visibility === "invite" ? "invite" : p.visibility === "unlisted" ? "unlisted" : "public", accessCode: "", splitMode: p.splitMode === "fixed" ? "fixed" : "even", fixedShareUsd: p.fixedShareUsd ?? "", shippingUsd: p.shippingUsd, organiserTipUsd: p.organiserTipUsd, minMembers: String(p.minMembers), maxMembers: p.maxMembers == null ? "" : String(p.maxMembers), deadlineAt: p.deadlineAt ? new Date(p.deadlineAt).toISOString().slice(0, 16) : "", items: p.items.map(i => ({ testType: i.testType, lab: i.lab ?? "", priceUsd: i.priceUsd, quantity: String(i.quantity), labOrderUrl: i.labOrderUrl ?? "" })) };
}

export function PoolEditor({ id }: { id?: string }) {
  const client = useQueryClient();
  const [, navigate] = useLocation();
  const toast = useToast();
  const existing = useQuery({ queryKey: ["pool-edit", id], queryFn: () => get<PoolView>(apiPath(`/pools/manage/${id}`)), enabled: !!id, refetchOnMount: "always" });
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [initialized, setInitialized] = useState(false);
  if (existing.data && !initialized) { setDraft(draftFrom(existing.data)); setInitialized(true); }
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(d => ({ ...d, [key]: value }));
  const save = useMutation({
    mutationFn: (payload: any) => id ? patch<PoolView>(apiPath(`/pools/${id}`), payload) : post<PoolView>(apiPath("/pools"), payload),
    onSuccess: async result => {
      await Promise.all([client.invalidateQueries({ queryKey: ["mine"] }), client.invalidateQueries({ queryKey: ["pool"] }), client.invalidateQueries({ queryKey: ["contributions"] })]);
      toast(id ? "Pool changes saved." : "Pool created."); navigate(`/host/${result.pool.id}`);
    },
  });
  if (id && existing.isPending) return <LoadState error={null} retry={() => existing.refetch()} />;
  if (existing.error) return <LoadState error={existing.error} retry={() => existing.refetch()} />;
  if (existing.data?.pool.status === "cancelled") return <Page title="Pool is cancelled"><Notice /><Link href={`/host/${id}`}>Return to pool management</Link></Page>;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (draft.title.trim().length < 4 || !draft.items.length || draft.items.some(i => !i.testType.trim() || Number(i.priceUsd) <= 0 || Number(i.quantity) < 1)) return;
    const body = {
      title: draft.title.trim(), description: draft.description, labName: draft.labName || null, visibility: draft.visibility, ...(draft.accessCode ? { accessCode: draft.accessCode } : {}),
      splitMode: draft.splitMode, fixedShareUsd: draft.splitMode === "fixed" ? Number(draft.fixedShareUsd) : null,
      shippingUsd: Number(draft.shippingUsd), organiserTipUsd: Number(draft.organiserTipUsd), minMembers: Number(draft.minMembers), maxMembers: draft.maxMembers ? Number(draft.maxMembers) : null,
      deadlineAt: draft.deadlineAt ? new Date(draft.deadlineAt).toISOString() : null,
      items: draft.items.map(i => ({ testType: i.testType.trim(), lab: i.lab || undefined, priceUsd: Number(i.priceUsd), quantity: Number(i.quantity), labOrderUrl: i.labOrderUrl || null, batchId: null })),
    };
    save.mutate(body);
  };
  return <Page title={id ? "Edit pool" : "Host a pool"} subtitle="Set up the testing plan and the estimated share. You can publish when the details are ready.">
    <Notice />
    <form onSubmit={submit} className="space-y-5">
      <Card className="grid gap-4 sm:grid-cols-2">
        <Field label="Pool title"><Input value={draft.title} onChange={e => update("title", e.target.value)} minLength={4} maxLength={120} required placeholder="For example: Batch 24B identity and purity" /></Field>
        <Field label="Lab name" hint="Enter the lab directly; no vendor directory is used."><Input value={draft.labName} onChange={e => update("labName", e.target.value)} placeholder="Independent lab" /></Field>
        <Field label="Batch and testing details" className="sm:col-span-2"><Textarea value={draft.description} onChange={e => update("description", e.target.value)} rows={4} placeholder="Describe the peptide, batch and testing plan." /></Field>
        <Field label="Visibility"><Select value={draft.visibility} onChange={e => update("visibility", e.target.value as Draft["visibility"])}><option value="public">Public</option><option value="unlisted">Unlisted link</option><option value="invite">Invite only</option></Select></Field>
        {draft.visibility === "invite" && <Field label="Invite access code" hint={id ? "Leave blank to keep the current code." : "At least 4 characters."}><Input value={draft.accessCode} onChange={e => update("accessCode", e.target.value)} minLength={draft.accessCode ? 4 : undefined} /></Field>}
        <Field label="Split estimate"><Select value={draft.splitMode} onChange={e => update("splitMode", e.target.value as Draft["splitMode"])}><option value="even">Even split</option><option value="fixed">Fixed share per member</option></Select></Field>
        {draft.splitMode === "fixed" && <Field label="Fixed estimated share (USD)"><Input type="number" min="0.01" step="0.01" value={draft.fixedShareUsd} onChange={e => update("fixedShareUsd", e.target.value)} required /></Field>}
        <Field label="Estimated shipping (USD)"><Input type="number" min="0" step="0.01" value={draft.shippingUsd} onChange={e => update("shippingUsd", e.target.value)} required /></Field>
        <Field label="Organiser tip estimate (USD)"><Input type="number" min="0" step="0.01" value={draft.organiserTipUsd} onChange={e => update("organiserTipUsd", e.target.value)} required /></Field>
        <Field label="Minimum members"><Input type="number" min="1" step="1" value={draft.minMembers} onChange={e => update("minMembers", e.target.value)} required /></Field>
        <Field label="Maximum members" hint="Leave blank for no limit."><Input type="number" min="1" step="1" value={draft.maxMembers} onChange={e => update("maxMembers", e.target.value)} /></Field>
        <Field label="Join deadline" hint="Optional. Must be in the future when publishing."><Input type="datetime-local" value={draft.deadlineAt} onChange={e => update("deadlineAt", e.target.value)} /></Field>
      </Card>
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Tests and cost estimates</h2><p className="text-sm text-muted">Add each test and its estimated price.</p></div><Button type="button" tone="outline" size="sm" onClick={() => update("items", [...draft.items, { testType: "", lab: "", priceUsd: "", quantity: "1", labOrderUrl: "" }])}><Plus className="size-4" /> Add test</Button></div>
        {draft.items.map((item, idx) => <div key={idx} className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_.8fr_.6fr_auto]">
          <Field label="Test type"><Input value={item.testType} onChange={e => update("items", draft.items.map((it, n) => n === idx ? { ...it, testType: e.target.value } : it))} required placeholder="Purity (HPLC), identity..." /></Field>
          <Field label="Lab"><Input value={item.lab} onChange={e => update("items", draft.items.map((it, n) => n === idx ? { ...it, lab: e.target.value } : it))} /></Field>
          <Field label="Price estimate (USD)"><Input type="number" min="0.01" step="0.01" value={item.priceUsd} onChange={e => update("items", draft.items.map((it, n) => n === idx ? { ...it, priceUsd: e.target.value } : it))} required /></Field>
          <Field label="Qty"><Input type="number" min="1" step="1" value={item.quantity} onChange={e => update("items", draft.items.map((it, n) => n === idx ? { ...it, quantity: e.target.value } : it))} required /></Field>
          <Button type="button" tone="ghost" disabled={draft.items.length === 1} aria-label="Remove test" onClick={() => update("items", draft.items.filter((_, n) => n !== idx))}><X className="size-4" /></Button>
          <Field label="Lab order URL (optional)" className="sm:col-span-2 lg:col-span-3"><Input type="url" value={item.labOrderUrl} onChange={e => update("items", draft.items.map((it, n) => n === idx ? { ...it, labOrderUrl: e.target.value } : it))} placeholder="https://" /></Field>
        </div>)}
      </Card>
      {save.error && <Alert tone="danger">{(save.error as Error).message}</Alert>}
      <div className="flex flex-wrap justify-end gap-2"><Link href={id ? `/host/${id}` : "/dashboard"}><Button type="button" tone="outline">Cancel</Button></Link><Button type="submit" loading={save.isPending}><Check className="size-4" /> Save pool</Button></div>
    </form>
  </Page>;
}

export function Dashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"hosting" | "joined">("hosting");
  const mine = useQuery({ queryKey: ["mine", user?.id], queryFn: () => get<MineResponse>(apiPath("/me/pools")), refetchOnMount: "always", refetchInterval: 15000 });
  const joined = useQuery({ queryKey: ["contributions", user?.id], queryFn: () => get<ContributionsResponse>(apiPath("/me/contributions")), refetchOnMount: "always", refetchInterval: 15000 });
  return <Page title="Your dashboard" subtitle="Pools you host and pools where you have registered interest." actions={<Link href="/host/new"><Button><Plus className="size-4" /> Host a pool</Button></Link>}>
    <Notice />
    <Tabs value={tab} onChange={setTab} tabs={[{ value: "hosting", label: "Hosting", count: mine.data?.pools.length }, { value: "joined", label: "Joined", count: joined.data?.contributions.length }]} />
    {tab === "hosting" ? mine.isPending ? <LoadState error={null} retry={() => mine.refetch()} /> : mine.error ? <LoadState error={mine.error} retry={() => mine.refetch()} /> : mine.data?.pools.length ? <div className="grid gap-4 sm:grid-cols-2">{mine.data.pools.map(p => <PoolCard key={p.id} pool={p} href={`/host/${p.id}`} />)}</div> : <Empty title="You are not hosting a pool">Start a pool and invite your community to register interest.</Empty>
      : joined.isPending ? <LoadState error={null} retry={() => joined.refetch()} /> : joined.error ? <LoadState error={joined.error} retry={() => joined.refetch()} /> : joined.data?.contributions.length ? <div className="grid gap-4 sm:grid-cols-2">{joined.data.contributions.map(c => <PoolCard key={c.member.id} pool={c.pool} />)}</div> : <Empty title="You have not joined a pool">Browse open pools to find a testing plan.</Empty>}
  </Page>;
}

export function Settings() {
  const { user, refresh } = useAuth();
  const client = useQueryClient();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [notice, setNotice] = useState("");
  const profile = useMutation({ mutationFn: () => patch<{ user: typeof user }>(apiPath("/me"), { displayName, bio }), onSuccess: async () => { setNotice("Profile saved."); await refresh(); client.invalidateQueries({ queryKey: ["me"] }); } });
  const password = useMutation({ mutationFn: () => post<{ user: typeof user; csrfToken: string }>(apiPath("/auth/change-password"), { currentPassword, newPassword }), onSuccess: async result => { setCsrfToken(result.csrfToken); setCurrentPassword(""); setNewPassword(""); setNotice("Password changed."); await refresh(); } });
  return <Page title="Account settings" subtitle="Manage your profile and sign-in credentials.">
    <Notice />
    {notice && <Alert tone="ok">{notice}</Alert>}
    <Card className="max-w-2xl"><h2 className="text-lg font-semibold">Profile</h2><form className="mt-4 space-y-4" onSubmit={e => { e.preventDefault(); profile.mutate(); }}>
      <Field label="Email"><Input value={user?.email ?? ""} disabled /></Field>
      <Field label="Handle"><Input value={`@${user?.handle ?? ""}`} disabled /></Field>
      <Field label="Display name"><Input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={60} required /></Field>
      <Field label="Bio"><Textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={500} /></Field>
      {profile.error && <Alert tone="danger">{(profile.error as Error).message}</Alert>}<Button type="submit" loading={profile.isPending}>Save profile</Button>
    </form></Card>
    <Card className="max-w-2xl"><h2 className="text-lg font-semibold">Change password</h2><p className="mt-1 text-sm text-muted">Password recovery is not available in the core release. Keep your password somewhere safe.</p><form className="mt-4 space-y-4" onSubmit={e => { e.preventDefault(); password.mutate(); }}>
      <Field label="Current password"><Input type="password" autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required /></Field>
      <Field label="New password" hint="At least 10 characters."><Input type="password" autoComplete="new-password" minLength={10} value={newPassword} onChange={e => setNewPassword(e.target.value)} required /></Field>
      {password.error && <Alert tone="danger">{(password.error as Error).message}</Alert>}<Button type="submit" loading={password.isPending}>Update password</Button>
    </form></Card>
  </Page>;
}
