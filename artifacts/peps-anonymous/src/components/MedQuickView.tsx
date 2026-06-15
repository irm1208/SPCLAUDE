import React, { useEffect, useCallback } from "react";
import { X, ArrowRight, FlaskConical, Zap, AlertTriangle, Syringe } from "lucide-react";
import { T } from "@/lib/theme";
import type { MedProtocol } from "@/data/medication-protocols";

function parseBullets(str: string): string[] {
  if (!str) return [];
  const segments: string[] = [];
  str
    .split(/\.\s+|[·|]/)
    .map(s => s.replace(/\.$/, "").trim())
    .filter(s => s.length > 3)
    .forEach(segment => {
      const commaCount = (segment.match(/,/g) || []).length;
      if (commaCount >= 2) {
        segment
          .split(",")
          .map(s => s.trim())
          .filter(s => s.length > 2)
          .forEach(s => segments.push(s));
      } else {
        segments.push(segment);
      }
    });
  return [...new Set(segments)];
}

function getUses(m: MedProtocol): string[] {
  const results: string[] = [];
  if (m.researchIndications && m.researchIndications.length > 0) {
    m.researchIndications.forEach(ri => {
      if (!results.includes(ri.category)) results.push(ri.category);
      ri.items.slice(0, 2).forEach(item => {
        if (!results.includes(item.title)) results.push(item.title);
      });
    });
  }
  const bullets = parseBullets(m.benefits);
  bullets.forEach(b => { if (!results.includes(b) && results.length < 8) results.push(b); });
  if (results.length === 0 && m.tagline) results.push(m.tagline);
  return results.slice(0, 8);
}

function getBenefits(m: MedProtocol): string[] {
  const bullets = parseBullets(m.benefits);
  if (m.overview?.keyBenefits) {
    const extra = parseBullets(m.overview.keyBenefits);
    const combined = [...bullets, ...extra.filter(e => !bullets.some(b => b === e))];
    return combined.slice(0, 7);
  }
  return bullets.slice(0, 7);
}

function getSideEffects(m: MedProtocol): string[] {
  const bullets: string[] = [];
  if (m.sideEffectNotes && m.sideEffectNotes.length > 0) {
    bullets.push(...m.sideEffectNotes.slice(0, 4));
  }
  const parsed = parseBullets(m.sideEffects);
  parsed.forEach(s => { if (!bullets.includes(s)) bullets.push(s); });
  return bullets.slice(0, 6);
}

function shortAbbrev(abbrev: string): string {
  const bySpace = abbrev.split(" ")[0];
  return bySpace.length <= 6 ? bySpace : bySpace.slice(0, 5);
}

interface Section {
  label: string;
  items: string[];
  icon: React.ReactNode;
  accent: string;
}

export function MedQuickView({
  med,
  onClose,
  onFullProfile,
}: {
  med: MedProtocol;
  onClose: () => void;
  onFullProfile: () => void;
}) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [handleKey]);

  const uses = getUses(med);
  const benefits = getBenefits(med);
  const sideEffects = getSideEffects(med);

  const sections: Section[] = [
    { label: "Uses", items: uses, icon: <FlaskConical size={13} />, accent: med.color },
    { label: "Benefits", items: benefits, icon: <Zap size={13} />, accent: "var(--t-blue)" },
    { label: "Side Effects", items: sideEffects, icon: <AlertTriangle size={13} />, accent: "#B45309" },
  ].filter(s => s.items.length > 0);

  const abbrev = shortAbbrev(med.abbreviation);
  const abbrevSize = abbrev.length <= 3 ? "13px" : abbrev.length <= 4 ? "11px" : "9px";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-md mx-auto sm:rounded-2xl rounded-t-2xl flex flex-col"
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          maxHeight: "85vh",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-start gap-3 p-4 pb-3 flex-shrink-0"
          style={{ borderBottom: `1px solid ${T.border}` }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-white leading-none"
            style={{ background: med.color, fontSize: abbrevSize }}
          >
            {abbrev}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold leading-tight" style={{ color: T.text }}>{med.name}</p>
            <p className="text-[11px] mt-0.5 leading-snug" style={{ color: T.muted }}>{med.tagline}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close quick view"
            className="w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0 transition-colors"
            style={{ background: T.tagBg, color: T.subtle }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Dosing strip */}
        {(med.startDose || med.frequency || med.route) && (
          <div
            className="px-4 py-2.5 flex items-center gap-4 flex-shrink-0"
            style={{ background: `${med.color}0c`, borderBottom: `1px solid ${T.border}` }}
          >
            <Syringe size={12} style={{ color: med.color, flexShrink: 0 }} />
            {[
              med.startDose && { label: "Start", value: med.startDose },
              med.targetDose && med.targetDose !== med.startDose && { label: "Target", value: med.targetDose },
              med.frequency && { label: "Frequency", value: med.frequency },
              med.route && { label: "Route", value: med.route },
            ].filter((x): x is { label: string; value: string } => !!x).map(item => (
              <div key={item.label} className="flex flex-col min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: med.color }}>{item.label}</span>
                <span className="text-[11px] font-semibold leading-tight truncate" style={{ color: T.text }}>{item.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-5">
          {sections.map(sec => (
            <div key={sec.label}>
              <div className="flex items-center gap-1.5 mb-2">
                <span style={{ color: sec.accent }}>{sec.icon}</span>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: sec.accent }}>
                  {sec.label}
                </p>
              </div>
              <ul className="space-y-1.5">
                {sec.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      className="mt-[5px] w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: sec.accent, opacity: 0.7 }}
                    />
                    <span className="text-[12px] leading-snug" style={{ color: T.text }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {med.watchOut && (
            <div
              className="rounded-xl p-3 text-[11px] leading-relaxed"
              style={{ background: "rgba(180,83,9,0.08)", color: "#92400E", border: "1px solid rgba(180,83,9,0.15)" }}
            >
              <span className="font-bold">Watch out: </span>{med.watchOut}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-3 p-4 flex-shrink-0"
          style={{ borderTop: `1px solid ${T.border}` }}
        >
          <p className="text-[10px] leading-snug" style={{ color: T.subtle }}>
            For educational purposes only
          </p>
          <button
            onClick={onFullProfile}
            aria-label={`View full profile for ${med.name}`}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-semibold transition-colors whitespace-nowrap"
            style={{ background: med.color, color: "#fff" }}
          >
            Full Profile
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
