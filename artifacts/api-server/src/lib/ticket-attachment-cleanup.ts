import { inArray, eq, sql } from "drizzle-orm";
import {
  db,
  ticketMessageAttachmentsTable,
  ticketMessagesTable,
  ticketsTable,
} from "@workspace/db";
import { deleteTicketImage } from "./ticket-attachments";

export async function deleteTicketImagesForAccounts(usernames: string[]): Promise<void> {
  const uniqueUsernames = [...new Set(
    usernames.map(name => name.trim().replace(/^@/, "").toLowerCase()).filter(Boolean),
  )];
  if (uniqueUsernames.length === 0) return;

  const attachments = await db.select({
    storageKey: ticketMessageAttachmentsTable.storageKey,
  })
    .from(ticketMessageAttachmentsTable)
    .innerJoin(
      ticketMessagesTable,
      eq(ticketMessageAttachmentsTable.ticketMessageId, ticketMessagesTable.id),
    )
    .innerJoin(ticketsTable, eq(ticketMessagesTable.ticketId, ticketsTable.id))
    .where(inArray(
      sql<string>`lower(regexp_replace(${ticketsTable.accountUsername}, '^@', ''))`,
      uniqueUsernames,
    ));

  const failures: unknown[] = [];
  for (const attachment of attachments) {
    try {
      await deleteTicketImage(attachment.storageKey);
    } catch (error) {
      failures.push(error);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Could not remove ${failures.length} support-ticket image(s). The account was not deleted.`,
      { cause: failures[0] },
    );
  }
}