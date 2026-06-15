import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { accountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAccount } from "./account-auth";
import { validateAdminOrganiserSession } from "../lib/admin-organiser-sessions";

declare global {
  namespace Express {
    interface Request {
      organiser?: {
        telegramUsername: string;
        organiserStatus: string | null;
        isAdmin?: boolean;
        adminGbId?: string;
      };
    }
  }
}

/**
 * Middleware: requires the caller to be either:
 *   A) An admin organiser session (x-admin-organiser-token header with a valid nonce), OR
 *   B) An authenticated + approved GB Organiser
 *
 * Sets req.organiser on success.
 */
export async function requireOrganiser(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Admin bypass via time-limited session token (no raw admin secret exposure)
  const adminToken = req.headers["x-admin-organiser-token"];
  if (adminToken && typeof adminToken === "string") {
    const session = validateAdminOrganiserSession(adminToken);
    if (session) {
      req.organiser = {
        telegramUsername: process.env["ADMIN_USERNAME"] ?? "admin",
        organiserStatus: "approved",
        isAdmin: true,
        adminGbId: session.gbId,
      };
      next();
      return;
    }
    // Invalid/expired token — fall through to regular auth
  }

  // First run account auth
  await new Promise<void>((resolve, reject) => {
    requireAccount(req, res, (err?: unknown) => {
      if (err) { reject(err); } else { resolve(); }
    });
  }).catch(() => {
    // requireAccount already sent the response
    return;
  });

  // If account auth already responded (401), stop here
  if (res.headersSent) return;

  const username = req.account?.telegramUsername;
  if (!username) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const [account] = await db
    .select({ organiserStatus: accountsTable.organiserStatus })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, username));

  if (!account) {
    res.status(401).json({ error: "Account not found" });
    return;
  }

  if (account.organiserStatus !== "approved") {
    const statusMsg = !account.organiserStatus
      ? "You are not registered as a GB Organiser. Apply via POST /api/organiser/apply."
      : account.organiserStatus === "applied"
        ? "Your GB Organiser application is pending admin approval."
        : account.organiserStatus === "rejected"
          ? "Your GB Organiser application was not approved."
          : "Your GB Organiser account has been suspended.";

    res.status(403).json({ error: statusMsg, organiserStatus: account.organiserStatus });
    return;
  }

  req.organiser = { telegramUsername: username, organiserStatus: account.organiserStatus };
  next();
}
