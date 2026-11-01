import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Inbox, FlaskConical, Users, Wallet, Share2, ArrowRight, CheckCircle2 } from "lucide-react";
import { get, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Pool, Member } from "@/lib/types";
import { usd, POOL_STATUS, PAYMENT_STATUS, ago } from "@/lib/format";
import { Page } from "@/components/Layout";
import { Button, Tabs, Badge, Spinner, Empty, Alert, Card, cn } from "@/components/ui";
import { MiniDonut } from "@/components/Donut";

type Tab = "hosting" | "joined" | "inbox";
type Notification = { id: string; kind: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string };
type HostedPool = Pool & { totals: { verifiedUsd: number; submittedUsd: number; memberCount: number; verifiedMemberCount: number }; progress: { target: number; verified: number; remaining: number; pct: number; funded: boolean } };

export default function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const initial = (new URLSearchParams(window.location.search).get("tab") as Tab) || "hosting";
  const [tab, setTab] = useState<Tab>(initial);
  const me = useQuery({ queryKey: ["me"], queryFn: () => get("/api/tmd/me") });
  const hosting = useQuery({ queryKey: ["me", "pools"], queryFn: () => get<{ pools: HostedPool[] }>("/api/tmd/me/pools") });
  const joined = useQuery({ queryKey: ["me", "contributions"], queryFn: () => get<{ contributions: { member: Member; pool: Pool }[] }>("/api/tmd/me/contributions") });
  const inbox = useQuery({ queryKey: ["me", "notifications"], queryFn: () => get<{ notifications: Notification[] }>("/api/tmd/me/notifications") });
  useEffect(() => {
    if (tab !== "inbox" || !inbox.data?.notifications.some(n => !n.readAt)) return;
    post("/api/tmd/me/notifications/read", {}).then(() => { qc.invalidateQueries({ queryKey: ["me"] }); });
  }, [tab, inbox.data, qc]);
  const stats = me.data?.stats ?? { hosted: 0, joined: 0, unread: 0 };
  const pools = hosting.data?.pools ?? [];
  const active = pools.filter(p => !["closed", "cancelled"].includes(p.status));
  const received = pools.reduce((s, p) => s + (p.totals?.verifiedUsd ?? 0), 0);
  const awaiting = pools.reduce((s, p) => s + (p.totals?.submittedUsd ?? 0), 0);
  const paidMembers = pools.reduce((s, p) => s + (p.totals?.verifiedMemberCount ?? 0), 0);
  const hasWallet = !!(user?.payoutMethods?.crypto?.length || user?.payoutMethods?.anonpay || user?.payoutMethods?.revolut || user?.payoutMethods?.paypal);

  return (
    <Page title={`Hey, ${user?.displayName}`} subtitle="Your pools, your contributions and everything that happened while you were away." actions={<Link href="/host/new"><Button><Plus className="size-4" /> Host a pool</Button></Link>}>
      {user && !user.emailVerified && <Alert tone="warn">Your email is not confirmed yet. Check your inbox, or <Link href="/settings" className="underline">resend the link from settings</Link>.</Alert>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Active pools" value={hosting.isLoading ? "…" : String(active.length)} hint={`${stats.hosted} hosted in total`} />
        <Tile label="Received" value={hosting.isLoading ? "…" : usd(received, 0)} hint={awaiting > 0 ? `${usd(awaiting, 0)} awaiting confirmation` : "across all your pools"} tone="brand" />
        <Tile label="Members paid" value={hosting.isLoading ? "…" : String(paidMembers)} hint="confirmed payments" />
        <Tile label="Inbox" value={String(stats.unread)} hint={stats.unread ? "unread updates" : "all caught up"} />
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[{ value: "hosting", label: <span className="flex items-center gap-1.5"><FlaskConical className="size-4" />Hosting</span>, count: stats.hosted }, { value: "joined", label: <span className="flex items-center gap-1.5"><Users className="size-4" />Joined</span>, count: stats.joined }, { value: "inbox", label: <span className="flex items-center gap-1.5"><Inbox className="size-4" />Inbox</span>, count: stats.unread || undefined }]} />

      {tab === "hosting" && (hosting.isLoading ? <Spinner /> : pools.length ? (
        <div className="grid gap-3">
          {pools.map(p => {
            const s = POOL_STATUS[p.status];
            const next = p.status === "draft" ? "Finish setup and open it" : p.status === "open" ? (p.totals.submittedUsd > 0 ? "Payments waiting for your confirmation" : "Share the link to fill it") : p.status === "funded" ? "Ship the samples and mark them at the lab" : p.status === "at_lab" ? "Post the results when they arrive" : p.status === "results" ? "Results published" : s.label;
            return (
              <Link key={p.id} href={`/host/${p.id}`} className="card flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-20px_rgba(28,37,36,0.35)]">
                <MiniDonut verified={p.progress.verified} submitted={p.totals.submittedUsd} target={p.progress.target} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold">{p.title}</h3><Badge tone={s.tone}>{s.label}</Badge></div>
                  <p className="mt-0.5 truncate text-xs text-muted">{next} · {p.totals.memberCount} members · updated {ago(p.updatedAt)}</p>
                </div>
                <div className="hidden text-right sm:block"><p className="mono text-sm font-semibold">{usd(p.progress.verified, 0)} <span className="font-normal text-muted">of {usd(p.progress.target, 0)}</span></p><p className="text-xs text-muted">{p.totals.verifiedMemberCount} paid{p.totals.submittedUsd > 0 ? ` · ${usd(p.totals.submittedUsd, 0)} awaiting` : ""}</p></div>
                <ArrowRight className="size-4 shrink-0 text-dim" />
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="p-0">
          <div className="border-b border-line p-6"><h3 className="text-lg font-semibold">Host your first pool in three steps</h3><p className="mt-1 text-sm text-muted">A pool is one batch, the tests you want on it, and the people splitting the bill. It takes a few minutes.</p></div>
          <ol className="grid gap-px bg-line sm:grid-cols-3">
            <Step n={1} done={hasWallet} icon={Wallet} title="Add how you get paid" text="Save a USDT or USDC wallet once. Payments to it are confirmed on-chain automatically." href="/settings" cta={hasWallet ? "Payout methods saved" : "Add a wallet"} />
            <Step n={2} icon={FlaskConical} title="Describe the test" text="Pick the vendor and batch, the tests and the lab. Set how many people you expect and the share is worked out for you." href="/host/new" cta="Create a pool" primary />
            <Step n={3} icon={Share2} title="Share one link" text="Post it in your group. Members join as guests or with an account, pay you directly and watch the donut fill up." />
          </ol>
        </Card>
      ))}

      {tab === "joined" && (joined.isLoading ? <Spinner /> : joined.data?.contributions.length ? (
        <div className="grid gap-3">
          {joined.data.contributions.map(({ member, pool }) => {
            const s = POOL_STATUS[pool.status], p = PAYMENT_STATUS[member.paymentStatus];
            return (
              <Link key={member.id} href={`/p/${pool.slug}`} className="card flex flex-col gap-2 p-4 transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-20px_rgba(28,37,36,0.35)] sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold">{pool.title}</h3><Badge tone={s.tone}>{s.label}</Badge></div><p className="text-xs text-muted">Hosted by @{pool.organiser?.handle ?? "organiser"} · joined {ago(member.joinedAt)}</p></div>
                <div className="flex items-center gap-3"><span className="mono text-sm">{usd(member.amountUsd)}</span><Badge tone={p.tone}>{p.label}</Badge></div>
              </Link>
            );
          })}
        </div>
      ) : <Empty title="You have not joined a pool yet" icon={<Users className="size-5" />}><Link href="/explore" className="text-brand hover:underline">Browse open pools.</Link></Empty>)}

      {tab === "inbox" && (inbox.isLoading ? <Spinner /> : inbox.data?.notifications.length ? (
        <div className="card divide-y divide-line">
          {inbox.data.notifications.map(n => (
            <Link key={n.id} href={n.link ?? "/dashboard"} className={cn("flex gap-3 px-4 py-3 text-sm hover:bg-surface-2", !n.readAt && "bg-brand/5")}>
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-line-2" : "bg-brand")} />
              <div className="min-w-0 flex-1"><p className="font-medium">{n.title}</p>{n.body && <p className="truncate text-muted">{n.body}</p>}</div>
              <span className="shrink-0 text-xs text-dim">{ago(n.createdAt)}</span>
            </Link>
          ))}
        </div>
      ) : <Empty title="Inbox zero" icon={<Inbox className="size-5" />}>Joins, payments, status changes and announcements show up here.</Empty>)}
    </Page>
  );
}

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "brand" }) {
  return (
    <div className="card px-4 py-3.5">
      <p className="text-xs text-muted">{label}</p>
      <p className={cn("mono mt-1 text-2xl font-semibold tracking-tight", tone === "brand" && "text-brand")}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-dim">{hint}</p>}
    </div>
  );
}
function Step({ n, icon: Icon, title, text, href, cta, primary, done }: { n: number; icon: typeof Wallet; title: string; text: string; href?: string; cta?: string; primary?: boolean; done?: boolean }) {
  return (
    <li className="flex flex-col gap-3 bg-surface p-6">
      <div className="flex items-center gap-3"><span className={cn("flex size-8 items-center justify-center rounded-full text-sm font-semibold", done ? "bg-ok/10 text-ok" : "bg-brand-soft text-brand")}>{done ? <CheckCircle2 className="size-4" /> : n}</span><Icon className="size-4 text-muted" /></div>
      <div><h4 className="font-semibold">{title}</h4><p className="mt-1 text-sm text-muted">{text}</p></div>
      {href && cta && <Link href={href} className="mt-auto"><Button size="sm" tone={primary ? "primary" : done ? "ghost" : "outline"} disabled={done}>{cta}</Button></Link>}
    </li>
  );
}
