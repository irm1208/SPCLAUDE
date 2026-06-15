// ─── Deterministic stub carrier provider ─────────────────────────────────────
// Used when PARCEL2GO_CLIENT_ID / PARCEL2GO_CLIENT_SECRET are not set.
// Prices are pre-researched representative GBP rates from a UK origin.
// GBP→USD conversion fixed at 1.27 (update here if needed).

import type { CarrierProvider, QuoteRequest, QuoteResult, QuoteService } from "./types.js";

const GBP_TO_USD = 1.27;

function gbpToUsd(pence: number): number {
  return Math.ceil((pence / 100) * GBP_TO_USD * 100) / 100;
}

// Representative GBP pence rates from UK to EU destinations, per weight bucket
// Weight buckets: ≤ 0.5 kg, ≤ 1 kg, ≤ 2 kg, ≤ 3 kg, ≤ 5 kg
const COUNTRY_RATES: Record<string, number[]> = {
  IE: [1090, 1290, 1490, 1690, 1890],
  BE: [1090, 1290, 1490, 1690, 1890],
  NL: [1090, 1290, 1490, 1690, 1890],
  LU: [1090, 1290, 1490, 1690, 1890],
  DE: [1090, 1290, 1490, 1690, 1890],
  AT: [1290, 1490, 1690, 1890, 2190],
  FR: [1090, 1290, 1490, 1690, 1890],
  ES: [1390, 1690, 1990, 2290, 2790],
  PT: [1490, 1790, 2090, 2390, 2890],
  IT: [1290, 1490, 1890, 2190, 2590],
  SE: [1390, 1690, 1990, 2290, 2790],
  DK: [1290, 1490, 1690, 1990, 2390],
  FI: [1390, 1690, 1990, 2290, 2790],
  NO: [1590, 1890, 2190, 2590, 3190],
  EE: [1390, 1690, 1990, 2290, 2790],
  LV: [1390, 1690, 1990, 2290, 2790],
  LT: [1390, 1690, 1990, 2290, 2790],
  PL: [1190, 1390, 1690, 1990, 2390],
  CZ: [1290, 1490, 1790, 2090, 2490],
  SK: [1290, 1490, 1790, 2090, 2490],
  HU: [1390, 1690, 1990, 2290, 2790],
  RO: [1590, 1890, 2190, 2590, 3190],
  BG: [1690, 1990, 2390, 2790, 3390],
  HR: [1490, 1790, 2090, 2390, 2890],
  SI: [1290, 1490, 1790, 2090, 2490],
  GR: [1590, 1890, 2290, 2690, 3290],
  CY: [1790, 2190, 2590, 2990, 3590],
  MT: [1690, 2090, 2490, 2890, 3490],
  CH: [1590, 1890, 2190, 2590, 3190],
  US: [1990, 2490, 2990, 3490, 4290],
  CA: [1990, 2490, 2990, 3490, 4290],
  AU: [2190, 2690, 3190, 3990, 4990],
};
const DEFAULT_RATE: number[] = [1590, 1990, 2390, 2990, 3790];

const WEIGHT_BUCKETS = [500, 1000, 2000, 3000, 5000]; // grams

function pickRate(country: string, weightGrams: number): number {
  const rates = COUNTRY_RATES[country.toUpperCase()] ?? DEFAULT_RATE;
  const idx = WEIGHT_BUCKETS.findIndex(b => weightGrams <= b);
  return rates[idx === -1 ? rates.length - 1 : idx]!;
}

export class StubCarrierProvider implements CarrierProvider {
  readonly name = "stub";

  async getQuotes(req: QuoteRequest): Promise<QuoteResult> {
    const country = req.destination.countryCode;
    const totalWeightGrams = req.packages.reduce((s, p) => s + p.weightKg * 1000, 0);
    const basePence = pickRate(country, totalWeightGrams);
    const isEU = [
      "IE","BE","NL","LU","DE","AT","FR","ES","PT","IT","SE","DK","FI",
      "NO","EE","LV","LT","PL","CZ","SK","HU","RO","BG","HR","SI","GR","CY","MT","CH",
    ].includes(country.toUpperCase());

    const services: QuoteService[] = [
      {
        serviceRef: `stub-standard-${country}`,
        serviceName: isEU ? "UPS Standard" : "Royal Mail International",
        carrier: isEU ? "UPS" : "Royal Mail",
        estimatedDays: isEU ? "3-5" : "5-10",
        priceGbpPence: basePence,
        priceUsd: gbpToUsd(basePence),
      },
    ];

    // If the country is nearby (IE/DE/FR/NL/BE), also offer an Express option
    if (["IE","DE","FR","NL","BE","LU"].includes(country.toUpperCase())) {
      const expressPence = Math.round(basePence * 1.6);
      services.push({
        serviceRef: `stub-express-${country}`,
        serviceName: "UPS Express Saver",
        carrier: "UPS",
        estimatedDays: "1-2",
        priceGbpPence: expressPence,
        priceUsd: gbpToUsd(expressPence),
      });
    }

    return { services, source: "stub" };
  }
}
