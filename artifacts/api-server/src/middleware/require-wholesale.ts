import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { accountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAccount } from "./account-auth";

declare global {
  namespace Express {
    interface Request {
      // Set by requireWholesale once the caller is confirmed to be a wholesale member.
      wholesale?: { telegramUsername: string };
    }
  }
}

/**
 * Middleware: requires the caller to be an authenticated account flagged as a
 * wholesale member (accounts.is_wholesale = true). Sets req.wholesale on success.
 */
export async function requireWholesale(req: Request, res: Response, next: NextFunction): Promise<void> {
  // First run account auth (verifies the session cookie + revocation).
  await new Promise<void>((resolve, reject) => {
    requireAccount(req, res, (err?: unknown) => {
      if (err) { reject(err); } else { resolve(); }
    });
  }).catch(() => {
    // requireAccount already sent the response
    return;
  });

  // If account auth already responded (401), stop here.
  if (res.headersSent) return;

  const username = req.account?.telegramUsername;
  if (!username) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const [account] = await db
    .select({ isWholesale: accountsTable.isWholesale })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, username));

  if (!account) {
    res.status(401).json({ error: "Account not found" });
    return;
  }

  if (!account.isWholesale) {
    res.status(403).json({ error: "This area is for wholesale members only." });
    return;
  }

  req.wholesale = { telegramUsername: username };
  next();
}
