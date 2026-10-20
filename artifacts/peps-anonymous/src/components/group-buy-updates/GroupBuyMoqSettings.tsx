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
  const [version, setVersion] = useState(moq?.updatedAt ?? null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const reset = (value: GroupBuyMoq | null | undefined) => {
    setEnabled(value?.enabled ?? false);
    setTarget(value?.targetKits != null ? String(value.targetKits) : "");
    setShow(value?.showToMembers ?? false);
    setVersion(value?.updatedAt ?? null);
  };
  useEffect(() => {
    if (!dirty) reset(moq);
  }, [moq, dirty]);
  const changed = () => { setDirty(true); setSaved(false); setError(""); };
  const save = async () => {
    const quantity = target.trim() ? Number(target) : null;
    if ((enabled && quantity === null) || (quantity !== null && (
      !Number.isFinite(quantity) || quantity <= 0 || quantity > 100_000_000 || !Number.isInteger(quantity * 2)
    ))) {
      setError("Enter an MOQ above zero in whole or half kits.");
      return;
    }
    setSaving(true); setError(""); setSaved(false);
    try {
      const response = await run(
        () => saveMoqSettings(scope, gbId, { enabled, targetKits: quantity, showToMembers: show }, version),
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
        A target for the whole group buy, not a minimum per member. Counts paid and unpaid orders; half a kit counts as 0.5.
      </p>
      {enabled && (
        <>
          <label className="block text-xs font-semibold space-y-1.5">
            <span>MOQ target (kits)</span>
            <input type="number" min="0.5" max="100000000" step="0.5" value={target}
              disabled={blocked || saving} placeholder="e.g. 100"
              onChange={e => { changed(); setTarget(e.target.value); }}
              className="w-full sm:max-w-56 rounded-lg border px-3 py-2 block text-sm"
              style={{ background: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text)" }} />
          </label>
          <div className="flex items-center justify-between gap-3">
            <div>
              <label htmlFor={`${id}-members`} className="text-xs font-semibold">Show MOQ progress to members</label>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>
                Shows ordered kits versus target on their group-buy card and order page.
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
