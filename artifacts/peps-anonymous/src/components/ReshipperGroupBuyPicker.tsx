import { EyeOff, Loader2 } from "lucide-react";

type Assignment = { id: string; gbId: string; country: string; gb: { name: string } | null };
type Props = {
  assignments: Assignment[];
  hiddenIds: string[];
  selectedId: string;
  showHidden: boolean;
  saving: boolean;
  colors: { panel2: string; border: string; muted: string; text: string; chip: string };
  accent: string;
  onSelect: (id: string) => void;
  onShowHidden: (show: boolean) => void;
  onSetHidden: (id: string, hidden: boolean) => void;
};

export function ReshipperGroupBuyPicker(props: Props) {
  const { assignments, hiddenIds, selectedId, showHidden, saving, colors: p } = props;
  const visible = assignments.filter(a => showHidden || !hiddenIds.includes(a.gbId));
  const hiddenCount = new Set(assignments.filter(a => hiddenIds.includes(a.gbId)).map(a => a.gbId)).size;
  return (
    <div className="px-4 md:px-7 py-2 shrink-0 space-y-2" style={{ background: p.panel2, borderBottom: `1px solid ${p.border}` }}>
      <div className="flex items-center gap-3 flex-wrap text-xs" style={{ color: p.muted }}>
        {selectedId && (
          <button type="button" data-testid="button-toggle-gb-visibility" disabled={saving}
            onClick={() => props.onSetHidden(selectedId, !hiddenIds.includes(selectedId))}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 disabled:opacity-50"
            style={{ border: `1px solid ${p.border}`, color: p.text }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <EyeOff className="w-3.5 h-3.5" />}
            {hiddenIds.includes(selectedId) ? "Restore group buy" : "Hide group buy"}
          </button>
        )}
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input data-testid="checkbox-show-hidden-gbs" type="checkbox" checked={showHidden} disabled={saving}
            onChange={event => props.onShowHidden(event.target.checked)} />
          Show hidden ({hiddenCount})
        </label>
        <span>Hidden only in your panel.</span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto">
        {visible.map(a => (
          <button type="button" data-testid={`button-select-gb-${a.id}`} key={a.id} disabled={saving}
            onClick={() => props.onSelect(a.gbId)}
            className="flex items-center gap-1 px-3 h-7 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 transition-all disabled:opacity-50"
            style={selectedId === a.gbId ? { background: props.accent, color: "#fff" }
              : { background: p.chip, color: p.muted, border: `1px solid ${p.border}` }}>
            {a.gb?.name ?? a.gbId} · {a.country}
            {hiddenIds.includes(a.gbId) && <span className="opacity-70"> · Hidden</span>}
          </button>
        ))}
        {visible.length === 0 && <p data-testid="text-all-gbs-hidden" className="text-xs py-1" style={{ color: p.muted }}>All group buys are hidden. Use “Show hidden” to restore them.</p>}
      </div>
    </div>
  );
}
