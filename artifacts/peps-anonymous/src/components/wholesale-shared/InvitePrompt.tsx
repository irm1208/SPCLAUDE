import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Share2, Users, X } from "lucide-react";

interface InvitePromptProps {
  open: boolean;
  onClose: () => void;
  shareLink: string;
  onCopy: () => void;
  copied?: boolean;
  memberCount?: number;
  maxMembers?: number;
}

// One-time nudge shown right after a member saves their items: invite more people
// by sharing the link. The page decides when to open it and remembers it's been
// shown (so long-time users don't keep seeing it). Presentation only.
export function InvitePrompt({ open, onClose, shareLink, onCopy, copied, memberCount, maxMembers }: InvitePromptProps) {
  // Close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
            role="dialog"
            aria-modal="true"
            aria-labelledby="ws-invite-prompt-title"
            className="relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden"
            style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <div className="px-5 pt-5 pb-5">
              <div className="flex items-start justify-between gap-3">
                <span className="shrink-0 w-10 h-10 rounded-xl inline-flex items-center justify-center" style={{ background: "var(--t-blue)", color: "#fff" }}>
                  <Share2 className="w-5 h-5" />
                </span>
                <button onClick={onClose} className="shrink-0 w-8 h-8 rounded-lg inline-flex items-center justify-center" style={{ background: "var(--t-surface2)", color: "var(--t-muted)" }} aria-label="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h2 id="ws-invite-prompt-title" className="text-base font-bold mt-3" style={{ color: "var(--t-text)" }}>Your items are saved</h2>
              <p className="text-sm mt-1" style={{ color: "var(--t-muted)" }}>
                Now invite others to join. Share this link so more people can add their items to this order.
              </p>

              {typeof memberCount === "number" && typeof maxMembers === "number" && (
                <p className="text-xs font-semibold mt-3 inline-flex items-center gap-1.5" style={{ color: "var(--t-muted)" }}>
                  <Users className="w-3.5 h-3.5" /> {memberCount} of {maxMembers} joined so far
                </p>
              )}

              {shareLink && (
                <div className="mt-3 px-3 h-11 rounded-xl flex items-center text-xs font-mono truncate" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>
                  {shareLink}
                </div>
              )}

              <button
                onClick={onCopy}
                className="mt-3 w-full h-11 rounded-xl text-sm font-bold text-white inline-flex items-center justify-center gap-2"
                style={{ background: "var(--t-blue)" }}
              >
                {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                {copied ? "Link copied!" : "Copy invite link"}
              </button>
              <button
                onClick={onClose}
                className="mt-2 w-full h-11 rounded-xl text-sm font-semibold"
                style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
