import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, accountsTable, ordersTable, auditLogsTable, telegramMessageLogsTable,
  gbSupplierBatchesTable as batches, gbSupplierEventsTable as events } from "@workspace/db";
import { supplierAccess } from "./supplier-batches";
import { type UpdateActor, canonicalUsername } from "./group-buy-updates-model";
import { SupplierBatchError, fingerprint } from "./supplier-batches-model";
import { messageInput, batchMessageAudience, batchMessageText, escapeBatchMessage } from "./supplier-batch-messages-model";

function adminOnly(actor: UpdateActor) {
  if (!actor.admin) throw new SupplierBatchError("Only Admin can message supplier batches.", 403);
}
async function audience(tx: any, id: string, actor: UpdateActor, input: ReturnType<typeof messageInput>) {
  const group = await supplierAccess(tx, id, actor);
  const selected = await tx.select().from(batches).where(and(eq(batches.groupBuyId, id), inArray(batches.id, input.batchIds))).for("update");
  if (selected.length !== input.batchIds.length) throw new SupplierBatchError("A selected batch does not belong to this group buy or no longer exists.", 409);
  selected.sort((a: any, b: any) => a.id.localeCompare(b.id));
  const orderIds = [...new Set<string>(selected.flatMap((b: any) => b.snapshot.orders.map((o: any) => o.id)))];
  const orders = orderIds.length ? await tx.select({ id: ordersTable.id, telegramUsername: ordersTable.telegramUsername,
    deletedAt: ordersTable.deletedAt, status: ordersTable.status }).from(ordersTable)
    .where(and(eq(ordersTable.groupBuyId, id), inArray(ordersTable.id, orderIds), isNull(ordersTable.deletedAt))).orderBy(ordersTable.id) : [];
  const usernames = [...new Set<string>(orders.map((o: any) => canonicalUsername(o.telegramUsername)))];
  const accounts = usernames.length ? await tx.select({ telegramUsername: accountsTable.telegramUsername,
    telegramChatId: accountsTable.telegramChatId, telegramNotifications: accountsTable.telegramNotifications })
    .from(accountsTable).where(inArray(sql`lower(regexp_replace(trim(${accountsTable.telegramUsername}), '^@', ''))`, usernames)) : [];
  const result = batchMessageAudience(selected, orders, accounts);
  const references = selected.map((b: any) => b.reference);
  const token = fingerprint({ input, batches: selected.map((b: any) => ({ id: b.id, state: b.state, snapshot: b.snapshot })), orders, ...result });
  return { ...result, token, references, text: batchMessageText(group.name, references, input.message) };
}
export async function previewBatchMessage(id: string, actor: UpdateActor, body: unknown, database = db) {
  adminOnly(actor);
  const input = messageInput(body);
  return database.transaction(async tx => {
    const result = await audience(tx, id, actor, input);
    return { token: result.token, references: result.references, text: result.text,
      recipientCount: result.recipients.length, telegramCount: result.recipients.filter(r => r.telegramAvailable).length,
      missingAccounts: result.missingAccounts };
  });
}
export async function queueBatchMessage(id: string, actor: UpdateActor, body: any, database = db) {
  adminOnly(actor);
  const input = messageInput(body);
  if (body.confirm !== true || typeof body.previewToken !== "string" || !/^[a-f0-9-]{36}$/i.test(body.requestKey ?? ""))
    throw new SupplierBatchError("Preview and confirm this message before sending.", 400);
  const requestId = `supplier-message:${id}:${body.requestKey}`;
  const requestHash = fingerprint({ ...input, previewToken: body.previewToken });
  return database.transaction(async tx => {
    await supplierAccess(tx, id, actor); // serialises requests and idempotent replay
    const [existing] = await tx.select().from(events).where(eq(events.id, requestId));
    if (existing) {
      const detail = existing.detail as any;
      if (detail.requestHash !== requestHash) throw new SupplierBatchError("This send request was already used for another message.", 409);
      return { ...detail.receipt, replay: true };
    }
    const result = await audience(tx, id, actor, input);
    if (result.token !== body.previewToken) throw new SupplierBatchError("The selected batches or recipients changed. Preview the message again before sending.", 409);
    if (!result.recipients.length) throw new SupplierBatchError("No current member accounts can receive this message.", 400);
    const receipt = { requestKey: body.requestKey, recipientCount: result.recipients.length,
      telegramCount: result.recipients.filter(r => r.telegramAvailable).length, references: result.references };
    await tx.insert(events).values({ id: requestId, groupBuyId: id, kind: "member_message_request",
      detail: { requestHash, receipt, batchIds: input.batchIds, message: input.message, actor: actor.username } });
    for (const recipient of result.recipients) {
      const eventId = `${requestId}:${fingerprint(canonicalUsername(recipient.username))}`;
      await tx.insert(events).values({ id: eventId, groupBuyId: id, kind: "member_message",
        recipient: recipient.username, telegram: recipient.telegramAvailable ? "pending" : "skipped",
        detail: { requestId, text: result.text },
        lastError: recipient.telegramAvailable ? null : "Telegram unavailable or disabled; website message recorded." });
      await tx.insert(telegramMessageLogsTable).values({ recipientType: "user",
        recipientUsername: canonicalUsername(recipient.username), recipientChatId: "",
        eventKey: `supplier-message:${eventId}`, messageText: escapeBatchMessage(result.text),
        delivered: false, errorMessage: "Website batch message; Telegram delivery tracked separately." });
    }
    await tx.insert(auditLogsTable).values({ type: "change", level: "info", action: "supplier_batch_members_messaged",
      message: `Admin queued a batch message for ${receipt.recipientCount} members.`,
      metadata: { groupBuyId: id, batchIds: input.batchIds, requestKey: body.requestKey, actor: actor.username, recipientCount: receipt.recipientCount } });
    return receipt;
  });
}
export async function batchMessageHistory(id: string, actor: UpdateActor, database = db) {
  adminOnly(actor);
  return database.transaction(async tx => {
    await supplierAccess(tx, id, actor);
    const requests = await tx.select().from(events).where(and(eq(events.groupBuyId, id), eq(events.kind, "member_message_request")))
      .orderBy(desc(events.createdAt)).limit(10);
    if (!requests.length) return [];
    const deliveries = await tx.select({ detail: events.detail, telegram: events.telegram }).from(events)
      .where(and(eq(events.groupBuyId, id), eq(events.kind, "member_message"),
        inArray(sql`${events.detail}->>'requestId'`, requests.map(r => r.id))));
    return requests.map(request => {
      const detail = request.detail as any;
      const counts: Record<string, number> = {};
      for (const row of deliveries) {
        if ((row.detail as any).requestId === request.id) counts[row.telegram] = (counts[row.telegram] ?? 0) + 1;
      }
      return { ...detail.receipt, createdAt: request.createdAt, message: detail.message, delivery: counts };
    });
  });
}
