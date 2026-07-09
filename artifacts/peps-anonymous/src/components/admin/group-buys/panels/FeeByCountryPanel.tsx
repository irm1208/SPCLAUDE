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
export type AdminFeeCountryEntry = { country: string; amount: number; enabled: boolean };

export function AdminFeeCountriesSubTab({ secret, gb, onUpdate }: { secret: string; gb: GroupBuy; onUpdate: (gb: GroupBuy) => void }) {
  const [entries, setEntries] = useState<AdminFeeCountryEntry[]>(
    (Array.isArray(gb.adminFeeCountries) ? gb.adminFeeCountries : []).map(e => ({ ...e }))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCountry, setNewCountry] = useState<string>(COUNTRIES[0] ?? "");
  const [newAmount, setNewAmount] = useState("");

  const addEntry = () => {
    if (!newCountry || newAmount === "" || isNaN(parseFloat(newAmount))) return;
    if (entries.some(e => e.country === newCountry)) {
      setError("That country is already in the list.");
      return;
    }
    setEntries(prev => [...prev, { country: newCountry, amount: parseFloat(newAmount), enabled: true }]);
    setNewAmount("");
    setError(null);
  };

  const addEuEntries = () => {
    const existing = new Set(entries.map(e => e.country));
    const toAdd = EU_COUNTRIES.filter(c => !existing.has(c.name));
    if (toAdd.length === 0) { setError("All EU countries are already in the list."); return; }
    setEntries(prev => [...prev, ...toAdd.map(c => ({ country: c.name, amount: 0, enabled: true }))]);
    setError(null);
  };

  const removeEntry = (country: string) => setEntries(prev => prev.filter(e => e.country !== country));

  const updateEntry = (country: string, field: "amount" | "enabled", val: number | boolean) => {
    setEntries(prev => prev.map(e => e.country === country ? { ...e, [field]: val } : e));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ adminFeeCountries: entries }),
    });
    if (res.ok) {
      const updated = await res.json();
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      const d = await res.json().catch(() => ({}));
      setError((d as { error?: string }).error ?? "Failed to save.");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-1">Admin Fee by Country</h3>
        <p className="text-xs text-muted-foreground">
          Override the base admin fee for specific countries. When a customer selects a delivery country matching an enabled entry, that amount is used instead of the default.
        </p>
      </div>

      {entries.length > 0 ? (
        <div className="space-y-2">
          {entries.map(e => (
            <div key={e.country} className="flex items-center gap-2 rounded-xl border border-border p-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{e.country}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{gb.currency}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={e.amount}
                  onChange={ev => updateEntry(e.country, "amount", parseFloat(ev.target.value) || 0)}
                  className="w-20 rounded-lg border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <button
                type="button"
                onClick={() => updateEntry(e.country, "enabled", !e.enabled)}
                title={e.enabled ? "Enabled" : "Disabled"}
                className={cn("p-1 rounded-md transition-colors", e.enabled ? "text-green-600 bg-green-50" : "text-muted-foreground bg-muted")}
              >
                {e.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              </button>
              <button type="button" onClick={() => removeEntry(e.country)} className="p-1 text-muted-foreground hover:text-red-500 rounded-md transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">No country overrides yet.</p>
      )}

      {/* Add new entry */}
      <div className="pt-2 border-t border-border space-y-2">
        <button type="button" onClick={addEuEntries}
          className="w-full rounded-xl border border-dashed border-blue-200 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5">
          <Globe className="w-3.5 h-3.5" />Add All EU Countries (fee = 0)
        </button>
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label className="text-[10px] text-muted-foreground mb-1 block">Country</Label>
          <select
            value={newCountry}
            onChange={e => setNewCountry(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground mb-1 block">Amount ({gb.currency})</Label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={newAmount}
            onChange={e => setNewAmount(e.target.value)}
            className="w-24 rounded-lg border border-input bg-background px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Button size="sm" variant="outline" onClick={addEntry} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <Button onClick={save} disabled={saving} className="gap-1.5">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
        {saved ? "Saved!" : "Save Changes"}
      </Button>
    </div>
  );
}

// ─── Open as Organiser Button ─────────────────────────────────
