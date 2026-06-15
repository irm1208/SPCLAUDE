// ─── ShippingQuoteWidget ──────────────────────────────────────────────────────
// Reusable shipping quote fetcher.
// Shown in OrderForm (lockCountry=true) and ShopCheckout.
// Renders: country picker → postcode → "Get Quotes" → service cards.

import React, { useState } from "react";
import { Loader2, Truck, Package, RefreshCw, MapPin } from "lucide-react";

// ISO code → display name for supported shipping destinations
export const SHIP_COUNTRIES: Record<string, string> = {
  GB: "United Kingdom",
  IE: "Ireland",
  BE: "Belgium", NL: "Netherlands", LU: "Luxembourg",
  DE: "Germany", AT: "Austria",
  FR: "France",
  ES: "Spain", PT: "Portugal",
  IT: "Italy",
  SE: "Sweden", DK: "Denmark", FI: "Finland", NO: "Norway",
  EE: "Estonia", LV: "Latvia", LT: "Lithuania",
  PL: "Poland", CZ: "Czech Republic", SK: "Slovakia",
  HU: "Hungary", RO: "Romania", BG: "Bulgaria", HR: "Croatia", SI: "Slovenia",
  GR: "Greece", CY: "Cyprus", MT: "Malta",
  CH: "Switzerland",
  US: "United States", CA: "Canada", AU: "Australia",
};

export interface QuoteService {
  serviceRef: string;
  serviceName: string;
  carrier: string;
  estimatedDays?: string;
  priceUsd: number;
}

interface Props {
  /** Items to quote for */
  items: Array<{ productId: string; quantity: number }>;
  /** "gb" for group buy products, "vial" for vial shop */
  type?: "gb" | "vial";
  /** Currently selected service ref */
  selectedRef: string | null;
  /** Called when user picks a service */
  onSelect: (service: QuoteService) => void;
  /** Initial country code (ISO-2) from account */
  defaultCountry?: string | null;
  /** Initial postcode from account */
  defaultPostcode?: string | null;
  /**
   * When true the country select is hidden and replaced with a read-only badge.
   * Use on OrderForm where the country comes from the user's saved address.
   */
  lockCountry?: boolean;
}

export function ShippingQuoteWidget({
  items,
  type = "gb",
  selectedRef,
  onSelect,
  defaultCountry,
  defaultPostcode,
  lockCountry = false,
}: Props) {
  const [country, setCountry] = useState(defaultCountry ?? "");
  const [postcode, setPostcode] = useState(defaultPostcode ?? "");
  const [services, setServices] = useState<QuoteService[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState<"live" | "stub" | null>(null);
  const [fetched, setFetched] = useState(false);

  const countryName = SHIP_COUNTRIES[country.toUpperCase()] ?? null;
  const canFetch = country.trim().length >= 2 && items.length > 0;

  const fetchQuotes = async () => {
    if (!canFetch) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items,
          destination: { countryCode: country.trim().toUpperCase(), postcode: postcode.trim() },
          type,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to get quotes");
        return;
      }
      const data = await res.json();
      setServices(data.services ?? []);
      setSource(data.source ?? null);
      setFetched(true);
      if ((data.services ?? []).length === 1) {
        onSelect(data.services[0]);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  // When country is locked but not yet set, prompt user to fill their address
  if (lockCountry && !country) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl p-3 text-sm" style={{ background: "#FEF3C7", border: "1px solid #FDE68A" }}>
        <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
        <p className="text-amber-800 text-xs leading-snug">
          Your signup country isn't on our shipping list. Update your country in <span className="font-semibold">My Profile → Shipping Address</span> to see delivery options.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Country row — locked badge or select */}
      <div className="flex gap-2">
        <div className="flex-1">
          {lockCountry ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#8A9AAA" }}>
                Destination Country
              </p>
              <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-gray-200 bg-gray-50">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                <span className="text-sm font-medium text-gray-800">{countryName ?? country}</span>
                <span className="ml-auto text-[10px] text-gray-400 font-medium">from profile</span>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#8A9AAA" }}>
                Destination Country
              </label>
              <select
                value={country}
                onChange={e => { setCountry(e.target.value); setFetched(false); setServices([]); }}
                className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-300 appearance-none"
              >
                <option value="">Select country…</option>
                {Object.entries(SHIP_COUNTRIES).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="w-28">
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#8A9AAA" }}>
            Postcode
          </label>
          <input
            type="text"
            value={postcode}
            onChange={e => { setPostcode(e.target.value); setFetched(false); setServices([]); }}
            placeholder="Optional"
            className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:outline-none focus:border-blue-300"
          />
        </div>
      </div>

      {/* Get Quotes button */}
      <button
        type="button"
        disabled={!canFetch || loading}
        onClick={fetchQuotes}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
        style={{
          background: canFetch ? "var(--t-blue-deep, #1B3A7A)" : "#E5E7EB",
          color: canFetch ? "white" : "#9CA3AF",
        }}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : fetched ? (
          <RefreshCw className="w-4 h-4" />
        ) : (
          <Truck className="w-4 h-4" />
        )}
        {loading ? "Getting quotes…" : fetched ? "Refresh Quotes" : "Get Shipping Quotes"}
      </button>

      {error && (
        <p className="text-xs text-red-500 font-medium">{error}</p>
      )}

      {/* Service cards */}
      {fetched && services.length === 0 && !loading && (
        <p className="text-xs text-gray-500">No shipping services available for this destination.</p>
      )}

      {services.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          {services.map(svc => {
            const isSelected = selectedRef === svc.serviceRef;
            return (
              <button
                key={svc.serviceRef}
                type="button"
                onClick={() => onSelect(svc)}
                className="rounded-2xl p-3.5 text-left transition-all border-2"
                style={{
                  borderColor: isSelected ? "var(--t-blue-deep, #1B3A7A)" : "transparent",
                  background: isSelected ? "rgba(27,58,122,0.06)" : "#F3F4F6",
                  transform: isSelected ? "scale(1)" : "scale(0.98)",
                }}
              >
                <Package className="w-4 h-4 mb-2" style={{ color: isSelected ? "var(--t-blue-deep, #1B3A7A)" : "#6B7280" }} />
                <p className="text-sm font-bold text-gray-900 leading-tight">{svc.serviceName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{svc.carrier}{svc.estimatedDays ? ` · ${svc.estimatedDays} days` : ""}</p>
                <p className="text-base font-bold mt-1" style={{ color: isSelected ? "var(--t-blue-deep, #1B3A7A)" : "#111827" }}>
                  ${svc.priceUsd.toFixed(2)}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {source === "stub" && services.length > 0 && (
        <p className="text-[10px] text-gray-400">Estimated rates — final price confirmed at dispatch.</p>
      )}
    </div>
  );
}
