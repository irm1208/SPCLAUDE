import React, { useState, useEffect, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { Loader2, QrCode, Search, ChevronDown, ChevronUp, RefreshCw, X, Truck, Package, LogIn, CheckCircle2, RotateCcw } from "lucide-react";
import { useAccount } from "@/hooks/use-account";

interface QrOrder {
  id: string;
  code: string;
  telegramUsername: string;
  deliveryMethod: string;
  inpostQrCode: string | null;
  royalMailQrCode: string | null;
  qrCodes?: Record<string, string> | null;
  qrPosted: boolean;
  status: string;
}

interface PageData {
  gbName: string;
  orders: QrOrder[];
}

const NAVY = "#1B3A7A";
const BLUE = "#2D6BCC";

function stripAt(username: string) {
  return username.replace(/^@+/, "");
}

function labelForKey(key: string): string {
  if (key === "inpost") return "InPost";
  if (key === "royal-mail") return "Royal Mail";
  if (key === "custom") return "Delivery QR";
  return key.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function getExtraQrCodes(order: QrOrder): [string, string][] {
  if (!order.qrCodes) return [];
  return Object.entries(order.qrCodes).filter(([key]) => key !== "inpost" && key !== "royal-mail");
}

function hasAnyQr(order: QrOrder): boolean {
  return !!order.inpostQrCode || !!order.royalMailQrCode || getExtraQrCodes(order).length > 0;
}

// ─── Full-screen image lightbox ─────────────────────────────────────────────
function ImageModal({ src, label, username, onClose }: { src: string; label: string; username: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative max-w-md w-full rounded-2xl overflow-hidden bg-white p-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center z-10"
          style={{ background: "rgba(0,0,0,0.08)" }}
        >
          <X className="w-4 h-4" style={{ color: "#64748B" }} />
        </button>
        <p className="text-[11px] font-bold uppercase tracking-wide text-center mb-3" style={{ color: "#94A3B8" }}>
          {label} · @{stripAt(username)}
        </p>
        <img
          src={src}
          alt={`${label} QR for @${stripAt(username)}`}
          className="w-full h-auto rounded-xl object-contain"
          style={{ maxHeight: "70vh" }}
        />
      </div>
    </div>
  );
}

// ─── QR image thumbnail (click to enlarge) ──────────────────────────────────
function QrImage({ src, label, username }: { src: string; label: string; username: string }) {
  const [showModal, setShowModal] = useState(false);
  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#94A3B8" }}>{label}</p>
        <img
          src={src}
          alt={`${label} for @${stripAt(username)}`}
          className="w-56 h-56 object-contain rounded-2xl p-2 cursor-zoom-in transition-opacity hover:opacity-80"
          style={{ border: `1px solid rgba(27,58,122,0.15)`, background: "#fff" }}
          onClick={() => setShowModal(true)}
          title="Click to enlarge"
        />
      </div>
      {showModal && <ImageModal src={src} label={label} username={username} onClose={() => setShowModal(false)} />}
    </>
  );
}

// ─── Order card ─────────────────────────────────────────────────────────────
function OrderCard({ order, gbId, onTogglePosted }: { order: QrOrder; gbId: string; onTogglePosted: (orderId: string, posted: boolean) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const hasInpost = !!order.inpostQrCode;
  const hasRoyalMail = !!order.royalMailQrCode;
  const extraQrs = getExtraQrCodes(order);
  const hasAny = hasInpost || hasRoyalMail || extraQrs.length > 0;

  async function handleTogglePosted(e: React.MouseEvent) {
    e.stopPropagation();
    setSaving(true);
    try {
      await onTogglePosted(order.id, !order.qrPosted);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: `1px solid ${order.qrPosted ? "rgba(22,163,74,0.2)" : hasAny ? "rgba(27,58,122,0.2)" : "rgba(148,163,184,0.25)"}`,
        background: order.qrPosted ? "rgba(22,163,74,0.03)" : hasAny ? "rgba(27,58,122,0.03)" : "#fafafa",
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
          onClick={() => setOpen(o => !o)}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: order.qrPosted ? "rgba(22,163,74,0.1)" : hasAny ? "rgba(27,58,122,0.08)" : "rgba(148,163,184,0.1)" }}
          >
            {order.qrPosted
              ? <CheckCircle2 className="w-4 h-4" style={{ color: "#16A34A" }} />
              : hasAny
                ? <QrCode className="w-4 h-4" style={{ color: NAVY }} />
                : <Package className="w-4 h-4" style={{ color: "#94A3B8" }} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: order.qrPosted ? "#16A34A" : hasAny ? NAVY : "#64748B" }}>
              @{stripAt(order.telegramUsername)}
            </p>
            <p className="text-[11px] truncate" style={{ color: "#94A3B8" }}>
              {order.code} · {order.deliveryMethod || "—"}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {hasInpost && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline" style={{ background: "rgba(27,58,122,0.1)", color: NAVY }}>InPost</span>
          )}
          {hasRoyalMail && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline" style={{ background: "rgba(220,38,38,0.08)", color: "#B91C1C" }}>RM</span>
          )}
          {extraQrs.map(([key]) => (
            <span key={key} className="text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline" style={{ background: "rgba(27,58,122,0.1)", color: NAVY }}>
              {labelForKey(key)}
            </span>
          ))}

          {order.qrPosted ? (
            <button
              type="button"
              onClick={handleTogglePosted}
              disabled={saving}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all hover:opacity-80"
              style={{ background: "rgba(27,58,122,0.08)", borderColor: "rgba(27,58,122,0.2)", color: NAVY, minWidth: 68 }}
              title="Mark as not posted"
            >
              {saving ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RotateCcw className="w-2.5 h-2.5" />}
              Posted
            </button>
          ) : hasAny ? (
            <button
              type="button"
              onClick={handleTogglePosted}
              disabled={saving}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-white transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)`, minWidth: 100 }}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Order Posted
            </button>
          ) : null}

          {hasAny && (
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(27,58,122,0.05)" }}
            >
              {open ? <ChevronUp className="w-4 h-4" style={{ color: NAVY }} /> : <ChevronDown className="w-4 h-4" style={{ color: NAVY }} />}
            </button>
          )}
        </div>
      </div>

      {open && hasAny && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: "rgba(27,58,122,0.1)" }}>
          <div className="flex flex-col items-center gap-4 pt-3">
            <p className="text-xs font-semibold" style={{ color: NAVY }}>@{stripAt(order.telegramUsername)} · {order.deliveryMethod}</p>
            {hasInpost && order.inpostQrCode && (
              <QrImage src={order.inpostQrCode} label="InPost" username={order.telegramUsername} />
            )}
            {hasRoyalMail && order.royalMailQrCode && (
              <QrImage src={order.royalMailQrCode} label="Royal Mail" username={order.telegramUsername} />
            )}
            {extraQrs.map(([key, src]) => (
              <QrImage key={key} src={src} label={labelForKey(key)} username={order.telegramUsername} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section divider header ──────────────────────────────────────────────────
function SectionHeader({ icon, label, count, color }: { icon: React.ReactNode; label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="flex items-center gap-1.5 shrink-0" style={{ color }}>
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-widest">{label}</span>
        <span
          className="px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none"
          style={{ background: `${color}18`, color }}
        >
          {count}
        </span>
      </div>
      <div className="flex-1 h-px" style={{ background: `${color}28` }} />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function GbQrViewer() {
  const [, params] = useRoute<{ gbId: string }>("/qr-viewer/:gbId");
  const gbId = params?.gbId ?? "";
  const [, setLocation] = useLocation();

  const { account, isLoading: accountLoading } = useAccount();

  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "not-posted" | "posted" | "waiting">("all");

  const load = useCallback(async () => {
    if (!gbId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/organiser/group-buys/${gbId}/all-orders-qr`, { credentials: "include" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError({ message: j.error || "Failed to load orders.", status: res.status });
        return;
      }
      setData(await res.json());
    } catch {
      setError({ message: "Network error — please try again." });
    } finally {
      setLoading(false);
    }
  }, [gbId]);

  useEffect(() => {
    if (!accountLoading && account) {
      load();
    }
  }, [accountLoading, account, load]);

  const handleTogglePosted = useCallback(async (orderId: string, posted: boolean) => {
    const res = await fetch(`/api/organiser/group-buys/${gbId}/orders/${orderId}/qr-posted`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ posted }),
    });
    if (!res.ok) throw new Error("Failed to update");
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        orders: prev.orders.map(o => o.id === orderId ? { ...o, qrPosted: posted } : o),
      };
    });
  }, [gbId]);

  const allOrders = data?.orders ?? [];
  const withQr = allOrders.filter(o => hasAnyQr(o));
  const waitingOrders = allOrders.filter(o => !hasAnyQr(o));
  const notPostedOrders = withQr.filter(o => !o.qrPosted);
  const postedOrders = withQr.filter(o => o.qrPosted);
  const totalCount = allOrders.length;
  const qrCount = withQr.length;

  function matchesSearch(o: QrOrder) {
    return (
      !search ||
      stripAt(o.telegramUsername).toLowerCase().includes(search.toLowerCase()) ||
      o.code.toLowerCase().includes(search.toLowerCase())
    );
  }
  const filteredNotPosted = notPostedOrders.filter(matchesSearch);
  const filteredPosted = postedOrders.filter(matchesSearch);
  const filteredWaiting = waitingOrders.filter(matchesSearch);

  const isAuthError = error?.status === 401 || error?.status === 403;

  if (accountLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(160deg, #f0f4ff 0%, #f8faff 60%, #fff 100%)" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: NAVY }} />
      </div>
    );
  }

  if (!account) {
    const loginUrl = `/login?next=${encodeURIComponent(`/qr-viewer/${gbId}`)}`;
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "linear-gradient(160deg, #f0f4ff 0%, #f8faff 60%, #fff 100%)" }}>
        <div className="max-w-sm w-full rounded-2xl p-8 text-center bg-white" style={{ boxShadow: "0 4px 24px rgba(27,58,122,0.12)", border: "1px solid rgba(27,58,122,0.1)" }}>
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)` }}>
            <QrCode className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-lg font-bold mb-2" style={{ color: NAVY }}>Organiser Login Required</h1>
          <p className="text-sm mb-6" style={{ color: "#64748B" }}>
            Please log in as an approved GB organiser to view the QR code list.
          </p>
          <button
            type="button"
            onClick={() => setLocation(loginUrl)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)` }}
          >
            <LogIn className="w-4 h-4" />
            Log in to continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg, #f0f4ff 0%, #f8faff 60%, #fff 100%)" }}
    >
      {/* Header */}
      <div
        className="px-4 py-4 flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)`, boxShadow: "0 2px 16px rgba(27,58,122,0.18)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">{data?.gbName ?? "QR Viewer"}</p>
            <p className="text-white/70 text-[11px]">
              {loading ? "Loading…" : `${qrCount} of ${totalCount} QR codes uploaded`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center"
        >
          {loading
            ? <Loader2 className="w-4 h-4 text-white animate-spin" />
            : <RefreshCw className="w-4 h-4 text-white" />}
        </button>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94A3B8" }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by username or order code…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm bg-white focus:outline-none focus:ring-2"
            style={{ border: "1px solid rgba(27,58,122,0.15)" } as React.CSSProperties}
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4" style={{ color: "#94A3B8" }} />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        {data && (
          <div className="flex gap-1.5 flex-wrap">
            {([
              { key: "all",        label: "All",          count: allOrders.length,       color: NAVY },
              { key: "not-posted", label: "Not Posted",   count: notPostedOrders.length, color: NAVY },
              { key: "posted",     label: "Posted",       count: postedOrders.length,    color: "#16A34A" },
              { key: "waiting",    label: "Waiting",      count: waitingOrders.length,   color: "#D97706" },
            ] as const).map(({ key, label, count, color }) => {
              const active = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                  style={active
                    ? { background: color, color: "#fff", boxShadow: `0 2px 8px ${color}40` }
                    : { background: "white", color: "#64748B", border: "1px solid rgba(27,58,122,0.12)" }
                  }
                >
                  {label}
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none"
                    style={active
                      ? { background: "rgba(255,255,255,0.25)", color: "#fff" }
                      : { background: "rgba(27,58,122,0.08)", color: "#64748B" }
                    }
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.15)" }}>
            <p className="text-sm font-medium" style={{ color: "#DC2626" }}>{error.message}</p>
            {isAuthError && (
              <button
                type="button"
                onClick={() => setLocation(`/login?next=${encodeURIComponent(`/qr-viewer/${gbId}`)}`)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: NAVY }}
              >
                <LogIn className="w-3.5 h-3.5" />
                Log in again
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && !data && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: NAVY }} />
          </div>
        )}

        {/* Stats bar */}
        {!loading && data && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Total Orders", value: totalCount, color: NAVY },
              { label: "QR Uploaded", value: qrCount, color: "#16A34A" },
              { label: "Posted", value: postedOrders.length, color: "#16A34A" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center bg-white" style={{ border: "1px solid rgba(27,58,122,0.1)", boxShadow: "0 1px 4px rgba(27,58,122,0.06)" }}>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: "#94A3B8" }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Not Posted section ─────────────────────────────────────────────── */}
        {!loading && data && (filter === "all" || filter === "not-posted") && (
          <>
            <SectionHeader icon={<Package className="w-3.5 h-3.5" />} label="Not Posted" count={filteredNotPosted.length} color={NAVY} />
            {filteredNotPosted.length === 0 && (
              <p className="text-center text-xs py-4" style={{ color: "#94A3B8" }}>No pending QR codes to post</p>
            )}
            <div className="space-y-2">
              {filteredNotPosted.map(order => (
                <OrderCard key={order.id} order={order} gbId={gbId} onTogglePosted={handleTogglePosted} />
              ))}
            </div>
          </>
        )}

        {/* ── Waiting for QR Code section ────────────────────────────────────── */}
        {!loading && data && (filter === "all" || filter === "waiting") && (
          <>
            <SectionHeader icon={<Truck className="w-3.5 h-3.5" />} label="Waiting for QR Code" count={filteredWaiting.length} color="#D97706" />
            {filteredWaiting.length === 0 && (
              <p className="text-center text-xs py-4" style={{ color: "#94A3B8" }}>Everyone has uploaded their QR code</p>
            )}
            <div className="space-y-2">
              {filteredWaiting.map(order => (
                <div
                  key={order.id}
                  className="rounded-2xl px-4 py-3 flex items-center gap-3"
                  style={{ border: "1px solid rgba(148,163,184,0.2)", background: "#fafafa" }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(148,163,184,0.1)" }}
                  >
                    <Package className="w-4 h-4" style={{ color: "#94A3B8" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "#64748B" }}>
                      @{stripAt(order.telegramUsername)}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: "#94A3B8" }}>
                      {order.code} · {order.deliveryMethod || "—"} · {order.status}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: "rgba(245,158,11,0.1)", color: "#D97706" }}
                  >
                    No QR
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Posted section ─────────────────────────────────────────────────── */}
        {!loading && data && (filter === "all" || filter === "posted") && (
          <>
            <SectionHeader icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Posted" count={filteredPosted.length} color="#16A34A" />
            {filteredPosted.length === 0 && (
              <p className="text-center text-xs py-4" style={{ color: "#94A3B8" }}>No posted orders yet</p>
            )}
            <div className="space-y-2 pb-6">
              {filteredPosted.map(order => (
                <OrderCard key={order.id} order={order} gbId={gbId} onTogglePosted={handleTogglePosted} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
