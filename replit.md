# Salt&Peps

Salt&Peps is a mobile-first peptide product ordering website functioning as a multi-product order form, allowing customers to order, track, and manage their peptide products.

## Run & Operate

Replit's **Start application** workflow runs `bash start.sh`. It starts the API
server on port 8080, the Vite frontend on an internal port, and exposes the web
preview on port 5000.

To run the project from the workspace:
- **Install dependencies**: `pnpm install --frozen-lockfile`
- **Run**: `bash start.sh`
- **Build**: `pnpm build` (builds frontend and API server)
- **Typecheck**: `pnpm typecheck`
- **Codegen**: `pnpm --filter @workspace/api-spec run codegen` (generates API client and Zod schemas)
- **DB Push**: `pnpm --filter @workspace/db run push` or `push-force`

The connected development database must already contain the project's schema.
`DB Push` changes that persistent database, so review and intentionally run it
when setting up a fresh or empty database; restart **Start application**
afterward so the app can seed and use the new tables.

**Required Environment Variables**:
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Port for the API server
- `BASE_PATH`: Base path for Vite apps
- `ADMIN_SECRET`: Admin panel secret key
- `ACCOUNT_JWT_SECRET`: JWT signing secret for customer sessions
- `VENDOR_SHIPPING_PRICE`: Vendor shipping fee added to orders
- `DB_BACKUP_ENCRYPTION_KEY`: A base64-encoded key containing exactly 32
  cryptographically random bytes. Production encrypted backups and restore
  verification require this secret; generate and store it as a Replit Secret,
  and never commit or print its value.

**Optional Environment Variables**:
- `TELEGRAM_BOT_TOKEN`: Telegram Bot API token for notifications
- `TELEGRAM_ADMIN_CHAT_ID`: Admin Telegram chat for order alerts
- `VENDOR_TELEGRAM_BOT_TOKEN`: Separate bot for vendor portal alerts (new shipments, holds, overdue, answered problem reports). Vendors link a chat from Settings → Telegram notifications. Alternatively store it in site config as `vendorTelegramBotToken`.
- `VENDOR_TELEGRAM_BOT_USERNAME`: Optional; skips the getMe lookup when building `t.me` link URLs for the vendor bot
- `ORDER_PIN`: Optional global PIN gate for order creation

### Database backup operations

- Production creates an encrypted database backup every six hours and uploads
  it to Google Drive.
- One hour after production startup, the newest backup is restored into a
  disposable PostgreSQL instance and validated. Real restore verification then
  runs weekly. Failures generate generic alerts and admin notifications without
  exposing database output, credentials, backup contents, or encryption keys.
- Run verification manually from `artifacts/api-server` with:
  `pnpm exec tsx -e 'import("./src/lib/db-backup-verifier.ts").then(async ({ runLatestBackupVerification }) => console.log(await runLatestBackupVerification()))'`
- Restore verification remains compatible with legacy plain SQL and gzip
  backups. New backups use authenticated encryption.
- Local failed-upload cleanup is limited to known encrypted temporary
  artifacts. The application does not delete backups from remote storage or
  enforce remote retention; manage Google Drive retention operationally.

## Testmedaddy (separate product)

`artifacts/testmedaddy` is an independent site (own brand, own accounts, own `tmd_*`
tables) served by the same API under `/api/tmd/*` only. In development it runs on
port 21505 (external 3002) from `start.sh`; in production the API serves its build on
the hosts in `TESTMEDADDY_HOSTS` and blocks every other API path there.

- `TESTMEDADDY_HOSTS`: comma-separated hosts (default `testmedaddy.com,www.testmedaddy.com`)
- `TMD_PUBLIC_URL`: public origin used in emails (default derived from the dev domain)
- `TMD_FROM_EMAIL`: Resend sender for Testmedaddy mail (falls back to `RESEND_FROM_EMAIL`)
- `TMD_REQUIRE_EMAIL_VERIFICATION=1`: require a confirmed email before hosting a pool
- `TESTMEDADDY_DEV=0`: skip starting the Testmedaddy dev server from `start.sh`
- Telegram: `TMD_TELEGRAM_BOT_TOKEN` (+ optional `TMD_TELEGRAM_BOT_USERNAME`). Its own bot, webhook
  `/api/tmd/telegram/webhook` (registered at boot when `TMD_PUBLIC_URL` is set). Users link with
  `/start CODE` in a private chat; organisers add the bot to a group (as admin, so it sees messages)
  and send `/link CODE` to bridge the pool chat with the group.
- Payments: organiser wallets only. USDT/USDC on Ethereum, Arbitrum, Polygon, BNB Chain, Solana and Tron, plus
  native ETH, SOL and BTC, all auto-verified on-chain by `lib/tmd-payment-auto-verify.ts` through the shared
  `verifyTransaction`. Volatile coins are quoted at the live CoinGecko price when the member pays
  (`GET /api/tmd/pools/:slug/quote`), the coin amount is locked on the member row and verified against that.
  AnonPay is polled; Revolut/PayPal screenshots are confirmed by the organiser. Stripe and an escrow wallet were
  built and then removed at the user's request (2026-11-01); no card or platform-held money paths remain.
- Tests: `pnpm --filter @workspace/api-server exec vitest run src/lib/tmd-*.test.ts src/middleware/tmd-auth.test.ts src/lib/site-domain-policy.tmd.test.ts`;
  the DB-backed lifecycle tests (pools, Telegram bridge) run with `TMD_DB_TESTS=1`.

## Stack

- **Frontend**: React 19, Vite, Wouter, TanStack React Query, shadcn/ui, Radix UI, Tailwind CSS v4
- **Backend**: Express 5 (ESM, TypeScript), esbuild
- **ORM**: Drizzle ORM (with `drizzle-kit`)
- **Database**: PostgreSQL
- **Validation**: Zod (auto-generated)
- **Build Tool**: pnpm (monorepo workspaces)
- **Runtime**: Node.js (via Replit Autoscale)
- **Type Checking**: TypeScript 5.9 (strict mode)

## Where things live

- **Frontend App**: `artifacts/peps-anonymous`
- **API Server**: `artifacts/api-server`
- **Database Schema**: `lib/db/src/schema/index.ts` (source of truth for Drizzle ORM)
- **API Specification**: `lib/api-spec/openapi.yaml` (source of truth for API contracts)
- **Auto-generated API Client (React Query hooks)**: `lib/api-client-react`
- **Auto-generated API Validation (Zod schemas)**: `lib/api-zod`
- **UI Prototyping Sandbox**: `artifacts/mockup-sandbox`
- **Utility Scripts**: `scripts/` (e.g., `import-csv.ts`)
- **Root `.replit` file**: Handles deployment and project configuration.

## Architecture decisions

- **Monorepo with pnpm workspaces**: Facilitates shared code (`lib/`) and independent deployment units (`artifacts/`).
- **OpenAPI + Orval for API contracts**: `openapi.yaml` is the single source of truth, generating type-safe client and server code for consistency.
- **Drizzle ORM for PostgreSQL**: Provides type-safe SQL queries and schema management while maintaining SQL-like syntax.
- **Strict security measures**: Layered security including Helmet.js, rate limiting, timing-safe comparisons, DB-level lockouts, and JWT for customer sessions.
- **Lazy loading of external 3Dmol.js**: Improves initial page load performance on compound detail pages.
- **Custom fetch in API client**: Standardizes error handling and response parsing across all API calls.

## Product

- **Core Ordering System**: Multi-product order form, delivery selection, tipping, order submission via Telegram username + PIN.
- **Order Management**: Customers can look up and edit existing orders.
- **Admin Panel**: Comprehensive dashboard with KPIs, analytics, bulk shipment tools, audit logs, and Telegram notifications.
- **Account System**: JWT-based authentication for customer accounts.
- **Group Buy System**: Coordinated bulk orders with organiser management, with an optional paid entry fee (admin/organiser-configured fixed amount) required before a customer's join request is granted membership.
- **Lab Test Integration**: Display of Janoshik CoA results.
- **Product Catalog**: Over 126 peptide products, dynamic pricing, and a "Lonely Vial" secondary shop.
- **Health Intelligence Engine**: Member-facing insights derived from blood tests and compound logs (consent-based).
- **Interactive 3D Molecule Viewer**: Visualizes molecular structures on compound detail pages using PubChem data.
- **GLP-1 Tracker Redesign**: iOS-style interface for tracking GLP-1 shots, including summary, history, and settings.
- **Profile Hub Dashboard**: Redesigned customer portal with a two-column layout for desktop, incorporating orders, group buys, compounds, and blood tests.

## User preferences

Preferred communication style: Simple, everyday language.

## One-time ops: Telegram Login Widget

The Telegram Login Widget requires the **production domain** to be whitelisted with BotFather before it will render:

1. Open a chat with [@BotFather](https://t.me/botfather) on Telegram.
2. Send `/setdomain` and select your bot.
3. Enter the production domain (e.g. `pepsanonymous.com`) — no `https://` prefix, no trailing slash.
4. Once done, enable the widget in the admin panel: go to **Admin → Site Config** and toggle `telegramWidgetEnabled` to `true` (or call `PATCH /api/admin/config/telegram-widget-enabled` with `{ "enabled": true }`).

Until step 4 is done the widget is hidden site-wide and users see only the deep-link fallback button, which always works.

## Dependency upgrades (read before touching package.json or pnpm-lock.yaml)
- Follow `docs/dependency-upgrade-plan.md`. Same-major updates only (`pnpm update -r`), one branch, commit the lockfile, full build + typecheck + tests + API start before any publish. Never `--latest`, never regenerate the lockfile during a build or publish.
- Major steps (pdfjs-dist 6, zod 4, drizzle-kit/esbuild, example-project packages) are one package per branch and need the owner's approval first.
- Baseline fixed on 5 Nov 2026: `packageManager` pinned to pnpm@10.15.1; `scripts/deploy.sh` installs with `--frozen-lockfile`; `pg` and `vitest` declared where imported; `lib/*/tsconfig.tsbuildinfo` untracked (run `pnpm run typecheck:libs` before package typechecks); Vitest excludes node:test files. The example projects crypto-payment-kit (Open Crypto Checkout starter) and group-buy-refund-tutorial were removed on 8 Nov 2026 by owner decision: neither was imported by the site, together they held most of the remaining advisories, and the kit was the only package demanding Node 22. Live crypto payments are in artifacts/api-server/src/lib (payment-verify, anonpay-order, crypto-pricing). Tier 2 majors done the same day: pdfjs-dist 6 (browser-only; declares Node >= 22, pnpm is not engine-strict so Node 20 installs with a warning), csv-parse 7, zod 4 with drizzle-zod 0.8. The remaining eight advisories were closed with scoped `pnpm.overrides` in the root package.json (uuid 11 under jayson/teeny-request/gaxios/exceljs, stream-json 3 under jayson, postcss-selector-parser 6.1 under @tailwindcss/typography, esbuild 0.25 under @esbuild-kit/core-utils) and esbuild ^0.28 in api-server. `pnpm audit` is clean: 0 / 0 / 0 / 0. Note for future installs: put overrides in root package.json `pnpm.overrides`; the `overrides:` block in pnpm-workspace.yaml is not applied by pnpm 10 here.

## Gotchas

- **DB Schema Setup**: `bash start.sh` does not push the database schema. For a fresh development database, intentionally run `pnpm --filter @workspace/db run push-force`, then restart the application so seed data can be created.
- **API Server Port**: The API server requires the `PORT` environment variable to be set.
- **Admin Secret Header**: Admin requests require `X-Admin-Secret` header for authentication; never include it in the request body.
- **Pnpm Required**: The project exclusively uses `pnpm` as the package manager; `npm` or `yarn` will be blocked by a `preinstall` script.
- **Historical Data Import**: The `import-csv.ts` script can be re-run, but be aware it uses `ON CONFLICT` for existing data.
- **Rate Limiting**: Be aware of `express-rate-limit` tiers for global, strict, admin, and auth routes.
- **Organiser ID**: `organiserId` in `group_buys`, `products`, `lab_tests` tables is a plain text field, not a foreign key.

## Pointers

- **OpenAPI Documentation**: Refer to `lib/api-spec/openapi.yaml` for the complete API contract.
- **Drizzle ORM Documentation**: [https://orm.drizzle.team/](https://orm.drizzle.team/)
- **TanStack React Query Documentation**: [https://tanstack.com/query/latest](https://tanstack.com/query/latest)
- **Tailwind CSS Documentation**: [https://tailwindcss.com/docs](https://tailwindcss.com/docs)
- **Shadcn/ui Documentation**: [https://ui.shadcn.com/docs](https://ui.shadcn.com/docs)
- **3Dmol.js Documentation**: [https://3dmol.csb.pitt.edu/](https://3dmol.csb.pitt.edu/)
- **PubChem PUG REST Documentation**: [https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest](https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest)
- **Google Sheets Integration Guide**: `google-sheets-setup.md`
