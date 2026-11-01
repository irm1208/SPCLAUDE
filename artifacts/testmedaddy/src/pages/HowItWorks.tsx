import { Link } from "wouter";
import { Page } from "@/components/Layout";
import { Button } from "@/components/ui";

const SECTIONS = [
  { title: "For organisers", items: [
    "Create an account and add your payout methods once. They are copied onto every pool you host.",
    "Create a pool: pick (or add) the vendor and batch, choose the tests and lab, set the price of each test, shipping and an optional tip for your time.",
    "Choose how the cost is split: evenly across the number of members you expect, or a fixed share per person.",
    "Set who can see the pool (public, unlisted, invite-only with an access code) and who can see the results (everyone, verified members, or anyone with the results password).",
    "Open the pool and share the link. Members join, pay you directly and the platform confirms crypto and AnonPay payments on-chain. You confirm Revolut and PayPal screenshots.",
    "Once funded, ship the vials, add chain-of-custody photos, mark the pool at the lab, then post the results and the PDF report.",
  ] },
  { title: "For members", items: [
    "Open a pool link. Invite-only pools ask for the organiser's access code.",
    "Join with your account, or as a guest with an email or Telegram handle. You can stay anonymous on the member list.",
    "Pay your share with one of the organiser's methods. Paste the transaction hash or upload a screenshot. You will see when it is confirmed.",
    "Chat with the organiser and other members inside the pool. Announcements and status changes land in your inbox and email.",
    "When results are published you see them on the pool page and on the vendor's page.",
  ] },
  { title: "Trust and money", items: [
    "Testmedaddy never holds funds in this version: members pay organisers directly, and the platform only verifies that the payment happened.",
    "Vendors get a page with every batch tested and every public result, but they cannot edit, hide or respond to results.",
    "Organisers build a public track record: pools completed, time to results, members served.",
    "Volatile coins such as ETH, SOL and BTC are quoted at the live price when a member pays, and that exact amount is what the chain check looks for.",
  ] },
];

export default function HowItWorks() {
  return (
    <Page title="How it works" subtitle="Community-funded lab testing without a middleman holding the money.">
      <div className="grid gap-6 lg:grid-cols-3">
        {SECTIONS.map(s => (
          <section key={s.title} className="card p-6">
            <h2 className="mb-4 text-lg font-semibold">{s.title}</h2>
            <ol className="space-y-3 text-sm text-muted">{s.items.map((t, i) => <li key={i} className="flex gap-3"><span className="mono mt-0.5 text-xs text-brand">{String(i + 1).padStart(2, "0")}</span><span>{t}</span></li>)}</ol>
          </section>
        ))}
      </div>
      <div className="flex gap-3"><Link href="/signup"><Button>Create an account</Button></Link><Link href="/explore"><Button tone="outline">Browse pools</Button></Link></div>
    </Page>
  );
}
