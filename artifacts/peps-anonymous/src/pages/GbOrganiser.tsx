import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, Loader2, AlertTriangle, Check,
  ChevronRight, Trash2, Pencil, Package, BarChart3, FlaskConical,
  CreditCard, ShoppingBag, ArrowLeft, X, Upload, RefreshCw,
  CheckCircle2, Clock, ToggleLeft, ToggleRight, DollarSign,
  Calendar, Tag, FileText, Wallet, ExternalLink,
  TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  AlertCircle, Globe, Lock, SendHorizonal, Truck,
  Sparkles, LayoutDashboard, Info, Download, ClipboardList, QrCode,
  MessageSquare, Search, UserCheck, Save, Copy, Settings, Shield,
  ArrowUp, ArrowDown,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { ImageLightbox } from "@/components/ImageLightbox";
import { IntlShippingTab } from "@/components/IntlShippingTab";
import { GbQrCodesPanel } from "@/components/GbQrCodesPanel";
import { useAccount } from "@/hooks/use-account";
import { ALL_CARRIERS_17TRACK, CARRIER_GROUPS } from "@/data/carriers17track";
import { COUNTRIES, COUNTRY_LIST } from "@/data/countries";

const _codeToName: Record<string, string> = Object.fromEntries(COUNTRY_LIST.map(c => [c.code.toLowerCase(), c.name]));
const _nameToCode: Record<string, string> = Object.fromEntries(COUNTRY_LIST.map(c => [c.name.toLowerCase(), c.code]));
function resolveCountry(raw: string | null | undefined): string {
  if (!raw) return raw ?? "";
  return _codeToName[raw.toLowerCase()] ?? raw;
}
// Returns a canonical key for a raw country value (always a 2-letter code if known, else the raw string)
function _canonicalCountry(raw: string): string {
  const lo = raw.trim().toLowerCase();
  if (_codeToName[lo]) return raw.trim().toUpperCase(); // already a code
  const code = _nameToCode[lo];
  if (code) return code;
  return raw.trim();
}
// Returns all raw values that should match a canonical key (e.g. "DE" → ["DE", "Germany"])
function _countryRawValues(canonical: string): string[] {
  const name = _codeToName[canonical.toLowerCase()];
  if (name) return [canonical, name];
  // canonical might be a full name with no code
  const code = _nameToCode[canonical.toLowerCase()];
  if (code) return [canonical, code];
  return [canonical];
}
// Display label: "DE — Germany" or just the raw value if unknown
function _countryLabel(canonical: string): string {
  const name = _codeToName[canonical.toLowerCase()];
  if (name) return `${canonical} — ${name}`;
  return canonical;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrganiserProfile {
  telegramUsername: string;
  email: string | null;
  organiserStatus: string | null;
  organiserApprovedAt: string | null;
  organiserPaymentMethods: {
    usdtWallet?: string;
    revolutHandle?: string;
    paypalHandle?: string;
    cryptoCurrency?: string;
    cryptoNetwork?: string;
    cryptoWalletAddress?: string;
  } | null;
}

interface OrganiserGB {
  id: string;
  name: string;
  description: string | null;
  status: string;
  approvalStatus: string | null;
  closeDate: string | null;
  currency: string;
  createdAt: string;
  manufacturer: string | null;
  manufacturerCountry: string | null;
  memberLimit: number | null;
  minMembers: number | null;
  maxKitsPerCustomer: number | null;
  maxKitsTotal: number | null;
  minKitsPerPerson: number | null;
  hiddenFromList: boolean;
  paymentsEnabled: boolean;
  paymentMessage: string | null;
  paymentMessageEnabled: boolean;
  shippingOptions: { id: string; label: string; price: number }[];
  organiserPayments: { usdtWallet?: string; revolutHandle?: string; paypalHandle?: string; cryptoCurrency?: string; cryptoNetwork?: string; cryptoWalletAddress?: string; anonPayEnabled?: boolean; anonPayWallet?: string; anonPayTicker?: string; anonPayNetwork?: string } | null;
  organiserId: string | null;
  labTestSupplier: string | null;
  vendorShippingEnabled: boolean;
  vendorShippingMessage: string | null;
  vendorShippingAmount: number | null;
  vendorShippingKits: number | null;
  invitePinHash: string | null;
  infoCards: { title: string; body: string; type?: "info" | "update" | "warning" | "important"; postedAt?: string }[] | null;
  allowedCountries: string[] | null;
  excludedCountries: string[] | null;
  blockedAccounts: string[] | null;
  adminFeeEnabled: boolean;
  adminFeeAmount: number | null;
  adminFeeLabel: string | null;
  adminFeeCountries: { country: string; amount: number; enabled: boolean }[] | null;
  sharedShippingCountries: string[] | null;
  allowHalfKits: boolean;
  allowEditOrderWhenClosed: boolean;
  allowEditAddressWhenClosed: boolean;
  allowDeleteOrderWhenClosed: boolean;
  countryLegsEnabled: boolean;
  organiserOrderEditEnabled: boolean;
  organiserCanEditStatus: boolean;
  organiserCanEditPaymentStatus: boolean;
  organiserCanEditTracking: boolean;
  organiserCanEditNotes: boolean;
  organiserCanEditTxId: boolean;
  organiserCanEditQuantities: boolean;
  organiserCanMarkOos: boolean;
  qrUploadInpostEnabled: boolean;
  qrUploadRoyalMailEnabled: boolean;
  qrUploadMessage: string | null;
  qrViewerUsernames: string[] | null;
  legViewerAccess: { username: string; legIds: string[] }[] | null;
  orderPageMessage: string | null;
  reshipperInviteCode: string | null;
  testOrderPin: string | null;
}

interface OrgProduct {
  id: string;
  name: string;
  price: number;
  category: string | null;
  mgSize: string | null;
  stock: number | null;
  active: boolean;
  vendor: string | null;
  halfKitEnabled: boolean;
}

interface OrgOrder {
  id: string;
  code: string;
  telegramUsername: string;
  status: string;
  paymentStatus: string;
  grandTotal: number;
  productSubtotal: number;
  deliveryPrice: number;
  tip: number;
  deliveryMethod: string | null;
  shippingName: string | null;
  shippingAddress: string | null;
  trackingNumber: string | null;
  adminNotes: string | null;
  paymentMethod: string;
  paymentTxHash: string | null;
  testPaymentTxHash: string | null;
  paymentTestAmount: number | null;
  hasPaymentScreenshot?: boolean;
  inpostQrCode: string | null;
  royalMailQrCode?: string | null;
  trackingNumbers?: string[] | null;
  paymentTxHashes?: string[] | null;
  notes: string | null;
  testingContribution: number | null;
  adminFee?: number;
  adminFeeLabel?: string | null;
  amountDue: number;
  hasBalanceScreenshot?: boolean;
  balanceTxHash?: string | null;
  balancePaymentStatus?: string | null;
  shippingCountry: string | null;
  accountCountry: string | null;
  reshipperUsername: string | null;
  countryLegId: string | null;
  createdAt: string;
  paymentConfirmedAt?: string | null;
  orderType: string | null;
  lineItems: { id: string; productId: string; productName: string; quantity: number; unitPrice: number; lineTotal: number; isOos?: boolean }[];
}

interface OrgLabTest {
  id: number;
  url: string | null;
  peptideName: string;
  supplier: string | null;
  labName: string | null;
  batchCode: string | null;
  purityPct: string | null;
  testDate: string | null;
  pending: boolean;
  groupBuyId: string | null;
  createdAt: string;
  janoshikId: string | null;
  mgAmount: number | null;
  testType: string | null;
  productCategory: string | null;
  endotoxinEuMg: number | null;
  sterilityPass: boolean | null;
}

interface OrgParcel {
  id: string;
  groupBuyId: string;
  label: string;
  carrier: string;
  trackingNumber: string;
  status: string;
  notes: string | null;
  trackingUrl: string | null;
  trackingParams: Record<string, string> | null;
  items: { name: string; qty: number; productId?: string }[];
  cachedEvents: { date: string; status: string; location: string }[];
  createdAt: string;
  updatedAt: string;
}

interface PnlData {
  gbName: string;
  orders: { total: number; confirmed: number };
  revenue: { total: number; products: number; delivery: number };
  costs: { materials: number; lab: number; shipping: number; misc: number; platformFee: number; total: number; notes: string | null };
  profit: { gross: number; marginPct: number };
  productBreakdown: { name: string; totalQty: number; totalRevenue: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none";
const inputStyle: React.CSSProperties = {
  border: "1.5px solid var(--t-border)",
  color: "var(--t-text)",
  background: "var(--t-surface)",
};

// ─── Carrier Searchable Input ─────────────────────────────────────────────────

function CarrierInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return ALL_CARRIERS_17TRACK.filter(c => c.toLowerCase().includes(q)).slice(0, 60);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (carrier: string) => {
    onChange(carrier);
    setQuery("");
    setOpen(false);
  };

  // Quick picks shown when dropdown open but no query yet
  const quickGroups = CARRIER_GROUPS.slice(0, 3); // UK, China, Major

  return (
    <div ref={containerRef} className="relative">
      <input
        value={open ? query : value}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => { setOpen(true); setQuery(""); }}
        placeholder={open ? "Search 17track carriers…" : value || "Auto"}
        className={`${inputCls} text-xs`}
        style={inputStyle}
        autoComplete="off"
      />
      {open && (
        <div
          className="absolute z-50 w-64 rounded-xl shadow-xl overflow-hidden"
          style={{ background: "var(--t-surface)", border: "1.5px solid var(--t-border)", top: "calc(100% + 4px)", left: 0 }}
        >
          {query.trim().length === 0 ? (
            <div className="max-h-60 overflow-y-auto">
              {quickGroups.map(g => (
                <div key={g.label}>
                  <p className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest sticky top-0" style={{ color: "var(--t-blue-deep)", background: "var(--t-surface2)" }}>{g.label}</p>
                  {g.carriers.slice(0, 10).map(c => (
                    <button key={c} onMouseDown={() => select(c)} className="w-full text-left px-3 py-1.5 text-xs transition-colors" style={{ color: "var(--t-text)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--t-surface2)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              ))}
              <p className="px-3 py-2 text-[10px]" style={{ color: "var(--t-subtle)" }}>Start typing to search all {ALL_CARRIERS_17TRACK.length.toLocaleString()} carriers…</p>
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-60 overflow-y-auto">
              {results.map(c => (
                <button key={c} onMouseDown={() => select(c)} className="w-full text-left px-3 py-1.5 text-xs transition-colors" style={{ color: "var(--t-text)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--t-surface2)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {c}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-3">
              <p className="text-xs" style={{ color: "var(--t-subtle)" }}>No match found — value will be saved as typed.</p>
              <button onMouseDown={() => select(query)} className="mt-1.5 text-xs font-semibold" style={{ color: "var(--t-blue)" }}>
                Use "{query}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const GB_PARCEL_STATUSES = ["pending", "in_transit", "out_for_delivery", "attempted", "delivered", "exception", "expired"] as const;

type ParamSpec = {
  key: string;
  label: string;
  required: boolean;
  type: "text" | "date" | "select";
  placeholder?: string;
  options?: { value: string; label: string }[];
};

const CARRIER_CODE_MAP: Record<string, number> = {
  "auto detect": 0, "auto": 0,
  "afghan post": 1021,
  "albanian post": 1031,
  "algeria post": 1041,
  "algeria ems": 1043,
  "correo argentino": 1121,
  "haypost": 1131,
  "australia post": 1151,
  "austrian post": 1161,
  "azer express post": 1171,
  "bangladesh post": 2031,
  "barbados post": 2041,
  "belpost": 2051,
  "bpost": 2061,
  "bpost international": 2063,
  "belize post": 2071,
  "la poste de benin": 2081,
  "bhutan post": 2101,
  "jp bh post": 2121,
  "pošta srpske": 2122,
  "hrvatska pošta mostar": 2123,
  "botswana post": 2131,
  "correios brazil": 2151,
  "brunei post": 2161,
  "bulgarian post": 2171,
  "sonapost": 2181,
  "burundi post": 2191,
  "china post": 3011,
  "china ems": 3013,
  "cambodia post": 3021,
  "campost": 3031,
  "canada post": 3041,
  "correios cabo verde": 3061,
  "correos chile": 3101,
  "4-72": 3131,
  "correos costa rica": 3181,
  "croatian post": 3191,
  "correos de cuba": 3201,
  "cyprus post": 3211,
  "czech post": 3221,
  "postnord danmark": 4011,
  "inposdom": 4041,
  "correos ecuador": 5011,
  "egypt post": 5021,
  "emirates post": 5031,
  "omniva": 5041,
  "ethiopian post": 5051,
  "fiji post": 6031,
  "posti": 6041,
  "la poste (colissimo)": 6051,
  "georgian post": 7031,
  "dhl paket": 7041,
  "deutsche post mail": 7044,
  "dhl ecommerce us": 7047,
  "dhl ecommerce asia": 7048,
  "ghana post": 7051,
  "elta": 7071,
  "correo de guatemala": 7121,
  "guyana post": 7141,
  "hongkong post": 8011,
  "correos de honduras": 8041,
  "magyar posta": 8051,
  "iceland post": 9011,
  "india post": 9021,
  "pos indonesia": 9031,
  "iran post": 9041,
  "an post": 9051,
  "israel post": 9061,
  "poste italiane": 9071,
  "iraq post (البريد العراقي)": 9081,
  "jamaica post": 10011,
  "japan post": 10021,
  "jordan post": 10031,
  "kaz post": 11011,
  "kenya post": 11021,
  "royal mail": 11031,
  "parcelforce": 11033,
  "kiribati post": 11041,
  "epost (인터넷우체국)": 11051,
  "epost (인터넷우체국)(domestic)": 11054,
  "posta e kosovës": 11071,
  "kuwait post": 11081,
  "kyrgyz post": 11091,
  "kyrgyz express post(kep)": 11094,
  "enterprise des poste lao": 12011,
  "enterprise des poste lao (apl)": 12016,
  "latvia post": 12021,
  "liban post": 12031,
  "lesotho post": 12041,
  "libya post": 12061,
  "lithuania post": 12081,
  "postplus": 12084,
  "saint lucia post": 12091,
  "luxembourg post": 12101,
  "macau post": 13011,
  "macedonia post": 13021,
  "paositra malagasy": 13031,
  "pos malaysia": 13051,
  "maldives post": 13061,
  "la poste du mali": 13071,
  "malta post": 13081,
  "mauritius post": 13131,
  "mailamericas": 13134,
  "mexico post": 13141,
  "moldova post": 13161,
  "mongol post": 13181,
  "montenegro post": 13191,
  "morocco post": 13211,
  "correios de moçambique": 13221,
  "myanmar post": 13231,
  "namibia post": 14011,
  "nepal post": 14031,
  "postnl": 14041,
  "postnl international mail": 14044,
  "nz post (new zealand post)": 14061,
  "nicaragua post": 14071,
  "norway post": 14081,
  "nigerian post": 14101,
  "oman post": 15011,
  "pakistan post": 16011,
  "palestine post": 16021,
  "correos panama": 16031,
  "png post": 16041,
  "correo paraguayo": 16051,
  "serpost": 16061,
  "philippine post": 16071,
  "poland post": 16081,
  "ctt": 16101,
  "q-post": 17011,
  "romania post": 18021,
  "russian post": 18031,
  "rwanda post": 18041,
  "svg post": 19021,
  "correo el salvador": 19031,
  "san marino post": 19051,
  "saudi post": 19071,
  "la poste de senegal": 19081,
  "serbia post": 19091,
  "seychelles post": 19111,
  "singapore post": 19131,
  "slovakia post": 19141,
  "slovenia post": 19151,
  "solomon post": 19161,
  "south africa post": 19171,
  "correos spain": 19181,
  "sri lanka post": 19191,
  "sudan post": 19201,
  "postnord sweden": 19241,
  "direct link": 19244,
  "swiss post": 19251,
  "samoa post": 19281,
  "chunghwa post": 20011,
  "chunghwa post (demestic)": 20012,
  "tanzania post": 20031,
  "thailand post": 20041,
  "la poste de togo": 20051,
  "tonga post": 20061,
  "trinidad and tobago postal corporation": 20071,
  "tuvalu post": 20091,
  "la poste de tunisia": 20101,
  "ptt": 20111,
  "uganda post": 21011,
  "ukrposhta": 21021,
  "uzbekistan post": 21031,
  "correo uruguayo": 21041,
  "usps": 21051,
  "vanuatu post": 22021,
  "ipostel": 22031,
  "vietnam post": 22041,
  "vietnam ems": 22043,
  "yemen post": 25011,
  "zambia post": 26011,
  "zimbabwe post": 26021,
  "general post office": 90021,
  "bermuda post": 90041,
  "gibraltar post": 90061,
  "jersey post": 90091,
  "aland post": 91021,
  "aruba post": 92031,
  "faroe post": 96021,
  "tele post": 96031,
  "opt-nc": 97021,
  "dhl express": 100001,
  "ups": 100002,
  "fedex": 100003,
  "tnt": 100004,
  "gls": 100005,
  "aramex": 100006,
  "dpd (de)": 100007,
  "toll": 100009,
  "dpd (uk)": 100010,
  "one world": 100011,
  "sf express": 100012,
  "dpex": 100014,
  "i-parcel": 100015,
  "asendia usa": 100016,
  "yodel": 100017,
  "hermes": 100018,
  "sda": 100019,
  "lwe": 100020,
  "landmark global": 100021,
  "meest": 100023,
  "gls (it)": 100024,
  "skynet": 100025,
  "brt bartolini(dpd)": 100026,
  "colis prive(colis privé)": 100027,
  "epost global": 100028,
  "asendia": 100029,
  "cdek": 100030,
  "hermes (de)": 100031,
  "exelot": 100032,
  "sp express": 100033,
  "smsa express (سمسا)": 100034,
  "nova poshta": 100035,
  "pitney bowes": 100036,
  "pony express": 100037,
  "zinc": 100038,
  "sagawa (佐川急便)": 100040,
  "sghグローバル (sagawa global)": 100041,
  "purolator": 100042,
  "inpost (pl)": 100043,
  "aramex au (formerly fastway au)": 100044,
  "cacesa postal": 100045,
  "parcel2go": 100046,
  "dhl parcel (nl)": 100047,
  "correos express": 100048,
  "ontrac": 100049,
  "uk mail": 100050,
  "sailpost": 100051,
  "lasership": 100052,
  "bluecare": 100053,
  "p2p mailing": 100054,
  "blue dart express": 100055,
  "ekart": 100056,
  "posta plus": 100058,
  "delhivery": 100060,
  "tforce final mile": 100061,
  "yamato (ヤマト運輸)": 100062,
  "tmg": 100063,
  "kex express (abx express)": 100064,
  "tnt (it)": 100065,
  "fastway (za)": 100066,
  "aramex nz (formerly fastway nz)": 100067,
  "fastway (ie)": 100068,
  "dtdc": 100069,
  "acs": 100070,
  "dpd (ru)": 100071,
  "dpd (fr)": 100072,
  "j&t express (id)": 100074,
  "easy way": 100075,
  "gts express": 100076,
  "pal express": 100077,
  "caribou": 100078,
  "j&t express (my)": 100079,
  "city link": 100081,
  "zajil express": 100082,
  "yona express": 100084,
  "k-mestu": 100085,
  "jne express": 100086,
  "nexive": 100087,
  "airpak express": 100088,
  "naqel": 100089,
  "aquiline": 100090,
  "hermes borderguru": 100091,
  "tmm express": 100092,
  "ксэ (cse)": 100093,
  "flip post": 100094,
  "easyget": 100095,
  "ddu express": 100097,
  "blueex": 100098,
  "ecom express": 100099,
  "wing": 100100,
  "xpressbees": 100101,
  "shadowfax": 100102,
  "esnad express": 100103,
  "ids logistics": 100104,
  "grastin": 100105,
  "pflogistics": 100107,
  "dellin": 100108,
  "quantium solutions": 100109,
  "dpd (pl)": 100111,
  "scm": 100112,
  "west bank": 100113,
  "ctt express": 100114,
  "japo transport": 100115,
  "cj korea express": 100116,
  "cj century": 100117,
  "gtd": 100118,
  "pts worldwide express": 100119,
  "jde": 100120,
  "apc postal logistics": 100121,
  "couriersplease": 100122,
  "sendle": 100123,
  "ninjavan (sg)": 100124,
  "ninjavan (id)": 100125,
  "ninjavan (ph)": 100126,
  "ninjavan (my)": 100127,
  "ninjavan (th)": 100128,
  "ninjavan (vn)": 100129,
  "beone": 100130,
  "courierplus nigeria": 100131,
  "packeta": 100132,
  "gpd service": 100133,
  "uniuni": 100134,
  "5post": 100135,
  "vestovoy": 100136,
  "chronopost morocco": 100137,
  "redpack": 100138,
  "estafeta": 100139,
  "janio": 100140,
  "geis": 100141,
  "dpd (ie)": 100142,
  "swiship": 100143,
  "zeleris": 100144,
  "gaash worldwide": 100145,
  "canpar express": 100146,
  "paquetexpress": 100147,
  "dao": 100148,
  "skypostal": 100149,
  "gd express": 100150,
  "rincos": 100151,
  "dhl parcel (uk)": 100152,
  "commonline": 100155,
  "grand slam express": 100156,
  "boxberry": 100157,
  "fast despatch": 100158,
  "whistl": 100159,
  "redbox mv": 100160,
  "matkahuolto": 100161,
  "nova poshta global": 100162,
  "tonami": 100163,
  "kuehne nagel": 100164,
  "saee": 100165,
  "bringer air cargo": 100166,
  "xdp express": 100167,
  "packlink": 100168,
  "glavdostavka": 100169,
  "smart post global": 100170,
  "seino (西濃運輸)": 100171,
  "sprintstar": 100172,
  "gcx": 100173,
  "cargus": 100174,
  "mrw": 100175,
  "ppl cz": 100176,
  "dpd (ro)": 100177,
  "apg ecommerce": 100178,
  "elta courier": 100179,
  "trackon": 100180,
  "helthjem": 100181,
  "comet hellas": 100182,
  "wahana prestasi logistik": 100183,
  "the courier guy": 100184,
  "tipsa": 100185,
  "dsv": 100186,
  "omniparcel": 100187,
  "dotzot": 100188,
  "gls spain (national)": 100189,
  "tracx logis": 100190,
  "firstmile": 100191,
  "skynet (my)": 100192,
  "bombino express": 100193,
  "easy mail": 100194,
  "ocs worldwide": 100195,
  "eurodis": 100196,
  "bringer parcel service": 100197,
  "speedy (dpd)": 100198,
  "oca": 100199,
  "tnt (au)": 100200,
  "micro express": 100201,
  "ghl logistics": 100202,
  "gv": 100203,
  "dpd (pt)": 100204,
  "loomis express": 100205,
  "db schenker": 100206,
  "gls (croatia)": 100207,
  "gls canada (dicom)": 100208,
  "interparcel (uk)": 100209,
  "interparcel (au)": 100210,
  "interparcel (nz)": 100211,
  "delnext": 100212,
  "spring gds": 100213,
  "swiship (uk)": 100214,
  "t-cat": 100215,
  "dhl activetracing": 100216,
  "united delivery service": 100217,
  "venipak": 100218,
  "celeritas": 100219,
  "estes": 100221,
  "fedex® international connect (fic)": 100222,
  "happy-post": 100223,
  "geniki taxydromiki": 100224,
  "early bird": 100225,
  "dhl parcel (pl)": 100226,
  "famiport": 100227,
  "jdl express": 100228,
  "j&t express (sg)": 100229,
  "cubyn": 100231,
  "pcf": 100232,
  "hunter express": 100233,
  "fps logistics": 100234,
  "flash express (th)": 100235,
  "kerry express (th)": 100236,
  "jeny": 100238,
  "collect+": 100239,
  "j&t express (ph)": 100240,
  "tnt (fr)": 100241,
  "saia": 100242,
  "hr parcel (hrp)": 100243,
  "chit chats": 100244,
  "dhl freight": 100245,
  "starken": 100246,
  "osm worldwide": 100247,
  "sending": 100248,
  "blue express": 100250,
  "agility": 100251,
  "urbanfox": 100252,
  "roadrunner freight": 100253,
  "xpo": 100254,
  "copa airlines courier": 100255,
  "nobordist": 100256,
  "iso logistics": 100257,
  "sendit": 100258,
  "ram": 100259,
  "tcs": 100260,
  "fedex® poland": 100261,
  "straightship": 100262,
  "cdl last mile": 100263,
  "lbc express": 100264,
  "express one": 100265,
  "hanjin": 100266,
  "cnilink": 100267,
  "post haste": 100268,
  "orangeds": 100269,
  "expeditors": 100270,
  "j&t express (th)": 100271,
  "jitsu (axlehire)": 100272,
  "chronopost": 100273,
  "hound express": 100274,
  "szendex": 100275,
  "boxme": 100276,
  "iqs": 100277,
  "chilexpress": 100278,
  "the professional couriers": 100279,
  "gls (hu)": 100280,
  "gls (cz)": 100281,
  "gls (sk)": 100282,
  "gls (si)": 100283,
  "gls (ro)": 100284,
  "runner express": 100285,
  "ocs ana group": 100286,
  "deprisa": 100287,
  "dawn wing (dpd laser)": 100288,
  "black arrow express": 100289,
  "skroutz last mile": 100290,
  "dealersend": 100291,
  "urvaam": 100293,
  "multrans logistics": 100294,
  "j&t international": 100295,
  "ajex": 100296,
  "ceva logistics": 100297,
  "dsv e-commerce il": 100298,
  "grupo ampm": 100299,
  "globaltrans": 100300,
  "fast express": 100301,
  "lionbay": 100302,
  "mondial relay": 100304,
  "gls (us)": 100305,
  "efs (e-commerce fulfillment service)": 100306,
  "speedaf": 100307,
  "amazon shipping + amazon mcf": 100308,
  "amazon shipping (uk)": 100309,
  "fargo": 100310,
  "swiship (de)": 100312,
  "gbs-broker": 100313,
  "speedex": 100315,
  "gls (pt)": 100316,
  "gate link logistics": 100317,
  "shipglobal us": 100318,
  "pro carrier": 100319,
  "sameday (ro)": 100320,
  "dpd (be)": 100321,
  "spaldex+": 100322,
  "qwintry logistics": 100323,
  "hrx": 100324,
  "aci logistix": 100325,
  "relex": 100326,
  "hfd": 100327,
  "express courier international": 100328,
  "rabee express": 100329,
  "vamox": 100330,
  "evri": 100331,
  "seko logistics": 100332,
  "arcbest (panther)": 100333,
  "deltec courier": 100334,
  "startrack": 100335,
  "inexpost": 100336,
  "lso(lone star overnight)": 100337,
  "kerry express (hk)": 100338,
  "r+l carriers": 100339,
  "abf freight": 100340,
  "redur": 100341,
  "dachser": 100342,
  "aaa cooper transportation": 100343,
  "sap express": 100344,
  "icumulus": 100345,
  "danske fragtmænd": 100346,
  "shree tirupati courier": 100347,
  "yurtici kargo": 100348,
  "cbl logistica": 100349,
  "mds collivery": 100350,
  "legion express": 100351,
  "shippit": 100352,
  "adsone": 100353,
  "2go": 100354,
  "wedo": 100355,
  "geodis": 100356,
  "shree maruti courier": 100357,
  "line clear express": 100358,
  "jocom": 100359,
  "inter courier": 100360,
  "wndirect": 100361,
  "mercury": 100362,
  "vasp expresso": 100363,
  "paack": 100364,
  "dobropost": 100365,
  "lcs-leopards courier service": 100366,
  "shiptor": 100367,
  "southeastern freight lines": 100368,
  "colicoli": 100370,
  "castle parcel": 100371,
  "daewoo fastex courier": 100372,
  "swyft logistics": 100373,
  "m&p courier": 100374,
  "brazil border": 100375,
  "pickupp (my)": 100377,
  "pickupp (sg)": 100378,
  "pick pack pont": 100379,
  "foxpost": 100380,
  "internet express": 100381,
  "teiker": 100382,
  "mtd": 100383,
  "gls (nl)": 100384,
  "net spa": 100385,
  "master-shifu": 100386,
  "pass the parcel": 100387,
  "j&t express (mx)": 100388,
  "mailalliance": 100389,
  "tp logistics": 100390,
  "best express": 100391,
  "dhl parcel (es)": 100392,
  "first global logistics": 100393,
  "pall-ex (uk)": 100394,
  "newgistics": 100395,
  "gel express logistik": 100396,
  "thabit logistics": 100397,
  "ups mail innovations": 100398,
  "tforce freight (ups freight)": 100399,
  "cst italia scarl": 100400,
  "penguin": 100401,
  "j&t express (sa)": 100402,
  "vamaship": 100403,
  "dpd (gr)": 100404,
  "citymail": 100405,
  "day & ross": 100406,
  "slovak parcel service": 100407,
  "shopee xpress (my)": 100408,
  "shopee xpress (id)": 100409,
  "shopee xpress (th)": 100410,
  "go4": 100411,
  "a1 post": 100412,
  "rtt": 100413,
  "border express": 100414,
  "swiship (au)": 100415,
  "sameday (hu)": 100416,
  "amazon shipping (in)": 100417,
  "mto express": 100418,
  "zasilkovna(zásilkovna)": 100419,
  "raben group": 100420,
  "gogo xpress": 100421,
  "dragonfly": 100422,
  "bring": 100423,
  "gefco": 100424,
  "piggyexpress": 100425,
  "ulala": 100426,
  "endicia": 100427,
  "eshipper": 100428,
  "global post": 100429,
  "dhl parcel spain": 100430,
  "gebrüder weiss (gw)": 100431,
  "envialia": 100432,
  "glovo": 100433,
  "asigna": 100434,
  "ecoscooting": 100435,
  "nacex": 100436,
  "ithink logistics": 100437,
  "seur": 100438,
  "am home delivery": 100440,
  "yrc freight": 100441,
  "valley tms": 100442,
  "ait worldwide logistics": 100443,
  "averitt express": 100444,
  "deliver-it": 100445,
  "broker den": 100446,
  "spee-dee delivery": 100447,
  "optima": 100448,
  "joom logistics": 100449,
  "hart 2 hart": 100450,
  "dabonea": 100451,
  "skyking": 100452,
  "bluestreak": 100453,
  "crosscountry freight": 100454,
  "meyer distribution": 100455,
  "j&t express (vn)": 100456,
  "loggi express br": 100457,
  "fercam": 100458,
  "pelican (宅配通)": 100459,
  "nimbus post": 100460,
  "relaiscolis": 100461,
  "inpost (uk)": 100462,
  "saferbo": 100463,
  "eli express": 100464,
  "basl express": 100465,
  "cycloon (fietskoeriers)": 100466,
  "conwest logistics": 100467,
  "inpost (it)": 100469,
  "global express": 100470,
  "pocztex": 100471,
  "daylight transport": 100472,
  "better trucks": 100473,
  "upu": 100475,
  "rpx online": 100476,
  "99minutos": 100477,
  "trumpcard": 100478,
  "super parcel": 100479,
  "flash express (ph)": 100480,
  "flash express (my)": 100481,
  "flash express (la)": 100482,
  "dpd (cz)": 100483,
  "dx": 100484,
  "ecotrack": 100485,
  "connect couriers": 100486,
  "bosta": 100487,
  "wizmo": 100490,
  "inter rapidisimo (inter rapidísimo)": 100491,
  "ivoy": 100492,
  "coordinadora": 100493,
  "liccardi": 100494,
  "servientrega": 100495,
  "sprint": 100496,
  "andreani": 100497,
  "odm express": 100498,
  "swift": 100499,
  "ondot courier": 100501,
  "hailify": 100502,
  "palletonline": 100504,
  "trax": 100505,
  "lotte global logistics": 100506,
  "mainfreight": 100507,
  "pickrr": 100508,
  "tws express courier": 100509,
  "ambroexpress": 100510,
  "idexpressindonesia": 100511,
  "compass": 100512,
  "forza delivery": 100513,
  "txexpress": 100514,
  "meyer-jumbo": 100515,
  "guatex": 100516,
  "uafrica": 100517,
  "hellmann": 100518,
  "shopeeexpress(ph)": 100519,
  "boxtal": 100520,
  "bunddl": 100521,
  "ryder": 100522,
  "famafutar": 100523,
  "tuffnells": 100524,
  "e-com shipping solutions (p) ltd": 100525,
  "euroexpress": 100526,
  "appleexpress": 100527,
  "intereuropa": 100528,
  "labaih": 100529,
  "shreeanjani": 100530,
  "morning global": 100531,
  "fmx": 100532,
  "fermopoint": 100533,
  "branding worldwide pty ltd": 100534,
  "via cargo": 100535,
  "plg futár": 100536,
  "nzt logistics corp": 100537,
  "shopeeexpress(vn)": 100538,
  "gorush": 100539,
  "cj logistics (sg)": 100540,
  "sendex": 100541,
  "gt xpress": 100542,
  "postone": 100543,
  "kdz express": 100544,
  "glt express": 100545,
  "сберлогистика (sberlogistics)": 100546,
  "shape sky logistics": 100547,
  "nox nachtexpress": 100548,
  "pt maju bersama semeru (parcelgoo)": 100549,
  "alf mensajería": 100551,
  "postmedia parcel services (bni parcel tracking)": 100552,
  "superhero express": 100553,
  "jet logistic": 100554,
  "intelcom (ca)": 100555,
  "dpd (at)": 100556,
  "breeze": 100557,
  "esigetexpress": 100558,
  "searates": 100560,
  "avent logistics": 100561,
  "insta world": 100562,
  "air bus logistics": 100563,
  "swiship (jp)": 100564,
  "australian regional xpress pty ltd": 100565,
  "onex": 100566,
  "smartr logistics": 100567,
  "еконт (econt)": 100568,
  "경동택배 (kyoungdong)": 100569,
  "swiship (ca)": 100570,
  "swiship (es)": 100571,
  "swiship (fr)": 100572,
  "postnord (no)": 100573,
  "postnord (fi)": 100574,
  "gfl logística": 100575,
  "sterling global aviation logistics": 100576,
  "pbt express freight network": 100577,
  "gfs seeker": 100578,
  "nationex": 100579,
  "walkers transport": 100580,
  "nas express": 100581,
  "sprinter": 100582,
  "юнитрейд (unitrade)": 100583,
  "dpd (hu)": 100584,
  "kurir rekomendasi (tokopedia)": 100585,
  "lion parcel": 100586,
  "rex kiriman express": 100587,
  "tiki": 100588,
  "anteraja": 100589,
  "sicepat": 100590,
  "paxel": 100591,
  "new zealand couriers": 100592,
  "ghn (giao hàng nhanh)": 100593,
  "inpost (es)": 100594,
  "shopee xpress (sg)": 100595,
  "ninja van (international tracking)": 100597,
  "inpost (pt)": 100598,
  "fukuyama transporting (福山通運)": 100599,
  "dakota group": 100600,
  "nippon express (日本通運)": 100601,
  "franch express": 100602,
  "shree mahavir express services": 100603,
  "st courier": 100604,
  "mudita": 100605,
  "mark express": 100606,
  "aras kargo": 100607,
  "dhl ecommerce (mng kargo)": 100608,
  "budbee": 100609,
  "pack & send": 100610,
  "viettel post": 100611,
  "parcll": 100612,
  "team worldwide": 100613,
  "boxc": 100614,
  "shipa": 100615,
  "qualitypost": 100616,
  "big smart": 100617,
  "logen (로젠택배)": 100618,
  "j&t express (eg)": 100619,
  "shree nandan courier limited": 100620,
  "buffalo (za)": 100621,
  "segmail": 100622,
  "allied express transport": 100623,
  "goodluck courier service": 100624,
  "jetline couriers pvt. ltd": 100625,
  "cts group": 100626,
  "eship": 100627,
  "hiyes": 100628,
  "fan courier": 100629,
  "blackhaul": 100630,
  "cupost (cu 편의점택배)": 100631,
  "kintetsu logistics systems (近鉄ロジスティクス)": 100632,
  "tm cargo": 100633,
  "kerry express": 100634,
  "starex logistic": 100635,
  "instadispatch": 100636,
  "건영택배 (kunyong express)": 100637,
  "ics courier": 100638,
  "sca express": 100639,
  "mrl global": 100640,
  "kwiksave logistics": 100641,
  "hepsijet": 100642,
  "pcp express": 100643,
  "postnet": 100644,
  "airterra": 100645,
  "gls portugal (national)": 100646,
  "elite co.": 100647,
  "allegro": 100648,
  "arco spedizioni": 100649,
  "pantos logistics (lx pantos)": 100650,
  "flickpost": 100651,
  "dtd": 100652,
  "you track": 100653,
  "fliway": 100654,
  "top logistics australia (tla)": 100655,
  "green-way couriers": 100656,
  "homerr": 100657,
  "smb express": 100658,
  "parxl": 100659,
  "kurasi": 100660,
  "iloxx gmbh": 100661,
  "shiprocket": 100662,
  "4 sides": 100664,
  "rivigo": 100665,
  "bex": 100666,
  "courier center": 100667,
  "fastlinkagexpress": 100668,
  "nord et ouest express": 100669,
  "synship": 100670,
  "parcelhub": 100671,
  "saveway logistics": 100672,
  "intercontinental cargo movers": 100674,
  "orlen paczka": 100675,
  "pullman cargo": 100676,
  "shipshopus": 100677,
  "a tiempo cargo": 100678,
  "pilot freight services (maersk)": 100679,
  "mazet": 100680,
  "fstexpress": 100681,
  "first flight couriers": 100682,
  "safexpress": 100683,
  "echo global logistics": 100684,
  "ems (express mail service)": 100685,
  "yusen logistics": 100686,
  "tata express": 100687,
  "a tu hora express": 100688,
  "cj logistics": 100689,
  "dependable supply chain services": 100690,
  "intras corporation": 100691,
  "raf": 100692,
  "mykn": 100693,
  "ontime": 100694,
  "qtrack": 100695,
  "shree mahalabali express": 100696,
  "pavan courier service pvt. ltd.": 100697,
  "closer logistics": 100698,
  "ats healthcare": 100699,
  "spoton": 100700,
  "wepost": 100701,
  "doora logistics. (두라로지스틱스)": 100702,
  "surat kargo (sürat kargo)": 100703,
  "kerry tj": 100704,
  "akash ganga courier": 100705,
  "post luxembourg (log)": 100706,
  "bue sky courier": 100707,
  "express courier link": 100708,
  "dpd local": 100709,
  "madhur courier services": 100710,
  "yes courier": 100711,
  "eagle post": 100712,
  "air star xpress couriers": 100713,
  "dnx cargo": 100714,
  "supreme express": 100715,
  "airways courier": 100716,
  "gati": 100717,
  "eparcel korea": 100718,
  "roadbull": 100719,
  "m xpress": 100720,
  "neway transport": 100721,
  "yamato logistics (hk)": 100722,
  "gfs xpress": 100723,
  "a. duie pyle": 100724,
  "dd express": 100725,
  "acommerce": 100726,
  "americanas entrega": 100727,
  "janco e-commerce": 100728,
  "nim express (นิ่มเอ็กซ์เพรส )": 100729,
  "skynet worldwide express": 100730,
  "xpert delivery": 100731,
  "chyuan-toong logistics": 100732,
  "always express": 100733,
  "planzer parcel": 100734,
  "maruti air": 100735,
  "sutton transport": 100736,
  "dimerco": 100737,
  "tfmxpress": 100738,
  "global commercial technology co.,ltd.": 100739,
  "scan global logistics": 100740,
  "tck express": 100741,
  "aeronet": 100742,
  "pandion": 100743,
  "sameday (bg)": 100744,
  "crl express": 100745,
  "3jms logistics": 100746,
  "direx s.a. (дайрекс eад)": 100747,
  "kintetsu world express (近鉄エクスプレス [kwe])": 100748,
  "boyacá delivery": 100749,
  "amazon shipping (it)": 100750,
  "shipx": 100751,
  "malca-amit": 100752,
  "one (ocean network express)": 100753,
  "gbtechnology": 100754,
  "cma cgm": 100755,
  "east wind express": 100756,
  "kronos express": 100757,
  "polar express": 100758,
  "dmsmatrix": 100759,
  "fulfilla": 100760,
  "parcel.one": 100761,
  "payo": 100762,
  "shipter": 100763,
  "intex paketdienst": 100764,
  "dhl ecommerce cn": 100765,
  "dhl global forwarding": 100766,
  "passport": 100767,
  "maersk": 100768,
  "atc logistical solutions pvt. ltd": 100769,
  "callcourier": 100770,
  "teleport": 100771,
  "fastbox (패스트박스)": 100772,
  "freightquote by c.h. robinson": 100773,
  "tig": 100774,
  "typ (to your place)": 100775,
  "nippon express (global)": 100776,
  "der kurier": 100777,
  "j&t cargo (id)": 100778,
  "fast and furious": 100779,
  "biz courier": 100780,
  "pack-man": 100781,
  "pitt ohio": 100782,
  "old dominion freight line": 100783,
  "rxo": 100784,
  "snt global logistics": 100785,
  "zmc express": 100786,
  "mhi": 100787,
  "un-line（global un-line express）": 100788,
  "to my door": 100789,
  "dai post": 100790,
  "orian": 100791,
  "vozovoz": 100792,
  "пэк (pec)": 100793,
  "airwings": 100794,
  "ubx": 100795,
  "ase asia africa sky express": 100796,
  "j&t express (br)": 100797,
  "mgl express (magnate group logistics)": 100798,
  "royal express": 100799,
  "fan courier (eu)": 100800,
  "quiqup": 100801,
  "overseas express": 100802,
  "norsk": 100803,
  "hubbed": 100804,
  "plycon transportation group": 100805,
  "thelorrymy": 100806,
  "dpd (hr)": 100807,
  "dpd (ee)": 100808,
  "dpd (lv)": 100809,
  "dpd (lt)": 100810,
  "dpd (nl)": 100811,
  "dpd (sk)": 100812,
  "dpd (si)": 100813,
  "dpd (lu)": 100814,
  "dpd (ch)": 100815,
  "pactic": 100816,
  "forward": 100817,
  "stat overnight delivery": 100818,
  "estafeta usa": 100819,
  "asyad express (أسياد)": 100820,
  "mylerz": 100821,
  "entrego": 100822,
  "bombax logistics pvt. ltd.": 100823,
  "tciexpress": 100824,
  "skyex (sky express)": 100825,
  "airtrans group ltd.": 100826,
  "tracknator": 100827,
  "atlantic international express": 100828,
  "shipblu": 100829,
  "score japan": 100830,
  "oak harbor freight lines": 100831,
  "mail boxes etc (mbe)": 100832,
  "skynet (za)": 100833,
  "stallion express": 100834,
  "xde logistics": 100835,
  "timely titan express": 100836,
  "citi-sprint": 100837,
  "act logistics": 100838,
  "unis": 100839,
  "holisol": 100840,
  "fedex® cross border (uk)": 100841,
  "dhl supply chain apac": 100842,
  "makati express": 100843,
  "fastiexpress": 100844,
  "spedisci .online": 100845,
  "olva courier": 100846,
  "concord logistik": 100847,
  "shypmax": 100848,
  "rhenus logistics (it)": 100850,
  "cathedis": 100851,
  "continental courier service": 100852,
  "fizzpa ( فيزبا)": 100853,
  "fedex france domestic": 100854,
  "aymakan": 100855,
  "j&t express (ae)": 100856,
  "itella": 100857,
  "aymakan (ae)": 100858,
  "safe arrival": 100859,
  "major express": 100860,
  "the united pallet network": 100862,
  "shopee xpress (tw)": 100863,
  "neighbour express": 100864,
  "tresguerras": 100865,
  "grupo castores": 100866,
  "imx distribution group": 100867,
  "svuum": 100868,
  "cargoex freight movers": 100869,
  "fast express cargo pvt. ltd": 100870,
  "jupiter services": 100871,
  "team global express (myteamge)": 100872,
  "globkurier.pl": 100873,
  "gs networks (gs네트웍스)": 100874,
  "pchome express": 100875,
  "ttu paquetería y mensajería": 100876,
  "savar express": 100877,
  "wassel (واصل)": 100878,
  "route 1 fulfilment": 100879,
  "panther logistics": 100880,
  "furdeco": 100881,
  "fast horse express (au)": 100882,
  "kwick box": 100883,
  "logoix": 100884,
  "direct xpress": 100885,
  "lenton group (dpd)": 100886,
  "kangu": 100887,
  "bee fast": 100888,
  "zappy": 100889,
  "jet-f worldwide express": 100890,
  "ikea (th)": 100891,
  "ycs logistics": 100892,
  "icc worldwide": 100893,
  "first flight singapore": 100894,
  "wiseloads": 100895,
  "reddaway": 100896,
  "domain logistics": 100897,
  "lexship": 100898,
  "frontline freight": 100899,
  "palletways": 100900,
  "penta express": 100901,
  "eksprespasta": 100902,
  "transnet couriers": 100903,
  "indah logistik": 100904,
  "1strack": 100905,
  "pandu logistics": 100906,
  "spicexpress": 100907,
  "speed & safe": 100908,
  "maple logistics (便利帶)": 100909,
  "paperfly": 100910,
  "nhất tín logistics": 100911,
  "tej couriers": 100912,
  "priority1": 100913,
  "excel transportation": 100914,
  "cargo international": 100915,
  "best overnite express": 100916,
  "fast horse express (nz)": 100917,
  "fast horse express (us)": 100918,
  "4cus": 100919,
  "ward transport & logistics corp": 100920,
  "paxi": 100921,
  "custom companies": 100922,
  "sg link": 100923,
  "yamato transport singapore": 100924,
  "trendyol express": 100925,
  "zoom": 100926,
  "courierit": 100927,
  "dayton freight": 100928,
  "metropolitan": 100929,
  "northline": 100930,
  "peddler": 100931,
  "instabox": 100932,
  "myib international bridge": 100933,
  "one-x": 100934,
  "sahara express": 100935,
  "france express": 100936,
  "flyking": 100937,
  "servex": 100938,
  "xl express": 100939,
  "cope sensitive freight": 100940,
  "skybox": 100941,
  "moa logistics": 100942,
  "parcelpoint": 100943,
  "daesin": 100944,
  "jumppoint": 100945,
  "servientrega ecuador": 100946,
  "ecourier": 100947,
  "royale international": 100948,
  "bonds transport group": 100949,
  "viaxpress": 100950,
  "movin": 100951,
  "megacity courier": 100952,
  "gms worldwide express": 100953,
  "khubani air pack": 100954,
  "spfly logística": 100955,
  "central transport": 100956,
  "edi express inc": 100957,
  "chunil cargo": 100958,
  "transaher": 100959,
  "gio express": 100960,
  "pakajo": 100961,
  "genka express": 100962,
  "go! express": 100963,
  "estes forwarding worldwide": 100964,
  "woojin interlogis": 100965,
  "dm delivers": 100966,
  "fiege netherlands": 100967,
  "тк энергия": 100968,
  "l-post": 100969,
  "m3 logistics": 100970,
  "unknown": 100971,
  "sonic transportation & logistics": 100972,
  "エコ配 (ecohai)": 100973,
  "транспортная компания кит (kit)": 100974,
  "байкал сервис": 100975,
  "mailog": 100976,
  "designer transport": 100977,
  "crossflight": 100978,
  "tusk logistics": 100979,
  "promed delivery inc": 100980,
  "parcel to post": 100981,
  "omni logistics": 100982,
  "global eco": 100983,
  "lionwheel": 100984,
  "miller deliveries (מילר משלוחים)": 100985,
  "flight logistics": 100986,
  "team express": 100987,
  "ark space": 100988,
  "asl distribution services (asl)": 100989,
  "first fly express": 100990,
  "xindus": 100991,
  "syncreon": 100992,
  "envía (envia)": 100993,
  "exeldirect": 100994,
  "total transport & distribution, inc.": 100995,
  "gofo": 100996,
  "lazada logistics (vn)": 100997,
  "starlinks global": 100998,
  "purolator shipping": 100999,
  "purolator international": 101000,
  "amazon shipping (fr)": 101001,
  "spaceship": 101002,
  "bjs home delivery": 101003,
  "speedpost": 101004,
  "xlcourier": 101005,
  "e-cargo (אי קרגו לוגיסטיקה בע\"מ)": 101006,
  "xcargo": 101007,
  "box now": 101008,
  "atc express": 101009,
  "palletforce": 101010,
  "needletail logistics": 101011,
  "ninjavan (mm)": 101012,
  "hub-ez": 101013,
  "nomad express delivery llc": 101014,
  "pargo": 101015,
  "maegmant": 101016,
  "dedicated delivery professionals inc.": 101017,
  "advanced & simple logistics": 101018,
  "j&t cargo (my)": 101019,
  "vinted go": 101020,
  "fastentegre shipment": 101021,
  "intime ship": 101022,
  "magnum": 101023,
  "southwestern motor transport": 101024,
  "jp express": 101025,
  "kinisi transport": 101026,
  "tax-air": 101027,
  "ocs america": 101028,
  "monsotrack": 101029,
  "warp": 101030,
  "sentral cargo": 101031,
  "dpd (cn)": 101032,
  "zajel": 101033,
  "gigacloud technology inc": 101034,
  "fleetoptics": 101035,
  "doordash": 101036,
  "7 hours express": 101037,
  "hofmann": 101038,
  "emons": 101039,
  "sislógica": 101040,
  "apg global": 101041,
  "darwynn driver": 101042,
  "fulfillment bridge": 101043,
  "houng ah loun logistics": 101044,
  "yundaexpress (tw)": 101045,
  "starex": 101046,
  "pml intl": 101047,
  "hispapost": 101048,
  "raven force couriers": 101049,
  "moran transportation corporation": 101050,
  "accufrate": 101051,
  "jadlog": 101052,
  "jańa post": 101053,
  "almex": 101054,
  "the human express": 101055,
  "mothership": 101056,
  "greenway": 101057,
  "daily xpress": 101058,
  "integrated couriers & logistics": 101059,
  "seino super express": 101060,
  "delivo": 101062,
  "yundaexpress (asia)": 101063,
  "go logistics": 101064,
  "apc overnight": 101065,
  "direct freight express": 101066,
  "geis (pl)": 101067,
  "veho": 101068,
  "mylerz (dz)": 101069,
  "gls (de)": 101070,
  "egxpress": 101071,
  "relay": 101072,
  "laarcourier": 101073,
  "gig logistics": 101074,
  "ap cargo": 101075,
  "arrow xl": 101076,
  "best yet express": 101077,
  "c.h. robinson": 101078,
  "msc": 101079,
  "pacific international lines": 101080,
  "amazon shipping (es)": 101081,
  "urbano": 101082,
  "hermes einrichtungs service": 101083,
  "city express": 101084,
  "on time courier": 101085,
  "shipglobal.in": 101086,
  "dpd (kz)": 101087,
  "dpd (uz)": 101088,
  "last one mile co-op (ラストワンマイル協同組合)": 101089,
  "xalq.global": 101090,
  "express one (bg)": 101091,
  "expressgodo logistics": 101092,
  "exclusive delivery network": 101093,
  "fastfrate group": 101094,
  "kindersley transport": 101095,
  "vitran express": 101096,
  "tql trax": 101097,
  "ub cab": 101098,
  "emu": 101099,
  "pushpak courier": 101100,
  "mnpost llc": 101101,
  "fuuffy": 101102,
  "久留米運送株式会社": 101103,
  "plus cargo service": 101104,
  "bringly": 101105,
  "shipentegra": 101106,
  "iparcel": 101107,
  "dpd group": 101108,
  "gls group": 101109,
  "fastway logistics": 101110,
  "aci express": 101111,
  "tfww": 101112,
  "247express": 101113,
  "insmail express": 101114,
  "the delivery group": 101115,
  "gobolt": 101116,
  "rastreaê": 101117,
  "lazada choice": 101118,
  "gta gsm": 101119,
  "lucky fast express": 101120,
  "rist transport": 101121,
  "alfa delivery services": 101122,
  "logistio": 101123,
  "orchestro": 101124,
  "lettertrack": 101125,
  "chazki": 101126,
  "cod express": 101127,
  "packs": 101128,
  "spreetail": 101129,
  "latam global": 101130,
  "xmiles": 101131,
  "jp logistics": 101132,
  "logistiq": 101133,
  "domex": 101134,
  "kart2door": 101135,
  "silpo pack": 101136,
  "ozon": 101137,
  "c chez vous": 101138,
  "manga freight": 101139,
  "logistics daejang": 101140,
  "booth logistics": 101141,
  "ns logistics": 101142,
  "slx": 101143,
  "acrossb": 101144,
  "woori courier": 101145,
  "heycouriers": 101146,
  "maersk ecommerce": 101147,
  "sf express indonesia": 101148,
  "good express": 101149,
  "mongol infinity post": 101150,
  "grigora logistics": 101151,
  "sengi express": 101152,
  "c807xpress": 101153,
  "topnic": 101154,
  "unknown_2": 101155,
  "geodispl": 101156,
  "deliver direct": 101157,
  "mrsool": 101158,
  "mongol post (ecommerce)": 101159,
  "schneider": 101160,
  "matson": 101161,
  "meest group": 101162,
  "the courier guy (pudo)": 101163,
  "bookabldg": 101164,
  "matson group": 101165,
  "advantage logistics": 101166,
  "xdp deliveries": 101167,
  "eco express": 101168,
  "reliable mile": 101169,
  "us cargo": 101170,
  "dohrn": 101171,
  "north park transportation": 101172,
  "diamond line delivery": 101173,
  "go2 logistics": 101174,
  "ant parcel tracking": 101175,
  "nova post": 101176,
  "kse": 101177,
  "n&m transfer": 101178,
  "ilyang logis": 101179,
  "meyer logistics": 101180,
  "tcc": 101181,
  "thijs logistiek": 101182,
  "rr express": 101184,
  "cargoboard": 101185,
  "tsb": 101186,
  "hicargo": 101187,
  "hercules": 101188,
  "getgive": 101189,
  "youparcel": 101190,
  "homexpress": 101191,
  "onway": 101192,
  "best inc (my)": 101193,
  "best inc (vn)": 101194,
  "best inc (sg)": 101195,
  "best inc (th)": 101196,
  "best inc (kh)": 101197,
  "valmo": 101198,
  "leapro": 101199,
  "walmart": 101200,
  "sundarban courier": 101201,
  "jitbox": 101202,
  "pcs": 101203,
  "bfe": 101204,
  "winion logis": 101205,
  "innofulfill": 101206,
  "midwest motor express": 101207,
  "flash routes": 101208,
  "emega": 101209,
  "dragon star curier": 101210,
  "defix": 101211,
  "too ez": 101212,
  "performance freight": 101213,
  "smith logistics": 101214,
  "urbano (pe)": 101215,
  "finalstep": 101216,
  "bookurier": 101217,
  "tamex": 101218,
  "cheetah group": 101219,
  "rsa global": 101221,
  "mte xpress": 101222,
  "upd": 101223,
  "coupang logistics": 101224,
  "quicksilver": 101225,
  "xtra express logistics": 101226,
  "mountain valley express": 101227,
  "swiftx": 101228,
  "ave logistics": 101229,
  "united": 101230,
  "standard forwarding": 101231,
  "no limit logistics": 101232,
  "ctl": 101233,
  "lastmilenexus": 101234,
  "shalom": 101235,
  "shiphubx": 101236,
  "transource freightways": 101237,
  "coretrails": 101238,
  "shipbob": 101239,
  "moova": 101240,
  "ozon express": 101241,
  "teleship": 101242,
  "burd delivery": 101243,
  "ezpost": 101244,
  "chronodiali": 101245,
  "sbs即配サポート": 101246,
  "dropshiptrack": 101247,
  "schaeflein": 101248,
  "horoz lojistik": 101249,
  "suus": 101250,
  "maroon freight": 101251,
  "alliance air freight": 101252,
  "deliverysolutions": 101254,
  "track your parcel": 101255,
  "unknown_3": 101256,
  "milsped": 101257,
  "transfera": 101258,
  "bluesky parcel": 101259,
  "gofo italy": 101260,
  "midland transport": 101261,
  "csatransport": 101262,
  "cct canda": 101263,
  "maxzeego": 101264,
  "asendia france": 101265,
  "dhl": 101266,
  "kexpress": 101267,
  "unex": 101268,
  "rhenuslogistics": 101269,
  "pdq": 101270,
  "kolay gelsin": 101271,
  "gls (fr)": 101272,
  "cn express": 101273,
  "gofo netherlands": 101274,
  "transmission": 101275,
  "btc": 101276,
  "eastlight logistics zambia": 101277,
  "oto flex": 101278,
  "ceva logistics (tr)": 101279,
  "via post": 101280,
  "askmebuy": 101281,
  "premium rush shop": 101282,
  "ceva's home delivery": 101283,
  "dragonfly (ca)": 101284,
  "tramaco": 101285,
  "agediss": 101286,
  "returnmates": 101287,
  "teamglobleexpress": 101288,
  "proships": 101289,
  "euro ecommerce": 101290,
  "furniture logis": 101291,
  "evdemo lojistik": 101292,
  "peru box air": 101293,
  "bovo": 101294,
  "tccs": 101295,
  "dtdc australia": 101296,
  "celero group": 101297,
  "pacific express": 101298,
  "m5 continent": 101299,
  "bts express cargo servis": 101300,
  "sway": 101301,
  "dp world": 101302,
  "netpost": 101303,
  "cps lastmile": 101304,
  "peqasus mmc": 101305,
  "nk logistic": 101306,
  "master air": 101307,
  "scs express": 101308,
  "quick rabbit": 101309,
  "efw shipment tracking": 101310,
  "speedy (ca)": 101311,
  "postex": 101312,
  "inntralog": 101313,
  "lex indonesia": 101314,
  "servicarga doral": 101315,
  "fg delivery": 101316,
  "flow progressive logistics": 101317,
  "just ship": 101318,
  "fimile": 101319,
  "xportel": 101320,
  "awst": 101321,
  "jb hunt": 101322,
  "evropat": 101323,
  "xgsi": 101324,
  "tst-cf express": 101325,
  "lex": 101326,
  "cwa express": 101327,
  "dynalogic": 101328,
  "pakekoaja": 101329,
  "yto express (ph)": 101330,
  "vigocloud": 101331,
  "expresso padrão": 101332,
  "cristao shipping & marine logistics ltd": 101333,
  "ads-intl": 101334,
  "ahamove": 101335,
  "makera": 101336,
  "cargoholic": 101337,
  "numark transportation": 101338,
  "usa7express": 101339,
  "lightning express": 101340,
  "conveyor uni express": 101341,
  "goto logistics (gtl)": 101343,
  "alpha cargo": 101344,
  "wpg": 101342,
  "pathao": 101345,
  "lex (my)": 101346,
  "steadfast": 101347,
  "roadit rhenus logistics": 101348,
  "next level": 101349,
  "rohlig": 101350,
  "cargo partner": 101351,
  "vente unique delivery": 101352,
  "purolator freight": 101353,
  "acex+": 101354,
  "kleine": 101355,
  "portal postnord": 101356,
  "ydm": 101357,
  "imx": 101358,
  "jeebly": 101359,
  "starlinks": 101360,
  "skladusa": 101361,
  "peninsula truck lines": 101362,
  "world courier": 101363,
  "express one (si)": 101364,
  "chark express": 101365,
  "mydtdc": 101366,
  "rayspeed asia": 101367,
  "ntl": 101368,
  "spx express (my)": 101369,
  "30post": 101370,
  "trend transport": 101371,
  "j&t express colombia": 101372,
  "swftbox": 101373,
  "tdvgroup": 101374,
  "torrestir": 101375,
  "yc delivery": 101376,
  "spt furniture logistics": 101377,
  "dupont bedu": 101378,
  "pinpoint parcels": 101379,
  "transnautica": 101380,
  "method": 101381,
  "dbox": 101382,
  "to-day": 101383,
  "paxy": 101384,
  "cm forwarding": 101385,
  "gollog": 101386,
  "esi delivery service": 101387,
  "xpect same day": 101389,
  "transworld shipping services": 101390,
  "bolt kargo": 101391,
  "amazon shipping": 101392,
  "fedexgroup": 101393,
  "sgk distribution": 101394,
  "united porte inc": 101395,
  "huboo logistics": 101397,
  "flyt": 190002,
  "huahan logistics": 190003,
  "yunexpress": 190008,
  "bqc": 190011,
  "yanwen": 190012,
  "jsh": 190025,
  "ews": 190026,
  "miuson": 190027,
  "eps": 190028,
  "hrd": 190031,
  "xqe": 190038,
  "ada国际": 190042,
  "anjun": 190047,
  "kwt": 190054,
  "sprintpack": 190059,
  "mingzhi": 190063,
  "zdsd": 190068,
  "sunyou": 190072,
  "topyou": 190074,
  "eshun": 190075,
  "bab": 190076,
  "tt express": 190077,
  "bona": 190080,
  "xingyuan": 190081,
  "j-net": 190082,
  "wise express": 190085,
  "wanb express": 190086,
  "senjietong": 190087,
  "bird system": 190089,
  "u-speed": 190092,
  "4px": 190094,
  "ymy": 190096,
  "shang fang": 190098,
  "epos": 190099,
  "wse logistics": 190100,
  "wht": 190102,
  "jtex": 190105,
  "yji": 190106,
  "bel": 190108,
  "utec": 190109,
  "chukou1": 190111,
  "ubi": 190112,
  "sfc": 190113,
  "yht": 190114,
  "gati (cn)": 190119,
  "jcex": 190120,
  "usky": 190122,
  "nuo": 190126,
  "dwz expres": 190133,
  "139express": 190135,
  "equick": 190136,
  "sinoex": 190137,
  "cosco shipping air": 190138,
  "take send": 190139,
  "aus": 190146,
  "far international": 190152,
  "rct": 190153,
  "hkd": 190156,
  "yto express": 190157,
  "alljoy": 190163,
  "17feia": 190164,
  "wishpost": 190165,
  "xyl": 190167,
  "ecms": 190168,
  "wel": 190170,
  "sumtom": 190171,
  "ltexp": 190172,
  "huin logistics": 190173,
  "deppon": 190174,
  "zto international": 190175,
  "wsh": 190178,
  "gxa": 190183,
  "eqt": 190185,
  "ecexpress": 190187,
  "tzt": 190193,
  "tonda global": 190194,
  "zxg": 190198,
  "js": 190199,
  "ydh": 190200,
  "quickway": 190201,
  "orange connex": 190205,
  "cne": 190208,
  "cgs": 190210,
  "tianzi": 190211,
  "yuanhao logistics": 190212,
  "spes": 190213,
  "syd": 190221,
  "lex_2": 190223,
  "kerry ecommerce": 190225,
  "buffalo": 190226,
  "hjyt": 190229,
  "cititrans": 190234,
  "uvan": 190238,
  "5ul": 190240,
  "ese": 190242,
  "yds": 190243,
  "oopston": 190244,
  "uxtx": 190248,
  "ydgj": 190251,
  "yl": 190252,
  "cke": 190253,
  "zce": 190258,
  "best inc.": 190259,
  "edl": 190261,
  "ant express": 190265,
  "cainiao": 190271,
  "to c logistics": 190272,
  "jiayou exp": 190274,
  "esx logistics": 190275,
  "shunbang": 190276,
  "mctrans": 190278,
  "byt": 190279,
  "sdk": 190280,
  "pfc": 190282,
  "cj": 190283,
  "winit": 190284,
  "leader": 190285,
  "escbest": 190289,
  "bsi": 190290,
  "yidst": 190292,
  "yha": 190296,
  "tfs": 190297,
  "hdqn": 190299,
  "jiufang": 190301,
  "jd worldwide": 190302,
  "asiafly": 190303,
  "anserx": 190304,
  "hytx": 190306,
  "wwe": 190313,
  "fckj": 190314,
  "sto global": 190316,
  "tde": 190318,
  "ysd": 190319,
  "oyxgj": 190320,
  "epp": 190321,
  "four seasons": 190322,
  "tinzung": 190323,
  "sto express": 190324,
  "zsgj": 190325,
  "sbd": 190326,
  "huahang": 190328,
  "eac": 190329,
  "e-bond": 190330,
  "btd": 190331,
  "jdy": 190332,
  "msd": 190334,
  "br1": 190335,
  "pd": 190336,
  "fbb": 190337,
  "zt": 190338,
  "xyy": 190340,
  "uda international": 190341,
  "ou jie": 190343,
  "scgj": 190344,
  "sgf": 190346,
  "lidi logistics": 190347,
  "1tong": 190349,
  "atwindow": 190350,
  "sinodidi": 190351,
  "hsdgj": 190352,
  "fjex": 190353,
  "madrooex": 190356,
  "jh": 190357,
  "dwe": 190358,
  "lingxun logistics": 190360,
  "bsie": 190361,
  "sunnyway": 190363,
  "cd": 190364,
  "jy": 190365,
  "komon": 190366,
  "hnca logistics": 190369,
  "ao you": 190370,
  "fsgj": 190371,
  "hmg": 190372,
  "qyexp": 190374,
  "runbai": 190375,
  "ed post": 190376,
  "stadt": 190377,
  "joying box": 190379,
  "lmsy": 190380,
  "huasheng int": 190382,
  "qyun": 190383,
  "shjx": 190384,
  "rhm": 190385,
  "luckinpost": 190386,
  "nbt": 190387,
  "hqgjxb": 190388,
  "yfh": 190389,
  "kuajing line": 190390,
  "aml": 190391,
  "chinacourier": 190393,
  "yfm": 190394,
  "safly": 190395,
  "parceljet": 190396,
  "dyexpress": 190397,
  "gimen": 190398,
  "fargood": 190399,
  "1stop": 190400,
  "myd": 190401,
  "superton": 190402,
  "wm": 190403,
  "csil": 190404,
  "one line": 190405,
  "xxd": 190406,
  "she": 190407,
  "at": 190408,
  "allroad": 190409,
  "yfht": 190410,
  "ywgj": 190411,
  "ewe global express": 190412,
  "dnj express": 190413,
  "comet tech": 190414,
  "uc express": 190415,
  "hsd express": 190416,
  "py express": 190417,
  "twth": 190418,
  "cxc express": 190419,
  "ocs express": 190420,
  "huaxi express": 190421,
  "libang logistics": 190422,
  "edlon logistics": 190423,
  "dpe express": 190424,
  "king kong express": 190426,
  "comone express": 190428,
  "rrs logistics": 190429,
  "krexi international": 190431,
  "vnlin": 190432,
  "bht": 190434,
  "swe": 190436,
  "hy express": 190437,
  "imile": 190438,
  "zhxt express": 190439,
  "wld express": 190440,
  "yimidida": 190441,
  "j&t express (cn)": 190442,
  "jpsgj": 190443,
  "espost": 190444,
  "leiyi international logistics": 190445,
  "youmeiyutong": 190446,
  "chuangyu logistics": 190447,
  "cn wang tong": 190448,
  "suto logistics": 190449,
  "lerdex": 190451,
  "kong lok express": 190452,
  "kylin express": 190453,
  "nutripass global": 190454,
  "zto express": 190455,
  "7-eleven": 190456,
  "hilife": 190457,
  "biaoju": 190459,
  "jyc": 190460,
  "logisters": 190461,
  "eteen": 190462,
  "zsdexpress": 190463,
  "hoyangexpress": 190464,
  "jinlai": 190465,
  "hct logistics": 190466,
  "hundred miles freight": 190467,
  "tocinda": 190468,
  "cpex": 190469,
  "chh": 190470,
  "hzc": 190471,
  "shopline logistics": 190472,
  "linex": 190473,
  "hmcp": 190474,
  "make fly": 190475,
  "star-wish": 190476,
  "xs express": 190477,
  "taishi": 190479,
  "hsd": 190480,
  "sana": 190482,
  "rfl": 190483,
  "yxil": 190484,
  "qln": 190485,
  "e-commerce kz": 190486,
  "cnor": 190487,
  "skr": 190488,
  "hx": 190489,
  "dpx express": 190490,
  "morelink": 190491,
  "exwworld": 190493,
  "everwin": 190494,
  "yc": 190495,
  "ybd": 190496,
  "hj-gyl": 190497,
  "jdt": 190498,
  "sapphire box": 190499,
  "huanshi56": 190501,
  "ecg": 190502,
  "duxiuexp": 190503,
  "latam": 190504,
  "frayun": 190505,
  "granful solutions ltd": 190506,
  "ledii": 190507,
  "obc logistics": 190508,
  "redc": 190509,
  "cxe": 190510,
  "worldwide logistics": 190511,
  "ac logistics": 190512,
  "trustone": 190513,
  "sqgj": 190514,
  "didadi": 190515,
  "mkd": 190516,
  "youda": 190517,
  "verykship": 190518,
  "pigeon logisitcs": 190519,
  "asgyl": 190521,
  "ktd": 190522,
  "szmy": 190523,
  "mgoship": 190525,
  "maxpress": 190526,
  "ebaza": 190527,
  "fulfillmen": 190528,
  "ydm_2": 190529,
  "zyex": 190530,
  "yechain": 190531,
  "xinmatai": 190532,
  "interlet": 190533,
  "fulfillant": 190534,
  "ztt": 190535,
  "tj-exp": 190536,
  "ttgj": 190537,
  "easipass": 190538,
  "eshiper发件网": 190539,
  "ssc": 190540,
  "fastgo": 190541,
  "south american post": 190542,
  "jiedan logistics": 190544,
  "mingda": 190545,
  "cts": 190548,
  "xt": 190549,
  "埃德维otw": 190550,
  "kye": 190551,
  "slicity": 190552,
  "xingsu": 190554,
  "heping logistics": 190555,
  "cdex": 190556,
  "zhmy": 190557,
  "pickupp (hk)": 190558,
  "huodull": 190559,
  "damai yuncang": 190560,
  "yuex logistics": 190561,
  "edeliver": 190562,
  "yuns": 190563,
  "zlc": 190564,
  "yme": 190565,
  "jdiex": 190567,
  "onetouch-tech": 190568,
  "ouyou internationality": 190569,
  "boxin": 190570,
  "intel-valley": 190572,
  "pinke": 190573,
  "explus": 190574,
  "china southern air logistics": 190575,
  "dorje": 190576,
  "king kerry": 190577,
  "weitu technology logistics": 190578,
  "eboexp": 190579,
  "szxyd logistics": 190580,
  "wst": 190581,
  "lcdgyl": 190582,
  "4pllab": 190583,
  "ouguan supply chain": 190584,
  "dor": 190585,
  "天胜国际(tsl)": 190586,
  "jjwex": 190588,
  "blue leopard": 190589,
  "fuhai wulian": 190591,
  "yf518": 190593,
  "cigerma": 190594,
  "cimc ads": 190595,
  "pickupp (tw)": 190596,
  "dh city express": 190597,
  "tianhai": 190598,
  "hhy": 190600,
  "pingdaguoji": 190601,
  "c&c co.,ltd": 190602,
  "xinyan international": 190604,
  "stone3pl": 190605,
  "kpk": 190606,
  "yunhui logistics": 190607,
  "xingtongglobal": 190608,
  "hecny": 190609,
  "kylin": 190611,
  "jinshida": 190612,
  "yi": 190614,
  "wia fulfill": 190615,
  "de well": 190616,
  "tse": 190617,
  "yunqi": 190618,
  "hsgj": 190619,
  "zfex": 190620,
  "paifeigu": 190621,
  "youyiex": 190622,
  "gofast": 190623,
  "ide": 190624,
  "aliexpress": 190625,
  "ils": 190626,
  "be": 190627,
  "xjwl": 190629,
  "xtools": 190630,
  "sunson": 190632,
  "xh": 190633,
  "ouhua": 190634,
  "zhongpeng": 190635,
  "yle": 190636,
  "gti": 190637,
  "myloop": 190638,
  "skuare": 190639,
  "yypost": 190640,
  "jiede supply chain": 190641,
  "zl international": 190642,
  "more logistics": 190643,
  "jusda international": 190644,
  "lhe": 190645,
  "ztwl": 190646,
  "环越国际专线": 190647,
  "zhixian": 190648,
  "oulala": 190649,
  "ty": 190650,
  "gzszhhy": 190651,
  "shibida": 190652,
  "pafeite": 190653,
  "soarmall": 190654,
  "ghl": 190656,
  "ogi": 190657,
  "dida international logistics": 190658,
  "17exp": 190659,
  "lingjing": 190660,
  "ontask express": 190661,
  "gotofreight": 190663,
  "masspack": 190664,
  "cowin": 190666,
  "yunwujie": 190668,
  "yj": 190669,
  "ctgj": 190670,
  "xunhe": 190671,
  "gfs": 190672,
  "yes-speed": 190673,
  "yiyou": 190674,
  "westlink": 190675,
  "lbtx": 190676,
  "7tm": 190677,
  "hh logistics": 190678,
  "llgj": 190679,
  "haixin express": 190680,
  "hhh": 190681,
  "yc logistics": 190682,
  "yunant": 190683,
  "wedoex": 190684,
  "hualihang": 190685,
  "ldgj": 190686,
  "ppex": 190689,
  "jinyue freight": 190690,
  "fanku": 190691,
  "solid logistics": 190692,
  "wynn express": 190693,
  "sfgl": 190694,
  "gzhy": 190695,
  "pac": 190696,
  "fcjy": 190697,
  "tclogx": 190699,
  "e-post": 190700,
  "xytkj": 190701,
  "saiyascm": 190702,
  "baosen suntop": 190703,
  "st international express": 190705,
  "dongdi exp": 190706,
  "bsb": 190708,
  "centex": 190709,
  "comebox": 190711,
  "hyjy": 190712,
  "lzfba": 190713,
  "sihai inc": 190714,
  "bright future supply chain": 190715,
  "dingdian": 190716,
  "yaohongguoji": 190719,
  "seashells tong": 190720,
  "cosex": 190722,
  "gorto": 190723,
  "youtai": 190724,
  "chengtong": 190725,
  "iline": 190726,
  "fsqh": 190727,
  "gyy": 190728,
  "z1express": 190729,
  "fls": 190731,
  "ydt": 190732,
  "wallaby express": 190733,
  "deksu": 190734,
  "equatorial supply chain": 190735,
  "qingzhou supply chain": 190737,
  "honor logistics": 190738,
  "jx express": 190739,
  "yuhong": 190741,
  "dylogistics": 190742,
  "nuoyu supply chain": 190743,
  "sdh": 190744,
  "mss": 190745,
  "eps cross border": 190746,
  "dyj": 190747,
  "zhongshu supply chain": 190748,
  "boda": 190749,
  "zy56": 190750,
  "xc international logistics": 190751,
  "tscb": 190752,
  "topest": 190753,
  "gdyhwl": 190754,
  "sugouex": 190756,
  "junfeng international": 190757,
  "junya": 190758,
  "zhijiedasupplychain": 190759,
  "wuyou": 190760,
  "gpl": 190761,
  "shangqi international logistics": 190762,
  "st cargo": 190763,
  "gzfl": 190765,
  "sf express(cn)": 190766,
  "hengxun logistics": 190767,
  "one express": 190768,
  "dayone": 190769,
  "chaoyue international logistics": 190770,
  "yuegejing": 190771,
  "yht_2": 190772,
  "box supply chain": 190774,
  "octopus": 190776,
  "top post": 190777,
  "slt": 190778,
  "ljkj56": 190779,
  "mingyu logistics": 190781,
  "6zex": 190782,
  "cc logistics": 190783,
  "wher express": 190784,
  "sht": 190785,
  "gde": 190786,
  "atmad global cargo": 190787,
  "ff express": 190788,
  "nextsmartship": 190789,
  "anl": 190790,
  "剑展物流": 190791,
  "jaspost": 190793,
  "yd logistics": 190794,
  "mxl": 190795,
  "vyang": 190796,
  "ustex": 190797,
  "ysdpost": 190798,
  "hongxing": 190799,
  "wcx": 190800,
  "ycgj": 190801,
  "kun express": 190802,
  "sz xinhe": 190803,
  "am-logistics": 190804,
  "dpexpress": 190807,
  "mts": 190808,
  "noel": 190809,
  "3cliques": 190811,
  "jqgj": 190812,
  "yes": 190813,
  "fastsupply": 190814,
  "zhicheng": 190815,
  "sue": 190816,
  "ecgo": 190817,
  "dh": 190818,
  "sangzhou": 190819,
  "pp-air": 190820,
  "shenglan": 190822,
  "super pack line": 190823,
  "easyseller": 190824,
  "yida": 190825,
  "sfyd express": 190826,
  "pstzx": 190827,
  "jlh": 190828,
  "bjl": 190829,
  "yuetu": 190830,
  "jtd": 190832,
  "afterhaul": 190833,
  "ck internation": 190834,
  "zst": 190835,
  "eyex": 190836,
  "superbuy": 190837,
  "sixu": 190838,
  "djx": 190839,
  "srj": 190840,
  "bmurfs express": 190843,
  "speedx": 190844,
  "kye (cn)": 190845,
  "best inc (cn)": 190846,
  "tufan": 190847,
  "hzzh": 190848,
  "cse": 190849,
  "qsy": 190851,
  "ucs": 190852,
  "weisa": 190853,
  "hos": 190854,
  "yifan": 190857,
  "linlong": 190858,
  "gps": 190860,
  "yuu": 190861,
  "zyqq": 190862,
  "st": 190865,
  "suteng logistics": 190866,
  "hmc": 190867,
  "x-eagle": 190868,
  "dvex": 190869,
  "zhongling": 190870,
  "mcn": 190871,
  "dealfy": 190872,
  "liuchen": 190873,
  "pkd express": 190874,
  "jzgj": 190875,
  "kwai bon": 190876,
  "shdj": 190877,
  "qep": 190878,
  "glex": 190879,
  "scaleorder": 190880,
  "3dada": 190881,
  "bondex": 190882,
  "meiyi": 190883,
  "logistics tracking": 190884,
  "hmtm": 190885,
  "yuanzk": 190886,
  "hosto": 190887,
  "quick&perfct": 190889,
  "wan yuntong": 190890,
  "ddgyl": 190891,
  "twb": 190892,
  "xslong": 190893,
  "hyl": 190894,
  "haohai": 190895,
  "mia": 190896,
  "bcd": 190897,
  "anl_2": 190898,
  "dhlink": 190899,
  "sxjd": 190900,
  "gande": 190901,
  "jiashida": 190902,
  "fengji global": 190903,
  "cce": 190904,
  "c2i logistic": 190905,
  "euk": 190906,
  "xhy": 190907,
  "jiyun logistic": 190908,
  "ql post": 190909,
  "bluebuc": 190910,
  "singho": 190911,
  "ypld": 190912,
  "bl": 190913,
  "huitian": 190914,
  "senfan": 190915,
  "faster": 190916,
  "yunjian": 190917,
  "jhex": 190918,
  "xjd": 190919,
  "ymgyl": 190920,
  "bnyt": 190921,
  "dk": 190922,
  "anbeiqi": 190923,
  "tusou": 190925,
  "dex": 190926,
  "ahgj": 190927,
  "tz": 190928,
  "esd": 190929,
  "ural": 190930,
  "hst logistics": 190931,
  "flyfast": 190932,
  "better way": 190933,
  "beluga logistics": 190934,
  "hy": 190935,
  "jsyd": 190936,
  "rbex": 190937,
  "fan sheng": 190939,
  "jc logistics": 190940,
  "yy": 190941,
  "shenzhen fanglian": 190942,
  "ylt": 190943,
  "newfengda": 190945,
  "timi sc": 190946,
  "hpwl": 190947,
  "sh-logtec": 190948,
  "aplus": 190949,
  "kuaiyueda": 190950,
  "jtr": 190951,
  "qide supply chain": 190952,
  "gbs": 190953,
  "miduoqi global": 190954,
  "jifan": 190955,
  "hangbang": 190956,
  "yimi": 190957,
  "harlyson": 190958,
  "jygj": 190959,
  "zy": 190960,
  "szjr": 190961,
  "jiehao": 190962,
  "shitong": 190963,
  "link supply chain": 190964,
  "anyida": 190965,
  "telai": 190967,
  "bcyt": 190968,
  "fafalux": 190969,
  "zeji guoji": 190970,
  "ling yun": 190971,
  "yingde": 190972,
  "linhan": 190973,
  "tuobao": 190976,
  "kckex": 190977,
  "baiyanda": 190979,
  "jwgj": 190980,
  "fleetan": 190981,
  "hc logistics": 190982,
  "crs": 190983,
  "dht": 190984,
  "omgo": 190985,
  "ywbz": 190986,
  "sc": 190987,
  "ytkj": 190988,
  "sinfor": 190989,
  "jimai": 190990,
  "penavico shenzhen": 190991,
  "sc logistics": 190992,
  "logbay": 190993,
  "jch": 190994,
  "star speed": 190995,
  "huaruitong": 190996,
  "uniment": 190997,
  "wexsu": 190998,
  "cmk": 190999,
  "hyd": 191000,
  "wiselution": 191001,
  "jxsf": 191002,
  "shine-v": 191003,
  "sjkd": 191004,
  "rongmao": 191005,
  "beiran": 191006,
  "whats ship": 191007,
  "changhui logistics": 191008,
  "kaixuanjia": 191009,
  "ysgj logistics": 191010,
  "cel": 191011,
  "xinran": 191012,
  "e-touch": 191013,
  "sgxpress": 191014,
  "fsdgz": 191015,
  "echeers": 191017,
  "zct logistics": 191018,
  "yiwu leyi": 191020,
  "brwl": 191022,
  "duotu supply chain": 191023,
  "rocket logistics": 191024,
  "cy": 191025,
  "m&h international": 191026,
  "zhanmei": 191027,
  "logsoeasy": 191028,
  "afl logistics": 191029,
  "suhu supply chain": 191030,
  "austway": 191031,
  "dpdex": 191032,
  "srh": 191033,
  "百腾物流": 191034,
  "xyh": 191035,
  "xypost": 191036,
  "ttgjsz": 191037,
  "lxgyl": 191038,
  "udel": 191039,
  "tengxin": 191040,
  "zis": 191041,
  "minghao international": 191042,
  "hp logistics": 191043,
  "yaresea": 191044,
  "zhema": 191045,
  "gesc": 191046,
  "1st": 191047,
  "sedum": 191048,
  "cttyex": 191049,
  "weiku": 191050,
  "zkgj": 191051,
  "hcrd": 191053,
  "keas": 191054,
  "jr": 191055,
  "dhgj": 191056,
  "jowee": 191057,
  "longxin": 191058,
  "ts": 191059,
  "gdjn": 191060,
  "forestleopard": 191061,
  "yiya": 191062,
  "ips": 191063,
  "transfly": 191064,
  "lb logistics": 191066,
  "jindouyun": 191067,
  "wjdgj express": 191068,
  "csjwl": 191069,
  "siyunda": 191070,
  "aknien": 191071,
  "xys": 191072,
  "himori express": 191073,
  "fzr": 191074,
  "fl": 191075,
  "cainiao(cn)": 191076,
  "br": 191077,
  "lucksoon": 191078,
  "onefly logistics": 191079,
  "uds": 191081,
  "wxyexpress": 191082,
  "qicheng international logistics": 191083,
  "fsd": 191084,
  "wdexpmama": 191085,
  "canada gtl express": 191086,
  "mingyang": 191087,
  "equator intl": 191088,
  "aoyue": 191089,
  "spst": 191090,
  "yiwu huayue": 191091,
  "acs worldwide express": 191092,
  "aomeng": 191093,
  "yiwu jetta": 191094,
  "han-sea": 191095,
  "bollyman": 191096,
  "qibing suppy": 191097,
  "jiayang": 191098,
  "daoyi": 191099,
  "dzt": 191100,
  "adico": 191101,
  "kuaikai": 191102,
  "jcw express": 191103,
  "aru": 191105,
  "zto freight": 191106,
  "ylxd": 191107,
  "bngyl": 191108,
  "xzx": 191109,
  "lnon supply chain": 191110,
  "hongbong": 191111,
  "au-hawk": 191112,
  "anyun": 191113,
  "hebang international": 191114,
  "gox": 191115,
  "hcst": 191116,
  "wanyu": 191118,
  "pb logistic": 191117,
  "good luck international": 191119,
  "kapoklog": 191120,
  "jd logistics": 191121,
  "freedom scm": 191122,
  "allwin": 191123,
  "kle": 191124,
  "zfgj": 191125,
  "bisheng shipping company": 191126,
  "broadway": 191127,
  "jieshun lianyun": 191129,
  "zippy": 191130,
  "snx": 191131,
  "ecwharf": 191132,
  "yunxi": 191133,
  "first union": 191134,
  "tdgj": 191135,
  "meihuan": 191136,
  "yifan international": 191137,
  "emile corp": 191139,
  "guoo": 191141,
  "jinlian": 191142,
  "jthq": 191143,
  "xiongbuy": 191144,
  "niuku": 191145,
  "yoybuy": 191146,
  "boss logistics": 191147,
  "zmetaport": 191148,
  "cle": 191149,
  "gofo france": 191150,
  "rzn": 191151,
  "huiganwu": 191153,
  "skygroup": 191154,
  "hbgj": 191155,
  "suzhouyisu": 191156,
  "szhyt": 191157,
  "zoumabang": 191158,
  "cjpacket": 191159,
  "yotech": 191160,
  "abt": 191161,
  "cj-exp": 191162,
  "mf": 191163,
  "seasy logistics": 191164,
  "lht express": 191165,
  "baizhou": 191166,
  "and tongda": 191167,
  "szhy": 191168,
  "jytd": 191169,
  "mtscn": 191170,
  "ztjyun": 191171,
  "wooolink": 191172,
  "ane express": 191174,
  "tourbell": 191175,
  "xbhgj": 191176,
  "bgy": 191177,
  "acs logstic": 191178,
  "huahe international": 191179,
  "faster cargo": 191180,
  "hotsin": 191181,
  "halosend logistics": 191182,
  "qhgx": 191183,
  "kxexp": 191184,
  "superto": 191185,
  "ydkj": 191186,
  "shy": 191187,
  "okkj56": 191188,
  "nbjt": 191189,
  "g-billion": 191190,
  "szm": 191191,
  "vanj express": 191192,
  "alibaba.com logistics": 191193,
  "hth": 191194,
  "jgex": 191195,
  "ast": 191196,
  "yunda express": 191197,
  "jiaxinguoji": 191198,
  "leyi cross border": 191199,
  "by56.com": 191200,
  "atx": 191201,
  "kco logistics": 191202,
  "lcd": 191203,
  "qifly int'l": 191204,
  "aswkk": 191205,
  "sts": 191206,
  "xal": 191207,
  "ghd": 191208,
  "topex": 191209,
  "kuaiyan": 191210,
  "ysgyl": 191211,
  "xuexpress": 191212,
  "dgjy": 191213,
  "elian": 191214,
  "218 logistics": 191215,
  "west ocean": 191216,
  "hngt": 191217,
  "ynyn": 191218,
  "atb": 191219,
  "shipby": 191220,
  "esl": 191221,
  "whwdt": 191222,
  "willcang": 191223,
  "jym express": 191224,
  "tyh": 191225,
  "pcjd": 191226,
  "lhtd": 191227,
  "meso-global": 191228,
  "aosen": 191229,
  "h&a logistics": 191230,
  "yitongda": 191231,
  "owi": 191232,
  "linktrans": 191233,
  "kongfu": 191234,
  "bestfulfill": 191235,
  "pgsscm": 191236,
  "senyuguoji": 191237,
  "mega-swift": 191238,
  "yp": 191239,
  "yf": 191240,
  "weton logistics": 191241,
  "stellar": 191242,
  "jsr": 191243,
  "newbee": 191244,
  "siwey": 191245,
  "fudu logistics": 191246,
  "jyh": 191247,
  "xuanchen": 191248,
  "citiparcel": 191249,
  "u1": 191250,
  "hong kong global tnternational logistics limited": 191251,
  "torbon logistics": 191252,
  "ati": 191253,
  "xkp": 191254,
  "one minute express": 191255,
  "zfy": 191256,
  "jl": 191257,
  "vgl": 191258,
  "gcc56": 191259,
  "lyst": 191261,
  "ymgj": 191263,
  "panda trolley": 191264,
  "h onlylink": 191265,
  "fzex": 191266,
  "hua": 191267,
  "ytdt": 191268,
  "benben": 191269,
  "supcourier": 191270,
  "wokexp": 191271,
  "ldtgyl": 191272,
  "shtrack": 191273,
  "eaa": 191274,
  "yunqi_2": 191275,
  "quanjing logistics": 191277,
  "ywe": 191278,
  "bh": 191279,
  "chaodaexp": 191280,
  "xuansi": 191281,
  "yiwu pengyuan": 191282,
  "dingli tongyun": 191283,
  "hye": 191284,
  "7days supplychain": 191285,
  "muser": 191286,
  "hubo logistics": 191287,
  "alphastline": 191288,
  "yuanchuan": 191289,
  "kjk express": 191290,
  "yue'an logistics": 191291,
  "yd": 191292,
  "link road": 191293,
  "all-in logistics": 191294,
  "spl": 191295,
  "unihom": 191296,
  "rq logistics": 191297,
  "fleetex": 191298,
  "horizon": 191299,
  "xyex": 191300,
  "xinmiao logistics": 191306,
  "nbtsz": 191307,
  "cred": 191308,
  "dbf": 191309,
  "edasun": 191310,
  "magic land": 191311,
  "lat logistics": 191312,
  "cjbg": 191313,
  "teamwork": 191314,
  "ytad": 191315,
  "uce": 191316,
  "hualiangang": 191317,
  "hygjwl": 191318,
  "dghy": 191319,
  "greencargo": 191320,
  "greatsell": 191321,
  "mdtgj": 191322,
  "zhoubotong": 191324,
  "xinhong": 191325,
  "zto cwst": 191326,
  "yinghui": 191327,
  "zls": 191328,
  "yibai": 191329,
  "jnd": 191330,
  "szszhyt": 191331,
  "lsz": 191332,
  "saicheng logistics": 191333,
  "iitw": 191334,
  "sandiy": 191335,
  "dps": 191336,
  "jiarui": 191337,
  "lianye int.": 191338,
  "cirro e-commerce": 191339,
  "ama": 191340,
  "qingbei supply": 191341,
  "zh": 191342,
  "haoyouyi": 191344,
  "wj logistics": 191345,
  "xtgj": 191346,
  "shuojia": 191347,
  "my": 191348,
  "gg": 191349,
  "xiuyuantianxia": 191351,
  "sygj": 191352,
  "chien supply chain": 191353,
  "qyzw": 191354,
  "cgsd": 191355,
  "eagledhl": 191357,
  "hkdgj": 191358,
  "global logistics": 191359,
  "uof international logistics": 191360,
  "mj": 191361,
  "metooda": 191362,
  "mcgyl": 191363,
  "wc": 191364,
  "fstcargo": 191365,
  "cn56": 191366,
  "mywl": 191367,
  "jiebao": 191368,
  "vmn express": 191369,
  "kyd": 191370,
  "devtrans": 191371,
  "jasingexp": 191372,
  "onix cargo": 191373,
  "xzd": 191374,
  "easy": 191375,
  "3pe express": 191376,
  "crane worldwide (e-commerce)": 191377,
  "epe owos": 191378,
  "hgd": 191379,
  "blkj": 191380,
  "ahc": 191381,
  "greenroad logistics": 191382,
  "sinolinx": 191383,
  "twd logistics": 191384,
  "gaea": 191385,
  "cjcn": 191386,
  "zygj": 191387,
  "yfhk": 191388,
  "western post": 191389,
  "esp": 191390,
  "jf packet": 191391,
  "jimmy": 191392,
  "fd": 191393,
  "sdk-logistics": 191394,
  "newyh": 191395,
  "bjpanda": 191396,
  "unknown_4": 191397,
  "anhua international": 191398,
  "huangyun logistics": 191399,
  "bdt": 191400,
  "th": 191401,
  "lib": 191402,
  "sunya": 191403,
  "skr logistic": 191404,
  "andida": 191405,
  "huipaidaexp": 191406,
  "eagleship": 191407,
  "qy": 191408,
  "techlink": 191409,
  "tooexpress": 191410,
  "journey to vision": 191411,
  "fleetturbo": 191412,
  "pdn express": 191413,
  "xichen": 191414,
  "cntoin": 191415,
  "tlgj": 191416,
  "yne": 191417,
  "yongtongcheng": 191418,
  "quick cool": 191419,
  "tianzhen": 191420,
  "kmgj": 191421,
  "quick dash": 191422,
  "ngf logistics": 191423,
  "longyida international": 191424,
  "ysk": 191425,
  "jkl": 191426,
  "keishong": 191427,
  "zygj logistlcs": 191428,
  "sjl": 191429,
  "yunhengda": 191430,
  "zhjy": 191431,
  "tanex": 191432,
  "golden way": 191433,
  "zy international logistics": 191434,
  "yueto": 191435,
  "penghai": 191436,
  "basaexp": 191437,
  "sanhe": 191438,
  "lfds": 191439,
  "cnoh": 191440,
  "zygj_2": 191441,
  "huanyi": 191442,
  "qqgyl": 191443,
  "lsgj": 191444,
  "yygj": 191445,
  "qzaj": 191446,
  "xdb": 191447,
  "dhyt": 191448,
  "hy920": 191450,
  "unknown_5": 191451,
  "wkgj": 191452,
  "hhsd": 191453,
  "unknown_6": 191454,
  "jzdd": 191455,
  "shanghai quanna": 191456,
  "hdkj": 191457,
  "toplink": 191458,
  "hangcheng supply chain": 191459,
  "jsdzj": 191460,
  "sy": 191461,
  "shilianxin": 191462,
  "lightcone scm": 191463,
  "hysjpost": 191465,
  "fcex": 191466,
  "chinz logistics": 191467,
  "byd": 191468,
  "tyl": 191469,
  "skyocean": 191470,
  "ax": 191471,
  "echain": 191472,
  "unknown_7": 191474,
  "xinjiyun": 191475,
  "sx": 191476,
  "tiptop": 191477,
  "myfba": 191478,
  "lpd": 191479,
  "yixing international": 191480,
  "sizheng shuntu": 191481,
  "dlx": 191482,
  "flashgo": 191483,
  "jl56": 191484,
  "dg": 191485,
  "sry": 191486,
  "friendship": 191487,
  "jbd": 191488,
  "senlei": 191490,
  "mili": 191491,
  "ytgyl": 191492,
  "herald express": 191493,
  "bangguotianxia": 191494,
  "zec": 191495,
  "ht": 191496,
  "fast vessel": 191497,
  "gx": 191498,
  "jomalls": 191499,
  "xzg": 191500,
  "cxgj": 191501,
  "haigui cargo": 191502,
  "pdu": 191504,
  "qh cross-border logistics": 191505,
  "team logistics": 191506,
  "zjyt": 191507,
  "tolandexp": 191508,
  "youjiaus": 191509,
  "bluebird": 191510,
  "chic": 191511,
  "yunji": 191512,
  "gwe": 191513,
  "sjkj": 191514,
  "ayd": 191515,
  "gs cargo": 191516,
  "qqwy": 191517,
  "daex": 191518,
  "aotsd": 191519,
  "zhihui logistics": 191520,
  "qhtf": 191521,
  "ws": 191522,
  "global net": 191523,
  "sj international": 191525,
  "jy-exp": 191526,
  "xl": 191527,
  "hdlinks": 191528,
  "speedbull": 191529,
  "zzwl": 191530,
  "jfly": 191531,
  "e fund international logistics": 191532,
  "yuanteng logistics": 191533,
  "ywd": 191534,
  "jdgj": 191535,
  "xinyang freight": 191536,
  "msgj": 191537,
  "dofafo": 191538,
  "hm": 191539,
  "ayt": 191540,
  "tdtwl": 191541,
  "cz": 191542,
  "fs": 191543,
  "stil": 191544,
  "mty": 191545,
  "jj global": 191546,
  "bluebull": 191547,
  "jytwl": 191548,
  "cnyt": 191549,
  "union express": 191550,
  "jps": 191551,
  "ztoccw": 191552,
  "redcloud": 191553,
  "sydl": 191554,
  "keke logistics": 191555,
  "suyitong": 191556,
  "beewin": 191557,
  "yunxi logistics": 191558,
  "jmgj": 191559,
  "sl": 191560,
  "junhe": 191561,
  "gzwl": 191562,
  "hzt": 191563,
  "jshoton": 191564,
  "kjgjsd": 191565,
  "forest": 191566,
  "pw": 191567,
  "hge": 191568,
  "kq": 191569,
  "gbox": 191570,
  "szcyex": 191571,
  "smile cargo": 191572,
  "xwwt": 191573,
  "huaxiang logistics": 191574,
  "wintu": 191575,
  "andexp": 191576,
  "zq": 191577,
  "myyf": 191578,
  "tuomeida logistics": 191579,
  "hx logistics": 191580,
  "all_in": 191581,
  "hsgyl": 191582,
  "domain-wide": 191583,
  "zonace": 191584,
  "yhwl gjwl": 191585,
  "zn axd": 191586,
  "gexin international logistics": 191587,
  "jiean": 191588,
  "eazport": 191589,
  "hangpai international": 191590,
  "nwl": 191591,
  "huaan logistics": 191592,
  "rongda supply chain": 191593,
  "fc": 191594,
  "jieao": 191595,
  "ock": 191596,
  "yil": 191597,
  "forung": 191598,
  "hsdex global logistics": 191599,
  "sfdkd": 191600,
  "bfds": 191601,
  "suyoda": 191602,
  "krjc": 191603,
  "yw": 191604,
  "wgd": 191605,
  "foly": 191606,
  "crd": 191607,
  "hdgj": 191609,
  "yfd": 191610,
  "zhl": 191611,
  "xstd": 191612,
  "shexp": 191613,
  "newpower": 191614,
  "hha international logistics": 191615,
  "hly": 191616,
  "xbkj": 191617,
  "3plfulfill": 191619,
  "qot": 191620,
  "runding": 191621,
  "tgsc": 191622,
  "newpackets": 191623,
  "winshare": 191624,
  "kss": 191625,
  "global-fls": 191626,
  "hkgj": 191627,
  "zuozhanex": 191628,
  "land logistics": 191629,
  "haoyu supply chain": 191630,
  "tjgd": 191631,
  "ma": 191632,
  "zxl": 191633,
  "tggj": 191634,
  "cnk express": 191635,
  "shgyl": 191636,
  "dsgj": 191637,
  "aaiex": 191639,
  "zhengzhou zhengxin": 191640,
  "shgj": 191642,
  "femtoo": 191643,
  "chgj": 191644,
  "flying fish shipping": 191645,
  "otd": 191646,
  "lhd": 191647,
  "osoo": 191648,
  "hce": 191649,
  "aiya": 191650,
  "the bird air": 191651,
  "gd 360zebra": 191652,
  "transworld supply chain": 191653,
  "ljwl": 191654,
  "yjs": 191655,
  "golucky express": 191656,
  "jiuyou": 191657,
  "huawei": 191658,
  "fde": 191659,
  "qsexp": 191660,
  "zxsy": 191661,
  "qyl": 191662,
  "hzdhf": 191663,
  "xjhd": 191664,
  "yurica": 191665,
  "hexi international": 191666,
  "jdx": 191667,
  "jndx": 191668,
  "xtygj": 191669,
  "cw": 191670,
  "lyexp": 191671,
  "ronme": 191672,
  "wanc": 191673,
  "feishu": 191674,
  "faxu il": 191675,
  "link": 191676,
  "hyzt": 191677,
  "qs": 191679,
  "hct": 191680,
  "dreamy logistic": 191681,
  "bgl": 191682,
  "yhgj": 191684,
  "jyst": 191685,
  "htc ex": 191686,
  "jdb logistics": 191687,
  "zeyu": 191688,
  "stgj": 191689,
  "one whale": 191690,
  "oswl": 191691,
  "jywl": 191692,
  "rising star": 191693,
  "qianhai zhongxin supply chain": 191694,
  "logixtrack": 191695,
  "ltgj": 191696,
  "yuansheng ancheng": 191697,
  "szwl": 191698,
  "quicktrack": 191699,
  "hyld": 191700,
  "ymwl": 191701,
  "sh1j1": 191702,
  "win all": 191703,
  "smz": 191704,
  "sufengkuaidi": 191705,
  "hq global": 191706,
  "meibida": 191707,
  "blueair": 191708,
  "x-parcel": 191709,
  "skyjet logistics": 191710,
  "uxin56": 191711,
  "cargo friend": 191712,
  "soonstar": 191713,
  "jegj": 191714,
  "junxi": 191715,
  "ybwl": 191716,
  "mars global": 191717,
  "jiehangguoji": 191718,
  "khy": 191719,
  "ptyt": 191720,
  "jhta": 191721,
  "df": 191722,
  "longmaoguojiwuliu": 191723,
  "chht": 191724,
  "yld": 191725,
  "hytd": 191726,
  "sz-dpex": 191727,
  "teng hong": 191728,
  "shengao": 191729,
  "starlink latin": 191730,
  "pwb": 191731,
  "hnty": 191732,
  "dgrcex": 191734,
  "jywlcn": 191735,
  "dskj": 191736,
  "xylc": 191737,
  "beijing hongsheng": 191738,
  "wangtong": 191741,
  "ax logistics": 191742,
  "haizhi": 191743,
  "supersonic logistics": 191744,
  "zyd": 191745,
  "great master aggregation international": 191746,
  "suocang": 191747,
  "mei spid group": 191748,
  "gzzt": 191749,
  "orsome logistics": 191750,
  "infinite fulfillment": 191751,
  "land, sea and air logistics": 191752,
  "aituo": 191753,
  "dafei international logistics": 191754,
  "gsc": 191755,
  "ytu": 191756,
  "lsgjwl": 191757,
  "litotrans": 191758,
  "sense untied": 191759,
  "junteng international": 191760,
  "hongguang": 191761,
  "yint": 191762,
  "jygyl": 191763,
  "yunfeng  express": 191764,
  "tsexp": 191765,
  "btgj56": 191766,
  "annto": 191767,
  "lhj": 191768,
  "sn": 191769,
  "bocheng cross-border": 191770,
  "yhl": 191771,
  "wdh": 191772,
  "todd": 191773,
  "htk": 191774,
  "boyuan": 191775,
  "sdt": 191776,
  "cangsheng": 191777,
  "harmonystar": 191778,
  "suchen logistics": 191779,
  "dada": 191780,
  "quickbox": 191781,
  "aiduk transportation": 191782,
  "suhui": 191783,
  "xzhtech": 191784,
  "zyl": 191785,
  "wysd": 191786,
  "xianghai": 191787,
  "xlty56": 191788,
  "power time": 191789,
  "yinuo international": 191790,
  "portless": 191791,
  "sje": 191792,
  "cygj": 191793,
  "hopetrans": 191794,
  "yueyang logistics": 191795,
  "wrea": 191796,
  "xsata": 191797,
  "zjpsgj": 191798,
  "xinda": 191799,
  "xinqicheng": 191800,
  "yttgj": 191801,
  "jxyd": 191802,
  "qld": 191803,
  "bz": 191804,
  "qiaotransit": 191805,
  "adz": 191806,
  "chiao": 191807,
  "3cq": 191809,
  "hkkt": 191810,
  "tzgj": 191811,
  "linda": 191812,
  "qxd": 191813,
  "tongda yuntong": 191814,
  "hyphen trade & logistics": 191815,
  "aode supply chain": 191816,
  "lambor logistics": 191817,
  "jldt": 191818,
  "yygjwl": 191819,
  "dsgjpt": 191820,
  "fx express": 191821,
  "qymj": 191822,
  "jiuliang": 191823,
  "maichuanglogistics": 191824,
  "trantrust international logistics": 191825,
  "yjgj": 191826,
  "jxkj": 191827,
  "kuayuan supply chain": 191828,
  "td": 191829,
  "auto_2": 191830,
  "baicheng international logistics": 191831,
  "shanggeng supply": 191832,
  "xygylzxcys": 191833,
  "chl": 191834,
  "ff logistics": 191835,
  "cfy logistics": 191836,
  "wcwl": 191837,
  "rsd": 191838,
  "global rapid delivery": 191839,
  "tsjy": 191840,
  "yanghai lnternational": 191841,
  "yyd": 191842,
  "qiaojie international logistics": 191843,
  "guangzhou zhengwu international": 191844,
  "diffni": 191845,
  "mhwl": 191846,
  "xcty": 191847,
  "blgj": 191848,
  "global speed link": 191849,
  "wyd": 191850,
  "qf-airlines": 191851,
  "xhwl": 191852,
  "tfh": 191865,
  "ms-exp": 191858,
  "eparcel": 191859,
  "luwei": 191860,
  "hao yao": 191861,
  "ucl": 191862,
  "zhejiang yibo": 191863,
  "jetspeed": 191864,
  "jsx": 191854,
  "ayyt": 191855,
  "jfe": 191856,
  "wsc": 191857,
  "sunlinkgo": 191866,
  "bestone": 191867,
  "gly": 191868,
  "easyshipsping": 191869,
  "zb global": 191870,
  "hot cheer": 191871,
  "qm": 191872,
  "patuen": 191873,
  "ywysgyl": 191874,
  "11000miles": 191875,
  "km global": 191876,
  "kiwekihen": 191877,
  "pengyou": 191878,
  "xygyl": 191879,
  "cm": 191880,
  "mai mai": 191881,
  "blue": 191882,
  "ylexp": 191883,
  "prime": 191884,
  "mhgj": 191885,
  "z1t": 191886,
  "ks": 191887,
  "gzjd": 191888,
  "hyk": 191889,
  "rico": 191890,
  "usll": 191891,
  "gch": 191892,
  "sendo": 191893,
  "fuyi cargo": 191894,
  "anxin logistics": 191895,
  "x-trac": 191896,
  "zhecheng": 191897,
  "yehaton": 191898,
  "yueygj": 191900,
  "zs": 191901,
  "zty": 191902,
  "xc": 191903,
  "silk": 191904,
  "rthd": 191905,
  "suyuan": 191906,
  "pioneer": 191907,
  "bcgj": 191908,
  "hc": 191909,
  "neon": 191910,
  "ypyc": 191911,
  "lxd": 191912,
  "pad": 191913,
  "byhd": 191914,
  "anjunexpress": 191915,
  "unknown_8": 191916,
  "match": 191917,
  "fxyl": 191918,
  "gw": 191919,
  "ahy international": 191920,
  "jet pass logistics": 191922,
  "zmgjex": 191923,
  "jinchi": 191924,
  "zc": 191925,
  "fengda": 191926,
  "tyhco": 191927,
  "bhd": 191928,
  "qqt56": 191929,
  "jiemation": 191930,
  "aflow": 191931,
  "ctc": 191932,
  "hqsd": 191933,
  "wensuyi": 191934,
  "lionqueen": 191935,
  "cross world": 191936,
  "walltech": 191937,
  "tydh": 191938,
  "xwtd": 191939,
  "ysf": 191940,
  "dywl": 191941,
  "surepackets": 191942,
  "lanshenglogistics": 191943,
  "cmt": 191944,
  "ljx": 191945,
  "jiamx": 191946,
  "bingo": 191947,
  "zfe": 191948,
  "dmzkj": 191949,
  "hygj": 191950,
  "huayingtong": 191951,
  "aog": 191952,
  "szdc": 191953,
  "hygyl": 191954,
  "seagulo-zoc": 191955,
  "tianjie sudi": 191956,
  "mh": 191957,
  "hyex": 191958,
  "stgyl": 191959,
  "asg": 191960,
  "hzwl": 191961,
  "shengyu": 191962,
  "shengsheng": 191963,
  "loadstar shipping": 191964,
  "jaxingyuntong": 191965,
  "sfwl": 191966,
  "bj": 191967,
  "sj56": 191968,
  "chengxiao": 191969,
  "verumecom": 191970,
  "panghu": 191971,
  "panex": 191972,
  "zhdx": 191973,
  "66exp": 191974,
  "spt": 191975,
  "yidatong": 191976,
  "czgj": 191977,
  "lt century": 191978,
  "baoshihang": 191979,
  "ruiguantong": 191980,
  "az traders": 191981,
  "etton": 191982,
  "jxd": 191983,
  "hy logistics": 191984,
  "hyt": 191985,
  "bst": 191987,
  "jyt": 191988,
  "yigao": 191989,
  "hengshuexp": 191990,
  "htxyj": 191991,
  "chenhang logistics": 191992,
  "miton": 191993,
  "advance international": 191994,
  "shoptoplus": 191995,
  "xiquee": 191996,
  "lulu": 191997,
  "ayt.ltd": 191998,
  "dewell": 191999,
  "lyex": 192000,
  "bailiyang": 192001,
  "abeexp": 192002,
  "jie you": 192003,
  "xieda international": 192004,
  "pjia": 192005,
  "yca": 192006,
  "sygjwl": 192007,
  "luluyt express": 192008,
  "usea": 192009,
  "bojue cargo freight": 192010,
  "tianhao freight": 192011,
  "anshuo": 192012,
  "ruitong global": 192013,
  "constant jiaxin": 192014,
  "raydo": 192015,
  "chengchain": 192016,
  "thhq": 192017,
  "qhbj": 192018,
  "unknown_9": 192019,
  "hst": 192020,
  "titan": 192021,
  "mfh": 192022,
  "chenghang": 192024,
  "gzx": 192025,
};

const CARRIER_PARAMS: Record<number, ParamSpec[]> = {
  2061: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "1000" }],
  7041: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "1000 AA" }],
  14041: [
    { key: "destination_country", label: "Destination Country (2-letter ISO)", required: true, type: "text", placeholder: "FR" },
    { key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "1000 AA" },
  ],
  21051: [{ key: "mid", label: "MID Number", required: false, type: "text", placeholder: "123456" }],
  100003: [{ key: "ship_date", label: "Ship Date", required: false, type: "date", placeholder: "2024-01-01" }],
  100005: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "Postal code" }],
  100010: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "Postcode" }],
  100017: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "Postal code" }],
  100024: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "Postal code" }],
  100026: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "1000 AA" }],
  100027: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "12345" }],
  100060: [{ key: "number_type", label: "Number Type", required: false, type: "select", placeholder: "1", options: [{ value: "1", label: "AWB" }, { value: "2", label: "Order Id" }, { value: "3", label: "LRN" }] }],
  100074: [{ key: "phone_number_last_4", label: "Phone Number (last 4 digits)", required: true, type: "text", placeholder: "8888" }],
  100078: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "1000" }],
  100086: [{ key: "phone_number_last_4", label: "Phone Number (last 4 digits)", required: true, type: "text", placeholder: "88888" }],
  100155: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "1000" }],
  100167: [{ key: "postal_code", label: "Postal Code", required: true, type: "text", placeholder: "LS27 0BN" }],
  100189: [{ key: "postal_code", label: "Postal Code", required: true, type: "text", placeholder: "123456" }],
  100207: [{ key: "postal_code", label: "Postal Code", required: false, type: "text", placeholder: "Postal code" }],
  100221: [{ key: "number_type", label: "Number Type", required: false, type: "select", placeholder: "1", options: [{ value: "1", label: "PRO Number" }, { value: "2", label: "BOL Number" }, { value: "3", label: "Purchase Order Number" }] }],
  100268: [
    { key: "number_type", label: "Number Type", required: false, type: "select", placeholder: "5", options: [{ value: "5", label: "Track Bar Code" }] },
    { key: "parameter", label: "Parameter", required: false, type: "text", placeholder: "1000000" },
  ],
};

function Field({ label, icon: Icon, children, hint }: {
  label: string; icon?: React.ElementType; children: React.ReactNode; hint?: string;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--t-subtle)" }}>
        {Icon && <Icon className="w-3 h-3" />}{label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10px]" style={{ color: "var(--t-subtle)" }}>{hint}</p>}
    </div>
  );
}

function ErrorBanner({ msg, onClose }: { msg: string; onClose?: () => void }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl text-sm font-medium" style={{ background: "rgba(239,68,68,0.08)", color: "#DC2626" }}>
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span className="flex-1">{msg}</span>
      {onClose && <button onClick={onClose}><X className="w-4 h-4" /></button>}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    draft: { color: "#64748B", bg: "rgba(100,116,139,0.1)", label: "Draft" },
    active: { color: "#16A34A", bg: "rgba(22,163,74,0.1)", label: "Active" },
    closed: { color: "var(--t-blue)", bg: "var(--t-blue-10)", label: "Closed" },
    archived: { color: "#6B7280", bg: "rgba(107,114,128,0.1)", label: "Archived" },
    pending_approval: { color: "#D97706", bg: "rgba(217,119,6,0.1)", label: "Pending Approval" },
    approved: { color: "#16A34A", bg: "rgba(22,163,74,0.1)", label: "Approved" },
    rejected: { color: "#DC2626", bg: "rgba(220,38,38,0.1)", label: "Rejected" },
  };
  const m = map[status] ?? { color: "#64748B", bg: "rgba(100,116,139,0.1)", label: status };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: m.bg, color: m.color }}>
      {m.label}
    </span>
  );
}

function SaveBtn({ saving, label = "Save", icon: Icon = Check, disabled = false }: { saving: boolean; label?: string; icon?: React.ElementType; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={saving || disabled}
      className="h-12 px-6 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap w-full"
      style={{ background: "linear-gradient(135deg, var(--t-blue) 0%, #1E3A8A 100%)" }}
    >
      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
      {saving ? "Saving…" : label}
    </button>
  );
}

function BackfillAdminFeeButton({ gbId }: { gbId: string }) {
  const [state, setState] = useState<"idle" | "confirming" | "loading" | "done" | "error">("idle");
  const [updated, setUpdated] = useState(0);
  const [errMsg, setErrMsg] = useState("");

  async function run() {
    setState("loading");
    try {
      const res = await fetch(`/api/organiser/group-buys/${gbId}/backfill-admin-fee`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) { setErrMsg(data.error ?? "Failed"); setState("error"); return; }
      setUpdated(data.updated);
      setState("done");
    } catch {
      setErrMsg("Network error"); setState("error");
    }
  }

  if (state === "idle" || state === "confirming") return (
    <div className="pt-1 space-y-1">
      {state === "confirming" && (
        <p className="text-xs font-medium" style={{ color: "#B45309" }}>
          This will add the fee to all existing orders that don't have it yet. Continue?
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => state === "idle" ? setState("confirming") : run()}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
          style={{ background: "rgba(124,58,237,0.08)", borderColor: "#C4B5FD", color: "#5B21B6" }}
        >
          {state === "idle" ? "Apply to existing orders…" : "Yes, apply fee"}
        </button>
        {state === "confirming" && (
          <button
            type="button"
            onClick={() => setState("idle")}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
            style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-muted)" }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
  if (state === "loading") return <p className="text-xs pt-1" style={{ color: "var(--t-subtle)" }}>Applying fee to orders…</p>;
  if (state === "done") return <p className="text-xs pt-1 font-medium" style={{ color: "#15803D" }}>✓ Fee applied to {updated} order{updated !== 1 ? "s" : ""}.</p>;
  return <p className="text-xs pt-1" style={{ color: "#DC2626" }}>✗ {errMsg}</p>;
}

function CountryTagField({ label, hint, values, onChange }: { label: string; hint?: string; values: string[]; onChange: (v: string[]) => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = COUNTRIES.filter(c => !values.includes(c) && c.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>{label}</p>
      {hint && <p className="text-[10px]" style={{ color: "var(--t-subtle)" }}>{hint}</p>}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map(c => (
            <span key={c} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium"
              style={{ background: "var(--t-blue-10)", color: "var(--t-blue-deep)", border: "1px solid var(--t-blue-15, rgba(27,58,122,0.15))" }}>
              {c}
              <button type="button" onClick={() => onChange(values.filter(v => v !== c))} className="ml-0.5 hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Type to search countries…"
          className={inputCls}
          style={inputStyle}
        />
        {open && search.length > 0 && filtered.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-lg"
            style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", maxHeight: 160 }}>
            <div className="overflow-y-auto" style={{ maxHeight: 160 }}>
              {filtered.slice(0, 20).map(c => (
                <button key={c} type="button"
                  onClick={() => { onChange([...values, c]); setSearch(""); setOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors"
                  style={{ color: "var(--t-text)" }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-5 space-y-4 ${className}`} style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
      {children}
    </div>
  );
}

function ToggleRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "var(--t-surface2)" }}>
      <div>
        <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{label}</p>
        {hint && <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>{hint}</p>}
      </div>
      <button type="button" onClick={() => onChange(!value)}>
        {value ? <ToggleRight className="w-8 h-8" style={{ color: "var(--t-blue)" }} /> : <ToggleLeft className="w-8 h-8" style={{ color: "var(--t-subtle)" }} />}
      </button>
    </div>
  );
}

// ─── Apply Screen ─────────────────────────────────────────────────────────────

function ApplyScreen({ onApplied }: { onApplied: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleApply = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/organiser/apply", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to apply"); return; }
      onApplied();
    } catch { setError("Connection error — please try again"); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 max-w-sm mx-auto space-y-5">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(27,58,122,0.1)" }}>
        <Users className="w-7 h-7" style={{ color: "var(--t-blue-deep)" }} />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>Become a GB Organiser</h2>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--t-subtle)" }}>
          Run your own Group Buys on Salt &amp; Peps. Manage products, shipping, payments, and lab results — all in one place.
        </p>
      </div>
      <div className="w-full rounded-2xl p-4 space-y-3" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
        {[
          { icon: Package, label: "Create & manage Group Buys" },
          { icon: FlaskConical, label: "Submit Janoshik / third-party lab tests" },
          { icon: BarChart3, label: "Track orders, revenue & P&L" },
          { icon: CreditCard, label: "Accept USDT, Revolut & PayPal payments" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(27,58,122,0.08)" }}>
              <Icon className="w-4 h-4" style={{ color: "var(--t-blue-deep)" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{label}</p>
          </div>
        ))}
      </div>
      {error && <ErrorBanner msg={error} />}
      <button
        onClick={handleApply}
        disabled={loading}
        className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
        style={{ background: "var(--t-blue-deep)" }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizonal className="w-4 h-4" />}
        {loading ? "Applying…" : "Apply to Become an Organiser"}
      </button>
      <p className="text-[11px] text-center" style={{ color: "var(--t-subtle)" }}>Applications are reviewed by the admin team. You'll hear back via Telegram.</p>
    </div>
  );
}

// ─── Status Screens ───────────────────────────────────────────────────────────

function StatusScreen({ status }: { status: string }) {
  const config = {
    applied: {
      icon: Clock, color: "#D97706", bg: "rgba(217,119,6,0.1)",
      title: "Application Pending", msg: "Your application to become a GB Organiser is being reviewed. You'll receive a Telegram message when a decision has been made."
    },
    rejected: {
      icon: AlertTriangle, color: "#DC2626", bg: "rgba(220,38,38,0.08)",
      title: "Application Not Approved", msg: "Your application was not approved at this time. Please contact the admin team via Telegram if you have questions."
    },
    suspended: {
      icon: Lock, color: "#DC2626", bg: "rgba(220,38,38,0.08)",
      title: "Account Suspended", msg: "Your GB Organiser account has been suspended. Contact the admin team to appeal."
    },
  }[status] ?? {
    icon: AlertCircle, color: "#94A3B8", bg: "rgba(148,163,184,0.1)",
    title: "Status Unknown", msg: "Please contact the admin team for assistance."
  };

  const Icon = config.icon;
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4 max-w-sm mx-auto">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: config.bg }}>
        <Icon className="w-7 h-7" style={{ color: config.color }} />
      </div>
      <h2 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>{config.title}</h2>
      <p className="text-sm leading-relaxed" style={{ color: "var(--t-subtle)" }}>{config.msg}</p>
    </div>
  );
}

// ─── Quick Stats Bar ──────────────────────────────────────────────────────────

function QuickStats({ gbs }: { gbs: OrganiserGB[] }) {
  const [stats, setStats] = useState<{ activeOrders: number; revenue: number; tips: number; tipCount: number; gbOrders: number; pendingLabs: number; activeMembers: number; currency: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetch_() {
      setLoading(true);
      let totalActiveOrders = 0;
      let totalRevenue = 0;
      let totalTips = 0;
      let totalTipCount = 0;
      let totalGbOrders = 0;
      let totalPendingLabs = 0;
      const memberSet = new Set<string>();
      const currency = gbs[0]?.currency ?? "GBP";
      try {
        await Promise.all([
          ...gbs.map(async gb => {
            const [ordRes, labRes] = await Promise.all([
              fetch(`/api/organiser/group-buys/${gb.id}/orders`, { credentials: "include" }),
              fetch("/api/organiser/lab-tests", { credentials: "include" }),
            ]);
            if (ordRes.ok) {
              const orders: OrgOrder[] = await ordRes.json();
              const confirmed = orders.filter(o => o.paymentStatus === "confirmed");
              totalActiveOrders += orders.filter(o => o.status === "Submitted" || o.status === "Processing").length;
              totalRevenue += confirmed.reduce((s, o) => s + o.grandTotal, 0);
              totalTips += confirmed.reduce((s, o) => s + (o.tip ?? 0), 0);
              totalTipCount += confirmed.filter(o => (o.tip ?? 0) > 0).length;
              totalGbOrders += orders.length;
              orders.forEach(o => { if (o.telegramUsername) memberSet.add(o.telegramUsername.toLowerCase()); });
            }
            if (labRes.ok) {
              const labs: OrgLabTest[] = await labRes.json();
              totalPendingLabs = labs.filter(l => l.pending).length;
            }
          })
        ]);
      } catch { /* ignore */ }
      if (!cancelled) { setStats({ activeOrders: totalActiveOrders, revenue: totalRevenue, tips: totalTips, tipCount: totalTipCount, gbOrders: totalGbOrders, pendingLabs: totalPendingLabs, activeMembers: memberSet.size, currency }); setLoading(false); }
    }
    if (gbs.length > 0) fetch_();
    else { setStats({ activeOrders: 0, revenue: 0, tips: 0, tipCount: 0, gbOrders: 0, pendingLabs: 0, activeMembers: 0, currency: "GBP" }); setLoading(false); }
    return () => { cancelled = true; };
  }, [gbs]);

  if (loading) return <div className="h-14" />;
  if (!stats) return null;

  const fmtMoney = (n: number) => stats.currency === "GBP" ? `£${n.toFixed(0)}` : `${stats.currency} ${n.toFixed(0)}`;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 px-4 pb-3">
      {[
        { label: "Active Orders", value: String(stats.activeOrders), color: "#D97706" },
        { label: "Revenue", value: fmtMoney(stats.revenue), color: "#16A34A" },
        { label: stats.tipCount > 0 ? `Tips (${stats.tipCount})` : "Tips", value: fmtMoney(stats.tips), color: stats.tips > 0 ? "#D97706" : "var(--t-muted)" },
        { label: "GB Orders", value: String(stats.gbOrders), color: "#2563EB" },
        { label: "Active Members", value: String(stats.activeMembers), color: "#0D9488" },
        { label: "Pending Labs", value: String(stats.pendingLabs), color: stats.pendingLabs > 0 ? "#7C3AED" : "var(--t-muted)", extraClass: "col-span-2 sm:col-span-1" },
      ].map(s => (
        <div key={s.label} className={`rounded-xl p-3 text-center ${"extraClass" in s ? s.extraClass : ""}`} style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
          <p className="text-xl font-bold leading-tight" style={{ color: s.color }}>{s.value}</p>
          <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: "var(--t-subtle)" }}>{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── GB List Card ─────────────────────────────────────────────────────────────

function GbListCard({ gb, cd, closed, onSelect }: {
  gb: OrganiserGB; cd: Date | null; closed: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className="rounded-2xl transition-all"
      style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "0 1px 4px rgba(15,23,42,0.06)" }}
    >
      <button
        onClick={() => onSelect(gb.id)}
        className="w-full text-left p-4"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate" style={{ color: "var(--t-text)" }}>{gb.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-[11px] font-mono font-semibold tracking-wide px-1.5 py-0.5 rounded" style={{ color: "var(--t-blue-deep)", background: "var(--t-blue-10)", border: "1px solid var(--t-blue-15, rgba(27,58,122,0.15))" }}>#{gb.id}</p>
              {gb.hiddenFromList && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(100,116,139,0.1)", color: "#64748B", border: "1px solid rgba(100,116,139,0.2)" }}>Hidden</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <StatusPill status={gb.status} />
            {gb.approvalStatus && gb.approvalStatus !== "approved" && (
              <StatusPill status={gb.approvalStatus} />
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--t-subtle)" }}>
          <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{gb.currency}</span>
          {cd && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {closed ? "Closed" : cd.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
            </span>
          )}
          <ChevronRight className="w-3.5 h-3.5 ml-auto" style={{ color: "var(--t-border)" }} />
        </div>
      </button>

    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ gbs, loading, profile, onSelect, onNew, onRefresh }: {
  gbs: OrganiserGB[]; loading: boolean; profile: OrganiserProfile;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRefresh: () => void;
}) {
  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-blue)" }} /></div>
  );

  return (
    <div className="space-y-4">
      {/* Quick stats */}
      {gbs.length > 0 && <QuickStats gbs={gbs} />}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold" style={{ color: "var(--t-text)" }}>My Group Buys</h2>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--t-subtle)" }}>{gbs.length} group buy{gbs.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
            <RefreshCw className="w-4 h-4" style={{ color: "var(--t-muted)" }} />
          </button>
          <button onClick={onNew} className="h-9 px-4 rounded-xl font-bold text-xs text-white flex items-center gap-1.5" style={{ background: "var(--t-blue-deep)" }}>
            <Plus className="w-3.5 h-3.5" /> New GB
          </button>
        </div>
      </div>

      {gbs.length === 0 && (
        <div className="flex flex-col items-center py-14 space-y-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--t-surface2)" }}>
            <Users className="w-6 h-6" style={{ color: "var(--t-subtle)" }} />
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--t-muted)" }}>No Group Buys yet</p>
          <button onClick={onNew} className="text-sm font-bold" style={{ color: "var(--t-blue)" }}>Create your first one →</button>
        </div>
      )}

      <div className="space-y-3">
        {gbs.map(gb => {
          const cd = gb.closeDate ? new Date(gb.closeDate) : null;
          const closed = cd && cd < new Date();
          return (
            <GbListCard key={gb.id} gb={gb} cd={cd} closed={!!closed} onSelect={onSelect} />
          );
        })}
      </div>
    </div>
  );
}

// ─── GB Form Tab ─────────────────────────────────────────────────────────────

function GBFormTab({ gb, onSaved, onBack, onDelete, onStatusChange, statusSaving, availableStatuses }: {
  gb: OrganiserGB | null;
  onSaved: (gb: OrganiserGB) => void;
  onBack: () => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (s: string) => void;
  statusSaving?: boolean;
  availableStatuses?: string[];
}) {
  const isNew = !gb;

  type OrgInfoCard = { title: string; body: string; type?: "info" | "update" | "warning" | "important"; postedAt?: string };
  const parseInfoCards = (gb: OrganiserGB | null): OrgInfoCard[] => {
    if (!gb?.infoCards) return [];
    if (Array.isArray(gb.infoCards)) return gb.infoCards;
    try { return JSON.parse(gb.infoCards as unknown as string) ?? []; } catch { return []; }
  };

  const [pinEnabled, setPinEnabled] = useState(!!(gb?.invitePinHash));

  const [form, setForm] = useState({
    name: gb?.name ?? "",
    description: gb?.description ?? "",
    status: gb?.status ?? "draft",
    currency: gb?.currency ?? "GBP",
    closeDate: gb?.closeDate ? (() => { const d = new Date(gb.closeDate!); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; })() : "",
    manufacturer: gb?.manufacturer ?? "",
    manufacturerCountry: gb?.manufacturerCountry ?? "",
    labTestSupplier: gb?.labTestSupplier ?? "",
    memberLimit: gb?.memberLimit?.toString() ?? "",
    minMembers: gb?.minMembers?.toString() ?? "",
    maxKitsPerCustomer: gb?.maxKitsPerCustomer?.toString() ?? "",
    maxKitsTotal: gb?.maxKitsTotal?.toString() ?? "",
    minKitsPerPerson: gb?.minKitsPerPerson?.toString() ?? "",
    invitePin: "",
    testOrderPin: gb?.testOrderPin ?? "",
    paymentsEnabled: gb?.paymentsEnabled ?? true,
    paymentMessage: gb?.paymentMessage ?? "",
    paymentMessageEnabled: gb?.paymentMessageEnabled ?? false,
    vendorShippingEnabled: gb?.vendorShippingEnabled ?? false,
    vendorShippingMessage: gb?.vendorShippingMessage ?? "",
    vendorShippingAmount: gb?.vendorShippingAmount?.toString() ?? "",
    adminFeeEnabled: gb?.adminFeeEnabled ?? false,
    adminFeeAmount: gb?.adminFeeAmount?.toString() ?? "",
    adminFeeLabel: gb?.adminFeeLabel ?? "",
    allowHalfKits: gb?.allowHalfKits ?? true,
    allowEditOrderWhenClosed: gb?.allowEditOrderWhenClosed ?? true,
    allowEditAddressWhenClosed: gb?.allowEditAddressWhenClosed ?? true,
    allowDeleteOrderWhenClosed: gb?.allowDeleteOrderWhenClosed ?? true,
    qrUploadInpostEnabled: gb?.qrUploadInpostEnabled ?? false,
    qrUploadRoyalMailEnabled: gb?.qrUploadRoyalMailEnabled ?? false,
    qrUploadMessage: gb?.qrUploadMessage ?? "",
    orderPageMessage: gb?.orderPageMessage ?? "",
  });
  const [allowedCountries, setAllowedCountries] = useState<string[]>(gb?.allowedCountries ?? []);
  const [excludedCountries, setExcludedCountries] = useState<string[]>(gb?.excludedCountries ?? []);
  const [blockedAccounts, setBlockedAccounts] = useState<string[]>(gb?.blockedAccounts ?? []);
  const [blockedInput, setBlockedInput] = useState("");
  const [qrViewerUsernames, setQrViewerUsernames] = useState<string[]>(gb?.qrViewerUsernames ?? []);
  const [qrViewerInput, setQrViewerInput] = useState("");
  const [qrViewerSuggestions, setQrViewerSuggestions] = useState<string[]>([]);
  const qrViewerDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [qrViewerChecking, setQrViewerChecking] = useState(false);
  const [qrViewerSaving, setQrViewerSaving] = useState(false);
  const [qrViewerError, setQrViewerError] = useState("");

  const [testOrderUnlocked, setTestOrderUnlocked] = useState(false);
  const [testPinEntry, setTestPinEntry] = useState("");
  const [testPinError, setTestPinError] = useState("");
  const [testOrderItems, setTestOrderItems] = useState([{ productName: "", quantity: "1", unitPrice: "" }]);
  const [testOrderShipping, setTestOrderShipping] = useState("");
  const [testOrderSubmitting, setTestOrderSubmitting] = useState(false);
  const [testOrderResult, setTestOrderResult] = useState<{ code: string } | null>(null);
  const [testOrderError, setTestOrderError] = useState("");

  const saveQrViewers = useCallback(async (usernames: string[]) => {
    if (!gb) return;
    setQrViewerSaving(true);
    try {
      await fetch(`/api/organiser/group-buys/${gb.id}/qr-viewers`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames }),
      });
    } catch { /* non-fatal — state is still updated locally */ }
    setQrViewerSaving(false);
  }, [gb]);

  useEffect(() => {
    if (qrViewerDebounce.current) clearTimeout(qrViewerDebounce.current);
    const q = qrViewerInput.trim();
    if (!q) { setQrViewerSuggestions([]); return; }
    qrViewerDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/organiser/search-users?q=${encodeURIComponent(q)}`, { credentials: "include" });
        if (res.ok) setQrViewerSuggestions(await res.json());
      } catch { /* ignore */ }
    }, 200);
    return () => { if (qrViewerDebounce.current) clearTimeout(qrViewerDebounce.current); };
  }, [qrViewerInput]);

  const addQrViewer = async () => {
    const v = qrViewerInput.trim().toLowerCase().replace(/^@/, "");
    if (!v || qrViewerUsernames.includes(v)) return;
    setQrViewerChecking(true);
    setQrViewerError("");
    try {
      const res = await fetch(`/api/organiser/check-user/${encodeURIComponent(v)}`, { credentials: "include" });
      const data = await res.json();
      if (!data.exists) { setQrViewerError("User not found"); setQrViewerChecking(false); return; }
      const next = [...qrViewerUsernames, v];
      setQrViewerUsernames(next);
      setQrViewerInput("");
      await saveQrViewers(next);
    } catch { setQrViewerError("Could not verify user"); }
    setQrViewerChecking(false);
  };

  const removeQrViewer = async (u: string) => {
    const next = qrViewerUsernames.filter(x => x !== u);
    setQrViewerUsernames(next);
    await saveQrViewers(next);
  };

  // Leg Viewer Access
  type LegViewerEntry = { username: string; legIds: string[] };
  const [legViewerAccess, setLegViewerAccess] = useState<LegViewerEntry[]>((gb?.legViewerAccess as LegViewerEntry[]) ?? []);
  const [legViewerLegs, setLegViewerLegs] = useState<{ id: string; countryCode: string; countryName: string }[]>([]);
  const [legViewerInput, setLegViewerInput] = useState("");
  const [legViewerSuggestions, setLegViewerSuggestions] = useState<string[]>([]);
  const legViewerDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [legViewerSelectedLegs, setLegViewerSelectedLegs] = useState<string[]>([]);
  const [savingLegViewers, setSavingLegViewers] = useState(false);
  const [legViewerError, setLegViewerError] = useState("");
  const [editingLegViewerUsername, setEditingLegViewerUsername] = useState<string | null>(null);
  const [editingLegIds, setEditingLegIds] = useState<string[]>([]);

  useEffect(() => {
    if (!gb) return;
    fetch(`/api/organiser/group-buys/${gb.id}/country-legs`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(setLegViewerLegs)
      .catch(() => {});
  }, [gb?.id]);

  useEffect(() => {
    if (legViewerDebounce.current) clearTimeout(legViewerDebounce.current);
    const q = legViewerInput.trim();
    if (!q) { setLegViewerSuggestions([]); return; }
    legViewerDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/organiser/search-users?q=${encodeURIComponent(q)}`, { credentials: "include" });
        if (res.ok) setLegViewerSuggestions(await res.json());
      } catch { /* ignore */ }
    }, 200);
    return () => { if (legViewerDebounce.current) clearTimeout(legViewerDebounce.current); };
  }, [legViewerInput]);

  const saveLegViewers = useCallback(async (entries: LegViewerEntry[]) => {
    if (!gb) return;
    setSavingLegViewers(true);
    try {
      const res = await fetch(`/api/organiser/group-buys/${gb.id}/leg-viewers`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legViewerAccess: entries }),
      });
      const data = await res.json();
      if (res.ok) setLegViewerAccess(data.legViewerAccess ?? []);
    } catch { /* non-fatal */ }
    setSavingLegViewers(false);
  }, [gb]);

  const [countryInput, setCountryInput] = useState("");
  const [infoCards, setInfoCards] = useState<OrgInfoCard[]>(parseInfoCards(gb));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [detailsTab, setDetailsTab] = useState<"core" | "members" | "messaging" | "settings">("core");
  const [codeCopied, setCodeCopied] = useState(false);

  const copyCode = () => {
    if (!gb?.id) return;
    navigator.clipboard.writeText(gb.id).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const addInfoCard = () => setInfoCards(c => [...c, { title: "", body: "", type: "info" as const }]);
  const removeInfoCard = (i: number) => setInfoCards(c => c.filter((_, j) => j !== i));
  const updateInfoCard = (i: number, k: keyof OrgInfoCard, v: string) =>
    setInfoCards(c => c.map((card, j) => j === i ? { ...card, [k]: v } : card));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Group buy name is required"); return; }
    setSaving(true); setError("");
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        currency: form.currency.trim() || "GBP",
        closeDate: form.closeDate ? form.closeDate : null,
        manufacturer: form.manufacturer.trim() || null,
        manufacturerCountry: form.manufacturerCountry.trim() || null,
        labTestSupplier: form.labTestSupplier.trim() || null,
        memberLimit: form.memberLimit.trim() ? parseInt(form.memberLimit) : null,
        minMembers: form.minMembers.trim() ? parseInt(form.minMembers) : null,
        maxKitsPerCustomer: form.maxKitsPerCustomer.trim() ? parseInt(form.maxKitsPerCustomer) : null,
        maxKitsTotal: form.maxKitsTotal.trim() ? parseInt(form.maxKitsTotal) : null,
        minKitsPerPerson: form.minKitsPerPerson.trim() ? parseInt(form.minKitsPerPerson) : null,
        paymentsEnabled: form.paymentsEnabled,
        paymentMessage: form.paymentMessage.trim() || null,
        paymentMessageEnabled: form.paymentMessageEnabled,
        vendorShippingEnabled: form.vendorShippingEnabled,
        vendorShippingMessage: form.vendorShippingMessage.trim() || null,
        vendorShippingAmount: form.vendorShippingAmount.trim() ? parseFloat(form.vendorShippingAmount) : null,
        adminFeeEnabled: form.adminFeeEnabled,
        adminFeeAmount: form.adminFeeAmount.trim() ? parseFloat(form.adminFeeAmount) : null,
        adminFeeLabel: form.adminFeeLabel.trim() || null,
        allowHalfKits: form.allowHalfKits,
        allowEditOrderWhenClosed: form.allowEditOrderWhenClosed,
        allowEditAddressWhenClosed: form.allowEditAddressWhenClosed,
        allowDeleteOrderWhenClosed: form.allowDeleteOrderWhenClosed,
        qrUploadInpostEnabled: form.qrUploadInpostEnabled,
        qrUploadRoyalMailEnabled: form.qrUploadRoyalMailEnabled,
        qrUploadMessage: form.qrUploadMessage.trim() || null,
        orderPageMessage: form.orderPageMessage.trim() || null,
        infoCards: infoCards.filter(c => c.title.trim() || c.body.trim()),
        allowedCountries: allowedCountries.length > 0 ? allowedCountries : null,
        excludedCountries: excludedCountries.length > 0 ? excludedCountries : null,
        blockedAccounts: blockedAccounts.length > 0 ? blockedAccounts : null,
        qrViewerUsernames: qrViewerUsernames.length > 0 ? qrViewerUsernames : null,
      };
      if (!pinEnabled) {
        body.invitePin = null;
      } else if (form.invitePin.trim()) {
        body.invitePin = form.invitePin.trim();
      }
      // else: leave invitePin absent — backend keeps the existing hash untouched
      body.testOrderPin = form.testOrderPin.trim() || null;

      const url = isNew ? "/api/organiser/group-buys" : `/api/organiser/group-buys/${gb.id}`;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save"); return; }
      onSaved(data as OrganiserGB);
    } catch { setError("Connection error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!gb || !onDelete) return;
    if (!confirm(`Archive this Group Buy (${gb.name})? This will hide it from members.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/organiser/group-buys/${gb.id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) { onDelete(gb.id); onBack(); }
      else { const d = await res.json(); setError(d.error || "Failed to archive"); }
    } catch { setError("Connection error"); }
    finally { setDeleting(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
          <ArrowLeft className="w-4 h-4" style={{ color: "var(--t-muted)" }} />
        </button>
        <div>
          <h2 className="text-base font-bold" style={{ color: "var(--t-text)" }}>{isNew ? "New Group Buy" : `Edit: ${gb.name}`}</h2>
          {!isNew && <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>#{gb.id}</p>}
        </div>
      </div>

      {error && <ErrorBanner msg={error} onClose={() => setError("")} />}

      {/* Sub-tab pill nav */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
        {(["core", "members", "messaging", "settings"] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setDetailsTab(tab)}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all"
            style={detailsTab === tab
              ? { background: "var(--t-blue-deep)", color: "#fff" }
              : { color: "var(--t-muted)" }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Core ── */}
      {detailsTab === "core" && (
        <>
          {!isNew && gb && onStatusChange && availableStatuses && availableStatuses.length > 0 && (
            <SectionCard>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--t-blue-deep)" }}>Status</p>
              <div className="flex gap-1.5 flex-wrap items-center">
                {availableStatuses.map(s => {
                  const cfg = STATUS_CONFIG[s] ?? { color: "#64748B", bg: "rgba(100,116,139,0.12)", label: s };
                  const isActive = gb.status === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={statusSaving || isActive}
                      onClick={() => onStatusChange(s)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all shrink-0"
                      style={{
                        background: isActive ? cfg.bg : "transparent",
                        color: isActive ? cfg.color : "var(--t-muted)",
                        border: `1.5px solid ${isActive ? cfg.color : "var(--t-border)"}`,
                        opacity: statusSaving ? 0.6 : 1,
                        cursor: isActive ? "default" : "pointer",
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: isActive ? cfg.color : "var(--t-border)" }} />
                      {cfg.label}
                    </button>
                  );
                })}
                {statusSaving && <Loader2 className="w-3 h-3 animate-spin shrink-0" style={{ color: "var(--t-subtle)" }} />}
              </div>
            </SectionCard>
          )}

          {!isNew && gb && (
            <SectionCard>
              <div className="flex items-center gap-2 mb-1">
                <FlaskConical className="w-3.5 h-3.5" style={{ color: gb.testOrderPin ? "#F97316" : "var(--t-muted)" }} />
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: gb.testOrderPin ? "#F97316" : "var(--t-muted)" }}>Test Order</p>
                {gb.testOrderPin && (
                  <span style={{ marginLeft: "auto", fontSize: 10, padding: "1px 8px", borderRadius: 20, background: "rgba(249,115,22,0.1)", color: "#F97316", border: "1px solid rgba(249,115,22,0.2)", fontWeight: 600 }}>PIN Protected</span>
                )}
              </div>
              {!gb.testOrderPin ? (
                <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>Go to the <strong>Members</strong> tab below and set a Test Order PIN to enable this. Once saved, you can place a test order directly from here to verify your GB flow.</p>
              ) : !testOrderUnlocked ? (
                <>
                  <p className="text-[11px] mb-2" style={{ color: "var(--t-muted)" }}>Enter your test PIN to place a test order and verify the full order flow.</p>
                  <div className="flex gap-2">
                    <input
                      value={testPinEntry}
                      onChange={e => { setTestPinEntry(e.target.value.replace(/\D/g, "").slice(0, 4)); setTestPinError(""); }}
                      placeholder="••••"
                      maxLength={4}
                      type="password"
                      className={inputCls}
                      style={{ ...inputStyle, maxWidth: 90, letterSpacing: "0.2em", fontFamily: "monospace" }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (testPinEntry === gb.testOrderPin) { setTestOrderUnlocked(true); setTestPinError(""); }
                        else { setTestPinError("Incorrect PIN"); }
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold"
                      style={{ background: "rgba(249,115,22,0.12)", color: "#F97316", border: "1px solid rgba(249,115,22,0.3)" }}
                    >
                      Unlock
                    </button>
                  </div>
                  {testPinError && <p className="text-xs mt-1" style={{ color: "#DC2626" }}>{testPinError}</p>}
                </>
              ) : (
                <>
                  <p className="text-[11px] mb-3" style={{ color: "#F97316", fontWeight: 600 }}>🧪 Test mode unlocked — fill in items and submit a test order.</p>
                  <div className="space-y-2">
                    {testOrderItems.map((item, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          value={item.productName}
                          onChange={e => setTestOrderItems(items => items.map((it, j) => j === i ? { ...it, productName: e.target.value } : it))}
                          placeholder="Product name"
                          className={inputCls}
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        <input
                          value={item.quantity}
                          onChange={e => setTestOrderItems(items => items.map((it, j) => j === i ? { ...it, quantity: e.target.value } : it))}
                          placeholder="Qty"
                          type="number"
                          min="0.5"
                          step="0.5"
                          className={inputCls}
                          style={{ ...inputStyle, width: 62 }}
                        />
                        <input
                          value={item.unitPrice}
                          onChange={e => setTestOrderItems(items => items.map((it, j) => j === i ? { ...it, unitPrice: e.target.value } : it))}
                          placeholder="Price"
                          type="number"
                          min="0"
                          step="0.01"
                          className={inputCls}
                          style={{ ...inputStyle, width: 78 }}
                        />
                        {testOrderItems.length > 1 && (
                          <button type="button" onClick={() => setTestOrderItems(items => items.filter((_, j) => j !== i))}
                            style={{ background: "rgba(220,38,38,0.07)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => setTestOrderItems(items => [...items, { productName: "", quantity: "1", unitPrice: "" }])}
                      className="text-xs font-semibold" style={{ color: "var(--t-blue)" }}>
                      + Add item
                    </button>
                    <input
                      value={testOrderShipping}
                      onChange={e => setTestOrderShipping(e.target.value)}
                      placeholder="Shipping amount (optional)"
                      type="number"
                      min="0"
                      step="0.01"
                      className={inputCls}
                      style={inputStyle}
                    />
                    {testOrderError && <p className="text-xs" style={{ color: "#DC2626" }}>{testOrderError}</p>}
                    {testOrderResult && (
                      <div className="p-2.5 rounded-xl" style={{ background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.3)" }}>
                        <p className="text-xs font-bold" style={{ color: "#16A34A" }}>Test order created! Code: #{testOrderResult.code}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>Check the Orders tab — it will show a TEST badge.</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={testOrderSubmitting}
                        onClick={async () => {
                          setTestOrderSubmitting(true); setTestOrderError(""); setTestOrderResult(null);
                          try {
                            const res = await fetch(`/api/organiser/group-buys/${gb.id}/test-order`, {
                              method: "POST", credentials: "include",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                pin: testPinEntry,
                                lineItems: testOrderItems.filter(li => li.productName.trim()).map(li => ({
                                  productName: li.productName,
                                  quantity: parseFloat(li.quantity) || 1,
                                  unitPrice: parseFloat(li.unitPrice) || 0,
                                })),
                                shippingAmount: parseFloat(testOrderShipping) || 0,
                              }),
                            });
                            const data = await res.json();
                            if (!res.ok) { setTestOrderError(data.error || "Failed to create test order"); }
                            else { setTestOrderResult({ code: data.code }); setTestOrderItems([{ productName: "", quantity: "1", unitPrice: "" }]); setTestOrderShipping(""); }
                          } catch { setTestOrderError("Connection error"); }
                          setTestOrderSubmitting(false);
                        }}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                        style={{ background: "rgba(249,115,22,0.12)", color: "#F97316", border: "1px solid rgba(249,115,22,0.3)", opacity: testOrderSubmitting ? 0.6 : 1 }}
                      >
                        {testOrderSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
                        Place Test Order
                      </button>
                      <button type="button" onClick={() => { setTestOrderUnlocked(false); setTestPinEntry(""); setTestOrderResult(null); setTestOrderError(""); }}
                        className="px-3 py-2 rounded-xl text-xs font-semibold"
                        style={{ color: "var(--t-muted)", background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                        Lock
                      </button>
                    </div>
                  </div>
                </>
              )}
            </SectionCard>
          )}

          {!isNew && gb?.id && (
            <SectionCard>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--t-blue-deep)" }}>Access Code</p>
              <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>Share this code with members so they can join this group buy directly.</p>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex-1 flex items-center justify-center rounded-xl py-2.5 px-4" style={{ background: "var(--t-blue-10)", border: "1px solid rgba(27,58,122,0.15)" }}>
                  <span className="font-mono font-black text-xl tracking-[0.18em]" style={{ color: "var(--t-blue-deep)" }}>#{gb.id}</span>
                </div>
                <button
                  type="button"
                  onClick={copyCode}
                  className="h-11 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all"
                  style={codeCopied
                    ? { background: "rgba(22,163,74,0.12)", color: "#16A34A", border: "1px solid rgba(22,163,74,0.3)" }
                    : { background: "var(--t-surface)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}
                >
                  {codeCopied ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
              </div>
            </SectionCard>
          )}

          <SectionCard>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--t-blue-deep)" }}>Basic Info</p>
            <Field label="Name *" icon={Tag}>
              <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Summer 2025 Peptide GB" className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Description" icon={FileText}>
              <textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Brief description visible to members" rows={2} className={`${inputCls} resize-none`} style={inputStyle} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Currency" icon={Globe}>
                <select value={form.currency} onChange={e => set("currency", e.target.value)} className={`${inputCls} appearance-none`} style={inputStyle}>
                  {["GBP", "EUR", "USD", "USDT", "BTC"].map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Close Date" icon={Calendar}>
                <input type="datetime-local" value={form.closeDate} onChange={e => set("closeDate", e.target.value)} className={inputCls} style={inputStyle} />
              </Field>
            </div>
          </SectionCard>

          <SectionCard>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--t-blue-deep)" }}>Supplier Details</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Manufacturer">
                <input value={form.manufacturer} onChange={e => set("manufacturer", e.target.value)} placeholder="Lab / manufacturer name" className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Country">
                <input value={form.manufacturerCountry} onChange={e => set("manufacturerCountry", e.target.value)} placeholder="e.g. China" className={inputCls} style={inputStyle} />
              </Field>
            </div>
            <Field label="Lab Test Supplier" icon={FlaskConical}>
              <input value={form.labTestSupplier} onChange={e => set("labTestSupplier", e.target.value)} placeholder="e.g. Janoshik, Simec" className={inputCls} style={inputStyle} />
            </Field>
          </SectionCard>
        </>
      )}

      {/* ── Members ── */}
      {detailsTab === "members" && (
        <>
          <SectionCard>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--t-blue-deep)" }}>Membership Limits</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Max Members" icon={Users} hint="Unlimited if blank">
                <input value={form.memberLimit} onChange={e => set("memberLimit", e.target.value)} type="number" min="1" placeholder="Unlimited" className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Min Members" icon={Users} hint="Minimum to proceed">
                <input value={form.minMembers} onChange={e => set("minMembers", e.target.value)} type="number" min="1" placeholder="None" className={inputCls} style={inputStyle} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min Kits Per Person" icon={Users} hint="Minimum order size per customer">
                <input value={form.minKitsPerPerson} onChange={e => set("minKitsPerPerson", e.target.value)} type="number" min="1" placeholder="None" className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Max Kits Per Customer" icon={Users} hint="Blank = unlimited">
                <input value={form.maxKitsPerCustomer} onChange={e => set("maxKitsPerCustomer", e.target.value)} type="number" min="1" placeholder="Unlimited" className={inputCls} style={inputStyle} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Max Kits Total (GB cap)" icon={Users} hint="Blank = unlimited">
                <input value={form.maxKitsTotal} onChange={e => set("maxKitsTotal", e.target.value)} type="number" min="1" placeholder="Unlimited" className={inputCls} style={inputStyle} />
              </Field>
            </div>
            <ToggleRow label="Allow half kits" hint="Let customers order 0.5 increments on the order form" value={form.allowHalfKits} onChange={v => set("allowHalfKits", v)} />
            <div className="rounded-xl border p-3 space-y-1" style={{ borderColor: "hsl(var(--border))" }}>
              <p className="text-xs font-semibold text-foreground">Customer permissions when GB closed</p>
              <p className="text-[11px] text-muted-foreground mb-2">All on by default. Disable any to block that action once this GB's status is Closed.</p>
              <ToggleRow label="Edit Order" hint="Change quantities, add/remove items." value={form.allowEditOrderWhenClosed} onChange={v => set("allowEditOrderWhenClosed", v)} />
              <ToggleRow label="Edit Address" hint="Update shipping name and address." value={form.allowEditAddressWhenClosed} onChange={v => set("allowEditAddressWhenClosed", v)} />
              <ToggleRow label="Delete Order" hint="Self-delete their order (Draft / Submitted only)." value={form.allowDeleteOrderWhenClosed} onChange={v => set("allowDeleteOrderWhenClosed", v)} />
            </div>
            <ToggleRow
              label="Invite PIN"
              hint={pinEnabled ? "Members must enter this 4-digit PIN to join" : "Anyone with the access code can join freely"}
              value={pinEnabled}
              onChange={v => { setPinEnabled(v); if (!v) set("invitePin", ""); }}
            />
            {pinEnabled && (
              <Field label="PIN (4 digits)" icon={Lock} hint={gb?.invitePinHash ? "Leave blank to keep the current PIN, or enter a new one to change it" : "Enter a 4-digit numeric PIN"}>
                <input value={form.invitePin} onChange={e => set("invitePin", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder={gb?.invitePinHash ? "••••  (set — enter new to change)" : "e.g. 1234"} maxLength={4} className={inputCls} style={inputStyle} />
              </Field>
            )}
            <Field label="Test Order PIN" icon={FlaskConical} hint="4-digit secret PIN to enable test orders. Clear to disable.">
              <input value={form.testOrderPin} onChange={e => set("testOrderPin", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="e.g. 5678" maxLength={4} className={inputCls} style={inputStyle} />
            </Field>
          </SectionCard>
        </>
      )}

      {/* ── Messaging ── */}
      {detailsTab === "messaging" && (
        <>
          <SectionCard>
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Add a Message to the Order Page</p>
            </div>
            <p className="text-xs mb-3" style={{ color: "var(--t-subtle)" }}>
              Shown as a banner on the ordering page of this GB. Useful for announcements, rules, or important reminders. Leave blank to show no banner.
            </p>
            <textarea
              value={form.orderPageMessage}
              onChange={e => set("orderPageMessage", e.target.value)}
              rows={3}
              placeholder="e.g. Orders close on 30th April. Please read the product descriptions carefully before ordering."
              className={`${inputCls} resize-y`}
              style={inputStyle}
            />
          </SectionCard>

          <SectionCard>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--t-blue-deep)" }}>Info Cards</p>
              <button type="button" onClick={addInfoCard} className="h-7 px-3 rounded-lg text-[11px] font-bold flex items-center gap-1" style={{ background: "var(--t-blue-10)", color: "var(--t-blue-deep)" }}>
                <Plus className="w-3 h-3" /> Add Card
              </button>
            </div>
            <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>Info cards are shown to members on the GB overview page.</p>
            {infoCards.length === 0 && (
              <p className="text-[11px] text-center py-3" style={{ color: "var(--t-subtle)" }}>No info cards yet</p>
            )}
            {infoCards.map((card, i) => (
              <div key={i} className="p-3 rounded-xl space-y-2" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                <div className="flex items-center gap-2">
                  <input
                    value={card.title}
                    onChange={e => updateInfoCard(i, "title", e.target.value)}
                    placeholder="Card title"
                    className={`${inputCls} flex-1 text-xs h-9 py-0 font-semibold`}
                    style={inputStyle}
                  />
                  <button type="button" onClick={() => removeInfoCard(i)} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(220,38,38,0.07)" }}>
                    <X className="w-3.5 h-3.5" style={{ color: "#DC2626" }} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={card.type ?? "info"}
                    onChange={e => updateInfoCard(i, "type", e.target.value)}
                    className="shrink-0 w-28 px-2 h-8 rounded-lg text-xs focus:outline-none"
                    style={inputStyle}
                  >
                    <option value="info">Info</option>
                    <option value="update">Update</option>
                    <option value="warning">Warning</option>
                    <option value="important">Important</option>
                  </select>
                  <input
                    type="text"
                    value={card.postedAt ?? ""}
                    onChange={e => updateInfoCard(i, "postedAt", e.target.value)}
                    className="flex-1 min-w-0 px-2 h-8 rounded-lg text-xs focus:outline-none"
                    style={inputStyle}
                    placeholder="Date posted (YYYY-MM-DD)"
                  />
                </div>
                <textarea
                  value={card.body}
                  onChange={e => updateInfoCard(i, "body", e.target.value)}
                  placeholder="Card body text…"
                  rows={2}
                  className={`${inputCls} resize-none text-xs`}
                  style={inputStyle}
                />
              </div>
            ))}
          </SectionCard>

          <SectionCard>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--t-blue-deep)" }}>Payment Message</p>
            <ToggleRow label="Custom payment message" hint="Show custom instructions at checkout" value={form.paymentMessageEnabled} onChange={v => set("paymentMessageEnabled", v)} />
            {form.paymentMessageEnabled && (
              <Field label="Payment message">
                <textarea value={form.paymentMessage} onChange={e => set("paymentMessage", e.target.value)} rows={2} className={`${inputCls} resize-none`} style={inputStyle} placeholder="Instructions shown at checkout (e.g. USDT wallet, Revolut details)" />
              </Field>
            )}
          </SectionCard>
        </>
      )}

      {/* ── Settings ── */}
      {detailsTab === "settings" && (
        <>
          <SectionCard>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--t-blue-deep)" }}>Payments</p>
            <ToggleRow label="Payments enabled" hint="Allow payment confirmation for orders" value={form.paymentsEnabled} onChange={v => set("paymentsEnabled", v)} />
          </SectionCard>

          <SectionCard>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" style={{ color: "#7C3AED" }} />
                <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Admin Fee</p>
              </div>
              <button
                type="button"
                onClick={() => set("adminFeeEnabled", !form.adminFeeEnabled)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                style={form.adminFeeEnabled
                  ? { background: "rgba(124,58,237,0.08)", borderColor: "#C4B5FD", color: "#5B21B6" }
                  : { background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-muted)" }}
              >
                {form.adminFeeEnabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                {form.adminFeeEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>
            {form.adminFeeEnabled ? (
              <div className="space-y-2">
                <p className="text-xs" style={{ color: "var(--t-subtle)" }}>A fixed fee that will be added to each order in this group buy.</p>
                <Field label="Fee amount" icon={DollarSign} hint="Leave blank if not yet determined">
                  <input value={form.adminFeeAmount} onChange={e => set("adminFeeAmount", e.target.value)} type="number" min="0" step="0.01" placeholder="e.g. 2.50" className={inputCls} style={inputStyle} />
                </Field>
                <Field label="Fee label" hint="Optional — shown to customers on their order">
                  <input value={form.adminFeeLabel} onChange={e => set("adminFeeLabel", e.target.value)} type="text" placeholder="e.g. Platform fee, Admin fee" className={inputCls} style={inputStyle} />
                </Field>
                {form.adminFeeAmount.trim() && parseFloat(form.adminFeeAmount) > 0 && (
                  <BackfillAdminFeeButton gbId={gb!.id} />
                )}
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--t-subtle)" }}>When enabled, a fixed admin fee will be added to each order. You can set the amount and label below.</p>
            )}
          </SectionCard>

          <SectionCard>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4" style={{ color: "#D97706" }} />
                <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Vendor Shipping Notice</p>
              </div>
              <button
                type="button"
                onClick={() => set("vendorShippingEnabled", !form.vendorShippingEnabled)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                style={form.vendorShippingEnabled
                  ? { background: "rgba(245,158,11,0.08)", borderColor: "#FCD34D", color: "#92400E" }
                  : { background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-muted)" }}
              >
                {form.vendorShippingEnabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                {form.vendorShippingEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>
            {form.vendorShippingEnabled ? (
              <div className="space-y-2">
                <p className="text-xs" style={{ color: "var(--t-subtle)" }}>This notice appears on the order review page to warn members that vendor shipping will be added later.</p>
                <Field label="Vendor shipping amount" icon={DollarSign} hint="Leave blank to show as TBD">
                  <input value={form.vendorShippingAmount} onChange={e => set("vendorShippingAmount", e.target.value)} type="number" min="0" step="0.01" placeholder="e.g. 5.00 (leave blank = TBD)" className={inputCls} style={inputStyle} />
                </Field>
                <textarea value={form.vendorShippingMessage} onChange={e => set("vendorShippingMessage", e.target.value)} rows={3} placeholder="This is not your final total. Vendor shipping is calculated after orders close and will be added separately. You will be notified of your final amount via Telegram before payment is taken." className={`${inputCls} resize-y`} style={inputStyle} />
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--t-subtle)" }}>When disabled, the order review shows <strong>Vendor Shipping: TBD</strong> as a plain line item with no extra notice.</p>
            )}
          </SectionCard>

          <SectionCard>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4" style={{ color: "#1B3A7A" }} />
                <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>QR Code Upload</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => set("qrUploadInpostEnabled", !form.qrUploadInpostEnabled)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all" style={form.qrUploadInpostEnabled ? { background: "rgba(27,58,122,0.08)", borderColor: "#93C5FD", color: "#1B3A7A" } : { background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-muted)" }}>
                  {form.qrUploadInpostEnabled ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                  InPost
                </button>
                <button type="button" onClick={() => set("qrUploadRoyalMailEnabled", !form.qrUploadRoyalMailEnabled)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all" style={form.qrUploadRoyalMailEnabled ? { background: "rgba(27,58,122,0.08)", borderColor: "#93C5FD", color: "#1B3A7A" } : { background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-muted)" }}>
                  {form.qrUploadRoyalMailEnabled ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                  Royal Mail
                </button>
              </div>
            </div>
            {(form.qrUploadInpostEnabled || form.qrUploadRoyalMailEnabled) ? (
              <div className="space-y-2">
                <p className="text-xs" style={{ color: "var(--t-subtle)" }}>Members will see QR upload section(s) on their order page once payment is confirmed.</p>
                <Field label="Custom message" hint="Instructions shown to members. Leave blank for default text.">
                  <textarea value={form.qrUploadMessage} onChange={e => set("qrUploadMessage", e.target.value)} rows={3} className={`${inputCls} resize-none`} style={inputStyle} placeholder="e.g. Visit inpost.co.uk to get your QR code, then upload it here so we can scan it at the post office." />
                </Field>
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--t-subtle)" }}>Enable InPost and/or Royal Mail so members can upload QR codes after payment is confirmed.</p>
            )}
            {!isNew && gb && (
              <div className="pt-1">
                <button type="button" onClick={() => window.open(`/qr-viewer/${gb.id}`, "_blank")} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all w-full justify-center" style={{ background: "rgba(27,58,122,0.06)", borderColor: "rgba(27,58,122,0.2)", color: "#1B3A7A" }}>
                  <QrCode className="w-3.5 h-3.5" />
                  Open QR Viewer for this GB
                </button>
              </div>
            )}
          </SectionCard>

          {!isNew && (
            <SectionCard>
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4" style={{ color: "#1B3A7A" }} />
                <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>QR Viewer Access</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>These members can open the QR Viewer for this group buy, even if they're not an organiser.</p>
                {qrViewerSaving && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: "#1B3A7A" }} />}
              </div>
              {qrViewerUsernames.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {qrViewerUsernames.map(u => (
                    <span key={u} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                      style={{ background: "rgba(27,58,122,0.07)", color: "#1B3A7A", border: "1px solid rgba(27,58,122,0.2)" }}>
                      @{u}
                      <button type="button" onClick={() => removeQrViewer(u)} className="ml-0.5 hover:opacity-70" disabled={qrViewerSaving}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={qrViewerInput}
                      onChange={e => { setQrViewerInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); setQrViewerError(""); }}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addQrViewer(); } }}
                      onBlur={() => setTimeout(() => setQrViewerSuggestions([]), 150)}
                      placeholder="telegram username (no @)"
                      className={inputCls}
                      style={{ ...inputStyle, borderColor: qrViewerError ? "#ef4444" : undefined }}
                    />
                    {qrViewerSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-lg"
                        style={{ background: "var(--t-surface)", border: "1px solid rgba(27,58,122,0.15)" }}>
                        {qrViewerSuggestions.map(u => (
                          <button key={u} type="button"
                            onMouseDown={e => { e.preventDefault(); setQrViewerInput(u); setQrViewerSuggestions([]); }}
                            className="w-full text-left px-3 py-2 text-sm transition-colors font-mono"
                            style={{ color: "var(--t-text)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(45,107,204,0.08)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            @{u}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!qrViewerInput.trim() || qrViewerUsernames.includes(qrViewerInput.trim()) || qrViewerChecking || qrViewerSaving}
                    onClick={addQrViewer}
                    className="h-11 px-3 rounded-xl text-xs font-bold shrink-0 disabled:opacity-40 transition-all flex items-center gap-1"
                    style={{ background: "rgba(27,58,122,0.08)", color: "#1B3A7A", border: "1px solid rgba(27,58,122,0.2)" }}
                  >
                    {qrViewerChecking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Add
                  </button>
                </div>
                {qrViewerError && (
                  <p className="text-[11px] font-medium" style={{ color: "#ef4444" }}>{qrViewerError}</p>
                )}
              </div>
            </SectionCard>
          )}

          {/* Leg Viewer Access */}
          {!isNew && gb?.countryLegsEnabled && (
            <SectionCard>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" style={{ color: "#1B3A7A" }} />
                <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Leg Viewer Access</p>
                {savingLegViewers && <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto shrink-0" style={{ color: "#1B3A7A" }} />}
              </div>
              <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>
                Grant specific members access to view orders for selected country legs.
                {legViewerLegs.length === 0 && (
                  <span className="block mt-1 font-medium" style={{ color: "#d97706" }}>⚠ No country legs configured — add legs first.</span>
                )}
              </p>

              {/* Existing entries */}
              {legViewerAccess.length > 0 && (
                <div className="space-y-2">
                  {legViewerAccess.map(entry => (
                    <div key={entry.username} className="rounded-xl border" style={{ borderColor: "rgba(27,58,122,0.15)", background: "rgba(45,107,204,0.04)" }}>
                      <div className="flex items-start gap-2 p-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold" style={{ color: "#1B3A7A" }}>@{entry.username}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {entry.legIds.map(lid => {
                              const leg = legViewerLegs.find(l => l.id === lid);
                              return (
                                <span key={lid} className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                  style={{ background: "rgba(27,58,122,0.1)", color: "#1B3A7A" }}>
                                  {leg ? leg.countryName : lid}
                                </span>
                              );
                            })}
                          </div>
                          <a
                            href={`/leg-view/${gb.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold hover:underline"
                            style={{ color: "#2D6BCC" }}
                          >
                            <ExternalLink className="w-2.5 h-2.5" /> View as this user
                          </a>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 mt-0.5">
                          <button
                            type="button"
                            title="Edit countries"
                            onClick={() => {
                              if (editingLegViewerUsername === entry.username) {
                                setEditingLegViewerUsername(null);
                              } else {
                                setEditingLegViewerUsername(entry.username);
                                setEditingLegIds(entry.legIds);
                              }
                            }}
                            className="transition-colors"
                            style={{ color: editingLegViewerUsername === entry.username ? "#2D6BCC" : "#94A3B8" }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next = legViewerAccess.filter(e => e.username !== entry.username);
                              setLegViewerAccess(next);
                              saveLegViewers(next);
                              if (editingLegViewerUsername === entry.username) setEditingLegViewerUsername(null);
                            }}
                            className="transition-colors"
                            style={{ color: "#94A3B8" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                            onMouseLeave={e => (e.currentTarget.style.color = "#94A3B8")}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Inline editor */}
                      {editingLegViewerUsername === entry.username && (
                        <div className="border-t px-3 pb-3 pt-2.5 space-y-2" style={{ borderColor: "rgba(27,58,122,0.12)" }}>
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#94A3B8" }}>Select countries</p>
                          <div className="flex flex-wrap gap-1.5">
                            {legViewerLegs.map(leg => {
                              const selected = editingLegIds.includes(leg.id);
                              return (
                                <button
                                  key={leg.id}
                                  type="button"
                                  onClick={() => setEditingLegIds(prev =>
                                    selected ? prev.filter(id => id !== leg.id) : [...prev, leg.id]
                                  )}
                                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all"
                                  style={selected
                                    ? { background: "#1B3A7A", color: "#fff", borderColor: "#1B3A7A" }
                                    : { background: "var(--t-surface)", color: "#64748B", borderColor: "rgba(27,58,122,0.2)" }}
                                >
                                  {leg.countryName}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              disabled={editingLegIds.length === 0 || savingLegViewers}
                              onClick={async () => {
                                const next = legViewerAccess.map(e =>
                                  e.username === entry.username ? { ...e, legIds: editingLegIds } : e
                                );
                                setLegViewerAccess(next);
                                await saveLegViewers(next);
                                setEditingLegViewerUsername(null);
                              }}
                              className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 transition-all"
                              style={{ background: "#1B3A7A", color: "#fff" }}
                            >
                              {savingLegViewers ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingLegViewerUsername(null)}
                              className="h-8 px-3 rounded-lg text-xs font-semibold transition-all"
                              style={{ background: "var(--t-surface2)", color: "var(--t-muted)", border: "1px solid var(--t-border)" }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add new viewer */}
              {legViewerLegs.length > 0 && (
                <div className="space-y-2 border-t pt-3" style={{ borderColor: "rgba(27,58,122,0.08)" }}>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={legViewerInput}
                        onChange={e => { setLegViewerInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); setLegViewerError(""); }}
                        onBlur={() => setTimeout(() => setLegViewerSuggestions([]), 150)}
                        placeholder="telegram username (no @)"
                        className={inputCls}
                        style={{ ...inputStyle, borderColor: legViewerError ? "#ef4444" : undefined }}
                      />
                      {legViewerSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-lg"
                          style={{ background: "var(--t-surface)", border: "1px solid rgba(27,58,122,0.15)" }}>
                          {legViewerSuggestions.map(u => (
                            <button key={u} type="button"
                              onMouseDown={e => { e.preventDefault(); setLegViewerInput(u); setLegViewerSuggestions([]); }}
                              className="w-full text-left px-3 py-2 text-sm font-mono transition-colors"
                              style={{ color: "var(--t-text)" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "rgba(45,107,204,0.08)")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                              @{u}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={!legViewerInput.trim() || legViewerSelectedLegs.length === 0 || savingLegViewers}
                      onClick={async () => {
                        const v = legViewerInput.trim();
                        if (!v || legViewerSelectedLegs.length === 0) return;
                        setSavingLegViewers(true); setLegViewerError("");
                        try {
                          const chk = await fetch(`/api/organiser/check-user/${encodeURIComponent(v)}`, { credentials: "include" });
                          const d = await chk.json();
                          if (!d.exists) { setLegViewerError("User not found"); setSavingLegViewers(false); return; }
                          const existing = legViewerAccess.find(e => e.username === v);
                          const next = existing
                            ? legViewerAccess.map(e => e.username === v ? { ...e, legIds: [...new Set([...e.legIds, ...legViewerSelectedLegs])] } : e)
                            : [...legViewerAccess, { username: v, legIds: legViewerSelectedLegs }];
                          setLegViewerAccess(next);
                          setLegViewerInput("");
                          setLegViewerSelectedLegs([]);
                          await saveLegViewers(next);
                        } catch { setLegViewerError("Could not verify user"); }
                        setSavingLegViewers(false);
                      }}
                      className="h-11 px-3 rounded-xl text-xs font-bold shrink-0 disabled:opacity-40 transition-all flex items-center gap-1"
                      style={{ background: "rgba(27,58,122,0.08)", color: "#1B3A7A", border: "1px solid rgba(27,58,122,0.2)" }}
                    >
                      {savingLegViewers ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Add
                    </button>
                  </div>
                  {legViewerError && <p className="text-[11px] font-medium" style={{ color: "#ef4444" }}>{legViewerError}</p>}
                  {/* Leg checkboxes */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#94A3B8" }}>Select legs to grant access to</p>
                    <div className="flex flex-wrap gap-1.5">
                      {legViewerLegs.map(leg => {
                        const selected = legViewerSelectedLegs.includes(leg.id);
                        return (
                          <button
                            key={leg.id}
                            type="button"
                            onClick={() => setLegViewerSelectedLegs(prev =>
                              selected ? prev.filter(id => id !== leg.id) : [...prev, leg.id]
                            )}
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all"
                            style={selected
                              ? { background: "#1B3A7A", color: "#fff", borderColor: "#1B3A7A" }
                              : { background: "var(--t-surface)", color: "#64748B", borderColor: "rgba(27,58,122,0.2)" }}
                          >
                            {leg.countryName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          <SectionCard>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--t-blue-deep)" }}>Country Restrictions</p>
            <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>Limit which countries can join this group buy. Leave both empty for no restrictions.</p>
            <CountryTagField label="Allowed Countries" hint="Only these countries can join (leave empty = all allowed)" values={allowedCountries} onChange={setAllowedCountries} />
            <CountryTagField label="Excluded Countries" hint="These countries cannot join" values={excludedCountries} onChange={setExcludedCountries} />
          </SectionCard>

          <SectionCard>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--t-blue-deep)" }}>Blocked Accounts</p>
            <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>These usernames cannot see or join this group buy.</p>
            {blockedAccounts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {blockedAccounts.map(u => (
                  <span key={u} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border"
                    style={{ background: "rgba(220,38,38,0.07)", color: "#DC2626", borderColor: "rgba(220,38,38,0.2)" }}>
                    @{u}
                    <button type="button" className="hover:opacity-60 ml-0.5" onClick={() => setBlockedAccounts(prev => prev.filter(x => x !== u))}>×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={blockedInput}
                onChange={e => setBlockedInput(e.target.value)}
                placeholder="Add username (without @)"
                className={`flex-1 rounded-xl border px-3 py-2 text-sm`}
                style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    const val = blockedInput.trim().replace(/^@/, "");
                    if (val && !blockedAccounts.includes(val)) setBlockedAccounts(prev => [...prev, val]);
                    setBlockedInput("");
                  }
                }}
              />
              <button type="button"
                className="px-3 py-2 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(220,38,38,0.07)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.2)" }}
                onClick={() => {
                  const val = blockedInput.trim().replace(/^@/, "");
                  if (val && !blockedAccounts.includes(val)) setBlockedAccounts(prev => [...prev, val]);
                  setBlockedInput("");
                }}>
                Block
              </button>
            </div>
            <p className="text-[10px]" style={{ color: "var(--t-subtle)" }}>Press Enter or click Block to add a username.</p>
          </SectionCard>
        </>
      )}

      {/* Save / Cancel / Archive — always shown */}
      <div className="flex gap-3">
        {!isNew && onDelete && (
          <button type="button" onClick={handleDelete} disabled={deleting} className="h-12 px-4 rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50" style={{ background: "rgba(220,38,38,0.07)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.2)" }}>
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Archive
          </button>
        )}
        <button type="button" onClick={onBack} className="h-12 px-4 rounded-xl font-semibold text-sm" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>
          Cancel
        </button>
        <div className="flex-1">
          <SaveBtn saving={saving} label={isNew ? "Create Group Buy" : "Save Changes"} />
        </div>
      </div>
    </form>
  );
}

// ─── Products Tab ─────────────────────────────────────────────────────────────

type ImportRowStatus = "new" | "duplicate" | "price-changed";
type ImportRow = { name: string; price: number; category: string; mgSize: string; stock: string; status: ImportRowStatus; existingPrice?: number; skip: boolean };

const normalizeSize = (raw: string | undefined): string => {
  if (!raw) return "";
  const m = raw.match(/(\d+(?:\.\d+)?)\s*(mcg|mg|g|iu)/i);
  return m ? `${m[1]}${m[2].toLowerCase()}` : "";
};

const matchKey = (name: string, mgSize: string) =>
  `${name.trim().toLowerCase()}|${(mgSize || "").trim().toLowerCase()}`;

function ProductsTab({ gb }: { gb: OrganiserGB }) {
  const [products, setProducts] = useState<OrgProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowedVendors, setAllowedVendors] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<OrgProduct | null>(null);
  const [togglingHalfKit, setTogglingHalfKit] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<"none" | "csv" | "ai">("none");
  const [aiRows, setAiRows] = useState<ImportRow[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiConfirm, setAiConfirm] = useState(false);
  const [aiVendor, setAiVendor] = useState(gb.manufacturer ?? "");
  const [csvRaw, setCsvRaw] = useState<string[][]>([]);
  const [csvMap, setCsvMap] = useState<{ name: number; price: number; category: number; mgSize: number; stock: number }>({ name: -1, price: -1, category: -1, mgSize: -1, stock: -1 });
  const [csvConfirm, setCsvConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, meRes] = await Promise.all([
        fetch(`/api/organiser/group-buys/${gb.id}/products`, { credentials: "include" }),
        fetch(`/api/organiser/me`, { credentials: "include" }),
      ]);
      if (prodRes.ok) setProducts(await prodRes.json());
      if (meRes.ok) {
        const me = await meRes.json();
        setAllowedVendors(me.organiserAllowedVendors ?? null);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [gb.id]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (productId: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      const res = await fetch(`/api/organiser/products/${productId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? `Failed to delete product (${res.status})`);
        return;
      }
      setProducts(p => p.filter(x => x.id !== productId));
    } catch {
      setError("Network error — product was not deleted");
    }
  };

  const handleHalfKitToggle = async (productId: string, current: boolean) => {
    setTogglingHalfKit(productId);
    try {
      const res = await fetch(`/api/organiser/products/${productId}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ halfKitEnabled: !current }),
      });
      if (res.ok) {
        setProducts(p => p.map(x => x.id === productId ? { ...x, halfKitEnabled: !current } : x));
      }
    } catch { /* ignore */ } finally { setTogglingHalfKit(null); }
  };

  const handleFileAI = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiLoading(true); setError("");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const b64 = (reader.result as string).split(",")[1];
        const res = await fetch(`/api/organiser/group-buys/${gb.id}/import-image`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileBase64: b64, mimeType: file.type }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "AI extraction failed"); return; }
        const existingMap = new Map(products.map(p => [matchKey(p.name, p.mgSize ?? ""), p]));
        const rows: ImportRow[] = (data.products ?? []).map((p: { name: string; price: number; category?: string; mgSize?: string }) => {
          const normalizedMgSize = normalizeSize(p.mgSize);
          const key = matchKey(p.name, normalizedMgSize);
          const existing = existingMap.get(key);
          let status: ImportRowStatus = "new";
          let existingPrice: number | undefined;
          if (existing) {
            if (Math.abs(existing.price - p.price) < 0.005) {
              status = "duplicate";
            } else {
              status = "price-changed";
              existingPrice = existing.price;
            }
          }
          return { name: p.name, price: p.price, category: p.category ?? "", mgSize: normalizedMgSize, stock: "", status, existingPrice, skip: status === "duplicate" };
        });
        setAiRows(rows);
        setAiConfirm(true);
      } catch { setError("Failed to process file"); }
      finally { setAiLoading(false); if (fileRef.current) fileRef.current.value = ""; }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmAIImport = async () => {
    const importable = aiRows.filter(r => !r.skip && r.name.trim() && !isNaN(r.price));
    if (!importable.length) return;
    setLoading(true); setError("");
    const res = await fetch(`/api/organiser/group-buys/${gb.id}/import-csv`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendor: aiVendor.trim() || undefined, rows: importable.map(r => ({ name: r.name, price: r.price, category: r.category || null, mgSize: r.mgSize || null, stock: r.stock ? parseInt(r.stock) : null })) }),
    });
    if (res.ok) { setAiRows([]); setAiConfirm(false); setImportMode("none"); await load(); }
    else { const d = await res.json(); setError(d.error || "Import failed"); setLoading(false); }
  };

  const parseCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const lines = text.trim().split(/\r?\n/);
      const rows = lines.map(l => l.split(/[,\t]/).map(c => c.trim().replace(/^"|"$/g, "")));
      if (rows.length < 2) { setError("CSV file appears empty"); return; }
      setCsvRaw(rows);
      const header = rows[0].map(h => h.toLowerCase());
      const findIdx = (...terms: string[]) => header.findIndex(h => terms.some(t => h.includes(t)));
      setCsvMap({
        name: findIdx("name", "product", "item", "peptide"),
        price: findIdx("price", "cost", "amount"),
        category: findIdx("cat", "type", "class"),
        mgSize: findIdx("mg", "size", "dose", "dosage"),
        stock: findIdx("stock", "qty", "quantity", "inventory"),
      });
      setCsvConfirm(true);
      if (csvRef.current) csvRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const handleConfirmCsvImport = async () => {
    const dataRows = csvRaw.slice(1);
    const rows = dataRows
      .filter(r => csvMap.name >= 0 && r[csvMap.name]?.trim())
      .map(r => ({
        name: r[csvMap.name] ?? "",
        price: csvMap.price >= 0 ? parseFloat(r[csvMap.price]) || 0 : 0,
        category: csvMap.category >= 0 ? r[csvMap.category] || null : null,
        mgSize: csvMap.mgSize >= 0 ? r[csvMap.mgSize] || null : null,
        stock: csvMap.stock >= 0 && r[csvMap.stock] ? parseInt(r[csvMap.stock]) : null,
      }));
    if (!rows.length) { setError("No valid rows to import"); return; }
    setLoading(true); setError("");
    const res = await fetch(`/api/organiser/group-buys/${gb.id}/import-csv`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    if (res.ok) { setCsvRaw([]); setCsvConfirm(false); setImportMode("none"); await load(); }
    else { const d = await res.json(); setError(d.error || "Import failed"); setLoading(false); }
  };

  const csvHeaders = csvRaw[0] ?? [];
  const csvPreviewRows = csvRaw.slice(1, 6);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-blue)" }} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold" style={{ color: "var(--t-text)" }}>Products — {gb.name}</h2>
        <div className="flex gap-2">
          <button onClick={() => { setImportMode(m => m === "csv" ? "none" : "csv"); setAiConfirm(false); setCsvConfirm(false); }} className="h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>
            <Upload className="w-3.5 h-3.5" /> CSV
          </button>
          <button onClick={() => { setImportMode(m => m === "ai" ? "none" : "ai"); setAiConfirm(false); setCsvConfirm(false); }} className="h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>
            <Sparkles className="w-3.5 h-3.5" /> AI
          </button>
          <button onClick={() => { setShowAdd(true); setEditTarget(null); }} className="h-9 px-3 rounded-xl text-xs font-bold text-white flex items-center gap-1.5" style={{ background: "var(--t-blue-deep)" }}>
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>

      {error && <ErrorBanner msg={error} onClose={() => setError("")} />}

      {/* CSV Import */}
      <AnimatePresence>
        {importMode === "csv" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <SectionCard>
              <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>CSV Import</p>
              {!csvConfirm ? (
                <>
                  <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>Upload a CSV or TSV. First row must be headers (name, price, category, stock).</p>
                  <input ref={csvRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={parseCsvFile} />
                  <button onClick={() => csvRef.current?.click()} className="w-full h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2" style={{ background: "var(--t-surface2)", border: "1.5px dashed var(--t-border)", color: "var(--t-muted)" }}>
                    <Upload className="w-4 h-4" /> Upload CSV / TSV
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-bold" style={{ color: "var(--t-text)" }}>Map Columns ({csvRaw.length - 1} rows detected)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["name", "price", "mgSize", "category", "stock"] as const).map(k => (
                      <Field key={k} label={k === "mgSize" ? "Size / mg" : k.charAt(0).toUpperCase() + k.slice(1) + (k === "name" || k === "price" ? " *" : "")}>
                        <select value={csvMap[k]} onChange={e => setCsvMap(m => ({ ...m, [k]: parseInt(e.target.value) }))} className={`${inputCls} appearance-none text-xs`} style={inputStyle}>
                          <option value={-1}>— skip —</option>
                          {csvHeaders.map((h, i) => <option key={i} value={i}>{h || `Col ${i + 1}`}</option>)}
                        </select>
                      </Field>
                    ))}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead><tr>{["Name", "Price", "Size/mg", "Category", "Stock"].map(h => <th key={h} className="text-left px-2 py-1 font-bold" style={{ color: "var(--t-subtle)" }}>{h}</th>)}</tr></thead>
                      <tbody>
                        {csvPreviewRows.map((row, i) => (
                          <tr key={i} style={{ borderTop: "1px solid var(--t-border)" }}>
                            {(["name", "price", "mgSize", "category", "stock"] as const).map(k => (
                              <td key={k} className="px-2 py-1 truncate max-w-[80px]" style={{ color: "var(--t-text)" }}>{csvMap[k] >= 0 ? (row[csvMap[k]] ?? "—") : "—"}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-[10px] mt-1" style={{ color: "var(--t-subtle)" }}>Showing first {Math.min(5, csvRaw.length - 1)} of {csvRaw.length - 1} rows</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setCsvRaw([]); setCsvConfirm(false); }} className="h-10 px-4 rounded-xl text-xs font-bold" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>Reset</button>
                    <button onClick={handleConfirmCsvImport} disabled={csvMap.name < 0 || csvMap.price < 0} className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-50" style={{ background: "var(--t-blue-deep)" }}>
                      Import {csvRaw.length - 1} rows
                    </button>
                  </div>
                </div>
              )}
            </SectionCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Image Import */}
      <AnimatePresence>
        {importMode === "ai" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <SectionCard>
              <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>AI Product Import</p>
              {!aiConfirm ? (
                <>
                  <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>Upload a price list PDF or image. AI will extract product names and prices for you to review before importing.</p>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--t-subtle)" }}>Vendor / Manufacturer <span style={{ color: "#DC2626" }}>*</span></label>
                    <input
                      value={aiVendor}
                      onChange={e => setAiVendor(e.target.value)}
                      placeholder="e.g. Peptide Sciences"
                      className={`${inputCls} text-xs`}
                      style={inputStyle}
                    />
                  </div>
                  <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileAI} />
                  <button onClick={() => fileRef.current?.click()} disabled={aiLoading || !aiVendor.trim()} className="w-full h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: "var(--t-surface2)", border: "1.5px dashed var(--t-border)", color: "var(--t-muted)" }}>
                    {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Extracting…</> : <><Sparkles className="w-4 h-4" /> Upload PDF or Image</>}
                  </button>
                  {!aiVendor.trim() && <p className="text-[10px]" style={{ color: "#DC2626" }}>Enter a vendor before uploading</p>}
                </>
              ) : (
                <div className="space-y-3">
                  {/* Summary counts */}
                  {(() => {
                    const newCount = aiRows.filter(r => r.status === "new").length;
                    const dupCount = aiRows.filter(r => r.status === "duplicate").length;
                    const changedCount = aiRows.filter(r => r.status === "price-changed").length;
                    const importCount = aiRows.filter(r => !r.skip).length;
                    return (
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold" style={{ color: "var(--t-text)" }}>Review & Edit — {aiRows.length} products extracted</p>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.1)", color: "#059669" }}>{newCount} new</span>
                          {dupCount > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(100,116,139,0.1)", color: "#64748B" }}>{dupCount} duplicate{dupCount !== 1 ? "s" : ""} (skipped)</span>}
                          {changedCount > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(234,88,12,0.1)", color: "#EA580C" }}>{changedCount} price change{changedCount !== 1 ? "s" : ""}</span>}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(45,107,204,0.1)", color: "var(--t-blue)" }}>{importCount} will import</span>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="max-h-80 overflow-y-auto space-y-1.5">
                    <div className="grid gap-x-2 text-[10px] font-bold px-1" style={{ gridTemplateColumns: "20px 1fr 64px 56px 56px 24px 28px", color: "var(--t-subtle)" }}>
                      <span title="Include in import">✓</span><span>Name</span><span>Price</span><span>Size</span><span>Category</span><span /><span />
                    </div>
                    {aiRows.map((row, i) => {
                      const isDup = row.status === "duplicate";
                      const isChanged = row.status === "price-changed";
                      const rowBg = isDup
                        ? "rgba(100,116,139,0.05)"
                        : isChanged
                        ? "rgba(234,88,12,0.04)"
                        : "transparent";
                      const rowBorder = isDup
                        ? "1px solid rgba(100,116,139,0.15)"
                        : isChanged
                        ? "1px solid rgba(234,88,12,0.2)"
                        : "1px solid transparent";
                      return (
                        <div key={i} className="grid gap-x-2 items-center rounded-lg px-1 py-0.5" style={{ gridTemplateColumns: "20px 1fr 64px 56px 56px 24px 28px", background: rowBg, border: rowBorder, opacity: row.skip ? 0.5 : 1 }}>
                          {/* Skip toggle */}
                          <button
                            type="button"
                            title={row.skip ? "Click to include" : "Click to skip"}
                            onClick={() => { const next = [...aiRows]; next[i] = { ...next[i], skip: !next[i].skip }; setAiRows(next); }}
                            className="w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{
                              background: row.skip ? "rgba(100,116,139,0.15)" : "rgba(16,185,129,0.15)",
                              border: `1px solid ${row.skip ? "rgba(100,116,139,0.3)" : "rgba(16,185,129,0.4)"}`,
                              color: row.skip ? "#94A3B8" : "#059669",
                            }}
                          >
                            {row.skip ? "–" : "✓"}
                          </button>
                          {/* Name + badge */}
                          <div className="min-w-0">
                            <input
                              value={row.name}
                              onChange={e => { const next = [...aiRows]; next[i] = { ...next[i], name: e.target.value }; setAiRows(next); }}
                              placeholder="Product name"
                              disabled={row.skip}
                              className={`${inputCls} text-xs h-8 py-0 w-full`}
                              style={{ ...inputStyle, opacity: row.skip ? 0.6 : 1 }}
                            />
                            {isDup && !row.skip && (
                              <span className="text-[9px] font-bold" style={{ color: "#64748B" }}>Duplicate — already in list</span>
                            )}
                            {isChanged && (
                              <span className="text-[9px] font-bold" style={{ color: "#EA580C" }}>
                                Price changed: was {gb.currency} {row.existingPrice?.toFixed(2)}
                              </span>
                            )}
                          </div>
                          {/* Price */}
                          <input
                            type="number"
                            value={row.price}
                            min="0"
                            step="0.01"
                            onChange={e => { const next = [...aiRows]; next[i] = { ...next[i], price: parseFloat(e.target.value) || 0 }; setAiRows(next); }}
                            placeholder="0.00"
                            disabled={row.skip}
                            className={`${inputCls} text-xs h-8 py-0`}
                            style={{ ...inputStyle, opacity: row.skip ? 0.6 : 1, borderColor: isChanged && !row.skip ? "rgba(234,88,12,0.5)" : undefined }}
                          />
                          {/* mgSize */}
                          <input
                            value={row.mgSize}
                            onChange={e => { const next = [...aiRows]; next[i] = { ...next[i], mgSize: e.target.value }; setAiRows(next); }}
                            placeholder="5mg"
                            disabled={row.skip}
                            className={`${inputCls} text-xs h-8 py-0`}
                            style={{ ...inputStyle, opacity: row.skip ? 0.6 : 1 }}
                          />
                          {/* Category */}
                          <input
                            value={row.category}
                            onChange={e => { const next = [...aiRows]; next[i] = { ...next[i], category: e.target.value }; setAiRows(next); }}
                            placeholder="Cat."
                            disabled={row.skip}
                            className={`${inputCls} text-xs h-8 py-0`}
                            style={{ ...inputStyle, opacity: row.skip ? 0.6 : 1 }}
                          />
                          {/* Status icon */}
                          <div className="flex items-center justify-center">
                            {isDup && <span title="Duplicate" style={{ fontSize: 10, color: "#94A3B8" }}>≡</span>}
                            {isChanged && !row.skip && <span title="Price changed" style={{ fontSize: 10, color: "#EA580C" }}>↕</span>}
                          </div>
                          {/* Delete */}
                          <button
                            onClick={() => setAiRows(r => r.filter((_, j) => j !== i))}
                            className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                            style={{ background: "rgba(220,38,38,0.07)" }}
                          >
                            <X className="w-3 h-3" style={{ color: "#DC2626" }} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setAiRows([]); setAiConfirm(false); setAiVendor(gb.manufacturer ?? ""); }} className="h-10 px-4 rounded-xl text-xs font-bold" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>Cancel</button>
                    <button
                      onClick={handleConfirmAIImport}
                      disabled={!aiRows.filter(r => !r.skip).length}
                      className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                      style={{ background: "var(--t-blue-deep)" }}
                    >
                      Import {aiRows.filter(r => !r.skip).length} products
                    </button>
                  </div>
                </div>
              )}
            </SectionCard>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(showAdd || editTarget) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <ProductForm product={editTarget} gbId={gb.id} currency={gb.currency} existingVendors={[...new Set([gb.manufacturer, ...products.map(p => p.vendor)].filter((v): v is string => !!v))]} allowedVendors={allowedVendors} onSaved={async () => { setShowAdd(false); setEditTarget(null); await load(); }} onCancel={() => { setShowAdd(false); setEditTarget(null); }} />
          </motion.div>
        )}
      </AnimatePresence>

      {products.length === 0 && !showAdd && (
        <div className="flex flex-col items-center py-12 space-y-2">
          <Package className="w-8 h-8" style={{ color: "var(--t-border)" }} />
          <p className="text-sm" style={{ color: "var(--t-subtle)" }}>No products yet</p>
        </div>
      )}

      <div className="space-y-2">
        {products.map(p => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "var(--t-text)" }}>{p.name}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {p.mgSize && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.08)", color: "#059669" }}>{p.mgSize}</span>}
                {p.category && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--t-blue-10)", color: "var(--t-blue)" }}>{p.category}</span>}
                {p.stock != null && <span className="text-[10px]" style={{ color: "var(--t-subtle)" }}>Stock: {p.stock}</span>}
              </div>
            </div>
            <span className="text-sm font-bold tabular-nums" style={{ color: "var(--t-text)" }}>{gb.currency} {p.price.toFixed(2)}</span>
            <button
              onClick={() => handleHalfKitToggle(p.id, p.halfKitEnabled)}
              disabled={togglingHalfKit === p.id}
              title={p.halfKitEnabled ? "Half kits enabled — click to disable" : "Half kits disabled — click to enable"}
              className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[10px] font-bold shrink-0 transition-all"
              style={{
                background: p.halfKitEnabled ? "rgba(34,197,94,0.1)" : "rgba(148,163,184,0.12)",
                border: `1px solid ${p.halfKitEnabled ? "rgba(34,197,94,0.3)" : "rgba(148,163,184,0.25)"}`,
                color: p.halfKitEnabled ? "#16A34A" : "#94A3B8",
              }}
            >
              {togglingHalfKit === p.id
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : p.halfKitEnabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
              ½ Kit
            </button>
            <div className="flex gap-1.5">
              <button onClick={() => { setEditTarget(p); setShowAdd(false); }} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--t-surface2)" }}>
                <Pencil className="w-3.5 h-3.5" style={{ color: "var(--t-muted)" }} />
              </button>
              <button onClick={() => handleDelete(p.id)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(220,38,38,0.07)" }}>
                <Trash2 className="w-3.5 h-3.5" style={{ color: "#DC2626" }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductForm({ product, gbId, currency, existingVendors, allowedVendors, onSaved, onCancel }: {
  product: OrgProduct | null; gbId: string; currency: string;
  existingVendors: string[];
  allowedVendors?: string[] | null;
  onSaved: () => void; onCancel: () => void;
}) {
  const isVendorRestricted = allowedVendors !== null && allowedVendors !== undefined;
  const defaultVendor = product?.vendor ?? (isVendorRestricted && allowedVendors!.length === 1 ? allowedVendors![0] : "");
  const [form, setForm] = useState({ name: product?.name ?? "", price: product?.price?.toString() ?? "", category: product?.category ?? "", mgSize: product?.mgSize ?? "", stock: product?.stock?.toString() ?? "", vendor: defaultVendor });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);
  const filteredVendors = existingVendors.filter(v => v.toLowerCase().includes(form.vendor.toLowerCase()) && v.toLowerCase() !== form.vendor.toLowerCase());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (!form.vendor.trim()) { setError("Vendor / Manufacturer is required"); return; }
    const p = parseFloat(form.price);
    if (isNaN(p) || p < 0) { setError("Valid price required"); return; }
    setSaving(true); setError("");
    try {
      const body = { name: form.name.trim(), price: p, category: form.category.trim() || null, mgSize: form.mgSize.trim() || null, stock: form.stock ? parseInt(form.stock) : null, vendor: form.vendor.trim() || null };
      if (product?.id) {
        const res = await fetch(`/api/organiser/products/${product.id}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) { const d = await res.json(); setError(d.error || "Failed"); return; }
      } else {
        const res = await fetch(`/api/organiser/group-buys/${gbId}/products`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) { const d = await res.json(); setError(d.error || "Failed"); return; }
      }
      onSaved();
    } catch { setError("Connection error"); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <SectionCard>
        <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{product ? "Edit Product" : "New Product"}</p>
        {error && <ErrorBanner msg={error} />}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Field label="Name *"><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. BPC-157 5mg" className={inputCls} style={inputStyle} /></Field></div>
          <Field label={`Price (${currency}) *`}><input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" min="0" step="0.01" className={inputCls} style={inputStyle} /></Field>
          <Field label="Size / mg" hint="e.g. 5mg, 10mg"><input value={form.mgSize} onChange={e => setForm(f => ({ ...f, mgSize: e.target.value }))} placeholder="5mg" className={inputCls} style={inputStyle} /></Field>
          <Field label="Category"><input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="peptide / aas" className={inputCls} style={inputStyle} /></Field>
          <Field label="Stock"><input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="—" min="0" className={inputCls} style={inputStyle} /></Field>
          <div className="col-span-2">
            {isVendorRestricted ? (
              <Field label="Vendor / Manufacturer *" hint={allowedVendors!.length === 0 ? "No vendors are permitted — contact admin" : "Restricted to your approved vendor list"}>
                <select
                  value={form.vendor}
                  onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
                  className={inputCls}
                  style={inputStyle}
                  required
                  disabled={allowedVendors!.length === 0}
                >
                  {allowedVendors!.length > 1 && <option value="">— Select vendor —</option>}
                  {allowedVendors!.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
            ) : (
              <Field label="Vendor / Manufacturer *" hint="Select an existing vendor or type a new one">
                <div className="relative">
                  <input
                    value={form.vendor}
                    onChange={e => { setForm(f => ({ ...f, vendor: e.target.value })); setShowVendorSuggestions(true); }}
                    onFocus={() => setShowVendorSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowVendorSuggestions(false), 150)}
                    placeholder="e.g. QSC, Amino Asylum"
                    className={inputCls}
                    style={inputStyle}
                    required
                  />
                  {showVendorSuggestions && filteredVendors.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-xl overflow-hidden shadow-lg max-h-40 overflow-y-auto" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                      {filteredVendors.map(v => (
                        <button key={v} type="button" onMouseDown={e => { e.preventDefault(); setForm(f => ({ ...f, vendor: v })); setShowVendorSuggestions(false); }} className="w-full text-left px-3 py-2 text-xs font-medium" style={{ color: "var(--t-text)" }}>
                          {v}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="h-10 px-4 rounded-xl text-xs font-bold" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>Cancel</button>
          <SaveBtn saving={saving} label={product ? "Update" : "Add Product"} />
        </div>
      </SectionCard>
    </form>
  );
}

// ─── Shipping & Payments Tab ──────────────────────────────────────────────────

const CRYPTO_CURRENCIES = ["USDT", "USDC", "BTC", "ETH", "BNB", "SOL", "TRX", "XRP", "DOGE", "LTC"] as const;
const CRYPTO_NETWORKS: Record<string, string[]> = {
  USDT: ["TRC-20 (Tron)", "ERC-20 (Ethereum)", "BEP-20 (BSC)", "SOL (Solana)", "Polygon"],
  USDC: ["ERC-20 (Ethereum)", "SOL (Solana)", "BEP-20 (BSC)", "Polygon"],
  BTC: ["Bitcoin (BTC)"],
  ETH: ["ERC-20 (Ethereum)"],
  BNB: ["BEP-20 (BSC)"],
  SOL: ["SOL (Solana)"],
  TRX: ["TRC-20 (Tron)"],
  XRP: ["XRP Ledger"],
  DOGE: ["Dogecoin"],
  LTC: ["Litecoin"],
};

const SHIP_SPLIT_STATUSES = ["Draft", "Submitted", "Processing", "Shipped", "Completed", "Cancelled"];

const TROCADOR_COINS = [
  { label: "Monero (XMR)",    ticker: "xmr",  network: "Mainnet" },
  { label: "Bitcoin (BTC)",   ticker: "btc",  network: "Mainnet" },
  { label: "Ethereum (ETH)",  ticker: "eth",  network: "ERC20"   },
  { label: "USDT — ERC-20",   ticker: "usdt", network: "ERC20"   },
  { label: "USDT — TRC-20",   ticker: "usdt", network: "TRC20"   },
  { label: "USDT — BEP-20",   ticker: "usdt", network: "BEP20"   },
  { label: "USDC — ERC-20",   ticker: "usdc", network: "ERC20"   },
  { label: "USDC — BEP-20",   ticker: "usdc", network: "BEP20"   },
  { label: "BNB — BEP-20",    ticker: "bnb",  network: "BEP20"   },
  { label: "Litecoin (LTC)",  ticker: "ltc",  network: "Mainnet" },
  { label: "Dogecoin (DOGE)", ticker: "doge", network: "Mainnet" },
  { label: "Dash (DASH)",     ticker: "dash", network: "Mainnet" },
  { label: "Zcash (ZEC)",     ticker: "zec",  network: "Mainnet" },
] as const;

function ShippingPayTab({ gb, onUpdated }: { gb: OrganiserGB; onUpdated: (gb: OrganiserGB) => void }) {
  const [shippingOptions, setShippingOptions] = useState<{ id: string; label: string; description: string; priceStr: string }[]>(
    (gb.shippingOptions ?? []).map((o: { id: string; label: string; price: number; description?: string }) => ({ ...o, description: o.description ?? "", priceStr: String(o.price ?? 0) }))
  );
  const [payments, setPayments] = useState({
    cryptoCurrency: gb.organiserPayments?.cryptoCurrency ?? "USDT",
    cryptoNetwork: gb.organiserPayments?.cryptoNetwork ?? "",
    cryptoWalletAddress: gb.organiserPayments?.cryptoWalletAddress ?? gb.organiserPayments?.usdtWallet ?? "",
    revolutHandle: gb.organiserPayments?.revolutHandle ?? "",
    paypalHandle: gb.organiserPayments?.paypalHandle ?? "",
    anonPayEnabled: gb.organiserPayments?.anonPayEnabled ?? false,
    anonPayWallet: gb.organiserPayments?.anonPayWallet ?? "",
    anonPayTicker: gb.organiserPayments?.anonPayTicker ?? "usdt",
    anonPayNetwork: gb.organiserPayments?.anonPayNetwork ?? "ERC20",
  });
  const [savingShip, setSavingShip] = useState(false);
  const [savingPay, setSavingPay] = useState(false);
  const [error, setError] = useState("");
  const [okShip, setOkShip] = useState(false);
  const [okPay, setOkPay] = useState(false);

  const [vendorShipCost, setVendorShipCost] = useState(gb.vendorShippingAmount != null ? String(gb.vendorShippingAmount) : "");
  const [vendorShipKits, setVendorShipKits] = useState(gb.vendorShippingKits != null ? String(gb.vendorShippingKits) : "");
  const [savingVendorShip, setSavingVendorShip] = useState(false);
  const [okVendorShip, setOkVendorShip] = useState(false);
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitTotal, setSplitTotal] = useState("");
  const [splitEqualPct, setSplitEqualPct] = useState(80);
  const [splitWeightedPct, setSplitWeightedPct] = useState(20);
  const [splitStatus, setSplitStatus] = useState("Submitted");
  const [splitPaymentFilter, setSplitPaymentFilter] = useState("all");
  const [splitApplying, setSplitApplying] = useState(false);
  const [splitResult, setSplitResult] = useState<{
    message: string;
    updatedCount: number;
    breakdown: { orderId: string; username: string; vendorShipping: number; newGrandTotal: number }[];
  } | null>(null);
  const [splitError, setSplitError] = useState("");

  const syncSplitSlider = (field: "equal" | "weighted", val: number) => {
    const c = Math.max(0, Math.min(100, val));
    if (field === "equal") { setSplitEqualPct(c); setSplitWeightedPct(100 - c); }
    else { setSplitWeightedPct(c); setSplitEqualPct(100 - c); }
  };

  const saveVendorShipping = async () => {
    setSavingVendorShip(true); setError("");
    try {
      const res = await fetch(`/api/organiser/group-buys/${gb.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorShippingAmount: vendorShipCost.trim() ? parseFloat(vendorShipCost) : null,
          vendorShippingKits: vendorShipKits.trim() ? parseInt(vendorShipKits) : null,
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Failed to save vendor shipping"); return; }
      onUpdated(await res.json());
      setOkVendorShip(true);
      setTimeout(() => setOkVendorShip(false), 2000);
    } catch { setError("Connection error"); } finally { setSavingVendorShip(false); }
  };

  const applyShippingSplit = async () => {
    if (Math.abs(splitEqualPct + splitWeightedPct - 100) > 0.5) { setSplitError("Equal % + Weighted % must sum to 100"); return; }
    const amt = parseFloat(splitTotal);
    if (isNaN(amt) || amt < 0) { setSplitError("Enter a valid shipping amount"); return; }
    setSplitError(""); setSplitApplying(true); setSplitResult(null);
    try {
      const res = await fetch(`/api/organiser/group-buys/${gb.id}/apply-shipping`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalShipping: amt, equalPct: splitEqualPct, weightedPct: splitWeightedPct, statusFilter: splitStatus, paymentStatusFilter: splitPaymentFilter }),
      });
      const data = await res.json();
      if (!res.ok) setSplitError(data.error || "Failed to apply shipping split");
      else setSplitResult(data);
    } catch { setSplitError("Connection error"); }
    setSplitApplying(false);
  };

  const addShipping = () => setShippingOptions(s => [...s, { id: `ship-${Date.now()}`, label: "", description: "", priceStr: "0" }]);
  const removeShipping = (idx: number) => setShippingOptions(s => s.filter((_, i) => i !== idx));
  const updateShipping = (idx: number, k: "label" | "description" | "priceStr", v: string) => {
    setShippingOptions(s => s.map((o, i) => i === idx ? { ...o, [k]: v } : o));
  };

  const saveShipping = async () => {
    setSavingShip(true); setError("");
    try {
      const payload = shippingOptions.map(({ priceStr, ...o }) => ({ ...o, price: parseFloat(priceStr) || 0 }));
      const res = await fetch(`/api/organiser/group-buys/${gb.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shippingOptions: payload }) });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Failed"); return; }
      onUpdated(await res.json()); setOkShip(true); setTimeout(() => setOkShip(false), 2000);
    } catch { setError("Connection error"); } finally { setSavingShip(false); }
  };

  const savePayments = async () => {
    setSavingPay(true); setError("");
    try {
      const res = await fetch(`/api/organiser/group-buys/${gb.id}/payments`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cryptoCurrency: payments.cryptoCurrency.trim() || null,
          cryptoNetwork: payments.cryptoNetwork.trim() || null,
          cryptoWalletAddress: payments.cryptoWalletAddress.trim() || null,
          revolutHandle: payments.revolutHandle.trim() || null,
          paypalHandle: payments.paypalHandle.trim() || null,
          anonPayEnabled: payments.anonPayEnabled,
          anonPayWallet: payments.anonPayWallet.trim() || null,
          anonPayTicker: payments.anonPayTicker.trim() || null,
          anonPayNetwork: payments.anonPayNetwork.trim() || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Failed"); return; }
      setOkPay(true); setTimeout(() => setOkPay(false), 2000);
    } catch { setError("Connection error"); } finally { setSavingPay(false); }
  };

  const availableNetworks = CRYPTO_NETWORKS[payments.cryptoCurrency] ?? [];

  return (
    <div className="space-y-5">
      <h2 className="text-base font-bold" style={{ color: "var(--t-text)" }}>Shipping & Payments — {gb.name}</h2>
      {error && <ErrorBanner msg={error} onClose={() => setError("")} />}
      <SectionCard>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Add Shipping Courier</p>
          <button onClick={addShipping} className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1" style={{ background: "var(--t-blue-10)", color: "var(--t-blue-deep)" }}><Plus className="w-3 h-3" /> Add</button>
        </div>
        {shippingOptions.length === 0 && <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>No shipping options — orders will use global delivery methods.</p>}
        {shippingOptions.map((o, i) => (
          <div key={o.id} className="p-3 rounded-xl space-y-2" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
            <div className="flex gap-2 items-center">
              <input value={o.label} onChange={e => updateShipping(i, "label", e.target.value)} placeholder="Label (e.g. Standard UK)" className="flex-1 min-w-0 px-3 rounded-xl text-xs h-9 font-semibold focus:outline-none" style={inputStyle} />
              <input value={o.priceStr} onChange={e => updateShipping(i, "priceStr", e.target.value)} placeholder="0.00" inputMode="decimal" className="w-24 shrink-0 px-3 rounded-xl text-xs h-9 focus:outline-none" style={inputStyle} />
              <button onClick={() => removeShipping(i)} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(220,38,38,0.07)" }}><X className="w-3.5 h-3.5" style={{ color: "#DC2626" }} /></button>
            </div>
            <input
              value={o.description}
              onChange={e => updateShipping(i, "description", e.target.value)}
              placeholder="Description (optional) — shown to members at checkout"
              className={`${inputCls} text-xs`}
              style={inputStyle}
            />
          </div>
        ))}
        <button onClick={saveShipping} disabled={savingShip} className="h-10 px-5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5" style={{ background: okShip ? "#16A34A" : "var(--t-blue-deep)" }}>
          {savingShip ? <Loader2 className="w-4 h-4 animate-spin" /> : okShip ? <CheckCircle2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {savingShip ? "Saving…" : okShip ? "Saved!" : "Save Shipping"}
        </button>
      </SectionCard>

      <SectionCard>
        <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1" style={{ color: "var(--t-blue-deep)" }}>
          <Truck className="w-3.5 h-3.5" /> Vendor Shipping
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Shipping Cost" icon={DollarSign}>
            <input
              type="number" min="0" step="0.01"
              placeholder="e.g. 120.00"
              value={vendorShipCost}
              onChange={e => setVendorShipCost(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </Field>
          <Field label="Packages / Kits">
            <input
              type="number" min="0" step="1"
              placeholder="e.g. 20"
              value={vendorShipKits}
              onChange={e => setVendorShipKits(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </Field>
        </div>
        <button onClick={saveVendorShipping} disabled={savingVendorShip} className="h-10 px-5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5" style={{ background: okVendorShip ? "#16A34A" : "var(--t-blue-deep)" }}>
          {savingVendorShip ? <Loader2 className="w-4 h-4 animate-spin" /> : okVendorShip ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {savingVendorShip ? "Saving…" : okVendorShip ? "Saved!" : "Save Shipping"}
        </button>
      </SectionCard>

      <SectionCard>
        <ToggleRow
          label="Shipping Split"
          hint="Split vendor shipping cost across orders in this group buy"
          value={splitEnabled}
          onChange={v => { setSplitEnabled(v); setSplitResult(null); setSplitError(""); }}
        />
        {splitEnabled && (
          <div className="space-y-4 mt-1">
            <div className="space-y-1">
              <p className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>Total Vendor Shipping Cost</p>
              <input
                type="number" min="0" step="0.01"
                placeholder="e.g. 150.00"
                value={splitTotal}
                onChange={e => setSplitTotal(e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </div>

            <div className="space-y-3">
              {([
                { field: "equal" as const, label: "Equal portion", sub: "Same amount per order", val: splitEqualPct },
                { field: "weighted" as const, label: "Quantity-weighted", sub: "More items = more shipping", val: splitWeightedPct },
              ] as const).map(({ field, label, sub, val }) => (
                <div key={field}>
                  <div className="flex justify-between items-center mb-1">
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>{label}</p>
                      <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>{sub}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" min="0" max="100"
                        className="w-16 text-center text-xs h-8 px-2 rounded-xl focus:outline-none"
                        style={inputStyle}
                        value={val}
                        onChange={e => syncSplitSlider(field, parseFloat(e.target.value) || 0)}
                      />
                      <span className="text-xs" style={{ color: "var(--t-subtle)" }}>%</span>
                    </div>
                  </div>
                  <input
                    type="range" min="0" max="100" value={val}
                    onChange={e => syncSplitSlider(field, parseInt(e.target.value))}
                    className="w-full accent-[var(--t-blue-deep)]"
                  />
                </div>
              ))}
              <div className="text-[11px] font-semibold px-3 py-2 rounded-xl"
                style={{
                  background: Math.abs(splitEqualPct + splitWeightedPct - 100) < 0.5 ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
                  color: Math.abs(splitEqualPct + splitWeightedPct - 100) < 0.5 ? "#16A34A" : "#DC2626",
                }}>
                {splitEqualPct}% + {splitWeightedPct}% = {splitEqualPct + splitWeightedPct}%
                {Math.abs(splitEqualPct + splitWeightedPct - 100) < 0.5 ? " ✓" : " (must equal 100)"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>Apply to status</p>
                <select
                  value={splitStatus}
                  onChange={e => setSplitStatus(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                >
                  {SHIP_SPLIT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>Payment filter</p>
                <select
                  value={splitPaymentFilter}
                  onChange={e => setSplitPaymentFilter(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                >
                  <option value="all">All payments</option>
                  <option value="paid">Paid only</option>
                  <option value="unpaid">Unpaid only</option>
                </select>
              </div>
            </div>

            {splitError && <ErrorBanner msg={splitError} onClose={() => setSplitError("")} />}

            <button
              onClick={applyShippingSplit}
              disabled={splitApplying || !splitTotal || Math.abs(splitEqualPct + splitWeightedPct - 100) > 0.5}
              className="h-10 px-5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50"
              style={{ background: "var(--t-blue-deep)" }}
            >
              {splitApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
              {splitApplying ? "Applying…" : "Apply Shipping Split"}
            </button>

            {splitResult && (
              <div className="space-y-2 p-3 rounded-xl" style={{ background: "rgba(22,163,74,0.07)", border: "1px solid rgba(22,163,74,0.2)" }}>
                <p className="text-xs font-bold" style={{ color: "#16A34A" }}>{splitResult.message}</p>
                {splitResult.breakdown.length > 0 && (
                  <div className="space-y-1 max-h-52 overflow-y-auto">
                    {splitResult.breakdown.map(b => (
                      <div key={b.orderId} className="flex justify-between text-[11px]">
                        <span style={{ color: "var(--t-subtle)" }}>@{b.username}</span>
                        <span className="font-semibold shrink-0 ml-3" style={{ color: "var(--t-text)" }}>
                          ${b.vendorShipping.toFixed(2)} → ${b.newGrandTotal.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </SectionCard>


      <SectionCard>
        <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Crypto Payment</p>
        <Field label="Cryptocurrency" icon={Wallet}>
          <select
            value={payments.cryptoCurrency}
            onChange={e => setPayments(p => ({ ...p, cryptoCurrency: e.target.value, cryptoNetwork: "" }))}
            className={inputCls}
            style={inputStyle}
          >
            {CRYPTO_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Network" icon={Globe}>
          <select
            value={payments.cryptoNetwork}
            onChange={e => setPayments(p => ({ ...p, cryptoNetwork: e.target.value }))}
            className={inputCls}
            style={inputStyle}
          >
            <option value="">Select network…</option>
            {availableNetworks.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </Field>
        <Field label="Wallet Address" icon={Wallet}>
          <input
            value={payments.cryptoWalletAddress}
            onChange={e => setPayments(p => ({ ...p, cryptoWalletAddress: e.target.value }))}
            placeholder="Your wallet address"
            className={inputCls}
            style={inputStyle}
          />
        </Field>
        <p className="text-sm font-bold mt-2" style={{ color: "var(--t-text)" }}>Other Payment Methods</p>
        <Field label="Revolut Handle" icon={CreditCard}><input value={payments.revolutHandle} onChange={e => setPayments(p => ({ ...p, revolutHandle: e.target.value }))} placeholder="@yourhandle" className={inputCls} style={inputStyle} /></Field>
        <Field label="PayPal Handle / Email" icon={DollarSign}><input value={payments.paypalHandle} onChange={e => setPayments(p => ({ ...p, paypalHandle: e.target.value }))} placeholder="paypal.me/username or email" className={inputCls} style={inputStyle} /></Field>

        {/* AnonPay section */}
        <div className="pt-2 space-y-3">
          <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Trocador AnonPay</p>
          <p className="text-xs" style={{ color: "var(--t-subtle)" }}>Enable to let members pay anonymously via Trocador's AnonPay (Monero, Bitcoin, etc.).</p>
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>Enable AnonPay for this group buy</p>
            <button
              type="button"
              onClick={() => setPayments(p => ({ ...p, anonPayEnabled: !p.anonPayEnabled }))}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 overflow-hidden ${payments.anonPayEnabled ? "bg-[var(--t-blue-deep)]" : "bg-[var(--t-border)]"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${payments.anonPayEnabled ? "translate-x-[22px]" : "translate-x-0.5"}`} />
            </button>
          </div>
          {payments.anonPayEnabled && (
            <div className="space-y-2">
              <Field label="AnonPay Wallet Address" icon={Wallet}>
                <input value={payments.anonPayWallet} onChange={e => setPayments(p => ({ ...p, anonPayWallet: e.target.value }))} placeholder="e.g. XMR address" className={`${inputCls} font-mono`} style={inputStyle} />
              </Field>
              <Field label="Coin & Network" icon={DollarSign}>
                <select
                  className={inputCls}
                  style={inputStyle}
                  value={`${payments.anonPayTicker.toLowerCase()}|${payments.anonPayNetwork}`}
                  onChange={e => {
                    const [ticker, network] = e.target.value.split("|");
                    setPayments(p => ({ ...p, anonPayTicker: ticker, anonPayNetwork: network }));
                  }}
                >
                  {TROCADOR_COINS.map(c => (
                    <option key={`${c.ticker}|${c.network}`} value={`${c.ticker}|${c.network}`}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}
        </div>

        <button onClick={savePayments} disabled={savingPay} className="h-10 px-5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5" style={{ background: okPay ? "#16A34A" : "var(--t-blue-deep)" }}>
          {savingPay ? <Loader2 className="w-4 h-4 animate-spin" /> : okPay ? <CheckCircle2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {savingPay ? "Saving…" : okPay ? "Saved!" : "Save Payment Details"}
        </button>
      </SectionCard>
    </div>
  );
}

// ─── Orders Tab ───────────────────────────────────────────────────────────────

function exportOrdersCsv(orders: OrgOrder[], currency: string, gbName: string) {
  const seenProducts: string[] = [];
  for (const o of orders) {
    for (const li of o.lineItems) {
      if (!seenProducts.includes(li.productName)) seenProducts.push(li.productName);
    }
  }
  const header = ["Code", "Username", "Status", "Payment", `Total (${currency})`, "Delivery", "Tracking", "Shipping Name", "Shipping Address", "Country", "Date", ...seenProducts];
  const rows = orders.map(o => {
    const qtyMap: Record<string, number> = {};
    for (const li of o.lineItems) qtyMap[li.productName] = (qtyMap[li.productName] ?? 0) + li.quantity;
    const country = o.shippingCountry ?? o.accountCountry ?? "";
    const productCells = seenProducts.map(name => qtyMap[name] ?? "");
    return [o.code, `@${o.telegramUsername}`, o.status, o.paymentStatus, o.grandTotal.toFixed(2), o.deliveryMethod ?? "", o.trackingNumber ?? "", o.shippingName ?? "", o.shippingAddress ?? "", country, new Date(o.createdAt).toLocaleDateString("en-GB"), ...productCells];
  });
  const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `${gbName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_orders.csv`; a.click();
  URL.revokeObjectURL(url);
}

function splitCsvRow(row: string): string[] {
  const result: string[] = []; let cur = ""; let inQ = false;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (c === '"') { if (inQ && row[i + 1] === '"') { cur += '"'; i++; } else { inQ = !inQ; } }
    else if (c === ',' && !inQ) { result.push(cur); cur = ""; }
    else { cur += c; }
  }
  result.push(cur); return result;
}
function parseCsvText(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvRow(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = splitCsvRow(line);
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? "").trim()]));
  });
}
function parseImportItems(items: string): { productName: string; quantity: number; unitPrice: number }[] {
  if (!items.trim()) return [];
  return items.split(";").map(s => s.trim()).filter(Boolean).flatMap(item => {
    const m = item.match(/^(.+?)\s+x(\d+(?:\.\d+)?)\s*(?:@([\d.]+))?$/i);
    if (!m) return [{ productName: item.trim(), quantity: 1, unitPrice: 0 }];
    return [{ productName: m[1].trim(), quantity: parseFloat(m[2]), unitPrice: parseFloat(m[3] ?? "0") }];
  });
}
function downloadOrgImportTemplate(gbName: string) {
  const header = ["telegramUsername", "status", "shippingAmount", "address", "adminNotes", "items"];
  const example = ["@username", "Submitted", "0.00", "123 Example Street, London, SW1A 1AA", "Example note", "BPC-157 x2 @12.50; TB-500 x1 @25.00"];
  const csv = [header, example].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `${gbName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_import_template.csv`; a.click();
  URL.revokeObjectURL(url);
}

const ORDERS_PER_PAGE = 25;
const ORDER_STATUS_OPTIONS = ["Draft", "Submitted", "Processing", "Shipped", "Completed", "Cancelled"];
const PAYMENT_STATUS_OPTIONS = ["unpaid", "pending_confirmation", "confirmed", "failed", "refunded", "test_ready", "test_confirmed"];

interface OrderEdit {
  status: string;
  paymentStatus: string;
  adminNotes: string;
  trackingNumber: string;
  trackingNumbers: string[];
  paymentTxHash: string;
  paymentTxHashes: string[];
  lineItems: { id?: string; productId?: string; quantity: number }[];
}

interface PendingPayment {
  id: string;
  code: string;
  telegramUsername: string;
  grandTotal: number;
  paymentStatus: string;
  groupBuyId: string;
  gbName: string;
  gbCurrency: string;
  paymentMethod: string;
  paymentTxHash: string | null;
  testPaymentTxHash: string | null;
  paymentTestAmount: number | null;
  paymentScreenshot: string | null;
  createdAt: string;
}

function PendingConfirmationsPanel({ gb, onResolved }: { gb: OrganiserGB; onResolved: () => void }) {
  const [pending, setPending] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<Record<string, "confirming" | "rejecting" | null>>({});
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [rejectOpen, setRejectOpen] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    fetch("/api/organiser/pending-payment-confirmations", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((d: PendingPayment[]) => {
        setPending(d.filter(p => p.groupBuyId === gb.id));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [gb.id]);

  useEffect(() => { load(); }, [load]);

  const confirm = async (p: PendingPayment) => {
    setActing(prev => ({ ...prev, [p.id]: "confirming" }));
    setErrors(prev => ({ ...prev, [p.id]: "" }));
    try {
      const res = await fetch(`/api/organiser/group-buys/${gb.id}/orders/${p.id}/confirm-payment`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const d = await res.json();
      if (!res.ok) { setErrors(prev => ({ ...prev, [p.id]: d.error || "Failed" })); }
      else { setPending(prev => prev.filter(x => x.id !== p.id)); onResolved(); }
    } catch { setErrors(prev => ({ ...prev, [p.id]: "Connection error" })); }
    setActing(prev => ({ ...prev, [p.id]: null }));
  };

  const reject = async (p: PendingPayment) => {
    setActing(prev => ({ ...prev, [p.id]: "rejecting" }));
    setErrors(prev => ({ ...prev, [p.id]: "" }));
    try {
      const res = await fetch(`/api/organiser/group-buys/${gb.id}/orders/${p.id}/reject-payment`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason[p.id]?.trim() || null }),
      });
      const d = await res.json();
      if (!res.ok) { setErrors(prev => ({ ...prev, [p.id]: d.error || "Failed" })); }
      else { setPending(prev => prev.filter(x => x.id !== p.id)); setRejectOpen(s => { const n = new Set(s); n.delete(p.id); return n; }); onResolved(); }
    } catch { setErrors(prev => ({ ...prev, [p.id]: "Connection error" })); }
    setActing(prev => ({ ...prev, [p.id]: null }));
  };

  if (loading) return null;
  if (pending.length === 0) return null;

  const methodLabel = (m: string) => m === "revolut" ? "Revolut" : m === "paypal" ? "PayPal" : m === "anonpay" ? "AnonPay" : "Crypto";
  const methodColor = (m: string) => m === "revolut" ? "#0666EB" : m === "paypal" ? "#003087" : m === "anonpay" ? "#F97316" : "#64748B";

  return (
    <div className="mb-5 rounded-2xl border-2 overflow-hidden" style={{ borderColor: "rgba(251,191,36,0.5)", background: "rgba(254,243,199,0.5)" }}>
      <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: "rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.12)" }}>
        <Clock className="w-4.5 h-4.5 text-amber-600 shrink-0" style={{ width: 18, height: 18 }} />
        <span className="font-bold text-amber-900 text-sm">Awaiting Payment Confirmation</span>
        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">{pending.length}</span>
      </div>
      <div className="divide-y" style={{ "--tw-divide-opacity": "1" } as React.CSSProperties}>
        {pending.map(p => (
          <div key={p.id} className="px-4 py-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold px-2 py-1 rounded-lg" style={{ background: "rgba(251,191,36,0.2)", color: "#78350f" }}>{p.code}</span>
                <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{p.telegramUsername}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: methodColor(p.paymentMethod) }}>{methodLabel(p.paymentMethod)}</span>
              </div>
              <span className="text-sm font-black" style={{ color: "var(--t-text)" }}>{gb.currency}{p.grandTotal.toFixed(2)}</span>
            </div>

            {p.paymentScreenshot && (
              <ImageLightbox
                src={p.paymentScreenshot}
                alt="Payment screenshot"
                wrapperClassName="block rounded-xl overflow-hidden border group relative cursor-zoom-in"
                wrapperStyle={{ borderColor: "rgba(251,191,36,0.35)" }}
                thumbnailClassName="w-full max-h-40 object-contain bg-white/60"
              />
            )}

            {p.testPaymentTxHash && (
              <div className="rounded-xl px-3 py-2" style={{ background: "rgba(100,116,139,0.08)", border: "1px solid rgba(100,116,139,0.2)" }}>
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "#64748B" }}>
                  Test TX{p.paymentTestAmount != null ? ` · ${gb.currency}${p.paymentTestAmount.toFixed(2)}` : ""}
                </p>
                <p className="font-mono text-[11px] break-all select-all" style={{ color: "var(--t-text)" }}>{p.testPaymentTxHash}</p>
              </div>
            )}
            {p.paymentTxHash && (
              <div className="rounded-xl px-3 py-2" style={{ background: "rgba(100,116,139,0.08)", border: "1px solid rgba(100,116,139,0.2)" }}>
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "#64748B" }}>
                  {p.testPaymentTxHash ? `Remaining TX · ${gb.currency}${(p.grandTotal - (p.paymentTestAmount ?? 0)).toFixed(2)}` : "Transaction ID"}
                </p>
                <p className="font-mono text-[11px] break-all select-all" style={{ color: "var(--t-text)" }}>{p.paymentTxHash}</p>
              </div>
            )}

            {errors[p.id] && <p className="text-xs text-red-600 font-medium">{errors[p.id]}</p>}

            {rejectOpen.has(p.id) ? (
              <div className="space-y-2">
                <input
                  value={rejectReason[p.id] ?? ""}
                  onChange={e => setRejectReason(prev => ({ ...prev, [p.id]: e.target.value }))}
                  placeholder="Reason for rejection (optional)"
                  className="w-full px-3 py-2 rounded-xl text-xs border outline-none"
                  style={{ borderColor: "rgba(251,191,36,0.4)", background: "rgba(255,255,255,0.8)" }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setRejectOpen(s => { const n = new Set(s); n.delete(p.id); return n; })}
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{ background: "rgba(0,0,0,0.05)", color: "var(--t-muted)" }}
                  >Cancel</button>
                  <button
                    onClick={() => reject(p)}
                    disabled={acting[p.id] === "rejecting"}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-60"
                    style={{ background: "#dc2626" }}
                  >
                    {acting[p.id] === "rejecting" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    Reject
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => confirm(p)}
                  disabled={!!acting[p.id]}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-60"
                  style={{ background: "#16a34a" }}
                >
                  {acting[p.id] === "confirming" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Confirm Payment
                </button>
                <button
                  onClick={() => setRejectOpen(s => { const n = new Set(s); n.add(p.id); return n; })}
                  disabled={!!acting[p.id]}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-60"
                  style={{ background: "rgba(220,38,38,0.1)", border: "1.5px solid rgba(220,38,38,0.3)", color: "#dc2626" }}
                >
                  <X className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function OrdersTab({ gb }: { gb: OrganiserGB }) {
  const [orders, setOrders] = useState<OrgOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState<Set<string>>(new Set());
  const [orderScreenshots, setOrderScreenshots] = useState<Record<string, string | null | "loading">>({});
  const [balanceProofUrl, setBalanceProofUrl] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, OrderEdit>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saveOk, setSaveOk] = useState<Record<string, boolean>>({});
  const [saveErr, setSaveErr] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [countryLegFilter, setCountryLegFilter] = useState("all");
  const [legs, setLegs] = useState<{ id: string; countryName: string; countryCode: string }[]>([]);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [payDateFrom, setPayDateFrom] = useState("");
  const [payDateTo, setPayDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"order_desc" | "order_asc" | "pay_desc" | "pay_asc">("order_desc");
  const [page, setPage] = useState(1);
  const [showOosPanel, setShowOosPanel] = useState(false);
  const [msgTexts, setMsgTexts] = useState<Record<string, string>>({});
  const [msgSending, setMsgSending] = useState<Record<string, boolean>>({});
  const [msgResult, setMsgResult] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [oosSelected, setOosSelected] = useState<Set<string>>(new Set());
  const [oosSubmitting, setOosSubmitting] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [oosResult, setOosResult] = useState<{ affectedLineItems: number; affectedOrders: number } | null>(null);
  const [oosError, setOosError] = useState("");
  const [unmkSelected, setUnmkSelected] = useState<Set<string>>(new Set());
  const [unmkSubmitting, setUnmkSubmitting] = useState(false);
  const [unmkResult, setUnmkResult] = useState<{ affectedLineItems: number; affectedOrders: number } | null>(null);
  const [unmkError, setUnmkError] = useState("");

  // Deleted orders (trash) panel
  const [showTrash, setShowTrash] = useState(false);
  type TrashOrder = { id: string; code: string; telegramUsername: string; status: string; grandTotal: number | null; deletedAt: string; deletedBy: string | null; expiresAt: string; lineItems: { productName: string; quantity: number }[] };
  const [trash, setTrash] = useState<TrashOrder[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashRestoring, setTrashRestoring] = useState<Set<string>>(new Set());
  const [trashError, setTrashError] = useState("");

  const loadTrash = async () => {
    setTrashLoading(true);
    setTrashError("");
    try {
      const r = await fetch(`/api/organiser/group-buys/${gb.id}/orders/trash`, { credentials: "include" });
      const d = await r.json();
      if (!r.ok) { setTrashError(d.error ?? "Failed to load"); return; }
      setTrash(Array.isArray(d) ? d : []);
    } catch { setTrashError("Network error"); }
    finally { setTrashLoading(false); }
  };

  const handleRestoreOrder = async (orderId: string, code: string) => {
    if (!window.confirm(`Restore order ${code}?`)) return;
    setTrashRestoring(prev => new Set(prev).add(orderId));
    try {
      const r = await fetch(`/api/organiser/group-buys/${gb.id}/orders/${orderId}/restore`, { method: "POST", credentials: "include" });
      const d = await r.json();
      if (!r.ok) { alert(d.error ?? "Restore failed"); return; }
      setTrash(prev => prev.filter(o => o.id !== orderId));
      // Refresh live orders list
      const ordRes = await fetch(`/api/organiser/group-buys/${gb.id}/orders`, { credentials: "include" });
      if (ordRes.ok) setOrders(await ordRes.json());
    } catch { alert("Network error"); }
    finally { setTrashRestoring(prev => { const s = new Set(prev); s.delete(orderId); return s; }); }
  };

  // Intl shipping panel
  const [intlShipOpen, setIntlShipOpen] = useState(false);
  const [intlShipRates, setIntlShipRates] = useState<{ id: string; country: string; region: string | null; carrier: string; priceGbp: string; priceUsd: string; priceEur: string; parcelSizeId: string }[]>([]);
  const [intlShipParcelSizes, setIntlShipParcelSizes] = useState<{ id: string; name: string; qtyLabel: string | null }[]>([]);
  const [intlShipRateId, setIntlShipRateId] = useState("");
  const [intlShipNotify, setIntlShipNotify] = useState(true);
  // Paid → already collected by organiser, no balance owed.
  // Unpaid → customer must pay the addition; tracked as outstanding amount_due.
  const [intlShipPaid, setIntlShipPaid] = useState(false);
  const [intlShipSubmitting, setIntlShipSubmitting] = useState(false);
  const [intlShipResult, setIntlShipResult] = useState<{ updatedCount: number; ratePrice: number; currency: string; paid: boolean } | null>(null);
  const [intlShipError, setIntlShipError] = useState("");

  // Bulk add-product panel
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [bulkAddProductId, setBulkAddProductId] = useState("");
  const [bulkAddQty, setBulkAddQty] = useState("1");
  const [bulkAddSubmitting, setBulkAddSubmitting] = useState(false);
  const [bulkAddResult, setBulkAddResult] = useState<{ added: number; skipped: number; productName: string } | null>(null);
  const [bulkAddError, setBulkAddError] = useState("");

  const handleBulkAddProduct = async () => {
    if (!bulkAddProductId || selectedOrderIds.size === 0) return;
    const qty = parseFloat(bulkAddQty);
    if (isNaN(qty) || qty <= 0) { setBulkAddError("Enter a valid quantity"); return; }
    setBulkAddSubmitting(true);
    setBulkAddError("");
    setBulkAddResult(null);
    try {
      const res = await fetch(`/api/organiser/group-buys/${gb.id}/orders/bulk-add-product`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: [...selectedOrderIds], productId: bulkAddProductId, quantity: qty }),
      });
      const data = await res.json();
      if (!res.ok) { setBulkAddError(data.error ?? "Failed"); return; }
      setBulkAddResult({ added: data.added, skipped: data.skipped, productName: data.productName });
      // Refresh orders to reflect updated totals and line items
      const ordRes = await fetch(`/api/organiser/group-buys/${gb.id}/orders`, { credentials: "include" });
      if (ordRes.ok) setOrders(await ordRes.json());
    } catch { setBulkAddError("Network error"); }
    finally { setBulkAddSubmitting(false); }
  };

  // Product picker for adding to existing orders
  const [addProductPicker, setAddProductPicker] = useState<Record<string, string>>({});

  // Reshipper reassignment
  const [gbReshippers, setGbReshippers] = useState<{ reshipperUsername: string }[]>([]);
  const [reassignTarget, setReassignTarget] = useState<Record<string, string>>({});
  const [reassigning, setReassigning] = useState<Record<string, boolean>>({});
  const [reassignResult, setReassignResult] = useState<Record<string, { ok: boolean; text: string }>>({});

  // Organiser QR code upload state
  const [orgQrSaving, setOrgQrSaving] = useState<Record<string, boolean>>({});
  const [orgQrMsg, setOrgQrMsg] = useState<Record<string, { ok: boolean; text: string }>>({});

  // Create Order form state
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [gbProducts, setGbProducts] = useState<OrgProduct[]>([]);
  const [createOrderForm, setCreateOrderForm] = useState({
    telegramUsername: "", shippingAmount: "", notes: "", status: "Submitted",
    lineItems: [{ productName: "", quantity: "1", unitPrice: "" }],
  });
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  const openCreateOrder = useCallback(() => {
    setCreateOrderForm({ telegramUsername: "", shippingAmount: "", notes: "", status: "Submitted", lineItems: [{ productName: "", quantity: "1", unitPrice: "" }] });
    setCreateErr("");
    setShowCreateOrder(true);
    if (gbProducts.length === 0) {
      fetch(`/api/organiser/group-buys/${gb.id}/products`, { credentials: "include" })
        .then(r => r.ok ? r.json() : [])
        .then((d: OrgProduct[]) => setGbProducts(d))
        .catch(() => {});
    }
  }, [gb.id, gbProducts.length]);

  const handleCreateOrder = async () => {
    setCreating(true);
    setCreateErr("");
    const validItems = createOrderForm.lineItems.filter(li => li.productName.trim() && parseFloat(li.quantity) > 0);
    if (!createOrderForm.telegramUsername.trim()) { setCreateErr("Telegram username is required"); setCreating(false); return; }
    if (validItems.length === 0) { setCreateErr("At least one product is required"); setCreating(false); return; }
    try {
      const res = await fetch(`/api/organiser/group-buys/${gb.id}/orders`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUsername: createOrderForm.telegramUsername.trim(),
          shippingAmount: parseFloat(createOrderForm.shippingAmount) || 0,
          notes: createOrderForm.notes.trim() || undefined,
          status: createOrderForm.status,
          lineItems: validItems.map(li => ({
            productName: li.productName.trim(),
            quantity: parseFloat(li.quantity),
            unitPrice: parseFloat(li.unitPrice) || 0,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateErr(data.error || "Failed to create order"); setCreating(false); return; }
      setOrders(prev => [data as OrgOrder, ...prev]);
      setShowCreateOrder(false);
    } catch { setCreateErr("Network error — try again"); }
    setCreating(false);
  };

  const handleImportCsv = async (file: File) => {
    setImporting(true);
    setImportMsg("Importing…");
    try {
      const text = await file.text();
      const rows = parseCsvText(text);
      if (rows.length === 0) { setImportMsg("No valid rows found in CSV"); setImporting(false); return; }
      let ok = 0; let fail = 0;
      for (const row of rows) {
        const username = (row["telegramUsername"] ?? row["username"] ?? "").trim();
        const items = parseImportItems(row["items"] ?? "");
        if (!username || items.length === 0) { fail++; continue; }
        try {
          const res = await fetch(`/api/organiser/group-buys/${gb.id}/orders`, {
            method: "POST", credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              telegramUsername: username,
              status: row["status"] || "Submitted",
              shippingAmount: parseFloat(row["shippingAmount"] ?? row["shipping"] ?? "0") || 0,
              shippingAddress: (row["address"] ?? row["shippingAddress"] ?? "").trim() || undefined,
              notes: (row["adminNotes"] ?? row["notes"] ?? "").trim() || undefined,
              lineItems: items,
            }),
          });
          if (res.ok) { const d = await res.json(); setOrders(prev => [d as OrgOrder, ...prev]); ok++; }
          else fail++;
        } catch { fail++; }
      }
      setImportMsg(`Imported ${ok} order${ok !== 1 ? "s" : ""}${fail > 0 ? `, ${fail} failed` : ""} ✓`);
      setTimeout(() => setImportMsg(""), 6000);
    } catch { setImportMsg("Failed to read file"); }
    setImporting(false);
  };

  const loadOrders = useCallback(() => {
    setLoading(true);
    fetch(`/api/organiser/group-buys/${gb.id}/orders`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(d => { setOrders(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [gb.id]);

  useEffect(() => {
    fetch(`/api/organiser/group-buys/${gb.id}/reshippers`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((d: { reshipperUsername: string }[]) => setGbReshippers(d))
      .catch(() => {});
  }, [gb.id]);

  const reassignReshipper = async (o: OrgOrder) => {
    const username = reassignTarget[o.id] !== undefined ? reassignTarget[o.id] : (o.reshipperUsername ?? "");
    setReassigning(prev => ({ ...prev, [o.id]: true }));
    try {
      const r = await fetch(`/api/organiser/group-buys/${gb.id}/orders/${o.id}/reassign-reshipper`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reshipperUsername: username || null }),
      });
      const data: { ok?: boolean; reshipperUsername?: string | null; error?: string } = await r.json();
      if (!r.ok) {
        setReassignResult(prev => ({ ...prev, [o.id]: { ok: false, text: data.error ?? "Failed" } }));
      } else {
        const assigned = data.reshipperUsername ?? null;
        setOrders(prev => prev.map(ord => ord.id === o.id ? { ...ord, reshipperUsername: assigned } : ord));
        setReassignResult(prev => ({ ...prev, [o.id]: { ok: true, text: assigned ? `Assigned to @${assigned} ✓` : "Reshipper cleared ✓" } }));
        setTimeout(() => setReassignResult(prev => ({ ...prev, [o.id]: { ok: false, text: "" } })), 3000);
      }
    } catch {
      setReassignResult(prev => ({ ...prev, [o.id]: { ok: false, text: "Network error" } }));
    } finally { setReassigning(prev => ({ ...prev, [o.id]: false })); }
  };

  const submitOos = async () => {
    const names = [...oosSelected];
    if (names.length === 0) return;
    setOosSubmitting(true); setOosResult(null); setOosError("");
    try {
      const res = await fetch(`/api/organiser/group-buys/${gb.id}/orders/mark-oos`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productNames: names }),
      });
      const data = await res.json();
      if (!res.ok) { setOosError(data.error || "Failed to mark OOS"); return; }
      setOosResult({ affectedLineItems: data.affectedLineItems, affectedOrders: data.affectedOrders });
      setOosSelected(new Set());
      loadOrders();
    } catch { setOosError("Network error — please try again"); }
    finally { setOosSubmitting(false); }
  };

  const submitUnmarkOos = async () => {
    const names = [...unmkSelected];
    if (names.length === 0) return;
    setUnmkSubmitting(true); setUnmkResult(null); setUnmkError("");
    try {
      const res = await fetch(`/api/organiser/group-buys/${gb.id}/orders/unmark-oos`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productNames: names }),
      });
      const data = await res.json();
      if (!res.ok) { setUnmkError(data.error || "Failed to restore"); return; }
      setUnmkResult({ affectedLineItems: data.affectedLineItems, affectedOrders: data.affectedOrders });
      setUnmkSelected(new Set());
      loadOrders();
    } catch { setUnmkError("Network error — please try again"); }
    finally { setUnmkSubmitting(false); }
  };

  useEffect(() => {
    loadOrders();
    if (gb.countryLegsEnabled) {
      fetch(`/api/organiser/group-buys/${gb.id}/country-legs`, { credentials: "include" })
        .then(r => r.ok ? r.json() : [])
        .then(d => setLegs(d))
        .catch(() => {});
    }
  }, [loadOrders, gb.id, gb.countryLegsEnabled]);

  useEffect(() => {
    if (!intlShipOpen || countryFilter === "all") return;
    setIntlShipRates([]);
    setIntlShipParcelSizes([]);
    setIntlShipRateId("");
    setIntlShipResult(null);
    setIntlShipError("");
    Promise.all([
      fetch(`/api/intl-shipping/parcel-sizes?groupBuyId=${gb.id}`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
      fetch(`/api/intl-shipping/rates?groupBuyId=${gb.id}`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
    ]).then(([sizes, rates]) => {
      setIntlShipParcelSizes(sizes ?? []);
      // Match by canonical country key so that rates stored as full names
      // (e.g. "Netherlands") match orders/filters stored as ISO codes (e.g. "NL").
      const countryCanon = _canonicalCountry(countryFilter).toLowerCase();
      const filtered = (rates ?? []).filter((r: any) =>
        r.active !== false &&
        !!r.country &&
        _canonicalCountry(String(r.country)).toLowerCase() === countryCanon
      );
      setIntlShipRates(filtered);
      if (filtered.length === 1) setIntlShipRateId(filtered[0].id);
    }).catch(() => {});
  }, [intlShipOpen, countryFilter, gb.id]);

  const handleApplyIntlShipping = async () => {
    if (!intlShipRateId || intlShipTargetOrders.length === 0) return;
    setIntlShipSubmitting(true);
    setIntlShipResult(null);
    setIntlShipError("");
    const orderIds = intlShipTargetOrders.map(o => o.id);
    try {
      const res = await fetch(`/api/organiser/group-buys/${gb.id}/orders/apply-intl-shipping`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rateId: intlShipRateId, orderIds, notify: intlShipNotify, paid: intlShipPaid }),
      });
      const data = await res.json();
      if (!res.ok) { setIntlShipError(data.error || "Failed to apply shipping"); return; }
      setIntlShipResult({ updatedCount: data.updatedCount, ratePrice: data.ratePrice, currency: data.currency, paid: !!data.paid });
      loadOrders();
    } catch { setIntlShipError("Network error — please try again"); }
    finally { setIntlShipSubmitting(false); }
  };

  const openEdit = (o: OrgOrder) => {
    setEdits(prev => ({
      ...prev,
      [o.id]: {
        status: o.status,
        paymentStatus: o.paymentStatus,
        adminNotes: o.adminNotes ?? "",
        trackingNumber: o.trackingNumber ?? "",
        trackingNumbers: o.trackingNumbers?.length ? o.trackingNumbers : (o.trackingNumber ? [o.trackingNumber] : []),
        paymentTxHash: o.paymentTxHash ?? "",
        paymentTxHashes: o.paymentTxHashes?.length ? o.paymentTxHashes : (o.paymentTxHash ? [o.paymentTxHash] : []),
        lineItems: o.lineItems.map(li => ({ id: li.id, quantity: li.quantity })),
      },
    }));
    setEditOpen(s => { const n = new Set(s); n.add(o.id); return n; });
    if (gb.organiserCanEditQuantities && gbProducts.length === 0) {
      fetch(`/api/organiser/group-buys/${gb.id}/products`, { credentials: "include" })
        .then(r => r.ok ? r.json() : [])
        .then((d: OrgProduct[]) => setGbProducts(d))
        .catch(() => {});
    }
  };

  const closeEdit = (id: string) => setEditOpen(s => { const n = new Set(s); n.delete(id); return n; });

  const updateEdit = (id: string, k: keyof OrderEdit, v: string | string[]) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [k]: v } }));
  };

  const updateLineItemQty = (orderId: string, key: string, qty: number) => {
    setEdits(prev => {
      const cur = prev[orderId];
      if (!cur) return prev;
      return { ...prev, [orderId]: { ...cur, lineItems: cur.lineItems.map(li => (li.id === key || li.productId === key) ? { ...li, quantity: qty } : li) } };
    });
  };

  const addNewLineItem = (orderId: string, productId: string) => {
    setEdits(prev => {
      const cur = prev[orderId];
      if (!cur) return prev;
      if (cur.lineItems.some(li => li.productId === productId)) return prev;
      return { ...prev, [orderId]: { ...cur, lineItems: [...cur.lineItems, { productId, quantity: 1 }] } };
    });
  };

  const removeNewLineItem = (orderId: string, productId: string) => {
    setEdits(prev => {
      const cur = prev[orderId];
      if (!cur) return prev;
      return { ...prev, [orderId]: { ...cur, lineItems: cur.lineItems.filter(li => li.productId !== productId) } };
    });
  };

  const uploadOrgQr = async (orderId: string, courier: string, file: File | null) => {
    const key = `${orderId}-${courier}`;
    setOrgQrSaving(prev => ({ ...prev, [key]: true }));
    setOrgQrMsg(prev => ({ ...prev, [key]: { ok: false, text: "" } }));
    try {
      let qrCode: string | null = null;
      if (file) {
        qrCode = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
      const res = await fetch(`/api/organiser/group-buys/${gb.id}/orders/${orderId}/qr`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courier, qrCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOrgQrMsg(prev => ({ ...prev, [key]: { ok: false, text: data.error || "Upload failed" } }));
      } else {
        const qrField = courier === "inpost" ? "inpostQrCode" : "royalMailQrCode";
        setOrders(prev => prev.map(ord => ord.id === orderId ? { ...ord, [qrField]: qrCode } : ord));
        setOrgQrMsg(prev => ({ ...prev, [key]: { ok: true, text: qrCode ? "Uploaded ✓" : "Cleared ✓" } }));
        setTimeout(() => setOrgQrMsg(prev => ({ ...prev, [key]: { ok: false, text: "" } })), 2500);
      }
    } catch {
      setOrgQrMsg(prev => ({ ...prev, [key]: { ok: false, text: "Network error" } }));
    }
    setOrgQrSaving(prev => ({ ...prev, [key]: false }));
  };

  const saveEdit = async (o: OrgOrder) => {
    const edit = edits[o.id];
    if (!edit) return;
    setSaving(prev => ({ ...prev, [o.id]: true }));
    setSaveErr(prev => ({ ...prev, [o.id]: "" }));
    try {
      const res = await fetch(`/api/organiser/group-buys/${gb.id}/orders/${o.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: edit.status,
          paymentStatus: edit.paymentStatus,
          adminNotes: edit.adminNotes.trim() || null,
          trackingNumbers: edit.trackingNumbers.filter(Boolean),
          paymentTxHashes: edit.paymentTxHashes.filter(Boolean),
          lineItems: gb.organiserCanEditQuantities ? edit.lineItems : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveErr(prev => ({ ...prev, [o.id]: data.error || "Failed to save" })); return; }
      setOrders(prev => prev.map(ord => ord.id === o.id ? {
        ...ord,
        status: data.order.status,
        paymentStatus: data.order.paymentStatus,
        adminNotes: data.order.adminNotes,
        trackingNumber: data.order.trackingNumber,
        trackingNumbers: data.order.trackingNumbers ?? null,
        paymentTxHash: data.order.paymentTxHash,
        paymentTxHashes: data.order.paymentTxHashes ?? null,
        grandTotal: data.order.grandTotal ?? ord.grandTotal,
        productSubtotal: data.order.productSubtotal ?? ord.productSubtotal,
        lineItems: data.order.lineItems?.length ? data.order.lineItems : ord.lineItems,
      } : ord));
      setSaveOk(prev => ({ ...prev, [o.id]: true }));
      setTimeout(() => setSaveOk(prev => ({ ...prev, [o.id]: false })), 2000);
      closeEdit(o.id);
    } catch { setSaveErr(prev => ({ ...prev, [o.id]: "Connection error" })); }
    finally { setSaving(prev => ({ ...prev, [o.id]: false })); }
  };

  const sendMsg = async (o: OrgOrder) => {
    const text = (msgTexts[o.id] ?? "").trim();
    if (!text) return;
    setMsgSending(prev => ({ ...prev, [o.id]: true }));
    setMsgResult(prev => ({ ...prev, [o.id]: { ok: false, text: "" } }));
    try {
      const res = await fetch(`/api/organiser/group-buys/${gb.id}/orders/${o.id}/send-message`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsgResult(prev => ({ ...prev, [o.id]: { ok: false, text: data.error || "Failed to send" } }));
      } else {
        setMsgResult(prev => ({ ...prev, [o.id]: { ok: true, text: "Message sent!" } }));
        setMsgTexts(prev => ({ ...prev, [o.id]: "" }));
        setTimeout(() => setMsgResult(prev => ({ ...prev, [o.id]: { ok: false, text: "" } })), 3000);
      }
    } catch { setMsgResult(prev => ({ ...prev, [o.id]: { ok: false, text: "Connection error" } })); }
    finally { setMsgSending(prev => ({ ...prev, [o.id]: false })); }
  };

  const q = search.trim().toLowerCase();
  const pendingConfirmationCount = orders.filter(o => o.paymentStatus === "pending_confirmation").length;
  const uniqueCountries = [...new Set(
    orders.map(o => o.shippingCountry ?? o.accountCountry).filter(Boolean).map(r => _canonicalCountry(r as string))
  )].sort();

  const statusFiltered = filter === "all" ? orders
    : filter === "paid" ? orders.filter(o => o.paymentStatus === "confirmed" || o.paymentStatus === "test_confirmed")
    : filter === "unpaid" ? orders.filter(o => o.paymentStatus === "unpaid")
    : filter === "pending_confirmation" ? orders.filter(o => o.paymentStatus === "pending_confirmation")
    : orders.filter(o => o.status.toLowerCase() === filter);

  const baseFiltered = paymentMethodFilter === "all"
    ? statusFiltered
    : statusFiltered.filter(o => o.paymentMethod === paymentMethodFilter);

  const countryFilterValues = countryFilter === "all" ? [] : _countryRawValues(countryFilter);
  const countryFiltered = countryFilter === "all"
    ? baseFiltered
    : baseFiltered.filter(o => countryFilterValues.includes(o.shippingCountry ?? o.accountCountry ?? ""));

  const legFiltered = countryLegFilter === "all"
    ? countryFiltered
    : countryFiltered.filter(o => o.countryLegId === countryLegFilter);

  const dateFiltered = legFiltered.filter(o => {
    const orderDate = new Date(o.createdAt);
    const matchFrom = !dateFrom || orderDate >= new Date(dateFrom);
    const matchTo = !dateTo || orderDate <= new Date(new Date(dateTo).getTime() + 86399999);
    const payDate = o.paymentConfirmedAt ? new Date(o.paymentConfirmedAt) : null;
    const matchPayFrom = !payDateFrom || (payDate != null && payDate >= new Date(payDateFrom));
    const matchPayTo = !payDateTo || (payDate != null && payDate <= new Date(new Date(payDateTo).getTime() + 86399999));
    return matchFrom && matchTo && matchPayFrom && matchPayTo;
  });

  const sortedDateFiltered = [...dateFiltered].sort((a, b) => {
    if (sortBy === "order_asc") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === "pay_desc") {
      const at = a.paymentConfirmedAt ? new Date(a.paymentConfirmedAt).getTime() : 0;
      const bt = b.paymentConfirmedAt ? new Date(b.paymentConfirmedAt).getTime() : 0;
      return bt - at;
    }
    if (sortBy === "pay_asc") {
      const at = a.paymentConfirmedAt ? new Date(a.paymentConfirmedAt).getTime() : Infinity;
      const bt = b.paymentConfirmedAt ? new Date(b.paymentConfirmedAt).getTime() : Infinity;
      return at - bt;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const filteredOrders = q
    ? sortedDateFiltered.filter(o =>
        o.code.toLowerCase().includes(q) ||
        o.telegramUsername.toLowerCase().includes(q) ||
        o.grandTotal.toFixed(2).includes(q)
      )
    : sortedDateFiltered;

  // For the Intl Shipping panel: if the user has ticked any rows in the
  // current country filter, target only those; otherwise target all.
  const intlShipSelectedHere = filteredOrders.filter(o => selectedOrderIds.has(o.id));
  const intlShipTargetOrders = intlShipSelectedHere.length > 0 ? intlShipSelectedHere : filteredOrders;
  const intlShipTargetingSubset = intlShipSelectedHere.length > 0 && intlShipSelectedHere.length < filteredOrders.length;

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagedOrders = filteredOrders.slice((safePage - 1) * ORDERS_PER_PAGE, safePage * ORDERS_PER_PAGE);

  const showCountryHeaders = countryFilter === "all" && uniqueCountries.length > 1;
  const displayOrders = showCountryHeaders
    ? [...filteredOrders].sort((a, b) => {
        const ca = _canonicalCountry(a.shippingCountry ?? a.accountCountry ?? "");
        const cb = _canonicalCountry(b.shippingCountry ?? b.accountCountry ?? "");
        return ca.localeCompare(cb);
      })
    : pagedOrders;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-blue)" }} /></div>;

  const confirmedOrders = orders.filter(o => o.paymentStatus === "confirmed");
  const totalRevenue = confirmedOrders.reduce((s, o) => s + o.grandTotal, 0);
  const confirmedCount = confirmedOrders.length;
  const totalTips = confirmedOrders.reduce((s, o) => s + (o.tip ?? 0), 0);
  const tipCount = confirmedOrders.filter(o => (o.tip ?? 0) > 0).length;

  return (
    <div className="space-y-4">
      <PendingConfirmationsPanel gb={gb} onResolved={loadOrders} />
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold" style={{ color: "var(--t-text)" }}>Orders — {gb.name}</h2>
          <div className="flex items-center gap-2">
            <button onClick={openCreateOrder} className="h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5" style={{ background: "var(--t-blue-10)", border: "1px solid var(--t-blue-15, rgba(27,58,122,0.15))", color: "var(--t-blue-deep)" }}>
              <Plus className="w-3.5 h-3.5" /> Create Order
            </button>
            {orders.length > 0 && (
              <button
                onClick={async () => {
                  if (selectedOrderIds.size > 0) {
                    const toExport = orders.filter(o => selectedOrderIds.has(o.id));
                    exportOrdersCsv(toExport, gb.currency, gb.name);
                  } else {
                    try {
                      const r = await fetch(`/api/organiser/group-buys/${gb.id}/orders`, { credentials: "include" });
                      const freshOrders: OrgOrder[] = r.ok ? await r.json() : orders;
                      setOrders(freshOrders);
                      exportOrdersCsv(freshOrders, gb.currency, gb.name);
                    } catch {
                      exportOrdersCsv(orders, gb.currency, gb.name);
                    }
                  }
                }}
                className="h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5"
                style={{ background: selectedOrderIds.size > 0 ? "var(--t-blue-10)" : "var(--t-surface2)", border: `1px solid ${selectedOrderIds.size > 0 ? "var(--t-blue-15, rgba(27,58,122,0.2))" : "var(--t-border)"}`, color: selectedOrderIds.size > 0 ? "var(--t-blue-deep)" : "var(--t-muted)" }}
              >
                <Download className="w-3.5 h-3.5" />
                {selectedOrderIds.size > 0 ? `Export Selected (${selectedOrderIds.size})` : "Export CSV"}
              </button>
            )}
            <button onClick={() => downloadOrgImportTemplate(gb.name)} className="h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>
              <FileText className="w-3.5 h-3.5" /> Template
            </button>
            <button onClick={() => importRef.current?.click()} disabled={importing} className="h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>
              {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Import CSV
            </button>
            <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImportCsv(f); e.target.value = ""; }} />
          </div>
        </div>
        {importMsg && (
          <p className="text-xs font-medium px-1" style={{ color: importMsg.includes("failed") || importMsg.includes("Failed") ? "#dc2626" : "#16a34a" }}>{importMsg}</p>
        )}

        {/* Create Order form */}
        <AnimatePresence>
          {showCreateOrder && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-3 rounded-2xl p-4 space-y-3" style={{ background: "var(--t-surface)", border: "1.5px solid var(--t-blue-15, rgba(27,58,122,0.2))" }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--t-muted)" }}>Create Order</p>
                <button onClick={() => setShowCreateOrder(false)} style={{ color: "var(--t-muted)" }}><X className="w-4 h-4" /></button>
              </div>

              {/* Telegram + Shipping */}
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 space-y-1">
                  <p className="text-[11px] font-medium" style={{ color: "var(--t-muted)" }}>Telegram Username *</p>
                  <input className={inputCls} style={inputStyle} placeholder="@username"
                    value={createOrderForm.telegramUsername}
                    onChange={e => setCreateOrderForm(p => ({ ...p, telegramUsername: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-medium" style={{ color: "var(--t-muted)" }}>Shipping ({gb.currency})</p>
                  <input type="number" min="0" step="0.01" className={inputCls} style={inputStyle} placeholder="0.00"
                    value={createOrderForm.shippingAmount}
                    onChange={e => setCreateOrderForm(p => ({ ...p, shippingAmount: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-medium" style={{ color: "var(--t-muted)" }}>Status</p>
                  <select className={inputCls} style={inputStyle}
                    value={createOrderForm.status}
                    onChange={e => setCreateOrderForm(p => ({ ...p, status: e.target.value }))}>
                    {["Submitted", "Draft", "Processing", "Shipped", "Completed", "Cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Line items */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--t-muted)" }}>Products *</p>
                {createOrderForm.lineItems.map((li, i) => (
                  <div key={i} className="flex gap-2 items-start rounded-xl p-2" style={{ background: "var(--t-surface2)" }}>
                    <div className="flex-1 space-y-1.5">
                      <select className={inputCls + " !py-1.5"} style={{ ...inputStyle, fontSize: 12 }}
                        value={li.productName}
                        onChange={e => {
                          const prod = gbProducts.find(p => p.name === e.target.value);
                          setCreateOrderForm(p => ({ ...p, lineItems: p.lineItems.map((x, idx) => idx === i ? { ...x, productName: e.target.value, unitPrice: prod ? String(prod.price) : x.unitPrice } : x) }));
                        }}>
                        <option value="">Select product…</option>
                        {gbProducts.filter(p => p.active).map(p => <option key={p.id} value={p.name}>{p.name} — {gb.currency}{Number(p.price).toFixed(2)}</option>)}
                      </select>
                      <div className="flex gap-1.5">
                        <input type="number" min="0.5" step="0.5" className={inputCls + " !py-1"} style={{ ...inputStyle, fontSize: 12, width: 72 }} placeholder="Qty"
                          value={li.quantity}
                          onChange={e => setCreateOrderForm(p => ({ ...p, lineItems: p.lineItems.map((x, idx) => idx === i ? { ...x, quantity: e.target.value } : x) }))} />
                        <input type="number" min="0" step="0.01" className={inputCls + " !py-1 flex-1"} style={{ ...inputStyle, fontSize: 12 }} placeholder={`Unit price (${gb.currency})`}
                          value={li.unitPrice}
                          onChange={e => setCreateOrderForm(p => ({ ...p, lineItems: p.lineItems.map((x, idx) => idx === i ? { ...x, unitPrice: e.target.value } : x) }))} />
                      </div>
                    </div>
                    <button className="mt-1 p-1" style={{ color: "var(--t-muted)" }} onClick={() => setCreateOrderForm(p => ({ ...p, lineItems: p.lineItems.filter((_, idx) => idx !== i) }))}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button className="w-full h-8 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: "var(--t-surface2)", border: "1px dashed var(--t-border)", color: "var(--t-muted)" }}
                  onClick={() => setCreateOrderForm(p => ({ ...p, lineItems: [...p.lineItems, { productName: "", quantity: "1", unitPrice: "" }] }))}>
                  <Plus className="w-3.5 h-3.5" /> Add item
                </button>
              </div>

              {/* Order total preview */}
              {(() => {
                const subtotal = createOrderForm.lineItems.reduce((s, li) => s + (parseFloat(li.quantity) || 0) * (parseFloat(li.unitPrice) || 0), 0);
                const shipping = parseFloat(createOrderForm.shippingAmount) || 0;
                const total = subtotal + shipping;
                if (subtotal === 0 && shipping === 0) return null;
                return (
                  <div className="rounded-xl px-3 py-2.5 space-y-1 text-xs" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--t-subtle)" }}>Summary</p>
                    <div className="flex justify-between" style={{ color: "var(--t-muted)" }}><span>Products</span><span>{gb.currency} {subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between" style={{ color: "var(--t-muted)" }}><span>Shipping</span><span>{gb.currency} {shipping.toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold pt-1" style={{ color: "var(--t-text)", borderTop: "1px solid var(--t-border)" }}><span>Total</span><span>{gb.currency} {total.toFixed(2)}</span></div>
                  </div>
                );
              })()}

              {createErr && <p className="text-xs font-medium" style={{ color: "#DC2626" }}>{createErr}</p>}

              <div className="flex gap-2">
                <button className="flex-1 h-9 rounded-xl text-xs font-semibold" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }} onClick={() => setShowCreateOrder(false)}>Cancel</button>
                <button className="flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5" style={{ background: "var(--t-blue-deep, #1B3A7A)", color: "white" }} onClick={handleCreateOrder} disabled={creating}>
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Create Order</>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex gap-4 mt-2">
          <div><p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>Total</p><p className="text-lg font-bold" style={{ color: "var(--t-text)" }}>{orders.length}</p></div>
          <div><p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>Confirmed Paid</p><p className="text-lg font-bold" style={{ color: "#16A34A" }}>{confirmedCount}</p></div>
          <div><p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>Revenue</p><p className="text-lg font-bold" style={{ color: "var(--t-text)" }}>{gb.currency} {totalRevenue.toFixed(2)}</p></div>
          <div title={`${tipCount} ${tipCount === 1 ? "order" : "orders"} tipped`}>
            <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>Tips</p>
            <p className="text-lg font-bold" style={{ color: totalTips > 0 ? "#D97706" : "var(--t-text)" }}>{gb.currency} {totalTips.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* OOS Management Panel */}
      {gb.organiserCanMarkOos !== false && (
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(220,38,38,0.3)" }}>
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-left"
          style={{ background: "rgba(220,38,38,0.03)" }}
          onClick={() => { setShowOosPanel(p => !p); setOosResult(null); setOosError(""); setUnmkResult(null); setUnmkError(""); }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626" }}>OOS</span>
            <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Mark / Restore Out of Stock</span>
          </div>
          {showOosPanel
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "var(--t-muted)" }}><path d="m18 15-6-6-6 6"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "var(--t-muted)" }}><path d="m6 9 6 6 6-6"/></svg>
          }
        </button>
        {showOosPanel && (() => {
          const allLineItems = orders.flatMap(o => o.lineItems);
          const uniqueNames = [...new Set(allLineItems.map(li => li.productName))].sort((a, b) => a.localeCompare(b));
          const fullyOosNames = new Set(
            uniqueNames.filter(name => {
              const items = allLineItems.filter(li => li.productName === name);
              return items.length > 0 && items.every(li => li.isOos);
            })
          );
          const partiallyOosNames = new Set(
            uniqueNames.filter(name => {
              const items = allLineItems.filter(li => li.productName === name);
              return items.some(li => li.isOos) && !fullyOosNames.has(name);
            })
          );
          const anyOosNames = new Set([...fullyOosNames, ...partiallyOosNames]);

          const toggleOos = (name: string) => {
            setOosSelected(prev => {
              const next = new Set(prev);
              if (next.has(name)) next.delete(name); else next.add(name);
              return next;
            });
            setOosResult(null); setOosError("");
          };
          const toggleUnmk = (name: string) => {
            setUnmkSelected(prev => {
              const next = new Set(prev);
              if (next.has(name)) next.delete(name); else next.add(name);
              return next;
            });
            setUnmkResult(null); setUnmkError("");
          };

          const availableToMark = uniqueNames.filter(n => !fullyOosNames.has(n));
          const availableToRestore = [...anyOosNames].sort((a, b) => a.localeCompare(b));

          return (
            <div className="px-4 pb-4 pt-1 space-y-4" style={{ background: "rgba(220,38,38,0.02)", borderTop: "1px solid rgba(220,38,38,0.15)" }}>

              {/* ── Mark as OOS section ── */}
              <div className="space-y-2 pt-2">
                <p className="text-[11px] font-semibold" style={{ color: "var(--t-text)" }}>Mark as OOS</p>
                <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
                  Select products to mark out of stock. Matching line items will be zeroed out and order totals recalculated.
                </p>
                {availableToMark.length === 0 ? (
                  <p className="text-[11px] italic" style={{ color: "var(--t-subtle)" }}>All products are already marked OOS.</p>
                ) : (
                  <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(220,38,38,0.25)", maxHeight: "180px", overflowY: "auto" }}>
                    {availableToMark.map((name, idx) => {
                      const isSelected = oosSelected.has(name);
                      return (
                        <label
                          key={name}
                          className="flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors"
                          style={{
                            background: isSelected ? "rgba(220,38,38,0.06)" : idx % 2 === 0 ? "var(--t-surface)" : "var(--t-surface2)",
                            borderTop: idx > 0 ? "1px solid var(--t-border)" : undefined,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOos(name)}
                            className="accent-red-600 w-3.5 h-3.5 shrink-0"
                          />
                          <span className="text-xs" style={{ color: "var(--t-text)" }}>{name}</span>
                          {partiallyOosNames.has(name) && (
                            <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(220,38,38,0.08)", color: "#DC2626" }}>partial OOS</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
                {oosError && <p className="text-[11px] font-medium" style={{ color: "#DC2626" }}>{oosError}</p>}
                {oosResult && (
                  <p className="text-[11px] font-medium px-3 py-2 rounded-lg" style={{ background: "rgba(22,163,74,0.08)", color: "#16A34A", border: "1px solid rgba(22,163,74,0.2)" }}>
                    Done — {oosResult.affectedLineItems} line item{oosResult.affectedLineItems !== 1 ? "s" : ""} marked OOS across {oosResult.affectedOrders} order{oosResult.affectedOrders !== 1 ? "s" : ""}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={submitOos}
                    disabled={oosSubmitting || oosSelected.size === 0}
                    className="h-8 px-4 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50"
                    style={{ background: "#DC2626" }}
                  >
                    {oosSubmitting && <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>}
                    {oosSubmitting ? "Marking OOS…" : `Mark as OOS${oosSelected.size > 0 ? ` (${oosSelected.size})` : ""}`}
                  </button>
                  {oosSelected.size > 0 && (
                    <button onClick={() => setOosSelected(new Set())} className="text-[11px]" style={{ color: "var(--t-muted)" }}>Clear</button>
                  )}
                </div>
              </div>

              {/* ── Restore from OOS section ── */}
              {availableToRestore.length > 0 && (
                <div className="space-y-2 pt-2" style={{ borderTop: "1px solid rgba(220,38,38,0.12)" }}>
                  <p className="text-[11px] font-semibold" style={{ color: "var(--t-text)" }}>Restore from OOS</p>
                  <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
                    Select OOS products to restore. Line items will be re-activated and order totals recalculated.
                  </p>
                  <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(22,163,74,0.25)", maxHeight: "180px", overflowY: "auto" }}>
                    {availableToRestore.map((name, idx) => {
                      const isSelected = unmkSelected.has(name);
                      return (
                        <label
                          key={name}
                          className="flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors"
                          style={{
                            background: isSelected ? "rgba(22,163,74,0.06)" : idx % 2 === 0 ? "var(--t-surface)" : "var(--t-surface2)",
                            borderTop: idx > 0 ? "1px solid var(--t-border)" : undefined,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleUnmk(name)}
                            className="accent-green-600 w-3.5 h-3.5 shrink-0"
                          />
                          <span className="text-xs" style={{ color: "var(--t-text)" }}>{name}</span>
                          <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: partiallyOosNames.has(name) ? "rgba(220,38,38,0.08)" : "rgba(220,38,38,0.12)", color: "#DC2626" }}>
                            {partiallyOosNames.has(name) ? "partial OOS" : "OOS"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {unmkError && <p className="text-[11px] font-medium" style={{ color: "#DC2626" }}>{unmkError}</p>}
                  {unmkResult && (
                    <p className="text-[11px] font-medium px-3 py-2 rounded-lg" style={{ background: "rgba(22,163,74,0.08)", color: "#16A34A", border: "1px solid rgba(22,163,74,0.2)" }}>
                      Restored — {unmkResult.affectedLineItems} line item{unmkResult.affectedLineItems !== 1 ? "s" : ""} back in stock across {unmkResult.affectedOrders} order{unmkResult.affectedOrders !== 1 ? "s" : ""}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={submitUnmarkOos}
                      disabled={unmkSubmitting || unmkSelected.size === 0}
                      className="h-8 px-4 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50"
                      style={{ background: "#16A34A" }}
                    >
                      {unmkSubmitting && <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>}
                      {unmkSubmitting ? "Restoring…" : `Restore${unmkSelected.size > 0 ? ` (${unmkSelected.size})` : ""}`}
                    </button>
                    {unmkSelected.size > 0 && (
                      <button onClick={() => setUnmkSelected(new Set())} className="text-[11px]" style={{ color: "var(--t-muted)" }}>Clear</button>
                    )}
                  </div>
                </div>
              )}

            </div>
          );
        })()}
      </div>
      )}

      {/* Search bar + date range */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by code, @username or amount…"
            className="w-full h-9 pl-9 pr-3 rounded-xl text-xs"
            style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-text)", outline: "none" }}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--t-subtle)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </span>
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--t-subtle)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {/* Order date range */}
        <div className="flex items-center gap-1.5 h-9 px-2.5 rounded-xl text-xs" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}>
          <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--t-subtle)" }} />
          <span className="text-[10px] whitespace-nowrap" style={{ color: "var(--t-subtle)" }}>Order</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="text-xs bg-transparent focus:outline-none w-28"
            style={{ color: "var(--t-text)" }}
            title="Order date from"
          />
          <span style={{ color: "var(--t-subtle)" }}>–</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="text-xs bg-transparent focus:outline-none w-28"
            style={{ color: "var(--t-text)" }}
            title="Order date to"
          />
          {(dateFrom || dateTo) && (
            <button type="button" onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }} style={{ color: "var(--t-subtle)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {/* Payment date range */}
        <div className="flex items-center gap-1.5 h-9 px-2.5 rounded-xl text-xs" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}>
          <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--t-subtle)" }} />
          <span className="text-[10px] whitespace-nowrap" style={{ color: "var(--t-subtle)" }}>Paid</span>
          <input
            type="date"
            value={payDateFrom}
            onChange={e => { setPayDateFrom(e.target.value); setPage(1); }}
            className="text-xs bg-transparent focus:outline-none w-28"
            style={{ color: "var(--t-text)" }}
            title="Payment date from"
          />
          <span style={{ color: "var(--t-subtle)" }}>–</span>
          <input
            type="date"
            value={payDateTo}
            onChange={e => { setPayDateTo(e.target.value); setPage(1); }}
            className="text-xs bg-transparent focus:outline-none w-28"
            style={{ color: "var(--t-text)" }}
            title="Payment date to"
          />
          {(payDateFrom || payDateTo) && (
            <button type="button" onClick={() => { setPayDateFrom(""); setPayDateTo(""); setPage(1); }} style={{ color: "var(--t-subtle)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => { setSortBy(e.target.value as any); setPage(1); }}
          className="h-9 px-2.5 rounded-xl text-xs focus:outline-none"
          style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
        >
          <option value="order_desc">Newest order</option>
          <option value="order_asc">Oldest order</option>
          <option value="pay_desc">Most recent paid</option>
          <option value="pay_asc">First paid</option>
        </select>
      </div>

      {/* ── Status filter — pills on desktop, dropdown on mobile ── */}
      <div className="sm:hidden grid grid-cols-2 gap-2">
        <select value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-xl text-[12px] font-semibold w-full appearance-none"
          style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}>
          {[{ id: "all", label: "All Statuses" }, { id: "paid", label: "Paid" }, { id: "unpaid", label: "Unpaid" }, { id: "pending_confirmation", label: "Pending Confirmation" }, { id: "submitted", label: "Submitted" }, { id: "shipped", label: "Shipped" }].map(f => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
        <select value={paymentMethodFilter} onChange={e => { setPaymentMethodFilter(e.target.value as any); setPage(1); }}
          className="h-9 px-3 rounded-xl text-[12px] font-semibold w-full appearance-none"
          style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}>
          {[{ id: "all", label: "All Methods" }, { id: "revolut", label: "Revolut" }, { id: "paypal", label: "PayPal" }, { id: "anonpay", label: "AnonPay" }, { id: "manual", label: "Crypto" }].map(f => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
        <select value={countryFilter} onChange={e => { setCountryFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-xl text-[12px] font-semibold w-full appearance-none"
          style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}>
          <option value="all">All Countries</option>
          {uniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {gb.countryLegsEnabled && legs.length > 0 && (
          <select value={countryLegFilter} onChange={e => { setCountryLegFilter(e.target.value); setPage(1); }}
            className="h-9 px-3 rounded-xl text-[12px] font-semibold w-full appearance-none"
            style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}>
            <option value="all">All Sub-groups</option>
            {legs.map(l => <option key={l.id} value={l.id}>{l.countryCode} — {l.countryName}</option>)}
          </select>
        )}
      </div>

      {/* ── Status pills — desktop only ── */}
      <div className="hidden sm:flex gap-1.5 flex-wrap">
        {[{ id: "all", label: "All" }, { id: "paid", label: "Paid" }, { id: "unpaid", label: "Unpaid" }, { id: "pending_confirmation", label: "Pending Confirmation" }, { id: "submitted", label: "Submitted" }, { id: "shipped", label: "Shipped" }].map(f => {
          const isActive = filter === f.id;
          const isPending = f.id === "pending_confirmation";
          return (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id); setPage(1); }}
              className="h-7 px-3 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5"
              style={{
                background: isActive ? (isPending ? "#D97706" : "var(--t-blue-deep)") : isPending && pendingConfirmationCount > 0 ? "rgba(217,119,6,0.1)" : "var(--t-surface2)",
                color: isActive ? "#fff" : isPending && pendingConfirmationCount > 0 ? "#D97706" : "var(--t-muted)",
                border: `1px solid ${isActive ? "transparent" : isPending && pendingConfirmationCount > 0 ? "rgba(217,119,6,0.35)" : "var(--t-border)"}`,
              }}
            >
              {f.label}
              {isPending && pendingConfirmationCount > 0 && (
                <span className="text-[9px] font-black px-1 py-0.5 rounded-full min-w-[16px] text-center leading-none" style={{ background: isActive ? "rgba(255,255,255,0.25)" : "rgba(217,119,6,0.2)", color: isActive ? "#fff" : "#D97706" }}>
                  {pendingConfirmationCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="hidden sm:flex gap-1.5 flex-wrap">
        {([
          { id: "all", label: "All Methods", bg: "var(--t-blue-deep)", inactive: "var(--t-surface2)", text: "var(--t-muted)" },
          { id: "revolut", label: "Revolut", bg: "#0666EB", inactive: "rgba(6,102,235,0.1)", text: "#0666EB" },
          { id: "paypal", label: "PayPal", bg: "#003087", inactive: "rgba(0,48,135,0.08)", text: "#003087" },
          { id: "anonpay", label: "AnonPay", bg: "#F97316", inactive: "rgba(249,115,22,0.1)", text: "#F97316" },
          { id: "manual", label: "Crypto", bg: "#64748B", inactive: "var(--t-surface2)", text: "var(--t-muted)" },
        ] as const).map(f => {
          const isActive = paymentMethodFilter === f.id;
          const count = f.id === "all" ? orders.length : orders.filter(o => o.paymentMethod === f.id).length;
          return (
            <button key={f.id} onClick={() => { setPaymentMethodFilter(f.id); setPage(1); }}
              className="h-7 px-3 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5"
              style={{
                background: isActive ? f.bg : f.inactive,
                color: isActive ? "#fff" : f.text,
                border: `1px solid ${isActive ? "transparent" : "var(--t-border)"}`,
              }}>
              {f.label}
              <span className="text-[9px] font-black px-1 py-0.5 rounded-full leading-none" style={{ background: isActive ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.1)", color: isActive ? "#fff" : f.text }}>{count}</span>
            </button>
          );
        })}
      </div>
      <div className="hidden sm:flex gap-1.5 flex-wrap items-center">
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Country</span>
        {[{ id: "all", label: "All" }, ...uniqueCountries.map(c => ({ id: c, label: _countryLabel(c) }))].map(f => {
          const isActive = countryFilter === f.id;
          const rawVals = f.id === "all" ? [] : _countryRawValues(f.id);
          const count = f.id === "all" ? orders.length : orders.filter(o => rawVals.includes(o.shippingCountry ?? o.accountCountry ?? "")).length;
          return (
            <button key={f.id} onClick={() => { setCountryFilter(f.id); setPage(1); }}
              className="h-7 px-3 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5"
              style={{
                background: isActive ? "var(--t-blue-deep)" : "var(--t-surface2)",
                color: isActive ? "#fff" : "var(--t-muted)",
                border: `1px solid ${isActive ? "transparent" : "var(--t-border)"}`,
              }}>
              {f.label}
              <span className="text-[9px] font-black px-1 py-0.5 rounded-full leading-none" style={{ background: isActive ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.1)", color: isActive ? "#fff" : "var(--t-muted)" }}>{count}</span>
            </button>
          );
        })}
        {uniqueCountries.length === 0 && (
          <span className="text-[11px]" style={{ color: "var(--t-subtle)" }}>No country data on orders yet</span>
        )}
      </div>
      {gb.countryLegsEnabled && legs.length > 0 && (
        <div className="hidden sm:flex gap-1.5 flex-wrap items-center">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Sub-group</span>
          {[{ id: "all", label: "All" }, ...legs.map(l => ({ id: l.id, label: `${l.countryCode} — ${l.countryName}` }))].map(f => {
            const isActive = countryLegFilter === f.id;
            const count = f.id === "all" ? orders.length : orders.filter(o => o.countryLegId === f.id).length;
            return (
              <button key={f.id} onClick={() => { setCountryLegFilter(f.id); setPage(1); }}
                className="h-7 px-3 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5"
                style={{
                  background: isActive ? "var(--t-blue-deep)" : "var(--t-surface2)",
                  color: isActive ? "#fff" : "var(--t-muted)",
                  border: `1px solid ${isActive ? "transparent" : "var(--t-border)"}`,
                }}>
                {f.label}
                <span className="text-[9px] font-black px-1 py-0.5 rounded-full leading-none" style={{ background: isActive ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.1)", color: isActive ? "#fff" : "var(--t-muted)" }}>{count}</span>
              </button>
            );
          })}
        </div>
      )}
      {/* ── Add Intl Shipping Panel (visible when a specific country is filtered) ── */}
      {countryFilter !== "all" && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(27,58,122,0.25)", background: "rgba(27,58,122,0.04)" }}>
          <button
            className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-blue-50/20"
            onClick={() => { setIntlShipOpen(p => !p); setIntlShipResult(null); setIntlShipError(""); }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(27,58,122,0.12)", color: "var(--t-blue-deep)" }}>✈ INTL SHIPPING</span>
              <span className="text-[12px] font-semibold" style={{ color: "var(--t-blue-deep)" }}>
                Add International Shipping — {_countryLabel(countryFilter)}
              </span>
              {intlShipTargetingSubset ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(5,150,105,0.12)", color: "#059669" }}>
                  {intlShipTargetOrders.length} of {filteredOrders.length} selected
                </span>
              ) : (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.06)", color: "var(--t-muted)" }}>
                  all {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {intlShipOpen
              ? <ChevronUp className="w-4 h-4" style={{ color: "var(--t-muted)" }} />
              : <ChevronDown className="w-4 h-4" style={{ color: "var(--t-muted)" }} />}
          </button>
          {intlShipOpen && (
            <div className="px-4 pb-4 pt-1 space-y-3" style={{ borderTop: "1px solid rgba(27,58,122,0.12)" }}>
              <p className="text-xs" style={{ color: "var(--t-muted)" }}>
                Select a rate to set <strong>delivery price</strong> on{" "}
                {intlShipTargetingSubset
                  ? <><strong>{intlShipTargetOrders.length} selected</strong> of {filteredOrders.length} {_countryLabel(countryFilter)} order{filteredOrders.length !== 1 ? "s" : ""}</>
                  : <>all {filteredOrders.length} {_countryLabel(countryFilter)} order{filteredOrders.length !== 1 ? "s" : ""}</>
                }. Tick rows below to narrow the selection. This overwrites any existing delivery price.
              </p>
              {intlShipRates.length === 0 && intlShipParcelSizes.length === 0 ? (
                <p className="text-xs italic" style={{ color: "var(--t-subtle)" }}>
                  No international shipping rates configured for this group buy. Add rates in the Intl Shipping tab first.
                </p>
              ) : intlShipRates.length === 0 ? (
                <p className="text-xs italic" style={{ color: "var(--t-subtle)" }}>
                  No rates found for {_countryLabel(countryFilter)}. Check the Intl Shipping tab.
                </p>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--t-muted)" }}>Select Shipping Rate</label>
                  <select
                    value={intlShipRateId}
                    onChange={e => { setIntlShipRateId(e.target.value); setIntlShipResult(null); }}
                    className="w-full rounded-xl px-3 py-2 text-sm appearance-none"
                    style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}
                  >
                    <option value="">— Choose a rate —</option>
                    {(() => {
                      const sym = gb.currency === "USD" ? "$" : gb.currency === "EUR" ? "€" : "£";
                      const sizeMap = new Map(intlShipParcelSizes.map(s => [s.id, s]));
                      const grouped = new Map<string, typeof intlShipRates>();
                      for (const r of intlShipRates) {
                        const sId = r.parcelSizeId;
                        if (!grouped.has(sId)) grouped.set(sId, []);
                        grouped.get(sId)!.push(r);
                      }
                      return [...grouped.entries()].map(([sId, rates]) => {
                        const size = sizeMap.get(sId);
                        const label = size ? `${size.name}${size.qtyLabel ? ` (${size.qtyLabel})` : ""}` : "Standard";
                        return (
                          <optgroup key={sId} label={label}>
                            {rates.map(r => {
                              const price = gb.currency === "USD" ? r.priceUsd : gb.currency === "EUR" ? r.priceEur : r.priceGbp;
                              const regionPart = r.region ? ` · ${r.region}` : "";
                              return (
                                <option key={r.id} value={r.id}>
                                  {sym}{parseFloat(price).toFixed(2)} — {r.carrier}{regionPart}
                                </option>
                              );
                            })}
                          </optgroup>
                        );
                      });
                    })()}
                  </select>
                </div>
              )}
              {/* Paid / Unpaid toggle */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--t-muted)" }}>
                  Payment Status
                </label>
                <div
                  className="inline-flex rounded-xl p-0.5 w-full sm:w-auto"
                  style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}
                  role="radiogroup"
                  aria-label="Shipping payment status"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!intlShipPaid}
                    onClick={() => { setIntlShipPaid(false); setIntlShipResult(null); }}
                    className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: !intlShipPaid ? "#fff" : "transparent",
                      color: !intlShipPaid ? "#B45309" : "var(--t-muted)",
                      boxShadow: !intlShipPaid ? "0 1px 2px rgba(0,0,0,0.06)" : undefined,
                    }}
                  >
                    Unpaid · adds to balance
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={intlShipPaid}
                    onClick={() => { setIntlShipPaid(true); setIntlShipResult(null); }}
                    className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: intlShipPaid ? "#fff" : "transparent",
                      color: intlShipPaid ? "#059669" : "var(--t-muted)",
                      boxShadow: intlShipPaid ? "0 1px 2px rgba(0,0,0,0.06)" : undefined,
                    }}
                  >
                    Paid · already covered
                  </button>
                </div>
                <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>
                  {intlShipPaid
                    ? "Customer is treated as having already paid for this shipping. Order total updates, no outstanding balance is recorded."
                    : "The shipping charge will be added to the customer's outstanding balance — they'll need to pay the difference."}
                </p>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={intlShipNotify}
                  onChange={e => setIntlShipNotify(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-blue-600"
                />
                <span className="text-xs font-medium" style={{ color: "var(--t-text)" }}>
                  Notify {intlShipTargetingSubset ? `the ${intlShipTargetOrders.length} selected` : `all ${intlShipTargetOrders.length}`} member{intlShipTargetOrders.length !== 1 ? "s" : ""} via Telegram
                  {intlShipPaid ? " (info only — no payment requested)" : " (request payment of the difference)"}
                </span>
              </label>
              {intlShipError && (
                <p className="text-xs font-medium" style={{ color: "#dc2626" }}>{intlShipError}</p>
              )}
              {intlShipResult && (
                <p className="text-xs font-medium px-3 py-2 rounded-lg" style={{ background: "rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.2)", color: "#059669" }}>
                  Done — shipping applied to {intlShipResult.updatedCount} order{intlShipResult.updatedCount !== 1 ? "s" : ""}
                  {" "}({intlShipResult.currency === "USD" ? "$" : intlShipResult.currency === "EUR" ? "€" : "£"}{Number(intlShipResult.ratePrice).toFixed(2)} each)
                  {" — "}
                  {intlShipResult.paid ? "marked paid" : "added to outstanding balance"}
                </p>
              )}
              <button
                onClick={handleApplyIntlShipping}
                disabled={intlShipSubmitting || !intlShipRateId || intlShipTargetOrders.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-opacity disabled:opacity-40"
                style={{ background: "var(--t-blue-deep)", color: "#fff" }}
              >
                {intlShipSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {intlShipSubmitting ? "Applying…" : `Apply to ${intlShipTargetOrders.length} order${intlShipTargetOrders.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          )}
        </div>
      )}

      {filteredOrders.length === 0 && <div className="flex flex-col items-center py-12 space-y-2"><ShoppingBag className="w-8 h-8" style={{ color: "var(--t-border)" }} /><p className="text-sm" style={{ color: "var(--t-subtle)" }}>No orders{q ? " matching your search" : ""}</p></div>}
      {filteredOrders.length > 0 && (
        <div className="flex items-center gap-2 py-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-3.5 h-3.5 rounded accent-blue-600"
              checked={filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.has(o.id))}
              onChange={e => {
                setSelectedOrderIds(prev => {
                  const next = new Set(prev);
                  if (e.target.checked) { filteredOrders.forEach(o => next.add(o.id)); }
                  else { filteredOrders.forEach(o => next.delete(o.id)); }
                  return next;
                });
              }}
            />
            <span className="text-[11px] font-semibold" style={{ color: "var(--t-muted)" }}>
              {selectedOrderIds.size > 0 ? `${selectedOrderIds.size} selected` : `Select all (${filteredOrders.length})`}
            </span>
          </label>
          {selectedOrderIds.size > 0 && (
            <>
              <button
                className="text-[11px] font-semibold underline"
                style={{ color: "var(--t-subtle)" }}
                onClick={() => setSelectedOrderIds(new Set())}
              >Clear</button>
              <button
                className="h-6 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1"
                style={{ background: "var(--t-blue-10)", border: "1px solid var(--t-blue-15, rgba(27,58,122,0.2))", color: "var(--t-blue-deep)" }}
                onClick={() => {
                  setBulkAddOpen(v => !v);
                  setBulkAddResult(null);
                  setBulkAddError("");
                  if (gbProducts.length === 0) {
                    fetch(`/api/organiser/group-buys/${gb.id}/products`, { credentials: "include" })
                      .then(r => r.ok ? r.json() : [])
                      .then((d: OrgProduct[]) => setGbProducts(d))
                      .catch(() => {});
                  }
                }}
              >
                <Plus className="w-3 h-3" /> Add Product to Selected
              </button>
            </>
          )}
        </div>
      )}
      {bulkAddOpen && selectedOrderIds.size > 0 && (
        <div className="rounded-xl p-3 space-y-2.5" style={{ background: "var(--t-surface)", border: "1.5px solid var(--t-blue-15, rgba(27,58,122,0.2))" }}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--t-muted)" }}>
              Add Product to {selectedOrderIds.size} Selected Order{selectedOrderIds.size !== 1 ? "s" : ""}
            </p>
            <button onClick={() => { setBulkAddOpen(false); setBulkAddResult(null); setBulkAddError(""); }} style={{ color: "var(--t-muted)" }}><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex items-end gap-2 flex-wrap">
            <div className="flex-1 min-w-48 space-y-1">
              <p className="text-[11px] font-medium" style={{ color: "var(--t-muted)" }}>Product</p>
              <select
                className="w-full h-8 rounded-lg text-xs px-2"
                style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
                value={bulkAddProductId}
                onChange={e => setBulkAddProductId(e.target.value)}
              >
                <option value="">— select product —</option>
                {gbProducts.filter(p => p.active).map(p => (
                  <option key={p.id} value={p.id}>{p.name}{p.mgSize ? ` ${p.mgSize}` : ""} — {gb.currency}{Number(p.price).toFixed(2)}</option>
                ))}
              </select>
            </div>
            <div className="w-20 space-y-1">
              <p className="text-[11px] font-medium" style={{ color: "var(--t-muted)" }}>Qty</p>
              <input
                type="number" min="0.5" step="0.5"
                className="w-full h-8 rounded-lg text-xs px-2"
                style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
                value={bulkAddQty}
                onChange={e => setBulkAddQty(e.target.value)}
              />
            </div>
            <button
              disabled={!bulkAddProductId || bulkAddSubmitting}
              onClick={handleBulkAddProduct}
              className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              style={{ background: "var(--t-blue-deep)", color: "#fff" }}
            >
              {bulkAddSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {bulkAddSubmitting ? "Adding…" : "Confirm"}
            </button>
          </div>
          {bulkAddError && <p className="text-[11px] font-medium" style={{ color: "#dc2626" }}>{bulkAddError}</p>}
          {bulkAddResult && (
            <p className="text-[11px] font-medium" style={{ color: bulkAddResult.added > 0 ? "#16a34a" : "var(--t-muted)" }}>
              {bulkAddResult.added > 0
                ? `✓ Added "${bulkAddResult.productName}" to ${bulkAddResult.added} order${bulkAddResult.added !== 1 ? "s" : ""}${bulkAddResult.skipped > 0 ? ` (${bulkAddResult.skipped} already had it)` : ""}`
                : `All selected orders already have "${bulkAddResult.productName}"`}
            </p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {displayOrders.map((o, _idx) => {
          const _d = new Date(o.createdAt);
          const date = _d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            + " · " + _d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
          const isPaid = o.paymentStatus === "confirmed";
          const isTestPaid = o.paymentStatus === "test_confirmed";
          const isEditing = editOpen.has(o.id);
          const edit = edits[o.id];
          const pmLabel = (m: string) => m === "revolut" ? "Revolut" : m === "paypal" ? "PayPal" : m === "anonpay" ? "AnonPay" : "Crypto";
          const pmColor = (m: string) => m === "revolut" ? "#0666EB" : m === "paypal" ? "#003087" : m === "anonpay" ? "#F97316" : "#64748B";
          const thisCountry = o.shippingCountry ?? o.accountCountry ?? "";
          const thisCanonical = thisCountry ? _canonicalCountry(thisCountry) : "";
          const prevCountry = _idx > 0 ? (displayOrders[_idx - 1].shippingCountry ?? displayOrders[_idx - 1].accountCountry ?? "") : null;
          const prevCanonical = prevCountry ? _canonicalCountry(prevCountry) : null;
          const showHeader = showCountryHeaders && thisCanonical !== prevCanonical;
          const countryGroupRawVals = showCountryHeaders ? _countryRawValues(thisCanonical) : [];
          const countryGroupCount = showCountryHeaders ? filteredOrders.filter(x => countryGroupRawVals.includes(x.shippingCountry ?? x.accountCountry ?? "")).length : 0;
          return (
            <React.Fragment key={o.id}>
              {showHeader && (
                <div className="flex items-center gap-2 pb-1" style={{ marginTop: _idx > 0 ? 12 : 0 }}>
                  <span className="text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: "var(--t-muted)" }}>{resolveCountry(thisCountry) || "Unknown"}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "var(--t-blue-10)", color: "var(--t-blue-deep)" }}>{countryGroupCount}</span>
                  <div className="flex-1 h-px" style={{ background: "var(--t-border)" }} />
                </div>
              )}
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
              {/* ── Header strip ── */}
              <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: selectedOrderIds.has(o.id) ? "rgba(27,58,122,0.10)" : "var(--t-surface2)" }}>
                {/* Row 1: badges + tx */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px 0", flexWrap: "wrap" }}>
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded accent-blue-600 shrink-0 cursor-pointer"
                    checked={selectedOrderIds.has(o.id)}
                    onChange={e => {
                      setSelectedOrderIds(prev => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(o.id); else next.delete(o.id);
                        return next;
                      });
                    }}
                    onClick={ev => ev.stopPropagation()}
                  />
                  <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)", padding: "2px 8px", borderRadius: 6 }}>#{o.code}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "rgba(255,255,255,0.07)", color: "#94a3b8" }}>{o.status}</span>
                  {o.orderType === "test" && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "rgba(249,115,22,0.15)", color: "#F97316", border: "1px solid rgba(249,115,22,0.3)" }}>🧪 TEST</span>}
                  {o.paymentMethod && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: "#fff", background: pmColor(o.paymentMethod) }}>{pmLabel(o.paymentMethod)}</span>}
                  {o.amountDue > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 20,
                        background: "rgba(180,83,9,0.12)",
                        color: "#B45309",
                        border: "1px solid rgba(180,83,9,0.3)",
                      }}
                      title="Outstanding balance — customer owes this amount on top of any prior payment"
                    >
                      Owes {gb.currency} {o.amountDue.toFixed(2)}
                    </span>
                  )}
                  {o.amountDue > 0 && o.balancePaymentStatus === "confirmed" && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 20,
                        background: "rgba(16,185,129,0.15)",
                        color: "#10B981",
                        border: "1px solid rgba(16,185,129,0.35)",
                      }}
                      title="Outstanding balance verified / confirmed"
                    >
                      Balance paid ✓
                    </span>
                  )}
                  {o.amountDue > 0 && o.balancePaymentStatus === "pending_confirmation" && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 20,
                        background: "rgba(245,158,11,0.15)",
                        color: "#F59E0B",
                        border: "1px solid rgba(245,158,11,0.35)",
                      }}
                      title={`Balance payment submitted${o.balanceTxHash ? ` (${o.balanceTxHash.startsWith("anonpay:") ? "AnonPay" : o.balanceTxHash.startsWith("fiat:") ? o.balanceTxHash.slice(5) : "crypto TX"})` : ""} — awaiting confirmation`}
                    >
                      Balance pending…
                    </span>
                  )}
                  {o.hasBalanceScreenshot && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const r = await fetch(`/api/organiser/group-buys/${gb.id}/orders/${o.id}/balance-screenshot`, { credentials: "include" });
                          const d = await r.json();
                          if (d.balanceScreenshot) setBalanceProofUrl(d.balanceScreenshot);
                        } catch {}
                      }}
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 20,
                        background: "rgba(5,150,105,0.12)",
                        color: "#059669",
                        border: "1px solid rgba(5,150,105,0.3)",
                        cursor: "pointer",
                      }}
                      title="Customer uploaded a payment screenshot for their outstanding balance"
                    >
                      Balance proof ✓
                    </button>
                  )}
                  {o.testPaymentTxHash && <span className="font-mono text-[10px] select-all" style={{ color: "var(--t-muted)" }} title={`Test TX: ${o.testPaymentTxHash}`}>test:{o.testPaymentTxHash.length > 10 ? o.testPaymentTxHash.slice(0, 10) + "…" : o.testPaymentTxHash}</span>}
                  {o.paymentTxHash && <span className="font-mono text-[10px] select-all" style={{ color: "var(--t-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }} title={o.paymentTxHash}>{o.testPaymentTxHash ? "rem:" : ""}{o.paymentTxHash.length > 10 ? o.paymentTxHash.slice(0, 10) + "…" : o.paymentTxHash}</span>}
                </div>
                {/* Row 2: username large + country + qty + amount + edit */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 14px 8px", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--t-blue-deep)", letterSpacing: "-0.3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{o.telegramUsername.replace(/^@/, "")}</span>
                    {o.shippingCountry && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: "rgba(255,255,255,0.07)", color: "#94a3b8", whiteSpace: "nowrap", flexShrink: 0, border: "1px solid rgba(255,255,255,0.08)" }}>
                        {resolveCountry(o.shippingCountry)}
                      </span>
                    )}
                    {o.lineItems.length > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "rgba(45,107,204,0.18)", color: "#60a5fa", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {o.lineItems.reduce((s, li) => s + li.quantity, 0)}×
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--t-text)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.3px" }}>{gb.currency} {o.grandTotal.toFixed(2)}</p>
                      {(o.adminFee ?? 0) > 0 && (
                        <p style={{ margin: "1px 0 0", fontSize: 9, fontWeight: 600, color: "#A78BFA", letterSpacing: "0.02em" }}>
                          incl. {gb.currency}{(o.adminFee!).toFixed(2)} {o.adminFeeLabel ?? "admin fee"}
                        </p>
                      )}
                      <span style={{ fontSize: 10, fontWeight: 700, color: isPaid ? "#059669" : isTestPaid ? "#F97316" : "#94A3B8" }}>
                        {isPaid ? "Paid ✓" : isTestPaid ? `Test ✓ · Rem: ${gb.currency}${(o.grandTotal - (o.paymentTestAmount ?? 0)).toFixed(2)}` : o.paymentStatus.replace(/_/g, " ")}
                      </span>
                    </div>
                    {(gb.organiserOrderEditEnabled || gb.organiserCanEditPaymentStatus) ? (
                      <button
                        onClick={() => isEditing ? closeEdit(o.id) : openEdit(o)}
                        style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: isEditing ? "rgba(220,38,38,0.07)" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", flexShrink: 0 }}
                        title={isEditing ? "Cancel edit" : "Edit order"}
                      >
                        {isEditing ? <X className="w-3.5 h-3.5" style={{ color: "#DC2626" }} /> : <Pencil className="w-3.5 h-3.5" style={{ color: "var(--t-muted)" }} />}
                      </button>
                    ) : (
                      <button
                        disabled
                        style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", cursor: "not-allowed", flexShrink: 0, opacity: 0.4 }}
                        title="Order editing is not enabled for this GB — contact admin"
                      >
                        <Pencil className="w-3.5 h-3.5" style={{ color: "var(--t-muted)" }} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Split panel body (hidden when editing) ── */}
              {!isEditing && (
                <div className="flex flex-col sm:flex-row">
                  {/* Left: payment proof — below items on mobile, left sidebar on desktop */}
                  <div className="sm:w-48 w-full sm:border-r border-t sm:border-t-0 order-2 sm:order-1" style={{ borderColor: "rgba(255,255,255,0.06)", padding: 14, display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                    <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#059669", margin: 0 }}>Payment Proof</p>
                    {(() => {
                      const sc = orderScreenshots[o.id];
                      if (sc === "loading") return <span style={{ fontSize: 10, color: "#475569" }}>Loading…</span>;
                      if (typeof sc === "string") return (
                        <ImageLightbox
                          src={sc}
                          alt="Payment screenshot"
                          wrapperClassName="rounded-xl overflow-hidden border group relative cursor-zoom-in"
                          wrapperStyle={{ borderColor: "rgba(251,191,36,0.35)" }}
                          thumbnailClassName="w-full h-auto block"
                          thumbnailStyle={{ maxHeight: 170, objectFit: "cover" as const }}
                        />
                      );
                      if (sc === null) return <span style={{ fontSize: 10, color: "#475569" }}>No screenshot</span>;
                      if (o.hasPaymentScreenshot) return (
                        <button
                          onClick={() => {
                            setOrderScreenshots(prev => ({ ...prev, [o.id]: "loading" }));
                            fetch(`/api/organiser/group-buys/${gb.id}/orders/${o.id}/screenshot`, { credentials: "include" })
                              .then(r => r.json())
                              .then(d => setOrderScreenshots(prev => ({ ...prev, [o.id]: d.paymentScreenshot ?? null })))
                              .catch(() => setOrderScreenshots(prev => ({ ...prev, [o.id]: null })));
                          }}
                          style={{ fontSize: 10, padding: "4px 10px", borderRadius: 8, background: "rgba(5,150,105,0.12)", color: "#059669", border: "1px solid rgba(5,150,105,0.25)", cursor: "pointer", fontWeight: 600 }}
                        >View proof</button>
                      );
                      return <span style={{ fontSize: 10, color: "#475569" }}>No screenshot</span>;
                    })()}
                    {o.testPaymentTxHash && (
                      <div style={{ borderRadius: 8, padding: "6px 9px", background: "rgba(100,116,139,0.07)", border: "1px solid rgba(100,116,139,0.18)" }}>
                        <p style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748B", margin: "0 0 2px" }}>Test TX{o.paymentTestAmount != null ? ` · ${gb.currency}${o.paymentTestAmount.toFixed(2)}` : ""}</p>
                        <p style={{ fontSize: 10, fontFamily: "monospace", color: "var(--t-text)", margin: 0, wordBreak: "break-all" }}>{o.testPaymentTxHash}</p>
                      </div>
                    )}
                    {o.paymentTxHash && (
                      <div style={{ borderRadius: 8, padding: "6px 9px", background: "rgba(100,116,139,0.07)", border: "1px solid rgba(100,116,139,0.18)" }}>
                        <p style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748B", margin: "0 0 2px" }}>{o.testPaymentTxHash ? `Remaining TX · ${gb.currency}${(o.grandTotal - (o.paymentTestAmount ?? 0)).toFixed(2)}` : "Transaction ID"}</p>
                        <p style={{ fontSize: 10, fontFamily: "monospace", color: "var(--t-text)", margin: 0, wordBreak: "break-all" }}>{o.paymentTxHash}</p>
                      </div>
                    )}
                    {o.inpostQrCode && (
                      <div>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "var(--t-muted)", margin: "0 0 4px" }}>Delivery QR</p>
                        <ImageLightbox src={o.inpostQrCode} alt="Delivery QR Code" wrapperClassName="inline-block rounded-xl overflow-hidden border group relative cursor-zoom-in" wrapperStyle={{ borderColor: "rgba(99,102,241,0.35)", maxWidth: 100 }} thumbnailClassName="w-full h-auto block" thumbnailStyle={{ maxHeight: 80, objectFit: "contain" as const }} />
                      </div>
                    )}
                  </div>

                  {/* Right: order details + items — first on mobile, right on desktop */}
                  <div className="order-1 sm:order-2" style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", gap: 9, minWidth: 0 }}>
                    {/* Date · country (username already shown in header) */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, color: "var(--t-subtle)" }}>{date}</span>
                      {o.shippingCountry && (
                        <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--t-muted)", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>🌍 {o.shippingCountry}</span>
                      )}
                    </div>
                    {/* Tracking */}
                    {o.trackingNumber && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--t-blue)" }}>
                        <Truck className="w-3 h-3" /><span style={{ fontFamily: "monospace", fontWeight: 700 }}>{o.trackingNumber}</span>
                      </div>
                    )}
                    {/* Notes */}
                    {o.adminNotes && <p style={{ fontSize: 11, fontStyle: "italic", color: "var(--t-subtle)", margin: 0 }}>📝 {o.adminNotes}</p>}
                    {o.notes && <p style={{ fontSize: 11, color: "var(--t-muted)", margin: 0 }}>💬 {o.notes}</p>}
                    {/* Lab test */}
                    {o.testingContribution != null && o.testingContribution > 0 && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600, background: "rgba(126,34,206,0.1)", color: "#7E22CE", border: "1px solid rgba(126,34,206,0.2)", width: "fit-content" }}>🧪 Lab test: {gb.currency}{o.testingContribution.toFixed(2)}</span>
                    )}
                    {/* Shipping address */}
                    {(o.shippingName || o.shippingAddress) && (
                      <div style={{ borderRadius: 8, padding: "7px 10px", background: "rgba(27,58,122,0.04)", border: "1px solid rgba(27,58,122,0.12)" }}>
                        <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--t-blue)", margin: "0 0 3px" }}>📦 Delivery Address</p>
                        {o.shippingName && <p style={{ fontSize: 11, fontWeight: 600, color: "var(--t-text)", margin: 0 }}>{o.shippingName}</p>}
                        {o.shippingAddress && <p style={{ fontSize: 11, color: "var(--t-muted)", whiteSpace: "pre-line", margin: 0 }}>{o.shippingAddress}</p>}
                      </div>
                    )}
                    {/* Items — always visible */}
                    <div>
                      <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#059669", margin: "0 0 6px" }}>Items</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {o.lineItems.map((li, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 9px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", opacity: li.isOos ? 0.55 : 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#059669", background: "rgba(5,150,105,0.12)", borderRadius: 4, padding: "1px 6px", flexShrink: 0, textDecoration: li.isOos ? "line-through" : "none" }}>{li.quantity}×</span>
                              <span style={{ fontSize: 11, color: "var(--t-text)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: li.isOos ? "line-through" : "none" }}>{li.productName}</span>
                              {li.isOos && <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 10, background: "rgba(220,38,38,0.1)", color: "#DC2626", flexShrink: 0 }}>OOS</span>}
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--t-text)", fontVariantNumeric: "tabular-nums", flexShrink: 0, textDecoration: li.isOos ? "line-through" : "none" }}>{gb.currency} {li.lineTotal.toFixed(2)}</span>
                          </div>
                        ))}
                        {o.deliveryPrice > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 9px 0", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 2 }}>
                            <span style={{ fontSize: 10, color: "var(--t-subtle)" }}>Shipping</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--t-muted)", fontVariantNumeric: "tabular-nums" }}>{gb.currency} {o.deliveryPrice.toFixed(2)}</span>
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 9px 0", marginTop: 2 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--t-text)" }}>Total</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#059669", fontVariantNumeric: "tabular-nums" }}>{gb.currency} {o.grandTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    {/* Reshipper */}
                    {o.reshipperUsername && (
                      <div style={{ padding: "6px 9px", borderRadius: 8, background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.2)", display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 9, color: "#059669", fontWeight: 600 }}>↻ Reshipper</span>
                        <span style={{ fontSize: 10, color: "var(--t-muted)" }}>@{o.reshipperUsername}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Edit form */}
              <AnimatePresence initial={false}>
                {isEditing && edit && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t" style={{ borderColor: "var(--t-border)" }}>
                    <div className="px-4 py-3 space-y-3" style={{ background: "var(--t-surface2)" }}>
                      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--t-blue-deep)" }}>Edit Order #{o.code}</p>
                      {o.testPaymentTxHash && (
                        <div className="rounded-xl px-3 py-2" style={{ background: "rgba(100,116,139,0.07)", border: "1px solid rgba(100,116,139,0.18)" }}>
                          <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#64748B" }}>
                            Test TX{o.paymentTestAmount != null ? ` · ${gb.currency}${o.paymentTestAmount.toFixed(2)}` : ""}
                          </p>
                          <p className="font-mono text-[11px] break-all select-all" style={{ color: "var(--t-text)" }}>{o.testPaymentTxHash}</p>
                        </div>
                      )}
                      {o.paymentTxHash && (
                        <div className="rounded-xl px-3 py-2" style={{ background: "rgba(100,116,139,0.07)", border: "1px solid rgba(100,116,139,0.18)" }}>
                          <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#64748B" }}>
                            {o.testPaymentTxHash ? `Remaining TX · ${gb.currency}${(o.grandTotal - (o.paymentTestAmount ?? 0)).toFixed(2)}` : "Transaction ID"}
                          </p>
                          <p className="font-mono text-[11px] break-all select-all" style={{ color: "var(--t-text)" }}>{o.paymentTxHash}</p>
                        </div>
                      )}
                      {(gb.organiserCanEditStatus || gb.organiserCanEditPaymentStatus) && (
                        <div className="grid grid-cols-2 gap-2">
                          {gb.organiserCanEditStatus && (
                            <div>
                              <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--t-muted)" }}>Status</label>
                              <select
                                value={edit.status}
                                onChange={e => updateEdit(o.id, "status", e.target.value)}
                                className="w-full h-8 px-2 rounded-lg text-xs"
                                style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)", outline: "none" }}
                              >
                                {ORDER_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                          )}
                          {gb.organiserCanEditPaymentStatus && (
                            <div>
                              <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--t-muted)" }}>Payment Status</label>
                              <select
                                value={edit.paymentStatus}
                                onChange={e => updateEdit(o.id, "paymentStatus", e.target.value)}
                                className="w-full h-8 px-2 rounded-lg text-xs"
                                style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)", outline: "none" }}
                              >
                                {PAYMENT_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                      {gb.organiserCanEditTracking && (
                        <div>
                          <label className="block text-[10px] font-bold mb-1.5" style={{ color: "var(--t-muted)" }}>Tracking Numbers</label>
                          <div className="space-y-1">
                            {(edit.trackingNumbers.length ? edit.trackingNumbers : [""]).map((v, i, arr) => (
                              <div key={i} className="flex gap-1">
                                <input
                                  value={v}
                                  onChange={e => { const n = [...arr]; n[i] = e.target.value; updateEdit(o.id, "trackingNumbers", n); }}
                                  placeholder={i === 0 ? "Enter tracking number…" : "Additional tracking…"}
                                  className="flex-1 h-8 px-2 rounded-lg text-xs font-mono"
                                  style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)", outline: "none" }}
                                />
                                {arr.length > 1 && (
                                  <button type="button" className="h-8 w-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600"
                                    style={{ border: "1px solid var(--t-border)", background: "var(--t-surface)" }}
                                    onClick={() => updateEdit(o.id, "trackingNumbers", arr.filter((_, j) => j !== i))}>
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {edit.trackingNumbers.length < 10 && (
                              <button type="button" className="flex items-center gap-1 text-[10px] font-semibold hover:underline"
                                style={{ color: "var(--t-accent)" }}
                                onClick={() => updateEdit(o.id, "trackingNumbers", [...edit.trackingNumbers, ""])}>
                                <Plus className="w-2.5 h-2.5" /> Add tracking number
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      {gb.organiserCanEditNotes && (
                        <div>
                          <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--t-muted)" }}>Notes (internal)</label>
                          <textarea
                            value={edit.adminNotes}
                            onChange={e => updateEdit(o.id, "adminNotes", e.target.value)}
                            placeholder="Internal notes — not shown to customer…"
                            rows={2}
                            className="w-full px-2 py-1.5 rounded-lg text-xs resize-none"
                            style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)", outline: "none" }}
                          />
                        </div>
                      )}
                      {gb.organiserCanEditTxId && (
                        <div>
                          <label className="block text-[10px] font-bold mb-1.5" style={{ color: "var(--t-muted)" }}>Transaction IDs</label>
                          <div className="space-y-1">
                            {(edit.paymentTxHashes.length ? edit.paymentTxHashes : [""]).map((v, i, arr) => (
                              <div key={i} className="flex gap-1">
                                <input
                                  value={v}
                                  onChange={e => { const n = [...arr]; n[i] = e.target.value; updateEdit(o.id, "paymentTxHashes", n); }}
                                  placeholder={i === 0 ? "Payment transaction hash…" : "Additional TX hash…"}
                                  className="flex-1 h-8 px-2 rounded-lg text-xs font-mono"
                                  style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)", outline: "none" }}
                                />
                                {arr.length > 1 && (
                                  <button type="button" className="h-8 w-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600"
                                    style={{ border: "1px solid var(--t-border)", background: "var(--t-surface)" }}
                                    onClick={() => updateEdit(o.id, "paymentTxHashes", arr.filter((_, j) => j !== i))}>
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {edit.paymentTxHashes.length < 10 && (
                              <button type="button" className="flex items-center gap-1 text-[10px] font-semibold hover:underline"
                                style={{ color: "var(--t-accent)" }}
                                onClick={() => updateEdit(o.id, "paymentTxHashes", [...edit.paymentTxHashes, ""])}>
                                <Plus className="w-2.5 h-2.5" /> Add transaction ID
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      {gb.organiserCanEditQuantities && (
                        <div>
                          <label className="block text-[10px] font-bold mb-2" style={{ color: "var(--t-muted)" }}>Order Quantities</label>
                          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--t-border)" }}>
                            {o.lineItems.map((li) => {
                              const editLi = edit.lineItems.find(e => e.id === li.id);
                              const currentQty = editLi?.quantity ?? li.quantity;
                              const willRemove = currentQty <= 0;
                              const previewTotal = parseFloat((currentQty * li.unitPrice).toFixed(2));
                              return (
                                <div key={li.id} className="flex items-center gap-3 px-3 py-2" style={{ borderBottom: "1px solid var(--t-border)", background: willRemove ? "rgba(220,38,38,0.04)" : "var(--t-surface)", opacity: willRemove ? 0.7 : 1 }}>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs font-medium truncate block" style={{ color: "var(--t-text)", textDecoration: willRemove ? "line-through" : "none" }}>{li.productName}</span>
                                    {willRemove && <span className="text-[10px] font-bold" style={{ color: "#DC2626" }}>Will be removed</span>}
                                  </div>
                                  <span className="text-[10px]" style={{ color: "var(--t-muted)" }}>× {li.unitPrice.toFixed(2)}</span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button type="button" onClick={() => updateLineItemQty(o.id, li.id, Math.max(0, currentQty - 1))} className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold" style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}>−</button>
                                    <input
                                      type="number"
                                      min={0}
                                      step="any"
                                      value={currentQty}
                                      onChange={e => {
                                        const v = parseFloat(e.target.value);
                                        updateLineItemQty(o.id, li.id, isNaN(v) ? 0 : Math.max(0, v));
                                      }}
                                      className="w-14 h-6 px-1 text-center text-xs font-mono rounded"
                                      style={{ background: "var(--t-surface2)", border: `1px solid ${willRemove ? "rgba(220,38,38,0.4)" : "var(--t-border)"}`, color: "var(--t-text)", outline: "none" }}
                                    />
                                    <button type="button" onClick={() => updateLineItemQty(o.id, li.id, currentQty + 1)} className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold" style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}>+</button>
                                  </div>
                                  <span className="text-xs font-semibold tabular-nums w-16 text-right shrink-0" style={{ color: willRemove ? "#DC2626" : previewTotal !== li.lineTotal ? "var(--t-blue-deep)" : "var(--t-muted)" }}>{willRemove ? "—" : `${gb.currency} ${previewTotal.toFixed(2)}`}</span>
                                  <button type="button" onClick={() => updateLineItemQty(o.id, li.id, 0)} className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: willRemove ? "rgba(220,38,38,0.15)" : "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#DC2626", cursor: "pointer" }} title="Remove product">✕</button>
                                </div>
                              );
                            })}
                            {edit.lineItems.filter(li => !li.id && li.productId).map((li) => {
                              const product = gbProducts.find(p => p.id === li.productId);
                              if (!product) return null;
                              const previewTotal = parseFloat((li.quantity * product.price).toFixed(2));
                              return (
                                <div key={li.productId} className="flex items-center gap-3 px-3 py-2" style={{ borderBottom: "1px solid var(--t-border)", background: "rgba(91,141,239,0.05)" }}>
                                  <span className="flex-1 text-xs font-medium truncate" style={{ color: "var(--t-blue-deep)" }}>{product.name} <span className="text-[10px] font-normal" style={{ color: "var(--t-muted)" }}>NEW</span></span>
                                  <span className="text-[10px]" style={{ color: "var(--t-muted)" }}>× {product.price.toFixed(2)}</span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button type="button" onClick={() => { const next = li.quantity - 1; if (next <= 0) removeNewLineItem(o.id, li.productId!); else updateLineItemQty(o.id, li.productId!, next); }} className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold" style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}>−</button>
                                    <input
                                      type="number"
                                      min={0.5}
                                      step="any"
                                      value={li.quantity}
                                      onChange={e => {
                                        const v = parseFloat(e.target.value);
                                        if (isNaN(v) || v <= 0) removeNewLineItem(o.id, li.productId!);
                                        else updateLineItemQty(o.id, li.productId!, v);
                                      }}
                                      className="w-14 h-6 px-1 text-center text-xs font-mono rounded"
                                      style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-text)", outline: "none" }}
                                    />
                                    <button type="button" onClick={() => updateLineItemQty(o.id, li.productId!, li.quantity + 1)} className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold" style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}>+</button>
                                  </div>
                                  <span className="text-xs font-semibold tabular-nums w-16 text-right shrink-0" style={{ color: "var(--t-blue-deep)" }}>{gb.currency} {previewTotal.toFixed(2)}</span>
                                  <button type="button" onClick={() => removeNewLineItem(o.id, li.productId!)} className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#DC2626", cursor: "pointer" }} title="Remove">✕</button>
                                </div>
                              );
                            })}
                            {(() => {
                              const newProductIds = new Set(edit.lineItems.filter(li => !li.id && li.productId).map(li => li.productId!));
                              const existingProductIds = new Set(o.lineItems.map(li => li.productId));
                              const availableProducts = gbProducts.filter(p => p.active && !newProductIds.has(p.id) && !existingProductIds.has(p.id));
                              const pickerVal = addProductPicker[o.id] ?? "";
                              if (gbProducts.length === 0) {
                                return (
                                  <div className="flex items-center gap-2 px-3 py-2" style={{ background: "var(--t-surface2)", borderTop: "1px solid var(--t-border)" }}>
                                    <span className="text-xs" style={{ color: "var(--t-muted)" }}>Loading products…</span>
                                  </div>
                                );
                              }
                              if (availableProducts.length === 0) {
                                return (
                                  <div className="flex items-center gap-2 px-3 py-2" style={{ background: "var(--t-surface2)", borderTop: "1px solid var(--t-border)" }}>
                                    <span className="text-xs" style={{ color: "var(--t-muted)" }}>All GB products are already on this order.</span>
                                  </div>
                                );
                              }
                              return (
                                <div className="flex items-center gap-2 px-3 py-2" style={{ background: "var(--t-surface2)", borderTop: "1px solid var(--t-border)" }}>
                                  <select
                                    value={pickerVal}
                                    onChange={e => setAddProductPicker(prev => ({ ...prev, [o.id]: e.target.value }))}
                                    className="flex-1 h-7 px-2 rounded text-xs"
                                    style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: pickerVal ? "var(--t-text)" : "var(--t-muted)", outline: "none" }}
                                  >
                                    <option value="">+ Add product…</option>
                                    {availableProducts.map(p => (
                                      <option key={p.id} value={p.id}>{p.name}{p.mgSize ? ` — ${p.mgSize}` : ""} ({gb.currency} {p.price.toFixed(2)})</option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    disabled={!pickerVal}
                                    onClick={() => { if (pickerVal) { addNewLineItem(o.id, pickerVal); setAddProductPicker(prev => ({ ...prev, [o.id]: "" })); } }}
                                    className="h-7 px-3 rounded text-xs font-bold shrink-0"
                                    style={{ background: pickerVal ? "var(--t-blue-deep)" : "var(--t-surface)", color: pickerVal ? "#fff" : "var(--t-muted)", border: "1px solid var(--t-border)", cursor: pickerVal ? "pointer" : "not-allowed", opacity: pickerVal ? 1 : 0.5 }}
                                  >Add</button>
                                </div>
                              );
                            })()}
                          </div>
                          <p className="text-[10px] mt-1.5" style={{ color: "var(--t-muted)" }}>Order total will recalculate automatically on save.</p>
                        </div>
                      )}
                      {gbReshippers.length > 0 && (
                        <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(91,141,239,0.06)", border: "1px solid rgba(91,141,239,0.18)" }}>
                          <label className="block text-[10px] font-bold flex items-center gap-1" style={{ color: "var(--t-blue-deep)" }}>
                            <UserCheck className="w-3 h-3" /> Assign Reshipper
                            {o.reshipperUsername && <span className="ml-1 font-normal" style={{ color: "var(--t-muted)" }}>— currently @{o.reshipperUsername}</span>}
                          </label>
                          <div className="flex gap-2">
                            <select
                              value={reassignTarget[o.id] !== undefined ? reassignTarget[o.id] : (o.reshipperUsername ?? "")}
                              onChange={e => setReassignTarget(prev => ({ ...prev, [o.id]: e.target.value }))}
                              className="flex-1 h-8 px-2 rounded-lg text-xs"
                              style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)", outline: "none" }}
                            >
                              <option value="">— No reshipper —</option>
                              {gbReshippers.map(r => (
                                <option key={r.reshipperUsername} value={r.reshipperUsername}>@{r.reshipperUsername}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => reassignReshipper(o)}
                              disabled={reassigning[o.id]}
                              className="h-8 px-3 rounded-lg text-xs font-bold text-white flex items-center gap-1"
                              style={{ background: "var(--t-blue-deep)" }}
                            >
                              {reassigning[o.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                              Assign
                            </button>
                          </div>
                          {reassignResult[o.id]?.text && (
                            <p className="text-[11px] font-semibold" style={{ color: reassignResult[o.id].ok ? "#16A34A" : "#DC2626" }}>
                              {reassignResult[o.id].text}
                            </p>
                          )}
                        </div>
                      )}
                      {/* QR Code Upload */}
                      <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.18)" }}>
                        <label className="block text-[10px] font-bold flex items-center gap-1" style={{ color: "#7C3AED" }}>
                          <QrCode className="w-3 h-3" /> QR Codes
                        </label>
                        {(["inpost", "royal-mail"] as const).map(courier => {
                          const label = courier === "inpost" ? "InPost" : "Royal Mail";
                          const existing = courier === "inpost" ? o.inpostQrCode : o.royalMailQrCode;
                          const key = `${o.id}-${courier}`;
                          const isUploading = orgQrSaving[key];
                          const qrMsg = orgQrMsg[key];
                          return (
                            <div key={courier} className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-semibold w-16 shrink-0" style={{ color: "#7C3AED" }}>{label}</span>
                              {existing ? (
                                <div className="flex items-center gap-2">
                                  <img src={existing} alt={`${label} QR`} className="w-9 h-9 object-contain rounded border bg-white p-0.5" style={{ borderColor: "rgba(124,58,237,0.3)" }} />
                                  <button
                                    className="text-[10px] font-semibold disabled:opacity-50"
                                    style={{ color: "#DC2626" }}
                                    disabled={isUploading}
                                    onClick={() => uploadOrgQr(o.id, courier, null)}
                                  >{isUploading ? "…" : "Clear"}</button>
                                </div>
                              ) : (
                                <label className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors"
                                  style={{ background: isUploading ? "var(--t-surface)" : "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)", color: "#7C3AED", opacity: isUploading ? 0.5 : 1 }}>
                                  <Upload className="w-2.5 h-2.5" />
                                  {isUploading ? "Uploading…" : "Upload"}
                                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" className="hidden"
                                    disabled={isUploading}
                                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadOrgQr(o.id, courier, f); e.target.value = ""; }}
                                  />
                                </label>
                              )}
                              {qrMsg?.text && <span className="text-[10px] font-semibold" style={{ color: qrMsg.ok ? "#16A34A" : "#DC2626" }}>{qrMsg.text}</span>}
                            </div>
                          );
                        })}
                      </div>
                      {saveErr[o.id] && <p className="text-xs text-red-500">{saveErr[o.id]}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(o)}
                          disabled={saving[o.id]}
                          className="h-8 px-4 rounded-lg text-xs font-bold text-white flex items-center gap-1.5"
                          style={{ background: saveOk[o.id] ? "#16A34A" : "var(--t-blue-deep)" }}
                        >
                          {saving[o.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : saveOk[o.id] ? <CheckCircle2 className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                          {saving[o.id] ? "Saving…" : saveOk[o.id] ? "Saved!" : "Save Changes"}
                        </button>
                        <button onClick={() => closeEdit(o.id)} className="h-8 px-3 rounded-lg text-xs font-bold" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>Cancel</button>
                      </div>
                      <div className="border-t pt-3" style={{ borderColor: "var(--t-border)" }}>
                        <label className="block text-[10px] font-bold mb-1 flex items-center gap-1" style={{ color: "var(--t-blue-deep)" }}>
                          <MessageSquare className="w-3 h-3" /> Send Telegram Message to Customer
                        </label>
                        <textarea
                          value={msgTexts[o.id] ?? ""}
                          onChange={e => setMsgTexts(prev => ({ ...prev, [o.id]: e.target.value }))}
                          placeholder="Type a message to send directly to @{o.telegramUsername} via Telegram…"
                          rows={2}
                          className="w-full px-2 py-1.5 rounded-lg text-xs resize-none"
                          style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)", outline: "none" }}
                        />
                        {msgResult[o.id]?.text && (
                          <p className="text-[11px] mt-1 font-semibold" style={{ color: msgResult[o.id].ok ? "#16A34A" : "#DC2626" }}>{msgResult[o.id].text}</p>
                        )}
                        <button
                          onClick={() => sendMsg(o)}
                          disabled={msgSending[o.id] || !(msgTexts[o.id] ?? "").trim()}
                          className="mt-1.5 h-7 px-3 rounded-lg text-[11px] font-bold flex items-center gap-1.5 text-white"
                          style={{ background: "var(--t-blue)", opacity: (msgSending[o.id] || !(msgTexts[o.id] ?? "").trim()) ? 0.5 : 1 }}
                        >
                          {msgSending[o.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <SendHorizonal className="w-3 h-3" />}
                          {msgSending[o.id] ? "Sending…" : "Send Message"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
            </React.Fragment>
          );
        })}
      </div>
      {!showCountryHeaders && totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>
            {(safePage - 1) * ORDERS_PER_PAGE + 1}–{Math.min(safePage * ORDERS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length}
          </p>
          <div className="flex gap-1.5">
            <button disabled={safePage <= 1} onClick={() => setPage(p => p - 1)} className="h-8 px-3 rounded-lg text-xs font-bold disabled:opacity-40" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>‹ Prev</button>
            <span className="h-8 px-3 rounded-lg text-xs font-bold flex items-center" style={{ background: "var(--t-blue-10)", color: "var(--t-blue-deep)" }}>Pg {safePage} / {totalPages}</span>
            <button disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)} className="h-8 px-3 rounded-lg text-xs font-bold disabled:opacity-40" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>Next ›</button>
          </div>
        </div>
      )}
      {/* ── Deleted Orders (Trash) ─────────────────────────────── */}
      <div className="mt-4 rounded-xl overflow-hidden" style={{ border: "1px solid var(--t-border)" }}>
        <button
          className="w-full flex items-center gap-2 px-4 py-3 text-left"
          style={{ background: "var(--t-surface2)" }}
          onClick={() => {
            const next = !showTrash;
            setShowTrash(next);
            if (next && trash.length === 0 && !trashLoading) loadTrash();
          }}
        >
          <span className="text-base">🗑️</span>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--t-muted)" }}>Deleted Orders</span>
          <span className="ml-auto text-xs" style={{ color: "var(--t-subtle)" }}>{showTrash ? "▲" : "▼"}</span>
        </button>

        {showTrash && (
          <div className="p-4 space-y-3" style={{ background: "var(--t-surface)" }}>
            <div className="flex items-center gap-2">
              <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
                Orders deleted within the last 48 hours can be restored. After that they are permanently gone.
              </p>
              <button
                onClick={loadTrash}
                disabled={trashLoading}
                className="ml-auto shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
                style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}
              >
                {trashLoading ? "Loading…" : "Refresh"}
              </button>
            </div>

            {trashError && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>{trashError}</p>
            )}

            {!trashLoading && trash.length === 0 && !trashError && (
              <p className="text-xs text-center py-4" style={{ color: "var(--t-subtle)" }}>No recently deleted orders in this group buy.</p>
            )}

            {trash.map(o => {
              const deletedDate = new Date(o.deletedAt);
              const expiresDate = new Date(o.expiresAt);
              const msLeft = expiresDate.getTime() - Date.now();
              const hoursLeft = Math.max(0, Math.floor(msLeft / 3_600_000));
              const minutesLeft = Math.max(0, Math.floor((msLeft % 3_600_000) / 60_000));
              const expirySoon = hoursLeft < 4;
              const isRestoring = trashRestoring.has(o.id);
              return (
                <div key={o.id} className="rounded-xl p-3 space-y-2" style={{ border: `1px solid ${expirySoon ? "rgba(239,68,68,0.3)" : "var(--t-border)"}`, background: expirySoon ? "rgba(239,68,68,0.04)" : "var(--t-surface2)" }}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold font-mono" style={{ color: "var(--t-fg)" }}>{o.code}</span>
                        <span className="text-xs" style={{ color: "var(--t-muted)" }}>@{o.telegramUsername.replace(/^@/, "")}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>Deleted</span>
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--t-subtle)" }}>
                        Deleted {deletedDate.toLocaleDateString()} {deletedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {o.deletedBy ? ` by ${o.deletedBy}` : ""}
                      </p>
                      <p className="text-[11px]" style={{ color: expirySoon ? "#ef4444" : "var(--t-subtle)" }}>
                        ⏱ Restore window closes in {hoursLeft}h {minutesLeft}m
                      </p>
                    </div>
                    <button
                      onClick={() => handleRestoreOrder(o.id, o.code)}
                      disabled={isRestoring}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50"
                      style={{ background: "var(--t-blue-10)", color: "var(--t-blue-deep)", border: "1px solid rgba(59,130,246,0.2)" }}
                    >
                      {isRestoring ? "Restoring…" : "Restore"}
                    </button>
                  </div>
                  {o.lineItems.length > 0 && (
                    <div className="text-[11px] space-y-0.5 pt-1" style={{ borderTop: "1px solid var(--t-border)" }}>
                      {o.lineItems.map((li, i) => (
                        <p key={i} style={{ color: "var(--t-muted)" }}>• {li.productName} × {li.quantity}</p>
                      ))}
                    </div>
                  )}
                  {o.grandTotal != null && (
                    <p className="text-[11px] font-semibold" style={{ color: "var(--t-fg)" }}>
                      Total: £{Number(o.grandTotal).toFixed(2)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {balanceProofUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 cursor-zoom-out"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setBalanceProofUrl(null)}
        >
          <img src={balanceProofUrl} alt="Balance payment proof" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}

// ─── Parcels Tab (full CRUD) ──────────────────────────────────────────────────

const PARCEL_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#64748B", bg: "rgba(100,116,139,0.1)" },
  in_transit: { label: "In Transit", color: "#D97706", bg: "rgba(217,119,6,0.1)" },
  out_for_delivery: { label: "Out for Delivery", color: "#7C3AED", bg: "rgba(124,58,237,0.1)" },
  attempted: { label: "Attempted", color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  delivered: { label: "Delivered", color: "#16A34A", bg: "rgba(22,163,74,0.1)" },
  exception: { label: "Exception", color: "#DC2626", bg: "rgba(220,38,38,0.1)" },
  expired: { label: "Expired", color: "#9CA3AF", bg: "rgba(156,163,175,0.1)" },
};

function ParcelStatusBadge({ status }: { status: string }) {
  const s = PARCEL_STATUS_LABELS[status] ?? { label: status, color: "#64748B", bg: "rgba(100,116,139,0.1)" };
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
}

function ParcelForm({ parcel, gbId, catalogProducts, onSaved, onCancel }: {
  parcel: OrgParcel | null; gbId: string; catalogProducts: { id: string; name: string }[]; onSaved: () => void; onCancel: () => void;
}) {
  const [form, setForm] = useState({
    label: parcel?.label ?? "",
    carrier: parcel?.carrier ?? "Auto",
    trackingNumber: parcel?.trackingNumber ?? "",
    status: parcel?.status ?? "pending",
    notes: parcel?.notes ?? "",
    trackingUrl: parcel?.trackingUrl ?? "",
  });
  const [trackingParams, setTrackingParams] = useState<Record<string, string>>(parcel?.trackingParams ?? {});
  const [items, setItems] = useState<{ name: string; qty: number; productId?: string }[]>(
    parcel?.items?.map(i => ({ name: i.name, qty: i.qty, productId: i.productId })) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [itemMode, setItemMode] = useState<"catalogue" | "custom" | "paste">("catalogue");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [pasteText, setPasteText] = useState("");

  const carrierCode = CARRIER_CODE_MAP[form.carrier.toLowerCase()] ?? 0;
  const currentParamSpecs: ParamSpec[] = CARRIER_PARAMS[carrierCode] ?? [];

  const handleCarrierChange = (newCarrier: string) => {
    setForm(f => ({ ...f, carrier: newCarrier }));
    const newCode = CARRIER_CODE_MAP[newCarrier.toLowerCase()] ?? 0;
    const newSpecs = CARRIER_PARAMS[newCode] ?? [];
    const validKeys = new Set(newSpecs.map(s => s.key));
    setTrackingParams(prev => {
      const filtered: Record<string, string> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (validKeys.has(k)) filtered[k] = v;
      }
      return filtered;
    });
  };

  const addItem = () => {
    const qty = Math.max(1, parseInt(itemQty) || 1);
    if (itemMode === "catalogue") {
      const prod = catalogProducts.find(p => p.id === selectedProductId);
      if (!prod) return;
      setItems(prev => {
        const existing = prev.findIndex(i => i.productId === prod.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], qty: updated[existing].qty + qty };
          return updated;
        }
        return [...prev, { name: prod.name, qty, productId: prod.id }];
      });
      setSelectedProductId("");
      setProductSearch("");
    } else {
      const name = customItemName.trim();
      if (!name) return;
      setItems(prev => {
        const existing = prev.findIndex(i => !i.productId && i.name.toLowerCase() === name.toLowerCase());
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], qty: updated[existing].qty + qty };
          return updated;
        }
        return [...prev, { name, qty }];
      });
      setCustomItemName("");
    }
    setItemQty("1");
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItemQty = (idx: number, qty: number) => {
    if (qty < 1) { removeItem(idx); return; }
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, qty } : it));
  };

  const parsePaste = () => {
    const lines = pasteText.split(/\n+/).map(l => l.trim()).filter(Boolean);
    const toAdd: { name: string; qty: number; productId?: string }[] = [];
    for (const line of lines) {
      let namePart = line.replace(/^\d+\.\s+/, "").trim();
      let qty = 1;
      const prefixM = namePart.match(/^(\d+)\s*[xX×]\s+(.+)$/);
      const suffixM = namePart.match(/^(.+)\s+[xX×]\s*(\d+)$/);
      if (prefixM) { qty = Math.max(1, parseInt(prefixM[1])); namePart = prefixM[2].trim(); }
      else if (suffixM) { qty = Math.max(1, parseInt(suffixM[2])); namePart = suffixM[1].trim(); }
      if (!namePart) continue;
      const lower = namePart.toLowerCase();
      const matched = catalogProducts.find(p => p.name.toLowerCase() === lower)
        ?? catalogProducts.find(p => p.name.toLowerCase().includes(lower))
        ?? catalogProducts.find(p => lower.includes(p.name.toLowerCase()));
      toAdd.push(matched ? { name: matched.name, qty, productId: matched.id } : { name: namePart, qty });
    }
    setItems(prev => {
      let updated = [...prev];
      for (const item of toAdd) {
        const key = item.productId;
        const existing = key
          ? updated.findIndex(i => i.productId === key)
          : updated.findIndex(i => !i.productId && i.name.toLowerCase() === item.name.toLowerCase());
        if (existing >= 0) updated[existing] = { ...updated[existing], qty: updated[existing].qty + item.qty };
        else updated.push(item);
      }
      return updated;
    });
    setPasteText("");
    setItemMode("catalogue");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim() || !form.trackingNumber.trim()) { setError("Label and tracking number are required"); return; }
    for (const spec of currentParamSpecs) {
      if (spec.required && !trackingParams[spec.key]?.trim()) {
        setError(`${spec.label} is required for ${form.carrier}`);
        return;
      }
    }
    setSaving(true); setError("");
    try {
      const cleanParams: Record<string, string> = {};
      for (const [k, v] of Object.entries(trackingParams)) {
        if (v.trim()) cleanParams[k] = v.trim();
      }
      const body = {
        label: form.label.trim(),
        carrier: form.carrier.trim() || "Auto",
        trackingNumber: form.trackingNumber.trim(),
        status: form.status,
        notes: form.notes.trim() || null,
        trackingUrl: form.trackingUrl.trim() || null,
        trackingParams: Object.keys(cleanParams).length > 0 ? cleanParams : null,
        items: items.filter(i => i.name.trim()).map(i => ({ name: i.name.trim(), qty: i.qty, productId: i.productId })),
      };
      if (parcel) {
        const res = await fetch(`/api/organiser/group-buys/${gbId}/parcels/${parcel.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) { const d = await res.json(); setError(d.error || "Failed"); return; }
      } else {
        const res = await fetch(`/api/organiser/group-buys/${gbId}/parcels`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) { const d = await res.json(); setError(d.error || "Failed"); return; }
      }
      onSaved();
    } catch { setError("Connection error"); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <SectionCard>
        <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{parcel ? "Edit Parcel" : "New Parcel"}</p>
        {error && <ErrorBanner msg={error} />}
        <Field label="Label *"><input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Batch A — UK Members" className={inputCls} style={inputStyle} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tracking Number *"><input value={form.trackingNumber} onChange={e => setForm(f => ({ ...f, trackingNumber: e.target.value }))} placeholder="e.g. TN123456789" className={inputCls} style={inputStyle} /></Field>
          <Field label="Carrier">
            <CarrierInput value={form.carrier} onChange={handleCarrierChange} />
          </Field>
        </div>
        <Field label="Custom Tracking URL" hint="For carriers not on 17track">
          <input value={form.trackingUrl} onChange={e => setForm(f => ({ ...f, trackingUrl: e.target.value }))} placeholder="https://gly-express.com/track?n=…" className={inputCls} style={inputStyle} />
        </Field>
        {currentParamSpecs.length > 0 && (
          <div className="p-3 rounded-xl space-y-2" style={{ background: "rgba(20,184,166,0.06)", border: "1px solid rgba(20,184,166,0.2)" }}>
            <p className="text-[11px] font-bold" style={{ color: "#0D9488" }}>{form.carrier} tracking parameters</p>
            <div className="grid grid-cols-2 gap-3">
              {currentParamSpecs.map(spec => (
                <div key={spec.key}>
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--t-subtle)" }}>
                    {spec.label}{spec.required ? <span style={{ color: "#DC2626" }}> *</span> : " (optional)"}
                  </label>
                  {spec.type === "select" && spec.options ? (
                    <select value={trackingParams[spec.key] ?? ""} onChange={e => setTrackingParams(p => ({ ...p, [spec.key]: e.target.value }))} className={`${inputCls} appearance-none text-xs`} style={inputStyle}>
                      <option value="">Select…</option>
                      {spec.options.map(o => <option key={o.value} value={o.value}>{o.value} — {o.label}</option>)}
                    </select>
                  ) : (
                    <input type={spec.type === "date" ? "date" : "text"} placeholder={spec.placeholder} value={trackingParams[spec.key] ?? ""} onChange={e => setTrackingParams(p => ({ ...p, [spec.key]: e.target.value }))} className={`${inputCls} text-xs`} style={inputStyle} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {parcel && (
          <Field label="Status">
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={`${inputCls} appearance-none`} style={inputStyle}>
              {GB_PARCEL_STATUSES.map(s => <option key={s} value={s}>{PARCEL_STATUS_LABELS[s]?.label ?? s}</option>)}
            </select>
          </Field>
        )}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--t-subtle)" }}>Items in Parcel</p>
          </div>
          <div className="flex gap-1 mb-2 p-0.5 rounded-lg w-fit" style={{ border: "1px solid var(--t-border)" }}>
            {(["catalogue", "custom", "paste"] as const).map(mode => (
              <button key={mode} type="button" onClick={() => setItemMode(mode)} className="text-[10px] px-2.5 py-1 rounded-md font-bold transition-all" style={{ background: itemMode === mode ? "var(--t-blue-deep)" : "transparent", color: itemMode === mode ? "#fff" : "var(--t-muted)" }}>
                {mode === "catalogue" ? "From Catalogue" : mode === "custom" ? "Custom" : "Paste List"}
              </button>
            ))}
          </div>
          {itemMode === "paste" ? (
            <div className="space-y-2 mb-2">
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                rows={5}
                placeholder={"Paste items here, one per line:\nBPC-157 5mg\nSemaglutide 1mg\n2x TB-500 2mg"}
                className="w-full px-3 py-2 rounded-xl text-xs resize-none focus:outline-none"
                style={{ ...inputStyle, fontFamily: "inherit" }}
              />
              <button type="button" onClick={parsePaste} disabled={!pasteText.trim()}
                className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
                style={{ background: "var(--t-blue-deep)", color: "#fff" }}>
                <Plus className="w-3 h-3" /> Import Items
              </button>
            </div>
          ) : (
            <div className="flex gap-2 items-end mb-2">
              {itemMode === "catalogue" ? (
                <div className="relative flex-1 min-w-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "var(--t-subtle)" }} />
                    <input
                      value={productSearch}
                      onChange={e => { setProductSearch(e.target.value); setProductDropdownOpen(true); setSelectedProductId(""); }}
                      onFocus={() => setProductDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setProductDropdownOpen(false), 150)}
                      placeholder="Search products…"
                      className="w-full pl-7 pr-3 rounded-xl text-xs h-9 focus:outline-none"
                      style={inputStyle}
                    />
                  </div>
                  {productDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl overflow-hidden shadow-lg max-h-52 overflow-y-auto" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                      {catalogProducts
                        .filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()))
                        .map(p => (
                          <button key={p.id} type="button"
                            onMouseDown={() => { setSelectedProductId(p.id); setProductSearch(p.name); setProductDropdownOpen(false); }}
                            className="w-full text-left px-3 py-2 text-xs transition-colors"
                            style={{ color: "var(--t-text)", background: selectedProductId === p.id ? "var(--t-blue-10)" : "transparent" }}>
                            {p.name}
                          </button>
                        ))}
                      {catalogProducts.filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                        <p className="px-3 py-2 text-xs" style={{ color: "var(--t-subtle)" }}>No products found</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <input value={customItemName} onChange={e => setCustomItemName(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addItem())} placeholder="Item name" className={`flex-1 min-w-0 px-3 rounded-xl text-xs h-9 focus:outline-none`} style={inputStyle} />
              )}
              <input type="number" value={itemQty} min="1" onChange={e => setItemQty(e.target.value)} className={`w-16 px-3 rounded-xl text-xs h-9 focus:outline-none`} style={inputStyle} />
              <button type="button" onClick={addItem} className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--t-blue-10)", color: "var(--t-blue-deep)" }}>
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {items.length === 0 && <p className="text-[10px]" style={{ color: "var(--t-subtle)" }}>No items added</p>}
          {items.map((item, i) => (
            <div key={i} className="flex gap-2 items-center mb-2 px-2 py-1.5 rounded-lg" style={{ background: "var(--t-surface2)" }}>
              <span className="flex-1 text-xs font-medium truncate" style={{ color: "var(--t-text)" }}>{item.name}</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => updateItemQty(i, item.qty - 1)} className="w-5 h-5 rounded flex items-center justify-center text-xs" style={{ color: "var(--t-muted)" }}>−</button>
                <span className="w-6 text-center text-xs font-bold" style={{ color: "var(--t-text)" }}>{item.qty}</span>
                <button type="button" onClick={() => updateItemQty(i, item.qty + 1)} className="w-5 h-5 rounded flex items-center justify-center text-xs" style={{ color: "var(--t-muted)" }}>+</button>
              </div>
              <button type="button" onClick={() => removeItem(i)} className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ color: "#DC2626" }}>
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <Field label="Notes"><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Optional notes…" className={`${inputCls} resize-none`} style={inputStyle} /></Field>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="h-10 px-4 rounded-xl text-xs font-bold" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>Cancel</button>
          <SaveBtn saving={saving} label={parcel ? "Update Parcel" : "Create Parcel"} />
        </div>
      </SectionCard>
    </form>
  );
}

function OrgManualStatusEditor({ gbId, parcel, onSave, onCancel }: {
  gbId: string; parcel: OrgParcel;
  onSave: (p: OrgParcel) => void; onCancel: () => void;
}) {
  const [status, setStatus] = useState(parcel.status);
  const [events, setEvents] = useState<{ date: string; status: string; location: string }[]>(parcel.cachedEvents ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const _todayEvt = new Date();
  const [newDate, setNewDate] = useState(() => `${String(_todayEvt.getDate()).padStart(2, "0")}/${String(_todayEvt.getMonth() + 1).padStart(2, "0")}/${_todayEvt.getFullYear()}`);
  const [newStatus, setNewStatus] = useState("");
  const [newLocation, setNewLocation] = useState("");

  function parseDMYDate(s: string): Date | null {
    const match = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;
    const d = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    if (isNaN(d.getTime())) return null;
    return d;
  }

  const addEvent = () => {
    if (!newStatus.trim()) return;
    const parsed = parseDMYDate(newDate);
    setEvents(prev => [{ date: (parsed ?? new Date()).toISOString(), status: newStatus.trim(), location: newLocation.trim() }, ...prev]);
    setNewStatus(""); setNewLocation("");
  };

  const removeEvent = (i: number) => setEvents(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/organiser/group-buys/${gbId}/parcels/${parcel.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, cachedEvents: events }),
      });
      if (!res.ok) { const j: { error?: string } = await res.json().catch(() => ({})); setError(j.error ?? "Failed"); return; }
      onSave(await res.json() as OrgParcel);
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onCancel} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--t-surface2)" }}>
          <ArrowLeft className="w-4 h-4" style={{ color: "var(--t-muted)" }} />
        </button>
        <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Set Status — {parcel.label}</p>
      </div>
      <SectionCard>
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--t-subtle)" }}>Overall Status</p>
        <div className="flex flex-wrap gap-1.5">
          {GB_PARCEL_STATUSES.map(s => {
            const st = PARCEL_STATUS_LABELS[s] ?? { label: s, color: "#64748B", bg: "rgba(100,116,139,0.1)" };
            return (
              <button key={s} type="button" onClick={() => setStatus(s)}
                className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-all"
                style={{
                  background: status === s ? st.bg : "transparent",
                  color: st.color,
                  border: `1.5px solid ${status === s ? st.color : "var(--t-border)"}`,
                  opacity: status === s ? 1 : 0.6,
                }}>
                {st.label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] font-bold uppercase tracking-wider mt-3" style={{ color: "var(--t-subtle)" }}>Add Tracking Event</p>
        <div className="grid grid-cols-2 gap-2">
          <input type="text" inputMode="numeric" value={newDate} onChange={e => setNewDate(e.target.value)} placeholder="DD/MM/YYYY" className={`${inputCls} col-span-2 text-xs h-9 py-0`} style={inputStyle} />
          <input placeholder="Status description" value={newStatus} onChange={e => setNewStatus(e.target.value)} onKeyDown={e => e.key === "Enter" && addEvent()} className={`${inputCls} col-span-2 text-xs h-9 py-0`} style={inputStyle} />
          <input placeholder="Location (optional)" value={newLocation} onChange={e => setNewLocation(e.target.value)} onKeyDown={e => e.key === "Enter" && addEvent()} className={`${inputCls} text-xs h-9 py-0`} style={inputStyle} />
          <button type="button" onClick={addEvent} disabled={!newStatus.trim()} className="h-9 rounded-xl text-xs font-bold text-white disabled:opacity-50 flex items-center justify-center gap-1" style={{ background: "var(--t-blue-deep)" }}>
            <Plus className="w-3 h-3" /> Add Event
          </button>
        </div>
        {events.length > 0 && (
          <div className="space-y-1 max-h-48 overflow-y-auto mt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--t-subtle)" }}>Events ({events.length})</p>
            {events.map((ev, i) => (
              <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate" style={{ color: "var(--t-text)" }}>{ev.status}</p>
                  <p className="text-[10px]" style={{ color: "var(--t-subtle)" }}>{ev.location && `${ev.location} · `}{new Date(ev.date).toLocaleString()}</p>
                </div>
                <button type="button" onClick={() => removeEvent(i)} className="shrink-0 mt-0.5" style={{ color: "#DC2626" }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {error && <ErrorBanner msg={error} />}
        <div className="flex gap-2 pt-1">
          <SaveBtn saving={saving} label="Save Status" />
          <button type="button" onClick={onCancel} className="h-10 px-4 rounded-xl text-xs font-bold" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>Cancel</button>
        </div>
      </SectionCard>
    </div>
  );
}

function ParcelsTab({ gb }: { gb: OrganiserGB }) {
  const [parcels, setParcels] = useState<OrgParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogProducts, setCatalogProducts] = useState<{ id: string; name: string }[]>([]);
  const [view, setView] = useState<"list" | "create" | { edit: OrgParcel } | { manual: OrgParcel }>("list");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/organiser/group-buys/${gb.id}/parcels`, { credentials: "include" });
    if (res.ok) setParcels(await res.json());
    setLoading(false);
  }, [gb.id]);

  const loadCatalog = useCallback(async () => {
    const res = await fetch(`/api/organiser/group-buys/${gb.id}/products-catalog`, { credentials: "include" });
    if (res.ok) setCatalogProducts(await res.json());
  }, [gb.id]);

  useEffect(() => { load(); loadCatalog(); }, [load, loadCatalog]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this parcel?")) return;
    await fetch(`/api/organiser/group-buys/${gb.id}/parcels/${id}`, { method: "DELETE", credentials: "include" });
    setParcels(p => p.filter(x => x.id !== id));
  };

  const handleRefresh = async (parcel: OrgParcel) => {
    setRefreshing(parcel.id);
    try {
      const res = await fetch(`/api/organiser/group-buys/${gb.id}/parcels/${parcel.id}/refresh`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        const { _refreshWarning, ...parcelData } = data;
        setParcels(prev => prev.map(p => p.id === parcel.id ? parcelData as OrgParcel : p));
        if (_refreshWarning) alert(`⚠️ ${_refreshWarning}`);
      } else {
        alert(`Refresh failed: ${data?.error ?? "Unknown error"}`);
      }
    } catch (e) { alert(`Network error: ${e instanceof Error ? e.message : "Unknown"}`); }
    finally { setRefreshing(null); }
  };

  if (typeof view === "object" && "manual" in view) {
    return (
      <OrgManualStatusEditor
        gbId={gb.id}
        parcel={view.manual}
        onSave={updated => { setParcels(prev => prev.map(p => p.id === updated.id ? updated : p)); setView("list"); }}
        onCancel={() => setView("list")}
      />
    );
  }

  if (view === "create" || (typeof view === "object" && "edit" in view)) {
    const initial = typeof view === "object" && "edit" in view ? view.edit : null;
    return (
      <div className="space-y-3">
        <ParcelForm
          parcel={initial}
          gbId={gb.id}
          catalogProducts={catalogProducts}
          onSaved={async () => { setView("list"); await load(); }}
          onCancel={() => setView("list")}
        />
      </div>
    );
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-blue)" }} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold" style={{ color: "var(--t-text)" }}>Parcels — {gb.name}</h2>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} style={{ color: "var(--t-muted)" }} />
          </button>
          <button onClick={() => setView("create")} className="h-9 px-4 rounded-xl text-xs font-bold text-white flex items-center gap-1.5" style={{ background: "var(--t-blue-deep)" }}>
            <Plus className="w-3.5 h-3.5" /> New Parcel
          </button>
        </div>
      </div>

      {error && <ErrorBanner msg={error} onClose={() => setError("")} />}

      {parcels.length === 0 && (
        <div className="flex flex-col items-center py-12 space-y-2">
          <Truck className="w-8 h-8" style={{ color: "var(--t-border)" }} />
          <p className="text-sm" style={{ color: "var(--t-subtle)" }}>No parcels created yet</p>
          <p className="text-[11px] text-center max-w-xs" style={{ color: "var(--t-subtle)" }}>Create a parcel for each shipment batch. Add the tracking number, items, and carrier details.</p>
        </div>
      )}

      <div className="space-y-3">
        {parcels.map(p => {
          const isOpen = expandedId === p.id;
          const s = PARCEL_STATUS_LABELS[p.status] ?? { color: "#64748B", bg: "rgba(100,116,139,0.1)" };
          return (
            <div key={p.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
              <div className="px-4 pt-3 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{p.label}</p>
                      <ParcelStatusBadge status={p.status} />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Truck className="w-3 h-3" style={{ color: "var(--t-blue)" }} />
                      <span className="font-mono text-xs font-bold" style={{ color: "var(--t-blue)" }}>{p.trackingNumber}</span>
                      {p.carrier && p.carrier !== "Auto" && <span className="text-[10px]" style={{ color: "var(--t-subtle)" }}>{p.carrier}</span>}
                      {p.trackingUrl && (
                        <a href={p.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: "var(--t-blue)" }}>
                          <ExternalLink className="w-2.5 h-2.5" /> Track
                        </a>
                      )}
                    </div>
                    {p.items.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {p.items.map((item, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: "var(--t-blue-10)", color: "var(--t-blue-deep)" }}>
                            <span className="font-bold">{item.qty}×</span>{item.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {p.notes && <p className="text-[11px] mt-1" style={{ color: "var(--t-muted)" }}>{p.notes}</p>}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => handleRefresh(p)} disabled={refreshing === p.id} title="Refresh tracking" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--t-surface2)" }}>
                      <RefreshCw className={`w-3.5 h-3.5 ${refreshing === p.id ? "animate-spin" : ""}`} style={{ color: "var(--t-blue)" }} />
                    </button>
                    <button onClick={() => setView({ manual: p })} title="Set status manually" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(217,119,6,0.08)" }}>
                      <Pencil className="w-3.5 h-3.5" style={{ color: "#D97706" }} />
                    </button>
                    <button onClick={() => setView({ edit: p })} title="Edit parcel" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--t-surface2)" }}>
                      <Pencil className="w-3.5 h-3.5" style={{ color: "var(--t-muted)" }} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} title="Delete" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(220,38,38,0.07)" }}>
                      <Trash2 className="w-3.5 h-3.5" style={{ color: "#DC2626" }} />
                    </button>
                  </div>
                </div>
              </div>
              {p.cachedEvents.length > 0 && (
                <>
                  <div className="border-t flex" style={{ borderColor: "var(--t-border)" }}>
                    <button onClick={() => setExpandedId(isOpen ? null : p.id)} className="flex-1 h-8 flex items-center justify-center gap-1.5 text-[11px] font-semibold" style={{ color: "var(--t-muted)" }}>
                      {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {p.cachedEvents.length} tracking event{p.cachedEvents.length !== 1 ? "s" : ""}
                    </button>
                  </div>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t" style={{ borderColor: "var(--t-border)" }}>
                        <div className="px-4 py-3 space-y-2">
                          {p.cachedEvents.map((ev, i) => (
                            <div key={i} className="flex gap-3 text-[11px]">
                              <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: i === 0 ? s.color : "var(--t-border)" }} />
                              <div>
                                <p className="font-semibold" style={{ color: "var(--t-text)" }}>{ev.status}</p>
                                <p style={{ color: "var(--t-subtle)" }}>{ev.location} · {ev.date}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Lab Tests Tab ────────────────────────────────────────────────────────────

// Multi-file review row type for lab AI import
type LabReviewRow = {
  fileName: string;
  status: "pending" | "extracting" | "done" | "error";
  error?: string;
  url: string; peptideName: string; labName: string; batchCode: string; purityPct: string;
  testDate: string; janoshikId: string; mgAmount: string; testType: string;
  productCategory: string; endotoxinEuMg: string; sterilityPass: string;
};

function LabTestsTabOrg({ gb }: { gb: OrganiserGB }) {
  const [tests, setTests] = useState<OrgLabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"none" | "manual" | "multifile">("none");

  // Bulk AI via links state
  const [bulkUrls, setBulkUrls] = useState("");
  const [reviewRows, setReviewRows] = useState<LabReviewRow[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ imported: number; failed: number } | null>(null);
  const [bulkExtracting, setBulkExtracting] = useState(false);

  // Manual single form
  const labFileRef = useRef<HTMLInputElement>(null);
  const [labExtractLoading, setLabExtractLoading] = useState(false);
  const [labExtractedData, setLabExtractedData] = useState<Record<string, unknown> | null>(null);

  const defaultForm = {
    url: "", peptideName: "", labName: "Janoshik", batchCode: "", purityPct: "", testDate: "",
    janoshikId: "", mgAmount: "", testType: "", productCategory: "", endotoxinEuMg: "", sterilityPass: "",
  };
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/organiser/lab-tests", { credentials: "include" });
    if (res.ok) { const all: OrgLabTest[] = await res.json(); setTests(all.filter(t => t.groupBuyId === gb.id)); }
    setLoading(false);
  }, [gb.id]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this lab test?")) return;
    await fetch(`/api/organiser/lab-tests/${id}`, { method: "DELETE", credentials: "include" });
    setTests(t => t.filter(x => x.id !== id));
  };

  // URL-based bulk extraction — one URL per line
  const handleExtractFromLinks = async () => {
    const urls = bulkUrls.split("\n").map(u => u.trim()).filter(u => u.length > 0);
    if (!urls.length) { setError("Paste at least one URL"); return; }
    setError(""); setBulkExtracting(true);
    const newRows: LabReviewRow[] = urls.map(u => ({
      fileName: u, status: "pending",
      url: u, peptideName: "", labName: "Janoshik", batchCode: "", purityPct: "",
      testDate: "", janoshikId: "", mgAmount: "", testType: "",
      productCategory: "", endotoxinEuMg: "", sterilityPass: "",
    }));
    setReviewRows(prev => [...prev, ...newRows]);
    const startIdx = reviewRows.length;
    setBulkUrls("");

    for (let i = 0; i < urls.length; i++) {
      const rowIdx = startIdx + i;
      setReviewRows(rows => rows.map((r, j) => j === rowIdx ? { ...r, status: "extracting" } : r));
      try {
        const res = await fetch("/api/organiser/lab-tests/extract", {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urls[i] }),
        });
        if (res.ok) {
          const data = await res.json();
          setReviewRows(rows => rows.map((r, j) => j === rowIdx ? {
            ...r, status: "done",
            peptideName: data.peptideName ?? "", labName: data.labName ?? "Janoshik",
            batchCode: data.batchCode ?? "", purityPct: data.purityPct != null ? String(data.purityPct) : "",
            testDate: data.testDate ?? "", janoshikId: data.janoshikId ?? "",
            mgAmount: data.mgAmount != null ? String(data.mgAmount) : "",
            testType: data.testType ?? "", productCategory: data.productCategory ?? "",
            endotoxinEuMg: data.endotoxinEuMg != null ? String(data.endotoxinEuMg) : "",
            sterilityPass: data.sterilityPass != null ? String(data.sterilityPass) : "",
          } : r));
        } else {
          const d = await res.json();
          setReviewRows(rows => rows.map((r, j) => j === rowIdx ? { ...r, status: "error", error: d.error || "Extraction failed" } : r));
        }
      } catch {
        setReviewRows(rows => rows.map((r, j) => j === rowIdx ? { ...r, status: "error", error: "Failed to fetch URL" } : r));
      }
    }
    setBulkExtracting(false);
  };

  const updateReviewRow = (i: number, k: keyof LabReviewRow, v: string) => {
    setReviewRows(rows => rows.map((r, j) => j === i ? { ...r, [k]: v } : r));
  };
  const removeReviewRow = (i: number) => setReviewRows(rows => rows.filter((_, j) => j !== i));

  const handleBulkSubmit = async () => {
    const readyRows = reviewRows.filter(r => r.status === "done" && r.peptideName.trim());
    if (!readyRows.length) { setError("No ready rows to submit — add a COA URL and peptide name first"); return; }
    setBulkSubmitting(true); setError(""); setBulkResult(null);
    let imported = 0; let failed = 0;
    for (const row of readyRows) {
      const res = await fetch("/api/organiser/lab-tests", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: row.url.trim() || null,
          peptideName: row.peptideName.trim(),
          labName: row.labName.trim() || null, batchCode: row.batchCode.trim() || null,
          purityPct: row.purityPct ? parseFloat(row.purityPct) : null,
          testDate: row.testDate || null, groupBuyId: gb.id,
          janoshikId: row.janoshikId.trim() || null,
          mgAmount: row.mgAmount ? parseFloat(row.mgAmount) : null,
          testType: row.testType.trim() || null,
          productCategory: row.productCategory.trim() || null,
          endotoxinEuMg: row.endotoxinEuMg ? parseFloat(row.endotoxinEuMg) : null,
          sterilityPass: row.sterilityPass !== "" ? row.sterilityPass === "true" : null,
        }),
      });
      if (res.ok) imported++; else failed++;
    }
    setBulkResult({ imported, failed });
    setReviewRows([]);
    setBulkSubmitting(false);
    await load();
  };

  // Single file upload → AI extraction → pre-fill manual form
  const handleLabFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLabExtractLoading(true); setError("");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const b64 = (reader.result as string).split(",")[1];
        const res = await fetch("/api/organiser/lab-tests/extract", {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileBase64: b64, mimeType: file.type }),
        });
        if (res.ok) {
          const data = await res.json();
          setLabExtractedData(data);
          setForm(f => ({
            ...f,
            peptideName: (data.peptideName as string) ?? f.peptideName,
            labName: (data.labName as string) ?? f.labName,
            batchCode: (data.batchCode as string) ?? f.batchCode,
            purityPct: data.purityPct != null ? String(data.purityPct) : f.purityPct,
            testDate: (data.testDate as string) ?? f.testDate,
            janoshikId: (data.janoshikId as string) ?? f.janoshikId,
            mgAmount: data.mgAmount != null ? String(data.mgAmount) : f.mgAmount,
            testType: (data.testType as string) ?? f.testType,
          }));
        } else {
          const d = await res.json();
          setError(d.error || "Lab test extraction failed");
        }
      } catch { setError("Failed to process file"); }
      finally { setLabExtractLoading(false); if (labFileRef.current) labFileRef.current.value = ""; }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.peptideName.trim()) { setError("Peptide name is required"); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/organiser/lab-tests", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: form.url.trim() || null, peptideName: form.peptideName.trim(),
        labName: form.labName.trim() || null, batchCode: form.batchCode.trim() || null,
        purityPct: form.purityPct ? parseFloat(form.purityPct) : null,
        testDate: form.testDate || null, groupBuyId: gb.id,
        janoshikId: form.janoshikId.trim() || null,
        mgAmount: form.mgAmount ? parseFloat(form.mgAmount) : null,
        testType: form.testType.trim() || null,
        productCategory: form.productCategory.trim() || null,
        endotoxinEuMg: form.endotoxinEuMg ? parseFloat(form.endotoxinEuMg) : null,
        sterilityPass: form.sterilityPass !== "" ? form.sterilityPass === "true" : null,
      }),
    });
    if (res.ok) {
      setForm(defaultForm); setMode("none"); setLabExtractedData(null); await load();
    } else { const d = await res.json(); setError(d.error || "Failed"); }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-blue)" }} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold" style={{ color: "var(--t-text)" }}>Lab Tests — {gb.name}</h2>
        <div className="flex gap-2">
          <button onClick={() => { setMode(m => m === "multifile" ? "none" : "multifile"); setReviewRows([]); setBulkResult(null); }} className="h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>
            <Sparkles className="w-3.5 h-3.5" /> AI Bulk
          </button>
          <button onClick={() => setMode(m => m === "manual" ? "none" : "manual")} className="h-9 px-3 rounded-xl text-xs font-bold text-white flex items-center gap-1.5" style={{ background: "var(--t-blue-deep)" }}>
            <Plus className="w-3.5 h-3.5" /> Add Test
          </button>
        </div>
      </div>

      {error && <ErrorBanner msg={error} onClose={() => setError("")} />}

      {/* Multi-file AI extract + review table */}
      <AnimatePresence>
        {mode === "multifile" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <SectionCard>
              <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>AI Bulk Lab Import</p>
              <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>Paste COA/Janoshik report URLs — one per line. AI extracts each report's data into a review table. Edit if needed, then confirm to submit all at once.</p>
              <textarea
                value={bulkUrls}
                onChange={e => setBulkUrls(e.target.value)}
                disabled={bulkExtracting}
                placeholder={"https://janoshik.com/results/J-12345\nhttps://janoshik.com/results/J-67890"}
                rows={3}
                className={`${inputCls} text-xs font-mono resize-none`}
                style={{ ...inputStyle, lineHeight: 1.6 }}
              />
              <button
                onClick={handleExtractFromLinks}
                disabled={bulkExtracting || !bulkUrls.trim()}
                className="w-full h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: "var(--t-blue-deep)", color: "white" }}
              >
                {bulkExtracting ? <><Loader2 className="w-4 h-4 animate-spin" />Extracting…</> : <><Sparkles className="w-4 h-4" />Extract from Links</>}
              </button>

              {reviewRows.length > 0 && (
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]" style={{ minWidth: 700 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--t-border)" }}>
                          {["Link", "Status", "Peptide Name", "Lab", "Purity %", "mg", "Batch", "Test Date", "COA URL", ""].map(h => (
                            <th key={h} className="text-left px-2 py-1.5 font-bold whitespace-nowrap" style={{ color: "var(--t-subtle)" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reviewRows.map((row, i) => (
                          <tr key={i} style={{ borderTop: "1px solid var(--t-border)" }}>
                            <td className="px-2 py-1 max-w-[100px] truncate" style={{ color: "var(--t-muted)" }} title={row.fileName}>{row.fileName}</td>
                            <td className="px-2 py-1 whitespace-nowrap">
                              {row.status === "extracting" && <span className="flex items-center gap-1" style={{ color: "var(--t-blue)" }}><Loader2 className="w-3 h-3 animate-spin" />Extracting</span>}
                              {row.status === "pending" && <span style={{ color: "var(--t-subtle)" }}>Pending</span>}
                              {row.status === "done" && <span style={{ color: "#16A34A" }}>✓ Ready</span>}
                              {row.status === "error" && <span style={{ color: "#DC2626" }} title={row.error}>Error</span>}
                            </td>
                            <td className="px-1 py-1"><input value={row.peptideName} onChange={e => updateReviewRow(i, "peptideName", e.target.value)} placeholder="BPC-157" className={`${inputCls} text-[11px] h-7 py-0 w-28`} style={inputStyle} /></td>
                            <td className="px-1 py-1"><input value={row.labName} onChange={e => updateReviewRow(i, "labName", e.target.value)} placeholder="Lab" className={`${inputCls} text-[11px] h-7 py-0 w-20`} style={inputStyle} /></td>
                            <td className="px-1 py-1"><input type="number" value={row.purityPct} onChange={e => updateReviewRow(i, "purityPct", e.target.value)} placeholder="%" className={`${inputCls} text-[11px] h-7 py-0 w-16`} style={inputStyle} /></td>
                            <td className="px-1 py-1"><input type="number" value={row.mgAmount} onChange={e => updateReviewRow(i, "mgAmount", e.target.value)} placeholder="mg" className={`${inputCls} text-[11px] h-7 py-0 w-14`} style={inputStyle} /></td>
                            <td className="px-1 py-1"><input value={row.batchCode} onChange={e => updateReviewRow(i, "batchCode", e.target.value)} placeholder="Batch" className={`${inputCls} text-[11px] h-7 py-0 w-20`} style={inputStyle} /></td>
                            <td className="px-1 py-1"><input type="text" inputMode="numeric" value={row.testDate} onChange={e => updateReviewRow(i, "testDate", e.target.value)} placeholder="DD/MM/YYYY" className={`${inputCls} text-[11px] h-7 py-0 w-28`} style={inputStyle} /></td>
                            <td className="px-1 py-1"><input type="url" value={row.url} onChange={e => updateReviewRow(i, "url", e.target.value)} placeholder="https://..." className={`${inputCls} text-[11px] h-7 py-0 w-40`} style={inputStyle} /></td>
                            <td className="px-1 py-1"><button onClick={() => removeReviewRow(i)} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "rgba(220,38,38,0.07)" }}><X className="w-3 h-3" style={{ color: "#DC2626" }} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {bulkResult && (
                    <div className="flex gap-4 text-xs">
                      <span style={{ color: "#16A34A" }}><CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />{bulkResult.imported} submitted</span>
                      {bulkResult.failed > 0 && <span style={{ color: "#DC2626" }}><X className="w-3.5 h-3.5 inline mr-1" />{bulkResult.failed} failed</span>}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => setReviewRows([])} className="h-10 px-4 rounded-xl text-xs font-bold" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>Clear</button>
                    <button onClick={handleBulkSubmit} disabled={bulkSubmitting || !reviewRows.some(r => r.status === "done" && r.peptideName.trim())} className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: "var(--t-blue-deep)" }}>
                      {bulkSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {bulkSubmitting ? "Submitting…" : `Submit ${reviewRows.filter(r => r.status === "done" && r.peptideName.trim()).length} lab test(s)`}
                    </button>
                  </div>
                </div>
              )}
            </SectionCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual submit + single file upload */}
      <AnimatePresence>
        {mode === "manual" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <form onSubmit={handleSubmit}>
              <SectionCard>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Submit Lab Test</p>
                  <div>
                    <input ref={labFileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleLabFileUpload} />
                    <button type="button" onClick={() => labFileRef.current?.click()} disabled={labExtractLoading} className="h-8 px-3 rounded-xl text-[11px] font-bold flex items-center gap-1.5" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>
                      {labExtractLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {labExtractLoading ? "Extracting…" : "Upload & Extract"}
                    </button>
                  </div>
                </div>
                {labExtractedData && (
                  <div className="p-2 rounded-lg text-[11px]" style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", color: "#16A34A" }}>
                    <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />AI extracted data from your file — review and confirm below.
                  </div>
                )}
                <Field label="COA / Report URL">
                  <input type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://janoshik.com/report/..." className={inputCls} style={inputStyle} />
                </Field>
                <Field label="Peptide / Product Name *">
                  <input value={form.peptideName} onChange={e => setForm(f => ({ ...f, peptideName: e.target.value }))} placeholder="e.g. BPC-157 5mg" className={inputCls} style={inputStyle} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Lab Name"><input value={form.labName} onChange={e => setForm(f => ({ ...f, labName: e.target.value }))} placeholder="Janoshik" className={inputCls} style={inputStyle} /></Field>
                  <Field label="Janoshik ID"><input value={form.janoshikId} onChange={e => setForm(f => ({ ...f, janoshikId: e.target.value }))} placeholder="J-12345" className={inputCls} style={inputStyle} /></Field>
                  <Field label="Batch Code"><input value={form.batchCode} onChange={e => setForm(f => ({ ...f, batchCode: e.target.value }))} placeholder="B240301" className={inputCls} style={inputStyle} /></Field>
                  <Field label="mg Amount"><input type="number" value={form.mgAmount} onChange={e => setForm(f => ({ ...f, mgAmount: e.target.value }))} placeholder="e.g. 5" min="0" step="0.01" className={inputCls} style={inputStyle} /></Field>
                  <Field label="Purity %"><input type="number" value={form.purityPct} onChange={e => setForm(f => ({ ...f, purityPct: e.target.value }))} placeholder="98.5" min="0" max="100" step="0.01" className={inputCls} style={inputStyle} /></Field>
                  <Field label="Test Date"><input type="text" inputMode="numeric" value={form.testDate} onChange={e => setForm(f => ({ ...f, testDate: e.target.value }))} placeholder="DD/MM/YYYY" className={inputCls} style={inputStyle} /></Field>
                  <Field label="Test Type"><input value={form.testType} onChange={e => setForm(f => ({ ...f, testType: e.target.value }))} placeholder="HPLC / MS / etc." className={inputCls} style={inputStyle} /></Field>
                  <Field label="Product Category"><input value={form.productCategory} onChange={e => setForm(f => ({ ...f, productCategory: e.target.value }))} placeholder="peptide / aas" className={inputCls} style={inputStyle} /></Field>
                  <Field label="Endotoxin (EU/mg)"><input type="number" value={form.endotoxinEuMg} onChange={e => setForm(f => ({ ...f, endotoxinEuMg: e.target.value }))} placeholder="0.5" min="0" step="0.01" className={inputCls} style={inputStyle} /></Field>
                  <Field label="Sterility Pass">
                    <select value={form.sterilityPass} onChange={e => setForm(f => ({ ...f, sterilityPass: e.target.value }))} className={`${inputCls} appearance-none`} style={inputStyle}>
                      <option value="">— unknown —</option>
                      <option value="true">Pass</option>
                      <option value="false">Fail</option>
                    </select>
                  </Field>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setMode("none"); setLabExtractedData(null); }} className="h-10 px-4 rounded-xl text-xs font-bold" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>Cancel</button>
                  <SaveBtn saving={saving} label="Submit Lab Test" />
                </div>
              </SectionCard>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {tests.length === 0 && (
        <div className="flex flex-col items-center py-12 space-y-2">
          <FlaskConical className="w-8 h-8" style={{ color: "var(--t-border)" }} />
          <p className="text-sm" style={{ color: "var(--t-subtle)" }}>No lab tests for this GB</p>
        </div>
      )}

      <div className="space-y-2">
        {tests.map(t => (
          <div key={t.id} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{t.peptideName}</p>
                {t.pending ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(217,119,6,0.1)", color: "#D97706" }}>Pending Review</span> : <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(22,163,74,0.1)", color: "#16A34A" }}>Approved</span>}
              </div>
              <div className="flex flex-wrap gap-3 mt-1 text-[11px]" style={{ color: "var(--t-subtle)" }}>
                {t.labName && <span>{t.labName}</span>}
                {t.purityPct && <span>{t.purityPct}% purity</span>}
                {t.mgAmount && <span>{t.mgAmount}mg</span>}
                {t.batchCode && <span>Batch: {t.batchCode}</span>}
                {t.janoshikId && <span>ID: {t.janoshikId}</span>}
                {t.testDate && <span>{new Date(t.testDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>}
                {t.sterilityPass != null && <span>Sterility: {t.sterilityPass ? "Pass" : "Fail"}</span>}
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              {t.url && (
                <a href={t.url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--t-surface2)" }}>
                  <ExternalLink className="w-3.5 h-3.5" style={{ color: "var(--t-muted)" }} />
                </a>
              )}
              {t.pending && (
                <button onClick={() => handleDelete(t.id)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(220,38,38,0.07)" }}>
                  <Trash2 className="w-3.5 h-3.5" style={{ color: "#DC2626" }} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── P&L Tab ──────────────────────────────────────────────────────────────────

function PnlTab({ gb }: { gb: OrganiserGB }) {
  const [data, setData] = useState<PnlData | null>(null);
  const [loading, setLoading] = useState(true);
  const [costs, setCosts] = useState({ materials: "", lab: "", shipping: "", misc: "", platformFee: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/organiser/group-buys/${gb.id}/pnl`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setData(d);
          setCosts({ materials: d.costs.materials > 0 ? String(d.costs.materials) : "", lab: d.costs.lab > 0 ? String(d.costs.lab) : "", shipping: d.costs.shipping > 0 ? String(d.costs.shipping) : "", misc: d.costs.misc > 0 ? String(d.costs.misc) : "", platformFee: d.costs.platformFee > 0 ? String(d.costs.platformFee) : "", notes: d.costs.notes ?? "" });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [gb.id]);

  // Live-computed gross profit from current (unsaved) cost inputs
  const liveTotalCosts = (parseFloat(costs.materials) || 0) + (parseFloat(costs.lab) || 0) + (parseFloat(costs.shipping) || 0) + (parseFloat(costs.misc) || 0) + (parseFloat(costs.platformFee) || 0);
  const liveRevenue = data?.revenue.total ?? 0;
  const liveGrossProfit = liveRevenue - liveTotalCosts;
  const liveMarginPct = liveRevenue > 0 ? (liveGrossProfit / liveRevenue) * 100 : 0;

  const saveCosts = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError("");
    const res = await fetch(`/api/organiser/group-buys/${gb.id}/pnl-costs`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ materials: costs.materials ? parseFloat(costs.materials) : null, lab: costs.lab ? parseFloat(costs.lab) : null, shipping: costs.shipping ? parseFloat(costs.shipping) : null, misc: costs.misc ? parseFloat(costs.misc) : null, platformFee: costs.platformFee ? parseFloat(costs.platformFee) : null, notes: costs.notes.trim() || null }),
    });
    if (res.ok) {
      setOk(true); setTimeout(() => setOk(false), 2000);
      const res2 = await fetch(`/api/organiser/group-buys/${gb.id}/pnl`, { credentials: "include" });
      if (res2.ok) setData(await res2.json());
    } else { const d = await res.json(); setError(d.error || "Failed"); }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-blue)" }} /></div>;
  if (!data) return <ErrorBanner msg="Failed to load P&L data" />;

  return (
    <div className="space-y-5">
      <h2 className="text-base font-bold" style={{ color: "var(--t-text)" }}>P&L — {gb.name}</h2>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total Orders", value: String(data.orders.total), sub: `${data.orders.confirmed} confirmed` },
          { label: "Revenue", value: `${gb.currency} ${liveRevenue.toFixed(2)}`, sub: "confirmed orders" },
          { label: "Total Costs", value: `${gb.currency} ${liveTotalCosts.toFixed(2)}`, sub: "live from inputs below" },
          { label: "Gross Profit", value: `${gb.currency} ${liveGrossProfit.toFixed(2)}`, sub: `${liveMarginPct.toFixed(1)}% margin (live)`, color: liveGrossProfit >= 0 ? "#16A34A" : "#DC2626" },
        ].map(card => (
          <div key={card.label} className="p-4 rounded-xl" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--t-subtle)" }}>{card.label}</p>
            <p className="text-lg font-bold mt-1 leading-tight flex items-center gap-1" style={{ color: (card as Record<string, string | undefined>).color ?? "var(--t-text)" }}>
              {liveGrossProfit >= 0 && card.label === "Gross Profit" ? <TrendingUp className="w-4 h-4" /> : null}
              {liveGrossProfit < 0 && card.label === "Gross Profit" ? <TrendingDown className="w-4 h-4" /> : null}
              {card.value}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--t-subtle)" }}>{card.sub}</p>
          </div>
        ))}
      </div>
      {data.productBreakdown.length > 0 && (
        <SectionCard>
          <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Product Breakdown</p>
          <div className="space-y-2">
            {data.productBreakdown.map(p => (
              <div key={p.name} className="flex items-center gap-3">
                <div className="flex-1 min-w-0"><p className="text-[11px] font-semibold truncate" style={{ color: "var(--t-text)" }}>{p.name}</p><p className="text-[10px]" style={{ color: "var(--t-subtle)" }}>{p.totalQty} units</p></div>
                <p className="text-sm font-bold tabular-nums" style={{ color: "var(--t-text)" }}>{gb.currency} {p.totalRevenue.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
      <form onSubmit={saveCosts}>
        <SectionCard>
          <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Cost Inputs <span className="text-[10px] font-normal" style={{ color: "var(--t-subtle)" }}>— Gross Profit updates live as you type</span></p>
          {error && <ErrorBanner msg={error} />}
          <div className="grid grid-cols-2 gap-3">
            {[{ key: "materials", label: "Materials / Stock" }, { key: "lab", label: "Lab Testing" }, { key: "shipping", label: "Outgoing Shipping" }, { key: "platformFee", label: "Platform Fee" }, { key: "misc", label: "Misc / Other" }].map(({ key, label }) => (
              <Field key={key} label={label}>
                <input type="number" min="0" step="0.01" value={(costs as Record<string, string>)[key]} onChange={e => setCosts(c => ({ ...c, [key]: e.target.value }))} placeholder="0.00" className={inputCls} style={inputStyle} />
              </Field>
            ))}
          </div>
          <Field label="Notes"><textarea value={costs.notes} onChange={e => setCosts(c => ({ ...c, notes: e.target.value }))} rows={2} placeholder="Optional notes…" className={`${inputCls} resize-none`} style={inputStyle} /></Field>
          <button type="submit" disabled={saving} className="h-10 px-5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5" style={{ background: ok ? "#16A34A" : "var(--t-blue-deep)" }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : ok ? <CheckCircle2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            {saving ? "Saving…" : ok ? "Saved!" : "Save Costs"}
          </button>
        </SectionCard>
      </form>
    </div>
  );
}

// ─── Summary Tab ──────────────────────────────────────────────────────────────

function SummaryTab({ gb }: { gb: OrganiserGB }) {
  type GRow = { productId: string; productName: string; totalQty: number; unitPrice: number; totalValue: number; orderCount: number };
  type GBreakdown = { orderId: string; orderCode: string; telegramUsername: string; quantity: number; unitPrice: number; lineTotal: number; orderStatus: string; paymentStatus: string; notes: string | null };

  const [rows, setRows] = useState<GRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("Submitted");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<GBreakdown[]>([]);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  const ORDER_STATUSES = ["Submitted", "Confirmed", "Shipped", "Delivered"];

  const load = useCallback(async () => {
    setLoading(true);
    setExpandedProduct(null);
    setBreakdown([]);
    const params = new URLSearchParams({ status: statusFilter });
    if (paymentFilter !== "all") params.set("paymentStatus", paymentFilter);
    const res = await fetch(`/api/organiser/group-buys/${gb.id}/summary?${params}`, { credentials: "include" });
    setRows(res.ok ? await res.json() : []);
    setLoading(false);
  }, [gb.id, statusFilter, paymentFilter]);

  useEffect(() => { load(); }, [load]);

  const toggleProduct = useCallback(async (productName: string) => {
    if (expandedProduct === productName) { setExpandedProduct(null); setBreakdown([]); return; }
    setExpandedProduct(productName);
    setBreakdownLoading(true);
    const params = new URLSearchParams({ productName, status: statusFilter });
    if (paymentFilter !== "all") params.set("paymentStatus", paymentFilter);
    const res = await fetch(`/api/organiser/group-buys/${gb.id}/summary/breakdown?${params}`, { credentials: "include" });
    setBreakdown(res.ok ? await res.json() : []);
    setBreakdownLoading(false);
  }, [expandedProduct, gb.id, statusFilter, paymentFilter]);

  const totalValue = rows.reduce((s, r) => s + r.totalValue, 0);
  const totalQty = rows.reduce((s, r) => s + r.totalQty, 0);

  const handleDownload = () => {
    if (rows.length === 0) return;
    const lines = [
      `Order Summary — ${gb.name} — ${statusFilter === "all" ? "All Orders" : statusFilter}`,
      `Generated: ${new Date().toLocaleString("en-GB")}`,
      "─".repeat(50), "",
      ...rows.map(r => `${r.productName} ×${r.totalQty} = ${gb.currency} ${r.totalValue.toFixed(2)}`),
      "", "─".repeat(50),
      `Total: ${totalQty} units · ${gb.currency} ${totalValue.toFixed(2)}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `summary-${gb.name.replace(/\s+/g, "-").toLowerCase()}-${statusFilter}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-blue)" }} /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold" style={{ color: "var(--t-text)" }}>Order Summary — {gb.name}</h2>
      <div className="flex gap-2 items-center flex-wrap">
        <select
          className="h-9 rounded-lg border px-3 text-xs focus:outline-none"
          style={{ borderColor: "var(--t-border)", background: "var(--t-surface)", color: "var(--t-text)" }}
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All orders</option>
          {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          className="h-9 rounded-lg border px-3 text-xs focus:outline-none"
          style={{ borderColor: "var(--t-border)", background: "var(--t-surface)", color: "var(--t-text)" }}
          value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}
        >
          <option value="all">All payments</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="pending_confirmation">Pending confirmation</option>
        </select>
        <button onClick={load} className="h-9 w-9 flex items-center justify-center rounded-lg" style={{ border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        {rows.length > 0 && (
          <button onClick={handleDownload} className="h-9 flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold" style={{ border: "1px solid var(--t-border)", color: "var(--t-text)" }}>
            <Download className="w-3.5 h-3.5" />Download .txt
          </button>
        )}
      </div>

      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Products", value: String(rows.length) },
              { label: "Total Qty", value: String(totalQty) },
              { label: "Total Value", value: `${gb.currency} ${totalValue.toFixed(2)}` },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{s.value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--t-subtle)" }}>{s.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--t-border)" }}>
            <div className="px-4 py-2.5" style={{ background: "var(--t-surface2)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--t-subtle)" }}>Order List — tap a product to see who ordered it</p>
            </div>
            {rows.map(r => {
              const isExpanded = expandedProduct === r.productName;
              return (
                <div key={r.productName} style={{ borderTop: "1px solid var(--t-border)" }}>
                  <button
                    className="w-full flex items-center justify-between gap-4 px-4 py-3 text-xs text-left transition-colors"
                    style={{ background: isExpanded ? "var(--t-surface2)" : "transparent" }}
                    onClick={() => toggleProduct(r.productName)}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {isExpanded
                        ? <ChevronUp className="w-3 h-3 shrink-0" style={{ color: "var(--t-blue)" }} />
                        : <ChevronDown className="w-3 h-3 shrink-0" style={{ color: "var(--t-muted)" }} />}
                      <span className="font-semibold truncate" style={{ color: "var(--t-text)" }}>{r.productName}</span>
                      <span className="shrink-0" style={{ color: "var(--t-muted)" }}>×{r.totalQty}</span>
                    </span>
                    <span className="font-bold shrink-0 tabular-nums" style={{ color: "var(--t-text)" }}>{gb.currency} {r.totalValue.toFixed(2)}</span>
                  </button>
                  {isExpanded && (
                    <div className="px-4 py-3" style={{ background: "var(--t-surface)" }}>
                      {breakdownLoading ? (
                        <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--t-muted)" }}>
                          <Loader2 className="w-3 h-3 animate-spin" />Loading…
                        </div>
                      ) : breakdown.length === 0 ? (
                        <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>No orders found.</p>
                      ) : (
                        <div className="space-y-2">
                          {breakdown.map((b, i) => {
                            const isPaid = b.paymentStatus === "confirmed" || b.paymentStatus === "test_confirmed";
                            const isPending = b.paymentStatus === "pending_confirmation";
                            return (
                            <div key={i} className="space-y-0.5 text-[11px]">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                  <span className="font-mono shrink-0" style={{ color: "var(--t-muted)" }}>#{b.orderCode}</span>
                                  <span className="font-semibold truncate" style={{ color: "var(--t-text)" }}>{b.telegramUsername}</span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0" style={{
                                    background: b.orderStatus === "Submitted" ? "rgba(245,158,11,0.1)" : b.orderStatus === "Confirmed" ? "rgba(22,163,74,0.1)" : "rgba(100,116,139,0.1)",
                                    color: b.orderStatus === "Submitted" ? "#D97706" : b.orderStatus === "Confirmed" ? "#16A34A" : "var(--t-muted)",
                                  }}>{b.orderStatus}</span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0" style={{
                                    background: isPaid ? "rgba(22,163,74,0.1)" : isPending ? "rgba(59,130,246,0.1)" : "rgba(100,116,139,0.1)",
                                    color: isPaid ? "#16A34A" : isPending ? "#3B82F6" : "var(--t-muted)",
                                  }}>{isPaid ? "Paid" : isPending ? "Pending" : "Unpaid"}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 font-mono">
                                  <span style={{ color: "var(--t-muted)" }}>×{b.quantity}</span>
                                  <span className="font-bold" style={{ color: "var(--t-text)" }}>{gb.currency} {b.lineTotal.toFixed(2)}</span>
                                </div>
                              </div>
                              {b.notes && (
                                <p className="text-[10px] pl-1 italic" style={{ color: "var(--t-muted)" }}>💬 {b.notes}</p>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="px-4 py-3 flex justify-between font-bold text-xs" style={{ borderTop: "1px solid var(--t-border)", background: "var(--t-surface2)", color: "var(--t-text)" }}>
              <span>Total</span>
              <span className="tabular-nums">{gb.currency} {totalValue.toFixed(2)}</span>
            </div>
          </div>
        </>
      )}
      {rows.length === 0 && <div className="text-center py-16 text-[12px]" style={{ color: "var(--t-muted)" }}>No orders found for this filter</div>}
    </div>
  );
}

// ─── Admin Fee Countries Tab (Organiser) ──────────────────────────────────────

function OrgAdminFeeCountriesTab({ gb, onUpdate }: { gb: OrganiserGB; onUpdate: (updated: OrganiserGB) => void }) {
  type Entry = { country: string; amount: number; enabled: boolean };
  const [entries, setEntries] = useState<Entry[]>((gb.adminFeeCountries ?? []).map(e => ({ ...e })));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCountry, setNewCountry] = useState<string>(COUNTRIES[0] ?? "");
  const [newAmount, setNewAmount] = useState("");

  const addEntry = () => {
    if (!newCountry || newAmount === "" || isNaN(parseFloat(newAmount))) return;
    if (entries.some(e => e.country === newCountry)) { setError("That country is already in the list."); return; }
    setEntries(prev => [...prev, { country: newCountry, amount: parseFloat(newAmount), enabled: true }]);
    setNewAmount(""); setError(null);
  };

  const removeEntry = (country: string) => setEntries(prev => prev.filter(e => e.country !== country));
  const updateEntry = (country: string, field: "amount" | "enabled", val: number | boolean) =>
    setEntries(prev => prev.map(e => e.country === country ? { ...e, [field]: val } : e));

  const save = async () => {
    setSaving(true); setError(null);
    const res = await fetch(`/api/organiser/group-buys/${gb.id}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminFeeCountries: entries }),
    });
    if (res.ok) {
      const updated = await res.json();
      onUpdate(updated);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } else {
      const d = await res.json().catch(() => ({}));
      setError((d as { error?: string }).error ?? "Failed to save.");
    }
    setSaving(false);
  };

  return (
    <SectionCard>
      <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--t-primary)" }}>Admin Fee by Country</h2>
      <p className="text-xs mb-4" style={{ color: "var(--t-subtle)" }}>
        Override the base admin fee for specific delivery countries. Enabled entries take precedence over the default fee.
      </p>

      {entries.length > 0 ? (
        <div className="space-y-2 mb-4">
          {entries.map(e => (
            <div key={e.country} className="flex items-center gap-2 rounded-xl p-3" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
              <div className="flex-1 text-sm font-medium" style={{ color: "var(--t-primary)" }}>
                {e.country}
              </div>
              <span className="text-xs" style={{ color: "var(--t-subtle)" }}>{gb.currency}</span>
              <input
                type="number" min="0" step="0.01" value={e.amount}
                onChange={ev => updateEntry(e.country, "amount", parseFloat(ev.target.value) || 0)}
                className="w-20 rounded-lg px-2 py-1 text-xs focus:outline-none"
                style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-primary)" }}
              />
              <button type="button" onClick={() => updateEntry(e.country, "enabled", !e.enabled)}
                className="p-1 rounded-md transition-colors text-xs font-semibold px-2"
                style={{ background: e.enabled ? "rgba(22,163,74,0.1)" : "rgba(100,116,139,0.1)", color: e.enabled ? "#16A34A" : "#64748B", border: "1px solid currentColor" }}>
                {e.enabled ? "On" : "Off"}
              </button>
              <button type="button" onClick={() => removeEntry(e.country)} className="p-1 rounded-md" style={{ color: "var(--t-muted)" }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-center py-4" style={{ color: "var(--t-subtle)" }}>No country fee overrides yet.</p>
      )}

      {/* Add new entry */}
      <div className="flex items-end gap-2 mb-4 pt-3" style={{ borderTop: "1px solid var(--t-border)" }}>
        <div className="flex-1">
          <label className="block text-[10px] mb-1 font-medium" style={{ color: "var(--t-subtle)" }}>Country</label>
          <select value={newCountry} onChange={e => setNewCountry(e.target.value)}
            className="w-full rounded-xl px-2 py-2 text-sm focus:outline-none"
            style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-primary)" }}>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] mb-1 font-medium" style={{ color: "var(--t-subtle)" }}>Amount ({gb.currency})</label>
          <input type="number" min="0" step="0.01" placeholder="0.00" value={newAmount}
            onChange={e => setNewAmount(e.target.value)}
            className="w-24 rounded-xl px-2 py-2 text-sm focus:outline-none"
            style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-primary)" }} />
        </div>
        <button type="button" onClick={addEntry}
          className="px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5"
          style={{ background: "var(--t-blue-10)", color: "var(--t-blue)", border: "1px solid var(--t-blue)" }}>
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      <button type="button" onClick={save} disabled={saving}
        className="w-full px-4 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
        style={{ background: "var(--t-blue)", color: "#fff", opacity: saving ? 0.7 : 1 }}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? "Saved!" : "Save Changes"}
      </button>
    </SectionCard>
  );
}

// ─── Shared Shipping Tab ──────────────────────────────────────────────────────

function OrgSharedShippingTab({ gb, onUpdate }: { gb: OrganiserGB; onUpdate: (updated: OrganiserGB) => void }) {
  const [countries, setCountries] = useState<string[]>((gb.sharedShippingCountries ?? []).slice());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCountry, setNewCountry] = useState<string>(COUNTRIES[0] ?? "");

  const addCountry = () => {
    if (!newCountry) return;
    if (countries.includes(newCountry)) { setError("That country is already in the list."); return; }
    setCountries(prev => [...prev, newCountry]);
    setError(null);
  };

  const removeCountry = (c: string) => setCountries(prev => prev.filter(x => x !== c));

  const save = async () => {
    setSaving(true); setError(null);
    const res = await fetch(`/api/organiser/group-buys/${gb.id}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sharedShippingCountries: countries }),
    });
    if (res.ok) {
      const updated = await res.json();
      onUpdate(updated);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } else {
      const d = await res.json().catch(() => ({}));
      setError((d as { error?: string }).error ?? "Failed to save.");
    }
    setSaving(false);
  };

  return (
    <SectionCard>
      <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--t-primary)" }}>Shared Shipping by Country</h2>
      <p className="text-xs mb-4" style={{ color: "var(--t-subtle)" }}>
        Customers who order from multiple of your group buys will only pay vendor shipping once per country listed here. If a customer in an eligible country already has another order (with shipping) from one of your GBs, their shipping fee will be waived on this one.
      </p>

      {countries.length > 0 ? (
        <div className="space-y-2 mb-4">
          {countries.map(c => (
            <div key={c} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
              <span className="text-sm font-medium" style={{ color: "var(--t-primary)" }}>{c}</span>
              <button type="button" onClick={() => removeCountry(c)} className="p-1 rounded-md" style={{ color: "var(--t-muted)" }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-center py-4" style={{ color: "var(--t-subtle)" }}>No countries configured yet. Add countries below to enable shared shipping.</p>
      )}

      <div className="flex items-end gap-2 mb-4 pt-3" style={{ borderTop: "1px solid var(--t-border)" }}>
        <div className="flex-1">
          <label className="block text-[10px] mb-1 font-medium" style={{ color: "var(--t-subtle)" }}>Country</label>
          <select value={newCountry} onChange={e => setNewCountry(e.target.value)}
            className="w-full rounded-xl px-2 py-2 text-sm focus:outline-none"
            style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-primary)" }}>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button type="button" onClick={addCountry}
          className="px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5"
          style={{ background: "var(--t-blue-10)", color: "var(--t-blue)", border: "1px solid var(--t-blue)" }}>
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      <button type="button" onClick={save} disabled={saving}
        className="w-full px-4 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
        style={{ background: "var(--t-blue)", color: "#fff", opacity: saving ? 0.7 : 1 }}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? "Saved!" : "Save Changes"}
      </button>
    </SectionCard>
  );
}

// ─── Broadcast Tab ────────────────────────────────────────────────────────────

function BroadcastTab({ gb }: { gb: OrganiserGB }) {
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; skipped: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<{ telegramUsername: string; hasTelegram: boolean }[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [targetMode, setTargetMode] = useState<"all" | "selected">("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [selectedUsernames, setSelectedUsernames] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState("");
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [selectedProductNames, setSelectedProductNames] = useState<Set<string>>(new Set());
  const MAX = 4000;

  const PAYMENT_STATUS_OPTIONS = [
    { value: "all", label: "All Members" },
    { value: "paid", label: "Paid Orders" },
    { value: "unpaid", label: "Unpaid Orders" },
    { value: "pending_confirmation", label: "Pending Confirmation" },
    { value: "submitted", label: "Status: Submitted" },
    { value: "processing", label: "Status: Processing" },
    { value: "dispatched", label: "Status: Dispatched" },
  ];

  useEffect(() => {
    setMembersLoading(true);
    setSelectedUsernames(new Set());
    setTargetMode("all");
    fetch(`/api/organiser/group-buys/${gb.id}/members`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setMembersLoading(false));
    fetch(`/api/organiser/group-buys/${gb.id}/products`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((data: { id: string; name: string }[]) => setProducts(data))
      .catch(() => setProducts([]));
  }, [gb.id]);

  const filteredMembers = members.filter(m =>
    !memberSearch.trim() || m.telegramUsername.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const toggleMember = (username: string) => {
    setSelectedUsernames(prev => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username); else next.add(username);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedUsernames.size === filteredMembers.length) {
      setSelectedUsernames(new Set());
    } else {
      setSelectedUsernames(new Set(filteredMembers.map(m => m.telegramUsername)));
    }
  };

  const handleSend = async () => {
    if (!msg.trim()) return;
    const isTargeted = targetMode === "selected";
    const targets = isTargeted ? Array.from(selectedUsernames) : [];
    if (isTargeted && targets.length === 0) { setError("Select at least one recipient."); return; }
    const recipientLabel = isTargeted ? `${targets.length} selected member${targets.length !== 1 ? "s" : ""}` : `all members of ${gb.name}`;
    if (!confirm(`Send this message to ${recipientLabel} on Telegram?`)) return;
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const body: Record<string, unknown> = { message: msg };
      if (isTargeted) {
        body.targetUsernames = targets;
      } else {
        if (paymentStatusFilter !== "all") body.paymentStatusFilter = paymentStatusFilter;
        if (selectedProductNames.size > 0) body.productFilter = Array.from(selectedProductNames);
      }
      const res = await fetch(`/api/organiser/group-buys/${gb.id}/broadcast`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to send broadcast"); }
      else { setResult(data); setMsg(""); setSelectedUsernames(new Set()); setTargetMode("all"); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionCard>
        <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--t-primary)" }}>Send Telegram Message</h2>
        <p className="text-xs mb-4" style={{ color: "var(--t-subtle)" }}>
          Send a message to members of <strong>{gb.name}</strong> who have linked their Telegram account. Choose all members or select specific recipients.
        </p>

        {/* Recipients toggle */}
        <div className="flex gap-2 mb-3">
          {(["all", "selected"] as const).map(mode => (
            <button
              key={mode}
              type="button"
              onClick={() => { setTargetMode(mode); setError(null); setResult(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
              style={targetMode === mode
                ? { background: "var(--t-blue)", borderColor: "var(--t-blue)", color: "#fff" }
                : { background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-muted)" }}
            >
              {mode === "all" ? <Users size={12} /> : <UserCheck size={12} />}
              {mode === "all" ? `All Members (${members.length})` : "Select Recipients"}
            </button>
          ))}
        </div>

        {/* Payment status filter (when targeting all) */}
        {targetMode === "all" && (
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--t-subtle)" }}>Filter by payment / order status</label>
            <select
              value={paymentStatusFilter}
              onChange={e => setPaymentStatusFilter(e.target.value)}
              className="w-full rounded-xl text-sm px-3 py-2 focus:outline-none"
              style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-primary)" }}
            >
              {PAYMENT_STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Product filter (when targeting all) */}
        {targetMode === "all" && products.length > 0 && (
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--t-subtle)" }}>
              Filter by product{selectedProductNames.size > 0 ? ` (${selectedProductNames.size} selected)` : " (optional — leave empty for all)"}
            </label>
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--t-border)" }}>
              <div className="max-h-40 overflow-y-auto">
                {products.map(p => (
                  <label key={p.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[var(--t-surface2)] transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedProductNames.has(p.name)}
                      onChange={() => setSelectedProductNames(prev => {
                        const next = new Set(prev);
                        if (next.has(p.name)) next.delete(p.name); else next.add(p.name);
                        return next;
                      })}
                      className="rounded"
                    />
                    <span className="text-sm flex-1" style={{ color: "var(--t-primary)" }}>{p.name}</span>
                  </label>
                ))}
              </div>
              {selectedProductNames.size > 0 && (
                <div className="px-3 py-1.5 border-t flex items-center justify-between text-xs" style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-blue)" }}>
                  <span>{selectedProductNames.size} product{selectedProductNames.size !== 1 ? "s" : ""} selected — only buyers of these products will receive the message</span>
                  <button type="button" onClick={() => setSelectedProductNames(new Set())} className="ml-2 underline">Clear</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Member picker */}
        {targetMode === "selected" && (
          <div className="mb-4 rounded-xl border overflow-hidden" style={{ borderColor: "var(--t-border)" }}>
            <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)" }}>
              <Search size={13} style={{ color: "var(--t-muted)" }} />
              <input
                type="text"
                placeholder="Search members…"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{ color: "var(--t-primary)" }}
              />
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-medium px-2 py-0.5 rounded"
                style={{ background: "rgba(27,58,122,0.1)", color: "var(--t-blue)" }}
              >
                {selectedUsernames.size === filteredMembers.length && filteredMembers.length > 0 ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="max-h-52 overflow-y-auto">
              {membersLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 size={16} className="animate-spin" style={{ color: "var(--t-muted)" }} />
                </div>
              ) : filteredMembers.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: "var(--t-muted)" }}>No members found.</p>
              ) : filteredMembers.map(m => (
                <label
                  key={m.telegramUsername}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[var(--t-surface2)] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedUsernames.has(m.telegramUsername)}
                    onChange={() => toggleMember(m.telegramUsername)}
                    disabled={!m.hasTelegram}
                    className="rounded"
                  />
                  <span className="text-sm flex-1" style={{ color: m.hasTelegram ? "var(--t-primary)" : "var(--t-muted)" }}>
                    @{m.telegramUsername}
                  </span>
                  {!m.hasTelegram && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>No Telegram</span>
                  )}
                </label>
              ))}
            </div>
            {selectedUsernames.size > 0 && (
              <div className="px-3 py-1.5 border-t text-xs" style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-blue)" }}>
                {selectedUsernames.size} recipient{selectedUsernames.size !== 1 ? "s" : ""} selected
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <textarea
            className="w-full rounded-lg border text-sm p-3 resize-none focus:outline-none focus:ring-2"
            style={{
              background: "var(--t-surface)",
              borderColor: "var(--t-border)",
              color: "var(--t-primary)",
              minHeight: "140px",
            }}
            placeholder="Write your message here…"
            value={msg}
            maxLength={MAX}
            onChange={e => { setMsg(e.target.value); setResult(null); setError(null); }}
            disabled={sending}
          />
          <div className="flex justify-end">
            <span className="text-xs" style={{ color: msg.length > MAX * 0.9 ? "#EF4444" : "var(--t-subtle)" }}>
              {msg.length}/{MAX}
            </span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm p-3 rounded-lg mt-3" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        {result && (
          <div className="flex items-start gap-2 text-sm p-3 rounded-lg mt-3" style={{ background: "rgba(22,163,74,0.1)", color: "#16A34A" }}>
            <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
            <span>
              Sent to <strong>{result.sent}</strong> of <strong>{result.total}</strong> member{result.total !== 1 ? "s" : ""}.
              {result.skipped > 0 && ` ${result.skipped} skipped (no Telegram linked).`}
            </span>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSend}
            disabled={sending || !msg.trim() || (targetMode === "selected" && selectedUsernames.size === 0)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ background: "var(--t-blue)", color: "#fff" }}
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <SendHorizonal size={14} />}
            {sending ? "Sending…" : targetMode === "all" ? "Send to all members" : `Send to ${selectedUsernames.size} member${selectedUsernames.size !== 1 ? "s" : ""}`}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── OrganiserReshippersTab ───────────────────────────────────────────────────

interface OrgReshipper {
  id: string;
  gbId: string;
  reshipperUsername: string;
  country: string;
  enabledPaymentMethods: {
    usdtEnabled?: boolean;
    revolutEnabled?: boolean;
    paypalEnabled?: boolean;
    cryptoEnabled?: boolean;
    anonPayEnabled?: boolean;
  } | null;
  enabled: boolean;
  paymentTarget: string;
  createdAt: string;
}

interface ApprovedReshipper {
  telegramUsername: string;
  reshipperPaymentMethods: Record<string, unknown> | null;
}

const PAYMENT_METHOD_KEYS = [
  { key: "usdtEnabled", label: "USDT" },
  { key: "revolutEnabled", label: "Revolut" },
  { key: "paypalEnabled", label: "PayPal" },
  { key: "cryptoEnabled", label: "Crypto" },
  { key: "anonPayEnabled", label: "AnonPay" },
] as const;

function AssignmentCard({
  assignment,
  onSave,
  onRemove,
}: {
  assignment: OrgReshipper;
  onSave: (username: string, patch: Partial<OrgReshipper>) => Promise<void>;
  onRemove: (username: string) => Promise<boolean>;
}) {
  const [enabled, setEnabled] = useState(assignment.enabled);
  const [paymentTarget, setPaymentTarget] = useState(assignment.paymentTarget);
  const [methods, setMethods] = useState<Record<string, boolean>>(
    (assignment.enabledPaymentMethods ?? {}) as Record<string, boolean>,
  );
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  const isDirty =
    enabled !== assignment.enabled ||
    paymentTarget !== assignment.paymentTarget ||
    PAYMENT_METHOD_KEYS.some(({ key }) => (methods[key] ?? false) !== ((assignment.enabledPaymentMethods as Record<string, boolean> | null)?.[key] ?? false));

  async function handleSave() {
    setSaving(true);
    await onSave(assignment.reshipperUsername, {
      enabled,
      paymentTarget,
      enabledPaymentMethods: methods as OrgReshipper["enabledPaymentMethods"],
    });
    setSaving(false);
  }

  async function handleRemove() {
    setRemoving(true);
    const ok = await onRemove(assignment.reshipperUsername);
    if (!ok) {
      setRemoving(false);
      setConfirmRemove(false);
    }
  }

  function toggleMethod(key: string, val: boolean) {
    setMethods(prev => ({ ...prev, [key]: val }));
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>@{assignment.reshipperUsername}</p>
          <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>{assignment.country}</p>
        </div>
        {!confirmRemove ? (
          <button
            type="button"
            onClick={() => setConfirmRemove(true)}
            className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
            style={{ color: "#DC2626" }}
            title="Remove assignment"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium" style={{ color: "#DC2626" }}>Remove?</span>
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="px-2 py-1 text-[11px] font-bold rounded-lg text-white"
              style={{ background: "#DC2626" }}
            >
              {removing ? "…" : "Yes"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmRemove(false)}
              className="px-2 py-1 text-[11px] font-bold rounded-lg"
              style={{ background: "var(--t-border)", color: "var(--t-text)" }}
            >
              No
            </button>
          </div>
        )}
      </div>

      <ToggleRow
        label="Route enabled"
        hint="When disabled, orders from this country won't be routed to this reshipper"
        value={enabled}
        onChange={setEnabled}
      />
      <ToggleRow
        label="Payment to reshipper"
        hint="When on: buyers pay reshipper directly. When off: buyers pay admin."
        value={paymentTarget === "reshipper"}
        onChange={v => setPaymentTarget(v ? "reshipper" : "admin")}
      />

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--t-subtle)" }}>Enabled payment methods</p>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHOD_KEYS.map(({ key, label }) => {
            const active = methods[key] ?? false;
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleMethod(key, !active)}
                className="px-3 py-1 text-[11px] font-bold rounded-full border transition-all"
                style={active
                  ? { background: "var(--t-blue)", color: "#fff", borderColor: "var(--t-blue)" }
                  : { background: "transparent", color: "var(--t-subtle)", borderColor: "var(--t-border)" }
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {isDirty && (
        <div className="pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-4 rounded-xl font-bold text-sm text-white flex items-center gap-2 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, var(--t-blue) 0%, #1E3A8A 100%)" }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}
    </div>
  );
}

function OrganiserReshippersTab({ gb }: { gb: OrganiserGB }) {
  const [assignments, setAssignments] = useState<OrgReshipper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite code — seed from existing GB value so it's visible immediately on mount
  const [inviteCode, setInviteCode] = useState<string | null>(gb.reshipperInviteCode ?? null);
  const [generatingCode, setGeneratingCode] = useState(false);

  // Add form
  const [addOpen, setAddOpen] = useState(false);
  const [approvedReshippers, setApprovedReshippers] = useState<ApprovedReshipper[]>([]);
  const [loadingReshippers, setLoadingReshippers] = useState(false);
  const [reshipperSearch, setReshipperSearch] = useState("");
  const [selectedReshipper, setSelectedReshipper] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [addMethods, setAddMethods] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Orders force-assign
  const [orders, setOrders] = useState<OrgOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [orderReassignTarget, setOrderReassignTarget] = useState<Record<string, string>>({});
  const [orderReassigning, setOrderReassigning] = useState<string | null>(null);
  const [orderReassignResult, setOrderReassignResult] = useState<Record<string, { ok: boolean; text: string }>>({});

  useEffect(() => {
    setLoading(true);
    fetch(`/api/organiser/group-buys/${gb.id}/reshippers`, { credentials: "include" })
      .then(r => r.json())
      .then((data: OrgReshipper[] | { error: string }) => {
        if (Array.isArray(data)) setAssignments(data);
        else setError((data as { error: string }).error);
      })
      .catch(() => setError("Failed to load reshipper assignments"))
      .finally(() => setLoading(false));
  }, [gb.id]);

  function openAddForm() {
    setAddOpen(true);
    if (approvedReshippers.length > 0) return;
    setLoadingReshippers(true);
    fetch("/api/organiser/approved-reshippers", { credentials: "include" })
      .then(r => r.json())
      .then((data: ApprovedReshipper[]) => setApprovedReshippers(data))
      .catch(() => {})
      .finally(() => setLoadingReshippers(false));
  }

  async function handleSave(username: string, patch: Partial<OrgReshipper>) {
    const r = await fetch(`/api/organiser/group-buys/${gb.id}/reshippers/${username}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });
    if (!r.ok) { setError("Failed to save changes"); return; }
    const updated: OrgReshipper = await r.json();
    setAssignments(prev => prev.map(a => a.reshipperUsername === username ? updated : a));
  }

  async function handleRemove(username: string): Promise<boolean> {
    try {
      const r = await fetch(`/api/organiser/group-buys/${gb.id}/reshippers/${username}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (r.ok) {
        setAssignments(prev => prev.filter(a => a.reshipperUsername !== username));
        return true;
      }
      setError("Failed to remove assignment");
      return false;
    } catch {
      setError("Failed to remove assignment");
      return false;
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReshipper || !selectedCountry) return;
    setAdding(true);
    setAddError(null);
    const r = await fetch(`/api/organiser/group-buys/${gb.id}/reshippers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        reshipperUsername: selectedReshipper,
        country: selectedCountry,
        enabledPaymentMethods: addMethods,
      }),
    });
    const data: OrgReshipper | { error: string } = await r.json();
    setAdding(false);
    if (!r.ok) { setAddError((data as { error: string }).error); return; }
    setAssignments(prev => [...prev, data as OrgReshipper]);
    setAddOpen(false);
    setSelectedReshipper(null);
    setSelectedCountry("");
    setReshipperSearch("");
    setAddMethods({});
  }

  async function loadOrders() {
    if (ordersLoaded) return;
    setLoadingOrders(true);
    try {
      const r = await fetch(`/api/organiser/group-buys/${gb.id}/orders`, { credentials: "include" });
      if (r.ok) {
        const data: OrgOrder[] = await r.json();
        setOrders(data);
        setOrdersLoaded(true);
      }
    } finally { setLoadingOrders(false); }
  }

  async function forceAssignOrder(orderId: string) {
    const newReshipper = orderReassignTarget[orderId] ?? "";
    setOrderReassigning(orderId);
    try {
      const r = await fetch(`/api/organiser/group-buys/${gb.id}/orders/${orderId}/reassign-reshipper`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reshipperUsername: newReshipper || null }),
      });
      const data: { ok?: boolean; reshipperUsername?: string | null; error?: string } = await r.json();
      if (!r.ok) {
        setOrderReassignResult(prev => ({ ...prev, [orderId]: { ok: false, text: data.error ?? "Failed" } }));
      } else {
        const assigned = data.reshipperUsername ?? null;
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, reshipperUsername: assigned } : o));
        setOrderReassignResult(prev => ({ ...prev, [orderId]: { ok: true, text: assigned ? `Assigned to @${assigned} ✓` : "Reshipper cleared ✓" } }));
        setTimeout(() => setOrderReassignResult(prev => ({ ...prev, [orderId]: { ok: false, text: "" } })), 3000);
      }
    } catch {
      setOrderReassignResult(prev => ({ ...prev, [orderId]: { ok: false, text: "Network error" } }));
    }
    setOrderReassigning(null);
  }

  async function generateInviteCode() {
    setGeneratingCode(true);
    const r = await fetch(`/api/organiser/group-buys/${gb.id}/reshipper-invite-code`, {
      method: "POST",
      credentials: "include",
    });
    const data: { ok?: boolean; reshipperInviteCode?: string; error?: string } = await r.json();
    setGeneratingCode(false);
    if (data.reshipperInviteCode) setInviteCode(data.reshipperInviteCode);
    else setError(data.error ?? "Failed to generate invite code");
  }

  const assignedUsernames = new Set(assignments.map(a => a.reshipperUsername));
  const filteredReshippers = approvedReshippers.filter(
    r => !assignedUsernames.has(r.telegramUsername) &&
      r.telegramUsername.toLowerCase().includes(reshipperSearch.toLowerCase()),
  );
  const filteredCountries = COUNTRIES.filter(c =>
    c.toLowerCase().includes(countrySearch.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {error && <ErrorBanner msg={error} onClose={() => setError(null)} />}

      {/* Invite Code */}
      <SectionCard>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Reshipper Invite Code</p>
            <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>
              Share this code so reshippers can self-join this GB via the join flow.
            </p>
            {inviteCode && (
              <div className="mt-2 flex items-center gap-2">
                <code className="px-3 py-1.5 rounded-lg text-sm font-mono font-bold tracking-widest"
                  style={{ background: "var(--t-blue-10)", color: "var(--t-blue)" }}>
                  {inviteCode}
                </code>
                <button
                  type="button"
                  onClick={() => { void navigator.clipboard.writeText(inviteCode); }}
                  className="p-1.5 rounded hover:opacity-70"
                  style={{ color: "var(--t-subtle)" }}
                  title="Copy to clipboard"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={generateInviteCode}
            disabled={generatingCode}
            className="shrink-0 h-9 px-4 rounded-xl font-bold text-sm text-white flex items-center gap-2 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, var(--t-blue) 0%, #1E3A8A 100%)" }}
          >
            {generatingCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {inviteCode ? "Regenerate" : "Generate code"}
          </button>
        </div>
      </SectionCard>

      {/* Assignments list */}
      <SectionCard>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>
            Assignments{assignments.length > 0 && <span className="ml-1.5 text-[11px] font-normal" style={{ color: "var(--t-subtle)" }}>({assignments.length})</span>}
          </p>
          <button
            type="button"
            onClick={openAddForm}
            className="h-8 px-3 rounded-lg text-[12px] font-bold flex items-center gap-1.5"
            style={{ background: "var(--t-blue-10)", color: "var(--t-blue)" }}
          >
            <Plus className="w-3.5 h-3.5" /> Add reshipper
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--t-subtle)" }} /></div>
        ) : assignments.length === 0 && !addOpen ? (
          <p className="text-center py-6 text-[12px]" style={{ color: "var(--t-subtle)" }}>
            No reshippers assigned yet. Add one above.
          </p>
        ) : (
          <div className="space-y-3">
            {assignments.map(a => (
              <AssignmentCard key={a.id} assignment={a} onSave={handleSave} onRemove={handleRemove} />
            ))}
          </div>
        )}

        {/* Add form */}
        {addOpen && (
          <form onSubmit={e => { void handleAdd(e); }} className="mt-4 pt-4 space-y-3" style={{ borderTop: "1px solid var(--t-border)" }}>
            <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Add reshipper</p>
            {addError && <ErrorBanner msg={addError} onClose={() => setAddError(null)} />}

            <Field label="Reshipper" icon={UserCheck}>
              <div className="relative">
                <div className="flex items-center gap-2 px-3 h-10 rounded-xl border" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                  <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--t-subtle)" }} />
                  <input
                    value={selectedReshipper ?? reshipperSearch}
                    onChange={e => {
                      if (selectedReshipper) setSelectedReshipper(null);
                      setReshipperSearch(e.target.value);
                    }}
                    onFocus={() => { if (selectedReshipper) setSelectedReshipper(null); }}
                    placeholder="Search approved reshippers…"
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: "var(--t-text)" }}
                  />
                  {selectedReshipper && <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />}
                </div>
                {!selectedReshipper && reshipperSearch && (
                  <div className="absolute z-10 w-full mt-1 rounded-xl shadow-lg overflow-hidden" style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)" }}>
                    {loadingReshippers ? (
                      <div className="px-4 py-3 text-xs text-center" style={{ color: "var(--t-subtle)" }}>Loading…</div>
                    ) : filteredReshippers.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-center" style={{ color: "var(--t-subtle)" }}>No match</div>
                    ) : filteredReshippers.slice(0, 8).map(r => (
                      <button
                        key={r.telegramUsername}
                        type="button"
                        onClick={() => { setSelectedReshipper(r.telegramUsername); setReshipperSearch(r.telegramUsername); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:opacity-70 transition-opacity"
                        style={{ color: "var(--t-text)" }}
                      >
                        @{r.telegramUsername}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Field>

            <Field label="Country" icon={Globe}>
              <div className="relative">
                <div className="flex items-center gap-2 px-3 h-10 rounded-xl border" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                  <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--t-subtle)" }} />
                  <input
                    value={countryOpen ? countrySearch : selectedCountry}
                    onChange={e => { setCountrySearch(e.target.value); setCountryOpen(true); }}
                    onFocus={() => { setCountryOpen(true); setCountrySearch(""); }}
                    onBlur={() => setTimeout(() => setCountryOpen(false), 150)}
                    placeholder="Search countries…"
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: "var(--t-text)" }}
                  />
                  {selectedCountry && !countryOpen && <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />}
                </div>
                {countryOpen && (
                  <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto rounded-xl shadow-lg" style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)" }}>
                    {filteredCountries.slice(0, 30).map(c => (
                      <button
                        key={c}
                        type="button"
                        onMouseDown={() => { setSelectedCountry(c); setCountryOpen(false); setCountrySearch(""); }}
                        className="w-full text-left px-4 py-2 text-sm hover:opacity-70 transition-opacity"
                        style={{ color: "var(--t-text)" }}
                      >
                        {c}
                      </button>
                    ))}
                    {filteredCountries.length === 0 && (
                      <div className="px-4 py-3 text-xs text-center" style={{ color: "var(--t-subtle)" }}>No match</div>
                    )}
                  </div>
                )}
              </div>
            </Field>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--t-subtle)" }}>Enabled payment methods</p>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHOD_KEYS.map(({ key, label }) => {
                  const active = addMethods[key] ?? false;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAddMethods(prev => ({ ...prev, [key]: !active }))}
                      className="px-3 py-1 text-[11px] font-bold rounded-full border transition-all"
                      style={active
                        ? { background: "var(--t-blue)", color: "#fff", borderColor: "var(--t-blue)" }
                        : { background: "transparent", color: "var(--t-subtle)", borderColor: "var(--t-border)" }
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={!selectedReshipper || !selectedCountry || adding}
                className="h-9 px-4 rounded-xl font-bold text-sm text-white flex items-center gap-2 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, var(--t-blue) 0%, #1E3A8A 100%)" }}
              >
                {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                {adding ? "Adding…" : "Add assignment"}
              </button>
              <button
                type="button"
                onClick={() => { setAddOpen(false); setAddError(null); }}
                className="h-9 px-4 rounded-xl font-bold text-sm"
                style={{ background: "var(--t-border)", color: "var(--t-text)" }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </SectionCard>

      {/* Orders — Force Assign */}
      <SectionCard>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Force Assign Orders</p>
            <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>
              Manually assign any order to any reshipper in this GB, bypassing country restrictions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setOrdersOpen(o => !o);
              if (!ordersOpen) void loadOrders();
            }}
            className="h-8 px-3 rounded-lg text-[12px] font-bold flex items-center gap-1.5"
            style={{ background: "var(--t-blue-10)", color: "var(--t-blue)" }}
          >
            {ordersOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {ordersOpen ? "Hide" : "Show orders"}
          </button>
        </div>

        {ordersOpen && (
          <div className="space-y-2">
            {loadingOrders ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--t-subtle)" }} /></div>
            ) : orders.length === 0 ? (
              <p className="text-center py-4 text-[12px]" style={{ color: "var(--t-subtle)" }}>No orders found for this GB.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold px-1 py-1.5 rounded-lg" style={{ background: "rgba(99,102,241,0.08)", color: "#4F46E5" }}>
                  Manual override — country eligibility is not checked. Only reshippers assigned to this GB are shown.
                </p>
                {orders.map(order => {
                  const gbReshippers = assignments.map(a => a.reshipperUsername);
                  const result = orderReassignResult[order.id];
                  return (
                    <div key={order.id} className="rounded-xl p-3 space-y-2" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold" style={{ color: "var(--t-text)" }}>#{order.code} — @{order.telegramUsername}</p>
                          <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>
                            {order.shippingCountry ?? "No country"} · {order.status}
                          </p>
                          {order.reshipperUsername && (
                            <p className="text-[11px] mt-0.5" style={{ color: "var(--t-blue)" }}>
                              Current: @{order.reshipperUsername}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          className="flex-1 h-8 rounded-lg px-2 text-xs"
                          style={{ border: "1.5px solid var(--t-border)", background: "var(--t-surface)", color: "var(--t-text)" }}
                          value={orderReassignTarget[order.id] ?? order.reshipperUsername ?? ""}
                          onChange={e => setOrderReassignTarget(prev => ({ ...prev, [order.id]: e.target.value }))}
                        >
                          <option value="">— Clear reshipper —</option>
                          {gbReshippers.map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={orderReassigning === order.id}
                          onClick={() => { void forceAssignOrder(order.id); }}
                          className="h-8 px-3 rounded-lg text-[12px] font-bold text-white flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, #4F46E5 0%, #1E3A8A 100%)" }}
                        >
                          {orderReassigning === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          {orderReassigning === order.id ? "Saving…" : "Force Assign"}
                        </button>
                      </div>
                      {result?.text && (
                        <p className={`text-[11px] font-semibold ${result.ok ? "text-green-600" : "text-red-500"}`}>{result.text}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── OrganiserCountryLegsTab ──────────────────────────────────────────────────

interface OrgCountryLegReshipper {
  reshipperUsername: string;
  telegramUsername: string;
  paymentTarget: string | null;
  enabledPaymentMethods: string[] | null;
}

interface OrgCountryLeg {
  id: string;
  countryCode: string;
  countryName: string;
  inviteEnabled: boolean;
  inviteCode: string | null;
  status: string;
  sortOrder: number;
  message: string | null;
  countryNote: string | null;
  reshipper: OrgCountryLegReshipper | null;
  reshippers: OrgCountryLegReshipper[];
  orderCount: number;
}

function OrganiserCountryLegsTab({ gb }: { gb: OrganiserGB }) {
  const [legs, setLegs] = useState<OrgCountryLeg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [enabledLoading, setEnabledLoading] = useState(false);

  // Toggle country legs on/off for the GB
  const [legsEnabled, setLegsEnabled] = useState(gb.countryLegsEnabled);

  // Add form state
  const [newCountryCode, setNewCountryCode] = useState("");
  const [newCountryName, setNewCountryName] = useState("");
  const [newInviteEnabled, setNewInviteEnabled] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [textEdits, setTextEdits] = useState<Record<string, { message: string; countryNote: string }>>({});
  const [savingText, setSavingText] = useState<string | null>(null);

  // Backfill state
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<{ membersAssigned: number; ordersAssigned: number; skipped: number } | null>(null);
  const [backfillError, setBackfillError] = useState<string | null>(null);

  // Reshipper assignment inline form
  const [assigningLegId, setAssigningLegId] = useState<string | null>(null);
  const [reshipperOptions, setReshipperOptions] = useState<ApprovedReshipper[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [assignUsername, setAssignUsername] = useState("");
  const [assignSearch, setAssignSearch] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [unassigning, setUnassigning] = useState<string | null>(null);

  const openAssignForm = async (legId: string) => {
    setAssigningLegId(legId);
    setAssignUsername("");
    setAssignSearch("");
    setAssignError(null);
    if (reshipperOptions.length > 0) return;
    setLoadingOptions(true);
    try {
      const res = await fetch("/api/organiser/approved-reshippers", { credentials: "include" });
      if (res.ok) setReshipperOptions(await res.json());
    } finally { setLoadingOptions(false); }
  };

  const handleAssign = async (leg: OrgCountryLeg) => {
    if (!assignUsername) { setAssignError("Select a reshipper"); return; }
    setAssigning(true);
    setAssignError(null);
    try {
      const res = await fetch(`/api/organiser/group-buys/${gb.id}/reshippers`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reshipperUsername: assignUsername, country: leg.countryCode, enabledPaymentMethods: {} }),
      });
      const data: unknown = await res.json();
      if (!res.ok) { setAssignError((data as { error?: string }).error ?? "Failed to assign"); return; }
      setAssigningLegId(null);
      void loadLegs();
    } finally { setAssigning(false); }
  };

  const handleUnassign = async (_leg: OrgCountryLeg, username: string) => {
    setUnassigning(username);
    try {
      await fetch(`/api/organiser/group-buys/${gb.id}/reshippers/${encodeURIComponent(username)}`, {
        method: "DELETE", credentials: "include",
      });
      void loadLegs();
    } finally { setUnassigning(null); }
  };

  const loadLegs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/organiser/group-buys/${gb.id}/country-legs`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load country legs");
      setLegs(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [gb.id]);

  useEffect(() => { void loadLegs(); }, [loadLegs]);

  useEffect(() => {
    const init: Record<string, { message: string; countryNote: string }> = {};
    for (const leg of legs) {
      init[leg.id] = { message: leg.message ?? "", countryNote: leg.countryNote ?? "" };
    }
    setTextEdits(init);
  }, [legs]);

  const saveText = async (leg: OrgCountryLeg) => {
    const edit = textEdits[leg.id];
    if (!edit) return;
    setSavingText(leg.id);
    try {
      const res = await fetch(`/api/organiser/group-buys/${gb.id}/country-legs/${leg.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: edit.message, countryNote: edit.countryNote }),
      });
      if (res.ok) void loadLegs();
    } finally { setSavingText(null); }
  };

  const toggleLegsEnabled = async () => {
    setEnabledLoading(true);
    try {
      const res = await fetch(`/api/organiser/group-buys/${gb.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryLegsEnabled: !legsEnabled }),
      });
      if (res.ok) setLegsEnabled(e => !e);
    } finally { setEnabledLoading(false); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!newCountryCode.trim() || !newCountryName.trim()) { setAddError("Please select a country"); return; }
    setAdding(true);
    try {
      const res = await fetch(`/api/organiser/group-buys/${gb.id}/country-legs`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode: newCountryCode.trim().toUpperCase(), countryName: newCountryName.trim(), inviteEnabled: newInviteEnabled }),
      });
      if (!res.ok) { const d = await res.json(); setAddError(d.error || "Failed to add"); return; }
      setNewCountryCode(""); setNewCountryName(""); setNewInviteEnabled(false); setAddOpen(false);
      void loadLegs();
    } finally { setAdding(false); }
  };

  const handleBackfill = async () => {
    if (!confirm("This will auto-assign all unassigned members and their orders to country legs based on their account country. Continue?")) return;
    setBackfilling(true);
    setBackfillResult(null);
    setBackfillError(null);
    try {
      const res = await fetch(`/api/organiser/group-buys/${gb.id}/backfill-country-legs`, {
        method: "POST", credentials: "include",
      });
      const data: unknown = await res.json();
      if (!res.ok) { setBackfillError((data as { error?: string }).error ?? "Failed"); return; }
      setBackfillResult(data as { membersAssigned: number; ordersAssigned: number; skipped: number });
      void loadLegs();
    } finally { setBackfilling(false); }
  };

  const toggleInvite = async (leg: OrgCountryLeg) => {
    setSaving(leg.id);
    try {
      const res = await fetch(`/api/organiser/group-buys/${gb.id}/country-legs/${leg.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteEnabled: !leg.inviteEnabled }),
      });
      if (res.ok) void loadLegs();
    } finally { setSaving(null); }
  };

  const regenerateInvite = async (leg: OrgCountryLeg) => {
    setSaving(leg.id);
    try {
      const res = await fetch(`/api/organiser/group-buys/${gb.id}/country-legs/${leg.id}/regenerate-invite`, {
        method: "POST", credentials: "include",
      });
      if (res.ok) void loadLegs();
    } finally { setSaving(null); }
  };

  const toggleStatus = async (leg: OrgCountryLeg) => {
    setSaving(leg.id);
    try {
      const res = await fetch(`/api/organiser/group-buys/${gb.id}/country-legs/${leg.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: leg.status === "active" ? "closed" : "active" }),
      });
      if (res.ok) void loadLegs();
    } finally { setSaving(null); }
  };

  const deleteLeg = async (leg: OrgCountryLeg) => {
    if (!confirm(`Remove ${leg.countryName} from this group buy?`)) return;
    setSaving(leg.id);
    try {
      await fetch(`/api/organiser/group-buys/${gb.id}/country-legs/${leg.id}`, {
        method: "DELETE", credentials: "include",
      });
      void loadLegs();
    } finally { setSaving(null); }
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Country Sub-groups" icon={Globe}>
        {/* Enable toggle */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Enable Country Legs</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--t-subtle)" }}>
              Split this GB into per-country sub-groups with separate invite codes
            </p>
          </div>
          <button
            type="button"
            onClick={toggleLegsEnabled}
            disabled={enabledLoading}
            className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={legsEnabled ? { background: "rgba(22,163,74,0.12)", color: "#16A34A" } : { background: "var(--t-surface2)", color: "var(--t-subtle)" }}
          >
            {enabledLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : legsEnabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            {legsEnabled ? "Enabled" : "Disabled"}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--t-subtle)" }} /></div>
        ) : error ? (
          <div className="text-sm text-red-500 px-1">{error}</div>
        ) : (
          <div className="space-y-2">
            {legs.length === 0 && (
              <p className="text-sm text-center py-6" style={{ color: "var(--t-subtle)" }}>No country legs added yet.</p>
            )}
            {legs.map(leg => (
              <div
                key={leg.id}
                className="rounded-xl p-3 flex flex-col gap-2"
                style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{leg.countryCode}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--t-text)" }}>{leg.countryName}</p>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(59,130,246,0.12)", color: "#3B82F6" }}>{leg.orderCount} order{leg.orderCount !== 1 ? "s" : ""}</span>
                      </div>
                      <p className="text-[10px] font-medium" style={{ color: leg.status === "active" ? "#16A34A" : "var(--t-subtle)" }}>
                        {leg.status === "active" ? "Active" : "Closed"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleStatus(leg)}
                      disabled={saving === leg.id}
                      className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                      style={leg.status === "active"
                        ? { background: "rgba(59,130,246,0.1)", color: "#3B82F6" }
                        : { background: "rgba(22,163,74,0.1)", color: "#16A34A" }}
                    >
                      {leg.status === "active" ? "Close" : "Open"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteLeg(leg)}
                      disabled={saving === leg.id}
                      className="p-1 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Invite code section */}
                <div className="rounded-lg p-2.5 flex items-center justify-between gap-2" style={{ background: "var(--t-bg)" }}>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "var(--t-subtle)" }}>
                      Invite Code
                      {!leg.inviteEnabled && <span className="ml-1 text-[9px] normal-case font-medium">(disabled)</span>}
                    </p>
                    {leg.inviteEnabled && leg.inviteCode ? (
                      <p className="font-mono text-xs font-bold tracking-widest" style={{ color: "var(--t-text)" }}>{leg.inviteCode}</p>
                    ) : (
                      <p className="text-xs" style={{ color: "var(--t-subtle)" }}>No invite required</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {leg.inviteEnabled && leg.inviteCode && (
                      <button
                        type="button"
                        onClick={() => void navigator.clipboard.writeText(leg.inviteCode ?? "")}
                        className="p-1 rounded-lg"
                        title="Copy invite code"
                        style={{ color: "var(--t-subtle)" }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleInvite(leg)}
                      disabled={saving === leg.id}
                      className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                      style={leg.inviteEnabled
                        ? { background: "rgba(245,158,11,0.1)", color: "#D97706" }
                        : { background: "var(--t-surface2)", color: "var(--t-subtle)" }}
                    >
                      {leg.inviteEnabled ? "Disable" : "Enable"}
                    </button>
                    {leg.inviteEnabled && (
                      <button
                        type="button"
                        onClick={() => regenerateInvite(leg)}
                        disabled={saving === leg.id}
                        className="p-1 rounded-lg"
                        title="Regenerate invite code"
                      >
                        {saving === leg.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--t-subtle)" }} /> : <RefreshCw className="w-3.5 h-3.5" style={{ color: "var(--t-subtle)" }} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Reshipper assignment for this country leg */}
                <div className="rounded-lg px-2.5 py-2 space-y-2" style={{ background: "var(--t-bg)" }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Reshippers</p>
                    <button
                      type="button"
                      onClick={() => openAssignForm(leg.id)}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1"
                      style={{ background: "rgba(91,141,239,0.1)", color: "var(--t-blue)" }}
                    >
                      <Plus className="w-3 h-3" />Add
                    </button>
                  </div>

                  {/* List of all assigned reshippers */}
                  {(leg.reshippers?.length > 0 ? leg.reshippers : leg.reshipper ? [leg.reshipper] : []).map(r => {
                    const uname = r.reshipperUsername ?? r.telegramUsername;
                    return (
                      <div key={uname} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-semibold truncate" style={{ color: "var(--t-text)" }}>@{uname}</span>
                          {r.paymentTarget && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0" style={{ background: "rgba(27,58,122,0.08)", color: "var(--t-blue-deep)" }}>
                              Pay: {r.paymentTarget}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            title="Open leg view as this reshipper"
                            onClick={() => {
                              sessionStorage.setItem("peps_admin_preview_secret", (import.meta.env.VITE_ADMIN_PASSWORD as string) ?? "");
                              window.open(`/leg-view/${gb.id}?as=${encodeURIComponent(uname)}`, "_blank");
                            }}
                            className="p-1 rounded-lg hover:bg-blue-50 transition-colors"
                            style={{ color: "var(--t-blue)" }}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUnassign(leg, uname)}
                            disabled={unassigning === uname}
                            className="p-0.5 rounded"
                            title="Remove reshipper"
                            style={{ color: "var(--t-subtle)" }}
                          >
                            {unassigning === uname ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {(leg.reshippers?.length ?? 0) === 0 && !leg.reshipper && (
                    <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>No reshippers assigned</p>
                  )}

                  {/* Inline assignment form */}
                  <AnimatePresence>
                    {assigningLegId === leg.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-1 space-y-2">
                          {loadingOptions ? (
                            <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--t-subtle)" }} /></div>
                          ) : (
                            <>
                              <input
                                value={assignSearch}
                                onChange={e => setAssignSearch(e.target.value)}
                                placeholder="Search reshippers…"
                                className="w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                                style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
                              />
                              <div className="max-h-32 overflow-y-auto rounded-lg space-y-0.5" style={{ border: "1px solid var(--t-border)" }}>
                                {reshipperOptions
                                  .filter(r => !assignSearch || r.telegramUsername.toLowerCase().includes(assignSearch.toLowerCase()))
                                  .map(r => (
                                    <button
                                      key={r.telegramUsername}
                                      type="button"
                                      onClick={() => setAssignUsername(r.telegramUsername)}
                                      className="w-full text-left px-2.5 py-1.5 text-xs transition-colors"
                                      style={{
                                        background: assignUsername === r.telegramUsername ? "rgba(91,141,239,0.12)" : "transparent",
                                        color: assignUsername === r.telegramUsername ? "var(--t-blue)" : "var(--t-text)",
                                      }}
                                    >
                                      @{r.telegramUsername}
                                    </button>
                                  ))}
                                {reshipperOptions.length === 0 && (
                                  <p className="text-xs px-2.5 py-2" style={{ color: "var(--t-subtle)" }}>No approved reshippers</p>
                                )}
                              </div>
                            </>
                          )}
                          {assignError && <p className="text-[10px] text-red-500">{assignError}</p>}
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleAssign(leg)}
                              disabled={assigning || !assignUsername}
                              className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold text-white"
                              style={{ background: "var(--t-blue)", opacity: !assignUsername ? 0.5 : 1 }}
                            >
                              {assigning ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setAssigningLegId(null)}
                              className="px-2.5 py-1.5 rounded-lg text-[11px]"
                              style={{ background: "var(--t-surface2)", color: "var(--t-subtle)" }}
                            >Cancel</button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Message */}
                <div className="rounded-lg px-2.5 py-2 space-y-1" style={{ background: "var(--t-bg)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Message</p>
                  <textarea
                    rows={2}
                    value={textEdits[leg.id]?.message ?? ""}
                    onChange={e => setTextEdits(prev => ({ ...prev, [leg.id]: { ...prev[leg.id], message: e.target.value } }))}
                    placeholder="Optional message for this country group…"
                    className="w-full text-xs rounded-lg px-2 py-1.5 focus:outline-none resize-none"
                    style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
                  />
                </div>

                {/* Country-only note */}
                <div className="rounded-lg px-2.5 py-2 space-y-1" style={{ background: "var(--t-bg)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Country-only Note</p>
                  <textarea
                    rows={2}
                    value={textEdits[leg.id]?.countryNote ?? ""}
                    onChange={e => setTextEdits(prev => ({ ...prev, [leg.id]: { ...prev[leg.id], countryNote: e.target.value } }))}
                    placeholder="Note shown exclusively to members of this country…"
                    className="w-full text-xs rounded-lg px-2 py-1.5 focus:outline-none resize-none"
                    style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => saveText(leg)}
                  disabled={savingText === leg.id}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 self-start disabled:opacity-60"
                  style={{ background: "var(--t-blue)", color: "#fff", opacity: savingText === leg.id ? 0.6 : 1 }}
                >
                  {savingText === leg.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Save
                </button>
              </div>
            ))}

            {/* Backfill from account countries */}
            {legsEnabled && legs.length > 0 && (
              <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(45,107,204,0.05)", border: "1.5px dashed rgba(45,107,204,0.25)" }}>
                <div>
                  <p className="text-xs font-bold" style={{ color: "#1B3A7A" }}>Assign unassigned members to legs</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--t-subtle)" }}>
                    Matches members (and their existing orders) to a country leg based on the country stored on their account. Only affects members with no leg assigned yet.
                  </p>
                </div>
                {backfillResult && (
                  <div className="rounded-lg px-3 py-2 text-[11px] font-medium space-y-0.5" style={{ background: "rgba(22,163,74,0.08)", color: "#15803d" }}>
                    <p>✓ {backfillResult.membersAssigned} member{backfillResult.membersAssigned !== 1 ? "s" : ""} assigned to legs</p>
                    <p>✓ {backfillResult.ordersAssigned} order{backfillResult.ordersAssigned !== 1 ? "s" : ""} updated</p>
                    {backfillResult.skipped > 0 && (
                      <p style={{ color: "#92400e" }}>⚠ {backfillResult.skipped} member{backfillResult.skipped !== 1 ? "s" : ""} skipped — no country on account or no matching leg</p>
                    )}
                  </div>
                )}
                {backfillError && <p className="text-[11px] text-red-500">{backfillError}</p>}
                <button
                  type="button"
                  onClick={() => void handleBackfill()}
                  disabled={backfilling}
                  className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-all"
                  style={{ background: "rgba(27,58,122,0.1)", color: "#1B3A7A" }}
                >
                  {backfilling ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  {backfilling ? "Assigning…" : "Run backfill"}
                </button>
              </div>
            )}

            {/* Add new leg */}
            <AnimatePresence>
              {addOpen && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  onSubmit={handleAdd}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl p-3 space-y-2 mt-1" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                    <p className="text-xs font-bold" style={{ color: "var(--t-text)" }}>Add Country</p>
                    <select
                      value={newCountryCode}
                      onChange={e => {
                        const entry = COUNTRY_LIST.find(c => c.code === e.target.value);
                        setNewCountryCode(e.target.value);
                        setNewCountryName(entry?.name ?? "");
                      }}
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                      style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
                    >
                      <option value="">Select a country…</option>
                      {COUNTRY_LIST.map(c => (
                        <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 text-xs cursor-pointer select-none" style={{ color: "var(--t-text)" }}>
                      <input type="checkbox" checked={newInviteEnabled} onChange={e => setNewInviteEnabled(e.target.checked)} className="rounded" />
                      Require invite code for this country
                    </label>
                    {addError && <p className="text-xs text-red-500">{addError}</p>}
                    <div className="flex gap-2">
                      <button
                        type="submit" disabled={adding}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold text-white"
                        style={{ background: "var(--t-blue)" }}
                      >
                        {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : "Add Country"}
                      </button>
                      <button type="button" onClick={() => setAddOpen(false)} className="px-3 py-2 rounded-lg text-xs" style={{ background: "var(--t-surface2)", color: "var(--t-subtle)" }}>Cancel</button>
                    </div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {!addOpen && (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                style={{ background: "var(--t-surface2)", color: "var(--t-subtle)", border: "1px dashed var(--t-border)" }}
              >
                <Plus className="w-3.5 h-3.5" /> Add Country
              </button>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Organiser Rules Tab ──────────────────────────────────────────────────────

type OrgRuleFormat = "standard" | "info" | "warning" | "important";
interface OrgRule { id: string; text: string; enabled: boolean; format: OrgRuleFormat; }

const ORG_RULE_FORMAT_LABELS: Record<OrgRuleFormat, string> = {
  standard: "Standard", info: "Info", warning: "Warning", important: "Important",
};
const ORG_RULE_FORMAT_COLORS: Record<OrgRuleFormat, string> = {
  standard: "var(--t-subtle)", info: "#3B82F6", warning: "#F59E0B", important: "#EF4444",
};

function OrganiserRulesTab({ gb }: { gb: OrganiserGB }) {
  const [rules, setRules] = useState<OrgRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/organiser/group-buys/${gb.id}/rules`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { setRules(Array.isArray(d.rules) ? d.rules : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [gb.id]);

  const update = (id: string, patch: Partial<OrgRule>) => {
    setRules(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r));
    setDirty(true);
  };
  const add = () => {
    setRules(rs => [...rs, { id: crypto.randomUUID(), text: "", enabled: true, format: "standard" }]);
    setDirty(true);
  };
  const remove = (id: string) => { setRules(rs => rs.filter(r => r.id !== id)); setDirty(true); };
  const move = (idx: number, dir: -1 | 1) => {
    const arr = [...rules];
    const t = idx + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    setRules(arr); setDirty(true);
  };

  const save = async () => {
    const valid = rules.filter(r => r.text.trim().length > 0);
    setSaving(true); setError(null); setSuccess(null);
    try {
      const res = await fetch(`/api/organiser/group-buys/${gb.id}/rules`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: valid }),
      });
      if (!res.ok) throw new Error(await res.text());
      const d = await res.json();
      setRules(Array.isArray(d.rules) ? d.rules : valid);
      setDirty(false);
      setSuccess("Rules saved.");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex justify-center py-10">
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--t-subtle)" }} />
    </div>
  );

  return (
    <div className="space-y-4 px-1">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-bold text-base" style={{ color: "var(--t-text)" }}>GB Rules</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--t-subtle)" }}>
            Rules shown to members when they place an order on this GB.
          </p>
        </div>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
          style={{ background: "var(--t-blue-deep)", color: "#fff" }}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
      {success && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">{success}</p>}

      <div className="space-y-2">
        {rules.length === 0 && (
          <div className="text-center py-8 rounded-xl border border-dashed" style={{ borderColor: "var(--t-border)", color: "var(--t-subtle)" }}>
            <Shield className="w-7 h-7 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No rules yet. Add your first one below.</p>
          </div>
        )}
        {rules.map((rule, i) => (
          <div
            key={rule.id}
            className="rounded-xl border p-3 space-y-2 transition-opacity"
            style={{ background: "var(--t-surface)", borderColor: "var(--t-border)", opacity: rule.enabled ? 1 : 0.5 }}
          >
            <div className="flex items-start gap-2">
              <button
                onClick={() => update(rule.id, { enabled: !rule.enabled })}
                className="mt-0.5 shrink-0"
                title={rule.enabled ? "Disable" : "Enable"}
              >
                {rule.enabled
                  ? <ToggleRight className="w-5 h-5" style={{ color: "var(--t-blue-deep)" }} />
                  : <ToggleLeft className="w-5 h-5" style={{ color: "var(--t-subtle)" }} />
                }
              </button>
              <textarea
                value={rule.text}
                onChange={e => update(rule.id, { text: e.target.value })}
                placeholder="Rule text…"
                rows={2}
                className="flex-1 text-sm resize-none rounded-lg border px-2 py-1 outline-none focus:ring-1"
                style={{ background: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
              />
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors">
                  <ArrowUp className="w-3.5 h-3.5" style={{ color: "var(--t-subtle)" }} />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === rules.length - 1} className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors">
                  <ArrowDown className="w-3.5 h-3.5" style={{ color: "var(--t-subtle)" }} />
                </button>
                <button onClick={() => remove(rule.id)} className="p-1 rounded hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1.5 pl-7 flex-wrap">
              {(["standard", "info", "warning", "important"] as OrgRuleFormat[]).map(f => (
                <button
                  key={f}
                  onClick={() => update(rule.id, { format: f })}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all"
                  style={{
                    borderColor: rule.format === f ? ORG_RULE_FORMAT_COLORS[f] : "var(--t-border)",
                    color: rule.format === f ? ORG_RULE_FORMAT_COLORS[f] : "var(--t-subtle)",
                    background: rule.format === f ? `${ORG_RULE_FORMAT_COLORS[f]}18` : "transparent",
                  }}
                >
                  {ORG_RULE_FORMAT_LABELS[f]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={add}
        className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl w-full justify-center border border-dashed transition-all hover:opacity-80"
        style={{ borderColor: "var(--t-blue-deep)", color: "var(--t-blue-deep)", background: "var(--t-blue-07)" }}
      >
        <Plus className="w-4 h-4" /> Add Rule
      </button>
    </div>
  );
}

// ─── Organiser Tickets Tab ────────────────────────────────────────────────────

interface OrgTicket {
  id: string;
  accountUsername: string;
  category: string;
  subject: string;
  status: string;
  groupBuyId: string | null;
  issueType: string | null;
  customerUnread: boolean;
  createdAt: string;
  updatedAt: string;
}

interface OrgTicketMessage {
  id: number;
  ticketId: string;
  authorRole: "customer" | "admin";
  authorUsername: string;
  body: string;
  createdAt: string;
}

const TICKET_STATUS_STYLE: Record<string, { text: string; bg: string }> = {
  open:        { text: "#16A34A", bg: "rgba(22,163,74,0.10)" },
  in_progress: { text: "#D97706", bg: "rgba(217,119,6,0.10)" },
  resolved:    { text: "#2563EB", bg: "rgba(37,99,235,0.10)" },
  closed:      { text: "#6B7280", bg: "rgba(107,114,128,0.10)" },
};

function OrgTicketsTab({ gb }: { gb: OrganiserGB }) {
  const [tickets, setTickets] = useState<OrgTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<{ ticket: OrgTicket; messages: OrgTicketMessage[] } | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const threadBottomRef = useRef<HTMLDivElement>(null);

  const loadTickets = useCallback(() => {
    setLoading(true);
    setFetchError(null);
    fetch(`/api/organiser/tickets?groupBuyId=${encodeURIComponent(gb.id)}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { setTickets(d.tickets ?? []); setLoading(false); })
      .catch(() => { setFetchError("Failed to load tickets"); setLoading(false); });
  }, [gb.id]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const openTicket = useCallback(async (ticketId: string) => {
    setSelectedId(ticketId);
    setThreadLoading(true);
    setThread(null);
    setReply("");
    setSendError(null);
    const r = await fetch(`/api/organiser/tickets/${ticketId}`, { credentials: "include" });
    const d = await r.json();
    setThread(d);
    setThreadLoading(false);
  }, []);

  useEffect(() => {
    if (thread) threadBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages.length]);

  const sendReply = async () => {
    if (!selectedId || !reply.trim() || sending) return;
    setSending(true);
    setSendError(null);
    const r = await fetch(`/api/organiser/tickets/${selectedId}/messages`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply.trim() }),
    });
    if (r.ok) {
      const msg: OrgTicketMessage = await r.json();
      setThread(prev => prev ? { ...prev, ticket: { ...prev.ticket, status: prev.ticket.status === "open" ? "in_progress" : prev.ticket.status }, messages: [...prev.messages, msg] } : prev);
      setTickets(prev => prev.map(t => t.id === selectedId ? { ...t, status: t.status === "open" ? "in_progress" : t.status, updatedAt: new Date().toISOString() } : t));
      setReply("");
    } else {
      const d = await r.json().catch(() => ({}));
      setSendError((d as { error?: string }).error ?? "Failed to send reply");
    }
    setSending(false);
  };

  if (selectedId) {
    const sc = TICKET_STATUS_STYLE[thread?.ticket.status ?? "open"] ?? TICKET_STATUS_STYLE["open"];
    return (
      <div className="flex flex-col" style={{ minHeight: 0, height: "100%" }}>
        <button
          onClick={() => { setSelectedId(null); setThread(null); }}
          className="flex items-center gap-1.5 text-xs font-semibold mb-4 self-start"
          style={{ color: "var(--t-blue)" }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to tickets
        </button>

        {threadLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--t-muted)" }} />
          </div>
        )}

        {thread && (
          <div className="flex flex-col gap-4" style={{ flex: 1, minHeight: 0 }}>
            <div className="p-3 rounded-xl" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--t-text)" }}>{thread.ticket.subject}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ color: sc.text, background: sc.bg }}>
                  {thread.ticket.status.replace("_", " ")}
                </span>
                <span className="text-[10px]" style={{ color: "var(--t-muted)" }}>from @{thread.ticket.accountUsername}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto" style={{ flex: 1, minHeight: 120 }}>
              {thread.messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.authorRole === "customer" ? "justify-start" : "justify-end"}`}>
                  <div
                    className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm"
                    style={msg.authorRole === "customer"
                      ? { background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }
                      : { background: "rgba(91,141,239,0.12)", color: "var(--t-text)", border: "1px solid rgba(91,141,239,0.22)" }}
                  >
                    <p className="text-[10px] font-semibold mb-1" style={{ color: "var(--t-muted)" }}>
                      @{msg.authorUsername} · {new Date(msg.createdAt).toLocaleString()}
                    </p>
                    <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{msg.body}</p>
                  </div>
                </div>
              ))}
              <div ref={threadBottomRef} />
            </div>

            {thread.ticket.status !== "closed" && (
              <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid var(--t-border)" }}>
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder="Type your reply…"
                  rows={3}
                  className="flex-1 rounded-xl px-3 py-2 text-sm resize-none outline-none"
                  style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
                  onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply(); }}
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                  className="self-end px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40 transition-opacity"
                  style={{ background: "var(--t-blue)", color: "#fff" }}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizonal className="w-4 h-4" />}
                </button>
              </div>
            )}
            {sendError && <p className="text-xs text-red-500">{sendError}</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Support Tickets — {gb.name}</h2>
        <button
          onClick={loadTickets}
          className="p-1.5 rounded-lg"
          style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}
        >
          <RefreshCw className="w-3.5 h-3.5" style={{ color: "var(--t-muted)" }} />
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--t-muted)" }} />
        </div>
      )}
      {fetchError && <p className="text-xs text-red-500">{fetchError}</p>}

      {!loading && !fetchError && tickets.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--t-muted)", opacity: 0.35 }} />
          <p className="text-sm" style={{ color: "var(--t-muted)" }}>No tickets yet for this Group Buy</p>
        </div>
      )}

      {!loading && tickets.length > 0 && (
        <div className="flex flex-col gap-2">
          {tickets.map(t => {
            const sc = TICKET_STATUS_STYLE[t.status] ?? TICKET_STATUS_STYLE["open"];
            return (
              <button
                key={t.id}
                onClick={() => openTicket(t.id)}
                className="w-full text-left p-3.5 rounded-xl transition-all active:scale-[0.98]"
                style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--t-text)" }}>{t.subject}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>
                      @{t.accountUsername} · {new Date(t.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-bold uppercase shrink-0 px-2 py-0.5 rounded-full mt-0.5"
                    style={{ color: sc.text, background: sc.bg }}
                  >
                    {t.status.replace("_", " ")}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

type DashTab = "overview" | "edit" | "products" | "shipping" | "orders" | "parcels" | "labtests" | "pnl" | "summary" | "broadcast" | "intlshipping" | "adminfeecountry" | "sharedshipping" | "reshippers" | "countrylegs" | "rules" | "tickets" | "qrcodes";

const GB_TABS: { id: DashTab; label: string; icon: React.ElementType; gbRequired: boolean; externalPath?: (gbId: string) => string }[] = [
  { id: "overview", label: "My GBs", icon: LayoutDashboard, gbRequired: false },
  { id: "edit", label: "Edit GB", icon: Pencil, gbRequired: true },
  { id: "products", label: "Products", icon: Package, gbRequired: true },
  { id: "shipping", label: "Ship & Pay", icon: CreditCard, gbRequired: true },
  { id: "orders", label: "Orders", icon: ShoppingBag, gbRequired: true },
  { id: "summary", label: "Summary", icon: ClipboardList, gbRequired: true },
  { id: "parcels", label: "Parcels", icon: Truck, gbRequired: true },
  { id: "qrcodes", label: "QR Codes", icon: QrCode, gbRequired: true },
  { id: "labtests", label: "Lab Tests", icon: FlaskConical, gbRequired: true },
  { id: "pnl", label: "P&L", icon: BarChart3, gbRequired: true },
  { id: "broadcast", label: "Broadcast", icon: SendHorizonal, gbRequired: true },
  { id: "intlshipping", label: "Intl Shipping", icon: Globe, gbRequired: true },
  { id: "adminfeecountry", label: "Fee by Country", icon: DollarSign, gbRequired: true },
  { id: "sharedshipping", label: "Shared Shipping", icon: Globe, gbRequired: true },
  { id: "reshippers", label: "Reshippers", icon: Users, gbRequired: true },
  { id: "countrylegs", label: "Country Legs", icon: Globe, gbRequired: true },
  { id: "rules", label: "Rules", icon: Shield, gbRequired: true },
  { id: "tickets", label: "Tickets", icon: MessageSquare, gbRequired: true },
];

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  draft:    { color: "#64748B", bg: "rgba(100,116,139,0.12)", label: "Draft" },
  active:   { color: "#16A34A", bg: "rgba(22,163,74,0.12)",  label: "Active" },
  closed:   { color: "var(--t-blue)", bg: "var(--t-blue-10)", label: "Closed" },
  archived: { color: "#6B7280", bg: "rgba(107,114,128,0.12)", label: "Archived" },
};

const CORE_TAB_IDS: DashTab[] = ["overview", "edit", "products", "shipping", "orders"];
const OPTIONAL_TAB_IDS: DashTab[] = ["summary", "parcels", "qrcodes", "labtests", "pnl", "broadcast", "intlshipping", "adminfeecountry", "sharedshipping", "reshippers", "countrylegs", "rules", "tickets"];

function getTabVisibility(username: string, gbId: string | null): Record<string, boolean> {
  if (!gbId) return {};
  try {
    const stored = localStorage.getItem(`orgTabVisibility:${username}:${gbId}`);
    if (stored) return JSON.parse(stored) as Record<string, boolean>;
  } catch { /* ignore */ }
  return {};
}

function saveTabVisibility(username: string, gbId: string | null, vis: Record<string, boolean>) {
  if (!gbId) return;
  try {
    localStorage.setItem(`orgTabVisibility:${username}:${gbId}`, JSON.stringify(vis));
  } catch { /* ignore */ }
}

function getTabOrder(username: string, gbId: string | null): DashTab[] | null {
  if (!gbId) return null;
  try {
    const stored = localStorage.getItem(`orgTabOrder:${username}:${gbId}`);
    if (stored) return JSON.parse(stored) as DashTab[];
  } catch { /* ignore */ }
  return null;
}

function saveTabOrder(username: string, gbId: string | null, order: DashTab[]) {
  if (!gbId) return;
  try {
    localStorage.setItem(`orgTabOrder:${username}:${gbId}`, JSON.stringify(order));
  } catch { /* ignore */ }
}

function OrganiserDashboard({ profile, initialGbId }: { profile: OrganiserProfile; initialGbId?: string | null }) {
  const [gbs, setGbs] = useState<OrganiserGB[]>([]);
  const [loadingGbs, setLoadingGbs] = useState(true);
  const [selectedGbId, setSelectedGbId] = useState<string | null>(initialGbId ?? null);
  const [activeTab, setActiveTab] = useState<DashTab>(initialGbId ? "orders" : "overview");
  const [creatingNew, setCreatingNew] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [tabVisibility, setTabVisibilityState] = useState<Record<string, boolean>>(() => getTabVisibility(profile.telegramUsername, initialGbId ?? null));
  const [tabOrder, setTabOrderState] = useState<DashTab[] | null>(() => getTabOrder(profile.telegramUsername, initialGbId ?? null));
  const [showTabSettings, setShowTabSettings] = useState(false);
  const [dragOverTab, setDragOverTab] = useState<DashTab | null>(null);
  const dragTabRef = useRef<DashTab | null>(null);

  const loadGbs = useCallback(async () => {
    setLoadingGbs(true);
    const res = await fetch("/api/organiser/group-buys", { credentials: "include" });
    if (res.ok) setGbs(await res.json());
    setLoadingGbs(false);
  }, []);

  useEffect(() => { loadGbs(); }, [loadGbs]);

  const selectedGb = gbs.find(g => g.id === selectedGbId) ?? null;

  const handleSelectGb = (id: string) => {
    setSelectedGbId(id);
    setCreatingNew(false);
    setActiveTab("edit");
  };

  const handleNewGb = () => {
    setSelectedGbId(null);
    setCreatingNew(true);
    setActiveTab("edit");
  };

  const handleGbSaved = (saved: OrganiserGB) => {
    setGbs(prev => {
      const idx = prev.findIndex(g => g.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [saved, ...prev];
    });
    setSelectedGbId(saved.id);
    setCreatingNew(false);
    setActiveTab("overview");
  };

  const handleGbUpdated = (updated: OrganiserGB) => {
    setGbs(prev => prev.map(g => g.id === updated.id ? updated : g));
  };

  const handleGbDeleted = (id: string) => {
    setGbs(prev => prev.filter(g => g.id !== id));
    setSelectedGbId(null);
    setCreatingNew(false);
    setActiveTab("overview");
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedGb || statusSaving) return;
    setStatusSaving(true);
    try {
      const res = await fetch(`/api/organiser/group-buys/${selectedGb.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setGbs(prev => prev.map(g => g.id === updated.id ? updated : g));
      }
    } finally { setStatusSaving(false); }
  };

  useEffect(() => {
    setTabVisibilityState(getTabVisibility(profile.telegramUsername, selectedGbId));
    setTabOrderState(getTabOrder(profile.telegramUsername, selectedGbId));
  }, [selectedGbId, profile.telegramUsername]);

  useEffect(() => {
    if (activeTab === "orders") loadGbs();
  }, [activeTab]);

  const toggleOptionalTab = (tabId: DashTab) => {
    const next = { ...tabVisibility, [tabId]: !(tabVisibility[tabId] ?? true) };
    setTabVisibilityState(next);
    saveTabVisibility(profile.telegramUsername, selectedGbId, next);
  };

  const visibleTabs = (() => {
    const base = GB_TABS.filter(t => {
      if (!t.gbRequired || selectedGbId) {
        if (OPTIONAL_TAB_IDS.includes(t.id)) return tabVisibility[t.id] !== false;
        return true;
      }
      return false;
    });
    if (!tabOrder) return base;
    return [...base].sort((a, b) => {
      const ai = tabOrder.indexOf(a.id);
      const bi = tabOrder.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  })();

  const canSetActive = selectedGb?.approvalStatus === "approved";
  const canArchive = selectedGb?.status === "closed" || selectedGb?.status === "active";
  const availableStatuses = selectedGb ? [
    "draft",
    ...(canSetActive ? ["active"] : []),
    "closed",
    ...(canArchive ? ["archived"] : []),
  ] : [];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--t-border)" }}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--t-blue-deep)" }}>GB Organiser</p>
          <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>@{profile.telegramUsername}</p>
        </div>
        {selectedGb && (
          <p className="text-xs font-semibold truncate max-w-[160px]" style={{ color: "var(--t-text)" }}>{selectedGb.name}</p>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-3 py-2 overflow-x-auto shrink-0 items-center" style={{ borderBottom: "1px solid var(--t-border)", background: "var(--t-surface2)" }}>
        {visibleTabs.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          const isDragOver = dragOverTab === t.id;
          return (
            <button
              key={t.id}
              draggable
              onDragStart={e => {
                dragTabRef.current = t.id;
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={e => { e.preventDefault(); setDragOverTab(t.id); }}
              onDragLeave={() => setDragOverTab(null)}
              onDrop={e => {
                e.preventDefault();
                setDragOverTab(null);
                const from = dragTabRef.current;
                dragTabRef.current = null;
                if (!from || from === t.id) return;
                const currentIds = visibleTabs.map(x => x.id);
                const fromIdx = currentIds.indexOf(from);
                const toIdx = currentIds.indexOf(t.id);
                if (fromIdx === -1 || toIdx === -1) return;
                const next = [...currentIds];
                next.splice(fromIdx, 1);
                next.splice(toIdx, 0, from);
                const allIds = GB_TABS.map(x => x.id);
                const merged: DashTab[] = [...next, ...allIds.filter(id => !next.includes(id))];
                setTabOrderState(merged);
                saveTabOrder(profile.telegramUsername, selectedGbId, merged);
              }}
              onDragEnd={() => { dragTabRef.current = null; setDragOverTab(null); }}
              onClick={() => {
                if (t.id === "edit" && !selectedGbId && !creatingNew) setCreatingNew(true);
                setActiveTab(t.id);
              }}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all shrink-0"
              style={{
                background: isActive ? "var(--t-blue-deep)" : "transparent",
                color: isActive ? "#fff" : "var(--t-muted)",
                outline: isDragOver ? "2px solid var(--t-blue)" : "none",
                cursor: "grab",
              }}
            >
              <Icon className="w-3 h-3" />{t.label}
            </button>
          );
        })}
        <button
          onClick={() => setShowTabSettings(s => !s)}
          className="ml-auto shrink-0 p-1.5 rounded-lg transition-all"
          title="Customise tabs"
          style={{ color: showTabSettings ? "var(--t-blue)" : "var(--t-muted)" }}
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tab settings panel */}
      <AnimatePresence>
        {showTabSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden shrink-0"
            style={{ borderBottom: "1px solid var(--t-border)", background: "var(--t-surface2)" }}
          >
            <div className="px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--t-muted)" }}>Optional Tabs</p>
              <div className="flex flex-wrap gap-2">
                {GB_TABS.filter(t => OPTIONAL_TAB_IDS.includes(t.id)).map(t => {
                  const visible = tabVisibility[t.id] !== false;
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleOptionalTab(t.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                      style={visible
                        ? { background: "rgba(91,141,239,0.12)", color: "var(--t-blue)" }
                        : { background: "var(--t-bg)", color: "var(--t-muted)", border: "1px solid var(--t-border)" }}
                    >
                      {visible ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 pb-8">
        {activeTab === "overview" && <OverviewTab gbs={gbs} loading={loadingGbs} profile={profile} onSelect={handleSelectGb} onNew={handleNewGb} onRefresh={loadGbs} />}
        {activeTab === "edit" && <GBFormTab gb={creatingNew ? null : selectedGb} onSaved={handleGbSaved} onBack={() => setActiveTab("overview")} onDelete={handleGbDeleted} onStatusChange={handleStatusChange} statusSaving={statusSaving} availableStatuses={availableStatuses} />}
        {activeTab === "products" && selectedGb && <ProductsTab gb={selectedGb} />}
        {activeTab === "shipping" && selectedGb && <ShippingPayTab gb={selectedGb} onUpdated={handleGbUpdated} />}
        {activeTab === "orders" && selectedGb && <OrdersTab gb={selectedGb} />}
        {activeTab === "summary" && selectedGb && <SummaryTab gb={selectedGb} />}
        {activeTab === "parcels" && selectedGb && <ParcelsTab gb={selectedGb} />}
        {activeTab === "labtests" && selectedGb && <LabTestsTabOrg gb={selectedGb} />}
        {activeTab === "pnl" && selectedGb && <PnlTab gb={selectedGb} />}
        {activeTab === "broadcast" && selectedGb && <BroadcastTab gb={selectedGb} />}
        {activeTab === "intlshipping" && selectedGb && <IntlShippingTab secret="" useCredentials groupBuyId={selectedGb.id} />}
        {activeTab === "adminfeecountry" && selectedGb && <OrgAdminFeeCountriesTab gb={selectedGb} onUpdate={(updated) => setGbs(prev => prev.map(g => g.id === updated.id ? { ...g, adminFeeCountries: updated.adminFeeCountries } : g))} />}
        {activeTab === "sharedshipping" && selectedGb && <OrgSharedShippingTab gb={selectedGb} onUpdate={(updated) => setGbs(prev => prev.map(g => g.id === updated.id ? { ...g, sharedShippingCountries: updated.sharedShippingCountries } : g))} />}
        {activeTab === "reshippers" && selectedGb && <OrganiserReshippersTab gb={selectedGb} />}
        {activeTab === "countrylegs" && selectedGb && <OrganiserCountryLegsTab gb={selectedGb} />}
        {activeTab === "rules" && selectedGb && <OrganiserRulesTab gb={selectedGb} />}
        {activeTab === "tickets" && selectedGb && <OrgTicketsTab gb={selectedGb} />}
        {activeTab === "qrcodes" && selectedGb && <GbQrCodesPanel gbId={selectedGb.id} mode="organiser" />}

        {selectedGb?.approvalStatus === "pending_approval" && activeTab !== "overview" && (
          <div className="mt-5 p-3 rounded-xl flex items-start gap-2 text-[11px]" style={{ background: "rgba(217,119,6,0.07)", border: "1px solid rgba(217,119,6,0.2)" }}>
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p style={{ color: "#B45309" }}>This Group Buy is pending admin approval. Once approved you can set it to active and accept orders.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GbOrganiser() {
  const { account, isLoading: accountLoading } = useAccount();
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<OrganiserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [organiserStatus, setOrganiserStatus] = useState<string | null | undefined>(undefined);

  // Admin mode: detect URL params ?adminGbId=<id>&adminToken=<nonce>
  // Captured once via refs so URL cleanup (history.replaceState) doesn't cause value loss
  // on subsequent renders. adminToken is a short-lived server-side nonce.
  const adminGbIdRef = useRef(new URLSearchParams(window.location.search).get("adminGbId"));
  const adminTokenRef = useRef(new URLSearchParams(window.location.search).get("adminToken"));
  const adminGbId = adminGbIdRef.current;
  const adminToken = adminTokenRef.current;
  const isAdminMode = !!(adminGbId && adminToken);

  // Strip sensitive token from URL immediately to prevent browser-history / referrer leakage.
  // Token is already captured in adminTokenRef above, so subsequent renders are unaffected.
  useEffect(() => {
    if (!adminToken) return;
    const clean = new URL(window.location.href);
    clean.searchParams.delete("adminToken");
    window.history.replaceState({}, "", clean.toString());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When in admin mode, monkeypatch fetch to add x-admin-organiser-token for organiser API calls
  useEffect(() => {
    if (!isAdminMode || !adminToken) return;
    const origFetch: typeof fetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
      if (url.startsWith("/api/organiser")) {
        const hdrs = { ...((init?.headers ?? {}) as Record<string, string>), "x-admin-organiser-token": adminToken };
        return origFetch(input, { ...init, credentials: "omit", headers: hdrs });
      }
      return origFetch(input, init);
    };
    return () => { window.fetch = origFetch; };
  }, [isAdminMode, adminToken]);

  // Admin mode: use synthetic admin profile, skip auth
  useEffect(() => {
    if (!isAdminMode) return;
    setProfile({ telegramUsername: "admin", email: null, organiserStatus: "approved", organiserApprovedAt: null, organiserPaymentMethods: null });
    setOrganiserStatus("approved");
    setProfileLoading(false);
  }, [isAdminMode]);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const res = await fetch("/api/organiser/me", { credentials: "include" });
      if (res.ok) {
        const p: OrganiserProfile = await res.json();
        setProfile(p);
        setOrganiserStatus(p.organiserStatus);
      } else {
        setOrganiserStatus(null);
      }
    } catch {
      setOrganiserStatus(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdminMode) return;
    if (!accountLoading && account) {
      loadProfile();
    } else if (!accountLoading && !account) {
      setLocation("/login?next=/gborganiser");
    }
  }, [accountLoading, account, loadProfile, setLocation, isAdminMode]);

  const isLoading = isAdminMode ? false : (accountLoading || profileLoading);

  return (
    <PageLayout>
      <div className="flex flex-col flex-1 min-h-0" style={{ fontFamily: "'Inter', sans-serif", background: "var(--t-bg)" }}>
        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center py-32">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--t-blue)" }} />
            </motion.div>
          )}
          {!isLoading && !isAdminMode && account && organiserStatus === null && (
            <motion.div key="apply" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ApplyScreen onApplied={() => setOrganiserStatus("applied")} />
            </motion.div>
          )}
          {!isLoading && !isAdminMode && account && (organiserStatus === "applied" || organiserStatus === "rejected" || organiserStatus === "suspended") && (
            <motion.div key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StatusScreen status={organiserStatus} />
            </motion.div>
          )}
          {!isLoading && organiserStatus === "approved" && profile && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col flex-1">
              {isAdminMode && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-xs font-semibold text-amber-700">Admin mode — viewing organiser dashboard</span>
                </div>
              )}
              <OrganiserDashboard profile={profile} initialGbId={isAdminMode ? adminGbId : null} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageLayout>
  );
}
