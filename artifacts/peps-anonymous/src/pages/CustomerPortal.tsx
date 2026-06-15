import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PoolLeaderDashboard } from "@/components/PoolLeaderDashboard";
import { AccountPoolContributions } from "@/components/AccountPoolContributions";
import { COUNTRY_LIST } from "@/data/countries";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, LogOut, RefreshCw, Loader2, ArrowLeft,
  Package, ChevronRight, ArrowRight, Clock, CheckCircle2,
  XCircle, Truck, FileText, AlertCircle, ShoppingBag, Search,
  MessageCircle, Unlink, CheckCircle, Copy, Activity,
  Syringe, Settings, TrendingUp, TrendingDown, Minus, Heart,
  Info, TriangleAlert, FlaskConical, CalendarDays, Users,
  Home, Lock, LayoutDashboard, ChevronDown, ChevronUp, ChevronLeft, AtSign,
  Plus, Trash2, CircleDot, Leaf, Pill, Calendar, X,
  ShoppingCart, History, LineChart, Scale, Zap, Menu,
  Send, MessageSquare, Upload, ClipboardList, ExternalLink,
  Dna, Microscope, HeartPulse, Brain, TestTube, Stethoscope,
  SlidersHorizontal, Sparkles, RotateCcw, GripVertical,
  Navigation, MapPin, Box, UsersRound, Eye, EyeOff, QrCode,
  LayoutList, LayoutGrid, Store, Star, RefreshCcw, Hash, Wallet, Boxes, Pencil,
  Download, Maximize2,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS as DndCSS } from "@dnd-kit/utilities";
import {
  ComposedChart, AreaChart, Area, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart as RLineChart, Line,
  ReferenceArea, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, LabelList,
} from "recharts";
import { SteroidPlotter } from "@/components/SteroidPlotter";
import { SiteAnnouncements } from "@/components/SiteAnnouncements";
import { PageLayout } from "@/components/PageLayout";
import { RulesetModal } from "@/components/RulesetModal";
import {
  useAccount, useLogout, useAccountOrders, useTestingLateOptIn, useTestingActivePools, useTestingGbPools,
  useTelegramStatus, useTelegramLinkInit, useTelegramUnlink, useTelegramUpdatePrefs, useTelegramSendTest,
  useMyGroupBuys, useJoinGroupBuy, useActiveGroupBuys, useLeaveGroupBuy, useUpdateCountry, useCountryLegs,
  useViewerAccess,
  type TelegramPrefs, type GroupBuySummary, type ViewerAccessEntry,
} from "@/hooks/use-account";
import { COUNTRIES } from "@/data/countries";
import {
  useBloodTests, useCreateBloodTest, useDeleteBloodTest, useUpdateBloodTest, useBloodTestDiscuss,
  type BloodTestSession, type DiscussMessage, type BloodTestValue,
  type DiscussSource,
} from "@/hooks/use-blood-tests";
import { parsePDFBiomarkers, parseBiomarkersFromText, type ParsedBiomarker } from "@/lib/parsePDF";
import { generateLabHistoryPDF, generateHealthPlanPDF } from "@/lib/generatePDF";
import {
  useCompounds, useCreateCompound, useUpdateCompound, useDeleteCompound,
  type CompoundLog, type CreateCompoundPayload,
} from "@/hooks/use-compounds";
import { useHealthSummary, type BiomarkerSummary } from "@/hooks/use-health-summary";
import { useGlp1Logs, useCreateGlp1, useDeleteGlp1, type Glp1Log } from "@/hooks/use-glp1";
import { Glp1ShotForm } from "@/components/Glp1ShotForm";
import { T } from "@/lib/theme";
import { fmtC } from "@/lib/currency";
import { LabTestsListPopup } from "@/components/LabTestsPopup";
import { HubBottomNav } from "@/components/HubBottomNav";
import Protocols from "@/pages/Protocols";
import PublicTestingPools from "@/pages/PublicTestingPools";
import LabTests from "@/pages/LabTests";
import { FHRiskContent } from "@/pages/FHRiskCalculator";
import { InsulinResistanceContent } from "@/pages/InsulinResistanceCalculator";

// ─── Types ─────────────────────────────────────────────────────────────────────

type LineItem = { productId?: string; productName: string; quantity: number; unitPrice: number; lineTotal: number };
type Order = {
  id: string; code: string; telegramUsername: string;
  status: string; paymentStatus: string; grandTotal: number;
  productSubtotal: number; lineItems: LineItem[];
  adminMessage: string | null; trackingNumber: string | null;
  createdAt: string; notes: string | null;
  deliveryMethod: string; groupBuyId: string | null;
  orderType?: string | null;
  currency?: string | null;
  testingContribution?: number | null;
  directShippingRequested?: boolean;
  routingType?: string | null;
  reshipperUsername?: string | null;
  shippingCarrier?: string | null;
};
type CustomerProfile = { fullName: string; email: string; phone: string; address: string };
type Section = "home" | "orders" | "groups" | "compounds" | "blood-tests" | "health" | "glp1" | "plotter" | "profile" | "telegram" | "history" | "health-hub" | "lab-pool" | "gb-testing" | "protocols" | "medications" | "trtaas" | "community-testing" | "lab-tests" | "support" | "fh-risk" | "insulin-resistance";
const PORTAL_SECTIONS: Section[] = ["home","orders","groups","compounds","blood-tests","health","glp1","plotter","profile","telegram","history","health-hub","lab-pool","gb-testing","protocols","medications","trtaas","community-testing","lab-tests","support"];

const SECTION_ALL_META: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "home",        label: "Hub",          icon: LayoutDashboard },
  { id: "orders",      label: "Orders",       icon: Package },
  { id: "compounds",   label: "Compounds",    icon: Syringe },
  { id: "blood-tests", label: "Blood Tests",  icon: FlaskConical },
  { id: "health",      label: "Health Insights", icon: HeartPulse },
  { id: "glp1",        label: "GLP-1 Tracker",  icon: Scale },
  { id: "plotter",     label: "Cycle Plotter",  icon: LineChart },
  { id: "groups",      label: "Group Buys",   icon: Users },
  { id: "profile",     label: "Profile",      icon: User },
  { id: "telegram",    label: "Telegram",     icon: MessageCircle },
  { id: "history",     label: "My History",   icon: History },
  { id: "health-hub",  label: "Health",       icon: HeartPulse },
  { id: "lab-pool",    label: "Lab Pool",     icon: TestTube },
  { id: "support",     label: "Support",      icon: MessageSquare },
  { id: "gb-testing",  label: "GB Testing",   icon: FlaskConical },
];

// ─── Compounds preset data ─────────────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  AAS:        { label: "AAS",        color: "#DC2626", bg: "rgba(220,38,38,0.1)",    Icon: Syringe },
  TRT:        { label: "TRT",        color: "var(--t-blue)", bg: "var(--t-blue-10)",    Icon: CircleDot },
  Peptide:    { label: "Peptide",    color: "#16A34A", bg: "rgba(22,163,74,0.1)",    Icon: FlaskConical },
  Supplement: { label: "Supplement", color: "var(--t-blue)", bg: "var(--t-blue-10)",   Icon: Leaf },
  Other:      { label: "Other",      color: "var(--t-blue)", bg: "rgba(124,58,237,0.1)",  Icon: Pill },
};

const PRESET_COMPOUNDS: Record<string, string[]> = {
  AAS: [
    "Testosterone Enanthate", "Testosterone Cypionate", "Testosterone Propionate",
    "Nandrolone Decanoate (Deca)", "Trenbolone Acetate", "Trenbolone Enanthate",
    "Boldenone Undecylenate (EQ)", "Stanozolol (Winstrol)", "Oxandrolone (Anavar)",
    "Methandrostenolone (Dbol)", "Masteron Propionate", "Masteron Enanthate", "Primobolan",
  ],
  TRT: [
    "Testosterone Enanthate (TRT)", "Testosterone Cypionate (TRT)", "Testosterone Undecanoate",
    "Testosterone Gel", "Gonadorelin", "HCG", "Clomiphene (Clomid)", "Anastrozole",
  ],
  Peptide: [
    "BPC-157", "TB-500", "Ipamorelin", "CJC-1295 no DAC", "CJC-1295 DAC",
    "GHRP-2", "GHRP-6", "Hexarelin", "Tesamorelin", "Epithalon",
    "Selank", "Semax", "PT-141", "Melanotan II", "GHK-Cu",
    "Thymosin Alpha-1", "SS-31", "AOD-9604", "Fragment 176-191",
    "PEG-MGF", "IGF-1 LR3",
  ],
  Supplement: [
    "Vitamin D3", "Vitamin B12", "Zinc", "Magnesium", "Omega-3 (EPA/DHA)",
    "TUDCA", "NAC", "Ashwagandha", "Boron", "Red Yeast Rice", "Iron",
  ],
  Other: [],
};

const FREQUENCIES = ["Daily", "EOD", "E3D", "2x/week", "Weekly", "2x/month", "Monthly", "Other"];
const ROUTES = ["SubQ", "IM", "Oral", "Nasal", "Topical", "Other"];
const UNITS = ["mg", "mcg", "IU", "ml", "units"];
const TYPES = ["AAS", "TRT", "Peptide", "Supplement", "Other"] as const;

function formatCompoundDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function daysBetween(from: string, to?: string | null) {
  const a = new Date(from + "T00:00:00");
  const b = to ? new Date(to + "T00:00:00") : new Date();
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

// ─── Status / payment meta ─────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  Draft:      { label: "Draft",      color: "#64748B", bg: "rgba(100,116,139,0.1)", icon: FileText },
  Submitted:  { label: "Submitted",  color: "var(--t-blue)", bg: "var(--t-blue-10)",   icon: Clock },
  Processing: { label: "Processing", color: "var(--t-blue)", bg: "var(--t-blue-10)",   icon: RefreshCw },
  Shipped:    { label: "Shipped",    color: "var(--t-blue)", bg: "rgba(124,58,237,0.1)",  icon: Truck },
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

const GB_STATUS_DOT: Record<string, string> = {
  draft:    "#94A3B8",
  active:   "#10B981",
  closed:   "#3B82F6",
  archived: "#6B7280",
};

const GB_STATUS_LABEL: Record<string, string> = {
  draft:    "Draft",
  active:   "Active",
  closed:   "Closed",
  archived: "Archived",
};

const GB_PALETTE: Array<{ accent: string; gradient: string; blobColor: string; icon: React.ElementType }> = [
  { accent: "#5B8DEF", gradient: "linear-gradient(135deg, #0D1B2A 0%, #162A44 100%)", blobColor: "rgba(91,141,239,0.14)",  icon: FlaskConical },
  { accent: "#F59E0B", gradient: "linear-gradient(135deg, #1A1208 0%, #2C1F0A 100%)", blobColor: "rgba(245,158,11,0.12)",  icon: Zap },
  { accent: "#22D3EE", gradient: "linear-gradient(135deg, #061819 0%, #0D2D2E 100%)", blobColor: "rgba(34,211,238,0.12)",  icon: Activity },
  { accent: "#A78BFA", gradient: "linear-gradient(135deg, #0F0A1E 0%, #1D1040 100%)", blobColor: "rgba(167,139,250,0.12)", icon: Dna },
  { accent: "#34D399", gradient: "linear-gradient(135deg, #061209 0%, #0E2414 100%)", blobColor: "rgba(52,211,153,0.12)",  icon: Leaf },
  { accent: "#38BDF8", gradient: "linear-gradient(135deg, #040E1A 0%, #0A1E35 100%)", blobColor: "rgba(56,189,248,0.12)",  icon: Microscope },
  { accent: "#F472B6", gradient: "linear-gradient(135deg, #180613 0%, #2C0C22 100%)", blobColor: "rgba(244,114,182,0.12)", icon: HeartPulse },
  { accent: "#C084FC", gradient: "linear-gradient(135deg, #0A0618 0%, #17102E 100%)", blobColor: "rgba(192,132,252,0.12)", icon: Brain },
];


const GB_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getGBCloseDateBadge(iso: string | null): { dateStr: string; daysStr: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const dateStr = `${GB_MONTHS[d.getMonth()]} ${d.getDate()}`;
  const now = Date.now();
  const diffMs = d.getTime() - now;
  if (diffMs < 0) return { dateStr, daysStr: "Closed" };
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return { dateStr, daysStr: "Today" };
  if (diffDays === 1) return { dateStr, daysStr: "Tomorrow" };
  if (diffDays < 30) return { dateStr, daysStr: `${diffDays}d left` };
  const diffWeeks = Math.round(diffDays / 7);
  if (diffDays < 90) return { dateStr, daysStr: `${diffWeeks}w left` };
  const diffMonths = Math.round(diffDays / 30);
  return { dateStr, daysStr: `${diffMonths}mo left` };
}

// ─── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, color: "#64748B", bg: "rgba(100,116,139,0.1)", icon: FileText };
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: m.bg, color: m.color }}>
      <Icon className="w-2.5 h-2.5" />{m.label}
    </span>
  );
}

// ─── Order card ────────────────────────────────────────────────────────────────

function OrderCard({ order, onManage, onReorder, groupBuyName }: { order: Order; onManage: () => void; onReorder?: () => void; groupBuyName?: string }) {
  const sm = STATUS_META[order.status] ?? { label: order.status, color: "#64748B", bg: "rgba(100,116,139,0.1)", icon: FileText };
  const pm = PAYMENT_META[order.paymentStatus] ?? { label: order.paymentStatus, color: "#94A3B8" };
  const StatusIcon = sm.icon;
  const dt = new Date(order.createdAt);
  const createdDate = dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const createdTime = dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const isPaid = order.paymentStatus === "confirmed" || order.paymentStatus === "test_confirmed";
  const pmBg = isPaid ? "rgba(16,185,129,0.1)" : "rgba(148,163,184,0.1)";
  const hasLogistics = order.deliveryMethod || order.trackingNumber || order.adminMessage;

  return (
    <motion.div
      layout
      className="rounded-2xl overflow-hidden"
      style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: "0 1px 4px rgba(15,23,42,0.07), 0 4px 12px rgba(15,23,42,0.04)" }}
    >
      {/* ── Zone A: Identity ─────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3">
        {/* Row 1: GB label (left) + status + total stacked (right) */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          {groupBuyName ? (
            <div className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full"
              style={{ background: "var(--t-blue-08)", border: "1px solid var(--t-blue-15)" }}>
              <Users className="w-3 h-3" style={{ color: "var(--t-blue)" }} />
              <span className="text-[10px] font-bold" style={{ color: "var(--t-blue)" }}>{groupBuyName} Order</span>
            </div>
          ) : order.orderType === "wholesale" ? (
            <div className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full"
              style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <Store className="w-3 h-3" style={{ color: "#10B981" }} />
              <span className="text-[10px] font-bold" style={{ color: "#10B981" }}>Wholesale</span>
            </div>
          ) : <span />}
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold"
            style={{ background: sm.bg, color: sm.color }}
          >
            <StatusIcon className="w-3 h-3" />
            {sm.label}
          </span>
        </div>

        {/* Row 2: order code + date (left) · total (right) */}
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-2 min-w-0">
            <span
              className="font-mono text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-lg shrink-0"
              style={{ background: T.surface2, color: T.muted, border: `1px solid ${T.border}` }}
            >
              {order.code}
            </span>
            <span className="text-[11px] truncate" style={{ color: T.subtle }}>{createdDate}, {createdTime}</span>
          </div>
          <p className="text-[22px] font-bold leading-none tabular-nums shrink-0" style={{ color: T.text }}>
            {fmtC(order.grandTotal, order.currency)}
          </p>
        </div>

        {(order.testingContribution ?? 0) > 0 && (
          <div className="mt-2">
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg"
              style={{ background: "rgba(139,92,246,0.12)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.20)" }}
            >
              <FlaskConical className="w-2.5 h-2.5" />
              Lab testing opt-in — {fmtC(order.testingContribution!, order.currency)}
            </span>
          </div>
        )}
        {(() => {
          const rt = order.routingType;
          const effRoute = rt === "direct" || rt === "reshipper" || rt === "unrouted"
            ? rt
            : order.directShippingRequested ? "direct" : order.reshipperUsername ? "reshipper" : null;
          if (!effRoute) return null;
          if (effRoute === "direct") return (
            <div className="mt-2">
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg"
                style={{ background: "rgba(99,102,241,0.10)", color: "#4f46e5", border: "1px solid rgba(99,102,241,0.25)" }}
                title="Ships directly to your address"
              >
                <Home className="w-2.5 h-2.5" />
                Direct shipping
              </span>
            </div>
          );
          if (effRoute === "reshipper") return (
            <div className="mt-2">
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg"
                style={{ background: "rgba(59,130,246,0.10)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.25)" }}
                title={order.reshipperUsername ? `Ships via reshipper @${order.reshipperUsername.replace(/^@/, "")}` : "Ships via reshipper"}
              >
                <Package className="w-2.5 h-2.5" />
                Via reshipper{order.reshipperUsername ? ` @${order.reshipperUsername.replace(/^@/, "")}` : ""}
              </span>
            </div>
          );
          if (effRoute === "unrouted" && order.groupBuyId) return (
            <div className="mt-2">
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg"
                style={{ background: "rgba(245,158,11,0.10)", color: "#d97706", border: "1px solid rgba(245,158,11,0.25)" }}
                title="The organiser is still deciding how your order will be shipped"
              >
                <svg className="w-2.5 h-2.5" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Routing pending
              </span>
            </div>
          );
          return null;
        })()}
      </div>

      {/* ── Zone B: Items + Logistics ────────────────────────────────── */}
      <div
        className="mx-3 mb-3 rounded-xl overflow-hidden"
        style={{ background: T.surface2, border: `1px solid ${T.border}` }}
      >
        {/* Delivery method + payment status row */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-2">
          {order.deliveryMethod ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold"
              style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.muted }}>
              <Package className="w-3 h-3 shrink-0" style={{ color: T.subtle }} />
              {order.deliveryMethod}
            </span>
          ) : <span />}
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg"
            style={{ background: pmBg, color: pm.color }}
          >
            {isPaid && <CheckCircle2 className="w-2.5 h-2.5" />}
            {pm.label}
          </span>
        </div>

        {/* Items */}
        <div className="px-3 pb-3 space-y-2.5">
          {order.lineItems.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span
                className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{ background: T.surface, color: T.text, border: `1px solid ${T.border}` }}
              >
                {item.quantity}
              </span>
              <span className="flex-1 text-[14px] font-semibold truncate" style={{ color: T.text }}>{item.productName}</span>
              <span className="text-[14px] font-bold tabular-nums shrink-0" style={{ color: T.text }}>{fmtC(item.lineTotal, order.currency)}</span>
            </div>
          ))}
          {(order as any).deliveryPrice > 0 && (
            <div className="flex justify-between pt-2 border-t" style={{ borderColor: T.border }}>
              <span className="text-[12px]" style={{ color: T.subtle }}>Shipping</span>
              <span className="text-[12px] tabular-nums" style={{ color: T.muted }}>{fmtC((order as any).deliveryPrice, order.currency)}</span>
            </div>
          )}
          {order.notes && (
            <p className="text-[12px] italic pt-2 border-t" style={{ color: T.subtle, borderColor: T.border }}>"{order.notes}"</p>
          )}
        </div>

        {/* Tracking */}
        {order.trackingNumber && (
          <div
            className="flex items-center gap-3 px-3 py-2.5 border-t"
            style={{ background: "var(--t-blue-05)", borderColor: T.border }}
          >
            <Truck className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--t-blue)" }} />
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "var(--t-blue)" }}>
                {order.shippingCarrier ? order.shippingCarrier : "Tracking"}
              </p>
              <p className="font-mono text-[12px] font-bold truncate" style={{ color: T.text }}>{order.trackingNumber}</p>
            </div>
          </div>
        )}

        {/* Admin message */}
        {order.adminMessage && (
          <div className="flex items-start gap-2 px-3 py-2.5 border-t" style={{ background: "rgba(245,158,11,0.04)", borderColor: T.border }}>
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed" style={{ color: T.muted }}>{order.adminMessage}</p>
          </div>
        )}
      </div>

      {/* ── Zone D: Action ───────────────────────────────────────────── */}
      <div className="flex" style={{ borderTop: `1px solid ${T.border}` }}>
        {onReorder && (
          <button
            onClick={onReorder}
            className="flex-1 flex items-center justify-center gap-1.5 h-11 text-[11px] font-bold active:opacity-90"
            style={{ color: "#10B981", background: "rgba(16,185,129,0.05)", borderRight: `1px solid ${T.border}` }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reorder
          </button>
        )}
        <button
          onClick={onManage}
          className={`${onReorder ? "flex-1" : "w-full"} flex items-center justify-center gap-1.5 h-11 text-[11px] font-bold text-white active:opacity-90`}
          style={{ background: "var(--t-blue-deep)" }}
        >
          Manage <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Telegram card ─────────────────────────────────────────────────────────────

function TelegramTestBanner({ result, error, pendingCode }: {
  result: "idle" | "checking" | "sent" | "not-linked" | "error";
  error: string;
  pendingCode?: string;
}) {
  if (result === "checking") return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px]"
      style={{ background: T.surface2, color: T.muted, border: `1px solid ${T.border}` }}>
      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
      <span>Sending test message…</span>
    </div>
  );
  if (result === "not-linked") return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-[11px]"
      style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)", color: "#B45309" }}>
      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>Not linked yet — send <code className="font-mono font-bold">/link {pendingCode}</code> to the bot, then tap Done again.</span>
    </div>
  );
  if (result === "sent") return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px]"
      style={{ background: "rgba(22,163,74,0.07)", border: "1px solid rgba(22,163,74,0.2)", color: "#15803D" }}>
      <CheckCircle className="w-3.5 h-3.5 shrink-0" />
      <span>Test message sent! Check your Telegram to confirm it arrived.</span>
    </div>
  );
  if (result === "error") return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-[11px]"
      style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", color: "#DC2626" }}>
      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>{error || "Could not send test message."}</span>
    </div>
  );
  return null;
}

function TelegramCard() {
  const { data: tgStatus, isLoading: tgLoading, refetch: refetchTg } = useTelegramStatus();
  const linkInit = useTelegramLinkInit();
  const unlink = useTelegramUnlink();
  const updatePrefs = useTelegramUpdatePrefs();
  const sendTest = useTelegramSendTest();
  const [linkData, setLinkData] = useState<{ code: string; botUrl: string | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const [unlinkConfirm, setUnlinkConfirm] = useState(false);
  const [testResult, setTestResult] = useState<"idle" | "checking" | "sent" | "not-linked" | "error">("idle");
  const [testError, setTestError] = useState<string>("");
  const [, setLocation] = useLocation();
  const initiatedLinkRef = useRef(false);
  const autoInitDoneRef = useRef(false);

  const linked = tgStatus?.linked ?? false;

  useEffect(() => {
    if (linked && initiatedLinkRef.current) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("next") === "groups") {
        setLocation("/groups");
      }
    }
  }, [linked, setLocation]);

  useEffect(() => {
    if (!tgLoading && !linked && !autoInitDoneRef.current) {
      autoInitDoneRef.current = true;
      linkInit.mutateAsync().then((data) => {
        setLinkData({ code: data.code, botUrl: data.botUrl });
        initiatedLinkRef.current = true;
      }).catch(() => { /* ignore */ });
    }
  }, [tgLoading, linked]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setLinkData({ code: data.code, botUrl: data.botUrl });
      initiatedLinkRef.current = true;
    }
    catch { /* ignore */ }
  };

  const handleCopy = () => {
    if (!linkData) return;
    navigator.clipboard.writeText(`/link ${linkData.code}`).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleUnlink = async () => {
    if (!unlinkConfirm) { setUnlinkConfirm(true); return; }
    try { await unlink.mutateAsync(); setUnlinkConfirm(false); setLinkData(null); refetchTg(); }
    catch { /* ignore */ }
  };

  const togglePref = (key: keyof TelegramPrefs) => updatePrefs.mutate({ [key]: !prefs[key] });

  if (tgLoading) {
    return (
      <div className="rounded-xl p-4 shadow-sm flex justify-center py-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: T.subtle }} />
      </div>
    );
  }

  const BOT_USERNAME = "SaltPepsBot";
  const BOT_URL = linkData?.botUrl ?? `https://t.me/${BOT_USERNAME}`;

  return (
    <div className="rounded-xl shadow-sm overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-2.5" style={{ borderBottom: `1px solid ${T.border}` }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(27,58,122,0.1)" }}>
          <MessageCircle className="w-4 h-4" style={{ color: "var(--t-blue-deep)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold" style={{ color: T.text }}>Telegram Notifications</h3>
          <p className="text-[11px]" style={{ color: T.muted }}>Get order updates sent straight to your phone</p>
        </div>
        {linked ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
            style={{ background: "rgba(22,163,74,0.1)", color: "#15803D" }}>
            ✅ Linked
          </span>
        ) : (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
            style={{ background: "rgba(220,38,38,0.07)", color: "#B91C1C", border: "1px solid rgba(220,38,38,0.15)" }}>
            ❌ Not Linked
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {linked ? (
          <>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(27,58,122,0.07)", border: "1px solid rgba(27,58,122,0.18)" }}>
              <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "var(--t-blue)" }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold" style={{ color: "var(--t-blue-deep)" }}>Connected to @{BOT_USERNAME}</p>
                <p className="text-[11px]" style={{ color: "var(--t-blue)" }}>You'll receive Telegram DMs for order activity</p>
              </div>
              <button onClick={handleUnlink} disabled={unlink.isPending}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors shrink-0"
                style={{ background: unlinkConfirm ? "rgba(220,38,38,0.1)" : T.surface2, color: unlinkConfirm ? "#DC2626" : T.muted }}>
                {unlink.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlink className="w-3 h-3" />}
                {unlinkConfirm ? "Confirm" : "Unlink"}
              </button>
            </div>
            {unlinkConfirm && (
              <p className="text-[11px] text-center -mt-2" style={{ color: T.muted }}>
                Tap Confirm to unlink.{" "}
                <button className="underline" style={{ color: "var(--t-blue)" }} onClick={() => setUnlinkConfirm(false)}>Cancel</button>
              </p>
            )}
            <TelegramTestBanner result={testResult} error={testError} />
            {testResult === "idle" && (
              <button
                onClick={async () => {
                  setTestResult("checking");
                  setTestError("");
                  try {
                    await sendTest.mutateAsync();
                    setTestResult("sent");
                  } catch (err) {
                    setTestError(err instanceof Error ? err.message : "Failed to send test message");
                    setTestResult("error");
                  }
                }}
                className="w-full h-9 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-opacity"
                style={{ background: T.surface2, color: T.muted, border: `1px solid ${T.border}` }}>
                <Send className="w-3 h-3" />
                Send test message
              </button>
            )}
            <div className="space-y-1">
              <p className="text-[11px] font-semibold mb-2" style={{ color: T.muted }}>Notify me about:</p>
              {PREF_LABELS.map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b last:border-b-0"
                  style={{ borderColor: T.border }}>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: T.text }}>{label}</p>
                    <p className="text-[11px]" style={{ color: T.muted }}>{desc}</p>
                  </div>
                  <button onClick={() => togglePref(key)} disabled={updatePrefs.isPending}
                    className="rounded-full transition-colors flex items-center relative shrink-0 ml-3"
                    style={{ width: "40px", height: "22px", background: prefs[key] ? "var(--t-blue-deep)" : "#CBD5E1" }}>
                    <span className="w-4 h-4 bg-white rounded-full shadow-sm absolute transition-all"
                      style={{ left: prefs[key] ? "20px" : "2px", top: "3px" }} />
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Not linked — unified single-page layout */
          <div className="space-y-3">
            <div className="rounded-xl p-3.5 space-y-3" style={{ background: "rgba(27,58,122,0.05)", border: "1px solid rgba(27,58,122,0.15)" }}>

              {/* Step 1 */}
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white mt-0.5"
                  style={{ background: "var(--t-blue-deep)" }}>1</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold" style={{ color: T.text }}>Open the bot & tap Start</p>
                  <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>This lets the bot know it can message you</p>
                  <a href={BOT_URL} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg"
                    style={{ background: "var(--t-blue-deep)", color: "#fff" }}>
                    <ExternalLink className="w-3 h-3" />
                    Open @{BOT_USERNAME}
                  </a>
                </div>
              </div>

              <div className="h-px" style={{ background: T.border }} />

              {/* Step 2 */}
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white mt-0.5"
                  style={{ background: "var(--t-blue-deep)" }}>2</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold mb-1.5" style={{ color: T.text }}>Send this command to the bot</p>
                  {linkInit.isPending && !linkData ? (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: T.subtle }} />
                      <span className="text-[11px]" style={{ color: T.muted }}>Generating your code…</span>
                    </div>
                  ) : linkData ? (
                    <>
                      <div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                        <code className="flex-1 text-xs font-mono font-bold select-all" style={{ color: T.text }}>/link {linkData.code}</code>
                        <button onClick={handleCopy} className="shrink-0 p-1 rounded transition-colors" style={{ color: T.muted }}>
                          {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p className="text-[10px] mt-1.5 flex items-center gap-1" style={{ color: T.muted }}>
                        <Clock className="w-3 h-3 shrink-0" />
                        This code expires in 15 minutes
                      </p>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                      <span className="text-[11px]" style={{ color: T.muted }}>Could not load code — try resending below</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleLinkInit} disabled={linkInit.isPending}
                className="flex-1 h-9 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-opacity disabled:opacity-50"
                style={{ background: T.surface2, color: T.muted, border: `1px solid ${T.border}` }}>
                {linkInit.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Resend code"}
              </button>
              <button
                onClick={async () => {
                  setTestResult("checking");
                  setTestError("");
                  let isLinked = false;
                  try {
                    const result = await refetchTg();
                    isLinked = result.data?.linked ?? false;
                  } catch {
                    setTestError("Could not check link status — please try again.");
                    setTestResult("error");
                    return;
                  }
                  if (!isLinked) {
                    setTestResult("not-linked");
                    return;
                  }
                  setLinkData(null);
                  try {
                    await sendTest.mutateAsync();
                    setTestResult("sent");
                  } catch (err) {
                    setTestError(err instanceof Error ? err.message : "Failed to send test message");
                    setTestResult("error");
                  }
                }}
                disabled={testResult === "checking"}
                className="flex-1 h-9 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #16A34A, #15803D)" }}>
                {testResult === "checking"
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Checking…</>
                  : "Done — Check Status"}
              </button>
            </div>

            <TelegramTestBanner result={testResult} error={testError} pendingCode={linkData?.code} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Compound Type Badge ────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const m = TYPE_META[type] ?? TYPE_META.Other;
  const Icon = m.Icon;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: m.bg, color: m.color }}>
      <Icon className="w-2.5 h-2.5" />{m.label}
    </span>
  );
}

// ─── Compound card ────────────────────────────────────────────────────────────

function CompoundCard({
  compound, onEnd, onDelete, isActive,
}: {
  compound: CompoundLog;
  onEnd?: () => void;
  onDelete: () => void;
  isActive: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const days = daysBetween(compound.startDate, compound.endDate);
  const doseAmt = parseFloat(compound.doseAmount);

  return (
    <div className="rounded-xl shadow-sm overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <button className="w-full text-left px-4 py-3 flex items-start gap-3" onClick={() => setExpanded(e => !e)}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: (TYPE_META[compound.compoundType] ?? TYPE_META.Other).bg }}>
          {React.createElement((TYPE_META[compound.compoundType] ?? TYPE_META.Other).Icon, {
            className: "w-4 h-4",
            style: { color: (TYPE_META[compound.compoundType] ?? TYPE_META.Other).color },
          })}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold truncate" style={{ color: T.text }}>{compound.compoundName}</p>
            <TypeBadge type={compound.compoundType} />
          </div>
          <p className="text-xs mt-0.5" style={{ color: T.muted }}>
            <span className="font-semibold">{doseAmt % 1 === 0 ? doseAmt : doseAmt.toFixed(3).replace(/\.?0+$/, "")}{compound.doseUnit}</span>
            {" · "}{compound.frequency} · {compound.route}
          </p>
          <p className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: T.muted }}>
            <Calendar className="w-3 h-3 inline" />
            {formatCompoundDate(compound.startDate)}
            {compound.endDate ? ` → ${formatCompoundDate(compound.endDate)}` : " → ongoing"}
            {" · "}<Clock className="w-3 h-3 inline" />{days}d
          </p>
        </div>
        <div className="shrink-0 pt-0.5">
          {expanded ? <ChevronUp className="w-4 h-4" style={{ color: T.subtle }} /> : <ChevronDown className="w-4 h-4" style={{ color: T.subtle }} />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-3 pt-1 border-t space-y-2.5" style={{ borderColor: T.border }}>
              {compound.notes && (
                <p className="text-xs italic" style={{ color: T.muted }}>{compound.notes}</p>
              )}
              <div className="flex gap-2">
                {isActive && onEnd && (
                  <button
                    onClick={onEnd}
                    className="flex-1 h-8 rounded-xl text-xs font-semibold transition-colors"
                    style={{ background: "var(--t-blue-08)", color: "var(--t-blue)", border: "1px solid var(--t-blue-20)" }}
                  >
                    End Protocol
                  </button>
                )}
                {confirmDelete ? (
                  <>
                    <button onClick={onDelete}
                      className="flex-1 h-8 rounded-xl text-xs font-bold text-white"
                      style={{ background: "#DC2626" }}>
                      Confirm Delete
                    </button>
                    <button onClick={() => setConfirmDelete(false)}
                      className="h-8 px-3 rounded-xl text-xs font-semibold"
                      style={{ background: T.surface2, color: T.muted }}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <button onClick={() => setConfirmDelete(true)}
                    className="h-8 px-3 rounded-xl flex items-center gap-1 text-xs font-semibold hover:text-red-500 hover:bg-red-50 transition-colors"
                    style={{ color: T.muted }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Log Compound Form ─────────────────────────────────────────────────────────

function dmyToYmd(dmy: string): string {
  if (!dmy) return "";
  const trimmed = dmy.trim();
  // DD/MM/YYYY (4-digit year)
  let m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  // DD/MM/YY (2-digit year — treat as 20YY)
  m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (m) {
    const y = 2000 + parseInt(m[3], 10);
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return dmy;
}

function ymdToDmy(ymd: string): string {
  if (!ymd) return "";
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return ymd;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function todayDmy(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function LogCompoundForm({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<string>("Peptide");
  const [name, setName] = useState("");
  const [customName, setCustomName] = useState("");
  const [doseAmount, setDoseAmount] = useState("");
  const [doseUnit, setDoseUnit] = useState("mcg");
  const [frequency, setFrequency] = useState("Daily");
  const [route, setRoute] = useState("SubQ");
  const [startDate, setStartDate] = useState(todayDmy);
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const createMut = useCreateCompound();
  const effectiveName = name === "__custom__" ? customName : name;
  const presets = PRESET_COMPOUNDS[type] ?? [];

  function handleTypeChange(t: string) {
    setType(t);
    setName("");
    setCustomName("");
    if (t === "Peptide") { setDoseUnit("mcg"); setRoute("SubQ"); }
    else if (t === "AAS" || t === "TRT") { setDoseUnit("mg"); setRoute("IM"); }
    else { setDoseUnit("mg"); setRoute("Oral"); }
  }

  async function handleSubmit() {
    setSaveError(null);
    const finalName = effectiveName.trim();
    if (!finalName) { setSaveError("Enter a compound name"); return; }
    const amt = parseFloat(doseAmount);
    if (!doseAmount || isNaN(amt) || amt <= 0) { setSaveError("Enter a valid dose amount"); return; }

    const payload: CreateCompoundPayload = {
      compoundName: finalName, compoundType: type,
      doseAmount: amt, doseUnit, frequency, route,
      startDate: dmyToYmd(startDate), endDate: endDate ? dmyToYmd(endDate) : null, notes: notes || null,
    };
    try {
      await createMut.mutateAsync(payload);
      onClose();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
      style={{ background: T.bg }}
    >
      <div className="sticky top-0 z-10 shadow-sm" style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: T.surface2 }}>
              <X className="w-4 h-4" style={{ color: T.muted }} />
            </button>
            <h2 className="text-sm font-bold" style={{ color: T.text }}>Log Compound</h2>
          </div>
          <button
            onClick={handleSubmit}
            disabled={createMut.isPending}
            className="h-9 px-4 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50"
            style={{ background: "var(--t-blue)" }}
          >
            {createMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            Save
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-4 pb-10">
        <div className="rounded-xl p-4 shadow-sm space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>Type</label>
          <div className="grid grid-cols-5 gap-1.5">
            {TYPES.map(t => {
              const m = TYPE_META[t];
              const Icon = m.Icon;
              return (
                <button key={t} onClick={() => handleTypeChange(t)}
                  className="flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all"
                  style={type === t
                    ? { background: m.bg, color: m.color, border: `1px solid ${m.color}40` }
                    : { background: T.surface2, color: T.subtle, border: `1px solid ${T.border}` }}>
                  <Icon className="w-4 h-4" />{t}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl p-4 shadow-sm space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>Compound Name</label>
          {presets.length > 0 && (
            <select value={name} onChange={e => setName(e.target.value)}
              className="w-full h-11 rounded-xl border px-3 text-sm focus:outline-none focus:border-blue-200"
              style={{ background: T.surface2, borderColor: T.border, color: T.text }}>
              <option value="">Select from list…</option>
              {presets.map(p => <option key={p} value={p}>{p}</option>)}
              <option value="__custom__">+ Custom name</option>
            </select>
          )}
          {(name === "__custom__" || presets.length === 0) && (
            <input value={customName} onChange={e => setCustomName(e.target.value)}
              placeholder="Enter compound name"
              className="w-full h-11 rounded-xl border px-4 text-sm focus:outline-none focus:border-blue-200"
              style={{ background: T.surface2, borderColor: T.border, color: T.text }}
            />
          )}
        </div>

        <div className="rounded-xl p-4 shadow-sm space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>Dose Per Administration</label>
          <div className="flex gap-2">
            <input type="number" inputMode="decimal" step="any" min="0" placeholder="0"
              value={doseAmount} onChange={e => setDoseAmount(e.target.value)}
              className="flex-1 h-11 rounded-xl border px-4 text-sm font-mono focus:outline-none focus:border-blue-200"
              style={{ background: T.surface2, borderColor: T.border, color: T.text }}
            />
            <select value={doseUnit} onChange={e => setDoseUnit(e.target.value)}
              className="w-24 h-11 rounded-xl border px-2 text-sm focus:outline-none focus:border-blue-200"
              style={{ background: T.surface2, borderColor: T.border, color: T.text }}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div className="rounded-xl p-4 shadow-sm space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: T.muted }}>Frequency</label>
            <div className="flex flex-wrap gap-1.5">
              {FREQUENCIES.map(f => (
                <button key={f} onClick={() => setFrequency(f)}
                  className="px-3 h-8 rounded-lg text-xs font-semibold transition-all"
                  style={frequency === f
                    ? { background: "var(--t-blue)", color: "white" }
                    : { background: T.surface2, color: T.subtle }}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: T.muted }}>Route</label>
            <div className="flex flex-wrap gap-1.5">
              {ROUTES.map(r => (
                <button key={r} onClick={() => setRoute(r)}
                  className="px-3 h-8 rounded-lg text-xs font-semibold transition-all"
                  style={route === r
                    ? { background: "var(--t-blue)", color: "white" }
                    : { background: T.surface2, color: T.subtle }}>
                  {r}
                </button>
              ))}
            </div>
            {route && (
              <p className="text-[11px] mt-1.5 leading-snug" style={{ color: T.subtle }}>
                {route === "SubQ"    && "Inject into subcutaneous fat — abdomen or outer thigh at 45°"}
                {route === "IM"      && "Inject intramuscularly — glute, quad or delt at 90°"}
                {route === "Oral"    && "Take by mouth — follow fasting or food instructions for the compound"}
                {route === "Nasal"   && "1–2 sprays per nostril — tilt head slightly forward, sniff gently"}
                {route === "Topical" && "Apply to clean, dry skin — rotate application sites"}
                {route === "Other"   && "Refer to compound-specific protocol for administration"}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl p-4 shadow-sm space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: T.muted }}>Start Date</label>
            <input type="text" inputMode="numeric" value={startDate} onChange={e => setStartDate(e.target.value)}
              placeholder="DD/MM/YYYY"
              className="w-full h-11 rounded-xl border px-4 text-sm focus:outline-none focus:border-blue-200"
              style={{ background: T.surface2, borderColor: T.border, color: T.text }} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: T.muted }}>
              End Date <span className="font-normal" style={{ color: T.subtle }}>(leave blank if still active)</span>
            </label>
            <input type="text" inputMode="numeric" value={endDate} onChange={e => setEndDate(e.target.value)}
              placeholder="DD/MM/YYYY"
              className="w-full h-11 rounded-xl border px-4 text-sm focus:outline-none focus:border-blue-200"
              style={{ background: T.surface2, borderColor: T.border, color: T.text }} />
          </div>
        </div>

        <div className="rounded-xl p-4 shadow-sm" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: T.muted }}>
            Notes <span className="font-normal" style={{ color: T.subtle }}>(optional)</span>
          </label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="e.g. Week 1–12 of cycle, blast phase, pinning glutes"
            className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:border-blue-200 resize-none"
            style={{ background: T.surface2, borderColor: T.border, color: T.text }} />
        </div>

        {saveError && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
            style={{ background: "rgba(220,38,38,0.07)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.15)" }}>
            <AlertCircle className="w-4 h-4 shrink-0" />{saveError}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Group Buy Info Modal ──────────────────────────────────────────────────────

interface GBProduct { id: string; name: string; price: number; }

type CPInfoCardType = "info" | "update" | "warning" | "important";

const CP_INFO_CARD_TYPE_META: Record<CPInfoCardType, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  info:      { label: "Info",      icon: Info,          color: "#2563EB", bg: "rgba(37,99,235,0.08)",   border: "rgba(37,99,235,0.2)" },
  update:    { label: "Update",    icon: RefreshCcw,    color: "#0891B2", bg: "rgba(8,145,178,0.08)",   border: "rgba(8,145,178,0.2)" },
  warning:   { label: "Warning",   icon: TriangleAlert, color: "#D97706", bg: "rgba(217,119,6,0.08)",   border: "rgba(217,119,6,0.2)" },
  important: { label: "Important", icon: Star,          color: "#DC2626", bg: "rgba(220,38,38,0.08)",   border: "rgba(220,38,38,0.2)" },
};

function formatCPPostedAt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function WaitlistToggleButton({ gbId }: { gbId: string }) {
  const [status, setStatus] = useState<"loading" | "on" | "off">("loading");
  const [pending, setPending] = useState(false);
  useEffect(() => {
    fetch(`/api/group-buys/${encodeURIComponent(gbId)}/waitlist/status`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setStatus(d.onWaitlist ? "on" : "off"))
      .catch(() => setStatus("off"));
  }, [gbId]);
  const toggle = async () => {
    setPending(true);
    const method = status === "on" ? "DELETE" : "POST";
    await fetch(`/api/group-buys/${encodeURIComponent(gbId)}/waitlist`, { method, credentials: "include" });
    setStatus(s => s === "on" ? "off" : "on");
    setPending(false);
  };
  if (status === "loading") return null;
  return (
    <button
      onClick={toggle}
      disabled={pending}
      className="w-full h-7 rounded-full text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-opacity active:opacity-80"
      style={{ background: status === "on" ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.10)", color: status === "on" ? "rgba(251,191,36,1)" : "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.12)" }}
    >
      🔔 {status === "on" ? "On waitlist" : "Notify me when open"}
    </button>
  );
}

type PortalStockLevel = "out" | "low" | "medium" | "high";
function getPortalStockLevel(stock: number): PortalStockLevel {
  if (stock === 0)  return "out";
  if (stock <= 25)  return "low";
  if (stock <= 70)  return "medium";
  return "high";
}
const PORTAL_STOCK_META: Record<PortalStockLevel, { label: string; color: string; bg: string; border: string; dot: string }> = {
  out:    { label: "Out of Stock", color: "#ef4444", bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.3)",  dot: "#ef4444" },
  low:    { label: "Low Stock",    color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)", dot: "#f97316" },
  medium: { label: "In Stock",     color: "#ca8a04", bg: "rgba(202,138,4,0.1)",  border: "rgba(202,138,4,0.3)",  dot: "#ca8a04" },
  high:   { label: "Well Stocked", color: "#16a34a", bg: "rgba(22,163,74,0.1)",  border: "rgba(22,163,74,0.3)",  dot: "#16a34a" },
};

function PortalStockModal({ items, onClose }: { items: { productName: string; qiyunleCode: string; stock: number }[]; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<PortalStockLevel | null>(null);

  const dedupedItems = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.productName, (map.get(item.productName) ?? 0) + item.stock);
    }
    return Array.from(map.entries()).map(([productName, stock]) => ({ productName, stock }));
  }, [items]);

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    return dedupedItems.filter(i => {
      if (q && !i.productName.toLowerCase().includes(q)) return false;
      if (levelFilter && getPortalStockLevel(i.stock) !== levelFilter) return false;
      return true;
    });
  }, [dedupedItems, search, levelFilter]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-3xl flex flex-col"
        style={{ maxHeight: "85vh", background: "#0f1322", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="px-4 py-3 flex items-center gap-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
              <Boxes className="w-2.5 h-2.5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm leading-tight">Stock Availability</h3>
              <p className="text-white/40 text-[10px]">Salt&amp;Peps · Updated at last sync</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.07)" }}>
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <div className="px-4 py-2.5 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search products…"
              className="w-full pl-8 pr-3 py-2 rounded-xl text-sm text-white placeholder-white/25 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
          </div>
        </div>
        <div className="px-4 py-2 flex items-center gap-2 flex-wrap shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.02)" }}>
          <button
            onClick={() => setLevelFilter(null)}
            className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
            style={{
              background: levelFilter === null ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)",
              color: levelFilter === null ? "#fff" : "rgba(255,255,255,0.45)",
              border: `1px solid ${levelFilter === null ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)"}`,
            }}
          >
            All
          </button>
          {(["out", "low", "medium", "high"] as PortalStockLevel[]).map(lv => {
            const m = PORTAL_STOCK_META[lv];
            const active = levelFilter === lv;
            return (
              <button
                key={lv}
                onClick={() => setLevelFilter(active ? null : lv)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  background: active ? m.bg : "rgba(255,255,255,0.06)",
                  color: active ? m.color : "rgba(255,255,255,0.45)",
                  border: `1px solid ${active ? m.border : "rgba(255,255,255,0.08)"}`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: m.dot }} />
                {m.label}
              </button>
            );
          })}
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-white/30 text-sm py-8">No products found</p>
          ) : (
            filtered.map((item, i) => {
              const lv = getPortalStockLevel(item.stock);
              const m = PORTAL_STOCK_META[lv];
              return (
                <div key={i} className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/90 text-sm font-medium truncate">{item.productName}</p>
                    <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)", maxWidth: 120 }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (item.stock / 100) * 100)}%`, background: m.dot }} />
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0" style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
                    {m.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
        <div className="px-4 py-3 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-white/20 text-xs text-center">Stock levels refresh every 2 hours</p>
        </div>
      </motion.div>
    </>
  );
}

function GBInfoModal({ gb, onClose }: { gb: GroupBuySummary; onClose: () => void }) {
  const cards = gb.infoCards ?? [];
  const [products, setProducts] = useState<GBProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [labProduct, setLabProduct] = useState<string | null>(null);

  useEffect(() => {
    setProductsLoading(true);
    fetch(`/api/group-buys/${gb.id}/products`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(d => setProducts(Array.isArray(d) ? d : []))
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
  }, [gb.id]);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl flex flex-col"
        style={{ background: T.surface, maxHeight: "80vh", border: `1px solid ${T.border}` }}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: T.border }} />
        </div>
        <div className="px-5 py-3 flex items-center justify-between shrink-0" style={{ borderBottom: `1px solid ${T.border}` }}>
          <h3 className="font-bold text-sm" style={{ color: T.text }}>{gb.name}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: T.surface2 }}>
            <X className="w-4 h-4" style={{ color: T.muted }} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {gb.description && <p className="text-sm leading-relaxed" style={{ color: T.muted }}>{gb.description}</p>}
          {cards.map((card, i) => {
            const cardType = (card.type ?? "info") as CPInfoCardType;
            const meta = CP_INFO_CARD_TYPE_META[cardType] ?? CP_INFO_CARD_TYPE_META.info;
            const TypeIcon = meta.icon;
            return (
              <div key={i} className="rounded-xl p-4" style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
                  >
                    <TypeIcon className="w-3 h-3" />
                    {meta.label}
                  </span>
                </div>
                <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: meta.color }}>
                  {card.icon ? `${card.icon} ` : ""}{card.title}
                </p>
                {card.postedAt && (
                  <p className="text-[10px] mb-1" style={{ color: T.subtle }}>{formatCPPostedAt(card.postedAt)}</p>
                )}
                <p className="text-sm leading-relaxed" style={{ color: T.muted }}>{card.body}</p>
              </div>
            );
          })}

          {/* Products + Lab Reports */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: T.muted }}>Lab Reports</p>
            {productsLoading && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: T.muted }} />
              </div>
            )}
            {!productsLoading && products.length === 0 && (
              <p className="text-xs py-2" style={{ color: T.muted }}>No products in this group buy yet.</p>
            )}
            {!productsLoading && products.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${T.border}` }}>
                <p className="text-sm flex-1 mr-3 leading-snug" style={{ color: T.text }}>{p.name}</p>
                <button
                  onClick={() => setLabProduct(p.name)}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 whitespace-nowrap"
                >
                  <TestTube className="w-3 h-3" /> Reports
                </button>
              </div>
            ))}
          </div>

          {!gb.description && cards.length === 0 && !productsLoading && products.length === 0 && (
            <p className="text-center text-sm py-2" style={{ color: T.muted }}>No info available for this group buy yet.</p>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {labProduct && (
          <LabTestsListPopup productName={labProduct} onClose={() => setLabProduct(null)} />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Chinese → English tracking text translation ───────────────────────────────

const ZH_PHRASES: [RegExp, string][] = [
  // Collection
  [/已揽收|揽收成功|快件揽收|已揽件|揽件成功/, "Parcel collected"],
  [/揽收失败|揽件失败/, "Collection failed"],
  // Dispatch / handover
  [/已发出|发出|交寄/, "Dispatched"],
  [/已交航空公司|交航空|航空运输中/, "Handed to airline"],
  [/已装机|装机完成/, "Loaded onto aircraft"],
  // Transit
  [/运输中|在途中|运输途中/, "In transit"],
  [/转运中|中转中/, "In transit (transfer)"],
  [/到达中转中心|到达转运中心|到达分拣中心/, "Arrived at sorting hub"],
  [/离开中转中心|离开转运中心|离开分拣中心/, "Left sorting hub"],
  // Airport
  [/离港|起飞/, "Departed"],
  [/到港|落地/, "Arrived at airport"],
  // Delivery facility
  [/到达派件网点|到达配送中心|到达配送站|到达营业点/, "Arrived at delivery facility"],
  [/正在派送中|派送中|派件中|正在配送|包裹正在派送/, "Out for delivery"],
  // Delivery outcome
  [/已签收|签收成功|投递成功|成功签收/, "Delivered"],
  [/客户拒签|拒签/, "Refused by recipient"],
  [/派件失败|投递失败|派送失败|无人签收/, "Delivery attempt failed"],
  // Customs
  [/出口处理完成|出口放行|出口清关|完成出口报关/, "Export customs cleared"],
  [/进口清关中|进口海关查验|进口处理|海关处理中/, "Import customs processing"],
  [/进口清关完成|进口放行/, "Import customs cleared"],
  [/海关查验|海关扣押|被海关扣留/, "Held by customs"],
  [/安全检查/, "Security check"],
  // International
  [/到达目的地国家|到达目的国/, "Arrived in destination country"],
  [/国际出口/, "International export"],
  [/国际进口/, "International import"],
  // Returns & issues
  [/退回|退件|退货/, "Return to sender"],
  [/丢失|破损/, "Lost / damaged"],
  // Waiting / notifications
  [/超时未取|滞留/, "Awaiting collection"],
  [/等待取件|待取|等待领取/, "Awaiting collection"],
  [/已通知|通知收件人/, "Recipient notified"],
  [/快件信息已.?收到|信息已.?收到|电子信息已.?收到|货物.*信息已.?收到/, "Shipment info received"],
  [/快件已由.*代为签收/, "Signed by proxy"],
  // Locations
  [/中国/, "China"],
  [/香港/, "Hong Kong"],
  [/英国/, "United Kingdom"],
  [/美国/, "United States"],
  [/德国/, "Germany"],
  [/法国/, "France"],
  [/荷兰/, "Netherlands"],
];

function translateZh(text: string): string {
  if (!text) return text;
  if (!/[\u4e00-\u9fff\u3400-\u4dbf]/.test(text)) return text;
  for (const [pattern, english] of ZH_PHRASES) {
    if (pattern.test(text)) return english;
  }
  // Fallback: strip CJK characters so raw Chinese doesn't show through
  return text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]+/g, "").trim() || text;
}

// ─── GB Parcels Modal ─────────────────────────────────────────────────────────

interface MaskedParcel {
  id: string;
  label: string;
  carrier: string;
  maskedTrackingNumber: string;
  status: string;
  items: Array<{ name: string; qty: number }>;
  events: Array<{ date: string; status: string; location: string }>;
  trackingUrl: string | null;
  lastChecked: string | null;
  createdAt: string;
}

const PARCEL_STATUS_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
  pending:          { label: "Pending",          color: "#6B7280", bg: "rgba(107,114,128,0.12)" },
  in_transit:       { label: "In Transit",       color: "#0891B2", bg: "rgba(8,145,178,0.12)" },
  out_for_delivery: { label: "Out for Delivery", color: "#D97706", bg: "rgba(217,119,6,0.12)" },
  attempted:        { label: "Attempted",        color: "#9333EA", bg: "rgba(147,51,234,0.12)" },
  delivered:        { label: "Delivered",        color: "#16A34A", bg: "rgba(22,163,74,0.12)" },
  exception:        { label: "Exception",        color: "#DC2626", bg: "rgba(220,38,38,0.12)" },
  expired:          { label: "Expired",          color: "#6B7280", bg: "rgba(107,114,128,0.12)" },
};

function GBParcelsModal({ gb, orders = [], onClose }: { gb: GroupBuySummary; orders?: Order[]; onClose: () => void }) {
  const [parcels, setParcels] = useState<MaskedParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    fetch(`/api/account/group-buys/${gb.id}/parcels`, { credentials: "include", cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(d => setParcels(Array.isArray(d) ? d : []))
      .catch(() => setParcels([]))
      .finally(() => setLoading(false));
  }, [gb.id]);

  const undispatched = (() => {
    if (!orders.length || loading) return [];
    const dispatchedNames = new Set(parcels.flatMap(p => p.items.map(item => item.name.toLowerCase())));
    const agg = new Map<string, number>();
    for (const order of orders) {
      for (const li of order.lineItems) {
        agg.set(li.productName, (agg.get(li.productName) ?? 0) + li.quantity);
      }
    }
    return Array.from(agg.entries())
      .filter(([name]) => !dispatchedNames.has(name.toLowerCase()))
      .map(([name, qty]) => ({ name, qty }));
  })();

  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  const expandAll = () => {
    const all: Record<string, boolean> = {};
    parcels.forEach(p => { all[p.id] = true; });
    setExpanded(all);
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center md:p-4 pointer-events-none"
      >
        <div className="w-full md:max-w-2xl max-h-[92vh] md:max-h-[85vh] rounded-t-3xl md:rounded-3xl flex flex-col overflow-hidden pointer-events-auto"
          style={{ boxShadow: "0 -8px 50px rgba(0,0,0,0.35)" }}>

          {/* ── Drag handle (mobile) ── */}
          <div className="shrink-0 flex justify-center pt-3 pb-1 md:hidden" style={{ background: "#000E3D" }}>
            <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.25)" }} />
          </div>

          {/* ── Dark navy header ── */}
          <div className="shrink-0 relative px-5 pt-4 pb-5" style={{ background: "#000E3D" }}>
            <button onClick={onClose}
              className="absolute top-3 right-4 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.12)" }}>
              <X className="w-4 h-4 text-white" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <div className="rounded-lg p-1.5" style={{ background: "rgba(255,255,255,0.12)" }}>
                <Truck className="w-4 h-4 text-white" />
              </div>
              <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.5)" }}>
                Shipment Tracking
              </span>
            </div>
            <h2 className="text-lg font-bold text-white leading-snug">{gb.name}</h2>
            {!loading && (
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {parcels.length} {parcels.length === 1 ? "package" : "packages"}
                </span>
                {parcels.length > 1 && (
                  <button onClick={expandAll} className="text-sm underline font-medium" style={{ color: "#93C5FD" }}>
                    Expand all
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── White body ── */}
          <div className="flex-1 overflow-y-auto bg-white px-4 py-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
              </div>
            ) : parcels.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-center">
                <Package className="w-12 h-12 text-gray-200" />
                <p className="text-sm font-medium text-gray-500">No parcels added yet for this group buy.</p>
                <p className="text-xs text-gray-400">Tracking information will appear here once your order is shipped.</p>
              </div>
            ) : (
              parcels.map((parcel, idx) => {
                const statusInfo = PARCEL_STATUS_DISPLAY[parcel.status] ?? PARCEL_STATUS_DISPLAY.pending;
                const events = parcel.events ?? [];
                const isOpen = expanded[parcel.id];

                return (
                  <div key={parcel.id} className="rounded-2xl border border-gray-100 overflow-hidden"
                    style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>

                    {/* Summary row — always visible, tappable to expand */}
                    <button onClick={() => toggle(parcel.id)}
                      className="w-full flex items-start gap-3 p-4 text-left bg-white">
                      {/* Status icon */}
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-4 h-4 text-gray-400" />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-gray-900">Package {idx + 1}</span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: statusInfo.bg, color: statusInfo.color }}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5 font-mono tracking-tight">
                          {parcel.maskedTrackingNumber}
                        </p>
                        <p className="text-xs text-gray-400">{parcel.carrier}</p>
                        {parcel.items.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {parcel.items.map((item, i) => (
                              <span key={i}
                                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{ background: "#EEF2FF", color: "#4338CA" }}>
                                <Settings className="w-3 h-3" />
                                {item.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Chevron */}
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-1 transition-transform duration-200"
                        style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
                    </button>

                    {/* Expanded tracking events */}
                    {isOpen && (
                      <div className="border-t border-gray-100 px-4 pb-4">
                        {events.length === 0 ? (
                          <p className="text-xs text-gray-400 pt-3">No tracking events yet.</p>
                        ) : (
                          <div className="relative ml-4 pl-4 mt-3" style={{ borderLeft: "2px solid #E5E7EB" }}>
                            {events.map((ev, i) => (
                              <div key={i} className="relative mb-3 last:mb-0">
                                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2"
                                  style={{
                                    background: i === 0 ? "#4338CA" : "#F3F4F6",
                                    borderColor: i === 0 ? "#4338CA" : "#D1D5DB",
                                  }} />
                                <p className="text-xs font-semibold text-gray-800 leading-snug">{translateZh(ev.status)}</p>
                                <div className="flex items-center gap-2 mt-0.5 text-gray-400">
                                  {ev.date && (
                                    <span className="text-[11px]">
                                      {new Date(ev.date).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  )}
                                  {ev.location && (
                                    <span className="text-[11px] flex items-center gap-0.5">
                                      <MapPin className="w-2.5 h-2.5" />{translateZh(ev.location)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {parcel.lastChecked && (
                          <p className="text-[11px] text-gray-400 mt-3">
                            Last updated {new Date(parcel.lastChecked).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                        {parcel.trackingUrl && (
                          <a href={parcel.trackingUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold mt-2"
                            style={{ color: "#4338CA" }}>
                            Track on 17track →
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* ── Still to come ── */}
            {!loading && undispatched.length > 0 && (
              <div className="mt-1">
                <p className="text-[11px] font-bold uppercase tracking-wider px-1 mb-2" style={{ color: "#D97706" }}>
                  Still to come
                </p>
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(217,119,6,0.2)", background: "rgba(255,251,235,0.8)" }}>
                  {undispatched.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < undispatched.length - 1 ? "1px solid rgba(217,119,6,0.12)" : "none" }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(217,119,6,0.12)" }}>
                        <Clock className="w-3.5 h-3.5" style={{ color: "#D97706" }} />
                      </div>
                      <p className="flex-1 text-sm font-medium text-gray-800 min-w-0 truncate">{item.name}</p>
                      <span className="text-xs font-bold shrink-0" style={{ color: "#D97706" }}>×{item.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Sticky close footer ── */}
          <div className="shrink-0 px-4 py-3 border-t" style={{ background: "white", borderColor: "rgba(0,0,0,0.07)" }}>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl text-sm font-semibold transition-opacity active:opacity-70"
              style={{ background: "#F1F5F9", color: "#475569" }}
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Join Group Buy Modal ──────────────────────────────────────────────────────

function JoinModal({ onClose }: { onClose: () => void }) {
  const [gbId, setGbId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [uniqueId, setUniqueId] = useState("");
  const [idError, setIdError] = useState("");
  const [idPending, setIdPending] = useState(false);
  const [idNeedsPin, setIdNeedsPin] = useState(false);
  const [idPin, setIdPin] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countryLegInvite, setCountryLegInvite] = useState("");
  const [inviteValidated, setInviteValidated] = useState(false);
  const [validatingInvite, setValidatingInvite] = useState(false);
  const [inviteValidateError, setInviteValidateError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const [showRulesetModal, setShowRulesetModal] = useState(false);
  const [pendingJoin, setPendingJoin] = useState<(() => void) | null>(null);
  const join = useJoinGroupBuy();
  const { account } = useAccount();
  const { data: activeGbs = [], isLoading: gbsLoading } = useActiveGroupBuys();
  const { data: countryLegs = [], isLoading: legsLoading } = useCountryLegs(
    gbId && activeGbs.find(g => g.id === gbId)?.countryLegsEnabled ? gbId : null
  );

  const rawUserCountry = account?.country ?? null;
  const userCountry = rawUserCountry
    ? (COUNTRY_LIST.find(c => c.name.toLowerCase() === rawUserCountry.toLowerCase())?.name
      ?? COUNTRY_LIST.find(c => c.code.toLowerCase() === rawUserCountry.toLowerCase())?.name
      ?? rawUserCountry)
    : null;

  // Filter GBs: if a GB has reshippers assigned, only show it when the user's country matches
  const visibleGbs = activeGbs.filter(gb => {
    if (gb.reshipperCountries.length === 0) return true;
    if (!userCountry) return true;
    return gb.reshipperCountries.includes(userCountry);
  });

  const selected = visibleGbs.find(g => g.id === gbId);
  const requiresPin = selected?.requiresPin ?? false;
  const hasCountryLegs = selected?.countryLegsEnabled ?? false;
  const selectedLeg = countryLegs.find(l => l.countryCode === selectedCountryCode) ?? null;
  const needsLegInvite = hasCountryLegs && selectedLeg?.inviteEnabled;

  // Close country dropdown on outside click
  useEffect(() => {
    if (!countryDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setCountryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [countryDropdownOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const countryWarning = (() => {
    if (!selected) return null;
    const { allowedCountries, excludedCountries } = selected;
    const hasRestrictions = (allowedCountries && allowedCountries.length > 0) || (excludedCountries && excludedCountries.length > 0);
    if (hasRestrictions && !userCountry) return "Please set your country in your profile before joining this group buy.";
    if (userCountry && allowedCountries && allowedCountries.length > 0 && !allowedCountries.includes(userCountry))
      return `This group buy is only available to members in: ${allowedCountries.join(", ")}`;
    if (userCountry && excludedCountries && excludedCountries.length > 0 && excludedCountries.includes(userCountry))
      return `This group buy is not available in your country (${userCountry})`;
    return null;
  })();

  const needsRuleAcceptance = !!account && (account.ruleAcceptedVersion ?? 0) < (account.rulesetVersion ?? 1);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!gbId) { setError("Please select a group buy"); return; }
    if (countryWarning) { setError(countryWarning); return; }
    if (hasCountryLegs && !selectedCountryCode) { setError("Please select your country"); return; }
    if (needsLegInvite && !countryLegInvite.trim()) { setError("An invite code is required for your country group"); return; }
    const doJoin = async () => {
      try {
        await join.mutateAsync({
          groupBuyId: gbId,
          invitePin: pin || undefined,
          countryCode: hasCountryLegs ? selectedCountryCode : undefined,
          countryLegInvite: needsLegInvite ? countryLegInvite.trim() : undefined,
        });
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to join");
      }
    };
    if (needsRuleAcceptance) {
      setPendingJoin(() => doJoin);
      setShowRulesetModal(true);
      return;
    }
    await doJoin();
  };

  const handleIdJoin = async () => {
    setIdError("");
    const trimmed = uniqueId.trim();
    if (!trimmed) return;
    if (idNeedsPin && !idPin.trim()) { setIdError("Please enter the invite PIN"); return; }
    const doJoin = async () => {
      setIdPending(true);
      try {
        await join.mutateAsync({
          groupBuyId: trimmed,
          invitePin: idNeedsPin ? idPin.trim() : undefined,
        });
        onClose();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Invalid or expired ID";
        if (/invite PIN is required/i.test(msg)) {
          setIdNeedsPin(true);
          setIdPin("");
          setIdError("");
        } else {
          setIdError(msg);
        }
      } finally {
        setIdPending(false);
      }
    };
    if (needsRuleAcceptance) {
      setPendingJoin(() => doJoin);
      setShowRulesetModal(true);
      return;
    }
    await doJoin();
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 12 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 rounded-3xl flex flex-col overflow-hidden w-[92%] max-w-sm"
        style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 shrink-0" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: "var(--t-blue-10)" }}>
                <UsersRound className="w-5 h-5" style={{ color: "var(--t-blue)" }} />
              </div>
              <div>
                <h3 className="font-black text-base leading-tight" style={{ color: T.text }}>Join a Group Buy</h3>
                <p className="text-xs mt-0.5" style={{ color: T.muted }}>Members-only pricing, shipped together</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: T.surface2, border: `1px solid ${T.border}` }}>
              <X className="w-4 h-4" style={{ color: T.muted }} />
            </button>
          </div>
        </div>

        <form onSubmit={handleJoin} className="px-5 py-5 space-y-4">
          {/* Custom dropdown */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.muted }}>
              Select Group Buy or Use an Access Code
            </label>
            <div ref={dropdownRef}>
              {/* Trigger */}
              <button
                type="button"
                onClick={() => setDropdownOpen(o => !o)}
                disabled={join.isPending || gbsLoading}
                className="w-full h-12 rounded-2xl px-4 flex items-center justify-between text-sm font-medium focus:outline-none transition-all"
                style={{
                  background: T.surface2,
                  border: `1.5px solid ${dropdownOpen ? "var(--t-blue)" : gbId ? "var(--t-blue)" : T.border}`,
                  color: gbId ? T.text : T.muted,
                  boxShadow: dropdownOpen ? "0 0 0 3px var(--t-blue-10)" : "none",
                }}
              >
                <span>{gbsLoading ? "Loading…" : selected ? selected.name : "Choose a group buy…"}</span>
                {gbsLoading
                  ? <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: T.muted }} />
                  : <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} style={{ color: T.muted }} />
                }
              </button>

              {/* Inline expanding panel */}
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1.5 rounded-2xl" style={{ border: `1px solid ${T.border}`, background: T.surface, overflow: "hidden" }}>
                      {/* Group buy list */}
                      <div style={{ maxHeight: "10rem", overflowY: "auto" }}>
                        {visibleGbs.length === 0 ? (
                          <p className="px-4 py-3 text-sm" style={{ color: T.muted }}>
                            {userCountry ? `No open group buys available for ${userCountry} right now.` : "No open group buys right now."}
                          </p>
                        ) : visibleGbs.map((gb, i) => (
                          <button
                            key={gb.id}
                            type="button"
                            onClick={() => { setGbId(gb.id); setPin(""); setError(""); setDropdownOpen(false); setSelectedCountryCode(""); setCountryLegInvite(""); setInviteValidated(false); setInviteValidateError(null); }}
                            className="w-full px-4 py-3 flex items-center justify-between text-sm text-left transition-colors"
                            style={{
                              borderBottom: i < visibleGbs.length - 1 ? `1px solid ${T.border}` : undefined,
                              background: gb.id === gbId ? "var(--t-blue-10)" : "transparent",
                              color: T.text,
                            }}
                            onMouseEnter={e => { if (gb.id !== gbId) (e.currentTarget as HTMLElement).style.background = T.surface2; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = gb.id === gbId ? "var(--t-blue-10)" : "transparent"; }}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                                style={{ background: gb.id === gbId ? "var(--t-blue)" : T.border, color: gb.id === gbId ? "#fff" : T.muted }}>
                                {i + 1}
                              </span>
                              <span className="font-medium truncate">{gb.name}</span>
                              {gb.organiserId && (
                                <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                  style={{ background: "var(--t-blue-10)", color: "var(--t-blue)" }}>
                                  @{gb.organiserId}
                                </span>
                              )}
                            </div>
                            {gb.id === gbId && <CheckCircle className="w-4 h-4 shrink-0 ml-2" style={{ color: "var(--t-blue)" }} />}
                          </button>
                        ))}
                      </div>

                      {/* OR USE AN ACCESS CODE — inside the panel */}
                      <div style={{ borderTop: `1px solid ${T.border}` }}>
                        {/* Divider label */}
                        <div className="flex items-center gap-3 px-4 py-2.5">
                          <div className="flex-1 h-px" style={{ background: T.border }} />
                          <span className="text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: T.muted }}>or use an access code</span>
                          <div className="flex-1 h-px" style={{ background: T.border }} />
                        </div>
                        {/* Access code row */}
                        <div className="px-3 pb-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--t-blue-10)" }}>
                              <Hash className="w-3 h-3" style={{ color: "var(--t-blue)" }} />
                            </div>
                            <div>
                              <p className="text-[11px] font-bold leading-none" style={{ color: T.text }}>Access Code</p>
                              <p className="text-[10px] leading-tight mt-0.5" style={{ color: T.muted }}>Enter the code shared by your organiser</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={uniqueId}
                              onChange={e => { setUniqueId(e.target.value.toUpperCase().replace(/\s/g, "")); setIdError(""); setIdNeedsPin(false); setIdPin(""); }}
                              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleIdJoin(); } }}
                              placeholder="e.g. B4NDW"
                              disabled={idPending}
                              autoCapitalize="characters"
                              autoCorrect="off"
                              spellCheck={false}
                              className="flex-1 h-10 rounded-xl px-3 text-sm font-mono font-bold text-center tracking-widest focus:outline-none"
                              style={{
                                background: T.surface2,
                                border: `1.5px solid ${idError ? "#FCA5A5" : uniqueId ? "var(--t-blue)" : T.border}`,
                                color: T.text,
                              }}
                            />
                            <button
                              type="button"
                              onClick={handleIdJoin}
                              disabled={idPending || !uniqueId.trim() || (idNeedsPin && !idPin.trim())}
                              className="h-10 px-3 rounded-xl text-xs font-black flex items-center gap-1 shrink-0 disabled:opacity-40 transition-all text-white"
                              style={{ background: "var(--t-blue)" }}
                            >
                              {idPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><ArrowRight className="w-3.5 h-3.5" /> Join</>}
                            </button>
                          </div>
                          {idNeedsPin && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: T.muted }}>Invite PIN</p>
                              <input
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                value={idPin}
                                onChange={e => { setIdPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setIdError(""); }}
                                placeholder="••••"
                                disabled={idPending}
                                autoFocus
                                className="w-full h-10 rounded-xl px-3 text-lg font-mono tracking-[0.35em] text-center focus:outline-none"
                                style={{
                                  background: T.surface2,
                                  border: `1.5px solid var(--t-blue)`,
                                  color: T.text,
                                }}
                              />
                            </div>
                          )}
                          {idError && (
                            <p className="text-[11px] font-medium text-red-500 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 shrink-0" /> {idError}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Country picker (only when GB has country legs) */}
          {hasCountryLegs && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.muted }}>
                Your Country
              </label>
              <div ref={countryDropdownRef}>
                <button
                  type="button"
                  onClick={() => setCountryDropdownOpen(o => !o)}
                  disabled={join.isPending || legsLoading}
                  className="w-full h-12 rounded-2xl px-4 flex items-center justify-between text-sm font-medium focus:outline-none transition-all"
                  style={{
                    background: T.surface2,
                    border: `1.5px solid ${countryDropdownOpen ? "var(--t-blue)" : selectedCountryCode ? "var(--t-blue)" : T.border}`,
                    color: selectedCountryCode ? T.text : T.muted,
                    boxShadow: countryDropdownOpen ? "0 0 0 3px var(--t-blue-10)" : "none",
                  }}
                >
                  <span>{legsLoading ? "Loading countries…" : selectedLeg ? selectedLeg.countryName : "Select your country…"}</span>
                  {legsLoading
                    ? <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: T.muted }} />
                    : <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${countryDropdownOpen ? "rotate-180" : ""}`} style={{ color: T.muted }} />
                  }
                </button>
                <AnimatePresence>
                  {countryDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                    >
                      <div
                        className="mt-1.5 rounded-2xl overflow-y-auto"
                        style={{ border: `1px solid ${T.border}`, background: T.surface, maxHeight: "13rem", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
                      >
                        {countryLegs.length === 0 ? (
                          <p className="px-4 py-3 text-sm" style={{ color: T.muted }}>No countries configured yet.</p>
                        ) : countryLegs.map((leg, i) => (
                          <button
                            key={leg.id}
                            type="button"
                            onClick={() => { setSelectedCountryCode(leg.countryCode); setCountryDropdownOpen(false); setCountryLegInvite(""); setInviteValidated(false); setInviteValidateError(null); }}
                            className="w-full px-4 py-3 flex items-center justify-between text-sm text-left transition-colors"
                            style={{
                              borderBottom: i < countryLegs.length - 1 ? `1px solid ${T.border}` : undefined,
                              background: leg.countryCode === selectedCountryCode ? "var(--t-blue-10)" : "transparent",
                              color: T.text,
                            }}
                          >
                            <span className="font-medium">{leg.countryName}</span>
                            <span className="flex items-center gap-2">
                              {leg.inviteEnabled && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.12)", color: "#D97706" }}>
                                  Invite required
                                </span>
                              )}
                              {leg.countryCode === selectedCountryCode && <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "var(--t-blue)" }} />}
                            </span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Country leg invite code */}
          {needsLegInvite && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.muted }}>
                Country Invite Code
                <span className="font-normal normal-case ml-1" style={{ color: T.subtle }}>(required)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={countryLegInvite}
                  onChange={e => { setCountryLegInvite(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "")); setInviteValidated(false); setInviteValidateError(null); }}
                  placeholder="XXXX-XXXX-XXXX"
                  disabled={join.isPending || validatingInvite}
                  autoFocus
                  className="flex-1 h-12 rounded-2xl px-4 tracking-widest text-center font-mono text-sm focus:outline-none"
                  style={{
                    background: T.surface2,
                    border: `1.5px solid ${inviteValidated ? "#16A34A" : inviteValidateError ? "#DC2626" : countryLegInvite ? "var(--t-blue)" : T.border}`,
                    color: T.text,
                    boxShadow: inviteValidated ? "0 0 0 3px rgba(22,163,74,0.12)" : countryLegInvite ? "0 0 0 3px var(--t-blue-10)" : "none",
                  }}
                />
                <button
                  type="button"
                  disabled={!countryLegInvite.trim() || validatingInvite || join.isPending || inviteValidated}
                  onClick={async () => {
                    setValidatingInvite(true);
                    setInviteValidateError(null);
                    try {
                      const res = await fetch(`/api/group-buys/${gbId}/validate-country-invite`, {
                        method: "POST", credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ countryCode: selectedCountryCode, inviteCode: countryLegInvite }),
                      });
                      if (res.ok) { setInviteValidated(true); }
                      else { const d = await res.json().catch(() => ({})); setInviteValidateError(d.error ?? "Invalid code"); }
                    } finally { setValidatingInvite(false); }
                  }}
                  className="h-12 px-4 rounded-2xl text-xs font-bold shrink-0 transition-all disabled:opacity-40"
                  style={inviteValidated
                    ? { background: "rgba(22,163,74,0.12)", color: "#16A34A" }
                    : { background: "var(--t-blue)", color: "#fff" }}
                >
                  {validatingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : inviteValidated ? <CheckCircle className="w-4 h-4" /> : "Verify"}
                </button>
              </div>
              {inviteValidateError && <p className="text-xs mt-1.5 font-medium" style={{ color: "#DC2626" }}>{inviteValidateError}</p>}
            </div>
          )}

          {/* PIN field */}
          {requiresPin && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.muted }}>
                Invite PIN
                <span className="font-normal normal-case ml-1" style={{ color: T.subtle }}>(required)</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.muted }} />
                <input type="password" inputMode="numeric" maxLength={4}
                  value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••" disabled={join.isPending}
                  className="w-full h-12 rounded-2xl pl-10 pr-4 tracking-[0.4em] text-center font-mono text-lg focus:outline-none"
                  style={{
                    background: T.surface2,
                    border: `1.5px solid ${pin ? "var(--t-blue)" : T.border}`,
                    color: T.text,
                    boxShadow: pin ? "0 0 0 3px var(--t-blue-10)" : "none",
                  }} />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl border"
              style={{ background: "#FEF2F2", borderColor: "#FECACA" }}>
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-600">{error}</p>
            </div>
          )}

          {/* Country warning */}
          {countryWarning && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl border"
              style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-amber-700">{countryWarning}</p>
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={join.isPending || !gbId || (requiresPin && !pin) || !!countryWarning || (hasCountryLegs && !selectedCountryCode) || (!!needsLegInvite && !inviteValidated)}
            className="w-full rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, var(--t-blue) 0%, var(--t-blue-deep, var(--t-blue)) 100%)",
              height: 52,
              boxShadow: "0 4px 14px rgba(var(--t-blue-rgb, 14,165,233), 0.35)",
            }}>
            {join.isPending
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <><UsersRound className="w-4 h-4" /> Join Group Buy</>}
          </button>

          <p className="text-center text-[11px]" style={{ color: T.subtle }}>
            By joining you agree to the group buy terms. Prices lock at checkout.
          </p>
        </form>
      </motion.div>

      {showRulesetModal && (
        <RulesetModal
          onAccepted={async () => {
            setShowRulesetModal(false);
            if (pendingJoin) { await pendingJoin(); setPendingJoin(null); }
          }}
          onClose={() => { setShowRulesetModal(false); setPendingJoin(null); }}
        />
      )}
    </>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────


// ─── Section page title ────────────────────────────────────────────────────────

function PageTitle({ title, subtitle, action, onBack }: { title: string; subtitle?: string; action?: React.ReactNode; onBack?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3 min-w-0">
        {onBack && (
          <button onClick={onBack}
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
            style={{ background: T.surface2, border: `1px solid ${T.border}` }}>
            <ArrowLeft className="w-4 h-4" style={{ color: T.muted }} />
          </button>
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-bold" style={{ color: T.text }}>{title}</h2>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: T.muted }}>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ─── Blood Test Hub: Biomarker catalogue & helpers ────────────────────────────

type BiomarkerDef = { code: string; name: string; unit: string; refLow?: number; refHigh?: number; category: string; about?: string };

const BT_CATALOG: BiomarkerDef[] = [
  { code: "TEST",  name: "Testosterone",                        unit: "nmol/L",        refLow: 12,    refHigh: 30,   category: "Hormones",
    about: "The primary androgen produced by the Leydig cells in the testes, critical for muscle mass, bone density, libido, mood, and cognitive function. Low levels (hypogonadism, <12 nmol/L) cause fatigue, loss of muscle, low libido, depression, and impaired bone density. High levels from exogenous TRT or AAS can suppress natural production, raise haematocrit, and increase cardiovascular risk. Free testosterone gives a more accurate picture since only the unbound fraction is biologically active at the receptor level. Levels peak in the morning and fall through the day — always test fasted at 8–9 am for consistency. If consistently below 12 nmol/L with symptoms, discuss TRT with a hormone specialist." },
  { code: "FTEST", name: "Free Testosterone",                   unit: "nmol/L",        refLow: 0.226, refHigh: 0.65, category: "Hormones",
    about: "The fraction of testosterone not bound to SHBG or albumin — and therefore biologically active at the androgen receptor. Low free T despite normal total T is common when SHBG is elevated (seen with ageing, thyroid disease, liver disease, or alcohol). High free T during AAS use confirms strong androgenic activity at tissue level, amplifying both benefits and side effects. It is a more clinically meaningful marker than total T alone, especially in older men or those on oral medications that raise SHBG. Consistently low free T with hypogonadal symptoms warrants investigation and treatment even when total T appears normal." },
  { code: "LH",    name: "Luteinising Hormone",                 unit: "U/l",           refLow: 1.7,   refHigh: 8.6,  category: "Hormones",
    about: "LH is secreted by the pituitary gland and travels to the testes to trigger testosterone production from Leydig cells via the HPG axis. Exogenous testosterone or AAS completely suppresses LH — often to zero — within weeks, which drives testicular atrophy and impairs sperm production. Low LH with low T points to secondary (central/pituitary) hypogonadism, which may be caused by a prolactinoma, head trauma, or steroid suppression. Persistently elevated LH with low T suggests primary hypogonadism — the testes are failing to respond. LH must always be interpreted alongside FSH and total T for a complete picture of HPG axis function. Recovery of LH after a cycle typically takes weeks to months and may require PCT support." },
  { code: "FSH",   name: "Follicle Stimulating Hormone",        unit: "U/l",           refLow: 1.5,   refHigh: 12.4, category: "Hormones",
    about: "FSH is produced by the pituitary and drives spermatogenesis (sperm production) in the Sertoli cells of the testes. Like LH, it is profoundly suppressed by exogenous androgens — often to undetectable levels within weeks of starting a cycle or TRT — leading to impaired or absent sperm production. Very low FSH is expected and normal while on TRT or AAS. High FSH with low T typically indicates testicular damage or failure (primary hypogonadism), such as from past chemotherapy, orchitis, or Klinefelter syndrome. FSH is especially important in men concerned about fertility — it should always be tested as part of a pre-cycle baseline and post-cycle recovery assessment. Recovery of FSH after cycle cessation is variable and may take 3–12 months." },
  { code: "ESTR",  name: "Oestradiol",                          unit: "pmol/L",        refLow: 41,    refHigh: 159,  category: "Hormones",
    about: "Oestradiol (E2) is the main oestrogen in males, formed by aromatisation of testosterone — primarily in adipose tissue, liver, and the brain. A moderate amount of E2 is essential for bone density, cardiovascular health, libido, mood, joint comfort, and cognitive function. Elevated E2 (>159 pmol/L) during TRT or high-dose androgen use can cause water retention, bloating, gynecomastia, emotional volatility, and reduced libido. Very low E2 — caused by excessive aromatase inhibitor (AI) use — produces joint pain, poor sleep, low mood, brain fog, and increased fracture risk. Always test E2 alongside total T to understand the androgen-to-oestrogen ratio, and avoid aggressive AI use that tanks E2. If E2 is elevated with symptoms, dietary changes, body fat reduction, or a low-dose AI may be appropriate — discuss with your prescriber." },
  { code: "PROL",  name: "Prolactin",                           unit: "mIU/L",         refLow: 86,    refHigh: 324,  category: "Hormones",
    about: "Prolactin is a pituitary hormone best known for stimulating breast milk production but plays important roles in sexual function, mood, and immune regulation in males. Mildly elevated prolactin can be caused by stress, heavy exercise, poor sleep, recent sexual activity, or certain medications (antipsychotics, PPIs, antihistamines). Persistently high prolactin — especially from 19-nor compounds like Nandrolone or Trenbolone acting on dopamine D2 receptors — suppresses LH, FSH, and testosterone, causing low libido, erectile dysfunction, and anorgasmia. A prolactinoma (benign pituitary adenoma) must be ruled out if levels remain persistently elevated without an obvious cause — request a pituitary MRI. Cabergoline or bromocriptine (dopamine agonists) are the first-line treatment for elevated prolactin on cycle. Test alongside LH and FSH as part of a full hormonal panel." },
  { code: "SHBG",  name: "Sex Hormone Binding Globulin",        unit: "nmol/L",        refLow: 10,    refHigh: 57,   category: "Hormones",
    about: "SHBG is a glycoprotein produced mainly by the liver that tightly binds testosterone and oestradiol, rendering them biologically inactive. High SHBG reduces free testosterone even when total T appears normal — a major cause of hypogonadal symptoms in older men, those with liver disease, thyroid disease, or elevated oestrogen. Low SHBG increases free testosterone and oestradiol bioavailability, amplifying both beneficial and adverse androgen effects and sometimes requiring more frequent, smaller dosing to maintain stable levels. Oral AAS, particularly 17α-alkylated compounds and Proviron (mesterolone), strongly suppress SHBG, raising free T. Test SHBG alongside total T and free T for a complete picture of androgenic status — free T cannot be accurately interpreted without knowing SHBG." },
  { code: "TSH",   name: "Thyroid Stimulating Hormone",         unit: "mIU/L",         refLow: 0.27,  refHigh: 4.2,  category: "Hormones",
    about: "TSH is released by the pituitary and drives the thyroid gland to produce T3 and T4 — the hormones that set the body's metabolic rate. A high TSH signals that the thyroid is underperforming (hypothyroidism), while a low TSH suggests an overactive gland (hyperthyroidism). TSH alone is a crude screening tool — always pair it with FT4 and ideally FT3 for a complete picture of thyroid function. Subclinical hypothyroidism (TSH 4–10 with normal FT4) may cause fatigue, weight gain, cold intolerance, constipation, and low mood even without severe symptoms. Thyroid dysfunction can directly suppress testosterone and GH production and is frequently missed in men presenting with poor recovery, fatigue, or unexplained weight change. Discuss any out-of-range result with your GP alongside a full thyroid panel." },
  { code: "FT4",   name: "Free Thyroxine",                      unit: "pmol/L",        refLow: 12,    refHigh: 22,   category: "Hormones",
    about: "FT4 is the unbound form of thyroxine, the main thyroid hormone produced directly by the thyroid gland and the precursor to the active hormone FT3. Low FT4 alongside a high TSH confirms primary hypothyroidism and is usually treated with levothyroxine. Normal FT4 with high TSH suggests early or subclinical hypothyroidism where the pituitary is working harder to maintain thyroid output. FT4 must always be interpreted alongside TSH and FT3 — T4 alone tells you nothing about how well it is being converted into active T3. Some individuals are poor T4-to-T3 converters and remain symptomatic on levothyroxine alone, potentially benefiting from combined T3/T4 therapy. Any abnormal thyroid result with symptoms warrants an endocrinology referral." },
  { code: "HCT",   name: "Haematocrit",                         unit: "%",             refLow: 40,    refHigh: 52,   category: "Hematology",
    about: "Haematocrit measures the proportion of blood volume occupied by red blood cells. Androgens, including TRT and AAS, stimulate erythropoiesis (RBC production) via EPO release from the kidneys and direct bone marrow effects — raising haematocrit is one of the most common and predictable side effects. Haematocrit above 52% significantly increases blood viscosity, raising the risk of clotting events, deep vein thrombosis, pulmonary embolism, stroke, and heart attack. Men on TRT should monitor haematocrit every 3–6 months alongside full blood count. Values consistently above 54% require dose reduction, more frequent smaller injections, switching to topical formulations, or therapeutic phlebotomy. Staying well hydrated also helps keep haematocrit within acceptable limits." },
  { code: "HEMO",  name: "Haemoglobin",                         unit: "g/L",           refLow: 130,   refHigh: 180,  category: "Hematology",
    about: "Haemoglobin is the iron-containing protein inside red blood cells that binds and transports oxygen from the lungs to peripheral tissues. Like haematocrit, it is elevated by androgen use due to stimulation of red blood cell production, and the two markers should always be read together. Values above 180 g/L significantly increase blood viscosity and thrombotic risk, closely mirroring the risk profile of elevated haematocrit. Anaemia (low haemoglobin, <130 g/L) may indicate iron deficiency, B12 or folate deficiency, chronic kidney disease, or other systemic illness. High haemoglobin in an AAS or TRT user should prompt a haematocrit check and consideration of therapeutic phlebotomy if both are consistently elevated. Monitor every 3–6 months if on androgens." },
  { code: "RBC",   name: "Red Blood Cells",                     unit: "10^12/L",       refLow: 4.4,   refHigh: 6.5,  category: "Hematology",
    about: "RBC count reflects the total number of red blood cells per litre of blood and is a direct indicator of the red cell mass driving both haematocrit and haemoglobin. Elevated RBC (polycythaemia, >6.5 × 10¹²/L) is a common consequence of androgen use — androgens raise RBC count by stimulating EPO production and acting directly on bone marrow progenitor cells. Polycythaemia increases blood viscosity and the risk of arterial and venous thrombosis. Any RBC above 6.5 in a man on TRT or AAS should be taken seriously alongside haematocrit and haemoglobin readings. Management includes dose reduction, more frequent injections, improved hydration, and therapeutic phlebotomy. Rarely, very high RBC may indicate polycythaemia vera — a myeloproliferative disorder requiring haematological investigation." },
  { code: "WBC",   name: "White Blood Cells",                   unit: "10^9/L",        refLow: 3,     refHigh: 11,   category: "Hematology",
    about: "The total WBC count reflects the overall immune cell burden in circulation. A high WBC (leukocytosis, >11 × 10⁹/L) can indicate acute bacterial infection, chronic inflammation, steroid use, physiological stress, or, rarely, a haematological malignancy. Very low WBC (leukopenia, <3 × 10⁹/L) impairs immunity and can result from viral infection, autoimmune conditions, or bone marrow suppression by certain medications. WBC is reported as part of a full blood count and is less directly influenced by androgen use than RBC markers. A single mildly abnormal WBC result without symptoms is often benign and should be rechecked at the next test. Persistently abnormal WBC — especially with other cytopenias — warrants urgent haematological evaluation." },
  { code: "LYMPH", name: "Lymphocytes",                         unit: "10^9/L",        refLow: 1.5,   refHigh: 4.5,  category: "Hematology",
    about: "Lymphocytes (T-cells, B-cells, and NK cells) form the cornerstone of the adaptive immune system, coordinating targeted responses to viral infections, cancer cells, and specific pathogens. Elevated lymphocytes (lymphocytosis) may signal a recent viral infection, chronic lymphocytic leukaemia (CLL), or autoimmune disease. Low lymphocyte counts (lymphopenia) occur after intense physical stress, glucocorticoid use, and with immunosuppressive conditions including HIV. As part of the WBC differential, lymphocyte patterns help distinguish viral infections (which raise lymphocytes) from bacterial infections (which predominantly raise neutrophils). Chronically low lymphocytes can indicate reduced immune competence and increased susceptibility to opportunistic infections. Discuss persistently abnormal counts with your GP." },
  { code: "MONO",  name: "Monocytes",                           unit: "10^9/L",        refLow: 0.2,   refHigh: 0.8,  category: "Hematology",
    about: "Monocytes are large mononuclear white blood cells that circulate briefly before migrating into tissues, where they differentiate into macrophages or dendritic cells — key players in innate immunity, inflammation, and antigen presentation. Elevated monocytes (monocytosis) can reflect chronic inflammation, bacterial or parasitic infections, autoimmune conditions, or recovery from acute illness. Monocytopenia (very low monocytes) is uncommon but can be seen with severe bone marrow suppression or immunosuppressive therapies. Monocyte count is always reported as part of the WBC differential and is rarely interpreted in isolation — it must be assessed alongside clinical context. Persistently elevated monocytes with fatigue and night sweats may warrant investigation for lymphoma or other haematological disease." },
  { code: "NEUT",  name: "Neutrophils",                         unit: "10^9/L",        refLow: 2,     refHigh: 7.5,  category: "Hematology",
    about: "Neutrophils are the most abundant white blood cells and serve as the body's first line of defence against bacterial and fungal infections by engulfing and destroying pathogens. Elevated neutrophils (neutrophilia) typically indicate bacterial infection, physiological stress, heavy exercise, glucocorticoid use, or tissue necrosis. Low neutrophils (neutropenia, <2 × 10⁹/L) significantly impair the ability to fight bacterial and fungal infections and can be a serious side effect of certain medications, chemotherapy, or autoimmune conditions. Severe neutropenia (<0.5 × 10⁹/L) constitutes a medical emergency requiring immediate hospital assessment. Neutrophil count is the most clinically important component of the WBC differential. Persistently low or high neutrophils without an obvious cause require haematological investigation." },
  { code: "PLT",   name: "Platelets",                           unit: "10^9/L",        refLow: 150,   refHigh: 450,  category: "Hematology",
    about: "Platelets are small anucleate cell fragments produced by megakaryocytes in the bone marrow that initiate blood clotting when a vessel is damaged by adhering to the injury site and activating the coagulation cascade. Elevated platelets (thrombocytosis, >450 × 10⁹/L) can result from iron deficiency, infection, inflammation, or essential thrombocythaemia — a myeloproliferative disorder raising clot risk. Thrombocytopenia (low platelets, <150 × 10⁹/L) increases bleeding risk and may indicate bone marrow failure, immune destruction (ITP), severe liver disease, or drug-induced suppression. Some AAS may affect platelet production at high doses. Values below 100 × 10⁹/L warrant urgent medical review. Platelet count is always included in a full blood count and should be interpreted alongside clotting markers if bleeding occurs." },
  { code: "MCV",   name: "Mean Cell Volume",                    unit: "fL",            refLow: 80,    refHigh: 100,  category: "Hematology",
    about: "MCV measures the average volume of a red blood cell and is the principal indicator of anaemia type. Macrocytosis (MCV >100 fL, large cells) suggests B12 or folate deficiency, alcohol excess, liver disease, hypothyroidism, or certain medications (methotrexate, hydroxyurea). Microcytosis (MCV <80 fL, small cells) points to iron deficiency anaemia or thalassaemia trait. MCV is most useful when interpreted alongside haemoglobin and other red cell indices — a low haemoglobin with low MCV strongly suggests iron deficiency. Macrocytosis is common in heavy drinkers and should prompt B12, folate, and liver function testing. Exogenous androgens do not typically alter MCV directly, though polycythaemia can artifactually influence averages." },
  { code: "MCHC",  name: "Mean Cell Haemoglobin Concentration", unit: "g/L",           refLow: 320,   refHigh: 360,  category: "Hematology",
    about: "MCHC reflects how densely haemoglobin is packed within each red blood cell and is part of the red cell index triad alongside MCV and MCH. Low MCHC (hypochromia, <320 g/L) indicates iron deficiency or thalassaemia, where cells are pale and under-filled with haemoglobin. Very high MCHC (>360 g/L) can be an artefact of haemolysis in the blood sample tube, or indicate hereditary spherocytosis where cells are abnormally dense. MCHC is interpreted alongside MCV and haemoglobin to characterise anaemia type. Most isolated MCHC abnormalities should be confirmed on a fresh repeat sample. Persistently low MCHC with low haemoglobin warrants iron studies including ferritin, serum iron, and TSAT." },
  { code: "MCH",   name: "Mean Cell Haemoglobin",               unit: "pg",            refLow: 27,    refHigh: 33,   category: "Hematology",
    about: "MCH measures the average mass of haemoglobin within each individual red blood cell and broadly parallels MCV — low MCH aligns with microcytic, hypochromic anaemia (iron deficiency), while high MCH aligns with macrocytosis from B12 or folate deficiency. It is part of the red cell indices used to classify the underlying cause of anaemia and rarely provides additional information beyond what MCV and MCHC reveal. Low MCH with low haemoglobin and low MCV is the classic pattern of iron-deficiency anaemia. High MCH alongside elevated MCV and a low haemoglobin suggests megaloblastic anaemia from B12 or folate deficiency. Exogenous androgens do not directly alter MCH. MCH is always reported as part of a full blood count." },
  { code: "BASO",  name: "Basophils",                           unit: "10^9/L",        refLow: 0,     refHigh: 0.1,  category: "Hematology",
    about: "Basophils are the rarest circulating white blood cells (<1% of WBC) and play a central role in allergic responses and inflammation by releasing histamine, heparin, and other mediators when activated by IgE-coated antigens. Elevated basophils (basophilia, >0.1 × 10⁹/L) are uncommon in the general population and can suggest myeloproliferative disorders (especially CML), hypothyroidism, chronic inflammation, or hypersensitivity reactions. Very low or absent basophils are normal and not clinically significant. Basophilia in a young male without obvious cause warrants haematological review. Basophils are always reported as part of the full WBC differential and should be interpreted in the context of total WBC and other cell counts." },
  { code: "EOS",   name: "Eosinophils",                         unit: "10^9/L",        refLow: 0,     refHigh: 0.4,  category: "Hematology",
    about: "Eosinophils are granulocytic white blood cells that defend against parasitic infections and drive allergic inflammatory responses by releasing toxic granule proteins and inflammatory mediators. Elevated eosinophils (eosinophilia, >0.4 × 10⁹/L) are most commonly caused by allergic conditions (asthma, eczema, hay fever), drug hypersensitivity reactions, or parasitic infections. Rarely, very high eosinophilia (>1.5 × 10⁹/L, hypereosinophilia) indicates hypereosinophilic syndrome or a haematological malignancy, and can cause organ damage if untreated. AAS do not typically cause eosinophilia. Eosinophil count is reported within the WBC differential and must be interpreted alongside clinical symptoms, recent travel history, and medication changes. Persistently elevated eosinophils without an obvious cause require specialist review." },
  { code: "HDL",   name: "High-Density Lipoprotein",            unit: "mmol/L",        refLow: 0.9,   refHigh: 1.7,  category: "Lipids",
    about: "HDL is the 'good' cholesterol carrier that removes excess cholesterol from peripheral tissues and artery walls and transports it back to the liver for excretion via reverse cholesterol transport — a key anti-atherogenic process. Higher HDL (>1.7 mmol/L) is cardioprotective and inversely correlated with cardiovascular disease risk. Androgen use — particularly oral 17α-alkylated AAS such as Anavar, Winstrol, and Dianabol — severely suppresses HDL, often by 50% or more, creating a profoundly atherogenic lipid environment. Low HDL combined with elevated LDL dramatically increases the lifetime risk of heart attack and stroke, even in young men. The most effective strategies for raising HDL include aerobic exercise (3–5 sessions/week), reducing refined carbohydrates and trans fats, avoiding oral AAS, and optimising omega-3 intake. Recheck lipids 6–8 weeks after any intervention." },
  { code: "LDL",   name: "Low-Density Lipoprotein",             unit: "mmol/L",                       refHigh: 3,    category: "Lipids",
    about: "LDL carries cholesterol from the liver to peripheral tissues and, at elevated levels, deposits it within arterial walls — driving atherosclerotic plaque formation. Elevated LDL (>3 mmol/L) is the strongest modifiable cardiovascular risk factor. AAS use — especially oral compounds — significantly raises LDL while simultaneously suppressing HDL, creating a highly atherogenic lipid profile that accelerates arterial disease even in otherwise young and healthy men. Even short cycles can cause persistent lipid changes lasting months after cessation. For most men, target LDL below 3 mmol/L; those using AAS or with other risk factors (smoking, hypertension, family history) should aim below 2 mmol/L. Dietary changes (less saturated fat, more fibre), omega-3 supplementation, and statins (if clinically indicated) are the main interventions. Recheck lipids 6–8 weeks after cycles end." },
  { code: "CHOL",  name: "Total Cholesterol",                   unit: "mmol/L",                       refHigh: 5,    category: "Lipids",
    about: "Total cholesterol is the sum of all cholesterol-containing lipoproteins (LDL + HDL + VLDL) in the blood. Elevated total cholesterol (>5 mmol/L) is a risk factor for cardiovascular disease, though it must always be interpreted in the context of the full lipid panel — high HDL can raise total cholesterol without increasing risk. AAS users frequently present with elevated total cholesterol alongside very low HDL, a particularly dangerous combination even if total cholesterol alone appears only mildly elevated. Target below 5 mmol/L for most individuals. Assessment of true cardiovascular risk requires total cholesterol, LDL, HDL, triglycerides, and the total:HDL ratio, combined with other factors such as blood pressure, BMI, smoking status, and family history." },
  { code: "THDL",  name: "Total Cholesterol: HDL Ratio",        unit: "ratio",                        refHigh: 5,    category: "Lipids",
    about: "The total cholesterol:HDL ratio divides total cholesterol by HDL and is one of the most powerful single-number predictors of cardiovascular risk — better than either marker alone. A ratio below 4 is considered low-risk; above 5 is high-risk; above 6 is very high-risk. AAS users frequently have ratios of 6–10 or higher during cycles due to simultaneous LDL elevation and HDL suppression — even when absolute total cholesterol appears only mildly elevated. Improving HDL through sustained aerobic exercise and correcting LDL through diet and cessation of oral AAS are the most effective approaches to lowering this ratio. Recheck at every blood test while on androgens and 6–8 weeks after cycle cessation to track recovery. Discuss statin use with your prescriber if the ratio remains persistently elevated off-cycle." },
  { code: "ALT",   name: "Alanine Transaminase",                unit: "U/L",                          refHigh: 45,   category: "Liver",
    about: "ALT is an enzyme found predominantly in liver cells (hepatocytes) that leaks into the bloodstream when cells are damaged or inflamed, making it the most sensitive routine marker of hepatocellular injury. It is reliably elevated by oral 17α-alkylated AAS (Dianabol, Anavar, Winstrol, Superdrol) within weeks of starting use, and can also rise with injectable androgens at high doses over time. Mild elevation (1–3× the upper limit of normal) during AAS use is common but warrants close monitoring. Values exceeding 5× the upper limit of normal indicate significant hepatic stress and should prompt cessation of all hepatotoxic substances, increased hydration, and re-testing within 4–6 weeks. Very high ALT (>10× ULN) is a medical emergency requiring immediate hospital assessment. Persistently elevated ALT off-cycle needs investigation with abdominal imaging, GGT, ALP, and viral hepatitis screening." },
  { code: "AST",   name: "Aspartate Aminotransferase",          unit: "U/L",                          refHigh: 40,   category: "Liver",
    about: "AST is an enzyme present in liver cells, heart muscle, skeletal muscle, kidneys, and red blood cells. Unlike ALT, AST is less liver-specific — elevated AST can reflect hepatocellular damage, rhabdomyolysis from intense exercise or AAS use, or cardiac muscle injury. The AST:ALT ratio is diagnostically useful: a ratio above 2:1 is strongly associated with alcoholic liver disease; below 1:1 suggests viral hepatitis or non-alcoholic fatty liver disease. In bodybuilders, AST is frequently elevated purely from skeletal muscle breakdown after intense training — always interpret alongside CK if rhabdomyolysis is suspected. An isolated AST elevation with normal ALT, ALP, and GGT in a heavily training athlete is usually benign and resolves with rest. Persistent or significantly elevated AST requires investigation to determine whether the source is hepatic, muscular, or cardiac." },
  { code: "ALP",   name: "Alkaline Phosphatase",                unit: "U/L",           refLow: 30,    refHigh: 130,  category: "Liver",
    about: "Alkaline phosphatase is an enzyme found in the liver, bile ducts, bone, kidneys, and intestines. Elevated ALP can indicate bile duct obstruction or cholestasis (especially when GGT is also elevated), bone disease including Paget's disease, hyperparathyroidism, or, in growing adolescents, normal bone remodelling. In the context of AAS use, ALP elevation typically reflects biliary stress or cholestasis caused by 17α-alkylated compounds. Low ALP is associated with hypothyroidism, zinc deficiency, or pernicious anaemia. Always interpret ALP alongside GGT — co-elevation suggests biliary disease; isolated ALP elevation with normal GGT points toward bone pathology rather than liver disease. ALP rises slowly and normalises later than ALT after stopping hepatotoxic substances." },
  { code: "GGT",   name: "Gamma-Glutamyl Transferase",          unit: "U/L",           refLow: 8,     refHigh: 61,   category: "Liver",
    about: "GGT is a highly sensitive marker of bile duct inflammation, alcohol-related liver disease, and drug-induced liver injury — it is often the first liver enzyme to rise with alcohol or AAS use and the last to normalise. It is frequently elevated in heavy drinkers even when other liver enzymes appear normal, making it a useful screening marker for alcohol-related hepatic stress. GGT is commonly elevated alongside ALT in those using oral AAS, particularly when biliary cholestasis is the primary mechanism of liver injury. The enzyme typically normalises within 4–8 weeks when alcohol or offending drugs are stopped, provided no underlying liver disease is present. Persistently high GGT with normal other liver markers warrants further investigation including liver ultrasound and a detailed medication and alcohol history. Do not dismiss an elevated GGT without looking at the full liver panel and lifestyle factors." },
  { code: "ALB",   name: "Albumin",                             unit: "g/L",           refLow: 35,    refHigh: 50,   category: "Liver",
    about: "Albumin is the most abundant plasma protein and is synthesised exclusively by the liver, making it a critical marker of hepatic synthetic function and nutritional status. Low albumin (hypoalbuminaemia, <35 g/L) indicates significantly reduced liver synthetic function, severe malnutrition, protein-losing enteropathy, or nephrotic syndrome — it is a marker of serious underlying disease rather than a subtle finding. High albumin (>50 g/L) typically reflects haemoconcentration from dehydration rather than overproduction. In athletes and those on high-protein diets, albumin often sits comfortably in the upper half of the reference range. Persistently low albumin is a serious finding that requires urgent medical evaluation, including liver function tests, urinalysis, and investigation for malnutrition or malabsorption. Albumin also serves as a transport protein for many drugs and hormones, influencing their bioavailability." },
  { code: "BILI",  name: "Bilirubin",                           unit: "μmol/L",                       refHigh: 22,   category: "Liver",
    about: "Bilirubin is the yellow breakdown product of haem from red blood cell destruction, which is processed by the liver and excreted in bile. Elevated bilirubin (jaundice) can result from three broad causes: excessive haemolysis of RBCs (pre-hepatic), liver cell damage impairing conjugation and excretion (hepatic), or bile duct obstruction preventing excretion (post-hepatic). Oral AAS — particularly compounds causing cholestasis — can raise bilirubin by impairing bile flow, leading to the characteristic yellowing of skin and eyes. Mild isolated elevation in an otherwise healthy young person may be benign Gilbert's syndrome, a common harmless genetic variant where bilirubin rises with fasting or illness. Any jaundice accompanied by significantly elevated ALT, ALP, or GGT requires urgent investigation to determine the cause. Persistent or worsening jaundice is a medical emergency." },
  { code: "CREA",  name: "Creatinine",                          unit: "μmol/L",        refLow: 60,    refHigh: 120,  category: "Kidney",
    about: "Creatinine is a byproduct of creatine phosphate metabolism in muscle cells, freely filtered at the glomerulus, and not reabsorbed — making it the standard marker for estimating kidney filtration (eGFR). Values are strongly influenced by muscle mass — bodybuilders and those using AAS typically have baseline creatinine 10–20 μmol/L above average due to greater muscle bulk, not necessarily impaired kidney function. A single mildly elevated creatinine (up to ~130 μmol/L) in a large, well-muscled male may be within their personal normal range. Consistently rising creatinine, or values above 120 μmol/L in someone with low muscle mass, warrants eGFR calculation and nephrology referral. Dehydration, high protein intake, intense exercise before testing, and NSAIDs can all transiently elevate creatinine. Avoid strenuous exercise and NSAIDs for 48 hours before testing for the most accurate result." },
  { code: "eGFR",  name: "Estimated Glomerular Filtration Rate",unit: "ml/min/1.73m2", refLow: 60,    refHigh: 150,  category: "Kidney",
    about: "eGFR is calculated from serum creatinine, age, and sex using validated equations (CKD-EPI) and gives an estimate of how many mL of blood the kidneys filter per minute per 1.73 m² of body surface area. An eGFR above 90 is considered normal; 60–89 may indicate mild kidney impairment in context; below 60 for more than 3 months defines chronic kidney disease (CKD). Athletes with high muscle mass often have artefactually low eGFR due to elevated baseline creatinine — context matters enormously. Values below 60 in someone with normal muscle mass require nephrology referral and investigation for underlying renal disease. NSAIDs (ibuprofen, naproxen), high-protein diets, dehydration, and certain supplements can transiently reduce eGFR. Cystatin C-based eGFR is less affected by muscle mass and may give a more accurate picture in bodybuilders." },
  { code: "UREA",  name: "Urea",                                unit: "mmol/L",        refLow: 2.5,   refHigh: 7.8,  category: "Kidney",
    about: "Urea is the main nitrogen waste product of amino acid catabolism in the liver, filtered and excreted by the kidneys. High urea (>7.8 mmol/L) can reflect high dietary protein intake, dehydration, upper gastrointestinal bleeding, glucocorticoid use, or reduced kidney function. It is always interpreted alongside creatinine — an elevated urea:creatinine ratio (>100:1) suggests pre-renal causes such as dehydration, while both elevated together points toward intrinsic kidney disease. Low urea (<2.5 mmol/L) can indicate liver failure (impaired urea synthesis), severe malnutrition, overhydration, or SIADH. Very high protein intakes common in athletes and bodybuilders routinely push urea toward the upper end of normal or mildly above — this is usually benign if creatinine and eGFR are normal. Reduce protein intake and increase hydration before retesting if urea is mildly elevated." },
  { code: "HbA1c", name: "Glycated Haemoglobin (HbA1c)",        unit: "mmol/mol",      refLow: 20,    refHigh: 42,   category: "Metabolic",
    about: "HbA1c reflects the percentage of haemoglobin that has been irreversibly glycated by circulating glucose over the preceding 2–3 months, making it the gold standard for assessing long-term blood glucose control. A result below 42 mmol/mol is normal; 42–47 mmol/mol indicates pre-diabetes (impaired glucose regulation); 48 mmol/mol or above confirms type 2 diabetes. Supraphysiological androgen use, particularly high-dose testosterone, and GH peptides (e.g., ipamorelin, CJC-1295) can cause insulin resistance and push HbA1c upward over time. GLP-1 receptor agonists (semaglutide, tirzepatide) are highly effective at lowering HbA1c and improving insulin sensitivity. Annual HbA1c monitoring is strongly advised for anyone using androgens, GH peptides, or who has abdominal obesity — early intervention prevents progression to frank diabetes. Berberine, metformin, and dietary carbohydrate restriction are also effective first-line interventions." },
  { code: "FER",   name: "Ferritin",                            unit: "μg/L",          refLow: 30,    refHigh: 400,  category: "Metabolic",
    about: "Ferritin is the primary intracellular iron storage protein and is the most sensitive routine marker of body iron stores. Low ferritin (<30 μg/L) signals depleted iron reserves, and functional iron deficiency can cause fatigue, poor recovery, reduced aerobic capacity, and impaired cognitive function even when haemoglobin remains normal. High ferritin (>400 μg/L in the absence of acute illness) may reflect iron overload, chronic inflammation acting as an acute-phase reactant, metabolic syndrome, fatty liver disease, or haemochromatosis. Men on TRT who undergo therapeutic phlebotomy to control haematocrit can see ferritin decline progressively — monitor every 3–6 months to avoid inducing iron deficiency. Ferritin must always be interpreted alongside haemoglobin, MCV, serum iron, and TSAT for a complete picture. If ferritin is low, investigate cause before supplementing iron." },
  { code: "PSA",   name: "Prostate-Specific Antigen",           unit: "μg/L",                         refHigh: 2.5,  category: "Other",
    about: "PSA is a glycoprotein enzyme produced almost exclusively by prostate gland cells and secreted into seminal fluid. Elevated PSA (>2.5 μg/L under 50, >4 μg/L over 50) can indicate prostate cancer, benign prostatic hyperplasia (BPH), prostatitis, or recent ejaculation within 24–48 hours of testing. TRT and exogenous androgens stimulate prostate tissue growth and can mildly raise PSA — this should be distinguished from pathological elevation by establishing a stable baseline before treatment starts. A significant velocity rise (>0.75 μg/L per year or a rapid acute increase) requires urgent urological referral regardless of absolute level. Do not test PSA within 48 hours of ejaculation, vigorous cycling, or prostate examination, as these transiently elevate results. Annual PSA monitoring is advisable for all men on TRT aged over 40, and a baseline PSA should always be established before commencing androgen therapy." },
  { code: "TRIG",  name: "Triglycerides",                       unit: "mmol/L",        refLow: 0,     refHigh: 2.3,  category: "Lipids",
    about: "Triglycerides are the main form of dietary fat stored in adipose tissue and are the body's primary circulating energy reserve between meals. High triglycerides (>2.3 mmol/L) independently increase cardiovascular risk, promote atherogenic small-dense LDL particle formation, and at very high levels (>10 mmol/L) can trigger acute pancreatitis. They are commonly elevated by refined carbohydrates, fructose, alcohol, obesity, insulin resistance, and certain AAS — particularly oral compounds that impair hepatic fat metabolism. Dietary changes produce the most rapid improvement: eliminating sugars and refined carbs, reducing alcohol, and increasing aerobic exercise typically normalise mildly elevated triglycerides within 8–12 weeks. Omega-3 fatty acids at therapeutic doses (2–4 g EPA+DHA daily) are evidence-based for reducing elevated triglycerides. Test fasted (minimum 10–12 hours) for an accurate result." },
  { code: "FT3",   name: "Free Triiodothyronine",               unit: "pmol/L",        refLow: 3.1,   refHigh: 6.8,  category: "Hormones",
    about: "FT3 is the biologically most active thyroid hormone, predominantly formed by peripheral conversion of FT4 (primarily in the liver) rather than direct thyroid secretion. Low FT3 causes fatigue, cold intolerance, constipation, weight gain, low mood, and impaired recovery — even when TSH and FT4 appear normal — a pattern sometimes called 'T4-to-T3 conversion failure'. Some individuals are constitutionally poor converters of T4 to T3 and may benefit from combined liothyronine (T3) and levothyroxine therapy. GH peptides (e.g., CJC-1295/ipamorelin) can indirectly support T4-to-T3 conversion through GH-mediated effects on peripheral deiodinase activity. FT3 should always be tested alongside TSH and FT4 for a complete thyroid picture. High FT3 with suppressed TSH indicates hyperthyroidism or overreplacement with thyroid medication." },
  { code: "VIT_D", name: "Vitamin D (25-OH)",                   unit: "nmol/L",        refLow: 50,    refHigh: 175,  category: "Vitamins",
    about: "Vitamin D (25-hydroxycholecalciferol) is a fat-soluble secosteroid hormone precursor critical for calcium and phosphate homeostasis, bone mineralisation, immune regulation, cardiovascular health, mood, and testosterone production. In the UK, deficiency (<50 nmol/L) is extremely common — estimated to affect 1 in 6 adults — particularly in autumn and winter due to insufficient UVB sunlight exposure, and is more prevalent in darker-skinned individuals. Deficiency is associated with fatigue, low mood, impaired immunity, reduced muscle strength, elevated PTH causing bone loss, and suboptimal testosterone levels. Optimal levels for performance and health are generally considered 100–150 nmol/L. Supplementation with 2,000–5,000 IU vitamin D3 daily, ideally combined with vitamin K2 (MK-7) to direct calcium to bone, is safe and effective for most people. Retest after 3 months of supplementation to confirm levels have reached the optimal range." },
  { code: "VITB12",name: "Vitamin B12",                         unit: "pmol/L",        refLow: 140,   refHigh: 725,  category: "Vitamins",
    about: "Vitamin B12 (cobalamin) is an essential water-soluble vitamin required for DNA synthesis, red blood cell maturation, myelin production in the nervous system, and one-carbon metabolism. Deficiency causes megaloblastic anaemia (large, poorly functioning RBCs), peripheral neuropathy, subacute combined degeneration of the spinal cord, cognitive decline, and chronic fatigue. Total B12 measures both active (holotranscobalamin) and inactive (haptocorrin-bound) fractions — Active B12 is a more sensitive early marker of deficiency. Deficiency is common in vegans and vegetarians, the elderly with reduced intrinsic factor (pernicious anaemia), and long-term metformin users (metformin blocks ileal B12 absorption). Injectable hydroxocobalamin or high-dose oral cyanocobalamin (1,000 μg/day) can correct most deficiencies within 3 months. Recheck total B12 and active B12 after 3–6 months of supplementation." },
  { code: "ACTB12",name: "Active B12",                          unit: "pmol/L",        refLow: 37.5,  refHigh: 188,  category: "Vitamins",
    about: "Active B12 (holotranscobalamin, HoloTC) measures only the biologically available fraction of total vitamin B12 — the portion bound to transcobalamin II and available for cellular uptake. It is the first form of B12 to fall as stores deplete, making it a more sensitive and specific early marker of functional deficiency than total B12. Low active B12 can occur even when total B12 appears within the reference range, particularly in older adults, vegans, and those with malabsorption or metabolic conditions affecting B12 transport. It is especially useful in people with metabolic conditions, the elderly, those on long-term metformin, and anyone with neurological symptoms that might indicate B12 deficiency. Treatment is identical to total B12 deficiency — oral or intramuscular B12 supplementation. Recheck active B12 after 3–6 months of supplementation to confirm adequate response." },
  { code: "FOL",   name: "Folate",                              unit: "nmol/L",        refLow: 8.83,  refHigh: 60.8, category: "Vitamins",
    about: "Folate (folic acid) is a water-soluble B-vitamin (B9) essential for DNA methylation, nucleotide synthesis, amino acid metabolism, and red blood cell formation. Deficiency causes megaloblastic anaemia with large, poorly functioning red blood cells, elevated homocysteine (an independent cardiovascular risk factor), impaired neural tube formation in early pregnancy, and reduced cognitive function. Combined B12 and folate deficiency is common and should be treated together, as supplementing folate alone can mask B12 deficiency while allowing neurological damage to progress. Alcohol excess is the most common cause of folate deficiency in adults, followed by poor diet and malabsorption. Certain medications (methotrexate, sulfasalazine, anticonvulsants) deplete folate. Supplementation with 400–5,000 μg methylfolate or folic acid daily is effective; recheck after 3 months." },
  { code: "CRP",   name: "C-Reactive Protein",                  unit: "mg/L",          refLow: 0,     refHigh: 5,    category: "Metabolic",
    about: "CRP is an acute-phase protein synthesised by the liver in response to cytokine signals released during inflammation, infection, or tissue injury — it is one of the fastest-responding systemic inflammation markers with a half-life of just 19 hours. Elevated CRP (>5 mg/L) may indicate acute bacterial or viral infection, autoimmune flare, injury, or significant chronic low-grade inflammation. Very high CRP (>100 mg/L) suggests serious acute infection, sepsis, or severe inflammatory disease requiring urgent assessment. Chronic mildly elevated CRP (2–5 mg/L), measured as 'high-sensitivity CRP' (hsCRP), is a significant independent cardiovascular risk factor and marker of systemic inflammatory burden. AAS use can mildly elevate CRP through lipid and hepatic stress. Lifestyle changes — weight loss, regular aerobic exercise, omega-3 supplementation, reducing insulin resistance, and treating underlying infections — are all effective at lowering chronic CRP." },
  { code: "URIC",  name: "Uric Acid",                           unit: "μmol/L",        refLow: 202,   refHigh: 416,  category: "Metabolic",
    about: "Uric acid is the end product of purine catabolism — purines are found in high concentrations in red meat, offal, shellfish, beer, and fructose-rich foods. Elevated uric acid (hyperuricaemia, >416 μmol/L) can trigger acute gout, an intensely painful inflammatory arthritis classically affecting the first metatarsophalangeal joint (big toe) due to urate crystal deposition. Chronic hyperuricaemia is also independently associated with insulin resistance, metabolic syndrome, hypertension, and kidney disease. High-protein diets and dehydration — common in bodybuilders and athletes — can transiently elevate uric acid; staying well hydrated and reducing fructose intake are important prevention strategies. Allopurinol (a xanthine oxidase inhibitor) or febuxostat are the standard long-term medications for chronic gout. Colchicine or NSAIDs manage acute attacks. Discuss with your GP if uric acid is persistently elevated even without gout symptoms." },
  { code: "IRON",  name: "Iron",                                unit: "μmol/L",        refLow: 11,    refHigh: 29,   category: "Metabolic",
    about: "Serum iron measures the amount of iron currently bound to transferrin — the primary iron transport protein — in the bloodstream at the time of testing. Low serum iron is the hallmark of iron-deficiency anaemia, though it fluctuates substantially throughout the day (highest in the morning) and is affected by recent meals. High serum iron alongside elevated ferritin and transferrin saturation may indicate iron overload, haemochromatosis, or excessive supplementation. Serum iron must always be interpreted alongside ferritin and transferrin saturation (TSAT) — neither marker alone gives the complete picture of iron status. Men on regular therapeutic phlebotomy to control polycythaemia from androgen use may see serum iron and ferritin decline progressively and should monitor the full iron panel every 3–6 months to avoid induced iron deficiency. Test fasted in the morning for the most reliable result." },
  { code: "TSAT",  name: "Transferrin Saturation",              unit: "%",             refLow: 15,    refHigh: 50,   category: "Metabolic",
    about: "Transferrin saturation (TSAT) expresses the percentage of transferrin (the iron-transport protein) that is currently bound to iron, providing a functional measure of iron availability for erythropoiesis. Values below 15% confirm functional iron deficiency even when ferritin appears adequate — a pattern common in states of chronic inflammation where ferritin is falsely elevated as an acute-phase reactant. Very high TSAT (>50%) alongside elevated ferritin strongly suggests iron overload and should prompt investigation for hereditary haemochromatosis with HFE gene testing and liver imaging. TSAT is a key component of the iron panel alongside serum iron and ferritin. Men on frequent phlebotomy to manage polycythaemia should monitor TSAT to ensure iron stores are not being depleted too rapidly, as iron deficiency anaemia impairs performance and increases fatigue. Calculate TSAT as (serum iron ÷ total iron-binding capacity) × 100." },
  { code: "DHEAS", name: "DHEA Sulphate",                       unit: "μmol/L",        refLow: 2.41,  refHigh: 11.6, category: "Hormones",
    about: "DHEA-S is the sulphated, water-soluble storage form of dehydroepiandrosterone, an adrenal androgen that serves as a precursor for peripheral conversion into testosterone, oestrogens, and other active androgens in target tissues. Levels naturally peak in the mid-twenties and decline steeply with age (by ~10% per decade), and very low levels are associated with fatigue, low mood, reduced libido, impaired immune function, and accelerated skin ageing. Exogenous corticosteroid use profoundly suppresses DHEA-S production and should be accounted for when interpreting results. Some TRT and longevity protocols include low-dose DHEA supplementation (25–50 mg/day) to maintain levels in the younger-adult range, particularly in men over 40. DHEA testing is most useful in symptomatic men with otherwise optimised testosterone, in those with suspected adrenal fatigue, or in those on long-term corticosteroids. Always discuss DHEA supplementation with a prescriber, as it can raise oestradiol in addition to testosterone." },
  { code: "COR",   name: "Cortisol",                            unit: "nmol/L",        refLow: 101,   refHigh: 536,  category: "Hormones",
    about: "Cortisol is the body's primary glucocorticoid stress hormone, produced by the adrenal cortex in a pronounced diurnal rhythm — highest in the first hour after waking (7–9 am) and lowest at midnight — and released in pulses throughout the day in response to physical or psychological stress. Chronically elevated cortisol from overtraining, inadequate sleep, or severe psychological stress suppresses testosterone production via HPG axis inhibition, impairs immune function, promotes visceral fat accumulation, accelerates muscle catabolism, and disrupts glucose regulation. Low cortisol at 9 am (<101 nmol/L) may indicate adrenal insufficiency, particularly in those who have used exogenous glucocorticoids long-term (causing adrenal suppression). Cortisol must always be interpreted in the context of sampling time — a 9 am fasted sample is the most informative. Persistently abnormal morning cortisol with symptoms (unexplained fatigue, weight change, hypotension, hypoglycaemia) requires an endocrinology referral for a short Synacthen test." },
  { code: "IGF1",  name: "IGF-1",                               unit: "nmol/L",        refLow: 11.3,  refHigh: 30.9, category: "Hormones",
    about: "IGF-1 is the primary mediator of growth hormone (GH) action, produced mainly in the liver in response to pulsatile GH secretion from the pituitary. It drives skeletal muscle protein synthesis, fat oxidation, bone mineralisation, and tissue repair. Elevated IGF-1 confirms active GH secretion and is the principal monitoring marker for GH and GH secretagogue use (e.g., CJC-1295, GHRP-2, ipamorelin, Tesamorelin). Low IGF-1 may indicate GH deficiency, malnutrition, hypothyroidism, liver disease, or inadequate GH peptide dosing. Supraphysiological IGF-1 from exogenous GH use raises concerns about accelerated tumour growth (IGF-1 is a mitogen), acromegalic side effects (joint pain, carpal tunnel, jaw growth), and glucose intolerance. Target IGF-1 for GH peptide protocols is typically in the upper third of the age-adjusted reference range (not above it). Test IGF-1 fasted in the morning, ideally off GH peptides for 24 hours, for consistency." },
  { code: "PROG",  name: "Progesterone",                        unit: "nmol/L",                       refHigh: 3.0,  category: "Hormones",
    about: "Progesterone is a steroid hormone synthesised in the adrenal glands, testes, and (in females) corpus luteum. In males, it serves as a precursor for testosterone and cortisol and plays a role in sperm function and neurosteroid activity. Very low levels are typical and expected in males. Mildly elevated progesterone in males can occur with 19-nortestosterone compounds (nandrolone, trenbolone) which bind progesterone receptors, potentially contributing to progesterone-mediated side effects such as sexual dysfunction and increased prolactin sensitivity. Significantly elevated progesterone in males warrants investigation for adrenal or testicular pathology. Progesterone is more clinically significant in females, where it regulates the menstrual cycle and supports early pregnancy." },
  { code: "PTH",   name: "Parathyroid Hormone",                 unit: "pmol/L",        refLow: 1.6,   refHigh: 6.9,  category: "Hormones",
    about: "Parathyroid hormone is secreted by four small glands behind the thyroid and is the primary regulator of calcium and phosphate homeostasis. It raises blood calcium by stimulating bone resorption, increasing renal calcium reabsorption, and activating vitamin D synthesis in the kidneys. Primary hyperparathyroidism (high PTH with high calcium) is the most common cause of hypercalcaemia in outpatients and can cause kidney stones, bone loss, and fatigue. Secondary hyperparathyroidism (high PTH with low or normal calcium) occurs as a compensatory response to vitamin D deficiency — a common finding in the UK — and can silently erode bone density over years. Correcting vitamin D deficiency typically normalises secondary PTH elevation. Hypoparathyroidism causes hypocalcaemia with symptoms of muscle cramps, paraesthesia, and cardiac arrhythmia. Always interpret PTH alongside calcium and vitamin D for the complete picture." },
  { code: "APOB",  name: "Apolipoprotein B",                    unit: "g/L",                          refHigh: 1.0,  category: "Lipids",
    about: "Apolipoprotein B is the primary structural protein present on all atherogenic lipoproteins — LDL, VLDL, IDL, and Lp(a). Crucially, each atherogenic particle contains exactly one ApoB molecule, meaning ApoB directly counts the number of atherogenic particles in circulation — a more accurate cardiovascular risk predictor than LDL-C alone, particularly in individuals with insulin resistance, diabetes, or metabolic syndrome where LDL-C can be deceptively normal despite high particle counts. Guidelines from cardiovascular societies increasingly recommend ApoB as the primary lipid treatment target. AAS use — especially oral 17α-alkylated compounds — markedly elevates ApoB while suppressing ApoA1. Target ApoB below 0.7 g/L for high-risk individuals (AAS users, metabolic syndrome). Statins and PCSK9 inhibitors are highly effective at lowering ApoB." },
  { code: "APOA1", name: "Apolipoprotein A1",                   unit: "g/L",           refLow: 1.05,  refHigh: 2.05, category: "Lipids",
    about: "Apolipoprotein A1 is the main structural and functional protein of HDL particles, enabling reverse cholesterol transport — the process by which excess cholesterol is removed from arterial walls and returned to the liver for excretion. Higher ApoA1 is strongly cardioprotective. Low ApoA1 is a stronger predictor of cardiovascular events than low HDL-C alone, as it reflects the functional capacity of the HDL system. The ApoB:ApoA1 ratio is one of the most powerful cardiovascular risk indices available — a ratio above 1.0 carries significantly elevated risk. AAS use, especially oral androgens, severely suppresses ApoA1 alongside HDL, dramatically worsening the ApoB:ApoA1 ratio even in young men. Regular aerobic exercise and omega-3 supplementation can modestly raise ApoA1; cessation of oral AAS produces the most rapid improvement." },
  { code: "LPA",   name: "Lipoprotein(a)",                      unit: "nmol/L",                       refHigh: 75,   category: "Lipids",
    about: "Lipoprotein(a) [Lp(a)] is a genetically determined LDL-like particle with an additional apolipoprotein(a) attached, which confers pro-thrombotic and pro-inflammatory properties beyond those of standard LDL. Lp(a) is largely determined by genetics (the LPA gene) and does not respond meaningfully to standard lifestyle interventions or statins — making it a 'residual' cardiovascular risk factor that persists even when LDL is well-controlled. Elevated Lp(a) (>75 nmol/L or >30 mg/dL) is present in approximately 20% of the population and is an independent cause of premature atherosclerosis, aortic stenosis, and thrombotic events. PCSK9 inhibitors modestly reduce Lp(a); dedicated RNA-based therapies (inclisiran, pelacarsen) targeting Lp(a) are in advanced clinical trials. Testing Lp(a) once in a lifetime is recommended for cardiovascular risk stratification — it rarely needs retesting as levels are stable." },
  { code: "GLUC",  name: "Fasting Glucose",                     unit: "mmol/L",        refLow: 3.9,   refHigh: 5.6,  category: "Metabolic",
    about: "Fasting plasma glucose reflects blood sugar concentration after a minimum 8-hour fast. Values of 5.6–6.9 mmol/L define impaired fasting glucose (pre-diabetes); two readings ≥7.0 mmol/L confirm type 2 diabetes. GH peptides (CJC-1295, ipamorelin), particularly at higher doses, raise fasting glucose through direct counter-regulatory effects and GH-induced insulin resistance. GLP-1 receptor agonists (semaglutide, tirzepatide) powerfully lower fasting glucose and HbA1c. Early glucose dysregulation often manifests as fasting hyperglycaemia before HbA1c rises, making glucose a more responsive monitoring marker during GH or steroid use. Test fasted (8+ hours, water only) — any calorie intake before testing will invalidate the result. An oral glucose tolerance test (OGTT) is more sensitive for detecting early insulin resistance than fasting glucose alone." },
  { code: "INS",   name: "Fasting Insulin",                     unit: "pmol/L",                       refHigh: 174,  category: "Metabolic",
    about: "Fasting insulin reflects the level of pancreatic beta-cell output required to maintain euglycaemia at rest. Elevated fasting insulin with normal or near-normal fasting glucose is the earliest detectable sign of insulin resistance — the beta cells are compensating harder to keep blood sugar controlled. The HOMA-IR index (fasting glucose × fasting insulin ÷ 22.5) quantifies insulin resistance and is useful for tracking response to interventions. Insulin resistance is exacerbated by excess visceral adiposity, sedentary behaviour, GH peptide use, high-dose androgens, and poor sleep. GLP-1 agonists (semaglutide), metformin, berberine, HIIT-style training, and dietary carbohydrate reduction are all effective at improving insulin sensitivity. Fasting insulin must be tested after a strict 8-hour fast; stress, recent exercise, and illness all elevate insulin and will produce misleading results." },
  { code: "CPEP",  name: "C-Peptide",                           unit: "nmol/L",        refLow: 0.37,  refHigh: 1.47, category: "Metabolic",
    about: "C-peptide is produced in equal molar amounts to endogenous insulin during proinsulin cleavage in pancreatic beta cells. Because exogenous insulin injections do not contain C-peptide, measuring C-peptide allows clinicians to distinguish endogenous from exogenous insulin production — essential for typing diabetes, detecting insulinomas, and assessing residual beta-cell function. Low C-peptide alongside high glucose confirms type 1 diabetes or end-stage type 2 diabetes with beta-cell failure. Elevated C-peptide with elevated glucose confirms insulin resistance (beta cells producing more insulin in compensation). In those using insulin secretagogues, GH peptides, or being evaluated for hypoglycaemia, C-peptide provides mechanistic insight that glucose or insulin alone cannot. Test fasted; values are more stable than insulin and better at reflecting pancreatic reserve." },
  { code: "HCYS",  name: "Homocysteine",                        unit: "μmol/L",                       refHigh: 15,   category: "Metabolic",
    about: "Homocysteine is an intermediate amino acid formed during methionine metabolism, requiring adequate B12, folate, and B6 as cofactors for its disposal. Elevated homocysteine (hyperhomocysteinaemia, >15 μmol/L) is an independent cardiovascular risk factor, promoting endothelial dysfunction, thrombosis, and accelerated atherosclerosis — particularly relevant for high-dose AAS users who already carry elevated lipid risk. It is also a sensitive early marker of functional B12 or folate deficiency, often rising before anaemia or low B12 levels become apparent. Dietary protein intake (methionine-rich foods), smoking, kidney disease, hypothyroidism, and genetic methylation variants (MTHFR polymorphisms) all elevate homocysteine. Treatment is straightforward: B12 (methylcobalamin), folate (methylfolate), and B6 (pyridoxal-5-phosphate) supplementation typically normalises levels within 6–8 weeks. Recheck after supplementation to confirm response." },
  { code: "DBILI", name: "Direct Bilirubin",                    unit: "μmol/L",                       refHigh: 5,    category: "Liver",
    about: "Direct (conjugated) bilirubin is the water-soluble form of bilirubin that has been processed by the liver and is ready for excretion in bile. Elevated direct bilirubin indicates a problem within the liver or bile duct system — either hepatocellular damage impairing conjugation and excretion, or obstructive cholestasis blocking bile flow from reaching the gut. In AAS users, elevated direct bilirubin alongside high ALT and GGT signals significant cholestatic liver injury from oral 17α-alkylated compounds. In contrast, elevated total bilirubin with normal or minimally raised direct bilirubin suggests pre-hepatic haemolysis or Gilbert's syndrome — a common benign variant where unconjugated bilirubin accumulates due to reduced UGT1A1 enzyme activity, causing mild harmless jaundice particularly during fasting or illness. Direct bilirubin is the key discriminator between these mechanisms." },
  { code: "TPROT", name: "Total Protein",                       unit: "g/L",           refLow: 60,    refHigh: 80,   category: "Liver",
    about: "Total protein measures the combined concentration of albumin and all globulins in the serum. It provides a broad assessment of nutritional status, liver synthetic function, immune protein production, and protein catabolism. Low total protein (<60 g/L) indicates malnutrition, liver failure (reduced albumin synthesis), protein-losing enteropathy, nephrotic syndrome, or severe burns. Elevated total protein (>80 g/L) in the context of normal albumin should prompt investigation for a paraproteinaemia such as multiple myeloma or monoclonal gammopathy of undetermined significance (MGUS), particularly if the calculated globulin is markedly elevated. The albumin:globulin (A:G) ratio is a useful derivative — a ratio below 1.0 (reversed A:G ratio) suggests chronic liver disease, autoimmune disease, or a paraproteinaemia. Athletes on high-protein diets typically maintain protein in the upper-normal range." },
  { code: "GLOB",  name: "Globulin",                            unit: "g/L",           refLow: 18,    refHigh: 36,   category: "Liver",
    about: "Globulins are a diverse group of proteins including immunoglobulins (antibodies), complement proteins, transport proteins (ceruloplasmin, haptoglobin), and acute-phase reactants (fibrinogen, CRP). They are measured indirectly by subtracting albumin from total protein. Elevated globulin can indicate chronic infection (particularly viral hepatitis B or C, HIV, or TB), autoimmune disease (elevated IgG in SLE, rheumatoid arthritis), or a paraproteinaemia (monoclonal elevation in myeloma or MGUS). Low globulin points to immunodeficiency or primary immune disorders. The immunoglobulin electrophoresis (protein electrophoresis) test further characterises any elevated globulin. When blood test automation reports total protein and albumin, globulin is automatically calculated — a calculated globulin below 18 g/L or above 36 g/L should always be investigated further." },
  { code: "CYSTC", name: "Cystatin C",                          unit: "mg/L",          refLow: 0.53,  refHigh: 0.95, category: "Kidney",
    about: "Cystatin C is a low-molecular-weight cysteine protease inhibitor freely filtered at the renal glomerulus, completely reabsorbed and metabolised by tubular cells, with production rates unaffected by muscle mass, diet, or exercise. This makes it a superior kidney function marker to creatinine in athletes, bodybuilders, and AAS users — who frequently have artificially elevated creatinine from high muscle bulk — allowing accurate eGFR estimation even in heavily muscled individuals where creatinine-based eGFR would falsely suggest impaired kidneys. Cystatin C-based eGFR should be used as the first-line kidney function assessment in anyone with significantly above-average muscle mass. Values above 0.95 mg/L warrant a cystatin C-based eGFR calculation; rising cystatin C over serial tests suggests genuine declining kidney function regardless of creatinine status. Testing alongside creatinine provides the most complete renal picture." },
  { code: "CK",    name: "Creatine Kinase",                     unit: "U/L",                          refHigh: 200,  category: "Metabolic",
    about: "Creatine kinase is an enzyme found in skeletal muscle, cardiac muscle, and the brain that leaks into the bloodstream following cellular damage. In athletes and bodybuilders, CK is routinely elevated 2–5× the upper reference limit simply from intense training — this is a normal physiological response reflecting muscle micro-damage and is not pathological in isolation. Very high CK (>1,000 U/L) suggests significant rhabdomyolysis, which at extreme levels (>10,000 U/L) poses a serious risk of acute kidney injury from myoglobin precipitation in the renal tubules. AAS use — particularly high-dose testosterone — enhances muscle protein synthesis but also increases training-induced CK elevation. Always interpret CK alongside creatinine, urea, and urine colour (dark 'cola' urine indicates myoglobinuria). Avoid testing CK within 48 hours of intense exercise for a meaningful baseline result." },
  { code: "CKMB",  name: "Creatine Kinase-MB",                  unit: "U/L",                          refHigh: 25,   category: "Cardiac",
    about: "CK-MB is the myocardial isoform of creatine kinase, found predominantly in cardiac muscle cells. Elevations signal cardiac muscle injury and, historically, were the primary diagnostic marker for acute myocardial infarction — now largely superseded by high-sensitivity troponins, which are more specific and faster to rise. CK-MB remains clinically useful for timing myocardial injury (it peaks at 12–24 hours and returns to normal by 48–72 hours, unlike troponin which remains elevated longer), and for detecting reinfarction. In AAS users, CK-MB may be chronically mildly elevated due to subclinical cardiac hypertrophic remodelling and increased cardiac stress from elevated haematocrit. An elevated CK-MB relative to total CK (CK-MB ratio >5–6%) always warrants further cardiac investigation regardless of absolute values." },
  { code: "HSTNT", name: "High-Sensitivity Troponin T",         unit: "ng/L",                         refHigh: 14,   category: "Cardiac",
    about: "High-sensitivity troponin T (hs-TnT) is an ultra-sensitive marker of cardiac myocyte injury, detectable in blood within 1–3 hours of myocardial damage. It is the primary marker used in emergency medicine for rapid rule-in and rule-out of acute myocardial infarction (heart attack) using 0/1h or 0/3h algorithms. Long-term AAS users — particularly those with left ventricular hypertrophy, elevated haematocrit, and diastolic dysfunction — frequently show chronically mildly elevated hs-TnT even at rest, reflecting ongoing subclinical myocardial strain. Very high hs-TnT (>5× URL) in a non-acute context requires urgent cardiological evaluation including ECG, echocardiogram, and cardiac MRI. Even small serial rises in baseline hs-TnT over time in AAS users should be investigated, as they predict adverse cardiac outcomes. Testing hs-TnT at baseline before starting androgen use provides essential reference data." },
  { code: "HSTNI", name: "High-Sensitivity Troponin I",         unit: "ng/L",                         refHigh: 26,   category: "Cardiac",
    about: "High-sensitivity troponin I (hs-TnI) is a highly cardiac-specific structural protein of the troponin complex, released from cardiomyocytes following myocardial injury or necrosis. It is more cardiac-specific than hs-TnT and has become the preferred troponin assay in many centres. Hs-TnI can remain elevated for 5–14 days after a significant myocardial infarction, providing a wider diagnostic window than CK-MB. Chronically elevated hs-TnI in the absence of an acute event in AAS users has been documented in multiple studies, correlating with left ventricular hypertrophy, fibrosis, and impaired diastolic function — the hallmarks of AAS-related cardiomyopathy. Athletes may have mildly elevated hs-TnI after extreme endurance events (marathon, triathlon), which is physiological and transient; AAS-associated elevation is persistent and progressive. Echocardiography and cardiac MRI are required to evaluate the clinical significance of chronically elevated cardiac biomarkers." },
  { code: "BNP",   name: "Brain Natriuretic Peptide",           unit: "pg/mL",                        refHigh: 100,  category: "Cardiac",
    about: "Brain natriuretic peptide (BNP) is actually secreted predominantly by ventricular cardiomyocytes in response to myocardial wall stress — increased preload (volume overload) or afterload (pressure overload). It is the most clinically used marker for diagnosing and grading heart failure: BNP <35 pg/mL rules out heart failure with high sensitivity; values >100 pg/mL are diagnostic in the right clinical context. In AAS users, chronic polycythaemia elevates blood viscosity and cardiac afterload, potentially driving BNP elevation over time alongside ventricular hypertrophy. Significantly elevated BNP (>400 pg/mL) requires urgent echocardiography and cardiology referral. Mild elevation (100–400 pg/mL) warrants clinical evaluation, echocardiogram, and monitoring. BNP is rapidly metabolised and better reflects current haemodynamic status than NT-proBNP. Falsely low BNP can occur in obesity." },
  { code: "NTBNP", name: "NT-proBNP",                           unit: "pg/mL",                        refHigh: 125,  category: "Cardiac",
    about: "NT-proBNP (N-terminal pro-B-type natriuretic peptide) is the biologically inactive N-terminal cleavage fragment produced alongside BNP when pro-BNP is cleaved in cardiomyocytes under wall stress. It has a much longer half-life than BNP (1–2 hours vs 20 minutes), making it a more stable and sensitive marker for detecting chronic ventricular dysfunction, subtle cardiac remodelling, and early-stage heart failure. Reference ranges are age-stratified: <125 pg/mL for <75 years; <450 pg/mL for ≥75 years. NT-proBNP is the preferred test for outpatient cardiac screening, monitoring chronic heart failure, and assessing cardiac risk in high-risk individuals such as long-term AAS users with left ventricular hypertrophy or elevated haematocrit. Serial NT-proBNP measurement over years in AAS users can detect progressive ventricular dysfunction before symptoms develop. Renal impairment significantly raises NT-proBNP independently of cardiac status." },
  { code: "ESR",   name: "Erythrocyte Sedimentation Rate",      unit: "mm/hr",                        refHigh: 20,   category: "Inflammatory",
    about: "The erythrocyte sedimentation rate measures how quickly red blood cells fall through plasma over one hour in a vertical tube, a process accelerated by acute-phase proteins (fibrinogen, CRP, immunoglobulins) that cause red cells to aggregate and sediment faster. ESR is a non-specific marker of inflammation or infection — it tells you something is wrong but not what. ESR rises more slowly than CRP in acute illness (taking 24–48 hours to peak vs hours for CRP) and remains elevated for longer, making it complementary to CRP for monitoring chronic conditions such as rheumatoid arthritis, temporal arteritis, polymyalgia rheumatica, and inflammatory bowel disease. A very high ESR (>100 mm/hr) is strongly associated with significant pathology — infection, autoimmune disease, malignancy, or myeloma — and always warrants thorough investigation. ESR naturally rises with age and is higher in women; always interpret against age- and sex-adjusted reference ranges." },
  { code: "IL6",   name: "Interleukin-6",                       unit: "pg/mL",                        refHigh: 7,    category: "Inflammatory",
    about: "Interleukin-6 is a pleiotropic cytokine produced by immune cells, adipocytes, muscle cells, and endothelial cells that orchestrates the acute-phase inflammatory response, driving liver production of CRP, fibrinogen, and hepcidin while activating immune cell differentiation. Chronically elevated IL-6 is a potent driver of systemic inflammation, insulin resistance, muscle wasting (cachexia), and accelerated cardiovascular disease — and is strongly linked to visceral obesity. IL-6 is the primary therapeutic target of tocilizumab and sarilumab in rheumatoid arthritis and cytokine release syndrome. Exercise acutely raises IL-6 (a myokine response that is actually anti-inflammatory in context), but chronic elevation at rest indicates pathological inflammatory burden. Measuring IL-6 alongside CRP, ESR, and fibrinogen provides a comprehensive inflammatory panel. Weight loss, exercise training, and resolution of underlying inflammatory triggers are the most effective ways to reduce chronically elevated IL-6." },
  { code: "TNF",   name: "TNF-alpha",                           unit: "pg/mL",                        refHigh: 8.1,  category: "Inflammatory",
    about: "Tumour necrosis factor-alpha is a key pro-inflammatory cytokine produced by macrophages, T lymphocytes, and adipose tissue that activates NF-κB signalling to drive inflammation, apoptosis, and immune activation. Chronically elevated TNF-α is a central driver of insulin resistance by impairing insulin receptor signalling in skeletal muscle and adipose tissue — directly linking chronic low-grade inflammation to metabolic syndrome and type 2 diabetes. TNF-α also promotes muscle protein degradation and contributes to the muscle wasting seen in chronic inflammatory conditions, cancer cachexia, and overtraining syndrome. Visceral obesity is the most common cause of chronically elevated TNF-α; weight loss, exercise training, and resolution of underlying inflammatory disease reduce levels significantly. Anti-TNF biologics (adalimumab, etanercept, infliximab) are highly effective treatments for conditions driven by TNF-α such as rheumatoid arthritis, Crohn's disease, and psoriasis." },
  { code: "FIB",   name: "Fibrinogen",                          unit: "g/L",           refLow: 1.8,   refHigh: 4.0,  category: "Inflammatory",
    about: "Fibrinogen is a liver-produced glycoprotein that is cleaved by thrombin to form fibrin — the structural scaffold of blood clots. It is also a major acute-phase reactant, rising rapidly during infection, inflammation, surgery, or trauma. Elevated fibrinogen (>4 g/L) is an independent cardiovascular risk factor, increasing blood viscosity, platelet aggregation tendency, and thrombotic risk — particularly dangerous in AAS users who already have polycythaemia, suppressed endogenous anticoagulant pathways, and atherogenic lipid profiles. Oral 17α-alkylated AAS can directly elevate fibrinogen through hepatic stimulation. Smoking is one of the most potent non-genetic drivers of fibrinogen elevation and cardiovascular thrombotic risk. Very low fibrinogen (<1.5 g/L) impairs clotting and may indicate disseminated intravascular coagulation (DIC), severe liver failure, or congenital afibrinogenaemia. Monitor fibrinogen annually in AAS users, especially those using oral compounds." },
  { code: "TRANS", name: "Transferrin",                         unit: "g/L",           refLow: 2.0,   refHigh: 3.6,  category: "Metabolic",
    about: "Transferrin is the primary iron transport protein in the blood, carrying iron from sites of absorption (gut) and recycling (spleen) to sites of utilisation (bone marrow for haemoglobin synthesis) and storage (liver). Each transferrin molecule can bind two iron atoms. Low transferrin occurs in iron overload (the body down-regulates transport when stores are full), chronic inflammatory states (acute-phase negative reactant), malnutrition, and liver disease (reduced synthesis). High transferrin — beyond the upper reference range — indicates iron deficiency as the body upregulates the transport system to capture every available iron atom. Transferrin is more stable and less acutely variable than serum iron. The transferrin saturation (TSAT = serum iron ÷ TIBC × 100) calculated from transferrin and serum iron provides a more useful functional index of iron availability than either alone. Interpret transferrin alongside ferritin, serum iron, and TSAT for a complete iron status picture." },
  { code: "TIBC",  name: "Total Iron-Binding Capacity",         unit: "μmol/L",        refLow: 45,    refHigh: 72,   category: "Metabolic",
    about: "Total iron-binding capacity reflects the maximum amount of iron that transferrin in the blood can bind — essentially a surrogate measure of transferrin availability. Elevated TIBC (>72 μmol/L) indicates iron deficiency, as the body synthesises more transferrin to maximise iron capture from limited circulating iron. Low TIBC (<45 μmol/L) occurs in iron overload, haemochromatosis, chronic disease states, or malnutrition where transferrin production is suppressed or saturation is already high. TIBC is calculated or derived from transferrin: TIBC (μmol/L) ≈ transferrin (g/L) × 25.1. The transferrin saturation (TSAT) — serum iron divided by TIBC — is the most useful single ratio for assessing iron metabolism: TSAT <15% confirms functional iron deficiency even when ferritin is normal (common in chronic disease); TSAT >50% with high ferritin confirms iron overload requiring haemochromatosis workup." },
  { code: "MG",    name: "Magnesium",                           unit: "mmol/L",        refLow: 0.7,   refHigh: 1.0,  category: "Vitamins",
    about: "Magnesium is the second most abundant intracellular cation and a required cofactor for over 300 enzymatic reactions, including ATP synthesis, protein synthesis, DNA replication, and neuromuscular transmission. Deficiency is common, affecting an estimated 15–20% of the general population due to poor dietary intake, alcohol excess, gut malabsorption, and diuretic use. In athletes and bodybuilders, substantial magnesium is lost through sweat during exercise, making subclinical deficiency particularly prevalent. Symptoms of deficiency include muscle cramps, insomnia, anxiety, fatigue, constipation, and impaired insulin sensitivity. Serum magnesium has poor sensitivity for detecting deficiency (only 1% of body magnesium is extracellular) — values may appear normal even with significant intracellular depletion. High-dose zinc supplementation competes for absorption and can induce magnesium deficiency. Magnesium glycinate or malate at 300–400 mg elemental magnesium daily is well-tolerated and broadly effective. Avoid magnesium oxide — it has very poor bioavailability." },
  { code: "ZN",    name: "Zinc",                                unit: "μmol/L",        refLow: 11,    refHigh: 24,   category: "Vitamins",
    about: "Zinc is an essential trace element required for the activity of over 300 metalloenzymes and plays critical roles in testosterone biosynthesis (zinc is a necessary cofactor for the enzyme 5α-reductase and steroidogenesis), immune function, wound healing, protein synthesis, taste and smell, and DNA repair. Deficiency impairs testosterone production — multiple trials confirm that supplementing zinc in deficient individuals raises serum testosterone. Athletes and bodybuilders are particularly susceptible to zinc deficiency due to elevated losses in sweat and urine, high protein turnover demands, and gastrointestinal losses from high-volume training. Symptoms of deficiency include impaired immune function, poor wound healing, reduced taste/smell, reduced testosterone, and hair loss. Serum zinc is an imperfect measure (only ~0.1% of body zinc is in serum) but remains the primary clinical test. Zinc bisglycinate or zinc picolinate at 15–30 mg elemental zinc daily is effective; avoid doses above 40 mg long-term as they impair copper absorption." },
  { code: "NA",    name: "Sodium",                              unit: "mmol/L",        refLow: 135,   refHigh: 145,  category: "Electrolytes",
    about: "Sodium is the dominant extracellular cation and the primary determinant of extracellular fluid volume and plasma osmolality. It is tightly regulated by the hypothalamus–pituitary–kidney axis via aldosterone, ADH (vasopressin), and atrial natriuretic peptide. Hyponatraemia (low sodium, <135 mmol/L) can be asymptomatic at mild levels but causes confusion, headache, nausea, and seizures at <125 mmol/L — it is the most common electrolyte disorder in hospitalised patients. Causes include excessive water intake (overhydration during endurance sport — a common cause of exercise-associated hyponatraemia), SIADH, diuretic use, adrenal insufficiency, and severe hypothyroidism. Hypernatraemia (high sodium, >145 mmol/L) indicates dehydration or diabetes insipidus. Sodium is part of the standard electrolyte panel (U&E) and should always be interpreted alongside potassium, chloride, bicarbonate, urea, and creatinine for the complete renal and metabolic picture." },
  { code: "K",     name: "Potassium",                           unit: "mmol/L",        refLow: 3.5,   refHigh: 5.3,  category: "Electrolytes",
    about: "Potassium is the dominant intracellular cation, critical for maintaining membrane resting potential in all excitable cells — nerves, cardiac muscle, and skeletal muscle. The narrow extracellular range (3.5–5.3 mmol/L) belies massive intracellular stores (~98% of body potassium is intracellular). Both hypokalaemia (<3.5 mmol/L) and hyperkalaemia (>5.5 mmol/L) are potentially fatal cardiac emergencies, causing ventricular arrhythmias and cardiac arrest. Hypokalaemia is common with diuretics (thiazides, furosemide), vomiting, diarrhoea, excessive sweating, and some AAS compounds. Hyperkalaemia occurs with kidney disease, ACE inhibitors, potassium-sparing diuretics, and severe haemolysis. Even mild hypokalaemia (3.0–3.5 mmol/L) increases the risk of ventricular ectopics and arrhythmia, particularly in those with underlying cardiac hypertrophy — common in long-term AAS users. Always recheck any abnormal potassium result promptly and ensure the sample is not haemolysed (haemolysis artifactually elevates potassium)." },
  { code: "CL",    name: "Chloride",                            unit: "mmol/L",        refLow: 98,    refHigh: 106,  category: "Electrolytes",
    about: "Chloride is the primary extracellular anion that follows sodium closely to maintain electrical neutrality in extracellular fluid. It plays a central role in acid-base balance, particularly in the anion gap calculation (Na – [Cl + HCO3]) which helps diagnose metabolic acidosis. Hyperchloraemia (>106 mmol/L) with normal or elevated sodium suggests non-anion gap metabolic acidosis (e.g., from diarrhoea, renal tubular acidosis, excess saline administration, or ammonium chloride ingestion). Hypochloraemia (<98 mmol/L) occurs with vomiting (loss of hydrochloric acid), diuretic excess, or metabolic alkalosis. As chloride closely tracks sodium and bicarbonate, isolated chloride abnormalities are less common than combined electrolyte disorders. Chloride is routinely measured as part of the U&E panel and the chloride value primarily informs acid-base interpretation rather than driving independent clinical decisions. Evaluate chloride alongside sodium, bicarbonate, potassium, and the calculated anion gap." },
  { code: "CA",    name: "Calcium",                             unit: "mmol/L",        refLow: 2.15,  refHigh: 2.55, category: "Electrolytes",
    about: "Calcium is the most abundant mineral in the body, with 99% stored in bone and teeth and only 1% in the blood — tightly regulated between 2.15–2.55 mmol/L by PTH, vitamin D, and calcitonin. Total serum calcium must always be corrected for albumin (corrected calcium = measured calcium + 0.02 × (40 – albumin)) since ~40% is protein-bound and only ionised (free) calcium is physiologically active. Hypercalcaemia (>2.6 mmol/L corrected) is most commonly caused by primary hyperparathyroidism or malignancy (bone metastases, PTHrP secretion), and presents with the classic 'stones, bones, groans, and psychic moans' — kidney stones, bone pain, nausea, and confusion. Hypocalcaemia (<2.1 mmol/L corrected) causes muscle cramps, tetany, perioral numbness, Chvostek's and Trousseau's signs, and cardiac QT prolongation. Vitamin D deficiency is the most common reversible cause of mild hypocalcaemia in the UK. Always request PTH and vitamin D when calcium is abnormal." },
  // ── Haematology indices ────────────────────────────────────────────────────
  { code: "RDW",  name: "Red Cell Distribution Width",       unit: "%",             refLow: 11.5,  refHigh: 15,   category: "Hematology",
    about: "Red Cell Distribution Width measures the variability in red blood cell size (anisocytosis). A normal MCV with high RDW often indicates early or mixed nutritional deficiency — the pattern where iron deficiency (producing small cells) and B12/folate deficiency (producing large cells) coexist and cancel each other's effect on MCV. High RDW combined with low MCV confirms iron deficiency anaemia; high RDW with high MCV suggests B12 or folate deficiency. RDW typically rises before MCV becomes abnormal, making it the earliest haematological sign of nutritional deficiency. AAS users frequently develop elevated RDW due to the competing demands of erythropoietic stimulation (testosterone drives red cell production) against nutritional stores. Testing RDW alongside iron, ferritin, B12, and folate gives a complete nutritional picture." },
  { code: "MPV",  name: "Mean Platelet Volume",              unit: "fL",            refLow: 7,     refHigh: 13,   category: "Hematology",
    about: "Mean Platelet Volume reflects the average size of circulating platelets. Larger platelets are metabolically more active, containing more granules and producing more thromboxane A2 — meaning elevated MPV indicates greater platelet reactivity and aggregation potential. High MPV (>13 fL) is associated with increased cardiovascular risk, platelet activation, and conditions driving reactive thrombocytosis. Low MPV (<7 fL) may indicate suppressed platelet production from bone marrow dysfunction, chemotherapy, or inflammatory platelet consumption. In AAS users with polycythaemia and elevated haematocrit, platelet reactivity contributes meaningfully to thrombotic risk alongside viscosity. MPV should be interpreted alongside platelet count (PLT), haematocrit, and clotting tests in any comprehensive cardiovascular risk assessment." },
  // ── Thyroid autoimmune ─────────────────────────────────────────────────────
  { code: "ATPO", name: "Anti-TPO Antibody",                 unit: "kU/L",                         refHigh: 34,   category: "Hormones",
    about: "Anti-thyroid peroxidase antibodies (Anti-TPO) target thyroid peroxidase, the enzyme responsible for incorporating iodine into thyroid hormone precursors. Elevated Anti-TPO is the hallmark of Hashimoto's thyroiditis — the most common autoimmune disease and the leading cause of hypothyroidism worldwide. Anti-TPO levels often rise years before TSH becomes abnormal and before symptoms develop, making it the earliest detectable signal of autoimmune thyroid disease. Very high Anti-TPO (>1000 kU/L) is associated with accelerated gland destruction and faster progression to overt hypothyroidism. Selenium supplementation (200 mcg selenomethionine daily) has demonstrated consistent evidence in multiple trials for reducing Anti-TPO titres and slowing Hashimoto's progression. Anti-TPO positivity in the presence of normal thyroid function warrants 6–12 monthly monitoring of TSH and FT4 to detect subclinical hypothyroidism." },
  { code: "ATPG", name: "Anti-Thyroglobulin Antibody",       unit: "IU/mL",                        refHigh: 115,  category: "Hormones",
    about: "Anti-thyroglobulin antibodies (Anti-Tg) target thyroglobulin, the large glycoprotein precursor within which T3 and T4 are synthesised and stored. Elevated Anti-Tg is present in approximately 60–80% of Hashimoto's thyroiditis cases and ~50–80% of Graves' disease cases, though it is less specific than Anti-TPO for Hashimoto's. Anti-Tg is particularly important as a tumour marker post-thyroidectomy for differentiated thyroid cancer — high Anti-Tg interferes with thyroglobulin measurements used to detect cancer recurrence, so its presence must be noted when interpreting post-surgical monitoring. Some individuals have positive Anti-Tg with normal Anti-TPO — the combined panel is essential for a complete thyroid autoimmune screen. As with Anti-TPO, selenium supplementation has shown benefit in reducing Anti-Tg titres over time in Hashimoto's thyroiditis." },
  // ── Lipid extras ──────────────────────────────────────────────────────────
  { code: "NHDL", name: "Non-HDL Cholesterol",               unit: "mmol/L",                       refHigh: 4,    category: "Lipids",
    about: "Non-HDL cholesterol is calculated as total cholesterol minus HDL and represents the combined cholesterol content of all atherogenic lipoproteins: LDL, VLDL, IDL, lipoprotein remnants, and Lp(a). Because it captures the full atherogenic burden rather than LDL alone, Non-HDL is increasingly preferred by cardiovascular guidelines — particularly for individuals with metabolic syndrome, insulin resistance, diabetes, or hypertriglyceridaemia, where LDL-C can be deceptively normal due to LDL particle size shifts despite high VLDL and remnant cholesterol. The NICE cardiovascular risk guidelines use Non-HDL as the primary cholesterol target, with a target of <4.0 mmol/L for primary prevention and <2.5 mmol/L for secondary prevention. AAS use — especially oral androgens — dramatically worsens Non-HDL by suppressing HDL while raising LDL and VLDL simultaneously. Non-HDL can be calculated from any standard lipid panel without fasting." },
  { code: "VLDL", name: "VLDL Cholesterol",                  unit: "mmol/L",        refLow: 0.1,   refHigh: 1.04, category: "Lipids",
    about: "VLDL (very low-density lipoprotein) is produced by the liver and transports endogenously synthesised triglycerides to peripheral tissues for energy use or storage. VLDL cholesterol directly reflects circulating triglyceride levels — elevated VLDL and elevated triglycerides are essentially the same metabolic problem. High VLDL is the lipid fingerprint of insulin resistance: the combination of elevated triglycerides, low HDL, and small dense LDL particles (the atherogenic dyslipidaemia triad) is strongly predictive of metabolic syndrome and cardiovascular risk beyond what LDL or total cholesterol alone capture. Dietary modification (reducing refined carbohydrates, fructose, and alcohol) is the most powerful intervention for VLDL — more effective than statins, which primarily target LDL. Omega-3 fatty acids (EPA/DHA, 2–4g daily) significantly reduce VLDL and triglycerides. VLDL is typically estimated as triglycerides divided by 5 (in mg/dL) or triglycerides divided by 2.18 (in mmol/L)." },
  // ── Hormonal ──────────────────────────────────────────────────────────────
  { code: "FAI",  name: "Free Androgen Index",               unit: "%",             refLow: 35,    refHigh: 92.6, category: "Hormones",
    about: "The Free Androgen Index (FAI) is calculated as (Total Testosterone × 100) ÷ SHBG and provides an estimate of bioavailable testosterone relative to its primary binding protein. FAI is particularly useful when total testosterone is normal but clinical features of hypo- or hyperandrogenism are present — since SHBG determines how much testosterone is actually free and available to tissues. Elevated FAI (>92.6%) in men may indicate androgen excess or exogenous testosterone use; in women, elevated FAI is a key diagnostic criterion for PCOS. Low FAI despite normal total testosterone occurs when SHBG is chronically elevated (by liver disease, hyperthyroidism, oestrogen, or ageing) and explains persistent hypogonadal symptoms in men with 'normal' testosterone results. FAI tracks well with free testosterone measurements and is particularly useful in serial monitoring as it adjusts for SHBG fluctuations over time." },
  // ── Electrolytes extras ────────────────────────────────────────────────────
  { code: "CO2",  name: "Carbon Dioxide (Bicarbonate)",      unit: "mmol/L",        refLow: 20,    refHigh: 29,   category: "Electrolytes",
    about: "Total carbon dioxide (CO2) in a metabolic panel represents bicarbonate (HCO3-) — the primary blood buffer that maintains acid-base equilibrium. It is one of the most important components of the comprehensive metabolic panel (CMP) as it reflects the kidneys' ability to regulate pH. Low CO2 (<20 mmol/L) indicates metabolic acidosis, with causes including chronic kidney disease, diabetic ketoacidosis, severe diarrhoea (loss of bicarbonate), renal tubular acidosis, and toxic ingestions (salicylates, methanol). High CO2 (>29 mmol/L) indicates metabolic alkalosis from repeated vomiting, diuretic overuse, primary hyperaldosteronism, or mineralocorticoid excess. In the context of peptide and AAS use, diuretic abuse for aesthetics or competition prep is a common cause of metabolic alkalosis and elevated CO2. Interpret CO2 alongside sodium, potassium, chloride, and anion gap (Na - Cl - HCO3) for complete acid-base interpretation." },
];

const BT_CATALOG_BY_CODE = Object.fromEntries(BT_CATALOG.map(b => [b.code, b]));
const BT_CATALOG_BY_NAME = Object.fromEntries(BT_CATALOG.map(b => [b.name, b]));
const BT_CATEGORIES = [...new Set(BT_CATALOG.map(b => b.category))];

const BT_ALIASES: Record<string, string> = {
  "Total Testosterone": "Testosterone",
  "Free T4": "Free Thyroxine",
  "FSH": "Follicle Stimulating Hormone",
  "LH": "Luteinising Hormone",
  "SHBG": "Sex Hormone Binding Globulin",
  "TSH": "Thyroid Stimulating Hormone",
  "HDL": "High-Density Lipoprotein",
  "LDL": "Low-Density Lipoprotein",
  "RBC": "Red Blood Cells",
  "WBC": "White Blood Cells",
  "MCV": "Mean Cell Volume",
  "eGFR": "Estimated Glomerular Filtration Rate",
  "ALP": "Alkaline Phosphatase",
  "ALT": "Alanine Transaminase",
  "GGT": "Gamma-Glutamyl Transferase",
  "HbA1c": "Glycated Haemoglobin (HbA1c)",
};

type BtUnitConv = { altUnit: string; toAlt: (v: number) => number; fromAlt: (v: number) => number };
const BT_UNIT_CONVERSIONS: Record<string, BtUnitConv> = {
  "Testosterone":                        { altUnit: "ng/dL",  toAlt: v => v * 28.842,                      fromAlt: v => v / 28.842 },
  "Free Testosterone":                   { altUnit: "pg/mL",  toAlt: v => v * 288.42,                      fromAlt: v => v / 288.42 },
  "Oestradiol":                          { altUnit: "pg/mL",  toAlt: v => v * 0.2724,                      fromAlt: v => v / 0.2724 },
  "Prolactin":                           { altUnit: "ng/mL",  toAlt: v => v / 21.2,                        fromAlt: v => v * 21.2 },
  "Free Thyroxine":                      { altUnit: "ng/dL",  toAlt: v => v * 0.07752,                     fromAlt: v => v / 0.07752 },
  "Free Triiodothyronine":               { altUnit: "pg/mL",  toAlt: v => v * 0.6509,                      fromAlt: v => v / 0.6509 },
  "Haemoglobin":                         { altUnit: "g/dL",   toAlt: v => v / 10,                          fromAlt: v => v * 10 },
  "Mean Cell Haemoglobin Concentration": { altUnit: "g/dL",   toAlt: v => v / 10,                          fromAlt: v => v * 10 },
  "Albumin":                             { altUnit: "g/dL",   toAlt: v => v / 10,                          fromAlt: v => v * 10 },
  "High-Density Lipoprotein":            { altUnit: "mg/dL",  toAlt: v => v * 38.67,                       fromAlt: v => v / 38.67 },
  "Low-Density Lipoprotein":             { altUnit: "mg/dL",  toAlt: v => v * 38.67,                       fromAlt: v => v / 38.67 },
  "Total Cholesterol":                   { altUnit: "mg/dL",  toAlt: v => v * 38.67,                       fromAlt: v => v / 38.67 },
  "Total Cholesterol: HDL Ratio":        { altUnit: "mg/dL",  toAlt: v => v * 38.67,                       fromAlt: v => v / 38.67 },
  "Triglycerides":                       { altUnit: "mg/dL",  toAlt: v => v * 88.57,                       fromAlt: v => v / 88.57 },
  "Glycated Haemoglobin (HbA1c)":        { altUnit: "%",      toAlt: v => +(v * 0.0915 + 2.15).toFixed(1), fromAlt: v => +((v - 2.15) / 0.0915).toFixed(1) },
  "Creatinine":                          { altUnit: "mg/dL",  toAlt: v => v * 0.01131,                     fromAlt: v => v / 0.01131 },
  "Urea":                                { altUnit: "mg/dL",  toAlt: v => v * 6.006,                       fromAlt: v => v / 6.006 },
  "Uric Acid":                           { altUnit: "mg/dL",  toAlt: v => v * 0.01681,                     fromAlt: v => v / 0.01681 },
  "Iron":                                { altUnit: "μg/dL",  toAlt: v => v * 5.585,                       fromAlt: v => v / 5.585 },
  "Bilirubin":                           { altUnit: "mg/dL",  toAlt: v => v * 0.05847,                     fromAlt: v => v / 0.05847 },
  "DHEA Sulphate":                       { altUnit: "μg/dL",  toAlt: v => v * 36.66,                       fromAlt: v => v / 36.66 },
  "Cortisol":                            { altUnit: "μg/dL",  toAlt: v => v * 0.03625,                     fromAlt: v => v / 0.03625 },
  "IGF-1":                               { altUnit: "ng/mL",  toAlt: v => v * 7.65,                        fromAlt: v => v / 7.65 },
  "Vitamin D (25-OH)":                   { altUnit: "ng/mL",  toAlt: v => v * 0.4006,                      fromAlt: v => v / 0.4006 },
  "Vitamin B12":                         { altUnit: "pg/mL",  toAlt: v => v * 1.355,                       fromAlt: v => v / 1.355 },
  "Active B12":                          { altUnit: "pg/mL",  toAlt: v => v * 1.355,                       fromAlt: v => v / 1.355 },
  "Folate":                              { altUnit: "ng/mL",  toAlt: v => v * 0.441,                       fromAlt: v => v / 0.441 },
  "C-Reactive Protein":                  { altUnit: "mg/dL",  toAlt: v => v / 10,                          fromAlt: v => v * 10 },
  "Ferritin":                            { altUnit: "ng/mL",  toAlt: v => v,                               fromAlt: v => v },
  "Non-HDL Cholesterol":                 { altUnit: "mg/dL",  toAlt: v => v * 38.67,                       fromAlt: v => v / 38.67 },
  "VLDL Cholesterol":                    { altUnit: "mg/dL",  toAlt: v => v * 38.67,                       fromAlt: v => v / 38.67 },
};

function btUnitPrefKey(name: string) { return `peps:btUnit:${name}`; }

function btLookup(name: string) {
  return BT_CATALOG_BY_NAME[name]
    ?? BT_CATALOG_BY_CODE[name]
    ?? (BT_ALIASES[name] ? BT_CATALOG_BY_NAME[BT_ALIASES[name]] : undefined)
    ?? BT_CATALOG.find(b => b.name.toLowerCase() === name.toLowerCase());
}

function btParseNum(s: string | null | undefined): number | null {
  if (s == null || s === "") return null;
  if (/^nan$/i.test(s.trim())) return 0;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function btIsInRange(val: number, low?: number | null, high?: number | null): boolean | null {
  if (low == null && high == null) return null;
  if (low != null && val < low) return false;
  if (high != null && val > high) return false;
  return true;
}

function btFmtVal(n: number): string {
  if (n === 0) return "0";
  if (Math.abs(n) < 1) return n.toFixed(3).replace(/\.?0+$/, "");
  if (Math.abs(n) < 10) return n.toFixed(2).replace(/\.?0+$/, "");
  if (Math.abs(n) < 100) return n.toFixed(1).replace(/\.?0+$/, "");
  return Math.round(n).toString();
}

function btFormatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function btFormatShortDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
}

// ─── Blood Test Hub: Dashboard tab ────────────────────────────────────────────

type BtChartPoint = { date: string; value: number; testName?: string; isoDate?: string };

function BtSparkline({ data, refLow, refHigh }: { data: BtChartPoint[]; refLow?: number | null; refHigh?: number | null }) {
  if (data.length < 2) return null;
  const W = 100; const H = 36;
  const vals = data.map(d => d.value);
  const minV = Math.min(...vals); const maxV = Math.max(...vals);
  const span = maxV - minV || 1;
  const pts = data.map((d, i) => [
    (i / (data.length - 1)) * W,
    H - Math.max(2, Math.min(H - 2, ((d.value - minV) / span) * (H - 4) + 2)),
  ]);
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
      <path d={pathD} fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => {
        const ir = btIsInRange(data[i].value, refLow, refHigh);
        return <circle key={i} cx={x} cy={y} r={i === data.length - 1 ? 3.5 : 2.5} fill={ir === false ? "#DC2626" : "#16A34A"} stroke="white" strokeWidth="1.5" />;
      })}
    </svg>
  );
}

function BtRangeBar({ value, refLow, refHigh, inRange }: { value: number; refLow?: number | null; refHigh?: number | null; inRange: boolean | null }) {
  const hi = refHigh ?? (refLow != null ? refLow * 3 : value * 1.5);
  const lo = refLow ?? 0;
  const displayMax = Math.max(hi * 1.4, value > hi ? value * 1.15 : hi * 1.2);
  const range = displayMax;
  const lowPct  = lo > 0 ? (lo / range) * 100 : 0;
  const highPct = (hi / range) * 100;
  const midPct  = (lowPct + highPct) / 2;
  const valPct  = Math.max(1, Math.min(99, (value / range) * 100));
  const dotColor = inRange === false ? (value > (refHigh ?? Infinity) ? "#DC2626" : "#F59E0B") : "#16A34A";
  return (
    <div>
      <div className="relative rounded-full overflow-visible" style={{ height: 12 }}>
        <div className="absolute inset-0 rounded-full" style={{
          background: `linear-gradient(to right, rgba(220,38,38,0.22) 0%, rgba(220,38,38,0.22) ${lowPct}%, rgba(22,163,74,0.28) ${lowPct}%, rgba(22,163,74,0.28) ${highPct}%, rgba(220,38,38,0.22) ${highPct}%, rgba(220,38,38,0.22) 100%)`
        }} />
        <div className="absolute top-1/2 rounded-full border-2 border-white shadow-md"
          style={{ width: 18, height: 18, left: `${valPct}%`, transform: "translate(-50%,-50%)", background: dotColor, zIndex: 2 }} />
      </div>
      {/* Labels row — absolute-positioned ticks */}
      <div className="relative mt-2" style={{ height: 30 }}>
        {/* Left edge: 0 / Low */}
        <div className="absolute left-0 flex flex-col items-start">
          <span className="text-[10px] font-medium leading-none" style={{ color: T.muted }}>0</span>
          <span className="text-[9px] leading-none mt-0.5" style={{ color: T.subtle }}>Low</span>
        </div>
        {/* refLow tick */}
        {refLow != null && refLow > 0 && (
          <div className="absolute flex flex-col items-center" style={{ left: `${lowPct}%`, transform: "translateX(-50%)" }}>
            <span className="text-[10px] font-medium leading-none" style={{ color: T.muted }}>{btFmtVal(lo)}</span>
          </div>
        )}
        {/* "Optimal" in green zone center */}
        {refLow != null && refHigh != null && (
          <div className="absolute flex flex-col items-center" style={{ left: `${midPct}%`, transform: "translateX(-50%)" }}>
            <span className="text-[9px] leading-none mt-3.5" style={{ color: T.subtle }}>Optimal</span>
          </div>
        )}
        {/* refHigh tick */}
        {refHigh != null && (
          <div className="absolute flex flex-col items-center" style={{ left: `${highPct}%`, transform: "translateX(-50%)" }}>
            <span className="text-[10px] font-medium leading-none" style={{ color: T.muted }}>{btFmtVal(hi)}</span>
          </div>
        )}
        {/* Right edge: displayMax / High */}
        <div className="absolute right-0 flex flex-col items-end">
          <span className="text-[10px] font-medium leading-none" style={{ color: T.muted }}>{btFmtVal(displayMax)}</span>
          <span className="text-[9px] leading-none mt-0.5" style={{ color: T.subtle }}>High</span>
        </div>
      </div>
    </div>
  );
}

function BtBiomarkerCard({ name, value, unit, refLow, refHigh, chartData, lastDate, onDiscuss }: {
  name: string; value: number; unit: string;
  refLow?: number | null; refHigh?: number | null;
  chartData: BtChartPoint[]; lastDate: string;
  onDiscuss: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const conv = BT_UNIT_CONVERSIONS[name];
  const [useAlt, setUseAlt] = useState<boolean>(() => {
    if (!conv) return false;
    try { return localStorage.getItem(btUnitPrefKey(name)) === "alt"; } catch { return false; }
  });
  const toggleUnit = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !useAlt;
    setUseAlt(next);
    try { localStorage.setItem(btUnitPrefKey(name), next ? "alt" : "orig"); } catch {}
  };

  const displayValue      = conv && useAlt ? conv.toAlt(value)                          : value;
  const displayUnit       = conv && useAlt ? conv.altUnit                                : unit;
  const displayRefLow     = conv && useAlt && refLow  != null ? conv.toAlt(refLow)  : refLow;
  const displayRefHigh    = conv && useAlt && refHigh != null ? conv.toAlt(refHigh) : refHigh;
  const displayChartData  = conv && useAlt ? chartData.map(d => ({ ...d, value: conv.toAlt(d.value) })) : chartData;

  const isHigh = refHigh != null && value > refHigh;
  const inRange = btIsInRange(value, refLow, refHigh);
  const statusLabel = inRange === false ? (isHigh ? "HIGH" : "LOW") : "NORMAL";
  const statusColor = inRange === false ? (isHigh ? "#DC2626" : "#F59E0B") : "#16A34A";
  const hasRange = refLow != null || refHigh != null;
  const def = btLookup(name);

  const dispHi = displayRefHigh ?? (displayRefLow != null ? displayRefLow * 3 : displayValue * 2);
  const chartDomainMin = 0;
  const chartDomainMax = Math.max(dispHi * 1.35, displayValue > dispHi ? displayValue * 1.15 : dispHi * 1.2);

  return (
    <>
      <AnimatePresence>
        {modalOpen && (
          <BtBiomarkerModal
            key={name}
            name={name}
            value={displayValue} unit={displayUnit}
            refLow={displayRefLow} refHigh={displayRefHigh}
            chartData={displayChartData} lastDate={lastDate}
            onClose={() => setModalOpen(false)}
            onDiscuss={() => { setModalOpen(false); onDiscuss(); }}
          />
        )}
      </AnimatePresence>
      <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      {/* Always-visible header */}
      <div className="px-3 pt-3 pb-1">
        <p className="text-[10px] mb-1" style={{ color: T.muted }}>Last tested: {lastDate ? btFormatDate(lastDate) : "–"}</p>
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-[14px] font-bold" style={{ color: T.text }}>{name}</p>
          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold"
            style={{ background: inRange === false ? (isHigh ? "rgba(220,38,38,0.1)" : "rgba(245,158,11,0.1)") : "rgba(22,163,74,0.1)", color: statusColor }}>
            {statusLabel}
          </span>
          <button
            onClick={() => setModalOpen(true)}
            className="ml-auto flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[9px] font-semibold transition-colors"
            style={{ background: "var(--t-blue-08)", color: "var(--t-blue)" }}
            title="Expand detail view"
          >
            <Maximize2 className="w-2.5 h-2.5" />
            Detail
          </button>
        </div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-baseline gap-1">
            <span className="text-[22px] font-bold leading-none" style={{ color: T.text }}>{btFmtVal(displayValue)}</span>
            <span className="text-xs" style={{ color: T.muted }}>{displayUnit}</span>
          </div>
          {conv && (
            <button
              onClick={toggleUnit}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all"
              style={{ background: useAlt ? "var(--t-blue)" : T.surface2, color: useAlt ? "#fff" : T.muted, border: `1px solid ${useAlt ? "var(--t-blue)" : T.border}` }}
            >
              {useAlt ? unit : conv.altUnit}
            </button>
          )}
        </div>
        {/* Range bar — always visible */}
        {hasRange && (
          <div className="mb-2">
            <BtRangeBar value={displayValue} refLow={displayRefLow} refHigh={displayRefHigh} inRange={inRange} />
          </div>
        )}
      </div>

      {/* Show more / Show less toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold transition-colors"
        style={{ borderTop: `1px solid ${T.border}`, color: "var(--t-blue)" }}
      >
        {expanded ? "Show less" : "Show more"}
        {expanded
          ? <ChevronUp className="w-3 h-3" />
          : <ChevronDown className="w-3 h-3" />
        }
      </button>

      {/* Expandable content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3" style={{ borderTop: `1px solid ${T.border}` }}>
          {/* About this marker */}
          {def?.about && (
            <div className="rounded-xl p-3 mt-3" style={{ background: "var(--t-blue-08)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--t-blue)" }}>About this marker</p>
              <p className="text-[11px] leading-relaxed" style={{ color: T.muted }}>{def.about}</p>
            </div>
          )}

          {/* Interactive trend chart — tap to expand */}
          {displayChartData.length >= 2 && hasRange && (
            <div
              className="relative cursor-pointer group"
              onClick={() => setModalOpen(true)}
              title="Tap to expand detail view"
            >
              {/* Expand hint overlay */}
              <div className="absolute top-1 right-1 z-10 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-semibold opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ background: "var(--t-blue-08)", color: "var(--t-blue)" }}>
                <Maximize2 className="w-2.5 h-2.5" />
                Expand
              </div>
              <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RLineChart data={displayChartData} margin={{ top: 8, right: 8, bottom: 44, left: 0 }}>
                    {displayRefLow != null && displayRefHigh != null && (
                      <ReferenceArea y1={displayRefLow} y2={displayRefHigh} fill="rgba(22,163,74,0.18)" fillOpacity={1} ifOverflow="visible" />
                    )}
                    {displayRefHigh != null && (
                      <ReferenceArea y1={displayRefHigh} y2={chartDomainMax} fill="rgba(220,38,38,0.12)" fillOpacity={1} ifOverflow="visible" />
                    )}
                    {displayRefLow != null && displayRefLow > 0 && (
                      <ReferenceArea y1={chartDomainMin} y2={displayRefLow} fill="rgba(220,38,38,0.12)" fillOpacity={1} ifOverflow="visible" />
                    )}
                    {displayRefLow != null && (
                      <ReferenceLine y={displayRefLow} stroke="#16A34A" strokeDasharray="4 3" strokeWidth={1} strokeOpacity={0.55} />
                    )}
                    {displayRefHigh != null && (
                      <ReferenceLine y={displayRefHigh} stroke="#16A34A" strokeDasharray="4 3" strokeWidth={1} strokeOpacity={0.55} />
                    )}
                    <XAxis dataKey="date"
                      tick={(props: { x: number; y: number; payload: { value: string } }) => (
                        <g transform={`translate(${props.x},${props.y})`}>
                          <text x={0} y={0} dy={4} textAnchor="end" transform="rotate(-45)" fontSize={10} fill={T.muted}>{props.payload.value}</text>
                        </g>
                      )}
                      tickLine={false} axisLine={false} interval={0}
                    />
                    <YAxis domain={[chartDomainMin, chartDomainMax]} tick={{ fontSize: 10, fill: T.muted }} tickLine={false} axisLine={false} width={36} tickCount={5} />
                    <Tooltip
                      content={({ active, payload }: { active?: boolean; payload?: Array<{ payload: BtChartPoint }> }) => {
                        if (!active || !payload?.length) return null;
                        const pt = payload[0].payload;
                        const ir = btIsInRange(pt.value, displayRefLow, displayRefHigh);
                        const fmtDate = pt.isoDate
                          ? new Date(pt.isoDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : pt.date;
                        return (
                          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 160 }}>
                            {pt.testName && <p style={{ fontWeight: 700, fontSize: 12, color: T.text, marginBottom: 2 }}>{pt.testName}</p>}
                            <p style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>{fmtDate}</p>
                            <p style={{ fontSize: 15, fontWeight: 600, color: ir === false ? "#DC2626" : "#16A34A" }}>{btFmtVal(pt.value)}&nbsp;{displayUnit}</p>
                          </div>
                        );
                      }}
                      cursor={{ stroke: T.border, strokeWidth: 1, strokeDasharray: "4 2" }}
                    />
                    <Line type="monotone" dataKey="value" stroke="var(--t-blue)" strokeWidth={2.5}
                      dot={(props: { cx: number; cy: number; payload: BtChartPoint }) => {
                        const { cx, cy, payload } = props;
                        const ir = btIsInRange(payload.value, displayRefLow, displayRefHigh);
                        return <circle key={`btc-${cx}-${cy}`} cx={cx} cy={cy} r={5} fill={ir === false ? "#DC2626" : "var(--t-blue)"} stroke="white" strokeWidth={2} />;
                      }}
                      activeDot={{ r: 6, stroke: "white", strokeWidth: 2 }}
                    />
                  </RLineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Discuss button */}
          <button
            onClick={onDiscuss}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white"
            style={{ background: "var(--t-blue)" }}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Discuss with Health Assistant
          </button>
        </div>
      )}
    </div>
    </>
  );
}

function BtBiomarkerModal({ name, value, unit, refLow, refHigh, chartData, lastDate, onClose, onDiscuss }: {
  name: string; value: number; unit: string;
  refLow?: number | null; refHigh?: number | null;
  chartData: BtChartPoint[]; lastDate: string;
  onClose: () => void;
  onDiscuss: () => void;
}) {
  const def = btLookup(name);
  const isHigh = refHigh != null && value > refHigh;
  const inRange = btIsInRange(value, refLow, refHigh);
  const statusLabel = inRange === false ? (isHigh ? "HIGH" : "LOW") : "OPTIMAL";
  const statusColor = inRange === false ? (isHigh ? "#DC2626" : "#F59E0B") : "#16A34A";
  const hi = refHigh ?? (refLow != null ? refLow * 3 : value * 2);
  const domainMin = 0;
  const displayMax = Math.max(hi * 1.35, value > hi ? value * 1.15 : hi * 1.2);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ background: T.surface, maxHeight: "92vh", overflowY: "auto" }}
      >
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: T.muted }}>Biomarker</p>
            <h2 className="text-xl font-bold" style={{ color: T.text }}>{name}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: T.surface2 }}>
            <X className="w-4 h-4" style={{ color: T.muted }} />
          </button>
        </div>

        <div className="px-5 pb-7 space-y-5">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-4xl font-bold" style={{ color: T.text }}>{btFmtVal(value)}</span>
              <span className="text-sm ml-2" style={{ color: T.muted }}>{unit}</span>
            </div>
            <span className="px-3 py-1.5 rounded-full text-[11px] font-bold"
              style={{ background: inRange === false ? (isHigh ? "rgba(220,38,38,0.1)" : "rgba(245,158,11,0.1)") : "rgba(22,163,74,0.1)", color: statusColor }}>
              {statusLabel}
            </span>
          </div>
          <p className="text-[11px]" style={{ color: T.muted }}>Last tested: {btFormatDate(lastDate)}</p>

          {(refLow != null || refHigh != null) && (() => {
            const lo = refLow ?? 0;
            const range = displayMax - domainMin;
            const lowPct  = ((lo - domainMin) / range) * 100;
            const highPct = ((hi - domainMin) / range) * 100;
            const valuePct = Math.max(0, Math.min(100, ((value - domainMin) / range) * 100));
            return (
              <div>
                <div className="relative h-3 rounded-full overflow-hidden">
                  <div className="absolute inset-0" style={{
                    background: `linear-gradient(to right, rgba(220,38,38,0.22) 0%, rgba(220,38,38,0.22) ${lowPct}%, rgba(22,163,74,0.30) ${lowPct}%, rgba(22,163,74,0.30) ${highPct}%, rgba(220,38,38,0.22) ${highPct}%, rgba(220,38,38,0.22) 100%)`
                  }} />
                  <div className="absolute top-1/2 w-4 h-4 rounded-full border-[2.5px] border-white shadow-md"
                    style={{ left: `${valuePct}%`, transform: "translate(-50%,-50%)", zIndex: 2, background: inRange === false ? "#DC2626" : "#16A34A" }} />
                </div>
                <div className="flex justify-between mt-2 text-[10px]" style={{ color: T.muted }}>
                  {refLow != null && refLow > 0 && <span>{btFmtVal(lo)}</span>}
                  {refHigh != null && <span className="ml-auto">{btFmtVal(hi)}</span>}
                </div>
              </div>
            );
          })()}

          {chartData.length >= 2 && (refLow != null || refHigh != null) && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: T.text }}>Trend</p>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RLineChart data={chartData} margin={{ top: 8, right: 8, bottom: 40, left: 0 }}>
                    {refLow != null && refHigh != null && (
                      <ReferenceArea y1={refLow} y2={refHigh} fill="rgba(22,163,74,0.18)" fillOpacity={1} ifOverflow="visible" />
                    )}
                    {refHigh != null && (
                      <ReferenceArea y1={refHigh} y2={displayMax} fill="rgba(220,38,38,0.12)" fillOpacity={1} ifOverflow="visible" />
                    )}
                    {refLow != null && refLow > 0 && (
                      <ReferenceArea y1={domainMin} y2={refLow} fill="rgba(220,38,38,0.12)" fillOpacity={1} ifOverflow="visible" />
                    )}
                    <XAxis dataKey="date"
                      tick={(props: { x: number; y: number; payload: { value: string } }) => (
                        <g transform={`translate(${props.x},${props.y})`}>
                          <text x={0} y={0} dy={4} textAnchor="end" transform="rotate(-45)" fontSize={10} fill={T.muted}>{props.payload.value}</text>
                        </g>
                      )}
                      tickLine={false} axisLine={false} interval={0}
                    />
                    <YAxis domain={[domainMin, displayMax]} tick={{ fontSize: 10, fill: T.muted }} tickLine={false} axisLine={false} width={36} tickCount={5} />
                    <Tooltip
                      content={({ active, payload }: { active?: boolean; payload?: Array<{ payload: BtChartPoint }> }) => {
                        if (!active || !payload?.length) return null;
                        const pt = payload[0].payload;
                        const ir = btIsInRange(pt.value, refLow, refHigh);
                        const fmtDate = pt.isoDate ? new Date(pt.isoDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : pt.date;
                        return (
                          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 160 }}>
                            {pt.testName && <p style={{ fontWeight: 700, fontSize: 12, color: T.text, marginBottom: 2 }}>{pt.testName}</p>}
                            <p style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>{fmtDate}</p>
                            <p style={{ fontSize: 15, fontWeight: 600, color: ir === false ? "#DC2626" : "#16A34A" }}>{btFmtVal(pt.value)}&nbsp;{unit}</p>
                          </div>
                        );
                      }}
                      cursor={{ stroke: T.border, strokeWidth: 1, strokeDasharray: "4 2" }}
                    />
                    <Line type="monotone" dataKey="value" stroke="var(--t-blue)" strokeWidth={2}
                      dot={(props: { cx: number; cy: number; payload: BtChartPoint }) => {
                        const { cx, cy, payload } = props;
                        const ir = btIsInRange(payload.value, refLow, refHigh);
                        return <circle key={`btm-${cx}-${cy}`} cx={cx} cy={cy} r={5} fill={ir === false ? "#DC2626" : "#16A34A"} stroke="white" strokeWidth={2} />;
                      }}
                      activeDot={{ r: 6, stroke: "white", strokeWidth: 2 }}
                    />
                  </RLineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* All readings history */}
          {chartData.length > 0 && (
            <div>
              <p className="text-sm font-bold mb-2" style={{ color: T.text }}>All Readings</p>
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
                {[...chartData].reverse().map((pt, i, arr) => {
                  const ir = btIsInRange(pt.value, refLow, refHigh);
                  const fmtDate = pt.isoDate
                    ? new Date(pt.isoDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : pt.date;
                  const prev = arr[i + 1];
                  const delta = prev != null ? pt.value - prev.value : null;
                  return (
                    <div
                      key={`hist-${i}`}
                      className="flex items-center justify-between px-3 py-2.5"
                      style={{
                        borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : "none",
                        background: i % 2 === 0 ? T.surface2 : T.surface,
                      }}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold" style={{ color: T.text }}>{fmtDate}</p>
                        {pt.testName && (
                          <p className="text-[10px] truncate" style={{ color: T.muted }}>{pt.testName}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {delta != null && (
                          <span className="text-[10px] font-semibold" style={{ color: delta > 0 ? "#DC2626" : delta < 0 ? "var(--t-blue)" : T.muted }}>
                            {delta > 0 ? "▲" : delta < 0 ? "▼" : "–"} {delta !== 0 ? btFmtVal(Math.abs(delta)) : ""}
                          </span>
                        )}
                        {ir === false && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626" }}>OOR</span>
                        )}
                        <span className="text-sm font-bold" style={{ color: ir === false ? "#DC2626" : "#16A34A" }}>
                          {btFmtVal(pt.value)}
                        </span>
                        <span className="text-[10px] w-10 text-left" style={{ color: T.muted }}>{unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {def?.about && (
            <div>
              <p className="text-sm font-bold mb-2" style={{ color: T.text }}>About this biomarker</p>
              <p className="text-[13px] leading-relaxed" style={{ color: T.muted }}>{def.about}</p>
            </div>
          )}

          <button
            onClick={() => { onClose(); onDiscuss(); }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white"
            style={{ background: "var(--t-blue)" }}
          >
            <MessageSquare className="w-4 h-4" />
            Discuss with Health Assistant
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Blood Test Dashboard: Customise sheet ─────────────────────────────────────

type BtDashPrefs = { hidden: string[]; order: Record<string, string[]>; catOrder?: string[] };

function btPrefKey(username: string) {
  return username ? `peps:${username}:btDashPrefs` : "btDashPrefs";
}

function loadBtPrefs(username: string): BtDashPrefs {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(btPrefKey(username)) : null;
    if (!raw) return { hidden: [], order: {} };
    const parsed = JSON.parse(raw);
    return {
      hidden: Array.isArray(parsed?.hidden) ? parsed.hidden : [],
      order: (parsed?.order && typeof parsed.order === "object" && !Array.isArray(parsed.order)) ? parsed.order : {},
      catOrder: Array.isArray(parsed?.catOrder) ? parsed.catOrder : undefined,
    };
  } catch { return { hidden: [], order: {} }; }
}

function saveBtPrefs(prefs: BtDashPrefs, username: string) {
  localStorage.setItem(btPrefKey(username), JSON.stringify(prefs));
}

function BtCustomiseSheet({ categories, prefs, onPrefsChange, onClose, username }: {
  categories: { cat: string; items: string[] }[];
  prefs: BtDashPrefs;
  onPrefsChange: (p: BtDashPrefs) => void;
  onClose: () => void;
  username: string;
}) {
  const [localPrefs, setLocalPrefs] = useState<BtDashPrefs>(() => JSON.parse(JSON.stringify(prefs)));

  const defaultCatOrder = categories.map(c => c.cat);
  const [localCatOrder, setLocalCatOrder] = useState<string[]>(
    () => prefs.catOrder ?? defaultCatOrder
  );

  const toggle = (name: string) => {
    setLocalPrefs(prev => {
      const h = prev.hidden.includes(name) ? prev.hidden.filter(n => n !== name) : [...prev.hidden, name];
      return { ...prev, hidden: h };
    });
  };

  const moveMarker = (cat: string, items: string[], idx: number, dir: -1 | 1) => {
    const next = [...items];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= next.length) return;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setLocalPrefs(prev => ({ ...prev, order: { ...prev.order, [cat]: next } }));
  };

  const moveCat = (idx: number, dir: -1 | 1) => {
    const next = [...localCatOrder];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= next.length) return;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setLocalCatOrder(next);
  };

  const apply = () => {
    const merged: BtDashPrefs = { ...localPrefs, catOrder: localCatOrder };
    saveBtPrefs(merged, username);
    onPrefsChange(merged);
    onClose();
  };

  const reset = () => {
    const blank: BtDashPrefs = { hidden: [], order: {}, catOrder: undefined };
    saveBtPrefs(blank, username);
    onPrefsChange(blank);
    onClose();
  };

  const orderedCategories = [
    ...localCatOrder.map(cat => categories.find(c => c.cat === cat)).filter(Boolean),
    ...categories.filter(c => !localCatOrder.includes(c.cat)),
  ] as { cat: string; items: string[] }[];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-md max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: T.bg, border: `1px solid ${T.border}` }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${T.border}` }}>
          <div>
            <p className="text-sm font-bold" style={{ color: T.text }}>Customise Dashboard</p>
            <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>Reorder categories and markers, or hide ones you don't need</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: T.surface2 }}>
            <X className="w-4 h-4" style={{ color: T.muted }} />
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {orderedCategories.map(({ cat, items }, catIdx) => {
            const ordered = localPrefs.order[cat] ?? items;
            return (
              <div key={cat}>
                {/* Category header with move buttons */}
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: T.muted }}>{cat}</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveCat(catIdx, -1)}
                      disabled={catIdx === 0}
                      className="w-6 h-6 flex items-center justify-center rounded disabled:opacity-30"
                      style={{ background: T.surface2 }}
                      title="Move category up">
                      <ChevronUp className="w-3.5 h-3.5" style={{ color: T.muted }} />
                    </button>
                    <button onClick={() => moveCat(catIdx, 1)}
                      disabled={catIdx === orderedCategories.length - 1}
                      className="w-6 h-6 flex items-center justify-center rounded disabled:opacity-30"
                      style={{ background: T.surface2 }}
                      title="Move category down">
                      <ChevronDown className="w-3.5 h-3.5" style={{ color: T.muted }} />
                    </button>
                  </div>
                </div>
                {/* Marker rows */}
                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
                  {ordered.map((name, idx) => {
                    const hidden = localPrefs.hidden.includes(name);
                    return (
                      <div key={name}
                        className="flex items-center gap-3 px-3 py-2.5"
                        style={{ borderBottom: idx < ordered.length - 1 ? `1px solid ${T.border}` : "none", opacity: hidden ? 0.45 : 1 }}>
                        {/* Visibility toggle */}
                        <button onClick={() => toggle(name)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0 transition-colors"
                          style={{ background: hidden ? "rgba(100,116,139,0.1)" : "rgba(22,163,74,0.1)" }}
                          title={hidden ? "Show" : "Hide"}>
                          {hidden
                            ? <EyeOff className="w-3.5 h-3.5" style={{ color: T.muted }} />
                            : <Eye className="w-3.5 h-3.5" style={{ color: "#16A34A" }} />
                          }
                        </button>
                        {/* Name */}
                        <span className="flex-1 text-[12px] font-medium truncate" style={{ color: T.text }}>{name}</span>
                        {/* Marker reorder buttons */}
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => moveMarker(cat, ordered, idx, -1)}
                            disabled={idx === 0}
                            className="w-5 h-5 flex items-center justify-center rounded disabled:opacity-30"
                            style={{ background: T.surface2 }}>
                            <ChevronUp className="w-3 h-3" style={{ color: T.muted }} />
                          </button>
                          <button onClick={() => moveMarker(cat, ordered, idx, 1)}
                            disabled={idx === ordered.length - 1}
                            className="w-5 h-5 flex items-center justify-center rounded disabled:opacity-30"
                            style={{ background: T.surface2 }}>
                            <ChevronDown className="w-3 h-3" style={{ color: T.muted }} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex gap-3" style={{ borderTop: `1px solid ${T.border}` }}>
          <button onClick={reset}
            className="flex-1 h-10 rounded-xl text-sm font-semibold"
            style={{ background: T.surface2, color: T.muted }}>
            Reset
          </button>
          <button onClick={apply}
            className="flex-1 h-10 rounded-xl text-sm font-bold text-white"
            style={{ background: "var(--t-blue-deep)" }}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function BtDashboardTab({ sessions, username, onGoToDiscuss }: { sessions: BloodTestSession[]; username: string; onGoToDiscuss: (prefill: string) => void }) {
  const [prefs, setPrefs] = useState<BtDashPrefs>(() => loadBtPrefs(username));
  const [showCustomise, setShowCustomise] = useState(false);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const { allCategories, visibleCategories } = useMemo(() => {
    const chronological = [...sessions].sort((a, b) => a.testDate.localeCompare(b.testDate));
    const markerMap: Record<string, { readings: BtChartPoint[]; unit: string; category: string; refLow?: number; refHigh?: number; lastDate: string }> = {};

    for (const session of chronological) {
      for (const v of session.values) {
        const n = btParseNum(v.value);
        if (n === null) continue;
        const def = BT_CATALOG_BY_NAME[v.biomarkerName] ?? BT_CATALOG.find(b => b.name.toLowerCase() === v.biomarkerName.toLowerCase());
        if (!markerMap[v.biomarkerName]) {
          markerMap[v.biomarkerName] = {
            readings: [], unit: v.unit, category: v.biomarkerCategory,
            refLow: def?.refLow ?? btParseNum(v.refRangeLow) ?? undefined,
            refHigh: def?.refHigh ?? btParseNum(v.refRangeHigh) ?? undefined,
            lastDate: session.testDate,
          };
        }
        markerMap[v.biomarkerName].readings.push({
          date: btFormatShortDate(session.testDate),
          isoDate: session.testDate,
          value: n,
          testName: session.testName ?? session.labName ?? "Blood Test",
        });
        markerMap[v.biomarkerName].lastDate = session.testDate;
      }
    }

    const allSummaries = Object.entries(markerMap).map(([name, m]) => ({
      name, value: m.readings[m.readings.length - 1].value,
      unit: m.unit, category: m.category,
      refLow: m.refLow, refHigh: m.refHigh,
      chartData: m.readings, lastDate: m.lastDate,
    }));

    const defaultCatOrder = ["Hormones", "Hematology", "Lipids", "Liver", "Kidney", "Metabolic", "Vitamins", "Other"];
    const grouped: Record<string, typeof allSummaries> = {};
    for (const s of allSummaries) {
      const cat = s.category || "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(s);
    }
    const activeCatOrder = prefs.catOrder ?? defaultCatOrder;
    const sortedCats = activeCatOrder.filter(c => grouped[c])
      .concat(Object.keys(grouped).filter(c => !activeCatOrder.includes(c)));

    const allCategories = sortedCats.map(cat => {
      const customOrder = prefs.order[cat];
      const items = grouped[cat] ?? [];
      const orderedItems = customOrder
        ? customOrder.map(n => items.find(i => i.name === n)).filter(Boolean) as typeof items
        : items;
      const remaining = items.filter(i => !orderedItems.includes(i));
      return { cat, items: [...orderedItems, ...remaining] };
    });

    const visibleCategories = allCategories.map(({ cat, items }) => ({
      cat,
      items: items.filter(i => !prefs.hidden.includes(i.name)),
    })).filter(({ items }) => items.length > 0);

    return { allCategories, visibleCategories };
  }, [sessions, prefs]);

  const customiseCategories = allCategories.map(({ cat, items }) => ({ cat, items: items.map(i => i.name) }));
  const hiddenCount = prefs.hidden.length;

  const catStatusColor = (items: typeof visibleCategories[0]["items"]): string => {
    const anyHigh = items.some(i => i.refHigh != null && i.value > i.refHigh);
    const anyLow  = items.some(i => i.refLow  != null && i.value < i.refLow);
    if (anyHigh) return "#DC2626";
    if (anyLow)  return "#F59E0B";
    return "#16A34A";
  };

  const filteredItems = selectedCat
    ? (visibleCategories.find(c => c.cat === selectedCat)?.items ?? [])
    : visibleCategories.flatMap(c => c.items);


  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{ background: "var(--t-blue-08)" }}>
          <Activity className="w-7 h-7" style={{ color: "var(--t-blue)" }} />
        </div>
        <p className="text-sm font-bold mb-1" style={{ color: T.muted }}>No blood tests yet</p>
        <p className="text-xs max-w-xs" style={{ color: T.muted }}>Upload your first test to start tracking biomarkers on this dashboard.</p>
      </div>
    );
  }

  return (
    <>
      {showCustomise && (
        <BtCustomiseSheet
          categories={customiseCategories}
          prefs={prefs}
          onPrefsChange={setPrefs}
          onClose={() => setShowCustomise(false)}
          username={username}
        />
      )}


      <div className="space-y-4">
        {/* Category chips + customise */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCat(null)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors"
              style={{
                background: selectedCat === null ? "var(--t-blue)" : T.surface,
                color: selectedCat === null ? "#FFFFFF" : T.text,
                borderColor: selectedCat === null ? "var(--t-blue)" : T.border,
              }}
            >
              All <span className="opacity-60">{visibleCategories.reduce((a, c) => a + c.items.length, 0)}</span>
            </button>
            {visibleCategories.map(({ cat, items }) => {
              const dotColor = catStatusColor(items);
              const isActive = selectedCat === cat;
              return (
                <button key={cat}
                  onClick={() => setSelectedCat(isActive ? null : cat)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors"
                  style={{
                    background: isActive ? "var(--t-blue)" : T.surface,
                    color: isActive ? "#FFFFFF" : T.text,
                    borderColor: isActive ? "var(--t-blue)" : T.border,
                  }}
                >
                  {cat}
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: isActive ? "#FFFFFF" : dotColor }} />
                </button>
              );
            })}
          </div>
          <button onClick={() => setShowCustomise(true)}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
            style={{ background: T.surface2, color: T.muted, border: `1px solid ${T.border}` }}>
            <SlidersHorizontal className="w-3 h-3" />
          </button>
        </div>

        {hiddenCount > 0 && (
          <p className="text-[10px]" style={{ color: T.subtle }}>{hiddenCount} marker{hiddenCount > 1 ? "s" : ""} hidden · tap Customise to show</p>
        )}

        {/* Biomarker list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-24">
          {filteredItems.map(item => (
            <BtBiomarkerCard key={item.name}
              name={item.name} value={item.value} unit={item.unit}
              refLow={item.refLow} refHigh={item.refHigh}
              chartData={item.chartData} lastDate={item.lastDate}
              onDiscuss={() => {
                const ir = btIsInRange(item.value, item.refLow, item.refHigh);
                const status = ir === false ? (item.refHigh != null && item.value > item.refHigh ? "high" : "low") : "within normal range";
                onGoToDiscuss(`My ${item.name} result is ${btFmtVal(item.value)} ${item.unit}, which is ${status}. Can you help me understand what this means and what I can do about it?`);
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Blood Test Hub: Test Detail & Edit Modal ─────────────────────────────────

function BtTestModal({
  session,
  onClose,
  onFullEdit,
}: {
  session: BloodTestSession;
  onClose: () => void;
  onFullEdit: () => void;
}) {
  const [editedValues, setEditedValues] = useState<Record<string, string>>(
    () => Object.fromEntries(session.values.map((v: BloodTestValue) => [v.id, v.value])),
  );
  const updateMut = useUpdateBloodTest();
  const [saveError, setSaveError] = useState<string | null>(null);

  const CAT_ORDER = ["Hormones", "Hematology", "Lipids", "Liver", "Kidney", "Metabolic", "Vitamins", "Other"];

  const byCategory = useMemo<Record<string, BloodTestValue[]>>(() => {
    const map: Record<string, BloodTestValue[]> = {};
    for (const v of session.values) {
      const cat = v.biomarkerCategory || "Other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(v);
    }
    return map;
  }, [session.values]);

  const sortedCats = Object.keys(byCategory).sort((a, b) => {
    const ai = CAT_ORDER.indexOf(a), bi = CAT_ORDER.indexOf(b);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });

  const hasChanges = session.values.some((v: BloodTestValue) => editedValues[v.id] !== v.value);

  const liveOorCount = session.values.filter((v: BloodTestValue) => {
    const n = btParseNum(editedValues[v.id] ?? v.value);
    if (n == null) return false;
    const def = BT_CATALOG_BY_NAME[v.biomarkerName];
    return btIsInRange(n, def?.refLow ?? btParseNum(v.refRangeLow), def?.refHigh ?? btParseNum(v.refRangeHigh)) === false;
  }).length;

  async function handleSave() {
    setSaveError(null);
    try {
      await updateMut.mutateAsync({
        sessionId: session.id,
        payload: {
          testDate: session.testDate,
          labName: session.labName ?? undefined,
          testName: session.testName ?? undefined,
          measurementType: session.measurementType ?? undefined,
          medicationNotes: session.medicationNotes ?? undefined,
          notes: session.notes ?? undefined,
          values: session.values.map((v: BloodTestValue) => {
            const raw = editedValues[v.id] ?? v.value;
            const n = parseFloat(raw);
            return {
              biomarkerName: v.biomarkerName,
              biomarkerCategory: v.biomarkerCategory,
              value: isNaN(n) ? 0 : n,
              unit: v.unit,
              refRangeLow: v.refRangeLow != null ? parseFloat(v.refRangeLow) : null,
              refRangeHigh: v.refRangeHigh != null ? parseFloat(v.refRangeHigh) : null,
            };
          }),
        },
      });
      onClose();
    } catch {
      setSaveError("Failed to save — please try again.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
        style={{ background: T.surface, maxHeight: "92vh", boxShadow: "0 -4px 40px rgba(0,0,0,0.25)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ background: T.border }} />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4 shrink-0" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-bold leading-tight truncate" style={{ color: T.text }}>
                {session.testName ?? session.labName ?? "Blood Test"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: T.muted }}>
                {btFormatDate(session.testDate)}
                {session.labName && session.labName !== session.testName ? ` · ${session.labName}` : ""}
                {session.measurementType ? ` · ${session.measurementType}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {liveOorCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626" }}>
                  {liveOorCount} OOR
                </span>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: T.surface2, color: T.muted }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {(session.notes || session.medicationNotes) && (
            <div className="mt-3 px-3 py-2 rounded-xl space-y-0.5" style={{ background: T.surface2 }}>
              {session.notes && <p className="text-xs italic" style={{ color: T.muted }}>{session.notes}</p>}
              {session.medicationNotes && <p className="text-xs" style={{ color: T.subtle }}>Medication: {session.medicationNotes}</p>}
            </div>
          )}
        </div>

        {/* Marker list */}
        <div className="flex-1 overflow-y-auto py-4 px-5 space-y-5">
          {sortedCats.map(cat => (
            <div key={cat}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: T.subtle }}>{cat}</p>
              <div className="space-y-2">
                {byCategory[cat].map((v: BloodTestValue) => {
                  const rawEdit = editedValues[v.id] ?? v.value;
                  const n = btParseNum(rawEdit);
                  const def = BT_CATALOG_BY_NAME[v.biomarkerName];
                  const refLow  = def?.refLow  ?? btParseNum(v.refRangeLow);
                  const refHigh = def?.refHigh ?? btParseNum(v.refRangeHigh);
                  const ir = n != null ? btIsInRange(n, refLow, refHigh) : null;
                  const isChanged = rawEdit !== v.value;
                  const refStr = refLow != null && refHigh != null
                    ? `${btFmtVal(refLow)}–${btFmtVal(refHigh)}`
                    : refHigh != null ? `< ${btFmtVal(refHigh)}`
                    : refLow != null ? `> ${btFmtVal(refLow)}`
                    : null;

                  return (
                    <div
                      key={v.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                      style={{
                        background: T.surface2,
                        border: `1px solid ${isChanged ? "var(--t-blue)" : ir === false ? "rgba(220,38,38,0.2)" : "transparent"}`,
                      }}
                    >
                      {/* Status dot */}
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: ir === false ? "#DC2626" : ir === true ? "#16A34A" : T.border }}
                      />

                      {/* Name + ref range */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold leading-tight" style={{ color: T.text }}>{v.biomarkerName}</p>
                        {refStr && (
                          <p className="text-[10px] leading-none mt-0.5" style={{ color: T.subtle }}>
                            ref: {refStr} {v.unit}
                          </p>
                        )}
                      </div>

                      {/* Badges + editable value + unit */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {ir === false && !isChanged && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626" }}>OOR</span>
                        )}
                        {isChanged && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: "var(--t-blue)" }}>edited</span>
                        )}
                        <input
                          type="number"
                          value={rawEdit}
                          onChange={e => setEditedValues(prev => ({ ...prev, [v.id]: e.target.value }))}
                          className="w-[4.5rem] text-right text-sm font-bold bg-transparent focus:outline-none rounded-lg px-1"
                          style={{ color: ir === false ? "#DC2626" : ir === true ? "#16A34A" : T.text }}
                          step="any"
                          aria-label={`Value for ${v.biomarkerName}`}
                        />
                        <span className="text-[10px] w-11 text-left truncate" style={{ color: T.subtle }}>{v.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 shrink-0" style={{ borderTop: `1px solid ${T.border}` }}>
          {saveError && (
            <p className="text-xs text-center mb-3 font-semibold" style={{ color: "#DC2626" }}>{saveError}</p>
          )}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={onFullEdit}
              className="text-xs font-semibold flex items-center gap-1"
              style={{ color: T.muted }}
            >
              <Pencil className="w-3 h-3" />
              Full edit
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 h-9 rounded-xl text-sm font-semibold"
                style={{ background: T.surface2, color: T.muted }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || updateMut.isPending}
                className="px-5 h-9 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-opacity"
                style={{ background: "var(--t-blue)" }}
              >
                {updateMut.isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
          {!hasChanges && (
            <p className="text-center text-[11px] mt-2" style={{ color: T.subtle }}>Tap any value to correct it</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Blood Test Hub: Test Results tab ─────────────────────────────────────────

function BtResultsTab({ sessions, onEdit, username }: { sessions: BloodTestSession[]; onEdit: (session: BloodTestSession) => void; username: string }) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [modalSession, setModalSession] = useState<BloodTestSession | null>(null);
  const deleteMut = useDeleteBloodTest();

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="w-10 h-10 mb-3" style={{ color: T.subtle }} />
        <p className="text-sm font-bold mb-1" style={{ color: T.muted }}>No test results yet</p>
        <p className="text-xs" style={{ color: T.muted }}>Your saved blood test sessions will appear here.</p>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {modalSession && (
          <BtTestModal
            key={modalSession.id}
            session={modalSession}
            onClose={() => setModalSession(null)}
            onFullEdit={() => { setModalSession(null); onEdit(modalSession); }}
          />
        )}
      </AnimatePresence>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>{sessions.length} test{sessions.length !== 1 ? "s" : ""} logged</p>
          <button
            onClick={() => generateLabHistoryPDF(sessions, username, BT_CATALOG)}
            className="flex items-center gap-1.5 px-3 h-7 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: "var(--t-blue-08)", color: "var(--t-blue)" }}
            title="Download all test results as a comparison PDF"
          >
            <Download className="w-3.5 h-3.5" />
            Download History PDF
          </button>
        </div>
        {sessions.map(session => {
          const outOfRange = session.values.filter((v: BloodTestValue) => {
            const n = btParseNum(v.value);
            if (n == null) return false;
            const def = BT_CATALOG_BY_NAME[v.biomarkerName];
            return btIsInRange(n, def?.refLow ?? btParseNum(v.refRangeLow), def?.refHigh ?? btParseNum(v.refRangeHigh)) === false;
          }).length;

          return (
            <div
              key={session.id}
              className="rounded-xl shadow-sm overflow-hidden"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}
            >
              <div className="flex items-center gap-2 px-4 py-3">
                {/* Clickable area → opens modal */}
                <button
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  onClick={() => setModalSession(session)}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--t-blue-08)" }}>
                    <FlaskConical className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: T.text }}>{session.testName ?? session.labName ?? "Blood Test"}</p>
                    <p className="text-xs" style={{ color: T.muted }}>
                      {btFormatDate(session.testDate)} · {session.values.length} markers{outOfRange > 0 ? ` · ${outOfRange} out of range` : ""}
                    </p>
                    {session.measurementType && <p className="text-[10px]" style={{ color: T.subtle }}>{session.measurementType}</p>}
                  </div>
                </button>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  {confirmDelete === session.id ? (
                    <>
                      <button
                        onClick={() => { deleteMut.mutate(session.id); setConfirmDelete(null); }}
                        disabled={deleteMut.isPending}
                        className="text-xs font-bold px-3 h-7 rounded-lg text-white"
                        style={{ background: "#DC2626" }}
                      >
                        {deleteMut.isPending ? "…" : "Delete"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs px-2 h-7 rounded-lg"
                        style={{ background: T.surface2, color: T.muted }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      {outOfRange > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(220,38,38,0.08)", color: "#DC2626" }}>
                          {outOfRange} OOR
                        </span>
                      )}
                      <button
                        onClick={() => setConfirmDelete(session.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                        style={{ color: T.subtle }}
                        title="Delete this test"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setModalSession(session)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                        style={{ background: T.surface2, color: T.muted }}
                        title="View / edit results"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Blood Test Hub: Add Test Results tab ─────────────────────────────────────

interface PendingSession {
  id: string; file: File; parsing: boolean; error: string | null;
  testName: string; testDate: string; measurementType: string;
  medicationNotes: string; notes: string;
  values: Record<string, string>; parseResults: ParsedBiomarker[];
  saving: boolean; addSearch: string;
}

function BtAddResultsTab({ onSaved, editSession }: { onSaved: () => void; editSession?: BloodTestSession | null }) {
  const isEditing = !!editSession;
  const [testName, setTestName] = useState("");
  const [testDate, setTestDate] = useState(todayDmy);
  const [measurementType, setMeasurementType] = useState("Trough");
  const [medicationNotes, setMedicationNotes] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(() => new Set(BT_CATEGORIES));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState<PendingSession[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [subTab, setSubTab] = useState<"single" | "multi">("single");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseResults, setParseResults] = useState<ParsedBiomarker[] | null>(null);
  const [singleDragOver, setSingleDragOver] = useState(false);
  const singleFileRef = React.useRef<HTMLInputElement>(null);
  const [inputMode, setInputMode] = useState<"pdf" | "paste">("pdf");
  const [pastedText, setPastedText] = useState("");
  const createMut = useCreateBloodTest();
  const updateMut = useUpdateBloodTest();
  const fileRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editSession) return;
    setTestName(editSession.testName ?? "");
    setTestDate(ymdToDmy(editSession.testDate));
    setMeasurementType(editSession.measurementType ?? "Trough");
    setMedicationNotes(editSession.medicationNotes ?? "");
    setAdditionalNotes(editSession.notes ?? "");
    const newValues: Record<string, string> = {};
    for (const v of editSession.values) {
      const def = BT_CATALOG_BY_NAME[v.biomarkerName];
      if (def) newValues[def.code] = v.value;
    }
    setValues(newValues);
  }, [editSession?.id]);

  function handleFilesSelect(fileList: FileList | null) {
    if (!fileList) return;
    const remaining = 20 - sessions.length;
    const files = Array.from(fileList).filter(f => {
      const n = f.name.toLowerCase();
      const ok = n.endsWith(".pdf") || n.endsWith(".txt") || n.endsWith(".docx") || n.endsWith(".doc") || f.type.startsWith("image/") || /\.(png|jpg|jpeg|webp)$/.test(n);
      return ok && f.size <= 20 * 1024 * 1024;
    }).slice(0, remaining);
    if (files.length === 0) return;
    files.forEach(file => {
      const id = Math.random().toString(36).slice(2);
      const newSess: PendingSession = {
        id, file, parsing: true, error: null,
        testName: file.name.replace(/\.[^.]+$/, ""), testDate: todayDmy(),
        measurementType: "Trough", medicationNotes: "", notes: "",
        values: {}, parseResults: [], saving: false, addSearch: "",
      };
      setSessions(prev => [...prev, newSess]);
      parsePDFBiomarkers(file)
        .then(({ values: extracted, parsed, meta }) => {
          let name = meta.testName ?? file.name.replace(/\.[^.]+$/, "");
          if (meta.testName && meta.testDate) {
            const d = new Date(meta.testDate);
            name = `${meta.testName} — ${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
          }
          setSessions(prev => prev.map(s => s.id !== id ? s : {
            ...s, parsing: false, testName: name,
            testDate: meta.testDate ? ymdToDmy(meta.testDate) : todayDmy(),
            values: extracted, parseResults: parsed,
            error: Object.keys(extracted).length === 0 ? "No biomarkers found — add values below" : null,
          }));
        })
        .catch(() => {
          setSessions(prev => prev.map(s => s.id !== id ? s : { ...s, parsing: false, error: "Could not read this PDF" }));
        });
    });
  }

  function handlePasteExtract() {
    if (!pastedText.trim()) return;
    setSaveError(null);
    const parsed = parseBiomarkersFromText(pastedText);
    setParseResults(parsed);
    if (parsed.length === 0) {
      setSaveError("No recognisable biomarker values found. Paste the full results text including marker names and values.");
      return;
    }
    const extracted: Record<string, string> = {};
    for (const p of parsed) extracted[p.code] = String(p.value);
    setValues(prev => ({ ...prev, ...extracted }));
  }

  async function handleSingleFileSelect(file: File | null) {
    if (!file) return;
    const fn = file.name.toLowerCase();
    const isSupported = fn.endsWith(".pdf") || fn.endsWith(".txt") || fn.endsWith(".docx") || fn.endsWith(".doc") || file.type.startsWith("image/") || /\.(png|jpg|jpeg|webp)$/.test(fn);
    if (!isSupported) { setSaveError("Supported formats: PDF, PNG, JPG, WEBP, TXT, DOCX"); return; }
    if (file.size > 20 * 1024 * 1024) { setSaveError("File must be under 20MB."); return; }
    setSaveError(null); setSelectedFile(file); setParseResults(null); setParsing(true);
    try {
      const { values: extracted, parsed, meta } = await parsePDFBiomarkers(file);
      setParseResults(parsed);
      if (meta.testDate) setTestDate(ymdToDmy(meta.testDate));
      if (meta.testName) {
        if (meta.testDate) {
          const d = new Date(meta.testDate);
          setTestName(`${meta.testName} — ${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`);
        } else {
          setTestName(meta.testName);
        }
      }
      if (Object.keys(extracted).length > 0) {
        setValues(prev => ({ ...prev, ...extracted }));
      } else {
        setSaveError("No biomarker values could be extracted from this PDF. Fill in values manually below.");
      }
    } catch {
      setSaveError("Could not read this PDF. Fill in values manually below.");
    } finally {
      setParsing(false);
    }
  }

  function updSess(id: string, patch: Partial<PendingSession>) {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }

  async function saveSession(id: string) {
    const sess = sessions.find(s => s.id === id);
    if (!sess || sess.parsing) return;
    const entries = BT_CATALOG
      .filter(b => sess.values[b.code]?.trim())
      .map(b => {
        const n = parseFloat(sess.values[b.code]);
        return {
          biomarkerName: b.name, biomarkerCategory: b.category,
          value: isNaN(n) ? 0 : n, unit: b.unit,
          refRangeLow: b.refLow ?? null, refRangeHigh: b.refHigh ?? null,
        };
      });
    if (entries.length === 0) { updSess(id, { error: "Enter at least one value before saving." }); return; }
    updSess(id, { saving: true, error: null });
    try {
      await createMut.mutateAsync({
        testDate: dmyToYmd(sess.testDate), testName: sess.testName || undefined,
        measurementType: sess.measurementType || undefined,
        medicationNotes: sess.medicationNotes || undefined,
        notes: sess.notes || undefined, values: entries,
      });
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      updSess(id, { saving: false, error: e instanceof Error ? e.message : "Failed to save" });
    }
  }

  async function saveAll() {
    const toSave = sessions.filter(s => !s.parsing && !s.saving && Object.values(s.values).some(v => v.trim()));
    for (const sess of toSave) await saveSession(sess.id);
    onSaved();
  }

  const filteredCatalog = search
    ? BT_CATALOG.filter(b =>
        b.code.toLowerCase().includes(search.toLowerCase()) ||
        b.name.toLowerCase().includes(search.toLowerCase())
      )
    : BT_CATALOG;

  function getStatus(code: string): "in_range" | "out_of_range" | null {
    const v = values[code];
    if (!v || v.trim() === "") return null;
    const n = parseFloat(v);
    if (isNaN(n)) return null;
    const def = BT_CATALOG_BY_CODE[code];
    const ir = btIsInRange(n, def?.refLow, def?.refHigh);
    if (ir === null) return null;
    return ir ? "in_range" : "out_of_range";
  }

  const filledCount = Object.values(values).filter(v => v.trim() !== "").length;

  async function handleSave() {
    setSaveError(null);
    const entries = BT_CATALOG
      .filter(b => !!values[b.code]?.trim())
      .map(b => {
        const n = parseFloat(values[b.code]);
        return {
          biomarkerName: b.name, biomarkerCategory: b.category,
          value: isNaN(n) ? 0 : n, unit: b.unit,
          refRangeLow: b.refLow ?? null, refRangeHigh: b.refHigh ?? null,
        };
      });

    if (entries.length === 0) { setSaveError("Enter at least one biomarker value before saving."); return; }

    try {
      setSaving(true);
      if (isEditing && editSession) {
        await updateMut.mutateAsync({
          sessionId: editSession.id,
          payload: {
            testDate: dmyToYmd(testDate),
            testName: testName || undefined,
            measurementType: measurementType || undefined,
            medicationNotes: medicationNotes || undefined,
            notes: additionalNotes || undefined,
            values: entries,
          },
        });
      } else {
        await createMut.mutateAsync({
          testDate: dmyToYmd(testDate), testName: testName || undefined,
          measurementType: measurementType || undefined,
          medicationNotes: medicationNotes || undefined,
          notes: additionalNotes || undefined,
          values: entries,
        });
      }
      onSaved();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const renderBiomarkerRow = (b: BiomarkerDef) => {
    const status = getStatus(b.code);
    const isOOR = status === "out_of_range";
    const filled = !!values[b.code]?.trim();
    const rangeStr = b.refLow != null && b.refHigh != null
      ? `${b.refLow}–${b.refHigh}`
      : b.refHigh != null ? `≤${b.refHigh}` : b.refLow != null ? `≥${b.refLow}` : "—";
    const rowBg = isOOR ? "rgba(254,226,226,0.3)" : "transparent";
    const inputStyle = { background: T.surface2, borderColor: filled ? "var(--t-blue-40)" : T.border, color: T.text };
    const clearVal = () => setValues(prev => { const n = { ...prev }; delete n[b.code]; return n; });
    const changeVal = (e: React.ChangeEvent<HTMLInputElement>) => setValues(prev => ({ ...prev, [b.code]: e.target.value }));
    return (
      <div key={b.code} className="transition-colors" style={{ borderBottom: `1px solid ${T.border}`, background: rowBg }}>

        {/* ── Mobile card layout (hidden sm+) ────────────────────────────── */}
        <div className="sm:hidden px-3 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 min-w-0 mr-2">
              <span className="text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded" style={{ background: T.surface2, color: T.muted }}>{b.code}</span>
              <span className="text-xs font-medium truncate" style={{ color: T.text }}>{b.name}</span>
            </div>
            <button onClick={clearVal} className="flex items-center justify-center w-6 h-6 rounded-lg shrink-0" style={{ color: T.subtle }}>
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input type="number" step="any" inputMode="decimal"
              value={values[b.code] ?? ""}
              onChange={changeVal}
              className="w-24 h-8 rounded-lg border px-2 text-right text-sm font-mono focus:outline-none shrink-0"
              style={inputStyle}
              placeholder="—"
            />
            <span className="text-[10px] leading-tight shrink-0" style={{ color: T.muted }}>{b.unit}</span>
            <span className="text-[10px] shrink-0 ml-auto" style={{ color: T.muted }}>{rangeStr}</span>
            {status === "in_range" && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ color: "#16A34A", background: "rgba(22,163,74,0.06)" }}>IN</span>
            )}
            {status === "out_of_range" && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ color: "#DC2626", background: "rgba(220,38,38,0.06)" }}>OUT</span>
            )}
          </div>
        </div>

        {/* ── Tablet / Desktop table row (hidden below sm) ────────────────── */}
        <div className="hidden sm:grid items-center px-4 py-2"
          style={{ gridTemplateColumns: "52px 1fr 96px 1fr 1fr 56px 32px" }}>
          <span className="text-xs font-bold" style={{ color: T.muted }}>{b.code}</span>
          <span className="text-xs pr-2 truncate" style={{ color: T.text }}>{b.name}</span>
          <div>
            <input type="number" step="any" inputMode="decimal"
              value={values[b.code] ?? ""}
              onChange={changeVal}
              className="w-20 h-8 rounded-lg border px-2 text-right text-sm font-mono focus:outline-none"
              style={inputStyle}
              placeholder="—"
            />
          </div>
          <span className="text-[11px] leading-tight pr-1" style={{ color: T.muted }}>{b.unit}</span>
          <span className="text-[11px]" style={{ color: T.muted }}>{rangeStr}</span>
          <div>
            {status === "in_range" && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: "#16A34A", background: "rgba(22,163,74,0.06)" }}>IN</span>
            )}
            {status === "out_of_range" && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: "#DC2626", background: "rgba(220,38,38,0.06)" }}>OUT</span>
            )}
          </div>
          <button onClick={clearVal}
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
            style={{ color: T.subtle }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    );
  };

  const renderSessionCard = (sess: PendingSession) => {
    const extractedCodes = BT_CATALOG.map(b => b.code).filter(c => sess.values[c]?.trim() || (sess.addSearch === "" && sess.parseResults.some(p => p.code === c)));
    const filledCodes = BT_CATALOG.map(b => b.code).filter(c => sess.values[c]?.trim());
    const confidenceByCode = Object.fromEntries(sess.parseResults.map(p => [p.code, p.confidence]));
    const highCount = sess.parseResults.filter(p => p.confidence === "high").length;
    const medCount = sess.parseResults.filter(p => p.confidence === "medium").length;
    const displayCodes = [...new Set([...sess.parseResults.map(p => p.code), ...filledCodes])];
    const addResults = sess.addSearch
      ? BT_CATALOG.filter(b =>
          !displayCodes.includes(b.code) && (
            b.code.toLowerCase().includes(sess.addSearch.toLowerCase()) ||
            b.name.toLowerCase().includes(sess.addSearch.toLowerCase())
          )).slice(0, 8)
      : [];
    return (
      <div key={sess.id} className="rounded-xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: sess.parsing ? "#EFF6FF" : sess.error && filledCodes.length === 0 ? "rgba(220,38,38,0.07)" : "rgba(22,163,74,0.07)" }}>
            {sess.parsing
              ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              : sess.error && filledCodes.length === 0
                ? <AlertCircle className="w-4 h-4" style={{ color: "#DC2626" }} />
                : <CheckCircle className="w-4 h-4" style={{ color: "#16A34A" }} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: T.text }}>{sess.file.name}</p>
            <p className="text-xs" style={{ color: T.muted }}>
              {sess.parsing ? "Extracting biomarkers…"
                : `${filledCodes.length} markers${highCount > 0 ? ` · ${highCount} high` : ""}${medCount > 0 ? ` · ${medCount} medium confidence` : ""}`}
            </p>
          </div>
          <button onClick={() => setSessions(prev => prev.filter(s => s.id !== sess.id))}
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ color: T.subtle }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {!sess.parsing && (
          <>
            {/* Test details */}
            <div className="px-4 py-3 space-y-2" style={{ borderBottom: `1px solid ${T.border}` }}>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: T.muted }}>Test Name</label>
                  <input value={sess.testName} onChange={e => updSess(sess.id, { testName: e.target.value })}
                    placeholder="e.g. Full Blood Test"
                    className="w-full h-9 rounded-lg border px-3 text-sm focus:outline-none"
                    style={{ background: T.surface2, borderColor: T.border, color: T.text }} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: T.muted }}>Date <span className="text-red-400">*</span></label>
                  <input value={sess.testDate} onChange={e => updSess(sess.id, { testDate: e.target.value })}
                    placeholder="DD/MM/YYYY" inputMode="numeric"
                    className="w-full h-9 rounded-lg border px-3 text-sm focus:outline-none"
                    style={{ background: T.surface2, borderColor: T.border, color: T.text }} />
                </div>
              </div>
              <select value={sess.measurementType} onChange={e => updSess(sess.id, { measurementType: e.target.value })}
                className="w-full h-9 rounded-lg border px-3 text-sm focus:outline-none appearance-none"
                style={{ background: T.surface2, borderColor: T.border, color: T.text }}>
                {["Trough", "Peak", "Random", "Pre-dose", "Post-dose", "Fasting", "Non-fasting"].map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Biomarker rows */}
            {displayCodes.length > 0 && (
              <div>
                <div className="grid px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ gridTemplateColumns: "1fr 76px 70px 52px 32px", color: T.muted, borderBottom: `1px solid ${T.border}` }}>
                  <span>Biomarker</span><span className="text-right">Value</span><span className="pl-2">Unit</span><span>Status</span><span />
                </div>
                {displayCodes.map(code => {
                  const def = BT_CATALOG_BY_CODE[code];
                  if (!def) return null;
                  const rawVal = sess.values[code] ?? "";
                  const displayVal = rawVal === "NaN" ? "" : rawVal;
                  const n = parseFloat(displayVal);
                  const ir = !isNaN(n) ? btIsInRange(n, def.refLow, def.refHigh) : null;
                  const conf = confidenceByCode[code];
                  return (
                    <div key={code} className="grid items-center px-4 py-1.5"
                      style={{
                        gridTemplateColumns: "1fr 76px 70px 52px 32px",
                        borderBottom: `1px solid ${T.border}`,
                        background: ir === false ? "rgba(254,226,226,0.2)" : "transparent",
                      }}>
                      <div className="flex items-center gap-1.5 min-w-0 pr-2">
                        {conf && (
                          <span className="shrink-0 text-[9px] font-bold px-1 py-0.5 rounded"
                            style={{
                              background: conf === "high" ? "rgba(22,163,74,0.1)" : "rgba(234,179,8,0.1)",
                              color: conf === "high" ? "#15803D" : "#92400E",
                            }}>
                            {conf === "high" ? "●●" : "●○"}
                          </span>
                        )}
                        <span className="text-xs truncate" style={{ color: T.text }}>{def.name}</span>
                      </div>
                      <input type="number" step="any" inputMode="decimal"
                        value={displayVal}
                        onChange={e => updSess(sess.id, { values: { ...sess.values, [code]: e.target.value } })}
                        className="w-full h-8 rounded-lg border px-2 text-right text-sm font-mono focus:outline-none"
                        style={{ background: T.surface2, borderColor: displayVal ? "var(--t-blue-40)" : T.border, color: T.text }}
                        placeholder="—"
                      />
                      <span className="text-xs pl-2" style={{ color: T.muted }}>{def.unit}</span>
                      <div>
                        {ir === true && <span className="text-[10px] font-bold px-1 py-0.5 rounded" style={{ color: "#16A34A", background: "rgba(22,163,74,0.06)" }}>IN</span>}
                        {ir === false && <span className="text-[10px] font-bold px-1 py-0.5 rounded" style={{ color: "#DC2626", background: "rgba(220,38,38,0.06)" }}>OUT</span>}
                      </div>
                      <button onClick={() => {
                        const newVals = { ...sess.values };
                        delete newVals[code];
                        updSess(sess.id, { values: newVals });
                      }}
                        className="flex items-center justify-center w-7 h-7 rounded-lg"
                        style={{ color: T.subtle }}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add marker search */}
            <div className="px-4 py-2.5 relative" style={{ borderTop: `1px solid ${T.border}` }}>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: T.subtle }} />
                <input type="text" value={sess.addSearch}
                  onChange={e => updSess(sess.id, { addSearch: e.target.value })}
                  placeholder={displayCodes.length > 0 ? "Add another marker…" : "Search to add a marker…"}
                  className="w-full h-8 rounded-lg border pl-7 pr-3 text-xs focus:outline-none"
                  style={{ background: T.surface2, borderColor: T.border, color: T.text }} />
              </div>
              {addResults.length > 0 && (
                <div className="mt-1 rounded-lg border overflow-hidden z-10 relative" style={{ background: T.surface, borderColor: T.border }}>
                  {addResults.map(b => (
                    <button key={b.code} onMouseDown={e => {
                      e.preventDefault();
                      updSess(sess.id, { values: { ...sess.values, [b.code]: "" }, addSearch: "" });
                    }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left"
                      style={{ borderBottom: `1px solid ${T.border}` }}>
                      <span className="text-[10px] font-bold shrink-0" style={{ color: T.muted }}>{b.code}</span>
                      <span className="text-xs flex-1 truncate" style={{ color: T.text }}>{b.name}</span>
                      <span className="text-[10px] shrink-0" style={{ color: T.subtle }}>{b.unit}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Card footer */}
            <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: `1px solid ${T.border}` }}>
              {sess.error && (
                <p className="text-xs mr-auto" style={{ color: "#DC2626" }}>{sess.error}</p>
              )}
              <button onClick={() => saveSession(sess.id)} disabled={sess.saving || filledCodes.length === 0}
                className="flex items-center gap-1.5 h-8 px-4 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-opacity"
                style={{ background: "var(--t-blue)" }}>
                {sess.saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Save Test
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  // ── EDIT MODE ──────────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
          style={{ background: "var(--t-blue-08)", color: "var(--t-blue)", border: "1px solid var(--t-blue-20)" }}>
          <Pencil className="w-4 h-4 shrink-0" />
          Editing: {editSession.testName ?? editSession.labName ?? "Blood Test"} · {btFormatDate(editSession.testDate)}
        </div>

        <div className="rounded-xl p-4 shadow-sm space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>Test Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: T.muted }}>Test Name</label>
              <input value={testName} onChange={e => setTestName(e.target.value)} placeholder="e.g. Full Blood Test"
                className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:border-blue-300"
                style={{ background: T.surface2, borderColor: T.border, color: T.text }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: T.muted }}>Test Date <span className="text-red-400">*</span></label>
              <input type="text" inputMode="numeric" value={testDate} onChange={e => setTestDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:border-blue-300"
                style={{ background: T.surface2, borderColor: T.border, color: T.text }} />
            </div>
          </div>
          <select value={measurementType} onChange={e => setMeasurementType(e.target.value)}
            className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none appearance-none"
            style={{ background: T.surface2, borderColor: T.border, color: T.text }}>
            {["Trough", "Peak", "Random", "Pre-dose", "Post-dose", "Fasting", "Non-fasting"].map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <textarea value={medicationNotes} onChange={e => setMedicationNotes(e.target.value)}
            placeholder="Medication notes" rows={2}
            className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none resize-none"
            style={{ background: T.surface2, borderColor: T.border, color: T.text }} />
          <textarea value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)}
            placeholder="Additional notes" rows={2}
            className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none resize-none"
            style={{ background: T.surface2, borderColor: T.border, color: T.text }} />
        </div>

        <div className="rounded-xl shadow-sm overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>Biomarkers</h3>
              {filledCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--t-blue-10)", color: "var(--t-blue)" }}>{filledCount} ENTERED</span>
              )}
            </div>
            {filledCount > 0 && (
              <button onClick={() => setValues({})} className="text-[11px] font-semibold px-2 h-6 rounded-lg" style={{ color: T.subtle }}>Clear all</button>
            )}
          </div>
          <div className="px-4 py-2" style={{ borderBottom: `1px solid ${T.border}` }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: T.subtle }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or code…"
                className="w-full h-9 rounded-lg border pl-9 pr-8 text-sm focus:outline-none"
                style={{ background: T.surface2, borderColor: T.border, color: T.text }} />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center" style={{ color: T.subtle }}>
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <div className="hidden sm:grid px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
            style={{ gridTemplateColumns: "52px 1fr 96px 1fr 1fr 56px 32px", color: T.muted, borderBottom: `1px solid ${T.border}` }}>
            <span>Code</span><span>Name</span><span>Value</span><span>Unit</span><span>Range</span><span>Status</span><span />
          </div>
          {search ? (
            filteredCatalog.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs" style={{ color: T.muted }}>No biomarkers found</div>
            ) : (
              <div>{filteredCatalog.map(b => renderBiomarkerRow(b))}</div>
            )
          ) : (
            BT_CATEGORIES.map(cat => {
              const catMarkers = BT_CATALOG.filter(b => b.category === cat);
              const filledInCat = catMarkers.filter(b => values[b.code]?.trim()).length;
              const isOpen = expandedCats.has(cat);
              return (
                <div key={cat}>
                  <button
                    onClick={() => setExpandedCats(prev => { const next = new Set(prev); if (next.has(cat)) next.delete(cat); else next.add(cat); return next; })}
                    className="w-full flex items-center justify-between px-4 py-2.5"
                    style={{ background: T.surface2, borderBottom: `1px solid ${T.border}` }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold" style={{ color: T.text }}>{cat}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: T.border, color: T.muted }}>{catMarkers.length}</span>
                      {filledInCat > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: "var(--t-blue-10)", color: "var(--t-blue)" }}>{filledInCat} filled</span>}
                    </div>
                    {isOpen ? <ChevronUp className="w-3.5 h-3.5" style={{ color: T.subtle }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: T.subtle }} />}
                  </button>
                  {isOpen && <div>{catMarkers.map(b => renderBiomarkerRow(b))}</div>}
                </div>
              );
            })
          )}
        </div>

        {saveError && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
            style={{ background: "rgba(220,38,38,0.07)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.15)" }}>
            <AlertCircle className="w-4 h-4 shrink-0" />{saveError}
          </div>
        )}
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-opacity"
            style={{ background: "var(--t-blue)" }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    );
  }

  // ── NEW SESSION MODE: sub-tabbed ──────────────────────────────────────────
  const saveable = sessions.filter(s => !s.parsing && !s.saving && BT_CATALOG.some(b => s.values[b.code]?.trim()));

  return (
    <div className="space-y-4">

      {/* Sub-tab selector */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl" style={{ background: T.surface2, border: `1px solid ${T.border}` }}>
        <button
          onClick={() => setSubTab("single")}
          className="flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-semibold transition-all"
          style={subTab === "single"
            ? { background: "linear-gradient(135deg, var(--t-blue), var(--t-blue-deep))", color: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }
            : { color: T.muted }}>
          <FileText className="w-3.5 h-3.5" />
          1 Test Result
        </button>
        <button
          onClick={() => setSubTab("multi")}
          className="flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-semibold transition-all"
          style={subTab === "multi"
            ? { background: "linear-gradient(135deg, var(--t-blue), var(--t-blue-deep))", color: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }
            : { color: T.muted }}>
          <Upload className="w-3.5 h-3.5" />
          Multiple Tests
        </button>
      </div>

      {/* ── 1 Test Result tab ── */}
      {subTab === "single" && (
        <>
          {/* Input method switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl" style={{ background: T.surface2, border: `1px solid ${T.border}` }}>
            <button
              onClick={() => { setInputMode("pdf"); setParseResults(null); setPastedText(""); setSaveError(null); }}
              className="flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-semibold transition-all"
              style={inputMode === "pdf"
                ? { background: T.surface, color: T.text, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
                : { color: T.muted }}>
              <FileText className="w-3 h-3" />
              Upload PDF
            </button>
            <button
              onClick={() => { setInputMode("paste"); setSelectedFile(null); setParseResults(null); setSaveError(null); if (singleFileRef.current) singleFileRef.current.value = ""; }}
              className="flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-semibold transition-all"
              style={inputMode === "paste"
                ? { background: T.surface, color: T.text, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
                : { color: T.muted }}>
              <ClipboardList className="w-3 h-3" />
              Paste Results
            </button>
          </div>

          {/* PDF upload mode */}
          {inputMode === "pdf" && (
            selectedFile ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{
                  border: `1px solid ${parsing ? "#BFDBFE" : "#BBF7D0"}`,
                  background: parsing ? "#EFF6FF" : "#F0FDF4",
                }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: parsing ? "rgba(59,130,246,0.1)" : "rgba(22,163,74,0.1)" }}>
                  {parsing
                    ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    : <CheckCircle className="w-4 h-4" style={{ color: "#16A34A" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: T.text }}>{selectedFile.name}</p>
                  <p className="text-xs" style={{ color: T.muted }}>
                    {parsing ? "Extracting biomarker values…" : `${parseResults?.length ?? 0} biomarker${(parseResults?.length ?? 0) !== 1 ? "s" : ""} extracted`}
                  </p>
                </div>
                <button
                  disabled={parsing}
                  onClick={() => { setSelectedFile(null); setParseResults(null); setSaveError(null); if (singleFileRef.current) singleFileRef.current.value = ""; }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-40"
                  style={{ color: T.subtle }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                className={`flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${singleDragOver ? "border-blue-400" : "border-slate-200"}`}
                style={{ background: singleDragOver ? "var(--t-blue-04)" : T.surface2 }}
                onDragOver={e => { e.preventDefault(); setSingleDragOver(true); }}
                onDragLeave={() => setSingleDragOver(false)}
                onDrop={e => { e.preventDefault(); setSingleDragOver(false); handleSingleFileSelect(e.dataTransfer.files?.[0] ?? null); }}
                onClick={() => singleFileRef.current?.click()}>
                <input ref={singleFileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx,.doc" className="hidden"
                  onChange={e => handleSingleFileSelect(e.target.files?.[0] ?? null)} />
                <FileText className="w-6 h-6" style={{ color: T.subtle }} />
                <div className="text-center">
                  <p className="text-sm font-semibold" style={{ color: T.muted }}>Drag file here, or click to select</p>
                  <p className="text-xs mt-0.5" style={{ color: T.subtle }}>PDF · image · .txt · Word doc · auto-extracts biomarkers · max 20MB</p>
                </div>
              </div>
            )
          )}

          {/* Paste text mode */}
          {inputMode === "paste" && !parseResults && (
            <div className="space-y-2">
              <textarea
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder={"Paste your blood test results here — e.g. an NHS online results printout, a copied PDF, or any text showing marker names and values.\n\nExample:\nHaemoglobin  145 g/L\nHaematocrit  0.43\nTestosterone  18.2 nmol/L"}
                rows={8}
                className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none resize-none font-mono"
                style={{ background: T.surface2, borderColor: T.border, color: T.text, lineHeight: 1.6 }}
              />
              <button
                onClick={handlePasteExtract}
                disabled={!pastedText.trim()}
                className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
                style={{ background: "var(--t-blue)" }}>
                <Search className="w-3.5 h-3.5" />
                Extract Biomarkers
              </button>
            </div>
          )}
          {inputMode === "paste" && parseResults && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ border: "1px solid #BBF7D0", background: "#F0FDF4" }}>
              <CheckCircle className="w-5 h-5 shrink-0" style={{ color: "#16A34A" }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "#15803D" }}>{parseResults.length} biomarker{parseResults.length !== 1 ? "s" : ""} extracted from pasted text</p>
              </div>
              <button
                onClick={() => { setParseResults(null); setPastedText(""); setValues({}); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ color: T.subtle }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Confidence reading — shown after any extraction */}
          {parseResults && parseResults.length > 0 && (() => {
            const highCount = parseResults.filter(p => p.confidence === "high").length;
            const medCount = parseResults.filter(p => p.confidence === "medium").length;
            const lowCount = parseResults.filter(p => p.confidence === "low").length;
            const pct = Math.round((highCount / parseResults.length) * 100);
            const confLabel = pct >= 75 ? "High confidence" : pct >= 50 ? "Good confidence" : "Mixed confidence";
            const confColor = pct >= 75 ? "#16A34A" : pct >= 50 ? "#D97706" : "#DC2626";
            const confBg = pct >= 75 ? "rgba(22,163,74,0.07)" : pct >= 50 ? "rgba(217,119,6,0.07)" : "rgba(220,38,38,0.07)";
            const confBorder = pct >= 75 ? "rgba(22,163,74,0.2)" : pct >= 50 ? "rgba(217,119,6,0.2)" : "rgba(220,38,38,0.2)";
            return (
              <div className="rounded-xl p-3 space-y-2" style={{ background: confBg, border: `1px solid ${confBorder}` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: confColor }}>{confLabel}</span>
                    <span className="text-xs" style={{ color: T.muted }}>
                      {highCount > 0 && `${highCount} high`}
                      {highCount > 0 && medCount > 0 && " · "}
                      {medCount > 0 && `${medCount} medium`}
                      {lowCount > 0 && ` · ${lowCount} low`}
                    </span>
                  </div>
                  <span className="text-xs font-bold tabular-nums" style={{ color: confColor }}>{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.08)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: confColor }} />
                </div>
                <div className="flex flex-wrap gap-1">
                  {parseResults.map(p => (
                    <span key={p.code}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold"
                      style={{
                        background: p.confidence === "high" ? "rgba(22,163,74,0.1)" : "rgba(217,119,6,0.1)",
                        color: p.confidence === "high" ? "#15803D" : "#92400E",
                      }}
                      title={`${p.confidence} confidence · raw: ${p.rawLine}`}>
                      {p.code}
                      <span style={{ opacity: 0.6 }}>·{p.confidence === "high" ? "●●" : "●○"}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Test details */}
          <div className="rounded-xl p-4 shadow-sm space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>Test Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: T.muted }}>Test Name</label>
                <input value={testName} onChange={e => setTestName(e.target.value)} placeholder="e.g. Full Blood Test"
                  className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:border-blue-300"
                  style={{ background: T.surface2, borderColor: T.border, color: T.text }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: T.muted }}>Test Date <span className="text-red-400">*</span></label>
                <input type="text" inputMode="numeric" value={testDate} onChange={e => setTestDate(e.target.value)} placeholder="DD/MM/YYYY"
                  className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:border-blue-300"
                  style={{ background: T.surface2, borderColor: T.border, color: T.text }} />
              </div>
            </div>
            <select value={measurementType} onChange={e => setMeasurementType(e.target.value)}
              className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none appearance-none"
              style={{ background: T.surface2, borderColor: T.border, color: T.text }}>
              {["Trough", "Peak", "Random", "Pre-dose", "Post-dose", "Fasting", "Non-fasting"].map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <textarea value={medicationNotes} onChange={e => setMedicationNotes(e.target.value)}
              placeholder="Medication notes" rows={2}
              className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none resize-none"
              style={{ background: T.surface2, borderColor: T.border, color: T.text }} />
            <textarea value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)}
              placeholder="Additional notes" rows={2}
              className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none resize-none"
              style={{ background: T.surface2, borderColor: T.border, color: T.text }} />
          </div>

          {/* Full biomarker catalog */}
          <div className="rounded-xl shadow-sm overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>Biomarkers</h3>
                {filledCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--t-blue-10)", color: "var(--t-blue)" }}>{filledCount} ENTERED</span>
                )}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.surface2, color: T.muted }}>{BT_CATALOG.length} TOTAL</span>
              </div>
              {filledCount > 0 && (
                <button onClick={() => setValues({})} className="text-[11px] font-semibold px-2 h-6 rounded-lg" style={{ color: T.subtle }}>Clear all</button>
              )}
            </div>
            <div className="px-4 py-2" style={{ borderBottom: `1px solid ${T.border}` }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: T.subtle }} />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or code…"
                  className="w-full h-9 rounded-lg border pl-9 pr-8 text-sm focus:outline-none"
                  style={{ background: T.surface2, borderColor: T.border, color: T.text }} />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center" style={{ color: T.subtle }}>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <div className="hidden sm:grid px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
              style={{ gridTemplateColumns: "52px 1fr 96px 1fr 1fr 56px 32px", color: T.muted, borderBottom: `1px solid ${T.border}` }}>
              <span>Code</span><span>Name</span><span>Value</span><span>Unit</span><span>Range</span><span>Status</span><span />
            </div>
            {search ? (
              filteredCatalog.length === 0
                ? <div className="px-4 py-6 text-center text-xs" style={{ color: T.muted }}>No biomarkers found</div>
                : <div>{filteredCatalog.map(b => renderBiomarkerRow(b))}</div>
            ) : (
              BT_CATEGORIES.map(cat => {
                const catMarkers = BT_CATALOG.filter(b => b.category === cat);
                const filledInCat = catMarkers.filter(b => values[b.code]?.trim()).length;
                const isOpen = expandedCats.has(cat);
                return (
                  <div key={cat}>
                    <button
                      onClick={() => setExpandedCats(prev => { const next = new Set(prev); if (next.has(cat)) next.delete(cat); else next.add(cat); return next; })}
                      className="w-full flex items-center justify-between px-4 py-2.5"
                      style={{ background: T.surface2, borderBottom: `1px solid ${T.border}` }}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: T.text }}>{cat}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: T.border, color: T.muted }}>{catMarkers.length}</span>
                        {filledInCat > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: "var(--t-blue-10)", color: "var(--t-blue)" }}>{filledInCat} filled</span>
                        )}
                      </div>
                      {isOpen ? <ChevronUp className="w-3.5 h-3.5" style={{ color: T.subtle }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: T.subtle }} />}
                    </button>
                    {isOpen && <div>{catMarkers.map(b => renderBiomarkerRow(b))}</div>}
                  </div>
                );
              })
            )}
          </div>

          {saveError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(220,38,38,0.07)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.15)" }}>
              <AlertCircle className="w-4 h-4 shrink-0" />{saveError}
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-opacity"
              style={{ background: "var(--t-blue)" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Save Test Results
            </button>
          </div>
        </>
      )}

      {/* ── Multiple Tests tab ── */}
      {subTab === "multi" && (
        <>
          {sessions.length < 20 && (
            <div
              className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${dragOver ? "border-blue-400" : "border-slate-200"}`}
              style={{ background: dragOver ? "var(--t-blue-04)" : T.surface2 }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFilesSelect(e.dataTransfer.files); }}
              onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx,.doc" multiple className="hidden"
                onChange={e => { handleFilesSelect(e.target.files); if (fileRef.current) fileRef.current.value = ""; }} />
              <FileText className="w-7 h-7" style={{ color: T.subtle }} />
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: T.muted }}>
                  {sessions.length === 0 ? "Drag PDFs or images here, or click to select" : "Add more files"}
                </p>
                <p className="text-xs mt-0.5" style={{ color: T.subtle }}>
                  Up to 20 blood test PDFs · max 20MB each · AI extracts all values automatically
                </p>
              </div>
              {sessions.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: T.border, color: T.muted }}>
                  {sessions.length}/20
                </span>
              )}
            </div>
          )}

          {sessions.map(sess => renderSessionCard(sess))}

          {saveable.length > 1 && (
            <div className="flex justify-end">
              <button onClick={saveAll}
                className="flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-bold text-white transition-opacity"
                style={{ background: "var(--t-blue)" }}>
                <CheckCircle className="w-4 h-4" />
                Save All {saveable.length} Tests
              </button>
            </div>
          )}
        </>
      )}

    </div>
  );
}

// ─── Blood Test Hub: Discuss tab ──────────────────────────────────────────────

type BtConversation = { id: string; title: string; messages: DiscussMessage[]; createdAt: Date };

const DISCUSS_HARD_LIMIT = 5;

function btMarkerStatus(value: number, refLow: number | null, refHigh: number | null): "optimal" | "high" | "low" | "none" {
  if (refLow == null && refHigh == null) return "none";
  if (refLow != null && value < refLow) return "low";
  if (refHigh != null && value > refHigh) return "high";
  return "optimal";
}

const BT_STATUS_STYLE: Record<"optimal"|"high"|"low"|"none", { label: string; color: string; bg: string }> = {
  optimal: { label: "OPTIMAL", color: "#16A34A", bg: "rgba(22,163,74,0.12)" },
  high:    { label: "HIGH",    color: "#DC2626", bg: "rgba(220,38,38,0.10)" },
  low:     { label: "LOW",     color: "#D97706", bg: "rgba(217,119,6,0.10)" },
  none:    { label: "NO REF",  color: "#94A3B8", bg: "rgba(148,163,184,0.10)" },
};

function btChipQuestions(name: string, val: number, unit: string, status: "optimal" | "high" | "low" | "none"): string[] {
  const display = `${btFmtVal(val)} ${unit}`.trim();
  if (status === "high") return [
    `Why is my ${name} elevated at ${display}?`,
    `What causes high ${name}?`,
    `Should I be concerned about my high ${name}?`,
  ];
  if (status === "low") return [
    `Why is my ${name} low at ${display}?`,
    `How can I raise my ${name}?`,
    `Is my ${name} level dangerously low?`,
  ];
  if (status === "none") return [
    `What is ${name} and why is it measured?`,
    `Is my ${name} value of ${display} normal?`,
    `What affects ${name} levels?`,
  ];
  return [
    `What does an optimal ${name} level mean for my health?`,
    `What should I watch for with ${name}?`,
    `How do I keep my ${name} optimal?`,
  ];
}

function BtMarkerChips({ sessionId, sessions, onChipClick }: {
  sessionId: string;
  sessions: BloodTestSession[];
  onChipClick?: (questions: string[]) => void;
}) {
  const session = sessions.find(s => s.id === sessionId);
  if (!session || session.values.length === 0) return null;

  return (
    <div className="overflow-x-auto min-w-0 flex gap-2 mt-3 pb-1" style={{ scrollbarWidth: "none" }}>
      {session.values.map((v) => {
        const val = btParseNum(v.value);
        if (val === null) return null;
        const low = btParseNum(v.refRangeLow);
        const high = btParseNum(v.refRangeHigh);
        const status = btMarkerStatus(val, low, high);
        const style = BT_STATUS_STYLE[status];
        const clickable = !!onChipClick;
        return (
          <div
            key={v.id}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={clickable ? () => onChipClick(btChipQuestions(v.biomarkerName, val, v.unit, status)) : undefined}
            onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChipClick(btChipQuestions(v.biomarkerName, val, v.unit, status)); } } : undefined}
            className={`shrink-0 rounded-xl px-3 py-2 flex flex-col gap-0.5 transition-all${clickable ? " cursor-pointer hover:brightness-95 active:scale-95 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--t-blue)] focus-visible:ring-offset-1" : ""}`}
            style={{ background: T.surface2, border: `1px solid ${T.border}`, minWidth: "76px" }}
          >
            <p className="text-[10px] font-semibold truncate max-w-[80px]" style={{ color: T.muted }}>{v.biomarkerName}</p>
            <p className="text-[12px] font-bold tabular-nums leading-tight" style={{ color: T.text }}>
              {btFmtVal(val)} <span className="text-[10px] font-normal" style={{ color: T.subtle }}>{v.unit}</span>
            </p>
            <span
              className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full self-start"
              style={{ background: style.bg, color: style.color }}
            >
              {style.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function QuestionBox({ question, onAddContext, disabled }: {
  question: string;
  onAddContext: (question: string, answer: string) => void;
  disabled?: boolean;
}) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = () => {
    if (!answer.trim() || disabled || submitted) return;
    onAddContext(question, answer.trim());
    setSubmitted(true);
  };

  return (
    <div className="mt-3 rounded-2xl overflow-hidden" style={{ background: "rgba(59,91,219,0.07)", border: "1.5px solid rgba(59,91,219,0.25)" }}>
      <div className="px-4 py-3 text-sm font-semibold" style={{ color: "#3B5BDB" }}>
        {question}
      </div>
      <div className="px-3 py-2" style={{ borderTop: "1px solid rgba(59,91,219,0.15)" }}>
        {submitted ? (
          <p className="text-[11px] font-semibold flex items-center gap-1.5" style={{ color: "rgba(22,163,74,0.9)" }}>
            <CheckCircle className="w-3 h-3" /> Context noted — included in your next message
          </p>
        ) : (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
              }}
              placeholder="Your answer (adds context, doesn't generate a reply)…"
              className="flex-1 text-sm px-3 py-1.5 rounded-xl outline-none"
              style={{ background: "#fff", border: "1px solid rgba(59,91,219,0.3)", color: "#111827" }}
            />
            <button
              onClick={submit}
              disabled={!answer.trim() || disabled || submitted}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white shrink-0 transition-colors"
              style={{ background: answer.trim() && !disabled ? "#3B5BDB" : "#D1D5DB" }}
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function renderInline(line: string, key?: string | number): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    if (match.index > last) parts.push(line.slice(last, match.index));
    parts.push(<strong key={`b-${key}-${match.index}`}>{match[1]}</strong>);
    last = match.index + match[0].length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return parts;
}

function renderMarkdown(text: string, onAddContext?: (q: string, a: string) => void, sendDisabled?: boolean): React.ReactNode {
  const Q_RE = /(\[Q\][\s\S]*?\[\/Q\])/;
  const segments = text.split(Q_RE);

  return segments.map((seg, si) => {
    const qMatch = seg.match(/^\[Q\]([\s\S]*?)\[\/Q\]$/);
    if (qMatch) {
      const question = qMatch[1].trim();
      return (
        <QuestionBox
          key={`q-${si}`}
          question={question}
          onAddContext={(q, a) => onAddContext?.(q, a)}
          disabled={sendDisabled}
        />
      );
    }

    const lines = seg.split("\n");
    return lines.map((line, li) => {
      // ## Heading
      const h2Match = line.match(/^##\s+(.+)/);
      if (h2Match) {
        return (
          <p key={`${si}-${li}`} className="font-bold text-sm mt-3 mb-0.5" style={{ color: "var(--t-text)" }}>
            {renderInline(h2Match[1], `${si}-${li}`)}
          </p>
        );
      }
      // ### Sub-heading
      const h3Match = line.match(/^###\s+(.+)/);
      if (h3Match) {
        return (
          <p key={`${si}-${li}`} className="font-semibold text-xs mt-2 mb-0.5 uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>
            {renderInline(h3Match[1], `${si}-${li}`)}
          </p>
        );
      }
      // Bullet / list item
      const bulletMatch = line.match(/^[\*\-]\s+(.+)/);
      if (bulletMatch) {
        return (
          <div key={`${si}-${li}`} className="flex gap-2 my-0.5 ml-1">
            <span className="mt-0.5 shrink-0" style={{ color: "#3B5BDB" }}>•</span>
            <span>{renderInline(bulletMatch[1], `${si}-${li}`)}</span>
          </div>
        );
      }
      // Horizontal rule (---)
      if (/^---+$/.test(line.trim())) {
        return <hr key={`${si}-${li}`} className="my-2 border-none h-px" style={{ background: "var(--t-border, #e4e4e7)" }} />;
      }
      return (
        <React.Fragment key={`${si}-${li}`}>
          {renderInline(line, `${si}-${li}`)}
          {li < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  });
}

/**
 * Renders an assistant message paragraph-by-paragraph, injecting inline
 * biomarker history charts after each paragraph that mentions a marker.
 * Each marker chart appears at most once (first mention wins).
 */
function renderAssistantBlocks(
  text: string,
  sessions: BloodTestSession[],
  onAddContext: (q: string, a: string) => void,
  disabled: boolean,
): React.ReactNode {
  const paras = text.split(/\n{2,}/);
  const shownMarkers = new Set<string>();

  return paras.map((para, i) => {
    if (!para.trim()) return null;

    const mentioned = detectBtMentionedMarkers(para, sessions);
    const newMarkers = mentioned.filter(m => !shownMarkers.has(m));
    newMarkers.forEach(m => shownMarkers.add(m));

    const charts = newMarkers
      .map(name => {
        const data = buildBtMarkerChartData(sessions, name);
        if (!data) return null;
        return <BiomarkerMiniChart key={name} name={name} {...data} />;
      })
      .filter(Boolean);

    return (
      <React.Fragment key={i}>
        <div className="leading-relaxed">
          {renderMarkdown(para, onAddContext, disabled)}
        </div>
        {charts.length > 0 && (
          <div className="flex flex-col gap-2 mt-2 mb-1">{charts}</div>
        )}
      </React.Fragment>
    );
  });
}

// ─── Blood Test Discuss: inline marker chart helpers ──────────────────────────

function buildBtMarkerChartData(sessions: BloodTestSession[], markerName: string) {
  const lc = markerName.toLowerCase();
  const pts: { date: string; isoDate: string; value: number }[] = [];
  let unit = "";
  let refLow: number | null = null;
  let refHigh: number | null = null;
  for (const session of sessions) {
    const bv = session.values.find(v => v.biomarkerName.toLowerCase() === lc);
    if (bv) {
      const val = parseFloat(bv.value);
      if (!isNaN(val)) {
        pts.push({ date: btFormatShortDate(session.testDate), isoDate: session.testDate, value: val });
        unit = bv.unit;
        if (bv.refRangeLow != null) refLow = parseFloat(bv.refRangeLow);
        if (bv.refRangeHigh != null) refHigh = parseFloat(bv.refRangeHigh);
      }
    }
  }
  if (pts.length < 2) return null;
  pts.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
  return { chartData: pts.map(p => ({ date: p.date, value: p.value })), unit, refLow, refHigh };
}

/**
 * Returns true when an AI message is discussing *historical* measurements —
 * i.e. it references specific past dates/years or uses trend language alongside
 * a biomarker. Used to decide whether to render inline charts.
 */
function hasHistoricalContext(text: string): boolean {
  // Specific year references (e.g. 2021, 2022, 2025, 2026)
  if (/\b(20\d{2})\b/.test(text)) return true;
  // Month + year combos: "May 2021", "Sept 22", "Dec '25"
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s.]+['']?\d{2,4}\b/i.test(text)) return true;
  // Trend / historical keywords
  const historicalKeywords = [
    "historically", "previously", "over time", "trend", "peaked", "peaked at",
    "has been", "have been", "was at", "was high", "was low", "was elevated",
    "reading was", "readings", "back in", "last year", "last month",
    "over the past", "across your", "throughout", "looking at your history",
    "trace it", "let's trace", "your history", "historical",
  ];
  const lc = text.toLowerCase();
  return historicalKeywords.some(kw => lc.includes(kw));
}

function detectBtMentionedMarkers(text: string, sessions: BloodTestSession[]): string[] {
  const nameMap = new Map<string, string>();
  for (const session of sessions) {
    for (const bv of session.values) {
      nameMap.set(bv.biomarkerName.toLowerCase(), bv.biomarkerName);
    }
  }
  const detected: string[] = [];
  for (const [lc, canonical] of nameMap) {
    const escaped = lc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`, "i").test(text)) {
      detected.push(canonical);
    }
  }
  return detected.slice(0, 3);
}

function BiomarkerMiniChart({ name, unit, refLow, refHigh, chartData }: {
  name: string; unit: string;
  refLow: number | null; refHigh: number | null;
  chartData: { date: string; value: number }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const BLUE = "var(--t-blue)";
  const allVals = chartData.map(d => d.value);
  const hiRef = refHigh ?? Math.max(...allVals) * 1.5;
  const displayMax = Math.max(hiRef * 1.35, Math.max(...allVals) * 1.15);

  function inRange(v: number) {
    if (refHigh != null && v > refHigh) return false;
    if (refLow  != null && v < refLow)  return false;
    return true;
  }

  const lastPt   = chartData[chartData.length - 1];
  const lastOk   = lastPt ? inRange(lastPt.value) : true;
  const lastHigh = lastPt && refHigh != null && lastPt.value > refHigh;

  return (
    <div className="rounded-xl overflow-hidden mt-3" style={{ border: `1px solid ${T.border}`, background: T.surface }}>
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold truncate" style={{ color: T.text }}>{name}</span>
          {lastPt && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{
              background: lastOk ? "rgba(22,163,74,0.1)" : (lastHigh ? "rgba(239,68,68,0.1)" : "rgba(234,179,8,0.1)"),
              color: lastOk ? "#16A34A" : (lastHigh ? "#DC2626" : "#B45309"),
            }}>
              {lastPt.value} {unit}
            </span>
          )}
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg shrink-0 ml-2"
          style={{ color: "var(--t-blue)", background: "var(--t-blue-08)" }}
        >
          <Maximize2 className="w-3 h-3" />
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>
      <div style={{ height: expanded ? 200 : 130, transition: "height 0.25s ease" }} className="px-1 pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <RLineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
            <XAxis dataKey="date" tick={{ fontSize: 8, fill: "var(--t-subtle)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis
              domain={[0, displayMax]}
              tick={{ fontSize: 9, fill: "var(--t-subtle)" }}
              tickLine={false}
              axisLine={false}
              width={46}
              tickFormatter={(v: number) =>
                v >= 10000 ? `${(v / 1000).toFixed(0)}k`
                : v >= 1000 ? `${(v / 1000).toFixed(1)}k`
                : v % 1 === 0 ? String(v)
                : v < 10 ? v.toFixed(2)
                : v.toFixed(1)
              }
            />
            <Tooltip
              contentStyle={{ fontSize: 10, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", padding: "3px 8px" }}
              formatter={(v: number) => [`${v} ${unit}`, ""]}
              labelStyle={{ color: "var(--t-muted)", fontWeight: 600 }}
            />
            {refLow != null && refHigh != null && (
              <ReferenceArea y1={refLow} y2={refHigh} fill="rgba(74,222,128,0.12)" fillOpacity={1} />
            )}
            {refHigh != null && (
              <ReferenceArea y1={refHigh} y2={displayMax} fill="rgba(252,165,165,0.15)" fillOpacity={1} />
            )}
            {refLow != null && refLow > 0 && (
              <ReferenceArea y1={0} y2={refLow} fill="rgba(252,165,165,0.15)" fillOpacity={1} />
            )}
            {refLow != null && (
              <ReferenceLine y={refLow} stroke="rgba(74,222,128,0.5)" strokeDasharray="3 3" strokeWidth={1} />
            )}
            {refHigh != null && (
              <ReferenceLine y={refHigh} stroke="rgba(74,222,128,0.5)" strokeDasharray="3 3" strokeWidth={1} />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={BLUE}
              strokeWidth={2}
              dot={(props: { cx: number; cy: number; payload: { value: number } }) => {
                const { cx, cy, payload } = props;
                return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3.5}
                  fill={inRange(payload.value) ? BLUE : "#DC2626"} stroke="white" strokeWidth={1.5} />;
              }}
              activeDot={{ r: 5, stroke: "white", strokeWidth: 2 }}
            />
          </RLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function BtDiscussTab({ sessions, username, prefillInput, onClearPrefill, noBanner }: { sessions: BloodTestSession[]; username: string; prefillInput?: string; onClearPrefill?: () => void; noBanner?: boolean }) {
  const [conversations, setConversations] = useState<BtConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"list" | "chat">("list");
  const [discussUsed, setDiscussUsed] = useState(0);
  const [discussLimit, setDiscussLimit] = useState(DISCUSS_HARD_LIMIT);
  const [limitReached, setLimitReached] = useState(false);
  const [chipSuggestions, setChipSuggestions] = useState<string[]>([]);
  const [questionContexts, setQuestionContexts] = useState<Array<{ q: string; a: string }>>([]);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const lastAiMsgRef = React.useRef<HTMLDivElement>(null);
  const discussMut = useBloodTestDiscuss();

  const handleAddContext = useCallback((q: string, a: string) => {
    setQuestionContexts(prev => [...prev, { q, a }]);
  }, []);

  useEffect(() => {
    if (prefillInput && prefillInput.trim()) {
      setInput(prefillInput);
      setMobilePanel("chat");
      onClearPrefill?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillInput]);

  const latestSession = sessions.length > 0 ? sessions[0] : null;
  const activeConv = conversations.find(c => c.id === activeConvId) ?? null;
  const isLocked = limitReached || discussUsed >= discussLimit;

  useEffect(() => {
    const msgs = activeConv?.messages ?? [];
    if (msgs.length === 0) return;
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg?.role === "assistant") {
      setTimeout(() => { lastAiMsgRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeConv?.messages]);

  useEffect(() => {
    if (!username) return;
    fetch("/api/blood-tests/conversations", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((rows: { id: string; title: string; messagesJson: string; createdAt: string }[]) => {
        const loaded: BtConversation[] = rows.map(row => ({
          id: row.id,
          title: row.title,
          createdAt: new Date(row.createdAt),
          messages: (JSON.parse(row.messagesJson) as DiscussMessage[]).map(m => ({
            ...m,
            timestamp: new Date(m.timestamp as unknown as string),
          })),
        }));
        setConversations(loaded);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  function saveConversation(conv: BtConversation) {
    fetch(`/api/blood-tests/conversations/${conv.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: conv.title, messages: conv.messages }),
    }).catch(() => {});
  }

  async function newChat() {
    const id = Math.random().toString(36).slice(2);
    const conv: BtConversation = { id, title: "New Chat", messages: [], createdAt: new Date() };
    setConversations(prev => [conv, ...prev]);
    setActiveConvId(id);
    setMobilePanel("chat");
    setChipSuggestions([]);
    setSending(true);
    try {
      const r = await fetch("/api/blood-tests/discuss/open", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (r.ok) {
        const data = await r.json() as { response: string };
        const openingMsg: DiscussMessage = {
          id: Math.random().toString(36),
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
          contextSession: null,
        };
        const withOpening = { ...conv, messages: [openingMsg] };
        setConversations(prev => prev.map(c => c.id === id ? withOpening : c));
        saveConversation(withOpening);
      }
    } catch { /* silently skip opener on error */ } finally {
      setSending(false);
    }
  }

  function selectConv(id: string) {
    setActiveConvId(id);
    setMobilePanel("chat");
    setChipSuggestions([]);
  }

  async function sendMsg(msg: string) {
    if (!msg.trim() || sending || isLocked) return;
    setChipSuggestions([]);

    // Build the API message — prepend any queued question contexts
    const apiMsg = questionContexts.length > 0
      ? questionContexts.map(c => `[Context — Q: "${c.q}" → A: "${c.a}"]`).join(" ") + "\n\n" + msg
      : msg;
    setQuestionContexts([]);

    let convId = activeConvId;
    if (!convId) {
      const id = Math.random().toString(36).slice(2);
      const userMsg: DiscussMessage = { id: Math.random().toString(36), role: "user", content: msg, timestamp: new Date() };
      const newConv: BtConversation = { id, title: msg.slice(0, 40), messages: [userMsg], createdAt: new Date() };
      setConversations(prev => [newConv, ...prev]);
      setActiveConvId(id);
      convId = id;
      setSending(true);
      try {
        const resp = await discussMut.mutateAsync({ message: apiMsg, history: [] });
        setDiscussUsed(resp.used);
        setDiscussLimit(resp.limit);
        const assistantMsg: DiscussMessage = { id: Math.random().toString(36), role: "assistant", content: resp.response, contextSession: resp.contextSession, timestamp: new Date(), chips: resp.chips, sources: resp.sources };
        const finalConv = { ...newConv, messages: [userMsg, assistantMsg] };
        setConversations(prev => prev.map(c => c.id === id ? finalConv : c));
        saveConversation(finalConv);
      } catch (err: unknown) {
        if (err instanceof Error && err.message === "limit_reached") {
          const limitErr = err as Error & { used?: number; limit?: number };
          setLimitReached(true);
          setDiscussUsed(limitErr.used ?? discussLimit);
          if (limitErr.limit) setDiscussLimit(limitErr.limit);
        } else {
          const errMsg: DiscussMessage = { id: Math.random().toString(36), role: "assistant", content: "I'm having trouble reaching the AI right now. Please try again in a moment.", timestamp: new Date(), contextSession: null };
          const finalConv = { ...newConv, messages: [userMsg, errMsg] };
          setConversations(prev => prev.map(c => c.id === id ? finalConv : c));
          saveConversation(finalConv);
        }
      } finally { setSending(false); }
      return;
    }

    const priorMessages = conversations.find(c => c.id === convId)?.messages ?? [];
    const history = priorMessages.map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
    const priorConv = conversations.find(c => c.id === convId)!;
    const userMsg: DiscussMessage = { id: Math.random().toString(36), role: "user", content: msg, timestamp: new Date() };
    const updTitle = priorMessages.length === 0 ? msg.slice(0, 40) : priorConv.title;
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, messages: [...c.messages, userMsg], title: updTitle } : c));
    setSending(true);
    try {
      const resp = await discussMut.mutateAsync({ message: apiMsg, history });
      setDiscussUsed(resp.used);
      setDiscussLimit(resp.limit);
      const assistantMsg: DiscussMessage = { id: Math.random().toString(36), role: "assistant", content: resp.response, contextSession: resp.contextSession, timestamp: new Date(), chips: resp.chips, sources: resp.sources };
      setConversations(prev => {
        const updated = prev.map(c => c.id === convId ? { ...c, messages: [...c.messages, assistantMsg], title: updTitle } : c);
        const saved = updated.find(c => c.id === convId);
        if (saved) saveConversation(saved);
        return updated;
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "limit_reached") {
        const limitErr = err as Error & { used?: number; limit?: number };
        setLimitReached(true);
        setDiscussUsed(limitErr.used ?? discussLimit);
        if (limitErr.limit) setDiscussLimit(limitErr.limit);
      } else {
        const errMsg: DiscussMessage = { id: Math.random().toString(36), role: "assistant", content: "I'm having trouble reaching the AI right now. Please try again in a moment.", timestamp: new Date(), contextSession: null };
        setConversations(prev => {
          const updated = prev.map(c => c.id === convId ? { ...c, messages: [...c.messages, errMsg] } : c);
          const saved = updated.find(c => c.id === convId);
          if (saved) saveConversation(saved);
          return updated;
        });
      }
    } finally { setSending(false); }
  }

  async function handleSend() {
    if (!input.trim()) return;
    const msg = input.trim();
    setInput("");
    await sendMsg(msg);
  }

  function relativeTime(date: Date) {
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  return (
    <div className="flex w-full rounded-xl overflow-hidden" style={{ height: noBanner ? "calc(100vh - 155px)" : "calc(100vh - 260px)", minHeight: "480px", border: `1px solid ${T.border}` }}>

      {/* ── Sidebar: conversation list ───────────────────────────────────────── */}
      {/* Mobile: full-width when mobilePanel==="list", hidden when "chat"       */}
      {/* Desktop (sm+): always visible, fixed w-44                              */}
      <div
        className={`${mobilePanel === "chat" ? "hidden sm:flex" : "flex"} w-full sm:w-44 shrink-0 flex-col`}
        style={{ background: T.surface2, borderRight: `1px solid ${T.border}` }}
      >
        <div className="p-3">
          <button onClick={newChat} disabled={isLocked}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-bold text-white sm:h-9 sm:text-xs disabled:opacity-40"
            style={{ background: "var(--t-blue)" }}>
            <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
          {conversations.length === 0 && (
            <p className="text-xs text-center px-3 py-6 sm:text-[10px]" style={{ color: T.subtle }}>
              Start a new chat to discuss your results
            </p>
          )}
          {conversations.map(conv => (
            <div key={conv.id}
              className="flex items-center gap-2 px-3 py-3 rounded-xl cursor-pointer group transition-colors sm:px-2.5 sm:py-2 sm:rounded-lg"
              style={{ background: activeConvId === conv.id ? "var(--t-blue-10)" : "transparent" }}
              onClick={() => selectConv(conv.id)}>
              <MessageSquare className="w-4 h-4 mt-0.5 shrink-0 sm:w-3.5 sm:h-3.5" style={{ color: T.subtle }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate sm:text-xs" style={{ color: T.text }}>{conv.title}</p>
                <p className="text-xs sm:text-[10px]" style={{ color: T.subtle }}>{relativeTime(conv.createdAt)}</p>
              </div>
              <button onClick={e => {
                e.stopPropagation();
                setConversations(prev => prev.filter(c => c.id !== conv.id));
                if (activeConvId === conv.id) { setActiveConvId(null); }
                fetch(`/api/blood-tests/conversations/${conv.id}`, { method: "DELETE", credentials: "include" }).catch(() => {});
              }} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: T.subtle }}>
                <Trash2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chat area ────────────────────────────────────────────────────────── */}
      {/* Mobile: full-width when mobilePanel==="chat", hidden when "list"       */}
      {/* Desktop (sm+): always visible, takes remaining width                   */}
      <div
        className={`${mobilePanel === "list" ? "hidden sm:flex" : "flex"} flex-1 flex-col min-w-0`}
        style={{ background: T.surface }}
      >
        {/* Header — back button on mobile, title always */}
        <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: `1px solid ${T.border}` }}>
          <button
            className="sm:hidden w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: T.surface2, border: `1px solid ${T.border}` }}
            onClick={() => setMobilePanel("list")}
          >
            <ArrowLeft className="w-4 h-4" style={{ color: T.muted }} />
          </button>
          <p className="text-sm font-bold truncate flex-1" style={{ color: T.text }}>{activeConv?.title ?? "New Chat"}</p>
          {discussUsed > 0 && (
            <span className="text-[10px] font-semibold shrink-0 tabular-nums" style={{ color: isLocked ? "#DC2626" : T.subtle }}>
              {discussUsed}/{discussLimit}
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-4">
          {!activeConv && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <MessageSquare className="w-10 h-10 mb-3" style={{ color: T.subtle }} />
              <p className="text-sm font-semibold" style={{ color: T.muted }}>Ask about your blood test results</p>
              {latestSession && (
                <p className="text-xs mt-1" style={{ color: T.subtle }}>
                  Latest test: {latestSession.testName ?? latestSession.labName ?? "Blood Test"} — {btFormatDate(latestSession.testDate)}
                </p>
              )}
              <div className="mt-4 space-y-2 w-full max-w-xs">
                {["Is my estrogen too high?", "How is my overall panel looking?", "Are my liver markers OK?"].map(q => (
                  <button key={q} onClick={() => setInput(q)}
                    className="block w-full text-left px-4 py-3 rounded-xl text-sm transition-colors"
                    style={{ border: `1px solid ${T.border}`, color: T.muted, background: T.surface2 }}>
                    {q}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex items-start gap-2 px-4 py-3 rounded-xl w-full max-w-xs" style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.25)" }}>
                <TriangleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#D97706" }} />
                <p className="text-[11px] leading-snug" style={{ color: "#D97706" }}>
                  <strong>5 chats maximum</strong> for the time being. Once your limit is reached you will not be able to ask further questions.
                </p>
              </div>
            </div>
          )}
          {activeConv?.messages.map((msg, idx) => {
            const isLastAiMsg = msg.role === "assistant" && idx === (activeConv.messages.length - 1);
            return (
            <div key={msg.id} ref={isLastAiMsg ? lastAiMsgRef : undefined} className={`flex min-w-0 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" ? (
                <div className="max-w-xl w-full min-w-0">
                  {msg.contextSession && (
                    <p className="text-[10px] flex items-center gap-1 mb-1" style={{ color: "var(--t-blue)" }}>
                      <CheckCircle className="w-3 h-3" />
                      Retrieved {btFormatDate(msg.contextSession.testDate)}
                    </p>
                  )}
                  <div className="text-sm break-words" style={{ color: T.text }}>
                    {renderAssistantBlocks(msg.content, sessions, handleAddContext, sending || isLocked)}
                  </div>
                  {msg.contextSession && (
                    <BtMarkerChips
                      sessionId={msg.contextSession.id}
                      sessions={sessions}
                      onChipClick={isLastAiMsg ? setChipSuggestions : undefined}
                    />
                  )}
                  {isLastAiMsg && !sending && msg.chips && msg.chips.length > 0 && (
                    <div className="mt-3 flex flex-col gap-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: T.subtle }}>Suggested questions</p>
                      {msg.chips.map(q => (
                        <button
                          key={q}
                          onClick={() => !isLocked && sendMsg(q)}
                          disabled={isLocked}
                          className="text-left px-3 py-2 rounded-xl text-xs transition-colors disabled:opacity-40"
                          style={{ border: `1px solid ${T.border}`, color: T.muted, background: T.surface2 }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                  {isLastAiMsg && !sending && chipSuggestions.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1.5">
                      {chipSuggestions.map(q => (
                        <button
                          key={q}
                          onClick={() => { setInput(q); setChipSuggestions([]); }}
                          className="text-left px-3 py-2 rounded-xl text-xs transition-colors"
                          style={{ border: `1px solid ${T.border}`, color: "var(--t-blue)", background: "var(--t-blue-08)" }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 flex flex-col gap-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: T.subtle }}>Sources</p>
                      {msg.sources.map((src: DiscussSource) => (
                        <a
                          key={src.url}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-opacity hover:opacity-80"
                          style={{ border: `1px solid ${T.border}`, background: T.surface2, color: T.muted, textDecoration: "none" }}
                        >
                          {src.type === "study" ? (
                            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          ) : (
                            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
                          )}
                          <span className="truncate">{src.label}</span>
                          <svg className="w-2.5 h-2.5 shrink-0 ml-auto opacity-50" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-sm px-4 py-3 rounded-2xl text-sm text-white font-medium" style={{ background: "var(--t-blue)" }}>
                  {msg.content}
                </div>
              )}
            </div>
            );
          })}
          {sending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 text-sm" style={{ color: T.muted }}>
                <Loader2 className="w-4 h-4 animate-spin" /> Analysing your results...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar / locked state */}
        <div className="p-4" style={{ borderTop: `1px solid ${T.border}` }}>
          {questionContexts.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className="text-[10px] font-semibold self-center shrink-0" style={{ color: T.subtle }}>Context queued:</span>
              {questionContexts.map((c, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] max-w-[240px]"
                  style={{ background: "rgba(22,163,74,0.10)", border: "1px solid rgba(22,163,74,0.25)", color: "#16A34A" }}>
                  <span className="truncate">{c.a}</span>
                  <button onClick={() => setQuestionContexts(prev => prev.filter((_, j) => j !== i))} className="shrink-0 opacity-70 hover:opacity-100">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {isLocked ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "rgba(148,163,184,0.08)", border: `1px solid ${T.border}` }}>
              <Lock className="w-4 h-4 shrink-0" style={{ color: T.subtle }} />
              <p className="text-sm" style={{ color: T.muted }}>
                You've used all {discussLimit} AI discussions for this account.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-2xl border px-4 pr-2 py-1.5" style={{ borderColor: T.border, background: T.surface2 }}>
                <input value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="What would you like to know?"
                  className="flex-1 bg-transparent text-sm placeholder-slate-400 focus:outline-none py-1.5"
                  style={{ color: T.text }}
                />
                <button onClick={handleSend} disabled={!input.trim() || sending}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white disabled:opacity-30 transition-opacity shrink-0"
                  style={{ background: "var(--t-blue)" }}>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DNA Tab ──────────────────────────────────────────────────────────────────

type DnaFinding = { rsid: string; gene: string; genotype: string; riskLevel: string; category: string; name: string };
type DnaProfile = { accountId: string; fileFormat: string; snpCount: string; findings: DnaFinding[]; uploadedAt: string };

const RISK_COLOR: Record<string, string> = {
  high: "#ef4444",
  moderate: "#f59e0b",
  protective: "#10b981",
  low: "#6b7280",
  neutral: "#6b7280",
};

const RISK_LABEL: Record<string, string> = {
  high: "HIGH IMPACT",
  moderate: "MODERATE",
  protective: "PROTECTIVE",
  low: "LOW",
  neutral: "NEUTRAL",
};

function DnaVariantCard({ f }: { f: DnaFinding }) {
  const color = RISK_COLOR[f.riskLevel] ?? "#6b7280";
  const label = RISK_LABEL[f.riskLevel] ?? f.riskLevel.toUpperCase();
  return (
    <div className="rounded-2xl px-4 py-3" style={{ background: T.surface2, border: `1px solid ${T.border}` }}>
      <div className="flex items-center justify-between gap-3 mb-1">
        <span className="text-[11px] font-bold" style={{ color: T.text }}>{f.gene}</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}22`, color }}>
          {label}
        </span>
      </div>
      <p className="text-[12px] font-medium mb-1" style={{ color: T.text }}>{f.name}</p>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded" style={{ background: T.surface, color: T.muted, border: `1px solid ${T.border}` }}>
          {f.rsid}
        </span>
        <span className="text-[11px] font-mono font-bold" style={{ color: T.text }}>{f.genotype}</span>
      </div>
    </div>
  );
}

function DnaTab({ username }: { username: string }) {
  const [profile, setProfile] = useState<DnaProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/dna/profile", { credentials: "include" })
      .then(r => r.json())
      .then((d: { exists: boolean; profile?: DnaProfile }) => {
        if (!cancelled) {
          setProfile(d.exists ? (d.profile ?? null) : null);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [username]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const content = await file.text();
      const res = await fetch("/api/dna/upload", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; findings?: DnaFinding[]; snpCount?: number; format?: string; matchedCount?: number };
      if (!res.ok || !data.ok) {
        setUploadError(data.error ?? "Upload failed");
      } else {
        const newProfile: DnaProfile = {
          accountId: username,
          fileFormat: data.format ?? "23andme",
          snpCount: String(data.snpCount ?? ""),
          findings: data.findings ?? [],
          uploadedAt: new Date().toISOString(),
        };
        setProfile(newProfile);
      }
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete() {
    await fetch("/api/dna/profile", { method: "DELETE", credentials: "include" });
    setProfile(null);
    setDeleteConfirm(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--t-blue)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-5 pt-2">
        <div className="rounded-3xl p-5 text-center" style={{ background: T.surface2, border: `1px solid ${T.border}` }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
               style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}>
            <Dna className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-base font-bold mb-2" style={{ color: T.text }}>Upload Your DNA</h3>
          <p className="text-sm mb-4" style={{ color: T.muted }}>
            Upload your raw DNA data from 23andMe or MyHeritage. We'll cross-reference 62 clinically-relevant variants covering methylation, hormones, metabolic health, brain chemistry, and more.
          </p>
          <p className="text-xs mb-5 px-2" style={{ color: T.muted }}>
            Your raw data is processed locally on the server and only matched variants are stored — never your full genome.
          </p>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full h-11 rounded-2xl text-sm font-bold text-white transition-opacity disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}>
            {uploading ? "Processing…" : "Choose DNA File"}
          </button>
          {uploadError && <p className="text-xs mt-3 text-red-400">{uploadError}</p>}
          <input ref={fileRef} type="file" accept=".txt,.csv,.gz" className="hidden" onChange={handleFileChange} />
          <p className="text-[10px] mt-4" style={{ color: T.muted }}>Accepts .txt and .csv raw data files from 23andMe or MyHeritage</p>
        </div>
      </div>
    );
  }

  const findings = profile.findings ?? [];
  const categories = ["All", ...Array.from(new Set(findings.map(f => f.category)))];
  const filtered = selectedCategory === "All" ? findings : findings.filter(f => f.category === selectedCategory);
  const highRisk = findings.filter(f => f.riskLevel === "high").length;
  const moderate = findings.filter(f => f.riskLevel === "moderate").length;
  const protective = findings.filter(f => f.riskLevel === "protective").length;
  const uploadDate = profile.uploadedAt ? new Date(profile.uploadedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }) : "";

  return (
    <div className="space-y-4 pt-2">
      {/* Summary card */}
      <div className="rounded-3xl p-4" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", border: `1px solid #4338ca44` }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
            <Dna className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>
              {profile.fileFormat === "myheritage" ? "MyHeritage" : "23andMe"} · {profile.snpCount ? `${parseInt(profile.snpCount).toLocaleString()} SNPs scanned` : "DNA uploaded"}
            </p>
            <p className="text-sm font-bold text-white">{findings.length} variants matched</p>
          </div>
          <button onClick={() => setDeleteConfirm(true)} className="ml-auto w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.1)" }}>
            <Trash2 className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "High impact", value: highRisk, color: "#ef4444" },
            { label: "Moderate", value: moderate, color: "#f59e0b" },
            { label: "Protective", value: protective, color: "#10b981" },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-2 text-center" style={{ background: "rgba(255,255,255,0.07)" }}>
              <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>{s.label}</p>
            </div>
          ))}
        </div>
        {uploadDate && <p className="text-[10px] mt-3" style={{ color: "rgba(255,255,255,0.35)" }}>Uploaded {uploadDate}</p>}
      </div>

      {/* Re-upload */}
      <button onClick={() => fileRef.current?.click()} disabled={uploading}
        className="w-full h-9 rounded-2xl text-xs font-bold transition-opacity disabled:opacity-50"
        style={{ background: T.surface2, color: T.muted, border: `1px solid ${T.border}` }}>
        {uploading ? "Processing…" : "Re-upload DNA file"}
      </button>
      {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
      <input ref={fileRef} type="file" accept=".txt,.csv,.gz" className="hidden" onChange={handleFileChange} />

      {/* Category filter */}
      {categories.length > 2 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className="shrink-0 h-7 px-3 rounded-full text-[11px] font-semibold transition-all"
              style={selectedCategory === cat
                ? { background: "var(--t-blue)", color: "white" }
                : { background: T.surface2, color: T.muted, border: `1px solid ${T.border}` }}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Variant cards */}
      {filtered.length === 0 ? (
        <p className="text-center py-8 text-sm" style={{ color: T.muted }}>No variants in this category</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(f => <DnaVariantCard key={f.rsid} f={f} />)}
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center pb-8 px-5" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-sm rounded-3xl p-6 space-y-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <h4 className="text-base font-bold" style={{ color: T.text }}>Delete DNA Profile?</h4>
            <p className="text-sm" style={{ color: T.muted }}>This will remove all your matched genetic variants. You can re-upload at any time.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setDeleteConfirm(false)} className="h-11 rounded-2xl text-sm font-semibold" style={{ background: T.surface2, color: T.text, border: `1px solid ${T.border}` }}>
                Cancel
              </button>
              <button onClick={handleDelete} className="h-11 rounded-2xl text-sm font-bold text-white" style={{ background: "#ef4444" }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Blood Test Hub: Portal component ─────────────────────────────────────────

type BtPortalTab = "dashboard" | "results" | "add" | "discuss" | "dna";

const BT_PORTAL_TABS: { id: BtPortalTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: "dashboard", label: "Dashboard",    icon: LayoutDashboard },
  { id: "results",   label: "Results",      icon: FlaskConical },
  { id: "add",       label: "Add Results",  icon: Plus },
  { id: "discuss",   label: "Discuss",      icon: MessageSquare },
  { id: "dna",       label: "DNA",          icon: Dna },
];

function BloodTestPortalHub({ sessions, username, onTabChange }: { sessions: BloodTestSession[]; username: string; onTabChange?: (tab: BtPortalTab) => void }) {
  const [activeTab, setActiveTab] = useState<BtPortalTab>(() => {
    const bt = new URLSearchParams(window.location.search).get("bt") as BtPortalTab | null;
    return bt && (["dashboard", "results", "add", "discuss", "dna"] as string[]).includes(bt) ? bt : "dashboard";
  });
  const [discussPrefill, setDiscussPrefill] = useState<string>("");
  const [editSession, setEditSession] = useState<BloodTestSession | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("bt", activeTab);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [activeTab]);

  function goToDiscuss(prefill: string) {
    setDiscussPrefill(prefill);
    setActiveTab("discuss");
    onTabChange?.("discuss");
  }

  function handleTabChange(tab: BtPortalTab) {
    if (tab !== "add") setEditSession(null);
    setActiveTab(tab);
    onTabChange?.(tab);
  }

  function handleEdit(session: BloodTestSession) {
    setEditSession(session);
    setActiveTab("add");
    onTabChange?.("add");
  }

  function handleSaved() {
    setEditSession(null);
    setActiveTab("results");
    onTabChange?.("results");
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Tab nav */}
      <div className="flex gap-1.5">
        {BT_PORTAL_TABS.map(tab => (
          <button key={tab.id} onClick={() => handleTabChange(tab.id)}
            className="flex-1 h-8 rounded-xl text-[11px] font-semibold transition-all"
            style={activeTab === tab.id
              ? { background: "var(--t-blue)", color: "white" }
              : { background: T.surface2, color: T.muted, border: `1px solid ${T.border}` }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "dashboard" && <BtDashboardTab sessions={sessions} username={username} onGoToDiscuss={goToDiscuss} />}
          {activeTab === "results"   && <BtResultsTab sessions={sessions} onEdit={handleEdit} username={username} />}
          {activeTab === "add"       && <BtAddResultsTab onSaved={handleSaved} editSession={editSession} />}
          {activeTab === "discuss"   && <BtDiscussTab sessions={sessions} username={username} prefillInput={discussPrefill} onClearPrefill={() => setDiscussPrefill("")} noBanner />}
          {activeTab === "dna"       && <DnaTab username={username} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Blood Test Portal Hub with conditional banner ────────────────────────────

function BloodTestPortalHubWithBanner({ sessions, username, onBack }: { sessions: BloodTestSession[]; username: string; onBack: () => void }) {
  const [btTab, setBtTab] = useState<BtPortalTab>("dashboard");
  const showBanner = btTab !== "discuss" && btTab !== "dna";

  return (
    <>
      {showBanner && (
        <div className="-mx-5 -mt-6 lg:-mx-8 lg:-mt-7 relative overflow-hidden"
             style={{ background: "linear-gradient(135deg, var(--brand-navy) 0%, var(--brand-blue) 100%)" }}>
          <div className="absolute inset-0 opacity-10"
               style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white 0%, transparent 60%)" }} />
          <div className="relative px-5 pt-5 pb-6 lg:px-8 lg:pt-6">
            <div className="flex items-center justify-between mb-5">
              <button onClick={onBack}
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.12)" }}>
                <ChevronLeft className="w-5 h-5" style={{ color: "rgba(255,255,255,0.9)" }} />
              </button>
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1"
               style={{ color: "rgba(255,255,255,0.6)" }}>Health</p>
            <h1 className="text-2xl font-bold text-white leading-tight">Blood Tests</h1>
          </div>
        </div>
      )}
      {!showBanner && (
        <div className="flex items-center gap-3 pt-3 pb-1">
          <button onClick={onBack}
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: T.surface2, border: `1px solid ${T.border}` }}>
            <ChevronLeft className="w-4 h-4" style={{ color: T.muted }} />
          </button>
          <p className="text-sm font-bold" style={{ color: T.text }}>Blood Tests — Discuss</p>
        </div>
      )}
      <BloodTestPortalHub sessions={sessions} username={username} onTabChange={setBtTab} />
    </>
  );
}

// ─── GLP-1 Dose Label ─────────────────────────────────────────────────────────

function Glp1DoseLabel(props: { x?: number; y?: number; value?: number }) {
  const { x, y, value } = props;
  if (value == null || value === 0 || x == null || y == null) return null;
  const text = `${value}mg`;
  const px = 5;
  const py = 3;
  const fontSize = 9;
  const charW = fontSize * 0.6;
  const w = text.length * charW + px * 2;
  const h = fontSize + py * 2;
  return (
    <g transform={`translate(${x},${y - 18})`}>
      <rect
        x={-w / 2} y={-h / 2}
        width={w} height={h}
        rx={h / 2}
        fill="#7C3AED"
        opacity={0.92}
      />
      <text
        x={0} y={1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={fontSize}
        fontWeight={700}
        fill="#fff"
        style={{ fontFamily: "inherit" }}
      >
        {text}
      </text>
    </g>
  );
}

// ─── GLP-1 Chart Tooltip ──────────────────────────────────────────────────────

function Glp1ChartTooltip({
  active, payload, label, unit,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { deltaKg: number | null } }>;
  label?: string;
  unit: "kg" | "st" | "lbs";
}) {
  if (!active || !payload?.length) return null;
  const weightEntry = payload.find(p => p.name === "weight");
  const doseEntry   = payload.find(p => p.name === "dose");
  const deltaKg     = weightEntry?.payload?.deltaKg ?? null;

  function fmtW(v: number | undefined): string {
    if (v == null) return "—";
    if (unit === "lbs") return `${v.toFixed(1)} lbs`;
    if (unit === "st") {
      const st = Math.floor(v);
      let lb = Math.round((v - st) * 14);
      if (lb === 14) { return `${st + 1} st 0 lb`; }
      return `${st} st ${lb} lb`;
    }
    return `${v.toFixed(1)} kg`;
  }

  function fmtDelta(absKg: number): string {
    if (unit === "lbs") return `${(absKg * 2.20462).toFixed(1)} lbs`;
    if (unit === "st") {
      const totalLb = absKg * 2.20462;
      const st = Math.floor(totalLb / 14);
      const lb = +(totalLb % 14).toFixed(1);
      return st > 0 ? `${st} st ${lb} lb` : `${lb} lb`;
    }
    return `${absKg.toFixed(1)} kg`;
  }

  const dateStr = label
    ? new Date(label + "T00:00:00").toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : "";

  return (
    <div
      className="rounded-xl px-3 py-2 text-xs shadow-xl"
      style={{ background: "#1C1C1E", color: "#fff", minWidth: 148 }}
    >
      <p className="text-[10px] font-semibold mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>
        {dateStr}
      </p>
      {weightEntry?.value != null && (
        <div className="flex items-center justify-between gap-4 mb-1">
          <span style={{ color: "rgba(255,255,255,0.6)" }}>Weight</span>
          <span className="font-bold">{fmtW(weightEntry.value)}</span>
        </div>
      )}
      {doseEntry?.value != null && (
        <div className="flex items-center justify-between gap-4 mb-1">
          <span style={{ color: "rgba(255,255,255,0.6)" }}>Dose</span>
          <span className="font-bold">{doseEntry.value.toFixed(2)} mg</span>
        </div>
      )}
      {deltaKg != null && (
        <div
          className="flex items-center justify-between gap-4 mt-1 pt-1.5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
        >
          <span style={{ color: "rgba(255,255,255,0.6)" }}>Δ Change</span>
          <span className="font-bold" style={{ color: deltaKg < 0 ? "#4ADE80" : "#F87171" }}>
            {deltaKg < 0 ? "−" : "+"}{fmtDelta(Math.abs(deltaKg))}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Drag-to-reorder dashboard item ────────────────────────────────────────────

function SortableDashItem({ id, label, visible, onToggle }: {
  id: string; label: string; visible: boolean; onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const dndStyle = {
    transform: DndCSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: "var(--t-blue-06)",
    border: "1px solid var(--t-blue-15)",
  };
  return (
    <div ref={setNodeRef} style={dndStyle} className="flex items-center gap-2 rounded-lg px-2 py-2">
      <span {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 rounded" style={{ color: "var(--t-blue-50)" }}>
        <GripVertical className="w-4 h-4" />
      </span>
      <span className="flex-1 text-xs font-medium" style={{ color: visible ? "#1e293b" : "#94a3b8" }}>{label}</span>
      <button onClick={onToggle}
        className="w-7 h-4 rounded-full transition-colors flex-shrink-0"
        style={{ background: visible ? "var(--t-blue)" : "#cbd5e1" }}>
        <span className="block w-3 h-3 rounded-full bg-white shadow transition-transform mx-auto"
          style={{ transform: visible ? "translateX(6px)" : "translateX(-4px)" }} />
      </button>
    </div>
  );
}

// ─── My History section component ─────────────────────────────────────────────

interface MyActivityEntry {
  id: string;
  eventCategory: string;
  eventType: string;
  entityId: string | null;
  actorType: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

const MY_ACTIVITY_ICONS: Record<string, string> = {
  "order.created": "🛒", "order.updated": "📦", "order.deleted": "🗑️",
  "glp1.shot_logged": "💉", "glp1.shot_updated": "✏️", "glp1.shot_deleted": "🗑️",
  "compound.log_created": "🧪", "compound.log_updated": "✏️", "compound.log_ended": "🏁", "compound.log_deleted": "🗑️",
  "blood_test.session_created": "🩸", "blood_test.results_uploaded": "📊", "blood_test.ai_discussion_message": "🤖",
  "account.created": "👤", "account.updated": "✏️",
  "group_buy.joined": "🤝", "group_buy.left": "🚪",
  "health.insight_logged": "📏", "health.insight_updated": "✏️", "health.insight_deleted": "🗑️",
};

const CATEGORY_LABELS: Record<string, string> = {
  order: "Orders", payment: "Payments", glp1: "GLP-1", compound: "Compounds",
  blood_test: "Blood Tests", account: "Account", group_buy: "Group Buys", health: "Health",
};

function formatMyEventType(t: string): string {
  const parts = t.split(".");
  if (parts.length >= 2) {
    const action = parts.slice(1).join(" ").replace(/_/g, " ");
    return action.replace(/\b\w/g, c => c.toUpperCase());
  }
  return t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function MyHistorySection({ onBack }: { onBack: () => void }) {
  const [entries, setEntries] = useState<MyActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState<string>("all");

  useEffect(() => {
    setLoading(true);
    fetch("/api/account/activity?limit=100", { credentials: "include" })
      .then(r => r.json())
      .then(d => setEntries(Array.isArray(d.rows) ? d.rows : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = ["all", ...Array.from(new Set(entries.map(e => e.eventCategory)))];
  const filtered = filterCat === "all" ? entries : entries.filter(e => e.eventCategory === filterCat);

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={onBack}
          className="rounded-full p-1.5 transition-colors"
          style={{ background: T.surface2, color: T.muted }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-lg font-bold" style={{ color: T.text }}>My Activity History</h2>
          <p className="text-xs" style={{ color: T.muted }}>A log of all your actions on the platform</p>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
            style={{
              background: filterCat === cat ? "var(--t-blue)" : T.surface2,
              color: filterCat === cat ? "#fff" : T.muted,
              border: `1px solid ${filterCat === cat ? "var(--t-blue)" : T.border}`,
            }}
          >
            {cat === "all" ? `All (${entries.length})` : (CATEGORY_LABELS[cat] ?? cat)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: T.muted }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl flex flex-col items-center justify-center py-14 text-center"
          style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <History className="w-10 h-10 mb-3" style={{ color: T.subtle }} />
          <p className="text-sm font-semibold" style={{ color: T.text }}>No activity yet</p>
          <p className="text-xs mt-1" style={{ color: T.muted }}>Your actions will appear here as you use the platform.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(e => {
            const meta = e.metadata ?? {};
            return (
              <div
                key={e.id}
                className="rounded-xl px-4 py-3 flex items-start gap-3"
                style={{ background: T.surface, border: `1px solid ${T.border}` }}
              >
                <span className="text-lg leading-none mt-0.5 select-none flex-shrink-0">
                  {MY_ACTIVITY_ICONS[e.eventType] ?? "•"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-semibold" style={{ color: T.text }}>
                      {formatMyEventType(e.eventType)}
                    </p>
                    {e.actorType === "admin" && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 uppercase">
                        Admin action
                      </span>
                    )}
                  </div>
                  {Boolean(meta.code || meta.logType || meta.groupBuyName) && (
                    <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>
                      {meta.code ? `Order #${String(meta.code)}` : ""}
                      {meta.logType ? `Type: ${String(meta.logType)}` : ""}
                      {meta.groupBuyName ? `Group: ${String(meta.groupBuyName)}` : ""}
                    </p>
                  )}
                  <p className="text-[10px] mt-1" style={{ color: T.subtle }}>
                    {new Date(e.createdAt).toLocaleString("en-GB", {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Layout helpers (must live outside CustomerPortal to avoid re-mount on every re-render) ──

interface PortalNavProps {
  section: Section;
  setSection: (s: Section) => void;
  hubMoreOpen: boolean;
  setHubMoreOpen: (v: boolean) => void;
  account?: { organiserStatus?: string | null } | null;
  navOrder?: Section[];
}

// ─── Support Ticket Section ───────────────────────────────────────────────────

type TicketCategory = "order_issue" | "general_support" | "group_buy" | "wholesale" | "testing_pool";
type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

interface SupportTicket {
  id: string;
  accountUsername: string;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  customerUnread?: boolean;
  groupBuyId?: string | null;
  issueType?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SupportTicketMessage {
  id: number;
  ticketId: string;
  authorRole: "customer" | "admin";
  authorUsername: string;
  body: string;
  createdAt: string;
}

const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  order_issue: "Order Issue",
  general_support: "General Support",
  group_buy: "Group Buy",
  wholesale: "Wholesale",
  testing_pool: "Testing Pool",
};

const TICKET_ISSUE_TYPES: Record<TicketCategory, string[]> = {
  general_support: ["Account issue", "Order enquiry", "Delivery enquiry", "Other"],
  order_issue: ["Wrong item received", "Missing item", "Damaged item", "Delivery not arrived", "Tracking issue", "Other"],
  group_buy: ["Payment issue", "Delivery issue", "Product missing", "Wrong item", "Address issue", "Out of stock", "GB enquiry", "Other"],
  wholesale: ["Pricing enquiry", "Order issue", "Shipping issue", "Account access", "Product enquiry", "Other"],
  testing_pool: ["Pool enquiry", "Contribution question", "Result question", "Payment issue", "Other"],
};

const TICKET_STATUS_META: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  open: { label: "Open", color: "#EA580C", bg: "rgba(234,88,12,0.1)" },
  in_progress: { label: "In Progress", color: "#2563EB", bg: "rgba(37,99,235,0.1)" },
  resolved: { label: "Resolved", color: "#16A34A", bg: "rgba(22,163,74,0.1)" },
  closed: { label: "Closed", color: "#64748B", bg: "rgba(100,116,139,0.1)" },
};

function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const m = TICKET_STATUS_META[status] ?? { label: status, color: "#64748B", bg: "rgba(100,116,139,0.1)" };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: m.bg, color: m.color }}>
      {m.label}
    </span>
  );
}

function TicketDetail({ ticket, username, onBack }: { ticket: SupportTicket; username: string; onBack: () => void }) {
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [currentTicket, setCurrentTicket] = useState<SupportTicket>(ticket);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState("");
  const msgEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback((initial = false) => {
    if (initial) setLoading(true);
    fetch(`/api/account/tickets/${ticket.id}`, { credentials: "include" })
      .then(r => r.json())
      .then((data: { ticket: SupportTicket; messages: SupportTicketMessage[] }) => {
        setMessages(data.messages ?? []);
        if (data.ticket) setCurrentTicket(data.ticket);
      })
      .catch(() => {})
      .finally(() => { if (initial) setLoading(false); });
  }, [ticket.id]);

  useEffect(() => {
    fetchMessages(true);
    const interval = setInterval(() => fetchMessages(false), 10_000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendReply = async () => {
    if (!replyBody.trim() || sending) return;
    setSending(true);
    setReplyError("");
    try {
      const res = await fetch(`/api/account/tickets/${ticket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: replyBody.trim() }),
      });
      if (res.ok) {
        const msg = await res.json() as SupportTicketMessage;
        setMessages(prev => [...prev, msg]);
        setReplyBody("");
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setReplyError(err.error ?? "Failed to send");
      }
    } catch {
      setReplyError("Network error");
    } finally {
      setSending(false);
    }
  };

  const isClosed = currentTicket.status === "closed";
  const catLabel = TICKET_CATEGORY_LABELS[currentTicket.category] ?? currentTicket.category;

  return (
    <div>
      {/* ── Gradient hero header ── */}
      <div className="-mx-5 -mt-6 lg:-mx-8 lg:-mt-7 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--brand-navy) 0%, var(--brand-blue) 100%)" }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white 0%, transparent 60%)" }} />
        <div className="relative px-5 pt-5 pb-8 lg:px-8 lg:pt-6">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(255,255,255,0.12)" }}>
              <ArrowLeft className="w-4 h-4" style={{ color: "rgba(255,255,255,0.9)" }} />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.6)" }}>Support</p>
              <h1 className="text-lg font-bold text-white leading-tight truncate">{currentTicket.subject}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <TicketStatusBadge status={currentTicket.status} />
            <span className="text-[10px] font-semibold rounded-full px-2 py-0.5"
              style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)" }}>
              {catLabel}
            </span>
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>
              {new Date(ticket.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-5"
          style={{ background: T.bg, borderRadius: "20px 20px 0 0" }} />
      </div>

      {/* ── Content ── */}
      <div className="-mx-5 lg:-mx-8 px-5 lg:px-8 pb-8" style={{ background: T.bg }}>
        <div className="space-y-4 pt-2">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--t-subtle)" }} />
            </div>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {messages.length === 0 && (
                <div className="text-center py-8 text-xs" style={{ color: "var(--t-subtle)" }}>No messages yet — the support team will reply here.</div>
              )}
              {messages.map(msg => {
                const isCustomer = msg.authorRole === "customer";
                return (
                  <div key={msg.id} className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[85%] rounded-2xl px-4 py-2.5"
                      style={{
                        background: isCustomer ? "var(--t-blue)" : "var(--t-surface)",
                        border: isCustomer ? "none" : "1px solid var(--t-border)",
                        color: isCustomer ? "#fff" : "var(--t-text)",
                        borderBottomRightRadius: isCustomer ? 4 : undefined,
                        borderBottomLeftRadius: isCustomer ? undefined : 4,
                      }}>
                      <p className="text-[10px] font-semibold mb-1" style={{ opacity: 0.7 }}>
                        {isCustomer ? `@${msg.authorUsername}` : "Support Team"}
                      </p>
                      <p className="text-xs whitespace-pre-wrap break-words">{msg.body}</p>
                      <p className="text-[9px] mt-1 text-right" style={{ opacity: 0.55 }}>
                        {new Date(msg.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={msgEndRef} />
            </div>
          )}

          {isClosed ? (
            <div className="text-center text-xs rounded-xl py-3 px-4" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-subtle)" }}>
              This ticket is closed and cannot receive new replies.
            </div>
          ) : (
            <div className="rounded-2xl p-3 space-y-2" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
              <textarea
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                placeholder="Write a reply…"
                rows={3}
                className="w-full text-xs resize-none outline-none"
                style={{ background: "transparent", color: "var(--t-text)" }}
                onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendReply(); }}
              />
              {replyError && <p className="text-xs text-red-500">{replyError}</p>}
              <div className="flex justify-end">
                <button onClick={sendReply} disabled={!replyBody.trim() || sending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                  style={{ background: "var(--t-blue-deep)", color: "#fff" }}>
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SupportSection({ username, onBack, initialTicketId }: { username: string; onBack: () => void; initialTicketId?: string }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "new" | "detail">("list");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [category, setCategory] = useState<TicketCategory>("general_support");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [issueType, setIssueType] = useState("");
  const [groupBuyId, setGroupBuyId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const deepLinkedRef = useRef(false);

  const { data: myGroupBuys = [] } = useMyGroupBuys(true);

  const handleCategoryChange = (cat: TicketCategory) => {
    setCategory(cat);
    setIssueType("");
    setGroupBuyId("");
  };

  const loadTickets = useCallback(() => {
    setLoading(true);
    fetch("/api/account/tickets", { credentials: "include" })
      .then(r => r.json())
      .then((data: { tickets: SupportTicket[] }) => setTickets(data.tickets ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  // Auto-open a specific ticket from a deep link (?ticket=ID)
  useEffect(() => {
    if (!initialTicketId || deepLinkedRef.current || loading || tickets.length === 0) return;
    const found = tickets.find(t => t.id === initialTicketId);
    if (found) {
      deepLinkedRef.current = true;
      setSelectedTicket(found);
      setView("detail");
    }
  }, [initialTicketId, loading, tickets]);

  const submitTicket = async () => {
    if (!subject.trim() || !description.trim() || submitting) return;
    if (category === "group_buy" && !groupBuyId) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const body: Record<string, string> = {
        category,
        subject: subject.trim(),
        description: description.trim(),
      };
      if (issueType) body.issueType = issueType;
      if (groupBuyId) body.groupBuyId = groupBuyId;

      const res = await fetch("/api/account/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const ticket = await res.json() as SupportTicket;
        setTickets(prev => [ticket, ...prev]);
        setSubject("");
        setDescription("");
        setCategory("general_support");
        setIssueType("");
        setGroupBuyId("");
        setView("list");
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setSubmitError(err.error ?? "Failed to submit ticket");
      }
    } catch {
      setSubmitError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (view === "detail" && selectedTicket) {
    return <TicketDetail ticket={selectedTicket} username={username} onBack={() => { setView("list"); setSelectedTicket(null); loadTickets(); }} />;
  }

  return (
    <div>
      {/* ── Gradient hero header (full-bleed) ── */}
      <div className="-mx-5 -mt-6 lg:-mx-8 lg:-mt-7 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--brand-navy) 0%, var(--brand-blue) 100%)" }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white 0%, transparent 60%)" }} />
        <div className="relative px-5 pt-5 pb-8 lg:px-8 lg:pt-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.12)" }}>
              <ArrowLeft className="w-4 h-4" style={{ color: "rgba(255,255,255,0.9)" }} />
            </button>
            {view === "list" && (
              <button onClick={() => setView("new")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold"
                style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)" }}>
                <Plus className="w-3.5 h-3.5" /> New Ticket
              </button>
            )}
            {view === "new" && (
              <button onClick={() => { setView("list"); setSubmitError(""); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
                style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)" }}>
                Cancel
              </button>
            )}
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>Customer Portal</p>
          <h1 className="text-2xl font-bold text-white leading-tight">
            {view === "new" ? "New Ticket" : "Support"}
          </h1>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>
            {view === "new"
              ? "Describe your issue and we'll get back to you"
              : tickets.length === 0
                ? "Raise a ticket and we'll get back to you"
                : `${tickets.length} ticket${tickets.length !== 1 ? "s" : ""}${tickets.filter(t => t.customerUnread).length > 0 ? ` · ${tickets.filter(t => t.customerUnread).length} unread` : ""}`}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-5"
          style={{ background: T.bg, borderRadius: "20px 20px 0 0" }} />
      </div>

      {/* ── Content area ── */}
      <div className="-mx-5 lg:-mx-8 px-5 lg:px-8 pb-8" style={{ background: T.bg }}>
        <div className="space-y-4 pt-2">

          {view === "new" && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-4 space-y-3"
              style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold" style={{ color: "var(--t-subtle)" }}>Category</label>
                <select value={category} onChange={e => handleCategoryChange(e.target.value as TicketCategory)}
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                  style={{ background: "var(--t-input-bg, var(--t-surface))", border: "1px solid var(--t-border)", color: "var(--t-text)" }}>
                  <option value="general_support">General</option>
                  <option value="order_issue">Order Issue</option>
                  <option value="group_buy">Group Buy</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="testing_pool">Testing Pool</option>
                </select>
              </div>

              {/* Group Buy picker — shown only when category is group_buy */}
              {category === "group_buy" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold" style={{ color: "var(--t-subtle)" }}>
                    Which Group Buy? <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  {myGroupBuys.length > 0 ? (
                    <select value={groupBuyId} onChange={e => setGroupBuyId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                      style={{ background: "var(--t-input-bg, var(--t-surface))", border: `1px solid ${!groupBuyId ? "#EF4444" : "var(--t-border)"}`, color: "var(--t-text)" }}>
                      <option value="">— Select a group buy —</option>
                      {myGroupBuys.map(gb => (
                        <option key={gb.id} value={gb.id}>{gb.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-3 py-2 rounded-xl text-xs"
                      style={{ background: "var(--t-input-bg, var(--t-surface))", border: "1px solid var(--t-border)", color: "var(--t-subtle)" }}>
                      No group buys found on your account
                    </div>
                  )}
                  {!groupBuyId && (
                    <p className="text-[10px]" style={{ color: "#EF4444" }}>Please select a group buy to continue</p>
                  )}
                </div>
              )}

              {/* Issue type */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold" style={{ color: "var(--t-subtle)" }}>Type of issue</label>
                <select value={issueType} onChange={e => setIssueType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                  style={{ background: "var(--t-input-bg, var(--t-surface))", border: "1px solid var(--t-border)", color: "var(--t-text)" }}>
                  <option value="">— Select issue type —</option>
                  {(TICKET_ISSUE_TYPES[category] ?? []).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold" style={{ color: "var(--t-subtle)" }}>Subject</label>
                <input value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder="Brief summary of your issue"
                  maxLength={200}
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                  style={{ background: "var(--t-input-bg, var(--t-surface))", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold" style={{ color: "var(--t-subtle)" }}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Describe your issue in detail…"
                  rows={4}
                  maxLength={4000}
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none resize-none"
                  style={{ background: "var(--t-input-bg, var(--t-surface))", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
                />
              </div>

              {submitError && <p className="text-xs text-red-500">{submitError}</p>}
              <button
                onClick={submitTicket}
                disabled={!subject.trim() || !description.trim() || submitting || (category === "group_buy" && !groupBuyId)}
                className="w-full py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
                style={{ background: "var(--t-blue-deep)", color: "#fff" }}>
                {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting…</span> : "Submit Ticket"}
              </button>
            </motion.div>
          )}

          {view === "list" && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--t-subtle)" }} />
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-14 space-y-2">
                  <MessageSquare className="w-9 h-9 mx-auto opacity-20" style={{ color: "var(--t-blue-deep)" }} />
                  <p className="text-xs font-medium" style={{ color: "var(--t-subtle)" }}>No tickets yet.</p>
                  <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>Tap New Ticket to raise a support request.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tickets.map(ticket => (
                    <button key={ticket.id} onClick={() => { setSelectedTicket(ticket); setView("detail"); }}
                      className="w-full text-left p-3.5 rounded-2xl transition-all group"
                      style={{
                        background: ticket.customerUnread ? "var(--t-blue-08, rgba(45,107,204,0.06))" : "var(--t-surface)",
                        border: `1px solid ${ticket.customerUnread ? "var(--t-blue)" : "var(--t-border)"}`,
                        boxShadow: ticket.customerUnread ? "0 0 0 1px var(--t-blue-20, rgba(45,107,204,0.2))" : "none",
                      }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold truncate" style={{ color: "var(--t-text)" }}>{ticket.subject}</p>
                            {ticket.customerUnread && (
                              <span className="shrink-0 w-2 h-2 rounded-full" style={{ background: "var(--t-blue)" }} />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[10px]" style={{ color: "var(--t-subtle)" }}>{TICKET_CATEGORY_LABELS[ticket.category]}</span>
                            <TicketStatusBadge status={ticket.status} />
                            {ticket.customerUnread && (
                              <span className="text-[10px] font-bold" style={{ color: "var(--t-blue)" }}>New reply</span>
                            )}
                          </div>
                          <p className="text-[10px] mt-1.5" style={{ color: "var(--t-subtle)" }}>
                            Updated {new Date(ticket.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" style={{ color: "var(--t-subtle)" }} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}


function PortalLayout({
  children, showHubNav = true, relative = false, navProps,
}: {
  children: React.ReactNode;
  showHubNav?: boolean;
  relative?: boolean;
  navProps: PortalNavProps;
}) {
  return (
    <PageLayout>
      <div className={`px-5 pt-6 lg:px-8 lg:pt-7 flex-1${relative ? " relative md:overflow-hidden" : ""}`}>
        {children}
      </div>
      {showHubNav && <HubBottomNav {...navProps} />}
    </PageLayout>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function CustomerPortal() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const _searchParams = new URLSearchParams(search);
  const gbId = _searchParams.get("gbId") ?? null;
  const _initSection = _searchParams.get("s") as Section | null;
  const _initTicketId = _searchParams.get("ticket") ?? null;
  const { account, isLoggedIn, isLoading: accountLoading } = useAccount();
  const qc = useQueryClient();
  const logoutMutation = useLogout();
  const { data: ordersData, isLoading: ordersLoading, refetch } = useAccountOrders(gbId, isLoggedIn);
  const { data: lateOptInGbs = [] } = useTestingLateOptIn(isLoggedIn);
  const { data: activePools = [] } = useTestingActivePools(isLoggedIn);
  const { data: gbPools = [] } = useTestingGbPools(isLoggedIn);
  const orders = (ordersData ?? []) as Order[];
  const { data: bloodTests = [] } = useBloodTests(isLoggedIn);
  const { data: compounds = [], isLoading: compoundsLoading } = useCompounds(isLoggedIn);
  const updateMut = useUpdateCompound();
  const deleteMut = useDeleteCompound();
  const { data: groupBuys = [], isLoading: gbLoading, refetch: refetchGb } = useMyGroupBuys(isLoggedIn);
  const { data: viewerAccessList = [] } = useViewerAccess(isLoggedIn);
  const { data: tgStatusPortal } = useTelegramStatus(isLoggedIn);
  const portalLinked = tgStatusPortal?.linked ?? false;
  const { data: healthSummary, isLoading: healthLoading } = useHealthSummary(isLoggedIn);
  const { data: glp1Logs = [], isLoading: glp1Loading } = useGlp1Logs(isLoggedIn);
  const createGlp1Mut = useCreateGlp1();
  const deleteGlp1Mut = useDeleteGlp1();
  const [section, setSection] = useState<Section>(
    _initTicketId ? "support"
    : _initSection && PORTAL_SECTIONS.includes(_initSection) ? _initSection
    : "home"
  );

  useEffect(() => {
    const s = new URLSearchParams(search).get("s") as Section | null;
    if (s && PORTAL_SECTIONS.includes(s)) setSection(s);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("s", section);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [section]);

  const [navCfg, setNavCfg] = useState<{ id: string; label: string; enabled: boolean }[]>([]);
  const [groupBuysPageMessage, setGroupBuysPageMessage] = useState<string | null>(null);
  const [gbMsgDismissed, setGbMsgDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/home-sections")
      .then(r => r.ok ? r.json() : { sections: [] })
      .then((d: { sections: { id: string; label: string; enabled: boolean }[] }) => {
        if (Array.isArray(d.sections) && d.sections.length > 0) setNavCfg(d.sections);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/config")
      .then(r => r.ok ? r.json() : {})
      .then((d: { groupBuysPageMessage?: string | null }) => {
        setGroupBuysPageMessage(d.groupBuysPageMessage ?? null);
        setGbMsgDismissed(false);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/inventory/uther-stock", { credentials: "include" })
      .then(r => r.ok ? r.json() : { items: [] })
      .then((d: { items?: { productName: string; qiyunleCode: string; stock: number }[] }) => {
        setPortalStockItems(d.items ?? []);
      })
      .catch(() => {});
  }, []);

  const [typeFilter, setTypeFilter] = useState<"all" | "gb" | "regular">("all");
  const [hubMoreOpen, setHubMoreOpen] = useState(false);
  const [showCompoundForm, setShowCompoundForm] = useState(false);
  const [showCompoundHistory, setShowCompoundHistory] = useState(false);
  const [infoGb, setInfoGb] = useState<GroupBuySummary | null>(null);
  const [parcelsGb, setParcelsGb] = useState<GroupBuySummary | null>(null);
  const [parcelsOrders, setParcelsOrders] = useState<Order[]>([]);
  const [portalStockItems, setPortalStockItems] = useState<{ productName: string; qiyunleCode: string; stock: number }[]>([]);
  const [showPortalStockModal, setShowPortalStockModal] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [leaveConfirmGb, setLeaveConfirmGb] = useState<GroupBuySummary | null>(null);
  const leaveGbMut = useLeaveGroupBuy();
  const updateCountryMut = useUpdateCountry();
  const [showCountryPrompt, setShowCountryPrompt] = useState(false);
  const [countryPromptValue, setCountryPromptValue] = useState("");

  const [organiserGbs, setOrganiserGbs] = useState<{ id: string; status: string }[]>([]);
  useEffect(() => {
    if (account?.organiserStatus !== "approved") return;
    fetch("/api/organiser/group-buys", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((data: { id: string; status: string }[]) => setOrganiserGbs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [account?.organiserStatus]);

  const [showGlp1Form, setShowGlp1Form] = useState(false);
  const [glp1WeightUnit, setGlp1WeightUnit] = useState<"kg" | "st" | "lbs">("kg");
  const [glp1SubTab, setGlp1SubTab] = useState<"summary" | "shots" | "settings">("summary");
  const [glp1ChartRange, setGlp1ChartRange] = useState<"4w" | "3m" | "all">("all");
  const [settingsHeight, setSettingsHeight] = useState("");
  const [settingsGoal, setSettingsGoal] = useState("");
  const [glp1HeightUnit, setGlp1HeightUnit] = useState<"cm" | "ft">("cm");
  const [heightFtStr, setHeightFtStr] = useState("");
  const [heightInStr, setHeightInStr] = useState("");
  const [goalDisplayStr, setGoalDisplayStr] = useState("");

  const [profileForm, setProfileForm] = useState<CustomerProfile>({ fullName: "", email: "", phone: "", address: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ─── Structured address ───────────────────────────────────────────────────
  const [addrForm, setAddrForm] = useState({ line1: "", line2: "", city: "", postcode: "", country: "", phone: "", phonePrefix: "+44" });
  const [addrSaving, setAddrSaving] = useState(false);
  const [addrMsg, setAddrMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ─── Address autocomplete (Nominatim/OSM) ─────────────────────────────────
  type AddrSug = { display: string; line1: string; city: string; postcode: string; country: string };
  const [addrSuggestions, setAddrSuggestions] = useState<AddrSug[]>([]);
  const [addrSugLoading, setAddrSugLoading] = useState(false);
  const [addrSugOpen, setAddrSugOpen] = useState(false);
  const addrSugTimer = useRef<ReturnType<typeof setTimeout>>();

  const searchAddress = useCallback((q: string) => {
    clearTimeout(addrSugTimer.current);
    if (q.length < 3) { setAddrSuggestions([]); setAddrSugOpen(false); return; }
    addrSugTimer.current = setTimeout(async () => {
      setAddrSugLoading(true);
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=6`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = await r.json() as Array<{ display_name: string; address: Record<string, string> }>;
        const sugs: AddrSug[] = data.map(item => {
          const a = item.address;
          const line1 = [a.house_number, a.road].filter(Boolean).join(" ") || item.display_name.split(",")[0];
          const city = a.city || a.town || a.village || a.suburb || a.county || "";
          const postcode = a.postcode || "";
          const country = COUNTRY_LIST.find(c => c.name.toLowerCase() === (a.country || "").toLowerCase())?.name || a.country || "";
          return { display: item.display_name, line1, city, postcode, country };
        });
        setAddrSuggestions(sugs);
        setAddrSugOpen(sugs.length > 0);
      } catch { /* network fail — silently ignore */ }
      setAddrSugLoading(false);
    }, 420);
  }, []);

  const pickAddrSuggestion = (s: AddrSug) => {
    setAddrForm(a => ({ ...a, line1: s.line1, city: s.city, postcode: s.postcode.toUpperCase(), country: s.country }));
    setAddrSugOpen(false);
    setAddrSuggestions([]);
  };

  const [usernameForm, setUsernameForm] = useState({ newUsername: "", currentPassword: "" });
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [showPwdCurrent, setShowPwdCurrent] = useState(false);
  const [showPwdNew, setShowPwdNew] = useState(false);
  const [showPwdConfirm, setShowPwdConfirm] = useState(false);
  const [showUsernamePwd, setShowUsernamePwd] = useState(false);

  const [healthConsent, setHealthConsent] = useState<boolean | null>(null);
  const [consentSaving, setConsentSaving] = useState(false);

  const [healthInsightsData, setHealthInsightsData] = useState<{ narrative: string; nextSteps: string; monitoring: Array<{ marker: string; reason: string }> } | null>(null);
  const [healthInsightsLoading, setHealthInsightsLoading] = useState(false);
  const [healthInsightsFetchedFor, setHealthInsightsFetchedFor] = useState<string | null>(null);

  const DEFAULT_DASH_ORDER = ["keyBio", "dist", "comparison", "nextSteps", "allBio", "monitoring"];

  const [dashPrefs, setDashPrefs] = useState<Record<string, boolean>>({});
  const [dashOrder, setDashOrder] = useState<string[]>(DEFAULT_DASH_ORDER);
  const [showDashCustomise, setShowDashCustomise] = useState(false);

  useEffect(() => {
    if (!accountLoading && !account) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      setLocation(`/login?next=${next}`);
    }
  }, [accountLoading, account, setLocation]);

  useEffect(() => {
    if (account && healthConsent === null) {
      setHealthConsent(account.healthDataConsent ?? false);
    }
  }, [account, healthConsent]);

  useEffect(() => {
    if (account && !accountLoading && !account.country) {
      setShowCountryPrompt(true);
    }
  }, [account, accountLoading]);

  // ── Migrate and load account-scoped localStorage settings ──────────────
  useEffect(() => {
    if (!account) return;
    const u = account.telegramUsername.replace(/^@/, "");
    function sk(key: string) { return `peps:${u}:${key}`; }
    function migrateGet(key: string): string | null {
      const scoped = localStorage.getItem(sk(key));
      if (scoped !== null) return scoped;
      const unscoped = localStorage.getItem(key);
      if (unscoped !== null) {
        localStorage.setItem(sk(key), unscoped);
        localStorage.removeItem(key);
        return unscoped;
      }
      return null;
    }

    // GLP-1 weight unit
    const wu = migrateGet("glp1_weight_unit") as "kg" | "st" | "lbs" | null;
    const resolvedWu = wu && ["kg", "st", "lbs"].includes(wu) ? wu : "kg";
    if (wu) setGlp1WeightUnit(resolvedWu);

    // GLP-1 height
    const heightCmStr = migrateGet("glp1_height_cm") ?? "";
    setSettingsHeight(heightCmStr);
    if (heightCmStr) {
      const cm = parseFloat(heightCmStr);
      if (!isNaN(cm)) {
        const totalIn = Math.round(cm / 2.54);
        setHeightFtStr(String(Math.floor(totalIn / 12)));
        setHeightInStr(String(totalIn % 12));
      }
    }

    // GLP-1 height unit
    const hu = migrateGet("glp1_height_unit") as "cm" | "ft" | null;
    if (hu && ["cm", "ft"].includes(hu)) setGlp1HeightUnit(hu);

    // GLP-1 goal
    const goalKgStr = migrateGet("glp1_goal_kg") ?? "";
    setSettingsGoal(goalKgStr);
    if (goalKgStr) {
      const kg = parseFloat(goalKgStr);
      if (!isNaN(kg)) {
        if (resolvedWu === "lbs") setGoalDisplayStr((kg * 2.20462).toFixed(1));
        else if (resolvedWu === "st") setGoalDisplayStr((kg / 6.35029).toFixed(1));
        else setGoalDisplayStr(kg.toFixed(1));
      }
    }

    // Health dashboard prefs
    const rawPrefs = migrateGet("health-dashboard-prefs");
    if (rawPrefs) {
      try { setDashPrefs(JSON.parse(rawPrefs) as Record<string, boolean>); } catch { /* ignore */ }
    }

    // Health dashboard order
    const rawOrder = migrateGet("health-dashboard-order");
    if (rawOrder) {
      try {
        const saved = JSON.parse(rawOrder) as string[] | null;
        if (Array.isArray(saved) && saved.length > 0) {
          const all = new Set(DEFAULT_DASH_ORDER);
          const filtered = saved.filter(k => all.has(k));
          const missing = DEFAULT_DASH_ORDER.filter(k => !filtered.includes(k));
          setDashOrder([...filtered, ...missing]);
        }
      } catch { /* ignore */ }
    }

    // btDashPrefs migration
    migrateGet("btDashPrefs");

    // btDashView migration
    migrateGet("btDashView");
  }, [account]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (section !== "health" || healthLoading || !healthSummary || healthSummary.biomarkers.length === 0) return;
    const key = healthSummary.lastTestDate ?? "unknown";
    if (healthInsightsFetchedFor === key) return;
    setHealthInsightsLoading(true);
    fetch("/api/account/health-insights", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        setHealthInsightsData(d as { narrative: string; nextSteps: string; monitoring: Array<{ marker: string; reason: string }> });
        setHealthInsightsFetchedFor(key);
      })
      .catch(() => {})
      .finally(() => setHealthInsightsLoading(false));
  }, [section, healthLoading, healthSummary, healthInsightsFetchedFor]);

  function saveDashPrefs(prefs: Record<string, boolean>) {
    setDashPrefs(prefs);
    if (typeof window !== "undefined") {
      const u = account ? account.telegramUsername.replace(/^@/, "") : "";
      localStorage.setItem(u ? `peps:${u}:health-dashboard-prefs` : "health-dashboard-prefs", JSON.stringify(prefs));
    }
  }
  function saveDashOrder(order: string[]) {
    setDashOrder(order);
    if (typeof window !== "undefined") {
      const u = account ? account.telegramUsername.replace(/^@/, "") : "";
      localStorage.setItem(u ? `peps:${u}:health-dashboard-order` : "health-dashboard-order", JSON.stringify(order));
    }
  }
  function dashVisible(key: string): boolean {
    return dashPrefs[key] !== false;
  }
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  function handleDashDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const from = dashOrder.indexOf(active.id as string);
      const to   = dashOrder.indexOf(over.id as string);
      if (from !== -1 && to !== -1) saveDashOrder(arrayMove(dashOrder, from, to));
    }
  }

  async function toggleHealthConsent() {
    if (consentSaving) return;
    const newVal = !healthConsent;
    setConsentSaving(true);
    try {
      const res = await fetch("/api/account/health-consent", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: newVal }),
      });
      if (res.ok) setHealthConsent(newVal);
    } finally {
      setConsentSaving(false);
    }
  }

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const res = await fetch("/api/account/profile", { credentials: "include" });
      const data = await res.json();
      if (res.ok && data.profile) {
        setProfileForm({
          fullName: data.profile.fullName ?? "",
          email: data.profile.email ?? "",
          phone: data.profile.phone ?? "",
          address: data.profile.address ?? "",
        });
      }
    } catch { /* ignore */ }
    setProfileLoading(false);
  }, []);

  useEffect(() => { if (account) fetchProfile(); }, [account, fetchProfile]);

  const saveProfile = async () => {
    setProfileSaving(true); setProfileMsg(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setProfileMsg({ ok: true, text: "Details saved!" });
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (e: unknown) {
      setProfileMsg({ ok: false, text: e instanceof Error ? e.message : "Failed to save" });
    }
    setProfileSaving(false);
  };

  // Pre-fill address from account
  useEffect(() => {
    if (account) {
      setAddrForm({
        line1: account.addressLine1 ?? "",
        line2: account.addressLine2 ?? "",
        city: account.addressCity ?? "",
        postcode: account.addressPostcode ?? "",
        country: account.addressCountry ?? account.country ?? "",
        phone: (account as Record<string, unknown>).addressPhone as string ?? "",
        phonePrefix: (account as Record<string, unknown>).addressPhonePrefix as string ?? "+44",
      });
    }
  }, [account]);

  const saveAddress = async () => {
    setAddrSaving(true); setAddrMsg(null);
    try {
      const res = await fetch("/api/account/address", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressLine1: addrForm.line1,
          addressLine2: addrForm.line2,
          addressCity: addrForm.city,
          addressPostcode: addrForm.postcode,
          country: addrForm.country,
          addressPhone: addrForm.phone,
          addressPhonePrefix: addrForm.phonePrefix,
        }),
        credentials: "include",
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Save failed"); }
      setAddrMsg({ ok: true, text: "Address saved!" });
      setTimeout(() => setAddrMsg(null), 3000);
      qc.invalidateQueries({ queryKey: ["account", "me"] });
    } catch (e: unknown) {
      setAddrMsg({ ok: false, text: e instanceof Error ? e.message : "Failed to save" });
    }
    setAddrSaving(false);
  };

  const saveUsername = async () => {
    if (!usernameForm.newUsername.trim()) { setUsernameMsg({ ok: false, text: "New username is required" }); return; }
    if (!usernameForm.currentPassword) { setUsernameMsg({ ok: false, text: "Current password is required" }); return; }
    setUsernameSaving(true); setUsernameMsg(null);
    try {
      const res = await fetch("/api/account/change-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(usernameForm),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change username");
      setUsernameMsg({ ok: true, text: `Username changed to @${data.newUsername}! Reloading…` });
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: unknown) {
      setUsernameMsg({ ok: false, text: e instanceof Error ? e.message : "Failed to change username" });
    }
    setUsernameSaving(false);
  };

  const savePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ ok: false, text: "New passwords do not match" }); return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordMsg({ ok: false, text: "Password must be at least 8 characters" }); return;
    }
    setPasswordSaving(true); setPasswordMsg(null);
    try {
      const res = await fetch("/api/account/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, password: passwordForm.newPassword }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password");
      setPasswordMsg({ ok: true, text: "Password changed successfully!" });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setPasswordMsg(null), 4000);
    } catch (e: unknown) {
      setPasswordMsg({ ok: false, text: e instanceof Error ? e.message : "Failed to change password" });
    }
    setPasswordSaving(false);
  };

  const handleLogout = () => { logoutMutation.mutate(); setLocation("/"); };
  const handleManage = (order: Order) => setLocation(`/account/orders/${order.id}`);
  const handleReorder = (order: Order) => {
    const qtyMap: Record<string, number> = {};
    for (const li of order.lineItems) {
      if (li.productId) qtyMap[li.productId] = li.quantity;
    }
    if (Object.keys(qtyMap).length > 0) {
      sessionStorage.setItem("peps:reorder-wholesale", JSON.stringify(qtyMap));
    }
    setLocation("/wholesale");
  };

  if (accountLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg }}>
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: T.subtle }} />
      </div>
    );
  }
  if (!account) return null;

  const filteredByGb = gbId ? orders.filter(o => o.groupBuyId === gbId) : orders;

  // ── Group buy orders split ──────────────────────────────────────────────────
  // Build a fast lookup from GB id → summary
  const gbMap = new Map(groupBuys.map(gb => [gb.id, gb]));
  const isActive = (o: Order) => ["Draft", "Submitted", "Processing", "Shipped"].includes(o.status);
  const isPrev   = (o: Order) => ["Completed", "Cancelled"].includes(o.status);

  // Regular (non-GB) orders
  const regularOrders   = filteredByGb.filter(o => !o.groupBuyId);
  const regularActive   = regularOrders.filter(isActive);
  const regularPrevious = regularOrders.filter(isPrev);

  // GB orders: group by groupBuyId → { gb, orders[] }
  const gbGroupMap = new Map<string, { gb: GroupBuySummary | null; orders: Order[] }>();
  for (const o of filteredByGb) {
    if (!o.groupBuyId) continue;
    if (!gbGroupMap.has(o.groupBuyId)) gbGroupMap.set(o.groupBuyId, { gb: gbMap.get(o.groupBuyId) ?? null, orders: [] });
    gbGroupMap.get(o.groupBuyId)!.orders.push(o);
  }
  const gbOrderGroups = Array.from(gbGroupMap.entries()).map(([gbId, val]) => ({ gbId, ...val }));

  const gbActiveCount   = gbOrderGroups.reduce((n, g) => n + g.orders.filter(isActive).length, 0);
  const gbPreviousCount = gbOrderGroups.reduce((n, g) => n + g.orders.filter(isPrev).length, 0);
  const username = account.telegramUsername.replace(/^@/, "");

  const latestTest = bloodTests.length > 0
    ? [...bloodTests].sort((a, b) => b.testDate.localeCompare(a.testDate))[0]
    : null;
  const activeCompounds = compounds.filter(c => !c.endDate);
  const pastCompounds = compounds.filter(c => !!c.endDate);

  function handleEndCompound(id: string) {
    const today = new Date().toISOString().split("T")[0];
    updateMut.mutate({ id, endDate: today });
  }

  // ─── Layout wrapper ─────────────────────────────────────────────────────────

  const hasTestingOpt = orders.some(o => (o.testingContribution ?? 0) > 0) || activePools.length > 0 || lateOptInGbs.length > 0 || gbPools.length > 0;
  const DEFAULT_NAV_ORDER: Section[] = hasTestingOpt
    ? ["home","orders","groups","lab-pool","gb-testing","compounds","blood-tests","health","glp1","plotter","profile","telegram","support"]
    : ["home","orders","groups","compounds","blood-tests","health","glp1","plotter","profile","telegram","support"];

  const ALWAYS_INCLUDE: Section[] = ["support"];
  const _navFromCfg: Section[] = navCfg.length > 0
    ? [
        ...navCfg
          .filter(c => c.id === "home" || c.enabled)
          .map(c => c.id as Section)
          .filter(id => PORTAL_SECTIONS.includes(id) && !ALWAYS_INCLUDE.includes(id as Section)),
        ...ALWAYS_INCLUDE,
      ]
    : [];

  const _navOrderBase: Section[] = _navFromCfg.length > 0 ? _navFromCfg : DEFAULT_NAV_ORDER;
  const _navOrder: Section[] = hasTestingOpt && !_navOrderBase.includes("lab-pool")
    ? ["home", "orders", "groups", "lab-pool", ..._navOrderBase.filter(id => !["home","orders","groups","lab-pool"].includes(id))]
    : _navOrderBase;

  const _sortedNav: Section[] = ["home", ..._navOrder.filter(id => id !== "home")];

  const navProps: PortalNavProps = { section, setSection, hubMoreOpen, setHubMoreOpen, account, navOrder: _sortedNav };

  // ─── Home dashboard ──────────────────────────────────────────────────────────

  if (section === "home") {
    const cardStyle: React.CSSProperties = {
      background: T.surface,
      border: `1px solid ${T.border}`,
      boxShadow: T.shadow,
      borderRadius: "12px",
    };

    const statTiles = [
      { id: "orders" as Section, label: "My Orders", count: orders.length, color: "var(--t-blue)", Icon: Package },
      { id: "compounds" as Section, label: "Active Compounds", count: activeCompounds.length, color: "#16A34A", Icon: Syringe },
      { id: "blood-tests" as Section, label: "Blood Tests", count: bloodTests.length, color: "#7C3AED", Icon: FlaskConical },
    ];

    const glp1SparkData = [...glp1Logs]
      .sort((a, b) => a.loggedDate.localeCompare(b.loggedDate))
      .filter(l => l.weightKg != null)
      .slice(-8)
      .map((l, i) => ({ i, w: parseFloat(l.weightKg!) }));

    const recentOrders = [...orders]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 3);

    const recentCompounds = activeCompounds.slice(0, 3);

    const isOrganiser = account?.organiserStatus === "approved";
    const activeGbCount = organiserGbs.filter(g => g.status === "active").length;
    const draftGbCount = organiserGbs.filter(g => g.status === "draft").length;
    const totalGbCount = organiserGbs.filter(g => g.status !== "archived").length;

    return (
      <PageLayout>
        <div className="flex flex-col" style={{ background: T.bg }}>

          {/* ── Full-width: Hero + Tiles + Recent Orders + Active Compounds ─── */}
          <div
            className="flex flex-col w-full"
            style={{ padding: "28px 32px 32px", maxWidth: "860px" }}
          >
            {/* Hero */}
            <div style={{ marginBottom: "28px", paddingBottom: "22px", borderBottom: `1px solid ${T.border}` }}>
              <p className="section-label" style={{ marginBottom: "12px" }}>Profile Hub</p>
              <h1 className="font-display font-extrabold" style={{ fontSize: "40px", color: T.text, letterSpacing: "-0.02em", lineHeight: 1 }}>
                Welcome back, <span style={{ color: "var(--t-blue)" }}>@{username}</span>
              </h1>
            </div>

            {/* ── Overview ── */}
            <p className="section-label" style={{ marginBottom: "10px" }}>Overview</p>

            {/* Stat tiles: 2×2 mobile → 4×1 lg */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" style={{ marginBottom: "20px" }}>
              {statTiles.map(({ id, label, count, color, Icon }) => (
                <button
                  key={id}
                  onClick={() => setSection(id)}
                  className="relative flex flex-col items-start text-left rounded-xl p-4 transition-opacity hover:opacity-75"
                  style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: T.shadow }}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-3" style={{ background: T.surface2 }}>
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                  <p className="text-[26px] font-extrabold leading-none" style={{ color: T.text, letterSpacing: "-0.02em" }}>{count}</p>
                  <p className="text-[10px] font-semibold mt-1 leading-tight" style={{ color: T.muted }}>{label}</p>
                  <ArrowRight className="absolute top-3.5 right-3.5 w-3 h-3" style={{ color: T.subtle }} />
                </button>
              ))}
              {/* GLP-1 sparkline tile */}
              <button
                onClick={() => setSection("glp1")}
                className="relative flex flex-col items-start text-left rounded-xl p-4 transition-opacity hover:opacity-75 overflow-hidden"
                style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: T.shadow }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-3" style={{ background: T.surface2 }}>
                  <Scale className="w-3.5 h-3.5" style={{ color: "#0891B2" }} />
                </div>
                <p className="text-[26px] font-extrabold leading-none" style={{ color: T.text, letterSpacing: "-0.02em" }}>{glp1Logs.length}</p>
                <p className="text-[10px] font-semibold mt-1 leading-tight" style={{ color: T.muted }}>GLP-1 Entries</p>
                <ArrowRight className="absolute top-3.5 right-3.5 w-3 h-3" style={{ color: T.subtle }} />
                {glp1SparkData.length >= 2 && (
                  <div className="absolute bottom-0 left-0 right-0 h-10 opacity-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={glp1SparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0891B2" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#0891B2" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="w" stroke="#0891B2" strokeWidth={1.5} fill="url(#sparkGrad)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </button>
            </div>

            {/* Credits balance banner — show when account has any credits or a non-zero amount */}
            {account && typeof account.credits === "number" && (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
                style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: T.shadow }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--t-blue-08)" }}>
                  <Wallet className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--t-blue)" }}>Store Credits</p>
                  <p className="text-lg font-extrabold leading-tight" style={{ color: T.text, letterSpacing: "-0.02em" }}>
                    ${account.credits.toFixed(2)}
                  </p>
                </div>
                <p className="text-xs shrink-0" style={{ color: T.muted }}>Available balance</p>
              </div>
            )}

            {/* ── Special Access Grants ── */}
            {viewerAccessList.length > 0 && (
              <div className="mb-4">
                <p className="section-label" style={{ marginBottom: "10px" }}>Special Access</p>
                <div className="flex flex-col gap-2">
                  {viewerAccessList.map((entry: ViewerAccessEntry) => (
                    <div key={entry.id}
                      className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                      style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
                      <p className="text-sm font-semibold truncate" style={{ color: T.text }}>{entry.name}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        {entry.hasQrAccess && (
                          <button
                            onClick={() => setLocation(`/qr-viewer/${entry.id}`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-opacity hover:opacity-75"
                            style={{ background: "rgba(22,163,74,0.10)", color: "#16A34A", border: "1px solid rgba(22,163,74,0.2)" }}>
                            <QrCode className="w-3 h-3" /> QR Viewer
                          </button>
                        )}
                        {entry.hasLegAccess && (
                          <button
                            onClick={() => setLocation(`/leg-view/${entry.id}`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-opacity hover:opacity-75"
                            style={{ background: "rgba(124,58,237,0.10)", color: "#7C3AED", border: "1px solid rgba(124,58,237,0.2)" }}>
                            <MapPin className="w-3 h-3" /> Leg Viewer
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GB Metrics — only for approved organisers */}
            {isOrganiser && (
              <div
                style={{
                  marginBottom: "16px",
                  borderRadius: "12px",
                  background: "var(--t-blue-08)",
                  border: "1px solid var(--t-blue-20)",
                  boxShadow: T.shadow,
                  overflow: "hidden",
                }}
              >
                {/* Card header */}
                <div
                  className="flex items-center justify-between px-5 py-3"
                  style={{ borderBottom: "1px solid var(--t-blue-20)" }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center"
                      style={{ background: "var(--t-blue-deep)" }}
                    >
                      <Store className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--t-blue-deep)" }}>
                      GB Metrics
                    </span>
                  </div>
                  <button
                    onClick={() => setLocation("/gborganiser")}
                    className="text-[11px] font-semibold flex items-center gap-1 transition-opacity hover:opacity-60"
                    style={{ color: "var(--t-blue-deep)" }}
                  >
                    Go to Organiser <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Metric columns */}
                <div className="grid grid-cols-3">
                  {[
                    { label: "Active GBs", value: activeGbCount, color: "#16A34A" },
                    { label: "Draft GBs", value: draftGbCount, color: "var(--t-blue-deep)" },
                    { label: "Total GBs", value: totalGbCount, color: T.text },
                  ].map(({ label, value, color }, i) => (
                    <div
                      key={label}
                      className="flex flex-col items-center py-4 px-2"
                      style={i > 0 ? { borderLeft: "1px solid var(--t-blue-20)" } : {}}
                    >
                      <p className="text-[28px] font-extrabold leading-none tabular-nums" style={{ color, letterSpacing: "-0.02em" }}>{value}</p>
                      <p className="text-[10px] font-semibold mt-1 text-center" style={{ color: T.muted }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Activity ── */}
            <p className="section-label" style={{ marginBottom: "10px", marginTop: "8px" }}>Activity</p>

            {/* Recent Orders */}
            <div style={{ ...cardStyle, padding: "16px 20px", marginBottom: "16px" }}>
              <div className="flex items-center justify-between" style={{ marginBottom: "12px", paddingBottom: "10px", borderBottom: `1px solid ${T.border}` }}>
                <span className="section-label">Recent Orders</span>
                {orders.length > 0 && (
                  <button
                    onClick={() => setSection("orders")}
                    className="text-[11px] font-semibold flex items-center gap-1 transition-opacity hover:opacity-60"
                    style={{ color: "var(--t-blue)" }}
                  >
                    View all <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              {recentOrders.length === 0 ? (
                <p className="text-[12px] py-3 text-center" style={{ color: T.muted }}>No orders yet</p>
              ) : (
                recentOrders.map((order, i) => {
                  const sm = STATUS_META[order.status] ?? { label: order.status, color: T.muted, bg: T.surface2, icon: FileText };
                  const SmIcon = sm.icon;
                  return (
                    <button
                      key={order.id}
                      onClick={() => setSection("orders")}
                      className="w-full flex items-center gap-3 py-3 text-left transition-opacity hover:opacity-75"
                      style={{ borderBottom: i < recentOrders.length - 1 ? `1px solid ${T.border}` : "none" }}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: sm.bg }}>
                        <SmIcon className="w-3.5 h-3.5" style={{ color: sm.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold" style={{ color: T.text }}>{order.code}</p>
                        <span
                          className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                          style={{ background: sm.bg, color: sm.color }}
                        >{sm.label}</span>
                      </div>
                      <p className="text-[12px] font-semibold shrink-0" style={{ color: T.text }}>{fmtC(order.grandTotal, order.currency)}</p>
                    </button>
                  );
                })
              )}
            </div>

            {/* Active Compounds */}
            <div style={{ ...cardStyle, padding: "16px 20px" }}>
              <div className="flex items-center justify-between" style={{ marginBottom: "12px", paddingBottom: "10px", borderBottom: `1px solid ${T.border}` }}>
                <span className="section-label">Active Compounds</span>
                {activeCompounds.length > 0 && (
                  <button
                    onClick={() => setSection("compounds")}
                    className="text-[11px] font-semibold flex items-center gap-1 transition-opacity hover:opacity-60"
                    style={{ color: "#16A34A" }}
                  >
                    View all <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              {recentCompounds.length === 0 ? (
                <p className="text-[12px] py-3 text-center" style={{ color: T.muted }}>No active compounds</p>
              ) : (
                recentCompounds.map((c, i) => {
                  const meta = TYPE_META[c.compoundType] ?? TYPE_META["Other"];
                  const CIcon = meta.Icon;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSection("compounds")}
                      className="w-full flex items-center gap-3 py-3 text-left transition-opacity hover:opacity-75"
                      style={{ borderBottom: i < recentCompounds.length - 1 ? `1px solid ${T.border}` : "none" }}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: T.surface2 }}>
                        <CIcon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold truncate" style={{ color: T.text }}>{c.compoundName}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: T.muted }}>{c.doseAmount}{c.doseUnit} · {c.frequency}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* ── Quick Access ── */}
            <p className="section-label" style={{ marginBottom: "10px", marginTop: "24px" }}>Quick Access</p>
            <div className="grid grid-cols-2 gap-3" style={{ marginBottom: "8px" }}>
              {[
                { label: "Shop",        sub: "Browse vials",    Icon: Store,          action: () => setLocation("/shop"),           color: "var(--t-blue)",  bg: "var(--t-blue-08)" },
                { label: "Group Buys",  sub: "Join a pool",     Icon: UsersRound,     action: () => setSection("groups"),           color: "#16A34A",        bg: "rgba(22,163,74,0.08)" },
                { label: "Lab Pool",    sub: "Testing pools",   Icon: TestTube,       action: () => setSection("lab-pool"),         color: "#8B5CF6",        bg: "rgba(139,92,246,0.08)" },
                { label: "Health Hub",  sub: "Health areas",    Icon: HeartPulse,     action: () => setSection("health-hub"),       color: "#7C3AED",        bg: "rgba(124,58,237,0.08)" },
              ].map(({ label, sub, Icon, action, color, bg }) => (
                <button
                  key={label}
                  onClick={action}
                  className="flex flex-col items-start rounded-xl p-4 transition-opacity hover:opacity-75 text-left"
                  style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: T.shadow }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: bg }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <p className="text-[12px] font-bold leading-tight" style={{ color: T.text }}>{label}</p>
                  <p className="text-[10px] mt-0.5 leading-tight" style={{ color: T.muted }}>{sub}</p>
                </button>
              ))}
            </div>

            {/* Sign out */}
            <div className="pt-6 mt-2">
              <div className="flex items-center pt-5" style={{ borderTop: `1px solid ${T.border}` }}>
                <button
                  onClick={handleLogout}
                  className="text-[10px] transition-opacity hover:opacity-50"
                  style={{ color: T.subtle }}
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
        <HubBottomNav {...navProps} />
      </PageLayout>
    );
  }

  // ─── Health Hub section ───────────────────────────────────────────────────────

  if (section === "health-hub") {
    const HEALTH_AREAS: { id: Section; label: string; description: string; Icon: React.ElementType; color: string; bg: string }[] = [
      { id: "glp1",        label: "GLP-1 Tracker",              description: "Log your GLP-1 shots and track weight trends over time.",              Icon: Scale,       color: "#0891B2",        bg: "rgba(8,145,178,0.08)"   },
      { id: "compounds",   label: "Compounds & Protocols",      description: "Track your active compounds, doses, and cycling protocols.",           Icon: FlaskConical, color: "#16A34A",        bg: "rgba(22,163,74,0.08)"   },
      { id: "blood-tests", label: "Blood Tests",                description: "Upload and analyse your blood work results.",                          Icon: FlaskConical, color: "#7C3AED",        bg: "rgba(124,58,237,0.08)"  },
      { id: "health",      label: "Health Insights",            description: "AI-powered biomarker analysis and health trend summaries.",            Icon: HeartPulse,   color: "#DC2626",        bg: "rgba(220,38,38,0.08)"   },
      { id: "plotter",     label: "Cycle Plotter",              description: "Visualise your steroid and peptide cycles on a timeline.",             Icon: TrendingUp,   color: "var(--t-blue)",  bg: "var(--t-blue-08)"       },
      { id: "fh-risk",            label: "Inherited Cholesterol Risk", description: "Assess your risk of Familial Hypercholesterolaemia using Simon Broome or Dutch DLCN criteria.", Icon: HeartPulse, color: "#DC2626", bg: "rgba(220,38,38,0.08)" },
      { id: "insulin-resistance", label: "Insulin Resistance Score",   description: "Estimate your metabolic risk using the HOMA-IR model with fasting glucose and insulin levels.",   Icon: Activity,  color: "#0891B2", bg: "rgba(8,145,178,0.08)"  },
    ];
    return (
      <PageLayout>
        <div className="flex flex-col" style={{ background: T.bg }}>
          <div className="flex flex-col w-full" style={{ padding: "28px 32px 32px", maxWidth: "860px" }}>
            <div style={{ marginBottom: "28px", paddingBottom: "22px", borderBottom: `1px solid ${T.border}` }}>
              <button
                onClick={() => setSection("home")}
                className="flex items-center gap-1.5 text-[11px] font-semibold mb-4 transition-opacity hover:opacity-60"
                style={{ color: "var(--t-blue)" }}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back to Hub
              </button>
              <p className="section-label" style={{ marginBottom: "8px" }}>Health</p>
              <h1 className="font-display font-extrabold" style={{ fontSize: "32px", color: T.text, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                Your Health Areas
              </h1>
              <p className="text-[13px] mt-2" style={{ color: T.muted }}>
                Track, analyse, and manage all aspects of your health in one place.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {HEALTH_AREAS.map(({ id, label, description, Icon, color, bg }) => (
                <button
                  key={id}
                  onClick={() => setSection(id)}
                  className="flex items-center gap-4 p-5 rounded-xl text-left transition-opacity hover:opacity-80"
                  style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: T.shadow }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold leading-tight" style={{ color: T.text }}>{label}</p>
                    <p className="text-[12px] mt-1 leading-snug" style={{ color: T.muted }}>{description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0" style={{ color: T.subtle }} />
                </button>
              ))}
            </div>
          </div>
        </div>
        <HubBottomNav {...navProps} />
      </PageLayout>
    );
  }

  // ─── FH Risk Calculator section ──────────────────────────────────────────────

  if (section === "fh-risk") {
    return (
      <PageLayout>
        <div className="flex flex-col" style={{ background: T.bg }}>
          <div className="flex flex-col w-full" style={{ padding: "20px 16px 32px", maxWidth: "640px" }}>
            <button
              onClick={() => setSection("health-hub")}
              className="flex items-center gap-1.5 text-[11px] font-semibold mb-4 transition-opacity hover:opacity-60"
              style={{ color: "var(--t-blue)" }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back to Health
            </button>
            <FHRiskContent />
          </div>
        </div>
        <HubBottomNav {...navProps} />
      </PageLayout>
    );
  }

  // ─── Insulin Resistance section ──────────────────────────────────────────────

  if (section === "insulin-resistance") {
    return (
      <PageLayout>
        <div className="flex flex-col" style={{ background: T.bg }}>
          <div className="flex flex-col w-full" style={{ padding: "20px 16px 32px", maxWidth: "640px" }}>
            <button
              onClick={() => setSection("health-hub")}
              className="flex items-center gap-1.5 text-[11px] font-semibold mb-4 transition-opacity hover:opacity-60"
              style={{ color: "var(--t-blue)" }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back to Health
            </button>
            <InsulinResistanceContent />
          </div>
        </div>
        <HubBottomNav {...navProps} />
      </PageLayout>
    );
  }

  // ─── Lab Pool section ────────────────────────────────────────────────────────

  if (section === "lab-pool") {
    return (
      <PageLayout>
        <div className="flex flex-col" style={{ background: T.bg }}>
          <div className="flex flex-col w-full" style={{ padding: "28px 32px 32px", maxWidth: "860px" }}>
            <div style={{ marginBottom: "28px", paddingBottom: "22px", borderBottom: `1px solid ${T.border}` }}>
              <button
                onClick={() => setSection("home")}
                className="flex items-center gap-1.5 text-[11px] font-semibold mb-4 transition-opacity hover:opacity-60"
                style={{ color: "var(--t-blue)" }}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back to Hub
              </button>
              <p className="section-label" style={{ marginBottom: "8px" }}>Lab Testing</p>
              <h1 className="font-display font-extrabold" style={{ fontSize: "32px", color: T.text, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                Apply to become a Testing Pool Leader
              </h1>
              <p className="text-[13px] mt-2" style={{ color: T.muted }}>
                Run community-funded third-party lab testing rounds. View your contributions and manage your standalone pools below.
              </p>
            </div>

            {/* ── My Contributions ── */}
            <div style={{ marginBottom: 28 }}>
              <p className="section-label" style={{ marginBottom: 12 }}>My Contributions</p>
              <AccountPoolContributions />
            </div>

            {/* ── Pool Leader dashboard ── */}
            <div style={{ marginBottom: 28 }}>
              <p className="section-label" style={{ marginBottom: 12 }}>Standalone Testing Pools</p>
              <PoolLeaderDashboard />
            </div>

          </div>
        </div>
        <HubBottomNav {...navProps} />
      </PageLayout>
    );
  }

  // ─── GB Testing section ──────────────────────────────────────────────────────

  if (section === "gb-testing") {
    const fmtUsd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
    const statusLabel: Record<string, string> = {
      active: "Voting open",
      collecting: "Collecting",
      closed: "Closed",
      results_received: "Results in",
    };
    return (
      <PageLayout>
        <div className="flex flex-col" style={{ background: T.bg }}>
          <div className="flex flex-col w-full" style={{ padding: "28px 32px 32px", maxWidth: "860px" }}>
            <div style={{ marginBottom: "28px", paddingBottom: "22px", borderBottom: `1px solid ${T.border}` }}>
              <button
                onClick={() => setSection("home")}
                className="flex items-center gap-1.5 text-[11px] font-semibold mb-4 transition-opacity hover:opacity-60"
                style={{ color: "var(--t-blue)" }}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back to Hub
              </button>
              <p className="section-label" style={{ marginBottom: "8px" }}>Lab Testing</p>
              <h1 className="font-display font-extrabold" style={{ fontSize: "32px", color: T.text, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                GB Testing
              </h1>
              <p className="text-[13px] mt-2" style={{ color: T.muted }}>
                Lab testing pools for group buys you're part of.
              </p>
            </div>

            {gbPools.length === 0 ? (
              <div className="text-center py-16">
                <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: T.muted }} />
                <p className="text-sm font-semibold" style={{ color: T.text }}>No testing pools yet</p>
                <p className="text-xs mt-1" style={{ color: T.muted }}>Testing pools for your group buys will appear here.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {gbPools.map(pool => {
                  const isOptedIn = pool.isOptedIn;
                  const canLate = pool.canLateOptIn;
                  const isDone = pool.roundStatus === "results_received";

                  const accentColor = isOptedIn
                    ? "var(--t-blue)"
                    : canLate
                    ? "#B45309"
                    : T.muted;
                  const bgColor = isOptedIn
                    ? "rgba(59,130,246,0.06)"
                    : canLate
                    ? "rgba(245,158,11,0.06)"
                    : T.surface;
                  const borderColor = isOptedIn
                    ? "rgba(59,130,246,0.25)"
                    : canLate
                    ? "rgba(245,158,11,0.35)"
                    : T.border;

                  const badge = isOptedIn
                    ? "Opted in"
                    : canLate
                    ? "Late opt-in available"
                    : "Member — not opted in";

                  const sub = isOptedIn
                    ? (statusLabel[pool.roundStatus] ?? pool.roundStatus)
                    : canLate
                    ? `You can still contribute${pool.anyContribution ? "" : ` — ${fmtUsd(pool.contributionAmount)}`}`
                    : "View pool progress and results";

                  return (
                    <div
                      key={pool.gbId}
                      className="flex items-center gap-4 p-5 cursor-pointer transition-opacity hover:opacity-80"
                      style={{ background: bgColor, border: `1.5px solid ${borderColor}`, borderRadius: 8 }}
                      onClick={() => setLocation(`/testing/${pool.gbId}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === "Enter" && setLocation(`/testing/${pool.gbId}`)}
                    >
                      <div
                        className="w-12 h-12 flex items-center justify-center shrink-0"
                        style={{ borderRadius: 8, background: isOptedIn ? "rgba(59,130,246,0.12)" : canLate ? "rgba(245,158,11,0.12)" : "rgba(100,100,100,0.08)" }}
                      >
                        <FlaskConical className="w-5 h-5" style={{ color: accentColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[14px] font-bold leading-tight" style={{ color: T.text }}>{pool.gbName}</p>
                          {isDone && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.12)", color: "#059669" }}>Results in</span>
                          )}
                        </div>
                        <p className="text-[12px] mt-0.5 font-semibold" style={{ color: accentColor }}>{badge}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>{sub}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <HubBottomNav {...navProps} />
      </PageLayout>
    );
  }

  // ─── Orders section ──────────────────────────────────────────────────────────

  if (section === "orders") {
    const totalActive   = regularActive.length + gbActiveCount;
    const totalPrevious = regularPrevious.length + gbPreviousCount;
    const totalOrders   = filteredByGb.length;
    const completed     = filteredByGb.filter(o => o.status === "Completed").length;

    // Show all orders combined (no active/history split)
    const shownRegular = regularOrders;

    const hasRegular = shownRegular.length > 0;
    const hasGb      = gbOrderGroups.length > 0;
    const showGb      = hasGb      && (typeFilter === "all" || typeFilter === "gb");
    const showRegular = hasRegular && (typeFilter === "all" || typeFilter === "regular");
    const nothingAtAll = !ordersLoading && !showGb && !showRegular;

    return (
      <PortalLayout navProps={navProps}>
        {/* ── Gradient hero header (full-bleed) ── */}
        <div
          className="-mx-5 -mt-6 lg:-mx-8 lg:-mt-7 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, var(--brand-navy) 0%, var(--brand-blue) 100%)" }}
        >
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white 0%, transparent 60%)" }} />
          <div className="relative px-5 pt-5 pb-8 lg:px-8 lg:pt-6">
            {/* Back + refresh */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => setSection("home")}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.12)" }}>
                <ArrowLeft className="w-4 h-4" style={{ color: "rgba(255,255,255,0.9)" }} />
              </button>
              <button onClick={() => refetch()} disabled={ordersLoading}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.12)" }}>
                <RefreshCw className={`w-4 h-4 ${ordersLoading ? "animate-spin" : ""}`} style={{ color: "rgba(255,255,255,0.7)" }} />
              </button>
            </div>
            {/* Title */}
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>Customer Portal</p>
              <h1 className="text-2xl font-bold text-white leading-tight">My Orders</h1>
            </div>
            {/* Inline stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Total",  value: totalOrders },
                { label: "Active", value: totalActive  },
                { label: "Done",   value: completed    },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: "rgba(255,255,255,0.12)" }}>
                  <p className="text-[22px] font-bold text-white leading-none mb-1">{s.value}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.6)" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Bottom curve into content */}
          <div className="absolute bottom-0 left-0 right-0 h-5"
            style={{ background: T.bg, borderRadius: "20px 20px 0 0" }} />
        </div>

        {/* ── Content area with light background ── */}
        <div className="-mx-5 lg:-mx-8 px-5 lg:px-8 pb-8" style={{ background: T.bg }}>
        <div className="space-y-4 pt-2">

          {/* ── Type filter pills ── */}
          <div className="flex gap-1.5">
            {([ { id: "all" as const, label: "All" }, { id: "gb" as const, label: "Group Buy" }, { id: "regular" as const, label: "Lonely Vial" } ]).map(opt => (
              <button key={opt.id} onClick={() => setTypeFilter(opt.id)}
                className="flex-1 h-8 rounded-xl text-[11px] font-semibold transition-all"
                style={typeFilter === opt.id
                  ? { background: "var(--t-blue)", color: "white" }
                  : { background: T.surface2, color: T.muted, border: `1px solid ${T.border}` }}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* ── Loading ── */}
          {ordersLoading && totalOrders === 0 && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin" style={{ color: T.subtle }} />
            </div>
          )}

          {/* ── Empty state ── */}
          {nothingAtAll && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center rounded-3xl"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: T.surface2 }}>
                <ShoppingBag className="w-7 h-7" style={{ color: T.subtle }} />
              </div>
              <p className="text-sm font-bold mb-1" style={{ color: T.text }}>No orders yet</p>
              <p className="text-xs mb-5" style={{ color: T.subtle }}>
                {typeFilter === "gb" ? "You haven't placed any group buy orders yet." : "Your orders will appear here"}
              </p>
              {typeFilter === "gb" ? (
                <button onClick={() => setSection("groups")}
                  className="h-10 px-6 rounded-xl text-xs font-bold text-white flex items-center gap-2"
                  style={{ background: "var(--t-blue-deep)" }}>
                  Make an Order <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button onClick={() => setLocation("/shop")}
                  className="h-10 px-6 rounded-xl text-xs font-bold text-white flex items-center gap-2"
                  style={{ background: "var(--t-blue-deep)" }}>
                  Place an Order <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          )}

          {/* ── Group Buy Orders section ── */}
          {showGb && typeFilter === "all" && (
            <div className="flex items-center gap-2 px-0.5 pt-1">
              <div className="w-6 h-px flex-1" style={{ background: T.border }} />
              <span className="text-[10px] font-bold uppercase tracking-widest px-2" style={{ color: T.subtle }}>Group Buy Orders</span>
              <div className="w-6 h-px flex-1" style={{ background: T.border }} />
            </div>
          )}
          {showGb && gbOrderGroups.map(({ gbId: groupBuyId, gb, orders: gbOrders }) => {
            const shown = gbOrders;
            if (shown.length === 0) return null;
            const gbStatus = gb?.status ?? "active";
            const dotColor = GB_STATUS_DOT[gbStatus] ?? "#94A3B8";
            const gbLabel  = GB_STATUS_LABEL[gbStatus] ?? gbStatus;
            const hasPaid  = gbOrders.some(o => ["confirmed", "test_confirmed"].includes(o.paymentStatus));
            return (
              <div key={groupBuyId} className="space-y-3">
                {/* Group buy header */}
                <div className="flex items-center gap-3 px-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "var(--t-blue-10)" }}>
                      <Users className="w-3.5 h-3.5" style={{ color: "var(--t-blue)" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: T.text }}>
                        {gb?.name ?? "Group Buy"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }} />
                        <span className="text-[10px] font-semibold" style={{ color: T.subtle }}>{gbLabel}</span>
                        <span className="text-[10px]" style={{ color: T.subtle }}>· {shown.length} order{shown.length !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  </div>
                  {gb && hasPaid && (
                    <button onClick={() => { setParcelsGb(gb); setParcelsOrders(shown); }}
                      className="flex items-center gap-1.5 h-8 px-3.5 rounded-full text-xs font-bold shrink-0"
                      style={{ background: "var(--t-blue-deep)", color: "white" }}>
                      <Package className="w-3.5 h-3.5" />
                      Tracking
                    </button>
                  )}
                </div>

                {/* Orders under this group buy */}
                <div className="space-y-5">
                  <AnimatePresence>
                    {shown.map((order, i) => (
                      <motion.div key={order.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                        <OrderCard order={order} onManage={() => handleManage(order)} groupBuyName={gb?.name ?? undefined} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}

          {/* ── Regular Orders section ── */}
          {showRegular && (
            <div className="space-y-5">
              {/* Only show header when group buy orders are also visible and not filtering */}
              {showGb && typeFilter === "all" && (
                <div className="flex items-center gap-2 px-1">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: T.surface2 }}>
                    <ShoppingBag className="w-3.5 h-3.5" style={{ color: T.muted }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: T.text }}>My Orders</p>
                    <p className="text-[10px]" style={{ color: T.subtle }}>{shownRegular.length} order{shownRegular.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              )}
              <AnimatePresence>
                {shownRegular.map((order, i) => (
                  <motion.div key={order.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <OrderCard
                      order={order}
                      onManage={() => handleManage(order)}
                      onReorder={order.orderType === "wholesale" ? () => handleReorder(order) : undefined}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

        </div>
        </div>
        <AnimatePresence>
          {parcelsGb && <GBParcelsModal gb={parcelsGb} orders={parcelsOrders} onClose={() => setParcelsGb(null)} />}
        </AnimatePresence>
      </PortalLayout>
    );
  }

  // ─── Group Buys section ───────────────────────────────────────────────────────

  if (section === "groups") {
    return (
      <PortalLayout navProps={navProps}>
        {/* ════════════════════ BRANDED GRADIENT HEADER ════════════════════════ */}
        <div className="-mx-5 -mt-6 lg:-mx-8 lg:-mt-7 relative overflow-hidden"
             style={{ background: "linear-gradient(135deg, var(--brand-navy) 0%, var(--brand-blue) 100%)" }}>
          <div className="absolute inset-0 opacity-10"
               style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white 0%, transparent 60%)" }} />
          <div className="relative px-5 pt-5 pb-6 lg:px-8 lg:pt-6">
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => setSection("home")}
                      className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold"
                      style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.9)" }}>
                <ChevronLeft className="w-4 h-4" style={{ color: "rgba(255,255,255,0.9)" }} />
                Dashboard
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => refetchGb()} disabled={gbLoading}
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.12)" }}>
                  <RefreshCw className={`w-4 h-4 ${gbLoading ? "animate-spin" : ""}`}
                             style={{ color: "rgba(255,255,255,0.9)" }} />
                </button>
                <button onClick={() => setShowJoin(true)}
                        className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold"
                        style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.9)" }}>
                  <Users className="w-3.5 h-3.5" /> Join a Group Buy
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                   style={{ background: "rgba(255,255,255,0.15)" }}>
                <UsersRound className="w-4 h-4 text-white" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest"
                 style={{ color: "rgba(255,255,255,0.6)" }}>Group Buys</p>
            </div>
            <h1 className="text-2xl font-bold text-white leading-tight">My Group Buys</h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
              {groupBuys.length} group buy{groupBuys.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {groupBuysPageMessage && !gbMsgDismissed && (
          <div
            className="relative flex items-center justify-center gap-3 mt-4 px-12 py-4"
            style={{ background: "#1C1C1C", borderRadius: "14px" }}
          >
            <div
              className="shrink-0 flex items-center justify-center"
              style={{ width: 40, height: 40, borderRadius: "50%", background: "#2A2A2A" }}
            >
              <TriangleAlert className="w-5 h-5" style={{ color: "#E8872A" }} />
            </div>
            <p className="text-sm leading-snug" style={{ color: "#FFFFFF" }}>
              {groupBuysPageMessage}
            </p>
            <button
              onClick={() => setGbMsgDismissed(true)}
              className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center hover:opacity-70 transition-opacity"
            >
              <X className="w-5 h-5" style={{ color: "#888888" }} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-5">
          {gbLoading && (
            <div className="col-span-2 flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin" style={{ color: T.muted }} /></div>
          )}

          {!gbLoading && groupBuys.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="col-span-2 rounded-xl p-8 text-center shadow-sm" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--t-blue-08)" }}>
                <Users className="w-7 h-7" style={{ color: "var(--t-blue)" }} />
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: T.muted }}>No group buys yet</p>
              <p className="text-xs leading-relaxed" style={{ color: T.muted }}>
                You haven't joined any group buys yet. Ask the admin for an invite or join one below.
              </p>
              <button onClick={() => setShowJoin(true)}
                className="mt-4 h-10 px-5 rounded-xl text-xs font-bold text-white"
                style={{ background: "linear-gradient(135deg, var(--t-blue), var(--t-blue-deep))" }}>
                Join a Group Buy
              </button>
            </motion.div>
          )}

          {!gbLoading && groupBuys.map((gb, idx) => {
            const palette = GB_PALETTE[idx % GB_PALETTE.length];
            const GBIcon = palette.icon;
            const isOrderable = gb.status === "active";
            const infoCards = gb.infoCards ?? [];
            const infoContent = infoCards.length > 0
              ? infoCards.slice(0, 2).map((c: { title: string }) => c.title).join(" · ")
              : gb.description ?? null;

            const gbOrders = orders.filter(o => o.groupBuyId === gb.id);
            const paid    = gbOrders.filter(o => ["paid", "confirmed", "test_confirmed"].includes(o.paymentStatus));
            const pending = gbOrders.filter(o => o.paymentStatus === "pending_confirmation");
            const unpaid  = gbOrders.filter(o => o.paymentStatus === "unpaid");
            const failed  = gbOrders.filter(o => ["failed", "refunded"].includes(o.paymentStatus));

            const closeDateBadge = getGBCloseDateBadge(gb.closeDate);
            const chips: Array<{ label: string }> = [];
            if (gb.productCount > 0) chips.push({ label: `${gb.productCount} product${gb.productCount !== 1 ? "s" : ""}` });
            if (gb.currency) chips.push({ label: gb.currency.toUpperCase() });

            const dotColor = GB_STATUS_DOT[gb.status] ?? GB_STATUS_DOT.draft;
            const statusLabel = GB_STATUS_LABEL[gb.status] ?? gb.status;

            return (
              <motion.div key={gb.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                className="rounded-2xl overflow-hidden relative"
                style={{ background: palette.gradient, boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}>

                {/* Decorative blob */}
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full -translate-y-16 translate-x-16 pointer-events-none"
                  style={{ background: palette.blobColor }} />

                <div className="relative p-4 flex flex-col" style={{ minHeight: 0 }}>
                  {/* Close date badge — top right */}
                  {closeDateBadge && (
                    <div className="absolute top-4 right-4 text-right pointer-events-none z-10">
                      <p className="text-[20px] font-bold text-white leading-tight">{closeDateBadge.dateStr}</p>
                      <p className="text-[13px] font-medium leading-tight mt-0.5" style={{ color: "rgba(255,255,255,0.50)" }}>{closeDateBadge.daysStr}</p>
                    </div>
                  )}

                  {/* Icon + label row */}
                  <div className="flex items-center gap-1.5 mb-3" style={{ paddingRight: closeDateBadge ? "80px" : undefined }}>
                    <GBIcon className="w-3.5 h-3.5" style={{ color: palette.accent }} />
                    <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: palette.accent }}>
                      Group Buy
                    </span>
                  </div>

                  {/* Name + manufacturer + organiser */}
                  <h3 className="text-[18px] font-bold text-white leading-snug mb-0.5 line-clamp-2">{gb.name}</h3>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {gb.manufacturer && (
                        <span className="text-[11px] leading-tight line-clamp-1" style={{ color: "rgba(255,255,255,0.50)" }}>
                          {gb.manufacturer}
                        </span>
                      )}
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.55)" }}>
                        by {gb.organiserId ?? "Admin"}
                      </span>
                      {gb.manufacturerCountry && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.55)" }}>
                          <MapPin className="w-2.5 h-2.5" /> {gb.manufacturerCountry}
                        </span>
                      )}
                    </div>

                  {/* Info section with label */}
                  {infoContent && (
                    <div className="mb-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {infoCards.length > 0 ? "Key Info" : "About"}
                      </p>
                      <p className="text-[11px] leading-relaxed line-clamp-1" style={{ color: "rgba(255,255,255,0.60)" }}>
                        {infoContent}
                      </p>
                    </div>
                  )}

                  {/* Chips */}
                  {chips.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {chips.map((chip, ci) => (
                        <span key={ci}
                          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.70)", border: "1px solid rgba(255,255,255,0.12)" }}>
                          {chip.label}
                        </span>
                      ))}
                    </div>
                  )}


                </div>

                {/* Footer bar — Order CTA + status */}
                <div className="relative px-3.5 pt-3 pb-3 space-y-2.5"
                  style={{ background: "rgba(0,0,0,0.28)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  {/* Full-width CTA */}
                  <button
                    onClick={() => isOrderable ? setLocation(`/order?gbId=${gb.id}`) : setLocation("/account?s=orders")}
                    className="w-full h-9 rounded-full text-[12px] font-bold text-white flex items-center justify-center gap-1.5 transition-opacity active:opacity-80"
                    style={{ background: isOrderable ? palette.accent : "rgba(255,255,255,0.15)" }}>
                    {isOrderable ? "Order" : "My Orders"}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  {/* Waitlist toggle for non-orderable GBs */}
                  {!isOrderable && <WaitlistToggleButton gbId={gb.id} />}
                  {/* Status + info */}
                  <div className="flex items-center justify-between">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.10)" }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }} />
                      {statusLabel}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {portalStockItems.length > 0 && (
                        <button onClick={() => setShowPortalStockModal(true)}
                          title="Check stock availability"
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(255,255,255,0.10)" }}>
                          <Boxes className="w-3 h-3" style={{ color: "rgba(255,255,255,0.55)" }} />
                        </button>
                      )}
                      <button onClick={() => setInfoGb(gb)}
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.10)" }}>
                        <Info className="w-3 h-3" style={{ color: "rgba(255,255,255,0.55)" }} />
                      </button>
                      <button
                        onClick={() => {
                          setLeaveConfirmGb(gb);
                        }}
                        title="Leave this group buy"
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.10)" }}>
                        <X className="w-3 h-3" style={{ color: "rgba(255,255,255,0.55)" }} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence>
          {infoGb && <GBInfoModal gb={infoGb} onClose={() => setInfoGb(null)} />}
        </AnimatePresence>
        <AnimatePresence>
          {parcelsGb && <GBParcelsModal gb={parcelsGb} orders={parcelsOrders} onClose={() => setParcelsGb(null)} />}
        </AnimatePresence>
        <AnimatePresence>
          {showJoin && <JoinModal onClose={() => setShowJoin(false)} />}
        </AnimatePresence>
        <AnimatePresence>
          {showPortalStockModal && <PortalStockModal items={portalStockItems} onClose={() => setShowPortalStockModal(false)} />}
        </AnimatePresence>
        <AnimatePresence>
          {leaveConfirmGb && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setLeaveConfirmGb(null)} />
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 rounded-3xl w-[90%] max-w-sm p-6"
                style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}>
                <div className="flex flex-col items-center gap-3 mb-5">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(220,38,38,0.1)" }}>
                    <AlertCircle className="w-7 h-7 text-red-500" />
                  </div>
                  <h3 className="text-base font-bold text-center" style={{ color: T.text }}>Leave Group Buy?</h3>
                  <p className="text-sm text-center leading-relaxed" style={{ color: T.muted }}>
                    This will remove you from <strong>{leaveConfirmGb.name}</strong> and delete all your orders in this group buy. This action cannot be undone.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setLeaveConfirmGb(null)}
                    className="flex-1 h-11 rounded-xl text-sm font-bold"
                    style={{ background: T.surface2, color: T.muted, border: `1px solid ${T.border}` }}>
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await leaveGbMut.mutateAsync({ groupBuyId: leaveConfirmGb.id });
                        setLeaveConfirmGb(null);
                      } catch { /* error handled by mutation */ }
                    }}
                    disabled={leaveGbMut.isPending}
                    className="flex-1 h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                    style={{ background: "#DC2626" }}>
                    {leaveGbMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Leave"}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showCountryPrompt && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 rounded-3xl w-[90%] max-w-sm p-6"
                style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}>
                <div className="flex flex-col items-center gap-3 mb-5">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--t-blue-10)" }}>
                    <MapPin className="w-7 h-7" style={{ color: "var(--t-blue)" }} />
                  </div>
                  <h3 className="text-base font-bold text-center" style={{ color: T.text }}>Set Your Country</h3>
                  <p className="text-sm text-center leading-relaxed" style={{ color: T.muted }}>
                    Some group buys are restricted by country. Please set yours to see which ones you can join.
                  </p>
                </div>
                <div className="relative mb-4">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: T.muted }} />
                    <select
                      value={countryPromptValue}
                      onChange={e => setCountryPromptValue(e.target.value)}
                      className="w-full h-12 pl-9 pr-4 rounded-xl text-sm appearance-none focus:outline-none"
                      style={{
                        background: T.surface2,
                        border: `1.5px solid ${countryPromptValue ? "var(--t-blue)" : T.border}`,
                        color: countryPromptValue ? T.text : T.muted,
                      }}
                    >
                      <option value="" disabled>Select your country</option>
                      {COUNTRIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: T.muted }} />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowCountryPrompt(false)}
                    className="flex-1 h-11 rounded-xl text-sm font-bold"
                    style={{ background: T.surface2, color: T.muted, border: `1px solid ${T.border}` }}>
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!countryPromptValue) return;
                      try {
                        await updateCountryMut.mutateAsync({ country: countryPromptValue });
                        setShowCountryPrompt(false);
                      } catch { /* handled */ }
                    }}
                    disabled={!countryPromptValue || updateCountryMut.isPending}
                    className="flex-1 h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: "var(--t-blue-deep)" }}>
                    {updateCountryMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </PortalLayout>
    );
  }

  // ─── Compounds section ────────────────────────────────────────────────────────

  if (section === "compounds") {
    return (
      <PortalLayout navProps={navProps}>
        {/* ════════════════════ BRANDED GRADIENT HEADER ════════════════════════ */}
        <div className="-mx-5 -mt-6 lg:-mx-8 lg:-mt-7 relative overflow-hidden"
             style={{ background: "linear-gradient(135deg, var(--brand-navy) 0%, var(--brand-blue) 100%)" }}>
          <div className="absolute inset-0 opacity-10"
               style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white 0%, transparent 60%)" }} />
          <div className="relative px-5 pt-5 pb-6 lg:px-8 lg:pt-6">
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => setSection("home")}
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.12)" }}>
                <ChevronLeft className="w-5 h-5" style={{ color: "rgba(255,255,255,0.9)" }} />
              </button>
              <button onClick={() => setShowCompoundForm(true)}
                      className="h-9 px-4 rounded-xl flex items-center gap-1.5 text-sm font-semibold"
                      style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.9)" }}>
                <Plus className="w-3.5 h-3.5" /> Log
              </button>
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1"
               style={{ color: "rgba(255,255,255,0.6)" }}>Customer Portal</p>
            <h1 className="text-2xl font-bold text-white leading-tight">Compounds &amp; Protocols</h1>
          </div>
        </div>

        <div className="space-y-4">
          {compoundsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-7 h-7 animate-spin" style={{ color: T.subtle }} />
            </div>
          ) : compounds.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "rgba(22,163,74,0.08)" }}>
                <Syringe className="w-8 h-8 text-green-300" />
              </div>
              <p className="text-sm font-bold mb-1" style={{ color: T.muted }}>No compounds logged</p>
              <p className="text-xs mb-6 max-w-[240px]" style={{ color: T.muted }}>
                Track your peptide protocols, TRT, AAS cycles, and supplements all in one place.
              </p>
              <button onClick={() => setShowCompoundForm(true)}
                className="h-11 px-6 rounded-xl text-sm font-bold text-white flex items-center gap-2"
                style={{ background: "linear-gradient(135deg, var(--t-blue), var(--t-blue-deep))" }}>
                <Plus className="w-4 h-4" /> Log First Compound
              </button>
            </motion.div>
          ) : (
            <>
              {activeCompounds.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider px-1" style={{ color: T.muted }}>Active Protocols</p>
                  {activeCompounds.map(c => (
                    <CompoundCard
                      key={c.id}
                      compound={c}
                      isActive={true}
                      onEnd={() => handleEndCompound(c.id)}
                      onDelete={() => deleteMut.mutate(c.id)}
                    />
                  ))}
                </div>
              )}

              {pastCompounds.length > 0 && (
                <div className="space-y-2.5">
                  <button
                    onClick={() => setShowCompoundHistory(h => !h)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl shadow-sm text-sm font-semibold"
                    style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.muted }}
                  >
                    <span>Protocol History ({pastCompounds.length})</span>
                    {showCompoundHistory ? <ChevronUp className="w-4 h-4" style={{ color: T.muted }} /> : <ChevronDown className="w-4 h-4" style={{ color: T.muted }} />}
                  </button>
                  <AnimatePresence initial={false}>
                    {showCompoundHistory && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-2.5">
                        {pastCompounds.map(c => (
                          <CompoundCard
                            key={c.id}
                            compound={c}
                            isActive={false}
                            onDelete={() => deleteMut.mutate(c.id)}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </div>

        <AnimatePresence>
          {showCompoundForm && <LogCompoundForm onClose={() => setShowCompoundForm(false)} />}
        </AnimatePresence>
      </PortalLayout>
    );
  }

  // ─── Blood Tests section ──────────────────────────────────────────────────────

  if (section === "blood-tests") {
    const sortedTests = [...bloodTests].sort((a, b) => b.testDate.localeCompare(a.testDate));

    return (
      <PortalLayout navProps={navProps}>
        <BloodTestPortalHubWithBanner
          sessions={sortedTests}
          username={username}
          onBack={() => setSection("home")}
        />
      </PortalLayout>
    );
  }

  // ─── Cycle Plotter section ────────────────────────────────────────────────────

  if (section === "plotter") {
    return (
      <PortalLayout navProps={navProps}>
        {/* ════════════════════ BRANDED GRADIENT HEADER ════════════════════════ */}
        <div className="-mx-5 -mt-6 lg:-mx-8 lg:-mt-7 relative overflow-hidden"
             style={{ background: "linear-gradient(135deg, var(--brand-navy) 0%, var(--brand-blue) 100%)" }}>
          <div className="absolute inset-0 opacity-10"
               style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white 0%, transparent 60%)" }} />
          <div className="relative px-5 pt-5 pb-6 lg:px-8 lg:pt-6">
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => setSection("home")}
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.12)" }}>
                <ChevronLeft className="w-5 h-5" style={{ color: "rgba(255,255,255,0.9)" }} />
              </button>
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1"
               style={{ color: "rgba(255,255,255,0.6)" }}>Health</p>
            <h1 className="text-2xl font-bold text-white leading-tight">Cycle Plotter</h1>
          </div>
        </div>
        <SteroidPlotter hideHeader username={username} />
      </PortalLayout>
    );
  }

  // ─── Profile section ──────────────────────────────────────────────────────────

  if (section === "profile") {
    const initials = (() => {
      const n = profileForm.fullName?.trim();
      if (n) {
        const parts = n.split(" ").filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return parts[0].slice(0, 2).toUpperCase();
      }
      return username.slice(0, 2).toUpperCase();
    })();
    const memberSince = account.createdAt
      ? new Date(account.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
      : null;

    return (
      <PortalLayout navProps={navProps}>
        {/* ════════ HERO (outer wrapper is relative so avatar can overflow) ════════ */}
        <div className="-mx-5 -mt-6 lg:-mx-8 lg:-mt-7 relative" style={{ zIndex: 1 }}>
          {/* Gradient band — overflow-hidden scopes the decorative blobs */}
          <div className="relative overflow-hidden"
               style={{ background: "linear-gradient(135deg, var(--brand-navy) 0%, var(--brand-blue) 100%)" }}>
            <div className="absolute inset-0 pointer-events-none opacity-[0.07]"
                 style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 0%, transparent 50%)" }} />
            <div className="absolute -bottom-10 -right-8 w-48 h-48 rounded-full pointer-events-none"
                 style={{ background: "var(--t-blue-35)" }} />
            <div className="relative px-5 pt-5 pb-10 lg:px-8 lg:pt-6">
              {/* Back row */}
              <div className="flex items-center mb-5">
                <button onClick={() => setSection("home")}
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.12)" }}>
                  <ChevronLeft className="w-5 h-5" style={{ color: "rgba(255,255,255,0.9)" }} />
                </button>
              </div>
              {/* Title only — avatar lives at the hero's bottom edge */}
              <div className="mb-1">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1"
                   style={{ color: "rgba(255,255,255,0.45)" }}>My Profile</p>
                <h1 className="text-2xl font-black text-white leading-tight">@{username}</h1>
                {tgStatusPortal !== undefined && (
                  <div className="mt-2">
                    {portalLinked ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                            style={{ background: "rgba(22,163,74,0.25)", color: "#4ADE80", border: "1px solid rgba(74,222,128,0.3)" }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                        Telegram Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                            style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.15)" }}>
                        <Unlink className="w-3 h-3 shrink-0" />
                        Not linked to Telegram
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Avatar — overlaps the hero's bottom edge into the card below */}
          <div className="absolute bottom-0 left-5 translate-y-1/2 z-10">
            <div className="w-[64px] h-[64px] rounded-full flex items-center justify-center text-xl font-black select-none"
                 style={{ background: "var(--t-blue-deep)", border: "3px solid white", color: "white",
                          boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }}>
              {initials}
            </div>
          </div>
        </div>

        {/* ════════ FORM CARDS ════════ */}
        <div className="space-y-6 mt-10">

          {/* ── Name & Email ── */}
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl overflow-hidden shadow-sm"
            style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="p-5 space-y-3">
              {profileLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: T.subtle }} />
                </div>
              ) : (
                <>
                  {[
                    { label: "Full Name", key: "fullName" as const, placeholder: "Jane Smith",       type: "text" },
                    { label: "Email",     key: "email"    as const, placeholder: "jane@example.com", type: "email" },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5"
                             style={{ color: T.muted }}>{field.label}</label>
                      <input type={field.type} placeholder={field.placeholder}
                        className="w-full h-11 rounded-xl border px-4 text-sm focus:outline-none transition-colors"
                        style={{ background: T.surface2, borderColor: T.border, color: T.text }}
                        onFocus={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.boxShadow = "0 2px 0 0 var(--t-blue)"; }}
                        onBlur={e => { e.currentTarget.style.borderColor = "var(--t-border)"; e.currentTarget.style.boxShadow = "none"; }}
                        value={profileForm[field.key] ?? ""}
                        onChange={e => setProfileForm(f => ({ ...f, [field.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  {profileMsg && (
                    <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5"
                         style={{ background: profileMsg.ok ? "rgba(22,163,74,0.08)" : "rgba(239,68,68,0.08)",
                                  border: `1px solid ${profileMsg.ok ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                      {profileMsg.ok
                        ? <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "#16A34A" }} />
                        : <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "#EF4444" }} />}
                      <p className="text-xs font-semibold"
                         style={{ color: profileMsg.ok ? "#16A34A" : "#EF4444" }}>{profileMsg.text}</p>
                    </div>
                  )}
                  <button onClick={saveProfile} disabled={profileSaving}
                    className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                    style={{ background: "var(--t-blue-deep)" }}>
                    {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Save
                  </button>
                </>
              )}
            </div>
          </motion.div>

          {/* ── Shipping Address ── */}
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
            className="rounded-2xl overflow-hidden shadow-sm"
            style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${T.border}` }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: "rgba(27,58,122,0.08)" }}>
                <MapPin className="w-4 h-4" style={{ color: "var(--t-blue-deep)" }} />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest leading-none mb-0.5" style={{ color: T.muted }}>Delivery</p>
                <h3 className="text-sm font-bold leading-tight" style={{ color: T.text }}>Shipping Address</h3>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {/* Address Line 1 with Nominatim autocomplete */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: T.muted }}>Address Line 1</label>
                <div className="relative">
                  <div className="relative">
                    <input
                      value={addrForm.line1}
                      autoComplete="address-line1"
                      placeholder="123 Example St"
                      className="w-full h-11 px-4 rounded-xl text-sm border outline-none focus:ring-2 pr-9"
                      style={{ background: T.surface2, borderColor: T.border, color: T.text }}
                      onChange={e => {
                        const v = e.target.value;
                        setAddrForm(a => ({ ...a, line1: v }));
                        searchAddress(v);
                      }}
                      onBlur={() => setTimeout(() => setAddrSugOpen(false), 150)}
                      onFocus={() => addrSuggestions.length > 0 && setAddrSugOpen(true)}
                    />
                    {addrSugLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: T.muted }} />
                    )}
                  </div>
                  {addrSugOpen && addrSuggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 rounded-xl overflow-hidden shadow-xl border"
                      style={{ background: T.surface, borderColor: T.border }}>
                      {addrSuggestions.map((s, i) => (
                        <button key={i} type="button"
                          className="w-full text-left px-4 py-2.5 text-xs hover:opacity-80 transition-opacity border-b last:border-b-0"
                          style={{ color: T.text, borderColor: T.border }}
                          onMouseDown={() => pickAddrSuggestion(s)}>
                          <span className="font-medium block truncate">{s.line1}</span>
                          <span className="block truncate" style={{ color: T.muted }}>{s.display}</span>
                        </button>
                      ))}
                      <p className="px-4 py-1.5 text-[9px]" style={{ color: T.muted }}>© OpenStreetMap contributors</p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: T.muted }}>Address Line 2 <span className="font-normal lowercase">(optional)</span></label>
                <input value={addrForm.line2} autoComplete="address-line2" onChange={e => setAddrForm(a => ({ ...a, line2: e.target.value }))} placeholder="Flat / Suite"
                  className="w-full h-11 px-4 rounded-xl text-sm border outline-none focus:ring-2" style={{ background: T.surface2, borderColor: T.border, color: T.text }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: T.muted }}>City / Town</label>
                  <input value={addrForm.city} autoComplete="address-level2" onChange={e => setAddrForm(a => ({ ...a, city: e.target.value }))} placeholder="London"
                    className="w-full h-11 px-4 rounded-xl text-sm border outline-none focus:ring-2" style={{ background: T.surface2, borderColor: T.border, color: T.text }} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: T.muted }}>Postcode</label>
                  <input value={addrForm.postcode} autoComplete="postal-code" onChange={e => setAddrForm(a => ({ ...a, postcode: e.target.value.toUpperCase() }))} placeholder="SW1A 1AA"
                    className="w-full h-11 px-4 rounded-xl text-sm border outline-none focus:ring-2 font-mono" style={{ background: T.surface2, borderColor: T.border, color: T.text }} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: T.muted }}>Country</label>
                <select value={addrForm.country} autoComplete="country-name" onChange={e => setAddrForm(a => ({ ...a, country: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl text-sm border outline-none focus:ring-2 appearance-none" style={{ background: T.surface2, borderColor: T.border, color: T.text }}>
                  <option value="">Select country…</option>
                  {COUNTRY_LIST.map(c => (
                    <option key={c.code} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: T.muted }}>Phone <span className="font-normal lowercase">(optional)</span></label>
                <div className="flex gap-2">
                  <select value={addrForm.phonePrefix} onChange={e => setAddrForm(a => ({ ...a, phonePrefix: e.target.value }))}
                    className="h-11 px-3 rounded-xl text-sm border outline-none focus:ring-2 appearance-none shrink-0" style={{ background: T.surface2, borderColor: T.border, color: T.text, width: "90px" }}>
                    {["+1","+7","+27","+30","+31","+32","+33","+34","+36","+39","+40","+41","+43","+44","+45","+46","+47","+48","+49","+51","+52","+53","+54","+55","+56","+57","+58","+60","+61","+62","+63","+64","+65","+66","+81","+82","+84","+86","+90","+91","+92","+93","+94","+95","+98","+212","+213","+216","+218","+220","+221","+222","+223","+224","+225","+226","+227","+228","+229","+230","+231","+232","+233","+234","+235","+236","+237","+238","+239","+240","+241","+242","+243","+244","+245","+246","+247","+248","+249","+250","+251","+252","+253","+254","+255","+256","+257","+258","+260","+261","+262","+263","+264","+265","+266","+267","+268","+269","+290","+291","+297","+298","+299","+350","+351","+352","+353","+354","+355","+356","+357","+358","+359","+370","+371","+372","+373","+374","+375","+376","+377","+378","+380","+381","+382","+383","+385","+386","+387","+389","+420","+421","+423","+500","+501","+502","+503","+504","+505","+506","+507","+508","+509","+590","+591","+592","+593","+594","+595","+596","+597","+598","+599","+670","+672","+673","+674","+675","+676","+677","+678","+679","+680","+681","+682","+683","+685","+686","+687","+688","+689","+690","+691","+692","+850","+852","+853","+855","+856","+880","+886","+960","+961","+962","+963","+964","+965","+966","+967","+968","+970","+971","+972","+973","+974","+975","+976","+977","+992","+993","+994","+995","+996","+998"].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <input type="tel" autoComplete="tel-national" value={addrForm.phone} onChange={e => setAddrForm(a => ({ ...a, phone: e.target.value }))} placeholder="7700 123456"
                    className="flex-1 h-11 px-4 rounded-xl text-sm border outline-none focus:ring-2" style={{ background: T.surface2, borderColor: T.border, color: T.text }} />
                </div>
              </div>
              {addrMsg && (
                <p className={`text-xs font-medium ${addrMsg.ok ? "text-green-600" : "text-red-500"}`}>{addrMsg.text}</p>
              )}
              <button onClick={saveAddress} disabled={addrSaving}
                className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                style={{ background: "var(--t-blue-deep)" }}>
                {addrSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save Address
              </button>
            </div>
          </motion.div>

          {/* ── Change Username ── */}
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-2xl overflow-hidden shadow-sm"
            style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="px-5 py-4 flex items-center gap-3"
                 style={{ borderBottom: `1px solid ${T.border}` }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: "rgba(27,58,122,0.08)" }}>
                <AtSign className="w-4 h-4" style={{ color: "var(--t-blue-deep)" }} />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest leading-none mb-0.5"
                   style={{ color: T.muted }}>Identity</p>
                <h3 className="text-sm font-bold leading-tight" style={{ color: T.text }}>Change Username</h3>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5"
                       style={{ color: T.muted }}>New Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold select-none"
                        style={{ color: "var(--t-blue-deep)" }}>@</span>
                  <input type="text" placeholder="newusername"
                    className="w-full h-11 rounded-xl border pl-7 pr-4 text-sm focus:outline-none transition-colors"
                    style={{ background: T.surface2, borderColor: T.border, color: T.text }}
                    onFocus={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.boxShadow = "0 2px 0 0 var(--t-blue)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "var(--t-border)"; e.currentTarget.style.boxShadow = "none"; }}
                    value={usernameForm.newUsername}
                    onChange={e => setUsernameForm(f => ({ ...f, newUsername: e.target.value.replace(/^@+/, "") }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5"
                       style={{ color: T.muted }}>Current Password</label>
                <div className="relative">
                  <input type={showUsernamePwd ? "text" : "password"} placeholder="Confirm with your password"
                    className="w-full h-11 rounded-xl border px-4 pr-11 text-sm focus:outline-none transition-colors"
                    style={{ background: T.surface2, borderColor: T.border, color: T.text }}
                    onFocus={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.boxShadow = "0 2px 0 0 var(--t-blue)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "var(--t-border)"; e.currentTarget.style.boxShadow = "none"; }}
                    value={usernameForm.currentPassword}
                    onChange={e => setUsernameForm(f => ({ ...f, currentPassword: e.target.value }))}
                  />
                  <button type="button" onClick={() => setShowUsernamePwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                    style={{ color: T.muted }}>
                    {showUsernamePwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {usernameMsg && (
                <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5"
                     style={{ background: usernameMsg.ok ? "rgba(22,163,74,0.08)" : "rgba(239,68,68,0.08)",
                              border: `1px solid ${usernameMsg.ok ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                  {usernameMsg.ok
                    ? <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "#16A34A" }} />
                    : <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "#EF4444" }} />}
                  <p className="text-xs font-semibold"
                     style={{ color: usernameMsg.ok ? "#16A34A" : "#EF4444" }}>{usernameMsg.text}</p>
                </div>
              )}
              <button onClick={saveUsername}
                disabled={usernameSaving || !usernameForm.newUsername.trim() || !usernameForm.currentPassword}
                className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                style={{ background: "var(--t-blue-deep)" }}>
                {usernameSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Change Username
              </button>
            </div>
          </motion.div>

          {/* ── Change Password ── */}
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl overflow-hidden shadow-sm"
            style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="px-5 py-4 flex items-center gap-3"
                 style={{ borderBottom: `1px solid ${T.border}` }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: "rgba(27,58,122,0.08)" }}>
                <Lock className="w-4 h-4" style={{ color: "var(--t-blue-deep)" }} />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest leading-none mb-0.5"
                   style={{ color: T.muted }}>Security</p>
                <h3 className="text-sm font-bold leading-tight" style={{ color: T.text }}>Change Password</h3>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: "Current Password",    key: "currentPassword" as const, placeholder: "Your current password", show: showPwdCurrent, setShow: setShowPwdCurrent },
                { label: "New Password",         key: "newPassword"     as const, placeholder: "At least 8 characters", show: showPwdNew,     setShow: setShowPwdNew },
                { label: "Confirm New Password", key: "confirmPassword" as const, placeholder: "Repeat new password",   show: showPwdConfirm, setShow: setShowPwdConfirm },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5"
                         style={{ color: T.muted }}>{field.label}</label>
                  <div className="relative">
                    <input type={field.show ? "text" : "password"} placeholder={field.placeholder}
                      className="w-full h-11 rounded-xl border px-4 pr-11 text-sm focus:outline-none transition-colors"
                      style={{ background: T.surface2, borderColor: T.border, color: T.text }}
                      onFocus={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.boxShadow = "0 2px 0 0 var(--t-blue)"; }}
                      onBlur={e => { e.currentTarget.style.borderColor = "var(--t-border)"; e.currentTarget.style.boxShadow = "none"; }}
                      value={passwordForm[field.key]}
                      onChange={e => setPasswordForm(f => ({ ...f, [field.key]: e.target.value }))}
                    />
                    <button type="button" onClick={() => field.setShow(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                      style={{ color: T.muted }}>
                      {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
              {passwordMsg && (
                <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5"
                     style={{ background: passwordMsg.ok ? "rgba(22,163,74,0.08)" : "rgba(239,68,68,0.08)",
                              border: `1px solid ${passwordMsg.ok ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                  {passwordMsg.ok
                    ? <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "#16A34A" }} />
                    : <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "#EF4444" }} />}
                  <p className="text-xs font-semibold"
                     style={{ color: passwordMsg.ok ? "#16A34A" : "#EF4444" }}>{passwordMsg.text}</p>
                </div>
              )}
              <button onClick={savePassword}
                disabled={passwordSaving || !passwordForm.currentPassword || !passwordForm.newPassword}
                className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                style={{ background: "var(--t-blue-deep)" }}>
                {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Change Password
              </button>
            </div>
          </motion.div>

        </div>
      </PortalLayout>
    );
  }

  // ─── Health Intelligence section ──────────────────────────────────────────────

  if (section === "health") {
    const biomarkers = healthSummary?.biomarkers ?? [];
    const adviceCards = healthSummary?.adviceCards ?? [];
    const testingSchedule = healthSummary?.testingSchedule ?? [];
    const activeCompoundsHealth = healthSummary?.activeCompounds ?? [];

    const outOfRange = biomarkers.filter(b => b.status === "out_of_range");
    const borderline  = biomarkers.filter(b => b.status === "borderline");
    const inRange     = biomarkers.filter(b => b.status === "in_range");
    const total       = biomarkers.length;

    const healthScore = total > 0 ? Math.round(inRange.length / total * 100) : 0;
    const outPct      = total > 0 ? Math.round(outOfRange.length / total * 100) : 0;
    const borderPct   = total > 0 ? Math.round(borderline.length / total * 100) : 0;

    const radarColor = outOfRange.length > 0 ? "#EF4444" : borderline.length > 0 ? "#F59E0B" : "#22C55E";

    const radarBiomarkers = [...biomarkers]
      .filter(b => b.refRangeLow != null && b.refRangeHigh != null && b.value != null)
      .sort((a, b) => {
        const o: Record<string, number> = { out_of_range: 0, borderline: 1, in_range: 2, no_range: 3 };
        return (o[a.status] ?? 3) - (o[b.status] ?? 3);
      })
      .slice(0, 8);

    function bScore(b: BiomarkerSummary): number {
      if (b.value == null || b.refRangeLow == null || b.refRangeHigh == null) return 50;
      const mid = (b.refRangeLow + b.refRangeHigh) / 2;
      if (mid === 0) return 100;
      return Math.max(0, Math.min(100, 100 - (Math.abs(b.value - mid) / mid) * 100));
    }

    const radarData = radarBiomarkers.map(b => ({
      subject: b.name
        .replace("Testosterone ", "T.")
        .replace("Luteinising Hormone", "LH")
        .replace("Follicle-Stimulating Hormone", "FSH")
        .replace("Haematocrit", "HCT")
        .replace("Haemoglobin", "HGB")
        .replace("Cholesterol", "Chol.")
        .slice(0, 10),
      score: bScore(b),
      fullMark: 100,
    }));

    function sColor(status: string): string {
      if (status === "in_range")    return "#22C55E";
      if (status === "out_of_range") return "#EF4444";
      if (status === "borderline")  return "#F59E0B";
      return "#94A3B8";
    }
    function sLabel(b: BiomarkerSummary): string {
      if (b.status === "in_range")    return "Normal";
      if (b.status === "borderline")  return "Borderline";
      if (b.status === "out_of_range") {
        if (b.refRangeHigh != null && b.value != null && b.value > b.refRangeHigh) return "High";
        return "Low";
      }
      return "—";
    }

    const keyBio =
      biomarkers.find(b => /testosterone total/i.test(b.name) && b.value != null) ??
      biomarkers.find(b => /haematocrit/i.test(b.name) && b.value != null) ??
      biomarkers.find(b => b.value != null) ?? null;

    const sparkData = keyBio
      ? [
          ...(keyBio.previousValue != null ? [{ v: keyBio.previousValue }] : []),
          { v: keyBio.value! },
        ]
      : [];

    // Comparison cards: prefer Haematocrit then Testosterone Total, else fallback by status
    const compBiosPreferred = [
      biomarkers.find(b => /haematocrit/i.test(b.name) && b.value != null && b.refRangeHigh != null),
      biomarkers.find(b => /testosterone total/i.test(b.name) && b.value != null && b.refRangeHigh != null),
    ].filter(Boolean) as BiomarkerSummary[];
    const compBiosFallback = [...biomarkers]
      .filter(b => b.value != null && b.refRangeHigh != null && !compBiosPreferred.includes(b))
      .sort((a, b) => {
        const o: Record<string, number> = { out_of_range: 0, borderline: 1, in_range: 2, no_range: 3 };
        return (o[a.status] ?? 3) - (o[b.status] ?? 3);
      });
    const compBios = [...compBiosPreferred, ...compBiosFallback].slice(0, 2);

    const byCat = biomarkers.reduce<Record<string, BiomarkerSummary[]>>((acc, b) => {
      const cat = b.category || "Other";
      (acc[cat] ??= []).push(b);
      return acc;
    }, {});
    const CAT_ORDER = ["Hormones", "Liver", "Kidney", "Blood", "Lipids", "Metabolic", "Other"];
    const cats = Object.keys(byCat).sort((a, b) => {
      const ai = CAT_ORDER.indexOf(a), bi = CAT_ORDER.indexOf(b);
      if (ai < 0 && bi < 0) return a.localeCompare(b);
      if (ai < 0) return 1; if (bi < 0) return -1;
      return ai - bi;
    });

    const warnCards = adviceCards.filter(c => c.severity === "warning");
    const ctnCards  = adviceCards.filter(c => c.severity === "caution");
    const infoC     = adviceCards.filter(c => c.severity === "info");

    // Date range label (earliest previousDate → latestDate across all biomarkers)
    const fmt = (d: string) => {
      const date = new Date(d.includes("T") || d.includes("Z") ? d : d + "T00:00:00");
      return isNaN(date.getTime()) ? d : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    };
    const allDates = biomarkers.flatMap(b => [b.latestDate, b.previousDate ?? ""]).filter(Boolean).sort();
    const earliestDate = allDates[0] ?? "";
    const latestDate   = allDates[allDates.length - 1] ?? "";
    const lastTestLabel = latestDate
      ? earliestDate && earliestDate !== latestDate
        ? `${fmt(earliestDate)} – ${fmt(latestDate)}`
        : fmt(latestDate)
      : healthSummary?.lastTestDate
        ? fmt(healthSummary.lastTestDate)
        : "";

    function HealthGauge({ score }: { score: number }) {
      const r = 85, cx = 115, cy = 100;
      // Gauge helper: angle theta = score/100 * π; endpoint calc
      function gpt(s: number) {
        const th = Math.min(s, 99.9) / 100 * Math.PI;
        return { th, x: (cx - r * Math.cos(th)).toFixed(2), y: (cy - r * Math.sin(th)).toFixed(2) };
      }
      // Zone endpoints at 33% and 66%
      const r33 = gpt(33);
      const r66 = gpt(66);
      const rEx = gpt(Math.min(score, 99.9));
      // Three dimmed background zone arcs
      const bgRed   = `M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${r33.x} ${r33.y}`;
      const bgAmber = `M ${r33.x} ${r33.y} A ${r} ${r} 0 0 0 ${r66.x} ${r66.y}`;
      const bgGreen = `M ${r66.x} ${r66.y} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`;
      // Active foreground arc (bright zone color)
      const gc = score >= 67 ? "#22C55E" : score >= 34 ? "#F59E0B" : "#EF4444";
      const fg = score <= 0 ? "" : `M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${rEx.x} ${rEx.y}`;
      return (
        <svg width="230" height="118" viewBox="0 0 230 118">
          {/* Dim zone tracks */}
          <path d={bgRed}   fill="none" stroke="rgba(239,68,68,0.18)"  strokeWidth="16" strokeLinecap="butt" />
          <path d={bgAmber} fill="none" stroke="rgba(245,158,11,0.18)" strokeWidth="16" strokeLinecap="butt" />
          <path d={bgGreen} fill="none" stroke="rgba(34,197,94,0.18)"  strokeWidth="16" strokeLinecap="butt" />
          {/* Active arc */}
          {fg && <path d={fg} fill="none" stroke={gc} strokeWidth="16" strokeLinecap="round" />}
          {/* Score text */}
          <text x={cx} y={cy + 16} textAnchor="middle" fill="white" fontSize="36" fontWeight="800" fontFamily="system-ui,sans-serif">{score}</text>
          <text x={cx} y={cy + 34} textAnchor="middle" fill="rgba(255,255,255,0.38)" fontSize="11" fontFamily="system-ui,sans-serif">Health Score</text>
        </svg>
      );
    }

    function HTrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
      if (trend === "up")   return <TrendingUp   className="w-3 h-3" style={{ color: "#60A5FA" }} />;
      if (trend === "down") return <TrendingDown className="w-3 h-3" style={{ color: "#60A5FA" }} />;
      return <Minus className="w-3 h-3" style={{ color: T.subtle }} />;
    }

    const DASH_SECTIONS: { key: string; label: string }[] = [
      { key: "keyBio",     label: "Key Biomarker"        },
      { key: "dist",       label: "Distribution"         },
      { key: "comparison", label: "Comparison Cards"     },
      { key: "nextSteps",  label: "Suggested Next Steps" },
      { key: "monitoring", label: "Suggested Monitoring" },
      { key: "allBio",     label: "All Biomarkers"       },
    ];
    const labelFor = (key: string) => DASH_SECTIONS.find(s => s.key === key)?.label ?? key;

    return (
      <PortalLayout navProps={navProps}>
        <PageTitle
          title="Health Insights"
          subtitle={lastTestLabel ? `Last test: ${lastTestLabel}` : "Based on your blood test data"}
          action={
            biomarkers.length > 0 ? (
              <button
                onClick={() => setShowDashCustomise(v => !v)}
                className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[11px] font-semibold transition-all"
                style={{ background: showDashCustomise ? "var(--t-blue)" : T.surface, color: showDashCustomise ? "#fff" : T.muted, border: `1px solid ${showDashCustomise ? "var(--t-blue)" : T.border}` }}>
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Customise
              </button>
            ) : undefined
          }
        />

        {/* ── Dashboard customise panel ── */}
        <AnimatePresence>
          {showDashCustomise && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
              className="rounded-2xl p-4 mb-1"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-bold" style={{ color: T.text }}>Customise Dashboard</p>
                  <p className="text-[10px] mt-0.5" style={{ color: T.subtle }}>Drag to reorder · toggle to show/hide</p>
                </div>
                <button onClick={() => { saveDashPrefs({}); saveDashOrder(DEFAULT_DASH_ORDER); }}
                  className="text-[10px] flex items-center gap-1 transition-opacity hover:opacity-60" style={{ color: T.subtle }}>
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>
              <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDashDragEnd}>
                <SortableContext items={dashOrder} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1.5">
                    {dashOrder.map(key => (
                      <SortableDashItem
                        key={key}
                        id={key}
                        label={labelFor(key)}
                        visible={dashVisible(key)}
                        onToggle={() => saveDashPrefs({ ...dashPrefs, [key]: !dashVisible(key) })}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4 pb-6">
          {healthLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin" style={{ color: T.subtle }} />
            </div>
          )}

          {!healthLoading && biomarkers.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-6 shadow-sm text-center" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <Heart className="w-10 h-10 mx-auto mb-3" style={{ color: T.subtle }} />
              <p className="text-sm font-semibold" style={{ color: T.muted }}>No blood test data yet</p>
              <p className="text-xs mt-1" style={{ color: T.muted }}>Log your first blood test to see personalised health insights</p>
              <button onClick={() => setSection("blood-tests")}
                className="mt-4 h-10 px-5 rounded-xl text-xs font-bold text-white"
                style={{ background: "var(--t-blue)" }}>
                Log Blood Test
              </button>
            </motion.div>
          )}

          {!healthLoading && biomarkers.length > 0 && (
            <>

              {/* ── Flat ordered dashboard cards ── */}
              {dashOrder.map(key => {
                if (!dashVisible(key)) return null;

                if (key === "keyBio") {
                  if (!keyBio) return null;
                  return (
                    <motion.div key="keyBio" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.10 } }}
                      className="rounded-2xl p-5"
                      style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                      <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: T.subtle }}>Key Biomarker</p>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold" style={{ color: T.text }}>{keyBio.name}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: sColor(keyBio.status) + "22", color: sColor(keyBio.status) }}>
                          ★ {sLabel(keyBio)}
                        </span>
                      </div>
                      <p style={{ color: T.text, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>
                        {keyBio.value!.toFixed(keyBio.value! < 10 ? 2 : 1)}
                        <span className="text-xs font-normal ml-1.5" style={{ color: T.muted }}>{keyBio.unit}</span>
                      </p>
                      {sparkData.length >= 2 ? (
                        <div style={{ height: 52, marginTop: 10 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <RLineChart data={sparkData}>
                              <Line type="monotone" dataKey="v" stroke={sColor(keyBio.status)} strokeWidth={2} dot={false} />
                            </RLineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : <div style={{ height: 8 }} />}
                      {keyBio.refRangeLow != null && keyBio.refRangeHigh != null && (
                        <p className="text-[10px] mt-2" style={{ color: T.muted }}>
                          Reference: {keyBio.refRangeLow} – {keyBio.refRangeHigh} {keyBio.unit}
                        </p>
                      )}
                    </motion.div>
                  );
                }

                if (key === "dist") {
                  return (
                    <motion.div key="dist" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.12 } }}
                      className="rounded-2xl p-5"
                      style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                      <p className="text-xs mb-3" style={{ color: T.muted }}>Biomarker Distribution</p>
                      <div className="flex rounded-md overflow-hidden" style={{ height: 22 }}>
                        {inRange.length > 0    && <div style={{ flex: inRange.length,    background: "#22C55E" }} />}
                        {borderline.length > 0 && <div style={{ flex: borderline.length, background: "#F59E0B" }} />}
                        {outOfRange.length > 0 && <div style={{ flex: outOfRange.length, background: "#EF4444" }} />}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[11px] font-semibold" style={{ color: "#22C55E" }}>
                          In Range {total > 0 ? Math.round(inRange.length / total * 100) : 0}%
                        </span>
                        <span className="text-[11px] font-semibold" style={{ color: "#EF4444" }}>
                          Out of Range {outPct}%
                        </span>
                      </div>
                    </motion.div>
                  );
                }

                if (key === "comparison") {
                  if (compBios.length === 0) return null;
                  return (
                    <div key="comparison" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {compBios.map(b => {
                        const refMid = ((b.refRangeLow ?? 0) + b.refRangeHigh!) / 2;
                        const yourPct = Math.min(100, Math.max(0, (b.value! / b.refRangeHigh!) * 100));
                        const sc = sColor(b.status);
                        const sl = sLabel(b);
                        const dirArrow = b.value! >= refMid ? "↑" : "↓";
                        return (
                          <motion.div key={b.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.16 } }}
                            className="rounded-2xl p-5"
                            style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-semibold" style={{ color: T.muted }}>{b.name}</p>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: sc + "20", color: sc }}>★ {sl}</span>
                            </div>
                            <p style={{ color: T.text, fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 12 }}>
                              {b.value!.toFixed(b.value! < 10 ? 2 : 1)}
                              <span className="text-xs font-normal ml-1" style={{ color: T.muted }}>{b.unit}</span>
                            </p>
                            <div className="space-y-2.5">
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px]" style={{ color: T.muted }}>Reference Mid</span>
                                  <span className="text-[10px]" style={{ color: T.muted }}>{refMid.toFixed(refMid < 10 ? 2 : 1)} {b.unit}</span>
                                </div>
                                <div className="rounded-full overflow-hidden" style={{ height: 6, background: T.border }}>
                                  <div style={{ width: "60%", height: "100%", background: T.subtle, borderRadius: 3 }} />
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px]" style={{ color: T.muted }}>Your Result</span>
                                  <span className="text-[10px] font-semibold" style={{ color: sc }}>
                                    {b.value!.toFixed(b.value! < 10 ? 2 : 1)} {b.unit} {dirArrow}
                                  </span>
                                </div>
                                <div className="rounded-full overflow-hidden" style={{ height: 6, background: T.border }}>
                                  <div style={{ width: `${yourPct}%`, height: "100%", background: sc, borderRadius: 3 }} />
                                </div>
                              </div>
                            </div>
                            {b.refRangeLow != null && (
                              <p className="text-[10px] mt-3" style={{ color: T.muted }}>
                                Range: {b.refRangeLow} – {b.refRangeHigh} {b.unit}
                              </p>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                }

                if (key === "nextSteps") {
                  return (
                    <motion.div key="nextSteps" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.14 } }}
                      className="rounded-2xl p-5"
                      style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" style={{ color: "#A78BFA" }} />
                          <p className="text-sm font-bold" style={{ color: T.text }}>Suggested Next Steps</p>
                        </div>
                        <button onClick={() => setSection("blood-tests")}
                          className="text-[11px] font-semibold flex items-center gap-1 transition-opacity hover:opacity-60"
                          style={{ color: "var(--t-blue)" }}>
                          View Tests <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="rounded-xl p-3 mb-4" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}>
                        {healthInsightsLoading ? (
                          <div className="space-y-2">
                            <div className="h-2.5 rounded-full animate-pulse w-full" style={{ background: "rgba(0,0,0,0.07)" }} />
                            <div className="h-2.5 rounded-full animate-pulse w-5/6" style={{ background: "rgba(0,0,0,0.05)" }} />
                            <div className="h-2.5 rounded-full animate-pulse w-4/6" style={{ background: "rgba(0,0,0,0.04)" }} />
                          </div>
                        ) : healthInsightsData?.nextSteps ? (
                          <p className="text-[11px] leading-relaxed" style={{ color: T.text }}>{healthInsightsData.nextSteps}</p>
                        ) : (
                          <p className="text-[11px]" style={{ color: T.muted }}>AI next steps unavailable.</p>
                        )}
                      </div>
                      <div className="space-y-4">
                        {testingSchedule.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--t-blue-10)" }}>
                                <Stethoscope className="w-3.5 h-3.5" style={{ color: "var(--t-blue)" }} />
                              </div>
                              <span className="text-xs font-semibold" style={{ color: T.text }}>Diagnostic</span>
                            </div>
                            <ul className="ml-8 space-y-1">
                              {testingSchedule.slice(0, 3).map((item, i) => (
                                <li key={i} className="text-[11px] leading-snug" style={{ color: T.muted }}>• {item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {warnCards.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.1)" }}>
                                <TriangleAlert className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
                              </div>
                              <span className="text-xs font-semibold" style={{ color: T.text }}>Warning</span>
                            </div>
                            <ul className="ml-8 space-y-1.5">
                              {warnCards.map((c, i) => (
                                <li key={i}>
                                  <p className="text-[11px] font-semibold leading-snug" style={{ color: T.text }}>• {c.headline}</p>
                                  {c.body && <p className="text-[10px] leading-snug mt-0.5 line-clamp-2" style={{ color: T.muted }}>{c.body}</p>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {ctnCards.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.1)" }}>
                                <AlertCircle className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />
                              </div>
                              <span className="text-xs font-semibold" style={{ color: T.text }}>Caution</span>
                            </div>
                            <ul className="ml-8 space-y-1.5">
                              {ctnCards.map((c, i) => (
                                <li key={i}>
                                  <p className="text-[11px] font-semibold leading-snug" style={{ color: T.text }}>• {c.headline}</p>
                                  {c.body && <p className="text-[10px] leading-snug mt-0.5 line-clamp-2" style={{ color: T.muted }}>{c.body}</p>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {infoC.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(22,163,74,0.1)" }}>
                                <Heart className="w-3.5 h-3.5" style={{ color: "#22C55E" }} />
                              </div>
                              <span className="text-xs font-semibold" style={{ color: T.text }}>Lifestyle</span>
                            </div>
                            <ul className="ml-8 space-y-1.5">
                              {infoC.map((c, i) => (
                                <li key={i}>
                                  <p className="text-[11px] font-semibold leading-snug" style={{ color: T.text }}>• {c.headline}</p>
                                  {c.body && <p className="text-[10px] leading-snug mt-0.5 line-clamp-2" style={{ color: T.muted }}>{c.body}</p>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {testingSchedule.length === 0 && adviceCards.length === 0 && (
                          <div className="flex items-center gap-2 py-2">
                            <CheckCircle className="w-4 h-4" style={{ color: "#22C55E" }} />
                            <p className="text-xs" style={{ color: T.muted }}>Your markers look great!</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                }

                if (key === "monitoring") {
                  return (
                    <motion.div key="monitoring" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.16 } }}
                      className="rounded-2xl p-5"
                      style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                      <div className="flex items-center gap-1.5 mb-4">
                        <Brain className="w-3.5 h-3.5" style={{ color: "var(--t-blue)" }} />
                        <p className="text-sm font-bold" style={{ color: T.text }}>Suggested Monitoring</p>
                      </div>
                      {healthInsightsLoading ? (
                        <div className="space-y-3">
                          {[1,2,3].map(i => (
                            <div key={i} className="rounded-xl p-3 animate-pulse" style={{ background: "var(--t-blue-05)", border: "1px solid var(--t-blue-10)" }}>
                              <div className="h-2.5 rounded-full w-1/3 mb-2" style={{ background: "rgba(0,0,0,0.07)" }} />
                              <div className="h-2 rounded-full w-4/5" style={{ background: "rgba(0,0,0,0.05)" }} />
                            </div>
                          ))}
                        </div>
                      ) : healthInsightsData?.monitoring && healthInsightsData.monitoring.length > 0 ? (
                        <div className="space-y-2">
                          {healthInsightsData.monitoring.map((m, i) => (
                            <div key={i} className="rounded-xl p-3"
                              style={{ background: "var(--t-blue-05)", border: "1px solid var(--t-blue-12)" }}>
                              <p className="text-[11px] font-semibold mb-1" style={{ color: "var(--t-blue)" }}>{m.marker}</p>
                              <p className="text-[11px] leading-snug" style={{ color: T.muted }}>{m.reason}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 py-2">
                          <CheckCircle className="w-4 h-4" style={{ color: "#22C55E" }} />
                          <p className="text-xs" style={{ color: T.muted }}>No additional monitoring suggested at this time.</p>
                        </div>
                      )}
                    </motion.div>
                  );
                }

                if (key === "allBio") {
                  return (
                    <motion.div key="allBio" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.20 } }}
                      className="rounded-2xl overflow-hidden"
                      style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
                        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: T.muted }}>All Biomarkers</p>
                      </div>
                      {cats.map((cat, ci) => (
                        <React.Fragment key={cat}>
                          <div className="px-4 py-1.5"
                            style={{ background: T.bg, borderBottom: `1px solid ${T.border}`, borderTop: ci > 0 ? `1px solid ${T.border}` : undefined }}>
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: T.subtle }}>{cat}</p>
                          </div>
                          {byCat[cat].map((b, i) => {
                            const sc = sColor(b.status);
                            const isLast = i === byCat[cat].length - 1;
                            return (
                              <div key={i} className="flex items-center justify-between px-4 py-2"
                                style={{ borderBottom: isLast ? undefined : `1px solid ${T.border}` }}>
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sc }} />
                                  <p className="text-xs truncate" style={{ color: T.text }}>{b.name}</p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  {b.refRangeLow != null && b.refRangeHigh != null && (
                                    <span className="text-[10px]" style={{ color: T.subtle }}>
                                      {b.refRangeLow}–{b.refRangeHigh}
                                    </span>
                                  )}
                                  <HTrendIcon trend={b.trend} />
                                  <span className="text-xs font-semibold tabular-nums" style={{ color: T.text }}>
                                    {b.value != null ? (b.value < 10 ? b.value.toFixed(2) : b.value.toFixed(1)) : "—"}
                                    <span className="text-[10px] font-normal ml-0.5" style={{ color: T.muted }}>{b.unit}</span>
                                  </span>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                    style={{ background: sc + "18", color: sc }}>
                                    {b.status === "in_range" ? "OK" : b.status === "out_of_range" ? "!" : "~"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </motion.div>
                  );
                }

                return null;
              })}

              {/* Disclaimer */}
              <p className="text-[10px] text-center px-4 leading-relaxed" style={{ color: T.muted }}>
                These insights are generated from your logged data for research and informational purposes only. They do not constitute medical advice. Always consult a qualified healthcare professional.
              </p>
            </>
          )}
        </div>
      </PortalLayout>
    );
  }

  // ─── GLP-1 Tracker section ────────────────────────────────────────────────────

  if (section === "glp1") {
    // ── Constants ────────────────────────────────────────────────────────────
    const INJECTION_SITES = [
      { id: "abdomen-left",  label: "Abdomen – Left"   },
      { id: "abdomen-right", label: "Abdomen – Right"  },
      { id: "thigh-left",   label: "Thigh – Left"     },
      { id: "thigh-right",  label: "Thigh – Right"    },
      { id: "arm-left",     label: "Upper Arm – Left"  },
      { id: "arm-right",    label: "Upper Arm – Right" },
    ];

    const TEAL        = "var(--t-blue)";
    const TEAL_BG     = "var(--t-blue-12)";
    const PAGE_BG     = T.bg;
    const CARD_BG     = T.surface;
    const DIVIDER     = T.border;
    const BORDER_CLR  = T.border;
    const LABEL_CLR   = T.muted;
    const TEXT_CLR    = T.text;
    const BADGE_BG    = "#3D1D8A";

    const ST_TO_KG = 6.35029;

    // ── Helpers ──────────────────────────────────────────────────────────────
    function displayW(wKg: string | null | number, unit: "kg" | "st" | "lbs"): string {
      if (wKg == null) return "—";
      const n = typeof wKg === "number" ? wKg : parseFloat(wKg as string);
      if (isNaN(n)) return "—";
      if (unit === "lbs") return `${(n * 2.20462).toFixed(1)} lbs`;
      if (unit === "st") {
        const totalSt = n / ST_TO_KG;
        let st = Math.floor(totalSt);
        let lb = Math.round((totalSt - st) * 14);
        if (lb === 14) { st++; lb = 0; }
        return `${st} st ${lb} lb`;
      }
      return `${n.toFixed(1)} kg`;
    }

    function isWeekly(compound: string): boolean {
      return !/liraglutide|exenatide/i.test(compound);
    }

    function handleWeightUnitChange(u: "kg" | "st" | "lbs") {
      setGlp1WeightUnit(u);
      localStorage.setItem(`peps:${username}:glp1_weight_unit`, u);
      const kg = parseFloat(settingsGoal);
      if (!isNaN(kg) && settingsGoal !== "") {
        if (u === "lbs") setGoalDisplayStr((kg * 2.20462).toFixed(1));
        else if (u === "st") setGoalDisplayStr((kg / 6.35029).toFixed(1));
        else setGoalDisplayStr(kg.toFixed(1));
      }
    }

    function handleHeightUnitChange(u: "cm" | "ft") {
      setGlp1HeightUnit(u);
      localStorage.setItem(`peps:${username}:glp1_height_unit`, u);
      if (u === "ft" && settingsHeight !== "") {
        const cm = parseFloat(settingsHeight);
        if (!isNaN(cm)) {
          const totalInRounded = Math.round(cm / 2.54);
          setHeightFtStr(String(Math.floor(totalInRounded / 12)));
          setHeightInStr(String(totalInRounded % 12));
        }
      }
    }

    // ── Core data ────────────────────────────────────────────────────────────
    const sorted = [...glp1Logs].sort((a, b) => a.loggedDate.localeCompare(b.loggedDate));
    const reversed = [...sorted].reverse();
    const lastLog = sorted.at(-1) ?? null;
    const wLogs = sorted.filter(l => l.weightKg != null);
    const firstWLog = wLogs[0] ?? null;
    const lastWLog  = wLogs.at(-1) ?? null;
    const firstKg   = firstWLog ? parseFloat(firstWLog.weightKg!) : null;
    const lastKg    = lastWLog  ? parseFloat(lastWLog.weightKg!)  : null;
    const deltaKg   = (firstKg != null && lastKg != null && firstWLog?.id !== lastWLog?.id)
      ? lastKg - firstKg : null;

    const heightCm = parseFloat(settingsHeight) || null;
    const goalKg   = parseFloat(settingsGoal)   || null;
    const bmi = lastKg && heightCm
      ? (lastKg / Math.pow(heightCm / 100, 2)).toFixed(1) : null;

    // Next injection
    const nextShotDate = lastLog
      ? new Date(new Date(lastLog.loggedDate + "T00:00:00").getTime() + (isWeekly(lastLog.compoundName) ? 7 : 1) * 86400000)
      : null;
    const nextDateStr = nextShotDate
      ? nextShotDate.toLocaleDateString("en-US", { weekday: "long", month: "numeric", day: "numeric", year: "2-digit" })
      : null;
    const todayMs2 = Date.now();
    const nextDiff = nextShotDate ? Math.ceil((nextShotDate.getTime() - todayMs2) / 86400000) : null;
    const isOverdue = nextDiff != null && nextDiff < 0;

    // Group shots by month for History
    const shotsByMonth: { monthLabel: string; shots: Glp1Log[] }[] = [];
    reversed.forEach(log => {
      const ml = new Date(log.loggedDate + "T00:00:00")
        .toLocaleDateString("en-US", { month: "long", year: "numeric" })
        .toUpperCase();
      const last = shotsByMonth.at(-1);
      if (last && last.monthLabel === ml) {
        last.shots.push(log);
      } else {
        shotsByMonth.push({ monthLabel: ml, shots: [log] });
      }
    });

    // ── Progress chart data ───────────────────────────────────────────────────
    const chartCutoff: Date | null =
      glp1ChartRange === "4w" ? new Date(Date.now() - 28  * 86400000) :
      glp1ChartRange === "3m" ? new Date(Date.now() - 91  * 86400000) : null;

    const chartPoints = sorted
      .filter(log => {
        if (!chartCutoff) return true;
        return new Date(log.loggedDate + "T00:00:00") >= chartCutoff;
      })
      .map((log) => {
        // Use full sorted history for delta so first visible point in a filtered
        // view still shows Δ from the preceding weighted shot outside the range.
        const fullIdx   = sorted.findIndex(l => l.id === log.id);
        const prevWithW = sorted.slice(0, fullIdx).reverse().find(l => l.weightKg != null);
        const wKg       = log.weightKg != null ? parseFloat(log.weightKg) : null;
        const prevWKg   = prevWithW?.weightKg != null ? parseFloat(prevWithW.weightKg) : null;
        const dKg       = wKg != null && prevWKg != null ? +(wKg - prevWKg).toFixed(2) : null;

        let weight: number | null = null;
        if (wKg != null) {
          if (glp1WeightUnit === "lbs")     weight = +( wKg * 2.20462).toFixed(1);
          else if (glp1WeightUnit === "st") weight = +( wKg / 6.35029).toFixed(3);
          else                              weight = +wKg.toFixed(1);
        }

        return { date: log.loggedDate, weight, dose: parseFloat(log.doseMg), deltaKg: dKg };
      });

    const weightPoints   = chartPoints.filter(p => p.weight != null);
    const hasWeightChart = weightPoints.length >= 2;

    // Tight Y-axis domain for weight
    const wValues = weightPoints.map(p => p.weight as number);
    const wMin    = wValues.length ? Math.min(...wValues) : 0;
    const wMax    = wValues.length ? Math.max(...wValues) : 1;
    const wPad    = Math.max((wMax - wMin) * 0.2, glp1WeightUnit === "lbs" ? 2 : 0.5);
    const wDomain: [number, number] = [+(wMin - wPad).toFixed(2), +(wMax + wPad).toFixed(2)];

    const wAxisLabel = (v: number) =>
      glp1WeightUnit === "lbs" ? `${v.toFixed(0)}` :
      glp1WeightUnit === "st"  ? `${v.toFixed(1)}` :
      `${v.toFixed(1)}`;

    const pctChange = (firstKg != null && lastKg != null && deltaKg != null && firstKg > 0)
      ? ((deltaKg / firstKg) * 100) : null;
    const weeksBetween = (firstWLog && lastWLog && firstWLog.id !== lastWLog.id)
      ? Math.max(1, (new Date(lastWLog.loggedDate + "T00:00:00").getTime() - new Date(firstWLog.loggedDate + "T00:00:00").getTime()) / (7 * 86400000))
      : null;
    const weeklyAvgKg = (deltaKg != null && weeksBetween != null) ? deltaKg / weeksBetween : null;
    const toGoalKg = (lastKg != null && goalKg != null) ? lastKg - goalKg : null;
    const toGoalPct = (toGoalKg != null && firstKg != null && goalKg != null && (firstKg - goalKg) > 0)
      ? (1 - toGoalKg / (firstKg - goalKg)) * 100 : null;

    return (
      <PortalLayout showHubNav={false} navProps={navProps}>

        {/* ═══════════════════ ADD SHOT OVERLAY ════════════════════════════════ */}
        <AnimatePresence>
          {showGlp1Form && (
            <Glp1ShotForm
              weightUnit={glp1WeightUnit}
              isSaving={createGlp1Mut.isPending}
              onClose={() => setShowGlp1Form(false)}
              onSave={async payload => { await createGlp1Mut.mutateAsync(payload); }}
            />
          )}
        </AnimatePresence>

        {/* ════════════════════ UNIFIED GRADIENT HEADER ════════════════════════ */}
        <div className="-mx-5 -mt-6 lg:-mx-8 lg:-mt-7 relative overflow-hidden"
             style={{ background: "linear-gradient(135deg, var(--brand-navy) 0%, var(--brand-blue) 100%)" }}>
          <div className="absolute inset-0 opacity-10"
               style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white 0%, transparent 60%)" }} />
          <div className="relative px-5 pt-5 pb-6 lg:px-8 lg:pt-6">
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => setSection("home")}
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.12)" }}>
                <ChevronLeft className="w-5 h-5" style={{ color: "rgba(255,255,255,0.9)" }} />
              </button>
              {glp1SubTab === "shots" && (
                <button
                  onClick={() => setShowGlp1Form(true)}
                  className="h-9 px-4 rounded-xl flex items-center gap-1.5 text-sm font-semibold"
                  style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.9)" }}
                >
                  <Plus className="w-3.5 h-3.5" /> Add shot
                </button>
              )}
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1"
               style={{ color: "rgba(255,255,255,0.6)" }}>CUSTOMER PORTAL</p>
            <h1 className="text-2xl font-bold text-white leading-tight">GLP-1 Tracker</h1>
          </div>
        </div>

        {/* ════════════════════ SUB-TAB BAR ════════════════════════════════════ */}
        <div className="-mx-5 lg:-mx-8 px-4 py-2" style={{ background: T.surface }}>
          <div className="flex gap-0.5 p-1 rounded-xl" style={{ background: T.surface2 }}>
            {(["summary", "shots", "settings"] as const).map(tab => (
              <button key={tab} onClick={() => setGlp1SubTab(tab)}
                className="flex-1 h-8 rounded-lg text-xs font-bold transition-all capitalize"
                style={{
                  background: glp1SubTab === tab ? "linear-gradient(135deg, var(--t-blue), var(--t-blue-deep))" : "transparent",
                  color: glp1SubTab === tab ? "#fff" : LABEL_CLR,
                }}>
                {tab === "summary" ? "Summary" : tab === "shots" ? "Shots" : "Settings"}
              </button>
            ))}
          </div>
        </div>

        {glp1Loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: TEAL }} />
          </div>
        ) : (
          <div className="pb-24 md:pb-6 -mx-5 px-4 pt-4" style={{ background: PAGE_BG, minHeight: "calc(100vh - 120px)" }}>

            {/* ═════════════════════════ SUMMARY TAB ══════════════════════════ */}
            {glp1SubTab === "summary" && (
              glp1Logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: TEAL_BG }}>
                    <Syringe className="w-8 h-8" style={{ color: TEAL }} />
                  </div>
                  <p className="text-base font-bold mb-2" style={{ color: TEXT_CLR }}>No shots yet</p>
                  <p className="text-sm mb-6" style={{ color: LABEL_CLR }}>
                    Log your first injection to start tracking.
                  </p>
                  <button
                    onClick={() => { setGlp1SubTab("shots"); setShowGlp1Form(true); }}
                    className="h-11 px-6 rounded-2xl text-sm font-semibold text-white"
                    style={{ background: TEAL }}>
                    + Log First Shot
                  </button>
                </div>
              ) : (
                <div className="space-y-4">

                  {/* ═══════════ WEIGHT PROGRESS CHART ══════════════════════ */}
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl overflow-hidden"
                    style={{ background: CARD_BG, border: `1px solid ${BORDER_CLR}` }}>

                    <div className="flex items-center justify-between px-5 pt-5 pb-3">
                      <div>
                        <p className="text-base font-bold" style={{ color: TEXT_CLR }}>Weight Progress</p>
                        {deltaKg != null && (
                          <p className="text-xs font-semibold mt-0.5"
                            style={{ color: deltaKg < 0 ? "#16A34A" : "#DC2626" }}>
                            {deltaKg < 0 ? "−" : "+"}{displayW(Math.abs(deltaKg), glp1WeightUnit)} overall
                          </p>
                        )}
                      </div>
                      <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: T.surface2 }}>
                        {(["4w", "3m", "all"] as const).map(r => (
                          <button key={r} onClick={() => setGlp1ChartRange(r)}
                            className="px-3 py-1.5 rounded-md text-[11px] font-bold transition-all"
                            style={{
                              background: glp1ChartRange === r
                                ? "linear-gradient(135deg, var(--t-blue), var(--t-blue-deep))"
                                : "transparent",
                              color: glp1ChartRange === r ? "#fff" : LABEL_CLR,
                            }}>
                            {r === "4w" ? "4W" : r === "3m" ? "3M" : "All"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {hasWeightChart ? (
                      <div className="pt-2 pb-4 px-2">
                        <ResponsiveContainer width="100%" height={240}>
                          <ComposedChart data={chartPoints} margin={{ top: 24, right: 12, left: 0, bottom: 4 }}>
                            <defs>
                              <linearGradient id="glp1WGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%"   stopColor="var(--t-blue)" stopOpacity={0.25} />
                                <stop offset="100%" stopColor="var(--t-blue)" stopOpacity={0}   />
                              </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke="#F2F2F7" strokeDasharray="0" />
                            <XAxis
                              dataKey="date"
                              tickFormatter={(d: string) =>
                                new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
                                  day: "2-digit", month: "short",
                                })
                              }
                              tick={{ fontSize: 10, fill: LABEL_CLR }}
                              tickLine={false}
                              axisLine={false}
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              yAxisId="w"
                              orientation="left"
                              domain={wDomain}
                              tick={{ fontSize: 10, fill: LABEL_CLR }}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={wAxisLabel}
                              width={36}
                              tickCount={5}
                            />
                            <YAxis
                              yAxisId="mg"
                              orientation="right"
                              tick={false}
                              tickLine={false}
                              axisLine={false}
                              width={0}
                            />
                            <Tooltip
                              content={
                                <Glp1ChartTooltip unit={glp1WeightUnit} />
                              }
                              cursor={{ stroke: "#E5E5EA", strokeWidth: 1 }}
                            />
                            <Bar
                              yAxisId="mg"
                              dataKey="dose"
                              name="dose"
                              fill="#7C3AED"
                              opacity={0.45}
                              radius={[4, 4, 0, 0]}
                              maxBarSize={24}
                            />
                            <Area
                              yAxisId="w"
                              type="monotone"
                              dataKey="weight"
                              name="weight"
                              stroke="var(--t-blue)"
                              strokeWidth={2.5}
                              fill="url(#glp1WGrad)"
                              dot={{ r: 4, fill: "var(--t-blue)", strokeWidth: 2, stroke: "#fff" }}
                              activeDot={{ r: 6, fill: "var(--t-blue)", strokeWidth: 2, stroke: "#fff" }}
                              connectNulls={false}
                            >
                              <LabelList
                                dataKey="dose"
                                content={<Glp1DoseLabel />}
                              />
                            </Area>
                          </ComposedChart>
                        </ResponsiveContainer>
                        <div className="flex items-center gap-5 px-5 pb-3 mt-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-0.5 rounded-full" style={{ background: "var(--t-blue)" }} />
                            <span className="text-[10px] font-semibold" style={{ color: LABEL_CLR }}>
                              Weight ({glp1WeightUnit})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-3 rounded-sm" style={{ background: "#7C3AED", opacity: 0.55 }} />
                            <span className="text-[10px] font-semibold" style={{ color: LABEL_CLR }}>
                              Dose (mg)
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                        <Scale className="w-8 h-8 mb-3" style={{ color: LABEL_CLR }} />
                        <p className="text-sm font-bold mb-1" style={{ color: TEXT_CLR }}>
                          {chartPoints.length === 0 ? "No shots in this period" : "Add weight to see your chart"}
                        </p>
                        <p className="text-xs" style={{ color: LABEL_CLR }}>
                          {chartPoints.length === 0
                            ? "Try switching to a wider time range."
                            : "Log weight when recording a shot to track your progress over time."}
                        </p>
                      </div>
                    )}
                  </motion.div>

                  {/* Next injection card */}
                  {nextDateStr && lastLog && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl p-5"
                      style={{
                        background: isOverdue ? "rgba(220,38,38,0.07)" : TEAL_BG,
                        border: `1px solid ${isOverdue ? "rgba(220,38,38,0.2)" : "var(--t-blue-25)"}`,
                      }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
                        style={{ color: isOverdue ? "#DC2626" : TEAL }}>Next Injection</p>
                      <p className="text-2xl font-extrabold mb-1" style={{ color: TEXT_CLR }}>
                        {isOverdue ? "Overdue!" : nextDiff === 0 ? "Today" : nextDiff === 1 ? "Tomorrow" : `In ${nextDiff} days`}
                      </p>
                      <p className="text-sm" style={{ color: LABEL_CLR }}>
                        {lastLog.compoundName} · {parseFloat(lastLog.doseMg).toFixed(2)} mg
                      </p>
                    </motion.div>
                  )}

                  {/* Stats 2×3 grid on mobile, 3×2 on sm+ */}
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.05 } }}
                    className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {([
                      { label: "Total change", value: deltaKg != null ? `${deltaKg < 0 ? "−" : "+"}${displayW(Math.abs(deltaKg), glp1WeightUnit)}` : "—", color: deltaKg != null && deltaKg < 0 ? "#16A34A" : "#DC2626", emoji: "📉" },
                      { label: "Current BMI", value: bmi ?? "—", color: "#F59E0B", emoji: "🏃" },
                      { label: "Weight", value: displayW(lastKg, glp1WeightUnit), color: TEAL, emoji: "⚖️" },
                      { label: "Percent", value: pctChange != null ? `${pctChange < 0 ? "" : "+"}${pctChange.toFixed(0)}%` : "—", color: pctChange != null && pctChange < 0 ? "#16A34A" : "#DC2626", emoji: "%" },
                      { label: "Weekly avg", value: weeklyAvgKg != null ? `${weeklyAvgKg < 0 ? "−" : "+"}${displayW(Math.abs(weeklyAvgKg), glp1WeightUnit)}/wk` : "—", color: "#7C3AED", emoji: "📊" },
                      { label: "To goal", value: toGoalKg != null ? (toGoalKg <= 0 ? "Reached!" : `${displayW(toGoalKg, glp1WeightUnit)}`) : "—", color: "#0D9488", emoji: "🏁", sub: toGoalPct != null ? `(${Math.min(100, Math.max(0, Math.round(toGoalPct)))}%)` : (goalKg == null ? "Set in settings" : undefined) },
                    ] as { label: string; value: string; color: string; emoji: string; sub?: string }[]).map(tile => (
                      <div key={tile.label} className="rounded-2xl p-3 sm:p-3.5"
                        style={{ background: CARD_BG, border: `1px solid ${BORDER_CLR}` }}>
                        <div className="flex items-center gap-1 mb-2" style={{ color: tile.color }}>
                          <span className="text-xs">{tile.emoji}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wide leading-tight">{tile.label}</span>
                        </div>
                        <p className="text-base font-extrabold leading-none truncate" style={{ color: TEXT_CLR }}>{tile.value}</p>
                        {tile.sub && <p className="text-[10px] mt-1 truncate" style={{ color: LABEL_CLR }}>{tile.sub}</p>}
                      </div>
                    ))}
                  </motion.div>

                  {/* Recent shots */}
                  {sorted.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
                      className="rounded-2xl overflow-hidden"
                      style={{ background: CARD_BG, border: `1px solid ${BORDER_CLR}` }}>
                      <div className="flex items-center justify-between px-5 py-3.5"
                        style={{ borderBottom: `1px solid ${DIVIDER}` }}>
                        <p className="text-sm font-bold" style={{ color: TEXT_CLR }}>Recent Shots</p>
                        <button onClick={() => setGlp1SubTab("shots")}
                          className="text-xs font-semibold" style={{ color: TEAL }}>
                          See all
                        </button>
                      </div>
                      {reversed.slice(0, 4).map((log, i) => (
                        <div key={log.id} className="flex items-center gap-3 px-5 py-3.5"
                          style={{ borderBottom: i < Math.min(reversed.length, 4) - 1 ? `1px solid ${DIVIDER}` : undefined }}>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold text-white shrink-0"
                            style={{ background: BADGE_BG }}>
                            {parseFloat(log.doseMg).toFixed(1)} mg
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: TEXT_CLR }}>{log.compoundName}</p>
                            <p className="text-[11px]" style={{ color: LABEL_CLR }}>
                              {new Date(log.loggedDate + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              )
            )}

            {/* ══════════════════════════ SHOTS TAB ═══════════════════════════ */}
            {glp1SubTab === "shots" && (
              sorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: TEAL_BG }}>
                    <Syringe className="w-8 h-8" style={{ color: TEAL }} />
                  </div>
                  <p className="text-base font-bold mb-2" style={{ color: TEXT_CLR }}>No shots logged</p>
                  <p className="text-sm mb-6" style={{ color: LABEL_CLR }}>
                    Tap "+ Add shot" above to log your first injection.
                  </p>
                </div>
              ) : (
                <div>
                  {/* Next Shot card */}
                  {nextDateStr && lastLog && (
                    <div className="px-4 pt-4 pb-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: LABEL_CLR }}>Next Shot</p>
                      <div className="rounded-2xl p-4"
                        style={{ background: CARD_BG, border: `1px solid ${BORDER_CLR}` }}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="text-xs font-bold" style={{ color: isOverdue ? "#DC2626" : TEAL }}>
                              Shot {sorted.length + 1}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: LABEL_CLR }}>
                              {isOverdue ? "Overdue" : `Take ${nextDateStr}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-sm font-bold" style={{ color: TEXT_CLR }}>{lastLog.compoundName}</p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                            style={{ background: BADGE_BG }}>
                            {parseFloat(lastLog.doseMg).toFixed(1)} mg
                          </span>
                        </div>
                        {lastLog.injectionSite && (
                          <p className="text-xs mt-1" style={{ color: LABEL_CLR }}>
                            {INJECTION_SITES.find(s => s.id === lastLog.injectionSite)?.label ?? lastLog.injectionSite}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* History grouped by month */}
                  <div className="px-4 pt-3 pb-4 space-y-4">
                    {shotsByMonth.length > 0 && (
                      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: LABEL_CLR }}>History</p>
                    )}
                    {shotsByMonth.map(({ monthLabel, shots: mShots }) => (
                      <div key={monthLabel} className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider"
                          style={{ color: LABEL_CLR }}>{monthLabel}</p>
                        <div className="rounded-2xl overflow-hidden"
                          style={{ background: CARD_BG, border: `1px solid ${BORDER_CLR}` }}>
                          {mShots.map((log, i) => {
                            const shotNum = sorted.findIndex(s => s.id === log.id) + 1;
                            return (
                              <div key={log.id}
                                style={{ borderBottom: i < mShots.length - 1 ? `1px solid ${DIVIDER}` : undefined }}>
                                {/* Header row: shot # + date + trash */}
                                <div className="flex items-center justify-between px-4 pt-3 pb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold" style={{ color: TEXT_CLR }}>Shot {shotNum}</span>
                                    <span className="text-xs" style={{ color: LABEL_CLR }}>
                                      {new Date(log.loggedDate + "T00:00:00").toLocaleDateString("en-US", {
                                        weekday: "short", month: "numeric", day: "numeric", year: "2-digit",
                                      })}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => deleteGlp1Mut.mutate(log.id)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                                    style={{ background: "rgba(220,38,38,0.06)" }}>
                                    <Trash2 className="w-3.5 h-3.5" style={{ color: "#DC2626" }} />
                                  </button>
                                </div>
                                {/* Compound + badge */}
                                <div className="flex items-center gap-2 px-4 pb-2 pt-0.5">
                                  <p className="text-sm font-bold" style={{ color: TEXT_CLR }}>{log.compoundName}</p>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                                    style={{ background: BADGE_BG }}>
                                    {parseFloat(log.doseMg).toFixed(1)} mg
                                  </span>
                                </div>
                                {/* Injection site */}
                                {log.injectionSite && (
                                  <p className="px-4 pb-2.5 text-xs" style={{ color: LABEL_CLR }}>
                                    {INJECTION_SITES.find(s => s.id === log.injectionSite)?.label ?? log.injectionSite}
                                  </p>
                                )}
                                {/* Notes */}
                                {log.notes && (
                                  <p className="px-4 pb-2.5 text-[11px] italic" style={{ color: LABEL_CLR }}>
                                    "{log.notes}"
                                  </p>
                                )}
                                {/* Weight */}
                                {log.weightKg && (
                                  <p className="px-4 pb-2.5 text-[11px]" style={{ color: LABEL_CLR }}>
                                    Weight: {displayW(log.weightKg, glp1WeightUnit)}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}

            {/* ═════════════════════════ SETTINGS TAB ═════════════════════════ */}
            {glp1SubTab === "settings" && (
              <div className="p-4 space-y-4">
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: CARD_BG, border: `1px solid ${BORDER_CLR}` }}>

                  {/* Weight unit */}
                  <div className="px-4 py-3.5" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-2"
                      style={{ color: LABEL_CLR }}>Weight Unit</p>
                    <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER_CLR}` }}>
                      {(["kg", "st", "lbs"] as const).map(u => (
                        <button key={u}
                          onClick={() => handleWeightUnitChange(u)}
                          className="flex-1 h-9 text-sm font-semibold transition-colors"
                          style={{
                            background: glp1WeightUnit === u ? TEAL : "transparent",
                            color:      glp1WeightUnit === u ? "#fff" : LABEL_CLR,
                          }}>
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Height unit + input */}
                  <div className="px-4 py-4" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: TEXT_CLR }}>Height</p>
                        <p className="text-[11px] mt-0.5" style={{ color: LABEL_CLR }}>Used to calculate your BMI</p>
                      </div>
                      <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER_CLR}` }}>
                        {(["cm", "ft"] as const).map(u => (
                          <button key={u}
                            onClick={() => handleHeightUnitChange(u)}
                            className="px-3 h-8 text-xs font-semibold transition-colors"
                            style={{
                              background: glp1HeightUnit === u ? TEAL : "transparent",
                              color:      glp1HeightUnit === u ? "#fff" : LABEL_CLR,
                            }}>
                            {u === "ft" ? "ft / in" : "cm"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {glp1HeightUnit === "cm" ? (
                      <div className="relative">
                        <input
                          type="number" min="100" max="250" step="1"
                          value={settingsHeight}
                          onChange={e => {
                            setSettingsHeight(e.target.value);
                            localStorage.setItem(`peps:${username}:glp1_height_cm`, e.target.value);
                          }}
                          placeholder="175"
                          className="w-full h-11 px-4 pr-12 text-sm font-semibold rounded-xl outline-none transition-all"
                          style={{ background: T.surface2, color: TEXT_CLR, border: `1.5px solid ${BORDER_CLR}` }}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold pointer-events-none"
                          style={{ color: LABEL_CLR }}>cm</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number" min="3" max="8" step="1"
                            value={heightFtStr}
                            onChange={e => {
                              const ft = e.target.value;
                              setHeightFtStr(ft);
                              const ftNum = parseFloat(ft) || 0;
                              const inNum = parseFloat(heightInStr) || 0;
                              const cm = (ftNum * 30.48) + (inNum * 2.54);
                              const cmStr = cm > 0 ? cm.toFixed(1) : "";
                              setSettingsHeight(cmStr);
                              localStorage.setItem(`peps:${username}:glp1_height_cm`, cmStr);
                            }}
                            placeholder="5"
                            className="w-full h-11 px-4 pr-10 text-sm font-semibold rounded-xl outline-none"
                            style={{ background: T.surface2, color: TEXT_CLR, border: `1.5px solid ${BORDER_CLR}` }}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold pointer-events-none"
                            style={{ color: LABEL_CLR }}>ft</span>
                        </div>
                        <div className="relative flex-1">
                          <input
                            type="number" min="0" max="11" step="1"
                            value={heightInStr}
                            onChange={e => {
                              const ins = e.target.value;
                              setHeightInStr(ins);
                              const ftNum = parseFloat(heightFtStr) || 0;
                              const inNum = parseFloat(ins) || 0;
                              const cm = (ftNum * 30.48) + (inNum * 2.54);
                              const cmStr = cm > 0 ? cm.toFixed(1) : "";
                              setSettingsHeight(cmStr);
                              localStorage.setItem(`peps:${username}:glp1_height_cm`, cmStr);
                            }}
                            placeholder="10"
                            className="w-full h-11 px-4 pr-10 text-sm font-semibold rounded-xl outline-none"
                            style={{ background: T.surface2, color: TEXT_CLR, border: `1.5px solid ${BORDER_CLR}` }}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold pointer-events-none"
                            style={{ color: LABEL_CLR }}>in</span>
                        </div>
                      </div>
                    )}

                    {heightCm != null && lastKg != null && (
                      <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl"
                        style={{ background: "rgba(16,163,74,0.08)" }}>
                        <span className="text-base">🏃</span>
                        <span className="text-xs font-semibold" style={{ color: "#16A34A" }}>
                          Current BMI: {(lastKg / Math.pow(heightCm / 100, 2)).toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Goal weight */}
                  <div className="px-4 py-4">
                    <div className="mb-3">
                      <p className="text-sm font-semibold" style={{ color: TEXT_CLR }}>Goal Weight</p>
                      <p className="text-[11px] mt-0.5" style={{ color: LABEL_CLR }}>
                        Track your progress toward a target
                      </p>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min={glp1WeightUnit === "kg" ? 30 : glp1WeightUnit === "lbs" ? 66 : 5}
                        max={glp1WeightUnit === "kg" ? 300 : glp1WeightUnit === "lbs" ? 660 : 47}
                        step={glp1WeightUnit === "kg" ? 0.1 : glp1WeightUnit === "lbs" ? 0.5 : 0.1}
                        value={goalDisplayStr}
                        onChange={e => {
                          const v = e.target.value;
                          setGoalDisplayStr(v);
                          const n = parseFloat(v);
                          if (!isNaN(n) && v !== "") {
                            let kg = n;
                            if (glp1WeightUnit === "lbs") kg = n / 2.20462;
                            else if (glp1WeightUnit === "st") kg = n * 6.35029;
                            const kgStr = kg.toFixed(2);
                            setSettingsGoal(kgStr);
                            localStorage.setItem(`peps:${username}:glp1_goal_kg`, kgStr);
                          } else {
                            setSettingsGoal("");
                            localStorage.setItem(`peps:${username}:glp1_goal_kg`, "");
                          }
                        }}
                        placeholder={glp1WeightUnit === "kg" ? "e.g. 75" : glp1WeightUnit === "lbs" ? "e.g. 165" : "e.g. 11.5"}
                        className="w-full h-11 px-4 pr-14 text-sm font-semibold rounded-xl outline-none transition-all"
                        style={{ background: T.surface2, color: TEXT_CLR, border: `1.5px solid ${BORDER_CLR}` }}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold pointer-events-none"
                        style={{ color: LABEL_CLR }}>{glp1WeightUnit}</span>
                    </div>
                    {goalKg != null && lastKg != null && (
                      <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl"
                        style={{ background: lastKg <= goalKg ? "rgba(16,163,74,0.08)" : "rgba(13,148,136,0.08)" }}>
                        <span className="text-base">🏁</span>
                        <span className="text-xs font-semibold"
                          style={{ color: lastKg <= goalKg ? "#16A34A" : "#0D9488" }}>
                          {lastKg <= goalKg
                            ? "Goal reached! 🎉"
                            : `${displayW(Math.abs(lastKg - goalKg), glp1WeightUnit)} to go`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl p-3"
                  style={{ background: "var(--t-blue-06)", border: "1px solid var(--t-blue-15)" }}>
                  <p className="text-xs" style={{ color: LABEL_CLR }}>
                    {glp1Logs.length} entr{glp1Logs.length === 1 ? "y" : "ies"} logged. Delete shots from the Shots tab.
                  </p>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ── Bottom nav – 3 tabs ───────────────────────────────────────────── */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
          style={{
            background: CARD_BG,
            borderTop: `1px solid ${BORDER_CLR}`,
            paddingBottom: "env(safe-area-inset-bottom)",
          }}>
          {([
            { id: "summary",  label: "Summary",  icon: <ClipboardList className="w-5 h-5" /> },
            { id: "shots",    label: "Shots",    icon: <Syringe className="w-5 h-5" /> },
            { id: "settings", label: "Settings", icon: <Settings className="w-5 h-5" /> },
          ] as { id: "summary" | "shots" | "settings"; label: string; icon: React.ReactNode }[]).map(tab => (
            <button key={tab.id} onClick={() => setGlp1SubTab(tab.id)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5">
              <div className="flex items-center justify-center w-12 h-7 rounded-full transition-all"
                style={{ background: glp1SubTab === tab.id ? TEAL_BG : "transparent" }}>
                <span style={{ color: glp1SubTab === tab.id ? TEAL : LABEL_CLR }}>{tab.icon}</span>
              </div>
              <span className="text-[10px] font-semibold"
                style={{ color: glp1SubTab === tab.id ? TEAL : LABEL_CLR }}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>

      </PortalLayout>
    );
  }

  // ─── My History section ───────────────────────────────────────────────────────
  if (section === "history") {
    return (
      <PortalLayout navProps={navProps}>
        <PageTitle title="My History" subtitle={`@${username}`} />
        <MyHistorySection onBack={() => setSection("home")} />
      </PortalLayout>
    );
  }

  // ─── Explore sections (rendered bare inside the hub) ─────────────────────────

  if (section === "protocols") {
    return (
      <PortalLayout navProps={navProps}>
        <Protocols bare />
      </PortalLayout>
    );
  }

  if (section === "medications") {
    return (
      <PortalLayout navProps={navProps}>
        <Protocols bare initialTrack="medications" />
      </PortalLayout>
    );
  }

  if (section === "trtaas") {
    return (
      <PortalLayout navProps={navProps}>
        <Protocols bare initialTrack="trtaas" />
      </PortalLayout>
    );
  }

  if (section === "community-testing") {
    return (
      <PortalLayout navProps={navProps}>
        <PublicTestingPools bare />
      </PortalLayout>
    );
  }

  if (section === "lab-tests") {
    return (
      <PageLayout>
        <LabTests bare />
        <HubBottomNav {...navProps} />
      </PageLayout>
    );
  }

  if (section === "support") {
    return (
      <PortalLayout navProps={navProps}>
        <SupportSection username={username} onBack={() => setSection("home")} initialTicketId={_initTicketId ?? undefined} />
      </PortalLayout>
    );
  }

  // ─── Telegram section ─────────────────────────────────────────────────────────

  return (
    <PortalLayout navProps={navProps}>
      <PageTitle title="Telegram Notifications" subtitle={`@${username}`} />
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <TelegramCard />
      </motion.div>
    </PortalLayout>
  );
}
