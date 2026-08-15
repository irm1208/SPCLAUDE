import React, { useState, useRef, useEffect } from "react";
import { useThemeStore } from "@/hooks/use-theme";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Loader2, Truck, Package, MessageCircle,
  CheckCircle2, AlertCircle, Lock, Plus, Trash2, X, Copy, Check,
  QrCode, Upload, Download, ImagePlus, MapPin, ScanLine, TestTube, Clock, Coins,
  ChevronDown, Pencil, FileText, PackageCheck, ReceiptText, Info,
  Home, ExternalLink, Megaphone,
} from "lucide-react";
import { Card, Button, Label, Input, cn } from "@/components/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageLayout } from "@/components/PageLayout";
import { SiteAnnouncements } from "@/components/SiteAnnouncements";
import { useDraftStore } from "@/hooks/use-draft-store";
import { SHIP_COUNTRIES } from "@/components/ShippingQuoteWidget";
import { fmtC } from "@/lib/currency";
import { useOrderParcels, useAccount, useAccountOrders, useLogout, type GbParcel } from "@/hooks/use-account";
import { HubBottomNav, type HubSection } from "@/components/HubBottomNav";
import { DashboardShell, type DashOrder } from "@/components/DashboardShell";
import type { PortalNavProps } from "@/pages/CustomerPortal";
import PaymentPanel from "@/components/PaymentPanel";
import { generateReceiptPDF } from "@/lib/generate-receipt-pdf";

// ── "Warm & Human" palette locals (override the DashboardShell exports for this page only) ──
const HERO_GRAD = "linear-gradient(120deg,#1B3164 0%,#1B3A7A 45%,#2D6BCC 100%)";
const ACCENT = "#3B5E99";

function SecIcon({ Icon }: { Icon: React.ElementType }) {
  return (
    <span className="flex items-center justify-center shrink-0" style={{ width: 30, height: 30, borderRadius: 10, background: "var(--t-blue-10)", color: "var(--t-blue)" }}>
      <Icon className="w-4 h-4" />
    </span>
  );
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string; pct: number }> = {
  Draft:      { label: "Draft",      color: "#8B827A", bg: "rgba(139,130,122,0.14)", pct: 5 },
  Submitted:  { label: "Submitted",  color: "#E9A020", bg: "rgba(233,160,32,0.14)",  pct: 25 },
  Processing: { label: "Processing", color: "#E9A020", bg: "rgba(233,160,32,0.14)",  pct: 55 },
  Shipped:    { label: "Shipped",    color: "#E9A020", bg: "rgba(233,160,32,0.16)",  pct: 80 },
  Completed:  { label: "Completed",  color: "#22c55e", bg: "rgba(34,197,94,0.16)",   pct: 100 },
  Cancelled:  { label: "Cancelled",  color: "#ef4444", bg: "rgba(239,68,68,0.14)",   pct: 0 },
};

interface OrderLineItem {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isOos?: boolean;
}

function MemberDispatchImages({ orderId }: { orderId: string }) {
  const [images, setImages] = React.useState<{ id: string; filename: string; uploadedAt: string }[] | null>(null);
  const [loadedData, setLoadedData] = React.useState<Record<string, string>>({});
  const [lightbox, setLightbox] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch(`/api/account/orders/${orderId}/dispatch-images`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(d => setImages(Array.isArray(d) ? d : []))
      .catch(() => setImages([]));
  }, [orderId]);

  if (!images || images.length === 0) return null;

  const loadImage = (imgId: string) => {
    if (loadedData[imgId]) { setLightbox(loadedData[imgId]); return; }
    fetch(`/api/account/orders/${orderId}/dispatch-images/${imgId}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.imageData) { setLoadedData(prev => ({ ...prev, [imgId]: d.imageData })); setLightbox(d.imageData); } })
      .catch(() => {});
  };

  return (
    <>
      <div className="rounded-lg p-3 space-y-2" style={{ background: "var(--t-blue-08)", border: "1px solid var(--t-blue-20)" }}>
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--t-blue)" }}>Dispatch Photo{images.length > 1 ? "s" : ""}</p>
        <div className="flex flex-wrap gap-2">
          {images.map(img => (
            <button
              key={img.id}
              onClick={() => loadImage(img.id)}
              className="w-20 h-20 rounded-lg overflow-hidden flex items-center justify-center transition-colors cursor-zoom-in hover:brightness-95"
              style={{ border: "1px solid var(--t-blue-30)", background: "var(--t-surface)" }}
              title={img.filename}
            >
              {loadedData[img.id] ? (
                <img src={loadedData[img.id]} alt={img.filename} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <span className="text-[10px] font-medium text-center px-1.5 leading-tight" style={{ color: "var(--t-blue)" }}>Tap to view</span>
              )}
            </button>
          ))}
        </div>
      </div>
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Dispatch photo" className="max-w-full max-h-[90vh] rounded-xl object-contain" onClick={e => e.stopPropagation()} />
          <button className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl font-bold" onClick={() => setLightbox(null)}>×</button>
        </div>
      )}
    </>
  );
}

interface OrderDetail {
  id: string;
  code: string;
  telegramUsername: string;
  deliveryMethod: string;
  deliveryMethodId: string | null;
  deliveryPrice: number;
  vendorShipping: number;
  productSubtotal: number;
  tip: number;
  testingContribution: number;
  testVote: string | null;
  grandTotal: number;
  adminFee?: number;
  adminFeeLabel?: string | null;
  amountDue?: number;
  hasBalanceScreenshot?: boolean;
  balanceTxHash?: string | null;
  balancePaymentStatus?: string | null;
  creditsApplied?: number;
  directShippingRequested?: boolean;
  directShippingEnabled?: boolean;
  directShippingCost?: number | null;
  routingType?: string | null;
  additionOfOrderId?: string | null;
  batchLocked?: boolean | null;
  notes: string | null;
  status: string;
  adminMessage: string | null;
  trackingNumber: string | null;
  trackingShippedItems?: Record<string, Array<{name: string; qty: number}>> | null;
  shippingCarrier?: string | null;
  paymentStatus: string;
  paymentTxHash: string | null;
  paymentTestAmount: number | null;
  testPaymentTxHash: string | null;
  paymentRejectionReason: string | null;
  shippingName: string | null;
  shippingAddress: string | null;
  shippingCountry?: string | null;
  shippingPhone?: string | null;
  shippingEmail?: string | null;
  orderType?: string | null;
  pin: string;
  inpostQrCode: string | null;
  royalMailQrCode: string | null;
  groupBuyId: string | null;
  currency?: string | null;
  groupBuyPaymentsEnabled: boolean | null;
  groupBuyDirectShippingPaymentsEnabled?: boolean | null;
  groupBuyAllowOrderAddons?: boolean;
  groupBuyDeleteLocked?: boolean;
  customShippingRequiresAddress?: boolean;
  customShippingRequiresQrCode?: boolean;
  qrCodes?: Record<string, string>;
  groupBuyQrUploadInpostEnabled: boolean;
  groupBuyQrUploadRoyalMailEnabled: boolean;
  groupBuyQrUploadMessage: string | null;
  groupBuyPaymentBanner?: string | null;
  reshipperUsername?: string | null;
  reshipperInfo?: {
    country: string | null;
    paymentMethods: {
      usdtWallet?: string;
      revolutHandle?: string;
      paypalHandle?: string;
      cryptoCurrency?: string;
      cryptoNetwork?: string;
      cryptoWalletAddress?: string;
      anonPayEnabled?: boolean;
      anonPayWallet?: string;
      anonPayTicker?: string;
      anonPayNetwork?: string;
    } | null;
  } | null;
  createdAt: string;
  updatedAt: string;
  lineItems: OrderLineItem[];
}

const EDITABLE_STATUSES = ["Draft", "Submitted"];


interface NominatimResult {
  place_id: number;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    postcode?: string;
    country?: string;
  };
}

const PHONE_PREFIXES: { prefix: string; flag: string }[] = [
  { prefix: "+1",   flag: "🇺🇸" }, { prefix: "+7",   flag: "🇷🇺" },
  { prefix: "+27",  flag: "🇿🇦" }, { prefix: "+30",  flag: "🇬🇷" },
  { prefix: "+31",  flag: "🇳🇱" }, { prefix: "+32",  flag: "🇧🇪" },
  { prefix: "+33",  flag: "🇫🇷" }, { prefix: "+34",  flag: "🇪🇸" },
  { prefix: "+36",  flag: "🇭🇺" }, { prefix: "+39",  flag: "🇮🇹" },
  { prefix: "+40",  flag: "🇷🇴" }, { prefix: "+41",  flag: "🇨🇭" },
  { prefix: "+43",  flag: "🇦🇹" }, { prefix: "+44",  flag: "🇬🇧" },
  { prefix: "+45",  flag: "🇩🇰" }, { prefix: "+46",  flag: "🇸🇪" },
  { prefix: "+47",  flag: "🇳🇴" }, { prefix: "+48",  flag: "🇵🇱" },
  { prefix: "+49",  flag: "🇩🇪" }, { prefix: "+51",  flag: "🇵🇪" },
  { prefix: "+52",  flag: "🇲🇽" }, { prefix: "+53",  flag: "🇨🇺" },
  { prefix: "+54",  flag: "🇦🇷" }, { prefix: "+55",  flag: "🇧🇷" },
  { prefix: "+56",  flag: "🇨🇱" }, { prefix: "+57",  flag: "🇨🇴" },
  { prefix: "+58",  flag: "🇻🇪" }, { prefix: "+60",  flag: "🇲🇾" },
  { prefix: "+61",  flag: "🇦🇺" }, { prefix: "+62",  flag: "🇮🇩" },
  { prefix: "+63",  flag: "🇵🇭" }, { prefix: "+64",  flag: "🇳🇿" },
  { prefix: "+65",  flag: "🇸🇬" }, { prefix: "+66",  flag: "🇹🇭" },
  { prefix: "+81",  flag: "🇯🇵" }, { prefix: "+82",  flag: "🇰🇷" },
  { prefix: "+84",  flag: "🇻🇳" }, { prefix: "+86",  flag: "🇨🇳" },
  { prefix: "+90",  flag: "🇹🇷" }, { prefix: "+91",  flag: "🇮🇳" },
  { prefix: "+92",  flag: "🇵🇰" }, { prefix: "+93",  flag: "🇦🇫" },
  { prefix: "+94",  flag: "🇱🇰" }, { prefix: "+95",  flag: "🇲🇲" },
  { prefix: "+98",  flag: "🇮🇷" }, { prefix: "+212", flag: "🇲🇦" },
  { prefix: "+213", flag: "🇩🇿" }, { prefix: "+216", flag: "🇹🇳" },
  { prefix: "+218", flag: "🇱🇾" }, { prefix: "+220", flag: "🇬🇲" },
  { prefix: "+221", flag: "🇸🇳" }, { prefix: "+222", flag: "🇲🇷" },
  { prefix: "+223", flag: "🇲🇱" }, { prefix: "+224", flag: "🇬🇳" },
  { prefix: "+225", flag: "🇨🇮" }, { prefix: "+226", flag: "🇧🇫" },
  { prefix: "+227", flag: "🇳🇪" }, { prefix: "+228", flag: "🇹🇬" },
  { prefix: "+229", flag: "🇧🇯" }, { prefix: "+230", flag: "🇲🇺" },
  { prefix: "+231", flag: "🇱🇷" }, { prefix: "+232", flag: "🇸🇱" },
  { prefix: "+233", flag: "🇬🇭" }, { prefix: "+234", flag: "🇳🇬" },
  { prefix: "+235", flag: "🇹🇩" }, { prefix: "+236", flag: "🇨🇫" },
  { prefix: "+237", flag: "🇨🇲" }, { prefix: "+238", flag: "🇨🇻" },
  { prefix: "+239", flag: "🇸🇹" }, { prefix: "+240", flag: "🇬🇶" },
  { prefix: "+241", flag: "🇬🇦" }, { prefix: "+242", flag: "🇨🇬" },
  { prefix: "+243", flag: "🇨🇩" }, { prefix: "+244", flag: "🇦🇴" },
  { prefix: "+245", flag: "🇬🇼" }, { prefix: "+248", flag: "🇸🇨" },
  { prefix: "+249", flag: "🇸🇩" }, { prefix: "+250", flag: "🇷🇼" },
  { prefix: "+251", flag: "🇪🇹" }, { prefix: "+252", flag: "🇸🇴" },
  { prefix: "+253", flag: "🇩🇯" }, { prefix: "+254", flag: "🇰🇪" },
  { prefix: "+255", flag: "🇹🇿" }, { prefix: "+256", flag: "🇺🇬" },
  { prefix: "+257", flag: "🇧🇮" }, { prefix: "+258", flag: "🇲🇿" },
  { prefix: "+260", flag: "🇿🇲" }, { prefix: "+261", flag: "🇲🇬" },
  { prefix: "+263", flag: "🇿🇼" }, { prefix: "+264", flag: "🇳🇦" },
  { prefix: "+265", flag: "🇲🇼" }, { prefix: "+266", flag: "🇱🇸" },
  { prefix: "+267", flag: "🇧🇼" }, { prefix: "+268", flag: "🇸🇿" },
  { prefix: "+269", flag: "🇰🇲" }, { prefix: "+290", flag: "🇸🇭" },
  { prefix: "+291", flag: "🇪🇷" }, { prefix: "+297", flag: "🇦🇼" },
  { prefix: "+298", flag: "🇫🇴" }, { prefix: "+299", flag: "🇬🇱" },
  { prefix: "+350", flag: "🇬🇮" }, { prefix: "+351", flag: "🇵🇹" },
  { prefix: "+352", flag: "🇱🇺" }, { prefix: "+353", flag: "🇮🇪" },
  { prefix: "+354", flag: "🇮🇸" }, { prefix: "+355", flag: "🇦🇱" },
  { prefix: "+356", flag: "🇲🇹" }, { prefix: "+357", flag: "🇨🇾" },
  { prefix: "+358", flag: "🇫🇮" }, { prefix: "+359", flag: "🇧🇬" },
  { prefix: "+370", flag: "🇱🇹" }, { prefix: "+371", flag: "🇱🇻" },
  { prefix: "+372", flag: "🇪🇪" }, { prefix: "+373", flag: "🇲🇩" },
  { prefix: "+374", flag: "🇦🇲" }, { prefix: "+375", flag: "🇧🇾" },
  { prefix: "+376", flag: "🇦🇩" }, { prefix: "+377", flag: "🇲🇨" },
  { prefix: "+378", flag: "🇸🇲" }, { prefix: "+380", flag: "🇺🇦" },
  { prefix: "+381", flag: "🇷🇸" }, { prefix: "+382", flag: "🇲🇪" },
  { prefix: "+383", flag: "🇽🇰" }, { prefix: "+385", flag: "🇭🇷" },
  { prefix: "+386", flag: "🇸🇮" }, { prefix: "+387", flag: "🇧🇦" },
  { prefix: "+389", flag: "🇲🇰" }, { prefix: "+420", flag: "🇨🇿" },
  { prefix: "+421", flag: "🇸🇰" }, { prefix: "+423", flag: "🇱🇮" },
  { prefix: "+500", flag: "🇫🇰" }, { prefix: "+501", flag: "🇧🇿" },
  { prefix: "+502", flag: "🇬🇹" }, { prefix: "+503", flag: "🇸🇻" },
  { prefix: "+504", flag: "🇭🇳" }, { prefix: "+505", flag: "🇳🇮" },
  { prefix: "+506", flag: "🇨🇷" }, { prefix: "+507", flag: "🇵🇦" },
  { prefix: "+509", flag: "🇭🇹" }, { prefix: "+590", flag: "🇬🇵" },
  { prefix: "+591", flag: "🇧🇴" }, { prefix: "+592", flag: "🇬🇾" },
  { prefix: "+593", flag: "🇪🇨" }, { prefix: "+595", flag: "🇵🇾" },
  { prefix: "+597", flag: "🇸🇷" }, { prefix: "+598", flag: "🇺🇾" },
  { prefix: "+670", flag: "🇹🇱" }, { prefix: "+673", flag: "🇧🇳" },
  { prefix: "+675", flag: "🇵🇬" }, { prefix: "+676", flag: "🇹🇴" },
  { prefix: "+677", flag: "🇸🇧" }, { prefix: "+678", flag: "🇻🇺" },
  { prefix: "+679", flag: "🇫🇯" }, { prefix: "+680", flag: "🇵🇼" },
  { prefix: "+682", flag: "🇨🇰" }, { prefix: "+685", flag: "🇼🇸" },
  { prefix: "+686", flag: "🇰🇮" }, { prefix: "+687", flag: "🇳🇨" },
  { prefix: "+688", flag: "🇹🇻" }, { prefix: "+689", flag: "🇵🇫" },
  { prefix: "+691", flag: "🇫🇲" }, { prefix: "+692", flag: "🇲🇭" },
  { prefix: "+850", flag: "🇰🇵" }, { prefix: "+852", flag: "🇭🇰" },
  { prefix: "+853", flag: "🇲🇴" }, { prefix: "+855", flag: "🇰🇭" },
  { prefix: "+856", flag: "🇱🇦" }, { prefix: "+880", flag: "🇧🇩" },
  { prefix: "+886", flag: "🇹🇼" }, { prefix: "+960", flag: "🇲🇻" },
  { prefix: "+961", flag: "🇱🇧" }, { prefix: "+962", flag: "🇯🇴" },
  { prefix: "+963", flag: "🇸🇾" }, { prefix: "+964", flag: "🇮🇶" },
  { prefix: "+965", flag: "🇰🇼" }, { prefix: "+966", flag: "🇸🇦" },
  { prefix: "+967", flag: "🇾🇪" }, { prefix: "+968", flag: "🇴🇲" },
  { prefix: "+970", flag: "🇵🇸" }, { prefix: "+971", flag: "🇦🇪" },
  { prefix: "+972", flag: "🇮🇱" }, { prefix: "+973", flag: "🇧🇭" },
  { prefix: "+974", flag: "🇶🇦" }, { prefix: "+975", flag: "🇧🇹" },
  { prefix: "+976", flag: "🇲🇳" }, { prefix: "+977", flag: "🇳🇵" },
  { prefix: "+992", flag: "🇹🇯" }, { prefix: "+993", flag: "🇹🇲" },
  { prefix: "+994", flag: "🇦🇿" }, { prefix: "+995", flag: "🇬🇪" },
  { prefix: "+996", flag: "🇰🇬" }, { prefix: "+998", flag: "🇺🇿" },
];

function parseAddressLines(raw: string | null): [string, string, string, string, string, string, string, string] {
  const allLines = (raw ?? "").split("\n").map(l => l.trim());

  let parsedPhone = "";
  let parsedPhonePrefix = "+44";
  let parsedEmail = "";

  const lines = allLines.filter(l => {
    if (l.startsWith("Phone: ")) {
      const rest = l.slice("Phone: ".length).trim();
      const spaceIdx = rest.indexOf(" ");
      if (spaceIdx > 0) {
        parsedPhonePrefix = rest.slice(0, spaceIdx);
        parsedPhone = rest.slice(spaceIdx + 1);
      } else {
        parsedPhone = rest;
      }
      return false;
    }
    if (l.startsWith("Email: ")) {
      parsedEmail = l.slice("Email: ".length).trim();
      return false;
    }
    return true;
  });

  let addr1 = "", addr2 = "", city = "", post = "", country = "United Kingdom";
  if (lines.length >= 5) {
    [addr1, addr2, city, post, country] = lines;
  } else if (lines.length === 4) {
    [addr1, city, post, country] = lines;
  } else {
    addr1 = lines[0] ?? "";
    city  = lines[1] ?? "";
    post  = lines[2] ?? "";
  }

  return [addr1, addr2, city, post, country, parsedPhone, parsedPhonePrefix, parsedEmail];
}

function AccountShippingAddressSection({
  orderId,
  existingName,
  existingAddress,
  onSaved,
}: {
  orderId: string;
  existingName: string | null;
  existingAddress: string | null;
  onSaved: (name: string, address: string) => void;
}) {
  const [parsedAddr1, parsedAddr2, parsedCity, parsedPost, parsedCountry, parsedPhone, parsedPhonePrefix, parsedEmail] = parseAddressLines(existingAddress);

  const { dark: isDark } = useThemeStore();
  const NAVY = isDark ? "#7099D9" : "#1B3A7A";

  const hasExisting = !!(existingName && existingAddress);

  // The address editor opens in a popup modal
  const [open, setOpen] = useState(false);
  // Track the "live" saved name/address (updated after each save)
  const [liveName, setLiveName] = useState(existingName ?? "");
  const [liveAddress, setLiveAddress] = useState(existingAddress ?? "");
  const [justSaved, setJustSaved] = useState(false);

  const [name, setName]             = useState(existingName ?? "");
  const [addr1, setAddr1]           = useState(parsedAddr1);
  const [addr2, setAddr2]           = useState(parsedAddr2);
  const [city, setCity]             = useState(parsedCity);
  const [post, setPost]             = useState(parsedPost);
  const [country, setCountry]       = useState(parsedCountry || "United Kingdom");
  const [email, setEmail]           = useState(parsedEmail);
  const [phonePrefix, setPhonePrefix] = useState(parsedPhonePrefix);
  const [phone, setPhone]           = useState(parsedPhone);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const [savedAccountAddr, setSavedAccountAddr] = useState<{
    addressLine1: string | null;
    addressLine2: string | null;
    addressCity: string | null;
    addressPostcode: string | null;
    country: string | null;
  } | null>(null);

  const [deliveryTipsEnabled, setDeliveryTipsEnabled] = useState(true);
  const [deliveryTipsItems, setDeliveryTipsItems] = useState<string[]>([
    "Use your **full legal name** as it appears on your letterbox",
    "Include a **flat/apartment number** if applicable",
    "Double-check your **postcode** — this affects routing",
    "All parcels arrive in **plain, unmarked packaging**",
    "Add your **phone and email** so couriers can reach you if needed",
  ]);

  useEffect(() => {
    fetch("/api/account/me", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.addressLine1) setSavedAccountAddr(d);
        if (typeof d.credits === "number" && d.credits > 0) setAccountCredits(d.credits);
      })
      .catch(() => {});
    fetch("/api/config")
      .then(r => r.json())
      .then(d => {
        if (typeof d.deliveryTipsEnabled === "boolean") setDeliveryTipsEnabled(d.deliveryTipsEnabled);
        if (Array.isArray(d.deliveryTipsItems)) setDeliveryTipsItems(d.deliveryTipsItems);
      })
      .catch(() => {});
  }, []);

  const applySavedAddress = () => {
    if (!savedAccountAddr) return;
    if (savedAccountAddr.addressLine1) setAddr1(savedAccountAddr.addressLine1);
    if (savedAccountAddr.addressLine2) setAddr2(savedAccountAddr.addressLine2 ?? "");
    if (savedAccountAddr.addressCity) setCity(savedAccountAddr.addressCity);
    if (savedAccountAddr.addressPostcode) setPost(savedAccountAddr.addressPostcode);
    if (savedAccountAddr.country) setCountry(savedAccountAddr.country);
  };

  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchSuggestions = (val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const countryCode = country === "United Kingdom" ? "gb" : undefined;
        const ccParam = countryCode ? `&countrycodes=${countryCode}` : "";
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=6&addressdetails=1${ccParam}`,
          { headers: { "Accept-Language": "en" } }
        );
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 350);
  };

  const applySuggestion = (s: NominatimResult) => {
    const a = s.address;
    const streetNum = [a.house_number, a.road].filter(Boolean).join(" ");
    setAddr1(streetNum || s.display_name.split(",")[0]);
    setCity(a.city || a.town || a.village || a.county || "");
    setPost(a.postcode || "");
    if (a.country) setCountry(a.country);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const buildAddress = () => {
    const phoneFull = phone.trim() ? `Phone: ${phonePrefix} ${phone.trim()}` : "";
    const emailLine = email.trim() ? `Email: ${email.trim()}` : "";
    return [addr1, addr2, city, post, country, phoneFull, emailLine]
      .map(s => s.trim()).filter(Boolean).join("\n");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !addr1.trim() || !city.trim() || !post.trim()) {
      setError("Please fill in Name, Address Line 1, City and Postcode");
      return;
    }
    const shippingAddress = buildAddress();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/account/orders/${orderId}/shipping-address`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shippingName: name.trim(), shippingAddress }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to save address");
      onSaved(j.shippingName, j.shippingAddress);
      setLiveName(j.shippingName);
      setLiveAddress(j.shippingAddress);
      setJustSaved(true);
      setOpen(false);
      setTimeout(() => setJustSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save address");
    }
    setSaving(false);
  };

  const navyInputStyle: React.CSSProperties = {
    borderColor: `${NAVY}55`,
    outlineColor: NAVY,
  };

  const addressIsSet = !!(liveName || liveAddress) || hasExisting;
  const displayName = liveName || existingName || "";
  const displayAddress = liveAddress || existingAddress || "";

  // Brief address summary for the collapsed header (first 2 lines)
  const addrLines = displayAddress.split("\n").filter(Boolean);
  const addrSummary = addrLines.slice(0, 2).join(", ");

  return (
    <div className="rounded-lg overflow-hidden border transition-all"
      style={{
        borderColor: addressIsSet
          ? isDark ? "rgba(74,222,128,0.3)" : "rgba(22,163,74,0.3)"
          : `${NAVY}55`,
        borderStyle: addressIsSet ? "solid" : "dashed",
        background: addressIsSet
          ? isDark ? "rgba(21,128,61,0.12)" : "rgba(240,253,244,1)"
          : isDark ? `${NAVY}0d` : `${NAVY}06`,
      }}
    >
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4 text-left transition-colors"
        style={{ background: "transparent" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: addressIsSet
                ? isDark ? "rgba(21,128,61,0.25)" : "rgba(22,163,74,0.15)"
                : `${NAVY}15`,
            }}
          >
            {addressIsSet
              ? <CheckCircle2 className="w-4 h-4" style={{ color: isDark ? "#4ade80" : "#16a34a" }} />
              : <MapPin className="w-4 h-4" style={{ color: NAVY }} />
            }
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold leading-tight" style={{
                color: addressIsSet
                  ? isDark ? "#4ade80" : "#15803d"
                  : NAVY,
              }}>
                {addressIsSet ? "Delivery Address Added" : "Delivery Address"}
              </p>
              {!addressIsSet && (
                <span
                  className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md leading-none"
                  style={{
                    color: isDark ? "#FBBF24" : "#B45309",
                    background: isDark ? "rgba(251,191,36,0.14)" : "rgba(251,191,36,0.18)",
                    border: `1px solid ${isDark ? "rgba(251,191,36,0.35)" : "rgba(180,83,9,0.28)"}`,
                  }}
                >
                  Required
                </span>
              )}
            </div>
            {addressIsSet ? (
              <p className="text-xs mt-0.5 truncate" style={{ color: isDark ? "rgba(74,222,128,0.7)" : "#166534", maxWidth: "18rem" }}>
                {displayName}{addrSummary ? ` · ${addrSummary}` : ""}
              </p>
            ) : (
              <p className="text-xs mt-0.5" style={{ color: `${NAVY}88` }}>
                Tap to enter your delivery address
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {justSaved && (
            <span className="text-[11px] font-semibold hidden sm:inline"
              style={{ color: isDark ? "#4ade80" : "#16a34a" }}>
              Saved!
            </span>
          )}
          {addressIsSet && (
            <span
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors"
              style={{
                color: isDark ? "#4ade80" : "#15803d",
                borderColor: isDark ? "rgba(74,222,128,0.35)" : "rgba(22,163,74,0.4)",
                background: isDark ? "rgba(21,128,61,0.2)" : "rgba(220,252,231,0.8)",
              }}
            >
              <Pencil className="w-3 h-3" />
              Edit
            </span>
          )}
          {!addressIsSet && (
            <span
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
              style={{ background: NAVY, color: isDark ? "#0D1B2A" : "#FFFFFF" }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </span>
          )}
        </div>
      </button>

      {/* Address editor modal */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(null); }}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl"
          style={{ background: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: NAVY }}>
              {addressIsSet ? "Edit Delivery Address" : "Add Delivery Address"}
            </DialogTitle>
            <DialogDescription style={{ color: "var(--t-muted)" }}>
              Required for shipping — we only use this to deliver your order.
            </DialogDescription>
          </DialogHeader>
            <div className="space-y-3">

              {/* Saved account address autofill */}
              {savedAccountAddr && (
                <div className="p-3 rounded-xl flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3"
                  style={{ background: `${NAVY}0d`, border: `1px dashed ${NAVY}44` }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold" style={{ color: NAVY }}>Saved address on file</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: `${NAVY}88` }}>
                      {[savedAccountAddr.addressLine1, savedAccountAddr.addressCity, savedAccountAddr.addressPostcode].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={applySavedAddress}
                    className="shrink-0 self-start sm:self-center text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all hover:brightness-95 active:scale-[0.97]"
                    style={{ background: `${NAVY}15`, borderColor: `${NAVY}44`, color: NAVY }}
                  >
                    Use this
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3" autoComplete="on">
                <div>
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>Full Name</label>
                  <Input value={name} onChange={e => setName(e.target.value)}
                    placeholder="Your full name" disabled={saving} maxLength={100} autoComplete="name"
                    className="rounded-xl" style={navyInputStyle} />
                </div>

                <div ref={suggestRef} className="relative">
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>Address Line 1</label>
                  <Input
                    value={addr1}
                    onChange={e => { setAddr1(e.target.value); fetchSuggestions(e.target.value); }}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="Start typing your address…"
                    disabled={saving}
                    maxLength={200}
                    autoComplete="off"
                    className="rounded-xl"
                    style={navyInputStyle}
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl shadow-xl overflow-y-auto max-h-48 border"
                      style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                      {suggestions.map(s => (
                        <button
                          key={s.place_id}
                          type="button"
                          className="w-full text-left px-3 py-2.5 text-sm border-b last:border-b-0 flex items-start gap-2 transition-colors hover:opacity-80"
                          style={{ borderColor: "var(--t-border)", color: "var(--t-text)" }}
                          onMouseDown={() => applySuggestion(s)}
                        >
                          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: NAVY }} />
                          <span className="leading-snug">{s.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
                    Address Line 2 <span className="font-normal" style={{ color: `${NAVY}66` }}>(optional)</span>
                  </label>
                  <Input value={addr2} onChange={e => setAddr2(e.target.value)}
                    placeholder="Apartment, flat, etc." disabled={saving} maxLength={200} autoComplete="address-line2"
                    className="rounded-xl" style={navyInputStyle} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>City</label>
                    <Input value={city} onChange={e => setCity(e.target.value)}
                      placeholder="City" disabled={saving} maxLength={100} autoComplete="address-level2"
                      className="rounded-xl" style={navyInputStyle} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>Postcode</label>
                    <Input value={post} onChange={e => setPost(e.target.value)}
                      placeholder="Postcode" disabled={saving} maxLength={20} autoComplete="postal-code"
                      className="rounded-xl" style={navyInputStyle} />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>Country</label>
                  <select
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    disabled={saving}
                    className="w-full h-11 px-4 rounded-xl text-sm border outline-none focus:ring-2 appearance-none"
                    style={{ ...navyInputStyle, cursor: "pointer", background: "var(--t-surface)", color: "var(--t-text)" }}
                  >
                    <option value="">Select country…</option>
                    {Object.entries(SHIP_COUNTRIES).map(([code, label]) => (
                      <option key={code} value={label}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
                    Email <span className="font-normal" style={{ color: `${NAVY}66` }}>(optional)</span>
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={saving}
                    maxLength={200}
                    autoComplete="email"
                    className="rounded-xl"
                    style={navyInputStyle}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
                    Phone <span className="font-normal" style={{ color: `${NAVY}66` }}>(optional)</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={phonePrefix}
                      onChange={e => setPhonePrefix(e.target.value)}
                      disabled={saving}
                      className="h-11 px-2 rounded-xl text-sm border outline-none focus:ring-2 appearance-none shrink-0"
                      style={{ ...navyInputStyle, width: "106px", cursor: "pointer", background: "var(--t-surface)", color: "var(--t-text)" }}
                    >
                      {PHONE_PREFIXES.map(({ prefix, flag }) => (
                        <option key={prefix} value={prefix}>{flag} {prefix}</option>
                      ))}
                    </select>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="7700 123456"
                      disabled={saving}
                      maxLength={30}
                      autoComplete="tel-national"
                      className="flex-1 rounded-xl"
                      style={navyInputStyle}
                    />
                  </div>
                </div>

                {/* Delivery tips */}
                {deliveryTipsEnabled && deliveryTipsItems.length > 0 && (
                  <div className="rounded-xl p-3 space-y-2" style={{ background: `${NAVY}08`, border: `1px solid ${NAVY}22` }}>
                    <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: NAVY }}><Info className="w-3.5 h-3.5 shrink-0" /> Delivery tips</p>
                    <ul className="text-xs space-y-1" style={{ color: `${NAVY}bb` }}>
                      {deliveryTipsItems.map((item, i) => (
                        <li key={i}>• {item.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                          part.startsWith("**") && part.endsWith("**")
                            ? <strong key={j}>{part.slice(2, -2)}</strong>
                            : part
                        )}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {error && <p className="text-xs text-destructive font-medium">{error}</p>}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setError(null); }}
                    disabled={saving}
                    className="flex-1 h-11 rounded-xl text-sm font-semibold border transition-all hover:brightness-95 active:scale-[0.98]"
                    style={{ borderColor: `${NAVY}33`, color: NAVY, background: "var(--t-surface)" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]"
                    style={{
                      background: saving || !name.trim() || !addr1.trim() || !city.trim() || !post.trim()
                        ? `${NAVY}70`
                        : NAVY,
                    }}
                    disabled={saving || !name.trim() || !addr1.trim() || !city.trim() || !post.trim()}
                  >
                    {saving
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
                      : addressIsSet ? "Update Address" : "Save Address"}
                  </button>
                </div>
              </form>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AccountQrSection({
  orderId,
  uploadEndpoint,
  label,
  existingQr,
  customMessage,
  onUploaded,
}: {
  orderId: string;
  uploadEndpoint: string;
  label: string;
  existingQr: string | null;
  customMessage?: string;
  onUploaded: (qr: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(existingQr);

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
      const res = await fetch(`/api/account/orders/${orderId}/${uploadEndpoint}`, {
        method: "POST",
        credentials: "include",
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
    a.download = isPdfPreview ? `${uploadEndpoint}.pdf` : `${uploadEndpoint}.png`;
    a.click();
  };

  return (
    <Card className="p-5 rounded-lg shadow-none" style={{ border: "1px solid var(--t-border)", background: "var(--t-surface)", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
          <QrCode className="w-4 h-4 text-violet-700 dark:text-violet-300" />
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: "var(--t-text)" }}>{label}</p>
          <p className="text-xs" style={{ color: "var(--t-muted)" }}>
            {previewSrc
              ? "Your file is saved."
              : "Upload your QR code or label"}
          </p>
        </div>
      </div>

      {!previewSrc && (
        <p className="text-xs mb-3 leading-relaxed whitespace-pre-line" style={{ color: "var(--t-muted)" }}>
          {customMessage ?? "Once the organiser confirms your order is ready to ship, upload your QR code here."}
        </p>
      )}

      {previewSrc && (
        <div className="mb-3">
          {isPdfPreview ? (
            <div className="w-48 h-24 mx-auto rounded-lg border border-violet-200 dark:border-violet-700/50 bg-white dark:bg-violet-950/50 flex flex-col items-center justify-center gap-1 p-2">
              <span className="text-2xl">📄</span>
              <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">PDF uploaded</span>
            </div>
          ) : (
            <img
              src={previewSrc}
              alt={label}
              className="w-48 h-48 object-contain mx-auto rounded-lg border border-violet-200 dark:border-violet-700/50 bg-white dark:bg-white/5 p-2"
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

const PARCEL_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  registered:    { label: "Registered",    color: "#64748B", bg: "rgba(100,116,139,0.15)" },
  in_transit:    { label: "In Transit",    color: "var(--t-blue)", bg: "var(--t-blue-15)"  },
  out_for_delivery: { label: "Out for Delivery", color: "#7C3AED", bg: "rgba(124,58,237,0.12)" },
  delivered:     { label: "Delivered",     color: "#16A34A", bg: "rgba(22,163,74,0.12)"   },
  exception:     { label: "Exception",     color: "#DC2626", bg: "rgba(220,38,38,0.12)"   },
  expired:       { label: "Expired",       color: "#94A3B8", bg: "rgba(148,163,184,0.12)" },
};

function ParcelCard({ parcel }: { parcel: GbParcel }) {
  const meta = PARCEL_STATUS_META[parcel.status ?? ""] ?? { label: parcel.status ?? "Pending", color: "#94A3B8", bg: "rgba(148,163,184,0.12)" };
  return (
    <div className="bg-white/10 border border-white/10 rounded-lg p-3 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {parcel.label && (
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-0.5">{parcel.label}</p>
          )}
          <p className="font-mono font-bold text-white text-sm tracking-widest">{parcel.maskedTrackingNumber}</p>
          {parcel.carrier && (
            <p className="text-[11px] text-white/60 mt-0.5">{parcel.carrier}</p>
          )}
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5"
          style={{ color: meta.color, background: meta.bg }}
        >
          {meta.label}
        </span>
      </div>
      {parcel.items.length > 0 && (
        <div className="border-t border-white/10 pt-2 space-y-0.5">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Contents</p>
          {parcel.items.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Package className="w-3 h-3 text-white/30 shrink-0" />
              <span className="text-xs text-white/70">{item.name}</span>
            </div>
          ))}
        </div>
      )}
      {parcel.lastChecked && (
        <p className="text-[10px] text-white/30">
          Last updated {new Date(parcel.lastChecked).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </p>
      )}
    </div>
  );
}

function BalancePayDetail({
  rows,
  note,
  copied,
  onCopy,
}: {
  rows: { label: string; value: string; copyValue?: string; mono?: boolean }[];
  note?: string;
  copied: string;
  onCopy: (label: string, value: string) => void;
}) {
  return (
    <div className="rounded-xl mb-3" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
      {rows.map((r, i) => (
        <div
          key={r.label}
          className="flex items-center justify-between gap-2 px-3 py-2"
          style={{ borderTop: i === 0 ? "none" : "1px solid var(--t-border)" }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: "var(--t-subtle)" }}>{r.label}</p>
            <p
              className={cn("text-xs mt-0.5 break-all", r.mono ? "font-mono" : "font-semibold")}
              style={{ color: "var(--t-text)" }}
            >
              {r.value}
            </p>
          </div>
          {r.copyValue && (
            <button
              type="button"
              onClick={() => onCopy(r.label, r.copyValue!)}
              className="shrink-0 p-1.5 rounded-md"
              style={{ background: "var(--t-surface)", color: "var(--t-muted)", border: "1px solid var(--t-border)" }}
              title="Copy"
            >
              {copied === r.label ? <Check className="w-3.5 h-3.5" style={{ color: "#10B981" }} /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      ))}
      {note && (
        <div
          className="px-3 py-2 text-[11px]"
          style={{ borderTop: "1px solid var(--t-border)", background: "rgba(245,158,11,0.06)", color: "var(--t-muted)" }}
        >
          {note}
        </div>
      )}
    </div>
  );
}

function BalanceDueCard({
  orderId,
  amountDue,
  currency,
  hasBalanceScreenshot,
  balanceTxHash,
  balancePaymentStatus,
  onUploaded,
  onBalanceStatusChange,
}: {
  orderId: string;
  amountDue: number;
  currency: string | null | undefined;
  hasBalanceScreenshot: boolean;
  balanceTxHash: string | null;
  balancePaymentStatus: string | null;
  onUploaded: () => void;
  onBalanceStatusChange: (status: string, txHash?: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [done, setDone] = useState(hasBalanceScreenshot);
  const [viewing, setViewing] = useState<string | null>(null);

  // Crypto TX hash submission state
  const [txHash, setTxHash] = useState<string>("");
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<{ kind: "ok" | "err" | "pending" | "underpaid"; text: string; shortfall?: number; amountPaid?: number; currency?: string } | null>(null);

  // AnonPay state — hydrate iframe from any persisted session ID so the user
  // sees their in-flight payment after a reload/navigation.
  const initialAnonIframe = (() => {
    const prefix = "anonpay:";
    if (!balanceTxHash?.startsWith(prefix)) return null;
    const sessionId = balanceTxHash.slice(prefix.length);
    if (!sessionId) return null;
    return `https://trocador.app/en/anonpay/${encodeURIComponent(sessionId)}?embed=1`;
  })();
  const [anonIframe, setAnonIframe] = useState<string | null>(initialAnonIframe);
  const [anonInitLoading, setAnonInitLoading] = useState(false);
  const [anonConfirming, setAnonConfirming] = useState(false);
  const [anonStatus, setAnonStatus] = useState<string>("");
  const [anonErr, setAnonErr] = useState<string>("");

  // Fiat confirmation state
  const [fiatConfirming, setFiatConfirming] = useState(false);
  const [fiatErr, setFiatErr] = useState<string>("");

  const isAnonPaySession = !!balanceTxHash?.startsWith("anonpay:");
  const balanceConfirmed = balancePaymentStatus === "confirmed";
  const balancePending = balancePaymentStatus === "pending_confirmation";

  type PayMethod = "crypto" | "revolut" | "paypal" | "anonpay";
  const [payInfo, setPayInfo] = useState<{
    revolutHandle: string | null;
    paypalHandle: string | null;
    cryptoWalletAddress: string | null;
    cryptoCurrency: string | null;
    cryptoNetwork: string | null;
    anonPayEnabled: boolean;
    anonPayWallet: string | null;
    anonPayTicker: string | null;
    anonPayNetwork: string | null;
    availableCryptoOptions: { currency: string; network: string }[];
  } | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PayMethod | null>(null);
  const [selectedCrypto, setSelectedCrypto] = useState<string>("");
  const [copied, setCopied] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/payments-info?orderId=${encodeURIComponent(orderId)}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        const info = {
          revolutHandle: d.revolutHandle ?? null,
          paypalHandle: d.paypalHandle ?? null,
          cryptoWalletAddress: d.cryptoWalletAddress ?? d.walletAddress ?? null,
          cryptoCurrency: d.cryptoCurrency ?? "USDT",
          cryptoNetwork: d.cryptoNetwork ?? "ERC-20",
          anonPayEnabled: !!d.anonPayEnabled && !!d.anonPayWallet,
          anonPayWallet: d.anonPayWallet ?? null,
          anonPayTicker: d.anonPayTicker ?? null,
          anonPayNetwork: d.anonPayNetwork ?? null,
          availableCryptoOptions: Array.isArray(d.availableCryptoOptions) ? d.availableCryptoOptions : [],
        };
        setPayInfo(info);
        setSelectedCrypto((info.cryptoCurrency || "USDT").toUpperCase());
        const first: PayMethod | null =
          info.cryptoWalletAddress ? "crypto" :
          info.revolutHandle ? "revolut" :
          info.paypalHandle ? "paypal" :
          info.anonPayEnabled ? "anonpay" : null;
        setSelectedMethod(first);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [orderId]);

  const copy = (label: string, value: string) => {
    void navigator.clipboard?.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(c => (c === label ? "" : c)), 1500);
  };

  const pickFile = (file: File | null) => {
    setErr("");
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      setErr("Screenshot must be a JPG or PNG.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErr("Screenshot must be under 15 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      setDataUrl(e.target?.result as string);
      setFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!dataUrl) return;
    setUploading(true);
    setErr("");
    try {
      const res = await fetch(`/api/account/orders/${orderId}/balance-screenshot`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenshot: dataUrl }),
      });
      if (res.ok) {
        setDone(true);
        setDataUrl(null);
        setFileName("");
        onUploaded();
      } else {
        const d = await res.json().catch(() => ({}));
        setErr((d as { error?: string }).error || "Upload failed.");
      }
    } catch {
      setErr("Network error. Please try again.");
    }
    setUploading(false);
  };

  // ── Crypto TX hash submission ───────────────────────────────
  const submitTxHash = async () => {
    const cleaned = txHash.trim();
    if (!cleaned) return;
    setVerifying(true);
    setVerifyMsg(null);
    try {
      const res = await fetch(`/api/account/orders/${orderId}/balance-pay`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedCrypto ? { txHash: cleaned, cryptoCurrency: selectedCrypto } : { txHash: cleaned }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVerifyMsg({ kind: "err", text: (d as { error?: string }).error || "Submission failed." });
      } else if (d.verified) {
        setVerifyMsg({ kind: "ok", text: "Payment verified on-chain. Thank you!" });
        onBalanceStatusChange("confirmed", cleaned);
      } else if (d.pending) {
        setVerifyMsg({ kind: "pending", text: d.reason || "Transaction not yet mined — wait a minute and try again." });
      } else if (d.underpayment) {
        setVerifyMsg({ kind: "underpaid", text: d.reason, shortfall: d.shortfall, amountPaid: d.amountPaid, currency: d.currency });
      } else {
        setVerifyMsg({ kind: "err", text: d.reason || "Could not verify the transaction. Your organiser will check it manually." });
      }
    } catch {
      setVerifyMsg({ kind: "err", text: "Network error. Please try again." });
    }
    setVerifying(false);
  };

  // ── AnonPay flow ────────────────────────────────────────────
  const initAnonPay = async () => {
    setAnonInitLoading(true);
    setAnonErr("");
    try {
      const res = await fetch(`/api/account/orders/${orderId}/balance-init-anonpay`, {
        method: "POST", credentials: "include",
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAnonErr((d as { error?: string }).error || "Could not start AnonPay session.");
      } else if (d.iframeUrl) {
        setAnonIframe(d.iframeUrl);
      }
    } catch {
      setAnonErr("Network error. Please try again.");
    }
    setAnonInitLoading(false);
  };

  const confirmAnonPayInitiation = async () => {
    setAnonConfirming(true);
    setAnonErr("");
    try {
      const res = await fetch(`/api/account/orders/${orderId}/confirm-balance-anonpay`, {
        method: "POST", credentials: "include",
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAnonErr((d as { error?: string }).error || "Could not confirm initiation.");
      } else {
        onBalanceStatusChange(d.balancePaymentStatus || "pending_confirmation");
      }
    } catch {
      setAnonErr("Network error. Please try again.");
    }
    setAnonConfirming(false);
  };

  // Poll AnonPay status while pending
  useEffect(() => {
    if (!balancePending || !isAnonPaySession || balanceConfirmed) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/account/orders/${orderId}/balance-anonpay-status`, { credentials: "include" });
        const d = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (d.status) setAnonStatus(String(d.status));
        if (d.balancePaymentStatus === "confirmed") {
          onBalanceStatusChange("confirmed");
        }
      } catch { /* ignore transient errors */ }
    };
    tick();
    const id = window.setInterval(tick, 15000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [orderId, balancePending, isAnonPaySession, balanceConfirmed, onBalanceStatusChange]);

  // ── Fiat (Revolut/PayPal) confirm submission ────────────────
  const confirmFiat = async (method: "revolut" | "paypal") => {
    setFiatConfirming(true);
    setFiatErr("");
    try {
      const res = await fetch(`/api/account/orders/${orderId}/balance-confirm-fiat`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFiatErr((d as { error?: string }).error || "Could not submit. Please try again.");
      } else {
        onBalanceStatusChange(d.balancePaymentStatus || "pending_confirmation", `fiat:${method}`);
      }
    } catch {
      setFiatErr("Network error. Please try again.");
    }
    setFiatConfirming(false);
  };

  const viewExisting = async () => {
    setViewing("loading");
    try {
      const res = await fetch(`/api/account/orders/${orderId}/balance-screenshot`, { credentials: "include" });
      const d = await res.json();
      setViewing(d.balanceScreenshot ?? null);
    } catch {
      setViewing(null);
    }
  };

  return (
    <div
      className="rounded-lg p-4 mt-3"
      style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "rgba(245,158,11,0.18)" }}
        >
          <AlertCircle className="w-4 h-4" style={{ color: "#F59E0B" }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: "#F59E0B" }}>
            You owe {fmtC(amountDue, currency)}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--t-muted)" }}>
            Extra charges (e.g. international shipping) were added after your initial payment. Pick a payment method below, send the amount to the organiser, then upload a screenshot of the payment so they can confirm.
          </p>
        </div>
      </div>

      {payInfo && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: "rgba(245,158,11,0.2)" }}>
          {(() => {
            const methods: { key: PayMethod; label: string; available: boolean }[] = [
              { key: "crypto",  label: payInfo.cryptoCurrency ? payInfo.cryptoCurrency : "Crypto", available: !!payInfo.cryptoWalletAddress },
              { key: "revolut", label: "Revolut",  available: !!payInfo.revolutHandle },
              { key: "paypal",  label: "PayPal",   available: !!payInfo.paypalHandle },
              { key: "anonpay", label: "AnonPay",  available: payInfo.anonPayEnabled },
            ].filter(m => m.available);

            if (methods.length === 0) {
              return (
                <p className="text-xs" style={{ color: "var(--t-muted)" }}>
                  No payment methods are configured for this order. Please contact the organiser directly.
                </p>
              );
            }

            return (
              <>
                <p className="text-[11px] font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>Pay using</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {methods.map(m => {
                    const active = selectedMethod === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setSelectedMethod(m.key)}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                        style={{
                          background: active ? "#F59E0B" : "var(--t-surface)",
                          color: active ? "#0a0a0a" : "var(--t-muted)",
                          border: `1px solid ${active ? "#F59E0B" : "var(--t-border)"}`,
                        }}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>

                {selectedMethod === "crypto" && payInfo.cryptoWalletAddress && (() => {
                  const activeCrypto = (selectedCrypto || payInfo.cryptoCurrency || "USDT").toUpperCase();
                  const activeNetwork =
                    payInfo.availableCryptoOptions.find(o => o.currency.toUpperCase() === activeCrypto)?.network
                    || payInfo.cryptoNetwork || "ERC-20";
                  return (
                  <>
                    {payInfo.availableCryptoOptions.length > 1 && (
                      <div className="mb-3">
                        <p className="text-[11px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>Pay with</p>
                        <div className="flex flex-wrap gap-1.5">
                          {payInfo.availableCryptoOptions.map(opt => {
                            const cur = opt.currency.toUpperCase();
                            const active = activeCrypto === cur;
                            return (
                              <button
                                key={cur}
                                type="button"
                                onClick={() => { setSelectedCrypto(cur); setVerifyMsg(null); }}
                                className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                                style={{
                                  background: active ? "#F59E0B" : "var(--t-surface)",
                                  color: active ? "#0a0a0a" : "var(--t-muted)",
                                  border: `1px solid ${active ? "#F59E0B" : "var(--t-border)"}`,
                                }}
                              >
                                {cur}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <BalancePayDetail
                      rows={[
                        { label: "Amount", value: `${fmtC(amountDue, currency)} (in ${activeCrypto})`, copyValue: String(amountDue) },
                        { label: "Network", value: activeNetwork },
                        { label: `${activeCrypto} wallet`, value: payInfo.cryptoWalletAddress, copyValue: payInfo.cryptoWalletAddress, mono: true },
                      ]}
                      note={`Only send ${activeCrypto} on the ${activeNetwork} network. Other chains = lost funds.`}
                      copied={copied}
                      onCopy={copy}
                    />
                    {!balanceConfirmed && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>Paste your transaction hash</p>
                        <Input
                          value={txHash}
                          onChange={e => { setTxHash(e.target.value); setVerifyMsg(null); }}
                          placeholder="0x… (Ethereum / BSC) or 64-char hex (BTC)"
                          className="font-mono text-xs"
                          style={{ background: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
                          disabled={verifying}
                        />
                        <button
                          type="button"
                          onClick={submitTxHash}
                          disabled={verifying || !txHash.trim()}
                          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-60"
                          style={{ background: "#F59E0B", color: "#0a0a0a" }}
                        >
                          {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          {verifying ? "Verifying on-chain…" : "Submit & verify"}
                        </button>
                        {verifyMsg && verifyMsg.kind === "underpaid" ? (
                          <div className="rounded-md px-3 py-2.5 text-xs space-y-1" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.35)", color: "light-dark(#92400E, #E8C488)" }}>
                            <p className="font-bold">⚠️ Underpayment detected</p>
                            <p>You sent <strong>{verifyMsg.amountPaid} {verifyMsg.currency ?? "USDT"}</strong> but <strong>{((verifyMsg.amountPaid ?? 0) + (verifyMsg.shortfall ?? 0)).toFixed(2)} {verifyMsg.currency ?? "USDT"}</strong> was expected.</p>
                            <p>You are short by <strong>{verifyMsg.shortfall} {verifyMsg.currency ?? "USDT"}</strong>. Please send the remaining amount to the same wallet address and submit that transaction hash. Your organiser has been notified.</p>
                          </div>
                        ) : verifyMsg && (
                          <div
                            className="text-xs px-2.5 py-1.5 rounded-md"
                            style={{
                              background: verifyMsg.kind === "ok" ? "rgba(16,185,129,0.12)" : verifyMsg.kind === "pending" ? "rgba(245,158,11,0.12)" : "rgba(248,113,113,0.12)",
                              color: verifyMsg.kind === "ok" ? "#10B981" : verifyMsg.kind === "pending" ? "#F59E0B" : "#F87171",
                              border: `1px solid ${verifyMsg.kind === "ok" ? "rgba(16,185,129,0.3)" : verifyMsg.kind === "pending" ? "rgba(245,158,11,0.3)" : "rgba(248,113,113,0.3)"}`,
                            }}
                          >
                            {verifyMsg.text}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                  );
                })()}
                {selectedMethod === "revolut" && payInfo.revolutHandle && (
                  <BalancePayDetail
                    rows={[
                      { label: "Amount", value: fmtC(amountDue, currency), copyValue: amountDue.toFixed(2) },
                      { label: "Revolut handle", value: payInfo.revolutHandle, copyValue: payInfo.revolutHandle, mono: true },
                    ]}
                    note="Send via Revolut, then upload a screenshot of the transfer below."
                    copied={copied}
                    onCopy={copy}
                  />
                )}
                {selectedMethod === "paypal" && payInfo.paypalHandle && (
                  <BalancePayDetail
                    rows={[
                      { label: "Amount", value: fmtC(amountDue, currency), copyValue: amountDue.toFixed(2) },
                      { label: "PayPal", value: payInfo.paypalHandle, copyValue: payInfo.paypalHandle, mono: true },
                    ]}
                    note="Send as Friends & Family if possible, then upload a screenshot of the transfer."
                    copied={copied}
                    onCopy={copy}
                  />
                )}
                {selectedMethod === "anonpay" && payInfo.anonPayEnabled && (
                  <div className="space-y-2">
                    {!anonIframe && !balanceConfirmed && !balancePending && (
                      <button
                        type="button"
                        onClick={initAnonPay}
                        disabled={anonInitLoading}
                        className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-60"
                        style={{ background: "#F59E0B", color: "#0a0a0a" }}
                      >
                        {anonInitLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        {anonInitLoading ? "Starting AnonPay session…" : "Pay with AnonPay"}
                      </button>
                    )}
                    {anonIframe && !balanceConfirmed && (
                      <>
                        <div className="rounded-xl overflow-hidden" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                          <iframe
                            src={anonIframe}
                            title="AnonPay"
                            className="w-full"
                            style={{ height: 520, border: "none" }}
                            allow="clipboard-write"
                          />
                        </div>
                        {!balancePending && (
                          <button
                            type="button"
                            onClick={confirmAnonPayInitiation}
                            disabled={anonConfirming}
                            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-60"
                            style={{ background: "#F59E0B", color: "#0a0a0a" }}
                          >
                            {anonConfirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            {anonConfirming ? "Confirming…" : "I've initiated the payment"}
                          </button>
                        )}
                        {balancePending && (
                          <p className="text-[11px] text-center" style={{ color: "var(--t-muted)" }}>
                            Waiting for AnonPay to confirm{anonStatus ? ` — current status: ${anonStatus}` : "…"}
                          </p>
                        )}
                      </>
                    )}
                    {anonErr && <p className="text-xs" style={{ color: "#F87171" }}>{anonErr}</p>}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {balanceConfirmed && (
        <div
          className="mt-3 pt-3 border-t flex items-center gap-2"
          style={{ borderColor: "rgba(16,185,129,0.3)" }}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#10B981" }} />
          <span className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>Balance payment confirmed — thank you!</span>
        </div>
      )}

      {!balanceConfirmed && balancePending && !isAnonPaySession && (
        <div
          className="mt-3 pt-3 border-t flex items-center gap-2"
          style={{ borderColor: "rgba(245,158,11,0.3)" }}
        >
          <Loader2 className="w-4 h-4 shrink-0 animate-spin" style={{ color: "#F59E0B" }} />
          <span className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>Submitted — waiting for organiser to confirm.</span>
        </div>
      )}

      {!balanceConfirmed && (selectedMethod === "revolut" || selectedMethod === "paypal") && (
      <div className="mt-3 pt-3 border-t" style={{ borderColor: "rgba(245,158,11,0.2)" }}>
        {done && !dataUrl ? (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#10B981" }} />
              <span className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>
                {balancePending ? "Proof submitted — waiting for organiser" : "Proof uploaded — confirm below to notify organiser"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={viewExisting}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                style={{ background: "var(--t-surface2)", color: "var(--t-muted)", border: "1px solid var(--t-border)" }}
              >
                View
              </button>
              <button
                type="button"
                onClick={() => { setDone(false); fileRef.current?.click(); }}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                style={{ background: "rgba(245,158,11,0.18)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.35)" }}
              >
                Replace
              </button>
            </div>
          </div>
        ) : (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              className="hidden"
              onChange={e => pickFile(e.target.files?.[0] ?? null)}
            />
            {!dataUrl ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px dashed rgba(245,158,11,0.5)" }}
              >
                <ImagePlus className="w-3.5 h-3.5" />
                Upload payment screenshot (JPG / PNG, max 15 MB)
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                  <ImagePlus className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--t-muted)" }} />
                  <span className="text-xs truncate flex-1" style={{ color: "var(--t-text)" }}>{fileName}</span>
                  <button
                    type="button"
                    onClick={() => { setDataUrl(null); setFileName(""); }}
                    className="transition-colors hover:opacity-70"
                    style={{ color: "var(--t-muted)" }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{ background: "var(--t-surface2)", color: "var(--t-muted)", border: "1px solid var(--t-border)" }}
                  >
                    Choose another
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={uploading}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-60"
                    style={{ background: "#F59E0B", color: "#0a0a0a" }}
                  >
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {uploading ? "Uploading…" : "Submit proof"}
                  </button>
                </div>
              </div>
            )}
            {err && <p className="text-xs mt-2" style={{ color: "#F87171" }}>{err}</p>}
          </>
        )}

        {done && !balancePending && !balanceConfirmed && (selectedMethod === "revolut" || selectedMethod === "paypal") && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => confirmFiat(selectedMethod as "revolut" | "paypal")}
              disabled={fiatConfirming}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-60"
              style={{ background: "#F59E0B", color: "#0a0a0a" }}
            >
              {fiatConfirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {fiatConfirming ? "Submitting…" : `I've sent the payment via ${selectedMethod === "revolut" ? "Revolut" : "PayPal"}`}
            </button>
            {fiatErr && <p className="text-xs mt-1" style={{ color: "#F87171" }}>{fiatErr}</p>}
          </div>
        )}
      </div>
      )}

      {viewing && viewing !== "loading" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 cursor-zoom-out"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setViewing(null)}
        >
          <img src={viewing} alt="Balance payment proof" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}

function DirectShippingToggle({
  orderId,
  value,
  onChange,
}: {
  orderId: string;
  value: boolean;
  onChange: (val: boolean, data: { directShippingCost: number | null; vendorShipping: number; grandTotal: number }) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setSaving(true);
    setError(null);
    const next = !value;
    try {
      const res = await fetch(`/api/account/orders/${orderId}/direct-shipping`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ directShippingRequested: next }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to update preference");
      onChange(next, {
        directShippingCost: j.directShippingCost ?? null,
        vendorShipping: j.vendorShipping ?? 0,
        grandTotal: j.grandTotal,
      });
    } catch (err: any) {
      setError(err.message || "Failed to update preference");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        className="w-full rounded-xl px-4 py-3 flex items-center gap-3 text-left transition-all disabled:opacity-60"
        style={{
          background: value ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.04)",
          border: `1.5px solid ${value ? "rgba(99,102,241,0.45)" : "rgba(255,255,255,0.1)"}`,
        }}
      >
        <Home className="w-5 h-5 shrink-0" style={{ color: value ? "#a5b4fc" : "rgba(255,255,255,0.6)" }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: value ? "#a5b4fc" : "rgba(255,255,255,0.85)" }}>
            I want direct shipping to my home address
          </p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            {value ? "Tap to cancel this preference" : "Tap to request home delivery instead of a reshipper"}
          </p>
        </div>
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: "rgba(255,255,255,0.4)" }} />
        ) : (
          <div
            className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors"
            style={{
              borderColor: value ? "#6366f1" : "rgba(255,255,255,0.2)",
              background: value ? "#6366f1" : "transparent",
            }}
          >
            {value && <Check className="w-3 h-3 text-white" />}
          </div>
        )}
      </button>
      {error && <p className="text-xs px-1" style={{ color: "#f87171" }}>{error}</p>}
    </div>
  );
}

/** Dashboard chrome (sidebar + header) for logged-in customers, mirroring WholesaleShell. */
function OrderDetailShell({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();
  const { account, isLoggedIn } = useAccount();
  const { data: ordersData } = useAccountOrders(null, isLoggedIn);
  const logoutMutation = useLogout();
  const [hubMoreOpen, setHubMoreOpen] = useState(false);
  const handleLogout = () => { logoutMutation.mutate(); navigate("/"); };
  const goSection = (s: string) =>
    navigate(s === "home" ? "/account" : `/account?s=${encodeURIComponent(s)}`);

  const navProps = {
    section: "orders",
    setSection: goSection,
    hubMoreOpen,
    setHubMoreOpen,
    account,
  } as unknown as PortalNavProps;

  return (
    <DashboardShell
      activeSection="orders"
      title="Order Details"
      username={account?.telegramUsername ?? ""}
      credits={account?.credits ?? null}
      orders={(ordersData ?? []) as DashOrder[]}
      activeCompounds={[]}
      groupBuys={[]}
      onSection={goSection}
      onLogout={handleLogout}
      navProps={navProps}
    >
      {children}
    </DashboardShell>
  );
}

export default function AccountOrderDetail() {
  const [, params] = useRoute("/account/orders/:id");
  const [, setLocation] = useLocation();
  const { account, isLoggedIn, isLoading: accountLoading } = useAccount();
  const { loadExistingOrder, startTopUpOrder, orderId: draftOrderId, clearOrderId: clearDraftOrderId } = useDraftStore();

  const orderId = params?.id ?? null;
  const isAdminPreview = new URLSearchParams(window.location.search).get("adminPreview") === "1";
  const adminPreviewSecret = isAdminPreview
    ? (new URLSearchParams(window.location.hash.slice(1)).get("s") ?? localStorage.getItem("peps_admin_preview_secret") ?? "")
    : "";

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [voteLoading, setVoteLoading] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [accountCredits, setAccountCredits] = useState(0);
  const [applyingCredits, setApplyingCredits] = useState(false);
  const [creditsError, setCreditsError] = useState<string | null>(null);

  const isPaidOrder = order?.paymentStatus === "confirmed" || order?.paymentStatus === "test_confirmed";
  // Direct-shipping orders have their own tracking number on the order — don't show GB parcel tracking
  const isDirectOrder = order?.routingType === "direct" ||
    (order?.routingType !== "reshipper" && order?.directShippingRequested === true);
  const { data: parcels = [], isLoading: parcelsLoading } = useOrderParcels(
    isPaidOrder && !isDirectOrder ? order?.groupBuyId : null
  );

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    const url = isAdminPreview
      ? `/api/admin/orders/${orderId}/customer-view`
      : `/api/account/orders/${orderId}`;
    const opts: RequestInit = isAdminPreview
      ? { headers: { "x-admin-secret": adminPreviewSecret } }
      : { credentials: "include" };
    fetch(url, opts)
      .then(r => r.ok ? r.json() : r.json().then(j => Promise.reject(j.error || "Order not found")))
      .then(data => { setOrder(data); setLoading(false); })
      .catch(err => { setError(typeof err === "string" ? err : "Failed to load order"); setLoading(false); });
  }, [orderId]);

  useEffect(() => {
    if (isAdminPreview) return;
    fetch("/api/account/me", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && typeof d.credits === "number" && d.credits > 0) setAccountCredits(d.credits); })
      .catch(() => {});
  }, []);

  const handleEdit = () => {
    if (!order) return;
    // Shared wholesale orders are managed from the shared order page — their items and
    // shipping split are frozen at lock time and can't be edited individually.
    if (order.orderType === "wholesale_shared") return;
    if (order.orderType === "wholesale") {
      const quantities: Record<string, number> = {};
      for (const li of order.lineItems) {
        if (li.productId) quantities[li.productId] = li.quantity;
      }
      // The stored shippingAddress is a comma-joined string built from
      // [addrLine1, addrLine2?, addrCity, addrPostcode]. Parse it back so each
      // field lands in the correct input on the wholesale form.
      const parts = (order.shippingAddress ?? "").split(",").map(s => s.trim()).filter(Boolean);
      const addrLine1 = parts[0] ?? "";
      const addrPostcode = parts.length >= 3 ? (parts[parts.length - 1] ?? "") : "";
      const addrCity = parts.length >= 3 ? (parts[parts.length - 2] ?? "") : (parts[1] ?? "");
      const addrLine2 = parts.length >= 4 ? parts.slice(1, parts.length - 2).join(", ") : "";
      sessionStorage.setItem("peps:edit-wholesale", JSON.stringify({
        quantities,
        fullName: order.shippingName ?? "",
        phone: order.shippingPhone ?? "",
        email: order.shippingEmail ?? "",
        addrLine1,
        addrLine2,
        addrCity,
        addrPostcode,
        shippingCountry: order.shippingCountry ?? "",
        notes: (order.notes ?? "").split("\n").filter(l => !l.startsWith("Shipping region:")).join("\n").trim(),
        tip: order.tip ?? 0,
        orderId: order.id,
        code: order.code,
      }));
      setLocation("/wholesale");
      return;
    }
    loadExistingOrder(order);
    setLocation(order.groupBuyId ? `/order?gbId=${order.groupBuyId}` : "/order");
  };

  const handleTopUp = () => {
    if (!order) return;
    startTopUpOrder(order);
    setLocation(order.groupBuyId ? `/order?gbId=${order.groupBuyId}` : "/order");
  };

  const handleApplyCredits = async () => {
    if (!order || applyingCredits || accountCredits <= 0) return;
    // Round up to the nearest whole dollar: credits are integers so covering a fractional
    // order total (e.g. $30.99) requires 31 credits, not 30. Math.ceil ensures we deduct
    // enough so the backend auto-confirm check passes.
    const toApply = Math.min(accountCredits, Math.ceil(order.grandTotal - (order.creditsApplied ?? 0)));
    if (toApply <= 0) return;
    setApplyingCredits(true);
    setCreditsError(null);
    try {
      const res = await fetch("/api/account/use-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: toApply, orderId: order.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to apply credits");
      setAccountCredits(data.remaining ?? 0);
      setOrder(prev => prev ? { ...prev, creditsApplied: (prev.creditsApplied ?? 0) + (data.deducted ?? toApply) } : prev);
    } catch (err: any) {
      setCreditsError(err.message || "Failed to apply credits");
    } finally {
      setApplyingCredits(false);
    }
  };

  const handleVote = async (productId: string) => {
    if (!order || voteLoading) return;
    setVoteLoading(true);
    setVoteError(null);
    try {
      const res = await fetch(`/api/account/orders/${order.id}/test-vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ vote: productId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to cast vote");
      setOrder(prev => prev ? { ...prev, testVote: j.testVote } : prev);
    } catch (err: any) {
      setVoteError(err.message || "Failed to cast vote");
    } finally {
      setVoteLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!order || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/account/orders/${order.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to delete order");
      if (draftOrderId === order.id) clearDraftOrderId();
      setLocation("/account?s=orders");
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete order");
    }
    setDeleting(false);
  };

  const handleDownloadReceipt = () => {
    if (!order) return;
    const vendorShippingIsTbd = order.vendorShipping === 0 && !!order.groupBuyId && order.orderType !== "wholesale";
    const doc = generateReceiptPDF({
      code: order.code,
      telegramUsername: order.telegramUsername,
      deliveryMethod: order.deliveryMethod,
      deliveryPrice: order.deliveryPrice,
      productSubtotal: order.productSubtotal,
      tip: order.tip,
      grandTotal: order.grandTotal,
      creditsApplied: order.creditsApplied,
      amountDue: order.amountDue,
      notes: order.notes,
      lineItems: order.lineItems.map(li => ({
        productName: li.productName,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        lineTotal: li.lineTotal,
      })),
      createdAt: order.createdAt,
      groupBuyId: order.groupBuyId,
      currency: order.currency,
      vendorShippingAmount: order.vendorShipping > 0 ? order.vendorShipping : null,
      vendorShippingIsTbd,
      isWholesale: order.orderType === "wholesale",
      adminFeeAmount: (order as any).adminFee > 0 ? (order as any).adminFee : null,
      adminFeeLabel: (order as any).adminFeeLabel ?? null,
      shippingCarrier: (order as any).shippingCarrier ?? null,
    });
    doc.save(`receipt-${order.code}.pdf`);
  };

  // Logged-in customers get the dashboard chrome (sidebar navigation); admin
  // preview (and logged-out visitors) keep the plain public layout.
  const useDashChrome = !isAdminPreview && (isLoggedIn || accountLoading);
  const Chrome = useDashChrome ? OrderDetailShell : PageLayout;

  return (
    <Chrome>
      <div className="warm-order flex flex-col" style={{ background: "var(--t-bg)", minHeight: "100%" }}>
        <SiteAnnouncements />
        <main className={`flex-1 px-4 py-5 ${useDashChrome ? "pb-24 lg:pb-6" : "pb-24 md:pb-5"} max-w-md lg:max-w-2xl mx-auto w-full`}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {/* Back button */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setLocation("/account?s=orders")}
                className="flex items-center gap-2 text-sm font-semibold transition-colors hover:opacity-70"
                style={{ color: "var(--t-blue)" }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Orders
              </button>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--t-blue)" }} />
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="rounded-xl p-6 text-center border shadow-sm" style={{ background: "var(--t-surface)", borderColor: "rgba(239,68,68,0.25)" }}>
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <p className="font-semibold mb-1" style={{ color: "var(--t-text)" }}>Order not found</p>
                <p className="text-sm" style={{ color: "var(--t-subtle)" }}>{error}</p>
                <button
                  onClick={() => setLocation("/account?s=orders")}
                  className="mt-4 text-sm font-semibold underline"
                  style={{ color: "var(--t-blue)" }}
                >
                  Back to orders
                </button>
              </div>
            )}

            {/* Order detail */}
            <AnimatePresence>
              {!loading && order && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-4"
                >
                  {/* ===== Header (dashboard hero) ===== */}
                  {(() => {
                    const hst = STATUS_STYLE[order.status] ?? { label: order.status, color: "#fff", bg: "rgba(255,255,255,0.16)", pct: 0 };
                    const tlStages = [
                      { label: "Ordered", Icon: FileText },
                      { label: "Processing", Icon: PackageCheck },
                      { label: "Shipped", Icon: Truck },
                      { label: "Delivered", Icon: CheckCircle2 },
                    ];
                    const tlIdxMap: Record<string, number> = { Draft: 0, Submitted: 0, Processing: 1, Shipped: 2, Completed: 3 };
                    const tlCur = tlIdxMap[order.status] ?? 0;
                    return (
                      <div className="relative overflow-hidden" style={{ borderRadius: 24, background: HERO_GRAD, padding: "24px 26px 22px", boxShadow: "0 18px 40px -18px rgba(26,43,86,0.55)" }}>
                        <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 100% 0%, rgba(255,255,255,.12), transparent 55%), radial-gradient(90% 80% at 0% 100%, rgba(233,160,32,.24), transparent 60%)", pointerEvents: "none" }} />
                        <div className="relative flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold uppercase" style={{ fontSize: 11, letterSpacing: "0.12em", color: "rgba(255,255,255,.62)" }}>Order</p>
                            <h1 className="font-extrabold text-white tracking-widest" style={{ fontSize: 28, lineHeight: 1.1, marginTop: 4 }}>{order.code}</h1>
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 rounded-full font-bold" style={{ fontSize: 11.5, padding: "4px 11px", background: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.28)", color: "#fff" }}>
                                <span className="rounded-full" style={{ width: 6, height: 6, background: hst.color === "#fff" ? "#fff" : hst.color }} />
                                {hst.label}
                              </span>
                              {isPaidOrder && (
                                <span className="inline-flex items-center gap-1 rounded-full font-bold" style={{ fontSize: 11, padding: "4px 10px", background: "rgba(16,185,129,0.22)", border: "1px solid rgba(16,185,129,0.42)", color: "#d1fae5" }}>
                                  <CheckCircle2 className="w-3 h-3" /> Paid
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {order.status !== "Cancelled" && (
                          <div className="relative mt-4">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-semibold uppercase" style={{ fontSize: 9.5, letterSpacing: "0.08em", color: "rgba(255,255,255,.6)" }}>Fulfilment</span>
                              <span className="font-bold tabular-nums text-white" style={{ fontSize: 11 }}>{hst.pct}%</span>
                            </div>
                            <div className="rounded-full overflow-hidden" style={{ height: 6, background: "rgba(255,255,255,.16)" }}>
                              <div style={{ width: `${hst.pct}%`, height: "100%", background: "var(--warm-amber)", borderRadius: 999 }} />
                            </div>
                            {/* Timeline stepper */}
                            <div className="relative flex mt-4">
                              {tlStages.map((s, i) => {
                                const reached = i <= tlCur;
                                const active = i === tlCur;
                                const Icon = s.Icon;
                                return (
                                  <div key={s.label} className="relative flex-1 flex flex-col items-center min-w-0">
                                    {i > 0 && (
                                      <div className="absolute" style={{ top: 13, right: "50%", width: "100%", height: 2, background: reached ? "var(--warm-amber)" : "rgba(255,255,255,.18)" }} />
                                    )}
                                    <div className="relative z-10 rounded-full flex items-center justify-center shrink-0" style={{ width: 28, height: 28, background: reached ? "var(--warm-amber)" : "rgba(255,255,255,.12)", border: reached ? "none" : "1px solid rgba(255,255,255,.28)", color: reached ? "#1A2B56" : "rgba(255,255,255,.6)", boxShadow: active ? "0 0 0 3px rgba(233,160,32,.35)" : "none" }}>
                                      <Icon className="w-3.5 h-3.5" />
                                    </div>
                                    <p className="mt-1.5 font-semibold text-center leading-tight px-0.5" style={{ fontSize: 10.5, color: reached ? "#fff" : "rgba(255,255,255,.55)" }}>{s.label}</p>
                                    {active && <p className="text-center font-medium" style={{ fontSize: 9, color: "var(--warm-amber)", marginTop: 1 }}>Current</p>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Payment confirmed card — shown directly under the fulfilment box when paid */}
                  {order.id && order.paymentStatus === "confirmed" && (
                    <PaymentPanel
                      orderId={order.id}
                      orderPin={order.pin ?? undefined}
                      grandTotal={order.grandTotal}
                      creditsUsd={order.creditsApplied ?? 0}
                      currency={order.currency}
                      paymentStatus="confirmed"
                      paymentTxHash={order.paymentTxHash ?? null}
                      paymentTestAmount={order.paymentTestAmount ?? null}
                      testPaymentTxHash={order.testPaymentTxHash ?? null}
                      paymentRejectionReason={order.paymentRejectionReason ?? null}
                      paymentsEnabled={order.groupBuyId ? (order.groupBuyPaymentsEnabled !== false || (order.directShippingRequested === true && order.groupBuyDirectShippingPaymentsEnabled === true)) : undefined}
                      onStatusChange={(s, tx) => setOrder((prev) => prev ? { ...prev, paymentStatus: s, ...(tx ? { paymentTxHash: tx } : {}) } : prev)}
                    />
                  )}

                  {/* ===== Two-column layout (reference style) ===== */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 items-start">
                    {/* ---------- MAIN COLUMN ---------- */}
                    <div className="lg:col-span-2 space-y-4 min-w-0">

                      {/* Reshipper banner */}
                      {(order.routingType === "reshipper" || (!order.routingType && order.reshipperUsername)) && (
                        <div className="rounded-lg overflow-hidden" style={{ background: "var(--t-blue-08)", border: "1px solid var(--t-blue-20)" }}>
                          <div className="flex items-center gap-2 px-3 py-2">
                            <Truck className="w-4 h-4 shrink-0" style={{ color: "var(--t-blue)" }} />
                            <p className="text-xs font-semibold" style={{ color: "var(--t-blue)" }}>Your order will be shipped via a reshipper</p>
                          </div>
                          {order.reshipperUsername && (
                            <div className="px-3 pb-3 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span style={{ color: "var(--t-muted)" }}>Reshipper</span>
                                <span className="font-semibold" style={{ color: "var(--t-text)" }}>@{order.reshipperUsername.replace(/^@/, "")}</span>
                              </div>
                              {order.reshipperInfo?.country && (
                                <div className="flex items-center justify-between text-xs">
                                  <span style={{ color: "var(--t-muted)" }}>Based in</span>
                                  <span className="font-semibold" style={{ color: "var(--t-text)" }}>{order.reshipperInfo.country}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Items card */}
                      {order.lineItems?.length > 0 && (
                        <div className="rounded-lg p-4 sm:p-5" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)", color: "var(--t-text)" }}>
                          <div className="flex items-center gap-2 mb-3">
                            <SecIcon Icon={Package} />
                            <span className="font-extrabold" style={{ fontSize: 16, letterSpacing: "-0.01em", color: "var(--t-text)" }}>Items <span style={{ color: "var(--t-subtle)", fontWeight: 700 }}>({order.lineItems.length})</span></span>
                          </div>
                          <div>
                            {order.lineItems.map((li: OrderLineItem, i: number) => (
                              <div key={i} className={`flex items-center gap-3 py-2.5${li.isOos ? " opacity-55" : ""}`} style={i > 0 ? { borderTop: "1px solid var(--t-border)" } : undefined}>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold truncate" style={{ color: li.isOos ? "var(--t-subtle)" : "var(--t-text)", textDecoration: li.isOos ? "line-through" : "none" }}>{li.productName}</p>
                                  <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: "var(--t-subtle)" }}>
                                    <span>Qty ×{li.quantity % 1 === 0 ? li.quantity : li.quantity.toFixed(1)}</span>
                                    {li.isOos && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.12)", color: "light-dark(#dc2626, #fca5a5)" }}>OOS</span>}
                                  </p>
                                </div>
                                {li.lineTotal > 0 && <span className="text-sm font-semibold shrink-0" style={{ color: li.isOos ? "var(--t-subtle)" : "var(--t-text)", textDecoration: li.isOos ? "line-through" : "none" }}>{fmtC(li.lineTotal, order.currency)}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Order summary card */}
                      <div className="rounded-lg p-4 sm:p-5" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)", color: "var(--t-text)" }}>
                        <div className="flex items-center gap-2 mb-3">
                          <SecIcon Icon={ReceiptText} />
                          <span className="font-extrabold" style={{ fontSize: 16, letterSpacing: "-0.01em", color: "var(--t-text)" }}>Order summary</span>
                        </div>
                        <div className="space-y-1.5 text-sm">
                          {order.productSubtotal > 0 && (
                            <div className="flex justify-between" style={{ color: "var(--t-muted)" }}>
                              <span>Products</span><span>{fmtC(order.productSubtotal, order.currency)}</span>
                            </div>
                          )}
                          {order.deliveryPrice > 0 && (
                            <div className="flex justify-between" style={{ color: "var(--t-muted)" }}>
                              <span>Delivery</span><span>{fmtC(order.deliveryPrice, order.currency)}</span>
                            </div>
                          )}
                          {order.directShippingRequested && (order.directShippingCost ?? 0) > 0 ? (
                            <div className="flex justify-between" style={{ color: "var(--t-blue)" }}>
                              <span className="font-medium flex items-center gap-1.5"><Home className="w-3.5 h-3.5 shrink-0" /> Direct Shipping</span>
                              <span className="font-medium">{fmtC(order.directShippingCost!, order.currency)}</span>
                            </div>
                          ) : (
                            <div className="flex justify-between" style={{ color: "var(--t-muted)" }}>
                              <span>Vendor Shipping</span>
                              <span className={order.vendorShipping > 0 ? "font-medium" : "font-semibold"} style={{ color: order.vendorShipping > 0 ? "var(--t-text)" : "var(--t-blue)" }}>
                                {order.vendorShipping > 0 ? fmtC(order.vendorShipping, order.currency) : "TBD"}
                              </span>
                            </div>
                          )}
                          {order.tip > 0 && (
                            <div className="flex justify-between" style={{ color: "var(--t-muted)" }}>
                              <span>Tip</span><span>{fmtC(order.tip, order.currency)}</span>
                            </div>
                          )}
                          {order.testingContribution > 0 && (
                            <div className="flex justify-between" style={{ color: "var(--t-muted)" }}>
                              <span>Lab Test Contribution</span><span>{fmtC(order.testingContribution, order.currency)}</span>
                            </div>
                          )}
                          {(order.adminFee ?? 0) > 0 && !order.directShippingRequested && (
                            <div className="flex justify-between" style={{ color: "var(--t-muted)" }}>
                              <span>{order.adminFeeLabel ?? "Admin Fee"}</span><span>{fmtC(order.adminFee!, order.currency)}</span>
                            </div>
                          )}
                          {(order.creditsApplied ?? 0) > 0 && (
                            <div className="flex justify-between font-medium" style={{ color: "light-dark(#059669, #6ee7b7)" }}>
                              <span>Store Credits Applied</span>
                              <span>−${order.creditsApplied!.toFixed(2)} USD</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between rounded-lg px-4 py-3 mt-2" style={{ background: "var(--warm-ink)", border: "1px solid var(--warm-ink)", boxShadow: "0 10px 24px -14px rgba(26,43,86,0.55)" }}>
                            <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.78)" }}>{(order.creditsApplied ?? 0) > 0 && order.currency !== "GBP" ? "Amount Due" : (order.vendorShipping > 0 || (order.directShippingCost ?? 0) > 0) ? "Grand Total" : "Estimated Total"}</span>
                            <span className="text-lg font-extrabold" style={{ color: "var(--t-blue)" }}>
                              {order.currency === "GBP"
                                ? fmtC(order.grandTotal, order.currency)
                                : fmtC(Math.max(0, order.grandTotal - (order.creditsApplied ?? 0)), order.currency)}
                            </span>
                          </div>
                          {(order.amountDue ?? 0) > 0 && !["confirmed", "waived"].includes(order.balancePaymentStatus ?? "") && (
                            <div
                              className="flex justify-between font-bold border-t pt-2 mt-1"
                              style={{ color: "#F59E0B", borderColor: "rgba(245,158,11,0.25)" }}
                            >
                              <span>Outstanding Balance</span>
                              <span>{fmtC(order.amountDue!, order.currency)}</span>
                            </div>
                          )}
                        </div>

                        {(order.amountDue ?? 0) > 0 && !["confirmed", "waived"].includes(order.balancePaymentStatus ?? "") && (
                          <div className="mt-3">
                            <BalanceDueCard
                              orderId={order.id}
                              amountDue={order.amountDue!}
                              currency={order.currency}
                              hasBalanceScreenshot={!!order.hasBalanceScreenshot}
                              balanceTxHash={order.balanceTxHash ?? null}
                              balancePaymentStatus={order.balancePaymentStatus ?? null}
                              onUploaded={() => setOrder(prev => prev ? { ...prev, hasBalanceScreenshot: true } : prev)}
                              onBalanceStatusChange={(status, txHash) =>
                                setOrder(prev => prev ? { ...prev, balancePaymentStatus: status, balanceTxHash: txHash ?? prev.balanceTxHash ?? null } : prev)
                              }
                            />
                          </div>
                        )}

                        {/* Routing banners (batch lock + direct-to-home only — reshipper card is above).
                            Use directShippingRequested, not routingType: GB orders with custom
                            shipping options (QR code, PDF label) have routingType="direct" because
                            there is no reshipper on the leg, but the parcel still goes via the GB
                            organiser's dispatch — not straight to the member's home address. */}
                        {(order.batchLocked || order.directShippingRequested) && (
                          <div className="mt-3 space-y-2">
                            {order.batchLocked && (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(100,116,139,0.1)", border: "1px solid rgba(100,116,139,0.25)" }}>
                                <Lock className="w-3.5 h-3.5 shrink-0" style={{ color: "light-dark(#475569, #94a3b8)" }} />
                                <p className="text-xs font-semibold" style={{ color: "light-dark(#475569, #94a3b8)" }}>This order has been locked for batching — shipping details are being finalised</p>
                              </div>
                            )}
                            {order.directShippingRequested && (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--t-blue-10)", border: "1px solid var(--t-blue-20)" }}>
                                <Home className="w-4 h-4 shrink-0" style={{ color: "var(--t-blue)" }} />
                                <p className="text-xs font-semibold" style={{ color: "var(--t-blue)" }}>Your order will be shipped directly to your address</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Delivery Address — sits under the order summary. Additions ride along with
                          the original order, so the address is locked (read-only). Otherwise show the
                          editable section when the chosen shipping option requires an address, or for
                          direct-shipping GB orders. Never gate on delivery method name (e.g. "royal")
                          — use the server-resolved customShippingRequiresAddress flag instead. */}
                      {order.additionOfOrderId ? (
                        (order.shippingAddress || order.shippingName) ? (
                          <Card className="p-4 rounded-lg shadow-none" style={{ borderColor: "var(--t-border)", background: "var(--t-surface2)" }}>
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--t-bg)" }}>
                                <Lock className="w-3.5 h-3.5" style={{ color: "var(--t-muted)" }} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Delivery Address</p>
                                <p className="text-xs mb-1.5" style={{ color: "var(--t-muted)" }}>Ships with your original order — this address can&apos;t be changed.</p>
                                {order.shippingName && <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{order.shippingName}</p>}
                                {order.shippingAddress && <p className="text-sm whitespace-pre-line break-words" style={{ color: "var(--t-subtle)" }}>{order.shippingAddress}</p>}
                              </div>
                            </div>
                          </Card>
                        ) : null
                      ) : (order.customShippingRequiresAddress || order.directShippingRequested) && (
                        ["confirmed", "pending_confirmation", "test_confirmed"].includes(order.paymentStatus) ? (
                          <AccountShippingAddressSection
                            orderId={order.id}
                            existingName={order.shippingName ?? null}
                            existingAddress={order.shippingAddress ?? null}
                            onSaved={(n, a) => setOrder((prev) => prev ? { ...prev, shippingName: n, shippingAddress: a } : prev)}
                          />
                        ) : (
                          <Card className="p-4 rounded-lg shadow-none" style={{ borderColor: "var(--t-border)", background: "var(--t-surface2)" }}>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--t-bg)" }}>
                                <Lock className="w-3.5 h-3.5" style={{ color: "var(--t-muted)" }} />
                              </div>
                              <div>
                                <p className="text-sm font-semibold" style={{ color: "var(--t-subtle)" }}>Delivery Address</p>
                                <p className="text-xs" style={{ color: "var(--t-muted)" }}>Available after payment is initiated</p>
                              </div>
                            </div>
                          </Card>
                        )
                      )}

                      {/* Admin message */}
                      {order.adminMessage && (
                        <div className="rounded-lg p-4 sm:p-5 flex items-start gap-3" style={{ background: "var(--t-blue-08)", border: "1px solid var(--t-blue-20)" }}>
                          <MessageCircle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "var(--t-blue)" }} />
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "var(--t-blue)" }}>Message from Us</p>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--t-text)" }}>{order.adminMessage}</p>
                          </div>
                        </div>
                      )}

                      {/* Direct / wholesale tracking number — parcel card style */}
                      {order.trackingNumber && (() => {
                        // Compute per-item shipped qty across ALL tracking numbers
                        const shippedMap: Record<string, number> = {};
                        const tsiMap = order.trackingShippedItems ?? {};
                        for (const items of Object.values(tsiMap)) {
                          for (const { name, qty } of items) {
                            const key = name.toLowerCase().trim();
                            shippedMap[key] = (shippedMap[key] ?? 0) + qty;
                          }
                        }
                        const hasShippedData = Object.keys(tsiMap).length > 0;

                        // Items in THIS specific parcel
                        const thisParcelItems: Array<{name: string; qty: number}> = tsiMap[order.trackingNumber] ?? [];

                        // Outstanding: order line items not yet shipped (or partially shipped)
                        const outstandingItems: Array<{name: string; qty: number}> = [];
                        if (hasShippedData && order.lineItems?.length > 0) {
                          for (const li of order.lineItems) {
                            const key = li.productName.toLowerCase().trim();
                            const shipped = shippedMap[key] ?? 0;
                            const remaining = li.quantity - shipped;
                            if (remaining > 0.001) {
                              outstandingItems.push({ name: li.productName, qty: remaining });
                            }
                          }
                        }

                        return (
                          <div className="rounded-lg p-4 sm:p-5 space-y-2.5" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)", color: "var(--t-text)" }}>
                            <div className="flex items-center gap-2">
                              <SecIcon Icon={Truck} />
                              <span className="font-extrabold" style={{ fontSize: 16, letterSpacing: "-0.01em", color: "var(--t-text)" }}>Tracking</span>
                            </div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "var(--t-subtle)" }}>
                                  {(order as any).shippingCarrier ? (order as any).shippingCarrier : "Your Parcel"}
                                </p>
                                <p className="font-mono font-bold text-sm tracking-widest break-all" style={{ color: "var(--t-text)" }}>{order.trackingNumber}</p>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                                style={{ color: order.status === "Completed" ? "light-dark(#16a34a, #22c55e)" : order.status === "Shipped" ? "var(--t-blue)" : "light-dark(#64748b, #94a3b8)", background: order.status === "Completed" ? "rgba(34,197,94,0.14)" : order.status === "Shipped" ? "var(--t-blue-15)" : "rgba(148,163,184,0.18)" }}>
                                {order.status}
                              </span>
                            </div>

                            {/* Shipped items for this parcel */}
                            {thisParcelItems.length > 0 && (
                              <div className="pt-2 space-y-1" style={{ borderTop: "1px solid var(--t-border)" }}>
                                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--t-subtle)" }}>In this parcel</p>
                                {thisParcelItems.map((it, i) => (
                                  <div key={i} className="flex items-center gap-1.5">
                                    <Package className="w-3 h-3 shrink-0" style={{ color: "light-dark(#16a34a, #22c55e)" }} />
                                    <span className="text-xs" style={{ color: "var(--t-muted)" }}>{it.name} <span className="font-semibold" style={{ color: "light-dark(#16a34a, #22c55e)" }}>×{Number.isInteger(it.qty) ? it.qty : it.qty.toFixed(1)}</span></span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Outstanding items not yet shipped */}
                            {outstandingItems.length > 0 && (
                              <div className="rounded-md px-3 py-2.5 space-y-1" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#d97706" }}>Still outstanding</p>
                                {outstandingItems.map((it, i) => (
                                  <div key={i} className="flex items-center gap-1.5">
                                    <Package className="w-3 h-3 shrink-0" style={{ color: "#d97706" }} />
                                    <span className="text-xs" style={{ color: "var(--t-muted)" }}>{it.name} <span className="font-semibold" style={{ color: "#d97706" }}>×{Number.isInteger(it.qty) ? it.qty : it.qty.toFixed(1)}</span></span>
                                  </div>
                                ))}
                                <p className="text-[10px] mt-1" style={{ color: "#d97706" }}>A separate parcel will follow for these items.</p>
                              </div>
                            )}

                            {/* Fallback: show all items if no shipped-item data at all */}
                            {!hasShippedData && order.lineItems?.length > 0 && (
                              <div className="pt-2 space-y-0.5" style={{ borderTop: "1px solid var(--t-border)" }}>
                                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--t-subtle)" }}>Contents</p>
                                {order.lineItems.map((li: OrderLineItem, i: number) => (
                                  <div key={i} className="flex items-center gap-1.5">
                                    <Package className="w-3 h-3 shrink-0" style={{ color: "var(--t-subtle)" }} />
                                    <span className="text-xs" style={{ color: "var(--t-muted)" }}>{li.productName} <span style={{ color: "var(--t-subtle)" }}>×{li.quantity % 1 === 0 ? li.quantity : li.quantity.toFixed(1)}</span></span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <a
                              href={`https://t.17track.net/en#nums=${encodeURIComponent(order.trackingNumber)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2"
                              style={{ color: "var(--t-blue)" }}
                            >
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" /> Track on 17track
                            </a>
                          </div>
                        );
                      })()}

                      {/* Dispatch photos uploaded by admin */}
                      <MemberDispatchImages orderId={order.id} />
                    </div>

                    {/* ---------- SIDEBAR ---------- */}
                    <div className="space-y-4 min-w-0">
                      {/* Order details */}
                      <div className="rounded-lg p-4 sm:p-5" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)", color: "var(--t-text)" }}>
                        <div className="flex items-center gap-2 mb-3">
                          <SecIcon Icon={Info} />
                          <span className="font-extrabold" style={{ fontSize: 16, letterSpacing: "-0.01em", color: "var(--t-text)" }}>Order details</span>
                        </div>
                        <div className="space-y-2.5 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <span className="shrink-0" style={{ color: "var(--t-muted)" }}>Telegram</span>
                            <span className="font-semibold text-right break-all min-w-0" style={{ color: "var(--t-text)" }}>{order.telegramUsername}</span>
                          </div>
                          <div className="flex items-start justify-between gap-3">
                            <span className="shrink-0" style={{ color: "var(--t-muted)" }}>Delivery</span>
                            <span className="font-semibold text-right break-words min-w-0" style={{ color: "var(--t-text)" }}>{order.deliveryMethod}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="shrink-0" style={{ color: "var(--t-muted)" }}>Items</span>
                            <span className="font-semibold" style={{ color: "var(--t-text)" }}>{order.lineItems?.length ?? 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      {order.notes && (
                        <div className="rounded-lg p-4 sm:p-5" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)", color: "var(--t-text)" }}>
                          <div className="flex items-center gap-2 mb-2">
                            <SecIcon Icon={FileText} />
                            <span className="font-extrabold" style={{ fontSize: 16, letterSpacing: "-0.01em", color: "var(--t-text)" }}>Notes</span>
                          </div>
                          <p className="text-sm whitespace-pre-line break-words" style={{ color: "var(--t-muted)" }}>{order.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment banner (set by GB admin) */}
                  {order.groupBuyPaymentBanner && (
                    <div className="rounded-lg flex items-start gap-3 px-4 py-3" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
                      <Megaphone className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "light-dark(#B45309, #F0C880)" }} />
                      <p className="text-sm leading-snug" style={{ color: "light-dark(#92400E, #E8C488)" }}>
                        {order.groupBuyPaymentBanner.split("\n").map((line, i) => {
                          const parts = line.split(/(\*\*[^*]+\*\*)/g);
                          return (
                            <span key={i}>
                              {i > 0 && <br />}
                              {parts.map((part, j) =>
                                part.startsWith("**") && part.endsWith("**")
                                  ? <strong key={j}>{part.slice(2, -2)}</strong>
                                  : part
                              )}
                            </span>
                          );
                        })}
                      </p>
                    </div>
                  )}

                  {/* Store Credits banner */}
                  {accountCredits > 0 &&
                   Math.min(accountCredits, order.grandTotal - (order.creditsApplied ?? 0)) > 0 &&
                   order.paymentStatus === "unpaid" && order.status !== "Cancelled" && (
                    <div
                      className="rounded-lg px-4 py-3 flex items-center justify-between gap-3"
                      style={{ background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)" }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Coins className="w-4 h-4 shrink-0" style={{ color: "#16a34a" }} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold" style={{ color: "light-dark(#15803d, #6ee7b7)" }}>
                            ${accountCredits.toFixed(2)} store credit available
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "light-dark(#166534, #86efac)" }}>
                            Apply to reduce the amount you owe on this order.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleApplyCredits}
                        disabled={applyingCredits}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity"
                        style={{ background: "#16a34a", color: "#fff", opacity: applyingCredits ? 0.6 : 1 }}
                      >
                        {applyingCredits ? <Loader2 className="w-3 h-3 animate-spin" /> : <Coins className="w-3 h-3" />}
                        {applyingCredits ? "Applying…" : "Apply Credits"}
                      </button>
                    </div>
                  )}
                  {creditsError && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(239,68,68,0.08)", color: "light-dark(#dc2626, #fca5a5)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {creditsError}
                    </div>
                  )}
                  {(order.creditsApplied ?? 0) > 0 && (
                    <div
                      className="rounded-lg px-3 py-2 flex items-center gap-2 text-xs"
                      style={{ background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.2)", color: "light-dark(#15803d, #6ee7b7)" }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span><strong>${(order.creditsApplied ?? 0).toFixed(2)}</strong> store credit applied — amount due reduced.</span>
                    </div>
                  )}

                  {/* Payment panel (hidden when confirmed — the confirmed card is shown under the fulfilment box above) */}
                  {order.paymentStatus !== "confirmed" && (order.id && order.groupBuyId && order.groupBuyPaymentsEnabled === false && !(order.directShippingRequested && order.groupBuyDirectShippingPaymentsEnabled === true) ? (
                    <div
                      className="rounded-lg p-4 flex items-start gap-3"
                      style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.25)" }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: "rgba(217,119,6,0.15)" }}
                      >
                        <Clock className="w-4 h-4" style={{ color: "light-dark(#D97706, #F0C880)" }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "light-dark(#B45309, #F0C880)" }}>Payments Not Yet Open</p>
                        <p className="text-xs mt-0.5" style={{ color: "light-dark(#92400E, #E8C488)" }}>The organiser hasn't opened payments for this group buy yet. Check back soon.</p>
                      </div>
                    </div>
                  ) : order.id ? (
                    <PaymentPanel
                      orderId={order.id}
                      orderPin={order.pin ?? undefined}
                      grandTotal={order.grandTotal}
                      creditsUsd={order.creditsApplied ?? 0}
                      currency={order.currency}
                      paymentStatus={
                        order.paymentStatus === "unpaid" && order.paymentRejectionReason
                          ? "payment_rejected"
                          : (order.paymentStatus ?? "unpaid")
                      }
                      paymentTxHash={order.paymentTxHash ?? null}
                      paymentTestAmount={order.paymentTestAmount ?? null}
                      testPaymentTxHash={order.testPaymentTxHash ?? null}
                      paymentRejectionReason={order.paymentRejectionReason ?? null}
                      paymentsEnabled={order.groupBuyId ? (order.groupBuyPaymentsEnabled !== false || (order.directShippingRequested === true && order.groupBuyDirectShippingPaymentsEnabled === true)) : undefined}
                      onStatusChange={(s, tx) => setOrder((prev) => prev ? { ...prev, paymentStatus: s, ...(tx ? { paymentTxHash: tx } : {}) } : prev)}
                    />
                  ) : null)}

                  {/* Lab Test Vote Card */}
                  {order.testingContribution > 0 && order.paymentStatus === "confirmed" && (
                    <Card className="p-4 rounded-lg shadow-none" style={{ border: "1px solid var(--t-border)", background: "var(--t-surface)", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--t-blue-10)" }}>
                          <TestTube className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Lab Test Contribution</p>
                          <p className="text-xs" style={{ color: "var(--t-muted)" }}>You contributed {fmtC(order.testingContribution, order.currency)} to batch testing</p>
                        </div>
                      </div>
                      {order.testVote ? (
                        <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.22)" }}>
                          <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "light-dark(#16a34a, #4ade80)" }} />
                          <div>
                            <p className="text-xs font-semibold" style={{ color: "light-dark(#15803d, #6ee7b7)" }}>Vote cast!</p>
                            <p className="text-xs" style={{ color: "light-dark(#166534, #86efac)" }}>
                              You voted to test: <span className="font-medium">{order.testVote}</span>
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs font-medium" style={{ color: "var(--t-muted)" }}>Vote for which product you'd like tested:</p>
                          {order.lineItems.filter(li => !li.isOos).map(li => (
                            <button
                              key={li.productId}
                              onClick={() => li.productId && handleVote(li.productId)}
                              disabled={voteLoading || !li.productId}
                              className="w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50"
                              style={{ borderColor: "var(--t-blue-30)", background: "var(--t-surface)", color: "var(--t-blue)" }}
                            >
                              <span className="truncate">{li.productName}</span>
                              {voteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 ml-2" /> : null}
                            </button>
                          ))}
                          {voteError && <p className="text-xs text-red-500">{voteError}</p>}
                        </div>
                      )}
                    </Card>
                  )}

                  {/* Shipping details — wholesale orders only */}
                  {order.orderType === "wholesale" && (order.shippingName || order.shippingAddress || order.shippingCountry || order.shippingPhone) && (
                    <Card className="p-4 space-y-3 rounded-lg shadow-none" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" }}>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--t-muted)" }}>Shipping Details</p>
                        {EDITABLE_STATUSES.includes(order.status) && !isPaidOrder ? (
                          <button
                            onClick={handleEdit}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                            style={{ background: "var(--t-blue-08)", color: "var(--t-blue)" }}
                          >
                            Edit
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.08)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.20)" }}>
                            <Lock className="w-2.5 h-2.5" /> Locked
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                        {order.shippingName && (
                          <>
                            <span className="text-xs font-semibold pt-0.5" style={{ color: "var(--t-muted)" }}>Name</span>
                            <span style={{ color: "var(--t-text)" }}>{order.shippingName}</span>
                          </>
                        )}
                        {order.shippingAddress && (
                          <>
                            <span className="text-xs font-semibold pt-0.5" style={{ color: "var(--t-muted)" }}>Address</span>
                            <span className="whitespace-pre-line" style={{ color: "var(--t-text)" }}>{order.shippingAddress}</span>
                          </>
                        )}
                        {order.shippingCountry && (
                          <>
                            <span className="text-xs font-semibold pt-0.5" style={{ color: "var(--t-muted)" }}>Country</span>
                            <span style={{ color: "var(--t-text)" }}>{order.shippingCountry}</span>
                          </>
                        )}
                        {order.shippingPhone && (
                          <>
                            <span className="text-xs font-semibold pt-0.5" style={{ color: "var(--t-muted)" }}>Mobile</span>
                            <span style={{ color: "var(--t-text)" }}>{order.shippingPhone}</span>
                          </>
                        )}
                      </div>
                    </Card>
                  )}

                  {/* InPost QR Code upload */}
                  {order.groupBuyQrUploadInpostEnabled && !order.directShippingRequested && (
                    order.paymentStatus === "confirmed" ? (
                      <AccountQrSection
                        orderId={order.id}
                        uploadEndpoint="inpost-qr"
                        label="InPost QR Code"
                        existingQr={order.inpostQrCode ?? null}
                        customMessage={order.groupBuyQrUploadMessage ?? undefined}
                        onUploaded={(qr) => setOrder((prev) => prev ? { ...prev, inpostQrCode: qr } : prev)}
                      />
                    ) : (
                      <Card className="p-4 rounded-lg shadow-none" style={{ borderColor: "var(--t-border)", background: "var(--t-surface2)" }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--t-bg)" }}>
                            <Lock className="w-3.5 h-3.5" style={{ color: "var(--t-muted)" }} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: "var(--t-subtle)" }}>InPost QR Code</p>
                            <p className="text-xs" style={{ color: "var(--t-muted)" }}>Available after payment is completed</p>
                          </div>
                        </div>
                      </Card>
                    )
                  )}

                  {/* Royal Mail QR Code upload */}
                  {order.groupBuyQrUploadRoyalMailEnabled && !order.directShippingRequested && (
                    order.paymentStatus === "confirmed" ? (
                      <AccountQrSection
                        orderId={order.id}
                        uploadEndpoint="royal-mail-qr"
                        label="Royal Mail QR Code"
                        existingQr={order.royalMailQrCode ?? null}
                        customMessage={order.groupBuyQrUploadMessage ?? undefined}
                        onUploaded={(qr) => setOrder((prev) => prev ? { ...prev, royalMailQrCode: qr } : prev)}
                      />
                    ) : (
                      <Card className="p-4 rounded-lg shadow-none" style={{ borderColor: "var(--t-border)", background: "var(--t-surface2)" }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--t-bg)" }}>
                            <Lock className="w-3.5 h-3.5" style={{ color: "var(--t-muted)" }} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: "var(--t-subtle)" }}>Royal Mail QR Code</p>
                            <p className="text-xs" style={{ color: "var(--t-muted)" }}>Available after payment is completed</p>
                          </div>
                        </div>
                      </Card>
                    )
                  )}

                  {/* Custom shipping QR code upload */}
                  {order.customShippingRequiresQrCode && !order.directShippingRequested && (
                    order.paymentStatus === "confirmed" ? (
                      <AccountQrSection
                        orderId={order.id}
                        uploadEndpoint="custom-qr"
                        label="Delivery QR Code"
                        existingQr={order.qrCodes?.["custom"] ?? null}
                        customMessage={order.groupBuyQrUploadMessage ?? undefined}
                        onUploaded={(qr) => setOrder((prev) => prev ? { ...prev, qrCodes: { ...(prev.qrCodes ?? {}), custom: qr } } : prev)}
                      />
                    ) : (
                      <Card className="p-4 rounded-lg shadow-none" style={{ borderColor: "var(--t-border)", background: "var(--t-surface2)" }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--t-bg)" }}>
                            <Lock className="w-3.5 h-3.5" style={{ color: "var(--t-muted)" }} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: "var(--t-subtle)" }}>Delivery QR Code</p>
                            <p className="text-xs" style={{ color: "var(--t-muted)" }}>Available after payment is completed</p>
                          </div>
                        </div>
                      </Card>
                    )
                  )}

                  {/* Actions */}
                  <div className="rounded-lg p-4 sm:p-5 space-y-3" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)", color: "var(--t-text)" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <SecIcon Icon={Pencil} />
                      <span className="font-extrabold" style={{ fontSize: 16, letterSpacing: "-0.01em", color: "var(--t-text)" }}>Actions</span>
                    </div>
                    {order.paymentStatus === "confirmed" && order.groupBuyAllowOrderAddons !== false && order.orderType !== "wholesale" && order.orderType !== "wholesale_shared" ? (
                      <button
                        className="w-full rounded-md text-sm font-semibold flex items-center justify-center gap-2 text-white transition-all active:scale-[0.99] hover:brightness-110"
                        style={{ background: ACCENT, padding: "10px 16px" }}
                        onClick={handleTopUp}
                      >
                        <Plus className="w-4 h-4" /> Place Another Order
                      </button>
                    ) : order.orderType === "wholesale_shared" ? (
                      <div className="text-center text-sm p-3 rounded-md" style={{ color: "var(--t-muted)", background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                        This is a shared wholesale order. Items and shipping are managed from the shared order page.
                      </div>
                    ) : isPaidOrder && order.orderType === "wholesale" ? null
                    : EDITABLE_STATUSES.includes(order.status) ? (
                      <button
                        className="w-full rounded-md text-sm font-semibold flex items-center justify-center gap-2 text-white transition-all active:scale-[0.99] hover:brightness-110"
                        style={{ background: ACCENT, padding: "10px 16px" }}
                        onClick={handleEdit}
                      >
                        <Pencil className="w-4 h-4" /> Edit This Order
                      </button>
                    ) : order.paymentStatus !== "confirmed" ? (
                      <div className="text-center text-sm p-3 rounded-md" style={{ color: "var(--t-muted)", background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                        This order is <span className="font-semibold">{order.status}</span> and cannot be edited.
                      </div>
                    ) : null}
                    <button
                      onClick={handleDownloadReceipt}
                      className="w-full rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.99] border"
                      style={{ background: "var(--t-surface2)", color: "var(--t-subtle)", borderColor: "var(--t-border)", padding: "10px 16px" }}
                    >
                      <Download className="w-4 h-4" /> Download PDF Receipt
                    </button>
                  </div>

                  {/* Delete order — only for Draft/Submitted, unpaid, and when GB allows self-delete */}
                  {EDITABLE_STATUSES.includes(order.status) && !isPaidOrder && !order.groupBuyDeleteLocked && (
                    <div className="rounded-xl border p-4" style={{ borderColor: "rgba(239,68,68,0.2)", background: "color-mix(in srgb, #ef4444 6%, var(--t-surface))" }}>
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
        {deleteConfirm && order && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => { if (!deleting) { setDeleteConfirm(false); setDeleteError(null); } }} />
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              className="warm-order fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 rounded-3xl w-[90%] max-w-sm p-6"
              style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}>
              <div className="flex flex-col items-center gap-3 mb-5">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(220,38,38,0.1)" }}>
                  <AlertCircle className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-base font-bold text-center" style={{ color: "var(--t-text)" }}>Cancel order {order.code}?</h3>
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
      {!useDashChrome && (
        <HubBottomNav
          section={"orders" as HubSection}
          setSection={(s: HubSection) => setLocation(`/account?s=${s}`)}
          hubMoreOpen={false}
          setHubMoreOpen={() => {}}
          account={account}
        />
      )}
    </Chrome>
  );
}
