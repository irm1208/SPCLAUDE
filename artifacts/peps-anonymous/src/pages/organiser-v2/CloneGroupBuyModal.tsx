import { useRef, useState, useEffect } from "react";
import {
  Copy,
  X,
  Package,
  Settings,
  Truck,
  CreditCard,
  Shield,
  BookOpen,
  Loader2,
  CheckSquare,
  Square,
} from "lucide-react";
import { organiserApi, type ApiGroupBuy } from "./api/organiser-api";

interface Section {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    id: "settings",
    label: "Settings",
    description: "Name, description, manufacturer, currency, close date, kit limits",
    icon: <Settings aria-hidden="true" size={16} />,
  },
  {
    id: "products",
    label: "Products",
    description: "All product links and price overrides",
    icon: <Package aria-hidden="true" size={16} />,
  },
  {
    id: "shipping",
    label: "Shipping",
    description: "Shipping options, vendor shipping, allowed/excluded countries",
    icon: <Truck aria-hidden="true" size={16} />,
  },
  {
    id: "payments",
    label: "Payments",
    description: "Payment methods, admin fee, entry fee, payment message",
    icon: <CreditCard aria-hidden="true" size={16} />,
  },
  {
    id: "access",
    label: "Access",
    description: "Country restrictions, blocked accounts, order edit permissions",
    icon: <Shield aria-hidden="true" size={16} />,
  },
  {
    id: "rules",
    label: "Rules",
    description: "Organiser rules displayed to members",
    icon: <BookOpen aria-hidden="true" size={16} />,
  },
];

interface Props {
  groupBuy: { id: string; name: string };
  onCloned: (newGroupBuy: ApiGroupBuy) => void;
  onClose: () => void;
}

export default function CloneGroupBuyModal({ groupBuy, onCloned, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(SECTIONS.map(s => s.id)),
  );
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(SECTIONS.map(s => s.id)));
  const clearAll = () => setSelected(new Set());
  const allSelected = selected.size === SECTIONS.length;
  const noneSelected = selected.size === 0;

  const handleClone = async () => {
    if (noneSelected) {
      setError("Select at least one section to clone.");
      return;
    }
    setCloning(true);
    setError(null);
    try {
      const sections = Array.from(selected);
      const newGb = await organiserApi.cloneGroupBuy(groupBuy.id, sections);
      onCloned(newGb);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clone the group buy. Please try again.");
    } finally {
      setCloning(false);
    }
  };

  return (
    <div className="ov2-modal-layer" role="presentation">
      <div className="ov2-modal-scrim" onClick={onClose} />
      <section
        className="ov2-card ov2-clone-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ov2-clone-title"
      >
        {/* Header */}
        <header>
          <div>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ov2-text-muted)", marginBottom: 4 }}>
              <Copy size={12} aria-hidden="true" />
              Clone group buy
            </span>
            <h2 id="ov2-clone-title" style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              What should be cloned?
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--ov2-text-muted)", lineHeight: 1.5 }}>
              Cloning <strong>&ldquo;{groupBuy.name}&rdquo;</strong>. The new group buy will be saved as a draft. Select the sections you want to copy across.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="ov2-icon-button"
            onClick={onClose}
            aria-label="Close clone dialog"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        {/* Select all / clear all */}
        <div className="ov2-clone-select-bar">
          <button
            type="button"
            className="ov2-clone-select-link"
            onClick={allSelected ? clearAll : selectAll}
          >
            {allSelected ? <><CheckSquare size={13} aria-hidden="true" /> Deselect all</> : <><Square size={13} aria-hidden="true" /> Select all</>}
          </button>
          <span className="ov2-clone-count">{selected.size} of {SECTIONS.length} selected</span>
        </div>

        {/* Section checklist */}
        <ul className="ov2-clone-sections" role="list">
          {SECTIONS.map(section => {
            const checked = selected.has(section.id);
            return (
              <li key={section.id}>
                <label
                  className="ov2-clone-section-row"
                  data-selected={checked || undefined}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(section.id)}
                    aria-label={section.label}
                  />
                  <span className="ov2-clone-section-icon">{section.icon}</span>
                  <span className="ov2-clone-section-body">
                    <strong>{section.label}</strong>
                    <span>{section.description}</span>
                  </span>
                  <span className="ov2-clone-section-check" aria-hidden="true">
                    {checked ? <CheckSquare size={16} /> : <Square size={16} />}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        {/* Note about invite PIN */}
        <p className="ov2-clone-pin-note">
          <Shield size={12} aria-hidden="true" />
          Invite PIN is never copied — you can set a new one after cloning.
        </p>

        {/* Error */}
        {error ? (
          <div className="ov2-data-notice" data-tone="error" role="alert">{error}</div>
        ) : null}

        {/* Footer */}
        <footer>
          <button
            type="button"
            className="ov2-secondary-button"
            onClick={onClose}
            disabled={cloning}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ov2-primary-button"
            onClick={handleClone}
            disabled={cloning || noneSelected}
          >
            {cloning ? (
              <><Loader2 aria-hidden="true" className="animate-spin" size={14} /> Cloning…</>
            ) : (
              <><Copy aria-hidden="true" size={14} /> Clone group buy</>
            )}
          </button>
        </footer>
      </section>
    </div>
  );
}
