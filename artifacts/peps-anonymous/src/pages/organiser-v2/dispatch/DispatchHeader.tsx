import { ClipboardCheck, History, Radio, RefreshCw } from "lucide-react";
import type { DispatchView } from "./types";

interface DispatchHeaderProps {
  view: DispatchView;
  lastRefreshed: Date;
  onViewChange: (view: DispatchView) => void;
  onRefresh: () => void;
}

export default function DispatchHeader({ view, lastRefreshed, onViewChange, onRefresh }: DispatchHeaderProps) {
  return (
    <header className="flex flex-col gap-4 rounded-xl border bg-white p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between" style={{ borderColor: "var(--dispatch-rule)" }}>
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.22em]" style={{ color: "var(--dispatch-green)" }}>
          <Radio className="h-3.5 w-3.5" aria-hidden="true" />
          Fulfilment operations
        </div>
        <h2 className="text-lg font-bold tracking-tight sm:text-xl" style={{ color: "var(--dispatch-ink)" }}>
          Dispatch control desk
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]" style={{ color: "var(--dispatch-muted)" }}>
          <span className="font-semibold" style={{ color: "var(--dispatch-ink)" }}>Winter Peptide Run 2025</span>
          <span className="hidden h-3 w-px sm:block" style={{ background: "var(--dispatch-rule)" }} />
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Updated {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded p-1 transition-colors hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dispatch-green)]"
            aria-label="Refresh dispatch data"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex w-full items-center rounded-lg border p-1 sm:w-auto" style={{ borderColor: "var(--dispatch-rule)", background: "var(--t-surface2)" }}>
        {([
          { id: "desk", label: "Control desk", icon: ClipboardCheck },
          { id: "log", label: "Dispatch log", icon: History },
        ] as const).map(item => {
          const active = view === item.id;
          const Icon = item.icon;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className="dispatch-segment flex min-h-9 flex-1 items-center justify-center gap-2 px-3 text-[13px] font-bold transition-colors first:rounded-l-md last:rounded-r-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dispatch-green)] sm:flex-none"
              style={{
                background: active ? "var(--dispatch-green)" : "transparent",
                color: active ? "#fff" : "var(--dispatch-muted)",
              }}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
