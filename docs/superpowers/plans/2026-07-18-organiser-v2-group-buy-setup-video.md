# Organizer V2 Group Buy Setup Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a verified 3 minute 30 second narrated tutorial that records the real Group Buy Organizer V2 setup flow and publishes the MP4, captions, and poster inside the Peps Anonymous app.

**Architecture:** Add an isolated Remotion package under `artifacts/` so video tooling does not enter the application runtime bundle. A Playwright capture runner loads the real `/gborganiser-v2` route, intercepts only its API calls with deterministic tutorial data, and records the actual React UI. ElevenLabs produces scene-level audio plus character timestamps; Remotion combines the capture, narration, captions, cursor/focus cues, and restrained brand cards into the final assets.

**Tech Stack:** pnpm workspace, TypeScript, React 19, Remotion 4, Playwright, ElevenLabs text-to-speech API, Node test runner, Remotion-bundled FFmpeg/FFprobe.

---

## Scope and File Map

Run implementation in a dedicated git worktree because the current main worktree contains unrelated Organizer V2 edits. Do not modify or stage those edits.

Create one focused package:

- `artifacts/organiser-v2-tutorial-video/package.json`: package scripts and media-tool dependencies.
- `artifacts/organiser-v2-tutorial-video/tsconfig.json`: strict TypeScript configuration.
- `artifacts/organiser-v2-tutorial-video/remotion.config.ts`: deterministic render settings.
- `artifacts/organiser-v2-tutorial-video/.gitignore`: excludes raw captures, generated voice tracks, render intermediates, and extracted verification frames.
- `artifacts/organiser-v2-tutorial-video/src/video-config.ts`: composition dimensions, frame rate, duration, and IDs.
- `artifacts/organiser-v2-tutorial-video/src/tutorial-data.ts`: synthetic form values used in the capture.
- `artifacts/organiser-v2-tutorial-video/src/tutorial-timeline.ts`: exact scene boundaries and approved narration.
- `artifacts/organiser-v2-tutorial-video/src/capture-plan.ts`: deterministic UI action schedule.
- `artifacts/organiser-v2-tutorial-video/src/api-fixture.ts`: isolated Organizer V2 API response state.
- `artifacts/organiser-v2-tutorial-video/src/components/`: caption, cursor, camera, chapter, title, and closing overlays.
- `artifacts/organiser-v2-tutorial-video/src/GroupBuySetupTutorial.tsx`: main 6300-frame composition.
- `artifacts/organiser-v2-tutorial-video/src/Poster.tsx`: poster composition based on a real Basics screenshot.
- `artifacts/organiser-v2-tutorial-video/src/Root.tsx`: Remotion composition registration.
- `artifacts/organiser-v2-tutorial-video/src/index.ts`: Remotion entry point.
- `artifacts/organiser-v2-tutorial-video/scripts/capture.ts`: starts Vite, records the real route, and writes capture metadata.
- `artifacts/organiser-v2-tutorial-video/scripts/generate-voiceover.ts`: ElevenLabs generation, caption JSON, and WebVTT output.
- `artifacts/organiser-v2-tutorial-video/scripts/publish.ts`: render, loudness normalization, and final asset copy.
- `artifacts/organiser-v2-tutorial-video/scripts/verify.ts`: media-contract checks and representative frame extraction.
- `artifacts/organiser-v2-tutorial-video/**/*.test.ts`: pure unit and contract tests.
- `pnpm-lock.yaml`: dependency lock updates only; preserve all existing user changes.

Publish only these final assets into the app:

- `artifacts/peps-anonymous/public/tutorials/group-buy-setup-v2.mp4`
- `artifacts/peps-anonymous/public/tutorials/group-buy-setup-v2.vtt`
- `artifacts/peps-anonymous/public/tutorials/group-buy-setup-v2-poster.jpg`

No application source component or backend route needs to change.

### Task 1: Scaffold the Isolated Video Package

**Files:**
- Create: `artifacts/organiser-v2-tutorial-video/package.json`
- Create: `artifacts/organiser-v2-tutorial-video/tsconfig.json`
- Create: `artifacts/organiser-v2-tutorial-video/remotion.config.ts`
- Create: `artifacts/organiser-v2-tutorial-video/.gitignore`
- Create: `artifacts/organiser-v2-tutorial-video/src/video-config.test.ts`
- Create: `artifacts/organiser-v2-tutorial-video/src/video-config.ts`
- Create: `artifacts/organiser-v2-tutorial-video/src/index.ts`
- Create: `artifacts/organiser-v2-tutorial-video/src/Root.tsx`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Write the failing composition-contract test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  COMPOSITION_ID,
  DURATION_IN_FRAMES,
  FPS,
  HEIGHT,
  POSTER_ID,
  WIDTH,
} from "./video-config";

test("the embedded tutorial uses the approved media contract", () => {
  assert.equal(COMPOSITION_ID, "GroupBuySetupV2");
  assert.equal(POSTER_ID, "GroupBuySetupV2Poster");
  assert.equal(FPS, 30);
  assert.equal(WIDTH, 1920);
  assert.equal(HEIGHT, 1080);
  assert.equal(DURATION_IN_FRAMES, 6300);
});
```

- [ ] **Step 2: Run the test and confirm the package does not exist yet**

Run: `node --import tsx --test artifacts/organiser-v2-tutorial-video/src/video-config.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `video-config`.

- [ ] **Step 3: Create the package and minimal composition**

Use this package contract:

```json
{
  "name": "@workspace/organiser-v2-tutorial-video",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --import tsx --test $(find src scripts -type f -name '*.test.ts' 2>/dev/null | sort)",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "capture": "tsx scripts/capture.ts",
    "voiceover": "tsx scripts/generate-voiceover.ts",
    "prepare:fonts": "tsx scripts/prepare-fonts.ts",
    "studio": "pnpm run prepare:fonts && remotion studio src/index.ts",
    "render": "pnpm run prepare:fonts && remotion render src/index.ts GroupBuySetupV2 build/group-buy-setup-v2.raw.mp4 --codec h264 --crf 18 --pixel-format yuv420p",
    "poster": "pnpm run prepare:fonts && remotion still src/index.ts GroupBuySetupV2Poster build/group-buy-setup-v2-poster.jpg --image-format jpeg --jpeg-quality 92",
    "publish": "tsx scripts/publish.ts",
    "verify": "tsx scripts/verify.ts"
  },
  "dependencies": {
    "@fontsource/inter": "^5.2.8",
    "@remotion/captions": "^4.0.0",
    "@remotion/cli": "^4.0.0",
    "@remotion/fonts": "^4.0.0",
    "@remotion/media": "^4.0.0",
    "playwright": "^1.61.1",
    "react": "catalog:",
    "react-dom": "catalog:",
    "remotion": "^4.0.0",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:",
    "tsx": "catalog:",
    "typescript": "~5.9.2"
  }
}
```

Use strict TypeScript with `jsx: react-jsx`, `module: ESNext`, `moduleResolution: Bundler`, `resolveJsonModule: true`, and include `src`, `scripts`, and `remotion.config.ts`.

Create `video-config.ts` exactly as follows:

```ts
export const COMPOSITION_ID = "GroupBuySetupV2";
export const POSTER_ID = "GroupBuySetupV2Poster";
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION_SECONDS = 210;
export const DURATION_IN_FRAMES = DURATION_SECONDS * FPS;
export const APP_CAPTURE_START_SECONDS = 12;
export const APP_CAPTURE_DURATION_SECONDS = 198;
```

Use this minimal root until Task 8 replaces the placeholder components:

```tsx
import { AbsoluteFill, Composition, Still } from "remotion";
import { COMPOSITION_ID, DURATION_IN_FRAMES, FPS, HEIGHT, POSTER_ID, WIDTH } from "./video-config";

const Placeholder = () => <AbsoluteFill style={{ backgroundColor: "#1B3164" }} />;

export const RemotionRoot = () => (
  <>
    <Composition id={COMPOSITION_ID} component={Placeholder} durationInFrames={DURATION_IN_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Still id={POSTER_ID} component={Placeholder} width={WIDTH} height={HEIGHT} />
  </>
);
```

Register it from `index.ts` with `registerRoot(RemotionRoot)`. In `remotion.config.ts`, call `Config.setConcurrency(1)`, `Config.setJpegQuality(90)`, and `Config.setVideoImageFormat("jpeg")` so this resource-constrained workspace renders deterministically.

Create `.gitignore` with:

```gitignore
build/
public/capture/
public/fonts/
public/voiceover/
```

- [ ] **Step 4: Install workspace dependencies**

Run: `pnpm install --filter @workspace/organiser-v2-tutorial-video...`

Expected: the new package resolves successfully and `pnpm-lock.yaml` gains only the new package/dependency entries alongside existing user changes.

- [ ] **Step 5: Verify the package contract and composition discovery**

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video test`

Expected: PASS, 1 test.

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video typecheck`

Expected: exit 0.

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video exec remotion compositions src/index.ts`

Expected: lists `GroupBuySetupV2` and `GroupBuySetupV2Poster` at 1920x1080.

- [ ] **Step 6: Commit the scaffold**

```bash
git add artifacts/organiser-v2-tutorial-video pnpm-lock.yaml
git commit -m "build: scaffold organiser v2 tutorial video"
```

### Task 2: Encode the Approved Tutorial Data, Timeline, and Narration

**Files:**
- Create: `artifacts/organiser-v2-tutorial-video/src/tutorial-data.ts`
- Create: `artifacts/organiser-v2-tutorial-video/src/tutorial-timeline.ts`
- Create: `artifacts/organiser-v2-tutorial-video/src/tutorial-timeline.test.ts`

- [ ] **Step 1: Write the failing timeline tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { DURATION_SECONDS } from "./video-config";
import { TUTORIAL_DATA } from "./tutorial-data";
import { TUTORIAL_SCENES } from "./tutorial-timeline";

test("timeline is contiguous, complete, and shows the real app for over 90 percent", () => {
  assert.equal(TUTORIAL_SCENES[0]?.startSec, 0);
  assert.equal(TUTORIAL_SCENES.at(-1)?.endSec, DURATION_SECONDS);
  for (let index = 1; index < TUTORIAL_SCENES.length; index += 1) {
    assert.equal(TUTORIAL_SCENES[index]?.startSec, TUTORIAL_SCENES[index - 1]?.endSec);
  }
  const appSeconds = TUTORIAL_SCENES
    .filter((scene) => scene.showApp)
    .reduce((sum, scene) => sum + scene.endSec - scene.startSec, 0);
  assert.ok(appSeconds / DURATION_SECONDS > 0.9);
});

test("narration fits the approved word budget", () => {
  const words = TUTORIAL_SCENES.flatMap((scene) => scene.voiceover.trim().split(/\s+/));
  assert.ok(words.length >= 490 && words.length <= 520, `word count: ${words.length}`);
});

test("tutorial data is synthetic and contains no live payment destination", () => {
  const serialized = JSON.stringify(TUTORIAL_DATA);
  assert.equal(TUTORIAL_DATA.groupBuyName, "Spring Research Run 2026");
  assert.equal(TUTORIAL_DATA.closeDate, "2026-08-31T18:00");
  assert.doesNotMatch(serialized, /0x[a-f0-9]{20,}|paypal\.me|@amoney/i);
});
```

- [ ] **Step 2: Run the tests and verify missing-module failures**

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video test`

Expected: FAIL because `tutorial-data.ts` and `tutorial-timeline.ts` do not exist.

- [ ] **Step 3: Add the exact synthetic tutorial data**

```ts
export const TUTORIAL_DATA = {
  groupBuyName: "Spring Research Run 2026",
  description: "A beginner-friendly research group buy with clear pricing, UK tracked delivery, and independent testing updates.",
  currency: "GBP",
  closeDate: "2026-08-31T18:00",
  manufacturer: "Example Supplier",
  manufacturerCountry: "United Kingdom",
  labTestSupplier: "Example Testing Lab",
  productName: "Research Product A",
  productPrice: "25.00",
  productVendor: "Example Supplier",
  productStock: "100",
  shippingLabel: "UK Tracked Delivery",
  shippingRegion: "UK",
  shippingPrice: "4.50",
  shippingDescription: "Tracked delivery in 2 to 4 working days",
  revolutHandle: "@tutorial_only",
  allowedCountry: "United Kingdom",
  invitePin: "2468",
  welcomeMessage: "Welcome to Spring Research Run 2026. Please review the products, delivery options, and payment deadline before ordering.",
  rule: "Payment must be received within 24 hours of placing an order.",
  disclaimer: "Tutorial example only. Review your own supplier, payment, customs, and fulfilment terms before launch.",
  additionalInfo: "Testing updates and expected delivery dates will be posted in the group-buy updates.",
} as const;
```

- [ ] **Step 4: Add the exact 210-second scene and narration contract**

```ts
export type TutorialScene = {
  id: string;
  label: string;
  startSec: number;
  endSec: number;
  showApp: boolean;
  voiceover: string;
};

export const TUTORIAL_SCENES = [
  {
    id: "intro",
    label: "Set up your first group buy",
    startSec: 0,
    endSec: 12,
    showApp: false,
    voiceover: "Let's create your first group buy in Organizer V2. In three and a half minutes, you'll complete all seven setup sections and submit it for approval.",
  },
  {
    id: "start",
    label: "Start setup",
    startSec: 12,
    endSec: 25,
    showApp: true,
    voiceover: "Open Organizer V2 and choose Create group buy. The sidebar shows all seven setup steps. You can save a draft at any time, and Preview lets you check the member experience before launch.",
  },
  {
    id: "basics",
    label: "Step 1 of 7 - Basics",
    startSec: 25,
    endSec: 50,
    showApp: true,
    voiceover: "Start with Basics. Give the group buy a clear name and a short description so members know what the run includes. Keep the correct currency selected, then add a closing date if orders must stop at a set time. Supplier details are optional, but adding the manufacturer, country, and testing lab makes the listing more transparent.",
  },
  {
    id: "products",
    label: "Step 2 of 7 - Products",
    startSec: 50,
    endSec: 75,
    showApp: true,
    voiceover: "Next, add what members can order. Enter the product name, member price, supplier or category, and available stock. The price is what members will see, so check it carefully. Use Add Product for each additional item; you can still update the catalogue after launch. For a first run, begin with one item and keep its naming simple and consistent.",
  },
  {
    id: "shipping",
    label: "Step 3 of 7 - Shipping",
    startSec: 75,
    endSec: 98,
    showApp: true,
    voiceover: "Under Shipping, create each delivery option you plan to offer. Add a recognizable label, select the region, enter the member cost, and describe the expected service. Leave Requires shipping address enabled when you need postal details, and enable the label or QR option only when members must upload one. Use separate options when regions have different costs.",
  },
  {
    id: "payments",
    label: "Step 4 of 7 - Accepting Payments",
    startSec: 98,
    endSec: 123,
    showApp: true,
    voiceover: "Choose only payment methods you can receive and reconcile. In this example, we enable Revolut and add a safe tutorial handle. Cryptocurrency, AnonPay, and PayPal can be configured in the same way when they apply. Double-check every address or handle before launch; an incorrect payment destination can delay every order. A single reliable method is enough to start.",
  },
  {
    id: "access",
    label: "Step 5 of 7 - Access",
    startSec: 123,
    endSec: 145,
    showApp: true,
    voiceover: "Access controls who can join. You can charge an entry fee, restrict signups by country, limit joining to invited Telegram users, or protect a private group buy with a PIN. For a first run, keep the rules as simple as your fulfilment plan allows. Restrictions can be changed later in Group Buy Settings.",
  },
  {
    id: "rules",
    label: "Step 6 of 7 - Rules and Info",
    startSec: 145,
    endSec: 167,
    showApp: true,
    voiceover: "Use Rules and Info to set expectations before anyone orders. Add a welcoming summary, a clear payment deadline, a neutral disclaimer, and any useful delivery or testing notes. Members see this information on the group-buy page, so keep it specific, readable, and consistent with the options you just configured.",
  },
  {
    id: "review",
    label: "Step 7 of 7 - Review and Launch",
    startSec: 167,
    endSec: 188,
    showApp: true,
    voiceover: "On Review and Launch, scan every summary card. Green checks confirm the required information is present. Hover an Edit link to see how you can return to any section. Launching submits the group buy for admin approval, so carefully check names, prices, dates, payment methods, and visibility.",
  },
  {
    id: "launch",
    label: "Choose visibility and launch",
    startSec: 188,
    endSec: 205,
    showApp: true,
    voiceover: "Select Launch group buy and choose visibility. Public group buys can be listed after approval. Private or hidden group buys require a direct link. Pick the right option, then select Confirm launch. Organizer V2 submits the setup and opens its workspace.",
  },
  {
    id: "closing",
    label: "Setup complete",
    startSec: 205,
    endSec: 210,
    showApp: true,
    voiceover: "Your group buy is submitted. Continue managing it from the new workspace.",
  },
] as const satisfies readonly TutorialScene[];
```

If the word-count test reports fewer than 490 words, add only useful beginner explanation to the shortest scenes. If it reports more than 520, tighten repeated phrases. Do not weaken the test range.

- [ ] **Step 5: Run the timeline tests**

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video test`

Expected: PASS for the media contract, contiguous timeline, app visibility, word count, and synthetic-data checks.

- [ ] **Step 6: Commit the tutorial contract**

```bash
git add artifacts/organiser-v2-tutorial-video/src/tutorial-data.ts artifacts/organiser-v2-tutorial-video/src/tutorial-timeline.ts artifacts/organiser-v2-tutorial-video/src/tutorial-timeline.test.ts
git commit -m "feat: define organiser tutorial timeline"
```

### Task 3: Build the Deterministic Organizer API Fixture

**Files:**
- Create: `artifacts/organiser-v2-tutorial-video/src/api-fixture.test.ts`
- Create: `artifacts/organiser-v2-tutorial-video/src/api-fixture.ts`

- [ ] **Step 1: Write fixture state-transition tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { TutorialApiFixture } from "./api-fixture";

test("fixture starts with an approved organiser and no group buys", () => {
  const fixture = new TutorialApiFixture();
  assert.equal(fixture.respond("GET", "/api/account/me").status, 200);
  assert.deepEqual(fixture.respond("GET", "/api/organiser/group-buys").body, []);
});

test("create, product, rules, and public request stay inside fixture state", () => {
  const fixture = new TutorialApiFixture();
  const created = fixture.respond("POST", "/api/organiser/group-buys", { name: "Spring Research Run 2026" });
  assert.equal((created.body as { status: string }).status, "draft");
  fixture.respond("POST", "/api/organiser/group-buys/tutorial-gb/products", { name: "Research Product A", price: 25 });
  fixture.respond("PATCH", "/api/organiser/group-buys/tutorial-gb/rules", { rules: [{ text: "Pay within 24 hours" }] });
  const submitted = fixture.respond("PATCH", "/api/organiser/group-buys/tutorial-gb/request-public");
  assert.equal((submitted.body as { status: string }).status, "pending_approval");
  assert.equal((fixture.respond("GET", "/api/organiser/group-buys").body as unknown[]).length, 1);
});
```

- [ ] **Step 2: Run the tests and verify the fixture is missing**

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video test`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `api-fixture`.

- [ ] **Step 3: Implement the in-memory fixture with explicit route responses**

The fixture must never call `fetch`. Implement these exact response families:

```ts
type JsonObject = Record<string, unknown>;
export type FixtureResponse = { status: number; body: unknown };

const GROUP_BUY = {
  id: "tutorial-gb",
  name: "Spring Research Run 2026",
  status: "draft",
  currency: "GBP",
  closeDate: "2026-08-31T18:00:00.000Z",
  memberLimit: 0,
};

export class TutorialApiFixture {
  private groupBuy: JsonObject | null = null;
  private products: JsonObject[] = [];
  private rules: JsonObject[] = [];

  respond(method: string, pathname: string, payload: unknown = {}): FixtureResponse {
    const body = payload && typeof payload === "object" ? payload as JsonObject : {};

    if (method === "GET" && pathname === "/api/account/me") {
      return { status: 200, body: { telegramUsername: "tutorial_organiser", accountStatus: "active", organiserStatus: "approved", country: "United Kingdom" } };
    }
    if (method === "GET" && pathname === "/api/organiser/me") {
      return { status: 200, body: { telegramUsername: "tutorial_organiser", email: null, organiserStatus: "approved" } };
    }
    if (method === "GET" && pathname === "/api/organiser/group-buys") {
      return { status: 200, body: this.groupBuy ? [this.groupBuy] : [] };
    }
    if (method === "POST" && pathname === "/api/organiser/group-buys") {
      this.groupBuy = { ...GROUP_BUY, ...body };
      return { status: 201, body: this.groupBuy };
    }
    if (method === "PATCH" && /^\/api\/organiser\/group-buys\/tutorial-gb$/.test(pathname)) {
      this.groupBuy = { ...(this.groupBuy ?? GROUP_BUY), ...body };
      return { status: 200, body: this.groupBuy };
    }
    if (method === "GET" && pathname.endsWith("/products")) {
      return { status: 200, body: this.products };
    }
    if (method === "POST" && pathname.endsWith("/products")) {
      const product = { id: `tutorial-product-${this.products.length + 1}`, ...body };
      this.products.push(product);
      return { status: 201, body: product };
    }
    if (method === "PATCH" && pathname.endsWith("/rules")) {
      this.rules = Array.isArray(body.rules) ? body.rules as JsonObject[] : [];
      return { status: 200, body: { rules: this.rules } };
    }
    if (method === "PATCH" && pathname.endsWith("/request-public")) {
      this.groupBuy = { ...(this.groupBuy ?? GROUP_BUY), status: "pending_approval" };
      return { status: 200, body: this.groupBuy };
    }
    if (method === "GET" && pathname.endsWith("/orders")) return { status: 200, body: [] };
    if (method === "GET" && pathname.endsWith("/members")) return { status: 200, body: [] };
    if (method === "GET" && pathname.endsWith("/todos")) return { status: 200, body: [] };
    if (method === "GET" && pathname.includes("/organiser/tickets")) return { status: 200, body: { tickets: [] } };
    if (method === "GET" && pathname.endsWith("/testing")) return { status: 200, body: { round: null, products: this.products, labTests: [], contributions: { pending: 0, confirmed: 0, rejected: 0, total: 0 } } };
    if (method === "GET" && pathname === "/api/organiser/lab-tests") return { status: 200, body: [] };
    return { status: 200, body: method === "GET" ? [] : { ok: true } };
  }
}
```

- [ ] **Step 4: Run fixture tests**

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video test`

Expected: PASS, including both state-transition tests.

- [ ] **Step 5: Commit the isolated API layer**

```bash
git add artifacts/organiser-v2-tutorial-video/src/api-fixture.ts artifacts/organiser-v2-tutorial-video/src/api-fixture.test.ts
git commit -m "test: add deterministic organiser tutorial api"
```

### Task 4: Define the Real-UI Capture Action Contract

**Files:**
- Create: `artifacts/organiser-v2-tutorial-video/src/capture-plan.test.ts`
- Create: `artifacts/organiser-v2-tutorial-video/src/capture-plan.ts`

- [ ] **Step 1: Write action-plan contract tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { CAPTURE_ACTIONS } from "./capture-plan";

test("capture actions are chronological and stay inside the real-app window", () => {
  assert.ok(CAPTURE_ACTIONS.length >= 35);
  for (let index = 1; index < CAPTURE_ACTIONS.length; index += 1) {
    assert.ok(CAPTURE_ACTIONS[index]!.atSec > CAPTURE_ACTIONS[index - 1]!.atSec);
  }
  assert.ok(CAPTURE_ACTIONS[0]!.atSec >= 12);
  assert.ok(CAPTURE_ACTIONS.at(-1)!.atSec < 205);
});

test("capture visibly visits every setup step and launch state", () => {
  const serialized = JSON.stringify(CAPTURE_ACTIONS);
  for (const expected of ["Basics", "Products", "Shipping", "Accepting Payments", "Access", "Rules & Info", "Review & Launch", "Confirm launch"]) {
    assert.match(serialized, new RegExp(expected.replace(/[&]/g, "."), "i"));
  }
});
```

- [ ] **Step 2: Run the tests and verify `capture-plan` is missing**

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video test`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `capture-plan`.

- [ ] **Step 3: Add a typed action DSL and the exact interaction schedule**

Use `global` video seconds so capture cues and Remotion overlays share one clock:

```ts
import { TUTORIAL_DATA as data } from "./tutorial-data";

export type LocatorSpec =
  | { by: "placeholder"; value: string; index?: number }
  | { by: "css"; value: string; index?: number }
  | { by: "text"; value: string; index?: number }
  | { by: "panel-checkbox"; value: string }
  | { by: "label"; value: string };

export type CaptureAction = {
  atSec: number;
  step: string;
  kind: "focus" | "fill" | "click" | "select" | "scroll";
  locator: LocatorSpec;
  value?: string;
};

export const CAPTURE_ACTIONS: readonly CaptureAction[] = [
  { atSec: 13, step: "Start setup", kind: "focus", locator: { by: "text", value: "Create group buy" } },
  { atSec: 20, step: "Basics", kind: "focus", locator: { by: "text", value: "Save draft" } },
  { atSec: 26, step: "Basics", kind: "fill", locator: { by: "placeholder", value: "e.g. Winter Peptide Run 2025" }, value: data.groupBuyName },
  { atSec: 31, step: "Basics", kind: "fill", locator: { by: "placeholder", value: "Tell members what this group buy is about, what products are included, and any important details..." }, value: data.description },
  { atSec: 36, step: "Basics", kind: "select", locator: { by: "css", value: ".ov2-form-content select", index: 0 }, value: data.currency },
  { atSec: 39, step: "Basics", kind: "fill", locator: { by: "css", value: "input[type=datetime-local]" }, value: data.closeDate },
  { atSec: 42, step: "Basics", kind: "fill", locator: { by: "placeholder", value: "e.g. QSC" }, value: data.manufacturer },
  { atSec: 45, step: "Basics", kind: "fill", locator: { by: "placeholder", value: "e.g. China" }, value: data.manufacturerCountry },
  { atSec: 47, step: "Basics", kind: "fill", locator: { by: "placeholder", value: "e.g. Janoshik" }, value: data.labTestSupplier },
  { atSec: 49, step: "Products", kind: "click", locator: { by: "css", value: ".ov2-form-footer .ov2-primary-button" } },
  { atSec: 52, step: "Products", kind: "fill", locator: { by: "placeholder", value: "Product name" }, value: data.productName },
  { atSec: 57, step: "Products", kind: "fill", locator: { by: "placeholder", value: "Price" }, value: data.productPrice },
  { atSec: 61, step: "Products", kind: "fill", locator: { by: "placeholder", value: "Vendor" }, value: data.productVendor },
  { atSec: 65, step: "Products", kind: "fill", locator: { by: "placeholder", value: "Stock" }, value: data.productStock },
  { atSec: 70, step: "Products", kind: "focus", locator: { by: "text", value: "Add Product" } },
  { atSec: 74, step: "Shipping", kind: "click", locator: { by: "css", value: ".ov2-form-footer .ov2-primary-button" } },
  { atSec: 77, step: "Shipping", kind: "fill", locator: { by: "placeholder", value: "e.g. Standard Shipping" }, value: data.shippingLabel },
  { atSec: 81, step: "Shipping", kind: "select", locator: { by: "css", value: ".ov2-form-content select", index: 0 }, value: data.shippingRegion },
  { atSec: 84, step: "Shipping", kind: "fill", locator: { by: "placeholder", value: "0.00" }, value: data.shippingPrice },
  { atSec: 88, step: "Shipping", kind: "fill", locator: { by: "placeholder", value: "e.g. Delivery in 5-7 days" }, value: data.shippingDescription },
  { atSec: 93, step: "Shipping", kind: "focus", locator: { by: "label", value: "Requires shipping address" } },
  { atSec: 97, step: "Accepting Payments", kind: "click", locator: { by: "css", value: ".ov2-form-footer .ov2-primary-button" } },
  { atSec: 100, step: "Accepting Payments", kind: "focus", locator: { by: "panel-checkbox", value: "Cryptocurrency (Direct)" } },
  { atSec: 105, step: "Accepting Payments", kind: "focus", locator: { by: "panel-checkbox", value: "AnonPay" } },
  { atSec: 110, step: "Accepting Payments", kind: "click", locator: { by: "panel-checkbox", value: "Revolut" } },
  { atSec: 114, step: "Accepting Payments", kind: "fill", locator: { by: "placeholder", value: "@username" }, value: data.revolutHandle },
  { atSec: 119, step: "Accepting Payments", kind: "focus", locator: { by: "panel-checkbox", value: "PayPal" } },
  { atSec: 122, step: "Access", kind: "click", locator: { by: "css", value: ".ov2-form-footer .ov2-primary-button" } },
  { atSec: 125, step: "Access", kind: "focus", locator: { by: "panel-checkbox", value: "Paid GB Entry Fee" } },
  { atSec: 130, step: "Access", kind: "click", locator: { by: "label", value: "Only allow specific countries" } },
  { atSec: 133, step: "Access", kind: "fill", locator: { by: "placeholder", value: "Country name or code (e.g. UK, France)" }, value: data.allowedCountry },
  { atSec: 136, step: "Access", kind: "click", locator: { by: "css", value: ".ov2-form-content button", index: 0 } },
  { atSec: 139, step: "Access", kind: "click", locator: { by: "panel-checkbox", value: "Invite PIN (Password)" } },
  { atSec: 142, step: "Access", kind: "fill", locator: { by: "placeholder", value: "e.g. 1234" }, value: data.invitePin },
  { atSec: 144, step: "Rules & Info", kind: "click", locator: { by: "css", value: ".ov2-form-footer .ov2-primary-button" } },
  { atSec: 147, step: "Rules & Info", kind: "fill", locator: { by: "css", value: ".ov2-form-content textarea", index: 0 }, value: data.welcomeMessage },
  { atSec: 152, step: "Rules & Info", kind: "fill", locator: { by: "placeholder", value: "e.g. Payment must be received within 24 hours" }, value: data.rule },
  { atSec: 157, step: "Rules & Info", kind: "fill", locator: { by: "css", value: ".ov2-form-content textarea", index: 1 }, value: data.disclaimer },
  { atSec: 162, step: "Rules & Info", kind: "fill", locator: { by: "css", value: ".ov2-form-content textarea", index: 2 }, value: data.additionalInfo },
  { atSec: 166, step: "Review & Launch", kind: "click", locator: { by: "css", value: ".ov2-form-footer .ov2-primary-button" } },
  { atSec: 170, step: "Review & Launch", kind: "scroll", locator: { by: "text", value: "Products" } },
  { atSec: 178, step: "Review & Launch", kind: "focus", locator: { by: "text", value: "Edit", index: 0 } },
  { atSec: 184, step: "Review & Launch", kind: "scroll", locator: { by: "text", value: "What happens when you launch?" } },
  { atSec: 187, step: "Review & Launch", kind: "click", locator: { by: "css", value: ".ov2-form-footer .ov2-primary-button" } },
  { atSec: 190, step: "Launch", kind: "click", locator: { by: "label", value: "Private / hidden" } },
  { atSec: 196, step: "Launch", kind: "click", locator: { by: "label", value: "Public" } },
  { atSec: 202, step: "Confirm launch", kind: "click", locator: { by: "text", value: "Confirm launch" } },
] as const;
```

- [ ] **Step 4: Run the action-contract tests**

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video test`

Expected: PASS and all eight setup/launch labels are present in the serialized plan.

- [ ] **Step 5: Commit the capture contract**

```bash
git add artifacts/organiser-v2-tutorial-video/src/capture-plan.ts artifacts/organiser-v2-tutorial-video/src/capture-plan.test.ts
git commit -m "feat: define organiser tutorial capture actions"
```

### Task 5: Record the Actual `/gborganiser-v2` Interface

**Files:**
- Create: `artifacts/organiser-v2-tutorial-video/scripts/capture-utils.test.ts`
- Create: `artifacts/organiser-v2-tutorial-video/scripts/capture-utils.ts`
- Create: `artifacts/organiser-v2-tutorial-video/scripts/capture.ts`

- [ ] **Step 1: Write timing and manifest tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { localCaptureMs, waitDurationMs } from "./capture-utils";

test("global tutorial time maps to the 12-second capture offset", () => {
  assert.equal(localCaptureMs(12), 0);
  assert.equal(localCaptureMs(25), 13_000);
  assert.equal(localCaptureMs(210), 198_000);
});

test("late actions never request a negative wait", () => {
  assert.equal(waitDurationMs(5_000, 4_500), 500);
  assert.equal(waitDurationMs(5_000, 5_250), 0);
});
```

- [ ] **Step 2: Run the tests and confirm the utility is missing**

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video test`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `capture-utils`.

- [ ] **Step 3: Implement the capture clock and manifest types**

```ts
import { APP_CAPTURE_START_SECONDS } from "../src/video-config";

export const localCaptureMs = (globalSec: number) =>
  Math.round((globalSec - APP_CAPTURE_START_SECONDS) * 1000);

export const waitDurationMs = (targetMs: number, elapsedMs: number) =>
  Math.max(0, targetMs - elapsedMs);

export type CursorCue = {
  atMs: number;
  x: number;
  y: number;
  click: boolean;
};

export type FocusCue = {
  startMs: number;
  endMs: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CaptureManifest = {
  source: "/gborganiser-v2";
  trimStartMs: number;
  durationMs: 198000;
  width: 1920;
  height: 1080;
  cursor: CursorCue[];
  focus: FocusCue[];
};
```

- [ ] **Step 4: Implement the Playwright runner**

The runner must:

1. Spawn `pnpm --filter @workspace/peps-anonymous run dev` with `PORT=4173`, `BASE_PATH=/`, and `VITE_NO_WATCH=1`.
2. Wait for `http://127.0.0.1:4173/gborganiser-v2` to return HTML.
3. Launch Chromium at 1920x1080 with Playwright video recording enabled.
4. Set `v2:organiserMode=setup` and remove `v2:selectedGroupBuyId` before app code runs.
5. Route every `**/api/**` request through `TutorialApiFixture.respond()` and fulfill JSON locally.
6. Wait for `.ov2-setup-page`, `document.fonts.ready`, and the Basics heading.
7. Start the 198-second monotonic clock, resolve each `LocatorSpec`, scroll it into view, record its bounding box, move the Playwright mouse to its center, perform the action, and append cursor/focus cues.
8. Capture `public/capture/basics-poster.png` after the Basics fields are filled and before Continue, then save `public/capture/organizer-v2.webm` and `public/capture/manifest.json` after the full run.
9. Close Chromium and terminate the spawned Vite process in `finally`.

Use this route bridge and action behavior:

```ts
import type { Locator, Page } from "playwright";

const indexed = (locator: Locator, index = 0) => locator.nth(index);

const resolveLocator = (page: Page, spec: LocatorSpec): Locator => {
  if (spec.by === "placeholder") return indexed(page.getByPlaceholder(spec.value, { exact: true }), spec.index);
  if (spec.by === "css") return indexed(page.locator(spec.value), spec.index);
  if (spec.by === "text") return indexed(page.getByText(spec.value, { exact: true }), spec.index);
  if (spec.by === "panel-checkbox") {
    return page.locator("label").filter({ hasText: spec.value }).locator('input[type="checkbox"]').first();
  }
  return page.locator("label").filter({ hasText: spec.value }).first();
};

await page.route("**/api/**", async (route) => {
  const request = route.request();
  const pathname = new URL(request.url()).pathname;
  const payload = request.postDataJSON() ?? {};
  const response = fixture.respond(request.method(), pathname, payload);
  await route.fulfill({
    status: response.status,
    contentType: "application/json",
    body: JSON.stringify(response.body),
  });
});

for (const action of CAPTURE_ACTIONS) {
  const targetMs = localCaptureMs(action.atSec);
  await page.waitForTimeout(waitDurationMs(targetMs, performance.now() - timelineStart));
  const locator = resolveLocator(page, action.locator);
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error(`No visible box for ${action.step}: ${JSON.stringify(action.locator)}`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y, { steps: 18 });
  cursor.push({ atMs: targetMs, x, y, click: action.kind === "click" });
  focus.push({ startMs: targetMs - 250, endMs: targetMs + 1250, ...box });
  if (action.kind === "fill") await locator.fill(action.value ?? "");
  if (action.kind === "click") await locator.click();
  if (action.kind === "select") await locator.selectOption(action.value ?? "");
}
```

Use role/text locators scoped to visible elements. For `panel-checkbox`, locate the card containing the requested heading and its checkbox. For `label`, locate the visible label by text. Never add capture-only selectors or components to the Peps Anonymous app.

- [ ] **Step 5: Install the Playwright Chromium runtime and OS libraries**

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video exec playwright install --with-deps chromium`

Expected: Chromium launches without missing `libatk`, `libXdamage`, `libasound`, or `libatspi` errors.

- [ ] **Step 6: Run unit tests and typecheck before the long capture**

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video test && pnpm --filter @workspace/organiser-v2-tutorial-video typecheck`

Expected: all tests pass and TypeScript exits 0.

- [ ] **Step 7: Record and inspect the real app capture**

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video capture`

Expected: the runner takes approximately 3 minutes 30 seconds, logs all seven steps, and produces the WebM, poster PNG, and manifest without contacting the production API.

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video exec remotion ffprobe public/capture/organizer-v2.webm -v error -show_entries stream=width,height,codec_name -show_entries format=duration -of json`

Expected: 1920x1080 video, duration at least 198 seconds, no audio stream required.

- [ ] **Step 8: Commit capture code, not generated media**

```bash
git add artifacts/organiser-v2-tutorial-video/scripts artifacts/organiser-v2-tutorial-video/.gitignore
git commit -m "feat: capture real organiser v2 setup flow"
```

### Task 6: Generate Timestamped Narration and Captions

**Files:**
- Create: `artifacts/organiser-v2-tutorial-video/scripts/voiceover-utils.test.ts`
- Create: `artifacts/organiser-v2-tutorial-video/scripts/voiceover-utils.ts`
- Create: `artifacts/organiser-v2-tutorial-video/scripts/generate-voiceover.ts`

**Environment:**
- Required: `ELEVENLABS_API_KEY`
- Optional override: `ELEVENLABS_VOICE_ID`; default to George, `JBFqnCBsd6RMkjVDRZzb`

- [ ] **Step 1: Write alignment and VTT tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { alignmentToCaptions, captionsToVtt } from "./voiceover-utils";

test("character alignment becomes word captions on the global scene clock", () => {
  const captions = alignmentToCaptions({
    characters: ["H", "i", " ", "a", "l", "l"],
    character_start_times_seconds: [0, 0.1, 0.2, 0.3, 0.4, 0.5],
    character_end_times_seconds: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6],
  }, 12_000);
  assert.deepEqual(captions.map(({ text, startMs, endMs }) => ({ text, startMs, endMs })), [
    { text: "Hi", startMs: 12_000, endMs: 12_200 },
    { text: " all", startMs: 12_300, endMs: 12_600 },
  ]);
});

test("VTT starts with a valid header and cue", () => {
  const vtt = captionsToVtt([{ text: "Hello", startMs: 0, endMs: 900, timestampMs: 0, confidence: 1 }]);
  assert.match(vtt, /^WEBVTT\n\n/);
  assert.match(vtt, /00:00:00\.000 --> 00:00:00\.900/);
});
```

- [ ] **Step 2: Run tests and verify utilities are missing**

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video test`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `voiceover-utils`.

- [ ] **Step 3: Implement caption conversion using the Remotion `Caption` type**

```ts
import type { Caption } from "@remotion/captions";

export type ElevenAlignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

export function alignmentToCaptions(alignment: ElevenAlignment, offsetMs: number): Caption[] {
  const captions: Caption[] = [];
  let startIndex = 0;
  for (let index = 0; index <= alignment.characters.length; index += 1) {
    const atEnd = index === alignment.characters.length;
    const atSpace = !atEnd && /\s/.test(alignment.characters[index]!);
    if (!atEnd && !atSpace) continue;
    if (index > startIndex) {
      const leadingSpace = captions.length > 0 ? " " : "";
      captions.push({
        text: leadingSpace + alignment.characters.slice(startIndex, index).join(""),
        startMs: offsetMs + Math.round(alignment.character_start_times_seconds[startIndex]! * 1000),
        endMs: offsetMs + Math.round(alignment.character_end_times_seconds[index - 1]! * 1000),
        timestampMs: offsetMs + Math.round(alignment.character_start_times_seconds[startIndex]! * 1000),
        confidence: 1,
      });
    }
    startIndex = index + 1;
  }
  return captions;
}
```

Implement `captionsToVtt()` with zero-padded `HH:MM:SS.mmm` timestamps and one cue per sentence-sized page.

```ts
const vttTime = (milliseconds: number) => {
  const total = Math.max(0, Math.round(milliseconds));
  const hours = Math.floor(total / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const seconds = Math.floor((total % 60_000) / 1_000);
  const millis = total % 1_000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
};

export function captionsToVtt(captions: Caption[]): string {
  const cues: string[] = ["WEBVTT", ""];
  for (let index = 0; index < captions.length; index += 1) {
    const caption = captions[index]!;
    cues.push(String(index + 1));
    cues.push(`${vttTime(caption.startMs)} --> ${vttTime(caption.endMs)}`);
    cues.push(caption.text.trim());
    cues.push("");
  }
  return cues.join("\n");
}
```

- [ ] **Step 4: Implement ElevenLabs scene generation**

For each `TUTORIAL_SCENES` entry, POST to:

`https://api.elevenlabs.io/v1/text-to-speech/{voiceId}/with-timestamps?output_format=mp3_44100_128`

Use:

```json
{
  "model_id": "eleven_multilingual_v2",
  "text": "scene.voiceover",
  "voice_settings": {
    "stability": 0.55,
    "similarity_boost": 0.78,
    "style": 0.2,
    "use_speaker_boost": true,
    "speed": 1.0
  }
}
```

The request and response handling must use this shape:

```ts
const response = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=mp3_44100_128`,
  {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      text: scene.voiceover,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.78,
        style: 0.2,
        use_speaker_boost: true,
        speed: 1.0,
      },
    }),
  },
);
if (!response.ok) throw new Error(`ElevenLabs ${response.status}: ${await response.text()}`);
const generated = await response.json() as {
  audio_base64: string;
  alignment?: ElevenAlignment;
  normalized_alignment?: ElevenAlignment;
};
```

Decode `audio_base64` into `public/voiceover/{scene.id}.mp3`. Convert `normalized_alignment ?? alignment` into captions offset by `scene.startSec * 1000`. Reject a response when the last character timestamp exceeds the scene duration minus 250 milliseconds; this prevents narration overlap. Write the combined `public/voiceover/captions.json` and `public/voiceover/group-buy-setup-v2.vtt` only after all scenes succeed.

- [ ] **Step 5: Run narration utility tests and typecheck**

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video test && pnpm --filter @workspace/organiser-v2-tutorial-video typecheck`

Expected: all tests pass and no generated audio is required for unit tests.

- [ ] **Step 6: Generate the spoken track**

Run: `test -n "$ELEVENLABS_API_KEY"`

Expected: exit 0. If it fails, obtain the key from the user before making any external request.

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video voiceover`

Expected: 11 MP3 files, one captions JSON file, and one VTT file. Each scene audio fits its assigned time window.

- [ ] **Step 7: Commit voiceover code, not generated audio**

```bash
git add artifacts/organiser-v2-tutorial-video/scripts artifacts/organiser-v2-tutorial-video/.gitignore
git commit -m "feat: generate tutorial narration and captions"
```

### Task 7: Build Branded, Accessible Overlay Components

**Files:**
- Create: `artifacts/organiser-v2-tutorial-video/src/brand.ts`
- Create: `artifacts/organiser-v2-tutorial-video/src/fonts.ts`
- Create: `artifacts/organiser-v2-tutorial-video/scripts/prepare-fonts.ts`
- Create: `artifacts/organiser-v2-tutorial-video/src/components/camera.test.ts`
- Create: `artifacts/organiser-v2-tutorial-video/src/components/camera.ts`
- Create: `artifacts/organiser-v2-tutorial-video/src/components/CaptionOverlay.tsx`
- Create: `artifacts/organiser-v2-tutorial-video/src/components/CursorOverlay.tsx`
- Create: `artifacts/organiser-v2-tutorial-video/src/components/FocusOverlay.tsx`
- Create: `artifacts/organiser-v2-tutorial-video/src/components/ChapterLabel.tsx`
- Create: `artifacts/organiser-v2-tutorial-video/src/components/TitleCard.tsx`
- Create: `artifacts/organiser-v2-tutorial-video/src/components/ClosingCard.tsx`

- [ ] **Step 1: Write camera-boundary tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { cameraTransformForBox } from "./camera";

test("camera zoom remains gentle and keeps focus inside title-safe bounds", () => {
  const transform = cameraTransformForBox({ x: 1500, y: 800, width: 260, height: 90 }, 1920, 1080);
  assert.ok(transform.scale >= 1.1 && transform.scale <= 1.25);
  assert.ok(transform.originX >= 192 && transform.originX <= 1728);
  assert.ok(transform.originY >= 108 && transform.originY <= 972);
});
```

- [ ] **Step 2: Run the test and verify `camera.ts` is missing**

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video test`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `camera`.

- [ ] **Step 3: Implement restrained camera math and brand tokens**

Use the approved palette exactly:

```ts
export const BRAND = {
  navy: "#1B3A7A",
  blue: "#2D6BCC",
  deepNavy: "#1B3164",
  amber: "#E9A020",
  background: "#F8FAFC",
  heading: "#0F1F38",
  body: "#374151",
} as const;
```

Clamp focus origins to a 10 percent title-safe margin. Return scale `1.18` for normal form controls and at most `1.25` for controls narrower than 220 pixels. Components must use `useCurrentFrame()`, `useVideoConfig()`, `interpolate()`, and `Easing.bezier(0.16, 1, 0.3, 1)`; do not use CSS animations or transitions.

```ts
export type FocusBox = { x: number; y: number; width: number; height: number };
export type CameraTransform = { scale: number; originX: number; originY: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function cameraTransformForBox(box: FocusBox, width: number, height: number): CameraTransform {
  const scale = box.width < 220 ? 1.25 : 1.18;
  return {
    scale,
    originX: clamp(box.x + box.width / 2, width * 0.1, width * 0.9),
    originY: clamp(box.y + box.height / 2, height * 0.1, height * 0.9),
  };
}
```

- [ ] **Step 4: Implement overlays with stable dimensions**

- `CaptionOverlay`: receive the already-loaded `Caption[]` from `useTutorialAssets`, group pages with `createTikTokStyleCaptions({ combineTokensWithinMilliseconds: 1600 })`, render at most two lines in a fixed-width high-contrast navy surface, and move to `bottom: 150` when the current focus box intersects the default caption band. `useTutorialAssets` owns `useDelayRender` so the capture manifest and captions are loaded exactly once.
- `CursorOverlay`: linearly interpolate between manifest cursor cues, render a 24-pixel white pointer with navy outline, and show a 46-pixel translucent blue click ring for 10 frames after click cues.
- `FocusOverlay`: render a 3-pixel Brand Blue outline and soft `rgba(45,107,204,0.16)` halo around the current focus cue.
- `ChapterLabel`: render a compact top-right label for 2.5 seconds after each scene boundary.
- `TitleCard`: show `Set Up Your First Group Buy` and `Group Buy Organizer V2` over the navy-to-blue brand gradient for 12 seconds, with the actual Basics poster subtly visible after frame 180.
- `ClosingCard`: overlay `Group buy submitted` for the final 5 seconds while the real launched workspace remains visible behind it.

Use this caption-page shape inside `CaptionOverlay`:

```tsx
const { pages } = useMemo(
  () => createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds: 1600 }),
  [captions],
);

return pages.map((page, index) => {
  const from = Math.round((page.startMs / 1000) * fps);
  const nextStart = pages[index + 1]?.startMs ?? 210_000;
  const durationInFrames = Math.max(1, Math.round(((nextStart - page.startMs) / 1000) * fps));
  return (
    <Sequence key={`${page.startMs}-${index}`} from={from} durationInFrames={durationInFrames} premountFor={fps}>
      <div className="caption-safe-area" style={{ bottom: captionBottom }}>
        {page.text.trim()}
      </div>
    </Sequence>
  );
});
```

Load Inter 400, 600, and 700 from copied `@fontsource/inter` WOFF2 files using `@remotion/fonts`. Keep all title and caption text inside the safe area.

- [ ] **Step 5: Implement and run reproducible local-font preparation**

```ts
import { cpFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const packageRoot = dirname(require.resolve("@fontsource/inter/package.json"));
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(projectRoot, "public/fonts");
mkdirSync(outputDir, { recursive: true });

for (const weight of ["400", "600", "700"] as const) {
  cpFileSync(
    resolve(packageRoot, `files/inter-latin-${weight}-normal.woff2`),
    resolve(outputDir, `inter-${weight}.woff2`),
  );
}
```

Load the generated files in `fonts.ts`:

```ts
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

await Promise.all((["400", "600", "700"] as const).map((weight) => loadFont({
  family: "Inter",
  url: staticFile(`fonts/inter-${weight}.woff2`),
  weight,
})));
```

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video prepare:fonts`

Expected: `public/fonts/inter-400.woff2`, `inter-600.woff2`, and `inter-700.woff2` exist.

- [ ] **Step 6: Run tests and typecheck**

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video test && pnpm --filter @workspace/organiser-v2-tutorial-video typecheck`

Expected: camera tests pass and every overlay typechecks.

- [ ] **Step 7: Commit overlay components and font preparation**

```bash
git add artifacts/organiser-v2-tutorial-video/src/brand.ts artifacts/organiser-v2-tutorial-video/src/fonts.ts artifacts/organiser-v2-tutorial-video/src/components artifacts/organiser-v2-tutorial-video/scripts/prepare-fonts.ts
git commit -m "feat: add tutorial overlays and captions"
```

### Task 8: Compose the 6300-Frame Tutorial and Poster

**Files:**
- Create: `artifacts/organiser-v2-tutorial-video/src/use-tutorial-assets.ts`
- Create: `artifacts/organiser-v2-tutorial-video/src/GroupBuySetupTutorial.tsx`
- Create: `artifacts/organiser-v2-tutorial-video/src/Poster.tsx`
- Modify: `artifacts/organiser-v2-tutorial-video/src/Root.tsx`
- Create: `artifacts/organiser-v2-tutorial-video/src/composition-contract.test.ts`

- [ ] **Step 1: Write a source-level composition contract test**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("composition uses the real capture, narration, captions, and every overlay", () => {
  const source = readFileSync(new URL("./GroupBuySetupTutorial.tsx", import.meta.url), "utf8");
  for (const token of ["organizer-v2.webm", "CaptionOverlay", "CursorOverlay", "FocusOverlay", "ChapterLabel", "TitleCard", "ClosingCard"]) {
    assert.match(source, new RegExp(token));
  }
});
```

- [ ] **Step 2: Run tests and verify the composition is missing**

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video test`

Expected: FAIL with `ENOENT` for `GroupBuySetupTutorial.tsx`.

- [ ] **Step 3: Implement asset loading and the main composition**

`useTutorialAssets()` must fetch `capture/manifest.json` and `voiceover/captions.json` through `staticFile()`, using `useDelayRender()` to block rendering and `cancelRender()` on malformed JSON.

Compose these fixed sequences:

```tsx
<AbsoluteFill style={{ backgroundColor: BRAND.deepNavy, fontFamily: "Inter" }}>
  <Sequence from={0} durationInFrames={12 * FPS} premountFor={FPS}>
    <TitleCard />
  </Sequence>
  <Sequence from={12 * FPS} durationInFrames={198 * FPS} premountFor={FPS}>
    <div style={{ transform: cameraTransform, transformOrigin: cameraOrigin }}>
      <Video
        src={staticFile("capture/organizer-v2.webm")}
        trimBefore={Math.round((manifest.trimStartMs / 1000) * FPS)}
        muted
      />
    </div>
    <FocusOverlay cues={manifest.focus} />
    <CursorOverlay cues={manifest.cursor} />
  </Sequence>
  {TUTORIAL_SCENES.map((scene) => (
    <Sequence key={scene.id} from={scene.startSec * FPS} durationInFrames={(scene.endSec - scene.startSec) * FPS} premountFor={FPS}>
      <Audio src={staticFile(`voiceover/${scene.id}.mp3`)} />
    </Sequence>
  ))}
  <ChapterLabel scenes={TUTORIAL_SCENES} />
  <CaptionOverlay captions={captions} focus={manifest.focus} />
  <Sequence from={205 * FPS} durationInFrames={5 * FPS} premountFor={FPS}>
    <ClosingCard />
  </Sequence>
</AbsoluteFill>
```

Use `<Video>` and `<Audio>` from `@remotion/media`; use `staticFile()` for every media path. The camera animation must derive only from the current Remotion frame and focus cues.

- [ ] **Step 4: Implement the poster composition**

Use `<Img src={staticFile("capture/basics-poster.png")} />` as the full-frame real interface. Add a restrained lower-left title `Set Up Your First Group Buy` and small `Organizer V2` label without covering the Basics heading or first field.

```tsx
export const Poster = () => (
  <AbsoluteFill style={{ backgroundColor: BRAND.background, fontFamily: "Inter" }}>
    <Img src={staticFile("capture/basics-poster.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    <div style={{ position: "absolute", left: 72, bottom: 64, width: 660, padding: "24px 28px", borderRadius: 8, backgroundColor: "rgba(27,49,100,0.94)", color: "white" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: BRAND.amber }}>ORGANIZER V2</div>
      <div style={{ marginTop: 8, fontSize: 44, fontWeight: 700, lineHeight: 1.08 }}>Set Up Your First Group Buy</div>
    </div>
  </AbsoluteFill>
);
```

- [ ] **Step 5: Register final components and render one low-resolution still**

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video test && pnpm --filter @workspace/organiser-v2-tutorial-video typecheck`

Expected: all tests pass.

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video exec remotion still src/index.ts GroupBuySetupV2 --frame=900 --scale=0.25 build/check-basics.jpg`

Expected: a nonblank frame at 30 seconds showing the real Basics screen, visible focus treatment, and readable captions.

- [ ] **Step 6: Commit the compositions**

```bash
git add artifacts/organiser-v2-tutorial-video/src
git commit -m "feat: compose organiser setup tutorial"
```

### Task 9: Add Publishing and Automated Media Verification

**Files:**
- Create: `artifacts/organiser-v2-tutorial-video/scripts/media-contract.test.ts`
- Create: `artifacts/organiser-v2-tutorial-video/scripts/media-contract.ts`
- Create: `artifacts/organiser-v2-tutorial-video/scripts/publish.ts`
- Create: `artifacts/organiser-v2-tutorial-video/scripts/verify.ts`

- [ ] **Step 1: Write ffprobe-contract tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { assertMediaContract } from "./media-contract";

const validProbe = {
  streams: [
    { codec_type: "video", codec_name: "h264", width: 1920, height: 1080, avg_frame_rate: "30/1" },
    { codec_type: "audio", codec_name: "aac" },
  ],
  format: { duration: "210.000000" },
};

test("accepts the approved final media shape", () => {
  assert.doesNotThrow(() => assertMediaContract(validProbe));
});

test("rejects a video without narration audio", () => {
  assert.throws(() => assertMediaContract({ ...validProbe, streams: [validProbe.streams[0]] }), /AAC audio/);
});
```

- [ ] **Step 2: Run the test and verify the media contract is missing**

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video test`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `media-contract`.

- [ ] **Step 3: Implement exact codec, duration, size, and frame-rate assertions**

`assertMediaContract()` must require:

- H.264 video at 1920x1080.
- Average frame rate exactly 30 fps.
- AAC audio.
- Duration between 205 and 215 seconds, with a preferred warning when outside 209.5 to 210.5 seconds.

It must throw specific errors naming the missing or incorrect property.

```ts
type ProbeStream = {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
};

type Probe = {
  streams?: ProbeStream[];
  format?: { duration?: string };
};

export function assertMediaContract(probe: Probe): void {
  const video = probe.streams?.find((stream) => stream.codec_type === "video");
  const audio = probe.streams?.find((stream) => stream.codec_type === "audio");
  if (!video || video.codec_name !== "h264") throw new Error("Expected H.264 video");
  if (video.width !== 1920 || video.height !== 1080) throw new Error("Expected 1920x1080 video");
  if (video.avg_frame_rate !== "30/1") throw new Error("Expected 30 fps video");
  if (!audio || audio.codec_name !== "aac") throw new Error("Expected AAC audio");
  const duration = Number(probe.format?.duration);
  if (!Number.isFinite(duration) || duration < 205 || duration > 215) {
    throw new Error(`Expected duration from 205 to 215 seconds, received ${probe.format?.duration ?? "missing"}`);
  }
  if (duration < 209.5 || duration > 210.5) {
    process.emitWarning(`Final duration is ${duration.toFixed(3)} seconds; target is 210 seconds`);
  }
}
```

- [ ] **Step 4: Implement the publishing script**

Run commands with `spawnSync()` and fail on every nonzero exit:

```bash
pnpm run prepare:fonts
pnpm exec remotion render src/index.ts GroupBuySetupV2 build/group-buy-setup-v2.raw.mp4 --codec h264 --crf 18 --pixel-format yuv420p
pnpm exec remotion ffmpeg -y -i build/group-buy-setup-v2.raw.mp4 -af loudnorm=I=-16:LRA=11:TP=-1.5 -c:v copy -c:a aac -b:a 192k ../../peps-anonymous/public/tutorials/group-buy-setup-v2.mp4
pnpm exec remotion still src/index.ts GroupBuySetupV2Poster ../../peps-anonymous/public/tutorials/group-buy-setup-v2-poster.jpg --image-format jpeg --jpeg-quality 92
```

Copy `public/voiceover/group-buy-setup-v2.vtt` to `../../peps-anonymous/public/tutorials/group-buy-setup-v2.vtt`. Create the target directory first. Write to a temporary MP4 name and rename it only after FFmpeg succeeds.

- [ ] **Step 5: Implement verification and representative frame extraction**

`verify.ts` must run FFprobe with JSON output, call `assertMediaContract()`, confirm the VTT starts with `WEBVTT`, confirm the poster has nonzero size, and extract frames at seconds `5`, `30`, `60`, `108`, `178`, and `198` into `build/verification/` using Remotion FFmpeg.

Also run a loudness analysis:

```bash
pnpm exec remotion ffmpeg -i ../../peps-anonymous/public/tutorials/group-buy-setup-v2.mp4 -af loudnorm=I=-16:LRA=11:TP=-1.5:print_format=json -f null -
```

Fail if the integrated loudness is outside `-17` to `-15` LUFS or true peak exceeds `-1.0` dBTP.

- [ ] **Step 6: Run publishing utility tests**

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video test && pnpm --filter @workspace/organiser-v2-tutorial-video typecheck`

Expected: all tests pass and TypeScript exits 0.

- [ ] **Step 7: Commit publishing and verification code**

```bash
git add artifacts/organiser-v2-tutorial-video/scripts artifacts/organiser-v2-tutorial-video/package.json
git commit -m "feat: publish and verify organiser tutorial assets"
```

### Task 10: Render, Inspect, and Publish the Final Tutorial

**Files:**
- Create: `artifacts/peps-anonymous/public/tutorials/group-buy-setup-v2.mp4`
- Create: `artifacts/peps-anonymous/public/tutorials/group-buy-setup-v2.vtt`
- Create: `artifacts/peps-anonymous/public/tutorials/group-buy-setup-v2-poster.jpg`

- [ ] **Step 1: Run the complete automated test suite before rendering**

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video test`

Expected: all video-package tests pass.

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video typecheck`

Expected: exit 0.

Run: `pnpm --filter @workspace/peps-anonymous typecheck`

Expected: exit 0, proving the output asset addition did not disturb app source.

- [ ] **Step 2: Recreate capture and narration from clean intermediates**

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video capture`

Expected: actual `/gborganiser-v2` UI capture succeeds for all seven steps.

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video voiceover`

Expected: every scene audio fits its scene and captions cover the complete narration.

- [ ] **Step 3: Render a short low-resolution proof before the full render**

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video prepare:fonts`

Expected: all three Inter font weights exist in the Remotion public directory.

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video exec remotion render src/index.ts GroupBuySetupV2 build/proof.mp4 --frames=0-899 --scale=0.25 --codec h264 --crf 23`

Expected: a 30-second proof showing the title transition into the real Basics screen with audible narration and readable captions.

- [ ] **Step 4: Render and normalize the full deliverables**

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video publish`

Expected: MP4, VTT, and poster exist in `artifacts/peps-anonymous/public/tutorials/` and no temporary filename remains there.

- [ ] **Step 5: Run automated media verification**

Run: `pnpm --filter @workspace/organiser-v2-tutorial-video verify`

Expected: H.264/AAC, 1920x1080, 30 fps, approximately 210 seconds, loudness near -16 LUFS, valid VTT, nonempty poster, and six extracted representative frames.

- [ ] **Step 6: Inspect representative frames and full playback**

Open the six files in `artifacts/organiser-v2-tutorial-video/build/verification/` and verify:

- `5s`: title card is branded and readable.
- `30s`: real Basics screen is visible and not replaced by a mockup.
- `60s`: real Products controls, cursor, and highlight are aligned.
- `108s`: real Payments controls are readable and contain only tutorial values.
- `178s`: Review summary and Edit link are visible.
- `198s`: visibility dialog and launch action are visible.

Play the final MP4 from start to finish. Confirm narration/caption sync, no clipped form controls, no blank frames, no sensitive data, and the launched workspace remains visible under the closing card.

- [ ] **Step 7: Verify the application build includes the published assets**

Run: `pnpm --filter @workspace/peps-anonymous build`

Expected: build exits 0 and the three tutorial assets are copied into the built public output.

- [ ] **Step 8: Commit final tutorial assets**

```bash
git add artifacts/peps-anonymous/public/tutorials/group-buy-setup-v2.mp4 artifacts/peps-anonymous/public/tutorials/group-buy-setup-v2.vtt artifacts/peps-anonymous/public/tutorials/group-buy-setup-v2-poster.jpg
git commit -m "feat: add organiser v2 setup tutorial video"
```

## Final Acceptance Checklist

- [ ] The actual current `/gborganiser-v2` route is visible for more than 90 percent of the video.
- [ ] All seven setup steps appear in the correct order.
- [ ] Public, Private / hidden, and Confirm launch appear in the launch dialog.
- [ ] The MP4 is 1920x1080, H.264/AAC, 30 fps, and 3:25 to 3:35 long.
- [ ] Narration is warm and clear, normalized near -16 LUFS, with no clipping.
- [ ] Burned-in captions match the VTT and never cover the active control.
- [ ] Only synthetic tutorial data appears.
- [ ] The poster comes from the real Basics screen.
- [ ] The Peps Anonymous app builds with all three published assets.
