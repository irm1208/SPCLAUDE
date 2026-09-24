# Ticket Message Photo and Video Attachments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let customers, admins, and Group Buy organisers attach private photos/videos to support-ticket messages and view them only when authorized.

**Architecture:** Store bytes in Replit App Storage and store message-linked metadata in PostgreSQL. Accept multipart uploads through the existing ticket routes, validate detected file content and size/count on the server, and stream each file from role-authorized endpoints. Reuse shared customer/admin/organiser UI components while preserving existing JSON-only text replies.

**Tech Stack:** Express 5, Multer 2 disk uploads, `@replit/object-storage`, `file-type`, Drizzle/PostgreSQL, React, TypeScript, Vitest, Node test runner.

---

## File map

- `artifacts/api-server/src/lib/ticket-attachments.ts` — limits, MIME/signature validation, actor access policy, App Storage client, message metadata reads, object cleanup.
- `artifacts/api-server/src/lib/ticket-attachments.test.ts` — validation, authorization, and storage adapter tests.
- `lib/db/src/schema/tickets.ts` — Drizzle attachment metadata table.
- `lib/db/src/schema/index.ts` already re-exports all of `tickets.ts`; no export change is needed.
- `artifacts/api-server/src/index.ts` — idempotent production startup DDL and indexes.
- `artifacts/api-server/src/startup-migrations.test.ts` — startup DDL contract test.
- `artifacts/api-server/src/routes/tickets.ts` — multipart customer/admin/organiser writes, message reads, and private download routes.
- `artifacts/api-server/src/routes/ticket-attachments.integration.test.ts` — role authorization and multipart route integration tests with mocked DB and storage.
- `artifacts/api-server/src/routes/account.ts` and `artifacts/api-server/src/routes/admin.ts` — delete stored ticket objects before account rows cascade away.
- `artifacts/peps-anonymous/src/components/TicketAttachments.tsx` — shared file picker, attachment metadata types, and authorized image/video preview.
- `artifacts/peps-anonymous/src/components/TicketAttachments.test.ts` — client file-limit and FormData tests.
- `artifacts/peps-anonymous/src/pages/CustomerPortal.tsx` — customer ticket create/reply/view.
- `artifacts/peps-anonymous/src/components/AdminTicketsTab.tsx` — admin reply/new-conversation/view.
- `artifacts/peps-anonymous/src/pages/organiser-v2/api/organiser-api.ts` — typed organiser multipart reply support.
- `artifacts/peps-anonymous/src/pages/organiser-v2/TicketsTab.tsx` — organiser V2 reply/view.
- `artifacts/peps-anonymous/src/pages/GbOrganiser.tsx` — existing Group Buy organiser reply/view.

## Task 1: Test and implement attachment validation and access policy

**Files:**
- Create: `artifacts/api-server/src/lib/ticket-attachments.test.ts`
- Create: `artifacts/api-server/src/lib/ticket-attachments.ts`

- [ ] **Step 1: Write failing tests**

Add tests for the public helper contract:

```ts
import { describe, expect, it } from "vitest";
import {
  canViewTicketAttachment,
  validateTicketAttachmentBatch,
  MAX_TICKET_ATTACHMENT_BYTES,
} from "./ticket-attachments";

describe("validateTicketAttachmentBatch", () => {
  it("allows five supported files at the exact per-file limit", () => {
    const files = Array.from({ length: 5 }, () => ({
      size: MAX_TICKET_ATTACHMENT_BYTES,
      reportedMimeType: "image/jpeg",
      detectedMimeType: "image/jpeg",
    }));
    expect(validateTicketAttachmentBatch(files)).toBeNull();
  });

  it("rejects more than five files and files larger than 20 MiB", () => {
    const valid = { size: 10, reportedMimeType: "image/png", detectedMimeType: "image/png" };
    expect(validateTicketAttachmentBatch(Array.from({ length: 6 }, () => valid)))
      .toMatch(/5 files/i);
    expect(validateTicketAttachmentBatch([{
      size: MAX_TICKET_ATTACHMENT_BYTES + 1,
      reportedMimeType: "image/png",
      detectedMimeType: "image/png",
    }])).toMatch(/20 MB/i);
  });

  it("rejects active content, unknown signatures, and MIME/signature mismatches", () => {
    expect(validateTicketAttachmentBatch([{
      size: 10, reportedMimeType: "image/svg+xml", detectedMimeType: "image/svg+xml",
    }])).toMatch(/supported/i);
    expect(validateTicketAttachmentBatch([{
      size: 10, reportedMimeType: "image/png", detectedMimeType: "text/html",
    }])).toMatch(/supported|match/i);
  });
});

describe("canViewTicketAttachment", () => {
  const ticket = { accountUsername: "customer", groupBuyOrganiserUsername: "organiser-a" };
  it("allows only the customer owner, an admin, or the owning organiser", () => {
    expect(canViewTicketAttachment({ role: "customer", username: "customer" }, ticket)).toBe(true);
    expect(canViewTicketAttachment({ role: "admin" }, ticket)).toBe(true);
    expect(canViewTicketAttachment({ role: "organiser", username: "organiser-a" }, ticket)).toBe(true);
    expect(canViewTicketAttachment({ role: "customer", username: "other" }, ticket)).toBe(false);
    expect(canViewTicketAttachment({ role: "organiser", username: "organiser-b" }, ticket)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests and verify the missing-module failure**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/ticket-attachments.test.ts`

Expected: FAIL because `ticket-attachments.ts` does not exist.

- [ ] **Step 3: Implement the tested helper contract**

Export `MAX_TICKET_ATTACHMENT_FILES = 5`, `MAX_TICKET_ATTACHMENT_BYTES = 20 * 1024 * 1024`, the viewer union `{ role: "customer"; username: string } | { role: "admin" } | { role: "organiser"; username: string }`, and `validateTicketAttachmentBatch(files)` returning `null` or a user-facing error string. Allow only `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `video/mp4`, `video/webm`, and `video/quicktime`; require detected MIME to equal the browser-reported MIME. Export `canViewTicketAttachment(viewer, ticket)` and apply the owner/admin/Group Buy organiser predicate in the test.

- [ ] **Step 4: Run the tests and commit**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/ticket-attachments.test.ts`

Expected: PASS for exact limits, over-limit values, MIME mismatch, and all three access roles.

Commit: `git add artifacts/api-server/src/lib/ticket-attachments.ts artifacts/api-server/src/lib/ticket-attachments.test.ts && git commit -m "test: define ticket attachment validation and access"`

## Task 2: Add persistent attachment metadata and startup migration

**Files:**
- Modify: `lib/db/src/schema/tickets.ts`
- Modify: `artifacts/api-server/src/index.ts`
- Modify: `artifacts/api-server/src/startup-migrations.test.ts`

- [ ] **Step 1: Add a failing startup migration contract test**

In `startup-migrations.test.ts`, add a test that reads `src/index.ts` and asserts it contains `CREATE TABLE IF NOT EXISTS ticket_message_attachments`, a `ticket_message_id` foreign key with `ON DELETE CASCADE`, `CREATE UNIQUE INDEX IF NOT EXISTS ticket_message_attachments_storage_key_unique_idx`, and `CREATE INDEX IF NOT EXISTS ticket_message_attachments_message_id_idx`. Run:

`pnpm --filter @workspace/api-server exec vitest run src/startup-migrations.test.ts`

Expected: FAIL because the table DDL is absent.

- [ ] **Step 2: Add the Drizzle table**

In `lib/db/src/schema/tickets.ts`, add `ticketMessageAttachmentsTable` with a text UUID primary key, `ticketMessageId` referencing `ticketMessagesTable.id` with cascade delete, `storageKey` with a unique index, `fileName`, `mimeType`, `sizeBytes`, and `createdAt`. Export its inferred select/insert types. Keep file bytes out of this table.

Match the existing Drizzle conventions and use this exact field shape:

```ts
export const ticketMessageAttachmentsTable = pgTable("ticket_message_attachments", {
  id: text("id").primaryKey(),
  ticketMessageId: integer("ticket_message_id").notNull()
    .references(() => ticketMessagesTable.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("ticket_message_attachments_storage_key_unique_idx").on(t.storageKey),
  index("ticket_message_attachments_message_id_idx").on(t.ticketMessageId),
]);
```

- [ ] **Step 3: Add idempotent startup DDL**

In the existing support-ticket migration block in `artifacts/api-server/src/index.ts`, create `ticket_message_attachments` with matching snake_case columns, a cascade FK to `ticket_messages(id)`, a unique object-key index, and a message-ID index. Use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.

Use this matching SQL column definition:

```sql
CREATE TABLE IF NOT EXISTS ticket_message_attachments (
  id text PRIMARY KEY,
  ticket_message_id integer NOT NULL REFERENCES ticket_messages(id) ON DELETE CASCADE,
  storage_key text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
)
```

Immediately after the table, create both indexes:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS ticket_message_attachments_storage_key_unique_idx
  ON ticket_message_attachments (storage_key);
CREATE INDEX IF NOT EXISTS ticket_message_attachments_message_id_idx
  ON ticket_message_attachments (ticket_message_id);
```

- [ ] **Step 4: Run migration/schema checks**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/startup-migrations.test.ts
pnpm run typecheck:libs
pnpm --filter @workspace/api-server run typecheck
```

Expected: all commands pass; startup migration test confirms the table and both indexes are idempotently declared.

- [ ] **Step 5: Commit**

Commit with `git add lib/db/src/schema/tickets.ts artifacts/api-server/src/index.ts artifacts/api-server/src/startup-migrations.test.ts && git commit -m "feat: add ticket attachment metadata table"`.

## Task 3: Implement private App Storage operations and content-signature checks

**Files:**
- Modify: `artifacts/api-server/package.json` and `pnpm-lock.yaml`
- Modify: `artifacts/api-server/src/lib/ticket-attachments.ts`
- Modify: `artifacts/api-server/src/lib/ticket-attachments.test.ts`

- [ ] **Step 1: Write failing storage adapter tests**

Use an injected fake client to test that a verified file is saved under a server-generated key, `fileTypeFromBuffer` detects a real PNG signature and rejects HTML bytes, an App Storage `{ ok: false }` result throws an error, `downloadAsBytes` returns only bytes from an existing key, and deletion checks the SDK result. Do not test the vendor SDK itself.

- [ ] **Step 2: Run storage tests before implementation**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/ticket-attachments.test.ts`

Expected: FAIL because the storage operations are not exported.

- [ ] **Step 3: Add the official SDK and file-signature parser**

Read `.local/skills/package-management/SKILL.md`, then add `@replit/object-storage` and `file-type` to `@workspace/api-server` with the package manager prescribed there. Use a `Client` instance and the documented methods `uploadFromBytes(objectName, contents, options?)`, `downloadAsBytes(objectName)`, and `delete(objectName)`; check every result's `ok` flag. Use `fileTypeFromBuffer` to compare detected bytes with the allowlisted MIME type before upload. Process files sequentially so only one 20-MB buffer is held for each storage upload.

Keep the SDK behind an injectable, narrow interface:

```ts
export interface TicketObjectStore {
  uploadFromBytes(key: string, bytes: Buffer, options?: unknown): Promise<{ ok: boolean; error?: unknown }>;
  downloadAsBytes(key: string): Promise<{ ok: boolean; value?: Buffer; error?: unknown }>;
  delete(key: string): Promise<{ ok: boolean; error?: unknown }>;
}
```

- [ ] **Step 4: Run helper and type checks**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/ticket-attachments.test.ts && pnpm --filter @workspace/api-server run typecheck`

Expected: PASS with the fake storage client and compile against the installed SDK types.

- [ ] **Step 5: Commit**

Commit the package files and storage adapter with `git add artifacts/api-server/package.json pnpm-lock.yaml artifacts/api-server/src/lib/ticket-attachments.ts artifacts/api-server/src/lib/ticket-attachments.test.ts && git commit -m "feat: add private ticket attachment storage"`.

## Task 4: Add role-scoped multipart ticket routes and account cleanup

**Files:**
- Modify: `artifacts/api-server/src/routes/tickets.ts`
- Create: `artifacts/api-server/src/routes/ticket-attachments.integration.test.ts`
- Modify: `artifacts/api-server/src/routes/account.ts`
- Modify: `artifacts/api-server/src/routes/admin.ts`

- [ ] **Step 1: Write failing route tests**

Create an Express test app mounting the ticket router, with the same Vitest DB-module mock pattern used by `public-registration.integration.test.ts`. Inject a fake storage client. Cover multipart customer ticket creation, customer and admin replies, organiser replies, metadata in all three role GET responses, customer ownership, admin authentication, organiser Group Buy ownership, an unowned organiser receiving 403, invalid file count/type/size returning 400 without ticket/message writes, and account deletion aborting before cascade when App Storage deletion fails. Assert uploaded object cleanup when a metadata insert fails.

- [ ] **Step 2: Run the route tests and verify expected failures**

Run: `pnpm --filter @workspace/api-server exec vitest run src/routes/ticket-attachments.integration.test.ts`

Expected: FAIL because attachment routes and metadata persistence do not exist.

- [ ] **Step 3: Add multipart middleware after role authentication**

Use Multer disk storage with `os.tmpdir()` and UUID temporary filenames. Set `limits.files` to 5 and `limits.fileSize` to `20 * 1024 * 1024`. Attach the middleware after customer cookie authentication, `requireAdmin`, or `requireAccount` plus `requireOrganiser`, so unauthenticated requests do not write temporary files. Convert Multer errors to JSON 400 responses and remove any temporary files already written when Multer rejects a request. Always remove successfully parsed temporary files in `finally`.

Wire customer middleware in this order:

```ts
router.post(
  "/account/tickets/:id/messages",
  requireTicketCustomer,
  parseTicketFiles,
  postCustomerTicketMessage,
);
```

`requireTicketCustomer` verifies `getAccountFromCookie(req)` and stores the username in `res.locals` before calling `next()`; the admin and organiser routes put their existing auth middleware before `parseTicketFiles`.

- [ ] **Step 4: Implement persistence and all message reads/writes**

For each authorized write, validate `req.files` with `fileTypeFromBuffer`, upload to keys generated as `ticket-attachments/<ticket-id>/<uuid>.<detected-extension>`, then insert the message and metadata in a database transaction. If upload or database work fails, delete every object already uploaded and do not leave a partial message. Preserve JSON request support and existing required text bodies.

For multipart requests, Multer populates the same body field used by the current Zod parser:

```ts
const parsed = PostTicketMessageBody.safeParse(req.body);
if (!parsed.success) {
  return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request body" });
}
const messageBody = parsed.data.body.trim();
```

Add a `loadTicketMessagesWithAttachments(ticketId)` helper that fetches messages in timestamp order, fetches their metadata in one query, and returns each message with `attachments: []` or metadata containing only `id`, `fileName`, `mimeType`, `sizeBytes`, and `createdAt`; keep `storageKey` server-only. Use it for customer, admin, and organiser thread GETs and in all three message POST responses. Add private byte routes for `/account/tickets/:id/attachments/:attachmentId`, `/admin/tickets/:id/attachments/:attachmentId`, and `/organiser/tickets/:id/attachments/:attachmentId`; verify the attachment belongs to that ticket before streaming, then enforce customer ownership, `requireAdmin`, or Group Buy organiser ownership. Set response `Content-Type` from verified metadata, `X-Content-Type-Options: nosniff`, and a sanitized inline filename.

- [ ] **Step 5: Clean App Storage objects before account cascades**

Add a helper that finds object keys through `tickets.account_username -> ticket_messages -> ticket_message_attachments` for the requested username(s), deletes the private objects, and fails the account-deletion request if storage cleanup fails. Call it before the account row deletion in member self-deletion and every admin account-removal path, including bulk deletion and source-account removal.

- [ ] **Step 6: Run route, startup, and type checks**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/routes/ticket-attachments.integration.test.ts src/lib/ticket-attachments.test.ts src/startup-migrations.test.ts
pnpm --filter @workspace/api-server run typecheck
```

Expected: all tests pass; typecheck has no new errors.

- [ ] **Step 7: Commit**

Commit the route, helper, and account cleanup changes with `git add artifacts/api-server/src/routes/tickets.ts artifacts/api-server/src/routes/ticket-attachments.integration.test.ts artifacts/api-server/src/routes/account.ts artifacts/api-server/src/routes/admin.ts artifacts/api-server/src/lib/ticket-attachments.ts artifacts/api-server/src/lib/ticket-attachments.test.ts && git commit -m "feat: support private ticket message attachments"`.

## Task 5: Build shared attachment picker and viewer

**Files:**
- Create: `artifacts/peps-anonymous/src/components/TicketAttachments.tsx`
- Create: `artifacts/peps-anonymous/src/components/TicketAttachments.test.ts`

- [ ] **Step 1: Write failing UI helper tests**

Test a pure `validateTicketFiles(files)` helper for 5-file/20-MB limits and supported browser MIME types, and a `buildTicketMessageFormData(textField, text, files)` helper that appends the requested text field and repeats the `files` field once per selected file. Assert `"body"`, `"description"`, and `"message"` are preserved for replies, customer ticket creation, and admin-started conversations.

- [ ] **Step 2: Run tests and verify the missing-module failure**

Run: `pnpm --filter @workspace/peps-anonymous exec tsx --test src/components/TicketAttachments.test.ts`

Expected: FAIL because the shared component/helper file does not exist.

- [ ] **Step 3: Implement the shared components**

Export `TicketAttachmentMetadata`, `validateTicketFiles`, `buildTicketMessageFormData`, `TicketAttachmentPicker`, and `TicketMessageAttachments`. The picker accepts `File[]`, announces the 5-file/20-MB rules, uses an `image/*,video/*` file input, lists names and sizes, supports per-file removal, and disables input while sending. Reject unsupported browser MIME values with a visible message. While a request is active, show an indeterminate “Uploading…” label/spinner; show server validation and network errors beside the composer.

The message viewer fetches each binary from the supplied role-scoped URL with `credentials: "include"` and optional admin headers, creates object URLs, and revokes them on unmount. Render verified raster images as `<img>` and videos as `<video controls playsInline>`; show filename and an unavailable state if retrieval fails. Never render a storage URL.

Use one shared FormData builder for every role:

```ts
export function buildTicketMessageFormData(
  textField: "body" | "description" | "message",
  text: string,
  files: File[],
): FormData {
  const form = new FormData();
  form.append(textField, text);
  for (const file of files) form.append("files", file);
  return form;
}
```

Use `"body"` for replies, `"description"` for a customer-created ticket, and `"message"` for an admin-started conversation.

- [ ] **Step 4: Verify shared component tests and typecheck**

Run:

```bash
pnpm --filter @workspace/peps-anonymous exec tsx --test src/components/TicketAttachments.test.ts
pnpm --filter @workspace/peps-anonymous run typecheck
```

Expected: tests and typecheck pass.

- [ ] **Step 5: Commit**

Commit with `git add artifacts/peps-anonymous/src/components/TicketAttachments.tsx artifacts/peps-anonymous/src/components/TicketAttachments.test.ts && git commit -m "feat: add shared ticket attachment controls"`.

## Task 6: Connect customer and admin ticket interfaces

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/CustomerPortal.tsx`
- Modify: `artifacts/peps-anonymous/src/components/AdminTicketsTab.tsx`

- [ ] **Step 1: Add customer attachment metadata to ticket-message types and render tests**

Add `attachments?: TicketAttachmentMetadata[]` to customer/admin message types. Add focused tests that `buildTicketMessageFormData("description", ...)`, `buildTicketMessageFormData("body", ...)`, and `buildTicketMessageFormData("message", ...)` preserve the exact text field plus all selected file parts.

- [ ] **Step 2: Wire customer ticket create/reply**

Add selected-file state and `TicketAttachmentPicker` to new-ticket and open-ticket composers. For ticket creation, build FormData with `buildTicketMessageFormData("description", description.trim(), files)`, then append the existing `category`, `subject`, and optional `groupBuyId`/`issueType` values. For replies, use `buildTicketMessageFormData("body", replyBody.trim(), files)`. Submit to `/api/account/tickets` and `/api/account/tickets/:id/messages` without manually setting `Content-Type`; show “Uploading…” while the request is active and clear files only after a successful response. Render `TicketMessageAttachments` for each message using `/api/account/tickets/${ticket.id}/attachments/${attachment.id}`. Keep existing required text and closed-ticket guards.

- [ ] **Step 3: Wire admin reply and new conversation**

Add selected-file state and picker to admin reply and `NewConversationForm`. For a reply use `buildTicketMessageFormData("body", replyBody.trim(), files)`; for a new conversation use `buildTicketMessageFormData("message", message.trim(), files)` and append the existing `username`, `category`, and `subject`. Submit with the existing `x-admin-secret` header to `/api/admin/tickets/:id/messages` and `/api/admin/tickets`; do not set `Content-Type`. Show “Uploading…” while sending. Render message attachments using the admin download endpoint and the same admin secret header. Clear selection on successful response only.

- [ ] **Step 4: Run frontend checks**

Run:

```bash
pnpm --filter @workspace/peps-anonymous exec tsx --test src/components/TicketAttachments.test.ts
pnpm --filter @workspace/peps-anonymous run typecheck
```

Expected: both pass with customer/admin requests and attachment metadata typed.

- [ ] **Step 5: Commit**

Commit with `git add artifacts/peps-anonymous/src/pages/CustomerPortal.tsx artifacts/peps-anonymous/src/components/AdminTicketsTab.tsx && git commit -m "feat: add customer and admin ticket attachments"`.

## Task 7: Connect both Group Buy organiser ticket interfaces

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/api/organiser-api.ts`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/api/organiser-api.test.ts`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/TicketsTab.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/GbOrganiser.tsx`

- [ ] **Step 1: Add failing organiser request tests**

Extend `organiser-api.test.ts` to call `organiserRequest` with a `FormData` body and assert that the `fetch` request preserves the exact `FormData` object and does not add `Content-Type: application/json`; retain the current JSON serialization test.

- [ ] **Step 2: Run the request test and verify it fails**

Run: `pnpm --filter @workspace/peps-anonymous exec tsx --test src/pages/organiser-v2/api/organiser-api.test.ts`

Expected: FAIL because `organiserRequest` currently JSON-stringifies every body.

- [ ] **Step 3: Support raw FormData in the organiser API helper**

In `organiserRequest`, detect `options.body instanceof FormData`. For FormData, do not set a content-type header and pass the FormData directly as `RequestInit.body`. For all other bodies, preserve the existing JSON header and `JSON.stringify` behavior. Add `attachments?: TicketAttachmentMetadata[]` to `ApiTicketMessage`. Add an optional FormData path to `replyTicket`.

Use an explicit body branch so existing JSON requests retain their behavior:

```ts
const formBody = typeof FormData !== "undefined" && options.body instanceof FormData;
if (hasBody && !formBody && !headers.has("content-type")) {
  headers.set("content-type", "application/json");
}
const body = !hasBody
  ? undefined
  : formBody
    ? options.body as FormData
    : JSON.stringify(options.body);
```

Keep the `replyTicket` method backward compatible with its current string argument:

```ts
replyTicket: (ticketId: string, body: string | FormData) => request<ApiTicketMessage>(
  `/organiser/tickets/${encodeURIComponent(ticketId)}/messages`,
  { method: "POST", body: body instanceof FormData ? body : { body } },
),
```

- [ ] **Step 4: Wire organiser V2 and legacy replies and views**

Add selected-file state/picker to both organiser ticket reply composers. Use `organiserApi.replyTicket(activeId, formData)` in V2 and multipart `fetch` in `GbOrganiser.tsx`. Render message attachments in both interfaces using `/api/organiser/tickets/${ticketId}/attachments/${attachment.id}`. Show “Uploading…” while sending and clear selected files only after successful replies; keep the open-ticket and body requirements unchanged.

- [ ] **Step 5: Run organiser, frontend, and API tests**

Run:

```bash
pnpm --filter @workspace/peps-anonymous exec tsx --test src/pages/organiser-v2/api/organiser-api.test.ts src/components/TicketAttachments.test.ts
pnpm --filter @workspace/peps-anonymous run typecheck
pnpm --filter @workspace/api-server exec vitest run src/routes/ticket-attachments.integration.test.ts
```

Expected: all pass; FormData remains unmodified and organizer access stays limited to their own Group Buys.

- [ ] **Step 6: Commit**

Commit with `git add artifacts/peps-anonymous/src/pages/organiser-v2/api/organiser-api.ts artifacts/peps-anonymous/src/pages/organiser-v2/api/organiser-api.test.ts artifacts/peps-anonymous/src/pages/organiser-v2/TicketsTab.tsx artifacts/peps-anonymous/src/pages/GbOrganiser.tsx && git commit -m "feat: add organiser ticket attachments"`.

## Task 8: Full verification

**Files:** no new files.

- [ ] **Step 1: Run complete API tests and typecheck**

Run:

```bash
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server run build:compile
```

Expected: both complete successfully.

- [ ] **Step 2: Run customer app tests, typecheck, and production build**

Run:

```bash
pnpm --filter @workspace/peps-anonymous run test
pnpm --filter @workspace/peps-anonymous run test:domain
pnpm --filter @workspace/peps-anonymous run typecheck
pnpm --filter @workspace/peps-anonymous run build
```

Expected: tests, typecheck, and Vite production build pass.

- [ ] **Step 3: Restart and inspect the configured application workflow**

Restart only `Start application`, then inspect startup and browser logs. Open customer support, admin tickets, and both organiser ticket interfaces. Confirm a customer upload is visible to admin and the owning organiser, an organiser upload is visible to customer/admin, a non-owning organiser cannot fetch the same attachment, a 6-file or >20-MB file submission gets a clear error, and a text-only reply still works.

- [ ] **Step 4: Review final diff and commit verification fixes**

Run `git diff --check` and `git status --short`. Resolve any remaining failures before reporting completion; do not modify unrelated order or payment behavior.