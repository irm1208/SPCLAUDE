# Ticket message photo and video attachments

## Goal

Allow customers and admins to attach photos or videos to support-ticket messages. Attachments are part of the message thread, appear to both sides, and are supported on new tickets as well as replies. Keep existing text-only tickets and replies working.

## User experience

- Customers can select up to 5 photos/videos (20 MB each) when creating a ticket or replying to an open ticket.
- Admins can select the same files when replying or starting a conversation for a customer.
- The composer shows selected filenames, allows removing a selected file, prevents sending over the limits, and shows upload and validation errors.
- Each thread message displays its own attachments. Images have an inline preview; videos have browser playback controls.
- Closed-ticket reply behavior remains unchanged.
- Existing messages have no attachments and continue to render as text.

## Data and storage

- Use Replit App Storage for file bytes; do not store file bytes or base64 in PostgreSQL.
- Add a ticket-message attachment table that records the message ID, private App Storage object key, original display filename, MIME type, byte size, and creation time.
- Add the matching Drizzle schema and an idempotent production startup migration.
- Keep attachment metadata with the associated message so message and ticket deletion clean up database references through foreign keys. Remove uploaded objects when a message/metadata write fails.
- When an account is deleted, remove its private ticket attachment objects before ticket rows cascade away; cover both member-requested deletion and existing admin account-removal paths.

## API and access control

- Extend the customer create-ticket, customer reply, admin reply, and admin-start-conversation flows to accept multipart form data with optional files.
- Enforce the 5-file and 20-MB-per-file limits on the server, along with an explicit raster-image/video MIME allowlist and content-signature checks. Do not trust filenames, client MIME values, or client-provided object keys.
- Upload bytes to private storage and persist only server-generated object keys and file metadata.
- Return attachment metadata with ticket messages, not storage credentials or public object URLs.
- Serve attachment bytes through authorization-checked routes: customers can access only messages in their own tickets; admins must pass the existing admin authorization.
- Preserve current message bodies, notification behavior, and text-only clients.

## Implementation outline

1. Add schema, migration, storage adapter, upload validation, and authorization-checked download handlers.
2. Update all customer/admin message write/read API flows, including the first message in a newly opened ticket.
3. Add a shared attachment picker/preview component and connect it to both ticket interfaces.
4. Add focused tests for size/count/type validation, per-message persistence, owner/admin authorization, and both UI roles.

## Error handling

- Reject disallowed or oversized files with a clear 400 response and do not create a partial message.
- If a storage upload or database operation fails, return an error and remove any objects already uploaded for that submission.
- If attachment retrieval fails, preserve the message text and show an unavailable-file state rather than breaking the thread.

## Security and privacy

- Uploaded objects are private and only streamed after verifying the caller's access to the ticket.
- Generate object keys on the server; never use an uploaded filename as a storage path.
- Reject active content such as SVG and HTML; allow only supported raster image and video types.
- Avoid exposing private attachment URLs to Telegram notifications or unrelated ticket list views.

## Verification

- Unit/integration tests cover file count, size, MIME allowlist, attachment-to-message association, and customer/admin access boundaries.
- UI tests or focused component tests confirm both customer and admin composers can select and display photo/video attachments.
- Run API tests and compile, frontend tests and production build, then restart the configured application workflow and inspect startup/browser logs.