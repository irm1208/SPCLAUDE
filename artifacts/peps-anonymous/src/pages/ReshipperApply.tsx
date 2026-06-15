import React, { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Truck, CheckCircle2, Clock, XCircle, ShieldOff,
  ArrowRight, LogIn, Loader2, Globe, Package, Users,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { useAccount } from "@/hooks/use-account";

export default function ReshipperApply() {
  const { account, isLoading } = useAccount();
  const [, setLocation] = useLocation();
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = account?.reshipperStatus ?? null;

  const handleApply = async () => {
    setApplying(true);
    setError(null);
    try {
      const res = await fetch("/api/reshipper/apply", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setApplied(true);
      } else {
        setError(data.error || "Something went wrong.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <PageLayout>
      <div className="flex flex-col pb-10" style={{ background: "#F8FAFC", minHeight: "100%" }}>
        <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-4">

          {/* Hero banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl overflow-hidden relative"
            style={{ background: "linear-gradient(135deg, var(--t-blue) 0%, #1e40af 100%)" }}
          >
            <div className="p-6 relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Truck className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-white/70">Peps Anonymous</span>
              </div>
              <h1 className="text-2xl font-display font-bold text-white leading-tight">
                Become a Reshipper
              </h1>
              <p className="text-sm text-white/75 mt-2 leading-relaxed">
                Help your country's community by receiving and redistributing group buy shipments.
              </p>
            </div>
            <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-white/10 pointer-events-none" style={{ transform: "translate(35%, -35%)" }} />
            <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 pointer-events-none" style={{ transform: "translate(-30%, 30%)" }} />
          </motion.div>

          {/* What you'll do */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl p-5 space-y-3"
            style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}
          >
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>
              What reshippers do
            </p>
            {[
              { icon: Package, text: "Receive a bulk parcel from the admin for your country" },
              { icon: Users, text: "Repack and ship individual orders to members in your region" },
              { icon: Globe, text: "Accept payments directly from buyers in your local currency" },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "rgba(59,130,246,0.1)" }}>
                  <Icon className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--t-muted)" }}>{text}</p>
              </div>
            ))}
          </motion.div>

          {/* Status / CTA card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-5"
            style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--t-blue)" }} />
              </div>

            ) : !account ? (
              /* Not logged in */
              <div className="space-y-3">
                <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>
                  You need to be logged in to apply
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--t-muted)" }}>
                  Sign in to your Peps Anonymous account to submit your reshipper application.
                </p>
                <button
                  onClick={() => setLocation("/login?next=/reshipper-apply")}
                  className="mt-1 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: "var(--t-blue)" }}
                >
                  <LogIn className="w-4 h-4" />
                  Log in to continue
                </button>
              </div>

            ) : applied || status === "applied" ? (
              /* Application submitted */
              <div className="flex flex-col items-center text-center py-4 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--t-text)" }}>Application submitted</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--t-muted)" }}>
                    Your application is pending admin review. You'll be notified via Telegram when it's approved.
                  </p>
                </div>
              </div>

            ) : status === "approved" ? (
              /* Already approved */
              <div className="flex flex-col items-center text-center py-4 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--t-text)" }}>You're already an approved reshipper</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--t-muted)" }}>
                    Head to your reshipper dashboard to manage your assigned group buys.
                  </p>
                </div>
                <button
                  onClick={() => setLocation("/reshipper")}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: "var(--t-blue)" }}
                >
                  Go to dashboard
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            ) : status === "suspended" ? (
              /* Suspended */
              <div className="flex flex-col items-center text-center py-4 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                  <ShieldOff className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--t-text)" }}>Your account is suspended</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--t-muted)" }}>
                    Contact an admin on Telegram to appeal.
                  </p>
                </div>
              </div>

            ) : status === "rejected" ? (
              /* Rejected */
              <div className="flex flex-col items-center text-center py-4 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--t-text)" }}>Application not approved</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--t-muted)" }}>
                    Your previous application was not approved. Contact admin if you believe this is a mistake.
                  </p>
                </div>
              </div>

            ) : (
              /* Ready to apply */
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>
                    Apply as @{account.telegramUsername}
                  </p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--t-muted)" }}>
                    The admin will review your application and contact you via Telegram if approved.
                    No extra information is required at this stage.
                  </p>
                </div>

                {error && (
                  <p className="text-xs font-medium text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    {error}
                  </p>
                )}

                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: "var(--t-blue)" }}
                >
                  {applying
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                    : <><Truck className="w-4 h-4" /> Submit application</>
                  }
                </button>
              </div>
            )}
          </motion.div>

        </main>
      </div>
    </PageLayout>
  );
}
