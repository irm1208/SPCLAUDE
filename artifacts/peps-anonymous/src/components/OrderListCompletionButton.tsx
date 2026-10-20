import React from "react";
import { ArchiveRestore, CheckCircle2, Loader2 } from "lucide-react";

export function OrderListCompletionButton({ completed, pending, onClick }: {
  completed: boolean; pending: boolean; onClick: () => void;
}) {
  const Icon = pending ? Loader2 : completed ? ArchiveRestore : CheckCircle2;
  return (
    <button type="button" onClick={onClick} disabled={pending}
      className="mt-2 w-full min-h-10 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
      style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}
      title="Organise your personal order list only. Payment and delivery statuses are unchanged.">
      <Icon className={`w-3.5 h-3.5 ${pending ? "animate-spin" : ""}`} />
      {pending ? "Saving…" : completed ? "Restore to active orders" : "Mark as completed"}
    </button>
  );
}
