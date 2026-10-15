import { Check } from "lucide-react";
import { GB_STAGES, GB_STAGE_LABEL, formatUpdateDate, stepStates, type GbStage } from "@/lib/group-buy-updates";

type Tone = "light" | "dark";
const TONES = {
  light: { done: "#1B3A7A", current: "#2D6BCC", idle: "#D0DAE4", text: "var(--t-text, #0F1F38)", muted: "var(--t-muted, #6B7280)", ring: "rgba(45,107,204,0.22)" },
  dark: { done: "#5B8BE0", current: "#E9A020", idle: "rgba(255,255,255,0.16)", text: "#FFFFFF", muted: "rgba(255,255,255,0.6)", ring: "rgba(233,160,32,0.25)" },
};

/** Full six-stage tracker. Stacks vertically on small screens, grid on wider ones; never a clipped row. */
export function GroupBuyProgressTracker({ stage, stageUpdatedAt, tone = "light" }: { stage: GbStage | undefined; stageUpdatedAt?: string | null; tone?: Tone }) {
  const c = TONES[tone];
  const states = stepStates(stage);
  const statusText = stage ? `Group buy stage: ${GB_STAGE_LABEL[stage]}` : "Loading group buy stage";
  return (
    <div data-testid="gb-progress-tracker">
      <p className="sr-only" aria-live="polite">{statusText}</p>
      <ol aria-label="Group buy progress" className="grid grid-cols-1 sm:grid-cols-6 gap-0 sm:gap-1">
        {GB_STAGES.map((s, i) => {
          const st = states[i];
          const dot = st === "complete" ? c.done : st === "current" ? c.current : "transparent";
          const lineDone = states[i + 1] && states[i + 1] !== "upcoming";
          return (
            <li key={s} aria-current={st === "current" ? "step" : undefined} data-testid={`gb-stage-${s}`} data-state={st}
              className="relative flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 pb-3 sm:pb-0 min-w-0">
              {i < GB_STAGES.length - 1 && (
                <>
                  <span aria-hidden className="sm:hidden absolute left-[11px] top-6 bottom-0 w-[2px]" style={{ background: lineDone ? c.done : c.idle }} />
                  <span aria-hidden className="hidden sm:block absolute top-[11px] left-7 right-1 h-[2px] rounded" style={{ background: lineDone ? c.done : c.idle }} />
                </>
              )}
              <span className="relative z-10 w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold"
                style={{ background: dot, border: `2px solid ${st === "upcoming" ? c.idle : dot}`, color: st === "upcoming" ? c.muted : "#fff", boxShadow: st === "current" ? `0 0 0 4px ${c.ring}` : undefined }}>
                {st === "complete" ? <Check className="w-3.5 h-3.5" aria-hidden /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] sm:text-[12px] leading-tight" style={{ color: st === "upcoming" ? c.muted : c.text, fontWeight: st === "current" ? 700 : 500 }}>
                  {GB_STAGE_LABEL[s]}
                </span>
                <span className="block text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: st === "current" ? c.current : c.muted }}>
                  {st === "current" ? "Current stage" : st === "complete" ? "Done" : ""}
                  <span className="sr-only">{st === "upcoming" ? "Upcoming" : ""}</span>
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      {!stage && <div className="h-1 mt-2 rounded animate-pulse" style={{ background: c.idle }} aria-hidden />}
      {stage && stageUpdatedAt && (
        <p className="text-[11px] mt-2" style={{ color: c.muted }} data-testid="text-stage-updated">Stage set {formatUpdateDate(stageUpdatedAt)}</p>
      )}
    </div>
  );
}

/** Compact dark-surface indicator for cards and table rows. */
export function GroupBuyProgressCompact({ stage, gbId, dense = false }: { stage: GbStage | undefined; gbId: string; dense?: boolean }) {
  const states = stepStates(stage);
  const label = stage ? GB_STAGE_LABEL[stage] : "Loading";
  return (
    <div data-testid={`gb-progress-compact-${gbId}`} className="min-w-0" role="group" aria-label={`Group buy stage: ${label}`}>
      <ol className="flex items-center gap-1" aria-hidden>
        {GB_STAGES.map((s, i) => (
          <li key={s} className={`h-1.5 ${dense ? "w-3" : "flex-1"} rounded-full ${!stage ? "animate-pulse" : ""}`}
            style={{ background: states[i] === "complete" ? "#5B8BE0" : states[i] === "current" ? "#E9A020" : "rgba(255,255,255,0.14)" }} />
        ))}
      </ol>
      <p className="mt-1 text-[11px] truncate" style={{ color: "rgba(255,255,255,0.75)" }}>
        <span style={{ color: "rgba(255,255,255,0.5)" }}>{dense ? "" : "Group stage: "}</span>
        <span className="font-semibold" style={{ color: stage ? "#F5C25B" : "rgba(255,255,255,0.5)" }}>{label}</span>
        {stage && <span className="sr-only">, step {states.indexOf("current") + 1} of 6</span>}
      </p>
    </div>
  );
}
