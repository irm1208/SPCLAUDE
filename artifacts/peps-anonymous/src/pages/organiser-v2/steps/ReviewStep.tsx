import { CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";
import { V2_CARD_BORDER } from "../theme";
import { useSetupDraftSnapshot } from "../setup-draft-context";

// ─── Setup: Review & Launch Step ─────────────────────────────────────────────
// Final review of all settings before launching the group buy. Shows a summary
// of what was configured in previous steps.

export default function ReviewStep({ onEdit }: { onEdit?: (step: number) => void }) {
  const draft = useSetupDraftSnapshot();
  const paymentMethods = [
    draft.payments?.cryptoEnabled ? "Cryptocurrency" : null,
    draft.payments?.anonpayEnabled ? "AnonPay" : null,
    draft.payments?.revolutEnabled ? "Revolut" : null,
    draft.payments?.paypalEnabled ? "PayPal" : null,
  ].filter((value): value is string => Boolean(value));
  const summary = {
    basics: {
      name: draft.basics?.name.trim() || "Not set",
      currency: draft.basics?.currency || "GBP",
      closeDate: draft.basics?.closeDate || "",
      complete: Boolean(draft.basics?.name.trim()),
    },
    products: {
      count: draft.products?.products.filter(product => product.name.trim()).length ?? 0,
      complete: Boolean(draft.products?.products.some(product => product.name.trim())),
    },
    shipping: {
      count: draft.shipping?.options.filter(option => option.label.trim()).length ?? 0,
      complete: Boolean(draft.shipping?.options.some(option => option.label.trim())),
    },
    payments: {
      methods: paymentMethods,
      complete: paymentMethods.length > 0,
    },
    access: {
      entryFee: draft.access?.entryFeeEnabled ?? false,
      pin: draft.access?.pinEnabled ?? false,
      complete: true,
    },
    rules: {
      hasWelcome: Boolean(draft.rules?.welcomeMessage.trim()),
      hasRules: Boolean(draft.rules?.rules.some(rule => rule.text.trim())),
      complete: true,
    },
  };

  const allComplete = Object.values(summary).every(s => typeof s === 'object' && s.complete);

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      {allComplete ? (
        <div className="rounded-lg p-4 flex items-start gap-3" style={{ background: "rgba(22,163,74,0.10)", border: "1px solid rgba(22,163,74,0.3)" }}>
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#16A34A" }} />
          <div>
            <div className="text-[14px] font-bold" style={{ color: "#16A34A" }}>Ready to Launch</div>
            <p className="text-[13px] mt-0.5" style={{ color: "#16A34A" }}>
              All required sections are complete. Review your settings below, then click "Launch GB" to make it live.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg p-4 flex items-start gap-3" style={{ background: "rgba(217,119,6,0.10)", border: "1px solid rgba(217,119,6,0.3)" }}>
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#D97706" }} />
          <div>
            <div className="text-[14px] font-bold" style={{ color: "#D97706" }}>Incomplete Setup</div>
            <p className="text-[13px] mt-0.5" style={{ color: "#D97706" }}>
              Some sections need attention before you can launch. Go back and complete the highlighted steps.
            </p>
          </div>
        </div>
      )}

      {/* Summary Sections */}
      <div className="space-y-3">
        {/* Basics */}
        <div className="rounded-lg p-4 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {summary.basics.complete ? (
                <CheckCircle2 className="w-4 h-4" style={{ color: "#16A34A" }} />
              ) : (
                <AlertCircle className="w-4 h-4" style={{ color: "#D97706" }} />
              )}
              <span className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Basics</span>
            </div>
            <button type="button" onClick={() => onEdit?.(0)} className="text-[12px] font-semibold flex items-center gap-0.5" style={{ color: "var(--t-blue)" }}>
              Edit <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="text-[13px] space-y-1" style={{ color: "var(--t-muted)" }}>
            <div><span style={{ color: "var(--t-subtle)" }}>Name:</span> {summary.basics.name}</div>
            <div><span style={{ color: "var(--t-subtle)" }}>Currency:</span> {summary.basics.currency}</div>
            <div><span style={{ color: "var(--t-subtle)" }}>Close Date:</span> {summary.basics.closeDate ? new Date(summary.basics.closeDate).toLocaleDateString() : "No deadline"}</div>
          </div>
        </div>

        {/* Products */}
        <div className="rounded-lg p-4 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {summary.products.complete ? (
                <CheckCircle2 className="w-4 h-4" style={{ color: "#16A34A" }} />
              ) : (
                <AlertCircle className="w-4 h-4" style={{ color: "#D97706" }} />
              )}
              <span className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Products</span>
            </div>
            <button type="button" onClick={() => onEdit?.(1)} className="text-[12px] font-semibold flex items-center gap-0.5" style={{ color: "var(--t-blue)" }}>
              Edit <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="text-[13px]" style={{ color: "var(--t-muted)" }}>
            {summary.products.count} product{summary.products.count !== 1 ? 's' : ''} added
          </div>
        </div>

        {/* Shipping */}
        <div className="rounded-lg p-4 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {summary.shipping.complete ? (
                <CheckCircle2 className="w-4 h-4" style={{ color: "#16A34A" }} />
              ) : (
                <AlertCircle className="w-4 h-4" style={{ color: "#D97706" }} />
              )}
              <span className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Shipping</span>
            </div>
            <button type="button" onClick={() => onEdit?.(2)} className="text-[12px] font-semibold flex items-center gap-0.5" style={{ color: "var(--t-blue)" }}>
              Edit <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="text-[13px]" style={{ color: "var(--t-muted)" }}>
            {summary.shipping.count} shipping option{summary.shipping.count !== 1 ? 's' : ''} configured
          </div>
        </div>

        {/* Payments */}
        <div className="rounded-lg p-4 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {summary.payments.complete ? (
                <CheckCircle2 className="w-4 h-4" style={{ color: "#16A34A" }} />
              ) : (
                <AlertCircle className="w-4 h-4" style={{ color: "#D97706" }} />
              )}
              <span className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Accepting Payments</span>
            </div>
            <button type="button" onClick={() => onEdit?.(3)} className="text-[12px] font-semibold flex items-center gap-0.5" style={{ color: "var(--t-blue)" }}>
              Edit <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="text-[13px]" style={{ color: "var(--t-muted)" }}>
            {summary.payments.methods.join(", ") || "No payment method enabled"}
          </div>
        </div>

        {/* Access */}
        <div className="rounded-lg p-4 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {summary.access.complete ? (
                <CheckCircle2 className="w-4 h-4" style={{ color: "#16A34A" }} />
              ) : (
                <AlertCircle className="w-4 h-4" style={{ color: "#D97706" }} />
              )}
              <span className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Access</span>
            </div>
            <button type="button" onClick={() => onEdit?.(4)} className="text-[12px] font-semibold flex items-center gap-0.5" style={{ color: "var(--t-blue)" }}>
              Edit <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="text-[13px] space-y-0.5" style={{ color: "var(--t-muted)" }}>
            {summary.access.pin && <div>• PIN protection enabled</div>}
            {summary.access.entryFee && <div>• Entry fee required</div>}
            {!summary.access.pin && !summary.access.entryFee && <div>Public access</div>}
          </div>
        </div>

        {/* Rules */}
        <div className="rounded-lg p-4 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {summary.rules.complete ? (
                <CheckCircle2 className="w-4 h-4" style={{ color: "#16A34A" }} />
              ) : (
                <AlertCircle className="w-4 h-4" style={{ color: "#D97706" }} />
              )}
              <span className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Rules & Info</span>
            </div>
            <button type="button" onClick={() => onEdit?.(5)} className="text-[12px] font-semibold flex items-center gap-0.5" style={{ color: "var(--t-blue)" }}>
              Edit <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="text-[13px] space-y-0.5" style={{ color: "var(--t-muted)" }}>
            {summary.rules.hasWelcome && <div>• Welcome message added</div>}
            {summary.rules.hasRules && <div>• Rules configured</div>}
            {!summary.rules.hasWelcome && !summary.rules.hasRules && <div>No messages configured</div>}
          </div>
        </div>
      </div>

      {/* What happens next */}
      <div className="rounded-lg p-4" style={{ background: "var(--t-blue-05)", border: `1px solid var(--t-blue-20)` }}>
        <div className="text-[14px] font-bold mb-2" style={{ color: "var(--t-blue)" }}>What happens when you launch?</div>
        <ul className="text-[13px] space-y-1.5" style={{ color: "var(--t-blue)" }}>
          <li>• Your group buy will be submitted for admin approval</li>
          <li>• Once approved, your GB will go live and will only be visible based upon your settings</li>
          <li>• Members can start joining and placing orders after approval</li>
          <li>• You'll be able to manage orders from the Workspace dashboard</li>
          <li>• You can still edit most settings after launching</li>
        </ul>
      </div>
    </div>
  );
}
