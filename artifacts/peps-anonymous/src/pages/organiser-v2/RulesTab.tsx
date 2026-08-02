import { useState, useEffect } from "react";
import { V2_CARD_BORDER } from "./theme";
import { organiserApi } from "./api/organiser-api";
import {
  ScrollText, Lightbulb, MessageSquare, ClipboardCheck, Eye,
  Plus, X, ArrowUp, ArrowDown, Loader2, Check, Save,
} from "lucide-react";

// ─── Workspace: Rules & Info Tab ─────────────────────────────────────────────
// Manages GB organiser rules via /organiser/group-buys/:id/rules (GET + PATCH).

interface Rule {
  id: string;
  text: string;
  enabled: boolean;
  format: string;
}

let ruleIdCounter = 0;
const newRuleId = () => `rule-${Date.now()}-${ruleIdCounter++}`;

export default function RulesTab({ selectedGbId }: { selectedGbId?: string } = {}) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [newRule, setNewRule] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedGbId) return;
    setLoading(true);
    organiserApi.getRules(selectedGbId)
      .then(res => {
        setRules((res.rules ?? []).map(r => ({
          id: r.id ?? newRuleId(),
          text: r.text ?? "",
          enabled: r.enabled !== false,
          format: r.format ?? "text",
        })));
      })
      .catch(() => setError("Failed to load rules"))
      .finally(() => setLoading(false));
  }, [selectedGbId]);

  const addRule = () => {
    const text = newRule.trim();
    if (!text) return;
    setRules(prev => [...prev, { id: newRuleId(), text, enabled: true, format: "text" }]);
    setNewRule("");
  };

  const updateRule = (id: string, text: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, text } : r));
  };

  const removeRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const moveRule = (idx: number, dir: -1 | 1) => {
    setRules(prev => {
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGbId) return;
    setSaving(true); setError("");
    try {
      await organiserApi.updateRules(selectedGbId, rules as unknown as Record<string, unknown>[]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save rules");
    } finally {
      setSaving(false);
    }
  };

  if (!selectedGbId) {
    return (
      <div className="rounded-xl p-8 sm:p-12 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <ScrollText className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
        <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>No Group Buy Selected</h3>
        <p className="text-[14px]" style={{ color: "var(--t-subtle)" }}>Select a group buy to manage rules</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl p-12 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: "var(--t-blue)" }} />
        <p className="text-[14px]" style={{ color: "var(--t-subtle)" }}>Loading rules…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="rounded-xl p-4 sm:p-5 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <h2 className="text-lg sm:text-xl font-bold" style={{ color: "var(--t-text)" }}>Rules & Info</h2>
        <p className="text-[13px] sm:text-[14px] mt-1" style={{ color: "var(--t-subtle)" }}>
          Set the rules and information shown to members when joining
        </p>
      </div>

      {/* Explainer */}
      <div className="rounded-xl p-4 sm:p-5 bg-gradient-to-br from-purple-50 to-indigo-50" style={{ border: "1px solid #DDD6FE" }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "#7C3AED", color: "#fff" }}>
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>How Rules Work</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
              {[
                { icon: <ClipboardCheck className="w-4 h-4" />, title: "At Checkout", desc: "Members see and agree to rules before placing an order." },
                { icon: <MessageSquare className="w-4 h-4" />, title: "On Joining", desc: "New members see the welcome message when they first join." },
                { icon: <Eye className="w-4 h-4" />, title: "Order Confirmation", desc: "Order note appears on every order confirmation." },
              ].map(item => (
                <div key={item.title} className="flex items-start gap-2 p-2 rounded-lg bg-white/70">
                  <div style={{ color: "#7C3AED" }}>{item.icon}</div>
                  <div>
                    <p className="text-[12px] font-bold" style={{ color: "var(--t-text)" }}>{item.title}</p>
                    <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
          <p className="text-[13px] font-semibold" style={{ color: "#DC2626" }}>{error}</p>
          <button onClick={() => setError("")} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-100">
            <X className="w-3.5 h-3.5" style={{ color: "#DC2626" }} />
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Rules list */}
        <div className="rounded-xl p-4 sm:p-5 bg-white space-y-3" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>
              Rules <span className="text-[12px] font-normal" style={{ color: "var(--t-subtle)" }}>({rules.length})</span>
            </h3>
          </div>

          {rules.length === 0 && (
            <p className="text-[13px] py-2" style={{ color: "var(--t-subtle)" }}>No rules yet — add your first rule below.</p>
          )}

          <div className="space-y-2">
            {rules.map((rule, idx) => (
              <div key={rule.id} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: "var(--t-surface2)" }}>
                <div className="flex flex-col gap-0.5 pt-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveRule(idx, -1)}
                    disabled={idx === 0}
                    className="w-6 h-6 rounded flex items-center justify-center hover:bg-white disabled:opacity-30"
                  >
                    <ArrowUp className="w-3 h-3" style={{ color: "var(--t-subtle)" }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveRule(idx, 1)}
                    disabled={idx === rules.length - 1}
                    className="w-6 h-6 rounded flex items-center justify-center hover:bg-white disabled:opacity-30"
                  >
                    <ArrowDown className="w-3 h-3" style={{ color: "var(--t-subtle)" }} />
                  </button>
                </div>
                <input
                  type="text"
                  value={rule.text}
                  onChange={e => updateRule(rule.id, e.target.value)}
                  className="flex-1 h-8 px-2 rounded-md text-[13px] outline-none"
                  style={{ border: `1px solid ${V2_CARD_BORDER}`, background: "#fff", color: "var(--t-text)" }}
                />
                <button
                  type="button"
                  onClick={() => removeRule(rule.id)}
                  className="w-7 h-7 rounded-md flex items-center justify-center mt-0.5 hover:bg-red-50"
                  style={{ color: "#EF4444" }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add rule */}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={newRule}
              onChange={e => setNewRule(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addRule())}
              placeholder="Add a rule and press Enter or click Add…"
              className="flex-1 h-10 px-3 rounded-lg text-[13px] outline-none"
              style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
            />
            <button
              type="button"
              onClick={addRule}
              disabled={!newRule.trim()}
              className="h-10 px-4 rounded-lg text-[13px] font-semibold flex items-center gap-1.5 disabled:opacity-40"
              style={{ background: "var(--t-blue)", color: "#fff" }}
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="h-10 px-6 rounded-lg text-[14px] font-bold text-white flex items-center gap-2"
            style={{ background: saved ? "#16A34A" : "var(--t-blue)" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : saved ? "Saved!" : "Save Rules"}
          </button>
        </div>
      </form>
    </div>
  );
}
