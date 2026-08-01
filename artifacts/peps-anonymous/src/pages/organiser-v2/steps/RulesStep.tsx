import { useState } from "react";
import { FileText, AlertCircle, MessageSquare, Info, Plus, Trash2 } from "lucide-react";
import { V2_CARD_BORDER } from "../theme";
import { useRegisterSetupSection } from "../setup-draft-context";

// ─── Setup: Rules & Info Step ────────────────────────────────────────────────
// Messages, rules, and information shown to members when they view the group buy.

interface Rule {
  id: string;
  text: string;
}

export default function RulesStep() {
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [rules, setRules] = useState<Rule[]>([
    { id: "1", text: "" },
  ]);
  const [disclaimer, setDisclaimer] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  useRegisterSetupSection("rules", { welcomeMessage, rules, disclaimer, additionalInfo });

  const addRule = () => {
    setRules(prev => [...prev, { id: String(Date.now()), text: "" }]);
  };

  const removeRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const updateRule = (id: string, text: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, text } : r));
  };

  return (
    <div className="space-y-4">
      {/* Description */}
      <div className="rounded-lg p-3" style={{ background: "var(--t-blue-05)", border: `1px solid var(--t-blue-20)` }}>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--t-blue)" }}>
          These messages and rules will be shown to members on the group buy page. Use them to explain how ordering works, set expectations, and include any important disclaimers.
        </p>
      </div>

      {/* Welcome Message */}
      <div className="rounded-lg bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }} data-tour="rules-welcome-card">
        <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "var(--t-surface2)", borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
          <MessageSquare className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
          <span className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Welcome Message</span>
        </div>
        <div className="p-4 space-y-3">
        <p className="text-[12px]" style={{ color: "var(--t-subtle)" }}>
          Shown at the top of the group buy page, right below the title. This is the first thing members see.
        </p>
        <textarea
          placeholder="e.g. Welcome to our Winter 2025 peptide group buy! We're offering verified products from QSC with Janoshik testing. Order closes Feb 15th."
          value={welcomeMessage}
          onChange={(e) => setWelcomeMessage(e.target.value)}
          rows={4}
          className="w-full px-3.5 py-2.5 rounded-md text-[14px] resize-none"
          style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
        />
        </div>
      </div>

      {/* Rules */}
      <div className="rounded-lg bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }} data-tour="rules-list">
        <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "var(--t-surface2)", borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
          <FileText className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
          <span className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Rules & Requirements</span>
        </div>
        <div className="p-4 space-y-3">
        <p className="text-[12px]" style={{ color: "var(--t-subtle)" }}>
          Displayed in a dedicated "Rules" section on the group buy page, before members can place orders.
        </p>

        <div className="space-y-2 pt-1">
          {rules.map((rule, index) => (
            <div key={rule.id} className="flex gap-2 items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[12px] font-semibold" style={{ color: "var(--t-subtle)" }}>
                    Rule {index + 1}
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Payment must be received within 24 hours"
                  value={rule.text}
                  onChange={(e) => updateRule(rule.id, e.target.value)}
                  className="w-full h-9 px-3 rounded-md text-[14px]"
                  style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
                />
              </div>
              {rules.length > 1 && (
                <button
                  onClick={() => removeRule(rule.id)}
                  className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 transition-colors hover:bg-red-50 mt-6"
                  style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "#EF4444" }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addRule}
          className="w-full h-9 rounded-md text-[13px] font-semibold transition-colors"
          style={{ border: `1px dashed ${V2_CARD_BORDER}`, color: "var(--t-blue)" }}
        >
          <Plus className="w-4 h-4 inline mr-1" /> Add Another Rule
        </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-lg bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }} data-tour="rules-disclaimer">
        <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "var(--t-surface2)", borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
          <AlertCircle className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
          <span className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Disclaimer</span>
        </div>
        <div className="p-4 space-y-3">
        <p className="text-[12px]" style={{ color: "var(--t-subtle)" }}>
          Shown at the bottom of the group buy page in a warning box. Members see this before and after ordering.
        </p>
        <textarea
          placeholder="e.g. All products are for research purposes only. By ordering, you acknowledge potential customs risks. The organizer is not responsible for seized packages or product effectiveness."
          value={disclaimer}
          onChange={(e) => setDisclaimer(e.target.value)}
          rows={5}
          className="w-full px-3.5 py-2.5 rounded-md text-[14px] resize-none"
          style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
        />
        </div>
      </div>

      {/* Additional Info */}
      <div className="rounded-lg bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }} data-tour="rules-info">
        <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "var(--t-surface2)", borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
          <Info className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
          <span className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Additional Information</span>
        </div>
        <div className="p-4 space-y-3">
        <p className="text-[12px]" style={{ color: "var(--t-subtle)" }}>
          Appears in an expandable "More Info" section on the group buy page. Members can click to read details about testing, delivery, etc.
        </p>
        <textarea
          placeholder="e.g. Lab testing certificates will be shared in the Telegram group once received. Expected delivery: 4-6 weeks after order closes. For questions, message @organiser on Telegram."
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
          rows={5}
          className="w-full px-3.5 py-2.5 rounded-md text-[14px] resize-none"
          style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)" }}
        />
        </div>
      </div>

      {/* Helper text */}
      <div className="rounded-lg p-3" style={{ background: "var(--t-blue-05)", border: `1px solid var(--t-blue-20)` }}>
        <p className="text-[13px]" style={{ color: "var(--t-blue)" }}>
          <strong>Tip:</strong> Be clear and specific. Include payment deadlines, return policies, and customs risks upfront to avoid disputes later.
        </p>
      </div>
    </div>
  );
}
