import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquarePlus, Send, CheckCircle2, ChevronRight, Lightbulb, Bug, Sparkles } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { useAccount } from "@/hooks/use-account";

type FeedbackType = "feedback" | "suggestion" | "bug" | "addition";

const TYPES: { id: FeedbackType; label: string; icon: React.ElementType; color: string; placeholder: string }[] = [
  {
    id: "feedback",
    label: "Feedback",
    icon: MessageSquarePlus,
    color: "var(--t-blue)",
    placeholder: "Tell us what you think — what's working well, what could be better, or anything you've noticed…",
  },
  {
    id: "suggestion",
    label: "Suggestion",
    icon: Lightbulb,
    color: "#f59e0b",
    placeholder: "What would you suggest changing or improving? Walk us through your idea…",
  },
  {
    id: "bug",
    label: "Bug Report",
    icon: Bug,
    color: "#ef4444",
    placeholder: "Describe what happened, what you expected, and the steps to reproduce the issue…",
  },
  {
    id: "addition",
    label: "Addition",
    icon: Sparkles,
    color: "#8b5cf6",
    placeholder: "What new product, feature, or capability would you like to see added?",
  },
];

const SUCCESS: Record<FeedbackType, { title: string; body: string }> = {
  feedback: {
    title: "Thanks for the feedback!",
    body: "We read every message and use it to improve the experience.",
  },
  suggestion: {
    title: "Suggestion received!",
    body: "We consider all suggestions when planning changes and improvements.",
  },
  bug: {
    title: "Bug report submitted!",
    body: "We'll look into it shortly. If you left a Telegram username we may follow up.",
  },
  addition: {
    title: "Addition request noted!",
    body: "We track all addition requests and factor them into our product roadmap.",
  },
};

export default function Feedback() {
  const { account } = useAccount();
  const [type, setType] = useState<FeedbackType>("feedback");
  const [message, setMessage] = useState("");
  const [telegram, setTelegram] = useState(account?.telegramUsername ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = TYPES.find(t => t.id === type)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || message.trim().length < 3) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message: message.trim(), telegramUsername: telegram.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setSubmitted(false); setMessage(""); setError(null); };

  return (
    <PageLayout>
      <div className="flex flex-col pb-6" style={{ background: "var(--t-bg)", minHeight: "100%" }}>
        <main className="flex-1 px-4 py-5 max-w-2xl mx-auto w-full space-y-4">

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl overflow-hidden relative"
            style={{ background: "linear-gradient(135deg, var(--t-blue) 0%, #4f46e5 100%)" }}
          >
            <div className="p-5 relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquarePlus className="w-5 h-5 text-blue-200" />
                <span className="text-xs font-bold uppercase tracking-wider text-blue-200">Community</span>
              </div>
              <h1 className="text-xl font-display font-bold text-white">Your Voice Matters</h1>
              <p className="text-sm text-white/80 mt-1 leading-relaxed">
                Share feedback, suggest changes, report bugs, or request new additions. Every message is read by the team.
              </p>
            </div>
            <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-white/10 pointer-events-none" style={{ transform: "translate(30%, -30%)" }} />
          </motion.div>

          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border shadow-sm p-8 text-center"
                style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}
              >
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-lg font-bold mb-1" style={{ color: "var(--t-text)" }}>{SUCCESS[type].title}</h2>
                <p className="text-sm mb-6 leading-relaxed" style={{ color: "var(--t-muted)" }}>{SUCCESS[type].body}</p>
                <button
                  onClick={reset}
                  className="h-10 px-6 rounded-xl text-sm font-bold text-white"
                  style={{ background: "var(--t-blue)" }}
                >
                  Submit Another
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* Type selector */}
                <div className="rounded-xl border shadow-sm overflow-hidden" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                  <div className="px-4 py-3 border-b" style={{ borderColor: "var(--t-border)" }}>
                    <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>What kind of message is this?</p>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {TYPES.map(t => {
                      const Icon = t.icon;
                      const active = type === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setType(t.id)}
                          className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-semibold transition-all"
                          style={
                            active
                              ? { background: `${t.color}18`, color: t.color, border: `1.5px solid ${t.color}40` }
                              : { background: "var(--t-surface2)", color: "var(--t-muted)", border: "1.5px solid var(--t-border)" }
                          }
                        >
                          <Icon className="w-4 h-4" strokeWidth={active ? 2.25 : 1.75} />
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Message */}
                <div className="rounded-xl border shadow-sm overflow-hidden" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                  <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "var(--t-border)" }}>
                    <selected.icon className="w-4 h-4" style={{ color: selected.color }} />
                    <span className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{selected.label}</span>
                  </div>
                  <div className="p-4">
                    <textarea
                      className="w-full text-sm placeholder:text-slate-400 rounded-xl p-3 min-h-[140px] resize-none focus:outline-none leading-relaxed"
                      style={{
                        background: "var(--t-surface2)",
                        color: "var(--t-text)",
                        border: "1px solid var(--t-border)",
                      }}
                      placeholder={selected.placeholder}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      maxLength={2000}
                    />
                    <div className="flex items-center justify-between mt-1.5 px-1">
                      <span className="text-xs" style={{ color: "var(--t-subtle)" }}>{message.length > 0 ? `${message.length}/2000` : ""}</span>
                      {message.trim().length < 3 && message.length > 0 && (
                        <span className="text-xs" style={{ color: "var(--t-blue)" }}>Too short</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Telegram */}
                <div className="rounded-xl border shadow-sm overflow-hidden" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                  <div className="px-4 py-3 border-b" style={{ borderColor: "var(--t-border)" }}>
                    <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Telegram Username <span className="font-normal" style={{ color: "var(--t-subtle)" }}>(optional)</span></p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--t-muted)" }}>So we can follow up if needed</p>
                  </div>
                  <div className="p-4">
                    <input
                      className="w-full h-11 rounded-xl px-4 text-sm placeholder:text-gray-400 focus:outline-none"
                      style={{
                        background: "var(--t-surface2)",
                        color: "var(--t-text)",
                        border: "1px solid var(--t-border)",
                      }}
                      placeholder="@username"
                      value={telegram}
                      onChange={e => setTelegram(e.target.value)}
                      maxLength={100}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-500 font-medium px-1">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || message.trim().length < 3}
                  className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  style={{ background: selected.color }}
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send {selected.label}
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="rounded-xl px-4 py-3 flex items-start gap-2.5 border shadow-sm" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
            <ChevronRight className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--t-blue)" }} />
            <p className="text-sm leading-relaxed" style={{ color: "var(--t-muted)" }}>
              All messages are reviewed by the team and used to shape the product. You can also send <strong style={{ color: "var(--t-text)" }}>/feedback</strong> in our Telegram bot.
            </p>
          </div>
        </main>
      </div>
    </PageLayout>
  );
}
