import { MAX_TRACKING_NUMBERS, type TrackingPackage } from "@workspace/shipping/tracking";
import { Link2, Plus, Trash2, Unlink } from "lucide-react";
import { ALL_CARRIERS_17TRACK } from "@/data/carriers17track";
import { newTrackingPackage, trackingPackageErrors } from "./admin-tracking-model";

const PRIORITY_COURIERS = [
  ["GLY", "GLY"],
  ["YunExpress", "YunExpress"],
  ["bmurfs", "BMURFS Express"],
  ["other", "Other / auto-detect"],
] as const;

const PRIORITY_LABELS = new Set(PRIORITY_COURIERS.map(([, label]) => label.toLowerCase()));
const OTHER_17TRACK_COURIERS = [...new Set(ALL_CARRIERS_17TRACK)].filter(
  carrier => !PRIORITY_LABELS.has(carrier.toLowerCase()),
);

export function TrackingPackageEditor({
  value,
  onChange,
  compact = false,
}: {
  value: TrackingPackage[];
  onChange: (packages: TrackingPackage[]) => void;
  compact?: boolean;
}) {
  const trackingNumberCount = value.reduce((count, pkg) => count + 1 + (pkg.localTrackingNumber ? 1 : 0), 0);
  const update = (id: string, patch: Partial<TrackingPackage>) =>
    onChange(value.map(pkg => pkg.id === id ? { ...pkg, ...patch } : pkg));

  const unpair = (pkg: TrackingPackage) => {
    if (!pkg.localTrackingNumber) return;
    onChange([
      ...value.map(current => current.id === pkg.id ? { ...current, localTrackingNumber: null } : current),
      newTrackingPackage(pkg.localTrackingNumber, "other"),
    ]);
  };

  const pair = (bmurfs: TrackingPackage, localId: string) => {
    const local = value.find(pkg => pkg.id === localId);
    if (!local) return;
    onChange(value
      .filter(pkg => pkg.id !== localId)
      .map(pkg => pkg.id === bmurfs.id
        ? { ...pkg, localTrackingNumber: local.internationalTrackingNumber }
        : pkg));
  };

  const errors = trackingPackageErrors(value);
  return (
    <div className="space-y-2">
      {value.map((pkg, index) => {
        const bmurfs = pkg.courier.toLowerCase() === "bmurfs";
        const pairCandidates = bmurfs && !pkg.localTrackingNumber
          ? value.filter(candidate =>
              candidate.id !== pkg.id &&
              !candidate.localTrackingNumber &&
              candidate.internationalTrackingNumber.trim())
          : [];
        return (
          <div key={pkg.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#1B3A7A]">Package {index + 1}</span>
              <button type="button" onClick={() => onChange(value.filter(current => current.id !== pkg.id))}
                className="text-slate-400 hover:text-red-500" aria-label={`Remove package ${index + 1}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className={compact ? "grid gap-2 sm:grid-cols-2" : "space-y-2"}>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Courier
                <select value={pkg.courier} onChange={event => update(pkg.id, { courier: event.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800">
                  {!PRIORITY_COURIERS.some(([code]) => code === pkg.courier) &&
                    !OTHER_17TRACK_COURIERS.includes(pkg.courier) &&
                    <option value={pkg.courier}>{pkg.courier}</option>}
                  <optgroup label="Common couriers">
                    {PRIORITY_COURIERS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                  </optgroup>
                  <optgroup label="All 17TRACK couriers">
                    {OTHER_17TRACK_COURIERS.map(carrier => <option key={carrier} value={carrier}>{carrier}</option>)}
                  </optgroup>
                </select>
              </label>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                International tracking
                <input value={pkg.internationalTrackingNumber}
                  onChange={event => update(pkg.id, { internationalTrackingNumber: event.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 font-mono text-xs"
                  placeholder="International tracking number" />
              </label>
            </div>
            {(bmurfs || pkg.localTrackingNumber) && (
              <div className={!bmurfs && pkg.localTrackingNumber ? "rounded-lg border border-red-200 bg-red-50 p-2" : ""}>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Local courier tracking <span className="normal-case font-normal">(optional, BMURFS only)</span>
                  <input value={pkg.localTrackingNumber ?? ""}
                    onChange={event => update(pkg.id, { localTrackingNumber: event.target.value || null })}
                    disabled={!bmurfs}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 font-mono text-xs disabled:bg-slate-100"
                    placeholder="Add when BMURFS supplies it" />
                </label>
                {pkg.localTrackingNumber && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => update(pkg.id, { localTrackingNumber: null })}
                      className="text-[10px] font-semibold text-red-600 hover:underline">Remove local number</button>
                    <button type="button" onClick={() => unpair(pkg)}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#2D6BCC] hover:underline">
                      <Unlink className="h-3 w-3" /> Split into separate package
                    </button>
                  </div>
                )}
              </div>
            )}
            {pairCandidates.length > 0 && (
              <label className="flex items-center gap-2 text-[10px] font-semibold text-[#2D6BCC]">
                <Link2 className="h-3 w-3" /> Pair an existing number as local
                <select defaultValue="" onChange={event => { if (event.target.value) pair(pkg, event.target.value); }}
                  className="h-8 min-w-0 flex-1 rounded-lg border border-blue-200 bg-white px-2 font-mono text-xs">
                  <option value="">Choose existing unpaired package…</option>
                  {pairCandidates.map(candidate => (
                    <option key={candidate.id} value={candidate.id}>{candidate.internationalTrackingNumber}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        );
      })}
      <button type="button" onClick={() => onChange([...value, newTrackingPackage()])}
        disabled={trackingNumberCount >= MAX_TRACKING_NUMBERS}
        className="flex items-center gap-1 text-[11px] font-semibold text-[#2D6BCC] hover:underline disabled:cursor-not-allowed disabled:opacity-40">
        <Plus className="h-3.5 w-3.5" /> Add physical package
      </button>
      {errors.length > 0 && (
        <ul className="space-y-0.5 text-[11px] text-red-600" role="alert">
          {errors.map(error => <li key={error}>{error}</li>)}
        </ul>
      )}
    </div>
  );
}
