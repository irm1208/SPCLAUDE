import React, { useRef } from "react";
import { Search, X } from "lucide-react";

export function WholesaleProductSearch({ value, onChange }: {
  value: string;
  onChange: (value: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="whj-floating-search" role="search" aria-label="Supplier catalogue">
      <Search size={19} aria-hidden="true" />
      <input ref={input} type="search" aria-label="Search supplier products"
        placeholder="Search products…" value={value} onChange={event => onChange(event.target.value)}
        onKeyDown={event => { if (event.key === "Escape") onChange(""); }} />
      {value && <button type="button" aria-label="Clear product search" onClick={() => { onChange(""); input.current?.focus(); }}>
        <X size={18} aria-hidden="true" />
      </button>}
    </div>
  );
}
