import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DatePickerField } from "@/components/DatePickerField";
import {
  Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Loader2, Save, X, Check,
  Users, Package, Truck, Info, Search, RefreshCw, KeyRound, Bell,
  Eye, EyeOff, ChevronUp, ChevronDown, ArrowUp, ArrowDown,
  Shield, CalendarDays, Calendar, Globe, Tag, ToggleLeft, ToggleRight,
  Upload, FileText, DollarSign, Copy, MapPin, CheckCircle2,
  AlertCircle, AlertTriangle, Clock, Navigation, Box, TestTube, BarChart3,
  CreditCard, Send, MessageSquare, ShoppingCart, Wallet, QrCode, UserCheck, ExternalLink,
  Download, SendHorizonal, Ship, TrendingUp, Settings, Lock, Unlock, Calculator, PenLine, Home,
} from "lucide-react";
import { Button, Card, Input, Label, cn } from "@/components/ui";
import { ImageLightbox } from "@/components/ImageLightbox";
import { currSym } from "@/lib/currency";
import { COUNTRIES, COUNTRY_LIST } from "@/data/countries";
import { lookupBatchPrefix, findMatchingPeptide } from "@/data/batchPrefixes";
import { CARRIERS_17TRACK } from "@/lib/carriers";
import { resolveCountry, apiUrl, INFO_CARD_TYPE_OPTIONS, InfoCardsEditor, ShippingOptionsEditor, CRYPTO_CURRENCIES, TROCADOR_COINS, CRYPTO_NETWORKS, DEFAULT_CRYPTO_NETWORKS, GbPaymentGatewayInlineContent, EU_COUNTRIES, POPULAR_COUNTRIES, GBP_TO_USD, GB_STATUS_STYLES, CopyIdBadge, StatusBadge } from "./shared/core";
import { IntlShippingTab } from "@/components/IntlShippingTab";
import { AdminGbFulfilment } from "@/components/AdminGbFulfilment";
import { GbQrCodesPanel } from "@/components/GbQrCodesPanel";
import { OpenAsOrganiserButton } from "./shared/OpenAsOrganiserButton";
import { DetailsSubTab } from "./panels/DetailsPanel";
import { ProductsSubTab } from "./panels/ProductsPanel";
import { DeliveryMethodsSubTab } from "./panels/DeliveryPanel";
import { MembersSubTab } from "./panels/MembersPanel";
import { WaitlistSubTab } from "./panels/WaitlistPanel";
import { PaymentStatusSubTab } from "./panels/PaymentStatusPanel";
import { ParcelsSubTab } from "./panels/ParcelsPanel";
import { OrdersSubTab } from "./panels/OrdersPanel";
import { TestingSubTab } from "./panels/TestingPanel";
import { AdminFeeCountriesSubTab } from "./panels/FeeByCountryPanel";
import { PnlSubTab } from "./panels/PnlPanel";
import { AdminReshippersSubTab } from "./panels/ReshippersPanel";
import { AdminSharedShippingSubTab } from "./panels/SharedShippingPanel";
import { AdminCountryLegsSection } from "./panels/CountryLegsPanel";
import { SummarySubTab } from "./panels/SummaryPanel";
import { BroadcastSubTab } from "./panels/BroadcastPanel";
import { LegShippingCalcSubTab } from "./panels/LegCalcPanel";
import ShippingSplitTab from "@/pages/ShippingSplitTab";

import type { GroupBuy, InfoCard, ShippingOption, EntryFeePayment, GbPaymentConfig, GBProduct, DeliveryMethod, GBDeliveryMethod, Member, Product, CustomCourier } from "./shared/core";
export type DetailTab = "details" | "products" | "delivery" | "members" | "waitlist" | "payment" | "parcels" | "orders" | "testing" | "intlshipping" | "adminfeecountry" | "pnl" | "countrylegs" | "reshippers" | "sharedshipping" | "rules" | "summary" | "broadcast" | "shippingcalc" | "shippingsplit" | "fulfilment" | "qrcodes";

export function GBDetail({ secret, gb, onBack, onUpdate, onClone }: {
  secret: string;
  gb: GroupBuy;
  onBack: () => void;
  onUpdate: (gb: GroupBuy) => void;
  onClone: (gb: GroupBuy) => void;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>(() => {
    try {
      const saved = sessionStorage.getItem("adm_gb_state");
      if (saved) {
        const { gbId, tab } = JSON.parse(saved);
        // "rules" was removed from the per-GB view (it edits global rules)
        if (gbId === gb.id && tab && tab !== "rules") return tab as DetailTab;
      }
    } catch {}
    return "details";
  });
  const [currentGb, setCurrentGb] = useState(gb);
  const [cloning, setCloning] = useState(false);
  const [unroutedCount, setUnroutedCount] = useState(0);

  const handleUpdate = (updated: GroupBuy) => {
    setCurrentGb(updated);
    onUpdate(updated);
  };

  const handleClone = async () => {
    setCloning(true);
    const res = await fetch(apiUrl(`/admin/group-buys/${currentGb.id}/clone`), { method: "POST", headers: { "x-admin-secret": secret } });
    if (res.ok) { const data = await res.json(); onClone(data); }
    setCloning(false);
  };

  type NavItem = { id: DetailTab; label: string; icon: React.FC<{ className?: string }> };
  const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
    {
      title: "Overview",
      items: [
        { id: "summary", label: "Dashboard", icon: BarChart3 },
        { id: "pnl", label: "P&L", icon: TrendingUp },
      ],
    },
    {
      title: "Operations",
      items: [
        { id: "orders", label: "Orders", icon: ShoppingCart },
        { id: "members", label: "Members", icon: Users },
        { id: "waitlist", label: "Waitlist", icon: Clock },
        { id: "payment", label: "Payment Status", icon: CreditCard },
        { id: "testing", label: "Testing", icon: TestTube },
      ],
    },
    {
      title: "Fulfilment",
      items: [
        { id: "fulfilment", label: "Fulfilment", icon: Package },
        { id: "parcels", label: "Parcels", icon: Box },
        { id: "qrcodes", label: "QR Codes", icon: QrCode },
        { id: "reshippers", label: "Reshippers", icon: UserCheck },
        { id: "countrylegs", label: "Country Legs", icon: Globe },
        { id: "shippingcalc", label: "Leg Calc", icon: Calculator },
        { id: "shippingsplit", label: "Shipping Split", icon: Truck },
        { id: "intlshipping", label: "Intl Shipping", icon: Ship },
        { id: "sharedshipping", label: "Shared Shipping", icon: Navigation },
      ],
    },
    {
      title: "Communication",
      items: [
        { id: "broadcast", label: "Broadcast", icon: Send },
      ],
    },
    {
      title: "Setup",
      items: [
        { id: "details", label: "Settings", icon: Settings },
        { id: "products", label: "Products", icon: Package },
        { id: "delivery", label: "Delivery", icon: Truck },
        { id: "adminfeecountry", label: "Fee by Country", icon: DollarSign },
      ],
    },
  ];

  const selectTab = (id: DetailTab) => {
    setActiveTab(id);
    try { sessionStorage.setItem("adm_gb_state", JSON.stringify({ gbId: currentGb.id, tab: id })); } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold text-base truncate">{currentGb.name}</h2>
            <StatusBadge status={currentGb.status} />
            {currentGb.organiserId && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(91,141,239,0.12)", color: "#5B8DEF" }}>
                @{currentGb.organiserId}
              </span>
            )}
          </div>
          {currentGb.closeDate && (
            <p className="text-xs text-muted-foreground">
              Closes {new Date(currentGb.closeDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          )}
        </div>
        <OpenAsOrganiserButton secret={secret} gbId={currentGb.id} />

        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={handleClone} disabled={cloning}>
          {cloning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
          Clone
        </Button>
      </div>

      {/* Mobile / narrow: horizontally scrollable tab strip */}
      <div className="md:hidden -mx-4 px-4 overflow-x-auto">
        <div className="flex gap-1 border-b border-border pb-0 w-max min-w-full">
          {NAV_GROUPS.flatMap(group => group.items).map(item => (
            <button
              key={item.id}
              onClick={() => selectTab(item.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap",
                activeTab === item.id
                  ? "border-orange-400 text-orange-600"
                  : "border-transparent text-muted-foreground"
              )}
            >
              <item.icon className="w-3.5 h-3.5 shrink-0" />
              {item.label}
              {item.id === "fulfilment" && unroutedCount > 0 && (
                <span className="ml-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                  {unroutedCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-5 items-start">
        {/* Sidebar (desktop) */}
        <nav className="hidden md:block w-48 shrink-0 space-y-4 sticky top-4">
          {NAV_GROUPS.map(group => (
            <div key={group.title}>
              <p className="px-2 mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">{group.title}</p>
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => selectTab(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left",
                      activeTab === item.id
                        ? "bg-orange-50 text-orange-600"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    <item.icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {item.id === "fulfilment" && unroutedCount > 0 && (
                      <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                        {unroutedCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Panel body */}
        <div className="flex-1 min-w-0">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "details" && <DetailsSubTab secret={secret} gb={currentGb} onUpdate={handleUpdate} />}
          {activeTab === "products" && <ProductsSubTab secret={secret} gb={currentGb} />}
          {activeTab === "delivery" && <DeliveryMethodsSubTab secret={secret} gb={currentGb} onUpdate={handleUpdate} />}
          {activeTab === "members" && <MembersSubTab secret={secret} gb={currentGb} onUpdate={handleUpdate} />}
          {activeTab === "waitlist" && <WaitlistSubTab secret={secret} gb={currentGb} />}
          {activeTab === "payment" && <PaymentStatusSubTab secret={secret} gb={currentGb} />}
          {activeTab === "parcels" && <ParcelsSubTab secret={secret} gb={currentGb} />}
          {activeTab === "orders" && <OrdersSubTab secret={secret} gb={currentGb} />}
          {activeTab === "testing" && <TestingSubTab secret={secret} gb={currentGb} />}
          {activeTab === "intlshipping" && <IntlShippingTab secret={secret} groupBuyId={currentGb.id} readonly={false} />}
          {activeTab === "adminfeecountry" && <AdminFeeCountriesSubTab secret={secret} gb={currentGb} onUpdate={handleUpdate} />}
          {activeTab === "pnl" && <PnlSubTab secret={secret} gb={currentGb} />}
          {activeTab === "countrylegs" && (
            currentGb.countryLegsEnabled
              ? <AdminCountryLegsSection secret={secret} gbId={currentGb.id} currency={currentGb.currency ?? "GBP"} />
              : (
                <Card className="p-6 text-center space-y-2">
                  <Globe className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-sm font-semibold">Country Legs not enabled</p>
                  <p className="text-xs text-muted-foreground">Enable "Country Sub-groups" in the Details tab to manage per-country legs, invite codes, and reshipper assignments for this group buy.</p>
                </Card>
              )
          )}
          {activeTab === "reshippers" && <AdminReshippersSubTab secret={secret} gbId={currentGb.id} />}
          {activeTab === "sharedshipping" && <AdminSharedShippingSubTab secret={secret} gb={currentGb} onUpdate={handleUpdate} />}
          {activeTab === "summary" && <SummarySubTab secret={secret} gb={currentGb} />}
          {activeTab === "broadcast" && <BroadcastSubTab secret={secret} gb={currentGb} />}
          {activeTab === "shippingcalc" && <LegShippingCalcSubTab secret={secret} gb={currentGb} />}
          {activeTab === "shippingsplit" && <ShippingSplitTab groupBuy={currentGb} accessMode="admin" adminSecret={secret} />}
          {activeTab === "fulfilment" && (
            <AdminGbFulfilment
              secret={secret}
              gbId={currentGb.id}
              currency={currentGb.currency ?? "GBP"}
              onUnroutedCount={setUnroutedCount}
            />
          )}
          {activeTab === "qrcodes" && <GbQrCodesPanel gbId={currentGb.id} mode="admin" adminSecret={secret} />}
        </motion.div>
      </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────
