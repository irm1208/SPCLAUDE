import { useState, useEffect } from "react";
import { V2_CARD_BORDER } from "./theme";
import { loadGb, saveGb } from "./storage";
import {
  ScrollText, Lightbulb, MessageSquare, ClipboardCheck, Eye,
  Plus, X, ArrowUp, ArrowDown, Loader2, Check, Save,
} from "lucide-react";

// ─── Workspace: Rules & Info Tab ─────────────────────────────────────────────
// v2 port of the v1 OrganiserRulesTab (GbOrganiser.tsx). The v1 tab persisted
// rules via /api/organiser/group-buys/:id/rules; here the save is simulated
// (setTimeout) and state persists per-GB via storage.ts under the "rules" key.

interface Rule {
  id: string;
  text: string;
}

interface RulesState {
  rules: Rule[];
  welcomeMessage: string;
  orderNote: string;
}

const SAMPLE_STATE: RulesState = {
  rules: [
    { id: "r1", text: "Payments within 48h of order confirmation" },
    { id: "r2", text: "No refunds after the close date" },
    { id: "r3", text: "DM the organiser before opening a dispute" },
    { id: "r4", text: "Reshipping to a different address after ordering is not possible" },
    { id: "r5", text: "Lab results are shared in the group before shipping — check them before you commit" },
  ],
  welcomeMessage:
    "Welcome! Thanks for joining this group buy. Please read the rules below before placing an order — they keep things fair for everyone. Questions? Message the organiser any time.",
  orderNote:
    "Your order is locked in once payment clears. We'll post tracking in the group as soon as the vendor ships.",
};

let ruleIdCounter = 0;
const newRuleId = () => `rule-${Date.now()}-${ruleIdCounter++}`;

export default function RulesTab({ selectedGbId }: { selectedGbId?: string } = {}) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [newRule, setNewRule] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!selectedGbId) return;
    const loaded = loadGb<RulesState>(selectedGbId, "rules", SAMPLE_STATE);
    setRules(loaded.rules);
    setWelcomeMessage(loaded.welcomeMessage);
    setOrderNote(loaded.orderNote);
  }, [selectedGbId]);

  const addRule = () => {
    const text = newRule.trim();
    if (!text) return;
    setRules(prev => [...prev, { id: newRuleId(), text }]);
    setNewRule("");
  };

  const updateRule = (id: string, text: string) => {
    setRules(prev => prev.map(r => (r.id === id ? { ...r, text } : r)));
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

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    saveGb<RulesState>(selectedGbId, "rules", { rules, welcomeMessage, orderNote });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!selectedGbId) {
    return (
      <div className="rounded-xl p-8 sm:p-12 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <ScrollText className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
        <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>
          No Group Buy Selected
        </h3>
        <p className="text-[14px]" style={{ color: "var(--t-subtle)" }}>
          Select a group buy to edit its rules and member messages
        </p>
      </div>
    );
  }

  const visibleRules = rules.filter(r => r.text.trim());

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="rounded-xl p-4 sm:p-5 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <h2 className="text-lg sm:text-xl font-bold" style={{ color: "var(--t-text)" }}>Rules &amp; Info</h2>
        <p className="text-[13px] sm:text-[14px] mt-1" style={{ color: "var(--t-subtle)" }}>
          Edit the rules and messages members see on this group buy
        </p>
      </div>

      {/* Explainer */}
      <div className="rounded-xl p-4 sm:p-5 bg-gradient-to-br from-violet-50 to-purple-50" style={{ border: "1px solid #DDD6FE" }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "#7C5CFC", color: "#fff" }}>
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>Why Rules Matter</h3>
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
              Your <strong style={{ color: "var(--t-text)" }}>rules</strong> are shown to members when they join and again before they place an order — they set expectations up front. The <strong style={{ color: "var(--t-text)" }}>welcome message</strong> greets new joiners, and the <strong style={{ color: "var(--t-text)" }}>confirmation note</strong> is appended to every order confirmation. Keep them clear and specific so disputes are easy to resolve later.
            </p>
          </div>
        </div>
      </div>

      {/* Rules list */}
      <div className="rounded-xl bg-white overflow-hidden" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ background: "var(--t-surface2)", borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
          <ScrollText className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
          <span className="text-[13px] font-bold uppercase tracking-wide" style={{ color: "var(--t-text)" }}>Rules</span>
          <span className="text-[12px] font-normal" style={{ color: "var(--t-subtle)" }}>— shown in order, exactly as numbered here</span>
        </div>
        <div className="p-4 space-y-2">
          {rules.length === 0 && (
            <p className="text-[14px] text-center py-4" style={{ color: "var(--t-subtle)" }}>
              No rules yet. Add your first one below.
            </p>
          )}
          {rules.map((rule, i) => (
            <div key={rule.id} className="flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
                style={{ background: "var(--t-blue-08)", color: "var(--t-blue)" }}
              >
                {i + 1}
              </span>
              <input
                type="text"
                value={rule.text}
                onChange={e => updateRule(rule.id, e.target.value)}
                placeholder="Rule text…"
                className="flex-1 h-9 px-3 rounded-lg text-[14px] outline-none"
                style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "#fff" }}
              />
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => moveRule(i, -1)}
                  disabled={i === 0}
                  title="Move up"
                  className="w-7 h-7 rounded-md flex items-center justify-center disabled:opacity-30 hover:bg-black/[0.04] transition-colors"
                >
                  <ArrowUp className="w-3.5 h-3.5" style={{ color: "var(--t-subtle)" }} />
                </button>
                <button
                  onClick={() => moveRule(i, 1)}
                  disabled={i === rules.length - 1}
                  title="Move down"
                  className="w-7 h-7 rounded-md flex items-center justify-center disabled:opacity-30 hover:bg-black/[0.04] transition-colors"
                >
                  <ArrowDown className="w-3.5 h-3.5" style={{ color: "var(--t-subtle)" }} />
                </button>
                <button
                  onClick={() => removeRule(rule.id)}
                  title="Remove rule"
                  className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-red-50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
                </button>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-2 pt-2">
            <input
              type="text"
              value={newRule}
              onChange={e => setNewRule(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addRule(); }}
              placeholder="e.g. Payments within 48h of order confirmation"
              className="flex-1 h-9 px-3 rounded-lg text-[14px] outline-none"
              style={{ border: `1px dashed ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "var(--t-surface2)" }}
            />
            <button
              onClick={addRule}
              disabled={!newRule.trim()}
              className="h-9 px-3.5 rounded-lg text-[13px] font-bold text-white flex items-center gap-1.5 shrink-0 disabled:opacity-40"
              style={{ background: "var(--t-blue)" }}
            >
              <Plus className="w-3.5 h-3.5" /> Add Rule
            </button>
          </div>
        </div>
      </div>

      {/* Welcome message */}
      <div className="rounded-xl bg-white overflow-hidden" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ background: "var(--t-surface2)", borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
          <MessageSquare className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
          <span className="text-[13px] font-bold uppercase tracking-wide" style={{ color: "var(--t-text)" }}>Welcome Message</span>
          <span className="text-[12px] font-normal" style={{ color: "var(--t-subtle)" }}>— shown to members when they join</span>
        </div>
        <div className="p-4">
          <textarea
            value={welcomeMessage}
            onChange={e => setWelcomeMessage(e.target.value)}
            rows={3}
            placeholder="e.g. Welcome to the group buy! Read the rules before ordering…"
            className="w-full px-3 py-2 rounded-lg text-[14px] outline-none resize-y"
            style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "#fff" }}
          />
        </div>
      </div>

      {/* Order confirmation note */}
      <div className="rounded-xl bg-white overflow-hidden" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ background: "var(--t-surface2)", borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
          <ClipboardCheck className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
          <span className="text-[13px] font-bold uppercase tracking-wide" style={{ color: "var(--t-text)" }}>Order Confirmation Note</span>
          <span className="text-[12px] font-normal" style={{ color: "var(--t-subtle)" }}>— appended to every order confirmation</span>
        </div>
        <div className="p-4">
          <textarea
            value={orderNote}
            onChange={e => setOrderNote(e.target.value)}
            rows={3}
            placeholder="e.g. Your order is locked in once payment clears…"
            className="w-full px-3 py-2 rounded-lg text-[14px] outline-none resize-y"
            style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "#fff" }}
          />
        </div>
      </div>

      {/* Member preview */}
      <div className="rounded-lg p-4 space-y-3" style={{ border: `1px dashed ${V2_CARD_BORDER}`, background: "var(--t-surface2)" }}>
        <p className="text-[12px] font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: "var(--t-subtle)" }}>
          <Eye className="w-3.5 h-3.5" /> Member preview
        </p>
        {welcomeMessage.trim() && (
          <p className="text-[14px] whitespace-pre-wrap" style={{ color: "var(--t-text)" }}>{welcomeMessage}</p>
        )}
        {visibleRules.length > 0 ? (
          <div className="space-y-1.5 pt-1" style={{ borderTop: welcomeMessage.trim() ? `1px solid ${V2_CARD_BORDER}` : "none" }}>
            <p className="text-[12px] font-semibold uppercase tracking-wide pt-1" style={{ color: "var(--t-subtle)" }}>Group Buy Rules</p>
            <ol className="space-y-1">
              {visibleRules.map((rule, i) => (
                <li key={rule.id} className="text-[14px] flex gap-2" style={{ color: "var(--t-text)" }}>
                  <span className="font-bold shrink-0" style={{ color: "var(--t-blue)" }}>{i + 1}.</span>
                  <span>{rule.text}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="text-[13px] italic" style={{ color: "var(--t-subtle)" }}>No rules to preview yet.</p>
        )}
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="h-10 px-5 rounded-lg text-[14px] font-bold text-white flex items-center gap-2 disabled:opacity-50"
        style={{ background: saved ? "#16A34A" : "var(--t-blue)" }}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saving ? "Saving..." : saved ? "Saved!" : "Save Rules & Info"}
      </button>
    </div>
  );
}
