import React, { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Lock, Loader2, ArrowLeft } from "lucide-react";
import { T } from "@/lib/theme";

export default function Members() {
  const [, setLocation] = useLocation();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setLocation("/groups");
      } else {
        setError("Incorrect PIN.");
      }
    } catch {
      setError("Incorrect PIN.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: T.bg }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-3xl p-8 space-y-7"
        style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: T.shadow }}
      >
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ color: T.muted }}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="text-center space-y-3">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto"
            style={{ background: "rgba(75,128,232,0.10)" }}
          >
            <Lock className="w-8 h-8" style={{ color: T.navActive }} />
          </div>
          <h1 className="text-2xl font-display font-bold" style={{ color: T.text }}>
            Member Access
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: T.muted }}>
            Enter the PIN shared in your Telegram group to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Enter PIN"
            value={pin}
            onChange={e => { setPin(e.target.value); setError(""); }}
            autoFocus
            disabled={verifying}
            className="w-full h-14 rounded-xl text-center text-xl tracking-[0.3em] font-bold outline-none transition-all"
            style={{
              background: T.surface2,
              border: `1px solid ${error ? "#EF4444" : T.border}`,
              color: T.text,
            }}
          />

          {error && (
            <p className="text-center text-sm font-medium text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={!pin.trim() || verifying}
            className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
            style={{ background: T.navActive }}
          >
            {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
