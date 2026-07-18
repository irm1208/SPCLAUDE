import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, X, CheckSquare, Square, ScrollText } from "lucide-react";

const STORAGE_KEY = "sp_wholesale_rules_agreed_v1";
const ENABLED_KEY = "sp_wholesale_terms_enabled";

// Returns true if terms are disabled OR the customer has already agreed
export function hasAgreedToWholesaleRules(): boolean {
  try {
    if (localStorage.getItem(ENABLED_KEY) === "false") return true;
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch { return false; }
}

function markAgreed() {
  try { localStorage.setItem(STORAGE_KEY, "true"); } catch {}
}

const DEFAULT_RULES: { heading: string; body: string }[] = [
  { heading: "Research use only", body: "All products are sold strictly for laboratory research purposes. They are not intended for human or veterinary use, consumption, or clinical application of any kind." },
  { heading: "You are of legal age", body: "By placing an order you confirm you are 18 years of age or older and legally permitted to purchase research compounds in your jurisdiction." },
  { heading: "No resale to unverified parties", body: "You agree not to resell or redistribute products to any party who has not independently agreed to these terms and whose intended use is not research." },
  { heading: "Accurate information", body: "You are responsible for providing accurate shipping, contact, and account details. Orders delayed or lost due to incorrect information cannot be refunded." },
  { heading: "Payment & order finality", body: "Once an order has been confirmed and payment sent, it is considered final. Cancellations after payment processing has begun are at the discretion of the admin." },
  { heading: "No chargebacks", body: "Initiating a chargeback or payment dispute without first contacting us will result in immediate account suspension and potential legal action to recover losses." },
  { heading: "Shipping & customs risk", body: "You acknowledge that international shipments may be subject to customs inspection. Salt & Peps accepts no liability for seizures, delays, or additional duties imposed by your country's customs authority." },
  { heading: "Compliance with local laws", body: "It is your sole responsibility to ensure that purchasing, importing, and possessing these research compounds is lawful in your country or region. Salt & Peps bears no liability for your compliance." },
];

function useWholesaleTerms() {
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    fetch("/api/wholesale-terms")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        if (d.terms?.length) setRules(d.terms);
        const isEnabled = d.enabled !== false;
        setEnabled(isEnabled);
        try { localStorage.setItem(ENABLED_KEY, isEnabled ? "true" : "false"); } catch {}
      })
      .catch(() => {});
  }, []);
  return { rules, enabled };
}

interface Props {
  open: boolean;
  onClose: () => void;
  onAgree: () => void;
  context?: "order" | "join";
}

export function WholesaleRulesModal({ open, onClose, onAgree, context = "order" }: Props) {
  const { rules, enabled } = useWholesaleTerms();
  const [checked, setChecked] = useState(false);

  const handleAgree = () => {
    if (!checked) return;
    markAgreed();
    onAgree();
  };

  // If terms are disabled, treat as agreed immediately
  useEffect(() => {
    if (open && !enabled) { onAgree(); }
  }, [open, enabled, onAgree]);

  return (
    <AnimatePresence>
      {open && enabled && (
        <>
          <motion.div
            key="rules-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[70]"
            style={{ background: "rgba(3,18,40,0.55)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
            onClick={onClose}
          />

          <motion.div
            key="rules-modal"
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed z-[75] inset-x-4 flex flex-col overflow-hidden"
            style={{
              top: "50%",
              transform: "translateY(-50%)",
              maxWidth: 520,
              margin: "0 auto",
              maxHeight: "min(88vh, calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 32px))",
            }}
          >
            <div
              className="flex flex-col rounded-2xl overflow-hidden min-h-0 flex-1"
              style={{
                background: "var(--t-panel)",
                border: "1px solid var(--t-border)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between shrink-0 px-5 pt-5 pb-4"
                style={{ borderBottom: "1px solid var(--t-border)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(1,118,211,0.12)" }}
                  >
                    <ScrollText className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
                  </div>
                  <div>
                    <h2 className="font-bold text-base leading-tight" style={{ color: "var(--t-text)" }}>
                      Wholesale Terms & Conditions
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--t-muted)" }}>
                      Please read and agree before {context === "join" ? "joining this shared order" : "placing your order"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: "var(--t-chip)", color: "var(--t-muted)" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable rules body */}
              <div className="flex-1 overflow-y-auto px-5 py-4" style={{ minHeight: 0 }}>
                <div className="flex flex-col gap-3">
                  {rules.map((rule, i) => (
                    <div
                      key={i}
                      className="rounded-xl px-4 py-3"
                      style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}
                    >
                      <p className="text-sm font-bold mb-1" style={{ color: "var(--t-text)" }}>
                        {i + 1}. {rule.heading}
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--t-muted)" }}>
                        {rule.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div
                className="shrink-0 px-5 pb-5 pt-4 flex flex-col gap-3"
                style={{ borderTop: "1px solid var(--t-border)" }}
              >
                <button
                  onClick={() => setChecked(c => !c)}
                  className="flex items-start gap-3 text-left w-full"
                >
                  <span className="mt-0.5 shrink-0" style={{ color: checked ? "var(--t-blue)" : "var(--t-muted)" }}>
                    {checked
                      ? <CheckSquare className="w-5 h-5" />
                      : <Square className="w-5 h-5" />}
                  </span>
                  <span className="text-sm leading-snug" style={{ color: "var(--t-text)" }}>
                    I have read and agree to the Salt & Peps wholesale terms and conditions above.
                  </span>
                </button>

                <button
                  onClick={handleAgree}
                  disabled={!checked}
                  className="w-full h-11 rounded-xl text-sm font-bold text-white inline-flex items-center justify-center gap-2 transition-all disabled:opacity-40 active:scale-[0.98]"
                  style={{ background: "var(--t-blue)" }}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Accept & Continue
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
