# Peps Anonymous

Peps Anonymous is a mobile-first peptide product ordering website functioning as a multi-product order form, allowing customers to order, track, and manage their peptide products.

## Run & Operate

To run the application, use the following commands:
- **Build**: `npm run build` (builds frontend and API server)
- **Run**: `npm start` (starts API server, serving frontend; performs `drizzle-kit push --force` at startup)
- **Typecheck**: `pnpm typecheck`
- **Codegen**: `pnpm --filter @workspace/api-spec run codegen` (generates API client and Zod schemas)
- **DB Push**: `pnpm --filter @workspace/db run push` or `push-force`

**Required Environment Variables**:
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Port for the API server
- `BASE_PATH`: Base path for Vite apps
- `ADMIN_SECRET`: Admin panel secret key
- `ACCOUNT_JWT_SECRET`: JWT signing secret for customer sessions
- `VENDOR_SHIPPING_PRICE`: Vendor shipping fee added to orders

**Optional Environment Variables**:
- `TELEGRAM_BOT_TOKEN`: Telegram Bot API token for notifications
- `TELEGRAM_ADMIN_CHAT_ID`: Admin Telegram chat for order alerts
- `ORDER_PIN`: Optional global PIN gate for order creation

## Stack

- **Frontend**: React 18, Vite, Wouter, TanStack React Query, shadcn/ui, Radix UI, Tailwind CSS v4
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
- **Database Schema**: `lib/db/schema.ts` (source of truth for Drizzle ORM)
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
- **Group Buy System**: Coordinated bulk orders with organiser management.
- **Lab Test Integration**: Display of Janoshik CoA results.
- **Product Catalog**: Over 126 peptide products, dynamic pricing, and a "Lonely Vial" secondary shop.
- **Health Intelligence Engine**: Member-facing insights derived from blood tests and compound logs (consent-based).
- **Interactive 3D Molecule Viewer**: Visualizes molecular structures on compound detail pages using PubChem data.
- **GLP-1 Tracker Redesign**: iOS-style interface for tracking GLP-1 shots, including summary, history, and settings.
- **Profile Hub Dashboard**: Redesigned customer portal with a two-column layout for desktop, incorporating orders, group buys, compounds, and blood tests.

## User preferences

Preferred communication style: Simple, everyday language.

## Gotchas

- **DB Schema Push on Startup**: The `npm start` command includes `drizzle-kit push --force`, which modifies the production database schema. Ensure this is intentional for your deployment strategy.
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
