import React, { useEffect, useCallback } from "react";
import { X, ArrowRight, FlaskConical, Zap, AlertTriangle } from "lucide-react";
import { T } from "@/lib/theme";
import type { Protocol } from "@/data/protocols";

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

function getUses(p: Protocol): string[] {
  const results: string[] = [];
  if (p.researchIndications && p.researchIndications.length > 0) {
    const cats = p.researchIndications.map(ri => ri.category);
    cats.forEach(c => results.push(c));
    p.researchIndications.forEach(ri => {
      ri.items.slice(0, 2).forEach(item => {
        if (!results.includes(item.title)) results.push(item.title);
      });
    });
  }
  const bullets = parseBullets(p.benefits);
  bullets.forEach(b => { if (!results.includes(b) && results.length < 8) results.push(b); });
  if (results.length === 0 && p.tagline) results.push(p.tagline);
  return results.slice(0, 8);
}

function getBenefits(p: Protocol): string[] {
  const bullets = parseBullets(p.benefits);
  if (p.overview?.keyBenefits) {
    const extra = parseBullets(p.overview.keyBenefits);
    const combined = [...bullets, ...extra.filter(e => !bullets.some(b => b === e))];
    return combined.slice(0, 8);
  }
  return bullets.slice(0, 8);
}

function getSideEffects(p: Protocol): string[] {
  const bullets: string[] = [];
  if (p.sideEffectNotes && p.sideEffectNotes.length > 0) {
    bullets.push(...p.sideEffectNotes);
  }
  const parsed = parseBullets(p.sideEffects);
  parsed.forEach(s => { if (!bullets.includes(s)) bullets.push(s); });
  return bullets.slice(0, 8);
}

interface Section {
  label: string;
  items: string[];
  icon: React.ReactNode;
  accent: string;
}

export function ProtocolQuickView({
  protocol,
  onClose,
  onFullProfile,
}: {
  protocol: Protocol;
  onClose: () => void;
  onFullProfile: () => void;
}) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [handleKey]);

  const uses = getUses(protocol);
  const benefits = getBenefits(protocol);
  const sideEffects = getSideEffects(protocol);

  const sections: Section[] = [
    {
      label: "Uses",
      items: uses,
      icon: <FlaskConical size={13} />,
      accent: protocol.color,
    },
    {
      label: "Benefits",
      items: benefits,
      icon: <Zap size={13} />,
      accent: "var(--t-blue)",
    },
    {
      label: "Side Effects",
      items: sideEffects,
      icon: <AlertTriangle size={13} />,
      accent: "#B45309",
    },
  ].filter(s => s.items.length > 0);

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
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-white text-[11px] leading-none"
            style={{ background: protocol.color }}
          >
            {protocol.abbreviation.split(" ")[0].slice(0, 5)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold leading-tight" style={{ color: T.text }}>{protocol.name}</p>
            <p className="text-[11px] mt-0.5 leading-snug" style={{ color: T.muted }}>{protocol.tagline}</p>
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

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-5">
          {sections.map(sec => (
            <div key={sec.label}>
              <div className="flex items-center gap-1.5 mb-2">
                <span style={{ color: sec.accent }}>{sec.icon}</span>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: sec.accent }}
                >
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
                    <span className="text-[12px] leading-snug" style={{ color: T.text }}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {protocol.watchOut && (
            <div
              className="rounded-xl p-3 text-[11px] leading-relaxed"
              style={{ background: "rgba(180,83,9,0.08)", color: "#92400E", border: "1px solid rgba(180,83,9,0.15)" }}
            >
              <span className="font-bold">Watch out: </span>{protocol.watchOut}
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
            aria-label={`View full profile for ${protocol.name}`}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-semibold transition-colors whitespace-nowrap"
            style={{ background: protocol.color, color: "#fff" }}
          >
            Full Profile
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
