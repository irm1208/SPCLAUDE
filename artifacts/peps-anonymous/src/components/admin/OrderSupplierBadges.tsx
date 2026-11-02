import React from "react";
export function OrderSupplierBadges({ labels = [] }: { labels?: string[] }) {
  return <span className="inline-flex flex-wrap items-center gap-1" aria-label="Order suppliers">
    {[...new Set(labels)].map(label => <span key={label} title={`Supplier: ${label}`}
      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 whitespace-nowrap">
      {label}
    </span>)}
  </span>;
}
