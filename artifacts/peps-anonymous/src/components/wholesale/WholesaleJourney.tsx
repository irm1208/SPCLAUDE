import React from "react";
import { Check } from "lucide-react";
import { normalizeShippingCountry } from "../../lib/country-shipping-options";

export type WholesaleJourneyStep = 0 | 1 | 2;

export function getWholesaleRegionIndex(regions: { countries?: string[] }[], destination: string): number {
  const country = normalizeShippingCountry(destination);
  if (!country) return -1;
  return regions.findIndex(region => (region.countries ?? []).some(value => normalizeShippingCountry(value) === country));
}

export function getWholesaleSummaryTotal(subtotal: number, shipping: number | null, tip: number): number | null {
  return shipping === null ? null : Math.round((subtotal + shipping + tip) * 100) / 100;
}

export function getWholesaleNextStep(step: WholesaleJourneyStep, supplierReady: boolean, kits: number): WholesaleJourneyStep {
  if (step === 0 && supplierReady) return 1;
  if (step === 1 && supplierReady && kits > 0) return 2;
  return step;
}

export function WholesaleJourney({ step, onStep }: {
  step: WholesaleJourneyStep;
  onStep: (step: WholesaleJourneyStep) => void;
}) {
  return (
    <nav className="whj-steps" aria-label="Wholesale order steps">
      {["Supplier", "Products", "Delivery", "Review"].map((label, index) => (
        <button key={label} type="button" className={`whj-step ${index === step ? "is-active" : ""} ${index < step ? "is-complete" : ""}`}
          disabled={index > step} aria-current={index === step ? "step" : undefined}
          onClick={() => { if (index <= step) onStep(index as WholesaleJourneyStep); }}>
          <span className="whj-step-number">{index < step ? <Check size={14} /> : `0${index + 1}`}</span>
          <span>{label}</span>
          {index < 3 && <span className="whj-step-line" aria-hidden="true" />}
        </button>
      ))}
    </nav>
  );
}
