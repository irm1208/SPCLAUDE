import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, Lock } from "lucide-react";

interface WizardShellProps {
  stepIndex: number; // 0-based index of the current step
  stepCount: number;
  icon: ReactNode;
  title: string;
  instruction: string;
  note?: string; // shown when the step is blocked / waiting on something
  done?: boolean;
  optional?: boolean;
  children: ReactNode; // the step body
  onBack?: () => void; // omit to disable the Back button
  onNext?: () => void; // omit to hide the Next button (e.g. last step)
  nextLabel?: string;
}

// Presentational wizard chrome: progress bar, step header with a plain-language
// instruction, the step body, and Back/Next navigation. Holds no business logic —
// the page decides what each step shows and how navigation behaves.
export function WizardShell({
  stepIndex,
  stepCount,
  icon,
  title,
  instruction,
  note,
  done,
  optional,
  children,
  onBack,
  onNext,
  nextLabel = "Next",
}: WizardShellProps) {
  const pct = stepCount > 0 ? Math.round(((stepIndex + 1) / stepCount) * 100) : 0;

  return (
    <section className="space-y-4">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider" style={{ color: "#8A9AAA" }}>
          <span>Step {stepIndex + 1} of {stepCount}</span>
          <span className="flex items-center gap-2">
            {optional && (
              <span className="px-2 py-0.5 rounded-full" style={{ background: "var(--t-surface2)", color: "var(--t-muted)" }}>Optional</span>
            )}
            {done && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.12)", color: "#15803d" }}>
                <Check className="w-3 h-3" /> Done
              </span>
            )}
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--t-surface2)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, background: "var(--t-blue)" }}
          />
        </div>
      </div>

      {/* Step header */}
      <div className="flex items-start gap-3">
        <span
          className="shrink-0 w-10 h-10 rounded-xl inline-flex items-center justify-center"
          style={{ background: "var(--t-blue-08)", color: "var(--t-blue)" }}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-tight" style={{ color: "var(--t-text)" }}>{title}</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--t-muted)" }}>{instruction}</p>
        </div>
      </div>

      {/* Waiting / blocked note */}
      {note && (
        <div
          className="flex items-start gap-2 rounded-xl p-3 text-sm"
          style={{ background: "rgba(234,179,8,0.10)", border: "1px solid rgba(234,179,8,0.30)", color: "#a16207" }}
        >
          <Lock className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{note}</span>
        </div>
      )}

      {/* Step body */}
      <div className="space-y-4">{children}</div>

      {/* Navigation */}
      {(onBack || onNext) && (
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onBack}
            disabled={!onBack}
            className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl text-sm font-semibold disabled:opacity-40"
            style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl text-sm font-bold text-white"
              style={{ background: "var(--t-blue)" }}
            >
              {nextLabel} <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
