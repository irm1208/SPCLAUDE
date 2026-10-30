import React from "react";
import { CARRIERS_17TRACK } from "@/lib/carriers";

const carrierOptions = [...new Map(CARRIERS_17TRACK.map(c => [c.code, c])).values()]
  .filter(c => c.code !== 0)
  .sort((a, b) => a.label.localeCompare(b.label));

/** Keep the numeric provider identity while displaying human-readable names. */
export function SupplierCarrierSelect({
  value, onChange, ...props
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  const known = CARRIERS_17TRACK.some(c => String(c.code) === value);
  return (
    <select {...props} value={value} onChange={e => onChange(e.target.value)}>
      <option value="0">Auto-detect</option>
      {!known && <option value={value}>Existing carrier ({value})</option>}
      {carrierOptions.map(c => <option key={c.code} value={String(c.code)}>{c.label}</option>)}
    </select>
  );
}
