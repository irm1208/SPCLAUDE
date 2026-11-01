import type { ReactNode } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ArrowUpRight, FlaskConical, Wallet, ShieldCheck, Share2, Send, Lock } from "lucide-react";
import { get } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Pool } from "@/lib/types";
import { TESTING_LABS } from "@/lib/labs";
import { Button, cn } from "@/components/ui";
import { Mark } from "@/components/Layout";
import { PoolCard } from "@/components/PoolCard";
import { FundingDonut } from "@/components/Donut";
import { HeroArt, PaymentsArt, OrganiserArt, MembersArt, CommunityArt } from "@/components/Art";

/**
 * Landing page, laid out as numbered sections with one job each:
 * hero → how it works → labs → why → payments → use cases → open pools → closing call.
 * Every section shares the same header shape (number, label, heading, lead) and a hairline
 * above it, so the page reads as a sequence rather than a scroll of cards.
 */
const SECTIONS = [
  { id: "how", label: "How it works" }, { id: "labs", label: "Labs" }, { id: "why", label: "Why Testmedaddy" }, { id: "payments", label: "Payments" }, { id: "use-cases", label: "Use cases" }, { id: "pools", label: "Open pools" },
] as const;
const CHAINS = ["Ethereum", "Solana", "Arbitrum", "Polygon", "BNB Chain", "Tron", "Bitcoin"];
const STEPS = [
  { icon: FlaskConical, title: "Set up the pool", text: "Pick the vendor's batch, the tests you want and the lab. Say how many people you expect and the share per member is worked out for you." },
  { icon: Share2, title: "Share one link", text: "Public, unlisted or invite-only. Members join with an account or as a guest and pay their share straight to your wallet." },
  { icon: Wallet, title: "Watch it fund", text: "Crypto payments are confirmed on-chain automatically. A funding ring shows what is received, what is pending and what is still needed." },
  { icon: ShieldCheck, title: "Publish the result", text: "Upload the lab report, choose who can see it, and it lands on the pool and on the vendor's page where the vendor cannot touch it." },
];
const USE_CASES = [
  { title: "Organisers", text: "Run a pool for any vendor's batch: pick the tests and the lab, set the split, share one link and collect each member's share straight into your own wallet.", href: "/host/new", cta: "Host a pool", Art: OrganiserArt, method: "Mass spectrometry / LC-MS" },
  { title: "Members", text: "Join with an account or as a guest, pay your share, follow the vials to the lab in the chat and get the result the moment it lands.", href: "/explore", cta: "Browse open pools", Art: MembersArt, method: "Endotoxin testing" },
  { title: "Communities", text: "Bridge the pool to your Telegram group. Announcements, funding progress and results flow both ways, so nobody has to leave the chat.", href: "/how-it-works", cta: "See how it works", Art: CommunityArt, method: "Inside the lab / Sample preparation" },
];

function LabNames({ dark = false }: { dark?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Testing provider choices">
      {TESTING_LABS.map(lab => (
        <li key={lab.name}>
          <a href={lab.website} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current ${dark ? "border-white/25 text-white hover:bg-white/10" : "border-[#c7ccc5] text-[#24362f] hover:bg-[#dde5dc]"}`} aria-label={`Visit ${lab.name} (opens in a new tab)`}>
            {lab.name}<ArrowUpRight className="size-3" aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Shared section frame: hairline, number + label, heading, optional lead and action. */
function Section({ id, number, label, title, lead, action, children, className }: { id: string; number: string; label: string; title: ReactNode; lead?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-24 border-t border-line pt-10 sm:pt-14", className)}>
      <div className="mb-8 grid gap-6 md:grid-cols-[1fr_auto] md:items-end sm:mb-10">
        <div className="max-w-2xl">
          <p className="mb-3 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"><span className="mono text-brand">{number}</span><span className="h-px w-6 bg-line-2" aria-hidden="true" />{label}</p>
          <h2 id={`${id}-title`} className="display text-3xl sm:text-4xl">{title}</h2>
          {lead && <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">{lead}</p>}
        </div>
        {action && <div className="md:pb-1">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const pools = useQuery({ queryKey: ["pools", "landing"], queryFn: () => get<{ pools: Pool[] }>("/api/tmd/pools?status=open") });
  const hostHref = user ? "/host/new" : "/signup";
  return (
    <div className="fade-in space-y-16 sm:space-y-24">
      {/* Hero */}
      <section className="lab-hero relative mt-2 overflow-hidden rounded-[2rem] bg-[#1c2524] text-[#f8f7f0]">
        <div className="grid lg:grid-cols-[1fr_1.1fr]">
          <div className="relative z-10 space-y-6 p-8 sm:p-10 lg:p-12">
            <div className="flex items-center gap-2.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[#b7cdc2]"><Mark className="size-4" />Community-funded lab testing</div>
            <h1 className="max-w-md text-4xl font-medium leading-[1.08] tracking-[-0.04em] sm:text-[52px]">Test the batch,<br />not the label.</h1>
            <p className="max-w-sm text-sm leading-relaxed text-[#d0d7d3]">Set up a testing group for any peptide batch in minutes. Split the lab fee with your community, verify every payment on-chain and publish what comes back.</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-medium text-[#bdd3c6]" aria-label="Testing methods">
              {["HPLC", "Mass spectrometry", "Endotoxin testing"].map(method => <li key={method} className="flex items-center gap-1.5"><span className="size-1 rounded-full bg-[#a4bfb1]" />{method}</li>)}
            </ul>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link href={hostHref}><Button className="bg-[#ebeadc] text-[#1c2524] hover:bg-white">Host a pool <ArrowRight className="size-4" /></Button></Link>
              <a href="#how"><Button tone="outline" className="border-white/25 bg-transparent text-white hover:border-white hover:text-white">How it works</Button></a>
            </div>
          </div>
          <figure className="relative aspect-[3/2] overflow-hidden lg:aspect-auto lg:min-h-[480px]">
            <HeroArt className="absolute inset-0" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 text-[10px] font-medium uppercase tracking-[0.16em] text-white/90 sm:p-8"><span>HPLC / Chromatography</span><span>Independent analysis</span></figcaption>
          </figure>
        </div>
        <div className="flex flex-col gap-4 border-t border-white/15 px-8 py-6 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-12">
          <p className="text-xs text-[#c4d0ca]">Choose your testing provider</p>
          <LabNames dark />
        </div>
      </section>

      {/* Jump bar */}
      <nav aria-label="Page sections" className="-mt-6 sm:-mt-10">
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
          {SECTIONS.map((s, i) => (
            <li key={s.id} className="flex items-center">
              <a href={`#${s.id}`} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-muted transition hover:bg-surface-2 hover:text-fg"><span className="mono text-[11px] text-brand">{String(i + 1).padStart(2, "0")}</span>{s.label}</a>
              {i < SECTIONS.length - 1 && <span className="hidden h-3 w-px bg-line-2 sm:block" aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </nav>

      {/* 01 How it works */}
      <Section id="how" number="01" label="How it works" title="A testing group in four steps." lead="One batch, the tests you want on it, and the people splitting the bill. Testmedaddy handles the link, the payments and the publishing." action={<Link href={hostHref}><Button>Start a pool <ArrowRight className="size-4" /></Button></Link>}>
        <ol className="grid gap-px overflow-hidden rounded-[1.25rem] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-4 bg-surface p-6">
              <div className="flex items-center justify-between"><span className="mono text-xs text-brand">{String(i + 1).padStart(2, "0")}</span><s.icon className="size-4 text-muted" aria-hidden="true" /></div>
              <div><h3 className="font-semibold">{s.title}</h3><p className="mt-1.5 text-sm leading-relaxed text-muted">{s.text}</p></div>
            </li>
          ))}
        </ol>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="card flex items-center gap-6 p-6">
            <FundingDonut verified={62} submitted={14} target={120} size={120} label="received" showLegend={false} />
            <div className="text-sm"><p className="font-semibold">Money, at a glance</p><p className="mt-1 text-muted">Every pool shows what has been received, what is awaiting confirmation and what is still needed. Members see the same ring you do.</p></div>
          </div>
          <div className="card-2 flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
            <div className="text-sm"><p className="font-semibold">Nothing to install, nothing to learn</p><p className="mt-1 text-muted">Members do not need an account. A link and a wallet are enough. The organiser keeps the money, the lab keeps the science, Testmedaddy keeps the record.</p></div>
            <Link href="/how-it-works" className="shrink-0"><Button tone="outline" size="sm">Full guide <ArrowUpRight className="size-3.5" /></Button></Link>
          </div>
        </div>
      </Section>

      {/* 02 Labs */}
      <Section id="labs" number="02" label="Labs" title="Choose your testing lab." lead="Set the lab for your pool, or choose a different provider for each test. You can also add another lab.">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {TESTING_LABS.map(lab => (
            <a key={lab.name} href={lab.website} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${lab.name} website (opens in a new tab)`} className="card group flex min-w-0 flex-col justify-between gap-6 p-5 transition hover:border-brand/40 hover:bg-brand-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg font-semibold tracking-tight text-night sm:text-xl">{lab.name}</span>
                <ArrowUpRight className="size-4 shrink-0 text-muted transition group-hover:text-brand" aria-hidden="true" />
              </div>
              <span className="break-all text-xs text-muted">{lab.domain}</span>
            </a>
          ))}
        </div>
      </Section>

      {/* 03 Why */}
      <Section id="why" number="03" label="Why Testmedaddy" title="Independent of every vendor and every lab." lead="Anyone can host a lab test for a peptide batch, split the cost with their community and publish the results, without a vendor or a middleman in the way.">
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr_1fr]">
          <div className="relative flex min-h-[320px] flex-col justify-between gap-5 overflow-hidden rounded-[1.25rem] bg-[#eeede7] p-8">
            <h3 className="relative z-10 text-2xl font-semibold text-[#1c2524] sm:max-w-[46%]">Payments verified on-chain</h3>
            <p className="relative z-10 text-sm text-[#515d55] sm:max-w-[44%]">Members pay your wallet in USDT, USDC, ETH, SOL or BTC. Testmedaddy checks the transaction on the chain and marks them paid, no screenshots to chase.</p>
            <PaymentsArt className="mt-6 h-44 w-full sm:absolute sm:inset-y-0 sm:right-0 sm:mt-0 sm:h-full sm:w-[50%]" />
          </div>
          <div className="flex min-h-[320px] flex-col justify-between rounded-[1.25rem] bg-[#1c2524] p-8 text-[#f8f7f0]">
            <div className="flex items-center justify-between"><h3 className="text-2xl font-semibold">Results you control</h3><Lock className="size-4 text-[#9db5a8]" aria-hidden="true" /></div>
            <p className="text-sm text-[#c4d0ca]">Public, members only, or behind a password. Every result also lands on the vendor's page, where the vendor cannot edit or hide it.</p>
          </div>
          <div className="flex min-h-[320px] flex-col justify-between rounded-[1.25rem] bg-[#29342e] p-8 text-[#f8f7f0]">
            <div className="flex items-center justify-between"><h3 className="text-2xl font-semibold">Telegram native</h3><Send className="size-4 text-[#9db5a8]" aria-hidden="true" /></div>
            <p className="text-sm text-[#c4d0ca]">Link the pool to your group. Chat, funding updates and results flow both ways, and the bot answers /status.</p>
          </div>
        </div>
      </Section>

      {/* 04 Payments */}
      <Section id="payments" number="04" label="Payments" title="Paid straight to you, confirmed by the chain." lead="No platform balance and no card processor. Members send stablecoins or native coins to the wallets you choose, and the transaction is matched automatically.">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
          <div className="card p-6">
            <p className="text-sm font-semibold">Networks checked automatically</p>
            <ul className="logo-strip mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              {CHAINS.map(c => <li key={c} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />{c}</li>)}
            </ul>
            <p className="mt-5 text-xs text-muted">USDT and USDC are matched to the dollar share. ETH, SOL and BTC are quoted at the live price when a member pays, and that exact amount is what the chain check looks for.</p>
          </div>
          <div className="card-2 p-6">
            <p className="text-sm font-semibold">Also accepted</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4"><dt className="font-medium">AnonPay</dt><dd className="max-w-[60%] text-right text-muted">Card or any coin, converted into your wallet and confirmed automatically.</dd></div>
              <div className="flex items-start justify-between gap-4"><dt className="font-medium">Revolut and PayPal</dt><dd className="max-w-[60%] text-right text-muted">Members upload a screenshot; you confirm it with one click.</dd></div>
            </dl>
            <p className="mt-5 text-xs text-muted">Platform fee: 0% while we are getting started.</p>
          </div>
        </div>
      </Section>

      {/* 05 Use cases */}
      <Section id="use-cases" number="05" label="Use cases" title="One pool, three audiences." lead="The person who organises it, the people who pay for it, and the group they all live in.">
        <div className="grid gap-4 lg:grid-cols-3">
          {USE_CASES.map(u => (
            <div key={u.title} className="card flex flex-col overflow-hidden">
              <figure className="relative overflow-hidden bg-[#e7e8e3]">
                <u.Art className="relative block aspect-[3/2] w-full" />
                <figcaption className="border-t border-[#d4d8d0] bg-[#eeede7] px-5 py-2.5 text-[10px] font-medium uppercase tracking-[0.16em] text-[#3d5146]">{u.method}</figcaption>
              </figure>
              <div className="flex flex-1 flex-col gap-4 p-6">
                <h3 className="text-xl font-semibold">{u.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{u.text}</p>
                <Link href={u.href} className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-fg hover:text-brand"><span className="flex size-7 items-center justify-center rounded-full border border-line"><ArrowRight className="size-3.5" /></span>{u.cta}</Link>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 06 Open pools */}
      <Section id="pools" number="06" label="Open pools" title="Live right now." action={<Link href="/explore"><Button tone="outline" size="sm">See all pools <ArrowUpRight className="size-3.5" /></Button></Link>}>
        {pools.data?.pools?.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{pools.data.pools.slice(0, 6).map(p => <PoolCard key={p.id} pool={p} />)}</div>
        ) : (
          <div className="card-2 p-12 text-center text-muted">No open pools right now. <Link href={hostHref} className="font-medium text-fg hover:text-brand">Be the first to host one.</Link></div>
        )}
      </Section>

      {/* Closing call */}
      <section className="lab-cta relative overflow-hidden rounded-[2rem] border border-[#d5d9cf] bg-[#e9ebe2] px-8 py-12 text-[#1c2524] sm:px-12 sm:py-16">
        <div className="grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
          <div className="space-y-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#526b5b]">From sample to result</p>
            <h2 className="display max-w-md text-3xl sm:text-5xl">Know what is in the vial.</h2>
            <p className="max-w-md text-[15px] leading-relaxed text-[#515d55]">Create an account, choose your lab and fund your first test together. Free while we are getting started.</p>
            <div className="flex flex-wrap gap-3"><Link href={hostHref}><Button className="bg-[#24362f] text-white hover:bg-[#17251f]">Get started</Button></Link><Link href="/how-it-works"><Button tone="outline" className="border-[#a8b4a7] bg-transparent text-[#24362f] hover:border-[#24362f] hover:text-[#17251f]">How it works</Button></Link></div>
          </div>
          <div className="space-y-5 border-t border-[#c7ccc5] pt-6 md:border-l md:border-t-0 md:pl-10 md:pt-0">
            <p className="text-sm font-medium">Your pool. Your lab.</p>
            <LabNames />
            <p className="text-xs leading-relaxed text-[#515d55]">HPLC, mass spectrometry and endotoxin testing.<br />Choose the provider and tests for your batch.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
