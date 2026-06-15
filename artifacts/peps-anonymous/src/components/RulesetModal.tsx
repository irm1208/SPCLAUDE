import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Loader2, X, AlertTriangle, Info, AlertCircle, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

type RuleFormat = "standard" | "info" | "warning" | "important";
interface PublicRule { text: string; format: RuleFormat; }
interface RulesetData { version: number; rules: PublicRule[]; }

interface RulesetModalProps {
  onAccepted: () => void;
  onClose?: () => void;
}

const FORMAT_CONFIG: Record<RuleFormat, {
  icon: React.FC<{ className?: string; style?: React.CSSProperties }> | null;
  bg: string;
  bgChecked: string;
  border: string;
  borderChecked: string;
  iconColor: string;
  textColor: string;
}> = {
  standard: {
    icon: null,
    bg: "rgba(255,255,255,0.04)",
    bgChecked: "rgba(91,141,239,0.10)",
    border: "rgba(255,255,255,0.08)",
    borderChecked: "rgba(91,141,239,0.35)",
    iconColor: "rgba(255,255,255,0.45)",
    textColor: "rgba(255,255,255,0.85)",
  },
  info: {
    icon: Info,
    bg: "rgba(91,141,239,0.10)",
    bgChecked: "rgba(91,141,239,0.18)",
    border: "rgba(91,141,239,0.22)",
    borderChecked: "rgba(91,141,239,0.45)",
    iconColor: "#5B8DEF",
    textColor: "rgba(255,255,255,0.9)",
  },
  warning: {
    icon: AlertTriangle,
    bg: "rgba(245,158,11,0.10)",
    bgChecked: "rgba(245,158,11,0.18)",
    border: "rgba(245,158,11,0.22)",
    borderChecked: "rgba(245,158,11,0.45)",
    iconColor: "#F59E0B",
    textColor: "rgba(255,255,255,0.9)",
  },
  important: {
    icon: AlertCircle,
    bg: "rgba(239,68,68,0.10)",
    bgChecked: "rgba(239,68,68,0.18)",
    border: "rgba(239,68,68,0.22)",
    borderChecked: "rgba(239,68,68,0.45)",
    iconColor: "#F87171",
    textColor: "rgba(255,255,255,0.95)",
  },
};

export function RulesetModal({ onAccepted, onClose }: RulesetModalProps) {
  const [ruleset, setRuleset] = useState<RulesetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    fetch("/api/site-settings/ruleset")
      .then(r => r.json())
      .then(setRuleset)
      .catch(() => setError("Failed to load rules. Please refresh and try again."))
      .finally(() => setLoading(false));
  }, []);

  const total = ruleset?.rules.length ?? 0;
  const allChecked = total > 0 && checked.size === total;
  const acceptedRef = useRef(false);

  const toggle = (i: number) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const handleAccept = async () => {
    if (acceptedRef.current || accepting) return;
    acceptedRef.current = true;
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/accept-rules", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed to record acceptance");
      await qc.invalidateQueries({ queryKey: ["account", "me"] });
      onAccepted();
    } catch {
      acceptedRef.current = false;
      setError("Something went wrong. Please try again.");
      setAccepting(false);
    }
  };

  // Auto-accept the moment all rules are ticked
  useEffect(() => {
    if (allChecked) handleAccept();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allChecked]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-0 sm:px-4"
        onClick={onClose ? (e) => { if (e.target === e.currentTarget) onClose(); } : undefined}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: "linear-gradient(135deg, #0D1B2A 0%, #162A44 100%)",
            boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
            maxHeight: "88vh",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Accent bar */}
          <div className="h-1 w-full shrink-0" style={{ background: "linear-gradient(90deg, #3B6FD4 0%, #5B8DEF 50%, #7BA7F5 100%)" }} />

          {/* Header */}
          <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(91,141,239,0.18)", border: "1px solid rgba(91,141,239,0.3)" }}>
                <Shield className="w-5 h-5" style={{ color: "#5B8DEF" }} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold leading-tight text-white">Community Rules</h2>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Tap each rule to confirm you've read it
                </p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
            {loading && (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#5B8DEF" }} />
              </div>
            )}
            {!loading && error && (
              <p className="text-sm text-red-400 text-center py-6">{error}</p>
            )}
            {!loading && ruleset && ruleset.rules.map((rule, i) => {
              const cfg = FORMAT_CONFIG[rule.format ?? "standard"];
              const Icon = cfg.icon;
              const isChecked = checked.has(i);
              return (
                <motion.button
                  key={i}
                  type="button"
                  onClick={() => toggle(i)}
                  whileTap={{ scale: 0.98 }}
                  className="w-full text-left flex gap-3 rounded-xl px-3.5 py-3 transition-all duration-150 cursor-pointer"
                  style={{
                    background: isChecked ? cfg.bgChecked : cfg.bg,
                    border: `1px solid ${isChecked ? cfg.borderChecked : cfg.border}`,
                  }}
                >
                  {/* Rule number / check indicator */}
                  <div className="shrink-0 mt-0.5">
                    <AnimatePresence mode="wait" initial={false}>
                      {isChecked ? (
                        <motion.span
                          key="check"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          className="w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: "#5B8DEF" }}
                        >
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </motion.span>
                      ) : (
                        <motion.span
                          key="num"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{ background: "rgba(255,255,255,0.1)", color: cfg.iconColor }}
                        >
                          {i + 1}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Text */}
                  <p
                    className="flex-1 text-sm leading-relaxed transition-colors duration-150"
                    style={{ color: isChecked ? "rgba(255,255,255,0.6)" : cfg.textColor }}
                  >
                    {rule.text}
                  </p>

                  {/* Format icon (only when not checked) */}
                  {Icon && !isChecked && (
                    <Icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: cfg.iconColor }} />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Footer */}
          {!loading && !error && (
            <div className="px-5 pt-3 pb-5 shrink-0 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              {/* Progress indicator */}
              {total > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: allChecked ? "#5B8DEF" : "rgba(255,255,255,0.4)" }}>
                      {allChecked ? "All rules acknowledged" : `${checked.size} of ${total} read`}
                    </span>
                    {allChecked && (
                      <motion.span
                        initial={{ opacity: 0, x: 4 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-xs font-semibold flex items-center gap-1"
                        style={{ color: "#5B8DEF" }}
                      >
                        {accepting ? <><Loader2 className="w-3 h-3 animate-spin" /> Accepting…</> : "All read ✓"}
                      </motion.span>
                    )}
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, #3B6FD4, #5B8DEF)" }}
                      animate={{ width: `${(checked.size / total) * 100}%` }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="space-y-2">
                  <p className="text-xs text-red-400">{error}</p>
                  <button
                    onClick={handleAccept}
                    className="w-full h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, #3B6FD4 0%, #5B8DEF 100%)", color: "white" }}
                  >
                    <Shield className="w-4 h-4" /> Try again
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
