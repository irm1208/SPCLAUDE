import { randomUUID } from "crypto";

interface Session {
  gbId: string;
  expiresAt: number;
}

const sessions = new Map<string, Session>();
const TTL_MS = 15 * 60 * 1000; // 15 minutes

export function createAdminOrganiserSession(gbId: string): string {
  const token = randomUUID();
  sessions.set(token, { gbId, expiresAt: Date.now() + TTL_MS });
  // Lazy cleanup of expired sessions
  const now = Date.now();
  for (const [k, v] of sessions) {
    if (v.expiresAt < now) sessions.delete(k);
  }
  return token;
}

export function validateAdminOrganiserSession(token: string): { gbId: string } | null {
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return { gbId: session.gbId };
}
