import { and, eq, gt } from "drizzle-orm";
import { db, vendorAccountsTable, vendorSessionsTable } from "@workspace/db";
export type VendorAccount = typeof vendorAccountsTable.$inferSelect;
export type VendorSession = typeof vendorSessionsTable.$inferSelect;
export interface VendorAccountStore {
  getAccount(username: string): Promise<VendorAccount | null>;
  createAccount(account: VendorAccount): Promise<VendorAccount | null>;
  listAccounts(): Promise<VendorAccount[]>;
  createSession(account: VendorAccount, session: VendorSession): Promise<boolean>;
  getSession(hash: string, now: Date): Promise<{ account: VendorAccount; session: VendorSession } | null>;
  deleteSession(hash: string): Promise<void>;
  updateAccount(username: string, changes: Partial<Pick<VendorAccount, "status" | "vendorId" | "passwordHash" | "displayName">>): Promise<VendorAccount | null>;
}
export const vendorAccountStore: VendorAccountStore = {
  async getAccount(username) { const [row] = await db.select().from(vendorAccountsTable).where(eq(vendorAccountsTable.username, username)); return row ?? null; },
  async createAccount(account) { const [row] = await db.insert(vendorAccountsTable).values(account).onConflictDoNothing().returning(); return row ?? null; },
  async listAccounts() { return db.select().from(vendorAccountsTable).orderBy(vendorAccountsTable.createdAt); },
  async createSession(account, session) {
    return db.transaction(async tx => {
      const [current] = await tx.select().from(vendorAccountsTable).where(eq(vendorAccountsTable.username, account.username)).for("update");
      if (!current || current.passwordHash !== account.passwordHash || current.status === "disabled") return false;
      await tx.insert(vendorSessionsTable).values(session);
      return true;
    });
  },
  async getSession(hash, now) {
    const [row] = await db.select({ account: vendorAccountsTable, session: vendorSessionsTable }).from(vendorSessionsTable)
      .innerJoin(vendorAccountsTable, eq(vendorAccountsTable.username, vendorSessionsTable.username))
      .where(and(eq(vendorSessionsTable.tokenHash, hash), gt(vendorSessionsTable.expiresAt, now)));
    return row ?? null;
  },
  async deleteSession(hash) { await db.delete(vendorSessionsTable).where(eq(vendorSessionsTable.tokenHash, hash)); },
  async updateAccount(username, changes) {
    return db.transaction(async tx => {
      const [current] = await tx.select().from(vendorAccountsTable).where(eq(vendorAccountsTable.username, username)).for("update");
      if (!current) return null;
      const [row] = await tx.update(vendorAccountsTable).set({ ...changes, updatedAt: new Date() }).where(eq(vendorAccountsTable.username, username)).returning();
      const accessChanged = (changes.status !== undefined && changes.status !== current.status)
        || (changes.vendorId !== undefined && changes.vendorId !== current.vendorId)
        || (changes.passwordHash !== undefined && changes.passwordHash !== current.passwordHash);
      if (accessChanged) await tx.delete(vendorSessionsTable).where(eq(vendorSessionsTable.username, username));
      return row;
    });
  },
};
export function publicVendorAccount(account: VendorAccount) {
  return { username: account.username, vendorId: account.vendorId, displayName: account.displayName ?? null, status: account.status, companyName: account.companyName, contactName: account.contactName, email: account.email, createdAt: account.createdAt };
}
