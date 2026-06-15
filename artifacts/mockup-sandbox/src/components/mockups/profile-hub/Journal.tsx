import { Sunrise, ArrowUpRight, Bell, Sparkles } from "lucide-react";
import { Shell } from "./Shell";

// OPPOSITE OF: cold admin cards + UPPERCASE dashboard sections + numbers-as-hero.
// This variant rewrites the hub as a morning-journal / home page that
// addresses the member in the second person, folds the metrics into
// sentences, and ends every passage with a next action. Single-column
// reading flow; numbers never appear alone.

export function Journal() {
  return (
    <Shell>
      <section
        className="px-6 pb-10"
        style={{ maxWidth: 640, margin: "0 auto" }}
      >
        {/* Date + greeting */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <Sunrise className="w-3.5 h-3.5 text-amber-500" />
          <span>Wednesday, 16 April · 7:42 am</span>
        </div>

        <p
          className="mt-5 leading-[1.6]"
          style={{
            fontFamily: "'Newsreader', Georgia, serif",
            fontSize: 22,
            color: "#0F172A",
            letterSpacing: "-0.005em",
          }}
        >
          It's quiet this morning — you have{" "}
          <Inline color="#2E5BFF" strong>
            3 group buys running
          </Inline>
          , one of them,{" "}
          <Inline color="#2E5BFF">Tirzepatide 10 mg with Uther</Inline>, closes
          in{" "}
          <Inline color="#DC2626" strong>
            4 days
          </Inline>
          .{" "}
          <Inline muted>You've already joined that one.</Inline>
        </p>

        {/* Inline, prescriptive blocks */}
        <Block
          tag="Orders"
          accent="#2E5BFF"
          headline={
            <>
              <Inline strong>Three vials</Inline> are out for delivery this
              week, including your first batch of{" "}
              <Inline>retatrutide</Inline>.
            </>
          }
          body={
            <>
              Your most recent order, <b>#1182</b>, was dropped off two days
              early — the courier&apos;s notes say the parcel was left at the
              back porch. Twelve total orders on the account since you joined
              in November.
            </>
          }
          cta="Track parcels"
        />

        <Block
          tag="Blood work"
          accent="#B45309"
          headline={
            <>
              It&apos;s been <Inline strong>47 days</Inline> since your last
              panel. We&apos;d re-test by week&apos;s end.
            </>
          }
          body={
            <>
              You&apos;ve logged <b>0</b> results this cycle — but on your
              protocol (semaglutide, week 8 of 12) we&apos;d expect fasting
              glucose and an HbA1c read roughly every six weeks. Members in
              your cohort have re-tested this week on average.
            </>
          }
          cta="Order a home panel"
        />

        <Block
          tag="Your log"
          accent="#047857"
          headline={
            <>
              No GLP-1 entries yet today. Yesterday you logged{" "}
              <Inline strong>2.5 mg semaglutide</Inline>.
            </>
          }
          body={
            <>
              You&apos;re on a Tuesday / Saturday schedule. If you want, we can
              nudge you tonight around <b>8:00 pm</b> — same as last week.
            </>
          }
          cta="Log today's dose"
        />

        {/* Soft footer — the numbers live here as a quiet caption */}
        <div
          className="mt-10 pt-5 flex items-center justify-between text-[11px] text-slate-500"
          style={{ borderTop: "1px solid #E5E7EB" }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-slate-400" />
            <span>
              12 orders · 3 active buys · 47 days since last test · 1 dose
              today
            </span>
          </div>
          <button className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900">
            See the numbers view
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </section>
    </Shell>
  );
}

function Inline({
  children,
  color,
  strong,
  muted,
}: {
  children: React.ReactNode;
  color?: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <span
      style={{
        color: muted ? "#94A3B8" : color ?? "inherit",
        fontWeight: strong ? 600 : undefined,
      }}
    >
      {children}
    </span>
  );
}

function Block({
  tag,
  accent,
  headline,
  body,
  cta,
}: {
  tag: string;
  accent: string;
  headline: React.ReactNode;
  body: React.ReactNode;
  cta: string;
}) {
  return (
    <div className="mt-8">
      <div className="flex items-center gap-2">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: accent }}
        />
        <span
          className="text-[10px] tracking-[0.25em] uppercase font-semibold"
          style={{ color: accent }}
        >
          {tag}
        </span>
      </div>
      <p
        className="mt-2 leading-[1.5]"
        style={{
          fontFamily: "'Newsreader', Georgia, serif",
          fontSize: 19,
          color: "#0F172A",
          letterSpacing: "-0.005em",
        }}
      >
        {headline}
      </p>
      <p className="mt-2 text-[13px] leading-[1.65] text-slate-600">
        {body}
      </p>
      <button
        className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold"
        style={{ color: accent }}
      >
        {cta}
        <ArrowUpRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// Unused import guard — kept so that if the user wants, a bell icon is
// available to slot into the header without another dependency round-trip.
void Bell;
