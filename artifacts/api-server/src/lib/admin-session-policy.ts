import { createHmac } from "node:crypto";

export const ADMIN_IDLE_MS = 30 * 60_000;
export const ADMIN_ABSOLUTE_MS = 8 * 60 * 60_000;
export const ADMIN_REMEMBERED_MS = 7 * 24 * 60 * 60_000;

export function adminSessionLifetimes(rememberMe: boolean): { idleMs: number; absoluteMs: number } {
  return rememberMe
    ? { idleMs: ADMIN_REMEMBERED_MS, absoluteMs: ADMIN_REMEMBERED_MS }
    : { idleMs: ADMIN_IDLE_MS, absoluteMs: ADMIN_ABSOLUTE_MS };
}

/** Secret-keyed hash makes every legacy cookie unusable after ADMIN_SECRET rotates. */
export function adminSessionTokenHash(token: string, adminSecret: string): string {
  return createHmac("sha256", adminSecret).update(token).digest("hex");
}

export function isRememberedAdminSession(createdAt: Date | string, expiresAt: Date | string): boolean {
  // Compare against the ordinary lifetime, not exactly seven days: DB-created
  // timestamps follow application issuance by a few milliseconds.
  return new Date(expiresAt).getTime() - new Date(createdAt).getTime() > ADMIN_ABSOLUTE_MS;
}

export function adminSessionIdleMs(createdAt: Date | string, expiresAt: Date | string): number {
  return isRememberedAdminSession(createdAt, expiresAt) ? ADMIN_REMEMBERED_MS : ADMIN_IDLE_MS;
}