import { useState, useEffect, useMemo, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { useLocation, useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Copy, Check, Users, Truck, Lock, Unlock, Plus, Minus, Search,
  ArrowLeft, CheckCircle2, Clock, Share2, Ban, AlertCircle,
  ChevronDown, Info, MessageCircle, Send, X,
  Package, MapPin, CreditCard, RefreshCw, Printer,
  Globe, ShieldAlert, SlidersHorizontal,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { useAccount, useMarkWholesaleInvitePromptSeen } from "@/hooks/use-account";
import { COUNTRIES } from "@/data/countries";
import {
  useWholesaleShare,
  joinWholesaleShare,
  leaveWholesaleShare,
  setWholesaleShareItems,
  setWholesaleShareDelivery,
  setWholesaleShareDeliveryAddress,
  setWholesaleShareMyOnwardAddress,
  setWholesaleShareTracking,
  setWholesaleShareSplit,
  setWholesaleShareFees,
  confirmWholesaleShareFee,
  lockWholesaleShare,
  cancelWholesaleShare,
  unlockWholesaleShare,
  setWholesaleShareSettings,
  publishWholesaleShare,
  removeWholesaleShareMember,
  useInvalidateWholesaleShare,
  useWholesaleShareMessages,
  postWholesaleShareMessage,
  useInvalidateWholesaleShareMessages,
  type WholesaleShareDetail,
  type WholesaleShareMember,
  type WholesaleSplitMode,
} from "@/hooks/use-wholesale-shares";
import { ExpandableCard } from "@/components/wholesale-shared/ExpandableCard";
import { shareStage } from "@/components/wholesale-shared/stage";
import { WhatYouOwe } from "@/components/wholesale-shared/WhatYouOwe";
import { FeeLine } from "@/components/wholesale-shared/payment-fields";
import { GroupTracker } from "@/components/wholesale-shared/GroupTracker";
import { InvitePrompt } from "@/components/wholesale-shared/InvitePrompt";
import { buildGuide, GUIDE_ANCHORS } from "@/components/wholesale-shared/next-step";

interface ProductLite {
  id: string;
  name: string;
  price: number;
  category?: string | null;
  active?: boolean;
  stock?: number | null;
  lowStockThreshold?: number | null;
}

const money = (n: number) => `$${n.toFixed(2)}`;

// Address autocomplete (Royal Mail style) — type an address/postcode and pick a
// match to auto-fill the fields. Uses the free, no-key Photon (OpenStreetMap)
// geocoder; on any failure it returns [] so the manual fields still work.
type AddrSuggestion = {
  label: string;
  line1: string;
  city: string;
  postcode: string;
  country: string;
};

interface PhotonProps {
  housenumber?: string;
  street?: string;
  name?: string;
  city?: string;
  town?: string;
  village?: string;
  district?: string;
  county?: string;
  locality?: string;
  postcode?: string;
  country?: string;
}

async function lookupAddresses(query: string): Promise<AddrSuggestion[]> {
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lang=en`
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { features?: Array<{ properties?: PhotonProps }> };
    const feats = Array.isArray(data.features) ? data.features : [];
    const seen = new Set<string>();
    const out: AddrSuggestion[] = [];
    for (const f of feats) {
      const p = f.properties ?? {};
      const line1 = [p.housenumber, p.street || p.name].filter(Boolean).join(" ").trim();
      const city = p.city || p.town || p.village || p.district || p.county || p.locality || "";
      const postcode = p.postcode || "";
      const country = p.country || "";
      const label = [line1 || p.name, postcode, city, country].filter(Boolean).join(", ");
      if (!label || seen.has(label)) continue;
      seen.add(label);
      out.push({ label, line1: line1 || p.name || "", city, postcode, country });
    }
    return out;
  } catch {
    return [];
  }
}

type StockLevel = "oos" | "low" | "medium" | "high" | "none";

function getStockLevel(stock: number | null | undefined): StockLevel {
  if (stock == null) return "none";
  if (stock <= 0) return "oos";
  if (stock <= 25) return "low";
  if (stock <= 70) return "medium";
  return "high";
}

const STOCK_META: Record<StockLevel, { label: string; color: string }> = {
  oos: { label: "Out of Stock", color: "#ef4444" },
  low: { label: "Low Stock", color: "#f97316" },
  medium: { label: "In Stock", color: "#eab308" },
  high: { label: "Well Stocked", color: "#22c55e" },
  none: { label: "—", color: "var(--t-muted)" },
};

function StatusBadge({ status }: { status: WholesaleShareDetail["status"] }) {
  const meta: Record<string, { label: string; color: string; bg: string }> = {
    open: { label: "Open", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
    locked: { label: "Locked — paying", color: "#eab308", bg: "rgba(234,179,8,0.12)" },
    submitted: { label: "Submitted", color: "var(--t-blue)", bg: "var(--t-blue-08)" },
    cancelled: { label: "Cancelled", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  };
  const m = meta[status] ?? meta.open;
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ color: m.color, background: m.bg }}>
      {m.label}
    </span>
  );
}

// Masked onward-tracking status → human label + colour (mirrors GB parcel statuses).
const TRACK_STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: "Awaiting pickup", color: "var(--t-muted)" },
  in_transit: { label: "In transit", color: "var(--t-blue)" },
  out_for_delivery: { label: "Out for delivery", color: "#8b5cf6" },
  attempted: { label: "Delivery attempted", color: "#f97316" },
  delivered: { label: "Delivered", color: "#22c55e" },
  exception: { label: "Exception", color: "#ef4444" },
  expired: { label: "Expired", color: "#ef4444" },
  undeliverable: { label: "Undeliverable", color: "#ef4444" },
};

function trackStatusMeta(status: string | null | undefined): { label: string; color: string } {
  if (!status) return { label: "Awaiting pickup", color: "var(--t-muted)" };
  return TRACK_STATUS_META[status] ?? { label: status.replace(/_/g, " "), color: "var(--t-muted)" };
}

function formatTrackDate(raw: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function WholesaleShared() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/wholesale/shared/:id");
  const id = params?.id ?? null;
  const { account, isLoading: accountLoading } = useAccount();
  const invalidate = useInvalidateWholesaleShare();

  const { data: result, isLoading: shareLoading } = useWholesaleShare(id);
  const share = result?.ok ? result.share : null;

  const [products, setProducts] = useState<ProductLite[]>([]);
  const [productSearch, setProductSearch] = useState("");

  // Local editor state for the current member's items + tip
  const [myItems, setMyItems] = useState<Record<string, number>>({});
  const [myTip, setMyTip] = useState(0);
  const [itemsDirty, setItemsDirty] = useState(false);

  // Creator-only delivery picker — organiser chooses WHICH member receives the parcel.
  const [delUser, setDelUser] = useState("");
  const deliverySeeded = useRef(false);

  // Organiser-only optional fee editor. Custom per-member organiser fee (paid to the
  // organiser). Paid SEPARATELY and never enters the per-member order total.
  const [orgPayInfo, setOrgPayInfo] = useState("");
  const [feeAmounts, setFeeAmounts] = useState<Record<string, string>>({});
  const [feesDirty, setFeesDirty] = useState(false);
  const feesSeeded = useRef(false);

  // Organiser-only order rules: min/max kits per person, max total kits, an auto-lock
  // deadline, and an allowed-country list. Seeded from the share once and skipped
  // while the organiser has unsaved edits (so polling can't clobber typing).
  const [settingsForm, setSettingsForm] = useState({
    maxMembers: "", minKitsPerMember: "", maxKitsPerMember: "", maxTotalKits: "", lockDeadline: "",
    // Max packages + flat per-person organiser fee live with the rest of the rules.
    maxPackages: "", organiserFlatFee: "",
  });
  const [allowedCountriesList, setAllowedCountriesList] = useState<string[]>([]);
  const [countryToAdd, setCountryToAdd] = useState("");
  const [settingsDirty, setSettingsDirty] = useState(false);
  const settingsSeeded = useRef(false);

  // Recipient-only address form — the designated delivery member can enter a one-off
  // address for this parcel instead of being stuck with their saved account address.
  const [addr, setAddr] = useState({
    name: "", line1: "", line2: "", city: "", postcode: "", country: "United Kingdom", phone: "",
  });
  const addrSeeded = useRef(false);

  // Onward shipping form — where the current member wants their items forwarded by
  // the parcel recipient. Kept separate from the recipient delivery form above.
  const [onwardModalOpen, setOnwardModalOpen] = useState(false);
  const [dispatchPrintOpen, setDispatchPrintOpen] = useState(false);
  // Per-member onward tracking inputs (dispatcher only): keyed by member username.
  const [trackInputs, setTrackInputs] = useState<Record<string, { num: string; carrier: string }>>({});
  const [onwardAddr, setOnwardAddr] = useState({
    name: "", line1: "", line2: "", city: "", postcode: "", country: "United Kingdom", phone: "",
  });
  const onwardSeeded = useRef(false);

  // Address autocomplete state for the recipient delivery form.
  const [addrQuery, setAddrQuery] = useState("");
  const [addrResults, setAddrResults] = useState<AddrSuggestion[]>([]);
  const [addrSearching, setAddrSearching] = useState(false);
  const [showAddrResults, setShowAddrResults] = useState(false);
  const [addrActiveIdx, setAddrActiveIdx] = useState(-1);
  const addrSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addrBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addrReqId = useRef(0);

  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Presentation: a brand-new order is set up in ordered sections (add items, then
  // organiser shipping split + fee). Once those are done the full order opens. The
  // completed flag is remembered per share so a return visit skips the gate.
  const [setupDismissed, setSetupDismissed] = useState(false);

  const [flashAnchor, setFlashAnchor] = useState<string | null>(null);
  // One-time "invite others" popup, shown after a member saves their items.
  const [invitePromptOpen, setInvitePromptOpen] = useState(false);
  const markInvitePromptSeen = useMarkWholesaleInvitePromptSeen();
  const invitePromptFired = useRef(false);

  // Gate: wholesale members only
  useEffect(() => {
    if (!accountLoading) {
      if (!account) setLocation("/login");
      else if (!account.isWholesale) setLocation("/account");
    }
  }, [accountLoading, account, setLocation]);

  // Load wholesale products once
  useEffect(() => {
    fetch("/api/wholesale/products")
      .then(r => (r.ok ? r.json() : []))
      .then(d => setProducts(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const myMember = useMemo(() => share?.members.find(m => m.isYou) ?? null, [share]);

  // ── Guided onboarding (presentation only) ──
  // Role + stage aware step plan derived from existing share data. Powers the
  // next-step banner and the setup wizard; never calls the server.
  const guide = useMemo(() => (share && myMember ? buildGuide(share, myMember) : null), [share, myMember]);
  const autoMoment = guide?.autoOpenMomentId ?? null;

  // Progressive setup gate (presentation only). Only applies to non-creator
  // members who need to be guided to add their items. Creators (organisers)
  // always see the full view — they need access to settings, limits, fee config
  // etc. from the start and should never be gated behind a wizard.
  const setupSteps: string[] = guide?.stage === "building" && !share?.isCreator
    ? ["items"]
    : [];
  const setupStepDone = (sid: string): boolean => {
    if (sid === "items") return (myMember?.kits ?? 0) > 0;
    if (sid === "shipfee") return setupDismissed;
    return true;
  };
  const activeSetupStep = setupSteps.find(sid => !setupStepDone(sid)) ?? null;
  const setupGateActive = activeSetupStep !== null;

  // Restore whether this share's setup gate was already completed.
  useEffect(() => {
    if (!id) { setSetupDismissed(false); return; }
    let done = false;
    try { done = !!localStorage.getItem(`peps:ws-setup-done:${id}`); } catch { /* ignore */ }
    setSetupDismissed(done);
  }, [id]);

  // Per-member, per-share localStorage key for this member's unsaved draft. Null
  // until the account is loaded so we never read/write a non-namespaced key.
  const draftUser = (account?.telegramUsername ?? "").replace(/^@/, "");
  const draftKey = id && draftUser ? `peps:ws-share-draft:${id}:${draftUser}` : null;
  // Whether we've already attempted to restore a locally-saved draft for this key.
  const localRestored = useRef(false);

  // Reset the local editor state when the share or the signed-in member changes, so
  // a reused component instance can't carry one share's (or member's) draft into
  // another. Without this, navigating between shares could leak unsaved items.
  useEffect(() => {
    localRestored.current = false;
    setItemsDirty(false);
    setMyItems({});
    setMyTip(0);
  }, [id, draftUser]);

  // Seed my items/tip from the server unless I have unsaved local edits. On first
  // load, restore any locally-saved unsaved draft (it survives a page refresh) so a
  // member can come back to a half-built order without losing their work.
  useEffect(() => {
    if (!myMember || itemsDirty) return;

    if (!localRestored.current && draftKey && share?.status === "open") {
      localRestored.current = true;
      try {
        const raw = localStorage.getItem(draftKey);
        if (raw) {
          const d = JSON.parse(raw);
          if (d?.myItems) {
            setMyItems(d.myItems);
            setMyTip(typeof d.myTip === "number" ? d.myTip : 0);
            setItemsDirty(true);
            return;
          }
        }
      } catch { }
    }

    const q: Record<string, number> = {};
    myMember.items.forEach(it => { q[it.productId] = it.quantity; });
    setMyItems(q);
    setMyTip(myMember.tip ?? 0);
  }, [myMember, itemsDirty, draftKey, share]);

  // Persist unsaved edits locally so a refresh doesn't wipe them, and clear the
  // draft once the member saves (itemsDirty resets to false). Gated on
  // localRestored so we never delete a stored draft before it's been read back.
  useEffect(() => {
    if (!draftKey || !localRestored.current) return;
    try {
      if (itemsDirty) {
        localStorage.setItem(draftKey, JSON.stringify({ myItems, myTip }));
      } else {
        localStorage.removeItem(draftKey);
      }
    } catch { }
  }, [draftKey, itemsDirty, myItems, myTip]);

  // Seed the delivery picker once from the share's current delivery member.
  useEffect(() => {
    if (!share || deliverySeeded.current) return;
    if (share.isCreator) setDelUser(share.delivery.username ?? "");
    deliverySeeded.current = true;
  }, [share]);

  // Seed the organiser fee editor once from the share's stored fee data. Skipped
  // once the organiser has unsaved edits, so live polling never clobbers their work.
  useEffect(() => {
    if (!share || !share.fees?.canManage || feesDirty || feesSeeded.current) return;
    setOrgPayInfo(share.fees?.organiserPaymentInfo ?? "");
    const seeded: Record<string, string> = {};
    for (const m of share.members) {
      seeded[m.username] = m.organiserFee > 0 ? String(m.organiserFee) : "";
    }
    setFeeAmounts(seeded);
    feesSeeded.current = true;
  }, [share, feesDirty]);

  // Seed the organiser order-rules form once (organiser + open only).
  useEffect(() => {
    if (!share || !share.settings?.canManage || settingsDirty || settingsSeeded.current) return;
    const s = share.settings;
    setSettingsForm({
      maxMembers: s.maxMembers != null ? String(s.maxMembers) : "",
      minKitsPerMember: s.minKitsPerMember != null ? String(s.minKitsPerMember) : "",
      maxKitsPerMember: s.maxKitsPerMember != null ? String(s.maxKitsPerMember) : "",
      maxTotalKits: s.maxTotalKits != null ? String(s.maxTotalKits) : "",
      lockDeadline: s.lockDeadline ? toDatetimeLocal(s.lockDeadline) : "",
      maxPackages: s.maxPackages != null ? String(s.maxPackages) : "",
      organiserFlatFee: s.organiserFlatFee != null ? String(s.organiserFlatFee) : "",
    });
    setAllowedCountriesList(s.allowedCountries ?? []);
    settingsSeeded.current = true;
  }, [share, settingsDirty]);

  // Seed the recipient address form once, when I'm the chosen recipient. Prefer any
  // address already saved on the share; otherwise fall back to my saved account
  // address as a convenient starting point (which I can freely edit).
  useEffect(() => {
    if (!share || !share.delivery.canEditAddress || addrSeeded.current) return;
    if (share.delivery.address) {
      const lines = share.delivery.address.split("\n").map(s => s.trim()).filter(Boolean);
      let line1 = "", line2 = "", cityLine = "";
      if (lines.length >= 3) { [line1, line2, cityLine] = lines; }
      else if (lines.length === 2) { [line1, cityLine] = lines; }
      else if (lines.length === 1) { [line1] = lines; }
      setAddr({
        name: share.delivery.name ?? "",
        line1, line2, city: cityLine, postcode: "",
        country: share.delivery.country ?? "United Kingdom",
        phone: share.delivery.phone ?? "",
      });
    } else if (account) {
      setAddr({
        name: account.telegramUsername?.replace(/^@/, "") ?? "",
        line1: account.addressLine1 ?? "",
        line2: account.addressLine2 ?? "",
        city: account.addressCity ?? "",
        postcode: account.addressPostcode ?? "",
        country: account.country ?? account.addressCountry ?? "United Kingdom",
        phone: [account.addressPhonePrefix, account.addressPhone].filter(Boolean).join(" "),
      });
    }
    addrSeeded.current = true;
  }, [share, account]);

  // Seed the onward address form once, for a member who can add one. Prefer any
  // onward address already saved on my member row; otherwise fall back to my saved
  // account address as a convenient starting point (freely editable).
  useEffect(() => {
    if (!share || onwardSeeded.current) return;
    const mine = share.members.find(m => m.isYou);
    if (!mine || !mine.canEditOnward) return;
    if (mine.onward?.address) {
      const lines = mine.onward.address.split("\n").map(s => s.trim()).filter(Boolean);
      let line1 = "", line2 = "", cityLine = "";
      if (lines.length >= 3) { [line1, line2, cityLine] = lines; }
      else if (lines.length === 2) { [line1, cityLine] = lines; }
      else if (lines.length === 1) { [line1] = lines; }
      setOnwardAddr({
        name: mine.onward.name ?? "",
        line1, line2, city: cityLine, postcode: "",
        country: mine.onward.country ?? "United Kingdom",
        phone: mine.onward.phone ?? "",
      });
    } else if (account) {
      setOnwardAddr({
        name: account.telegramUsername?.replace(/^@/, "") ?? "",
        line1: account.addressLine1 ?? "",
        line2: account.addressLine2 ?? "",
        city: account.addressCity ?? "",
        postcode: account.addressPostcode ?? "",
        country: account.country ?? account.addressCountry ?? "United Kingdom",
        phone: [account.addressPhonePrefix, account.addressPhone].filter(Boolean).join(" "),
      });
    }
    onwardSeeded.current = true;
  }, [share, account]);

  // Clear pending address-search timers on unmount.
  useEffect(() => () => {
    if (addrSearchTimer.current) clearTimeout(addrSearchTimer.current);
    if (addrBlurTimer.current) clearTimeout(addrBlurTimer.current);
  }, []);

  // Delivery-address popup. Opens automatically the moment this member becomes
  // the recipient without a saved address (e.g. the organiser picks themselves),
  // and can be re-opened from the "Add/Edit delivery address" buttons. Declared
  // with the other hooks (above the early returns) to keep hook order stable.
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const addrAutoOpenedRef = useRef(false);
  useEffect(() => {
    const canEdit = !!share?.delivery.canEditAddress;
    const hasAddress = !!share?.delivery.address;
    if (canEdit && !hasAddress) {
      if (!addrAutoOpenedRef.current) { addrAutoOpenedRef.current = true; setAddressModalOpen(true); }
    } else if (!canEdit) {
      addrAutoOpenedRef.current = false;
    }
  }, [share?.delivery.canEditAddress, share?.delivery.address]);

  const priceOf = (productId: string) => products.find(p => p.id === productId)?.price ?? 0;
  const nameOf = (productId: string) => products.find(p => p.id === productId)?.name ?? productId;

  const myKits = useMemo(() => Object.values(myItems).reduce((s, q) => s + (q > 0 ? q : 0), 0), [myItems]);
  const mySubtotal = useMemo(
    () => Object.entries(myItems).reduce((s, [pid, q]) => s + (q > 0 ? q * priceOf(pid) : 0), 0),
    [myItems, products],
  );

  if (accountLoading || (shareLoading && !result)) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-muted)" }} />
        </div>
      </PageLayout>
    );
  }
  if (!account || !account.isWholesale) return null;

  // ── Not found / not a member / load error ──
  if (result && !result.ok) {
    const notFound = result.status === 404;
    const canJoin = result.status === 403;
    // Only a real 403 means "not a member, you may join". A 404 means the code is
    // wrong. ANY other outcome (network error → status 0, or a 5xx server error) is
    // a transient failure — show a retry, never a misleading "Join" screen, or a
    // working member's own order looks like an invite they haven't accepted.
    const loadError = !notFound && !canJoin;
    return (
      <PageLayout>
        <main className="px-4 py-8 max-w-md mx-auto w-full">
          <button onClick={() => setLocation("/wholesale/shared")} className="flex items-center gap-1.5 text-sm mb-5" style={{ color: "var(--t-muted)" }}>
            <ArrowLeft className="w-4 h-4" /> Back to shared orders
          </button>
          <div className="rounded-2xl p-6 text-center space-y-4" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{ background: "var(--t-blue-08)" }}>
              {canJoin ? <Users className="w-6 h-6" style={{ color: "var(--t-blue)" }} /> : <AlertCircle className="w-6 h-6" style={{ color: "var(--t-blue)" }} />}
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>
                {notFound ? "Shared order not found" : loadError ? "Couldn't load this shared order" : "Join shared wholesale order"}
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--t-muted)" }}>
                {notFound
                  ? "This code doesn't match any shared order. Double-check the code with the organiser."
                  : loadError
                    ? "Something went wrong loading this shared order. Check your connection and try again — your items and details are safe."
                    : <>You've been invited to shared order <span className="font-mono font-bold" style={{ color: "var(--t-text)" }}>{id}</span>{result.creatorUsername ? <> by the order lead ({result.creatorUsername})</> : null}. Join to add your own items.</>}
              </p>
            </div>
            {canJoin && (
              <>
                {actionError && <p className="text-sm" style={{ color: "#ef4444" }}>{actionError}</p>}
                <button
                  disabled={busy === "join"}
                  onClick={async () => {
                    setActionError(""); setBusy("join");
                    try { await joinWholesaleShare(id!); invalidate(id!); }
                    catch (e) { setActionError((e as Error).message); }
                    finally { setBusy(null); }
                  }}
                  className="w-full h-11 rounded-xl text-sm font-bold text-white inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: "var(--t-blue)" }}
                >
                  {busy === "join" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  Join this shared order
                </button>
              </>
            )}
            {loadError && (
              <button
                onClick={() => invalidate(id!)}
                className="w-full h-11 rounded-xl text-sm font-bold text-white inline-flex items-center justify-center gap-2"
                style={{ background: "var(--t-blue)" }}
              >
                <RefreshCw className="w-4 h-4" /> Try again
              </button>
            )}
          </div>
        </main>
      </PageLayout>
    );
  }

  if (!share) return null;

  const isOpen = share.status === "open";
  const canEditItems = isOpen && share.isMember;
  const paidCount = share.members.filter(m => m.paymentStatus === "confirmed").length;

  // Lock readiness hints (creator, while open)
  const everyoneHasItems = share.members.length > 0 && share.members.every(m => m.kits > 0);
  const deliverySet = !!share.delivery.username && !!share.delivery.address && !!share.delivery.country && !!share.delivery.name && !!share.delivery.phone;
  const shippingCalculable = deliverySet && share.estimateCalculable;
  const canLock = isOpen && share.members.length >= 2 && everyoneHasItems && deliverySet && shippingCalculable;

  // Stage drives which cards show / auto-expand; role flags gate the
  // organiser/recipient sections. Every underlying control keeps its own
  // server-side gate too.
  const stage = shareStage(share.status);
  const showOrganiserOpen = share.isCreator && isOpen;
  const showOrganiserLocked = share.isCreator && share.status === "locked";
  const showFeeRoster = (share.fees?.canConfirmOrganiserFees ?? false) && (share.fees?.active ?? false) && (share.fees?.organiserFeeTotal ?? 0) > 0;
  const showOrderBreakdown = (share.isCreator || !!myMember?.isRecipient) && share.members.length > 0;
  // Once everyone has paid the order is auto-submitted. For the ORGANISER that flips
  // the page into a streamlined post-paid view (combined order box, no invite/help).
  const everyonePaid = share.status === "submitted";
  const organiserDone = share.isCreator && everyonePaid;
  // A participant has paid once their own order payment is confirmed (or the whole
  // share is submitted). Used to hide onboarding help they no longer need.
  const myPaid = myMember?.paymentStatus === "confirmed" || everyonePaid;
  // The organiser only holds every member's onward (forwarding) address when they are
  // ALSO the parcel recipient — addresses stay private to the recipient otherwise. So
  // forwarding addresses + dispatch slips are gated on the organiser being the recipient.
  const canDispatch = organiserDone && !!myMember?.isRecipient;

  const setQty = (pid: string, val: number) => {
    const v = Math.max(0, Math.round(val));
    setItemsDirty(true);
    setMyItems(prev => {
      const next = { ...prev };
      if (v <= 0) delete next[pid]; else next[pid] = v;
      return next;
    });
  };

  const saveItems = async () => {
    if (!id) return;
    setActionError(""); setBusy("items");
    try {
      const items = Object.entries(myItems).filter(([, q]) => q > 0).map(([productId, quantity]) => ({ productId, quantity }));
      await setWholesaleShareItems(id, items, myTip);
      setItemsDirty(false);
      invalidate(id);
      // One-time nudge: once a member has saved real items, while the order is
      // still open and has room for more people, prompt them to share the invite
      // link. "Seen" is remembered per account in the database (account.me flag),
      // so a long-time user sees it at most once, ever, across all their devices.
      if (
        items.length > 0 &&
        share && share.status === "open" && (share.maxMembers == null || share.memberCount < share.maxMembers) &&
        account && !account.wholesaleInvitePromptSeen &&
        !invitePromptFired.current
      ) {
        invitePromptFired.current = true;
        // Only the caller who actually set the DB flag opens the nudge, so two
        // devices both starting with a stale "unseen" account don't each pop it.
        // If saving fails, we don't open — it simply retries on a later session.
        try {
          const r = await markInvitePromptSeen.mutateAsync();
          if (r?.newlyMarked) setInvitePromptOpen(true);
        } catch { /* persistence failed — leave for a later session */ }
      }
    } catch (e) { setActionError((e as Error).message); }
    finally { setBusy(null); }
  };

  const saveDelivery = async () => {
    if (!id || !delUser) return;
    setActionError(""); setBusy("delivery");
    try {
      await setWholesaleShareDelivery(id, delUser);
      addrSeeded.current = false; // re-seed the address form for the new recipient
      invalidate(id);
    } catch (e) { setActionError((e as Error).message); }
    finally { setBusy(null); }
  };

  // Debounced address search; runs once the user types at least 3 characters.
  // A monotonic request id guards against a slow earlier response overwriting a
  // newer one (out-of-order completion).
  const runAddrSearch = (v: string) => {
    setAddrQuery(v);
    setAddrActiveIdx(-1);
    if (addrSearchTimer.current) clearTimeout(addrSearchTimer.current);
    // Bump on EVERY call (including the <3 chars / cleared path) so any in-flight
    // fetch from an earlier query is invalidated and can't re-open stale results.
    const reqId = ++addrReqId.current;
    if (v.trim().length < 3) {
      setAddrResults([]); setShowAddrResults(false); setAddrSearching(false);
      return;
    }
    setAddrSearching(true);
    addrSearchTimer.current = setTimeout(async () => {
      const results = await lookupAddresses(v.trim());
      if (reqId !== addrReqId.current) return; // superseded by a newer query
      setAddrResults(results);
      setShowAddrResults(true);
      setAddrSearching(false);
    }, 300);
  };

  // Fill the address fields from a chosen suggestion (keeps existing values when
  // a suggestion omits a field).
  const pickAddress = (s: AddrSuggestion) => {
    addrReqId.current++; // ignore any in-flight search
    setAddr(a => ({
      ...a,
      line1: s.line1 || a.line1,
      city: s.city || a.city,
      postcode: s.postcode || a.postcode,
      country: s.country && (COUNTRIES as readonly string[]).includes(s.country) ? s.country : a.country,
    }));
    setAddrQuery(s.label);
    setAddrResults([]);
    setShowAddrResults(false);
    setAddrActiveIdx(-1);
  };

  // Keyboard support for the address combobox (arrow keys, Enter, Escape).
  const onAddrKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { setShowAddrResults(false); setAddrActiveIdx(-1); return; }
    if (!showAddrResults || addrResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAddrActiveIdx(i => Math.min(i + 1, addrResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAddrActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const sel = addrResults[addrActiveIdx];
      if (sel) { e.preventDefault(); pickAddress(sel); }
    }
  };

  // Whether the suggestions dropdown is actually visible (results OR a no-match
  // message for a settled >=3 char query). Drives both rendering and aria-expanded.
  const addrDropdownOpen = showAddrResults && (addrResults.length > 0 || (addrQuery.trim().length >= 3 && !addrSearching));

  const saveDeliveryAddress = async () => {
    if (!id) return;
    setActionError(""); setBusy("delivery-address");
    try {
      await setWholesaleShareDeliveryAddress(id, {
        name: addr.name,
        addressLine1: addr.line1,
        addressLine2: addr.line2,
        city: addr.city,
        postcode: addr.postcode,
        country: addr.country,
        phone: addr.phone,
      });
      invalidate(id);
      setAddressModalOpen(false);
    } catch (e) { setActionError((e as Error).message); }
    finally { setBusy(null); }
  };

  const saveOnwardAddress = async () => {
    if (!id) return;
    setActionError(""); setBusy("onward-address");
    try {
      await setWholesaleShareMyOnwardAddress(id, {
        name: onwardAddr.name,
        addressLine1: onwardAddr.line1,
        addressLine2: onwardAddr.line2,
        city: onwardAddr.city,
        postcode: onwardAddr.postcode,
        country: onwardAddr.country,
        phone: onwardAddr.phone,
      });
      invalidate(id);
      setOnwardModalOpen(false);
    } catch (e) { setActionError((e as Error).message); }
    finally { setBusy(null); }
  };

  // Dispatcher records (or clears) one member's onward tracking number. The server
  // immediately fetches the latest masked status from 17track.
  const saveTracking = async (username: string, trackingNumber: string, carrier: string) => {
    if (!id) return;
    setActionError(""); setBusy(`track-${username}`);
    try {
      await setWholesaleShareTracking(id, username, { trackingNumber: trackingNumber.trim(), carrier: carrier.trim() });
      invalidate(id);
    } catch (e) { setActionError((e as Error).message); }
    finally { setBusy(null); }
  };

  // Per-member onward tracking controls, shown to whoever the server says may edit
  // tracking (the dispatching recipient — creator or not) or whenever a number exists.
  const renderMemberTracking = (m: WholesaleShareMember) => {
    if (!m.canEditTracking && !m.onwardTracking?.hasTracking) return null;
    const t = m.onwardTracking;
    const draft = trackInputs[m.username] ?? {
      num: t?.trackingNumber ?? "",
      carrier: t?.carrier ?? "",
    };
    const setDraft = (patch: Partial<{ num: string; carrier: string }>) =>
      setTrackInputs(prev => ({ ...prev, [m.username]: { ...draft, ...patch } }));
    const saving = busy === `track-${m.username}`;
    const meta = trackStatusMeta(t?.status);
    return (
      <div className="pt-2 border-t space-y-2" style={{ borderColor: "var(--t-border)" }}>
        <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--t-muted)" }}>
          <Truck className="w-3.5 h-3.5 shrink-0" /> Onward tracking
        </p>
        {t?.hasTracking && (
          <div className="rounded-lg p-2.5 text-xs space-y-1" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold" style={{ color: meta.color }}>{meta.label}</span>
              {t.trackingNumber && (
                <span className="font-mono" style={{ color: "var(--t-muted)" }}>{t.trackingNumber}</span>
              )}
            </div>
            {t.lastChecked && (
              <p style={{ color: "var(--t-muted)" }}>Updated {formatTrackDate(t.lastChecked)}</p>
            )}
          </div>
        )}
        {m.canEditTracking && (
          <>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={draft.num}
                onChange={e => setDraft({ num: e.target.value })}
                placeholder="Tracking number"
                className="flex-1 h-10 px-3 rounded-lg text-sm font-mono"
                style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
              />
              <input
                value={draft.carrier}
                onChange={e => setDraft({ carrier: e.target.value })}
                placeholder="Carrier (optional)"
                className="sm:w-40 h-10 px-3 rounded-lg text-sm"
                style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => saveTracking(m.username, draft.num, draft.carrier)}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                style={{ background: "var(--t-blue)" }}
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {t?.hasTracking ? "Update tracking" : "Save tracking"}
              </button>
              {t?.hasTracking && (
                <button
                  onClick={() => saveTracking(m.username, "", "")}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-bold disabled:opacity-50"
                  style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}
                >
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const changeSplit = async (mode: WholesaleSplitMode) => {
    if (!id || mode === share.splitMode) return;
    setActionError(""); setBusy("split");
    try { await setWholesaleShareSplit(id, mode); invalidate(id); }
    catch (e) { setActionError((e as Error).message); }
    finally { setBusy(null); }
  };

  const saveSettings = async () => {
    if (!id) return;
    setActionError(""); setBusy("settings");
    try {
      await setWholesaleShareSettings(id, {
        maxMembers: settingsForm.maxMembers.trim() === "" ? null : Number(settingsForm.maxMembers),
        minKitsPerMember: settingsForm.minKitsPerMember.trim() === "" ? null : Number(settingsForm.minKitsPerMember),
        maxKitsPerMember: settingsForm.maxKitsPerMember.trim() === "" ? null : Number(settingsForm.maxKitsPerMember),
        maxTotalKits: settingsForm.maxTotalKits.trim() === "" ? null : Number(settingsForm.maxTotalKits),
        lockDeadline: settingsForm.lockDeadline ? new Date(settingsForm.lockDeadline).toISOString() : null,
        allowedCountries: allowedCountriesList.length > 0 ? allowedCountriesList : null,
        maxPackages: settingsForm.maxPackages.trim() === "" ? null : Number(settingsForm.maxPackages),
        organiserFlatFee: settingsForm.organiserFlatFee.trim() === "" ? null : Number(settingsForm.organiserFlatFee),
      });
      setSettingsDirty(false);
      // Don't reset settingsSeeded here. The form already holds exactly what we just
      // submitted, so re-enabling the seed effect would let it run against the still-stale
      // cached share (before the refetch lands) and clobber the form — most visibly wiping
      // the allowed-countries list, which also disables the "list publicly" toggle.
      invalidate(id);
    } catch (e) { setActionError((e as Error).message); }
    finally { setBusy(null); }
  };

  const savePublic = async (makePublic: boolean) => {
    if (!id) return;
    setActionError(""); setBusy("publish");
    try {
      await publishWholesaleShare(id, makePublic ? {
        public: true,
        country: allowedCountriesList[0] ?? "",
        maxMembers: settingsForm.maxMembers.trim() === "" ? null : Number(settingsForm.maxMembers),
        maxTotalKits: settingsForm.maxTotalKits.trim() === "" ? null : Number(settingsForm.maxTotalKits),
        maxPackages: settingsForm.maxPackages.trim() === "" ? null : Number(settingsForm.maxPackages),
        organiserFlatFee: settingsForm.organiserFlatFee.trim() === "" ? null : Number(settingsForm.organiserFlatFee),
      } : { public: false });
      // The form already holds exactly what we just submitted, so DON'T reset the
      // "seeded" ref here. Resetting would let the seed effect re-run against the
      // still-stale cached share (before the refetch lands) and clobber the form
      // back to pre-save values. We also never clear settingsDirty — publishing
      // persists the public card fields from the form, but the per-person kit limits
      // and lock deadline are only saved by "Save limits & rules".
      invalidate(id);
    } catch (e) { setActionError((e as Error).message); }
    finally { setBusy(null); }
  };

  const removeMember = async (username: string) => {
    if (!id) return;
    setActionError(""); setBusy(`remove:${username}`);
    try { await removeWholesaleShareMember(id, username); invalidate(id); }
    catch (e) { setActionError((e as Error).message); }
    finally { setBusy(null); }
  };

  const setFeeAmount = (username: string, value: string) => {
    setFeesDirty(true);
    setFeeAmounts(prev => ({ ...prev, [username]: value }));
  };

  const saveFees = async () => {
    if (!id || !share) return;
    setActionError(""); setBusy("fees");
    try {
      const recipientLower = share.delivery.username?.toLowerCase() ?? null;
      const fees = share.members.map(m => {
        const isRecipient = recipientLower != null && m.username.toLowerCase() === recipientLower;
        return {
          username: m.username,
          organiserFee: isRecipient ? 0 : Math.max(0, parseFloat(feeAmounts[m.username] ?? "") || 0),
        };
      });
      await setWholesaleShareFees(id, { organiserPaymentInfo: orgPayInfo.trim(), fees });
      setFeesDirty(false);
      feesSeeded.current = false;
      invalidate(id);
    } catch (e) { setActionError((e as Error).message); }
    finally { setBusy(null); }
  };

  const toggleFeePaid = async (username: string, feeType: "organiser", paid: boolean) => {
    if (!id) return;
    setActionError(""); setBusy(`feepaid:${feeType}:${username}`);
    try { await confirmWholesaleShareFee(id, { username, feeType, paid }); invalidate(id); }
    catch (e) { setActionError((e as Error).message); }
    finally { setBusy(null); }
  };

  const doLock = async () => {
    if (!id) return;
    setActionError(""); setBusy("lock");
    try { await lockWholesaleShare(id); invalidate(id); }
    catch (e) { setActionError((e as Error).message); }
    finally { setBusy(null); }
  };

  const doUnlock = async () => {
    if (!id) return;
    if (!window.confirm("Unlock this order so members can change items and delivery again? Each member's order is removed until you lock again. You can't unlock once a member has started paying.")) return;
    setActionError(""); setBusy("unlock");
    try { await unlockWholesaleShare(id); invalidate(id); }
    catch (e) { setActionError((e as Error).message); }
    finally { setBusy(null); }
  };

  const doCancel = async () => {
    if (!id) return;
    const msg = share.status === "locked"
      ? "Cancel this locked shared order for everyone? Each member's order will be cancelled and anyone who already paid will need a manual refund. This can't be undone."
      : "Cancel this shared order for everyone? This can't be undone.";
    if (!window.confirm(msg)) return;
    setActionError(""); setBusy("cancel");
    try {
      await cancelWholesaleShare(id);
      if (draftKey) { try { localStorage.removeItem(draftKey); } catch { } }
      invalidate(id);
      setLocation("/wholesale");
    }
    catch (e) { setActionError((e as Error).message); setBusy(null); }
  };

  const doLeave = async () => {
    if (!id) return;
    if (!window.confirm("Leave this shared order? You won't be able to rejoin without the invite code.")) return;
    setBusy("leave"); setActionError("");
    try { await leaveWholesaleShare(id); invalidate(id); setLocation("/account"); }
    catch (e) { setActionError((e as Error).message); setBusy(null); }
  };

  const copy = (text: string, which: "code" | "link") => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    }).catch(() => {});
  };

  const shareLink = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "";

  // Mark the progressive setup gate complete so the full order opens (and stays
  // open on return visits). Also mark the current onboarding moment seen so the
  // legacy setup overlay doesn't pop up immediately on top of the full order.
  const dismissSetup = () => {
    setSetupDismissed(true);
    if (id) { try { localStorage.setItem(`peps:ws-setup-done:${id}`, "1"); } catch { /* ignore */ } }
    markWizardSeen();
  };

  // Mark the active auto-open moment as seen so the wizard won't reopen on return.
  const markWizardSeen = () => {
    if (autoMoment && id) { try { localStorage.setItem(`peps:ws-wizard-seen:${id}:${autoMoment}`, "1"); } catch { /* ignore */ } }
  };

  const flashStyle = (anchor: string) =>
    flashAnchor === anchor
      ? { boxShadow: "0 0 0 2px var(--t-blue)", borderRadius: 16, transition: "box-shadow 0.2s" }
      : undefined;

  const searchQ = productSearch.trim().toLowerCase();
  const visibleProducts = (searchQ ? products.filter(p => p.name.toLowerCase().includes(searchQ)) : products)
    .filter(p => p.active !== false);

  const card = { background: "var(--t-surface)", border: "1px solid var(--t-border)" } as const;
  const field = { background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-text)" } as const;

  // ────────────────────────────────────────────────────────────────────────────
  // Reusable section renderers. Each self-gates (returns null when not applicable)
  // so the guided wizard and the full view can compose the SAME content — no
  // server-wired form is duplicated. The guided view shows one step's section(s) at
  // a time; the full view shows them all at once (today's layout).
  // ────────────────────────────────────────────────────────────────────────────

  const sectionHeader = (
    <div className="rounded-2xl p-5 space-y-4" style={card}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>Shared Wholesale Order</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--t-muted)" }}>
            One parcel, split between members. Everyone pays their own items.
          </p>
        </div>
        <StatusBadge status={share.status} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => copy(share.id, "code")}
          className="inline-flex items-center gap-2 px-3 h-10 rounded-xl font-mono font-bold text-lg tracking-widest"
          style={{ background: "var(--t-blue-08)", color: "var(--t-blue)" }}
          title="Copy share code"
        >
          {share.id}
          {copied === "code" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
        {!everyonePaid && (
          <button
            onClick={() => copy(shareLink, "link")}
            className="inline-flex items-center gap-1.5 px-3 h-10 rounded-xl text-sm font-semibold"
            style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}
          >
            {copied === "link" ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {copied === "link" ? "Link copied" : "Copy invite link"}
          </button>
        )}
        <span className="inline-flex items-center gap-1.5 text-sm ml-auto" style={{ color: "var(--t-muted)" }}>
          <Users className="w-4 h-4" /> {share.memberCount}{share.maxMembers != null ? `/${share.maxMembers}` : ""} members
        </span>
      </div>
    </div>
  );

  const sectionHowItWorks = (
    <section className="rounded-2xl overflow-hidden" style={card}>
      <button
        onClick={() => setShowHelp(v => !v)}
        aria-expanded={showHelp}
        className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left"
      >
        <span className="inline-flex items-center gap-2 text-sm font-bold" style={{ color: "var(--t-text)" }}>
          <Info className="w-4 h-4" style={{ color: "var(--t-blue)" }} /> How shared orders work
        </span>
        <ChevronDown
          className="w-4 h-4 shrink-0 transition-transform"
          style={{ color: "var(--t-muted)", transform: showHelp ? "rotate(180deg)" : "none" }}
        />
      </button>
      {showHelp && (
        <div className="px-5 pb-5 space-y-3 text-sm" style={{ color: "var(--t-muted)" }}>
          <p>Pool your items with other wholesale members into one parcel and split the vendor shipping — everyone still pays for their own items.</p>
          <ol className="space-y-2.5">
            {[
              { t: "Invite members.", d: `Share the code or invite link above. ${share.maxMembers != null ? `Up to ${share.maxMembers} members can join.` : "There's no limit on how many can join."}` },
              { t: "Add your items.", d: "While the order is Open, each member picks their own products and an optional tip." },
              { t: "Set the delivery member.", d: "The organiser picks one member to receive the parcel. That member then confirms the address — using their saved account address or a different one just for this order." },
              { t: "Lock the order.", d: "Once everyone has items and a delivery member is set, the organiser locks it. Items freeze and each member gets their own order to pay." },
              { t: "Everyone pays.", d: "Each member pays their own order. When the last person pays, the parcel is submitted to the vendor automatically." },
            ].map((step, i) => (
              <li key={i} className="flex gap-2.5">
                <span
                  className="flex-none w-5 h-5 rounded-full text-[11px] font-bold inline-flex items-center justify-center mt-0.5"
                  style={{ background: "var(--t-blue-08)", color: "var(--t-blue)" }}
                >
                  {i + 1}
                </span>
                <span><b style={{ color: "var(--t-text)" }}>{step.t}</b> {step.d}</span>
              </li>
            ))}
          </ol>
          <p className="text-xs">The organiser can cancel the shared order at any time.</p>
        </div>
      )}
    </section>
  );

  const sectionStatusBanners = (
    <>
      {share.status === "submitted" && (
        <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2" style={{ background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.25)", color: "#15803d" }}>
          <CheckCircle2 className="w-4 h-4 shrink-0" /> Everyone has paid — this order has been submitted to the vendor.
        </div>
      )}
      {share.status === "locked" && (
        <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2" style={{ background: "rgba(234,179,8,0.10)", border: "1px solid rgba(234,179,8,0.25)", color: "#a16207" }}>
          <Clock className="w-4 h-4 shrink-0" /> {paidCount} of {share.members.length} members have paid. The order is submitted automatically once everyone pays.
        </div>
      )}
      {share.status === "cancelled" && (
        <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)", color: "#b91c1c" }}>
          <Ban className="w-4 h-4 shrink-0" /> This shared order was cancelled.
        </div>
      )}
    </>
  );

  // Leave button — only an ordinary (non-creator) member can leave while open.
  const leaveButton = isOpen && myMember && !share.isCreator ? (
    <button
      onClick={doLeave}
      disabled={busy === "leave"}
      className="inline-flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-semibold disabled:opacity-50"
      style={{ background: "rgba(239,68,68,0.10)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.25)" }}
    >
      {busy === "leave" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
      Leave shared order
    </button>
  ) : null;

  // Lock checklist + actions — lives inside the Group & order details card.
  const lockChecklistBlock = (
    <div className="mt-4 pt-4 border-t space-y-2" style={{ borderColor: "var(--t-border)" }}>
      <Checklist ok={share.members.length >= 2} text="At least 2 members" />
      <Checklist ok={everyoneHasItems} text="Every member has added items" />
      <Checklist ok={deliverySet} text="Delivery member & address set" />
      <Checklist ok={shippingCalculable} text={deliverySet ? "Shipping can be calculated for this destination" : "Shipping calculable (set delivery first)"} />
      <div className="flex gap-2 pt-1">
        <button
          onClick={doLock}
          disabled={!canLock || busy === "lock"}
          className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "var(--t-blue)" }}
        >
          {busy === "lock" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          Lock & create orders
        </button>
        <button
          onClick={doCancel}
          disabled={busy === "cancel"}
          className="px-4 h-11 rounded-xl text-sm font-bold disabled:opacity-50"
          style={{ background: "rgba(239,68,68,0.10)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.25)" }}
        >
          Cancel
        </button>
      </div>
      <p className="text-xs" style={{ color: "var(--t-muted)" }}>
        Locking creates each member's order and stops further edits. Each member then pays their own share.
      </p>
    </div>
  );

  const sectionGroup = (
    <ExpandableCard
      title="Group & order details"
      icon={<Users className="w-4 h-4" style={{ color: "var(--t-blue)" }} />}
      summary={`${share.memberCount}${share.maxMembers != null ? `/${share.maxMembers}` : ""} members · ${share.combinedKits} kit${share.combinedKits === 1 ? "" : "s"} · ${money(share.combinedSubtotal)}`}
      defaultOpen={false}
    >
      <GroupTracker
        share={share}
        showItems={showOrderBreakdown}
        onPayMember={orderId => setLocation(`/account/orders/${orderId}`)}
        onRemoveMember={showOrganiserOpen ? removeMember : undefined}
        removingUsername={busy?.startsWith("remove:") ? busy.slice(7) : null}
      />
      {showOrganiserOpen && share.members.some(m => m.canRemove) && (
        <p className="text-[11px] mt-2" style={{ color: "var(--t-muted)" }}>
          Removing a member deletes their items from this order. If they were the delivery recipient, you'll need to pick a new one.
        </p>
      )}
      <div className="mt-4 pt-4 border-t space-y-2.5" style={{ borderColor: "var(--t-border)" }}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--t-muted)" }}>Order details</p>
        <div className="space-y-1">
          <Row label="Combined kits" value={String(share.combinedKits)} />
          {share.members.some(m => m.kits > 0) && (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              {share.members.filter(m => m.kits > 0).map(m => (
                <span key={m.username} className="text-[11px]" style={{ color: "var(--t-muted)" }}>
                  @{m.username.replace(/^@/, "")}: <span className="font-semibold" style={{ color: "var(--t-text)" }}>{m.kits}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <Row label="Combined products" value={money(share.combinedSubtotal)} />
        <Row
          label={`Vendor shipping${share.shippingRegion ? ` · ${share.shippingRegion}` : ""}`}
          value={
            share.status !== "open" && share.totalVendorShipping != null
              ? money(share.totalVendorShipping)
              : share.shippingEstimate != null
                ? `≈ ${money(share.shippingEstimate)}`
                : share.delivery.country ? "—" : "Set delivery to estimate"
          }
        />
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm" style={{ color: "var(--t-muted)" }}>Split between members</span>
          <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{share.splitMode === "by_size" ? "By order size" : "Evenly"}</span>
        </div>
      </div>
      {showOrganiserOpen && lockChecklistBlock}
      {leaveButton && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--t-border)" }}>
          {leaveButton}
        </div>
      )}
    </ExpandableCard>
  );

  // Compact, non-collapsible member status list for use inside guided steps.
  const groupTrackerCard = (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Who's In</p>
      <GroupTracker share={share} onPayMember={orderId => setLocation(`/account/orders/${orderId}`)} />
    </section>
  );

  const sectionMyItems = canEditItems ? (
    <section id={GUIDE_ANCHORS.items} style={flashStyle(GUIDE_ANCHORS.items)} className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8A9AAA" }}>My Items</p>
        {itemsDirty && <span className="text-xs font-semibold" style={{ color: "#eab308" }}>Unsaved changes</span>}
      </div>
      <p className="text-[11px] px-1" style={{ color: "var(--t-muted)" }}>
        Tap <span className="font-semibold">Save my items</span> to keep your selection. Your saved items and delivery details stay with this shared order — close anytime and finish later from <span className="font-semibold">Your shared orders</span>.
      </p>
      <div className="rounded-xl p-4 space-y-3" style={card}>
        <div className="flex items-center gap-2 h-10 px-3 rounded-lg border" style={field}>
          <Search className="w-4 h-4" style={{ color: "var(--t-muted)" }} />
          <input
            value={productSearch}
            onChange={e => setProductSearch(e.target.value)}
            placeholder="Search products…"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--t-text)" }}
          />
        </div>

        <div className="max-h-72 overflow-y-auto rounded-lg divide-y" style={{ border: "1px solid var(--t-border)", borderColor: "var(--t-border)" }}>
          {visibleProducts.length === 0 && (
            <p className="text-sm text-center py-6" style={{ color: "var(--t-muted)" }}>No products found.</p>
          )}
          {visibleProducts.map(p => {
            const qty = myItems[p.id] ?? 0;
            const stockLevel = getStockLevel(p.stock);
            const isOos = stockLevel === "oos";
            const stockMeta = STOCK_META[stockLevel];
            return (
              <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2" style={{ borderColor: "var(--t-border)", opacity: isOos ? 0.6 : 1 }}>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--t-text)" }}>{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs" style={{ color: "var(--t-muted)" }}>{money(p.price)}</span>
                    {stockLevel !== "none" && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: stockMeta.color }}>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: stockMeta.color }} />
                        {stockMeta.label}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => setQty(p.id, qty - 1)} disabled={qty <= 0} className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-40" style={{ background: "var(--t-surface2)", color: "var(--t-text)" }}>
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    value={qty || ""}
                    onChange={e => setQty(p.id, parseInt(e.target.value || "0", 10))}
                    placeholder="0"
                    className="w-12 h-7 text-center rounded-lg border text-sm bg-transparent outline-none"
                    style={field}
                  />
                  <button onClick={() => setQty(p.id, qty + 1)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--t-blue-08)", color: "var(--t-blue)" }}>
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold" style={{ color: "var(--t-muted)" }}>Tip (optional)</label>
          <select value={myTip} onChange={e => { setItemsDirty(true); setMyTip(parseFloat(e.target.value)); }} className="h-9 px-3 rounded-lg border text-sm outline-none" style={field}>
            {[0, 2, 5, 10, 15, 20].map(a => <option key={a} value={a}>{a === 0 ? "No tip" : `$${a}`}</option>)}
          </select>
        </div>

        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--t-border)" }}>
          <p className="text-sm" style={{ color: "var(--t-muted)" }}>
            {myKits} kit{myKits === 1 ? "" : "s"} · <span className="font-bold" style={{ color: "var(--t-text)" }}>{money(mySubtotal)}</span>
          </p>
          <button
            onClick={saveItems}
            disabled={busy === "items" || !itemsDirty}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "var(--t-blue)" }}
          >
            {busy === "items" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save my items
          </button>
        </div>
      </div>
    </section>
  ) : null;

  // Read-only "My Items" — once the order is no longer open (locked / submitted /
  // cancelled) the editor above disappears, so members and the organiser still need
  // to see exactly what they ordered. Renders straight from the saved member items.
  const sectionMyItemsReadOnly = !canEditItems && myMember && myMember.items.length > 0 ? (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8A9AAA" }}>My Items</p>
        <span className="text-[11px] font-semibold" style={{ color: "var(--t-muted)" }}>
          {share.status === "cancelled" ? "Order cancelled" : share.status === "locked" ? "Order locked · view only" : "Order submitted · view only"}
        </span>
      </div>
      <div className="rounded-xl p-4 space-y-2.5" style={card}>
        <div className="divide-y" style={{ borderColor: "var(--t-border)" }}>
          {myMember.items.map(it => (
            <div key={it.productId} className="flex items-center justify-between gap-3 py-2 first:pt-0">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--t-text)" }}>{it.productName}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--t-muted)" }}>{it.quantity} × {money(it.unitPrice)}</p>
              </div>
              <span className="text-sm font-semibold shrink-0" style={{ color: "var(--t-text)" }}>{money(it.quantity * it.unitPrice)}</span>
            </div>
          ))}
        </div>
        {myMember.tip > 0 && (
          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--t-border)" }}>
            <span className="text-sm" style={{ color: "var(--t-muted)" }}>Tip</span>
            <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{money(myMember.tip)}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--t-border)" }}>
          <span className="text-sm" style={{ color: "var(--t-muted)" }}>{myMember.kits} kit{myMember.kits === 1 ? "" : "s"}</span>
          <span className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{money(myMember.subtotal + myMember.tip)}</span>
        </div>
      </div>
    </section>
  ) : null;

  const sectionWhatYouOwe = (stage === "paying" || stage === "done") && myMember ? (
    <div id={GUIDE_ANCHORS.owe} style={flashStyle(GUIDE_ANCHORS.owe)}>
      <WhatYouOwe
        share={share}
        me={myMember}
        onPayOrder={() => { if (myMember.orderId) setLocation(`/account/orders/${myMember.orderId}`); }}
      />
    </div>
  ) : null;

  // Post-paid organiser view: ONE combined card with the organiser's own items plus
  // the order total + shipping — replaces the separate "My Items" + "What You Owe".
  const sectionOrgOrder = (organiserDone && myMember) ? (() => {
    const m = myMember;
    const shipping = m.shippingShare ?? 0;
    const total = m.subtotal + m.tip + shipping;
    const paid = m.paymentStatus === "confirmed";
    return (
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8A9AAA" }}>Your Order</p>
          {paid && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: "#15803d" }}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Paid
            </span>
          )}
        </div>
        <div className="rounded-2xl p-4 space-y-3" style={card}>
          {m.items.length > 0 ? (
            <div className="divide-y" style={{ borderColor: "var(--t-border)" }}>
              {m.items.map(it => (
                <div key={it.productId} className="flex items-center justify-between gap-3 py-2 first:pt-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--t-text)" }}>{it.productName}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--t-muted)" }}>{it.quantity} × {money(it.unitPrice)}</p>
                  </div>
                  <span className="text-sm font-semibold shrink-0" style={{ color: "var(--t-text)" }}>{money(it.quantity * it.unitPrice)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--t-muted)" }}>You didn't add any items to this order.</p>
          )}
          <div className="rounded-lg p-3 space-y-1.5" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: "var(--t-muted)" }}>Items{m.kits > 0 ? ` · ${m.kits} kit${m.kits === 1 ? "" : "s"}` : ""}</span>
              <span className="font-semibold" style={{ color: "var(--t-text)" }}>{money(m.subtotal)}</span>
            </div>
            {m.tip > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--t-muted)" }}>Tip</span>
                <span className="font-semibold" style={{ color: "var(--t-text)" }}>{money(m.tip)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: "var(--t-muted)" }}>Shipping</span>
              <span className="font-semibold" style={{ color: "var(--t-text)" }}>{money(shipping)}</span>
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t" style={{ borderColor: "var(--t-border)" }}>
              <span className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Total</span>
              <span className="text-lg font-bold" style={{ color: "var(--t-text)" }}>{money(total)}</span>
            </div>
          </div>
          {m.orderCode && (
            <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>Order #{m.orderCode}</p>
          )}
        </div>
      </section>
    );
  })() : null;

  // Printable dispatch slips — one per member needing their items forwarded on.
  const forwardSlips: ForwardSlip[] = canDispatch
    ? share.members
        .filter(m => !m.isRecipient && !!m.onward?.address)
        .map(m => ({
          id: m.username,
          username: m.username.replace(/^@/, ""),
          name: m.onward?.name ?? null,
          lineItems: m.items.map(it => ({ productName: it.productName, quantity: it.quantity })),
          address: m.onward?.address ?? null,
          country: m.onward?.country ?? null,
          phone: m.onward?.phone ?? null,
        }))
    : [];

  // Forwarding & dispatch — visible only to the organiser who is also the parcel
  // recipient. Each member's onward address + their items, plus printable slips.
  const sectionDispatch = canDispatch ? (() => {
    const others = share.members.filter(m => !m.isRecipient);
    return (
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8A9AAA" }}>Forwarding &amp; Dispatch</p>
          {forwardSlips.length > 0 && (
            <button
              onClick={() => setDispatchPrintOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold text-white"
              style={{ background: "var(--t-blue)" }}
            >
              <Printer className="w-3.5 h-3.5" /> Print slips
            </button>
          )}
        </div>
        <div className="rounded-xl p-4 space-y-3" style={card}>
          <p className="text-xs" style={{ color: "var(--t-muted)" }}>
            You're receiving the parcel. Forward each member's items to their address below. Only you can see these.
          </p>
          {others.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--t-muted)" }}>No other members to forward to.</p>
          ) : (
            <div className="space-y-2.5">
              {others.map(m => (
                <div key={m.username} className="rounded-lg p-3 space-y-2" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold" style={{ color: "var(--t-muted)" }}>@{m.username.replace(/^@/, "")}</p>
                    <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>{m.kits} kit{m.kits === 1 ? "" : "s"}</span>
                  </div>
                  {m.items.length > 0 && (
                    <div className="space-y-0.5">
                      {m.items.map(it => (
                        <p key={it.productId} className="text-sm" style={{ color: "var(--t-text)" }}>
                          <span className="font-bold">{it.quantity}×</span> {it.productName}
                        </p>
                      ))}
                    </div>
                  )}
                  {m.onward?.address ? (
                    <div className="text-sm pt-1.5 border-t" style={{ borderColor: "var(--t-border)" }}>
                      {m.onward.name && <p className="font-semibold" style={{ color: "var(--t-text)" }}>{m.onward.name}</p>}
                      <p className="whitespace-pre-line" style={{ color: "var(--t-text)" }}>{m.onward.address}</p>
                      {m.onward.country && <p style={{ color: "var(--t-text)" }}>{m.onward.country}</p>}
                      {m.onward.phone && <p style={{ color: "var(--t-muted)" }}>{m.onward.phone}</p>}
                    </div>
                  ) : (
                    <p className="text-xs flex items-center gap-1.5 pt-1.5 border-t" style={{ borderColor: "var(--t-border)", color: "#b45309" }}>
                      <Clock className="w-3.5 h-3.5 shrink-0" /> No onward address — can't print a slip yet.
                    </p>
                  )}
                  {renderMemberTracking(m)}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  })() : null;

  // ── Organiser-open control blocks (composed differently per view) ──
  // Split mode
  const orgSplitBlock = (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Shipping split</label>
      <div className="grid grid-cols-2 gap-2">
        {(["even", "by_size"] as WholesaleSplitMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => changeSplit(mode)}
            disabled={busy === "split"}
            className="h-10 rounded-lg text-sm font-semibold border transition-all"
            style={share.splitMode === mode
              ? { background: "var(--t-blue-08)", borderColor: "var(--t-blue-25)", color: "var(--t-blue)" }
              : { background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-muted)" }}
          >
            {mode === "even" ? "Split evenly" : "By order size"}
          </button>
        ))}
      </div>
    </div>
  );

  // Delivery member — organiser picks who receives the parcel; the chosen recipient
  // then confirms or edits the address.
  const deliveryPickerBlock = (
    <div className="space-y-3 pt-1">
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Deliver the whole parcel to</label>
        <select value={delUser} onChange={e => setDelUser(e.target.value)} className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field}>
          <option value="">Select a member…</option>
          {share.members.map(m => (
            <option key={m.username} value={m.username}>
              @{m.username.replace(/^@/, "")}{m.isCreator ? " (you)" : ""}{m.hasDeliveryAddress ? "" : " — no saved address"}
            </option>
          ))}
        </select>
        <p className="text-xs mt-1.5" style={{ color: "var(--t-muted)" }}>
          Pick any member to receive the parcel. They can use their saved account address or enter a different one just for this order.
        </p>
      </div>
      <button onClick={saveDelivery} disabled={busy === "delivery" || !delUser} className="inline-flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-bold disabled:opacity-50" style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}>
        {busy === "delivery" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
        Set delivery member
      </button>
      {share.delivery.username && share.delivery.address && (
        <div className="rounded-lg p-3 text-sm" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
          <p className="text-xs font-semibold mb-1" style={{ color: "var(--t-muted)" }}>Shipping to @{share.delivery.username.replace(/^@/, "")}</p>
          <p className="whitespace-pre-line" style={{ color: "var(--t-text)" }}>{share.delivery.address}</p>
          {share.delivery.country && <p style={{ color: "var(--t-text)" }}>{share.delivery.country}</p>}
          {share.delivery.phone && <p style={{ color: "var(--t-muted)" }}>{share.delivery.phone}</p>}
        </div>
      )}
      {share.delivery.username && !share.delivery.address && (
        <div className="rounded-lg p-3 text-xs flex items-start gap-2" style={{ background: "rgba(234,179,8,0.10)", border: "1px solid rgba(234,179,8,0.25)", color: "var(--t-text)" }}>
          <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#eab308" }} />
          <span>Waiting for @{share.delivery.username.replace(/^@/, "")} to add a delivery address{share.delivery.canEditAddress ? " — that's you, add it now" : ""}.</span>
        </div>
      )}
      {share.delivery.canEditAddress && (
        <button
          onClick={() => setAddressModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-bold"
          style={{ background: "var(--t-blue-08)", color: "var(--t-blue)", border: "1px solid var(--t-blue-25)" }}
        >
          <MapPin className="w-4 h-4" /> {share.delivery.address ? "Edit delivery address" : "Add delivery address"}
        </button>
      )}
    </div>
  );

  // Optional organiser fee — custom per-member charge paid directly to the organiser.
  const organiserFeeBlock = (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold" style={{ color: "var(--t-muted)" }}>Organiser fee (optional)</label>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>
          Charge each member a custom organiser fee, paid directly to you. It's settled separately between members — never added to anyone's order total. The recipient is exempt.
        </p>
      </div>

      <div>
        <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--t-muted)" }}>How to pay the organiser fee (to you)</label>
        <input
          value={orgPayInfo}
          onChange={e => { setFeesDirty(true); setOrgPayInfo(e.target.value); }}
          placeholder="e.g. PayPal me@example.com / Revolut @me"
          maxLength={500}
          className="w-full h-10 px-3 rounded-lg border text-sm outline-none"
          style={field}
        />
      </div>

      <div className="rounded-lg divide-y" style={{ border: "1px solid var(--t-border)", borderColor: "var(--t-border)" }}>
        <div className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--t-muted)" }}>
          <span>Member</span>
          <span className="w-24 text-center">Organiser fee</span>
        </div>
        {share.members.map(m => {
          const isRecipient = !!share.delivery.username && m.username.toLowerCase() === share.delivery.username.toLowerCase();
          return (
            <div key={m.username} className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 items-center">
              <span className="text-sm truncate" style={{ color: "var(--t-text)" }}>
                @{m.username.replace(/^@/, "")}{isRecipient && <span className="text-[10px] ml-1" style={{ color: "#15803d" }}>recipient</span>}
              </span>
              {isRecipient ? (
                <span className="w-24 text-center text-xs" style={{ color: "var(--t-muted)" }}>—</span>
              ) : (
                <div className="w-24 flex items-center gap-1">
                  <span className="text-xs" style={{ color: "var(--t-muted)" }}>$</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={feeAmounts[m.username] ?? ""}
                    onChange={e => setFeeAmount(m.username, e.target.value)}
                    placeholder="0"
                    className="w-full h-8 px-2 text-center rounded-lg border text-sm bg-transparent outline-none"
                    style={field}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={saveFees}
        disabled={busy === "fees" || !feesDirty}
        className="inline-flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-bold disabled:opacity-50"
        style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}
      >
        {busy === "fees" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Save organiser fee
      </button>
    </div>
  );

  // Organiser shipping & delivery card (split + recipient picker), shown under the
  // Shipping & Delivery section.
  const shippingDeliveryCard = (share.isCreator && isOpen) ? (
    <div className="rounded-xl p-4 space-y-4" style={card}>
      {orgSplitBlock}
      {deliveryPickerBlock}
    </div>
  ) : null;

  // Order limits & rules — its own section.
  const isPublic = share.publicGroup?.isPublic === true;
  const canManagePublic = share.publicGroup?.canManage === true;
  const limitsConfigured = !!(share.isCreator && share.settings && (
    share.settings.maxMembers != null ||
    share.settings.minKitsPerMember != null ||
    share.settings.maxKitsPerMember != null ||
    share.settings.maxTotalKits != null ||
    share.settings.maxPackages != null ||
    share.settings.organiserFlatFee != null ||
    share.settings.lockDeadline != null ||
    (share.settings.allowedCountries?.length ?? 0) > 0 ||
    isPublic
  ));
  const limitsSummary = limitsConfigured
    ? ([
        isPublic ? "Public" : null,
        share.settings?.maxMembers != null ? `${share.settings.maxMembers} max` : null,
        share.settings?.organiserFlatFee != null ? `$${share.settings.organiserFlatFee} fee` : null,
      ].filter(Boolean).join(" · ") || "Set")
    : "Optional";
  const sectionOrderLimits = (share.isCreator && isOpen) ? (
    <ExpandableCard
      key={limitsConfigured ? "limits-set" : "limits-empty"}
      title="Order Limits & Rules"
      icon={<SlidersHorizontal className="w-4 h-4" style={{ color: "var(--t-blue)" }} />}
      summary={limitsSummary}
      defaultOpen={!limitsConfigured}
    >
      <div className="space-y-4">
          <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
            Optional limits for this shared order. Leave a field blank for no limit.
          </p>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Max people</label>
            <input type="number" min="2" step="1" value={settingsForm.maxMembers}
              onChange={e => { setSettingsDirty(true); setSettingsForm(f => ({ ...f, maxMembers: e.target.value })); }}
              placeholder="No limit" className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} />
            <p className="text-[11px] mt-1" style={{ color: "var(--t-muted)" }}>
              The most members allowed in this order (you count as one). Leave blank for no limit.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Min kits / person</label>
              <input type="number" min="0" step="1" value={settingsForm.minKitsPerMember}
                onChange={e => { setSettingsDirty(true); setSettingsForm(f => ({ ...f, minKitsPerMember: e.target.value })); }}
                placeholder="No min" className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Max kits / person</label>
              <input type="number" min="0" step="1" value={settingsForm.maxKitsPerMember}
                onChange={e => { setSettingsDirty(true); setSettingsForm(f => ({ ...f, maxKitsPerMember: e.target.value })); }}
                placeholder="No max" className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Max kits total (whole order)</label>
            <input type="number" min="0" step="1" value={settingsForm.maxTotalKits}
              onChange={e => { setSettingsDirty(true); setSettingsForm(f => ({ ...f, maxTotalKits: e.target.value })); }}
              placeholder="No limit" className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Max packages</label>
              <input type="number" min="1" step="1" value={settingsForm.maxPackages}
                onChange={e => { setSettingsDirty(true); setSettingsForm(f => ({ ...f, maxPackages: e.target.value })); }}
                placeholder="No limit" className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Organiser fee ($/person)</label>
              <input type="number" min="0" step="0.01" value={settingsForm.organiserFlatFee}
                onChange={e => { setSettingsDirty(true); setSettingsForm(f => ({ ...f, organiserFlatFee: e.target.value })); }}
                placeholder="None" className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} />
            </div>
          </div>
          <p className="text-[11px] -mt-2" style={{ color: "var(--t-muted)" }}>
            Max packages and the flat organiser fee apply when this order is public. The fee is charged to each person who joins (paid to you directly) — leave it blank for none.
          </p>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Auto-lock deadline</label>
            <input type="datetime-local" value={settingsForm.lockDeadline}
              onChange={e => { setSettingsDirty(true); setSettingsForm(f => ({ ...f, lockDeadline: e.target.value })); }}
              className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} />
            <p className="text-[11px] mt-1" style={{ color: "var(--t-muted)" }}>
              When this time passes, the order locks itself automatically — as soon as it's ready (enough members, delivery set, etc.). Leave blank for no deadline.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Limit shipping to countries</label>
            <p className="text-[11px] mb-1.5" style={{ color: "var(--t-muted)" }}>
              If set, the parcel can only be delivered to one of these countries. Leave empty to allow anywhere the vendor ships. For public orders, the first country is shown on the card.
            </p>
            <div className="flex gap-2">
              <select value={countryToAdd} onChange={e => setCountryToAdd(e.target.value)} className="flex-1 h-10 px-3 rounded-lg border text-sm outline-none" style={field}>
                <option value="">Add a country…</option>
                {COUNTRIES.filter(c => !allowedCountriesList.includes(c)).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button
                onClick={() => { if (!countryToAdd) return; setSettingsDirty(true); setAllowedCountriesList(list => list.includes(countryToAdd) ? list : [...list, countryToAdd]); setCountryToAdd(""); }}
                disabled={!countryToAdd}
                className="px-4 h-10 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}
              >
                Add
              </button>
            </div>
            {allowedCountriesList.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {allowedCountriesList.map(c => (
                  <span key={c} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs" style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}>
                    {c}
                    <button onClick={() => { setSettingsDirty(true); setAllowedCountriesList(list => list.filter(x => x !== c)); }} aria-label={`Remove ${c}`}>
                      <X className="w-3 h-3" style={{ color: "var(--t-muted)" }} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          {canManagePublic && (
            <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0">
                <Globe className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--t-blue)" }} />
                <div className="space-y-0.5">
                  <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>
                    {isPublic ? "This order is public" : "List this order publicly"}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
                    {isPublic
                      ? "It's shown as a card on the shared orders page — anyone in wholesale can join. Publishing is instant."
                      : "Show it as a card on the shared orders page so anyone in wholesale can find and join. No approval needed — it goes live instantly."}
                  </p>
                  <p className="text-[11px] font-semibold" style={{ color: "var(--t-text)" }}>
                    Members will pay the admin for public orders.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isPublic}
                aria-label={isPublic ? "Make this order private" : "Make this order public"}
                onClick={() => savePublic(!isPublic)}
                disabled={busy === "publish" || (!isPublic && allowedCountriesList.length === 0)}
                className="relative shrink-0 inline-flex items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-0.5"
                style={{
                  width: 44, height: 24,
                  background: isPublic ? "var(--t-blue)" : "var(--t-surface2)",
                  border: "1px solid var(--t-border)",
                }}
              >
                <span
                  className="inline-flex items-center justify-center rounded-full transition-transform"
                  style={{
                    width: 18, height: 18,
                    background: "#fff",
                    transform: isPublic ? "translateX(22px)" : "translateX(2px)",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
                  }}
                >
                  {busy === "publish" && <Loader2 className="w-3 h-3 animate-spin" style={{ color: "var(--t-blue)" }} />}
                </span>
              </button>
            </div>

            <div className="flex items-start gap-2 rounded-lg px-3 py-2" style={{ background: "var(--t-amber-08, rgba(245,158,11,0.08))", border: "1px solid var(--t-border)" }}>
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
              <p className="text-[11px] leading-snug" style={{ color: "var(--t-muted)" }}>
                Only share orders with people you trust — members will pay you directly for their share and any organiser fee.
              </p>
            </div>

            <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
              The public card uses the limits set in "Order Limits &amp; Rules" above (max people, max kits, max packages and the organiser fee); the first allowed country is shown.
            </p>

            {allowedCountriesList.length === 0 && (
              <p className="text-[11px]" style={{ color: "#f59e0b" }}>
                Add at least one allowed country above before you can turn this order public.
              </p>
            )}
            </div>
          )}
          <button
            onClick={saveSettings}
            disabled={busy === "settings" || !settingsDirty}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}
          >
            {busy === "settings" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save limits &amp; rules
          </button>
        </div>
    </ExpandableCard>
  ) : null;

  // Organiser fee — its own section.
  const sectionOrganiserFee = (share.isCreator && isOpen) ? (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Organiser Fee</p>
      <div className="rounded-xl p-4" style={card}>
        {organiserFeeBlock}
      </div>
    </section>
  ) : null;

  // Shipping & Delivery section: organiser split + recipient picker under one header.
  const sectionShippingDelivery = shippingDeliveryCard ? (
    <section id={GUIDE_ANCHORS.manage} style={flashStyle(GUIDE_ANCHORS.manage)} className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Shipping &amp; Delivery</p>
      {shippingDeliveryCard}
    </section>
  ) : null;

  // Locked: organiser can still unlock / cancel if a member never pays.
  const sectionOrganiserLocked = showOrganiserLocked ? (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Organiser Controls</p>
      <div className="rounded-xl p-4 space-y-3" style={card}>
        <p className="text-sm" style={{ color: "var(--t-text)" }}>
          Waiting for everyone to pay. The combined order is submitted to the vendor automatically once all members have paid.
        </p>
        <button
          onClick={doUnlock}
          disabled={busy === "unlock"}
          className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold disabled:opacity-50"
          style={{ background: "var(--t-blue-08)", color: "var(--t-blue)", border: "1px solid var(--t-blue)" }}
        >
          {busy === "unlock" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
          Unlock to make changes
        </button>
        <p className="text-xs" style={{ color: "var(--t-muted)" }}>
          Reopens the order so members can edit items and delivery again. Each member's order is removed until you lock again. Not available once a member has started paying.
        </p>
        <button
          onClick={doCancel}
          disabled={busy === "cancel"}
          className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold disabled:opacity-50"
          style={{ background: "rgba(239,68,68,0.10)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.25)" }}
        >
          {busy === "cancel" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Cancel shared order
        </button>
        <p className="text-xs" style={{ color: "var(--t-muted)" }}>
          Use this if a member never pays. Every member's order is cancelled; anyone who already paid will need a manual refund.
        </p>
      </div>
    </section>
  ) : null;

  // Organiser fees — confirm each member's peer-to-peer fee as paid.
  const sectionFeeRoster = showFeeRoster ? (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Organiser Fees — Mark Paid</p>
      <div className="rounded-xl divide-y" style={{ border: "1px solid var(--t-border)", borderColor: "var(--t-border)" }}>
        {share.members.filter(m => m.organiserFee > 0).map(m => (
          <div key={m.username} className="px-3 py-2.5 space-y-1.5">
            <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>
              @{m.username.replace(/^@/, "")}{m.isYou && <span className="text-[10px] ml-1" style={{ color: "var(--t-muted)" }}>(you)</span>}
            </p>
            <FeeLine
              label="Organiser fee"
              amount={money(m.organiserFee)}
              paid={m.organiserFeePaid}
              canConfirm={share.fees?.canConfirmOrganiserFees ?? false}
              busy={busy === `feepaid:organiser:${m.username}`}
              onToggle={() => toggleFeePaid(m.username, "organiser", !m.organiserFeePaid)}
            />
          </div>
        ))}
      </div>
    </section>
  ) : null;

  // Recipient address prompt: a compact card whose button opens the modal. Shown
  // to whoever is receiving the parcel but isn't looking at the organiser picker.
  // (Only the chosen recipient can set this one-off delivery address.)
  const sectionRecipientAddressPrompt = (share.delivery.canEditAddress && !(share.isCreator && isOpen)) ? (
    <section id={GUIDE_ANCHORS.address} style={flashStyle(GUIDE_ANCHORS.address)} className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Your Delivery Address</p>
      <div className="rounded-xl p-4 space-y-3" style={card}>
        <p className="text-xs" style={{ color: "var(--t-muted)" }}>
          You're receiving this parcel. {share.delivery.address ? "Review or update where it should go." : "Add where it should go — used for this order only, it won't change your account."}
        </p>
        {share.delivery.address && (
          <div className="rounded-lg p-3 text-sm" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
            <p className="whitespace-pre-line" style={{ color: "var(--t-text)" }}>{share.delivery.address}</p>
            {share.delivery.country && <p style={{ color: "var(--t-text)" }}>{share.delivery.country}</p>}
            {share.delivery.phone && <p style={{ color: "var(--t-muted)" }}>{share.delivery.phone}</p>}
          </div>
        )}
        <button
          onClick={() => setAddressModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 h-11 rounded-xl text-sm font-bold text-white"
          style={{ background: "var(--t-blue)" }}
        >
          <MapPin className="w-4 h-4" /> {share.delivery.address ? "Edit delivery address" : "Add delivery address"}
        </button>
      </div>
    </section>
  ) : null;

  // My onward address — any participant (except the parcel recipient) can add where
  // they want their items forwarded to. Private: only the recipient and they see it.
  const myOnwardEditable = !!myMember?.canEditOnward;
  const myOnward = myMember?.onward ?? null;
  const sectionMyOnwardAddress = myOnwardEditable ? (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Your Onward Delivery Address</p>
      <div className="rounded-xl p-4 space-y-3" style={card}>
        <p className="text-xs" style={{ color: "var(--t-muted)" }}>
          Where should the parcel recipient forward your items once the order arrives?{" "}
          {share.delivery.username
            ? <>Only @{share.delivery.username.replace(/^@/, "")} (the recipient) can see this — not the organiser or other members.</>
            : <>Only the chosen parcel recipient can see this — not the organiser or other members.</>}
        </p>
        {myOnward?.address ? (
          <div className="rounded-lg p-3 text-sm" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
            {myOnward.name && <p className="font-semibold" style={{ color: "var(--t-text)" }}>{myOnward.name}</p>}
            <p className="whitespace-pre-line" style={{ color: "var(--t-text)" }}>{myOnward.address}</p>
            {myOnward.country && <p style={{ color: "var(--t-text)" }}>{myOnward.country}</p>}
            {myOnward.phone && <p style={{ color: "var(--t-muted)" }}>{myOnward.phone}</p>}
          </div>
        ) : (
          <div className="rounded-lg p-3 text-xs flex items-start gap-2" style={{ background: "rgba(234,179,8,0.10)", border: "1px solid rgba(234,179,8,0.25)", color: "var(--t-text)" }}>
            <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#eab308" }} />
            <span>You haven't added an onward address yet — the recipient won't know where to forward your items.</span>
          </div>
        )}
        <button
          onClick={() => setOnwardModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 h-11 rounded-xl text-sm font-bold text-white"
          style={{ background: "var(--t-blue)" }}
        >
          <MapPin className="w-4 h-4" /> {myOnward?.address ? "Edit onward address" : "Add onward address"}
        </button>
      </div>
    </section>
  ) : null;

  // Shipping updates — visible to a participant (not the recipient) once the recipient
  // has forwarded their parcel and recorded a tracking number. Status + events are
  // masked: the participant never sees the raw tracking number or precise locations.
  const sectionMyTracking = (myMember && !myMember.isRecipient && myMember.onwardTracking?.hasTracking) ? (() => {
    const t = myMember.onwardTracking!;
    const meta = trackStatusMeta(t.status);
    const events = t.events ?? [];
    return (
      <section className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Shipping Updates</p>
        <div className="rounded-xl p-4 space-y-3" style={card}>
          <div className="flex items-center gap-2.5">
            <Truck className="w-5 h-5 shrink-0" style={{ color: meta.color }} />
            <div className="min-w-0">
              <p className="text-sm font-bold" style={{ color: meta.color }}>{meta.label}</p>
              <p className="text-xs" style={{ color: "var(--t-muted)" }}>
                Your forwarded parcel{t.lastChecked ? <> · updated {formatTrackDate(t.lastChecked)}</> : null}
              </p>
            </div>
          </div>
          {events.length > 0 ? (
            <div className="space-y-0">
              {events.map((ev, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: i === 0 ? meta.color : "var(--t-border)" }} />
                    {i < events.length - 1 && <div className="w-px flex-1" style={{ background: "var(--t-border)" }} />}
                  </div>
                  <div className="pb-3 min-w-0">
                    <p className="text-sm" style={{ color: "var(--t-text)" }}>{trackStatusMeta(ev.status).label}</p>
                    <p className="text-xs" style={{ color: "var(--t-muted)" }}>
                      {ev.location ? <>{ev.location} · </> : null}{formatTrackDate(ev.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs flex items-start gap-2 rounded-lg p-3" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>
              <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" /> No detailed updates yet — check back soon.
            </p>
          )}
          <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
            For privacy, the tracking number and exact addresses are hidden.
          </p>
        </div>
      </section>
    );
  })() : null;

  // Onward roster — visible ONLY to the parcel recipient. Lists each other member's
  // onward address so the recipient can forward their items after the parcel lands.
  const sectionOnwardRoster = myMember?.isRecipient ? (() => {
    const others = share.members.filter(m => !m.isRecipient);
    return (
      <section className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Forwarding Addresses</p>
        <div className="rounded-xl p-4 space-y-3" style={card}>
          <p className="text-xs" style={{ color: "var(--t-muted)" }}>
            You're receiving this parcel. Each member's onward address is shown below so you can forward their items. Only you can see these.
          </p>
          {others.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--t-muted)" }}>No other members yet.</p>
          ) : (
            <div className="space-y-2">
              {others.map(m => (
                <div key={m.username} className="rounded-lg p-3 text-sm" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--t-muted)" }}>@{m.username.replace(/^@/, "")}</p>
                  {m.onward?.address ? (
                    <>
                      {m.onward.name && <p className="font-semibold" style={{ color: "var(--t-text)" }}>{m.onward.name}</p>}
                      <p className="whitespace-pre-line" style={{ color: "var(--t-text)" }}>{m.onward.address}</p>
                      {m.onward.country && <p style={{ color: "var(--t-text)" }}>{m.onward.country}</p>}
                      {m.onward.phone && <p style={{ color: "var(--t-muted)" }}>{m.onward.phone}</p>}
                    </>
                  ) : (
                    <p className="text-xs flex items-center gap-1.5" style={{ color: "#b45309" }}>
                      <Clock className="w-3.5 h-3.5 shrink-0" /> No onward address added yet.
                    </p>
                  )}
                  {renderMemberTracking(m)}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  })() : null;

  // Onward-address popup — a manual address form shown as a centred modal.
  const onwardModal = (
    <AnimatePresence>
      {onwardModalOpen && myOnwardEditable && (
        <>
          <motion.div
            key="onward-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOnwardModalOpen(false)}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            key="onward-modal"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            className="fixed z-[61] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md max-h-[88vh] overflow-y-auto rounded-2xl p-5 space-y-3 shadow-2xl"
            style={card}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Your onward address</p>
              <button onClick={() => setOnwardModalOpen(false)} aria-label="Close">
                <X className="w-5 h-5" style={{ color: "var(--t-muted)" }} />
              </button>
            </div>
            <p className="text-xs" style={{ color: "var(--t-muted)" }}>
              Where the parcel recipient should forward your items. Only the recipient (and you) can see this — it won't change your account.
            </p>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Recipient name</label>
              <input value={onwardAddr.name} onChange={e => setOnwardAddr(a => ({ ...a, name: e.target.value }))} placeholder="Full name" className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Address line 1</label>
              <input value={onwardAddr.line1} onChange={e => setOnwardAddr(a => ({ ...a, line1: e.target.value }))} placeholder="Street address" className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Address line 2 (optional)</label>
              <input value={onwardAddr.line2} onChange={e => setOnwardAddr(a => ({ ...a, line2: e.target.value }))} placeholder="Apartment, suite, etc." className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>City</label>
                <input value={onwardAddr.city} onChange={e => setOnwardAddr(a => ({ ...a, city: e.target.value }))} className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Postcode</label>
                <input value={onwardAddr.postcode} onChange={e => setOnwardAddr(a => ({ ...a, postcode: e.target.value }))} className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Country</label>
              <select value={onwardAddr.country} onChange={e => setOnwardAddr(a => ({ ...a, country: e.target.value }))} className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field}>
                <option value="">Select country…</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Phone</label>
              <input value={onwardAddr.phone} onChange={e => setOnwardAddr(a => ({ ...a, phone: e.target.value }))} placeholder="For delivery updates" className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} />
            </div>
            <button
              onClick={saveOnwardAddress}
              disabled={busy === "onward-address" || !onwardAddr.name.trim() || !onwardAddr.line1.trim() || !onwardAddr.country || !onwardAddr.phone.trim()}
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "var(--t-blue)" }}
            >
              {busy === "onward-address" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save onward address
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Delivery-address popup — the full address form shown as a centred modal.
  const addressModal = (
    <AnimatePresence>
      {addressModalOpen && share.delivery.canEditAddress && (
        <>
          <motion.div
            key="addr-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAddressModalOpen(false)}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            key="addr-modal"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            className="fixed z-[61] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md max-h-[88vh] overflow-y-auto rounded-2xl p-5 space-y-3 shadow-2xl"
            style={card}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Your delivery address</p>
              <button onClick={() => setAddressModalOpen(false)} aria-label="Close">
                <X className="w-5 h-5" style={{ color: "var(--t-muted)" }} />
              </button>
            </div>
        <p className="text-xs" style={{ color: "var(--t-muted)" }}>
          You're receiving this parcel. Confirm or edit where it should go — this address is used for this order only and won't change your account.
        </p>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Recipient name</label>
          <input value={addr.name} onChange={e => setAddr(a => ({ ...a, name: e.target.value }))} placeholder="Full name" className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} />
        </div>
        <div className="relative">
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Find your address</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--t-muted)" }} />
            <input
              value={addrQuery}
              onChange={e => runAddrSearch(e.target.value)}
              onFocus={() => { if (addrResults.length) setShowAddrResults(true); }}
              onBlur={() => { addrBlurTimer.current = setTimeout(() => setShowAddrResults(false), 150); }}
              onKeyDown={onAddrKeyDown}
              placeholder="Start typing your address or postcode"
              autoComplete="off"
              role="combobox"
              aria-expanded={addrDropdownOpen}
              aria-controls="addr-suggestions"
              aria-autocomplete="list"
              aria-activedescendant={addrActiveIdx >= 0 ? `addr-opt-${addrActiveIdx}` : undefined}
              className="w-full h-10 pl-9 pr-9 rounded-lg border text-sm outline-none"
              style={field}
            />
            {addrSearching && <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: "var(--t-muted)" }} />}
            {addrDropdownOpen && (
              <div id="addr-suggestions" role="listbox" className="absolute z-20 left-0 right-0 mt-1 rounded-lg border overflow-hidden shadow-lg" style={{ background: "var(--t-card, #fff)", borderColor: "var(--t-border)" }}>
                {addrResults.length > 0 ? addrResults.map((s, i) => (
                  <div
                    key={i}
                    id={`addr-opt-${i}`}
                    role="option"
                    aria-selected={i === addrActiveIdx}
                    onMouseDown={e => { e.preventDefault(); pickAddress(s); }}
                    onMouseEnter={() => setAddrActiveIdx(i)}
                    className="px-3 py-2 text-sm cursor-pointer"
                    style={{ color: "var(--t-text)", background: i === addrActiveIdx ? "var(--t-hover, rgba(0,0,0,0.06))" : "transparent", borderBottom: i < addrResults.length - 1 ? "1px solid var(--t-border)" : "none" }}
                  >
                    {s.label}
                  </div>
                )) : (
                  <div className="px-3 py-2 text-sm" style={{ color: "var(--t-muted)" }}>
                    No matches — keep typing or fill the fields in manually.
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="text-xs mt-1.5" style={{ color: "var(--t-muted)" }}>Pick your address to auto-fill the fields below, or enter them manually.</p>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Address line 1</label>
          <input value={addr.line1} onChange={e => setAddr(a => ({ ...a, line1: e.target.value }))} placeholder="Street address" className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Address line 2 (optional)</label>
          <input value={addr.line2} onChange={e => setAddr(a => ({ ...a, line2: e.target.value }))} placeholder="Apartment, suite, etc." className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>City</label>
            <input value={addr.city} onChange={e => setAddr(a => ({ ...a, city: e.target.value }))} className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Postcode</label>
            <input value={addr.postcode} onChange={e => setAddr(a => ({ ...a, postcode: e.target.value }))} className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Country</label>
          <select value={addr.country} onChange={e => setAddr(a => ({ ...a, country: e.target.value }))} className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field}>
            <option value="">Select country…</option>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <p className="text-xs mt-1.5" style={{ color: "var(--t-muted)" }}>
            The vendor must ship to this country, or the order can't be priced or locked.
          </p>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Phone</label>
          <input value={addr.phone} onChange={e => setAddr(a => ({ ...a, phone: e.target.value }))} placeholder="For delivery updates" className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} />
        </div>
        <button
          onClick={saveDeliveryAddress}
          disabled={busy === "delivery-address" || !addr.name.trim() || !addr.line1.trim() || !addr.country || !addr.phone.trim()}
          className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "var(--t-blue)" }}
        >
          {busy === "delivery-address" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save delivery address
        </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  const sectionChat = share.isMember ? (
    <ShareChat shareId={share.id} readOnly={share.status === "cancelled"} />
  ) : null;

  // ── Guided wizard step bodies ──
  const inviteStepBody = (
    <div className="space-y-4">
      <div className="rounded-xl p-4 space-y-3" style={card}>
        <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Share to invite members</p>
        <p className="text-xs" style={{ color: "var(--t-muted)" }}>
          Send your code or invite link. You need at least 2 people — {share.maxMembers != null ? `${share.memberCount} of ${share.maxMembers}` : share.memberCount} have joined so far.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => copy(share.id, "code")}
            className="inline-flex items-center gap-2 px-3 h-10 rounded-xl font-mono font-bold text-lg tracking-widest"
            style={{ background: "var(--t-blue-08)", color: "var(--t-blue)" }}
            title="Copy share code"
          >
            {share.id}
            {copied === "code" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={() => copy(shareLink, "link")}
            className="inline-flex items-center gap-1.5 px-3 h-10 rounded-xl text-sm font-semibold"
            style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}
          >
            {copied === "link" ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {copied === "link" ? "Link copied" : "Copy invite link"}
          </button>
        </div>
      </div>
      {groupTrackerCard}
    </div>
  );


  // Progressive setup gate (presentation only) — shown while a brand-new order is
  // being built. Sections complete in order: the active step is open, completed ones
  // collapse to a "Done" summary, and later steps stay locked until their turn.
  const setupGateView = (
    <div className="space-y-4">
      <div className="px-1">
        <h2 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>Set up your order</h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--t-muted)" }}>
          Finish each step and your full order opens.
        </p>
      </div>

      {setupSteps.map((sid, i) => {
        const done = setupStepDone(sid);
        const active = sid === activeSetupStep;
        const title = sid === "items" ? "Add your items" : "Shipping split & organiser fee";
        const badgeStyle = done
          ? { background: "rgba(34,197,94,0.15)", color: "#15803d" }
          : active
            ? { background: "var(--t-blue)", color: "#fff" }
            : { background: "var(--t-surface2)", color: "var(--t-muted)" };
        return (
          <section key={sid} className="rounded-2xl overflow-hidden" style={card}>
            <div className="flex items-center gap-3 px-4 py-3.5" style={active ? undefined : { opacity: done ? 1 : 0.6 }}>
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={badgeStyle}>
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{title}</p>
                {!active && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--t-muted)" }}>
                    {done ? "Done" : "Unlocks after the step above"}
                  </p>
                )}
              </div>
            </div>
            {active && (
              <div className="px-4 pb-4 pt-1 space-y-4 border-t" style={{ borderColor: "var(--t-border)" }}>
                {sid === "items" ? sectionMyItems : (
                  <>
                    {orgSplitBlock}
                    {organiserFeeBlock}
                    <button
                      onClick={dismissSetup}
                      className="w-full h-11 rounded-xl text-sm font-bold"
                      style={{ background: "var(--t-blue)", color: "#fff" }}
                    >
                      Open full order
                    </button>
                  </>
                )}
              </div>
            )}
          </section>
        );
      })}

      {groupTrackerCard}

      {leaveButton && (
        <div className="flex justify-center pt-1">
          {leaveButton}
        </div>
      )}
    </div>
  );

  const fullView = (
    <>
      {!organiserDone && !myPaid && sectionHowItWorks}
      {sectionOrderLimits}
      {sectionGroup}
      {sectionMyItems}
      {organiserDone ? sectionOrgOrder : sectionMyItemsReadOnly}
      {!organiserDone && sectionWhatYouOwe}
      {sectionShippingDelivery}
      {sectionOrganiserFee}
      {sectionOrganiserLocked}
      {sectionFeeRoster}
      {sectionRecipientAddressPrompt}
      {sectionMyOnwardAddress}
      {sectionMyTracking}
      {canDispatch ? sectionDispatch : sectionOnwardRoster}
      {sectionChat}
      {addressModal}
      {onwardModal}
      {dispatchPrintOpen && canDispatch && (
        <ForwardSlipsModal
          slips={forwardSlips}
          shareId={share.id}
          organiserUsername={share.creatorUsername}
          onClose={() => setDispatchPrintOpen(false)}
        />
      )}
    </>
  );

  return (
    <PageLayout>
      <div style={{ background: "var(--t-bg)", minHeight: "100%" }}>
        <main className="px-4 py-5 pb-36 max-w-3xl mx-auto w-full space-y-5">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            <button onClick={() => setLocation("/wholesale/shared")} className="flex items-center gap-1.5 text-sm" style={{ color: "var(--t-muted)" }}>
              <ArrowLeft className="w-4 h-4" /> Back to shared orders
            </button>

            {sectionHeader}

            {sectionStatusBanners}

            {actionError && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)", color: "#b91c1c" }}>
                {actionError}
              </div>
            )}

            {setupGateActive ? setupGateView : fullView}

            <InvitePrompt
              open={invitePromptOpen}
              onClose={() => setInvitePromptOpen(false)}
              shareLink={shareLink}
              onCopy={() => copy(shareLink, "link")}
              copied={copied === "link"}
              memberCount={share.memberCount}
              maxMembers={share.maxMembers}
            />

          </motion.div>
        </main>
      </div>
    </PageLayout>
  );
}

interface ForwardSlip {
  id: string;
  username: string;
  name: string | null;
  lineItems: { productName: string; quantity: number }[];
  address: string | null;
  country: string | null;
  phone: string | null;
}

// Printable forwarding/dispatch slips for the shared-order organiser. One slip per
// member whose items must be forwarded on. Mirrors the admin packing-slip print
// (A4 landscape grid + 4×6 labels) but uses each member's onward address and stamps
// the shared group organiser's account name into the footer.
function ForwardSlipsModal({
  slips, shareId, organiserUsername, onClose,
}: { slips: ForwardSlip[]; shareId: string; organiserUsername: string; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);
  const [format, setFormat] = useState<"a4" | "4x6">("a4");
  const org = organiserUsername.replace(/^@/, "");
  const footer = `Salt & Peps · Shared order ${shareId} · Organiser @${org}`;

  const handlePrint = () => {
    const content = printRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank", "width=1200,height=800");
    if (!win) return;

    const a4Styles = `
    @page { size: A4 landscape; margin: 10mm; }
    .slip-grid { display: flex; flex-wrap: wrap; gap: 4mm; }
    .slip { width: calc(33.333% - 2.67mm); border: 1.5px solid #1a1a1a; border-radius: 4px; padding: 4mm 5mm; break-inside: avoid; page-break-inside: avoid; display: flex; flex-direction: column; gap: 2mm; background: #fff; }
    .order-no { font-size: 11pt; font-weight: 700; color: #111; border-bottom: 1px solid #e5e7eb; padding-bottom: 1.5mm; }
    .order-username { font-size: 7.5pt; color: #6b7280; margin-top: 0.5mm; }
    .items { flex: 1; }
    .item-row { font-size: 8.5pt; color: #222; line-height: 1.5; }
    .item-qty { font-weight: 700; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 1mm 0; }
    .total-kits { font-size: 9pt; font-weight: 700; color: #111; }
    .address { font-size: 8pt; color: #374151; line-height: 1.45; }
    .address strong { font-weight: 600; }
    .slip-footer { margin-top: 2mm; padding-top: 1.5mm; border-top: 1px solid #d1d5db; font-size: 6.5pt; color: #9ca3af; text-align: center; }`;

    const label4x6Styles = `
    @page { size: 100mm 150mm; margin: 0; }
    .slip-grid { display: block; }
    .slip { width: 100mm; height: 150mm; padding: 6mm 7mm; display: flex; flex-direction: column; gap: 0; background: #fff; page-break-after: always; break-after: page; overflow: hidden; box-sizing: border-box; }
    .slip:last-child { page-break-after: avoid; break-after: avoid; }
    .label-header { border-bottom: 2px solid #111; padding-bottom: 3mm; margin-bottom: 3mm; }
    .order-no { font-size: 15pt; font-weight: 800; color: #111; line-height: 1.1; }
    .order-username { font-size: 9pt; color: #6b7280; margin-top: 1mm; }
    .items { flex: 1; margin-bottom: 3mm; }
    .item-row { font-size: 10pt; color: #111; line-height: 1.7; }
    .item-qty { font-weight: 800; }
    .divider { border: none; border-top: 1.5px solid #d1d5db; margin: 2.5mm 0; }
    .total-kits { font-size: 11pt; font-weight: 800; color: #111; margin-bottom: 2mm; }
    .address { font-size: 9pt; color: #374151; line-height: 1.5; margin-top: auto; padding-top: 2mm; border-top: 1px solid #e5e7eb; }
    .address strong { font-weight: 700; font-size: 10pt; }
    .slip-footer { margin-top: auto; padding-top: 2.5mm; border-top: 1.5px solid #111; font-size: 7.5pt; color: #9ca3af; text-align: center; }`;

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Dispatch Slips</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; }
    ${format === "4x6" ? label4x6Styles : a4Styles}
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  ${content}
  <script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Dispatch Slips — {slips.length} parcel{slips.length !== 1 ? "s" : ""}</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border overflow-hidden text-xs font-semibold">
              <button
                onClick={() => setFormat("a4")}
                className="px-3 py-1.5 transition-colors"
                style={{ background: format === "a4" ? "var(--primary)" : "transparent", color: format === "a4" ? "var(--primary-foreground)" : "var(--muted-foreground)" }}
              >
                A4 Landscape
              </button>
              <button
                onClick={() => setFormat("4x6")}
                className="px-3 py-1.5 transition-colors"
                style={{ background: format === "4x6" ? "var(--primary)" : "transparent", color: format === "4x6" ? "var(--primary-foreground)" : "var(--muted-foreground)" }}
              >
                4×6 Labels
              </button>
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {format === "4x6" && (
          <div className="px-5 py-2 text-xs text-muted-foreground border-b border-border" style={{ background: "rgba(45,107,204,0.05)" }}>
            📦 4×6 label mode — one parcel per 100mm × 150mm label. Set your printer paper size to <strong>4×6"</strong> or <strong>100×150mm</strong>.
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {slips.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members have an onward address yet — nothing to print.</p>
          ) : (
            <div ref={printRef}>
              {format === "4x6" ? (
                <div className="slip-grid">
                  {slips.map(s => <ForwardLabelSlip key={s.id} slip={s} footer={footer} />)}
                </div>
              ) : (
                <div className="slip-grid" style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                  {slips.map(s => <ForwardPackingSlip key={s.id} slip={s} footer={footer} />)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function slipAddressLines(s: ForwardSlip): string[] {
  const parts: string[] = [];
  if (s.address) s.address.split("\n").forEach(l => { if (l.trim()) parts.push(l.trim()); });
  if (s.country) parts.push(s.country);
  if (s.phone) parts.push(s.phone);
  return parts;
}

// 4×6 single-label layout.
function ForwardLabelSlip({ slip: s, footer }: { slip: ForwardSlip; footer: string }) {
  const kits = s.lineItems.reduce((sum, li) => sum + li.quantity, 0);
  const lines = slipAddressLines(s);
  return (
    <div className="slip" style={{
      width: "calc(100mm)", maxWidth: "380px", minHeight: "150mm", border: "1.5px solid #e5e7eb",
      borderRadius: "6px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "0",
      fontSize: "13px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      background: "#fff", marginBottom: "16px",
    }}>
      <div className="label-header" style={{ borderBottom: "2px solid #111", paddingBottom: "8px", marginBottom: "8px" }}>
        <div className="order-no" style={{ fontSize: "20px", fontWeight: 800, color: "#111", lineHeight: 1.1 }}>@{s.username}</div>
      </div>
      <div className="items" style={{ flex: 1, marginBottom: "8px" }}>
        {s.lineItems.map((li, i) => (
          <div key={i} className="item-row" style={{ fontSize: "12px", color: "#111", lineHeight: 1.7 }}>
            <span className="item-qty" style={{ fontWeight: 800 }}>{li.quantity}×</span> {li.productName}
          </div>
        ))}
      </div>
      <hr className="divider" style={{ border: "none", borderTop: "1.5px solid #d1d5db", margin: "6px 0" }} />
      <div className="total-kits" style={{ fontSize: "13px", fontWeight: 800, color: "#111", marginBottom: "4px" }}>Total Kits — {kits}</div>
      {(s.name || lines.length > 0) && (
        <div className="address" style={{ marginTop: "auto", paddingTop: "7px", borderTop: "1px solid #e5e7eb", fontSize: "11px", color: "#374151", lineHeight: 1.5 }}>
          {s.name && <div style={{ fontWeight: 700, fontSize: "12px" }}>{s.name}</div>}
          {lines.map((part, i) => <div key={i}>{part}</div>)}
        </div>
      )}
      <div className="slip-footer" style={{ marginTop: "8px", paddingTop: "6px", borderTop: "1.5px solid #111", fontSize: "8px", color: "#9ca3af", textAlign: "center" }}>{footer}</div>
    </div>
  );
}

// A4 packing-slip card.
function ForwardPackingSlip({ slip: s, footer }: { slip: ForwardSlip; footer: string }) {
  const kits = s.lineItems.reduce((sum, li) => sum + li.quantity, 0);
  const lines = slipAddressLines(s);
  return (
    <div className="slip" style={{
      border: "1.5px solid #1a1a1a", borderRadius: "4px", padding: "7px 9px", display: "flex",
      flexDirection: "column", gap: "4px", fontSize: "11px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: "#fff",
      width: "calc(33.333% - 8px)",
    }}>
      <div className="order-no" style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "4px" }}>
        <div style={{ fontWeight: 700, fontSize: "12px", color: "#111" }}>@{s.username}</div>
      </div>
      <div className="items" style={{ flex: 1 }}>
        {s.lineItems.map((li, i) => (
          <div key={i} className="item-row" style={{ color: "#222", lineHeight: 1.5 }}>
            <span className="item-qty" style={{ fontWeight: 700 }}>{li.quantity}×</span> {li.productName}
          </div>
        ))}
      </div>
      <hr className="divider" style={{ border: "none", borderTop: "1px solid #e5e7eb" }} />
      <div className="total-kits" style={{ fontWeight: 700, color: "#111", fontSize: "10.5px" }}>Total Kits — {kits}</div>
      {(s.name || lines.length > 0) && (
        <div className="address" style={{ fontSize: "10px", color: "#374151", lineHeight: 1.4 }}>
          {s.name && <div style={{ fontWeight: 600 }}>{s.name}</div>}
          {lines.map((part, i) => <div key={i}>{part}</div>)}
        </div>
      )}
      <div className="slip-footer" style={{ marginTop: "4px", paddingTop: "4px", borderTop: "1px solid #d1d5db", fontSize: "7.5px", color: "#9ca3af", textAlign: "center" }}>{footer}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: "var(--t-muted)" }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{value}</span>
    </div>
  );
}

function Checklist({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: ok ? "rgba(34,197,94,0.15)" : "var(--t-surface2)", color: ok ? "#15803d" : "var(--t-muted)" }}>
        {ok ? <Check className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      </span>
      <span style={{ color: ok ? "var(--t-text)" : "var(--t-muted)" }}>{text}</span>
    </div>
  );
}

// Convert an ISO timestamp to a value for <input type="datetime-local"> in local time.
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatChatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return time;
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time}`;
}

// Telegram-style chat thread for the members of a shared wholesale order.
function ShareChat({ shareId, readOnly }: { shareId: string; readOnly: boolean }) {
  const cardStyle = { background: "var(--t-surface)", border: "1px solid var(--t-border)" } as const;
  const fieldStyle = { background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-text)", border: "1px solid var(--t-border)" } as const;
  const SEEN_KEY = `wsChat:seen:${shareId}`;

  const { data: messages = [], isLoading } = useWholesaleShareMessages(shareId);
  const invalidateMessages = useInvalidateWholesaleShareMessages();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // How many messages have been "seen". null until we know a baseline; a brand-new
  // visitor's existing history is treated as seen so the badge counts only new ones.
  const [seenCount, setSeenCount] = useState<number | null>(() => {
    try {
      const v = localStorage.getItem(SEEN_KEY);
      if (v == null) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    } catch { return null; }
  });

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastCountRef = useRef(0);

  const markAllSeen = (count: number) => {
    setSeenCount(count);
    try { localStorage.setItem(SEEN_KEY, String(count)); } catch { /* storage unavailable */ }
  };

  // Establish the baseline once messages first load for a brand-new visitor.
  useEffect(() => {
    if (seenCount == null && !isLoading) markAllSeen(messages.length);
  }, [isLoading, messages.length, seenCount]);

  // Keep everything marked read while the panel is open.
  useEffect(() => {
    if (open) markAllSeen(messages.length);
  }, [open, messages.length]);

  // Auto-scroll to the newest message while the panel is open.
  useEffect(() => {
    if (open && messages.length !== lastCountRef.current) {
      lastCountRef.current = messages.length;
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, open]);

  const unread = seenCount == null ? 0 : Math.max(0, messages.length - seenCount);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      await postWholesaleShareMessage(shareId, body);
      setDraft("");
      invalidateMessages(shareId);
    } catch (e) {
      setError((e as Error).message || "Couldn't send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed right-4 bottom-24 md:bottom-6 md:right-6 z-40 inline-flex items-center justify-center h-14 w-14 rounded-full shadow-lg text-white"
        style={{ background: "var(--t-blue)" }}
        aria-label={open ? "Close group chat" : "Open group chat"}
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!open && unread > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full text-[11px] font-bold flex items-center justify-center"
            style={{ background: "#ef4444", color: "#fff", border: "2px solid var(--t-bg)" }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="chat-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[58] bg-black/30 backdrop-blur-sm md:bg-transparent md:backdrop-blur-0"
            />
            <motion.div
              key="chat-panel"
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed z-[59] bottom-0 left-0 right-0 rounded-t-3xl flex flex-col overflow-hidden md:bottom-24 md:right-6 md:left-auto md:w-96 md:rounded-2xl md:shadow-2xl"
              style={cardStyle}
            >
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--t-border)" }}>
                <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Group Chat</p>
                <button onClick={() => setOpen(false)} aria-label="Close chat">
                  <X className="w-5 h-5" style={{ color: "var(--t-muted)" }} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5" style={{ maxHeight: "60vh", minHeight: "12rem" }}>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--t-muted)" }} />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                    <MessageCircle className="w-8 h-8" style={{ color: "var(--t-muted)", opacity: 0.4 }} />
                    <p className="text-sm" style={{ color: "var(--t-muted)" }}>No messages yet — say hello to your group.</p>
                  </div>
                ) : (
                  messages.map(m => (
                    <div key={m.id} className={`flex ${m.isYou ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[80%] min-w-0">
                        {!m.isYou && (
                          <p className="text-[11px] font-semibold mb-0.5 px-1" style={{ color: "var(--t-blue)" }}>@{m.username}</p>
                        )}
                        <div
                          className="rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap"
                          style={m.isYou
                            ? { background: "var(--t-blue)", color: "#fff", borderBottomRightRadius: 4 }
                            : { background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)", borderBottomLeftRadius: 4 }}
                        >
                          {m.body}
                        </div>
                        <p className="text-[10px] mt-0.5 px-1" style={{ color: "var(--t-muted)", textAlign: m.isYou ? "right" : "left" }}>
                          {formatChatTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {readOnly ? (
                <div className="px-4 py-3 text-xs text-center" style={{ borderTop: "1px solid var(--t-border)", color: "var(--t-muted)" }}>
                  This shared order has been cancelled — chat is read-only.
                </div>
              ) : (
                <div className="p-3 space-y-2" style={{ borderTop: "1px solid var(--t-border)" }}>
                  {error && <p className="text-xs px-1" style={{ color: "#b91c1c" }}>{error}</p>}
                  <div className="flex items-end gap-2">
                    <textarea
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      onKeyDown={onKeyDown}
                      placeholder="Message your group…"
                      rows={1}
                      maxLength={2000}
                      className="flex-1 resize-none rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={{ ...fieldStyle, maxHeight: "7rem" }}
                    />
                    <button
                      onClick={() => void send()}
                      disabled={sending || !draft.trim()}
                      className="shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-xl text-white disabled:opacity-40"
                      style={{ background: "var(--t-blue)" }}
                      aria-label="Send message"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
