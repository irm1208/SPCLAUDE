import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, UserCheck, HelpCircle, RefreshCw, Loader2,
  ChevronDown, ChevronUp, Package, MapPin, Phone,
  AlertCircle, MessageCircle, Truck, Mail, StickyNote,
  ExternalLink, LayoutList, LayoutGrid, GripVertical,
  Lock, AlertTriangle, RotateCcw, Ban, ShieldCheck,
  Search, X, Settings2, Eye, EyeOff, Copy, Zap,
  Filter, ChevronRight, Flag, Globe, Check,
} from "lucide-react";
import { Button, Card, cn } from "@/components/ui";
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  type DragEndEvent, type DragStartEvent, type DragOverEvent,
  PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { toast } from "sonner";

// ── API ───────────────────────────────────────────────────────────────────────
function apiUrl(path: string) { return `/api${path}`; }

// ── Types ─────────────────────────────────────────────────────────────────────
type RoutingType = "direct" | "reshipper" | "unrouted";

type BoardOrder = {
  id: string; code: string; telegramUsername: string; status: string;
  paymentStatus: string; routingType: string | null; batchLocked: boolean;
  reshipperUsername: string | null; countryLegId: string | null;
  shippingCountry: string | null; shippingName: string | null;
  shippingAddress: string | null; shippingCity: string | null;
  shippingPostcode: string | null; shippingPhone: string | null;
  shippingEmail: string | null; grandTotal: number; amountDue: number;
  vendorShipping: number; directShippingCost: number | null;
  deliveryMethod: string; deliveryPrice: number; notes: string | null;
  kitCount: number; missingAddress: boolean; balanceDue: boolean;
  usedReshipperCode: boolean;
  lineItems: { productName: string; quantity: number }[];
  lastModified: string;
};

type RoutingGroup = {
  type: "direct" | "reshipper" | "unrouted" | "legacy";
  reshipperUsername: string | null;
  reshipperHubCountry: string | null;
  paymentBlocked: boolean;
  totalOrders: number; totalKits: number;
  missingAddressCount: number; balanceDueCount: number;
  countryBreakdown: { countryCode: string; count: number }[];
  vendorShippingTotal: number | null; vendorShippingPerOrder: number | null;
  reshipperCode: string | null; reshipperCodeActive: boolean | null;
  codeCapacity: number | null; codeAssignedCount: number;
  orders: BoardOrder[];
};

type FulfillmentBoardData = {
  lastModified: string; canUndo: boolean;
  activeReshippers: {
    username: string; country: string; enabled: boolean;
    paymentBlocked: boolean; reshipperCode: string | null;
    reshipperCodeActive: boolean; codeCapacity: number | null;
    codeAssignedCount: number;
  }[];
  groups: RoutingGroup[];
};

type RoutingWarnings = {
  legacyOrders: { id: string; code: string; telegramUsername: string }[];
  unresolvedBalances: { id: string; code: string; telegramUsername: string; amountDue: string }[];
  amendedAfterBatchLock: { id: string; code: string }[];
  missingWholesalePrices: { legId: string; countryCode: string; countryName: string }[];
  capacityAlerts: { id: string; message: string; createdAt: string | null }[];
};

type RoutingPreview = {
  orderId: string;
  from: { routingType: string | null; reshipperUsername: string | null; batchSize: number; batchSizeAfterMove: number };
  to: { routingType: string | null; reshipperUsername: string | null; batchSize: number; batchSizeAfterMove: number };
};

type CountryLeg = {
  id: string; countryCode: string; countryName: string; sortOrder: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function countryFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "🌍";
  return code.toUpperCase().replace(/./g, c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65));
}

const RESHIPPER_COLOR_PALETTE = [
  { accent: "border-blue-200 bg-blue-50/30", header: "bg-blue-50 border-blue-200 text-blue-800" },
  { accent: "border-purple-200 bg-purple-50/30", header: "bg-purple-50 border-purple-200 text-purple-800" },
  { accent: "border-teal-200 bg-teal-50/30", header: "bg-teal-50 border-teal-200 text-teal-800" },
  { accent: "border-indigo-200 bg-indigo-50/30", header: "bg-indigo-50 border-indigo-200 text-indigo-800" },
  { accent: "border-rose-200 bg-rose-50/30", header: "bg-rose-50 border-rose-200 text-rose-800" },
  { accent: "border-cyan-200 bg-cyan-50/30", header: "bg-cyan-50 border-cyan-200 text-cyan-800" },
] as const;

function reshipperColorIndex(username: string | null): number {
  if (!username) return 0;
  let h = 0;
  for (const ch of username) h = (h * 31 + ch.charCodeAt(0)) & 0xffff;
  return h % RESHIPPER_COLOR_PALETTE.length;
}

function groupDropId(g: RoutingGroup): string {
  if (g.type === "direct") return "grp:direct";
  if (g.type === "reshipper") return `grp:reshipper:${g.reshipperUsername ?? "__unassigned__"}`;
  if (g.type === "unrouted") return "grp:unrouted";
  return "grp:legacy";
}

function dropIdToRouting(dropId: string): { routingType: string; reshipperUsername: string | null } {
  if (dropId === "grp:direct") return { routingType: "direct", reshipperUsername: null };
  if (dropId === "grp:unrouted") return { routingType: "unrouted", reshipperUsername: null };
  if (dropId.startsWith("grp:reshipper:")) {
    const u = dropId.slice("grp:reshipper:".length);
    return { routingType: "reshipper", reshipperUsername: u === "__unassigned__" ? null : u };
  }
  return { routingType: "unrouted", reshipperUsername: null };
}

// ── Badges ────────────────────────────────────────────────────────────────────
function PayBadge({ status }: { status: string }) {
  const cls =
    status === "confirmed" ? "bg-green-100 text-green-700" :
    status === "test_confirmed" ? "bg-teal-100 text-teal-700" :
    status === "partial" ? "bg-yellow-100 text-yellow-700" :
    status === "pending" ? "bg-blue-100 text-blue-700" :
    "bg-slate-100 text-slate-500";
  return <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide", cls)}>{status}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "Shipped" ? "bg-purple-100 text-purple-700" :
    status === "Delivered" ? "bg-green-100 text-green-700" :
    status === "Processing" ? "bg-blue-100 text-blue-700" : "";
  if (!cls) return null;
  return <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide", cls)}>{status}</span>;
}

function RouteBadge({ type }: { type: "direct" | "reshipper" | "unrouted" | "legacy" }) {
  if (type === "direct") return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-0.5">
      <Home className="w-2.5 h-2.5" /> Direct
    </span>
  );
  if (type === "reshipper") return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-0.5">
      <UserCheck className="w-2.5 h-2.5" /> Reship
    </span>
  );
  if (type === "legacy") return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 flex items-center gap-0.5">
      <AlertTriangle className="w-2.5 h-2.5" /> Legacy
    </span>
  );
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-0.5">
      <HelpCircle className="w-2.5 h-2.5" /> Unrouted
    </span>
  );
}

// ── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({
  order, currency, activeReshippers, onQuickRoute, routing, compact = false, groupReshipperUsername = null,
}: {
  order: BoardOrder; currency: string;
  activeReshippers: { username: string; country: string; enabled: boolean }[];
  onQuickRoute: (orderId: string, routingType: string, reshipperUsername?: string | null) => Promise<void>;
  routing: boolean; compact?: boolean; groupReshipperUsername?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const tgHandle = order.telegramUsername.replace(/^@/, "");
  const effectiveType: "direct" | "reshipper" | "unrouted" | "legacy" =
    order.routingType === "direct" ? "direct" :
    order.routingType === "reshipper" ? "reshipper" :
    order.routingType === "unrouted" ? "unrouted" : "legacy";

  const isCrossBorder = order.reshipperUsername &&
    order.shippingCountry &&
    order.reshipperUsername &&
    order.shippingCountry !== null;

  const isOwnReshipperOrder = !!groupReshipperUsername &&
    order.telegramUsername.replace(/^@/, "").toLowerCase() === groupReshipperUsername.replace(/^@/, "").toLowerCase();

  const isUnpaid = order.paymentStatus === "unpaid";

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden transition-shadow",
      isOwnReshipperOrder ? "border-purple-300 bg-purple-50/40" :
      order.batchLocked ? "border-orange-300 bg-orange-50/40" :
      isUnpaid ? "border-red-200 bg-red-50/20" : "border-border/60 bg-card",
      order.missingAddress && "ring-1 ring-amber-300",
    )}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        {!compact && (
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 cursor-grab" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold">@{tgHandle}</span>
            <span className="text-[10px] text-muted-foreground font-mono">{order.code}</span>
            {order.batchLocked && <Lock className="w-3 h-3 text-orange-500 shrink-0" />}
            <PayBadge status={order.paymentStatus} />
            <StatusBadge status={order.status} />
            {order.missingAddress && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5" /> No address
              </span>
            )}
            {order.balanceDue && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                Balance due
              </span>
            )}
            {order.usedReshipperCode && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                Code
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {order.shippingCountry && (
              <span className="text-[10px] font-semibold text-muted-foreground">{countryFlag(order.shippingCountry)} {order.shippingCountry}</span>
            )}
            <span className="text-[10px] text-muted-foreground">{order.kitCount} kit{order.kitCount !== 1 ? "s" : ""}</span>
            {order.vendorShipping > 0
              ? <span className="text-[10px] text-muted-foreground font-medium">{currency}{order.vendorShipping.toFixed(2)} vendor</span>
              : <span className="text-[10px] text-amber-500 font-medium">vendor TBD</span>
            }
            {order.directShippingCost != null && order.directShippingCost > 0 && (
              <span className="text-[10px] text-green-600 font-medium">{currency}{order.directShippingCost.toFixed(2)} direct</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <span className={cn("text-sm font-bold", isUnpaid ? "text-red-600" : "text-foreground")}>
              {currency}{order.grandTotal.toFixed(2)}
            </span>
          </div>
          {routing && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          <button
            onClick={() => setOpen(o => !o)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.16 }} className="overflow-hidden">
            <div className="border-t border-border/60 px-3 py-3 space-y-3 bg-muted/20">
              {/* Items */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Items</p>
                <div className="space-y-0.5">
                  {order.lineItems.map((li, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span>{li.productName}</span>
                      <span className="font-semibold text-muted-foreground">×{li.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Costs */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Costs</p>
                <div className="space-y-0.5 text-xs">
                  {order.deliveryMethod && order.deliveryPrice > 0 && (
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1 text-muted-foreground"><Package className="w-3 h-3" /> {order.deliveryMethod}</span>
                      <span className="font-semibold">{currency}{order.deliveryPrice.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1 text-muted-foreground"><Truck className="w-3 h-3" /> Vendor shipping</span>
                    {order.vendorShipping > 0
                      ? <span className="font-semibold">{currency}{order.vendorShipping.toFixed(2)}</span>
                      : <span className="text-amber-500 font-semibold">TBD</span>}
                  </div>
                  {order.directShippingCost != null && (
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1 text-green-600"><Home className="w-3 h-3" /> Direct shipping</span>
                      <span className="font-semibold text-green-600">{currency}{order.directShippingCost.toFixed(2)}</span>
                    </div>
                  )}
                  {order.amountDue > 0 && (
                    <div className="flex justify-between">
                      <span className="text-red-600 font-semibold">Balance due</span>
                      <span className="font-bold text-red-600">{currency}{order.amountDue.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-border/40 mt-1">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold">{currency}{order.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Address */}
              {(order.shippingName || order.shippingAddress) && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Ship to</p>
                  <div className="space-y-0.5 text-xs">
                    {order.shippingName && <p className="font-semibold">{order.shippingName}</p>}
                    {order.shippingAddress && (
                      <p className="text-muted-foreground flex items-start gap-1">
                        <MapPin className="w-3 h-3 mt-0.5 shrink-0" />{order.shippingAddress}
                      </p>
                    )}
                    {(order.shippingCity || order.shippingPostcode) && (
                      <p className="text-muted-foreground pl-4">{[order.shippingPostcode, order.shippingCity].filter(Boolean).join("  ")}</p>
                    )}
                    {order.shippingCountry && <p className="text-muted-foreground pl-4">{order.shippingCountry}</p>}
                    {order.shippingPhone && (
                      <p className="text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{order.shippingPhone}</p>
                    )}
                    {order.shippingEmail && (
                      <p className="text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{order.shippingEmail}</p>
                    )}
                  </div>
                </div>
              )}

              {order.notes && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
                  <p className="text-xs text-muted-foreground flex items-start gap-1">
                    <StickyNote className="w-3 h-3 mt-0.5 shrink-0" />{order.notes}
                  </p>
                </div>
              )}

              {/* Quick route actions */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Quick route</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    disabled={routing || order.batchLocked}
                    onClick={() => onQuickRoute(order.id, "direct", null)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border transition-all",
                      effectiveType === "direct" ? "bg-green-500 border-green-500 text-white" : "border-border text-muted-foreground hover:border-green-400 hover:text-green-600",
                      (routing || order.batchLocked) && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    <Home className="w-3 h-3" /> Direct
                  </button>
                  {activeReshippers.filter(r => r.enabled).map(r => (
                    <button
                      key={r.username}
                      disabled={routing || order.batchLocked}
                      onClick={() => onQuickRoute(order.id, "reshipper", r.username)}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border transition-all",
                        effectiveType === "reshipper" && order.reshipperUsername === r.username
                          ? "bg-blue-500 border-blue-500 text-white"
                          : "border-border text-muted-foreground hover:border-blue-400 hover:text-blue-600",
                        (routing || order.batchLocked) && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      <UserCheck className="w-3 h-3" /> @{r.username.replace(/^@/, "")}
                    </button>
                  ))}
                  <button
                    disabled={routing || order.batchLocked}
                    onClick={() => onQuickRoute(order.id, "unrouted", null)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border transition-all",
                      effectiveType === "unrouted" ? "bg-amber-500 border-amber-500 text-white" : "border-border text-muted-foreground hover:border-amber-400 hover:text-amber-600",
                      (routing || order.batchLocked) && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    <HelpCircle className="w-3 h-3" /> Unrouted
                  </button>
                </div>
              </div>

              <a
                href={`https://t.me/${tgHandle}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted transition-colors text-muted-foreground"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Message @{tgHandle}
                <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Country Leg Group Card (read-only, leg perspective) ──────────────────────
function CountryLegGroupCard({
  leg, orders, currency, activeReshippers, onQuickRoute, boardView,
}: {
  leg: CountryLeg | null;
  orders: BoardOrder[];
  currency: string;
  activeReshippers: { username: string; country: string; enabled: boolean }[];
  onQuickRoute: (orderId: string, routingType: string, reshipperUsername?: string | null) => Promise<void>;
  boardView: boolean;
}) {
  const [open, setOpen] = useState(true);
  const label = leg ? leg.countryName : "Unassigned";
  const flag = leg ? countryFlag(leg.countryCode) : "🌍";
  const kitCount = orders.reduce((s, o) => s + o.kitCount, 0);
  const missingAddr = orders.filter(o => o.missingAddress).length;
  const balDue = orders.filter(o => o.balanceDue).length;
  const vendorShippingTotal = orders.reduce((s, o) => s + (o.vendorShipping ?? 0), 0);
  const directShippingTotal = orders.reduce((s, o) => s + (o.directShippingCost ?? 0), 0);

  const wrapperCls = boardView
    ? "flex-shrink-0 w-[260px] flex flex-col rounded-xl border overflow-hidden border-indigo-200 bg-indigo-50/30"
    : "rounded-xl border overflow-hidden border-indigo-200 bg-indigo-50/30";

  return (
    <div className={wrapperCls}>
      <div className="flex items-center gap-2 px-3 py-2.5 border-b bg-indigo-50 border-indigo-200 text-indigo-800">
        <span className="text-base shrink-0">{flag}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          <div className="flex items-center gap-1.5 text-[10px] opacity-70 flex-wrap mt-0.5">
            <span className="font-semibold">{orders.length} orders</span>
            <span>·</span>
            <span>{kitCount} kits</span>
            {missingAddr > 0 && <span className="text-amber-600 font-semibold">· {missingAddr} no addr</span>}
            {balDue > 0 && <span className="text-red-600 font-semibold">· {balDue} balance due</span>}
          </div>
          {(vendorShippingTotal > 0 || directShippingTotal > 0) && (
            <div className="flex items-center gap-2 text-[10px] flex-wrap mt-0.5">
              {vendorShippingTotal > 0 && (
                <span className="flex items-center gap-0.5 opacity-70">
                  <Truck className="w-2.5 h-2.5" /> {currency}{vendorShippingTotal.toFixed(2)} vendor
                </span>
              )}
              {directShippingTotal > 0 && (
                <span className="flex items-center gap-0.5 text-green-700 opacity-80">
                  <Home className="w-2.5 h-2.5" /> {currency}{directShippingTotal.toFixed(2)} direct
                </span>
              )}
            </div>
          )}
        </div>
        <button onClick={() => setOpen(o => !o)} className="p-1 rounded hover:bg-indigo-100">
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>
      {open && (
        <div className="space-y-2 p-2 overflow-y-auto max-h-[600px]">
          {orders.map(o => (
            <OrderCard
              key={o.id}
              order={o} currency={currency} activeReshippers={activeReshippers}
              onQuickRoute={onQuickRoute} routing={false} compact={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Draggable Order Card ──────────────────────────────────────────────────────
function DraggableOrderCard({
  order, currency, activeReshippers, onQuickRoute, routing, isDragOverlay = false, groupReshipperUsername = null,
}: {
  order: BoardOrder; currency: string;
  activeReshippers: { username: string; country: string; enabled: boolean }[];
  onQuickRoute: (orderId: string, routingType: string, reshipperUsername?: string | null) => Promise<void>;
  routing: boolean; isDragOverlay?: boolean; groupReshipperUsername?: string | null;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: order.id, data: { order },
  });

  return (
    <div
      ref={setNodeRef} {...listeners} {...attributes}
      style={{ opacity: isDragging ? 0.3 : 1, cursor: isDragging ? "grabbing" : "grab" }}
      className={cn(isDragOverlay && "rotate-1 shadow-2xl")}
    >
      <OrderCard
        order={order} currency={currency} activeReshippers={activeReshippers}
        onQuickRoute={onQuickRoute} routing={routing} compact={false}
        groupReshipperUsername={groupReshipperUsername}
      />
    </div>
  );
}

// ── Code Management Panel ─────────────────────────────────────────────────────
function CodePanel({
  gbId, secret, reshipperUsername, reshipperCode, reshipperCodeActive, codeCapacity, codeAssignedCount,
  onUpdated,
}: {
  gbId: string; secret: string; reshipperUsername: string;
  reshipperCode: string | null; reshipperCodeActive: boolean | null;
  codeCapacity: number | null; codeAssignedCount: number;
  onUpdated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [codeVisible, setCodeVisible] = useState(false);
  const [newCapacity, setNewCapacity] = useState(String(codeCapacity ?? ""));

  async function callCode(action: string, capacity?: number | null) {
    setSaving(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gbId}/reshippers/${reshipperUsername}/code`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ action, ...(action === "setCapacity" ? { capacity } : {}) }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Code ${action === "generate" ? "generated" : action === "deactivate" ? "deactivated" : action === "activate" ? "activated" : "capacity set"}`);
      onUpdated();
    } catch {
      toast.error("Failed to update reshipper code");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-3 space-y-3 border-t border-border/60 bg-muted/20">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Reshipper Code</p>

      {reshipperCode ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold tracking-widest">
              {codeVisible ? reshipperCode : "••••••••"}
            </span>
            <button onClick={() => setCodeVisible(v => !v)} className="text-muted-foreground hover:text-foreground">
              {codeVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            {codeVisible && (
              <button onClick={() => { navigator.clipboard.writeText(reshipperCode); toast.success("Code copied"); }}
                className="text-muted-foreground hover:text-foreground">
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}
            <span className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
              reshipperCodeActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500",
            )}>
              {reshipperCodeActive ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {codeAssignedCount} used{codeCapacity != null ? ` / ${codeCapacity} capacity` : ""}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button disabled={saving} onClick={() => callCode("generate")}
              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50">
              <Zap className="w-3 h-3" /> Rotate Code
            </button>
            {reshipperCodeActive ? (
              <button disabled={saving} onClick={() => callCode("deactivate")}
                className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50">
                <Ban className="w-3 h-3" /> Deactivate
              </button>
            ) : (
              <button disabled={saving} onClick={() => callCode("activate")}
                className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg border border-green-300 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50">
                <ShieldCheck className="w-3 h-3" /> Activate
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number" min={1} value={newCapacity}
              onChange={e => setNewCapacity(e.target.value)}
              placeholder="Set capacity (optional)"
              className="flex-1 px-2 py-1 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button disabled={saving}
              onClick={() => callCode("setCapacity", newCapacity ? parseInt(newCapacity) : null)}
              className="px-2 py-1 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50">
              Set
            </button>
          </div>
        </div>
      ) : (
        <button disabled={saving} onClick={() => callCode("generate")}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-dashed border-border hover:bg-muted transition-colors w-full justify-center disabled:opacity-50">
          <Zap className="w-3.5 h-3.5" /> Generate Invite Code
        </button>
      )}
    </div>
  );
}

// ── Routing Group Card ────────────────────────────────────────────────────────
function RoutingGroupCard({
  group, gbId, secret, currency, overId, activeReshippers, pendingIds, onQuickRoute, onPaymentBlockToggle, onCodeUpdated, isMobile, boardView,
}: {
  group: RoutingGroup; gbId: string; secret: string; currency: string;
  overId: string | null;
  activeReshippers: { username: string; country: string; enabled: boolean }[];
  pendingIds: Set<string>;
  onQuickRoute: (orderId: string, routingType: string, reshipperUsername?: string | null) => Promise<void>;
  onPaymentBlockToggle: (group: RoutingGroup, blocked: boolean) => Promise<void>;
  onCodeUpdated: () => void;
  isMobile: boolean;
  boardView: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [codeOpen, setCodeOpen] = useState(false);
  const [payToggling, setPayToggling] = useState(false);

  const dropId = groupDropId(group);
  const { setNodeRef, isOver } = useDroppable({ id: dropId });

  const isLegacy = group.type === "legacy";
  const isUnrouted = group.type === "unrouted";
  const isDirect = group.type === "direct";
  const isReshipper = group.type === "reshipper";

  const directShippingTotal = group.orders.reduce((s, o) => s + (o.directShippingCost ?? 0), 0);

  const reshipperPalette = isReshipper ? RESHIPPER_COLOR_PALETTE[reshipperColorIndex(group.reshipperUsername)] : null;

  const accentCls = isDirect ? "border-green-200 bg-green-50/30" :
    isReshipper ? reshipperPalette!.accent :
    isUnrouted ? "border-amber-200 bg-amber-50/30" : "border-slate-200 bg-slate-50/30";

  const headerAccent = isDirect ? "bg-green-50 border-green-200 text-green-800" :
    isReshipper ? reshipperPalette!.header :
    isUnrouted ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-slate-50 border-slate-200 text-slate-700";

  const groupLabel = isDirect ? "Direct Shipping" :
    isReshipper ? `@${(group.reshipperUsername ?? "unassigned").replace(/^@/, "")}` :
    isUnrouted ? "Unrouted" : "Legacy — Needs Backfill";

  const groupIcon = isDirect ? <Home className="w-4 h-4 shrink-0" /> :
    isReshipper ? <UserCheck className="w-4 h-4 shrink-0" /> :
    isUnrouted ? <HelpCircle className="w-4 h-4 shrink-0" /> :
    <AlertTriangle className="w-4 h-4 shrink-0" />;

  async function handlePaymentBlock() {
    setPayToggling(true);
    await onPaymentBlockToggle(group, !group.paymentBlocked);
    setPayToggling(false);
  }

  const wrapperCls = boardView
    ? cn("flex-shrink-0 w-[260px] flex flex-col rounded-xl border overflow-hidden", accentCls, group.paymentBlocked && "border-red-300")
    : cn("rounded-xl border overflow-hidden", accentCls, group.paymentBlocked && "border-red-300");

  return (
    <div className={wrapperCls}>
      {/* Header */}
      <div className={cn("flex items-center gap-2 px-3 py-2.5 border-b", headerAccent)}>
        {groupIcon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-semibold truncate">{groupLabel}</p>
            {isReshipper && group.reshipperHubCountry && (
              <span className="text-base leading-none" title={`Hub: ${group.reshipperHubCountry}`}>
                {countryFlag(group.reshipperHubCountry)}
              </span>
            )}
            {group.paymentBlocked && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-0.5">
                <Ban className="w-2.5 h-2.5" /> Payments blocked
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] opacity-70 flex-wrap mt-0.5">
            <span className="font-semibold">{group.totalOrders} orders</span>
            <span>·</span>
            <span>{group.totalKits} kits</span>
            {group.missingAddressCount > 0 && <span className="text-amber-600 font-semibold">· {group.missingAddressCount} no addr</span>}
            {group.balanceDueCount > 0 && <span className="text-red-600 font-semibold">· {group.balanceDueCount} balance due</span>}
          </div>
          {((group.vendorShippingTotal != null && group.vendorShippingTotal > 0) || directShippingTotal > 0) && (
            <div className="flex items-center gap-2 text-[10px] flex-wrap mt-0.5">
              {group.vendorShippingTotal != null && group.vendorShippingTotal > 0 && (
                <span className="flex items-center gap-0.5 opacity-70">
                  <Truck className="w-2.5 h-2.5" /> {currency}{group.vendorShippingTotal.toFixed(2)} vendor
                </span>
              )}
              {directShippingTotal > 0 && (
                <span className="flex items-center gap-0.5 text-green-700 opacity-80">
                  <Home className="w-2.5 h-2.5" /> {currency}{directShippingTotal.toFixed(2)} direct
                </span>
              )}
            </div>
          )}
          {/* Cross-border country breakdown */}
          {isReshipper && group.countryBreakdown.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {group.countryBreakdown.slice(0, 4).map(cb => (
                <span key={cb.countryCode} className="text-[10px] opacity-60">
                  {countryFlag(cb.countryCode)} ×{cb.count}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isLegacy && (
            <button
              title={group.paymentBlocked ? "Unblock payments for this group" : "Block payments for this group"}
              disabled={payToggling}
              onClick={handlePaymentBlock}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all",
                group.paymentBlocked
                  ? "bg-red-100 border-red-300 text-red-700 hover:bg-red-200"
                  : "bg-background/60 border-border text-muted-foreground hover:border-red-400 hover:text-red-600",
              )}
            >
              {payToggling ? <Loader2 className="w-3 h-3 animate-spin" /> :
                group.paymentBlocked ? <Ban className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
            </button>
          )}
          {isReshipper && (
            <button
              title="Manage reshipper code"
              onClick={() => setCodeOpen(v => !v)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all",
                codeOpen ? "bg-primary text-primary-foreground border-primary" : "bg-background/60 border-border text-muted-foreground hover:bg-muted",
              )}
            >
              <Settings2 className="w-3 h-3" />
            </button>
          )}
          <button onClick={() => setOpen(o => !o)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted/60 transition-colors">
            {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {/* Code panel */}
      <AnimatePresence initial={false}>
        {codeOpen && isReshipper && group.reshipperUsername && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <CodePanel
              gbId={gbId} secret={secret} reshipperUsername={group.reshipperUsername}
              reshipperCode={group.reshipperCode} reshipperCodeActive={group.reshipperCodeActive}
              codeCapacity={group.codeCapacity} codeAssignedCount={group.codeAssignedCount}
              onUpdated={onCodeUpdated}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order list */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.16 }} className="overflow-hidden">
            <div
              ref={setNodeRef}
              className={cn(
                "p-2 space-y-1.5 transition-colors",
                boardView && "overflow-y-auto max-h-[560px]",
                isOver && "bg-primary/5 ring-2 ring-inset ring-primary/20",
              )}
            >
              {[...group.orders].sort((a, b) => {
                const reship = group.reshipperUsername?.replace(/^@/, "").toLowerCase();
                const aOwn = reship && a.telegramUsername.replace(/^@/, "").toLowerCase() === reship ? -1 : 0;
                const bOwn = reship && b.telegramUsername.replace(/^@/, "").toLowerCase() === reship ? -1 : 0;
                return aOwn - bOwn;
              }).map(o => (
                <DraggableOrderCard
                  key={o.id} order={o} currency={currency} activeReshippers={activeReshippers}
                  onQuickRoute={onQuickRoute} routing={pendingIds.has(o.id)}
                  groupReshipperUsername={group.reshipperUsername}
                />
              ))}
              {group.orders.length === 0 && (
                <p className={cn("text-[10px] text-muted-foreground/60 text-center py-6", isOver && "text-primary/60")}>
                  Drop orders here
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Warning Panel ─────────────────────────────────────────────────────────────
function WarningPanel({ warnings }: { warnings: RoutingWarnings | null }) {
  const [open, setOpen] = useState(false);
  if (!warnings) return null;

  const total = (warnings.legacyOrders?.length ?? 0) +
    (warnings.unresolvedBalances?.length ?? 0) +
    (warnings.amendedAfterBatchLock?.length ?? 0) +
    (warnings.missingWholesalePrices?.length ?? 0) +
    (warnings.capacityAlerts?.length ?? 0);

  if (total === 0) return null;

  return (
    <Card className="border-amber-300 bg-amber-50/50 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5"
      >
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-xs font-semibold text-amber-800 flex-1 text-left">
          {total} issue{total !== 1 ? "s" : ""} need attention
        </p>
        {open ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="border-t border-amber-200 px-4 py-3 space-y-2">
              {(warnings.legacyOrders?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-1">
                    Legacy orders — need routing decision ({warnings.legacyOrders.length})
                  </p>
                  <div className="space-y-0.5">
                    {warnings.legacyOrders.slice(0, 5).map(o => (
                      <p key={o.id} className="text-xs text-amber-600 font-mono">@{o.telegramUsername} · {o.code}</p>
                    ))}
                    {warnings.legacyOrders.length > 5 && (
                      <p className="text-xs text-amber-500">+{warnings.legacyOrders.length - 5} more</p>
                    )}
                  </div>
                </div>
              )}
              {(warnings.unresolvedBalances?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-1">
                    Unresolved balance dues ({warnings.unresolvedBalances.length})
                  </p>
                  <div className="space-y-0.5">
                    {warnings.unresolvedBalances.slice(0, 5).map(o => (
                      <p key={o.id} className="text-xs text-amber-600 font-mono">@{o.telegramUsername} · {o.code} · {o.amountDue} due</p>
                    ))}
                  </div>
                </div>
              )}
              {(warnings.amendedAfterBatchLock?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-1">
                    Amended after batch lock ({warnings.amendedAfterBatchLock.length})
                  </p>
                </div>
              )}
              {(warnings.capacityAlerts?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-1">
                    Capacity alerts ({warnings.capacityAlerts.length})
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ── Balance Due Panel ─────────────────────────────────────────────────────────
function BalanceDuePanel({
  orders, currency, gbId, secret, onResolved,
}: {
  orders: BoardOrder[]; currency: string; gbId: string; secret: string; onResolved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [absorbing, setAbsorbing] = useState(false);

  const pendingOrders = orders.filter(o => o.balanceDue);
  if (pendingOrders.length === 0) return null;
  const totalDue = pendingOrders.reduce((s, o) => s + (o.amountDue ?? 0), 0);

  async function absorbAll() {
    setAbsorbing(true);
    try {
      await Promise.all(pendingOrders.map(o =>
        fetch(apiUrl(`/admin/orders/${o.id}/balance-resolution`), {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ action: "absorb", reason: "admin_board_absorb_all" }),
        })
      ));
      toast.success("All balance dues absorbed");
      onResolved();
    } catch {
      toast.error("Failed to absorb all balances");
    } finally {
      setAbsorbing(false);
    }
  }

  return (
    <Card className="border-blue-200 bg-blue-50/30 overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 px-4 py-2.5">
        <span className="text-base">💳</span>
        <p className="text-xs font-semibold text-blue-800 flex-1 text-left">
          Balance Due — {pendingOrders.length} order{pendingOrders.length !== 1 ? "s" : ""}
          <span className="ml-2 font-bold">{currency}{totalDue.toFixed(2)}</span>
        </p>
        {open ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="border-t border-blue-100 px-4 py-3 space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[320px]">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-1 font-semibold pr-3">Member</th>
                      <th className="pb-1 font-semibold pr-3">Code</th>
                      <th className="pb-1 font-semibold text-right">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingOrders.map(o => (
                      <tr key={o.id} className="border-t border-blue-100/60">
                        <td className="py-1 pr-3 font-mono">@{o.telegramUsername.replace(/^@/, "")}</td>
                        <td className="py-1 pr-3 font-mono text-muted-foreground">{o.code}</td>
                        <td className="py-1 text-right font-bold text-blue-700">{currency}{o.amountDue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={absorbing}
                  onClick={absorbAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {absorbing ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Absorb All
                </button>
                <span className="text-xs text-muted-foreground self-center">or review individually in Orders tab</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ── MultiSelect Dropdown ──────────────────────────────────────────────────────
function MultiSelect({ label, options, selected, onChange }: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]);
  };
  const displayLabel = selected.length === 0
    ? `All ${label}`
    : selected.length === 1
    ? options.find(o => o.value === selected[0])?.label ?? selected[0]
    : `${label}: ${selected.length}`;
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors",
          selected.length > 0
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background text-muted-foreground border-border hover:bg-muted",
        )}>
        {displayLabel}
        <ChevronDown className="w-3 h-3 shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[130px] rounded-lg border bg-background shadow-lg overflow-hidden">
          {options.map(opt => (
            <button key={opt.value} onClick={() => toggle(opt.value)}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left">
              <div className={cn(
                "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0",
                selected.includes(opt.value) ? "bg-primary border-primary" : "border-border bg-background",
              )}>
                {selected.includes(opt.value) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
              </div>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Filter Bar ────────────────────────────────────────────────────────────────
function FilterBar({
  search, onSearch,
  routeFilter, onRouteFilter,
  payFilter, onPayFilter,
  countryFilter, onCountryFilter, countries,
  flags, onFlags,
  isMobile,
}: {
  search: string; onSearch: (v: string) => void;
  routeFilter: string[]; onRouteFilter: (v: string[]) => void;
  payFilter: string[]; onPayFilter: (v: string[]) => void;
  countryFilter: string; onCountryFilter: (v: string) => void; countries: string[];
  flags: string[]; onFlags: (v: string[]) => void;
  isMobile: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const hasFilters = search || routeFilter.length > 0 || payFilter.length > 0 || countryFilter !== "all" || flags.length > 0;

  const filterContent = (
    <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2">
      <div className="relative w-full sm:flex-1 sm:min-w-[180px] sm:max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={search} onChange={e => onSearch(e.target.value)}
          placeholder="Search @username or code…"
          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {search && (
          <button onClick={() => onSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <MultiSelect
        label="Route"
        options={[
          { value: "direct", label: "Direct" },
          { value: "reshipper", label: "Reship" },
          { value: "unrouted", label: "Unrouted" },
          { value: "legacy", label: "Legacy" },
        ]}
        selected={routeFilter}
        onChange={onRouteFilter}
      />

      <MultiSelect
        label="Payment"
        options={[
          { value: "paid", label: "Paid" },
          { value: "pending_confirmation", label: "Submitted" },
          { value: "unpaid", label: "Unpaid" },
        ]}
        selected={payFilter}
        onChange={onPayFilter}
      />

      {countries.length > 0 && (
        <select
          value={countryFilter}
          onChange={e => onCountryFilter(e.target.value)}
          className={cn(
            "text-xs px-2 py-1.5 rounded-lg border transition-colors bg-background focus:outline-none focus:ring-1 focus:ring-primary",
            countryFilter !== "all" ? "border-primary text-foreground font-medium" : "border-input text-muted-foreground",
          )}
        >
          <option value="all">All countries</option>
          {countries.map(c => (
            <option key={c} value={c}>{countryFlag(c)} {c}</option>
          ))}
        </select>
      )}

      <MultiSelect
        label="Flags"
        options={[
          { value: "balanceDue", label: "Balance due" },
          { value: "missingAddr", label: "No address" },
          { value: "batchLocked", label: "Locked" },
        ]}
        selected={flags}
        onChange={onFlags}
      />

      {hasFilters && (
        <button onClick={() => { onSearch(""); onRouteFilter([]); onPayFilter([]); onCountryFilter("all"); onFlags([]); }}
          className="text-xs px-2 py-1 rounded-lg bg-destructive/10 text-destructive font-medium hover:bg-destructive/20 transition-colors flex items-center gap-1">
          <X className="w-3 h-3" /> Clear
        </button>
      )}
    </div>
  );

  if (!isMobile) return filterContent;

  return (
    <div>
      <button onClick={() => setMobileOpen(v => !v)}
        className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors w-full",
          hasFilters ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground",
        )}>
        <Filter className="w-3.5 h-3.5" />
        Filters
        {hasFilters && <span className="ml-auto bg-background/20 rounded-full px-1.5 py-0.5">active</span>}
        {mobileOpen ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
      </button>
      <AnimatePresence initial={false}>
        {mobileOpen && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="pt-2">{filterContent}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Routing Preview Tooltip ───────────────────────────────────────────────────
function PreviewTooltip({ preview }: { preview: RoutingPreview | null }) {
  if (!preview) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-popover border border-border rounded-xl shadow-2xl px-4 py-3 text-xs space-y-1.5 min-w-[240px] pointer-events-none">
      <p className="font-semibold text-center text-muted-foreground mb-1.5">Cost Impact Preview</p>
      <div className="flex gap-4">
        <div className="flex-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">From</p>
          <p className="font-semibold">{preview.from.batchSize} → {preview.from.batchSizeAfterMove} orders</p>
          <p className="text-muted-foreground">{preview.from.reshipperUsername ? `@${preview.from.reshipperUsername}` : preview.from.routingType ?? "legacy"}</p>
        </div>
        <div className="flex-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">To</p>
          <p className="font-semibold">{preview.to.batchSize} → {preview.to.batchSizeAfterMove} orders</p>
          <p className="text-muted-foreground">{preview.to.reshipperUsername ? `@${preview.to.reshipperUsername}` : preview.to.routingType ?? "unrouted"}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AdminGbFulfilment({
  secret, gbId, currency = "GBP", onUnroutedCount,
}: {
  secret: string; gbId: string; currency?: string; onUnroutedCount?: (n: number) => void;
}) {
  const [data, setData] = useState<FulfillmentBoardData | null>(null);
  const [warnings, setWarnings] = useState<RoutingWarnings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [activeOrder, setActiveOrder] = useState<BoardOrder | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [preview, setPreview] = useState<RoutingPreview | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [view, setView] = useState<"board" | "list">("board");
  const [isMobile, setIsMobile] = useState(false);
  const previewDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("search") ?? "");
  const [routeFilter, setRouteFilter] = useState<string[]>(() => {
    const v = new URLSearchParams(window.location.search).get("routeFilter");
    return v ? v.split(",") : [];
  });
  const [payFilter, setPayFilter] = useState<string[]>(() => {
    const v = new URLSearchParams(window.location.search).get("payFilter");
    return v ? v.split(",") : [];
  });
  const [countryFilter, setCountryFilter] = useState("all");
  const [groupBy, setGroupBy] = useState<"reshipper" | "leg">("reshipper");
  const [countryLegs, setCountryLegs] = useState<CountryLeg[]>([]);
  const [flags, setFlags] = useState<string[]>([]);

  const currSymbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "£";

  // ── Responsive ────────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Emit unrouted count to parent ─────────────────────────────────────────
  useEffect(() => {
    if (!onUnroutedCount) return;
    const unrouted = data?.groups.find(g => g.type === "unrouted");
    onUnroutedCount(unrouted?.totalOrders ?? 0);
  }, [data, onUnroutedCount]);

  // ── URL sync ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (search) params.set("search", search); else params.delete("search");
    if (routeFilter.length > 0) params.set("routeFilter", routeFilter.join(",")); else params.delete("routeFilter");
    if (payFilter.length > 0) params.set("payFilter", payFilter.join(",")); else params.delete("payFilter");
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [search, routeFilter, payFilter]);

  // ── Data loading ──────────────────────────────────────────────────────────
  const buildQuery = useCallback(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (flags.includes("balanceDue")) p.set("balanceDue", "1");
    if (flags.includes("missingAddr")) p.set("missingAddress", "1");
    if (flags.includes("batchLocked")) p.set("batchLocked", "1");
    return p.toString();
  }, [search, flags]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = buildQuery();
      const [boardRes, warningsRes, legsRes] = await Promise.all([
        fetch(apiUrl(`/admin/group-buys/${gbId}/fulfillment-board${q ? "?" + q : ""}`), {
          headers: { "x-admin-secret": secret },
        }),
        fetch(apiUrl(`/admin/group-buys/${gbId}/routing-warnings`), {
          headers: { "x-admin-secret": secret },
        }),
        fetch(apiUrl(`/admin/group-buys/${gbId}/country-legs`), {
          headers: { "x-admin-secret": secret },
        }),
      ]);
      if (!boardRes.ok) throw new Error(`Error ${boardRes.status}`);
      const boardData = await boardRes.json() as FulfillmentBoardData;
      setData(boardData);
      if (warningsRes.ok) setWarnings(await warningsRes.json() as RoutingWarnings);
      if (legsRes.ok) {
        const legsData = await legsRes.json() as { id: string; countryCode: string; countryName: string; sortOrder: number }[];
        setCountryLegs(Array.isArray(legsData) ? legsData.map(l => ({
          id: l.id, countryCode: l.countryCode, countryName: l.countryName, sortOrder: l.sortOrder,
        })) : []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [gbId, secret, buildQuery]);

  useEffect(() => { load(); }, [load]);

  // ── Quick route handler ───────────────────────────────────────────────────
  const handleQuickRoute = useCallback(async (orderId: string, routingType: string, reshipperUsername?: string | null) => {
    setPendingIds(s => new Set([...s, orderId]));
    const ifUnmodifiedSince = data?.lastModified ?? null;
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-admin-secret": secret,
      };
      if (ifUnmodifiedSince) headers["If-Unmodified-Since"] = ifUnmodifiedSince;

      const res = await fetch(apiUrl(`/admin/orders/${orderId}/routing`), {
        method: "PATCH",
        headers,
        body: JSON.stringify({ routingType, reshipperUsername: reshipperUsername ?? null }),
      });
      if (res.status === 409) {
        const body = await res.json() as { error?: string };
        toast.error(body.error ?? "Conflict detected — another change was made. Refresh to see latest.");
        await load();
        return;
      }
      if (!res.ok) throw new Error(`Error ${res.status}`);
      toast.success("Routing updated");
      await load();
    } catch {
      toast.error("Failed to update routing");
    } finally {
      setPendingIds(s => { const n = new Set(s); n.delete(orderId); return n; });
    }
  }, [data, gbId, secret, load]);

  // ── Payment block toggle ──────────────────────────────────────────────────
  const handlePaymentBlockToggle = useCallback(async (group: RoutingGroup, blocked: boolean) => {
    try {
      if (group.type === "reshipper" && group.reshipperUsername) {
        const res = await fetch(apiUrl(`/admin/group-buys/${gbId}/reshippers/${group.reshipperUsername}/payment-block`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ blocked }),
        });
        if (!res.ok) throw new Error("Failed");
      } else if (group.type === "direct") {
        // Direct group — block all non-reshipper country legs (best effort)
        toast.info("Direct shipping payment blocking managed via country legs tab");
        return;
      } else {
        toast.info("Payment blocking only available for reshipper groups");
        return;
      }
      toast.success(blocked ? "Payments blocked for this group." : "Payments unblocked.");
      await load();
    } catch {
      toast.error("Failed to update payment block.");
    }
  }, [gbId, secret, load]);

  // ── Undo ──────────────────────────────────────────────────────────────────
  const handleUndo = useCallback(async () => {
    setUndoing(true);
    try {
      const res = await fetch(apiUrl(`/admin/group-buys/${gbId}/routing-undo`), {
        method: "POST",
        headers: { "x-admin-secret": secret },
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        toast.error(body.error ?? "Nothing to undo");
        return;
      }
      toast.success("Routing decision undone.");
      await load();
    } catch {
      toast.error("Failed to undo routing.");
    } finally {
      setUndoing(false);
    }
  }, [gbId, secret, load]);

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function findOrder(id: string): BoardOrder | null {
    if (!data) return null;
    for (const g of data.groups) {
      const o = g.orders.find(o => o.id === id);
      if (o) return o;
    }
    return null;
  }

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveOrder(findOrder(String(event.active.id)));
    setPreview(null);
  }, [data]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const newOverId = event.over ? String(event.over.id) : null;
    setOverId(newOverId);

    if (!newOverId || !event.active.id) return;
    const orderId = String(event.active.id);

    if (previewDebounce.current) clearTimeout(previewDebounce.current);
    previewDebounce.current = setTimeout(async () => {
      if (!newOverId.startsWith("grp:")) return;
      const { routingType, reshipperUsername } = dropIdToRouting(newOverId);
      try {
        const q = new URLSearchParams({ targetRoutingType: routingType });
        if (reshipperUsername) q.set("targetReshipper", reshipperUsername);
        const res = await fetch(apiUrl(`/admin/orders/${orderId}/routing-preview?${q.toString()}`), {
          headers: { "x-admin-secret": secret },
        });
        if (res.ok) setPreview(await res.json() as RoutingPreview);
      } catch { /* ignore preview errors */ }
    }, 200);
  }, [secret]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    if (previewDebounce.current) clearTimeout(previewDebounce.current);
    setActiveOrder(null);
    setOverId(null);
    setPreview(null);

    const orderId = String(event.active.id);
    if (!event.over) return;
    const dropId = String(event.over.id);
    if (!dropId.startsWith("grp:")) return;

    const order = findOrder(orderId);
    if (!order) return;
    if (order.batchLocked) { toast.error("Order is batch locked — cannot move."); return; }

    const { routingType, reshipperUsername } = dropIdToRouting(dropId);

    // Check if already in this group
    const currentGroupKey = order.routingType === "direct" ? "direct" :
      order.routingType === "reshipper" ? `reshipper:${order.reshipperUsername ?? "__unassigned__"}` :
      order.routingType === "unrouted" ? "unrouted" : "legacy";
    const targetGroupKey = routingType === "direct" ? "direct" :
      routingType === "reshipper" ? `reshipper:${reshipperUsername ?? "__unassigned__"}` :
      routingType === "unrouted" ? "unrouted" : "legacy";
    if (currentGroupKey === targetGroupKey) return;

    await handleQuickRoute(orderId, routingType, reshipperUsername);
  }, [data, handleQuickRoute]);

  // ── Gather all orders for panels ──────────────────────────────────────────
  const allOrders = data?.groups.flatMap(g => g.orders) ?? [];

  // ── Country filter (reshipper view) ────────────────────────────────────────
  const availableCountries = [...new Set(
    (data?.groups ?? []).map(g => g.reshipperHubCountry).filter((c): c is string => !!c)
  )].sort();
  const filteredGroups = (data?.groups ?? [])
    .filter(g => {
      if (routeFilter.length > 0 && !routeFilter.includes(g.type)) return false;
      if (countryFilter !== "all" && g.reshipperHubCountry !== null && g.reshipperHubCountry !== countryFilter) return false;
      return true;
    })
    .map(g => {
      if (payFilter.length === 0) return g;
      const filteredOrders = g.orders.filter(o => payFilter.includes(o.paymentStatus));
      return { ...g, orders: filteredOrders, totalOrders: filteredOrders.length };
    });

  // ── Country leg groups (leg view) ──────────────────────────────────────────
  const legGroups = React.useMemo(() => {
    if (!data) return [];
    const allOrdersFlat = data.groups.flatMap(g => g.orders);
    const searchLower = search.toLowerCase();
    const searched = allOrdersFlat.filter(o => {
      if (searchLower && !o.telegramUsername.toLowerCase().includes(searchLower) && !o.code.toLowerCase().includes(searchLower)) return false;
      if (routeFilter.length > 0 && !routeFilter.includes(o.routingType ?? "legacy")) return false;
      if (payFilter.length > 0 && !payFilter.includes(o.paymentStatus)) return false;
      return true;
    });
    const byLeg = new Map<string | null, BoardOrder[]>();
    for (const o of searched) {
      const key = o.countryLegId ?? null;
      const arr = byLeg.get(key) ?? [];
      arr.push(o);
      byLeg.set(key, arr);
    }
    const result: { leg: CountryLeg | null; orders: BoardOrder[] }[] = [];
    for (const leg of countryLegs) {
      const orders = byLeg.get(leg.id);
      if (orders && orders.length > 0) result.push({ leg, orders });
    }
    const unassigned = byLeg.get(null);
    if (unassigned && unassigned.length > 0) result.push({ leg: null, orders: unassigned });
    return result;
  }, [data, countryLegs, search]);

  return (
    <div className="space-y-4">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {data && (
            <>
              <span className="text-xs px-2.5 py-1 rounded-full bg-muted font-medium text-muted-foreground">
                {allOrders.length} orders
              </span>
              {data.groups.filter(g => g.type === "direct").map(g => (
                <span key="direct" className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-semibold flex items-center gap-1">
                  <Home className="w-3 h-3" /> {g.totalOrders} direct
                </span>
              ))}
              {data.groups.filter(g => g.type === "unrouted").map(g => (
                <span key="unrouted" className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" /> {g.totalOrders} unrouted
                </span>
              ))}
              {data.groups.filter(g => g.type === "legacy").map(g => (
                <span key="legacy" className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {g.totalOrders} legacy
                </span>
              ))}
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {data?.canUndo && (
            <Button size="sm" variant="outline" onClick={handleUndo} disabled={undoing} className="gap-1.5">
              {undoing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              Undo
            </Button>
          )}
          <div className="flex rounded-lg border overflow-hidden">
            {(["reshipper", "leg"] as const).map(v => (
              <button key={v} onClick={() => setGroupBy(v)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l first:border-l-0",
                  groupBy === v ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted",
                )}>
                {v === "reshipper"
                  ? <><UserCheck className="w-3.5 h-3.5" /> By Reshipper</>
                  : <><Globe className="w-3.5 h-3.5" /> By Country Leg</>}
              </button>
            ))}
          </div>
          {!isMobile && (
            <div className="flex rounded-lg border overflow-hidden">
              {(["list", "board"] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l first:border-l-0",
                    view === v ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted",
                  )}>
                  {v === "list" ? <><LayoutList className="w-3.5 h-3.5" /> List</> : <><LayoutGrid className="w-3.5 h-3.5" /> Board</>}
                </button>
              ))}
            </div>
          )}
          <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      {data && (
        <FilterBar
          search={search} onSearch={setSearch}
          routeFilter={routeFilter} onRouteFilter={setRouteFilter}
          payFilter={payFilter} onPayFilter={setPayFilter}
          countryFilter={countryFilter} onCountryFilter={setCountryFilter} countries={availableCountries}
          flags={flags} onFlags={setFlags}
          isMobile={isMobile}
        />
      )}

      {/* ── Unrouted Alert Banner ────────────────────────────────────────────── */}
      {data && (() => {
        const unrouted = data.groups.find(g => g.type === "unrouted");
        if (!unrouted || unrouted.totalOrders === 0) return null;
        return (
          <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                {unrouted.totalOrders} unrouted {unrouted.totalOrders === 1 ? "order" : "orders"} — action required
              </p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                These orders have no routing decision. Assign them to Direct, a Reshipper, or a Country Leg before proceeding.
              </p>
            </div>
            <button
              onClick={() => setRouteFilter(["unrouted"])}
              className="text-xs font-semibold text-red-600 hover:text-red-800 underline shrink-0 mt-0.5"
            >
              Show only
            </button>
          </div>
        );
      })()}

      {/* ── Warning Panel ────────────────────────────────────────────────────── */}
      <WarningPanel warnings={warnings} />

      {/* ── Balance Due Panel ────────────────────────────────────────────────── */}
      {data && (
        <BalanceDuePanel
          orders={allOrders} currency={currSymbol}
          gbId={gbId} secret={secret} onResolved={load}
        />
      )}

      {/* ── Loading / Error ──────────────────────────────────────────────────── */}
      {loading && !data && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <Card className="p-4 flex items-center gap-2 text-sm text-destructive border-destructive/30 bg-destructive/5">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </Card>
      )}

      {/* ── Board ────────────────────────────────────────────────────────────── */}
      {data && groupBy === "leg" && (
        /* ── Country Leg View (read-only, no drag/drop) ── */
        (!isMobile && view === "board") ? (
          <div className="overflow-x-auto pb-3">
            <div className="flex gap-3 min-w-max">
              {legGroups.map(({ leg, orders }) => (
                <CountryLegGroupCard
                  key={leg?.id ?? "__unassigned__"}
                  leg={leg} orders={orders} currency={currSymbol}
                  activeReshippers={data.activeReshippers}
                  onQuickRoute={handleQuickRoute} boardView={true}
                />
              ))}
              {legGroups.length === 0 && (
                <Card className="p-12 text-center min-w-[240px]">
                  <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-semibold">No country legs</p>
                  <p className="text-xs text-muted-foreground mt-1">Enable country legs on this group buy to use this view.</p>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {legGroups.map(({ leg, orders }) => (
              <CountryLegGroupCard
                key={leg?.id ?? "__unassigned__"}
                leg={leg} orders={orders} currency={currSymbol}
                activeReshippers={data.activeReshippers}
                onQuickRoute={handleQuickRoute} boardView={false}
              />
            ))}
            {legGroups.length === 0 && (
              <Card className="p-8 text-center">
                <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-semibold">No country legs</p>
                <p className="text-xs text-muted-foreground mt-1">Enable country legs on this group buy to use this view.</p>
              </Card>
            )}
          </div>
        )
      )}

      {data && groupBy === "reshipper" && (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          {/* Board view (desktop horizontal) or list view (mobile/list) */}
          {(!isMobile && view === "board") ? (
            <div className="overflow-x-auto pb-3">
              <div className="flex gap-3 min-w-max">
                {filteredGroups.map(g => (
                  <RoutingGroupCard
                    key={groupDropId(g)}
                    group={g} gbId={gbId} secret={secret} currency={currSymbol}
                    overId={overId} activeReshippers={data.activeReshippers}
                    pendingIds={pendingIds} onQuickRoute={handleQuickRoute}
                    onPaymentBlockToggle={handlePaymentBlockToggle}
                    onCodeUpdated={load} isMobile={false} boardView={true}
                  />
                ))}
                {filteredGroups.length === 0 && (
                  <Card className="p-12 text-center min-w-[240px]">
                    <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-semibold">No orders</p>
                    <p className="text-xs text-muted-foreground mt-1">Orders appear here once customers place them.</p>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGroups.map(g => (
                <RoutingGroupCard
                  key={groupDropId(g)}
                  group={g} gbId={gbId} secret={secret} currency={currSymbol}
                  overId={overId} activeReshippers={data.activeReshippers}
                  pendingIds={pendingIds} onQuickRoute={handleQuickRoute}
                  onPaymentBlockToggle={handlePaymentBlockToggle}
                  onCodeUpdated={load} isMobile={isMobile} boardView={false}
                />
              ))}
              {filteredGroups.length === 0 && (
                <Card className="p-8 text-center">
                  <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-semibold">No orders</p>
                  <p className="text-xs text-muted-foreground mt-1">Orders appear here once customers place them.</p>
                </Card>
              )}
            </div>
          )}

          {/* Drag overlay */}
          <DragOverlay dropAnimation={null}>
            {activeOrder && (
              <div className="rotate-1 shadow-2xl w-[260px]">
                <DraggableOrderCard
                  order={activeOrder} currency={currSymbol} activeReshippers={data.activeReshippers}
                  onQuickRoute={handleQuickRoute} routing={false} isDragOverlay
                />
              </div>
            )}
          </DragOverlay>

          {/* Cost preview tooltip */}
          <PreviewTooltip preview={preview} />
        </DndContext>
      )}
    </div>
  );
}
