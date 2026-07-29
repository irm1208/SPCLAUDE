import { useState, useEffect } from "react";
import { Eye, Plus, X, Edit2, Trash2 } from "lucide-react";
import { V2_CARD_BORDER } from "./theme";

// ─── Saved Views System ──────────────────────────────────────────────────────
// Allows users to save filter combinations as named views for quick access

export interface SavedView {
  id: string;
  name: string;
  filters: Record<string, any>;
  badge?: number; // Dynamic count
}

interface SavedViewsSidebarProps {
  views: SavedView[];
  activeViewId: string | null;
  onSelectView: (viewId: string | null) => void;
  onCreateView: (name: string, filters: Record<string, any>) => void;
  onDeleteView: (viewId: string) => void;
  currentFilters: Record<string, any>;
  storageKey: string; // For persisting views
}

export function SavedViewsSidebar({
  views,
  activeViewId,
  onSelectView,
  onCreateView,
  onDeleteView,
  currentFilters,
  storageKey,
}: SavedViewsSidebarProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  const handleCreateView = () => {
    if (!newViewName.trim()) return;
    onCreateView(newViewName.trim(), currentFilters);
    setNewViewName("");
    setShowCreateModal(false);
  };

  return (
    <>
      <div className="rounded-xl bg-white p-3 space-y-2" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--t-subtle)" }}>
            Saved Views
          </h3>
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-black/5"
            title="Save current filters as view"
          >
            <Plus className="w-3.5 h-3.5" style={{ color: "var(--t-subtle)" }} />
          </button>
        </div>

        <div className="space-y-1">
          {/* All items view (default) */}
          <button
            onClick={() => onSelectView(null)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors"
            style={{
              background: activeViewId === null ? "var(--t-blue)" : "transparent",
              color: activeViewId === null ? "#fff" : "var(--t-text)",
            }}
          >
            <span className="text-[14px] font-semibold">All Items</span>
          </button>

          {/* Saved views */}
          {views.map((view) => (
            <div
              key={view.id}
              className="group flex items-center gap-1 rounded-lg transition-colors"
              style={{
                background: activeViewId === view.id ? "var(--t-blue)" : "transparent",
              }}
            >
              <button
                onClick={() => onSelectView(view.id)}
                className="flex-1 flex items-center justify-between px-3 py-2 text-left"
                style={{
                  color: activeViewId === view.id ? "#fff" : "var(--t-text)",
                }}
              >
                <span className="text-[14px] font-semibold">{view.name}</span>
                {view.badge !== undefined && view.badge > 0 && (
                  <span
                    className="min-w-[18px] h-[18px] px-1.5 rounded-full text-[12px] font-bold flex items-center justify-center"
                    style={{
                      background: activeViewId === view.id ? "rgba(255,255,255,0.25)" : "var(--t-blue)",
                      color: "#fff",
                    }}
                  >
                    {view.badge}
                  </span>
                )}
              </button>
              <button
                onClick={() => onDeleteView(view.id)}
                className="opacity-0 group-hover:opacity-100 w-7 h-7 mr-1 rounded-md flex items-center justify-center hover:bg-black/10 transition-opacity"
                style={{ color: activeViewId === view.id ? "#fff" : "var(--t-subtle)" }}
                title="Delete view"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Create View Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 space-y-4"
            style={{ border: `1px solid ${V2_CARD_BORDER}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-bold" style={{ color: "var(--t-text)" }}>
                Save Current View
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5"
              >
                <X className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
              </button>
            </div>

            <div>
              <label className="block text-[13px] font-semibold mb-2" style={{ color: "var(--t-subtle)" }}>
                View Name
              </label>
              <input
                type="text"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateView()}
                placeholder="e.g., Awaiting Payment"
                className="w-full h-10 px-3 rounded-lg text-[14px] outline-none"
                style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                autoFocus
              />
            </div>

            <div className="rounded-lg p-3 space-y-1" style={{ background: "#F3F4F6" }}>
              <p className="text-[12px] font-semibold" style={{ color: "var(--t-subtle)" }}>
                Current Filters:
              </p>
              {Object.keys(currentFilters).length > 0 ? (
                <div className="text-[13px]" style={{ color: "var(--t-text)" }}>
                  {Object.entries(currentFilters).map(([key, value]) => (
                    <div key={key}>
                      <strong>{key}:</strong> {String(value)}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] italic" style={{ color: "var(--t-subtle)" }}>
                  No filters applied
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 h-10 rounded-lg text-[14px] font-semibold transition-colors"
                style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "#fff" }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateView}
                disabled={!newViewName.trim()}
                className="flex-1 h-10 rounded-lg text-[14px] font-bold text-white disabled:opacity-50"
                style={{ background: "var(--t-blue)" }}
              >
                Save View
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Hook to manage saved views with localStorage persistence
export function useSavedViews(storageKey: string) {
  const [views, setViews] = useState<SavedView[]>(() => {
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : [];
  });
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(views));
  }, [views, storageKey]);

  const createView = (name: string, filters: Record<string, any>) => {
    const newView: SavedView = {
      id: `view_${Date.now()}`,
      name,
      filters,
    };
    setViews((prev) => [...prev, newView]);
    setActiveViewId(newView.id);
  };

  const deleteView = (viewId: string) => {
    setViews((prev) => prev.filter((v) => v.id !== viewId));
    if (activeViewId === viewId) {
      setActiveViewId(null);
    }
  };

  const getActiveView = () => views.find((v) => v.id === activeViewId);

  return {
    views,
    activeViewId,
    setActiveViewId,
    createView,
    deleteView,
    getActiveView,
  };
}
