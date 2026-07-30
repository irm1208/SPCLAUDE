import type { WorkspaceTabId } from "../nav";
import type { PreviewKind } from "./TourPreviews";
import narration from "./tour-narration.json";

// ─── Guided tour script ──────────────────────────────────────────────────────
// The whole tutorial as data. Each step pairs a spotlight target with a
// narration entry from tour-narration.json (same id). Voiceover MP3s are
// generated from that JSON by scripts/generate-tour-voiceover.mjs and served
// from /tour-audio/<id>.mp3.

export type TourMode = "any" | "setup" | "workspace";

export interface TourStep {
  id: string;
  /** 1 Welcome · 2 Create · 3 Run · 4 Done */
  chapter: 1 | 2 | 3 | 4;
  /** Which organiser mode this step needs; the tour requests it on entry. */
  mode: TourMode;
  /** CSS selector to spotlight; null = centred card, no spotlight. */
  target: string | null;
  /** Navigate the setup wizard to this step index before highlighting. */
  wizardStep?: number;
  /** Navigate the workspace to this tab before highlighting. */
  workspaceTab?: WorkspaceTabId;
  /** Pause and wait for the user to open this tab themselves. */
  waitForTab?: WorkspaceTabId;
  /** Pause and wait for the user to type into the matching field. */
  waitForInput?: { selector: string; minLength?: number };
  /** Pause and wait for the user to tick any matching checkbox. */
  waitForCheck?: { selector: string };
  /** Show a "what members see" mockup panel beside the caption card. */
  preview?: PreviewKind;
  caption: string;
  text: string;
}

export const TOUR_CHAPTERS: Record<TourStep["chapter"], string> = {
  1: "Welcome",
  2: "Create your group buy",
  3: "Run your group buy",
  4: "All set",
};

const NARRATION = new Map(narration.map(entry => [entry.id, entry]));

function step(definition: Omit<TourStep, "caption" | "text">): TourStep {
  const entry = NARRATION.get(definition.id);
  if (!entry) throw new Error(`Missing tour narration for step "${definition.id}"`);
  return { ...definition, caption: entry.caption, text: entry.text };
}

export const TOUR_STEPS: TourStep[] = [
  // ── Chapter 1 · Welcome ────────────────────────────────────────────────────
  step({ id: "welcome-intro", chapter: 1, mode: "any", target: null }),
  step({ id: "welcome-what-is-a-gb", chapter: 1, mode: "any", target: null }),
  step({ id: "welcome-what-we-cover", chapter: 1, mode: "any", target: null }),

  // ── Chapter 2 · Setup wizard ───────────────────────────────────────────────
  step({ id: "wizard-shell", chapter: 2, mode: "setup", target: '[data-tour="setup-nav"]', wizardStep: 0 }),
  step({ id: "wizard-basics", chapter: 2, mode: "setup", target: '[data-tour="basics-name-input"]', wizardStep: 0, preview: "gb-card" }),
  step({
    id: "wizard-basics-try", chapter: 2, mode: "setup", wizardStep: 0,
    target: '[data-tour="basics-name-input"]',
    waitForInput: { selector: '[data-tour="basics-name-input"]', minLength: 3 },
    preview: "gb-card",
  }),
  step({ id: "wizard-products", chapter: 2, mode: "setup", target: '[data-tour="product-row"]', wizardStep: 1, preview: "order-form" }),
  step({
    id: "wizard-products-try", chapter: 2, mode: "setup", wizardStep: 1,
    target: '[data-tour="product-name-input"]',
    waitForInput: { selector: '[data-tour="product-name-input"]', minLength: 3 },
    preview: "order-form",
  }),
  step({ id: "wizard-shipping", chapter: 2, mode: "setup", target: '[data-tour="shipping-option"]', wizardStep: 2, preview: "shipping-picker" }),
  step({ id: "wizard-payments", chapter: 2, mode: "setup", target: '[data-tour="wizard-form"]', wizardStep: 3 }),
  step({ id: "payment-crypto", chapter: 2, mode: "setup", target: '[data-tour="payment-crypto"]', wizardStep: 3, preview: "pay-crypto" }),
  step({ id: "payment-anonpay", chapter: 2, mode: "setup", target: '[data-tour="payment-anonpay"]', wizardStep: 3, preview: "pay-anonpay" }),
  step({ id: "payment-revolut", chapter: 2, mode: "setup", target: '[data-tour="payment-revolut"]', wizardStep: 3, preview: "pay-revolut" }),
  step({ id: "payment-paypal", chapter: 2, mode: "setup", target: '[data-tour="payment-paypal"]', wizardStep: 3, preview: "pay-paypal" }),
  step({
    id: "wizard-payments-try", chapter: 2, mode: "setup", wizardStep: 3,
    target: '[data-tour="wizard-form"]',
    waitForCheck: { selector: '[data-tour="wizard-form"] input[type="checkbox"]' },
  }),
  step({ id: "wizard-access", chapter: 2, mode: "setup", target: '[data-tour="access-entry-fee"]', wizardStep: 4 }),
  step({ id: "access-preview", chapter: 2, mode: "setup", target: '[data-tour="access-pin"]', wizardStep: 4, preview: "join-gate" }),
  step({ id: "wizard-rules", chapter: 2, mode: "setup", target: '[data-tour="rules-welcome-card"]', wizardStep: 5, preview: "rules-welcome" }),
  step({ id: "wizard-review", chapter: 2, mode: "setup", target: '[data-tour="wizard-form"]', wizardStep: 6 }),
  step({ id: "wizard-launch", chapter: 2, mode: "setup", target: '[data-tour="wizard-launch-button"]', wizardStep: 6 }),

  // ── Chapter 3 · Workspace ──────────────────────────────────────────────────
  step({ id: "workspace-shell", chapter: 3, mode: "workspace", target: '[data-tour="sidebar-nav"]', workspaceTab: "overview" }),
  step({ id: "workspace-overview", chapter: 3, mode: "workspace", target: '[data-tour="overview-metrics"]', workspaceTab: "overview" }),
  step({ id: "workspace-pipeline", chapter: 3, mode: "workspace", target: '[data-tour="overview-pipeline"]', workspaceTab: "overview" }),
  step({ id: "workspace-tasks", chapter: 3, mode: "workspace", target: "#ov2-main-content", workspaceTab: "todos" }),
  step({ id: "workspace-members", chapter: 3, mode: "workspace", target: "#ov2-main-content", workspaceTab: "members" }),
  step({ id: "workspace-tickets", chapter: 3, mode: "workspace", target: "#ov2-main-content", workspaceTab: "tickets" }),
  step({ id: "workspace-broadcast", chapter: 3, mode: "workspace", target: "#ov2-main-content", workspaceTab: "broadcast" }),
  step({ id: "workspace-orders", chapter: 3, mode: "workspace", target: "#ov2-main-content", workspaceTab: "orders" }),
  step({ id: "workspace-orders-bulk", chapter: 3, mode: "workspace", target: "#ov2-main-content", workspaceTab: "orders" }),
  step({ id: "workspace-summary", chapter: 3, mode: "workspace", target: "#ov2-main-content", workspaceTab: "summary" }),
  step({ id: "workspace-pnl", chapter: 3, mode: "workspace", target: "#ov2-main-content", workspaceTab: "pnl" }),
  step({ id: "workspace-parcels", chapter: 3, mode: "workspace", target: "#ov2-main-content", workspaceTab: "parcels" }),
  step({ id: "workspace-dispatch", chapter: 3, mode: "workspace", target: "#ov2-main-content", workspaceTab: "dispatch" }),
  step({ id: "workspace-labels", chapter: 3, mode: "workspace", target: "#ov2-main-content", workspaceTab: "qrcodes" }),
  step({ id: "workspace-forwarders", chapter: 3, mode: "workspace", target: "#ov2-main-content", workspaceTab: "reshippers" }),
  step({ id: "workspace-routes", chapter: 3, mode: "workspace", target: "#ov2-main-content", workspaceTab: "legs" }),
  step({ id: "workspace-rates", chapter: 3, mode: "workspace", target: "#ov2-main-content", workspaceTab: "shipping" }),
  step({ id: "workspace-coas", chapter: 3, mode: "workspace", target: "#ov2-main-content", workspaceTab: "labtests" }),
  step({ id: "workspace-testing", chapter: 3, mode: "workspace", target: "#ov2-main-content", workspaceTab: "testinggroups" }),
  step({ id: "workspace-settings", chapter: 3, mode: "workspace", target: "#ov2-main-content", workspaceTab: "settings" }),
  step({ id: "workspace-archive", chapter: 3, mode: "workspace", target: "#ov2-main-content", workspaceTab: "settings" }),
  step({ id: "workspace-products", chapter: 3, mode: "workspace", target: "#ov2-main-content", workspaceTab: "products" }),
  step({ id: "workspace-rules", chapter: 3, mode: "workspace", target: "#ov2-main-content", workspaceTab: "rules" }),
  step({ id: "workspace-search", chapter: 3, mode: "workspace", target: '[data-tour="topbar-search"]', workspaceTab: "overview" }),

  // ── Finale ─────────────────────────────────────────────────────────────────
  step({ id: "tour-finish", chapter: 4, mode: "any", target: null }),
];

/** Steps available in the current session — chapter 3 needs a live GB. */
export function availableTourSteps(workspaceAvailable: boolean): TourStep[] {
  return workspaceAvailable ? TOUR_STEPS : TOUR_STEPS.filter(item => item.chapter !== 3);
}

// ─── Cross-component events ──────────────────────────────────────────────────
// The tour drives the UI without owning it: SetupWizard and Workspace listen
// for these, and Workspace reports tab changes back for the "your turn" step.

export const TOUR_EVENT_WIZARD_STEP = "ov2:tour-wizard-step";
export const TOUR_EVENT_WORKSPACE_TAB = "ov2:tour-workspace-tab";
export const TOUR_EVENT_ACTIVE_TAB = "ov2:tour-active-tab";
/** Dispatched by any UI (e.g. the topbar Tour button) to open the tour. */
export const TOUR_EVENT_START = "ov2:tour-start";

export const TOUR_SEEN_KEY = "v2:tourSeen";
export const TOUR_PROGRESS_KEY = "v2:tourProgress";
