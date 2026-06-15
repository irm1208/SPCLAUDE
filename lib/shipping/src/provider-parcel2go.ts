// ─── Parcel2Go live carrier provider ─────────────────────────────────────────
// Requires env: PARCEL2GO_CLIENT_ID, PARCEL2GO_CLIENT_SECRET
// Uses OAuth2 client_credentials then POST /api/goods/quote

import type { CarrierProvider, QuoteRequest, QuoteResult, QuoteService } from "./types.js";

const API_BASE = "https://api.parcel2go.com";
const GBP_TO_USD = 1.27; // Approximate; update as needed

interface TokenCache {
  token: string;
  expiresAt: number;
}

interface P2GService {
  ServiceId: string;
  Name: string;
  CarrierName: string;
  EstimatedTransitDays?: { Min?: number; Max?: number } | null;
  Price?: { TotalPrice?: number };
  DisplayPrice?: number;
}

let _tokenCache: TokenCache | null = null;

async function fetchToken(clientId: string, clientSecret: string): Promise<string> {
  if (_tokenCache && _tokenCache.expiresAt > Date.now() + 60_000) {
    return _tokenCache.token;
  }
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "public",
  });
  const res = await fetch(`${API_BASE}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Parcel2Go auth failed ${res.status}: ${text}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  _tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return _tokenCache.token;
}

function penceToUsd(pence: number): number {
  return Math.ceil((pence / 100) * GBP_TO_USD * 100) / 100;
}

export class Parcel2GoProvider implements CarrierProvider {
  readonly name = "parcel2go";
  private clientId: string;
  private clientSecret: string;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  async getQuotes(req: QuoteRequest): Promise<QuoteResult> {
    const token = await fetchToken(this.clientId, this.clientSecret);

    const body = {
      Collection: {
        Address: {
          CountryCode: req.origin.countryCode,
          PostCode: req.origin.postcode ?? "",
        },
      },
      Delivery: {
        Address: {
          CountryCode: req.destination.countryCode,
          PostCode: req.destination.postcode ?? "",
          City: req.destination.city ?? "",
        },
      },
      Packages: req.packages.map(p => ({
        Weight: { Value: p.weightKg, Unit: "KG" },
        Length: { Value: p.lengthCm, Unit: "CM" },
        Width: { Value: p.widthCm, Unit: "CM" },
        Height: { Value: p.heightCm, Unit: "CM" },
      })),
    };

    const res = await fetch(`${API_BASE}/api/goods/quote`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Parcel2Go quote failed ${res.status}: ${text}`);
    }

    const data = (await res.json()) as { Services?: P2GService[] };
    const raw = data.Services ?? [];

    const services: QuoteService[] = raw.map(s => {
      const priceGbp = s.Price?.TotalPrice ?? s.DisplayPrice ?? 0;
      const priceGbpPence = Math.round(priceGbp * 100);
      let estimatedDays: string | undefined;
      if (s.EstimatedTransitDays?.Min != null && s.EstimatedTransitDays?.Max != null) {
        estimatedDays = `${s.EstimatedTransitDays.Min}-${s.EstimatedTransitDays.Max}`;
      }
      return {
        serviceRef: s.ServiceId,
        serviceName: s.Name,
        carrier: s.CarrierName,
        estimatedDays,
        priceGbpPence,
        priceUsd: penceToUsd(priceGbpPence),
      };
    });

    return { services, source: "live" };
  }
}
