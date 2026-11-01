import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Pencil, Trash2, Upload, Megaphone, Check, X as XIcon, RotateCcw, Image as ImageIcon, Send } from "lucide-react";
import { get, post, put, patch, del, upload, fileUrl } from "@/lib/api";
import type { PoolView, Member, ResultRow } from "@/lib/types";
import { usd, POOL_STATUS, PAYMENT_STATUS, ago, networkLabel, coin, isStable } from "@/lib/format";
import { Page } from "@/components/Layout";
import { Button, Card, Badge, Progress, Spinner, Alert, Field, Input, Textarea, Select, Toggle, Modal, CopyButton, Tabs, Empty, useToast } from "@/components/ui";
import { PhotoGrid, PhotoUploader } from "@/components/Photos";
import { FundingDonut } from "@/components/Donut";

const NEXT: Record<string, { to: string; label: string; tone?: "primary" | "subtle" | "danger" }[]> = {
  draft: [{ to: "open", label: "Open the pool" }],
  open: [{ to: "funded", label: "Mark as funded", tone: "subtle" }],
  funded: [{ to: "at_lab", label: "Samples sent to the lab" }, { to: "open", label: "Reopen for members", tone: "subtle" }],
  at_lab: [{ to: "results", label: "Publish results" }],
  results: [{ to: "closed", label: "Close the pool", tone: "subtle" }],
  closed: [], cancelled: [],
};
type Tab = "members" | "results" | "photos" | "announce" | "telegram";

export default function ManagePool({ id }: { id: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [, navigate] = useLocation();
  const view = useQuery({ queryKey: ["manage", id], queryFn: () => get<PoolView>(`/api/tmd/pools/manage/${id}`), retry: false });
  const [tab, setTab] = useState<Tab>("members");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["manage", id] });
  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => { setBusy(key); try { await fn(); if (ok) toast(ok, "ok"); refresh(); } catch (e: any) { toast(e.message, "danger"); } finally { setBusy(null); } };

  if (view.isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (view.isError || !view.data) return <Alert tone="danger">Could not load this pool. It may belong to another organiser.</Alert>;
  const { pool, members, photos, results } = view.data;
  const status = POOL_STATUS[pool.status];
  const link = `${window.location.origin}/p/${pool.slug}`;
  const submitted = members.filter(m => m.paymentStatus === "submitted");

  const setStatus = (to: string) => run(`status:${to}`, () => post(`/api/tmd/pools/${pool.id}/status`, { status: to }), `Pool is now ${POOL_STATUS[to]?.label.toLowerCase()}`);

  return (
    <Page title={pool.title} subtitle={<span className="flex flex-wrap items-center gap-2"><Badge tone={status.tone}>{status.label}</Badge><span>{pool.visibility === "invite" ? "Invite-only" : pool.visibility === "unlisted" ? "Unlisted" : "Public"} · results {pool.resultsVisibility}</span></span>}
      actions={<><Link href={`/p/${pool.slug}`}><Button tone="outline"><ExternalLink className="size-4" /> View as member</Button></Link><Link href={`/host/${pool.id}/edit`}><Button tone="subtle"><Pencil className="size-4" /> Edit</Button></Link></>}>

      {pool.status === "draft" && <Alert tone="info">This is a draft. Only you can see it. Check the tests, the payout methods and the share, then open it.</Alert>}
      {submitted.length > 0 && <Alert tone="warn">{submitted.length} payment{submitted.length === 1 ? " is" : "s are"} waiting for your confirmation. Crypto and AnonPay are checked automatically every few minutes; screenshots need you.</Alert>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <FundingDonut verified={pool.progress.verified} submitted={pool.totals.submittedUsd} target={pool.progress.target} size={150} label={pool.progress.funded ? "funded" : "received"} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
              <Stat label="Members" value={`${pool.totals.memberCount}${pool.maxMembers ? ` / ${pool.maxMembers}` : ""}`} hint={`${pool.totals.verifiedMemberCount} paid`} />
              <Stat label="Share per member" value={usd(pool.shareUsd)} hint={pool.splitMode === "even" ? `target ÷ ${pool.minMembers}` : "fixed"} />
              <Stat label="Received" value={usd(pool.progress.verified, 0)} hint={`of ${usd(pool.progress.target, 0)}`} tone="brand" />
              <Stat label="Still needed" value={usd(Math.max(0, pool.progress.remaining), 0)} hint={pool.totals.submittedUsd > 0 ? `${usd(pool.totals.submittedUsd, 0)} awaiting` : "no payments pending"} />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            {NEXT[pool.status]?.map(n => <Button key={n.to} tone={n.tone ?? "primary"} loading={busy === `status:${n.to}`} onClick={() => { if (n.to === "results") { setTab("results"); setConfirm("results"); } else setStatus(n.to); }}>{n.label}</Button>)}
            {!["closed", "cancelled"].includes(pool.status) && <Button tone="danger" onClick={() => setConfirm("cancel")}>Cancel pool</Button>}
            {pool.status === "draft" && <Button tone="ghost" onClick={() => setConfirm("delete")}><Trash2 className="size-4" /> Delete draft</Button>}
          </div>
        </Card>
        <Card>
          <p className="label">Share link</p>
          <div className="mono break-all rounded-lg bg-surface-2 px-3 py-2 text-xs">{link}</div>
          <div className="mt-2 flex gap-2"><CopyButton text={link} label="Copy link" />{pool.visibility === "invite" && <span className="self-center text-xs text-muted">Send the access code separately.</span>}</div>
          <p className="mt-3 text-xs text-dim">Members can join as guests with an email or Telegram handle; they do not need an account.</p>
        </Card>
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[{ value: "members", label: "Members", count: members.length }, { value: "results", label: "Results", count: results?.items.length }, { value: "photos", label: "Photos", count: photos.length }, { value: "announce", label: "Announce" }, { value: "telegram", label: <span className="flex items-center gap-1.5"><Send className="size-3.5" />Telegram</span> }]} />

      {tab === "members" && (members.length ? (
        <div className="card divide-y divide-line">
          {members.map(m => <MemberRow key={m.id} m={m} poolId={pool.id} busy={busy} run={run} />)}
        </div>
      ) : <Empty title="Nobody has joined yet">Share the link. You will be notified when someone joins.</Empty>)}

      {tab === "results" && <ResultsEditor view={view.data} onSaved={refresh} />}

      {tab === "photos" && (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Chain of custody</h3><p className="text-sm text-muted">Show members the vials, the packing and the lab intake. Photos are public to anyone who can view the pool.</p></div>
            <PhotoUploader path={`/api/tmd/pools/${pool.id}/photos`} onDone={refresh} /></div>
          {photos.length ? <PhotoGrid photos={photos} onRemove={p => run(`photo:${p.id}`, () => del(`/api/tmd/photos/${p.id}`), "Photo removed")} /> : <Empty title="No photos yet" icon={<ImageIcon className="size-5" />} />}
          <div className="mt-4 flex items-center gap-3 border-t border-line pt-4 text-sm">
            <span className="text-muted">Cover image:</span>
            {pool.coverPhotoKey && <img src={fileUrl(pool.coverPhotoKey)} alt="" className="h-10 w-16 rounded object-cover" />}
            <label className="cursor-pointer text-brand hover:underline"><input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) run("cover", () => upload(`/api/tmd/pools/${pool.id}/cover`, f), "Cover updated"); }} />{pool.coverPhotoKey ? "Replace" : "Upload"}</label>
          </div>
        </Card>
      )}

      {tab === "announce" && <Announce slug={pool.slug} />}
      {tab === "telegram" && <TelegramTab poolId={pool.id} onChange={refresh} />}

      <Modal open={confirm === "cancel"} onClose={() => setConfirm(null)} title="Cancel this pool?">
        <p className="text-sm text-muted">Members are told the pool is cancelled. Refund anyone who has paid, then mark them refunded in the members list. This cannot be undone.</p>
        <div className="mt-4 flex justify-end gap-2"><Button tone="ghost" onClick={() => setConfirm(null)}>Keep it</Button><Button tone="danger" loading={busy === "status:cancelled"} onClick={async () => { await setStatus("cancelled"); setConfirm(null); }}>Cancel the pool</Button></div>
      </Modal>
      <Modal open={confirm === "delete"} onClose={() => setConfirm(null)} title="Delete this draft?">
        <p className="text-sm text-muted">The draft and its photos are removed for good.</p>
        <div className="mt-4 flex justify-end gap-2"><Button tone="ghost" onClick={() => setConfirm(null)}>Keep it</Button><Button tone="danger" loading={busy === "delete"} onClick={() => run("delete", async () => { await del(`/api/tmd/pools/${pool.id}`); navigate("/dashboard"); })}>Delete</Button></div>
      </Modal>
      <Modal open={confirm === "results"} onClose={() => setConfirm(null)} title="Publish the results?">
        <p className="text-sm text-muted">Fill in the results below first. Publishing marks the pool as "Results in", notifies every member and, if results are public, shows them on the vendor's page.</p>
        <div className="mt-4 flex justify-end gap-2"><Button tone="ghost" onClick={() => setConfirm(null)}>Not yet</Button><Button loading={busy === "status:results"} onClick={async () => { await setStatus("results"); setConfirm(null); }}>Publish now</Button></div>
      </Modal>
    </Page>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "brand" }) {
  return <div className="rounded-xl bg-surface-2 px-3.5 py-3"><p className="text-xs text-muted">{label}</p><p className={`mono mt-0.5 text-lg font-semibold ${tone === "brand" ? "text-brand" : "text-fg"}`}>{value}</p>{hint && <p className="text-[11px] text-dim">{hint}</p>}</div>;
}

function MemberRow({ m, poolId, busy, run }: { m: Member; poolId: string; busy: string | null; run: (key: string, fn: () => Promise<unknown>, ok?: string) => Promise<void> }) {
  const p = PAYMENT_STATUS[m.paymentStatus];
  const act = (paymentStatus: string, label: string) => run(`m:${m.id}:${paymentStatus}`, () => patch(`/api/tmd/pools/${poolId}/members/${m.id}`, { paymentStatus }), label);
  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{m.displayName}</span>{m.anonymous && <Badge>Anonymous publicly</Badge>}{!m.userId && <Badge>Guest</Badge>}<Badge tone={p.tone}>{p.label}</Badge></div>
        <p className="mono mt-0.5 text-xs text-muted">{usd(m.amountUsd)} · joined {ago(m.joinedAt)}{m.guestContact ? ` · ${m.guestContact}` : ""}</p>
        {m.paymentMethod && <p className="mono mt-1 break-all text-xs text-muted">{m.paymentMethod}{m.paymentNetwork ? ` · ${m.paymentCurrency} on ${networkLabel(m.paymentNetwork)}` : ""}{m.paymentAmountCrypto && m.paymentCurrency && !isStable(m.paymentCurrency) ? ` · expected ${coin(m.paymentAmountCrypto, m.paymentCurrency)} @ $${Number(m.paymentUsdPerCoin).toLocaleString()}` : ""}{m.paymentRef ? ` · ${m.paymentRef}` : ""}</p>}
        {m.note && <p className="mt-1 text-xs text-muted">“{m.note}”</p>}
        {m.screenshotKey && <a className="mt-1 inline-flex items-center gap-1 text-xs text-brand hover:underline" href={fileUrl(m.screenshotKey)} target="_blank" rel="noreferrer">View screenshot <ExternalLink className="size-3" /></a>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {m.paymentStatus !== "verified" && <Button size="sm" loading={busy === `m:${m.id}:verified`} onClick={() => act("verified", "Payment confirmed")}><Check className="size-3.5" /> Confirm</Button>}
        {m.paymentStatus === "submitted" && <Button size="sm" tone="danger" loading={busy === `m:${m.id}:rejected`} onClick={() => act("rejected", "Payment rejected")}><XIcon className="size-3.5" /> Reject</Button>}
        {m.paymentStatus === "verified" && <Button size="sm" tone="subtle" loading={busy === `m:${m.id}:refunded`} onClick={() => act("refunded", "Marked refunded")}><RotateCcw className="size-3.5" /> Refunded</Button>}
        {["rejected", "refunded"].includes(m.paymentStatus) && <Button size="sm" tone="ghost" onClick={() => act("pending", "Reset to unpaid")}>Reset</Button>}
        {m.paymentStatus !== "verified" && <Button size="sm" tone="ghost" loading={busy === `rm:${m.id}`} onClick={() => run(`rm:${m.id}`, () => del(`/api/tmd/pools/${poolId}/members/${m.id}`), "Member removed")}><Trash2 className="size-3.5" /></Button>}
      </div>
    </div>
  );
}
function ResultsEditor({ view, onSaved }: { view: PoolView; onSaved: () => void }) {
  const toast = useToast();
  const { pool, results } = view;
  const [notes, setNotes] = useState(results?.notes ?? "");
  const [rows, setRows] = useState<Partial<ResultRow>[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setNotes(results?.notes ?? "");
    setRows(results?.items.length ? results.items : pool.items.map(i => ({ poolItemId: i.id, passed: null })));
  }, [results, pool.items]);
  const update = (i: number, changes: Partial<ResultRow>) => setRows(r => r.map((row, j) => j === i ? { ...row, ...changes } : row));
  const save = async () => {
    setBusy(true);
    try { await put(`/api/tmd/pools/${pool.id}/results`, { notes, results: rows }); toast("Results saved", "ok"); onSaved(); } catch (e: any) { toast(e.message, "danger"); } finally { setBusy(false); }
  };
  const itemLabel = (id: string | null | undefined) => { const it = pool.items.find(i => i.id === id); return it ? `${it.testType}${it.batch ? ` · ${it.batch.compound} ${it.batch.batchNumber}` : ""}` : "General"; };
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold">Results</h3><p className="text-sm text-muted">Save as often as you like. Nothing is visible to members until you publish.</p></div>
        <Badge tone={pool.resultsPublishedAt ? "ok" : "muted"}>{pool.resultsPublishedAt ? "Published" : "Not published"}</Badge></div>
      <div className="space-y-4">
        {rows.map((r, i) => (
          <div key={r.id ?? i} className="card-2 space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Select value={r.poolItemId ?? ""} onChange={e => update(i, { poolItemId: e.target.value || null })} className="w-auto"><option value="">General</option>{pool.items.map(it => <option key={it.id} value={it.id}>{itemLabel(it.id)}</option>)}</Select>
              <div className="flex items-center gap-3">
                <Select value={r.passed == null ? "" : r.passed ? "pass" : "fail"} onChange={e => update(i, { passed: e.target.value === "" ? null : e.target.value === "pass" })} className="w-auto"><option value="">No verdict</option><option value="pass">Pass</option><option value="fail">Fail</option></Select>
                <Button tone="ghost" size="sm" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="size-4" /></Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-5">
              <Field label="Purity %"><Input type="number" step="0.001" min={0} max={100} value={r.purityPct ?? ""} onChange={e => update(i, { purityPct: e.target.value })} /></Field>
              <Field label="Quantity mg"><Input type="number" step="0.001" min={0} value={r.quantityMg ?? ""} onChange={e => update(i, { quantityMg: e.target.value })} /></Field>
              <Field label="Endotoxin"><Input placeholder="<0.5 EU/mg" value={r.endotoxin ?? ""} onChange={e => update(i, { endotoxin: e.target.value })} /></Field>
              <Field label="Sterility"><Input placeholder="No growth" value={r.sterility ?? ""} onChange={e => update(i, { sterility: e.target.value })} /></Field>
              <Field label="Heavy metals"><Input placeholder="Within limits" value={r.heavyMetals ?? ""} onChange={e => update(i, { heavyMetals: e.target.value })} /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
              <Field label="Summary"><Input placeholder="One or two lines members will read first" value={r.summary ?? ""} onChange={e => update(i, { summary: e.target.value })} /></Field>
              <Field label="Lab verification link"><Input placeholder="https://…" value={r.labVerifyUrl ?? ""} onChange={e => update(i, { labVerifyUrl: e.target.value })} /></Field>
            </div>
            <div className="flex items-center gap-3 text-sm">
              {r.reportKey ? <a href={fileUrl(r.reportKey)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand hover:underline">Report uploaded <ExternalLink className="size-3" /></a> : <span className="text-muted">No PDF yet.</span>}
              {r.id ? <label className="cursor-pointer"><input type="file" accept="application/pdf" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; try { await upload(`/api/tmd/pools/${pool.id}/results/${r.id}/report`, f); toast("Report uploaded", "ok"); onSaved(); } catch (err: any) { toast(err.message, "danger"); } }} /><span className="inline-flex items-center gap-1 text-brand hover:underline"><Upload className="size-3.5" /> {r.reportKey ? "Replace PDF" : "Upload PDF"}</span></label> : <span className="text-xs text-dim">Save first to attach a PDF.</span>}
            </div>
          </div>
        ))}
        <Button tone="subtle" size="sm" onClick={() => setRows([...rows, { poolItemId: null, passed: null }])}>+ Add another result</Button>
        <Field label="Notes for members" hint="Context, caveats, what the numbers mean."><Textarea value={notes} onChange={e => setNotes(e.target.value)} className="min-h-28" /></Field>
        <div className="flex flex-wrap items-center gap-3"><Button loading={busy} onClick={save}>Save results</Button>{pool.resultsVisibility === "password" && <span className="text-xs text-muted">Results are password protected. Members unlock them with the password you set when editing the pool.</span>}</div>
      </div>
    </Card>
  );
}

function Announce({ slug }: { slug: string }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [broadcast, setBroadcast] = useState(true);
  const send = async () => {
    setBusy(true);
    try { await post(`/api/tmd/pools/${slug}/messages`, { body, kind: broadcast ? "broadcast" : "chat" }); setBody(""); toast(broadcast ? "Announcement sent to every member" : "Posted to chat", "ok"); qc.invalidateQueries({ queryKey: ["messages", slug] }); }
    catch (e: any) { toast(e.message, "danger"); } finally { setBusy(false); }
  };
  return (
    <Card>
      <h3 className="mb-1 flex items-center gap-2 font-semibold"><Megaphone className="size-4 text-brand" /> Announce</h3>
      <p className="mb-4 text-sm text-muted">Announcements show at the top of the pool page and land in every member's inbox and email. Chat posts only show in the chat.</p>
      <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Vials have shipped. Tracking number: …" maxLength={2000} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><Toggle checked={broadcast} onChange={setBroadcast} label="Send as announcement" hint="Off = normal chat message" /><Button loading={busy} disabled={!body.trim()} onClick={send}>Send</Button></div>
    </Card>
  );
}

function TelegramTab({ poolId, onChange }: { poolId: string; onChange: () => void }) {
  const toast = useToast();
  const status = useQuery({ queryKey: ["pool-telegram", poolId], queryFn: () => get<{ configured: boolean; botUsername: string | null; linked: boolean; title: string | null }>(`/api/tmd/pools/${poolId}/telegram`), refetchInterval: q => (q.state.data && !q.state.data.linked ? 5000 : false) });
  const [link, setLink] = useState<{ url: string | null; command: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { if (status.data?.linked && link) { setLink(null); toast("Telegram group connected", "ok"); onChange(); } }, [status.data?.linked, link, toast, onChange]);
  const run = async (key: string, fn: () => Promise<void>) => { setBusy(key); try { await fn(); } catch (e: any) { toast(e.message, "danger"); } finally { setBusy(null); } };
  const s = status.data;
  return (
    <Card>
      <div className="mb-1 flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 font-semibold"><Send className="size-4 text-brand" /> Telegram group</h3>{s?.linked ? <Badge tone="ok">Connected</Badge> : <Badge>Not connected</Badge>}</div>
      <p className="mb-4 text-sm text-muted">Connect the Telegram group where your members hang out. Pool chat and the group mirror each other, and the bot announces joins, funding, shipping and results there. Members can run /status in the group.</p>
      {s && !s.configured && <Alert tone="info">Telegram is not switched on for this site yet.</Alert>}
      {s?.configured && s.linked && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>Connected to <b>{s.title ?? "a Telegram group"}</b>.</span>
          <Button size="sm" tone="ghost" loading={busy === "unlink"} onClick={() => run("unlink", async () => { await del(`/api/tmd/pools/${poolId}/telegram`); status.refetch(); onChange(); })}>Disconnect</Button>
        </div>
      )}
      {s?.configured && !s.linked && (link ? (
        <div className="space-y-3">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
            <li>Add {s.botUsername ? <b>@{s.botUsername}</b> : "the bot"} to your group and make it an <b>admin</b> so it can read messages.</li>
            <li>Send this command in the group:</li>
          </ol>
          <div className="flex gap-2"><div className="mono flex-1 rounded-lg bg-surface-2 px-3 py-2 text-sm">{link.command}</div><CopyButton text={link.command} /></div>
          <div className="flex flex-wrap items-center gap-2">{link.url && <a href={link.url} target="_blank" rel="noreferrer"><Button size="sm"><ExternalLink className="size-3.5" /> Add bot to a group</Button></a>}<span className="text-xs text-dim">Code valid for 15 minutes. Waiting for the group…</span></div>
        </div>
      ) : <Button loading={busy === "link"} onClick={() => run("link", async () => setLink(await post(`/api/tmd/pools/${poolId}/telegram/link`)))}>Connect a group</Button>)}
    </Card>
  );
}
