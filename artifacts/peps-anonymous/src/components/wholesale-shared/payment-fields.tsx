import { useState } from "react";
import { Loader2, CheckCircle2, Clock, Check, Copy } from "lucide-react";

export function FeeLine({ label, amount, paid, canConfirm, busy, onToggle }: {
  label: string; amount: string; paid: boolean; canConfirm: boolean; busy: boolean; onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs" style={{ color: "var(--t-muted)" }}>{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{amount}</span>
        {canConfirm ? (
          <button
            onClick={onToggle}
            disabled={busy}
            className="inline-flex items-center gap-1 px-2 h-7 rounded-lg text-[11px] font-bold border disabled:opacity-50"
            style={paid
              ? { background: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.30)", color: "#15803d" }
              : { background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-muted)" }}
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : paid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {paid ? "Paid" : "Mark paid"}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 h-7 rounded-lg text-[11px] font-bold"
            style={paid
              ? { background: "rgba(34,197,94,0.12)", color: "#15803d" }
              : { background: "rgba(234,179,8,0.12)", color: "#a16207" }}>
            {paid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {paid ? "Paid" : "Unpaid"}
          </span>
        )}
      </div>
    </div>
  );
}

// A labelled, tap-to-copy payment detail (wallet address, PayPal handle, etc.).
export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable — ignore */ }
  };
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--t-muted)" }}>{label}</p>
        <p className="text-xs font-mono break-all" style={{ color: "var(--t-text)" }}>{value}</p>
      </div>
      <button
        onClick={copy}
        className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg border"
        style={{ background: "var(--t-surface)", borderColor: "var(--t-border)", color: copied ? "#15803d" : "var(--t-muted)" }}
        title={`Copy ${label}`}
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}
