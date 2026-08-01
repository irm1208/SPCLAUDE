import { useState } from "react";
import {
  Check,
  Clipboard,
  Focus,
  Layers3,
  Ruler,
  Sparkles,
} from "lucide-react";
import "./_group.css";

type ConceptId = "interlock" | "peptide" | "aperture" | "signal" | "orbit";
type ProofMode = "light" | "reverse" | "mono";

const CONCEPTS: Array<{
  id: ConceptId;
  number: string;
  name: string;
  register: string;
  signal: string;
  detail: string;
}> = [
  {
    id: "interlock",
    number: "01",
    name: "S&P Interlock",
    register: "Letterform monogram",
    signal: "Clear initials, fastest recall",
    detail: "A custom S and P pair joined by the ampersand's crossbar.",
  },
  {
    id: "peptide",
    number: "02",
    name: "Peptide Loop",
    register: "Reduced bond gesture",
    signal: "Scientific, ownable, familiar",
    detail: "The current folded silhouette reduced to one loop and two nodes.",
  },
  {
    id: "aperture",
    number: "03",
    name: "Bond Aperture",
    register: "Negative-space mark",
    signal: "Distinctive, quiet, scalable",
    detail: "An ampersand-led counterform that lets the initials emerge from the void.",
  },
  {
    id: "signal",
    number: "04",
    name: "Signal Tile",
    register: "Contained monogram",
    signal: "Crisp, social, app-ready",
    detail: "A compact reversed mark with one blue signal node for browser chrome.",
  },
  {
    id: "orbit",
    number: "05",
    name: "Orbit Pair",
    register: "Open connector",
    signal: "Balanced, generous, memorable",
    detail: "Two letterform arcs orbit a central connector for larger icon use.",
  },
];

const PROOF_MODES: Array<{ id: ProofMode; label: string; note: string }> = [
  { id: "light", label: "Primary", note: "Navy + Brand Blue" },
  { id: "reverse", label: "Reverse", note: "White on Deep Navy" },
  { id: "mono", label: "Mono", note: "One-colour artwork" },
];

const PALETTE = [
  { name: "Ink", value: "#0F1F38" },
  { name: "Navy", value: "#1B3A7A" },
  { name: "Brand Blue", value: "#2D6BCC" },
  { name: "Deep Navy", value: "#1B3164" },
];

const COLORS = {
  light: { line: "#1B3A7A", accent: "#2D6BCC", tile: "#1B3164", cut: "#F8FAFC" },
  reverse: { line: "#FFFFFF", accent: "#FFFFFF", tile: "#0F1F38", cut: "#1B3164" },
  mono: { line: "#0F1F38", accent: "#0F1F38", tile: "#0F1F38", cut: "#FFFFFF" },
} as const;

function MarkArtwork({ concept, mode }: { concept: ConceptId; mode: ProofMode }) {
  const colors = COLORS[mode];

  if (concept === "interlock") {
    return (
      <g className="spic-artwork spic-artwork--interlock">
        <path d="M25 12C16 10 9 15 9 22c0 7 5 9 14 12 8 3 13 5 13 11 0 6-6 9-13 9-7 0-12-3-16-8" fill="none" stroke={colors.line} strokeLinecap="round" strokeLinejoin="round" strokeWidth="6" />
        <path d="M35 53V11h11c8 0 13 4 13 11s-5 11-13 11H35m8 0 14 20" fill="none" stroke={colors.line} strokeLinecap="round" strokeLinejoin="round" strokeWidth="6" />
        <path d="M27 33h12" stroke={colors.accent} strokeLinecap="round" strokeWidth="4" />
        <circle cx="39" cy="33" r="3" fill={colors.accent} />
      </g>
    );
  }

  if (concept === "peptide") {
    return (
      <g className="spic-artwork spic-artwork--peptide">
        <path d="M51 18C44 9 31 7 22 12c-8 5-9 14-3 21 4 4 10 6 16 9 8 4 10 9 5 14-5 6-16 6-24-1" fill="none" stroke={colors.line} strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" />
        <path d="M45 20 56 13M20 45 8 49" fill="none" stroke={colors.line} strokeLinecap="round" strokeWidth="3" />
        <path d="M56 9.5 60.5 14 56 18.5 51.5 14ZM7 44.5 11.5 49 7 53.5 2.5 49Z" fill={colors.accent} />
      </g>
    );
  }

  if (concept === "aperture") {
    return (
      <g className="spic-artwork spic-artwork--aperture">
        <path d="M45 14C38 8 27 9 22 16c-5 7-1 13 7 18 8 5 13 9 9 15-4 6-15 6-22-1" fill="none" stroke={colors.line} strokeLinecap="round" strokeLinejoin="round" strokeWidth="9" />
        <path d="M16 33h31" stroke={colors.accent} strokeLinecap="round" strokeWidth="4" />
        <circle cx="16" cy="33" r="4" fill={colors.accent} />
        <circle cx="47" cy="33" r="4" fill={colors.accent} />
        <path d="M32 26v14" stroke={colors.cut} strokeLinecap="round" strokeWidth="3" />
      </g>
    );
  }

  if (concept === "signal") {
    const tile = mode === "mono" ? colors.line : colors.tile;
    const mark = mode === "mono" ? colors.cut : colors.line;
    return (
      <g className="spic-artwork spic-artwork--signal">
        <rect x="5" y="5" width="54" height="54" rx="15" fill={tile} />
        <path d="M27 18c-7-5-16-1-16 6 0 6 5 8 12 10 8 2 13 5 13 11 0 7-7 11-15 9-5-1-9-4-11-8M37 46V18h8c6 0 10 3 10 8s-4 8-10 8h-8m6 0 10 12" fill="none" stroke={mark} strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
        <circle cx="50" cy="14" r="4" fill={mode === "mono" ? colors.cut : colors.accent} />
      </g>
    );
  }

  return (
    <g className="spic-artwork spic-artwork--orbit">
      <path d="M28 12C18 12 11 19 11 29s7 17 17 17" fill="none" stroke={colors.line} strokeLinecap="round" strokeWidth="7" />
      <path d="M36 12c10 0 17 7 17 17s-7 17-17 17" fill="none" stroke={colors.line} strokeLinecap="round" strokeWidth="7" />
      <path d="M25 32h14" stroke={colors.accent} strokeLinecap="round" strokeWidth="4" />
      <circle cx="25" cy="32" r="3" fill={colors.accent} />
      <circle cx="39" cy="32" r="3" fill={colors.accent} />
      <path d="M27 51h10" stroke={colors.line} strokeLinecap="round" strokeWidth="5" />
    </g>
  );
}

function IconMark({
  concept,
  mode,
  size = 64,
  decorative = false,
}: {
  concept: ConceptId;
  mode: ProofMode;
  size?: number;
  decorative?: boolean;
}) {
  const label = CONCEPTS.find((item) => item.id === concept)?.name ?? "icon";
  return (
    <svg
      className={`spic-mark spic-concept--${concept} spic-mark--${mode}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : `Salt&Peps ${label} icon`}
    >
      {!decorative ? <title>{`Salt&Peps ${label} icon`}</title> : null}
      <MarkArtwork concept={concept} mode={mode} />
    </svg>
  );
}

function ConceptButton({
  item,
  active,
  onSelect,
}: {
  item: (typeof CONCEPTS)[number];
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className="spic-concept-button"
      data-active={active || undefined}
      type="button"
      role="tab"
      aria-selected={active}
      aria-pressed={active}
      onClick={onSelect}
    >
      <span className="spic-concept-button__number">{item.number}</span>
      <span className="spic-concept-button__body">
        <span className="spic-concept-button__preview"><IconMark concept={item.id} mode="light" size={30} decorative /></span>
        <strong>{item.name}</strong>
        <small>{item.register}</small>
      </span>
      <span className="spic-concept-button__state" aria-hidden="true">{active ? <Check /> : <Focus />}</span>
    </button>
  );
}

function ProofCard({
  concept,
  mode,
  title,
  subtitle,
}: {
  concept: ConceptId;
  mode: ProofMode;
  title: string;
  subtitle: string;
}) {
  return (
    <article className={`spic-proof-card spic-proof--${mode}`}>
      <div className="spic-proof-card__head"><span>{title}</span><small>{subtitle}</small></div>
      <div className="spic-proof-card__art"><IconMark concept={concept} mode={mode} size={74} /></div>
      <div className="spic-proof-card__foot"><span>{mode === "light" ? "#F8FAFC" : mode === "reverse" ? "#1B3164" : "#FFFFFF"}</span><span>{mode === "mono" ? "One ink" : "64-unit SVG"}</span></div>
    </article>
  );
}

function SizeLadder({ concept, mode }: { concept: ConceptId; mode: ProofMode }) {
  return (
    <section className="spic-size-card" aria-labelledby="spic-size-title">
      <div className="spic-section-heading"><div><span className="spic-eyebrow">Small-size check</span><h2 id="spic-size-title">One silhouette, five tests</h2></div><Ruler aria-hidden="true" /></div>
      <div className="spic-size-ladder">
        <div className="spic-size-sample"><span>16</span><IconMark concept={concept} mode={mode} size={16} /><small>favicon</small></div>
        <div className="spic-size-sample"><span>24</span><IconMark concept={concept} mode={mode} size={24} /><small>nav</small></div>
        <div className="spic-size-sample"><span>32</span><IconMark concept={concept} mode={mode} size={32} /><small>app</small></div>
        <div className="spic-size-sample"><span>48</span><IconMark concept={concept} mode={mode} size={48} /><small>avatar</small></div>
        <div className="spic-size-sample"><span>64</span><IconMark concept={concept} mode={mode} size={64} /><small>mark</small></div>
      </div>
    </section>
  );
}

function ApplicationStrip({ concept }: { concept: ConceptId }) {
  return (
    <section className="spic-applications" aria-labelledby="spic-applications-title">
      <div className="spic-section-heading"><div><span className="spic-eyebrow">Context check</span><h2 id="spic-applications-title">Where the icon has to hold up</h2></div><span className="spic-section-note">No production asset changes yet</span></div>
      <div className="spic-application-grid">
        <article className="spic-application-card spic-application-card--browser">
          <div className="spic-browser-tabs"><span className="spic-browser-dot" /><span className="spic-browser-tab"><IconMark concept={concept} mode="light" size={14} decorative />Salt&amp;Peps</span><span className="spic-browser-plus">+</span></div>
          <div className="spic-browser-body"><span>Browser favicon / 16px</span><strong>Member dashboard</strong><small>Exact silhouette, quiet surface, no wordmark.</small></div>
        </article>
        <article className="spic-application-card spic-application-card--app"><div className="spic-app-icon"><IconMark concept={concept} mode="reverse" size={58} /></div><div><span>App tile / 48px</span><strong>Salt&amp;Peps</strong><small>Reverse artwork with protected clearspace.</small></div></article>
        <article className="spic-application-card spic-application-card--social"><div className="spic-social-avatar"><IconMark concept={concept} mode="reverse" size={72} /></div><div><span>Social avatar / 180px</span><strong>One mark, one memory</strong><small>Works without the horizontal lockup.</small></div></article>
      </div>
    </section>
  );
}

export default function SaltPepsIconConcepts() {
  const [selectedConcept, setSelectedConcept] = useState<ConceptId>("interlock");
  const [proofMode, setProofMode] = useState<ProofMode>("light");
  const [copied, setCopied] = useState(false);
  const selected = CONCEPTS.find((concept) => concept.id === selectedConcept) ?? CONCEPTS[0];

  const copyConceptName = async () => {
    try {
      await navigator.clipboard?.writeText(`Salt&Peps / ${selected.name}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="spic-shell" data-concept={selectedConcept} data-mode={proofMode}>
      <header className="spic-header">
        <div className="spic-header__topline"><span>Salt&amp;Peps / identity lab</span><span>Favicon + icon studies / 01 Aug 2026</span></div>
        <div className="spic-header__main"><div><span className="spic-eyebrow">Small-size mark exploration</span><h1>Five ways for Salt&amp;Peps to be remembered in a square.</h1><p>Same brand DNA, five silhouettes tuned for browser chrome, app tiles, and avatars.</p></div><div className="spic-header__selected" role="status" aria-live="polite"><span className="spic-selected-dot" /><div><small>Current direction</small><strong>{selected.name}</strong></div><Sparkles aria-hidden="true" /></div></div>
        <div className="spic-header__footer"><div className="spic-palette" aria-label="Salt&Peps brand palette">{PALETTE.map((swatch) => <span key={swatch.name} title={`${swatch.name} ${swatch.value}`} style={{ backgroundColor: swatch.value }} />)}</div><span className="spic-header__constraint">64-unit grid / reverse / mono / 16px proof</span></div>
      </header>

      <div className="spic-layout">
        <aside className="spic-sidebar">
          <div className="spic-sidebar__heading"><span className="spic-eyebrow">Select a direction</span><span className="spic-sidebar__count">05</span></div>
          <div className="spic-concept-picker" role="tablist" aria-label="Choose icon concept">{CONCEPTS.map((item) => <ConceptButton key={item.id} item={item} active={selectedConcept === item.id} onSelect={() => setSelectedConcept(item.id)} />)}</div>
          <div className="spic-sidebar__note"><span className="spic-note-mark">{selected.number}</span><p>{selected.detail}</p><span className="spic-note-signal">Signals / {selected.signal}</span></div>
          <div className="spic-sidebar__handoff"><Layers3 aria-hidden="true" /><span>Production favicon and icon stay unchanged until a direction is selected.</span></div>
        </aside>

        <section className="spic-stage" aria-labelledby="spic-stage-title">
          <div className="spic-stage__toolbar"><div><span className="spic-eyebrow">Selected direction / {selected.number}</span><h2 id="spic-stage-title">{selected.name}</h2></div><div className="spic-mode-picker" role="tablist" aria-label="Proof mode">{PROOF_MODES.map((mode) => <button key={mode.id} className="spic-mode-button" data-active={proofMode === mode.id || undefined} type="button" role="tab" aria-selected={proofMode === mode.id} aria-pressed={proofMode === mode.id} onClick={() => setProofMode(mode.id)}><span>{mode.label}</span><small>{mode.note}</small></button>)}</div></div>

          <article className={`spic-hero-proof spic-proof--${proofMode}`}>
            <div className="spic-hero-proof__meta"><span>Icon-only mark</span><span>Salt&amp;Peps / {selected.register}</span></div>
            <div className="spic-hero-proof__art"><IconMark concept={selectedConcept} mode={proofMode} size={156} /></div>
            <div className="spic-hero-proof__footer"><span>SVG concept / 64-unit viewBox</span><button type="button" className="spic-copy-button" onClick={() => void copyConceptName()}><Clipboard aria-hidden="true" />{copied ? "Copied" : "Copy concept name"}</button></div>
          </article>

          <div className="spic-proof-grid" aria-label="Icon proof contexts"><ProofCard concept={selectedConcept} mode="light" title="Primary" subtitle="Light surface" /><ProofCard concept={selectedConcept} mode="reverse" title="Reverse" subtitle="Deep Navy field" /><ProofCard concept={selectedConcept} mode="mono" title="Mono" subtitle="One-colour print" /></div>
          <SizeLadder concept={selectedConcept} mode={proofMode} />
          <ApplicationStrip concept={selectedConcept} />
        </section>
      </div>
    </main>
  );
}
