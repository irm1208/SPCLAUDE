import React, { useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { COUNTRIES as COUNTRIES_LOOKUP } from "@/data/countries";
import {
  Loader2, Search, AlertCircle, Truck, Package, MessageCircle,
  KeyRound, CheckCircle2, Eye, EyeOff, ArrowLeft, QrCode,
  Upload, Download, ImagePlus, Plus, MapPin, Lock, Trash2, AtSign,
} from "lucide-react";
import { Button, Card, Input, Label, cn } from "@/components/ui";
import { PageLayout } from "@/components/PageLayout";
import { SiteAnnouncements } from "@/components/SiteAnnouncements";
import { useDraftStore } from "@/hooks/use-draft-store";
import { useRateLimit } from "@/hooks/use-rate-limit";
import { useCurrency } from "@/hooks/use-currency";
import PaymentPanel from "@/components/PaymentPanel";

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Submitted: "bg-blue-50 text-blue-600",
  Processing: "bg-blue-100 text-blue-700",
  Shipped: "bg-purple-100 text-purple-700",
  Completed: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-600",
};

const EDITABLE_STATUSES = ["Draft", "Submitted"];

// ─── Claim Account (first-time / seeded accounts) ────────────
function ClaimAccountForm({ onBack, onClaimed }: {
  onBack: () => void;
  onClaimed: (username: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim()) { setError("Please enter your Telegram username"); return; }
    if (!/^\d{4}$/.test(newPin)) { setError("PIN must be exactly 4 digits"); return; }
    if (newPin !== confirmPin) { setError("PINs do not match"); return; }
    if (newPin === "0000") { setError("Please choose a different PIN"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/orders/claim-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUsername: username.trim(), newPin, confirmPin }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to set up account");
      onClaimed(username.trim());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to set up account");
    }
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-semibold text-sm">Set Up Your Account</h2>
            <p className="text-xs text-muted-foreground">Choose a PIN to secure your order access</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <Label className="mb-1.5 block">Telegram Username</Label>
            <Input placeholder="@username" value={username}
              onChange={e => setUsername(e.target.value)} disabled={loading} />
          </div>
          <div>
            <Label className="mb-1.5 block">Choose a 4-Digit PIN</Label>
            <div className="relative">
              <Input
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                disabled={loading}
                className="pr-10 tracking-widest text-center font-mono text-lg"
                autoComplete="new-password"
              />
              <button type="button"
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPin(v => !v)}>
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">Confirm PIN</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              disabled={loading}
              className="tracking-widest text-center font-mono text-lg"
              autoComplete="new-password"
            />
          </div>
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <Button type="submit" className="w-full" size="lg"
            disabled={loading || !username.trim() || newPin.length !== 4 || confirmPin.length !== 4}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><KeyRound className="w-4 h-4 mr-2" />Set Up Account</>}
          </Button>
        </form>
      </Card>
    </motion.div>
  );
}

// ─── Mandatory PIN setup after first login with 0000 ─────────
function SetupPinPrompt({ orderId, telegramUsername, onDone }: {
  orderId: string;
  telegramUsername: string;
  onDone: (newPin: string) => void;
}) {
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}$/.test(newPin)) { setError("PIN must be exactly 4 digits"); return; }
    if (newPin !== confirmPin) { setError("PINs do not match"); return; }
    if (newPin === "0000") { setError("Please choose a different PIN"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUsername, currentPin: "0000", newPin }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      onDone(newPin);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save PIN");
    }
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Secure Your Account</h2>
            <p className="text-sm text-muted-foreground">Create a personal PIN to protect your order</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <Label className="mb-1.5 block">New 4-Digit PIN</Label>
            <div className="relative">
              <Input
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                disabled={loading}
                className="pr-10 tracking-widest text-center font-mono text-lg"
                autoComplete="new-password"
                autoFocus
              />
              <button type="button"
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPin(v => !v)}>
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">Confirm PIN</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              disabled={loading}
              className="tracking-widest text-center font-mono text-lg"
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-xs text-destructive font-medium">{error}</p>}
          <Button type="submit" className="w-full" size="lg"
            disabled={loading || newPin.length !== 4 || confirmPin.length !== 4}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save PIN & Continue"}
          </Button>
        </form>
      </Card>
    </motion.div>
  );
}

// ─── Change PIN (collapsible dropdown section) ───────────────
function ChangePinSection({ orderId, telegramUsername, currentPin, onChanged }: {
  orderId: string;
  telegramUsername: string;
  currentPin: string;
  onChanged: (newPin: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(newPin)) { setError("PIN must be exactly 4 digits"); return; }
    if (newPin !== confirmPin) { setError("PINs do not match"); return; }
    if (newPin === currentPin) { setError("New PIN must be different from current"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUsername, currentPin, newPin }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      onChanged(newPin);
      setOpen(false);
      setNewPin("");
      setConfirmPin("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to change PIN");
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-white/10 pt-3 mt-1">
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setError(null); }}
        className="flex items-center justify-between w-full text-left py-1 group"
      >
        <span className="flex items-center gap-2 text-sm text-white/50 group-hover:text-white/80 transition-colors">
          <KeyRound className="w-4 h-4" />
          Change PIN
        </span>
        <span className={cn(
          "text-white/50 transition-transform duration-200",
          open && "rotate-180"
        )}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="space-y-3 pt-3" autoComplete="off">
              <div>
                <label htmlFor="new-pin" className="mb-1.5 block text-xs font-bold text-blue-500 uppercase tracking-wider">New 4-Digit PIN</label>
                <div className="relative">
                  <input
                    id="new-pin"
                    type={showNew ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={4}
                    value={newPin}
                    onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="••••"
                    disabled={saving}
                    className="w-full h-11 rounded-xl px-4 pr-10 tracking-[0.3em] text-center font-mono text-lg bg-white/10 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-blue-200/40"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-white/40 hover:text-white/80"
                    onClick={() => setShowNew(v => !v)}
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirm-new-pin" className="mb-1.5 block text-xs font-bold text-blue-500 uppercase tracking-wider">Confirm New PIN</label>
                <input
                  id="confirm-new-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  disabled={saving}
                  className="w-full h-11 rounded-xl px-4 tracking-[0.3em] text-center font-mono text-lg bg-white/10 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-blue-200/40"
                  autoComplete="new-password"
                />
              </div>
              {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving || newPin.length !== 4 || confirmPin.length !== 4}
                  className="flex-1 h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 text-white disabled:opacity-50 transition-all active:scale-[0.98]"
                  style={{ background: "var(--t-blue)" }}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><KeyRound className="w-4 h-4" />Save PIN</>}
                </button>
                <button
                  type="button"
                  onClick={() => { setOpen(false); setNewPin(""); setConfirmPin(""); setError(null); }}
                  disabled={saving}
                  className="h-10 px-4 rounded-xl text-sm font-bold text-white/60 hover:text-white/80 border border-white/20 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Change Username (collapsible dropdown section) ──────────
function ChangeUsernameSection({ telegramUsername, pin, onChanged }: {
  telegramUsername: string;
  pin: string;
  onChanged: (newUsername: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newUsername.trim();
    if (!trimmed) { setError("Please enter a username"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/change-username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUsername, pin, newUsername: trimmed }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      onChanged(j.newUsername);
      setOpen(false);
      setNewUsername("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to change username");
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-white/10 pt-3 mt-1">
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setError(null); setNewUsername(""); }}
        className="flex items-center justify-between w-full text-left py-1 group"
      >
        <span className="flex items-center gap-2 text-sm text-white/50 group-hover:text-white/80 transition-colors">
          <AtSign className="w-4 h-4" />
          Change Username
        </span>
        <span className={cn("text-white/50 transition-transform duration-200", open && "rotate-180")}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="space-y-3 pt-3" autoComplete="off">
              <p className="text-xs text-white/40 leading-relaxed">
                This updates your username on all your orders. Use your new Telegram handle to look up orders in future.
              </p>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-blue-500 uppercase tracking-wider">New Telegram Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder="@newusername"
                  disabled={saving}
                  className="w-full h-11 rounded-xl px-4 text-sm bg-white/10 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-blue-200/40"
                  autoComplete="off"
                />
              </div>
              {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving || !newUsername.trim()}
                  className="flex-1 h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 text-white disabled:opacity-50 transition-all active:scale-[0.98]"
                  style={{ background: "var(--t-blue)" }}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><AtSign className="w-4 h-4" />Save Username</>}
                </button>
                <button
                  type="button"
                  onClick={() => { setOpen(false); setNewUsername(""); setError(null); }}
                  disabled={saving}
                  className="h-10 px-4 rounded-xl text-sm font-bold text-white/60 hover:text-white/80 border border-white/20 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// helper: courier name → URL-safe slug
function toCourierId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// ─── Generic QR Upload (on Lookup page) ──────────────────────
function LookupQrSection({ orderId, telegramUsername, pin, existingQr, onUploaded, courierId, courierName, customMessage, useAccountAuth }: {
  orderId: string;
  telegramUsername: string;
  pin: string;
  existingQr: string | null;
  onUploaded: (qr: string) => void;
  courierId: string;
  courierName: string;
  customMessage?: string | null;
  useAccountAuth?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(existingQr);

  const label = `${courierName} QR Code`;
  const defaultMsg = `Once the organiser confirms your order is ready to ship, upload your ${courierName} QR code here.`;

  const handleFile = async (file: File) => {
    setError(null);
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      setError("Please select a PNG, JPEG, or PDF file.");
      return;
    }
    if (file.size > 10_000_000) {
      setError("File is too large. Maximum size is 10 MB.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("telegramUsername", telegramUsername);
      formData.append("pin", pin);
      formData.append("courierId", courierId);
      const res = await fetch(`/api/orders/${orderId}/qr-upload`, {
        method: "POST",
        body: formData,
      });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const j = isJson ? await res.json() : {};
      if (!res.ok) throw new Error((j as { error?: string }).error || `Upload failed (${res.status})`);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Could not read file"));
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
      setPreviewSrc(dataUrl);
      onUploaded(dataUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
    setUploading(false);
  };

  const isPdfPreview = previewSrc?.startsWith("data:application/pdf");

  const handleDownload = () => {
    if (!previewSrc) return;
    const a = document.createElement("a");
    a.href = previewSrc;
    a.download = isPdfPreview ? `${courierId}-qr-code.pdf` : `${courierId}-qr-code.png`;
    a.click();
  };

  return (
    <Card className="p-5 border-violet-200 dark:border-violet-700/50 bg-violet-50/40 dark:bg-violet-950/30">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-full bg-violet-200 dark:bg-violet-800/40 flex items-center justify-center shrink-0">
          <QrCode className="w-4 h-4 text-violet-700 dark:text-violet-300" />
        </div>
        <div>
          <p className="font-semibold text-violet-900 dark:text-violet-300 text-sm">{label}</p>
          <p className="text-xs text-violet-700 dark:text-violet-400">
            {previewSrc ? "Your file is saved." : `Upload your ${label}`}
          </p>
        </div>
      </div>

      {!previewSrc && (
        <p className="text-xs text-violet-800 dark:text-violet-400 mb-3 leading-relaxed">
          {customMessage ?? defaultMsg}
        </p>
      )}

      {previewSrc && (
        <div className="mb-3">
          {isPdfPreview ? (
            <div className="w-48 h-24 mx-auto rounded-xl border border-violet-200 dark:border-violet-700/50 bg-white dark:bg-violet-950/50 flex flex-col items-center justify-center gap-1 p-2">
              <span className="text-2xl">📄</span>
              <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">PDF uploaded</span>
            </div>
          ) : (
            <img
              src={previewSrc}
              alt={label}
              className="w-48 h-48 object-contain mx-auto rounded-xl border border-violet-200 dark:border-violet-700/50 bg-white dark:bg-white/5 p-2"
            />
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive font-medium mb-2">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,application/pdf"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />

      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={previewSrc ? "outline" : "primary"}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-1.5 flex-1"
        >
          {uploading
            ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</>
            : previewSrc
            ? <><ImagePlus className="w-4 h-4" />Replace File</>
            : <><Upload className="w-4 h-4" />Upload QR Code &amp; Label</>
          }
        </Button>
        {previewSrc && (
          <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5">
            <Download className="w-4 h-4" />Save
          </Button>
        )}
      </div>
    </Card>
  );
}

// ─── Shipping Address (Royal Mail — post-payment) ────────────
const LOOKUP_COMMON_COUNTRIES = ["United Kingdom", "Ireland", "United States", "Canada", "Australia", "Germany", "France", "Netherlands", "Spain", "Italy"];

function ShippingAddressSection({ orderId, telegramUsername, pin, existingName, existingAddress, onSaved }: {
  orderId: string;
  telegramUsername: string;
  pin: string;
  existingName: string | null;
  existingAddress: string | null;
  onSaved: (name: string, address: string) => void;
}) {
  const [name, setName] = useState(existingName ?? "");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const hasExisting = !!(existingName && existingAddress);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !street.trim() || !city.trim() || !postcode.trim()) {
      setError("Full name, street address, city and postcode are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const fullAddress = [street.trim(), city.trim(), postcode.trim()].join("\n");
    try {
      const res = await fetch(`/api/orders/${orderId}/shipping-address`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUsername,
          pin,
          shippingName: name.trim(),
          shippingAddress: fullAddress,
          shippingCity: city.trim(),
          shippingPostcode: postcode.trim(),
          shippingCountry: country || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to save address");
      onSaved(j.shippingName, j.shippingAddress);
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save address");
    }
    setSaving(false);
  };

  if (saved) {
    const savedAddress = [street.trim(), city.trim(), postcode.trim(), country].filter(Boolean).join(", ");
    return (
      <div className="rounded-xl p-5 border" style={{ borderColor: "var(--t-border)", background: "color-mix(in srgb, #22c55e 8%, var(--t-surface))" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "color-mix(in srgb, #22c55e 15%, transparent)" }}>
            <CheckCircle2 className="w-4 h-4" style={{ color: "#22c55e" }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--t-text)" }}>
              {hasExisting ? "Address Updated" : "Address Saved"}
            </p>
            <p className="text-xs" style={{ color: "var(--t-muted)" }}>{name.trim()} — {savedAddress}</p>
          </div>
        </div>
      </div>
    );
  }

  const fieldStyle = {
    background: "var(--t-surface2)",
    borderColor: "var(--t-border)",
    color: "var(--t-text)",
  };
  const labelStyle = { color: "var(--t-blue)" };

  return (
    <div className="rounded-xl p-5 border" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "color-mix(in srgb, var(--t-blue) 15%, transparent)" }}>
          <MapPin className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: "var(--t-text)" }}>Delivery Address</p>
          <p className="text-xs" style={{ color: "var(--t-muted)" }}>
            {hasExisting
              ? "Your delivery address is saved. You can update it below."
              : "Please enter your Royal Mail delivery address so we can ship your order."}
          </p>
        </div>
      </div>

      {hasExisting && (
        <div className="mb-3 p-3 rounded-lg border text-sm" style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)" }}>
          <p className="font-medium text-xs uppercase tracking-wider mb-1" style={{ color: "var(--t-muted)" }}>Current address</p>
          <p className="font-semibold text-sm" style={{ color: "var(--t-text)" }}>{existingName}</p>
          <p className="text-xs whitespace-pre-wrap" style={{ color: "var(--t-muted)" }}>{existingAddress}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3" autoComplete="on">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider" style={labelStyle}>Full Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your full name"
            disabled={saving}
            maxLength={100}
            autoComplete="name"
            className="w-full h-11 rounded-xl px-4 text-sm border focus:outline-none disabled:opacity-50"
            style={fieldStyle}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider" style={labelStyle}>Address Line 1</label>
          <input
            value={street}
            onChange={e => setStreet(e.target.value)}
            placeholder="House number & street name"
            disabled={saving}
            maxLength={200}
            autoComplete="address-line1"
            className="w-full h-11 rounded-xl px-4 text-sm border focus:outline-none disabled:opacity-50"
            style={fieldStyle}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider" style={labelStyle}>City</label>
            <input
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="e.g. London"
              disabled={saving}
              maxLength={100}
              autoComplete="address-level2"
              className="w-full h-11 rounded-xl px-4 text-sm border focus:outline-none disabled:opacity-50"
              style={fieldStyle}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider" style={labelStyle}>Postcode</label>
            <input
              value={postcode}
              onChange={e => setPostcode(e.target.value)}
              placeholder="e.g. W1U 6TJ"
              disabled={saving}
              maxLength={20}
              autoComplete="postal-code"
              className="w-full h-11 rounded-xl px-4 text-sm border focus:outline-none disabled:opacity-50"
              style={fieldStyle}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider" style={labelStyle}>
            Country <span style={{ color: "var(--t-muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
          </label>
          <select
            value={country}
            onChange={e => setCountry(e.target.value)}
            disabled={saving}
            autoComplete="country-name"
            className="w-full h-11 rounded-xl px-4 text-sm border focus:outline-none disabled:opacity-50"
            style={{ ...fieldStyle, color: country ? "var(--t-text)" : "var(--t-muted)" }}
          >
            <option value="">Select country…</option>
            <optgroup label="Common">
              {LOOKUP_COMMON_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </optgroup>
            <optgroup label="All Countries">
              {COUNTRIES_LOOKUP.filter(c => !LOOKUP_COMMON_COUNTRIES.includes(c)).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {error && <p className="text-xs font-medium" style={{ color: "#f87171" }}>{error}</p>}

        <Button
          type="submit"
          className="w-full"
          disabled={saving || !name.trim() || !street.trim() || !city.trim() || !postcode.trim()}
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
            : hasExisting
            ? <><MapPin className="w-4 h-4 mr-2" />Update Address</>
            : <><MapPin className="w-4 h-4 mr-2" />Save Delivery Address</>
          }
        </Button>
      </form>
    </div>
  );
}

// ─── Main Lookup page ─────────────────────────────────────────
export default function Lookup() {
  const [, setLocation] = useLocation();
  const { loadExistingOrder, orderId: draftOrderId, clearOrderId: clearDraftOrderId } = useDraftStore();
  const { format } = useCurrency();

  const [view, setView] = useState<"login" | "claim" | "setup-pin" | "order">("login");

  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [foundOrder, setFoundOrder] = useState<any>(null);

  // Auto-login from CustomerPortal session when ?code= is in the URL.
  // Tries account cookie session first; falls back to PIN-based localStorage session.
  const autoSubmittedRef = React.useRef(false);
  React.useEffect(() => {
    if (autoSubmittedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return;
    autoSubmittedRef.current = true;
    setLoading(true);

    // Step 1: try account cookie session (portal users who are already logged in)
    fetch(`/api/account/order-by-code?code=${encodeURIComponent(code)}`, {
      credentials: "include",
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        setFoundOrder(data);
        if (data.telegramUsername) setUsername(data.telegramUsername.replace(/^@/, ""));
        setView("order");
        setLoading(false);
      })
      .catch(() => {
        // Step 2: fallback to PIN-based localStorage session (legacy lookup portal)
        try {
          const raw = localStorage.getItem("peps:portal_session");
          if (!raw) { setLoading(false); return; }
          const session = JSON.parse(raw) as { username: string; pin: string };
          if (!session.username || !session.pin) { setLoading(false); return; }
          setUsername(session.username);
          setPin(session.pin);
          fetch("/api/orders/lookup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: code, pin: session.pin }),
          })
            .then(r => r.json())
            .then(data => {
              if (data && !data.error) {
                setFoundOrder(data);
                setUsername(data.telegramUsername ?? session.username);
                setCurrentPin(session.pin);
                if (data.pin === "0000" || session.pin === "0000") {
                  setView("setup-pin");
                } else {
                  setView("order");
                }
              }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
        } catch { setLoading(false); }
      });
  }, []);
  const [pinChanged, setPinChanged] = useState(false);
  const [usernameChanged, setUsernameChanged] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { recordAttempt, isLockedOut, remainingMinutes, reset } = useRateLimit();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;
    if (!username.trim() || pin.length !== 4) {
      setError("Please enter your Telegram username and 4-digit PIN");
      return;
    }
    setError("");
    setFoundOrder(null);
    setLoading(true);
    try {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: username.trim(), pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        recordAttempt();
        setError(data.error || "Order not found. Please check your details.");
      } else {
        reset();
        setFoundOrder(data);
        setCurrentPin(pin);
        setPinChanged(false);
        // If still on default PIN, force setup
        if (data.pin === "0000" || pin === "0000") {
          setView("setup-pin");
        } else {
          setView("order");
        }
      }
    } catch {
      setError("Unable to connect. Please try again.");
    }
    setLoading(false);
  };

  const { startTopUpOrder } = useDraftStore();

  const handleEdit = () => {
    if (!foundOrder) return;
    loadExistingOrder(foundOrder);
    setLocation("/order");
  };

  const handleTopUp = () => {
    if (!foundOrder) return;
    startTopUpOrder(foundOrder);
    setLocation((foundOrder as any).groupBuyId ? `/order?gbId=${(foundOrder as any).groupBuyId}` : "/order");
  };

  const handleDelete = async () => {
    if (!foundOrder || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/orders/${foundOrder.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUsername: foundOrder.telegramUsername, pin: currentPin }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to delete order");
      if (draftOrderId === foundOrder.id) clearDraftOrderId();
      setFoundOrder(null);
      setDeleteConfirm(false);
      setView("login");
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete order");
    }
    setDeleting(false);
  };

  // ── Claim success → go back to login ──────────────────────
  const handleClaimed = (claimedUsername: string) => {
    setUsername(claimedUsername);
    setView("login");
  };

  // ── Mandatory PIN setup completed ─────────────────────────
  const handleSetupPinDone = (newPin: string) => {
    setCurrentPin(newPin);
    setPinChanged(false);
    setFoundOrder((prev: any) => prev ? { ...prev, pin: newPin } : prev);
    setView("order");
  };

  if (view === "claim") {
    return (
      <PageLayout>
      <div className="flex flex-col" style={{ background: "#F8FAFC", minHeight: "100%" }}>
        <SiteAnnouncements />
        <main className="flex-1 px-4 py-8 max-w-md mx-auto w-full">
          <ClaimAccountForm
            onBack={() => setView("login")}
            onClaimed={handleClaimed}
          />
          <p className="text-center text-sm text-green-600 font-medium mt-4 hidden" id="claim-success" />
        </main>
      </div>
      </PageLayout>
    );
  }

  if (view === "setup-pin" && foundOrder) {
    return (
      <PageLayout>
      <div className="flex flex-col" style={{ background: "#F8FAFC", minHeight: "100%" }}>
        <SiteAnnouncements />
        <main className="flex-1 px-4 py-8 max-w-md mx-auto w-full">
          <SetupPinPrompt
            orderId={foundOrder.id}
            telegramUsername={foundOrder.telegramUsername}
            onDone={handleSetupPinDone}
          />
        </main>
      </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
    <div className="flex flex-col" style={{ background: "#F8FAFC", minHeight: "100%" }}>
      <SiteAnnouncements />
      <main className="flex-1 px-4 py-5 max-w-md mx-auto w-full">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="pt-1 pb-1">
            <h1 className="text-2xl font-display font-bold tracking-tight text-slate-900">
              Find Your Order
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Enter your details to view or modify your order.</p>
          </div>

          {/* Login form */}
          {view === "login" && (
            <div className="rounded-xl p-6 relative overflow-hidden bg-white border border-gray-100 shadow-sm">
              {isLockedOut ? (
                <div className="text-center py-6">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Too Many Attempts</h3>
                  <p className="text-gray-500">Please wait {remainingMinutes} minutes before trying again.</p>
                </div>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="username" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Telegram Username or Order ID</label>
                    <input
                      id="username"
                      className="w-full h-11 rounded-xl px-4 text-sm bg-gray-50 border border-gray-200 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-200"
                      placeholder="@username or 1234"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="pin" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Your PIN</label>
                    <div className="relative">
                      <input
                        id="pin"
                        type={showPin ? "text" : "password"}
                        inputMode="numeric"
                        placeholder="••••"
                        maxLength={4}
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        disabled={loading}
                        className="w-full h-11 rounded-xl px-4 pr-10 tracking-[0.3em] text-center font-mono text-lg bg-gray-50 border border-gray-200 text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-blue-200"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowPin(v => !v)}
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {error && (
                    <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm flex items-start">
                      <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  <button
                    type="submit"
                    className="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 text-white mt-2 disabled:opacity-50 transition-all active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, var(--t-blue-deep) 0%, var(--t-blue) 100%)" }}
                    disabled={loading || !username || pin.length !== 4}
                  >
                    {loading
                      ? <Loader2 className="w-5 h-5 animate-spin" />
                      : <><Search className="w-5 h-5" />Find Order</>}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* First-time setup link */}
          {view === "login" && (
            <button
              onClick={() => setView("claim")}
              className="w-full text-sm text-center text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              First time here?{" "}
              <span className="text-blue-600 font-semibold underline underline-offset-2">Set up your account</span>
            </button>
          )}

          {/* Order result */}
          <AnimatePresence>
            {view === "order" && foundOrder && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                {/* Status + tracking */}
                <div className="rounded-xl text-white p-5 space-y-4 relative overflow-hidden" style={{ background: "linear-gradient(135deg, var(--t-blue) 0%, var(--t-blue) 100%)" }}>
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-blue-500/10 pointer-events-none" style={{ transform: "translate(30%, -30%)" }} />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white/50 mb-1">Order Code</p>
                      <p className="font-display font-bold text-2xl tracking-widest text-white">{foundOrder.code}</p>
                    </div>
                    <span className={cn("text-sm font-bold px-3 py-1.5 rounded-full",
                      STATUS_COLORS[foundOrder.status] ?? "bg-muted text-muted-foreground")}>
                      {foundOrder.status}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Telegram</span>
                    <span className="font-semibold text-white">{foundOrder.telegramUsername}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Delivery</span>
                    <span className="font-semibold text-white">{foundOrder.deliveryMethod}</span>
                  </div>

                  {(foundOrder as any).adminMessage && (
                    <div className="bg-blue-400/20 border border-blue-400/30 rounded-xl p-3 flex items-start gap-3">
                      <MessageCircle className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-blue-500 uppercase tracking-wide mb-1">Message from Us</p>
                        <p className="text-sm text-blue-100 leading-relaxed whitespace-pre-wrap">{(foundOrder as any).adminMessage}</p>
                      </div>
                    </div>
                  )}

                  {foundOrder.trackingNumber && (
                    <div className="bg-white/10 border border-white/10 rounded-xl p-3 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-0.5">Your Parcel</p>
                          <p className="font-mono font-bold text-white text-sm tracking-widest break-all">{foundOrder.trackingNumber}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                          style={{ color: foundOrder.status === "Completed" ? "#22c55e" : foundOrder.status === "Shipped" ? "#818cf8" : "#94a3b8", background: foundOrder.status === "Completed" ? "rgba(34,197,94,0.15)" : foundOrder.status === "Shipped" ? "rgba(129,140,248,0.15)" : "rgba(148,163,184,0.12)" }}>
                          {foundOrder.status}
                        </span>
                      </div>
                      {foundOrder.lineItems?.length > 0 && (
                        <div className="border-t border-white/10 pt-2 space-y-0.5">
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Contents</p>
                          {foundOrder.lineItems.map((li: any, i: number) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <Package className="w-3 h-3 text-white/30 shrink-0" />
                              <span className="text-xs text-white/70">{li.productName} <span className="text-white/40">×{li.quantity % 1 === 0 ? li.quantity : li.quantity.toFixed(1)}</span></span>
                            </div>
                          ))}
                        </div>
                      )}
                      <a
                        href={`https://t.17track.net/en#nums=${encodeURIComponent(foundOrder.trackingNumber)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-2"
                      >
                        🌐 Track on 17track →
                      </a>
                    </div>
                  )}

                  {/* Items */}
                  {foundOrder.lineItems?.length > 0 && (
                    <div className="border-t border-white/10 pt-3 space-y-1.5">
                      {foundOrder.lineItems.map((li: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-white">{li.productName}
                            <span className="text-white/50 ml-1">
                              ×{li.quantity % 1 === 0 ? li.quantity : li.quantity.toFixed(1)}
                            </span>
                          </span>
                          {!(foundOrder.groupBuyHidePricesWhenClosed && foundOrder.groupBuyStatus === "closed") && li.lineTotal > 0 && (
                            <span className="font-medium text-white">{format(li.lineTotal)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Totals */}
                  <div className="border-t border-white/10 pt-3 space-y-1.5 text-sm">
                    {/* Cost breakdown rows — hidden individually when flag is on and GB is closed */}
                    {!(foundOrder.groupBuyHideCostBreakdownWhenClosed && foundOrder.groupBuyStatus === "closed") && (<>
                      {foundOrder.productSubtotal > 0 && (
                        <div className="flex justify-between text-white/50">
                          <span>Products</span><span>{format(foundOrder.productSubtotal)}</span>
                        </div>
                      )}
                      {foundOrder.deliveryPrice > 0 && (
                        <div className="flex justify-between text-white/50">
                          <span>Delivery</span><span>{format(foundOrder.deliveryPrice)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-white/50">
                        <span>Vendor Shipping</span>
                        <span className={foundOrder.vendorShipping > 0 ? "text-white font-medium" : "text-blue-500 font-semibold"}>
                          {foundOrder.vendorShipping > 0 ? format(foundOrder.vendorShipping) : "TBD"}
                        </span>
                      </div>
                      {foundOrder.tip > 0 && (
                        <div className="flex justify-between text-white/50">
                          <span>Tip</span><span>{format(foundOrder.tip)}</span>
                        </div>
                      )}
                      {(foundOrder.creditsApplied ?? 0) > 0 && (
                        <div className="flex justify-between text-green-400">
                          <span>Store Credits</span><span>−${(foundOrder.creditsApplied ?? 0).toFixed(2)} USD</span>
                        </div>
                      )}
                    </>)}
                    {/* Grand total — hidden individually when flag is on and GB is closed */}
                    {!(foundOrder.groupBuyHideGrandTotalWhenClosed && foundOrder.groupBuyStatus === "closed") && (
                      <div className="flex justify-between font-bold text-white border-t border-white/10 pt-2 mt-1">
                        <span>{foundOrder.vendorShipping > 0 ? "Amount Due" : "Estimated Amount Due"}</span>
                        <span className="text-blue-600">
                          {foundOrder.currency === "GBP"
                            ? format(foundOrder.grandTotal)
                            : format(Math.max(0, foundOrder.grandTotal - (foundOrder.creditsApplied ?? 0)))}
                        </span>
                      </div>
                    )}
                  </div>

                  {foundOrder.notes && (
                    <div className="border-t border-white/10 pt-3">
                      <p className="text-xs text-white/50 mb-1">Your Notes</p>
                      <p className="text-sm text-white/80 bg-white/5 rounded-lg p-2">{foundOrder.notes}</p>
                    </div>
                  )}

                  {/* Change PIN (collapsible dropdown) */}
                  {pinChanged ? (
                    <div className="border-t border-white/10 pt-3 flex items-center gap-2 text-green-400 text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="font-semibold">PIN changed successfully!</span>
                    </div>
                  ) : (
                    <ChangePinSection
                      orderId={foundOrder.id}
                      telegramUsername={foundOrder.telegramUsername}
                      currentPin={currentPin}
                      onChanged={(np) => { setCurrentPin(np); setPinChanged(true); }}
                    />
                  )}

                  {usernameChanged ? (
                    <div className="border-t border-white/10 pt-3 flex items-center gap-2 text-green-400 text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="font-semibold">Username updated! Use <span className="font-mono">{foundOrder.telegramUsername}</span> to log in next time.</span>
                    </div>
                  ) : (
                    <ChangeUsernameSection
                      telegramUsername={foundOrder.telegramUsername}
                      pin={currentPin}
                      onChanged={(newTg) => {
                        setFoundOrder((prev: any) => ({ ...prev, telegramUsername: newTg }));
                        setUsernameChanged(true);
                      }}
                    />
                  )}
                </div>

                {/* Payment */}
                {foundOrder.id && (
                  <PaymentPanel
                    orderId={foundOrder.id}
                    orderPin={foundOrder.pin ?? undefined}
                    grandTotal={foundOrder.grandTotal}
                    creditsUsd={foundOrder.creditsApplied ?? 0}
                    currency={foundOrder.currency}
                    paymentStatus={foundOrder.paymentStatus ?? "unpaid"}
                    paymentTxHash={foundOrder.paymentTxHash ?? null}
                    paymentTestAmount={foundOrder.paymentTestAmount ?? null}
                    testPaymentTxHash={foundOrder.testPaymentTxHash ?? null}
                    paymentsEnabled={foundOrder.groupBuyId ? (foundOrder.groupBuyPaymentsEnabled !== false) : undefined}
                    onStatusChange={(s, tx) => setFoundOrder((prev: any) => ({ ...prev, paymentStatus: s, ...(tx ? { paymentTxHash: tx } : {}) }))}
                  />
                )}

                {/* Delivery Address (unlocked after payment, for all non-InPost methods or direct-shipping GB orders) */}
                {(foundOrder.directShippingRequested || (foundOrder.deliveryMethod && !foundOrder.deliveryMethod.toLowerCase().includes("inpost"))) && (
                  foundOrder.paymentStatus === "confirmed" ? (
                    <ShippingAddressSection
                      orderId={foundOrder.id}
                      telegramUsername={foundOrder.telegramUsername}
                      pin={currentPin}
                      existingName={foundOrder.shippingName ?? null}
                      existingAddress={foundOrder.shippingAddress ?? null}
                      onSaved={(n, a) => setFoundOrder((prev: any) => ({ ...prev, shippingName: n, shippingAddress: a }))}
                    />
                  ) : (
                    <Card className="p-4 border-slate-200 bg-slate-50/60">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-500">Delivery Address</p>
                          <p className="text-xs text-slate-400">Available after payment is completed</p>
                        </div>
                      </div>
                    </Card>
                  )
                )}

                {/* Courier QR Code uploads (unlocked after payment, driven by GB courier list; hidden for direct-shipping orders) */}
                {!(foundOrder.directShippingRequested) && (foundOrder.groupBuyQrUploadCouriers ?? []).map((courierName: string) => {
                  const courierId = toCourierId(courierName);
                  const existingQr = (foundOrder.qrCodes ?? {})[courierId] ?? null;
                  return foundOrder.paymentStatus === "confirmed" ? (
                    <LookupQrSection
                      key={courierId}
                      orderId={foundOrder.id}
                      telegramUsername={foundOrder.telegramUsername}
                      pin={currentPin}
                      useAccountAuth={!currentPin}
                      existingQr={existingQr}
                      courierId={courierId}
                      courierName={courierName}
                      customMessage={foundOrder.groupBuyQrUploadMessage}
                      onUploaded={(qr) => setFoundOrder((prev: any) => ({
                        ...prev,
                        qrCodes: { ...(prev.qrCodes ?? {}), [courierId]: qr },
                      }))}
                    />
                  ) : (
                    <Card key={courierId} className="p-4 border-slate-200 bg-slate-50/60">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-500">{courierName} QR Code</p>
                          <p className="text-xs text-slate-400">Available after payment is completed</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}

                {/* Edit / Top-up buttons */}
                {foundOrder.paymentStatus === "confirmed" && foundOrder.groupBuyAllowOrderAddons !== false ? (
                  <div className="space-y-3">
                    <button
                      className="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 text-white transition-all active:scale-[0.98] hover:brightness-110"
                      style={{ background: "var(--t-blue)" }}
                      onClick={handleTopUp}
                    >
                      <Plus className="w-5 h-5" /> Place Another Order
                    </button>
                  </div>
                ) : EDITABLE_STATUSES.includes(foundOrder.status) ? (
                  <button
                    className="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 text-white transition-all active:scale-[0.98] hover:brightness-110"
                    style={{ background: "var(--t-blue)" }}
                    onClick={handleEdit}
                  >
                    <Package className="w-5 h-5" /> Edit This Order
                  </button>
                ) : foundOrder.paymentStatus !== "confirmed" ? (
                  <div className="text-center text-sm text-muted-foreground p-3 bg-muted/40 rounded-xl">
                    This order is <span className="font-semibold">{foundOrder.status}</span> and cannot be edited.
                  </div>
                ) : null}

                {/* Delete order — only available for Draft/Submitted */}
                {EDITABLE_STATUSES.includes(foundOrder.status) && (
                  <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
                    <button
                      onClick={() => { setDeleteConfirm(true); setDeleteError(null); }}
                      className="w-full flex items-center justify-center gap-2 text-red-500 text-sm font-semibold hover:text-red-700 transition-colors py-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Cancel This Order
                    </button>
                  </div>
                )}

              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>

      {/* Cancel order confirmation modal */}
      <AnimatePresence>
        {deleteConfirm && foundOrder && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => { if (!deleting) { setDeleteConfirm(false); setDeleteError(null); } }} />
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 rounded-3xl w-[90%] max-w-sm p-6"
              style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}>
              <div className="flex flex-col items-center gap-3 mb-5">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(220,38,38,0.1)" }}>
                  <AlertCircle className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-base font-bold text-center" style={{ color: "var(--t-text)" }}>Cancel order {foundOrder.code}?</h3>
                <p className="text-sm text-center leading-relaxed" style={{ color: "var(--t-muted)" }}>
                  Your order will be permanently removed. This cannot be undone.
                </p>
              </div>
              {deleteError && (
                <p className="text-xs text-red-600 bg-red-100 rounded-xl px-3 py-2 mb-3 text-center">{deleteError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setDeleteConfirm(false); setDeleteError(null); }}
                  disabled={deleting}
                  className="flex-1 h-11 rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{ background: "var(--t-surface2)", color: "var(--t-muted)", border: "1px solid var(--t-border)" }}>
                  Keep Order
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "#DC2626" }}>
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, cancel it"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </PageLayout>
  );
}
