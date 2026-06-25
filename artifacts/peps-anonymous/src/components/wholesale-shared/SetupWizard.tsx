import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Compass, Lock, X } from "lucide-react";
import type { WholesaleShareDetail } from "@/hooks/use-wholesale-shares";
import type { GuidePlan, GuideTarget } from "./next-step";

interface SetupWizardProps {
  open: boolean;
  onClose: () => void;
  plan: GuidePlan;
  share: WholesaleShareDetail;
  onAction: (target: GuideTarget) => void;
  copiedInvite?: boolean;
}

function header(plan: GuidePlan, share: WholesaleShareDetail): { title: string; sub: string } {
  if (plan.stage === "paying") return { title: "Time to pay", sub: "Pay your share and settle any extras. The parcel ships once everyone pays." };
  if (plan.stage === "done") return { title: "Order placed", sub: "Everyone's order is paid. Settle any remaining direct fees below." };
  if (plan.stage === "cancelled") return { title: "Order cancelled", sub: "This shared order was cancelled." };
  if (share.delivery.canEditAddress) return { title: "You're the parcel recipient", sub: "Confirm where the parcel should go — and optionally forward items onward to others." };
  if (share.isCreator) return { title: "Set up your shared order", sub: "Invite people, pick who receives the parcel, then lock it so everyone can pay." };
  return { title: "Welcome to the shared order", sub: "Add your items now. When the organiser locks the order, you'll pay your share." };
}

// Skippable guided checklist. Auto-opens once per role-moment (handled by the page)
// and is re-openable via "Guide me". CTAs act inline (copy invite) or are handled by
// the page (scroll to the real control / go to pay) — no forms are duplicated here.
export function SetupWizard({ open, onClose, plan, share, onAction, copiedInvite }: SetupWizardProps) {
  const { title, sub } = header(plan, share);
  const required = plan.steps.filter(s => !s.optional);
  const doneCount = required.filter(s => s.done).length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose} />
          <motion.div
            className="relative w-full sm:max-w-md max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden"
            style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--t-border)" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="shrink-0 w-9 h-9 rounded-xl inline-flex items-center justify-center" style={{ background: "var(--t-blue)", color: "#fff" }}>
                    <Compass className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold" style={{ color: "var(--t-text)" }}>{title}</h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--t-muted)" }}>{sub}</p>
                  </div>
                </div>
                <button onClick={onClose} className="shrink-0 w-8 h-8 rounded-lg inline-flex items-center justify-center" style={{ background: "var(--t-surface2)", color: "var(--t-muted)" }} aria-label="Close guide">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {required.length > 0 && (
                <p className="text-[11px] font-semibold mt-3" style={{ color: "var(--t-muted)" }}>{doneCount} of {required.length} done</p>
              )}
            </div>

            {/* Steps */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {plan.steps.map((step, i) => {
                const isCurrent = step.id === plan.currentId;
                return (
                  <div
                    key={step.id}
                    className="rounded-2xl p-3.5"
                    style={{
                      background: isCurrent ? "var(--t-blue-08)" : "var(--t-surface2)",
                      border: isCurrent ? "1px solid var(--t-blue-25)" : "1px solid var(--t-border)",
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className="shrink-0 w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] font-bold mt-0.5"
                        style={step.done
                          ? { background: "rgba(34,197,94,0.15)", color: "#15803d" }
                          : isCurrent
                            ? { background: "var(--t-blue)", color: "#fff" }
                            : { background: "var(--t-surface)", color: "var(--t-muted)", border: "1px solid var(--t-border)" }}
                      >
                        {step.done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{step.title}</p>
                          {step.optional && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "var(--t-surface)", color: "var(--t-muted)", border: "1px solid var(--t-border)" }}>Optional</span>
                          )}
                          {step.done && <span className="text-[10px] font-bold" style={{ color: "#15803d" }}>Done</span>}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "var(--t-muted)" }}>{step.description}</p>
                        {step.blocked && step.note && (
                          <p className="text-xs mt-1.5 inline-flex items-center gap-1 font-medium" style={{ color: "#a16207" }}>
                            <Lock className="w-3 h-3" /> {step.note}
                          </p>
                        )}
                        {!step.done && step.cta && !step.blocked && (
                          <button
                            onClick={() => onAction(step.cta!.target)}
                            className="mt-2.5 inline-flex items-center gap-1.5 px-3 h-9 rounded-xl text-sm font-bold text-white"
                            style={{ background: "var(--t-blue)" }}
                          >
                            {step.cta.target.kind === "copyInvite" && copiedInvite ? "Link copied!" : step.cta.label}
                            {step.cta.target.kind !== "copyInvite" && <ArrowRight className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {plan.steps.length === 0 && (
                <p className="text-sm text-center py-6" style={{ color: "var(--t-muted)" }}>Nothing to do right now.</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5" style={{ borderTop: "1px solid var(--t-border)" }}>
              <button onClick={onClose} className="w-full h-11 rounded-xl text-sm font-bold" style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}>
                {plan.allDone ? "Got it" : "I'll do this later"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
