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
import { GBList } from "./GbList";
import { GBForm } from "./GbForm";
import { GBDetail } from "./GbDetailShell";
import type { GroupBuy, InfoCard, ShippingOption, EntryFeePayment, GbPaymentConfig, GBProduct, DeliveryMethod, GBDeliveryMethod, Member, Product, CustomCourier } from "./shared/core";
export type View = { kind: "list" } | { kind: "create" } | { kind: "detail"; gb: GroupBuy };

export function AdminGroupBuysTab({ secret }: { secret: string }) {
  const [view, setView] = useState<View>({ kind: "list" });

  const [gbPageMsg, setGbPageMsg] = useState<string>("");
  const [gbPageMsgDraft, setGbPageMsgDraft] = useState<string>("");
  const [savingGbMsg, setSavingGbMsg] = useState(false);
  const [savedGbMsg, setSavedGbMsg] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then(r => r.json())
      .then(d => {
        const msg = d.groupBuysPageMessage ?? "";
        setGbPageMsg(msg);
        setGbPageMsgDraft(msg);
      })
      .catch(() => {});
  }, []);

  const saveGbPageMsg = async () => {
    setSavingGbMsg(true);
    await fetch(apiUrl("/admin/group-buys-page-message"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ message: gbPageMsgDraft }),
    });
    setGbPageMsg(gbPageMsgDraft);
    setSavingGbMsg(false);
    setSavedGbMsg(true);
    setTimeout(() => setSavedGbMsg(false), 2000);
  };

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("adm_gb_state");
      if (!saved) return;
      const { gbId } = JSON.parse(saved);
      if (!gbId) return;
      fetch(apiUrl("/admin/group-buys"), { headers: { "x-admin-secret": secret } })
        .then(r => r.json())
        .then((gbs: GroupBuy[]) => {
          const gb = gbs.find((g: GroupBuy) => g.id === gbId);
          if (gb) setView({ kind: "detail", gb });
        })
        .catch(() => {});
    } catch {}
  }, []);

  const handleSelect = (gb: GroupBuy) => {
    setView({ kind: "detail", gb });
    try { sessionStorage.setItem("adm_gb_state", JSON.stringify({ gbId: gb.id })); } catch {}
  };
  const handleNew = () => {
    setView({ kind: "create" });
    try { sessionStorage.removeItem("adm_gb_state"); } catch {}
  };
  const handleBack = () => {
    setView({ kind: "list" });
    try { sessionStorage.removeItem("adm_gb_state"); } catch {}
  };

  const handleCreated = (gb: GroupBuy) => {
    setView({ kind: "detail", gb });
    try { sessionStorage.setItem("adm_gb_state", JSON.stringify({ gbId: gb.id })); } catch {}
  };

  const handleUpdate = (updated: GroupBuy) => {
    if (view.kind === "detail") setView({ kind: "detail", gb: updated });
  };

  const handleClone = (cloned: GroupBuy) => {
    setView({ kind: "detail", gb: cloned });
  };

  return (
    <div>
      <AnimatePresence mode="wait">
        {view.kind === "list" && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="space-y-4 mb-4">
              <Card className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  <p className="text-sm font-semibold">Group Buys Page Message</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Shown as a banner at the top of the "My Group Buys" page. Leave blank to show no banner.
                </p>
                <textarea
                  rows={3}
                  value={gbPageMsgDraft}
                  onChange={e => setGbPageMsgDraft(e.target.value)}
                  placeholder="e.g. Welcome! New group buys are added regularly. Check back soon."
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={saveGbPageMsg} disabled={savingGbMsg} className="gap-1.5">
                    {savingGbMsg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedGbMsg ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                    {savedGbMsg ? "Saved" : "Save Message"}
                  </Button>
                  {gbPageMsgDraft && (
                    <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => setGbPageMsgDraft("")}>
                      Clear
                    </Button>
                  )}
                  {gbPageMsg && <span className="text-xs text-green-600 font-medium">● Live</span>}
                </div>
              </Card>
            </div>
            <GBList secret={secret} onSelect={handleSelect} onNew={handleNew} />
          </motion.div>
        )}

        {view.kind === "create" && (
          <motion.div key="create" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={handleBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="font-semibold text-base">New Group Buy</h2>
              </div>
              <Card className="p-5">
                <GBForm secret={secret} onSave={handleCreated} onCancel={handleBack} />
              </Card>
            </div>
          </motion.div>
        )}

        {view.kind === "detail" && (
          <motion.div key={`detail-${view.gb.id}`} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <GBDetail
              secret={secret}
              gb={view.gb}
              onBack={handleBack}
              onUpdate={handleUpdate}
              onClone={handleClone}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
