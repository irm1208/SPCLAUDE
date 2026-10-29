import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Building2, Package, Pencil, Plus, RefreshCw, Truck } from "lucide-react";
import AdminMultiVendorSetup, { isVendorEnabled } from "./AdminMultiVendorSetup";

export interface WholesaleSetupVendor {
  id: string;
  name: string;
  enabled?: boolean;
  tiers: string[];
  tierBounds: number[];
  maxKitsPerPackage: number;
  regions: {
    name: string;
    prices?: (number | null)[];
    priceNote?: string;
    customNote?: string;
    countries?: string[];
  }[];
}

type VendorDraft = Omit<WholesaleSetupVendor, "id" | "enabled">;
type WholesaleVendorModalProps = {
  vendor: WholesaleSetupVendor | null;
  onSave: (data: VendorDraft) => Promise<void>;
  onClose: () => void;
};
type SetupProps = {
  secret: string;
  renderVendorModal: (props: WholesaleVendorModalProps) => ReactNode;
};
type VendorListResponse = { vendors?: WholesaleSetupVendor[]; activeVendorId?: string | null };
type VendorSaveResponse = Partial<WholesaleSetupVendor> & { id?: string; name?: string };
const VENDORS_URL = "/api/admin/wholesale-vendors";

async function errorMessage(response: Response, fallback: string) {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return body?.error ? `${fallback}: ${body.error}` : `${fallback} (${response.status})`;
}

function isVendor(value: unknown): value is WholesaleSetupVendor {
  if (!value || typeof value !== "object") return false;
  const vendor = value as Partial<WholesaleSetupVendor>;
  return typeof vendor.id === "string" && typeof vendor.name === "string";
}

function money(value: number | null | undefined) {
  return value == null ? "—" : `$${value.toFixed(2)}`;
}

export function AdminWholesaleSetup({ secret, renderVendorModal }: SetupProps) {
  const [vendors, setVendors] = useState<WholesaleSetupVendor[] | null>(null);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modalVendor, setModalVendor] = useState<WholesaleSetupVendor | null | undefined>(undefined);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(VENDORS_URL, {
        headers: { "x-admin-secret": secret },
        credentials: "include",
      });
      if (!response.ok) throw new Error(await errorMessage(response, "Could not load wholesale vendors"));
      const body = await response.json() as VendorListResponse;
      if (!Array.isArray(body?.vendors)) throw new Error("Could not load wholesale vendors: invalid response");
      const list = body.vendors.filter(isVendor);
      const active = typeof body.activeVendorId === "string" ? body.activeVendorId : null;
      setVendors(list);
      setActiveVendorId(active);
      setSelectedId(current => list.some(v => v.id === current)
        ? current
        : list.some(v => v.id === active) ? active! : list[0]?.id ?? "");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load wholesale vendors");
    } finally {
      setLoading(false);
    }
  }, [secret]);

  useEffect(() => { void load(); }, [load]);

  const refreshSummary = useCallback(async () => {
    try {
      const response = await fetch(VENDORS_URL, {
        headers: { "x-admin-secret": secret },
        credentials: "include",
      });
      if (!response.ok) throw new Error(await errorMessage(response, "Could not refresh vendor summary"));
      const body = await response.json() as VendorListResponse;
      if (!Array.isArray(body?.vendors)) throw new Error("Could not refresh vendor summary: invalid response");
      const list = body.vendors.filter(isVendor);
      const active = typeof body.activeVendorId === "string" ? body.activeVendorId : null;
      setVendors(list);
      setActiveVendorId(active);
      setSelectedId(current => list.some(vendor => vendor.id === current)
        ? current
        : list.some(vendor => vendor.id === active) ? active! : list[0]?.id ?? "");
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not refresh vendor summary");
    }
  }, [secret]);

  const selected = useMemo(
    () => vendors?.find(vendor => vendor.id === selectedId) ?? null,
    [vendors, selectedId],
  );

  const saveVendor = async (data: VendorDraft) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const creating = modalVendor === null;
      const url = creating
        ? VENDORS_URL
        : `${VENDORS_URL}/${encodeURIComponent(modalVendor!.id)}`;
      const response = await fetch(url, {
        method: creating ? "POST" : "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(await errorMessage(response, "Could not save vendor"));
      const body = await response.json().catch(() => null) as VendorSaveResponse | null;
      if (!body || (creating && !isVendor(body)) || (!creating && body.id && body.id !== modalVendor!.id)) {
        throw new Error("Could not save vendor: invalid response");
      }

      if (creating) {
        const created = { ...data, ...body, enabled: body.enabled } as WholesaleSetupVendor;
        setVendors(current => [...(current ?? []), created]);
        setSelectedId(created.id);
      } else {
        const previous = modalVendor!;
        const updated = { ...previous, ...data, ...body, id: previous.id, enabled: previous.enabled } as WholesaleSetupVendor;
        setVendors(current => current?.map(vendor => vendor.id === previous.id ? updated : vendor) ?? [updated]);
      }
      setModalVendor(undefined);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save vendor");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (loading && !vendors) {
    return <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-slate-100" data-testid="wholesale-setup-loading" />;
  }
  if (loadError && !vendors) {
    return (
      <div role="alert" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" data-testid="wholesale-setup-load-error">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>{loadError}</span>
        <button type="button" onClick={() => void load()} className="ml-auto inline-flex items-center gap-1 font-semibold underline" data-testid="button-retry-wholesale">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  const enabled = selected ? isVendorEnabled(selected, activeVendorId) : false;
  const modal = modalVendor !== undefined
    ? renderVendorModal({
      vendor: modalVendor,
      onSave: saveVendor,
      onClose: () => { if (!saving) { setModalVendor(undefined); setSaveError(null); } },
    })
    : null;

  return (
    <section className="space-y-5" data-testid="admin-wholesale-setup">
      <header className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">Peps Anonymous · wholesale</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Supplier setup</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">Keep supplier terms, delivery regions, and catalogue offers scoped to one vendor at a time.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-52 flex-1 text-xs font-semibold text-slate-600 sm:flex-none" htmlFor="wholesale-vendor-select">
              Selected supplier
              <select
                id="wholesale-vendor-select"
                value={selectedId}
                onChange={event => setSelectedId(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                data-testid="select-wholesale-vendor"
              >
                {(vendors ?? []).map(vendor => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
                {(!vendors || vendors.length === 0) && <option value="">No suppliers yet</option>}
              </select>
            </label>
            <button
              type="button"
              onClick={() => { setSaveError(null); setModalVendor(null); }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1B3A7A] px-4 text-sm font-semibold text-white hover:bg-[#132d60] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              data-testid="button-add-wholesale-vendor"
            >
              <Plus className="h-4 w-4" /> Add vendor
            </button>
          </div>
        </div>
      </header>

      {loadError && (
        <div role="alert" className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span>{loadError}</span><button type="button" onClick={() => void load()} className="font-semibold underline">Retry</button>
        </div>
      )}

      {selected ? (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-800"><Building2 className="h-5 w-5" /></span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Supplier details</p>
                    <h3 className="mt-1 text-lg font-bold text-slate-900" data-testid="wholesale-selected-vendor">{selected.name}</h3>
                    <p className={`mt-1 text-xs font-semibold ${enabled ? "text-emerald-700" : "text-slate-500"}`} data-testid="wholesale-vendor-status">
                      <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${enabled ? "bg-emerald-500" : "bg-slate-300"}`} />
                      {enabled ? "Enabled for ordering" : "Disabled"}
                      {selected.id === activeVendorId && <span className="font-normal"> · default selection</span>}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => { setSaveError(null); setModalVendor(selected); }} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" data-testid="button-edit-wholesale-details">
                  <Pencil className="h-3.5 w-3.5" /> Edit details
                </button>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Package limit</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{selected.maxKitsPerPackage} kits</dd></div>
                <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Order tiers</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{selected.tiers?.length ?? 0}</dd></div>
              </dl>
              <div className="mt-3 flex flex-wrap gap-1.5" data-testid="wholesale-tier-summary">
                {(selected.tiers ?? []).map((tier, index) => (
                  <span key={`${tier}-${index}`} className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-900">
                    {tier} <span className="text-blue-700">· max {selected.tierBounds?.[index] ?? "—"}</span>
                  </span>
                ))}
                {!selected.tiers?.length && <span className="text-xs text-slate-500">No order tiers configured</span>}
              </div>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-800"><Truck className="h-5 w-5" /></span>
                  <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Delivery</p><h3 className="mt-1 text-lg font-bold text-slate-900">Shipping regions</h3></div>
                </div>
                <button type="button" onClick={() => { setSaveError(null); setModalVendor(selected); }} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" data-testid="button-edit-wholesale-shipping">
                  <Pencil className="h-3.5 w-3.5" /> Edit shipping
                </button>
              </div>
              <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[400px] text-left text-xs" data-testid="wholesale-shipping-table">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr><th className="px-3 py-2 font-semibold">Region</th><th className="px-3 py-2 font-semibold">Kit rates (USD)</th><th className="px-3 py-2 font-semibold">Countries / notes</th></tr>
                  </thead>
                  <tbody>
                    {(selected.regions ?? []).length === 0 && <tr><td colSpan={3} className="px-3 py-5 text-center text-slate-500">No shipping regions configured</td></tr>}
                    {(selected.regions ?? []).map((region, index) => (
                      <tr key={`${region.name}-${index}`} className="border-t border-slate-100 align-top" data-testid={`wholesale-region-${index}`}>
                        <td className="px-3 py-2.5 font-semibold text-slate-800">{region.name}</td>
                        <td className="px-3 py-2.5 text-slate-700">
                          {region.prices?.length ? region.prices.map((price, i) => <span key={i} className="mr-1.5 inline-block whitespace-nowrap">{selected.tiers?.[i] ?? `Tier ${i + 1}`}: {money(price)}</span>)
                            : region.priceNote ?? region.customNote ?? "Set by supplier"}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {region.countries?.length ? region.countries.join(", ") : "Countries not specified"}
                          {(region.priceNote || region.customNote) && region.prices?.length ? <p className="mt-1 text-slate-500">{region.priceNote ?? region.customNote}</p> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-800"><Package className="h-4 w-4" /></span>
              <div><h3 className="text-base font-bold text-slate-900">Products and availability</h3><p className="text-xs text-slate-500">Catalogue offers and product pricing remain assigned to their supplier.</p></div>
            </div>
            <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-slate-700" data-testid="wholesale-add-product-instruction">
              <a href="#products" className="font-semibold text-blue-800 underline underline-offset-2" data-testid="link-add-wholesale-product">Add catalogue product</a>
              <span> in Products, then return here to assign it to {selected.name}.</span>
            </div>
            <AdminMultiVendorSetup key={selected.id} secret={secret} selectedVendorId={selected.id} onVendorsChanged={refreshSummary} />
          </section>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/60 px-5 py-12 text-center" data-testid="wholesale-empty-state">
          <Building2 className="mx-auto h-8 w-8 text-blue-700" />
          <h3 className="mt-3 text-base font-bold text-slate-900">No suppliers configured</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">Add a vendor to set their order tiers, package limit, delivery regions, and product offers.</p>
          <button type="button" onClick={() => { setSaveError(null); setModalVendor(null); }} className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[#1B3A7A] px-4 text-sm font-semibold text-white" data-testid="button-add-first-wholesale-vendor">
            <Plus className="h-4 w-4" /> Add vendor
          </button>
        </div>
      )}
      {saveError && modalVendor !== undefined && (
        <div className="fixed inset-x-4 top-4 z-[70] mx-auto max-w-xl" data-testid="wholesale-modal-error-layer">
          <p role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900 shadow-lg">
            {saveError}
          </p>
        </div>
      )}
      {saving && modalVendor !== undefined && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/20" aria-busy="true" aria-live="polite" data-testid="wholesale-modal-saving-overlay">
          <div className="rounded-xl border border-blue-100 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-xl">Saving supplier settings…</div>
        </div>
      )}
      {modal}
    </section>
  );
}

export default AdminWholesaleSetup;
