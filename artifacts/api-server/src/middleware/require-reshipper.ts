import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { accountsTable, gbReshippersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAccount } from "./account-auth";

declare global {
  namespace Express {
    interface Request {
      reshipper?: {
        telegramUsername: string;
        reshipperStatus: string | null;
      };
    }
  }
}

/**
 * Middleware: requires the caller to be:
 *   1. Authenticated (valid JWT cookie via requireAccount)
 *   2. An approved Reshipper (reshipperStatus === "approved")
 *
 * Sets req.reshipper on success.
 */
export async function requireReshipper(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Admin impersonation: x-admin-secret + x-impersonate-username headers bypass account auth
  const adminSecret = req.headers["x-admin-secret"] as string | undefined;
  const impersonateUsername = req.headers["x-impersonate-username"] as string | undefined;
  if (adminSecret && impersonateUsername) {
    const expectedSecret = process.env.ADMIN_SECRET;
    if (expectedSecret && adminSecret === expectedSecret) {
      req.reshipper = { telegramUsername: impersonateUsername, reshipperStatus: "approved" };
      next();
      return;
    }
  }

  await new Promise<void>((resolve, reject) => {
    requireAccount(req, res, (err?: unknown) => {
      if (err) { reject(err); } else { resolve(); }
    });
  }).catch(() => {
    return;
  });

  if (res.headersSent) return;

  const username = req.account?.telegramUsername;
  if (!username) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const [account] = await db
    .select({ reshipperStatus: accountsTable.reshipperStatus })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, username));

  if (!account) {
    res.status(401).json({ error: "Account not found" });
    return;
  }

  if (account.reshipperStatus !== "approved") {
    const statusMsg = !account.reshipperStatus
      ? "You are not registered as a Reshipper. Apply via POST /api/reshipper/apply."
      : account.reshipperStatus === "applied"
        ? "Your Reshipper application is pending admin approval."
        : account.reshipperStatus === "rejected"
          ? "Your Reshipper application was not approved."
          : "Your Reshipper account has been suspended.";

    res.status(403).json({ error: statusMsg, reshipperStatus: account.reshipperStatus });
    return;
  }

  req.reshipper = { telegramUsername: username, reshipperStatus: account.reshipperStatus };
  next();
}

/**
 * Helper: verify the reshipper is assigned to the given GB.
 * Returns the assignment row or null; sends 403 if not assigned.
 */
export async function verifyReshipperAssignment(
  req: Request,
  res: Response,
  gbId: string,
) {
  const username = req.reshipper!.telegramUsername;
  const [assignment] = await db
    .select()
    .from(gbReshippersTable)
    .where(and(eq(gbReshippersTable.reshipperUsername, username), eq(gbReshippersTable.gbId, gbId)));

  if (!assignment) {
    res.status(403).json({ error: "You are not assigned to this group buy as a reshipper." });
    return null;
  }
  return assignment;
}
