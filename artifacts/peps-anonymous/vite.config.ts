import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  base: basePath,
  define: {
    'import.meta.env.VITE_ADMIN_PASSWORD': JSON.stringify(process.env.VITE_ADMIN_PASSWORD ?? ''),
  },
  // Pre-scan every page so Vite completes dep optimisation in ONE pass at
  // startup rather than restarting each time a new import is discovered during
  // navigation. Without this, the first visit to each page triggers a new
  // optimisation round whose chunks can take >30s to build, exceeding the
  // Replit edge proxy timeout and returning 504s on the .replit.dev domain.
  optimizeDeps: {
    entries: [
      "src/pages/AccountOrderDetail.tsx",
      "src/pages/AccountOrders.tsx",
      "src/pages/Admin.tsx",
      "src/pages/BloodTests.tsx",
      "src/pages/Calculator.tsx",
      "src/pages/Compounds.tsx",
      "src/pages/CustomerPortal.tsx",
      "src/pages/EndotoxinCalculator.tsx",
      "src/pages/Feedback.tsx",
      "src/pages/FHRiskCalculator.tsx",
      "src/pages/GbLegKits.tsx",
      "src/pages/GbLegViewer.tsx",
      "src/pages/GbOrganiser.tsx",
      "src/pages/GbOrganiserV2.tsx",
      "src/pages/GbQrViewer.tsx",
      "src/pages/GbTestingPool.tsx",
      "src/pages/GbTestingResults.tsx",
      "src/pages/Groups.tsx",
      "src/pages/GuestContribution.tsx",
      "src/pages/Home.tsx",
      "src/pages/InsulinResistanceCalculator.tsx",
      "src/pages/JanoshikReceiver.tsx",
      "src/pages/LabTests.tsx",
      "src/pages/Learn.tsx",
      "src/pages/LearnCourse.tsx",
      "src/pages/LearnLesson.tsx",
      "src/pages/LiverRiskCalculator.tsx",
      "src/pages/Login.tsx",
      "src/pages/Lookup.tsx",
      "src/pages/MedDetail.tsx",
      "src/pages/Members.tsx",
      "src/pages/not-found.tsx",
      "src/pages/OrderForm.tsx",
      "src/pages/Packages.tsx",
      "src/pages/PeptideDetail.tsx",
      "src/pages/PeptideExplorer.tsx",
      "src/pages/Protocols.tsx",
      "src/pages/PrototypeCalculator.tsx",
      "src/pages/PrototypeHome.tsx",
      "src/pages/PrototypeLabTests.tsx",
      "src/pages/PrototypeLearn.tsx",
      "src/pages/PrototypeProtocols.tsx",
      "src/pages/PrototypeSupplements.tsx",
      "src/pages/PrototypeTestingPools.tsx",
      "src/pages/ProtoypeAdmin.tsx",
      "src/pages/PublicTestingPools.tsx",
      "src/pages/ReconstitutionCalculator.tsx",
      "src/pages/Reshipper.tsx",
      "src/pages/ReshipperApply.tsx",
      "src/pages/Review.tsx",
      "src/pages/SagePage.tsx",
      "src/pages/SellerDashboard.tsx",
      "src/pages/Shop.tsx",
      "src/pages/ShopCheckout.tsx",
      "src/pages/Success.tsx",
      "src/pages/TestingPool.tsx",
      "src/pages/TrackingPage.tsx",
      "src/pages/WholesaleOrder.tsx",
      "src/pages/WholesaleShared.tsx",
      "src/pages/WholesaleShareEntry.tsx",
    ],
  },
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    // Escape hatch for inotify watch exhaustion (fs.inotify.max_user_watches
    // too low + VS Code consuming the table): VITE_NO_WATCH=1 disables file
    // watching entirely so the server can run. HMR/auto-reload won't work in
    // this mode — restart without the flag once the limit is raised.
    watch: process.env.VITE_NO_WATCH ? null : undefined,
    // On Replit the dev server is fronted by an HTTPS proxy on :443, so the
    // HMR client must connect over wss:443. On localhost there is no proxy, so
    // fall back to Vite's default HMR (ws over the dev-server port). A hardcoded
    // wss:443 here silently breaks HMR locally, which also swallows runtime
    // errors reported over the HMR socket (blank screen with no overlay).
    hmr:
      process.env.REPL_ID !== undefined
        ? { clientPort: 443, protocol: "wss" }
        : true,
    headers: {
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${process.env.API_PORT ?? "5000"}`,
        changeOrigin: true,
      },
      "/__mockup": {
        target: "http://127.0.0.1:8081",
        changeOrigin: true,
        ws: true,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    headers: {
      "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://telegram.org https://challenges.cloudflare.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "connect-src 'self' https: wss:",
        "img-src 'self' data: blob: https:",
        "frame-src 'self' blob: https://trocador.app https://challenges.cloudflare.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  },
});
