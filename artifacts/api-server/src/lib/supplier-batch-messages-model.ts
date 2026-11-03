import { canonicalUsername } from "./group-buy-updates-model";
import { SupplierBatchError } from "./supplier-batches-model";

export function messageInput(body: any): { batchIds: string[]; message: string; targetUsernames?: string[] } {
  if (!Array.isArray(body?.batchIds) || !body.batchIds.length || body.batchIds.length > 50
    || body.batchIds.some((id: unknown) => typeof id !== "string" || !id || id.length > 100))
    throw new SupplierBatchError("Select between 1 and 50 supplier batches.", 400);
  if (typeof body.message !== "string" || !body.message.trim() || body.message.trim().length > 2000)
    throw new SupplierBatchError("Enter a message of 1–2,000 characters.", 400);
  if (Object.prototype.hasOwnProperty.call(body, "targetUsernames")
    && (!Array.isArray(body.targetUsernames) || !body.targetUsernames.length || body.targetUsernames.length > 5000
      || body.targetUsernames.some((name: unknown) => typeof name !== "string" || name.length > 200 || !canonicalUsername(name).trim()))) {
    throw new SupplierBatchError("Select at least one valid member from the chosen batches.", 400);
  }
  return { batchIds: [...new Set<string>(body.batchIds)].sort(), message: body.message.trim(),
    ...(body.targetUsernames ? { targetUsernames: [...new Set<string>(body.targetUsernames.map(canonicalUsername))].sort() } : {}) };
}

type Batch = { id: string; reference: string; state: string; snapshot: any };
type Order = { id: string; telegramUsername: string; deletedAt: unknown; status: string };
type Account = { telegramUsername: string; telegramChatId: string | null; telegramNotifications: unknown };
export function batchMessageAudience(batches: Batch[], orders: Order[], accounts: Account[]) {
  if (!batches.length || batches.some(b => b.state === "released"))
    throw new SupplierBatchError("Selected batches are unavailable or released. Reload and select active batches.", 409);
  const orderIds = new Set<string>(batches.flatMap(b => b.snapshot.orders.map((o: { id: string }) => o.id)));
  const usernames = [...new Set(orders.filter(o => orderIds.has(o.id) && !o.deletedAt
    && !["cancelled", "canceled", "draft"].includes(o.status.toLowerCase()))
    .map(o => canonicalUsername(o.telegramUsername)))].sort();
  const byName = new Map(accounts.map(a => [canonicalUsername(a.telegramUsername), a]));
  const recipients = usernames.flatMap(username => {
    const account = byName.get(username);
    if (!account) return [];
    const prefs = account.telegramNotifications as { status?: boolean } | null;
    return [{ username: account.telegramUsername, telegramAvailable: !!account.telegramChatId && prefs?.status !== false }];
  });
  return { recipients, missingAccounts: usernames.length - recipients.length };
}

export const escapeBatchMessage = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export function batchMessageText(groupName: string, references: string[], message: string) {
  // Keep Telegram's 4,096-character limit even with a large selection.
  const label = references.length <= 3 ? references.join(", ") : `${references.length} selected supplier batches`;
  return `Message from Salt & Peps Admin\n${groupName.slice(0, 120)} — ${label}\n\n${message}`;
}
