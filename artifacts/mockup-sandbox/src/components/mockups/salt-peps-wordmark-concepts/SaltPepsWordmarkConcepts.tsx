import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  Clipboard,
  Sparkles,
} from "lucide-react";
import "./_group.css";

type ConceptId =
  | "precision"
  | "clinical"
  | "editorial"
  | "lab"
  | "signal";
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
    id: "precision",
    number: "01",
    name: "Precision Grotesk",
    register: "Geometric sans",
    signal: "Direct, confident, compact",
    detail: "A dense title-case wordmark with optical spacing doing the work.",
  },
  {
    id: "clinical",
    number: "02",
    name: "Soft Clinical",
    register: "Humanist sans",
    signal: "Calm, capable, approachable",
    detail: "Rounded terminals soften the medical category without becoming cute.",
  },
  {
    id: "editorial",
    number: "03",
    name: "Editorial Split",
    register: "Serif and sans",
    signal: "Premium, authored, considered",
    detail: "A controlled contrast gives Salt&Peps a more independent voice.",
  },
  {
    id: "lab",
    number: "04",
    name: "Lab Index",
    register: "Technical mono",
    signal: "Measured, exact, traceable",
    detail: "A specimen-label rhythm built for protocols, packs and data sheets.",
  },
  {
    id: "signal",
    number: "05",
    name: "Signal Link",
    register: "Custom display",
    signal: "Distinctive, connected, ownable",
    detail: "The ampersand becomes the hinge between two balanced word halves.",
  },
];

const PROOF_MODES: Array<{
  id: ProofMode;
  label: string;
  note: string;
}> = [
  { id: "light", label: "Primary", note: "Ink + Brand Blue" },
  { id: "reverse", label: "Reverse", note: "White on Deep Navy" },
  { id: "mono", label: "Mono", note: "One-colour artwork" },
];

const PALETTE = [
  { name: "Ink", value: "#0F1F38" },
  { name: "Navy", value: "#1B3A7A" },
  { name: "Brand Blue", value: "#2D6BCC" },
  { name: "Deep Navy", value: "#1B3164" },
];

function Wordmark({
  concept,
  mode,
  size = "hero",
}: {
  concept: ConceptId;
  mode: ProofMode;
  size?: "hero" | "medium" | "small" | "micro";
}) {
  return (
    <span
      className={`swc-wordmark swc-wordmark--${concept} swc-wordmark--${mode} swc-wordmark--${size}`}
      role="img"
      aria-label="Salt&Peps wordmark"
    >
      <span className="swc-wordmark__salt">Salt</span>
      <span className="swc-wordmark__amp" aria-hidden="true">
        &
      </span>
      <span className="swc-wordmark__peps">Peps</span>
    </span>
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
      className="swc-concept-button"
      data-active={active || undefined}
      type="button"
      role="tab"
      aria-selected={active}
      aria-pressed={active}
      onClick={onSelect}
    >
      <span className="swc-concept-button__number">{item.number}</span>
      <span className="swc-concept-button__body">
        <span className="swc-concept-button__preview">
          <Wordmark concept={item.id} mode="light" size="micro" />
        </span>
        <strong>{item.name}</strong>
        <small>{item.register}</small>
      </span>
      <span className="swc-concept-button__state" aria-hidden="true">
        {active ? <Check /> : <ArrowUpRight />}
      </span>
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
    <article className={`swc-proof-card swc-proof--${mode}`}>
      <div className="swc-proof-card__head">
        <span>{title}</span>
        <small>{subtitle}</small>
      </div>
      <div className="swc-proof-card__art">
        <Wordmark concept={concept} mode={mode} size="medium" />
      </div>
      <div className="swc-proof-card__foot">
        <span>{mode === "light" ? "#F8FAFC" : mode === "reverse" ? "#1B3164" : "#FFFFFF"}</span>
        <span>{mode === "mono" ? "One ink" : "Vector proof"}</span>
      </div>
    </article>
  );
}

function ApplicationStrip({ concept }: { concept: ConceptId }) {
  return (
    <section className="swc-applications" aria-labelledby="swc-applications-title">
      <div className="swc-section-heading">
        <div>
          <span className="swc-eyebrow">Context check</span>
          <h2 id="swc-applications-title">How the lockup behaves in the wild</h2>
        </div>
        <span className="swc-section-note">One geometry, three working surfaces</span>
      </div>

      <div className="swc-application-grid">
        <article className="swc-application-card swc-application-card--header">
          <div className="swc-app-card__bar">
            <span className="swc-app-card__menu" aria-hidden="true"><i /><i /><i /></span>
            <span className="swc-app-card__label">Member dashboard</span>
            <span className="swc-app-card__avatar">AM</span>
          </div>
          <div className="swc-app-card__hero">
            <span className="swc-app-card__caption">Web header / 162px</span>
            <Wordmark concept={concept} mode="light" size="small" />
          </div>
          <div className="swc-app-card__rule" />
          <div className="swc-app-card__rows"><span /><span /><span /></div>
        </article>

        <article className="swc-application-card swc-application-card--label">
          <div className="swc-label-corner">S&amp;P / 2026</div>
          <div className="swc-label-mark"><Wordmark concept={concept} mode="mono" size="small" /></div>
          <div className="swc-label-rule" />
          <div className="swc-label-copy"><span>RESEARCH GRADE</span><strong>Batch 04 / 12</strong><small>Peptide supply / United Kingdom</small></div>
        </article>

        <article className="swc-application-card swc-application-card--scale">
          <div className="swc-scale-head"><span>Minimum digital width</span><strong>120px</strong></div>
          <div className="swc-scale-row">
            <span className="swc-scale-size">120</span>
            <Wordmark concept={concept} mode="light" size="small" />
          </div>
          <div className="swc-scale-row swc-scale-row--reverse">
            <span className="swc-scale-size">32</span>
            <Wordmark concept={concept} mode="reverse" size="micro" />
          </div>
          <div className="swc-scale-row swc-scale-row--mono">
            <span className="swc-scale-size">16</span>
            <span className="swc-scale-fallback">Use monogram fallback after wordmark approval</span>
          </div>
        </article>
      </div>
    </section>
  );
}

export default function SaltPepsWordmarkConcepts() {
  const [selectedConcept, setSelectedConcept] = useState<ConceptId>("precision");
  const [proofMode, setProofMode] = useState<ProofMode>("light");
  const [copied, setCopied] = useState(false);
  const selected = CONCEPTS.find((concept) => concept.id === selectedConcept) ?? CONCEPTS[0];

  const copySpecimen = async () => {
    try {
      await navigator.clipboard?.writeText("Salt&Peps");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="swc-shell" data-concept={selectedConcept} data-mode={proofMode}>
      <header className="swc-header">
        <div className="swc-header__topline">
          <span>Salt&amp;Peps / identity lab</span>
          <span>Five wordmark directions / 01 Aug 2026</span>
        </div>
        <div className="swc-header__main">
          <div>
            <span className="swc-eyebrow">Wordmark studies</span>
            <h1>One name. Five ways to make it unmistakable.</h1>
            <p>Same title case, same palette, different typographic point of view.</p>
          </div>
          <div className="swc-header__selected" role="status" aria-live="polite">
            <span className="swc-selected-dot" />
            <div><small>Current direction</small><strong>{selected.name}</strong></div>
            <Sparkles aria-hidden="true" />
          </div>
        </div>
        <div className="swc-header__footer">
          <div className="swc-palette" aria-label="Salt&Peps brand palette">
            {PALETTE.map((swatch) => <span key={swatch.name} title={`${swatch.name} ${swatch.value}`} style={{ backgroundColor: swatch.value }} />)}
          </div>
          <span className="swc-header__constraint">No icon / no gradient / outlined vector handoff</span>
        </div>
      </header>

      <div className="swc-layout">
        <aside className="swc-sidebar">
          <div className="swc-sidebar__heading">
            <span className="swc-eyebrow">Select a direction</span>
            <span className="swc-sidebar__count">05</span>
          </div>
          <div className="swc-concept-picker" role="tablist" aria-label="Choose wordmark concept">
            {CONCEPTS.map((item) => (
              <ConceptButton
                key={item.id}
                item={item}
                active={selectedConcept === item.id}
                onSelect={() => setSelectedConcept(item.id)}
              />
            ))}
          </div>
          <div className="swc-sidebar__note">
            <span className="swc-note-mark">01</span>
            <p>{selected.detail}</p>
            <span className="swc-note-signal">Signals / {selected.signal}</span>
          </div>
          <div className="swc-sidebar__link swc-sidebar__link--static">
            <span>Production asset stays unchanged</span>
            <Check aria-hidden="true" />
          </div>
        </aside>

        <section className="swc-stage" aria-labelledby="swc-stage-title">
          <div className="swc-stage__toolbar">
            <div>
              <span className="swc-eyebrow">Selected direction / {selected.number}</span>
              <h2 id="swc-stage-title">{selected.name}</h2>
            </div>
            <div className="swc-mode-picker" role="tablist" aria-label="Proof mode">
              {PROOF_MODES.map((mode) => (
                <button
                  key={mode.id}
                  className="swc-mode-button"
                  data-active={proofMode === mode.id || undefined}
                  type="button"
                  role="tab"
                  aria-selected={proofMode === mode.id}
                  aria-pressed={proofMode === mode.id}
                  onClick={() => setProofMode(mode.id)}
                >
                  <span>{mode.label}</span>
                  <small>{mode.note}</small>
                </button>
              ))}
            </div>
          </div>

          <article className={`swc-hero-proof swc-proof--${proofMode}`}>
            <div className="swc-hero-proof__meta"><span>Primary lockup</span><span>Salt&amp;Peps / title case</span></div>
            <div className="swc-hero-proof__art"><Wordmark concept={selectedConcept} mode={proofMode} size="hero" /></div>
            <div className="swc-hero-proof__footer">
              <span>Optical study / {selected.register}</span>
              <button type="button" className="swc-copy-button" onClick={() => void copySpecimen()}>
                <Clipboard aria-hidden="true" />
                {copied ? "Copied" : "Copy specimen"}
              </button>
            </div>
          </article>

          <div className="swc-proof-grid" aria-label="Wordmark proof contexts">
            <ProofCard concept={selectedConcept} mode="light" title="Primary" subtitle="Light surface" />
            <ProofCard concept={selectedConcept} mode="reverse" title="Reverse" subtitle="Deep Navy field" />
            <ProofCard concept={selectedConcept} mode="mono" title="Mono" subtitle="One-colour print" />
          </div>

          <ApplicationStrip concept={selectedConcept} />
        </section>
      </div>
    </main>
  );
}
