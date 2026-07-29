import { useState, useEffect, useCallback } from "react";
import { Search, Command, X } from "lucide-react";
import { V2_CARD_BORDER } from "./theme";

// ─── Keyboard Shortcuts & Command Palette ────────────────────────────────────
// Global keyboard shortcuts and searchable command palette (Cmd+/)

export interface CommandAction {
  id: string;
  label: string;
  description?: string;
  keywords?: string[];
  shortcut?: string;
  action: () => void;
  category?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  actions: CommandAction[];
}

export function CommandPalette({ isOpen, onClose, actions }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredActions = actions.filter((action) => {
    const searchText = query.toLowerCase();
    return (
      action.label.toLowerCase().includes(searchText) ||
      action.description?.toLowerCase().includes(searchText) ||
      action.keywords?.some((k) => k.toLowerCase().includes(searchText))
    );
  });

  const groupedActions = filteredActions.reduce((acc, action) => {
    const category = action.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(action);
    return acc;
  }, {} as Record<string, CommandAction[]>);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredActions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        filteredActions[selectedIndex].action();
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  let currentIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-32 p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-white shadow-2xl"
        style={{ border: `1px solid ${V2_CARD_BORDER}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: V2_CARD_BORDER }}>
          <Search className="w-5 h-5" style={{ color: "var(--t-subtle)" }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search for actions..."
            className="flex-1 text-[14px] outline-none"
            style={{ color: "var(--t-text)" }}
            autoFocus
          />
          <button onClick={onClose} className="w-6 h-6 rounded flex items-center justify-center hover:bg-black/5">
            <X className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {Object.keys(groupedActions).length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[14px]" style={{ color: "var(--t-subtle)" }}>
                No commands found
              </p>
            </div>
          ) : (
            Object.entries(groupedActions).map(([category, categoryActions]) => (
              <div key={category}>
                <div
                  className="px-4 py-2 text-[12px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--t-subtle)", background: "#F9FAFB" }}
                >
                  {category}
                </div>
                {categoryActions.map((action) => {
                  const isSelected = currentIndex === selectedIndex;
                  const itemIndex = currentIndex++;

                  return (
                    <button
                      key={action.id}
                      onClick={() => {
                        action.action();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors border-b"
                      style={{
                        background: isSelected ? "#F3F4F6" : "transparent",
                        borderColor: V2_CARD_BORDER,
                      }}
                    >
                      <div className="flex-1">
                        <div className="text-[14px] font-semibold" style={{ color: "var(--t-text)" }}>
                          {action.label}
                        </div>
                        {action.description && (
                          <div className="text-[13px] mt-0.5" style={{ color: "var(--t-subtle)" }}>
                            {action.description}
                          </div>
                        )}
                      </div>
                      {action.shortcut && (
                        <kbd
                          className="px-2 py-1 rounded text-[12px] font-mono"
                          style={{ background: "#E5E7EB", color: "#374151" }}
                        >
                          {action.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center justify-between px-4 py-2 text-[12px] border-t"
          style={{ color: "var(--t-subtle)", background: "#F9FAFB", borderColor: V2_CARD_BORDER }}
        >
          <span>↑↓ Navigate • Enter Select • Esc Close</span>
        </div>
      </div>
    </div>
  );
}

// Keyboard shortcuts modal (? key)
interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: Array<{ key: string; description: string; category: string }>;
}

export function ShortcutsModal({ isOpen, onClose, shortcuts }: ShortcutsModalProps) {
  if (!isOpen) return null;

  const grouped = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) acc[shortcut.category] = [];
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, typeof shortcuts>);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 space-y-4"
        style={{ border: `1px solid ${V2_CARD_BORDER}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-bold" style={{ color: "var(--t-text)" }}>
            Keyboard Shortcuts
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5">
            <X className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
          </button>
        </div>

        {Object.entries(grouped).map(([category, categoryShortcuts]) => (
          <div key={category}>
            <h3 className="text-[14px] font-bold mb-2" style={{ color: "var(--t-text)" }}>
              {category}
            </h3>
            <div className="space-y-2">
              {categoryShortcuts.map((shortcut, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-3 rounded-lg"
                  style={{ background: "#F9FAFB" }}
                >
                  <span className="text-[14px]" style={{ color: "var(--t-text)" }}>
                    {shortcut.description}
                  </span>
                  <kbd
                    className="px-2 py-1 rounded text-[13px] font-mono font-semibold"
                    style={{ background: "#fff", border: `1px solid ${V2_CARD_BORDER}`, color: "#374151" }}
                  >
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Hook to setup global keyboard shortcuts
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Build key combination string
      let combo = "";
      if (cmdOrCtrl) combo += "Cmd+";
      if (e.shiftKey) combo += "Shift+";
      if (e.altKey) combo += "Alt+";
      combo += e.key.toUpperCase();

      // Single key shortcuts (only if not in input)
      const isInInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable;

      if (!isInInput && !cmdOrCtrl && !e.shiftKey && !e.altKey) {
        const singleKey = e.key.toUpperCase();
        if (shortcuts[singleKey]) {
          e.preventDefault();
          shortcuts[singleKey]();
          return;
        }
      }

      // Check for match
      if (shortcuts[combo]) {
        e.preventDefault();
        shortcuts[combo]();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts]);
}
