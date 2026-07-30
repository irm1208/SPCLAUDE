import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Volume2, VolumeX, X } from "lucide-react";
import TourPreview from "./TourPreviews";
import {
  TOUR_CHAPTERS,
  TOUR_EVENT_ACTIVE_TAB,
  TOUR_EVENT_WIZARD_STEP,
  TOUR_EVENT_WORKSPACE_TAB,
  TOUR_PROGRESS_KEY,
  TOUR_SEEN_KEY,
  availableTourSteps,
  type TourStep,
} from "./tour-script";
import "./tour.css";

// ─── Guided tour engine ──────────────────────────────────────────────────────
// Renders a spotlight overlay driven by tour-script.ts. The tour never owns
// the organiser UI: it requests mode changes through props and drives the
// wizard/workspace through the ov2:tour-* window events they listen for.

const AUDIO_BASE = "/tour-audio";
const MUTED_KEY = "v2:tourMuted";
/** Playback boost on top of the generator's baked-in pace — instant, no
 *  regeneration needed; browsers pitch-correct so it doesn't chipmunk. */
const NARRATION_RATE = 1.15;
const SPOTLIGHT_PADDING = 10;
const CARD_WIDTH = 380;
const CARD_GAP = 16;

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function measureTarget(selector: string | null): SpotlightRect | null {
  if (!selector) return null;
  const element = document.querySelector(selector);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return {
    top: rect.top - SPOTLIGHT_PADDING,
    left: rect.left - SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
  };
}

function speakFallback(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const british = voices.find(voice => voice.lang === "en-GB" && /sonia|female/i.test(voice.name))
    ?? voices.find(voice => voice.lang === "en-GB");
  if (british) utterance.voice = british;
  utterance.rate = NARRATION_RATE;
  window.speechSynthesis.speak(utterance);
}

function stopAllNarration(audioRef: { current: HTMLAudioElement | null }) {
  audioRef.current?.pause();
  audioRef.current = null;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

export default function GuidedTour({
  mode,
  workspaceAvailable,
  onRequestMode,
  onClose,
}: {
  mode: "setup" | "workspace";
  workspaceAvailable: boolean;
  onRequestMode: (mode: "setup" | "workspace") => void;
  onClose: () => void;
}) {
  const steps = useMemo(() => availableTourSteps(workspaceAvailable), [workspaceAvailable]);
  const [index, setIndex] = useState(() => {
    const stored = Number(localStorage.getItem(TOUR_PROGRESS_KEY));
    return Number.isInteger(stored) && stored > 0 && stored < steps.length ? stored : 0;
  });
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTED_KEY) === "true");
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [showTakeover, setShowTakeover] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  // Mirrors cardStyle.placement for the keepVisible loop, which runs in an
  // effect that must not re-subscribe on every placement change.
  const placementRef = useRef<string | null>(null);
  // Step id that has committed to the docked layout (see cardStyle).
  const dockLatchRef = useRef<string | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const step: TourStep = steps[Math.min(index, steps.length - 1)];
  const isLast = index === steps.length - 1;
  const waiting = Boolean(step.waitForTab || step.waitForInput || step.waitForCheck);

  const finish = useCallback(() => {
    stopAllNarration(audioRef);
    localStorage.setItem(TOUR_SEEN_KEY, "true");
    localStorage.removeItem(TOUR_PROGRESS_KEY);
    onClose();
  }, [onClose]);

  const goTo = useCallback((next: number) => {
    if (next < 0) return;
    if (next >= steps.length) {
      finish();
      return;
    }
    localStorage.setItem(TOUR_PROGRESS_KEY, String(next));
    setShowTakeover(false);
    setIndex(next);
  }, [steps.length, finish]);

  // Put the organiser UI in the state this step describes.
  useEffect(() => {
    if (step.mode !== "any" && step.mode !== mode) onRequestMode(step.mode);
    if (step.wizardStep !== undefined) {
      window.dispatchEvent(new CustomEvent(TOUR_EVENT_WIZARD_STEP, { detail: step.wizardStep }));
    }
    if (step.workspaceTab) {
      window.dispatchEvent(new CustomEvent(TOUR_EVENT_WORKSPACE_TAB, { detail: step.workspaceTab }));
    }
  }, [step, mode, onRequestMode]);

  // "Your turn" steps advance when the user opens the requested tab; a
  // fallback "Do it for me" appears after ten seconds.
  useEffect(() => {
    if (!step.waitForTab) return;
    const handler = (event: Event) => {
      if ((event as CustomEvent).detail === step.waitForTab) goTo(index + 1);
    };
    window.addEventListener(TOUR_EVENT_ACTIVE_TAB, handler);
    const timer = window.setTimeout(() => setShowTakeover(true), 10_000);
    return () => {
      window.removeEventListener(TOUR_EVENT_ACTIVE_TAB, handler);
      window.clearTimeout(timer);
    };
  }, [step, index, goTo]);

  // Fill-it-in steps: advance shortly after the user has typed enough into
  // the highlighted field, so they learn by doing rather than watching.
  useEffect(() => {
    if (!step.waitForInput) return;
    const { selector, minLength = 3 } = step.waitForInput;
    let debounce: number | undefined;
    const handler = (event: Event) => {
      const field = event.target as HTMLInputElement | null;
      if (!field?.matches?.(selector)) return;
      window.clearTimeout(debounce);
      if ((field.value ?? "").trim().length >= minLength) {
        debounce = window.setTimeout(() => goTo(index + 1), 1_400);
      }
    };
    document.addEventListener("input", handler, true);
    const timer = window.setTimeout(() => setShowTakeover(true), 15_000);
    return () => {
      document.removeEventListener("input", handler, true);
      window.clearTimeout(debounce);
      window.clearTimeout(timer);
    };
  }, [step, index, goTo]);

  // Toggle steps: advance once the user ticks any matching checkbox.
  useEffect(() => {
    if (!step.waitForCheck) return;
    const { selector } = step.waitForCheck;
    let debounce: number | undefined;
    const handler = (event: Event) => {
      const box = event.target as HTMLInputElement | null;
      if (!box?.matches?.(selector) || !box.checked) return;
      debounce = window.setTimeout(() => goTo(index + 1), 900);
    };
    document.addEventListener("change", handler, true);
    const timer = window.setTimeout(() => setShowTakeover(true), 15_000);
    return () => {
      document.removeEventListener("change", handler, true);
      window.clearTimeout(debounce);
      window.clearTimeout(timer);
    };
  }, [step, index, goTo]);

  // Track the spotlight target through renders, scrolling, and resizes.
  // Keeps the target comfortably inside the viewport for the whole step —
  // if the wizard re-renders and pushes it off-screen (or it was measured
  // before layout settled), we scroll again rather than only once. The
  // docked card reserves the strip it covers, so content scrolls up above
  // it instead of hiding underneath. Targets taller than the viewport pin
  // to the top once and stay put — endlessly re-centring something that can
  // never fit is what made the page feel laggy.
  useEffect(() => {
    let lastScrollAt = 0;
    let focused = false;
    let scrolledOnce = false;
    const keepVisible = () => {
      if (!step.target) return;
      const element = document.querySelector(step.target);
      if (!element) return;
      const bounds = element.getBoundingClientRect();
      // Phones force the card into a bottom sheet regardless of computed
      // placement, so the reserved strip applies there too.
      const bottomSheet = placementRef.current === "dock" || window.innerWidth <= 767;
      const cardBounds = bottomSheet ? cardRef.current?.getBoundingClientRect() : undefined;
      const bottomLimit = cardBounds ? Math.min(window.innerHeight - 140, cardBounds.top - 12) : window.innerHeight - 140;
      const tall = bounds.height > bottomLimit - 90;
      const outOfView = tall
        ? bounds.top > 110 || bounds.top < -60
        : bounds.top < 80 || bounds.bottom > bottomLimit;
      const now = performance.now();
      // Every step scrolls its target into position as soon as it exists —
      // then the loop only re-scrolls if something pushes it back out.
      if ((!scrolledOnce || outOfView) && now - lastScrollAt > 900) {
        scrolledOnce = true;
        lastScrollAt = now;
        // Docked card: centring would land the target underneath it, so pin
        // the target near the top of the viewport instead — scroll-margin
        // keeps it clear of the topbar.
        const pinToTop = tall || bottomSheet;
        (element as HTMLElement).style.scrollMarginTop = "96px";
        element.scrollIntoView({ behavior: "smooth", block: pinToTop ? "start" : "center" });
      }
      if (!focused && step.waitForInput && !outOfView) {
        focused = true;
        (element as HTMLElement).focus?.({ preventScroll: true });
      }
    };
    // Only push a new rect into state when the target actually moved —
    // otherwise the 250ms poll re-renders the card four times a second.
    const remeasure = () => {
      setRect(previous => {
        const next = measureTarget(step.target);
        if (!previous || !next) return next;
        const same = Math.abs(previous.top - next.top) < 1
          && Math.abs(previous.left - next.left) < 1
          && Math.abs(previous.width - next.width) < 1
          && Math.abs(previous.height - next.height) < 1;
        return same ? previous : next;
      });
    };
    keepVisible();
    remeasure();
    const update = () => {
      keepVisible();
      remeasure();
    };
    const interval = window.setInterval(update, 250);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [step]);

  // Narration: pre-generated clips, speech synthesis as fallback. Pace comes
  // from the generator's speed setting; no playback-rate boost on top.
  useEffect(() => {
    stopAllNarration(audioRef);
    if (muted) return;
    const audio = new Audio(`${AUDIO_BASE}/${step.id}.mp3`);
    audio.playbackRate = NARRATION_RATE;
    audioRef.current = audio;
    audio.play().catch(() => {
      if (audioRef.current === audio) speakFallback(step.text);
    });
    return () => stopAllNarration(audioRef);
  }, [step, muted]);

  const toggleMuted = () => {
    setMuted(value => {
      const next = !value;
      localStorage.setItem(MUTED_KEY, String(next));
      if (next) stopAllNarration(audioRef);
      return next;
    });
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
      if (waiting) return;
      if (event.key === "ArrowRight") goTo(index + 1);
      if (event.key === "ArrowLeft") goTo(index - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [index, waiting, goTo, finish]);

  // Caption card placement, coach-mark style. Prefer sitting beside the
  // target (vertically centred on it), then below/above. When the target is
  // huge — a full form panel — dock as a slim bar along the bottom instead
  // of floating over content. The card must never cover the spotlight.
  // The "what members see" preview is NOT part of the card: it floats in a
  // free corner (see previewStyle) so the card stays small.
  const cardWidth = CARD_WIDTH;
  const cardStyle = useMemo(() => {
    if (!rect) return undefined;
    const cardHeight = cardRef.current?.offsetHeight ?? 300;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceBelow = vh - (rect.top + rect.height);
    const spaceAbove = rect.top;
    const spaceRight = vw - (rect.left + rect.width);
    const spaceLeft = rect.left;
    const needV = cardHeight + CARD_GAP * 2;
    const minSide = 320 + CARD_GAP * 2;
    const huge = rect.width > vw * 0.62 && rect.height > vh * 0.7;

    let placement: "below" | "above" | "right" | "left" | "dock";
    if (huge) placement = "dock";
    else if (spaceRight >= minSide || spaceLeft >= minSide) placement = spaceRight >= spaceLeft ? "right" : "left";
    else if (spaceBelow >= needV) placement = "below";
    else if (spaceAbove >= needV) placement = "above";
    else placement = "dock";
    // Once a step docks, it stays docked: the docked layout is shorter, so
    // without the latch the placement would flip back and forth every
    // measurement (shorter card fits below → undock → taller → dock → …).
    if (dockLatchRef.current === step.id) placement = "dock";

    let width = cardWidth;
    let top: number;
    let left: number;
    if (placement === "right" || placement === "left") {
      width = Math.min(cardWidth, (placement === "right" ? spaceRight : spaceLeft) - CARD_GAP * 2);
      left = placement === "right"
        ? rect.left + rect.width + CARD_GAP
        : Math.max(CARD_GAP, rect.left - width - CARD_GAP);
      top = Math.min(
        Math.max(CARD_GAP, rect.top + rect.height / 2 - cardHeight / 2),
        Math.max(CARD_GAP, vh - cardHeight - CARD_GAP),
      );
    } else if (placement === "below" || placement === "above") {
      top = placement === "below"
        ? rect.top + rect.height + CARD_GAP
        : Math.max(CARD_GAP, rect.top - cardHeight - CARD_GAP);
      left = Math.min(Math.max(CARD_GAP, rect.left + rect.width / 2 - width / 2), vw - width - CARD_GAP);
    } else {
      // Slim bottom dock, like subtitles — covers the least useful strip of
      // screen when the whole panel is what's being shown.
      dockLatchRef.current = step.id;
      width = Math.min(640, vw - CARD_GAP * 2);
      left = (vw - width) / 2;
      top = Math.max(CARD_GAP, vh - cardHeight - CARD_GAP);
    }
    return { style: { top, left, width }, placement, cardHeight, width };
  }, [rect, cardWidth, step.id]);

  useEffect(() => {
    placementRef.current = cardStyle?.placement ?? null;
  }, [cardStyle]);

  // Floating "what members see" panel. Everything outside the spotlight is
  // dimmed, so the preview can sit over dimmed content — it only has to
  // avoid the spotlight itself and the caption card. Try each corner and
  // take the first that collides with neither.
  const previewStyle = useMemo(() => {
    if (!step.preview) return undefined;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(380, vw - 32);
    const height = previewRef.current?.offsetHeight ?? 320;
    const card = cardStyle
      ? { top: cardStyle.style.top, left: cardStyle.style.left, width: cardStyle.width, height: cardStyle.cardHeight }
      : { top: vh / 2 - 200, left: vw / 2 - 220, width: 440, height: 400 };
    const clear = (top: number, left: number) => {
      const margin = 12;
      const hits = (other: { top: number; left: number; width: number; height: number } | null) =>
        other !== null
        && left < other.left + other.width + margin
        && left + width > other.left - margin
        && top < other.top + other.height + margin
        && top + height > other.top - margin;
      return !hits(rect) && !hits(card);
    };
    const corners = [
      { top: 84, left: vw - width - 16 },
      { top: 84, left: 16 },
      { top: vh - height - 16, left: vw - width - 16 },
      { top: vh - height - 16, left: 16 },
    ];
    const spot = corners.find(corner => clear(corner.top, corner.left)) ?? corners[0];
    return { top: spot.top, left: spot.left, width };
  }, [rect, cardStyle, step.preview]);

  // Directional arrow sitting on the spotlight edge nearest the card,
  // pointing into the highlighted element. Hidden in docked mode — when the
  // whole panel is spotlit there is nothing specific to point at.
  const arrowStyle = useMemo(() => {
    if (!rect || !cardStyle || cardStyle.placement === "dock") return undefined;
    const { placement, style, cardHeight, width } = cardStyle;
    const cardCenterX = style.left + width / 2;
    const cardCenterY = style.top + cardHeight / 2;
    const alongX = Math.min(Math.max(cardCenterX, rect.left + 28), rect.left + rect.width - 28);
    const alongY = Math.min(Math.max(cardCenterY, rect.top + 28), rect.top + rect.height - 28);
    let x: number;
    let y: number;
    let deg: number;
    switch (placement) {
      case "below": x = alongX; y = rect.top + rect.height + 4; deg = -90; break;
      case "above": x = alongX; y = rect.top - 4; deg = 90; break;
      case "right": x = rect.left + rect.width + 4; y = alongY; deg = 180; break;
      default: x = rect.left - 4; y = alongY; deg = 0; break;
    }
    return { top: y, left: x, "--arrow-rot": `${deg}deg` } as React.CSSProperties;
  }, [rect, cardStyle]);

  const chapterSteps = steps.filter(item => item.chapter === step.chapter);
  const chapterIndex = chapterSteps.indexOf(step);

  return (
    <div className="ov2-tour-layer" role="presentation">
      {rect ? (
        <div
          className={waiting ? "ov2-tour-spotlight is-waiting" : "ov2-tour-spotlight"}
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        />
      ) : (
        <div className="ov2-tour-scrim" />
      )}

      {rect && arrowStyle ? (
        <svg className="ov2-tour-arrow" style={arrowStyle} viewBox="0 0 48 24" aria-hidden="true">
          <path d="M2 12 H36" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="6 5" />
          <path d="M32 4 L46 12 L32 20 Z" fill="currentColor" />
        </svg>
      ) : null}

      {step.preview ? (
        <aside key={`preview-${step.id}`} ref={previewRef} className="ov2-tour-float-preview" style={previewStyle}>
          <TourPreview kind={step.preview} />
        </aside>
      ) : null}

      <section
        key={step.id}
        ref={cardRef}
        className={[
          "ov2-tour-card",
          !cardStyle && "is-centred",
          cardStyle?.placement === "dock" && "is-docked",
        ].filter(Boolean).join(" ")}
        style={cardStyle?.style}
        role="dialog"
        aria-modal="false"
        aria-label={`Tour: ${step.caption}`}
      >
        <header className="ov2-tour-card-header">
          <div className="ov2-tour-card-heading">
            <span className="ov2-tour-step-badge">{index + 1}</span>
            <div>
              <span className="ov2-tour-chapter">
                {TOUR_CHAPTERS[step.chapter]} · {chapterIndex + 1} of {chapterSteps.length}
              </span>
              <h2>{step.caption}</h2>
            </div>
          </div>
          <div className="ov2-tour-header-actions">
            <button
              type="button"
              className="ov2-icon-button"
              onClick={toggleMuted}
              aria-label={muted ? "Unmute narration" : "Mute narration"}
            >
              {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
            </button>
            <button type="button" className="ov2-icon-button" onClick={finish} aria-label="End tour">
              <X aria-hidden="true" />
            </button>
          </div>
        </header>

        <p className="ov2-tour-text">{step.text}</p>

        <div className="ov2-tour-progress" aria-hidden="true">
          <i style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>

        <footer className="ov2-tour-card-footer">
          <span className="ov2-tour-count">
            {index + 1} / {steps.length}
            <button type="button" className="ov2-tour-skip" onClick={finish}>Skip tour</button>
          </span>
          <div className="ov2-tour-nav">
            <button
              type="button"
              className="ov2-secondary-button"
              disabled={index === 0}
              onClick={() => goTo(index - 1)}
            >
              <ArrowLeft aria-hidden="true" /> Back
            </button>
            {waiting ? (
              showTakeover ? (
                <button
                  type="button"
                  className="ov2-primary-button"
                  onClick={() => {
                    if (step.waitForTab) {
                      window.dispatchEvent(new CustomEvent(TOUR_EVENT_WORKSPACE_TAB, { detail: step.waitForTab }));
                    }
                    goTo(index + 1);
                  }}
                >
                  {step.waitForTab ? "Do it for me" : "Skip this one"}
                </button>
              ) : (
                <span className="ov2-tour-waiting">
                  {step.waitForInput ? "Type in the highlighted field…" : step.waitForCheck ? "Tick a toggle to continue…" : "Waiting for you…"}
                </span>
              )
            ) : (
              <button type="button" className="ov2-primary-button" onClick={() => goTo(index + 1)}>
                {isLast ? "Finish" : "Next"} {isLast ? null : <ArrowRight aria-hidden="true" />}
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
