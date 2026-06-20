import { useState, useEffect, useMemo, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useLocation, useRoute } from "wouter";
import { motion } from "framer-motion";
import {
  Loader2, Copy, Check, Users, Truck, Lock, Plus, Minus, Search, Crown,
  ArrowLeft, CreditCard, CheckCircle2, Clock, Share2, Ban, AlertCircle,
  ChevronDown, Info,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { useAccount } from "@/hooks/use-account";
import { COUNTRIES } from "@/data/countries";
import {
  useWholesaleShare,
  joinWholesaleShare,
  setWholesaleShareItems,
  setWholesaleShareDelivery,
  setWholesaleShareDeliveryAddress,
  setWholesaleShareSplit,
  lockWholesaleShare,
  cancelWholesaleShare,
  useInvalidateWholesaleShare,
  type WholesaleShareDetail,
  type WholesaleSplitMode,
} from "@/hooks/use-wholesale-shares";

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

// Only a fully `confirmed` payment counts toward the shared order's auto-submit
// (the backend's allPaid / maybeSubmitSharedOrder use `confirmed` only).
function PayBadge({ paymentStatus }: { paymentStatus: string | null }) {
  const paid = paymentStatus === "confirmed";
  const pending = paymentStatus === "pending_confirmation";
  const testOnly = paymentStatus === "test_confirmed";
  const color = paid ? "#22c55e" : (pending || testOnly) ? "#eab308" : "#ef4444";
  const bg = paid ? "rgba(34,197,94,0.12)" : (pending || testOnly) ? "rgba(234,179,8,0.12)" : "rgba(239,68,68,0.12)";
  const label = paid ? "Paid" : pending ? "Checking…" : testOnly ? "Test only" : "Unpaid";
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ color, background: bg }}>
      {paid ? <CheckCircle2 className="w-3 h-3" /> : (pending || testOnly) ? <Clock className="w-3 h-3" /> : null}
      {label}
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

  // Gate: wholesale members only
  useEffect(() => {
    if (!accountLoading && (!account || !account.isWholesale)) setLocation("/wholesale");
  }, [accountLoading, account, setLocation]);

  // Load wholesale products once
  useEffect(() => {
    fetch("/api/wholesale/products")
      .then(r => (r.ok ? r.json() : []))
      .then(d => setProducts(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const myMember = useMemo(() => share?.members.find(m => m.isYou) ?? null, [share]);

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
                  : <>You've been invited to shared order <span className="font-mono font-bold" style={{ color: "var(--t-text)" }}>{id}</span>. Join to add your own items.</>}
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

  const doLock = async () => {
    if (!id) return;
    setActionError(""); setBusy("lock");
    try { await lockWholesaleShare(id); invalidate(id); }
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

  const copy = (text: string, which: "code" | "link") => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    }).catch(() => {});
  };

  const shareLink = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "";

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

            {/* Members */}
            <section className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Members</p>
              <div className="rounded-xl divide-y" style={{ ...card, borderColor: "var(--t-border)" }}>
                {share.members.map(m => (
                  <div key={m.username} className="p-4 flex items-start justify-between gap-3" style={{ borderColor: "var(--t-border)" }}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate" style={{ color: "var(--t-text)" }}>@{m.username.replace(/^@/, "")}</span>
                        {m.isCreator && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1" style={{ background: "var(--t-blue-08)", color: "var(--t-blue)" }}>
                            <Crown className="w-2.5 h-2.5" /> Organiser
                          </span>
                        )}
                        {m.isYou && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--t-surface2)", color: "var(--t-muted)" }}>You</span>}
                        {share.delivery.username && m.username.toLowerCase() === share.delivery.username.toLowerCase() && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1" style={{ background: "rgba(34,197,94,0.12)", color: "#15803d" }}>
                            <Truck className="w-2.5 h-2.5" /> Delivery
                          </span>
                        )}
                        {!isOpen && <PayBadge paymentStatus={m.paymentStatus} />}
                      </div>
                      <p className="text-xs mt-1" style={{ color: "var(--t-muted)" }}>
                        {m.kits > 0 ? `${m.kits} kit${m.kits === 1 ? "" : "s"} · ${money(m.subtotal)}` : "No items yet"}
                        {m.tip > 0 && ` · tip ${money(m.tip)}`}
                        {m.shippingShare != null && ` · ship ${money(m.shippingShare)}`}
                        {m.orderCode && ` · order #${m.orderCode}`}
                      </p>
                    </div>
                    {!isOpen && m.isYou && m.orderId && m.paymentStatus !== "confirmed" && share.status !== "cancelled" && (
                      <button
                        onClick={() => setLocation(`/account/orders/${m.orderId}`)}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-bold text-white"
                        style={{ background: "var(--t-blue)" }}
                      >
                        <CreditCard className="w-4 h-4" /> Pay
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* My items editor */}
            {canEditItems && (
              <section className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8A9AAA" }}>My Items</p>
                  {itemsDirty && <span className="text-xs font-semibold" style={{ color: "#eab308" }}>Unsaved changes</span>}
                </div>
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

            {/* Combined summary */}
            <section className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Combined Order</p>
              <div className="rounded-xl p-4 space-y-2.5" style={card}>
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
            </section>

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

            {/* Delivery address — only the chosen recipient can set a one-off address
                for this parcel. It overrides their saved account address for this order
                only and never changes their account. */}
            {share.delivery.canEditAddress && (
              <section className="space-y-2">
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

            {/* Locked: organiser can still cancel if a member never pays */}
            {share.isCreator && share.status === "locked" && (
              <section className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Organiser Controls</p>
                <div className="rounded-xl p-4 space-y-3" style={card}>
                  <p className="text-sm" style={{ color: "var(--t-text)" }}>
                    Waiting for everyone to pay. The combined order is submitted to the vendor automatically once all members have paid.
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
