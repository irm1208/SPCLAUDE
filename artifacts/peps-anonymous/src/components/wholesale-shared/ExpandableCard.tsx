import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface ExpandableCardProps {
  title: ReactNode;
  summary?: ReactNode;
  defaultOpen?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

export function ExpandableCard({ title, summary, defaultOpen = false, icon, children }: ExpandableCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 font-bold text-sm" style={{ color: "var(--t-text)" }}>
          {icon}
          {title}
        </span>
        <span className="flex items-center gap-2 text-sm" style={{ color: "var(--t-muted)" }}>
          {summary}
          <ChevronDown className="w-4 h-4 transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }} />
        </span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
