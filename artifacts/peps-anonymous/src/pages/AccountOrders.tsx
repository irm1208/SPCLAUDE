import React, { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Package, Clock, CheckCircle2, XCircle, Truck,
  FileText, RefreshCw, Loader2, AlertCircle, ChevronDown, ChevronUp,
  Users, User, Lock, Eye, EyeOff, CheckCircle, ShieldCheck,
  MessageCircle, Link2, Unlink, Bell, BellOff, Copy, ScanLine,
  Trash2, RotateCcw, ShieldAlert,
} from "lucide-react";
import {
  useAccount, useAccountOrders, useProfile,
  useUpdateProfile, useChangePassword, type AccountOrder,
  useTelegramStatus, useTelegramLinkInit, useTelegramUnlink, useTelegramUpdatePrefs,
  type TelegramPrefs,
  useDeletedOrders, useRestoreOrder, type DeletedOrder,
} from "@/hooks/use-account";
import { BottomTabs } from "@/components/BottomTabs";
import { fmtC } from "@/lib/currency";

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  Draft:      { label: "Draft",      color: "#64748B", bg: "rgba(100,116,139,0.1)", icon: FileText },
  Submitted:  { label: "Submitted",  color: "var(--t-blue)", bg: "var(--t-blue-10)",   icon: Clock },
  Processing: { label: "Processing", color: "var(--t-blue)", bg: "var(--t-blue-10)",    icon: RefreshCw },
  Shipped:    { label: "Shipped",    color: "var(--t-blue)", bg: "var(--t-blue-10)",   icon: Truck },
  Completed:  { label: "Completed",  color: "#16A34A", bg: "rgba(22,163,74,0.1)",   icon: CheckCircle2 },
  Cancelled:  { label: "Cancelled",  color: "#DC2626", bg: "rgba(220,38,38,0.1)",   icon: XCircle },
};

const PAYMENT_META: Record<string, { label: string; color: string }> = {
  unpaid:               { label: "Unpaid",   color: "#94A3B8" },
  pending_confirmation: { label: "Pending",  color: "var(--t-blue)" },
  confirmed:            { label: "Paid",     color: "#16A34A" },
  test_confirmed:       { label: "Test OK",  color: "var(--t-blue)" },
  failed:               { label: "Failed",   color: "#DC2626" },
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, color: "#64748B", bg: "rgba(100,116,139,0.1)", icon: FileText };
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ color: m.color, background: m.bg }}>
      <Icon className="w-3 h-3" />{m.label}
    </span>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function OrderCard({ order, onManage }: { order: AccountOrder; onManage: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const payment = PAYMENT_META[order.paymentStatus] ?? { label: order.paymentStatus, color: "#94A3B8" };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl overflow-hidden shadow-sm"
      style={{ border: "1px solid var(--t-border)" }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                #{order.code}
              </span>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-[11px] text-slate-400">{formatDate(order.createdAt)}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-slate-800">{fmtC(order.grandTotal, order.currency)}</p>
            <p className="text-[11px] font-semibold" style={{ color: payment.color }}>{payment.label}</p>
          </div>
        </div>

        {order.adminMessage && (
          <div className="flex items-start gap-2 p-2 rounded-xl mb-2"
            style={{ background: "var(--t-blue-08)", border: "1px solid var(--t-blue-20)" }}>
            <AlertCircle className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 leading-relaxed">{order.adminMessage}</p>
          </div>
        )}

        {order.trackingNumber && (
          <div className="flex items-center gap-1.5 mb-2">
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs text-blue-600 font-semibold">{order.trackingNumber}</span>
          </div>
        )}

        {order.groupBuyId &&
          (order.paymentStatus === "confirmed" || order.paymentStatus === "test_confirmed") &&
          (order.status === "Shipped" || order.status === "Processing") && (
          <div className="flex items-center gap-1.5 mb-2">
            <ScanLine className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--t-blue)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--t-blue)" }}>
              Parcel tracking available — tap Manage to view
            </span>
          </div>
        )}

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex-1 h-8 rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
            style={{ background: "var(--t-surface2)", color: "var(--t-muted)" }}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Hide" : `${order.lineItems.length} item${order.lineItems.length !== 1 ? "s" : ""}`}
          </button>
          <button
            onClick={onManage}
            className="flex-1 h-8 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 text-white"
            style={{ background: "var(--t-blue)" }}
          >
            Manage
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-1.5 border-t border-slate-100 pt-3">
              {order.lineItems.map((li, i) => (
                <div key={i} className="flex justify-between text-xs text-slate-600">
                  <span className="flex-1 truncate">{li.productName} × {li.quantity}</span>
                  <span className="font-semibold ml-2">{fmtC(li.lineTotal, order.currency)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function timeRemaining(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function DeletedOrderCard({ order, onRestored }: { order: DeletedOrder; onRestored: () => void }) {
  const restore = useRestoreOrder();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const remaining = timeRemaining(order.expiresAt);
  const expired = remaining === "Expired";

  const handleRestore = async () => {
    setError(null);
    try {
      await restore.mutateAsync(order.id);
      setDone(true);
      setTimeout(onRestored, 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to restore order");
    }
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }}
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold"
        style={{ background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.2)", color: "#16A34A" }}
      >
        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
        Order #{order.code} restored successfully
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.03)" }}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                #{order.code}
              </span>
              <span className="text-[11px] text-slate-500">{order.status}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {order.lineItems.length} item{order.lineItems.length !== 1 ? "s" : ""} · {fmtC(order.grandTotal, order.currency)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            {expired ? (
              <span className="text-[10px] font-bold text-red-500">Expired</span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(234,179,8,0.12)", color: "#B45309" }}>
                <Clock className="w-2.5 h-2.5" />
                {remaining} left
              </span>
            )}
          </div>
        </div>

        {order.deletedBy === "admin" || order.deletedBy === "leave_gb" ? (
          <div className="flex items-start gap-1.5 text-[11px] text-slate-500 mb-2">
            <ShieldAlert className="w-3 h-3 shrink-0 mt-0.5 text-slate-400" />
            {order.deletedBy === "admin" ? "Removed by admin — contact support to restore" : "Removed when you left the group buy"}
          </div>
        ) : null}

        <div className="flex gap-2">
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
            style={{ background: "var(--t-surface2)", color: "var(--t-muted)" }}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Items
          </button>
          {order.canRestore && !expired && (
            <button
              onClick={handleRestore}
              disabled={restore.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold text-white transition-opacity disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #16A34A, #15803D)" }}
            >
              {restore.isPending
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <RotateCcw className="w-3 h-3" />}
              Restore Order
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-red-600 px-2 py-1.5 rounded-lg"
            style={{ background: "rgba(239,68,68,0.08)" }}>
            <AlertCircle className="w-3 h-3 shrink-0" />
            {error}
          </div>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-1 border-t pt-2" style={{ borderColor: "rgba(239,68,68,0.15)" }}>
              {order.lineItems.map((li, i) => (
                <div key={i} className="flex justify-between text-[11px] text-slate-500">
                  <span className="flex-1 truncate">{li.productName} × {li.quantity}</span>
                  <span className="font-semibold ml-2">{fmtC(li.lineTotal, order.currency)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DeletedOrdersSection({ onRestored }: { onRestored: () => void }) {
  const { data: deleted = [], isLoading, refetch } = useDeletedOrders();
  const [open, setOpen] = useState(false);

  if (isLoading) return null;
  if (deleted.length === 0) return null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(239,68,68,0.3)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.08)" }}>
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-slate-700">Recently Deleted</p>
            <p className="text-[11px] text-slate-400">
              {deleted.length} order{deleted.length !== 1 ? "s" : ""} · recoverable within 48h
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: "#EF4444" }}>
            {deleted.length}
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-2 border-t" style={{ borderColor: "rgba(239,68,68,0.15)", background: "rgba(239,68,68,0.02)" }}>
              <p className="text-[11px] text-slate-400 leading-relaxed px-1">
                Orders you deleted within the last 48 hours. Tap "Restore Order" to recover one — admin-removed orders cannot be self-restored.
              </p>
              {deleted.map(order => (
                <DeletedOrderCard
                  key={order.id}
                  order={order}
                  onRestored={() => { refetch(); onRestored(); }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TelegramCard() {
  const { data: tgStatus, isLoading: tgLoading, refetch: refetchTg } = useTelegramStatus();
  const linkInit = useTelegramLinkInit();
  const unlink = useTelegramUnlink();
  const updatePrefs = useTelegramUpdatePrefs();

  const [linkData, setLinkData] = useState<{ code: string; botUrl: string | null; instruction: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [unlinkConfirm, setUnlinkConfirm] = useState(false);

  const linked = tgStatus?.linked ?? false;
  const prefs: TelegramPrefs = tgStatus?.prefs ?? { status: true, deleted: true, payment: true, profile: true, new_order: true };

  const PREF_LABELS: { key: keyof TelegramPrefs; label: string; desc: string }[] = [
    { key: "new_order",  label: "New Orders",     desc: "When you place an order" },
    { key: "status",     label: "Status Updates",  desc: "When your order status changes" },
    { key: "payment",    label: "Payments",        desc: "Payment confirmations & issues" },
    { key: "deleted",    label: "Deletions",       desc: "When an order is removed" },
    { key: "profile",    label: "Profile Changes", desc: "When your profile is updated" },
  ];

  const handleLinkInit = async () => {
    try {
      const data = await linkInit.mutateAsync();
      setLinkData({ code: data.code, botUrl: data.botUrl, instruction: data.instruction });
    } catch {
    }
  };

  const handleCopy = () => {
    if (!linkData) return;
    navigator.clipboard.writeText(`/link ${linkData.code}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleUnlink = async () => {
    if (!unlinkConfirm) { setUnlinkConfirm(true); return; }
    try {
      await unlink.mutateAsync();
      setUnlinkConfirm(false);
      setLinkData(null);
      refetchTg();
    } catch {
    }
  };

  const togglePref = (key: keyof TelegramPrefs) => {
    updatePrefs.mutate({ [key]: !prefs[key] });
  };

  if (tgLoading) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm flex justify-center py-6" style={{ border: "1px solid var(--t-border)" }}>
        <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm space-y-4" style={{ border: "1px solid var(--t-border)" }}>
      <div className="flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-blue-600 shrink-0" />
        <h3 className="section-label">Telegram Notifications</h3>
      </div>

      {linked ? (
        <>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.2)" }}>
            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-green-700">Telegram linked</p>
              <p className="text-[11px] text-green-600">You'll receive notifications via Telegram DM</p>
            </div>
            <button
              onClick={handleUnlink}
              disabled={unlink.isPending}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors"
              style={{
                background: unlinkConfirm ? "rgba(220,38,38,0.1)" : "rgba(0,0,0,0.05)",
                color: unlinkConfirm ? "#DC2626" : "var(--t-subtle)",
              }}
            >
              {unlink.isPending
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Unlink className="w-3 h-3" />}
              {unlinkConfirm ? "Confirm" : "Unlink"}
            </button>
          </div>
          {unlinkConfirm && (
            <p className="text-[11px] text-slate-400 text-center -mt-2">
              Tap Confirm to unlink your Telegram.{" "}
              <button className="text-blue-600 underline" onClick={() => setUnlinkConfirm(false)}>Cancel</button>
            </p>
          )}

          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-slate-400 mb-2">Notify me about:</p>
            {PREF_LABELS.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-2 border-b last:border-b-0"
                style={{ borderColor: "var(--t-border)" }}>
                <div>
                  <p className="text-xs font-semibold text-slate-700">{label}</p>
                  <p className="text-[11px] text-slate-400">{desc}</p>
                </div>
                <button
                  onClick={() => togglePref(key)}
                  disabled={updatePrefs.isPending}
                  className="w-10 h-5.5 rounded-full transition-colors flex items-center relative shrink-0 ml-3"
                  style={{
                    width: "40px", height: "22px",
                    background: prefs[key] ? "var(--t-blue)" : "var(--t-border)",
                  }}
                >
                  <span
                    className="w-4 h-4 bg-white rounded-full shadow-sm absolute transition-all"
                    style={{ left: prefs[key] ? "20px" : "2px", top: "3px" }}
                  />
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-slate-500 leading-relaxed">
            Link your Telegram to receive real-time notifications for order updates, payments, and more — straight to your DMs.
          </p>

          {!linkData ? (
            <button
              onClick={handleLinkInit}
              disabled={linkInit.isPending}
              className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
              style={{ background: "var(--t-blue)" }}
            >
              {linkInit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              Link Telegram
            </button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl p-3 space-y-2" style={{ background: "var(--t-blue-06)", border: "1px solid var(--t-blue-15)" }}>
                <p className="text-[11px] font-semibold" style={{ color: "var(--t-blue)" }}>Step 1 — Open the bot</p>
                {linkData.botUrl ? (
                  <a
                    href={linkData.botUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-bold underline" style={{ color: "var(--t-blue)" }}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Open the Telegram bot
                  </a>
                ) : (
                  <p className="text-xs" style={{ color: "var(--t-blue)" }}>Open the Peps Anonymous bot on Telegram</p>
                )}

                <p className="text-[11px] font-semibold mt-2" style={{ color: "var(--t-blue)" }}>Step 2 — Send this command</p>
                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2" style={{ border: "1px solid var(--t-border)" }}>
                  <code className="flex-1 text-xs font-mono font-bold text-slate-800 select-all">/link {linkData.code}</code>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 p-1 rounded hover:bg-slate-100 transition-colors"
                  >
                    {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">This code expires in 15 minutes.</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleLinkInit}
                  disabled={linkInit.isPending}
                  className="flex-1 h-9 rounded-xl text-xs font-semibold transition-opacity disabled:opacity-50"
                  style={{ background: "var(--t-surface2)", color: "var(--t-muted)" }}
                >
                  {linkInit.isPending ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "Refresh Code"}
                </button>
                <button
                  onClick={() => { setLinkData(null); refetchTg(); }}
                  className="flex-1 h-9 rounded-xl text-xs font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #16A34A, #15803D)" }}
                >
                  Done — Check Status
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProfileTab({ username }: { username: string }) {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName ?? "");
      setEmail(profile.email ?? "");
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    try {
      await updateProfile.mutateAsync({ fullName, email });
      setProfileMsg({ ok: true, text: "Details saved!" });
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err: unknown) {
      setProfileMsg({ ok: false, text: err instanceof Error ? err.message : "Failed to save" });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 8) {
      setPasswordMsg({ ok: false, text: "New password must be at least 8 characters" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ ok: false, text: "Passwords do not match" });
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setPasswordMsg({ ok: true, text: "Password changed successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordMsg(null), 4000);
    } catch (err: unknown) {
      setPasswordMsg({ ok: false, text: err instanceof Error ? err.message : "Failed to change password" });
    }
  };

  const inputClass = "w-full h-11 rounded-xl border px-4 text-sm bg-slate-50 focus:outline-none focus:border-blue-200 focus:bg-slate-50 transition-colors";
  const inputStyle = { borderColor: "var(--t-border)" };

  if (profileLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Identity card */}
      <div className="bg-white rounded-xl p-4 shadow-sm" style={{ border: "1px solid var(--t-border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-blue-50">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Telegram Username</p>
            <p className="text-base font-bold text-slate-800">@{username}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">This is your account identity and cannot be changed</p>
          </div>
        </div>
      </div>

      {/* Display name + email */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-xl p-4 shadow-sm space-y-3"
        style={{ border: "1px solid var(--t-border)" }}>
        <h3 className="section-label">Personal Details</h3>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Display Name</label>
          <input
            className={inputClass}
            style={inputStyle}
            placeholder="Jane Smith"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            disabled={updateProfile.isPending}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email Address</label>
          <input
            type="email"
            className={inputClass}
            style={inputStyle}
            placeholder="jane@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={updateProfile.isPending}
          />
        </div>

        {profileMsg && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{
              background: profileMsg.ok ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
              color: profileMsg.ok ? "#16A34A" : "#DC2626",
              border: `1px solid ${profileMsg.ok ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}`,
            }}>
            {profileMsg.ok ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
            {profileMsg.text}
          </div>
        )}

        <button
          type="submit"
          disabled={updateProfile.isPending}
          className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
          style={{ background: "var(--t-blue)" }}
        >
          {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save Details
        </button>
      </form>

      {/* Password change */}
      <form onSubmit={handleChangePassword} className="bg-white rounded-xl p-4 shadow-sm space-y-3"
        style={{ border: "1px solid var(--t-border)" }}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: "var(--t-blue)" }} />
          <h3 className="section-label">Change Password</h3>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Current Password</label>
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              className={inputClass + " pr-12"}
              style={inputStyle}
              placeholder="Your current password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              disabled={changePassword.isPending}
            />
            <button type="button" tabIndex={-1} onClick={() => setShowCurrent(s => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">New Password</label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              className={inputClass + " pr-12"}
              style={inputStyle}
              placeholder="Min. 8 characters"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoComplete="new-password"
              disabled={changePassword.isPending}
            />
            <button type="button" tabIndex={-1} onClick={() => setShowNew(s => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Confirm New Password</label>
          <input
            type="password"
            className={inputClass}
            style={inputStyle}
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            disabled={changePassword.isPending}
          />
        </div>

        {passwordMsg && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{
              background: passwordMsg.ok ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
              color: passwordMsg.ok ? "#16A34A" : "#DC2626",
              border: `1px solid ${passwordMsg.ok ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}`,
            }}>
            {passwordMsg.ok ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
            {passwordMsg.text}
          </div>
        )}

        <button
          type="submit"
          disabled={changePassword.isPending || !currentPassword || newPassword.length < 8 || newPassword !== confirmPassword}
          className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
          style={{ background: "var(--t-blue)" }}
        >
          {changePassword.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          Update Password
        </button>

        <p className="text-[11px] text-slate-400 text-center">
          You must enter your current password to change it.
        </p>
      </form>

      <TelegramCard />
    </motion.div>
  );
}

export default function AccountOrders() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const gbId = new URLSearchParams(search).get("gbId") ?? undefined;

  const { account, isLoading: accountLoading, isLoggedIn } = useAccount();
  const { data: orders = [], isLoading: ordersLoading, refetch } = useAccountOrders(gbId);

  const [mainTab, setMainTab] = useState<"orders" | "profile">("orders");

  React.useEffect(() => {
    if (!accountLoading && !isLoggedIn) {
      setLocation("/login");
    }
  }, [accountLoading, isLoggedIn, setLocation]);

  if (!account && accountLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--t-bg)" }}>
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!isLoggedIn) return null;

  const username = account!.telegramUsername.replace(/^@/, "");

  const handleManage = (code: string) => {
    setLocation(`/lookup?code=${code}`);
  };

  return (
    <div className="min-h-screen flex flex-col pb-24" style={{ background: "var(--t-bg)" }}>
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/groups")}
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors bg-slate-100 hover:bg-slate-200"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </button>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center`}
              style={{ background: mainTab === "orders" ? "rgba(124,58,237,0.1)" : "rgba(242,73,8,0.1)" }}>
              {mainTab === "orders"
                ? <Package className="w-4 h-4 text-blue-600" />
                : <User className="w-4 h-4 text-blue-600" />
              }
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800 leading-tight">
                {mainTab === "orders" ? "My Orders" : "My Profile"}
              </h1>
              <p className="text-xs text-slate-400">@{username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {mainTab === "orders" && (
              <button
                onClick={() => refetch()}
                disabled={ordersLoading}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-slate-100 hover:bg-slate-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${ordersLoading ? "animate-spin" : ""}`} />
              </button>
            )}
            <button
              onClick={() => setLocation("/groups")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              <Users className="w-3 h-3" /> Groups
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-4 space-y-4">
        {/* Main tab switcher: Orders / Inbox / Profile */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm" style={{ border: "1px solid var(--t-border)" }}>
          {[
            { id: "orders" as const, label: "Orders", icon: Package },
            { id: "profile" as const, label: "Profile", icon: User },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id)}
              className="flex-1 relative flex items-center justify-center gap-1 h-9 rounded-xl text-xs font-semibold transition-all"
              style={mainTab === tab.id
                ? { background: "var(--t-blue)", color: "#fff" }
                : { color: "var(--t-muted)" }}
            >
              <tab.icon className="w-3.5 h-3.5 shrink-0" />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {mainTab === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
              <ProfileTab username={username} />
            </motion.div>
          )}

          {mainTab === "orders" && (
            <motion.div key="orders" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="space-y-4">

              {ordersLoading && (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              )}

              {!ordersLoading && orders.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-white rounded-xl p-8 text-center shadow-sm"
                  style={{ border: "1px solid var(--t-border)" }}>
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: "rgba(124,58,237,0.08)" }}>
                    <Package className="w-7 h-7 text-blue-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">No orders yet</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    You don't have any orders yet.
                  </p>
                </motion.div>
              )}

              {!ordersLoading && orders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onManage={() => handleManage(order.code)}
                />
              ))}

              {!ordersLoading && (
                <DeletedOrdersSection onRestored={() => refetch()} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomTabs active="account" />
    </div>
  );
}
