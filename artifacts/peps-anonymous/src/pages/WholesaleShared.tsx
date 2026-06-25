import { useState, useEffect, useMemo, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useLocation, useRoute } from "wouter";
import { motion } from "framer-motion";
import {
  Loader2, Copy, Check, Users, Truck, Lock, Unlock, Plus, Minus, Search,
  ArrowLeft, CheckCircle2, Clock, Share2, Ban, AlertCircle,
  ChevronDown, Info, MessageCircle, Send, Upload, X, Settings,
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
  setWholesaleShareSplit,
  setWholesaleShareFees,
  setWholesaleShareOnward,
  setWholesaleShareOnwardDestination,
  confirmWholesaleShareFee,
  lockWholesaleShare,
  cancelWholesaleShare,
  unlockWholesaleShare,
  useInvalidateWholesaleShare,
  useWholesaleShareMessages,
  postWholesaleShareMessage,
  useInvalidateWholesaleShareMessages,
  type WholesaleShareDetail,
  type WholesaleSplitMode,
} from "@/hooks/use-wholesale-shares";
import { ExpandableCard } from "@/components/wholesale-shared/ExpandableCard";
import { shareStage } from "@/components/wholesale-shared/stage";
import { WhatYouOwe } from "@/components/wholesale-shared/WhatYouOwe";
import { FeeLine } from "@/components/wholesale-shared/payment-fields";
import { NextStepBanner } from "@/components/wholesale-shared/NextStepBanner";
import { SetupWizard } from "@/components/wholesale-shared/SetupWizard";
import { GroupTracker } from "@/components/wholesale-shared/GroupTracker";
import { InvitePrompt } from "@/components/wholesale-shared/InvitePrompt";
import { buildGuide, GUIDE_ANCHORS, type GuideTarget } from "@/components/wholesale-shared/next-step";

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

  // Organiser-only optional peer-to-peer fee editor. Custom per-member organiser fee
  // (paid to the organiser) and reshipper fee (paid to the parcel recipient). These
  // are paid SEPARATELY and never enter the per-member order total.
  const [orgPayInfo, setOrgPayInfo] = useState("");
  const [feeAmounts, setFeeAmounts] = useState<Record<string, string>>({});
  const [feesDirty, setFeesDirty] = useState(false);
  const feesSeeded = useRef(false);

  // Recipient-only onward shipping config: enable toggle, the recipient's OWN payout
  // methods, and a custom onward charge per participant. Seeded from the share once
  // and skipped while the recipient has unsaved edits (so polling can't clobber).
  const [onwardEnabled, setOnwardEnabled] = useState(false);
  const [onwardPay, setOnwardPay] = useState({
    walletAddress: "", walletCurrency: "" as "" | "USDT" | "USDC",
    anonpay: "", paypal: "", revolut: "", notes: "",
  });
  const [onwardCharges, setOnwardCharges] = useState<Record<string, string>>({});
  const [onwardDirty, setOnwardDirty] = useState(false);
  const onwardSeeded = useRef(false);

  // Per-participant onward destination this member provides so the recipient knows
  // where to forward their items (written address; the delivery QR uploads instantly).
  const [destAddress, setDestAddress] = useState("");
  const [destDirty, setDestDirty] = useState(false);
  const destSeeded = useRef(false);

  // Recipient-only address form — the designated delivery member can enter a one-off
  // address for this parcel instead of being stuck with their saved account address.
  const [addr, setAddr] = useState({
    name: "", line1: "", line2: "", city: "", postcode: "", country: "United Kingdom", phone: "",
  });
  const addrSeeded = useRef(false);

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

  // Guided onboarding overlay (presentation only).
  const [wizardOpen, setWizardOpen] = useState(false);
  const [flashAnchor, setFlashAnchor] = useState<string | null>(null);
  // One-time "invite others" popup, shown after a member saves their items.
  const [invitePromptOpen, setInvitePromptOpen] = useState(false);
  const markInvitePromptSeen = useMarkWholesaleInvitePromptSeen();
  const invitePromptFired = useRef(false);
  const autoOpenedRef = useRef<string | null>(null);

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

  // Auto-open the wizard once per role-moment (organiser/member/recipient setup),
  // remembered per share in localStorage so it never nags on return visits.
  useEffect(() => {
    if (!autoMoment || !id) return;
    const key = `${id}:${autoMoment}`;
    if (autoOpenedRef.current === key) return;
    autoOpenedRef.current = key;
    let seen = false;
    try { seen = !!localStorage.getItem(`peps:ws-wizard-seen:${key}`); } catch { /* ignore */ }
    if (!seen) setWizardOpen(true);
  }, [autoMoment, id]);

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
    if (!share || !share.fees.canManage || feesDirty || feesSeeded.current) return;
    setOrgPayInfo(share.fees.organiserPaymentInfo ?? "");
    const seeded: Record<string, string> = {};
    for (const m of share.members) {
      seeded[m.username] = m.organiserFee > 0 ? String(m.organiserFee) : "";
    }
    setFeeAmounts(seeded);
    feesSeeded.current = true;
  }, [share, feesDirty]);

  // Seed the recipient onward-shipping config once (recipient + open only).
  useEffect(() => {
    if (!share || !share.onward.canManage || onwardDirty || onwardSeeded.current) return;
    setOnwardEnabled(share.onward.enabled);
    setOnwardPay({
      walletAddress: share.onward.payment.walletAddress ?? "",
      walletCurrency: share.onward.payment.walletCurrency ?? "",
      anonpay: share.onward.payment.anonpay ?? "",
      paypal: share.onward.payment.paypal ?? "",
      revolut: share.onward.payment.revolut ?? "",
      notes: share.onward.payment.notes ?? "",
    });
    const seeded: Record<string, string> = {};
    for (const c of share.onward.charges) seeded[c.username] = c.amount > 0 ? String(c.amount) : "";
    setOnwardCharges(seeded);
    onwardSeeded.current = true;
  }, [share, onwardDirty]);

  // Seed my own onward destination address once (only when I can set it).
  useEffect(() => {
    if (!share || destDirty || destSeeded.current) return;
    if (!share.onward.canSetDestination) return;
    const me = share.members.find(m => m.isYou);
    setDestAddress(me?.onwardAddress ?? "");
    destSeeded.current = true;
  }, [share, destDirty]);

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

  // Clear pending address-search timers on unmount.
  useEffect(() => () => {
    if (addrSearchTimer.current) clearTimeout(addrSearchTimer.current);
    if (addrBlurTimer.current) clearTimeout(addrBlurTimer.current);
  }, []);

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

  // ── Not found / not a member yet ──
  if (result && !result.ok) {
    const notFound = result.status === 404;
    const canJoin = result.status === 403 && !notFound;
    return (
      <PageLayout>
        <main className="px-4 py-8 max-w-md mx-auto w-full">
          <button onClick={() => setLocation("/wholesale")} className="flex items-center gap-1.5 text-sm mb-5" style={{ color: "var(--t-muted)" }}>
            <ArrowLeft className="w-4 h-4" /> Back to wholesale
          </button>
          <div className="rounded-2xl p-6 text-center space-y-4" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{ background: "var(--t-blue-08)" }}>
              {notFound ? <AlertCircle className="w-6 h-6" style={{ color: "var(--t-blue)" }} /> : <Users className="w-6 h-6" style={{ color: "var(--t-blue)" }} />}
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>
                {notFound ? "Shared order not found" : "Join shared wholesale order"}
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--t-muted)" }}>
                {notFound
                  ? "This code doesn't match any shared order. Double-check the code with the organiser."
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

  // Stage drives which cards show / auto-expand; role flags gate the single
  // "Manage order" entry. Every underlying control keeps its own server-side gate.
  const stage = shareStage(share.status);
  const showOrganiserOpen = share.isCreator && isOpen;
  const showOrganiserLocked = share.isCreator && share.status === "locked";
  const showOnwardConfig = share.onward.canManage;
  const showOnwardRoster = share.onward.enabled && share.onward.canConfirm;
  const showFeeRoster = share.fees.canConfirmOrganiserFees && share.fees.active && share.fees.organiserFeeTotal > 0;
  const showManage = showOrganiserOpen || showOrganiserLocked || showOnwardConfig || showOnwardRoster || showFeeRoster;

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
        share && share.status === "open" && share.memberCount < share.maxMembers &&
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
    } catch (e) { setActionError((e as Error).message); }
    finally { setBusy(null); }
  };

  const changeSplit = async (mode: WholesaleSplitMode) => {
    if (!id || mode === share.splitMode) return;
    setActionError(""); setBusy("split");
    try { await setWholesaleShareSplit(id, mode); invalidate(id); }
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

  const toggleFeePaid = async (username: string, feeType: "organiser" | "reshipper", paid: boolean) => {
    if (!id) return;
    setActionError(""); setBusy(`feepaid:${feeType}:${username}`);
    try { await confirmWholesaleShareFee(id, { username, feeType, paid }); invalidate(id); }
    catch (e) { setActionError((e as Error).message); }
    finally { setBusy(null); }
  };

  const setOnwardCharge = (username: string, value: string) => {
    setOnwardDirty(true);
    setOnwardCharges(prev => ({ ...prev, [username]: value }));
  };

  // The recipient saves their onward shipping config (toggle + payout methods +
  // per-participant charges). Validated and gated server-side.
  const saveOnward = async () => {
    if (!id || !share) return;
    setActionError(""); setBusy("onward");
    try {
      const recipientLower = share.delivery.username?.toLowerCase() ?? null;
      const charges = share.members
        .filter(m => !(recipientLower != null && m.username.toLowerCase() === recipientLower))
        .map(m => ({ username: m.username, amount: Math.max(0, parseFloat(onwardCharges[m.username] ?? "") || 0) }));
      await setWholesaleShareOnward(id, {
        enabled: onwardEnabled,
        walletAddress: onwardPay.walletAddress.trim(),
        walletCurrency: onwardPay.walletCurrency,
        anonpay: onwardPay.anonpay.trim(),
        paypal: onwardPay.paypal.trim(),
        revolut: onwardPay.revolut.trim(),
        notes: onwardPay.notes.trim(),
        charges,
      });
      setOnwardDirty(false);
      onwardSeeded.current = false;
      invalidate(id);
    } catch (e) { setActionError((e as Error).message); }
    finally { setBusy(null); }
  };

  // A participant saves their written onward forwarding address.
  const saveOnwardAddress = async () => {
    if (!id) return;
    setActionError(""); setBusy("onward-address");
    try {
      await setWholesaleShareOnwardDestination(id, { address: destAddress.trim() });
      setDestDirty(false);
      destSeeded.current = false;
      invalidate(id);
    } catch (e) { setActionError((e as Error).message); }
    finally { setBusy(null); }
  };

  // Upload a courier DELIVERY QR image. Read as a data URL with NO canvas re-encode
  // so the QR stays lossless and scannable; the server enforces a size cap.
  const uploadOnwardQr = async (file: File) => {
    if (!id) return;
    if (!/^image\//.test(file.type)) { setActionError("Please upload an image file for the delivery QR."); return; }
    if (file.size > 1_000_000) { setActionError("That image is too large — please upload a QR image under ~1MB."); return; }
    setActionError(""); setBusy("onward-qr");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Couldn't read that image. Please try again."));
        reader.readAsDataURL(file);
      });
      await setWholesaleShareOnwardDestination(id, { qr: dataUrl });
      invalidate(id);
    } catch (e) { setActionError((e as Error).message); }
    finally { setBusy(null); }
  };

  const removeOnwardQr = async () => {
    if (!id) return;
    setActionError(""); setBusy("onward-qr");
    try { await setWholesaleShareOnwardDestination(id, { qr: null }); invalidate(id); }
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

  // Mark the active auto-open moment as seen so the wizard won't reopen on return.
  const markWizardSeen = () => {
    if (autoMoment && id) { try { localStorage.setItem(`peps:ws-wizard-seen:${id}:${autoMoment}`, "1"); } catch { /* ignore */ } }
  };
  const closeWizard = () => { setWizardOpen(false); markWizardSeen(); };

  // Guide CTAs act inline (copy invite), navigate (pay), or close the overlay and
  // scroll+flash the real control on the page — the page stays the source of truth.
  const handleGuideAction = (target: GuideTarget) => {
    if (target.kind === "copyInvite") { copy(shareLink, "link"); return; }
    setWizardOpen(false);
    markWizardSeen();
    if (target.kind === "payOrder") { if (myMember?.orderId) setLocation(`/account/orders/${myMember.orderId}`); return; }
    if (target.kind === "scroll") {
      const anchor = target.anchor;
      requestAnimationFrame(() => {
        document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
        setFlashAnchor(anchor);
        window.setTimeout(() => setFlashAnchor(null), 1600);
      });
    }
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

  return (
    <PageLayout>
      <div style={{ background: "var(--t-bg)", minHeight: "100%" }}>
        <main className="px-4 py-5 pb-36 max-w-3xl mx-auto w-full space-y-5">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            <button onClick={() => setLocation("/wholesale")} className="flex items-center gap-1.5 text-sm" style={{ color: "var(--t-muted)" }}>
              <ArrowLeft className="w-4 h-4" /> Back to wholesale
            </button>

            {/* Header / code */}
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
                <button
                  onClick={() => copy(shareLink, "link")}
                  className="inline-flex items-center gap-1.5 px-3 h-10 rounded-xl text-sm font-semibold"
                  style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}
                >
                  {copied === "link" ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                  {copied === "link" ? "Link copied" : "Copy invite link"}
                </button>
                <span className="inline-flex items-center gap-1.5 text-sm ml-auto" style={{ color: "var(--t-muted)" }}>
                  <Users className="w-4 h-4" /> {share.memberCount}/{share.maxMembers} members
                </span>
              </div>
            </div>

            {/* Your next step — always-on, role + stage aware guidance */}
            {guide && (
              <NextStepBanner
                plan={guide}
                onAction={handleGuideAction}
                onOpenGuide={() => setWizardOpen(true)}
                copiedInvite={copied === "link"}
              />
            )}

            {/* How it works (collapsible, minimised by default) */}
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
                      { t: "Invite members.", d: `Share the code or invite link above. Up to ${share.maxMembers} members can join.` },
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

            {/* Status banners */}
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

            {actionError && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)", color: "#b91c1c" }}>
                {actionError}
              </div>
            )}

            {/* Group members — collapsible; open while still building */}
            <ExpandableCard
              title="Group"
              icon={<Users className="w-4 h-4" style={{ color: "var(--t-blue)" }} />}
              summary={`${share.memberCount}/${share.maxMembers} members`}
              defaultOpen={stage === "building"}
            >
              <GroupTracker share={share} onPayMember={orderId => setLocation(`/account/orders/${orderId}`)} />
              {isOpen && myMember && !share.isCreator && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--t-border)" }}>
                  <button
                    onClick={doLeave}
                    disabled={busy === "leave"}
                    className="inline-flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-semibold disabled:opacity-50"
                    style={{ background: "rgba(239,68,68,0.10)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.25)" }}
                  >
                    {busy === "leave" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                    Leave shared order
                  </button>
                </div>
              )}
            </ExpandableCard>

            {/* My items editor */}
            {canEditItems && (
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
            )}

            {/* What you owe — one combined personal money card (paying & done stages) */}
            {(stage === "paying" || stage === "done") && myMember && (
              <div id={GUIDE_ANCHORS.owe} style={flashStyle(GUIDE_ANCHORS.owe)}>
                <WhatYouOwe
                  share={share}
                  me={myMember}
                  onPayOrder={() => { if (myMember.orderId) setLocation(`/account/orders/${myMember.orderId}`); }}
                />
              </div>
            )}

            {/* Combined order totals — group-level info, collapsible (open while building) */}
            <ExpandableCard
              title="Order details"
              summary={`${share.combinedKits} kit${share.combinedKits === 1 ? "" : "s"} · ${money(share.combinedSubtotal)}`}
              defaultOpen={stage === "building"}
            >
              <div className="space-y-2.5">
                <Row label="Combined kits" value={String(share.combinedKits)} />
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
            </ExpandableCard>

            {/* Your onward delivery — non-recipient members tell the recipient where to
                forward their items. Shown whenever onward forwarding is on and I'm a
                forwarding member. The charge itself now lives in "What you owe" above. */}
            {share.onward.canSetDestination && myMember && (
              <section className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Your Onward Delivery</p>
                <div className="rounded-xl p-4 space-y-3" style={card}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>Where should your items go?</p>
                    {myMember.reshipperFee > 0 && (
                      <span className="text-xs font-bold" style={{ color: myMember.reshipperFeePaid ? "#15803d" : "var(--t-muted)" }}>
                        {myMember.reshipperFeePaid ? "Onward charge paid" : "Onward charge due"}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
                    Tell the recipient where to forward your items — a written address and/or a courier delivery QR (e.g. Royal Mail or InPost). This is a delivery label, never a payment QR.
                  </p>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--t-muted)" }}>Forwarding address</label>
                    <textarea
                      value={destAddress}
                      onChange={e => { setDestDirty(true); setDestAddress(e.target.value); }}
                      placeholder="Name, street, city, postcode, country"
                      rows={3}
                      maxLength={2000}
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-y"
                      style={field}
                    />
                    <button
                      onClick={saveOnwardAddress}
                      disabled={busy === "onward-address" || !destDirty}
                      className="mt-2 inline-flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold disabled:opacity-50"
                      style={{ background: "var(--t-blue)", color: "#fff" }}
                    >
                      {busy === "onward-address" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Save address
                    </button>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--t-muted)" }}>Delivery QR (optional)</label>
                    {myMember.onwardQr ? (
                      <div className="flex items-center gap-3">
                        <img src={myMember.onwardQr} alt="Your delivery QR" className="w-24 h-24 rounded-lg object-contain" style={{ background: "#fff", border: "1px solid var(--t-border)" }} />
                        <button
                          onClick={removeOnwardQr}
                          disabled={busy === "onward-qr"}
                          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl text-sm font-semibold disabled:opacity-50"
                          style={{ background: "rgba(239,68,68,0.10)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.25)" }}
                        >
                          {busy === "onward-qr" ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className="inline-flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold cursor-pointer" style={{ background: "var(--t-surface)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}>
                        {busy === "onward-qr" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Upload QR image
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={busy === "onward-qr"}
                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadOnwardQr(f); e.currentTarget.value = ""; }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Manage order — ONE role-gated entry grouping the organiser and recipient
                controls. Each control inside keeps its own server-side gate, so a user
                only ever sees the tools they're actually allowed to use. */}
            {showManage && (
              <div id={GUIDE_ANCHORS.manage} style={flashStyle(GUIDE_ANCHORS.manage)}>
              <ExpandableCard
                title="Manage order"
                icon={<Settings className="w-4 h-4" style={{ color: "var(--t-blue)" }} />}
                summary={share.isCreator ? "Organiser tools" : "Recipient tools"}
                defaultOpen={showOrganiserOpen || showOnwardConfig}
              >
                <div className="space-y-5">

            {/* Creator controls */}
            {share.isCreator && isOpen && (
              <section className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Organiser Controls</p>
                <div className="rounded-xl p-4 space-y-4" style={card}>

                  {/* Split mode */}
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

                  {/* Delivery member — organiser picks who receives the parcel;
                      the chosen recipient then confirms or edits the address below. */}
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
                        <span>Waiting for @{share.delivery.username.replace(/^@/, "")} to add a delivery address{share.delivery.canEditAddress ? " — that's you, fill it in below" : ""}.</span>
                      </div>
                    )}
                  </div>

                  {/* Optional organiser fee — custom per-member charge paid directly
                      to you. Paid separately, peer-to-peer; never added to anyone's
                      order. The onward (reshipper) charge is owned by the recipient. */}
                  <div className="pt-2 border-t space-y-3" style={{ borderColor: "var(--t-border)" }}>
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

                  {/* Lock checklist + actions */}
                  <div className="pt-2 border-t space-y-2" style={{ borderColor: "var(--t-border)" }}>
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
                </div>
              </section>
            )}

            {/* Recipient onward-shipping controls — the chosen delivery member sets up
                forwarding: toggle it on, publish their OWN payout methods, and set a
                custom onward charge per participant. Open-only, recipient-only. The
                charge is paid directly to them and never enters any order total. */}
            {share.onward.canManage && (
              <section className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Onward Shipping (You Receive)</p>
                <div className="rounded-xl p-4 space-y-4" style={card}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <label className="block text-sm font-semibold" style={{ color: "var(--t-text)" }}>Forward items to members</label>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>
                        You receive the whole parcel, then post each member's items onward. Switch this on to collect a custom charge per member and their forwarding details. Paid directly to you — never part of any order.
                      </p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={onwardEnabled}
                      onClick={() => { setOnwardDirty(true); setOnwardEnabled(v => !v); }}
                      className="shrink-0 w-12 h-7 rounded-full transition-colors relative"
                      style={{ background: onwardEnabled ? "var(--t-blue)" : "var(--t-border)" }}
                    >
                      <span className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform" style={{ transform: onwardEnabled ? "translateX(20px)" : "translateX(0)" }} />
                    </button>
                  </div>

                  {onwardEnabled && (
                    <>
                      {/* Recipient's own payout methods — any combination. */}
                      <div className="space-y-3 pt-1 border-t" style={{ borderColor: "var(--t-border)" }}>
                        <label className="block text-xs font-semibold pt-2" style={{ color: "var(--t-muted)" }}>How members pay you (any combination)</label>
                        <div className="grid grid-cols-[1fr_auto] gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--t-muted)" }}>Crypto wallet (ERC-20)</label>
                            <input
                              value={onwardPay.walletAddress}
                              onChange={e => { setOnwardDirty(true); setOnwardPay(p => ({ ...p, walletAddress: e.target.value })); }}
                              placeholder="0x… wallet address"
                              maxLength={200}
                              className="w-full h-10 px-3 rounded-lg border text-sm outline-none font-mono"
                              style={field}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--t-muted)" }}>Coin</label>
                            <select
                              value={onwardPay.walletCurrency}
                              onChange={e => { setOnwardDirty(true); setOnwardPay(p => ({ ...p, walletCurrency: e.target.value as "" | "USDT" | "USDC" })); }}
                              className="h-10 px-2 rounded-lg border text-sm outline-none"
                              style={field}
                            >
                              <option value="">—</option>
                              <option value="USDT">USDT</option>
                              <option value="USDC">USDC</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--t-muted)" }}>anonPay</label>
                            <input value={onwardPay.anonpay} onChange={e => { setOnwardDirty(true); setOnwardPay(p => ({ ...p, anonpay: e.target.value })); }} placeholder="anonPay link / ID" maxLength={200} className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--t-muted)" }}>PayPal</label>
                            <input value={onwardPay.paypal} onChange={e => { setOnwardDirty(true); setOnwardPay(p => ({ ...p, paypal: e.target.value })); }} placeholder="PayPal email / link" maxLength={200} className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--t-muted)" }}>Revolut</label>
                            <input value={onwardPay.revolut} onChange={e => { setOnwardDirty(true); setOnwardPay(p => ({ ...p, revolut: e.target.value })); }} placeholder="@revtag / link" maxLength={200} className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--t-muted)" }}>Other notes</label>
                            <input value={onwardPay.notes} onChange={e => { setOnwardDirty(true); setOnwardPay(p => ({ ...p, notes: e.target.value })); }} placeholder="Any other instructions" maxLength={500} className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field} />
                          </div>
                        </div>
                      </div>

                      {/* Per-participant onward charge. */}
                      <div className="space-y-2 pt-1 border-t" style={{ borderColor: "var(--t-border)" }}>
                        <label className="block text-xs font-semibold pt-2" style={{ color: "var(--t-muted)" }}>Onward charge per member</label>
                        <div className="rounded-lg divide-y" style={{ border: "1px solid var(--t-border)", borderColor: "var(--t-border)" }}>
                          <div className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--t-muted)" }}>
                            <span>Member</span>
                            <span className="w-24 text-center">Charge</span>
                          </div>
                          {share.members.map(m => {
                            const isRecipient = !!share.delivery.username && m.username.toLowerCase() === share.delivery.username.toLowerCase();
                            return (
                              <div key={m.username} className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 items-center">
                                <span className="text-sm truncate" style={{ color: "var(--t-text)" }}>
                                  @{m.username.replace(/^@/, "")}{isRecipient && <span className="text-[10px] ml-1" style={{ color: "#15803d" }}>you</span>}
                                </span>
                                {isRecipient ? (
                                  <span className="w-24 text-center text-xs" style={{ color: "var(--t-muted)" }}>—</span>
                                ) : (
                                  <div className="w-24 flex items-center gap-1">
                                    <span className="text-xs" style={{ color: "var(--t-muted)" }}>$</span>
                                    <input
                                      type="number" min="0" step="0.01"
                                      value={onwardCharges[m.username] ?? ""}
                                      onChange={e => setOnwardCharge(m.username, e.target.value)}
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
                      </div>
                    </>
                  )}

                  <button
                    onClick={saveOnward}
                    disabled={busy === "onward" || !onwardDirty}
                    className="inline-flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-bold disabled:opacity-50"
                    style={{ background: "var(--t-blue)", color: "#fff" }}
                  >
                    {busy === "onward" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save onward shipping
                  </button>
                </div>
              </section>
            )}

            {/* Locked: organiser can still cancel if a member never pays */}
            {showOrganiserLocked && (
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
            )}

            {/* Organiser fees — confirm each member's peer-to-peer fee as paid */}
            {showFeeRoster && (
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
                        canConfirm={share.fees.canConfirmOrganiserFees}
                        busy={busy === `feepaid:organiser:${m.username}`}
                        onToggle={() => toggleFeePaid(m.username, "organiser", !m.organiserFeePaid)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Onward charges roster — recipient confirms each member's onward charge */}
            {showOnwardRoster && (
              <section className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Onward Charges — Mark Paid</p>
                <div className="rounded-xl divide-y" style={{ border: "1px solid var(--t-border)", borderColor: "var(--t-border)" }}>
                  {share.members.filter(m => !(share.onward.recipientUsername && m.username.toLowerCase() === share.onward.recipientUsername.toLowerCase())).map(m => (
                    <div key={m.username} className="px-3 py-2.5 space-y-2">
                      <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>
                        @{m.username.replace(/^@/, "")}{m.isYou && <span className="text-[10px] ml-1" style={{ color: "var(--t-muted)" }}>(you)</span>}
                      </p>
                      {m.reshipperFee > 0 && (
                        <FeeLine
                          label="Onward charge"
                          amount={money(m.reshipperFee)}
                          paid={m.reshipperFeePaid}
                          canConfirm={share.onward.canConfirm}
                          busy={busy === `feepaid:reshipper:${m.username}`}
                          onToggle={() => toggleFeePaid(m.username, "reshipper", !m.reshipperFeePaid)}
                        />
                      )}
                      {m.onwardAddress
                        ? <p className="whitespace-pre-line text-xs" style={{ color: "var(--t-muted)" }}>{m.onwardAddress}</p>
                        : <p className="text-xs italic" style={{ color: "var(--t-muted)" }}>No forwarding address yet.</p>}
                      {m.onwardQr && (
                        <img src={m.onwardQr} alt={`Delivery QR for ${m.username}`} className="w-28 h-28 rounded-lg object-contain" style={{ background: "#fff", border: "1px solid var(--t-border)" }} />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

                </div>
              </ExpandableCard>
              </div>
            )}

            {/* Delivery address — only the chosen recipient can set a one-off address
                for this parcel. It overrides their saved account address for this order
                only and never changes their account. */}
            {share.delivery.canEditAddress && (
              <section id={GUIDE_ANCHORS.address} style={flashStyle(GUIDE_ANCHORS.address)} className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Your Delivery Address</p>
                <div className="rounded-xl p-4 space-y-3" style={card}>
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
                </div>
              </section>
            )}

            {/* Group chat — members only */}
            {share.isMember && (
              <ShareChat shareId={share.id} readOnly={share.status === "cancelled"} />
            )}

            {guide && (
              <SetupWizard
                open={wizardOpen}
                onClose={closeWizard}
                plan={guide}
                share={share}
                onAction={handleGuideAction}
                copiedInvite={copied === "link"}
              />
            )}

            <InvitePrompt
              open={invitePromptOpen}
              onClose={() => setInvitePromptOpen(false)}
              shareLink={shareLink}
              onCopy={() => copy(shareLink, "link")}
              copied={copied === "link"}
              memberCount={share.memberCount}
              maxMembers={share.maxMembers}
            />

            {/* My share to pay (locked, non-creator quick action handled in member row) */}
          </motion.div>
        </main>
      </div>
    </PageLayout>
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

  const { data: messages = [], isLoading } = useWholesaleShareMessages(shareId);
  const invalidateMessages = useInvalidateWholesaleShareMessages();

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastCountRef = useRef(0);

  // Auto-scroll to the newest message when the count changes.
  useEffect(() => {
    if (messages.length !== lastCountRef.current) {
      lastCountRef.current = messages.length;
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length]);

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
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Group Chat</p>
      <div className="rounded-2xl flex flex-col overflow-hidden" style={cardStyle}>
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5" style={{ maxHeight: "22rem", minHeight: "9rem" }}>
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
      </div>
    </section>
  );
}
