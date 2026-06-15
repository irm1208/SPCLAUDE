import React, { useState, useMemo, useEffect } from "react";
import { Search, FlaskConical, ArrowRight, BookMarked, Syringe, Pill } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { PageLayout } from "@/components/PageLayout";
import { SiteAnnouncements } from "@/components/SiteAnnouncements";
import { PROTOCOLS, type Protocol } from "@/data/protocols";
import { MED_PROTOCOLS, type MedProtocol, type MedCategory } from "@/data/medication-protocols";
import { T } from "@/lib/theme";
import { ProtocolQuickView } from "@/components/ProtocolQuickView";
import { MedQuickView } from "@/components/MedQuickView";

function lightenHex(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (n >> 16) + amount);
  const g = Math.min(255, ((n >> 8) & 0xff) + amount);
  const b = Math.min(255, (n & 0xff) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ─── Tracks ──────────────────────────────────────────────────────────────────

type Track = "peptides" | "trtaas" | "medications";

const PEPTIDE_CATS = ["glp1", "healing", "gh", "cognitive", "other"] as const;
const TRTAAS_CATS = ["trt", "aas", "oral", "sarm", "ancillary"] as const;

const PEPTIDE_CATEGORIES = [
  { id: "all",       label: "All" },
  { id: "glp1",      label: "GLP-1" },
  { id: "healing",   label: "Healing" },
  { id: "gh",        label: "GH Peptides" },
  { id: "cognitive", label: "Cognitive" },
  { id: "other",     label: "Other" },
];

const TRTAAS_CATEGORIES = [
  { id: "all",       label: "All" },
  { id: "trt",       label: "TRT" },
  { id: "aas",       label: "AAS" },
  { id: "oral",      label: "Orals" },
  { id: "sarm",      label: "SARMs" },
  { id: "ancillary", label: "Ancillaries" },
];

const MED_CATEGORIES: { id: MedCategory | "all"; label: string }[] = [
  { id: "all",                 label: "All" },
  { id: "sexual-health",       label: "Sexual Health" },
  { id: "cognitive",           label: "Cognitive" },
  { id: "dermatology",         label: "Dermatology" },
  { id: "hair-loss",           label: "Hair Loss" },
  { id: "hormonal",            label: "Hormonal" },
  { id: "metabolic",           label: "Metabolic" },
  { id: "cardiovascular",      label: "Cardiovascular" },
  { id: "mental-sleep",        label: "Mental Health & Sleep" },
  { id: "pain",                label: "Pain" },
  { id: "allergy-respiratory", label: "Allergy & Respiratory" },
  { id: "gastro",              label: "Gastro & Liver" },
  { id: "antifungal",          label: "Antifungal & Antiviral" },
  { id: "antibiotic",          label: "Antibiotics" },
];

const CAT_LABELS: Record<string, string> = {
  glp1: "GLP-1", healing: "Healing", gh: "GH Peptide", cognitive: "Cognitive", other: "Other",
  trt: "TRT", aas: "AAS", oral: "Oral", sarm: "SARM", ancillary: "Ancillary",
  "sexual-health": "Sexual Health",
  "dermatology": "Dermatology",
  "hair-loss": "Hair Loss",
  "hormonal": "Hormonal",
  "metabolic": "Metabolic",
  "cardiovascular": "Cardiovascular",
  "mental-sleep": "Mental & Sleep",
  "pain": "Pain",
  "allergy-respiratory": "Allergy & Resp.",
  "gastro": "Gastro & Liver",
  "antifungal": "Antifungal",
  "antibiotic": "Antibiotic",
};

const LEVEL_COLORS: Record<string, { color: string; bg: string }> = {
  "Extensively Studied": { color: "#059669", bg: "rgba(5,150,105,0.10)" },
  "Well Researched":     { color: "var(--t-blue)", bg: "var(--t-blue-10)" },
  "Limited Research":    { color: "#D97706", bg: "rgba(217,119,6,0.10)" },
  "Early Research":      { color: "#7C3AED", bg: "rgba(124,58,237,0.10)" },
};

const PEPTIDE_SECTIONS = [
  { id: "glp1",      label: "GLP-1 Peptides",  accent: "#059669",        cats: ["glp1"] },
  { id: "healing",   label: "Healing Peptides", accent: "var(--t-blue)", cats: ["healing"] },
  { id: "gh",        label: "GH Peptides",      accent: "#7C3AED",       cats: ["gh"] },
  { id: "cognitive", label: "Cognitive",         accent: "#D97706",       cats: ["cognitive"] },
  { id: "other",     label: "Other Peptides",    accent: "#64748B",       cats: ["other"] },
];

const TRTAAS_SECTIONS = [
  { id: "trt",       label: "TRT",           accent: "var(--t-blue-deep)", cats: ["trt"] },
  { id: "aas",       label: "AAS",           accent: "#B91C1C",            cats: ["aas"] },
  { id: "oralssarm", label: "Orals & SARMs", accent: "#059669",            cats: ["oral", "sarm"] },
  { id: "ancillary", label: "Ancillaries",   accent: "#6D28D9",            cats: ["ancillary"] },
];

const MED_SECTIONS = [
  { id: "sexual",        label: "Sexual Health",            accent: "#B91C1C",            cats: ["sexual-health"] },
  { id: "cognitive",     label: "Cognitive / Nootropics",   accent: "#7C3AED",            cats: ["cognitive"] },
  { id: "dermatology",   label: "Dermatology",              accent: "#D97706",            cats: ["dermatology"] },
  { id: "hair-loss",     label: "Hair Loss",                accent: "#0D9488",            cats: ["hair-loss"] },
  { id: "hormonal",      label: "Hormonal / Men's Health",  accent: "var(--t-blue-deep)", cats: ["hormonal"] },
  { id: "metabolic",     label: "Metabolic & Weight",       accent: "#059669",            cats: ["metabolic"] },
  { id: "cardiovascular",label: "Cardiovascular",           accent: "#DC2626",            cats: ["cardiovascular"] },
  { id: "mental-sleep",  label: "Mental Health & Sleep",    accent: "#6D28D9",            cats: ["mental-sleep"] },
  { id: "pain",          label: "Pain & Anti-inflammatory", accent: "#92400E",            cats: ["pain"] },
  { id: "allergy",       label: "Allergy & Respiratory",    accent: "#0E7490",            cats: ["allergy-respiratory"] },
  { id: "gastro",        label: "Gastro & Liver",           accent: "#065F46",            cats: ["gastro"] },
  { id: "antifungal",    label: "Antifungal & Antiviral",   accent: "#5B21B6",            cats: ["antifungal"] },
  { id: "antibiotic",    label: "Antibiotics",              accent: "#166534",            cats: ["antibiotic"] },
];

const TRACK_META: Record<Track, {
  label: string;
  short: string;
  icon: React.ElementType;
  accent: string;
  badgeBg: string;
  blurb: string;
  detailPath: (slug: string) => string;
  emptyIcon: React.ElementType;
  searchPlaceholder: string;
}> = {
  peptides: {
    label: "Peptides",
    short: "Pep",
    icon: BookMarked,
    accent: "var(--t-blue-deep)",
    badgeBg: "var(--t-blue-08)",
    blurb: "Research peptides — healing, GH, GLP-1 & cognitive",
    detailPath: (slug) => `/protocols/${slug}`,
    emptyIcon: FlaskConical,
    searchPlaceholder: "Search peptides…",
  },
  trtaas: {
    label: "TRT & AAS",
    short: "AAS",
    icon: Syringe,
    accent: "#B91C1C",
    badgeBg: "rgba(185,28,28,0.10)",
    blurb: "TRT, AAS, orals, SARMs & ancillaries",
    detailPath: (slug) => `/protocols/${slug}`,
    emptyIcon: Syringe,
    searchPlaceholder: "Search TRT, AAS, SARMs…",
  },
  medications: {
    label: "Medications",
    short: "Med",
    icon: Pill,
    accent: "#7C3AED",
    badgeBg: "rgba(124,58,237,0.10)",
    blurb: "Pharmaceutical-grade drugs with regional brand names",
    detailPath: (slug) => `/medications/${slug}`,
    emptyIcon: Pill,
    searchPlaceholder: "Search drugs or brand names…",
  },
};

// ─── Unified item shape ──────────────────────────────────────────────────────

type Item =
  | { track: "peptides" | "trtaas"; data: Protocol }
  | { track: "medications"; data: MedProtocol };

function shortAbbrev(abbrev: string): string {
  const bySpace = abbrev.split(' ')[0];
  return bySpace.length <= 6 ? bySpace : bySpace.slice(0, 5);
}

function searchMatches(item: Item, q: string): boolean {
  if (!q) return true;
  const d = item.data;
  if (d.name.toLowerCase().includes(q)) return true;
  if (d.tagline.toLowerCase().includes(q)) return true;
  if (d.aliases.some(a => a.toLowerCase().includes(q))) return true;
  if (item.track === "medications") {
    const m = d as MedProtocol;
    if (m.indianBrands.some(b => b.brand.toLowerCase().includes(q))) return true;
  }
  return false;
}

// ─── Card ────────────────────────────────────────────────────────────────────

function ProtocolCard({ item, onQuickView, onFullProfile, showTrackBadge }: {
  item: Item;
  onQuickView: () => void;
  onFullProfile: () => void;
  showTrackBadge?: boolean;
}) {
  const d = item.data;
  const levelCfg = d.researchLevel ? LEVEL_COLORS[d.researchLevel] : null;
  const trackMeta = TRACK_META[item.track];
  const TrackIcon = trackMeta.icon;

  const [isDark, setIsDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.dataset.theme === 'dark')
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  const displayColor = isDark ? lightenHex(d.color, 100) : d.color;

  const keyUseItems = useMemo((): Array<{ title: string }> => {
    if (d.researchIndications && d.researchIndications.length > 0) {
      const items: Array<{ title: string }> = [];
      for (const ri of d.researchIndications) {
        for (const it of ri.items) {
          items.push({ title: it.title });
          if (items.length >= 3) break;
        }
        if (items.length >= 3) break;
      }
      return items;
    }
    return d.benefits.split(/[·,]/).slice(0, 3).map(s => s.trim()).filter(Boolean).map(s => ({ title: s }));
  }, [d]);

  const abbrev = shortAbbrev(d.abbreviation);
  const abbrevSize = abbrev.length <= 3 ? "13px" : abbrev.length <= 4 ? "11px" : "9px";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onQuickView}
      onKeyDown={e => e.key === "Enter" && onQuickView()}
      className="rounded-xl flex flex-col cursor-pointer transition-all hover:shadow-md active:scale-[0.99]"
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        boxShadow: T.shadow,
        minHeight: 178,
      }}
    >
      <div className="p-4 flex-1">
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-white leading-none"
            style={{ background: displayColor, fontSize: abbrevSize }}
          >
            {abbrev}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[14px] font-bold leading-tight truncate" style={{ color: T.text }}>{d.name}</p>
              {showTrackBadge && (
                <span
                  className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                  style={{ background: trackMeta.badgeBg, color: trackMeta.accent }}
                  title={trackMeta.label}
                >
                  <TrackIcon className="w-2.5 h-2.5" />
                  {trackMeta.short}
                </span>
              )}
            </div>
            <p className="text-[11px] leading-snug line-clamp-2 mt-0.5" style={{ color: T.subtle }}>{d.tagline}</p>
          </div>
        </div>

        {d.tags && d.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {d.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] font-medium px-2.5 py-0.5 rounded-full"
                style={{ background: T.tagBg, color: T.tagText, border: `1px solid ${T.tagBorder}` }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mb-2.5" style={{ borderTop: `1px solid ${T.border}` }} />

        {keyUseItems.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: displayColor }}>
              {item.track === "peptides" ? "Research Uses" : "Key Uses"}
            </p>
            <div className="space-y-1">
              {keyUseItems.map((it, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-[9px] mt-[3px] shrink-0" style={{ color: displayColor }}>▸</span>
                  <p className="text-[11px] leading-snug" style={{ color: T.muted }}>{it.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        className="px-4 py-2.5 flex items-center justify-between rounded-b-xl"
        style={{ borderTop: `1px solid ${T.border}`, background: T.surface2 }}
      >
        {levelCfg && d.researchLevel ? (
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ color: levelCfg.color, background: levelCfg.bg }}
          >
            {d.researchLevel}
          </span>
        ) : (
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ color: T.subtle, background: T.tagBg }}>
            {CAT_LABELS[d.category] ?? d.category}
          </span>
        )}
        <button
          onClick={e => { e.stopPropagation(); onFullProfile(); }}
          className="w-6 h-6 flex items-center justify-center rounded-full transition-colors"
          style={{ background: T.tagBg }}
          title="Full profile"
        >
          <ArrowRight size={12} style={{ color: T.muted }} />
        </button>
      </div>
    </div>
  );
}

function SectionDivider({ label, accent, count }: { label: string; accent: string; count: number }) {
  return (
    <div className="flex items-center gap-3 mt-4 mb-3">
      <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${accent} 38%, transparent), transparent)` }} />
      <div className="shrink-0 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: accent }}>{label}</span>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ background: `color-mix(in srgb, ${accent} 8%, transparent)`, color: accent }}>{count}</span>
      </div>
      <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${accent} 38%, transparent))` }} />
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

const VALID_TRACKS: Track[] = ["peptides", "trtaas", "medications"];
function isTrack(s: string | undefined): s is Track {
  return !!s && (VALID_TRACKS as string[]).includes(s);
}

export default function Protocols({ bare, initialTrack }: { bare?: boolean; initialTrack?: Track } = {}) {
  // Allow URL-driven initial track (/protocols/track/peptides etc) or prop
  const [, params] = useRoute<{ track?: string }>("/protocols/track/:track");
  const fromUrl = isTrack(params?.track) ? (params!.track as Track) : undefined;
  const startTrack: Track = fromUrl ?? initialTrack ?? "peptides";

  const [track, setTrack] = useState<Track>(startTrack);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [, setLocation] = useLocation();
  const [quickViewProtocol, setQuickViewProtocol] = useState<Protocol | null>(null);
  const [quickViewMed, setQuickViewMed] = useState<MedProtocol | null>(null);

  // Sync state when URL params change (back/forward nav)
  useEffect(() => {
    if (fromUrl && fromUrl !== track) setTrack(fromUrl);
  }, [fromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset category when switching tracks
  useEffect(() => { setActiveCat("all"); }, [track]);

  // In portal-embed mode (bare=true), switching tracks must not navigate
  // away from /account?s=… to a public route. Use local state only.
  const switchTrack = (t: Track) => {
    setTrack(t);
    if (!bare) setLocation(`/protocols/track/${t}`, { replace: true });
  };

  // ── Build the full unified pool ──
  const allItems = useMemo<Item[]>(() => {
    const peps: Item[] = PROTOCOLS
      .filter(p => (PEPTIDE_CATS as readonly string[]).includes(p.category))
      .map(p => ({ track: "peptides", data: p } as Item));
    const aas: Item[] = PROTOCOLS
      .filter(p => (TRTAAS_CATS as readonly string[]).includes(p.category))
      .map(p => ({ track: "trtaas", data: p } as Item));
    const meds: Item[] = MED_PROTOCOLS.map(m => ({ track: "medications", data: m } as Item));
    return [...peps, ...aas, ...meds];
  }, []);

  const trackCounts = useMemo(() => {
    const c: Record<Track, number> = { peptides: 0, trtaas: 0, medications: 0 };
    for (const it of allItems) c[it.track]++;
    return c;
  }, [allItems]);

  // ── Active-track items ──
  const trackItems = useMemo(
    () => allItems
      .filter(it => it.track === track)
      .sort((a, b) => a.data.name.localeCompare(b.data.name)),
    [allItems, track]
  );

  // ── Cross-track search results (always computed when there's a query) ──
  const q = search.toLowerCase().trim();
  const crossTrackResults = useMemo(() => {
    if (!q) return null;
    const grouped: Record<Track, Item[]> = { peptides: [], trtaas: [], medications: [] };
    for (const it of allItems) {
      if (searchMatches(it, q)) grouped[it.track].push(it);
    }
    for (const t of VALID_TRACKS) {
      grouped[t].sort((a, b) => a.data.name.localeCompare(b.data.name));
    }
    return grouped;
  }, [q, allItems]);

  // ── Filtered for active track view ──
  const filtered = useMemo(() => {
    return trackItems.filter(it => {
      const matchCat = activeCat === "all" || it.data.category === activeCat;
      return matchCat && searchMatches(it, q);
    });
  }, [trackItems, activeCat, q]);

  // ── Track-specific config ──
  const trackMeta = TRACK_META[track];
  const categories =
    track === "peptides" ? PEPTIDE_CATEGORIES :
    track === "trtaas"   ? TRTAAS_CATEGORIES  :
    MED_CATEGORIES;
  const sections =
    track === "peptides" ? PEPTIDE_SECTIONS :
    track === "trtaas"   ? TRTAAS_SECTIONS  :
    MED_SECTIONS;

  const showGrouped = activeCat === "all" && !q;

  const groupedSections = useMemo(() => {
    if (!showGrouped) return null;
    return sections.map(sec => ({
      ...sec,
      items: trackItems.filter(it => sec.cats.includes(it.data.category)),
    })).filter(sec => sec.items.length > 0);
  }, [showGrouped, sections, trackItems]);

  const openItem = (it: Item) => {
    if (it.track === "medications") setQuickViewMed(it.data);
    else setQuickViewProtocol(it.data);
  };
  const fullProfile = (it: Item) => setLocation(TRACK_META[it.track].detailPath(it.data.slug));

  const renderGrid = (items: Item[], showTrackBadge = false) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map(it => (
        <ProtocolCard
          key={`${it.track}-${it.data.slug}`}
          item={it}
          onQuickView={() => openItem(it)}
          onFullProfile={() => fullProfile(it)}
          showTrackBadge={showTrackBadge}
        />
      ))}
    </div>
  );

  // Cross-track search hint: how many in OTHER tracks match?
  const otherTrackHits = useMemo(() => {
    if (!q || !crossTrackResults) return [] as Array<{ track: Track; count: number }>;
    return VALID_TRACKS
      .filter(t => t !== track && crossTrackResults[t].length > 0)
      .map(t => ({ track: t, count: crossTrackResults[t].length }));
  }, [q, crossTrackResults, track]);

  return (
    <PageLayout bare={bare}>
      {quickViewProtocol && (
        <ProtocolQuickView
          protocol={quickViewProtocol}
          onClose={() => setQuickViewProtocol(null)}
          onFullProfile={() => { const p = quickViewProtocol; setQuickViewProtocol(null); setLocation(`/protocols/${p.slug}`); }}
        />
      )}
      {quickViewMed && (
        <MedQuickView
          med={quickViewMed}
          onClose={() => setQuickViewMed(null)}
          onFullProfile={() => { const m = quickViewMed; setQuickViewMed(null); setLocation(`/medications/${m.slug}`); }}
        />
      )}

      <div className="flex flex-col pb-6" style={{ background: "var(--t-bg)", minHeight: "100%" }}>
        <SiteAnnouncements />

        <main className="flex-1 px-4 py-6 max-w-5xl mx-auto w-full space-y-4">

          {/* Header */}
          <div>
            <h1 className="text-[26px] font-bold" style={{ color: "var(--t-text)" }}>Protocols</h1>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--t-muted)" }}>
              {trackMeta.blurb} — {trackCounts[track]} entries
            </p>
          </div>

          {/* Search bar — always cross-track */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--t-subtle)" }} />
            <input
              className="w-full h-10 pl-9 pr-4 rounded-full text-[13px] focus:outline-none transition-all"
              style={{
                background: "var(--t-surface)",
                border: "1px solid var(--t-border)",
                color: "var(--t-text)",
              }}
              placeholder={`Search across all protocols…`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none"
                style={{ color: "var(--t-subtle)" }}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* Track switcher (segmented) */}
          <div
            className="flex gap-1 p-1 rounded-full"
            style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}
            role="tablist"
            aria-label="Protocol track"
          >
            {VALID_TRACKS.map(t => {
              const meta = TRACK_META[t];
              const Icon = meta.icon;
              const active = track === t;
              return (
                <button
                  key={t}
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchTrack(t)}
                  className="flex-1 h-9 px-3 rounded-full text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5"
                  style={{
                    background: active ? meta.accent : "transparent",
                    color: active ? "#fff" : "var(--t-muted)",
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{meta.label}</span>
                  <span className="sm:hidden">{meta.short}</span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: active ? "rgba(255,255,255,0.22)" : "var(--t-tagBg, var(--t-surface))",
                      color: active ? "#fff" : "var(--t-subtle)",
                    }}
                  >
                    {q && crossTrackResults ? crossTrackResults[t].length : trackCounts[t]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Category pills (track-specific) */}
          <div
            className="flex gap-2 overflow-x-auto pb-0.5"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
          >
            {categories.map(cat => {
              const active = activeCat === cat.id;
              const accent = sections.find(s => s.cats.includes(cat.id as never))?.accent ?? trackMeta.accent;
              const isAll = cat.id === "all";
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  className="shrink-0 h-8 px-3.5 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap"
                  style={{
                    background: active ? (isAll ? trackMeta.accent : accent) : "var(--t-surface)",
                    color: active ? "#fff" : "var(--t-muted)",
                    border: `1px solid ${active ? (isAll ? trackMeta.accent : accent) : "var(--t-border)"}`,
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Results */}
          {showGrouped && groupedSections ? (
            <div>
              {groupedSections.map(sec => (
                <div key={sec.id}>
                  <SectionDivider label={sec.label} accent={sec.accent} count={sec.items.length} />
                  {renderGrid(sec.items)}
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <trackMeta.emptyIcon className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm text-slate-400">No matches in {trackMeta.label}</p>
              {otherTrackHits.length > 0 && (
                <p className="text-xs text-slate-400 mt-2">
                  Found in{" "}
                  {otherTrackHits.map((h, i) => (
                    <React.Fragment key={h.track}>
                      {i > 0 && " · "}
                      <button
                        className="font-semibold underline"
                        style={{ color: TRACK_META[h.track].accent }}
                        onClick={() => switchTrack(h.track)}
                      >
                        {TRACK_META[h.track].label} ({h.count})
                      </button>
                    </React.Fragment>
                  ))}
                </p>
              )}
            </div>
          ) : (
            <>
              {renderGrid(filtered, !!q)}
              {q && otherTrackHits.length > 0 && (
                <div
                  className="mt-4 p-3 rounded-xl text-center"
                  style={{ background: "var(--t-surface2)", border: "1px dashed var(--t-border)" }}
                >
                  <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>
                    Also found{" "}
                    {otherTrackHits.map((h, i) => (
                      <React.Fragment key={h.track}>
                        {i > 0 && " · "}
                        <button
                          className="font-semibold underline"
                          style={{ color: TRACK_META[h.track].accent }}
                          onClick={() => switchTrack(h.track)}
                        >
                          {h.count} in {TRACK_META[h.track].label}
                        </button>
                      </React.Fragment>
                    ))}
                  </p>
                </div>
              )}
            </>
          )}

          <p className="text-xs text-center pb-2 leading-relaxed text-slate-400">
            For educational purposes only. Always consult a healthcare professional.
          </p>

        </main>
      </div>
    </PageLayout>
  );
}

// ─── Thin wrappers used by legacy routes ─────────────────────────────────────

export function MedProtocolsRedirect(props: { bare?: boolean }) {
  return <Protocols {...props} initialTrack="medications" />;
}

export function TrtAasRedirect(props: { bare?: boolean }) {
  return <Protocols {...props} initialTrack="trtaas" />;
}
