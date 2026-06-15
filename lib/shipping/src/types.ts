// ─── Shipping carrier provider types ─────────────────────────────────────────

export interface QuoteAddress {
  countryCode: string;
  postcode?: string;
  city?: string;
}

export interface QuotePackage {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface QuoteRequest {
  origin: QuoteAddress;
  destination: QuoteAddress;
  packages: QuotePackage[];
}

export interface QuoteService {
  /** Unique service identifier (used when saving to order) */
  serviceRef: string;
  /** Human-readable service name, e.g. "UPS Standard" */
  serviceName: string;
  /** Carrier name, e.g. "UPS", "Royal Mail" */
  carrier: string;
  /** Estimated delivery window in business days, e.g. "3-5" */
  estimatedDays?: string;
  /** Price in GBP (pennies) */
  priceGbpPence: number;
  /** Price in USD (pre-converted for display) */
  priceUsd: number;
}

export interface QuoteResult {
  services: QuoteService[];
  /** Whether quotes came from a live carrier API or the stub */
  source: "live" | "stub";
}

/** Minimal interface that every carrier provider must implement */
export interface CarrierProvider {
  readonly name: string;
  getQuotes(request: QuoteRequest): Promise<QuoteResult>;
}
