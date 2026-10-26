import { useEffect, useId, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { saveMoqSettings, type GbUpdatesScope } from "@/lib/group-buy-updates";
import type { GroupBuyMoq } from "@/lib/group-buy-moq";
import { GroupBuyMoqProgress } from "./GroupBuyMoqProgress";
import type { RunMutation } from "./GroupBuyUpdatesManager";

export function GroupBuyMoqSettings({ moq, scope, gbId, run, blocked, reload }: {
  moq?: GroupBuyMoq | null; scope: GbUpdatesScope; gbId: string; run: RunMutation; blocked: boolean;
  reload: () => Promise<GroupBuyMoq | null>;
}) {
  const id = useId();
  const [enabled, setEnabled] = useState(moq?.enabled ?? false);
  const [target, setTarget] = useState(moq?.targetKits != null ? String(moq.targetKits) : "");
  const [show, setShow] = useState(moq?.showToMembers ?? false);
  const [mode, setMode] = useState<NonNullable<GroupBuyMoq["countMode"]>>(moq?.countMode ?? "active");
  const [productTargets, setProductTargets] = useState<Record<string, string>>(() =>
    Object.fromEntries((moq?.products ?? []).filter(p => p.targetKits !== null).map(p => [p.productId, String(p.targetKits)])));
  const [version, setVersion] = useState(moq?.updatedAt ?? null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const reset = (value: GroupBuyMoq | null | undefined) => {
    setEnabled(value?.enabled ?? false);
    setTarget(value?.targetKits != null ? String(value.targetKits) : "");
    setShow(value?.showToMembers ?? false);
    setMode(value?.countMode ?? "active");
    setProductTargets(Object.fromEntries((value?.products ?? []).filter(p => p.targetKits !== null).map(p => [p.productId, String(p.targetKits)])));
    setVersion(value?.updatedAt ?? null);
  };
  useEffect(() => {
    if (!dirty) reset(moq);
  }, [moq, dirty]);
  const changed = () => { setDirty(true); setSaved(false); setError(""); };
  const save = async () => {
    const quantity = target.trim() ? Number(target) : null;
    const perProduct = Object.entries(productTargets).filter(([, value]) => value.trim()).map(([productId, value]) =>
      ({ productId, targetKits: Number(value) }));
    if ((enabled && quantity === null && !perProduct.length) || (quantity !== null && (
      !Number.isFinite(quantity) || quantity <= 0 || quantity > 100_000_000 || !Number.isInteger(quantity * 2)
    )) || perProduct.some(p => !Number.isFinite(p.targetKits) || p.targetKits <= 0 ||
      p.targetKits > 100_000_000 || !Number.isInteger(p.targetKits * 2))) {
      setError("Enter at least one MOQ above zero in whole or half kits.");
      return;
    }
    setSaving(true); setError(""); setSaved(false);
    try {
      const response = await run(
        () => saveMoqSettings(scope, gbId, {
          enabled, targetKits: quantity, showToMembers: show, countMode: mode, productTargets: perProduct,
        }, version),
        (_old, result) => result,
      );
      reset(response.moq); setDirty(false); setSaved(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save MOQ."); }
    finally { setSaving(false); }
  };
  const reloadSaved = async () => {
    setSaving(true); setError("");
    try { reset(await reload()); setDirty(false); setSaved(false); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not reload MOQ."); }
    finally { setSaving(false); }
  };
  return (
    <section className="rounded-xl border p-3.5 space-y-3" data-testid="gb-moq-settings"
      style={{ borderColor: "var(--t-border)", background: "var(--t-surface2)" }}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={`${id}-enabled`} className="text-sm font-bold">Enable minimum order quantity (MOQ)</label>
        <Switch id={`${id}-enabled`} checked={enabled} disabled={blocked || saving}
          onCheckedChange={value => { changed(); setEnabled(value); }} className="data-[state=checked]:bg-[#2D6BCC]" />
      </div>
      <p className="text-xs" style={{ color: "var(--t-muted)" }}>
        Set a whole-group target, individual product targets, or both. These are not minimums per member; half a kit counts as 0.5.
      </p>
      {enabled && (
        <>
          <label className="block text-xs font-semibold space-y-1.5">
            <span>Whole-group MOQ target (kits, optional)</span>
            <input type="number" min="0.5" max="100000000" step="0.5" value={target}
              disabled={blocked || saving} placeholder="e.g. 100"
              onChange={e => { changed(); setTarget(e.target.value); }}
              className="w-full sm:max-w-56 rounded-lg border px-3 py-2 block text-sm"
              style={{ background: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text)" }} />
          </label>
          <label className="block text-xs font-semibold space-y-1.5">
            <span>Progress to show</span>
            <select value={mode} disabled={blocked || saving}
              onChange={e => { changed(); setMode(e.target.value as typeof mode); }}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ background: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text)" }}>
              <option value="active">Active orders</option>
              <option value="paid">Paid orders</option>
              <option value="both">Both — active and paid orders</option>
            </select>
          </label>
          <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
            Active includes paid and unpaid orders. Paid includes fully confirmed payments with no outstanding balance.
            Both shows separate figures against the same target; they are not added together.
          </p>
          <fieldset className="space-y-2">
            <legend className="text-xs font-bold mb-2">Per-product MOQ targets (kits)</legend>
            <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>Leave blank for no target. Each product and strength is counted separately.</p>
            {(moq?.products ?? []).map(product => <label key={product.productId}
              className="flex items-center justify-between gap-3 text-xs">
              <span className="min-w-0 break-words">{product.name}</span>
              <input type="number" min="0.5" max="100000000" step="0.5" placeholder="No MOQ"
                aria-label={`${product.name} MOQ (kits)`} value={productTargets[product.productId] ?? ""}
                disabled={blocked || saving}
                onChange={e => { changed(); setProductTargets(old => ({ ...old, [product.productId]: e.target.value })); }}
                className="w-28 shrink-0 rounded-lg border px-3 py-2"
                style={{ background: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text)" }} />
            </label>)}
            {!moq?.products?.length && <p className="text-xs" style={{ color: "var(--t-muted)" }}>Add products to this group buy to set their MOQ targets.</p>}
          </fieldset>
          <div className="flex items-center justify-between gap-3">
            <div>
              <label htmlFor={`${id}-members`} className="text-xs font-semibold">Show MOQ progress to members</label>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>
                Shows product targets and your chosen active/paid progress on their group-buy card and order page.
              </p>
            </div>
            <Switch id={`${id}-members`} checked={show} disabled={blocked || saving}
              onCheckedChange={value => { changed(); setShow(value); }} className="data-[state=checked]:bg-[#2D6BCC]" />
          </div>
          <GroupBuyMoqProgress moq={moq} staff />
          <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
            Cancelled, refunded and deleted orders, drafts and out-of-stock items do not count. This target does not automatically close or cancel the group buy.
          </p>
        </>
      )}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      {saved && <p role="status" className="text-xs text-green-600">MOQ settings saved.</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={blocked || saving || !dirty} onClick={save}
          className="rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50" style={{ background: "#1B3A7A" }}>
          {saving ? "Saving…" : "Save MOQ settings"}
        </button>
        {(dirty || error) && <button type="button" disabled={blocked || saving} onClick={reloadSaved}
          className="rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: "var(--t-border)" }}>
          Reload saved settings
        </button>}
      </div>
    </section>
  );
}
