/**
 * Currency display hook — GBP-native shop with optional USD/EUR display conversion.
 *
 * All prices in the database are stored in GBP.
 * useCurrency() always formats in £ for checkout / admin surfaces.
 * useDisplayCurrency() handles the user-selected display currency and live FX conversion.
 */
import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DisplayCurrency = 'GBP' | 'USD' | 'EUR';

export const CURRENCY_SYMBOLS: Record<DisplayCurrency, string> = {
  GBP: '£',
  USD: '$',
  EUR: '€',
};

const RATE_CACHE_MS = 60 * 60 * 1000; // 1 hour

interface CurrencyStoreState {
  selectedCurrency: DisplayCurrency;
  rates: Record<string, number>;
  lastFetched: number | null;
  setSelectedCurrency: (c: DisplayCurrency) => void;
  setRates: (rates: Record<string, number>, ts: number) => void;
}

export const useCurrencyStore = create<CurrencyStoreState>()(
  persist(
    (set) => ({
      selectedCurrency: 'GBP',
      rates: {},
      lastFetched: null,
      setSelectedCurrency: (c) => set({ selectedCurrency: c }),
      setRates: (rates, ts) => set({ rates, lastFetched: ts }),
    }),
    { name: 'peps-currency' }
  )
);

/**
 * Fetches live GBP→USD/EUR exchange rates from frankfurter.app.
 * Caches for 1 hour. Silently ignores failures.
 * Call this once at the layout/app root level.
 */
export function useFetchExchangeRate() {
  const rates = useCurrencyStore(s => s.rates);
  const lastFetched = useCurrencyStore(s => s.lastFetched);
  const setRates = useCurrencyStore(s => s.setRates);

  useEffect(() => {
    const now = Date.now();
    const hasRates = Object.keys(rates).length > 0;
    const isFresh = lastFetched != null && (now - lastFetched) < RATE_CACHE_MS;
    if (hasRates && isFresh) return;

    fetch('/api/fx-rates')
      .then(r => r.json())
      .then((data: { rates?: Record<string, number> }) => {
        if (data?.rates) setRates(data.rates, Date.now());
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- runs once on mount; store values read via closure are stable references
}

/**
 * Display currency hook — use in components that show prices.
 * Returns the currently selected currency, a setter, and helpers:
 *   - convert(gbpAmount): secondary "≈ $X" string or null (legacy)
 *   - formatPrice(gbpAmount): single formatted price in selected currency
 */
export function useDisplayCurrency() {
  const selectedCurrency = useCurrencyStore(s => s.selectedCurrency);
  const rates = useCurrencyStore(s => s.rates);
  const setSelectedCurrency = useCurrencyStore(s => s.setSelectedCurrency);

  function convert(gbpAmount: number): string | null {
    if (selectedCurrency === 'GBP') return null;
    const rate = rates[selectedCurrency];
    if (!rate) return null;
    const symbol = CURRENCY_SYMBOLS[selectedCurrency];
    const converted = gbpAmount * rate;
    return `≈ ${symbol}${converted.toFixed(2)}`;
  }

  function formatPrice(gbpAmount: number): string {
    if (selectedCurrency === 'GBP') return `£${gbpAmount.toFixed(2)}`;
    const rate = rates[selectedCurrency];
    if (!rate) return `£${gbpAmount.toFixed(2)}`;
    const symbol = CURRENCY_SYMBOLS[selectedCurrency];
    return `${symbol}${(gbpAmount * rate).toFixed(2)}`;
  }

  return {
    currency: selectedCurrency,
    setCurrency: setSelectedCurrency,
    symbol: CURRENCY_SYMBOLS[selectedCurrency],
    convert,
    formatPrice,
  };
}

/**
 * Backward-compatible hook — always formats in GBP £.
 * Use this for checkout, cart, order forms, and admin — surfaces where currency
 * must not change regardless of the user's display preference.
 */
export function useCurrency() {
  function format(amount: number): string {
    return `£${amount.toFixed(2)}`;
  }

  function formatShort(amount: number): string {
    return `£${amount.toFixed(2)}`;
  }

  return { showGBP: true, symbol: '£', format, formatShort, toggleCurrency: () => {} };
}
