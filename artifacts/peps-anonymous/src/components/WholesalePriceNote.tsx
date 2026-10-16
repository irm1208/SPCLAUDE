import React from "react";

/** Shared customer-facing explanation; never rendered as HTML or truncated. */
export function WholesalePriceNote({ note }: { note?: string | null }) {
  if (!note?.trim()) return null;
  return (
    <p
      className="mt-1 text-xs leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
      style={{ color: "var(--t-muted)" }}
    >
      <span className="font-semibold" style={{ color: "var(--t-blue)" }}>Price note: </span>
      {note}
    </p>
  );
}
