import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Users, Share2, ExternalLink, ShieldCheck, Camera, MessageSquare, Megaphone, Settings2, Send } from "lucide-react";
import { get, post, upload, fileUrl, poolAccess, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { PoolView, Member, Message, Results, PoolItem, CryptoQuote } from "@/lib/types";
import { usd, POOL_STATUS, PAYMENT_STATUS, date, ago, networkLabel, dateTime, isStable, coin } from "@/lib/format";
import { Button, Card, Badge, Progress, Spinner, Alert, Field, Input, Textarea, Toggle, Tabs, CopyButton, Empty, cn, useToast } from "@/components/ui";
import { PhotoGrid } from "@/components/Photos";
import { FundingDonut } from "@/components/Donut";
import { ResultCard } from "./VendorPage";
import NotFound from "./NotFound";

export default function PoolPage({ slug }: { slug: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [codeInput, setCodeInput] = useState("");
  // A share link may carry ?code= (invite) or ?claim= (guest's own membership). Keep them and clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let touched = false;
    if (params.get("code")) { poolAccess.setCode(slug, params.get("code")); params.delete("code"); touched = true; }
    if (params.get("claim")) { poolAccess.setClaim(slug, params.get("claim")); params.delete("claim"); touched = true; }
    if (touched) window.history.replaceState({}, "", `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`);
  }, [slug]);
  const view = useQuery({ queryKey: ["pool", slug, user?.id], queryFn: () => { const a = poolAccess.params(slug); return get<PoolView>(`/api/tmd/pools/${slug}${a.query}`, { headers: a.headers }); }, retry: false });
  const refresh = () => qc.invalidateQueries({ queryKey: ["pool", slug] });

  if (view.isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (view.isError) {
    const err = view.error as ApiError;
    if (err.status === 401) return (
      <div className="fade-in mx-auto max-w-md py-10 text-center">
        <Lock className="mx-auto size-8 text-brand" /><h1 className="mt-4 text-2xl font-bold">Invite-only pool</h1><p className="mt-1 text-sm text-muted">Enter the access code the organiser shared with the link.</p>
        <form className="mt-6 flex gap-2" onSubmit={e => { e.preventDefault(); poolAccess.setCode(slug, codeInput.trim()); refresh(); }}><Input value={codeInput} onChange={e => setCodeInput(e.target.value)} placeholder="Access code" autoFocus /><Button type="submit">Unlock</Button></form>
        {poolAccess.code(slug) && <p className="mt-3 text-xs text-danger">That code did not work.</p>}
      </div>
    );
    return <NotFound />;
  }
  const data = view.data!;
  const { pool, members, photos, announcements, viewer } = data;
  const status = POOL_STATUS[pool.status];
  const membership = viewer.membership;
  const link = `${window.location.origin}/p/${pool.slug}`;
  const vendors = [...new Map(pool.items.filter(i => i.vendor).map(i => [i.vendor!.id, i.vendor!])).values()];

  return (
    <div className="fade-in space-y-6">
      {pool.coverPhotoKey && <img src={fileUrl(pool.coverPhotoKey)} alt="" className="h-48 w-full rounded-2xl object-cover sm:h-64" />}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2"><Badge tone={status.tone}>{status.label}</Badge>{pool.inviteOnly && <Badge><Lock className="size-3" /> Invite-only</Badge>}{pool.resultsVisibility !== "public" && <Badge><ShieldCheck className="size-3" /> Results {pool.resultsVisibility === "members" ? "members-only" : "password-protected"}</Badge>}</div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{pool.title}</h1>
          <p className="mt-1 text-sm text-muted">Hosted by <span className="text-fg">@{pool.organiser.handle}</span>{pool.labName && <> · Lab: {pool.labName}</>}{pool.deadlineAt && <> · Join by {date(pool.deadlineAt)}</>}
            {vendors.length > 0 && <> · {vendors.map((v, i) => <span key={v.id}>{i > 0 && ", "}<Link href={`/v/${v.slug}`} className="text-brand hover:underline">{v.name}</Link></span>)}</>}</p>
        </div>
        <div className="flex gap-2">
          <CopyButton text={link} label="Copy link" className="h-10 px-4 text-sm rounded-xl" />
          {viewer.isOrganiser && <Link href={`/host/${pool.id}`}><Button tone="outline"><Settings2 className="size-4" /> Manage</Button></Link>}
        </div>
      </header>

      {announcements.filter(a => a.kind === "broadcast").slice(-1).map(a => (
        <Alert key={a.id} tone="info"><span className="flex items-center gap-2 text-xs uppercase tracking-wider text-info"><Megaphone className="size-3.5" />Latest from the organiser · {ago(a.createdAt)}</span><p className="mt-1 whitespace-pre-wrap">{a.body}</p></Alert>
      ))}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Funding</h2>{pool.progress.funded ? <Badge tone="ok">Fully funded</Badge> : <Badge tone="brand">{usd(Math.max(0, pool.progress.remaining), 0)} to go</Badge>}</div>
            <FundingDonut className="mt-4" verified={pool.progress.verified} submitted={pool.totals.submittedUsd} target={pool.progress.target} size={140} label={pool.progress.funded ? "funded" : "received"} />
            <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line pt-3 text-xs text-muted">
              <span className="flex items-center gap-1"><Users className="size-3.5" /> {pool.totals.memberCount}{pool.maxMembers ? ` / ${pool.maxMembers}` : ""} members · {pool.totals.verifiedMemberCount} paid</span>
              <span>Share <b className="mono text-fg">{usd(pool.shareUsd)}</b> {pool.splitMode === "even" ? `(target ÷ ${pool.minMembers})` : "per member"}</span>
            </p>
          </Card>

          {pool.description && <Card><h2 className="mb-2 font-semibold">About this pool</h2><p className="whitespace-pre-wrap text-sm text-muted">{pool.description}</p></Card>}

          <Card>
            <h2 className="mb-3 font-semibold">What is being tested</h2>
            <div className="divide-y divide-line">
              {pool.items.map(i => <ItemRow key={i.id} item={i} />)}
            </div>
            <dl className="mono mt-3 space-y-1 border-t border-line pt-3 text-xs text-muted">
              <div className="flex justify-between"><dt>Tests</dt><dd>{usd(pool.breakdown.tests)}</dd></div>
              {pool.breakdown.shipping > 0 && <div className="flex justify-between"><dt>Shipping to lab</dt><dd>{usd(pool.breakdown.shipping)}</dd></div>}
              {pool.breakdown.tip > 0 && <div className="flex justify-between"><dt>Organiser tip</dt><dd>{usd(pool.breakdown.tip)}</dd></div>}
              {pool.breakdown.fee > 0 && <div className="flex justify-between"><dt>Platform fee ({pool.breakdown.feePct}%)</dt><dd>{usd(pool.breakdown.fee)}</dd></div>}
              <div className="flex justify-between text-sm font-semibold text-fg"><dt>Target</dt><dd>{usd(pool.breakdown.target)}</dd></div>
            </dl>
          </Card>

          <ResultsPanel slug={slug} data={data} />

          {photos.length > 0 && <Card><h2 className="mb-3 flex items-center gap-2 font-semibold"><Camera className="size-4 text-brand" /> Photos</h2><PhotoGrid photos={photos} /></Card>}

          <Card id="chat"><Chat slug={slug} canChat={viewer.isOrganiser || !!membership} telegram={pool.telegram} isOrganiser={viewer.isOrganiser} poolId={pool.id} /></Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {viewer.isOrganiser ? (
            <Card><p className="label">You host this pool</p><p className="text-sm text-muted">Share the link below. Confirm payments, post updates and publish results from the manage page.</p><Link href={`/host/${pool.id}`}><Button className="mt-3 w-full">Open manage page</Button></Link></Card>
          ) : membership ? (
            <MemberPanel slug={slug} data={data} onChange={refresh} />
          ) : (
            <JoinPanel slug={slug} data={data} onJoined={m => { if (!user && m.claimToken) poolAccess.setClaim(slug, m.claimToken); refresh(); toast("You are in. Now pay your share.", "ok"); }} />
          )}

          <Card>
            <h3 className="mb-3 flex items-center gap-2 font-semibold"><Users className="size-4" /> Members</h3>
            {members.length ? (
              <ul className="space-y-1.5 text-sm">
                {members.map(m => { const p = PAYMENT_STATUS[m.paymentStatus]; return <li key={m.id} className="flex items-center justify-between gap-2"><span className={cn("truncate", m.anonymous && "italic text-muted")}>{m.displayName}</span><Badge tone={p.tone} className="shrink-0">{p.label}</Badge></li>; })}
              </ul>
            ) : <p className="text-sm text-muted">No members yet. Be the first.</p>}
          </Card>

          <Card>
            <h3 className="mb-2 flex items-center gap-2 font-semibold"><Share2 className="size-4" /> Share</h3>
            <div className="mono break-all rounded-lg bg-surface-2 px-3 py-2 text-xs">{link}</div>
            <CopyButton text={link} label="Copy link" className="mt-2" />
          </Card>
        </aside>
      </div>
    </div>
  );
}

function ItemRow({ item }: { item: PoolItem }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
      <div className="min-w-0"><p className="font-medium">{item.testType}{item.quantity > 1 && <span className="text-muted"> × {item.quantity}</span>}</p>
        <p className="truncate text-xs text-muted">{item.batch ? <>{item.batch.compound} · batch {item.batch.batchNumber}{item.batch.mg ? ` · ${item.batch.mg}` : ""}{item.batch.capColour ? ` · ${item.batch.capColour} cap` : ""}</> : "Batch not specified"}{item.vendor && <> · <Link href={`/v/${item.vendor.slug}`} className="hover:text-fg">{item.vendor.name}</Link></>}{item.lab && <> · {item.lab}</>}</p></div>
      <span className="mono">{usd(Number(item.priceUsd) * item.quantity)}</span>
    </div>
  );
}

function JoinPanel({ slug, data, onJoined }: { slug: string; data: PoolView; onJoined: (m: Member) => void }) {
  const { user } = useAuth();
  const { pool } = data;
  const [form, setForm] = useState({ displayName: user?.displayName ?? "", guestContact: "", anonymous: false, note: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const open = pool.status === "open" && (!pool.maxMembers || pool.totals.memberCount < pool.maxMembers) && (!pool.deadlineAt || new Date(pool.deadlineAt).getTime() > Date.now());
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    try { const a = poolAccess.params(slug); const r = await post(`/api/tmd/pools/${slug}/join${a.query}`, form, { headers: a.headers }); onJoined(r.member); }
    catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };
  if (!open) return <Card><p className="label">Joining</p><p className="text-sm text-muted">{pool.status === "open" ? "This pool is full or past its deadline." : `This pool is ${POOL_STATUS[pool.status].label.toLowerCase()} and not taking new members.`}</p></Card>;
  return (
    <Card className="border-brand/40">
      <p className="label">Join this pool</p>
      <p className="mono text-2xl font-bold">{usd(pool.shareUsd)}<span className="ml-1 text-sm font-normal text-muted">your share</span></p>
      <form onSubmit={submit} className="mt-3 space-y-3">
        {error && <Alert tone="danger">{error}</Alert>}
        {!user && <Field label="Email or Telegram handle" hint="So the organiser can reach you. Not shown publicly."><Input value={form.guestContact} onChange={e => setForm({ ...form, guestContact: e.target.value })} placeholder="you@email.com or @handle" required /></Field>}
        <Field label="Name on the member list"><Input value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} placeholder={user ? user.displayName : "Optional"} maxLength={60} /></Field>
        <Toggle checked={form.anonymous} onChange={v => setForm({ ...form, anonymous: v })} label="Show me as Anonymous" hint="The organiser still sees your name." />
        <Field label="Note to organiser" hint="Optional"><Input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} maxLength={400} /></Field>
        <Button type="submit" className="w-full" loading={busy}>Join and pay next</Button>
        {!user && <p className="text-center text-xs text-dim"><Link href={`/login?next=/p/${slug}`} className="text-brand hover:underline">Sign in</Link> to keep your pools in one place.</p>}
      </form>
    </Card>
  );
}

function MemberPanel({ slug, data, onChange }: { slug: string; data: PoolView; onChange: () => void }) {
  const toast = useToast();
  const { pool } = data;
  const m = data.viewer.membership!;
  const methods = pool.paymentMethods ?? {};
  type Rail = { currency: string; network: string; address: string };
  const options: ({ key: string; label: string; kind: "crypto"; rail: Rail } | { key: string; label: string; kind: "anonpay" | "revolut" | "paypal" })[] = [
    ...(methods.crypto ?? []).map(r => ({ key: `crypto:${r.currency}:${r.network}`, label: `${r.currency} · ${networkLabel(r.network)}`, kind: "crypto" as const, rail: r })),
    ...(methods.anonpay ? [{ key: "anonpay", label: "AnonPay (card / any coin)", kind: "anonpay" as const }] : []),
    ...(methods.revolut ? [{ key: "revolut", label: "Revolut", kind: "revolut" as const }] : []),
    ...(methods.paypal ? [{ key: "paypal", label: "PayPal", kind: "paypal" as const }] : []),
  ];
  const [choice, setChoice] = useState(options[0]?.key ?? "");
  const [txHash, setTxHash] = useState("");
  const [reference, setReference] = useState("");
  const [iframe, setIframe] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const a = () => poolAccess.params(slug);
  const p = PAYMENT_STATUS[m.paymentStatus];
  const selected = options.find(o => o.key === choice);
  const act = async (fn: () => Promise<unknown>, ok: string) => { setBusy(true); try { await fn(); toast(ok, "ok"); onChange(); } catch (e: any) { toast(e.message, "danger"); } finally { setBusy(false); } };
  const claimLink = m.claimToken && !m.userId ? `${window.location.origin}/p/${slug}?claim=${m.claimToken}` : null;
  // Volatile coins are quoted live so the member knows the exact amount to send; the rate shown is locked in when they submit.
  const volatileRail = selected?.kind === "crypto" && !isStable(selected.rail.currency) ? selected.rail : null;
  const quote = useQuery({
    queryKey: ["quote", slug, volatileRail?.currency, m.amountUsd], enabled: !!volatileRail && ["pending", "rejected"].includes(m.paymentStatus), refetchInterval: 60_000, retry: 1,
    queryFn: () => { const p = a(); return get<CryptoQuote>(`/api/tmd/pools/${slug}/quote?currency=${volatileRail!.currency}&amountUsd=${m.amountUsd}${p.query ? `&${p.query.slice(1)}` : ""}`, { headers: p.headers }); },
  });

  return (
    <Card className={cn(m.paymentStatus === "verified" ? "border-ok/40" : "border-brand/40")}>
      <div className="flex items-start justify-between gap-2"><div><p className="label">Your share</p><p className="mono text-2xl font-bold">{usd(m.amountUsd)}</p></div><Badge tone={p.tone}>{p.label}</Badge></div>
      {m.paymentStatus === "verified" && <p className="mt-2 text-sm text-muted">Thanks, you are paid up. You will hear when the samples ship and when results land.</p>}
      {m.paymentStatus === "verified" && pool.status === "cancelled" && <Alert tone="warn" className="mt-2">The pool was cancelled. The organiser refunds you directly; message them in the chat if you have not heard back.</Alert>}
      {m.paymentStatus === "submitted" && <p className="mt-2 text-sm text-muted">Payment recorded{m.paymentRef && !m.paymentRef.startsWith("anonpay:") ? ` (${m.paymentRef.slice(0, 14)}…)` : ""}{m.paymentAmountCrypto && m.paymentCurrency ? `, expecting ${coin(m.paymentAmountCrypto, m.paymentCurrency)}` : ""}. Crypto and AnonPay are confirmed automatically within a few minutes; screenshots are confirmed by the organiser.</p>}
      {m.paymentStatus === "rejected" && <Alert tone="danger" className="mt-2">The organiser could not match this payment.{m.note ? ` “${m.note}”` : ""} Check the details and try again, or message them in the chat.</Alert>}

      {["pending", "rejected"].includes(m.paymentStatus) && ["open", "funded"].includes(pool.status) && (
        <div className="mt-4 space-y-3">
          {options.length === 0 ? <Alert tone="warn">The organiser has not added any payment method yet.</Alert> : (
            <>
              <Field label="Pay with"><select className="field" value={choice} onChange={e => { setChoice(e.target.value); setIframe(null); }}>{options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}</select></Field>
              {selected?.kind === "crypto" && (
                <div className="space-y-2">
                  {volatileRail ? (
                    quote.data ? <p className="text-xs text-muted">Send exactly <b className="mono text-fg">{coin(quote.data.cryptoAmount, quote.data.currency)}</b> (≈ {usd(m.amountUsd)} at ${quote.data.usdPerCoin.toLocaleString()} per {quote.data.currency}, refreshed every minute) on {networkLabel(selected.rail.network)} to:</p>
                    : quote.isError ? <Alert tone="warn">Could not fetch the {volatileRail.currency} price. Try again in a moment or pay with a stablecoin.</Alert>
                    : <p className="text-xs text-muted">Fetching the live {volatileRail.currency} price…</p>
                  ) : <p className="text-xs text-muted">Send exactly <b className="mono text-fg">{usd(m.amountUsd)}</b> in {selected.rail.currency} on {networkLabel(selected.rail.network)} to:</p>}
                  <div className="mono break-all rounded-lg bg-surface-2 px-3 py-2 text-xs">{selected.rail.address}</div>
                  <CopyButton text={selected.rail.address} label="Copy address" />
                  <Field label="Transaction hash"><Input className="mono text-xs" value={txHash} onChange={e => setTxHash(e.target.value.trim())} placeholder="0x… / signature" /></Field>
                  <Button className="w-full" loading={busy} disabled={txHash.length < 16 || (!!volatileRail && !quote.data)} onClick={() => act(() => post(`/api/tmd/members/${m.id}/pay${a().query}`, { method: "crypto", currency: selected.rail.currency, network: selected.rail.network, txHash, usdPerCoin: quote.data?.usdPerCoin }), "Payment submitted. We will confirm it on-chain.")}>I have paid</Button>
                </div>
              )}
              {selected?.kind === "anonpay" && (
                <div className="space-y-2">
                  {iframe ? <iframe src={iframe} title="AnonPay" className="h-[560px] w-full rounded-lg border border-line bg-white" /> : <Button className="w-full" loading={busy} onClick={async () => { setBusy(true); try { const r = await post(`/api/tmd/members/${m.id}/anonpay${a().query}`); setIframe(r.iframeUrl); onChange(); } catch (e: any) { toast(e.message, "danger"); } finally { setBusy(false); } }}>Start AnonPay payment</Button>}
                  <p className="text-xs text-dim">Pay by card or any coin. Confirmed automatically once Trocador reports it finished.</p>
                </div>
              )}
              {(selected?.kind === "revolut" || selected?.kind === "paypal") && (
                <div className="space-y-2">
                  <p className="text-xs text-muted">Send <b className="mono text-fg">{usd(m.amountUsd)}</b> to:</p>
                  <div className="mono rounded-lg bg-surface-2 px-3 py-2 text-sm">{selected.kind === "revolut" ? `@${methods.revolut!.handle}` : methods.paypal!.email}</div>
                  <Field label="Reference (optional)"><Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Name on the transfer" /></Field>
                  <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) act(() => upload(`/api/tmd/members/${m.id}/screenshot${a().query}`, f, { method: selected.kind, reference }), "Screenshot uploaded. The organiser will confirm it."); }} />
                  <Button className="w-full" loading={busy} onClick={() => fileInput.current?.click()}>Upload payment screenshot</Button>
                </div>
              )}
            </>
          )}
          <Button tone="ghost" size="sm" className="w-full" onClick={() => act(async () => { await post(`/api/tmd/members/${m.id}/leave${a().query}`); poolAccess.setClaim(slug, null); }, "You left the pool")}>Leave the pool</Button>
        </div>
      )}
      {claimLink && <div className="mt-4 border-t border-line pt-3"><p className="text-xs text-muted">You joined as a guest. Keep this private link to get back to your payment and the results from any device:</p><div className="mt-1 flex gap-2"><div className="mono flex-1 truncate rounded bg-surface-2 px-2 py-1 text-[11px]">{claimLink}</div><CopyButton text={claimLink} /></div></div>}
    </Card>
  );
}

function ResultsPanel({ slug, data }: { slug: string; data: PoolView }) {
  const { pool, results, resultsLocked, viewer } = data;
  const [unlocked, setUnlocked] = useState<Results | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const shown = results ?? unlocked;
  if (!pool.resultsPublishedAt) return <Card><h2 className="mb-1 flex items-center gap-2 font-semibold"><ShieldCheck className="size-4 text-muted" /> Results</h2><p className="text-sm text-muted">{pool.status === "at_lab" ? "Samples are at the lab. Results will be posted here." : "No results yet. They appear here once the organiser publishes them."}</p></Card>;
  const unlock = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    try { const a = poolAccess.params(slug); const r = await post(`/api/tmd/pools/${slug}/results/unlock${a.query}`, { password }, { headers: a.headers }); setUnlocked(r.results); }
    catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <Card className="border-ok/30">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4 text-ok" /> Results</h2><span className="text-xs text-muted">Published {dateTime(pool.resultsPublishedAt)}</span></div>
      {shown ? (
        <div className="space-y-3">
          {shown.notes && <p className="whitespace-pre-wrap text-sm text-muted">{shown.notes}</p>}
          {shown.items.map(r => { const item = pool.items.find(i => i.id === r.poolItemId); return <ResultCard key={r.id} showPool={false} r={{ ...r, poolId: pool.id, poolSlug: pool.slug, poolTitle: pool.title, publishedAt: pool.resultsPublishedAt!, batchId: item?.batchId ?? null, testType: item ? `${item.testType}${item.batch ? ` · ${item.batch.compound} ${item.batch.batchNumber}` : ""}` : "Result", lab: item?.lab ?? pool.labName }} />; })}
          {shown.items.length === 0 && <p className="text-sm text-muted">The organiser published notes without structured results.</p>}
        </div>
      ) : resultsLocked && pool.resultsVisibility === "password" ? (
        <form onSubmit={unlock} className="space-y-2">
          <p className="text-sm text-muted">These results are password protected. {viewer.membership ? "Paid members see them automatically once their payment is confirmed." : "Ask the organiser for the password."}</p>
          {error && <Alert tone="danger">{error}</Alert>}
          <div className="flex gap-2"><Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Results password" /><Button type="submit" loading={busy}>Unlock</Button></div>
        </form>
      ) : (
        <p className="text-sm text-muted">Results are only available to verified members of this pool.{viewer.membership && viewer.membership.paymentStatus !== "verified" ? " Yours will show once your payment is confirmed." : ""}</p>
      )}
    </Card>
  );
}

function Chat({ slug, canChat, telegram, isOrganiser, poolId }: { slug: string; canChat: boolean; telegram: { linked: boolean; title: string | null }; isOrganiser: boolean; poolId: string }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"chat" | "updates">("chat");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const messages = useQuery({ queryKey: ["messages", slug], queryFn: () => { const a = poolAccess.params(slug); return get<{ messages: Message[]; canChat: boolean; canBroadcast: boolean }>(`/api/tmd/pools/${slug}/messages${a.query}`, { headers: a.headers }); }, refetchInterval: 15_000 });
  const list = (messages.data?.messages ?? []).filter(m => tab === "chat" ? m.kind !== "broadcast" : m.kind !== "chat");
  useEffect(() => { bottom.current?.scrollIntoView({ block: "nearest" }); }, [list.length, tab]);
  const send = async (e: FormEvent) => {
    e.preventDefault(); if (!body.trim()) return; setBusy(true);
    try { const a = poolAccess.params(slug); await post(`/api/tmd/pools/${slug}/messages${a.query}`, { body }, { headers: a.headers }); setBody(""); qc.invalidateQueries({ queryKey: ["messages", slug] }); }
    catch (err: any) { toast(err.message, "danger"); } finally { setBusy(false); }
  };
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 font-semibold"><MessageSquare className="size-4 text-brand" /> Pool chat</h2><Tabs value={tab} onChange={setTab} tabs={[{ value: "chat", label: "Chat" }, { value: "updates", label: "Updates" }]} /></div>
      <div className="max-h-96 space-y-2 overflow-y-auto rounded-xl bg-surface-2 p-3">
        {messages.isLoading ? <Spinner /> : list.length ? list.map(m => (
          <div key={m.id} className={cn("rounded-lg px-3 py-2 text-sm", m.kind === "system" ? "text-center text-xs text-dim" : m.kind === "broadcast" ? "border border-info/30 bg-info/10" : "bg-surface")}>
            {m.kind !== "system" && <p className="mb-0.5 flex items-baseline gap-2 text-xs"><span className={cn("font-semibold", m.authorName.includes("organiser") ? "text-brand" : "text-fg")}>{m.authorName}</span><span className="text-dim">{ago(m.createdAt)}</span></p>}
            <p className="whitespace-pre-wrap">{m.body}</p>
          </div>
        )) : <p className="py-6 text-center text-sm text-dim">{tab === "chat" ? (canChat ? "Say hello." : "Join the pool to see and join the chat.") : "No updates yet."}</p>}
        <div ref={bottom} />
      </div>
      {canChat ? (
        <form onSubmit={send} className="mt-3 flex gap-2"><Textarea value={body} onChange={e => setBody(e.target.value)} rows={1} className="min-h-10 flex-1" placeholder="Message the pool…" maxLength={2000} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e as any); } }} /><Button type="submit" loading={busy}>Send</Button></form>
      ) : <p className="mt-3 text-xs text-dim">Chat is for members and the organiser. Announcements are visible to everyone.</p>}
      <p className="mt-2 flex items-center gap-1 text-[11px] text-dim"><Send className="size-3" />{telegram.linked ? <>Bridged with the Telegram group {telegram.title ? <b className="text-muted">{telegram.title}</b> : ""}: messages flow both ways.</> : isOrganiser ? <>Connect a Telegram group from <Link href={`/host/${poolId}`} className="text-brand hover:underline">Manage → Telegram</Link> to mirror this chat.</> : "Not connected to a Telegram group."}</p>
    </div>
  );
}
