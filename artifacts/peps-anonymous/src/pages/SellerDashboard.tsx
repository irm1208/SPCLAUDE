import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store, Package, Plus, Pencil, Trash2,
  Eye, EyeOff, Loader2, LogOut, X, Check, AlertTriangle,
  FlaskConical, DollarSign, Hash, FileText, ChevronRight,
  ShoppingBag, ToggleLeft, ToggleRight, ExternalLink,
  UserPlus, Lock, Globe, Send, MessageCircle, KeyRound, RotateCcw, CheckCircle2,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";

interface SellerSession {
  vendorId: string;
  vendorName: string;
  token: string;
}

interface Product {
  id: string; name: string; description: string | null;
  category: string | null; mgSize: string | null;
  price: number; currency: string; stock: number;
  batchNumber: string | null; labReportUrl: string | null;
  active: boolean; vendorId: string | null;
  vendorName: string | null; vendorRating: number | null;
}

interface Order {
  id: string; code: string; telegramUsername: string;
  status: string; orderStatus: string; paymentStatus: string; total: number;
  shippingName: string | null; shippingAddress: string | null;
  createdAt: string;
  items: { productName: string; quantity: number; lineTotal: number }[];
}

const STORAGE_KEY = "peps:seller_session";

function loadSession(): SellerSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSession(s: SellerSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

function sellerHeaders(session: SellerSession) {
  return {
    "Content-Type": "application/json",
    "x-seller-id": session.vendorId,
    "x-seller-token": session.token,
  };
}

// ─── Product Form Sheet ────────────────────────────────────────
interface ProductFormProps {
  product: Partial<Product> | null;
  onClose: () => void;
  onSave: (data: Partial<Product>) => Promise<void>;
}

function ProductFormSheet({ product, onClose, onSave }: ProductFormProps) {
  const isNew = !product?.id;
  const [form, setForm] = useState({
    name: product?.name ?? "",
    description: product?.description ?? "",
    category: product?.category ?? "",
    mgSize: product?.mgSize ?? "",
    price: product?.price?.toString() ?? "",
    currency: product?.currency ?? "USDT",
    stock: product?.stock?.toString() ?? "0",
    batchNumber: product?.batchNumber ?? "",
    labReportUrl: product?.labReportUrl ?? "",
    active: product?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Product name is required"); return; }
    if (!form.price || isNaN(parseFloat(form.price))) { setError("A valid price is required"); return; }
    setSaving(true);
    setError("");
    try {
      await onSave({
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        mgSize: form.mgSize.trim() || null,
        price: parseFloat(form.price),
        currency: form.currency.trim().toUpperCase() || "USDT",
        stock: Math.max(0, parseInt(form.stock) || 0),
        batchNumber: form.batchNumber.trim() || null,
        labReportUrl: form.labReportUrl.trim() || null,
        active: form.active,
      });
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    border: "1.5px solid var(--t-border)",
    color: "var(--t-text)",
    background: "var(--t-surface)",
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{
          maxHeight: "92vh",
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
          background: "var(--t-surface)",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--t-border)" }} />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 shrink-0">
          <h2 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>{isNew ? "New Listing" : "Edit Listing"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--t-surface2)" }}>
            <X className="w-4 h-4" style={{ color: "var(--t-muted)" }} />
          </button>
        </div>
        {/* Form */}
        <div className="overflow-y-auto flex-1 px-5 pb-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-sm font-medium" style={{ background: "rgba(239,68,68,0.08)", color: "#DC2626" }}>
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <Field label="Product Name *" icon={FlaskConical}>
            <input
              value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="e.g. BPC-157 5mg"
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
              style={inputStyle}
            />
          </Field>

          <Field label="Description" icon={FileText}>
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Brief product description"
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none resize-none"
              style={inputStyle}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Price *" icon={DollarSign}>
              <input
                value={form.price}
                onChange={e => set("price", e.target.value)}
                placeholder="0.00"
                type="number"
                min="0"
                step="0.01"
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                style={inputStyle}
              />
            </Field>
            <Field label="Currency">
              <select
                value={form.currency}
                onChange={e => set("currency", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none appearance-none"
                style={inputStyle}
              >
                <option>USDT</option>
                <option>GBP</option>
                <option>EUR</option>
                <option>USD</option>
                <option>BTC</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Stock" icon={Package}>
              <input
                value={form.stock}
                onChange={e => set("stock", e.target.value)}
                placeholder="0"
                type="number"
                min="0"
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                style={inputStyle}
              />
            </Field>
            <Field label="Size / MG">
              <input
                value={form.mgSize}
                onChange={e => set("mgSize", e.target.value)}
                placeholder="e.g. 5mg"
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                style={inputStyle}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <input
                value={form.category}
                onChange={e => set("category", e.target.value)}
                placeholder="e.g. GLP-1"
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                style={inputStyle}
              />
            </Field>
            <Field label="Batch No." icon={Hash}>
              <input
                value={form.batchNumber}
                onChange={e => set("batchNumber", e.target.value)}
                placeholder="e.g. B240301"
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="COA / Lab Report URL" icon={ExternalLink}>
            <input
              value={form.labReportUrl}
              onChange={e => set("labReportUrl", e.target.value)}
              placeholder="https://..."
              type="url"
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
              style={inputStyle}
            />
          </Field>

          {!isNew && (
            <div className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Listing active</p>
                <p className="text-xs" style={{ color: "var(--t-subtle)" }}>Visible to buyers on the marketplace</p>
              </div>
              <button onClick={() => set("active", !form.active)}>
                {form.active
                  ? <ToggleRight className="w-8 h-8" style={{ color: "var(--t-blue)" }} />
                  : <ToggleLeft className="w-8 h-8" style={{ color: "var(--t-subtle)" }} />
                }
              </button>
            </div>
          )}
        </div>
        {/* Save */}
        <div className="px-5 pb-8 pt-3 shrink-0" style={{ borderTop: "1px solid var(--t-border)" }}>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full h-13 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, var(--t-blue) 0%, #1E3A8A 100%)", height: 52, boxShadow: "0 4px 18px var(--t-blue-35)" }}
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Saving…" : (isNew ? "Create Listing" : "Save Changes")}
          </button>
        </div>
      </motion.div>
    </>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--t-subtle)" }}>
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Login Screen ──────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (s: SellerSession) => void }) {
  const [tab, setTab] = useState<"login" | "signup">("login");

  return (
    <div className="flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-sm space-y-5">
        {/* Tabs */}
        <div className="flex rounded-xl p-1 gap-1" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
          {(["login", "signup"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 h-9 rounded-lg text-xs font-bold transition-all"
              style={{
                background: tab === t ? "var(--t-surface)" : "transparent",
                color: tab === t ? "var(--t-blue)" : "var(--t-subtle)",
                boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {t === "login" ? "Sign In" : "Apply to Sell"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "login" ? (
            <motion.div key="login" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }}>
              <LoginForm onLogin={onLogin} />
            </motion.div>
          ) : (
            <motion.div key="signup" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
              <SignupForm onDone={() => setTab("login")} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function LoginForm({ onLogin }: { onLogin: (s: SellerSession) => void }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Forgot password state
  const [fpStep, setFpStep] = useState<"login" | "fp-step1" | "fp-step2" | "fp-done">("login");
  const [fpName, setFpName] = useState("");
  const [fpCode, setFpCode] = useState("");
  const [fpNewPw, setFpNewPw] = useState("");
  const [fpConfirmPw, setFpConfirmPw] = useState("");
  const [showFpPw, setShowFpPw] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);

  const handleLogin = async () => {
    if (!name.trim()) { setError("Please enter your store name"); return; }
    if (!password) { setError("Password is required"); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/vial/seller/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); return; }
      const session: SellerSession = { vendorId: data.vendorId, vendorName: data.vendorName, token: data.token };
      saveSession(session); onLogin(session);
    } catch { setError("Connection error — please try again"); }
    finally { setSubmitting(false); }
  };

  const handleFpStep1 = async () => {
    if (!fpName.trim()) { setError("Please enter your store name"); return; }
    setFpLoading(true); setError("");
    try {
      const res = await fetch("/api/vial/seller/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fpName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to send reset code"); return; }
      setFpStep("fp-step2");
    } catch { setError("Connection error — please try again"); }
    finally { setFpLoading(false); }
  };

  const handleFpStep2 = async () => {
    if (fpCode.trim().length !== 6) { setError("Please enter the 6-digit code from Telegram"); return; }
    if (fpNewPw.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (fpNewPw !== fpConfirmPw) { setError("Passwords do not match"); return; }
    setFpLoading(true); setError("");
    try {
      const res = await fetch("/api/vial/seller/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fpName.trim(), code: fpCode.trim(), newPassword: fpNewPw }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to reset password"); return; }
      setFpStep("fp-done");
    } catch { setError("Connection error — please try again"); }
    finally { setFpLoading(false); }
  };

  const resetFp = () => {
    setFpStep("login"); setFpName(""); setFpCode("");
    setFpNewPw(""); setFpConfirmPw(""); setError("");
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--t-surface)",
    border: "1px solid var(--t-border)",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  };
  const inputStyle: React.CSSProperties = {
    border: "1.5px solid var(--t-border)",
    color: "var(--t-text)",
    background: "var(--t-surface)",
  };

  if (fpStep === "fp-step1") {
    return (
      <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(27,58,122,0.08)" }}>
            <KeyRound className="w-4 h-4" style={{ color: "var(--t-blue-deep)" }} />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight" style={{ color: "var(--t-text)" }}>Reset Password</p>
            <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>We'll send a code to your linked Telegram</p>
          </div>
        </div>
        {error && <div className="flex items-center gap-2 p-3 rounded-xl text-sm font-medium" style={{ background: "rgba(239,68,68,0.08)", color: "#DC2626" }}><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--t-subtle)" }}>Store Name</label>
          <div className="relative">
            <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-subtle)" }} />
            <input value={fpName} onChange={e => setFpName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleFpStep1()}
              placeholder="Your store name" className="w-full h-11 pl-9 pr-3 rounded-xl text-sm focus:outline-none" style={inputStyle} />
          </div>
        </div>
        <button onClick={handleFpStep1} disabled={fpLoading || !fpName.trim()}
          className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: "var(--t-blue-deep)" }}>
          {fpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
          {fpLoading ? "Sending…" : "Send Code via Telegram"}
        </button>
        <button onClick={resetFp} className="w-full text-xs font-semibold text-center py-1" style={{ color: "var(--t-subtle)" }}>Back to sign in</button>
      </div>
    );
  }

  if (fpStep === "fp-step2") {
    return (
      <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
        <div className="rounded-xl px-4 py-3" style={{ background: "rgba(22,163,74,0.07)", border: "1px solid rgba(22,163,74,0.18)" }}>
          <div className="flex items-center gap-2 mb-0.5">
            <MessageCircle className="w-4 h-4 text-green-600 shrink-0" />
            <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Code Sent</p>
          </div>
          <p className="text-xs text-green-700 leading-relaxed">Check your Telegram DMs from @SaltPepsBot and enter the 6-digit code below.</p>
        </div>
        {error && <div className="flex items-center gap-2 p-3 rounded-xl text-sm font-medium" style={{ background: "rgba(239,68,68,0.08)", color: "#DC2626" }}><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--t-subtle)" }}>6-Digit Code</label>
          <input type="text" value={fpCode} onChange={e => setFpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456" maxLength={6} autoComplete="one-time-code"
            className="w-full h-11 px-3 rounded-xl text-sm text-center font-bold tracking-[0.3em] focus:outline-none" style={inputStyle} />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--t-subtle)" }}>New Password</label>
          <div className="relative">
            <input type={showFpPw ? "text" : "password"} value={fpNewPw} onChange={e => setFpNewPw(e.target.value)}
              placeholder="Min. 8 characters" autoComplete="new-password"
              className="w-full h-11 px-3 pr-10 rounded-xl text-sm focus:outline-none" style={inputStyle} />
            <button type="button" onClick={() => setShowFpPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2">
              {showFpPw ? <EyeOff className="w-4 h-4" style={{ color: "var(--t-subtle)" }} /> : <Eye className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--t-subtle)" }}>Confirm Password</label>
          <input type="password" value={fpConfirmPw} onChange={e => setFpConfirmPw(e.target.value)}
            placeholder="Re-enter password" autoComplete="new-password"
            className="w-full h-11 px-3 rounded-xl text-sm focus:outline-none" style={inputStyle} />
        </div>
        <button onClick={handleFpStep2} disabled={fpLoading || fpCode.length !== 6 || fpNewPw.length < 8 || fpNewPw !== fpConfirmPw}
          className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: "var(--t-blue-deep)" }}>
          {fpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          {fpLoading ? "Resetting…" : "Reset Password"}
        </button>
        <button onClick={() => { setFpStep("fp-step1"); setError(""); }}
          className="w-full text-xs font-semibold text-center py-1 flex items-center justify-center gap-1" style={{ color: "var(--t-subtle)" }}>
          <RotateCcw className="w-3 h-3" /> Resend code
        </button>
      </div>
    );
  }

  if (fpStep === "fp-done") {
    return (
      <div className="rounded-xl p-6 text-center space-y-4" style={cardStyle}>
        <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}>
          <CheckCircle2 className="w-7 h-7 text-green-500" />
        </div>
        <div>
          <h3 className="text-base font-bold" style={{ color: "var(--t-text)" }}>Password Updated</h3>
          <p className="text-sm mt-1" style={{ color: "var(--t-muted)" }}>Sign in below with your new password.</p>
        </div>
        <button onClick={resetFp} className="w-full h-11 rounded-xl font-bold text-sm text-white" style={{ background: "var(--t-blue-deep)" }}>
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm font-medium" style={{ background: "rgba(239,68,68,0.08)", color: "#DC2626" }}>
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--t-subtle)" }}>Store Name</label>
        <div className="relative">
          <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-subtle)" }} />
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Your store name"
            autoComplete="username"
            className="w-full h-11 pl-9 pr-3 rounded-xl text-sm focus:outline-none"
            style={inputStyle}
          />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--t-subtle)" }}>Password</label>
          <button type="button" onClick={() => { setFpStep("fp-step1"); setFpName(name); setError(""); }}
            className="text-[11px] font-semibold" style={{ color: "var(--t-blue-deep)" }}>
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Enter your password"
            autoComplete="current-password"
            className="w-full h-11 px-3 pr-10 rounded-xl text-sm focus:outline-none"
            style={inputStyle}
          />
          <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2">
            {showPw ? <EyeOff className="w-4 h-4" style={{ color: "var(--t-subtle)" }} /> : <Eye className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />}
          </button>
        </div>
      </div>
      <button
        onClick={handleLogin}
        disabled={submitting}
        className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
        style={{ background: "linear-gradient(135deg, var(--t-blue) 0%, #1E3A8A 100%)", boxShadow: "0 4px 14px var(--t-blue-35)" }}
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
        {submitting ? "Signing in…" : "Sign In"}
      </button>
    </div>
  );
}

function SignupForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    name: "", tagline: "", contactTelegram: "", country: "", shipsTo: "",
    password: "", confirmPassword: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Store name is required"); return; }
    if (!form.contactTelegram.trim()) { setError("Telegram handle is required"); return; }
    if (!form.password) { setError("Password is required"); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (form.password !== form.confirmPassword) { setError("Passwords do not match"); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/vial/seller/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          tagline: form.tagline.trim() || null,
          contactTelegram: form.contactTelegram.trim().replace(/^@/, ""),
          country: form.country.trim() || null,
          shipsTo: form.shipsTo || null,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Signup failed"); return; }
      setSuccess(true);
    } catch { setError("Connection error — please try again"); }
    finally { setSubmitting(false); }
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--t-surface)",
    border: "1px solid var(--t-border)",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  };
  const inputStyle: React.CSSProperties = {
    border: "1.5px solid var(--t-border)",
    color: "var(--t-text)",
    background: "var(--t-surface)",
  };

  if (success) {
    return (
      <div className="rounded-xl p-6 text-center space-y-3" style={cardStyle}>
        <div className="w-14 h-14 rounded-xl mx-auto flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)" }}>
          <Check className="w-7 h-7" style={{ color: "#059669" }} />
        </div>
        <h3 className="text-base font-bold" style={{ color: "var(--t-text)" }}>Application Submitted!</h3>
        <p className="text-sm" style={{ color: "var(--t-muted)" }}>
          Your seller application is pending review. You'll be notified via Telegram once your account is approved.
        </p>
        <button
          onClick={onDone}
          className="w-full h-11 rounded-xl font-bold text-sm mt-2"
          style={{ background: "var(--t-blue-08)", color: "var(--t-blue)" }}
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
      <p className="text-xs" style={{ color: "var(--t-muted)" }}>
        Fill in your details to apply as a seller. Your account will be reviewed before activation.
      </p>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm font-medium" style={{ background: "rgba(239,68,68,0.08)", color: "#DC2626" }}>
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--t-subtle)" }}>Store Name *</label>
        <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Alpha Peptides UK" className="w-full h-11 px-3 rounded-xl text-sm focus:outline-none" style={inputStyle} />
      </div>

      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--t-subtle)" }}>Tagline</label>
        <input value={form.tagline} onChange={e => set("tagline", e.target.value)} placeholder="One-line description of your store" className="w-full h-11 px-3 rounded-xl text-sm focus:outline-none" style={inputStyle} />
      </div>

      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--t-subtle)" }}>Telegram Handle *</label>
        <div className="relative">
          <Send className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-subtle)" }} />
          <input value={form.contactTelegram} onChange={e => set("contactTelegram", e.target.value)} placeholder="@yourusername" className="w-full h-11 pl-9 pr-3 rounded-xl text-sm focus:outline-none" style={inputStyle} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--t-subtle)" }}>Country</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-subtle)" }} />
            <input value={form.country} onChange={e => set("country", e.target.value)} placeholder="e.g. UK" className="w-full h-11 pl-9 pr-3 rounded-xl text-sm focus:outline-none" style={inputStyle} />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--t-subtle)" }}>Ships To</label>
          <select value={form.shipsTo} onChange={e => set("shipsTo", e.target.value)} className="w-full h-11 px-3 rounded-xl text-sm focus:outline-none appearance-none" style={{ ...inputStyle, color: form.shipsTo ? "var(--t-text)" : "var(--t-subtle)" }}>
            <option value="">Select…</option>
            <option>UK</option>
            <option>Europe</option>
            <option>International</option>
            <option>UK & Europe</option>
            <option>UK & International</option>
            <option>Worldwide</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--t-subtle)" }}>Password *</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-subtle)" }} />
          <input type={showPw ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min 8 characters" className="w-full h-11 pl-9 pr-10 rounded-xl text-sm focus:outline-none" style={inputStyle} />
          <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2">
            {showPw ? <EyeOff className="w-4 h-4" style={{ color: "var(--t-subtle)" }} /> : <Eye className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />}
          </button>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--t-subtle)" }}>Confirm Password *</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-subtle)" }} />
          <input type={showPw ? "text" : "password"} value={form.confirmPassword} onChange={e => set("confirmPassword", e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} placeholder="Re-enter password" className="w-full h-11 pl-9 pr-3 rounded-xl text-sm focus:outline-none" style={inputStyle} />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
        style={{ background: "linear-gradient(135deg, var(--t-blue) 0%, #1E3A8A 100%)", boxShadow: "0 4px 14px var(--t-blue-35)" }}
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
        {submitting ? "Submitting…" : "Submit Application"}
      </button>
    </div>
  );
}

// ─── Product Card (seller view) ────────────────────────────────
function SellerProductCard({ product, onEdit, onToggle, onDelete }: {
  product: Product;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      className="rounded-xl"
      style={{
        background: "var(--t-surface)",
        border: product.active ? "1px solid var(--t-border)" : "1px solid var(--t-border)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        opacity: product.active ? 1 : 0.65,
      }}
    >
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {product.mgSize && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--t-blue-08)", color: "var(--t-blue)" }}>
                  {product.mgSize}
                </span>
              )}
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: product.active ? "rgba(16,185,129,0.1)" : "var(--t-surface2)",
                  color: product.active ? "#059669" : "var(--t-subtle)",
                }}
              >
                {product.active ? "Live" : "Hidden"}
              </span>
            </div>
            <p className="text-sm font-bold leading-snug" style={{ color: "var(--t-text)" }}>{product.name}</p>
            {product.description && (
              <p className="text-xs mt-0.5 truncate" style={{ color: "var(--t-subtle)" }}>{product.description}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-black" style={{ color: "var(--t-blue)" }}>${product.price.toFixed(2)}</p>
            <p className="text-[10px]" style={{ color: "var(--t-subtle)" }}>{product.currency}</p>
          </div>
        </div>
      </div>

      {/* Meta row */}
      <div className="px-4 pb-3 flex gap-4" style={{ borderBottom: "1px solid var(--t-border)" }}>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--t-subtle)" }}>Stock</p>
          <p className="text-xs font-bold" style={{ color: product.stock > 0 ? "#059669" : "#DC2626" }}>{product.stock} units</p>
        </div>
        {product.batchNumber && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--t-subtle)" }}>Batch</p>
            <p className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>{product.batchNumber}</p>
          </div>
        )}
        {product.labReportUrl && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--t-subtle)" }}>COA</p>
            <a href={product.labReportUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold flex items-center gap-0.5" style={{ color: "var(--t-blue)" }}>
              View <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        )}
      </div>

      {/* Action row */}
      <div className="px-4 py-3 flex items-center gap-2">
        <button
          onClick={onEdit}
          className="flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
          style={{ background: "var(--t-blue-08)", color: "var(--t-blue)", border: "1px solid var(--t-blue-15)" }}
        >
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
        <button
          onClick={onToggle}
          className="h-9 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
          style={{ background: "var(--t-surface2)", color: "var(--t-muted)", border: "1px solid var(--t-border)" }}
        >
          {product.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {product.active ? "Hide" : "Show"}
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={onDelete}
              className="h-9 px-3 rounded-xl text-xs font-bold"
              style={{ background: "rgba(239,68,68,0.1)", color: "#DC2626", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="h-9 px-2 rounded-xl text-xs"
              style={{ color: "var(--t-subtle)" }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="h-9 w-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)" }}
          >
            <Trash2 className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Orders Tab ────────────────────────────────────────────────
function OrdersTab({ session }: { session: SellerSession }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    fetch("/api/vial/seller/orders", { headers: sellerHeaders(session) })
      .then(r => r.json())
      .then(d => { setOrders(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const respond = async (orderId: string, action: "accept" | "reject") => {
    setActing(orderId); setErr("");
    try {
      const r = await fetch(`/api/vial/seller/orders/${orderId}/${action}`, {
        method: "POST", headers: sellerHeaders(session),
      });
      if (!r.ok) { const d = await r.json(); setErr(d.error ?? "Failed"); }
      else { load(); }
    } catch { setErr("Network error"); }
    finally { setActing(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-blue)" }} />
    </div>
  );

  if (orders.length === 0) return (
    <div className="text-center py-16 px-4">
      <ShoppingBag className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-border)" }} />
      <p className="text-sm font-medium" style={{ color: "var(--t-subtle)" }}>No orders yet</p>
      <p className="text-xs mt-1" style={{ color: "var(--t-subtle)" }}>Orders containing your products will appear here</p>
    </div>
  );

  const pending = orders.filter(o => (o.orderStatus ?? "accepted") === "pending_acceptance");
  const rest = orders.filter(o => (o.orderStatus ?? "accepted") !== "pending_acceptance");

  const OSTATUS: Record<string, { label: string; color: string }> = {
    pending_acceptance: { label: "Awaiting Approval", color: "var(--t-blue)" },
    accepted:          { label: "Accepted",           color: "#059669" },
    rejected:          { label: "Rejected",           color: "#DC2626" },
  };
  const PAY: Record<string, { label: string; color: string }> = {
    unpaid:    { label: "Unpaid",     color: "var(--t-blue)" },
    confirmed: { label: "Paid",       color: "#059669" },
  };

  const OrderCard = ({ o }: { o: Order }) => {
    const os = OSTATUS[o.orderStatus ?? "accepted"] ?? { label: o.orderStatus, color: "var(--t-subtle)" };
    const ps = PAY[o.paymentStatus] ?? { label: o.paymentStatus, color: "var(--t-subtle)" };
    const isPending = (o.orderStatus ?? "accepted") === "pending_acceptance";
    return (
      <div
        className="rounded-xl p-4 space-y-3"
        style={{
          background: "var(--t-surface)",
          border: isPending ? "2px solid var(--t-blue-35)" : "1px solid var(--t-border)",
          boxShadow: isPending ? "0 4px 20px var(--t-blue-12)" : "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        {isPending && (
          <div className="flex items-center gap-1.5 -mb-1">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--t-blue)" }}>Action Required</p>
          </div>
        )}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold font-mono tracking-wider" style={{ color: "var(--t-blue)" }}>{o.code}</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--t-text)" }}>@{o.telegramUsername}</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-base font-black" style={{ color: "var(--t-blue)" }}>${o.total.toFixed(2)}</p>
            <div className="flex gap-1 justify-end flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${os.color}18`, color: os.color }}>{os.label}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${ps.color}18`, color: ps.color }}>{ps.label}</span>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          {o.items.map((item, i) => (
            <div key={i} className="flex justify-between text-xs" style={{ color: "var(--t-muted)" }}>
              <span>{item.productName} ×{item.quantity}</span>
              <span className="font-semibold">${item.lineTotal.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {(o.shippingName || o.shippingAddress) && (
          <div className="rounded-xl p-3 space-y-0.5" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--t-blue)" }}>Ship to</p>
            {o.shippingName && <p className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>{o.shippingName}</p>}
            {o.shippingAddress && <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: "var(--t-muted)" }}>{o.shippingAddress}</p>}
          </div>
        )}

        {isPending && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => respond(o.id, "accept")}
              disabled={acting === o.id}
              className="flex-1 h-10 rounded-xl text-sm font-bold transition-all"
              style={{ background: "#059669", color: "white", opacity: acting === o.id ? 0.6 : 1 }}
            >
              {acting === o.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Accept Order"}
            </button>
            <button
              onClick={() => respond(o.id, "reject")}
              disabled={acting === o.id}
              className="flex-1 h-10 rounded-xl text-sm font-bold transition-all"
              style={{ background: "rgba(220,38,38,0.08)", color: "#DC2626", border: "1.5px solid rgba(220,38,38,0.2)", opacity: acting === o.id ? 0.6 : 1 }}
            >
              Reject
            </button>
          </div>
        )}

        <p className="text-[10px]" style={{ color: "var(--t-subtle)" }}>
          {new Date(o.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-3 px-4 pb-8">
      {err && <p className="text-xs text-red-500 px-1">{err}</p>}
      {pending.length > 0 && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-wider pt-1" style={{ color: "var(--t-blue)" }}>
            Pending Approval ({pending.length})
          </p>
          {pending.map(o => <OrderCard key={o.id} o={o} />)}
          {rest.length > 0 && <p className="text-[11px] font-bold uppercase tracking-wider pt-2" style={{ color: "var(--t-subtle)" }}>Previous Orders</p>}
        </>
      )}
      {rest.map(o => <OrderCard key={o.id} o={o} />)}
    </div>
  );
}

// ─── Listings Tab ──────────────────────────────────────────────
function ListingsTab({ session }: { session: SellerSession }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Product | "new" | null>(null);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    fetch("/api/vial/seller/products", { headers: sellerHeaders(session) })
      .then(r => r.json())
      .then(d => { setProducts(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleSave = async (data: Partial<Product>) => {
    if (editing === "new") {
      const res = await fetch("/api/vial/seller/products", {
        method: "POST",
        headers: sellerHeaders(session),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to create");
      }
    } else if (editing) {
      const res = await fetch(`/api/vial/seller/products/${editing.id}`, {
        method: "PUT",
        headers: sellerHeaders(session),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to update");
      }
    }
    fetchProducts();
  };

  const handleToggle = async (product: Product) => {
    await fetch(`/api/vial/seller/products/${product.id}`, {
      method: "PUT",
      headers: sellerHeaders(session),
      body: JSON.stringify({ active: !product.active }),
    });
    fetchProducts();
  };

  const handleDelete = async (product: Product) => {
    await fetch(`/api/vial/seller/products/${product.id}`, {
      method: "DELETE",
      headers: sellerHeaders(session),
    });
    fetchProducts();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-blue)" }} />
    </div>
  );

  return (
    <>
      <div className="px-4 space-y-3 pb-32">
        {error && (
          <div className="p-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.08)", color: "#DC2626" }}>{error}</div>
        )}
        {products.length === 0 ? (
          <div className="text-center py-16">
            <FlaskConical className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--t-border)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--t-subtle)" }}>No listings yet</p>
            <p className="text-xs mt-1" style={{ color: "var(--t-subtle)" }}>Create your first listing to start selling</p>
          </div>
        ) : (
          products.map(p => (
            <SellerProductCard
              key={p.id}
              product={p}
              onEdit={() => setEditing(p)}
              onToggle={() => handleToggle(p)}
              onDelete={() => handleDelete(p)}
            />
          ))
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-6 right-4 z-30">
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-2 h-14 px-5 rounded-xl font-bold text-sm text-white shadow-2xl"
          style={{ background: "linear-gradient(135deg, var(--t-blue) 0%, #1E3A8A 100%)", boxShadow: "0 6px 20px var(--t-blue-50)" }}
        >
          <Plus className="w-5 h-5" /> New Listing
        </button>
      </div>

      <AnimatePresence>
        {editing !== null && (
          <ProductFormSheet
            product={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Store Profile Tab ─────────────────────────────────────────
interface VendorProfile {
  id: string; name: string; tagline: string | null; description: string | null;
  contactTelegram: string | null; country: string | null; shipsTo: string | null;
  rating: number | null; walletAddress: string | null; revolutLink: string | null;
  paypalLink: string | null;
}

function StoreProfileTab({ session }: { session: SellerSession }) {
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    tagline: "", description: "", country: "", shipsTo: "",
    walletAddress: "", revolutLink: "", paypalLink: "",
  });

  useEffect(() => {
    fetch("/api/vial/seller/profile", { headers: sellerHeaders(session) })
      .then(r => r.json())
      .then(d => {
        setProfile(d);
        setForm({
          tagline: d.tagline || "",
          description: d.description || "",
          country: d.country || "",
          shipsTo: d.shipsTo || "",
          walletAddress: d.walletAddress || "",
          revolutLink: d.revolutLink || "",
          paypalLink: d.paypalLink || "",
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true); setError(""); setSuccess(false);
    try {
      const res = await fetch("/api/vial/seller/profile", {
        method: "PUT",
        headers: sellerHeaders(session),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Save failed"); return; }
      setProfile(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch { setError("Connection error"); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-subtle)" }} />
    </div>
  );

  const inputStyle: React.CSSProperties = {
    border: "1.5px solid var(--t-border)",
    color: "var(--t-text)",
    background: "var(--t-surface)",
  };

  return (
    <div className="px-4 pb-10 space-y-4">
      {profile && (
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #1E3A8A, var(--t-blue))" }}>
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: "var(--t-text)" }}>{profile.name}</p>
              {profile.contactTelegram && (
                <a href={`https://t.me/${profile.contactTelegram}`} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1" style={{ color: "var(--t-blue)" }}>
                  <Send className="w-3 h-3" /> @{profile.contactTelegram}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {error && <div className="flex items-center gap-2 p-3 rounded-xl text-sm font-medium" style={{ background: "rgba(239,68,68,0.08)", color: "#DC2626" }}><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}
      {success && <div className="flex items-center gap-2 p-3 rounded-xl text-sm font-medium" style={{ background: "rgba(16,185,129,0.08)", color: "#059669" }}><Check className="w-4 h-4 shrink-0" />Store profile updated!</div>}

      <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--t-subtle)" }}>Store Info</p>
        <div>
          <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--t-subtle)" }}>Tagline</label>
          <input value={form.tagline} onChange={e => set("tagline", e.target.value)} placeholder="One-liner about your store" className="w-full h-10 px-3 rounded-xl text-sm focus:outline-none" style={inputStyle} />
        </div>
        <div>
          <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--t-subtle)" }}>Description</label>
          <textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Tell buyers about your store…" rows={3} className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none resize-none" style={inputStyle} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--t-subtle)" }}>Country</label>
            <input value={form.country} onChange={e => set("country", e.target.value)} placeholder="e.g. UK" className="w-full h-10 px-3 rounded-xl text-sm focus:outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--t-subtle)" }}>Ships To</label>
            <select value={form.shipsTo} onChange={e => set("shipsTo", e.target.value)} className="w-full h-10 px-3 rounded-xl text-sm focus:outline-none appearance-none" style={inputStyle}>
              <option value="">Select…</option>
              <option>UK</option><option>Europe</option><option>International</option>
              <option>UK & Europe</option><option>UK & International</option><option>Worldwide</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--t-subtle)" }}>Payment Details</p>
        <p className="text-xs" style={{ color: "var(--t-muted)" }}>These appear on your product listings so buyers know how to pay you.</p>
        <div>
          <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--t-subtle)" }}>Crypto Wallet Address</label>
          <input value={form.walletAddress} onChange={e => set("walletAddress", e.target.value)} placeholder="0x… or TRC20 address" className="w-full h-10 px-3 rounded-xl text-sm focus:outline-none font-mono" style={inputStyle} />
        </div>
        <div>
          <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--t-subtle)" }}>Revolut Payment Link</label>
          <input value={form.revolutLink} onChange={e => set("revolutLink", e.target.value)} placeholder="https://revolut.me/…" type="url" className="w-full h-10 px-3 rounded-xl text-sm focus:outline-none" style={inputStyle} />
        </div>
        <div>
          <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--t-subtle)" }}>PayPal Payment Link</label>
          <input value={form.paypalLink} onChange={e => set("paypalLink", e.target.value)} placeholder="https://paypal.me/…" type="url" className="w-full h-10 px-3 rounded-xl text-sm focus:outline-none" style={inputStyle} />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
        style={{ background: "linear-gradient(135deg, var(--t-blue) 0%, #1E3A8A 100%)", boxShadow: "0 4px 18px var(--t-blue-30)" }}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────
export default function SellerDashboard() {
  const [session, setSession] = useState<SellerSession | null>(loadSession);
  const [tab, setTab] = useState<"listings" | "orders" | "store">("listings");

  const handleLogout = () => {
    clearSession();
    setSession(null);
  };

  const TABS = [
    { id: "listings" as const, label: "My Listings" },
    { id: "orders" as const, label: "Orders" },
    { id: "store" as const, label: "My Store" },
  ];

  return (
    <PageLayout>
      {/* ── Hero Banner ─────────────────────────────────────────── */}
      <div
        style={{ background: "linear-gradient(135deg, #2D6BCC 0%, #1B3A7A 100%)" }}
        className="relative"
      >
        <div className="max-w-xl mx-auto px-4 pt-8 pb-7">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
              >
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white leading-tight">
                  {session ? session.vendorName : "The Lonely Vial"}
                </h1>
                <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }}>
                  {session ? "Manage your listings" : "Seller Portal"}
                </p>
              </div>
            </div>
            {session && (
              <button
                onClick={handleLogout}
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(255,255,255,0.12)" }}
                title="Sign out"
              >
                <LogOut className="w-4 h-4 text-white/70" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab Bar (logged in only) ─────────────────────────────── */}
      {session && (
        <div className="max-w-xl mx-auto px-4 pt-4 pb-1">
          <div
            className="flex rounded-xl p-1 gap-1"
            style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}
          >
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex-1 h-9 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: tab === t.id ? "var(--t-surface)" : "transparent",
                  color: tab === t.id ? "var(--t-blue)" : "var(--t-muted)",
                  boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="flex-1 max-w-xl mx-auto w-full pt-4">
        {!session ? (
          <LoginScreen onLogin={setSession} />
        ) : tab === "listings" ? (
          <ListingsTab session={session} />
        ) : tab === "orders" ? (
          <OrdersTab session={session} />
        ) : (
          <StoreProfileTab session={session} />
        )}
      </div>
    </PageLayout>
  );
}
