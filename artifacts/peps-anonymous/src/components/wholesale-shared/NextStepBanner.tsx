import { ArrowRight, CheckCircle2, Compass, Sparkles } from "lucide-react";
import type { GuidePlan, GuideStep, GuideTarget } from "./next-step";

interface NextStepBannerProps {
  plan: GuidePlan;
  onAction: (target: GuideTarget) => void;
  onOpenGuide: () => void;
  copiedInvite?: boolean;
}

// Always-on, role + stage aware "your next step" strip. Shows the single most
// relevant action for the current member, plus a "Guide me" button that opens the
// full wizard. Positive states when nothing is pending.
export function NextStepBanner({ plan, onAction, onOpenGuide, copiedInvite }: NextStepBannerProps) {
  if (plan.stage === "cancelled") return null; // the page already shows a cancelled banner

  const current: GuideStep | null = plan.currentId ? plan.steps.find(s => s.id === plan.currentId) ?? null : null;

  // An outstanding action (including unpaid direct fees) always wins over any
  // "all done" message — so we never tell someone they're set while money is owed.
  if (!current) {
    if (plan.stage === "done") {
      return (
        <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3" style={{ background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.25)" }}>
          <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "#15803d" }} />
          <div className="min-w-0">
            <p className="text-sm font-bold" style={{ color: "#15803d" }}>Order placed</p>
            <p className="text-xs" style={{ color: "var(--t-muted)" }}>Everyone has paid — the parcel is on its way to the vendor.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3" style={{ background: "var(--t-blue-08)", border: "1px solid var(--t-blue-25)" }}>
        <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "var(--t-blue)" }} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>You're all set</p>
          <p className="text-xs" style={{ color: "var(--t-muted)" }}>Nothing to do right now — waiting on the rest of the group.</p>
        </div>
        <button onClick={onOpenGuide} className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--t-blue)" }}>
          <Compass className="w-3.5 h-3.5" /> Guide me
        </button>
      </div>
    );
  }

  const isInvite = current.cta?.target.kind === "copyInvite";
  const ctaLabel = isInvite && copiedInvite ? "Link copied!" : current.cta?.label;

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--t-blue-08)", border: "1px solid var(--t-blue-25)" }}>
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-9 h-9 rounded-xl inline-flex items-center justify-center" style={{ background: "var(--t-blue)", color: "#fff" }}>
          <Sparkles className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--t-blue)" }}>Your next step</p>
          <p className="text-sm font-bold mt-0.5" style={{ color: "var(--t-text)" }}>{current.title}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--t-muted)" }}>{current.description}</p>
          {current.blocked && current.note && (
            <p className="text-xs mt-1 font-medium" style={{ color: "#a16207" }}>{current.note}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {current.cta && (
          <button
            onClick={() => onAction(current.cta!.target)}
            className="inline-flex items-center gap-1.5 px-3.5 h-10 rounded-xl text-sm font-bold text-white"
            style={{ background: "var(--t-blue)" }}
          >
            {ctaLabel}
            {!isInvite && <ArrowRight className="w-4 h-4" />}
          </button>
        )}
        <button onClick={onOpenGuide} className="inline-flex items-center gap-1.5 px-3 h-10 rounded-xl text-sm font-semibold" style={{ background: "var(--t-surface)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}>
          <Compass className="w-4 h-4" /> Guide me
        </button>
      </div>
    </div>
  );
}
