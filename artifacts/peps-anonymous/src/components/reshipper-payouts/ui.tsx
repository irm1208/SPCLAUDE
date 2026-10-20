import React from "react";

export const card: React.CSSProperties = { background: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text)" };
export const subtle: React.CSSProperties = { color: "var(--t-subtle)" };
export const inputCls = "w-full min-h-[40px] rounded-lg border px-3 py-2 text-sm bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--t-blue)]";
export const inputStyle: React.CSSProperties = { borderColor: "var(--t-border)", color: "var(--t-text)", background: "var(--t-surface)" };
export const primaryBtn = "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
export const primaryStyle: React.CSSProperties = { background: "var(--t-blue-deep, #1B3A7A)" };
export const ghostBtn = "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-dashed px-4 text-sm font-medium disabled:opacity-50";

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-widest" style={subtle}>{children}</p>;
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div role="alert" className="rounded-xl border p-3 text-sm flex flex-wrap items-center justify-between gap-2"
    style={{ borderColor: "#ef4444", background: "color-mix(in srgb, #ef4444 7%, var(--t-surface))", color: "var(--t-text)" }}>
    <span>{message}</span>
    {onRetry && <button type="button" onClick={onRetry} className="text-sm font-semibold underline">Retry</button>}
  </div>;
}

export function Skeleton() {
  return <div aria-busy="true" aria-label="Loading payouts" className="space-y-3">
    {[0, 1, 2].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "color-mix(in srgb, var(--t-blue) 8%, var(--t-surface))" }} />)}
  </div>;
}
