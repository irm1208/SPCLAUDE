import { useState, useRef, useEffect } from "react";
import { Check, Search, X } from "lucide-react";
import type { ApiGroupBuy } from "./api/organiser-api";

interface Props {
  groupBuys: ApiGroupBuy[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

const STATUS_META: Record<string, { label: string; tone: "active" | "draft" | "closed" | "neutral" }> = {
  open:     { label: "Open",     tone: "active" },
  active:   { label: "Open",     tone: "active" },
  draft:    { label: "Draft",    tone: "draft" },
  closed:   { label: "Closed",   tone: "closed" },
  archived: { label: "Archived", tone: "closed" },
};

function statusMeta(status?: string | null) {
  return STATUS_META[status?.toLowerCase() ?? ""] ?? { label: "Unknown", tone: "neutral" };
}

export default function ChooseGroupBuyModal({ groupBuys, selectedId, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = query.trim()
    ? groupBuys.filter(gb => gb.name.toLowerCase().includes(query.toLowerCase()))
    : groupBuys;

  function handleSelect(id: string) {
    onSelect(id);
    onClose();
  }

  return (
    <div
      ref={overlayRef}
      className="ov2-cgb-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Choose group buy"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="ov2-cgb-panel">
        {/* Header */}
        <div className="ov2-cgb-header">
          <div className="ov2-cgb-header-text">
            <strong>Choose group buy</strong>
            <span>{groupBuys.length} group {groupBuys.length === 1 ? "buy" : "buys"}</span>
          </div>
          <button type="button" className="ov2-cgb-close" onClick={onClose} aria-label="Close">
            <X aria-hidden="true" />
          </button>
        </div>

        {/* Search */}
        {groupBuys.length > 4 && (
          <div className="ov2-cgb-search">
            <Search aria-hidden="true" className="ov2-cgb-search-icon" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search group buys…"
              className="ov2-cgb-search-input"
              autoComplete="off"
            />
            {query && (
              <button type="button" className="ov2-cgb-search-clear" onClick={() => setQuery("")} aria-label="Clear search">
                <X aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {/* List */}
        <div className="ov2-cgb-list" role="listbox" aria-label="Group buys">
          {filtered.length === 0 && (
            <div className="ov2-cgb-empty">No group buys match "{query}"</div>
          )}
          {filtered.map(gb => {
            const { label, tone } = statusMeta(gb.status);
            const isSelected = gb.id === selectedId;
            return (
              <button
                key={gb.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`ov2-cgb-item${isSelected ? " is-selected" : ""}`}
                onClick={() => handleSelect(gb.id)}
              >
                <div className="ov2-cgb-item-body">
                  <span className="ov2-cgb-item-name">{gb.name}</span>
                  <span className={`ov2-cgb-status-badge`} data-tone={tone}>{label}</span>
                </div>
                {isSelected && <Check aria-hidden="true" className="ov2-cgb-item-check" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
