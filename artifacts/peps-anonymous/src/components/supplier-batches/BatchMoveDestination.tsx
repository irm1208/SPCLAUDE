import { useState } from "react";
import type { SupplierBatch } from "@/lib/supplier-batches";

/** Freeze the reviewed destination token; polling must never silently acknowledge a changed batch. */
export function useBatchMoveDestination(source: SupplierBatch, batches: SupplierBatch[]) {
  const [choice, setChoice] = useState({ id: "new", token: "" });
  const countries = (b: SupplierBatch) => [...b.snapshot.region.countries].sort().join(",");
  const candidates = batches.filter(b => b.id !== source.id && b.state === "prepared" && !b.orderedAt
    && !b.exceptions.length && b.snapshot.region.id === source.snapshot.region.id && countries(b) === countries(source));
  const target = candidates.find(b => b.id === choice.id);
  return {
    choice, candidates,
    stale: choice.id !== "new" && (!target || target.snapshot.token !== choice.token),
    label: choice.id === "new" ? "a new prepared batch" : target?.reference ?? "the selected batch",
    payload: choice.id === "new" ? {} : { targetBatchId: choice.id, expectedTargetToken: choice.token },
    select: (id: string) => setChoice({ id, token: candidates.find(b => b.id === id)?.snapshot.token ?? "" }),
  };
}

export function BatchMoveDestination({ destination, busy, testId, onChange }: {
  destination: ReturnType<typeof useBatchMoveDestination>; busy: boolean; testId: string; onChange: () => void;
}) {
  return <div className="space-y-1">
    <label className="block">Destination batch
      <select className="mt-1 w-full rounded-lg border p-2 text-sm" data-testid={testId}
        value={destination.choice.id} disabled={busy}
        onChange={e => { destination.select(e.target.value); onChange(); }}>
        <option value="new">Create a new prepared batch</option>
        {destination.candidates.map(b => <option key={b.id} value={b.id}>
          {b.reference} · {b.snapshot.region.name} · {b.snapshot.kits} kits
        </option>)}
      </select>
    </label>
    <p>Only unsubmitted batches in this region are available. Existing member allocations are kept.</p>
    {destination.stale && <p role="alert" className="text-red-600">
      The destination changed. Select a destination again to review its latest allocation.
    </p>}
  </div>;
}
