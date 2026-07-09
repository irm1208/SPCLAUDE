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
import { resolveCountry, apiUrl, INFO_CARD_TYPE_OPTIONS, InfoCardsEditor, ShippingOptionsEditor, CRYPTO_CURRENCIES, TROCADOR_COINS, CRYPTO_NETWORKS, DEFAULT_CRYPTO_NETWORKS, GbPaymentGatewayInlineContent, EU_COUNTRIES, POPULAR_COUNTRIES, GBP_TO_USD, GB_STATUS_STYLES, CopyIdBadge, StatusBadge } from "../shared/core";
import type { GroupBuy, InfoCard, ShippingOption, EntryFeePayment, GbPaymentConfig, GBProduct, DeliveryMethod, GBDeliveryMethod, Member, Product, CustomCourier } from "../shared/core";
export function AdminSharedShippingSubTab({ secret, gb, onUpdate }: { secret: string; gb: GroupBuy; onUpdate: (gb: GroupBuy) => void }) {
  const initial = Array.isArray(gb.sharedShippingCountries) ? gb.sharedShippingCountries : [];
  const [countries, setCountries] = useState<string[]>(initial);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [addCountry, setAddCountry] = useState<string>(COUNTRIES[0] ?? "");

  useEffect(() => {
    setCountries(Array.isArray(gb.sharedShippingCountries) ? gb.sharedShippingCountries : []);
  }, [gb.sharedShippingCountries]);

  const save = async (next: string[]) => {
    setSaving(true);
    setSaveError(null);
    const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ sharedShippingCountries: next }),
    });
    if (res.ok) {
      const updated: GroupBuy = await res.json();
      const parsed = Array.isArray(updated.sharedShippingCountries) ? updated.sharedShippingCountries : [];
      setCountries(parsed);
      onUpdate(updated);
    } else {
      setSaveError("Failed to save — please try again");
    }
    setSaving(false);
  };

  const addOne = () => {
    if (!addCountry || countries.includes(addCountry)) return;
    const next = [...countries, addCountry];
    setCountries(next);
    save(next);
  };

  const remove = (c: string) => {
    const next = countries.filter(x => x !== c);
    setCountries(next);
    save(next);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Countries where shipping cost is shared across group buys for the same customer. When a customer in one of these countries has already paid shipping on another GB, the fee is waived here.
      </p>
      <div className="flex gap-2">
        <select
          value={addCountry}
          onChange={e => setAddCountry(e.target.value)}
          className="flex-1 text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {COUNTRIES.filter(c => !countries.includes(c)).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          onClick={addOne}
          disabled={saving || !addCountry || countries.includes(addCountry)}
          className="px-4 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Add
        </button>
      </div>
      {saveError && <p className="text-xs text-red-500">{saveError}</p>}
      {countries.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">No shared shipping countries configured.</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {countries.map(c => (
            <span key={c} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-sm font-medium">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              {c}
              <button onClick={() => remove(c)} disabled={saving} className="ml-1 text-muted-foreground hover:text-destructive disabled:opacity-40">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Summary Sub-tab ─────────────────────────────────────────────────────────
