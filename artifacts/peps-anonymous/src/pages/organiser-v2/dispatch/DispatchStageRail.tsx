import { Check, PackageCheck, ScanLine, Send } from "lucide-react";
import type { DispatchStage } from "./types";

interface DispatchStageRailProps {
  active: DispatchStage;
  reachable: DispatchStage[];
  onChange: (stage: DispatchStage) => void;
}

const STAGES = [
  { id: "receive", number: "01", label: "Receive", verb: "Select arrived stock", icon: ScanLine },
  { id: "prepare", number: "02", label: "Prepare", verb: "Build the packing run", icon: PackageCheck },
  { id: "dispatch", number: "03", label: "Dispatch", verb: "Print, notify, send", icon: Send },
] as const;

export default function DispatchStageRail({ active, reachable, onChange }: DispatchStageRailProps) {
  const activeIndex = STAGES.findIndex(stage => stage.id === active);

  return (
    <nav aria-label="Dispatch stages" className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: "var(--dispatch-rule)" }}>
      <div className="grid min-w-[680px] grid-cols-3">
        {STAGES.map((stage, index) => {
          const isActive = active === stage.id;
          const isComplete = index < activeIndex;
          const enabled = reachable.includes(stage.id);
          const Icon = stage.icon;

          return (
            <button
              type="button"
              key={stage.id}
              onClick={() => enabled && onChange(stage.id)}
              disabled={!enabled}
              aria-current={isActive ? "step" : undefined}
              className="dispatch-segment group relative flex min-h-[76px] items-center gap-3 border-r px-5 text-left transition-colors last:border-r-0 disabled:cursor-not-allowed focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--dispatch-green)]"
              style={{
                borderColor: "var(--dispatch-rule)",
                background: isActive ? "var(--dispatch-green)" : isComplete ? "rgba(30,122,92,.07)" : "transparent",
                color: isActive ? "#fff" : enabled ? "var(--dispatch-ink)" : "#9DA7A1",
              }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center border font-mono text-[12px] font-bold"
                style={{
                  borderColor: isActive ? "rgba(255,255,255,.3)" : isComplete ? "var(--dispatch-green)" : "var(--dispatch-rule)",
                  background: isComplete ? "var(--dispatch-green)" : isActive ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.48)",
                  color: isComplete || isActive ? "#fff" : "inherit",
                }}
              >
                {isComplete ? <Check className="h-4 w-4" /> : stage.number}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[14px] font-extrabold uppercase tracking-[0.1em]">
                  {stage.label}
                  <Icon className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
                </span>
                <span className="mt-1 block text-[12px] font-medium opacity-65">{stage.verb}</span>
              </span>
              {isActive && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-[#8ED7B8]" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
